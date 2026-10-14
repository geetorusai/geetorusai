import { api } from "./client";
import type {
  PulseSystemStatus,
  IncidentRecord,
  CircuitBreakerStatus,
  RecoveryEvent,
} from "@geetorusai/shared";

export interface PulseSettings {
  autoRecoveryEnabled: boolean;
  monitoringIntervalSeconds: number;
  circuitBreakerThreshold: number;
  circuitBreakerCooldownMs: number;
  maxRetryAttempts: number;
}

export const pulseApi = {
  getStatus: () => api.get<PulseSystemStatus>("/pulse/status"),

  getIncidents: () => api.get<{ incidents: IncidentRecord[] }>("/pulse/incidents"),

  resolveIncident: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/pulse/incidents/${id}/resolve`, {}),

  getCircuitBreakers: () =>
    api.get<{ circuitBreakers: Record<string, CircuitBreakerStatus> }>("/pulse/circuit-breakers"),

  resetCircuitBreaker: (provider: string) =>
    api.post<{ success: boolean; message: string }>(`/pulse/circuit-breakers/${provider}/reset`, {}),

  getRecoveryEvents: () =>
    api.get<{ events: RecoveryEvent[]; metrics: Record<string, number> }>("/pulse/recovery-events"),

  getSettings: () => api.get<PulseSettings>("/pulse/settings"),

  updateSettings: (settings: Partial<PulseSettings>) =>
    api.put<PulseSettings>("/pulse/settings", settings),
};
