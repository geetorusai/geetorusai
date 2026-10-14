import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { modelDiscoveryRoutes } from "../routes/model-discovery.js";
import { modelDiscoveryService } from "../services/model-discovery/model-discovery-service.js";

describe("Model Discovery & Preflight Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Attach dummy board actor for auth
    app.use((req, _res, next) => {
      req.actor = { type: "board", actorId: "test-user", source: "local_implicit" } as any;
      next();
    });
    app.use(modelDiscoveryRoutes());
  });

  it("POST /models/preflight validates requests correctly", async () => {
    const res = await request(app)
      .post("/models/preflight")
      .send({
        provider: "openai",
        model: "gpt-4o",
        prompt: "Hello GeetorusAI",
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.checks.length).toBeGreaterThan(0);
  });

  it("POST /models/preflight catches SSRF attempt", async () => {
    const res = await request(app)
      .post("/models/preflight")
      .send({
        provider: "openai",
        model: "gpt-4o",
        baseUrl: "http://169.254.169.254/latest/meta-data",
      });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.errors.some((e: string) => e.includes("protected metadata"))).toBe(true);
  });

  it("POST /models/test-connection tests provider credentials safely", async () => {
    vi.spyOn(modelDiscoveryService, "testConnection").mockResolvedValue({
      connected: true,
      latencyMs: 42,
      provider: "openai",
      statusCode: 200,
      checkedAt: new Date().toISOString(),
    });

    const res = await request(app)
      .post("/models/test-connection")
      .send({
        provider: "openai",
        apiKey: "sk-test-key",
      });

    expect(res.status).toBe(200);
    expect(res.body.connected).toBe(true);
    expect(res.body.latencyMs).toBe(42);
  });

  it("POST /models/discover fetches discovered models", async () => {
    vi.spyOn(modelDiscoveryService, "discoverModels").mockResolvedValue({
      provider: "openai",
      success: true,
      models: [
        {
          id: "gpt-4o",
          name: "gpt-4o",
          provider: "openai",
          contextWindow: 128000,
          maxOutputTokens: 16384,
          modalities: ["text", "image"],
          capabilities: { toolCalling: true, vision: true, streaming: true, jsonOutput: true },
          status: "available",
          discoveredAt: new Date().toISOString(),
          source: "live_api",
        },
      ],
      fetchedAt: new Date().toISOString(),
      cacheTtlMs: 900000,
    });

    const res = await request(app)
      .post("/models/discover")
      .send({ provider: "openai" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.models.length).toBe(1);
    expect(res.body.models[0].id).toBe("gpt-4o");
  });
});
