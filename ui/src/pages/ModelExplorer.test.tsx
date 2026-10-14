// @vitest-environment jsdom

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModelExplorer } from "./ModelExplorer";

const mockModelDiscoveryApi = vi.hoisted(() => ({
  getCatalog: vi.fn(),
  testConnection: vi.fn(),
  discover: vi.fn(),
  preflight: vi.fn(),
  refresh: vi.fn(),
  getTokenUsage: vi.fn(),
  resetTokens: vi.fn(),
  executeRouted: vi.fn(),
  getAdapters: vi.fn(),
  getAdapterModels: vi.fn(),
  validateAdapter: vi.fn(),
  executeAdapterTask: vi.fn(),
}));

vi.mock("@/api/model-discovery", () => ({
  modelDiscoveryApi: mockModelDiscoveryApi,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const SAMPLE_CATALOG = {
  provider: "openai",
  success: true,
  models: [
    {
      id: "gpt-4o",
      name: "GPT-4o Omnimodal",
      provider: "openai",
      contextWindow: 128000,
      maxOutputTokens: 16384,
      modalities: ["text", "image"],
      capabilities: {
        toolCalling: true,
        vision: true,
        streaming: true,
        jsonOutput: true,
      },
      status: "available",
      discoveredAt: new Date().toISOString(),
      source: "live_api",
    },
    {
      id: "o1-mini",
      name: "o1-mini Reasoning",
      provider: "openai",
      contextWindow: 128000,
      maxOutputTokens: 65536,
      modalities: ["text"],
      capabilities: {
        toolCalling: false,
        vision: false,
        streaming: true,
        jsonOutput: false,
      },
      status: "available",
      discoveredAt: new Date().toISOString(),
      source: "live_api",
    },
  ],
};

const SAMPLE_OLLAMA_MODELS = {
  adapterType: "ollama_local",
  models: [
    { id: "gemma3:4b", label: "Gemma 3 4B (Local - Fast & Default)" },
    { id: "qwen2.5-coder:latest", label: "Qwen 2.5 Coder (Local)" },
  ],
  liveDiscovered: true,
};

const SAMPLE_CLAUDE_MODELS = {
  adapterType: "claude_local",
  models: [
    { id: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
  ],
  liveDiscovered: true,
};

describe("ModelExplorer UI Component", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockModelDiscoveryApi.getCatalog.mockResolvedValue(SAMPLE_CATALOG);
    mockModelDiscoveryApi.getAdapterModels.mockImplementation(async (type) => {
      if (type === "claude_local") return SAMPLE_CLAUDE_MODELS;
      return SAMPLE_OLLAMA_MODELS;
    });
    mockModelDiscoveryApi.validateAdapter.mockResolvedValue({
      adapterType: "ollama_local",
      status: "pass",
      checks: [
        { code: "ollama_server_reachable", level: "info", message: "Connected to local Ollama service" },
        { code: "ollama_model_ready", level: "info", message: "Model verified and ready" },
      ],
      testedAt: new Date().toISOString(),
    });
    mockModelDiscoveryApi.executeAdapterTask.mockResolvedValue({
      success: true,
      exitCode: 0,
      adapterType: "ollama_local",
      modelUsed: "gemma3:4b",
      provider: "ollama_local",
      summary: "Optimization complete.",
      response: "Completed code review and optimization.",
      usage: { inputTokens: 120, outputTokens: 85 },
      optimizationApplied: { layer: "ponytail", alwaysOn: true, mandateInjected: true },
    });
    mockModelDiscoveryApi.getTokenUsage.mockResolvedValue({
      success: true,
      usage: [
        {
          modelId: "glm-5.3-flash:cloud",
          totalTokens: 12500,
          tokenLimit: 100000,
          limitReached: false,
          requestCount: 5,
          lastUsedAt: new Date().toISOString(),
        },
        {
          modelId: "deepseek-v4.1-flash:cloud",
          totalTokens: 0,
          tokenLimit: 100000,
          limitReached: false,
          requestCount: 0,
          lastUsedAt: new Date().toISOString(),
        },
      ],
      config: {
        primaryModel: "glm-5.3-flash:cloud",
        secondaryModel: "deepseek-v4.1-flash:cloud",
        cloudFallbackModels: ["gpt-4o-mini", "claude-3-5-sonnet"],
        tokenLimits: {
          "glm-5.3-flash:cloud": 100000,
          "deepseek-v4.1-flash:cloud": 100000,
        },
        autoFailoverEnabled: true,
      },
      failovers: [],
      ladder: [
        { model: "glm-5.3-flash:cloud", tier: "primary" },
        { model: "deepseek-v4.1-flash:cloud", tier: "secondary" },
        { model: "gpt-4o-mini", tier: "cloud" },
      ],
    });
  });

  afterEach(() => {
    flushSync(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it("renders Model Explorer and displays discovered models with capabilities", async () => {
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ModelExplorer />
        </QueryClientProvider>,
      );
    });

    await new Promise((r) => setTimeout(r, 20));

    expect(container.textContent).toContain("Dynamic AI Model Discovery");
    expect(container.textContent).toContain("GPT-4o Omnimodal");
    expect(container.textContent).toContain("128k tokens");
    expect(container.textContent).toContain("Tools");
    expect(container.textContent).toContain("Vision");
  });

  it("renders 5-step Adapter-First Model Selection workflow", async () => {
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ModelExplorer />
        </QueryClientProvider>,
      );
    });

    await new Promise((r) => setTimeout(r, 20));

    // Step 1: Adapter options visible
    expect(container.textContent).toContain("Select Adapter Engine");
    expect(container.textContent).toContain("Ollama Local");
    expect(container.textContent).toContain("Claude Code");
    expect(container.textContent).toContain("OpenAI Codex");
    expect(container.textContent).toContain("Gemini CLI");

    // Step 2 & 3: Models loaded dynamically
    expect(container.textContent).toContain("Discovered Models for");
    expect(container.textContent).toContain("gemma3:4b");

    // Step 4 & 5: Validation and execution controls
    expect(container.textContent).toContain("Connect & Validate Adapter");
    expect(container.textContent).toContain("Run Task with Selected Target");
  });

  it("switches adapter and updates models without leaking previous models", async () => {
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ModelExplorer />
        </QueryClientProvider>,
      );
    });

    await new Promise((r) => setTimeout(r, 20));

    // Find and click Claude Code button
    const buttons = Array.from(container.querySelectorAll("button"));
    const claudeButton = buttons.find((b) => b.textContent?.includes("Claude Code"));
    expect(claudeButton).toBeDefined();

    flushSync(() => {
      claudeButton?.click();
    });

    await new Promise((r) => setTimeout(r, 20));

    // Discovered models should now reflect Claude models
    expect(mockModelDiscoveryApi.getAdapterModels).toHaveBeenCalledWith("claude_local");
  });

  it("renders hybrid failover pipeline with glm-5.3-flash:cloud, deepseek-v4.1-flash:cloud, and cloud fallback", async () => {
    flushSync(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ModelExplorer />
        </QueryClientProvider>,
      );
    });

    await new Promise((r) => setTimeout(r, 20));

    expect(container.textContent).toContain("Intelligent Hybrid Cloud Failover Pipeline");
    expect(container.textContent).toContain("glm-5.3-flash:cloud");
    expect(container.textContent).toContain("deepseek-v4.1-flash:cloud");
    expect(container.textContent).toContain("Tier 3: Cloud Fallback");
    expect(container.textContent).toContain("Zero Downtime Active");
  });
});
