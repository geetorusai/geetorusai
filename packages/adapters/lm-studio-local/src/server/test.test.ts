import { afterEach, describe, expect, it, vi } from "vitest";

const testOpenAICompatibleEnvironment = vi.hoisted(() => vi.fn(async (ctx: { adapterType: string }) => ({
  adapterType: ctx.adapterType,
  status: "pass" as const,
  checks: [{
    code: "openai_compatible_command_resolvable",
    level: "info" as const,
    message: "Command is executable: opencode",
  }],
  testedAt: new Date().toISOString(),
})));

vi.mock("@geetorusai/adapter-openai-compatible-local/server", () => ({
  testEnvironment: testOpenAICompatibleEnvironment,
}));

import { testEnvironment } from "./test.js";

afterEach(() => {
  vi.restoreAllMocks();
  testOpenAICompatibleEnvironment.mockClear();
});

describe("LM Studio environment test", () => {
  it("uses a lightweight completion after checking the local OpenCode executable", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ id: "qwen2.5-coder-7b-instruct" }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        models: [{
          key: "qwen2.5-coder-7b-instruct",
          loaded_instances: [{
            id: "qwen2.5-coder-7b-instruct",
            config: { context_length: 32768 },
          }],
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { role: "assistant", content: "hello" } }],
      }), { status: 200 }));

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "lm_studio_local",
      config: {
        baseUrl: "http://192.168.1.250:1234/v1",
        model: "qwen2.5-coder-7b-instruct",
      },
    });

    expect(result.status).toBe("pass");
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "lm_studio_harness_command_resolvable" }),
      expect.objectContaining({ code: "lm_studio_context_ready" }),
      expect.objectContaining({ code: "lm_studio_hello_probe_passed" }),
    ]));
    expect(testOpenAICompatibleEnvironment).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({ skipHelloProbe: true }),
    }));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://192.168.1.250:1234/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fails before the hello probe when the loaded context is too small for an agent run", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: [{ id: "qwen2.5-7b-instruct-1m" }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        models: [{
          key: "qwen2.5-7b-instruct-1m",
          loaded_instances: [{
            id: "qwen2.5-7b-instruct-1m",
            config: { context_length: 4096 },
          }],
        }],
      }), { status: 200 }));

    const result = await testEnvironment({
      companyId: "company-1",
      adapterType: "lm_studio_local",
      config: {
        baseUrl: "http://192.168.1.250:1234/v1",
        model: "qwen2.5-7b-instruct-1m",
      },
    });

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual(expect.objectContaining({
      code: "lm_studio_context_too_small",
      level: "error",
      message: expect.stringContaining("4,096-token context"),
    }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(testOpenAICompatibleEnvironment).not.toHaveBeenCalled();
  });
});
