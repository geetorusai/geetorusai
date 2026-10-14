import { randomUUID } from "node:crypto";
import type {
  ClassifiedError,
  RecoveryEvent,
  RecoveryStatus,
} from "@geetorusai/shared";
import { classifyError } from "./error-classifier.js";
import { circuitBreakerRegistry } from "./circuit-breaker.js";

export interface RecoveryExecutionOptions<T> {
  component: string;
  provider?: string;
  model?: string;
  fallbackModel?: string;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  abortSignal?: AbortSignal;
  execute: (attempt: number, currentModel?: string) => Promise<T>;
  onFallback?: (failedModel: string, targetModel: string) => void;
}

export class RecoveryEngine {
  private history: RecoveryEvent[] = [];
  private readonly maxHistoryLength = 100;

  async executeWithRecovery<T>(options: RecoveryExecutionOptions<T>): Promise<T> {
    const correlationId = `rec-${randomUUID().slice(0, 8)}`;
    const component = options.component;
    const provider = options.provider || "default";
    const maxRetries = options.maxRetries ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 500;
    const maxDelayMs = options.maxDelayMs ?? 8000;
    let currentModel = options.model;
    let attempt = 0;

    // Check circuit breaker first
    const cbCheck = circuitBreakerRegistry.canExecute(provider);
    if (!cbCheck.allowed) {
      // If primary is circuit-broken and an approved fallback model exists, try fallback
      if (options.fallbackModel && options.fallbackModel !== currentModel) {
        options.onFallback?.(currentModel || "unknown", options.fallbackModel);
        currentModel = options.fallbackModel;
      } else {
        const error = new Error(cbCheck.reason || "Provider is temporarily suspended by circuit breaker");
        this.recordEvent({
          id: randomUUID(),
          correlationId,
          component,
          errorCategory: "circuit_broken",
          actionTaken: "blocked_by_circuit_breaker",
          status: "circuit_broken",
          attempts: 0,
          maxAttempts: maxRetries,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          outcomeMessage: cbCheck.reason || "Blocked by circuit breaker",
        });
        throw error;
      }
    }

    const startedAt = new Date().toISOString();

    while (attempt <= maxRetries) {
      if (options.abortSignal?.aborted) {
        throw new Error("Operation aborted during recovery pipeline");
      }

      try {
        const result = await options.execute(attempt, currentModel);
        // Successful execution clears circuit breaker failures
        circuitBreakerRegistry.recordSuccess(provider);

        if (attempt > 0) {
          this.recordEvent({
            id: randomUUID(),
            correlationId,
            component,
            errorCategory: "network",
            actionTaken: `retry_succeeded_at_attempt_${attempt}`,
            status: "recovered",
            attempts: attempt,
            maxAttempts: maxRetries,
            startedAt,
            completedAt: new Date().toISOString(),
            outcomeMessage: `Successfully recovered after ${attempt} retry attempt(s).`,
          });
        }
        return result;
      } catch (err) {
        attempt += 1;
        const classified: ClassifiedError = classifyError(err, {
          component,
          provider,
          model: currentModel,
          correlationId,
        });

        // Record failure in circuit breaker
        circuitBreakerRegistry.recordFailure(provider);

        // If error is unrecoverable (e.g. 401 auth or invalid prompt), do NOT retry
        if (!classified.recoverable || attempt > maxRetries) {
          // If fallback is available on unsupported_model or exhausted retries, try fallback once
          if (options.fallbackModel && currentModel !== options.fallbackModel && attempt <= maxRetries + 1) {
            options.onFallback?.(currentModel || "unknown", options.fallbackModel);
            currentModel = options.fallbackModel;
            // continue loop with fallback
            continue;
          }

          this.recordEvent({
            id: randomUUID(),
            correlationId,
            component,
            errorCategory: classified.category,
            actionTaken: "exhausted_or_unrecoverable",
            status: classified.recoverable ? "failed" : "unrecoverable",
            attempts: attempt,
            maxAttempts: maxRetries,
            startedAt,
            completedAt: new Date().toISOString(),
            outcomeMessage: classified.userFacingExplanation,
          });
          throw err;
        }

        // Calculate jittered exponential backoff
        const delayMs = this.calculateBackoff(attempt, baseDelayMs, maxDelayMs, classified.retryAfterSeconds);

        this.recordEvent({
          id: randomUUID(),
          correlationId,
          component,
          errorCategory: classified.category,
          actionTaken: `retry_scheduled_delay_${delayMs}ms`,
          status: "recovering",
          attempts: attempt,
          maxAttempts: maxRetries,
          startedAt,
          outcomeMessage: `Transient ${classified.category} failure. Retrying in ${Math.round(delayMs)}ms.`,
        });

        await this.sleep(delayMs, options.abortSignal);
      }
    }

    throw new Error(`Recovery attempts exhausted for ${component}`);
  }

  calculateBackoff(attempt: number, baseMs: number, maxMs: number, retryAfterSec?: number): number {
    if (retryAfterSec && retryAfterSec > 0) {
      return Math.min(retryAfterSec * 1000, maxMs);
    }
    const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt - 1));
    // Full jitter between 75% and 125% of calculated backoff
    const jitter = 0.75 + Math.random() * 0.5;
    return Math.min(maxMs, exponential * jitter);
  }

  private recordEvent(event: RecoveryEvent): void {
    this.history.unshift(event);
    if (this.history.length > this.maxHistoryLength) {
      this.history.pop();
    }
  }

  getRecentEvents(limit = 30): RecoveryEvent[] {
    return this.history.slice(0, limit);
  }

  getMetrics() {
    const total = this.history.length;
    const recovered = this.history.filter((e) => e.status === "recovered").length;
    const failed = this.history.filter((e) => e.status === "failed" || e.status === "unrecoverable").length;
    const rate = total > 0 ? (recovered / (recovered + failed || 1)) * 100 : 100;
    return {
      totalEvents: total,
      recoveredCount: recovered,
      failedCount: failed,
      successRate: Math.round(rate),
    };
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new Error("Aborted"));
      const timer = setTimeout(resolve, ms);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Aborted"));
      }, { once: true });
    });
  }
}

export const recoveryEngine = new RecoveryEngine();
