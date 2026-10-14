import { Router, type Request } from "express";
import { z } from "zod";
import type { Db } from "@geetorusai/db";
import { assertBoardOrAgent } from "./authz.js";
import { pulseService } from "../services/pulse/pulse-service.js";
import { recoveryEngine } from "../services/self-healing/recovery-engine.js";
import { circuitBreakerRegistry } from "../services/self-healing/circuit-breaker.js";
import { notFound, unprocessable } from "../errors.js";

const updateSettingsSchema = z.object({
  autoRecoveryEnabled: z.boolean().optional(),
  monitoringIntervalSeconds: z.number().min(5).max(3600).optional(),
  circuitBreakerThreshold: z.number().min(1).max(50).optional(),
  circuitBreakerCooldownMs: z.number().min(1000).max(600000).optional(),
  maxRetryAttempts: z.number().min(0).max(10).optional(),
});

export function pulseRoutes(db?: Db) {
  const router = Router();

  /**
   * System health and Pulse status overview
   */
  router.get("/pulse/status", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const status = await pulseService.getPulseStatus(db);
    res.json(status);
  });

  /**
   * List recent incidents
   */
  router.get("/pulse/incidents", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const incidents = pulseService.getIncidents();
    res.json({ incidents });
  });

  /**
   * Resolve an incident manually
   */
  router.post("/pulse/incidents/:id/resolve", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const id = req.params.id;
    const resolved = pulseService.resolveIncident(id);
    if (!resolved) {
      throw notFound(`Incident '${id}' not found`);
    }
    res.json({ success: true, message: `Incident '${id}' marked resolved.` });
  });

  /**
   * Get all circuit breakers
   */
  router.get("/pulse/circuit-breakers", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const circuitBreakers = circuitBreakerRegistry.getAllStatuses();
    res.json({ circuitBreakers });
  });

  /**
   * Manually reset a tripped circuit breaker
   */
  router.post("/pulse/circuit-breakers/:provider/reset", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const provider = req.params.provider;
    const reset = pulseService.resetCircuitBreaker(provider);
    if (!reset) {
      throw notFound(`Circuit breaker for provider '${provider}' not found.`);
    }
    res.json({ success: true, message: `Circuit breaker for '${provider}' reset to closed.` });
  });

  /**
   * Get recovery history & metrics
   */
  router.get("/pulse/recovery-events", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const events = recoveryEngine.getRecentEvents(50);
    const metrics = recoveryEngine.getMetrics();
    res.json({ events, metrics });
  });

  /**
   * Get Pulse configuration & self-healing settings
   */
  router.get("/pulse/settings", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const settings = pulseService.getSettings();
    res.json(settings);
  });

  /**
   * Update Pulse configuration & self-healing settings
   */
  router.put("/pulse/settings", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw unprocessable(parsed.error.message);
    }
    const updated = pulseService.updateSettings(parsed.data);
    res.json(updated);
  });

  return router;
}
