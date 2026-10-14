import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adapterRoutes } from "../routes/adapters.js";
import { registerServerAdapter, unregisterServerAdapter } from "../adapters/registry.js";
import type { ServerAdapterModule } from "../adapters/types.js";

const testAdapterType = "test_custom_agent";

describe("Adapter-First Selection & Execution Routes", () => {
  const mockExecute = vi.fn();
  const mockTestEnvironment = vi.fn();
  const mockListModels = vi.fn();

  const testAdapter: ServerAdapterModule = {
    type: testAdapterType,
    execute: mockExecute,
    testEnvironment: mockTestEnvironment,
    listModels: mockListModels,
    runtimeToolDelivery: "environment",
  };

  let app: express.Express;

  beforeEach(() => {
    registerServerAdapter(testAdapter);
    app = express();
    app.use(express.json());
    // Attach board actor
    app.use((req, _res, next) => {
      (req as any).actor = {
        type: "board",
        userId: "test-board-user",
        companyIds: ["company-1"],
        source: "local_implicit",
        isInstanceAdmin: false,
      };
      next();
    });
    app.use("/api", adapterRoutes());

    mockExecute.mockReset();
    mockTestEnvironment.mockReset();
    mockListModels.mockReset();
  });

  afterEach(() => {
    unregisterServerAdapter(testAdapterType);
  });

  it("GET /api/adapters/:type/models loads verified models for the selected adapter", async () => {
    mockListModels.mockResolvedValue([
      { id: "model-alpha", label: "Model Alpha" },
      { id: "model-beta", label: "Model Beta" },
    ]);

    const res = await request(app).get(`/api/adapters/${testAdapterType}/models`);
    expect(res.status).toBe(200);
    expect(res.body.adapterType).toBe(testAdapterType);
    expect(res.body.models).toEqual([
      { id: "model-alpha", label: "Model Alpha" },
      { id: "model-beta", label: "Model Beta" },
    ]);
    expect(res.body.liveDiscovered).toBe(true);
    expect(mockListModels).toHaveBeenCalledTimes(1);
  });

  it("POST /api/adapters/:type/validate runs adapter environment test probe", async () => {
    mockTestEnvironment.mockResolvedValue({
      adapterType: testAdapterType,
      status: "pass",
      checks: [
        { code: "connection_ready", level: "info", message: "Adapter is connected and ready." },
      ],
      testedAt: new Date().toISOString(),
    });

    const res = await request(app)
      .post(`/api/adapters/${testAdapterType}/validate`)
      .send({ config: { model: "model-alpha" } });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("pass");
    expect(res.body.checks[0].code).toBe("connection_ready");
    expect(mockTestEnvironment).toHaveBeenCalledWith({
      adapterType: testAdapterType,
      companyId: "default",
      config: { model: "model-alpha" },
    });
  });

  it("POST /api/adapters/:type/execute-task dispatches task with exact model and Ponytail mandate", async () => {
    mockExecute.mockResolvedValue({
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: "Refactored module successfully",
      model: "model-alpha",
      provider: testAdapterType,
      usage: { inputTokens: 250, outputTokens: 110 },
      resultJson: {
        finalResponseText: "Task complete with zero regressions.",
      },
    });

    const res = await request(app)
      .post(`/api/adapters/${testAdapterType}/execute-task`)
      .send({
        model: "model-alpha",
        prompt: "Refactor database query optimization",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.modelUsed).toBe("model-alpha");
    expect(res.body.adapterType).toBe(testAdapterType);
    expect(res.body.response).toBe("Task complete with zero regressions.");
    expect(res.body.optimizationApplied).toEqual({
      layer: "ponytail",
      alwaysOn: true,
      mandateInjected: true,
    });

    // Verify Ponytail mandate was prepended to the prompt
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const callCtx = mockExecute.mock.calls[0][0];
    expect(callCtx.config.model).toBe("model-alpha");
    expect(callCtx.context.prompt).toContain("Ponytail Always-On Optimization Directive");
    expect(callCtx.context.prompt).toContain("Refactor database query optimization");
  });
});
