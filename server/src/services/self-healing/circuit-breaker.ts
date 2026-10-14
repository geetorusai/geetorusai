import type { CircuitBreakerState, CircuitBreakerStatus } from "@geetorusai/shared";

export interface CircuitBreakerConfig {
  threshold?: number;
  cooldownMs?: number;
}

class ServiceCircuitBreaker {
  private failures = 0;
  private state: CircuitBreakerState = "closed";
  private lastFailureTime = 0;
  private openUntil = 0;

  constructor(
    public readonly serviceId: string,
    private readonly threshold = 4,
    private readonly cooldownMs = 30_000,
  ) {}

  canExecute(): { allowed: boolean; reason?: string } {
    const now = Date.now();
    if (this.state === "open") {
      if (now >= this.openUntil) {
        this.state = "half_open";
        return { allowed: true };
      }
      const remainingSeconds = Math.ceil((this.openUntil - now) / 1000);
      return {
        allowed: false,
        reason: `Circuit breaker active for ${this.serviceId}. Cooling down for ${remainingSeconds}s more to protect system stability.`,
      };
    }
    return { allowed: true };
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  recordFailure(): void {
    const now = Date.now();
    this.failures += 1;
    this.lastFailureTime = now;

    if (this.failures >= this.threshold) {
      this.state = "open";
      this.openUntil = now + this.cooldownMs;
    }
  }

  reset(): void {
    this.failures = 0;
    this.state = "closed";
    this.openUntil = 0;
  }

  getStatus(): CircuitBreakerStatus {
    const now = Date.now();
    return {
      serviceId: this.serviceId,
      state: this.state,
      failures: this.failures,
      threshold: this.threshold,
      cooldownMs: this.cooldownMs,
      lastFailureAt: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : undefined,
      openUntil: this.state === "open" ? new Date(this.openUntil).toISOString() : undefined,
    };
  }
}

export class CircuitBreakerRegistry {
  private breakers = new Map<string, ServiceCircuitBreaker>();

  get(serviceId: string, config?: CircuitBreakerConfig): ServiceCircuitBreaker {
    let breaker = this.breakers.get(serviceId);
    if (!breaker) {
      breaker = new ServiceCircuitBreaker(
        serviceId,
        config?.threshold ?? 4,
        config?.cooldownMs ?? 30_000,
      );
      this.breakers.set(serviceId, breaker);
    }
    return breaker;
  }

  canExecute(serviceId: string): { allowed: boolean; reason?: string } {
    return this.get(serviceId).canExecute();
  }

  recordSuccess(serviceId: string): void {
    this.get(serviceId).recordSuccess();
  }

  recordFailure(serviceId: string): void {
    this.get(serviceId).recordFailure();
  }

  reset(serviceId: string): void {
    this.get(serviceId).reset();
  }

  resetAll(): void {
    for (const b of this.breakers.values()) {
      b.reset();
    }
  }

  getAllStatuses(): Record<string, CircuitBreakerStatus> {
    const out: Record<string, CircuitBreakerStatus> = {};
    for (const [id, breaker] of this.breakers.entries()) {
      out[id] = breaker.getStatus();
    }
    return out;
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();
