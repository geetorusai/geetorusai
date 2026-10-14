import { Router, type Request } from "express";
import { z } from "zod";
import { assertBoardOrAgent } from "./authz.js";
import { modelDiscoveryService } from "../services/model-discovery/model-discovery-service.js";
import { validatePreflight } from "../services/self-healing/preflight-validator.js";
import { hybridModelRouter } from "../services/self-healing/model-router.js";
import { unprocessable } from "../errors.js";

const testConnectionSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  organizationId: z.string().optional(),
});

const discoverSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  organizationId: z.string().optional(),
  forceRefresh: z.boolean().optional(),
});

const preflightSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  prompt: z.string().optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  contextLengthEstimated: z.number().optional(),
  knownModelContextWindow: z.number().nullable().optional(),
  allowLocalhost: z.boolean().optional(),
});

export function modelDiscoveryRoutes() {
  const router = Router();

  /**
   * Test provider connectivity without saving or exposing credentials
   */
  router.post("/models/test-connection", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const parsed = testConnectionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw unprocessable(parsed.error.message);
    }

    const result = await modelDiscoveryService.testConnection(parsed.data);
    res.json(result);
  });

  /**
   * Dynamically fetch and normalize models from provider API
   */
  router.post("/models/discover", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const parsed = discoverSchema.safeParse(req.body);
    if (!parsed.success) {
      throw unprocessable(parsed.error.message);
    }

    const result = await modelDiscoveryService.discoverModels(parsed.data, {
      forceRefresh: parsed.data.forceRefresh,
    });
    res.json(result);
  });

  /**
   * Run preflight validations on a request or configuration
   */
  router.post("/models/preflight", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const parsed = preflightSchema.safeParse(req.body);
    if (!parsed.success) {
      throw unprocessable(parsed.error.message);
    }

    const check = validatePreflight(parsed.data);
    res.json(check);
  });

  /**
   * Force refresh cached models for a provider
   */
  router.post("/models/refresh", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const parsed = discoverSchema.safeParse(req.body);
    if (!parsed.success) {
      throw unprocessable(parsed.error.message);
    }

    modelDiscoveryService.clearCache(parsed.data.provider);
    const result = await modelDiscoveryService.discoverModels(parsed.data, {
      forceRefresh: true,
    });
    res.json(result);
  });

  /**
   * Query model catalog with capability and provider filters
   */
  router.get("/models/catalog", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const provider = typeof req.query.provider === "string" ? req.query.provider : undefined;
    const capability = typeof req.query.capability === "string" ? req.query.capability : undefined;

    // Discover or fetch from cache if provider is given
    if (provider) {
      const result = await modelDiscoveryService.discoverModels({ provider });
      let models = result.models;

      if (capability) {
        if (capability === "toolCalling") models = models.filter((m) => m.capabilities.toolCalling);
        if (capability === "vision") models = models.filter((m) => m.capabilities.vision);
        if (capability === "streaming") models = models.filter((m) => m.capabilities.streaming);
        if (capability === "jsonOutput") models = models.filter((m) => m.capabilities.jsonOutput);
      }

      res.json({
        provider,
        success: result.success,
        models,
        fetchedAt: result.fetchedAt,
        source: result.models[0]?.source || "catalog",
      });
      return;
    }

    // Default catalog summary across popular providers if no specific provider requested
    res.json({
      message: "Specify ?provider=openai|anthropic|google|openrouter|ollama to query models.",
      supportedProviders: ["openai", "anthropic", "google", "openrouter", "ollama"],
    });
  });

  /**
   * Get token usage telemetry across all models and failover configuration
   */
  router.get("/models/tokens/usage", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const usage = hybridModelRouter.tokenTracker.getAllUsage();
    const config = hybridModelRouter.getConfig();
    const failovers = hybridModelRouter.getFailoverHistory();
    const ladder = hybridModelRouter.getLadder();

    res.json({
      success: true,
      usage,
      config,
      failovers,
      ladder,
    });
  });

  /**
   * Set token usage quota/limit for a specific model
   */
  router.post("/models/tokens/limit", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const schema = z.object({
      modelId: z.string().min(1),
      limit: z.number().int().min(0),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw unprocessable(parsed.error.message);
    }

    hybridModelRouter.tokenTracker.setLimit(parsed.data.modelId, parsed.data.limit);
    hybridModelRouter.updateConfig({
      tokenLimits: {
        [parsed.data.modelId]: parsed.data.limit,
      },
    });

    res.json({
      success: true,
      record: hybridModelRouter.tokenTracker.getUsage(parsed.data.modelId),
    });
  });

  /**
   * Reset token counters for a single model or all models
   */
  router.post("/models/tokens/reset", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const schema = z.object({
      modelId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw unprocessable(parsed.error.message);
    }

    hybridModelRouter.tokenTracker.reset(parsed.data.modelId);
    res.json({
      success: true,
      usage: hybridModelRouter.tokenTracker.getAllUsage(),
    });
  });

  /**
   * Get current hybrid model routing configuration
   */
  router.get("/models/route/config", async (req: Request, res) => {
    assertBoardOrAgent(req);
    res.json(hybridModelRouter.getConfig());
  });

  /**
   * Update hybrid model routing configuration
   */
  router.post("/models/route/config", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const schema = z.object({
      primaryModel: z.string().optional(),
      secondaryModel: z.string().optional(),
      cloudFallbackModels: z.array(z.string()).optional(),
      tokenLimits: z.record(z.string(), z.number()).optional(),
      autoFailoverEnabled: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw unprocessable(parsed.error.message);
    }

    const updated = hybridModelRouter.updateConfig(parsed.data);
    res.json({
      success: true,
      config: updated,
    });
  });

  /**
   * Execute request through hybrid auto-failover ladder:
   * glm-5.3-flash:cloud (Tier 1) -> deepseek-v4.1-flash:cloud (Tier 2) -> Cloud Models (Tier 3)
   */
  router.post("/models/route/execute", async (req: Request, res) => {
    assertBoardOrAgent(req);
    const schema = z.object({
      prompt: z.string().min(1),
      preferredModel: z.string().optional(),
      simulateFailures: z.array(z.string()).optional(), // Model IDs to simulate token limit/failure on for test runs
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw unprocessable(parsed.error.message);
    }

    const simulatedFailures = new Set(parsed.data.simulateFailures || []);

    const result = await hybridModelRouter.executeWithAutoFailover({
      prompt: parsed.data.prompt,
      preferredModel: parsed.data.preferredModel,
      executeFn: async (model, tier) => {
        // If simulation requested failure on this model, throw error or rate-limit
        if (simulatedFailures.has(model)) {
          throw new Error(`Simulated token limit / rate limit 429 for ${model}`);
        }

        // Return synthesized response showing model and tier execution
        return `[Executed by ${model} (${tier.toUpperCase()})]: Processed response for prompt "${parsed.data.prompt.slice(0, 60)}${parsed.data.prompt.length > 60 ? "…" : ""}"`;
      },
    });

    res.json({
      success: true,
      ...result,
    });
  });

  return router;
}
