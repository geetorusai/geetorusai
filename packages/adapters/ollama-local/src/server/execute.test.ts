import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { execute } from "./execute.js";
import { testEnvironment } from "./test.js";
import type { AdapterExecutionContext, AdapterEnvironmentTestContext } from "@geetorusai/adapter-utils";

function mockExecutionContext(overrides: Record<string, unknown> = {}): AdapterExecutionContext {
  return {
    runId: "run-test-1",
    agent: { id: "agent-1", name: "test-agent" },
    runtime: {},
    config: {},
    context: {},
    onLog: vi.fn(),
    ...overrides,
  } as unknown as AdapterExecutionContext;
}

function mockTestContext(overrides: Record<string, unknown> = {}): AdapterEnvironmentTestContext {
  return {
    companyId: "company-1",
    adapterType: "ollama_local",
    config: {},
    ...overrides,
  } as unknown as AdapterEnvironmentTestContext;
}

describe("Ollama Local and Cloud Adapter Runtime", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Local Ollama Execution", () => {
    it("reports an explicit connection failure when local Ollama daemon is unreachable", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:11434"));

      const ctx = mockExecutionContext({
        config: {
          host: "http://127.0.0.1:11434",
          model: "gemma3:4b",
        },
        context: {
          prompt: "Write a function that calculates fibonacci numbers",
        },
      });

      const result = await execute(ctx);

      expect(result.exitCode).toBe(1);
      expect(result.provider).toBe("ollama_local");
      expect(result.errorMessage).toContain("Cannot connect to local Ollama daemon");
      expect(result.errorMessage).toContain("ollama serve");
    });

    it("verifies model availability and rejects execution without auto-downloading when model is missing", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: "mistral:latest" }, { name: "qwen2.5-coder:7b" }],
        }),
      } as Response);

      const ctx = mockExecutionContext({
        config: {
          host: "http://127.0.0.1:11434",
          model: "llama3.3:latest",
        },
        context: {
          prompt: "Explain event loop",
        },
      });

      const result = await execute(ctx);

      expect(result.exitCode).toBe(1);
      expect(result.provider).toBe("ollama_local");
      expect(result.errorMessage).toContain('Configured Ollama model "llama3.3:latest" is not installed locally');
      expect(result.errorMessage).toContain('ollama pull llama3.3:latest');
    });

    it("streams responses, tracks tokens, and returns complete result when local model is present", async () => {
      const logs: string[] = [];
      const chunks = [
        JSON.stringify({ model: "gemma3:4b", message: { content: "Here is " }, done: false }),
        JSON.stringify({ model: "gemma3:4b", message: { content: "the solution." }, done: false }),
        JSON.stringify({
          model: "gemma3:4b",
          done: true,
          prompt_eval_count: 24,
          eval_count: 12,
          total_duration: 500000000,
        }),
      ];

      let streamIndex = 0;
      const mockStream = new ReadableStream({
        pull(controller) {
          if (streamIndex < chunks.length) {
            controller.enqueue(new TextEncoder().encode(chunks[streamIndex] + "\n"));
            streamIndex++;
          } else {
            controller.close();
          }
        },
      });

      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/api/tags")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ models: [{ name: "gemma3:4b" }] }),
          } as Response;
        }
        if (url.includes("/api/chat")) {
          return {
            ok: true,
            status: 200,
            body: mockStream,
          } as unknown as Response;
        }
        return { ok: true, status: 200 } as Response;
      });

      const ctx = mockExecutionContext({
        config: {
          host: "http://127.0.0.1:11434",
          model: "gemma3:4b",
        },
        context: {
          prompt: "Solve fibonacci",
        },
        onLog: async (_channel: "stderr" | "stdout", text: string) => {
          logs.push(text);
        },
      });

      const result = await execute(ctx);

      expect(result.exitCode).toBe(0);
      expect(result.provider).toBe("ollama_local");
      expect(result.summary).toContain("Here is the solution.");
      expect(result.usage?.inputTokens).toBe(24);
      expect(result.usage?.outputTokens).toBe(12);
      expect(logs.join("")).toContain("Here is the solution.");
    });
  });

  describe("Ollama Cloud Execution", () => {
    it("attaches Authorization header and handles authenticated remote endpoint stream", async () => {
      const chunks = [
        JSON.stringify({ model: "deepseek-v3", message: { content: "Cloud response text" }, done: false }),
        JSON.stringify({
          model: "deepseek-v3",
          done: true,
          prompt_eval_count: 50,
          eval_count: 30,
        }),
      ];

      let streamIndex = 0;
      const mockStream = new ReadableStream({
        pull(controller) {
          if (streamIndex < chunks.length) {
            controller.enqueue(new TextEncoder().encode(chunks[streamIndex] + "\n"));
            streamIndex++;
          } else {
            controller.close();
          }
        },
      });

      let capturedHeaders: Record<string, string> = {};

      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        capturedHeaders = (init?.headers as Record<string, string>) || {};
        return {
          ok: true,
          status: 200,
          body: mockStream,
        } as unknown as Response;
      });

      const ctx = mockExecutionContext({
        config: {
          host: "https://ollama.company.cloud",
          apiKey: "secret-token-xyz",
          model: "deepseek-v3:cloud",
        },
        context: {
          prompt: "Cloud task instruction",
        },
      });

      const result = await execute(ctx);

      expect(result.exitCode).toBe(0);
      expect(result.provider).toBe("ollama_cloud");
      expect(capturedHeaders["Authorization"]).toBe("Bearer secret-token-xyz");
      expect(result.summary).toContain("Cloud response text");
      expect(result.usage?.inputTokens).toBe(50);
      expect(result.usage?.outputTokens).toBe(30);
    });

    it("returns explicit error on authentication failure (401/403)", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized: Invalid API key",
      } as Response);

      const ctx = mockExecutionContext({
        config: {
          host: "https://ollama.company.cloud",
          apiKey: "invalid-key",
          model: "llama3.3:cloud",
        },
        context: {
          prompt: "Test auth",
        },
      });

      const result = await execute(ctx);

      expect(result.exitCode).toBe(1);
      expect(result.provider).toBe("ollama_cloud");
      expect(result.errorMessage).toContain("Ollama Cloud authentication failed (HTTP 401)");
    });

    it("returns rate limit diagnostic when Ollama Cloud returns 429", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => "Too Many Requests",
      } as Response);

      const ctx = mockExecutionContext({
        config: {
          host: "https://ollama.company.cloud",
          apiKey: "valid-key",
          model: "qwen2.5-coder:32b:cloud",
        },
        context: {
          prompt: "Rate limit test",
        },
      });

      const result = await execute(ctx);

      expect(result.exitCode).toBe(1);
      expect(result.provider).toBe("ollama_cloud");
      expect(result.errorMessage).toContain("Ollama Cloud rate limit exceeded");
    });
  });

  describe("Environment Testing", () => {
    it("verifies reachable local instance with model status", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: "gemma3:4b" }],
        }),
      } as Response);

      const ctx = mockTestContext({
        config: {
          host: "http://127.0.0.1:11434",
          model: "gemma3:4b",
        },
      });

      const testRes = await testEnvironment(ctx);
      expect(testRes.status).toBe("pass");
      expect(testRes.checks.some((c) => c.code === "ollama_model_ready")).toBe(true);
    });

    it("flags missing model as a warning without failing connection check", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: "other-model:latest" }],
        }),
      } as Response);

      const ctx = mockTestContext({
        config: {
          host: "http://127.0.0.1:11434",
          model: "gemma3:4b",
        },
      });

      const testRes = await testEnvironment(ctx);
      expect(testRes.status).toBe("warn");
      expect(testRes.checks.some((c) => c.code === "ollama_model_missing")).toBe(true);
    });
  });
});
