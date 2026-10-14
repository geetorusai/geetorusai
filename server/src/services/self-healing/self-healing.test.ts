import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyError } from "./error-classifier.js";
import { CircuitBreakerRegistry } from "./circuit-breaker.js";
import { RecoveryEngine } from "./recovery-engine.js";
import { validatePreflight, validateBaseUrlSecurity } from "./preflight-validator.js";

describe("Self-Healing: Error Classifier", () => {
  it("classifies HTTP 429 rate limit errors as recoverable and extracts Retry-After", () => {
    const error = {
      message: "Rate limit reached for requests per minute. Retry after 12s.",
      status: 429,
      headers: { "retry-after": "12" },
    };
    const classified = classifyError(error, { provider: "openai" });

    expect(classified.category).toBe("rate_limit");
    expect(classified.recoverable).toBe(true);
    expect(classified.severity).toBe("medium");
    expect(classified.retryAfterSeconds).toBe(12);
    expect(classified.userFacingExplanation).toContain("12s");
  });

  it("classifies HTTP 401 invalid API key as unrecoverable to prevent retry loops", () => {
    const error = new Error("Incorrect API key provided: sk-proj-1234567890abcdef. You can find your API key at...");
    const classified = classifyError(error, { provider: "openai" });

    expect(classified.category).toBe("auth");
    expect(classified.recoverable).toBe(false);
    expect(classified.severity).toBe("critical");
    // Ensure raw secret is sanitized
    expect(classified.message).not.toContain("sk-proj-1234567890abcdef");
    expect(classified.message).toContain("[REDACTED_KEY]");
  });

  it("classifies network timeout errors as recoverable", () => {
    const error = new Error("Connection timeout: ETIMEDOUT 104.18.2.1:443");
    const classified = classifyError(error, { provider: "anthropic" });

    expect(classified.category).toBe("timeout");
    expect(classified.recoverable).toBe(true);
    expect(classified.userFacingExplanation).toContain("timed out");
  });

  it("sanitizes bearer tokens from error strings", () => {
    const error = new Error("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret token was rejected");
    const classified = classifyError(error);

    expect(classified.message).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(classified.message).toContain("Bearer [REDACTED_TOKEN]");
  });
});

describe("Self-Healing: Circuit Breaker", () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = new CircuitBreakerRegistry();
  });

  it("remains closed when failures are below threshold", () => {
    const provider = "test-provider";
    registry.recordFailure(provider);
    registry.recordFailure(provider);

    const check = registry.canExecute(provider);
    expect(check.allowed).toBe(true);
  });

  it("trips to open when threshold is reached and blocks execution", () => {
    const provider = "failing-provider";
    // Default threshold is 4
    for (let i = 0; i < 4; i++) {
      registry.recordFailure(provider);
    }

    const check = registry.canExecute(provider);
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Circuit breaker active");

    const status = registry.get(provider).getStatus();
    expect(status.state).toBe("open");
    expect(status.failures).toBe(4);
  });

  it("resets immediately when reset is invoked", () => {
    const provider = "failing-provider";
    for (let i = 0; i < 4; i++) {
      registry.recordFailure(provider);
    }
    expect(registry.canExecute(provider).allowed).toBe(false);

    registry.reset(provider);
    const check = registry.canExecute(provider);
    expect(check.allowed).toBe(true);
    expect(registry.get(provider).getStatus().state).toBe("closed");
  });
});

describe("Self-Healing: Recovery Engine", () => {
  it("executes successfully on first attempt without recovery delays", async () => {
    const engine = new RecoveryEngine();
    const mockFn = vi.fn().mockResolvedValue("success");

    const res = await engine.executeWithRecovery({
      component: "inference",
      provider: "openai",
      execute: mockFn,
    });

    expect(res).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("recovers from temporary failures with bounded retry", async () => {
    const engine = new RecoveryEngine();
    let calls = 0;
    const mockFn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 2) {
        throw new Error("Temporary network glitch: ECONNRESET");
      }
      return "recovered-success";
    });

    const res = await engine.executeWithRecovery({
      component: "inference",
      provider: "openai",
      baseDelayMs: 10,
      maxDelayMs: 50,
      execute: mockFn,
    });

    expect(res).toBe("recovered-success");
    expect(calls).toBe(2);
    expect(engine.getMetrics().recoveredCount).toBe(1);
  });

  it("switches to approved fallback model when primary model is unsupported or fails", async () => {
    const engine = new RecoveryEngine();
    const fallbackSpy = vi.fn();

    const mockFn = vi.fn().mockImplementation(async (attempt, model) => {
      if (model === "deprecated-model") {
        throw new Error("HTTP 404: The model `deprecated-model` does not exist");
      }
      return `executed-with-${model}`;
    });

    const res = await engine.executeWithRecovery({
      component: "agent-run",
      provider: "openai",
      model: "deprecated-model",
      fallbackModel: "gpt-4o",
      baseDelayMs: 10,
      onFallback: fallbackSpy,
      execute: mockFn,
    });

    expect(res).toBe("executed-with-gpt-4o");
    expect(fallbackSpy).toHaveBeenCalledWith("deprecated-model", "gpt-4o");
  });

  it("refuses to retry unrecoverable credential errors", async () => {
    const engine = new RecoveryEngine();
    const mockFn = vi.fn().mockRejectedValue(new Error("HTTP 401: Invalid API key"));

    await expect(
      engine.executeWithRecovery({
        component: "inference",
        provider: "anthropic",
        execute: mockFn,
      }),
    ).rejects.toThrow("Invalid API key");

    // Must NOT retry
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(engine.getMetrics().failedCount).toBe(1);
  });
});

describe("Proactive Error Prevention: Preflight Validator", () => {
  it("blocks SSRF attempts to AWS/cloud metadata address 169.254.169.254", () => {
    const check = validateBaseUrlSecurity("http://169.254.169.254/latest/meta-data/");
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("protected metadata");
  });

  it("blocks metadata.google.internal hostname", () => {
    const check = validateBaseUrlSecurity("http://metadata.google.internal/computeMetadata/v1/");
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("protected metadata");
  });

  it("allows localhost only when explicitly permitted (e.g. Ollama)", () => {
    const blockedCheck = validateBaseUrlSecurity("http://localhost:11434", false);
    expect(blockedCheck.valid).toBe(false);

    const allowedCheck = validateBaseUrlSecurity("http://localhost:11434", true);
    expect(allowedCheck.valid).toBe(true);
  });

  it("rejects empty or whitespace-only prompts", () => {
    const preflight = validatePreflight({
      provider: "openai",
      model: "gpt-4o",
      prompt: "   \n\t  ",
    });

    expect(preflight.valid).toBe(false);
    expect(preflight.errors).toContain("Empty prompt cannot be submitted to inference provider.");
  });

  it("validates context window against estimated token count", () => {
    const preflightExceeded = validatePreflight({
      provider: "openai",
      model: "gpt-4o",
      prompt: "Hello world",
      contextLengthEstimated: 200000,
      knownModelContextWindow: 128000,
    });

    expect(preflightExceeded.valid).toBe(false);
    expect(preflightExceeded.errors).toContain("Estimated tokens exceed model context limit.");

    const preflightOk = validatePreflight({
      provider: "openai",
      model: "gpt-4o",
      prompt: "Hello world",
      contextLengthEstimated: 5000,
      knownModelContextWindow: 128000,
    });

    expect(preflightOk.valid).toBe(true);
    expect(preflightOk.errors.length).toBe(0);
  });
});
