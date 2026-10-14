import { randomUUID } from "node:crypto";
import type {
  ModelFailoverEvent,
  ModelRoutingConfig,
  TokenUsageRecord,
} from "@geetorusai/shared";
import { classifyError } from "./error-classifier.js";
import { circuitBreakerRegistry } from "./circuit-breaker.js";

/**
 * Basic heuristic token estimator (~4 chars per token for English / standard prompts).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Tracks cumulative prompt and completion tokens per model.
 * Enforces configurable usage thresholds to trigger automatic cloud rollover.
 */
export class TokenUsageTracker {
  private records = new Map<string, TokenUsageRecord>();
  private defaultLimit = 100_000; // Default quota per model before failover

  constructor(initialLimits: Record<string, number> = {}) {
    for (const [model, limit] of Object.entries(initialLimits)) {
      this.setLimit(model, limit);
    }
  }

  getUsage(modelId: string): TokenUsageRecord {
    const existing = this.records.get(modelId);
    if (existing) return existing;

    const record: TokenUsageRecord = {
      modelId,
      totalTokens: 0,
      tokenLimit: this.defaultLimit,
      limitReached: false,
      requestCount: 0,
      lastUsedAt: new Date().toISOString(),
    };
    this.records.set(modelId, record);
    return record;
  }

  recordUsage(modelId: string, promptTokens: number, completionTokens: number): TokenUsageRecord {
    const record = this.getUsage(modelId);
    const added = Math.max(0, promptTokens) + Math.max(0, completionTokens);
    record.totalTokens += added;
    record.requestCount += 1;
    record.lastUsedAt = new Date().toISOString();
    record.limitReached = record.totalTokens >= record.tokenLimit;
    this.records.set(modelId, record);
    return { ...record };
  }

  setLimit(modelId: string, limit: number): void {
    const record = this.getUsage(modelId);
    record.tokenLimit = Math.max(0, limit);
    record.limitReached = record.totalTokens >= record.tokenLimit;
    this.records.set(modelId, record);
  }

  isLimitReached(modelId: string): boolean {
    const record = this.getUsage(modelId);
    return record.limitReached || record.totalTokens >= record.tokenLimit;
  }

  reset(modelId?: string): void {
    if (modelId) {
      const record = this.getUsage(modelId);
      record.totalTokens = 0;
      record.requestCount = 0;
      record.limitReached = false;
      this.records.set(modelId, record);
    } else {
      for (const record of this.records.values()) {
        record.totalTokens = 0;
        record.requestCount = 0;
        record.limitReached = false;
      }
    }
  }

  getAllUsage(): TokenUsageRecord[] {
    return Array.from(this.records.values());
  }
}

export interface ModelExecutionParams<T> {
  prompt: string;
  preferredModel?: string;
  maxTokens?: number;
  providerOverride?: string;
  executeFn: (model: string, tier: "primary" | "secondary" | "cloud") => Promise<T>;
}

export interface ModelExecutionResult<T> {
  result: T;
  modelUsed: string;
  tier: "primary" | "secondary" | "cloud";
  failoverEvents: ModelFailoverEvent[];
  tokensEstimated: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Intelligent Hybrid Model Router:
 * Automatically coordinates Ollama models (glm-5.3-flash:cloud & deepseek-v4.1-flash:cloud)
 * and initiates automatic cloud rollover when tokens or quotas are exhausted.
 */
export class HybridModelRouter {
  private config: ModelRoutingConfig;
  public readonly tokenTracker: TokenUsageTracker;
  private failoverHistory: ModelFailoverEvent[] = [];
  private readonly maxHistoryLength = 50;

  constructor(
    customConfig?: Partial<ModelRoutingConfig>,
    tokenTracker?: TokenUsageTracker,
  ) {
    this.config = {
      primaryModel: "glm-5.3-flash:cloud",
      secondaryModel: "deepseek-v4.1-flash:cloud",
      cloudFallbackModels: [
        "gpt-4o-mini",
        "claude-3-5-sonnet",
        "gemini-1.5-flash",
        "openrouter/auto",
      ],
      tokenLimits: {
        "glm-5.3-flash:cloud": 100_000,
        "deepseek-v4.1-flash:cloud": 100_000,
      },
      autoFailoverEnabled: true,
      ...customConfig,
    };

    this.tokenTracker = tokenTracker ?? new TokenUsageTracker(this.config.tokenLimits);
  }

  getConfig(): ModelRoutingConfig {
    return { ...this.config };
  }

  updateConfig(patch: Partial<ModelRoutingConfig>): ModelRoutingConfig {
    this.config = {
      ...this.config,
      ...patch,
      tokenLimits: {
        ...this.config.tokenLimits,
        ...(patch.tokenLimits || {}),
      },
    };

    if (patch.tokenLimits) {
      for (const [model, limit] of Object.entries(patch.tokenLimits)) {
        this.tokenTracker.setLimit(model, limit);
      }
    }

    return this.getConfig();
  }

  getFailoverHistory(): ModelFailoverEvent[] {
    return [...this.failoverHistory];
  }

