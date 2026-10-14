export type ErrorCategory =
  | "timeout"
  | "network"
  | "auth"
  | "permission"
  | "rate_limit"
  | "server_error"
  | "unsupported_model"
  | "invalid_input"
  | "payload_too_large"
  | "circuit_broken"
  | "database"
  | "unknown";

export type ErrorSeverity = "critical" | "high" | "medium" | "low" | "info";

export type RecoveryStatus =
  | "pending"
  | "recovering"
  | "recovered"
  | "failed"
  | "unrecoverable"
  | "circuit_broken";

export type HealthState = "healthy" | "degraded" | "unavailable" | "recovering" | "unknown";

export type CircuitBreakerState = "closed" | "open" | "half_open";

export interface ClassifiedError {
  correlationId: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  message: string;
  userFacingExplanation: string;
  affectedComponent: string;
  provider?: string;
  model?: string;
  httpStatus?: number;
  retryAfterSeconds?: number;
  timestamp: string;
}

export interface RecoveryActionPlan {
  action:
    | "retry_backoff"
    | "switch_fallback"
    | "trip_circuit"
    | "refresh_credentials"
    | "reject_input"
    | "degrade_component";
  maxRetries: number;
  delayMs: number;
  fallbackModel?: string;
  reason: string;
}

export interface RecoveryEvent {
  id: string;
  correlationId: string;
  component: string;
  errorCategory: ErrorCategory;
  actionTaken: string;
  status: RecoveryStatus;
  attempts: number;
  maxAttempts: number;
  startedAt: string;
  completedAt?: string;
  outcomeMessage: string;
}

export interface CircuitBreakerStatus {
  serviceId: string;
  state: CircuitBreakerState;
  failures: number;
  threshold: number;
  cooldownMs: number;
  lastFailureAt?: string;
  openUntil?: string;
}

export interface DiscoveredModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  modalities: string[];
  capabilities: {
    toolCalling: boolean;
    vision: boolean;
    streaming: boolean;
    jsonOutput: boolean;
  };
  status: "available" | "degraded" | "unsupported" | "unknown";
  discoveredAt: string;
  source: "live_api" | "cached" | "catalog" | "manual";
  rawMetadata?: Record<string, unknown>;
}

export interface ModelDiscoveryResult {
  provider: string;
  success: boolean;
  models: DiscoveredModel[];
  error?: string;
  fetchedAt: string;
  cacheTtlMs: number;
}

export interface PreflightCheckResult {
  valid: boolean;
  provider: string;
  model: string;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
    severity?: ErrorSeverity;
  }>;
  warnings: string[];
  errors: string[];
  checkedAt: string;
}

export interface IncidentRecord {
  id: string;
  title: string;
  severity: ErrorSeverity;
  component: string;
  category: ErrorCategory;
  summary: string;
  createdAt: string;
  resolvedAt?: string;
  status: "active" | "investigating" | "recovered" | "mitigated";
}

export interface PulseSystemStatus {
  state: HealthState;
  lastCheckedAt: string;
  services: Record<
    string,
    {
      name: string;
      status: HealthState;
      latencyMs?: number;
      message?: string;
      lastCheckedAt: string;
    }
  >;
  activeIncidents: IncidentRecord[];
  recentRecoveryEvents: RecoveryEvent[];
  circuitBreakers: Record<string, CircuitBreakerStatus>;
  metrics: {
    totalChecks: number;
    recoveredCount: number;
    failedCount: number;
    recoverySuccessRate: number;
    activeTasks: number;
  };
}

export interface ModelRoutingConfig {
  primaryModel: string;
  secondaryModel?: string;
  cloudFallbackModels: string[];
  tokenLimits: Record<string, number>;
  autoFailoverEnabled: boolean;
}

export interface TokenUsageRecord {
  modelId: string;
  totalTokens: number;
  tokenLimit: number;
  limitReached: boolean;
  requestCount: number;
  lastUsedAt: string;
}

export interface ModelFailoverEvent {
  id: string;
  fromModel: string;
  toModel: string;
  reason: "token_limit_reached" | "rate_limit_429" | "context_window_exceeded" | "timeout" | "circuit_broken" | "error";
  timestamp: string;
  details?: string;
}
