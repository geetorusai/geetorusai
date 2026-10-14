import { sql } from "drizzle-orm";
import type { Db } from "@geetorusai/db";
import type {
  PulseSystemStatus,
  HealthState,
  IncidentRecord,
  CircuitBreakerStatus,
} from "@geetorusai/shared";
import { circuitBreakerRegistry } from "../self-healing/circuit-breaker.js";
import { recoveryEngine } from "../self-healing/recovery-engine.js";

export interface PulseSettings {
  autoRecoveryEnabled: boolean;
  monitoringIntervalSeconds: number;
  circuitBreakerThreshold: number;
  circuitBreakerCooldownMs: number;
  maxRetryAttempts: number;
}

export class PulseService {
  private incidents: IncidentRecord[] = [];
  private totalHealthChecks = 0;
  private settings: PulseSettings = {
    autoRecoveryEnabled: true,
    monitoringIntervalSeconds: 30,
    circuitBreakerThreshold: 5,
    circuitBreakerCooldownMs: 30000,
    maxRetryAttempts: 3,
  };

  /**
   * Run live system health assessment and compile Pulse status
   */
  async getPulseStatus(db?: Db): Promise<PulseSystemStatus> {
    this.totalHealthChecks++;
    const now = new Date().toISOString();
    const services: PulseSystemStatus["services"] = {};

    // 1. API Health
    services["api-gateway"] = {
      name: "API Gateway",
      status: "healthy",
      latencyMs: 1,
      message: "Gateway operational and handling incoming requests",
      lastCheckedAt: now,
    };

    // 2. Database Health
    let dbStatus: HealthState = "unknown";
    let dbLatency: number | undefined;
    let dbMessage = "Database check skipped (uninitialized)";

    if (db) {
      const dbStart = performance.now();
      try {
        await db.execute(sql`SELECT 1`);
        dbLatency = Math.round(performance.now() - dbStart);
        dbStatus = dbLatency > 1500 ? "degraded" : "healthy";
        dbMessage = dbStatus === "degraded" ? "Database responding slowly" : "Connected and accepting queries";
      } catch (err) {
        dbLatency = Math.round(performance.now() - dbStart);
        dbStatus = "unavailable";
        dbMessage = err instanceof Error ? err.message : "Database connection refused";

        this.recordIncident({
          id: `inc-db-${Date.now().toString(36)}`,
          title: "Database Connectivity Failure",
          severity: "critical",
          component: "database",
          category: "database",
          summary: `PostgreSQL connection check failed: ${dbMessage}`,
          createdAt: now,
          status: "active",
        });
      }
    }

    services["database"] = {
      name: "Database (PostgreSQL)",
      status: dbStatus,
      latencyMs: dbLatency,
      message: dbMessage,
      lastCheckedAt: now,
    };

    // 3. Provider Health & Circuit Breakers
    const circuitBreakers = circuitBreakerRegistry.getAllStatuses();
    let hasOpenCircuit = false;

    for (const [providerId, status] of Object.entries(circuitBreakers)) {
      const providerHealth: HealthState =
        status.state === "open"
          ? "degraded"
          : status.state === "half_open"
            ? "recovering"
            : "healthy";

      if (status.state === "open") {
        hasOpenCircuit = true;
      }

      services[`ai-provider-${providerId}`] = {
        name: `AI Provider (${providerId})`,
        status: providerHealth,
        message:
          status.state === "open"
            ? `Circuit breaker OPEN until ${status.openUntil}. Tripped due to ${status.failures} consecutive failures.`
            : status.state === "half_open"
              ? "Circuit breaker probe in progress (half-open)."
              : "Provider operational with normal error bounds.",
        lastCheckedAt: now,
      };
    }

    // 4. Recovery Engine Stats & Events
    const recoveryMetrics = recoveryEngine.getMetrics();
    const recentRecoveryEvents = recoveryEngine.getRecentEvents(20);

    // 5. Determine Overall System State
    const activeIncidents = this.incidents.filter((i) => i.status === "active" || i.status === "investigating");

    let overallState: HealthState = "healthy";
    if (dbStatus === "unavailable") {
      overallState = "unavailable";
    } else if (hasOpenCircuit || activeIncidents.some((i) => i.severity === "critical" || i.severity === "high")) {
      overallState = "degraded";
    } else if (recentRecoveryEvents.some((e) => e.status === "recovering")) {
      overallState = "recovering";
    }

    return {
      state: overallState,
      lastCheckedAt: now,
      services,
      activeIncidents,
      recentRecoveryEvents,
      circuitBreakers,
      metrics: {
        totalChecks: this.totalHealthChecks,
        recoveredCount: recoveryMetrics.recoveredCount,
        failedCount: recoveryMetrics.failedCount,
        recoverySuccessRate: recoveryMetrics.successRate,
        activeTasks: 0,
      },
    };
  }

  recordIncident(incident: IncidentRecord): void {
    // Avoid spamming duplicate active incidents for the same component
    const exists = this.incidents.some(
      (i) => i.component === incident.component && i.status === "active" && i.category === incident.category,
    );
    if (!exists) {
      this.incidents.unshift(incident);
      if (this.incidents.length > 50) {
        this.incidents.pop();
      }
    }
  }

  resolveIncident(id: string): boolean {
    const target = this.incidents.find((i) => i.id === id);
    if (target) {
      target.status = "recovered";
      target.resolvedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  getIncidents(): IncidentRecord[] {
    return this.incidents;
  }

  resetCircuitBreaker(provider: string): boolean {
    circuitBreakerRegistry.reset(provider);
    return true;
  }

  getSettings(): PulseSettings {
    return { ...this.settings };
  }

  updateSettings(patch: Partial<PulseSettings>): PulseSettings {
    this.settings = { ...this.settings, ...patch };
    return { ...this.settings };
  }
}

export const pulseService = new PulseService();
