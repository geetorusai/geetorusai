import express from "express";
import request from "supertest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { pulseRoutes } from "../routes/pulse.js";
import { pulseService } from "../services/pulse/pulse-service.js";
import { circuitBreakerRegistry } from "../services/self-healing/circuit-breaker.js";

describe("Pulse — System Health & Recovery Routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    // Attach dummy board actor for auth
    app.use((req, _res, next) => {
      req.actor = { type: "board", actorId: "test-user", source: "local_implicit" } as any;
      next();
    });
    app.use(pulseRoutes());
  });

  it("GET /pulse/status returns system health state and service breakdown", async () => {
    const res = await request(app).get("/pulse/status");

    expect(res.status).toBe(200);
    expect(res.body.state).toBeDefined();
    expect(res.body.services["api-gateway"]).toBeDefined();
    expect(res.body.services["api-gateway"].status).toBe("healthy");
    expect(res.body.metrics).toBeDefined();
  });

  it("GET /pulse/circuit-breakers returns breaker statuses", async () => {
    // Record failure to create breaker entry
    circuitBreakerRegistry.recordFailure("openai-test");

    const res = await request(app).get("/pulse/circuit-breakers");

    expect(res.status).toBe(200);
    expect(res.body.circuitBreakers).toBeDefined();
    expect(res.body.circuitBreakers["openai-test"]).toBeDefined();
  });

  it("POST /pulse/circuit-breakers/:provider/reset resets tripped breaker", async () => {
    circuitBreakerRegistry.recordFailure("anthropic-test");
    const res = await request(app).post("/pulse/circuit-breakers/anthropic-test/reset");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(circuitBreakerRegistry.get("anthropic-test").getStatus().state).toBe("closed");
  });

  it("GET /pulse/settings and PUT /pulse/settings reads and updates configuration", async () => {
    const getRes = await request(app).get("/pulse/settings");
    expect(getRes.status).toBe(200);
    expect(getRes.body.autoRecoveryEnabled).toBe(true);

    const putRes = await request(app)
      .put("/pulse/settings")
      .send({ maxRetryAttempts: 4 });

    expect(putRes.status).toBe(200);
    expect(putRes.body.maxRetryAttempts).toBe(4);
  });
});
