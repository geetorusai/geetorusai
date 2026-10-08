import { afterEach, describe, expect, it, vi } from "vitest";
import { execute } from "./execute.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Ollama local execution timeout", () => {
  it("treats timeoutSec 0 as no adapter timeout", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const signal = init?.signal;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 10);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(signal.reason);
        }, { once: true });
      });
      return new Response(`${JSON.stringify({ response: "hello", done: false })}\n${JSON.stringify({ done: true })}\n`, {
        status: 200,
        headers: { "Content-Type": "application/x-ndjson" },
      });
    });

    const result = await execute({
      runId: "run-1",
      agent: {
        id: "agent-1",
        companyId: "company-1",
        name: "Ollama",
        adapterType: "ollama_local",
        adapterConfig: {},
      },
      runtime: {
        sessionId: null,
        sessionParams: null,
        sessionDisplayId: null,
        taskKey: null,
      },
      config: {
        host: "http://127.0.0.1:11434",
        model: "llama3:latest",
        timeoutSec: 0,
      },
      context: { prompt: "Say hello" },
      onLog: async () => {},
      onMeta: async () => {},
      onSpawn: async () => {},
    });

    expect(result).toMatchObject({
      exitCode: 0,
      timedOut: false,
      summary: "hello",
    });
  });
});
