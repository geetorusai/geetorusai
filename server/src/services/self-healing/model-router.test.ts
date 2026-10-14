import { describe, it, expect, beforeEach } from "vitest";
import {
  HybridModelRouter,
  TokenUsageTracker,
  estimateTokens,
} from "./model-router.js";

describe("TokenUsageTracker", () => {
  let tracker: TokenUsageTracker;

  beforeEach(() => {
    tracker = new TokenUsageTracker({
      "glm-5.3-flash:cloud": 500,
      "deepseek-v4.1-flash:cloud": 1000,
    });
  });

  it("accurately tracks tokens and reports limit status", () => {
    expect(tracker.isLimitReached("glm-5.3-flash:cloud")).toBe(false);

    tracker.recordUsage("glm-5.3-flash:cloud", 200, 150);
    const usage = tracker.getUsage("glm-5.3-flash:cloud");
    expect(usage.totalTokens).toBe(350);
    expect(usage.requestCount).toBe(1);
    expect(tracker.isLimitReached("glm-5.3-flash:cloud")).toBe(false);

    tracker.recordUsage("glm-5.3-flash:cloud", 100, 100);
    expect(tracker.isLimitReached("glm-5.3-flash:cloud")).toBe(true);
  });

  it("updates limit and recalculates limitReached flag", () => {
    tracker.recordUsage("glm-5.3-flash:cloud", 400, 200); // 600 total > 500 limit
    expect(tracker.isLimitReached("glm-5.3-flash:cloud")).toBe(true);

    tracker.setLimit("glm-5.3-flash:cloud", 1000);
    expect(tracker.isLimitReached("glm-5.3-flash:cloud")).toBe(false);
  });

  it("resets usage for single or all models", () => {
    tracker.recordUsage("glm-5.3-flash:cloud", 300, 300);
    tracker.recordUsage("deepseek-v4.1-flash:cloud", 200, 200);

    tracker.reset("glm-5.3-flash:cloud");
    expect(tracker.getUsage("glm-5.3-flash:cloud").totalTokens).toBe(0);
    expect(tracker.getUsage("deepseek-v4.1-flash:cloud").totalTokens).toBe(400);

    tracker.reset();
    expect(tracker.getUsage("deepseek-v4.1-flash:cloud").totalTokens).toBe(0);
  });
});

