import { api } from "./client";
import type {
  DiscoveredModel,
  ModelDiscoveryResult,
  PreflightCheckResult,
  ModelRoutingConfig,
  TokenUsageRecord,
  ModelFailoverEvent,
} from "@geetorusai/shared";

export interface ConnectionTestParams {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
}

export interface ConnectionTestResult {
  connected: boolean;
  latencyMs: number;
  provider: string;
  error?: string;
  statusCode?: number;
  checkedAt: string;
}

export interface DiscoverModelsParams {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
  forceRefresh?: boolean;
}

export interface PreflightParams {
  provider: string;
  model: string;
  prompt?: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  contextLengthEstimated?: number;
  knownModelContextWindow?: number | null;
  allowLocalhost?: boolean;
}

export interface TokenUsageResponse {
  success: boolean;
  usage: TokenUsageRecord[];
  config: ModelRoutingConfig;
  failovers: ModelFailoverEvent[];
  ladder: Array<{ model: string; tier: "primary" | "secondary" | "cloud" }>;
}

export interface RouteExecuteParams {
  prompt: string;
  preferredModel?: string;
  simulateFailures?: string[];
}

export interface RouteExecuteResult {
  success: boolean;
  result: string;
  modelUsed: string;
  tier: "primary" | "secondary" | "cloud";
  failoverEvents: ModelFailoverEvent[];
  tokensEstimated: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export const modelDiscoveryApi = {
  testConnection: (params: ConnectionTestParams) =>
    api.post<ConnectionTestResult>("/models/test-connection", params),

  discover: (params: DiscoverModelsParams) =>
    api.post<ModelDiscoveryResult>("/models/discover", params),

  preflight: (params: PreflightParams) =>
    api.post<PreflightCheckResult>("/models/preflight", params),

  refresh: (params: DiscoverModelsParams) =>
    api.post<ModelDiscoveryResult>("/models/refresh", params),

  getCatalog: (provider?: string, capability?: string) => {
    const params = new URLSearchParams();
    if (provider) params.set("provider", provider);
    if (capability) params.set("capability", capability);
    const query = params.toString() ? `?${params.toString()}` : "";
    return api.get<{
      provider?: string;
      success?: boolean;
      models?: DiscoveredModel[];
      supportedProviders?: string[];
      fetchedAt?: string;
      source?: string;
    }>(`/models/catalog${query}`);
  },

  getTokenUsage: () =>
    api.get<TokenUsageResponse>("/models/tokens/usage"),

  setTokenLimit: (modelId: string, limit: number) =>
    api.post<{ success: boolean; record: TokenUsageRecord }>("/models/tokens/limit", { modelId, limit }),

  resetTokens: (modelId?: string) =>
    api.post<{ success: boolean; usage: TokenUsageRecord[] }>("/models/tokens/reset", { modelId }),

  getRoutingConfig: () =>
    api.get<ModelRoutingConfig>("/models/route/config"),

  updateRoutingConfig: (config: Partial<ModelRoutingConfig>) =>
    api.post<{ success: boolean; config: ModelRoutingConfig }>("/models/route/config", config),

  executeRouted: (params: RouteExecuteParams) =>
    api.post<RouteExecuteResult>("/models/route/execute", params),

  // Adapter-First Model Discovery & Execution
  getAdapters: () =>
    api.get<Array<{
      type: string;
      label: string;
      source: "builtin" | "external";
      modelsCount: number;
      loaded: boolean;
      disabled: boolean;
      capabilities: {
        supportsInstructionsBundle: boolean;
        supportsSkills: boolean;
        supportsLocalAgentJwt: boolean;
        requiresMaterializedRuntimeSkills: boolean;
        supportsAcp: boolean;
      };
    }>>("/adapters"),

  getAdapterModels: (adapterType: string, refresh = false) =>
    api.get<{
      adapterType: string;
      models: Array<{ id: string; label: string }>;
      liveDiscovered: boolean;
    }>(`/adapters/${encodeURIComponent(adapterType)}/models${refresh ? "?refresh=true" : ""}`),

  validateAdapter: (adapterType: string, config?: Record<string, unknown>) =>
    api.post<{
      adapterType: string;
      status: "pass" | "warn" | "fail";
      checks: Array<{ code: string; level: "info" | "warn" | "error"; message: string }>;
      testedAt: string;
    }>(`/adapters/${encodeURIComponent(adapterType)}/validate`, { config }),

  executeAdapterTask: (
    adapterType: string,
    params: { model: string; prompt: string; config?: Record<string, unknown> },
  ) =>
    api.post<{
      success: boolean;
      exitCode: number;
      adapterType: string;
      modelUsed: string;
      provider: string;
      summary?: string;
      response?: string;
      usage?: { inputTokens?: number; outputTokens?: number };
      errorMessage?: string;
      optimizationApplied?: { layer: string; alwaysOn: boolean; mandateInjected: boolean };
    }>(`/adapters/${encodeURIComponent(adapterType)}/execute-task`, params),
};

