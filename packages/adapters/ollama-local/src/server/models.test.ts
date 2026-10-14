import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { listOllamaModels, refreshOllamaModels, fetchLiveOllamaModels } from "./models.js";

describe("Ollama Live Models Discovery", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("fetches and formats installed models from /api/tags", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { name: "gemma3:4b", details: { parameter_size: "3.9B" } },
          { name: "custom-coder:latest", details: { parameter_size: "7B" } },
        ],
      }),
    } as unknown as Response);

    const models = await fetchLiveOllamaModels("http://127.0.0.1:11434");
    expect(models).toEqual([
      { id: "gemma3:4b", label: "gemma3:4b (3.9B)" },
      { id: "custom-coder:latest", label: "custom-coder:latest (7B)" },
    ]);
  });

  it("gracefully falls back to default catalog when daemon is unreachable", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:11434"));

    const models = await fetchLiveOllamaModels("http://127.0.0.1:11434");
    expect(models).toEqual([]);

    const fullList = await refreshOllamaModels();
    expect(fullList.length).toBeGreaterThan(0);
    expect(fullList.some((m) => m.id === "gemma3:4b")).toBe(true);
  });
});