describe("HybridModelRouter", () => {
  let router: HybridModelRouter;
  let tracker: TokenUsageTracker;

  beforeEach(() => {
    tracker = new TokenUsageTracker({
      "glm-5.3-flash:cloud": 500,
      "deepseek-v4.1-flash:cloud": 500,
    });

    router = new HybridModelRouter(
      {
        primaryModel: "glm-5.3-flash:cloud",
        secondaryModel: "deepseek-v4.1-flash:cloud",
        cloudFallbackModels: ["gpt-4o-mini", "claude-3-5-sonnet"],
        tokenLimits: {
          "glm-5.3-flash:cloud": 500,
          "deepseek-v4.1-flash:cloud": 500,
        },
        autoFailoverEnabled: true,
      },
      tracker,
    );
  });

  it("executes primary model glm-5.3-flash:cloud when under limit", async () => {
    const executedModels: string[] = [];

    const res = await router.executeWithAutoFailover({
      prompt: "Generate an AI summary",
      executeFn: async (model, tier) => {
        executedModels.push(model);
        return `Result from ${model} (${tier})`;
      },
    });

    expect(res.modelUsed).toBe("glm-5.3-flash:cloud");
    expect(res.tier).toBe("primary");
    expect(executedModels).toEqual(["glm-5.3-flash:cloud"]);
    expect(res.failoverEvents).toHaveLength(0);
  });

  it("automatically fails over to deepseek-v4.1-flash:cloud when glm-5.3-flash:cloud reaches token limit", async () => {
    // Fill quota for primary model
    tracker.recordUsage("glm-5.3-flash:cloud", 300, 300); // 600 > 500
    expect(tracker.isLimitReached("glm-5.3-flash:cloud")).toBe(true);

    const executedModels: string[] = [];
    const res = await router.executeWithAutoFailover({
      prompt: "Execute analysis task",
      executeFn: async (model, tier) => {
        executedModels.push(model);
        return `Output from ${model} (${tier})`;
      },
    });

    // Tier 2 should have been executed seamlessly
    expect(res.modelUsed).toBe("deepseek-v4.1-flash:cloud");
    expect(res.tier).toBe("secondary");
    expect(executedModels).toEqual(["deepseek-v4.1-flash:cloud"]);
    expect(res.failoverEvents).toHaveLength(1);
    expect(res.failoverEvents[0].fromModel).toBe("glm-5.3-flash:cloud");
    expect(res.failoverEvents[0].toModel).toBe("deepseek-v4.1-flash:cloud");
    expect(res.failoverEvents[0].reason).toBe("token_limit_reached");
  });

  it("automatically fails over to cloud models when BOTH models reach token limits", async () => {
    // Both Ollama models reach their token limit
    tracker.recordUsage("glm-5.3-flash:cloud", 300, 300); // 600 > 500
    tracker.recordUsage("deepseek-v4.1-flash:cloud", 300, 300); // 600 > 500

    expect(tracker.isLimitReached("glm-5.3-flash:cloud")).toBe(true);
    expect(tracker.isLimitReached("deepseek-v4.1-flash:cloud")).toBe(true);

    const executedModels: string[] = [];
    const res = await router.executeWithAutoFailover({
      prompt: "Deep code analysis query",
      executeFn: async (model, tier) => {
        executedModels.push(model);
        return `Cloud result from ${model}`;
      },
    });

    // Should seamlessly land on first cloud fallback: gpt-4o-mini
    expect(res.modelUsed).toBe("gpt-4o-mini");
    expect(res.tier).toBe("cloud");
    expect(executedModels).toEqual(["gpt-4o-mini"]);
    expect(res.failoverEvents).toHaveLength(2);
    expect(res.failoverEvents[0].reason).toBe("token_limit_reached");
    expect(res.failoverEvents[1].reason).toBe("token_limit_reached");
    expect(res.failoverEvents[1].toModel).toBe("gpt-4o-mini");
  });

  it("fails over to secondary or cloud when primary encounters rate limit 429 during execution", async () => {
    const executedModels: string[] = [];

    const res = await router.executeWithAutoFailover({
      prompt: "Urgent classification request",
      executeFn: async (model, tier) => {
        executedModels.push(model);
        if (model === "glm-5.3-flash:cloud") {
          const err = new Error("429 Too Many Requests: quota exceeded");
          throw err;
        }
        return `Success from ${model}`;
      },
    });

    expect(executedModels).toEqual([
      "glm-5.3-flash:cloud",
      "deepseek-v4.1-flash:cloud",
    ]);
    expect(res.modelUsed).toBe("deepseek-v4.1-flash:cloud");
    expect(res.failoverEvents[0].reason).toBe("rate_limit_429");
  });

  it("fails all the way to cloud fallback if both Ollama models error out", async () => {
    const executedModels: string[] = [];

    const res = await router.executeWithAutoFailover({
      prompt: "Critical pipeline run",
      executeFn: async (model, tier) => {
        executedModels.push(model);
        if (tier !== "cloud") {
          throw new Error(`Service unavailable for ${model}`);
        }
        return `Final cloud success from ${model}`;
      },
    });

    expect(res.modelUsed).toBe("gpt-4o-mini");
    expect(res.tier).toBe("cloud");
    expect(executedModels).toEqual([
      "glm-5.3-flash:cloud",
      "deepseek-v4.1-flash:cloud",
      "gpt-4o-mini",
    ]);
  });
});

describe("estimateTokens", () => {
  it("estimates tokens based on characters", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("Hello World! This is a test sentence.")).toBe(10);
  });
});
