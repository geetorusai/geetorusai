import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverLmStudioModels, requireLmStudioModelId } from "./models.js";
import { normalizeLmStudioBaseUrl, withLmStudioDefaults } from "./config.js";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LM_STUDIO_API_TOKEN;
});

describe("LM Studio adapter configuration", () => {
  it("requires a non-empty model ID", () => {
    expect(requireLmStudioModelId("  publisher/model  ")).toBe("publisher/model");
    expect(() => requireLmStudioModelId("  ")).toThrow("model must be a non-empty");
  });

  it("normalizes the default and server-root URLs to the OpenAI-compatible v1 base", () => {
    expect(normalizeLmStudioBaseUrl(undefined)).toBe("http://127.0.0.1:1234/v1");
    expect(normalizeLmStudioBaseUrl("http://localhost:1234/")).toBe("http://localhost:1234/v1");
    expect(normalizeLmStudioBaseUrl("http://localhost:1234/v1/")).toBe("http://localhost:1234/v1");
  });

  it("uses the LM Studio token from adapter env without persisting it as a dedicated config field", () => {
    expect(withLmStudioDefaults({ env: { LM_STUDIO_API_TOKEN: "secret-token" } })).toMatchObject({
      baseUrl: "http://127.0.0.1:1234/v1",
      apiKey: "secret-token",
    });
  });

  it("discovers and sorts model identifiers from the OpenAI-compatible endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "zeta/model" }, { id: "alpha/model" }, { id: "alpha/model" }],
    }), { status: 200 }));

    await expect(discoverLmStudioModels({
      baseUrl: "http://localhost:1234",
      apiKey: "token",
    })).resolves.toEqual([
      { id: "alpha/model", label: "alpha/model" },
      { id: "zeta/model", label: "zeta/model" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:1234/v1/models", expect.objectContaining({
      headers: { Authorization: "Bearer token" },
    }));
  });

  it("detects models from the configured LAN server instead of localhost", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: "local/primary" }, { id: "local/secondary" }],
    }), { status: 200 }));

    const { detectLmStudioModel } = await import("./models.js");
    await expect(detectLmStudioModel({
      baseUrl: "http://192.168.1.250:1234/v1",
    })).resolves.toEqual({
      model: "local/primary",
      provider: "lm_studio",
      source: "http://192.168.1.250:1234/v1/models",
      candidates: ["local/secondary"],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://192.168.1.250:1234/v1/models",
      expect.any(Object),
    );
  });

  it("surfaces failures for an explicitly configured discovery URL", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("connection refused"));
    const { listLmStudioModels } = await import("./models.js");

    await expect(listLmStudioModels({
      baseUrl: "http://192.168.1.250:1234/v1",
    })).rejects.toThrow("connection refused");
  });
});