  private recordFailover(event: Omit<ModelFailoverEvent, "id" | "timestamp">): ModelFailoverEvent {
    const fullEvent: ModelFailoverEvent = {
      id: `flv-${randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };

    this.failoverHistory.unshift(fullEvent);
    if (this.failoverHistory.length > this.maxHistoryLength) {
      this.failoverHistory.pop();
    }
    return fullEvent;
  }

  /**
   * Constructs the ordered failover ladder based on preferred model and current configuration.
   */
  getLadder(preferredModel?: string): Array<{ model: string; tier: "primary" | "secondary" | "cloud" }> {
    const primary = this.config.primaryModel;
    const secondary = this.config.secondaryModel || "deepseek-v4.1-flash:cloud";
    const cloudModels = this.config.cloudFallbackModels;

    const ladder: Array<{ model: string; tier: "primary" | "secondary" | "cloud" }> = [];

    if (preferredModel && preferredModel === secondary) {
      // User specifically preferred secondary model
      ladder.push({ model: secondary, tier: "secondary" });
      ladder.push({ model: primary, tier: "primary" });
    } else if (preferredModel && preferredModel !== primary && !cloudModels.includes(preferredModel)) {
      // Custom model requested first
      ladder.push({ model: preferredModel, tier: "primary" });
      ladder.push({ model: primary, tier: "primary" });
      ladder.push({ model: secondary, tier: "secondary" });
    } else {
      // Default ladder: Tier 1 (glm-5.3-flash:cloud) -> Tier 2 (deepseek-v4.1-flash:cloud)
      ladder.push({ model: primary, tier: "primary" });
      ladder.push({ model: secondary, tier: "secondary" });
    }

    // Append cloud fallback models
    for (const cloud of cloudModels) {
      if (!ladder.some((item) => item.model === cloud)) {
        ladder.push({ model: cloud, tier: "cloud" });
      }
    }

    return ladder;
  }

  /**
   * Executes a prompt across the failover ladder.
   * If model reaches token limits, rate limits, or errors, it cascades down automatically.
   */
  async executeWithAutoFailover<T>(
    params: ModelExecutionParams<T>,
  ): Promise<ModelExecutionResult<T>> {
    const promptTokens = estimateTokens(params.prompt);
    const ladder = this.getLadder(params.preferredModel);
    const localFailovers: ModelFailoverEvent[] = [];

    let lastError: unknown = null;

    for (let i = 0; i < ladder.length; i++) {
      const candidate = ladder[i];
      const nextCandidate = ladder[i + 1];

      // 1. Check if candidate reached token usage limit
      if (this.tokenTracker.isLimitReached(candidate.model)) {
        if (this.config.autoFailoverEnabled && nextCandidate) {
          const usage = this.tokenTracker.getUsage(candidate.model);
          const ev = this.recordFailover({
            fromModel: candidate.model,
            toModel: nextCandidate.model,
            reason: "token_limit_reached",
            details: `Model ${candidate.model} reached token limit (${usage.totalTokens}/${usage.tokenLimit} tokens). Cascading to ${nextCandidate.model}.`,
          });
          localFailovers.push(ev);
          continue; // Step down to next model
        } else if (!this.config.autoFailoverEnabled) {
          throw new Error(`Token limit reached for ${candidate.model} and auto-failover is disabled.`);
        }
      }

      // 2. Check circuit breaker state
      const cbCheck = circuitBreakerRegistry.canExecute(candidate.model);
      if (!cbCheck.allowed) {
        if (this.config.autoFailoverEnabled && nextCandidate) {
          const ev = this.recordFailover({
            fromModel: candidate.model,
            toModel: nextCandidate.model,
            reason: "circuit_broken",
            details: cbCheck.reason,
          });
          localFailovers.push(ev);
          continue;
        }
      }

      // 3. Attempt execution
      try {
        const result = await params.executeFn(candidate.model, candidate.tier);

        // Record estimated completion tokens
        const completionTokens = typeof result === "string" ? estimateTokens(result) : Math.max(16, promptTokens);
        this.tokenTracker.recordUsage(candidate.model, promptTokens, completionTokens);
        circuitBreakerRegistry.recordSuccess(candidate.model);

        return {
          result,
          modelUsed: candidate.model,
          tier: candidate.tier,
          failoverEvents: localFailovers,
          tokensEstimated: {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
          },
        };
      } catch (err) {
        lastError = err;
        circuitBreakerRegistry.recordFailure(candidate.model);

        const classified = classifyError(err, { model: candidate.model });
        let reason: ModelFailoverEvent["reason"] = "error";

        if (classified.category === "rate_limit" || classified.httpStatus === 429) {
          reason = "rate_limit_429";
        } else if (classified.category === "payload_too_large") {
          reason = "context_window_exceeded";
        } else if (classified.category === "timeout") {
          reason = "timeout";
        }

        if (this.config.autoFailoverEnabled && nextCandidate) {
          const ev = this.recordFailover({
            fromModel: candidate.model,
            toModel: nextCandidate.model,
            reason,
            details: classified.userFacingExplanation || classified.message,
          });
          localFailovers.push(ev);
          // Loop continues to nextCandidate
        } else {
          // No more fallbacks or auto-failover disabled
          throw err;
        }
      }
    }

    // If all models failed
    const errorMsg = lastError instanceof Error ? lastError.message : "All failover models exhausted";
    throw new Error(`Execution failed after trying all failover models in ladder: ${errorMsg}`);
  }
}

export const hybridModelRouter = new HybridModelRouter();
