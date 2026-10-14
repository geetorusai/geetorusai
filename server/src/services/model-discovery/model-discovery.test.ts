import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ModelDiscoveryService } from "./model-discovery-service.js";

describe("Dynamic Model Discovery Service", () => {
  let service: ModelDiscoveryService;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    service = new ModelDiscoveryService();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("discovers and normalizes OpenAI models accurately", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "gpt-4o", created: 1715368132, owned_by: "system" },
          { id: "o1-preview", created: 1726173000, owned_by: "system" },
          { id: "gpt-3.5-turbo", created: 1677610602, owned_by: "openai" },
        ],
      }),
    } as unknown as Response);

    const result = await service.discoverModels({ provider: "openai", apiKey: "test-key" });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("openai");
    expect(result.models.length).toBe(3);

    const gpt4o = result.models.find((m) => m.id === "gpt-4o")!;
    expect(gpt4o.contextWindow).toBe(128000);
    expect(gpt4o.capabilities.toolCalling).toBe(true);
    expect(gpt4o.capabilities.vision).toBe(true);

    const o1 = result.models.find((m) => m.id === "o1-preview")!;
    expect(o1.maxOutputTokens).toBe(65536);
  });

  it("discovers and normalizes Anthropic models with 200k context window and vision", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "claude-3-5-sonnet-20241022", display_name: "Claude 3.5 Sonnet", created_at: "2024-10-22" },
        ],
      }),
    } as unknown as Response);

    const result = await service.discoverModels({ provider: "anthropic", apiKey: "sk-ant-test" });

    expect(result.success).toBe(true);
    expect(result.models.length).toBe(1);
    const claude = result.models[0];
    expect(claude.contextWindow).toBe(200000);
    expect(claude.capabilities.vision).toBe(true);
    expect(claude.capabilities.toolCalling).toBe(true);
  });

  it("discovers and normalizes Google Gemini models from Generative Language API", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            name: "models/gemini-1.5-pro-latest",
            displayName: "Gemini 1.5 Pro",
            inputTokenLimit: 2097152,
            outputTokenLimit: 8192,
            supportedGenerationMethods: ["generateContent"],
          },
        ],
      }),
    } as unknown as Response);

    const result = await service.discoverModels({ provider: "google", apiKey: "gemini-key" });

    expect(result.success).toBe(true);
    expect(result.models.length).toBe(1);
    const gemini = result.models[0];
    expect(gemini.id).toBe("gemini-1.5-pro-latest");
    expect(gemini.contextWindow).toBe(2097152);
    expect(gemini.modalities).toContain("video");
  });

  it("caches model catalogs and returns cached copy unless forceRefresh is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ id: "gpt-4o" }],
      }),
    } as unknown as Response);
    globalThis.fetch = fetchMock;

    // First fetch: hits API
    const res1 = await service.discoverModels({ provider: "openai", apiKey: "key-12345" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res1.models[0].source).toBe("live_api");

    // Second fetch: returns cached
    const res2 = await service.discoverModels({ provider: "openai", apiKey: "key-12345" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res2.models[0].source).toBe("cached");

    // Third fetch with forceRefresh: hits API again
    const res3 = await service.discoverModels(
      { provider: "openai", apiKey: "key-12345" },
      { forceRefresh: true },
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res3.models[0].source).toBe("live_api");
  });

  it("tests connection successfully and measures latency", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    } as unknown as Response);

    const test = await service.testConnection({ provider: "openai", apiKey: "valid-key" });
    expect(test.connected).toBe(true);
    expect(test.latencyMs).toBeGreaterThanOrEqual(0);
    expect(test.statusCode).toBe(200);
  });

  it("reports clear error on 401 connection test failure without leaking key", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as unknown as Response);

    const test = await service.testConnection({ provider: "openai", apiKey: "bad-secret-key-12345" });
    expect(test.connected).toBe(false);
    expect(test.statusCode).toBe(401);
    expect(test.error).toContain("Authentication failed");
    expect(test.error).not.toContain("bad-secret-key-12345");
  });
});
