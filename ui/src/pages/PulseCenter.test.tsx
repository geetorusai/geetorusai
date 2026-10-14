// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PulseCenter } from "./PulseCenter";
import type { PulseSystemStatus } from "@geetorusai/shared";

const mockPulseApi = vi.hoisted(() => ({
  getStatus: vi.fn(),
  getIncidents: vi.fn(),
  resolveIncident: vi.fn(),
  getCircuitBreakers: vi.fn(),
  resetCircuitBreaker: vi.fn(),
  getRecoveryEvents: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock("@/api/pulse", () => ({
  pulseApi: mockPulseApi,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const SAMPLE_STATUS: PulseSystemStatus = {
  state: "healthy",
  lastCheckedAt: new Date().toISOString(),
  services: {
    "api-gateway": {
      name: "API Gateway",
      status: "healthy",
      latencyMs: 1,
      message: "Gateway operational",
      lastCheckedAt: new Date().toISOString(),
    },
    database: {
      name: "Database (PostgreSQL)",
      status: "healthy",
      latencyMs: 5,
      message: "Connected and accepting queries",
      lastCheckedAt: new Date().toISOString(),
    },
  },
  activeIncidents: [],
  recentRecoveryEvents: [],
  circuitBreakers: {
    openai: {
      serviceId: "openai",
      state: "closed",
      failures: 0,
      threshold: 4,
      cooldownMs: 30000,
    },
  },
  metrics: {
    totalChecks: 10,
    recoveredCount: 2,
    failedCount: 0,
    recoverySuccessRate: 100,
    activeTasks: 0,
  },
};

describe("PulseCenter UI Component", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockPulseApi.getStatus.mockResolvedValue(SAMPLE_STATUS);
    mockPulseApi.getSettings.mockResolvedValue({
      autoRecoveryEnabled: true,
      monitoringIntervalSeconds: 30,
      circuitBreakerThreshold: 4,
      circuitBreakerCooldownMs: 30000,
      maxRetryAttempts: 3,
    });
  });

  afterEach(() => {
    flushSync(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("renders Pulse header and system health status", async () => {
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <PulseCenter />
        </QueryClientProvider>,
      );
    });

    await new Promise((r) => setTimeout(r, 20));

    expect(container.textContent).toContain("Pulse — System Health & Recovery");
    expect(container.textContent).toContain("HEALTHY");
    expect(container.textContent).toContain("API Gateway");
    expect(container.textContent).toContain("Database (PostgreSQL)");
  });

  it("allows switching tabs to Circuit Breakers and Incidents", async () => {
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <PulseCenter />
        </QueryClientProvider>,
      );
    });

    await new Promise((r) => setTimeout(r, 20));

    // Find Circuit Breakers tab button
    const buttons = Array.from(container.querySelectorAll("button"));
    const cbTab = buttons.find((b) => b.textContent?.includes("Circuit Breakers"));
    expect(cbTab).toBeDefined();

    flushSync(() => {
      cbTab?.click();
    });

    expect(container.textContent).toContain("openai");
    expect(container.textContent).toContain("closed");
  });
});
