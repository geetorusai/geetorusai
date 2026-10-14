import { randomUUID } from "node:crypto";
import type { ClassifiedError, ErrorCategory, ErrorSeverity } from "@geetorusai/shared";

export interface ErrorClassificationContext {
  component?: string;
  provider?: string;
  model?: string;
  correlationId?: string;
}

export function classifyError(error: unknown, context: ErrorClassificationContext = {}): ClassifiedError {
  const correlationId = context.correlationId || `err-${randomUUID().slice(0, 8)}`;
  const component = context.component || "ai-infrastructure";
  const rawMessage = error instanceof Error ? error.message : String(error);
  const timestamp = new Date().toISOString();

  // Strip potential keys or bearer tokens from raw error messages for safe user display
  const sanitizedMessage = sanitizeErrorText(rawMessage);

  // Check HTTP status if present on error object
  const httpStatus = extractHttpStatus(error);
  const retryAfter = extractRetryAfter(error);

  // 1. Rate Limiting (429)
  if (httpStatus === 429 || /rate limit|quota exceeded|too many requests|tokens per minute/i.test(rawMessage)) {
    return {
      correlationId,
      category: "rate_limit",
      severity: "medium",
      recoverable: true,
      message: sanitizedMessage,
      userFacingExplanation: `Provider rate limit encountered.${retryAfter ? ` Retry after ${retryAfter}s.` : " Backing off automatically."}`,
      affectedComponent: component,
      provider: context.provider,
      model: context.model,
      httpStatus: 429,
      retryAfterSeconds: retryAfter,
      timestamp,
    };
  }

  // 2. Authentication & Authorization (401, 403)
  if (
    httpStatus === 401 ||
    httpStatus === 403 ||
    /invalid api key|incorrect api key|unauthorized|authentication failed|forbidden|expired token/i.test(rawMessage)
  ) {
    return {
      correlationId,
      category: httpStatus === 403 ? "permission" : "auth",
      severity: "critical",
      recoverable: false, // Do not retry bad keys automatically
      message: sanitizedMessage,
      userFacingExplanation: "Authentication failed. The API key or credential is invalid or has expired. Please update provider credentials in Settings.",
      affectedComponent: component,
      provider: context.provider,
      model: context.model,
      httpStatus,
      timestamp,
    };
  }

  // 3. Timeout Errors
  if (/timeout|aborted|signal timed out|ETIMEDOUT|deadline exceeded/i.test(rawMessage)) {
    return {
      correlationId,
      category: "timeout",
      severity: "medium",
      recoverable: true,
      message: sanitizedMessage,
      userFacingExplanation: "The request timed out while communicating with the upstream endpoint. Automatic retry scheduled.",
      affectedComponent: component,
      provider: context.provider,
      model: context.model,
      httpStatus: 408,
      timestamp,
    };
  }

  // 4. Network / Connection Errors
  if (/ECONNRESET|ECONNREFUSED|ENOTFOUND|network error|failed to fetch|socket hang up|unreachable/i.test(rawMessage)) {
    return {
      correlationId,
      category: "network",
      severity: "high",
      recoverable: true,
      message: sanitizedMessage,
      userFacingExplanation: "The model endpoint is currently unreachable. Check your service connection or daemon status (e.g. 'ollama serve').",
      affectedComponent: component,
      provider: context.provider,
      model: context.model,
      timestamp,
    };
  }

  // 5. Unsupported Model / Model Not Found (404)
  if (httpStatus === 404 || /model not found|unsupported model|does not exist|model_not_found/i.test(rawMessage)) {
    return {
      correlationId,
      category: "unsupported_model",
      severity: "high",
      recoverable: false, // Model doesn't exist, cannot simply retry identical request
      message: sanitizedMessage,
      userFacingExplanation: `The requested model ${context.model ? `'${context.model}' ` : ""}is not supported or not found on this provider. Please refresh model discovery.`,
      affectedComponent: component,
      provider: context.provider,
      model: context.model,
      httpStatus: 404,
      timestamp,
    };
  }

  // 6. Context Window / Payload Size
  if (/context length|maximum context|payload too large|request too large|token limit exceeded/i.test(rawMessage)) {
    return {
      correlationId,
      category: "payload_too_large",
      severity: "high",
      recoverable: false,
      message: sanitizedMessage,
      userFacingExplanation: "Prompt or conversation exceeds the model's maximum context length. Consider selecting a model with a larger context window.",
      affectedComponent: component,
      provider: context.provider,
      model: context.model,
      httpStatus: 413,
      timestamp,
    };
  }

  // 7. Upstream Server Errors (5xx)
  if ((httpStatus && httpStatus >= 500) || /internal server error|bad gateway|service unavailable|gateway timeout|server error/i.test(rawMessage)) {
    return {
      correlationId,
      category: "server_error",
      severity: "high",
      recoverable: true,
      message: sanitizedMessage,
      userFacingExplanation: "The upstream AI provider returned a server error (5xx). Transient failure; retrying with backoff.",
      affectedComponent: component,
      provider: context.provider,
      model: context.model,
      httpStatus: httpStatus || 500,
      timestamp,
    };
  }

  // 8. Database Errors
  if (/postgres|drizzle|relation .* already exists|duplicate key|syntax error at or near/i.test(rawMessage)) {
    return {
      correlationId,
      category: "database",
      severity: "high",
      recoverable: false,
      message: sanitizedMessage,
      userFacingExplanation: "Database storage or query failure. Please inspect local PostgreSQL state.",
      affectedComponent: "database",
      timestamp,
    };
  }

  // Default / Unknown Error
  return {
    correlationId,
    category: "unknown",
    severity: "medium",
    recoverable: false,
    message: sanitizedMessage,
    userFacingExplanation: sanitizedMessage || "An unexpected error occurred during execution.",
    affectedComponent: component,
    provider: context.provider,
    model: context.model,
    httpStatus,
    timestamp,
  };
}

function extractHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const anyErr = error as Record<string, unknown>;
  if (typeof anyErr.status === "number") return anyErr.status;
  if (typeof anyErr.statusCode === "number") return anyErr.statusCode;
  if (anyErr.response && typeof anyErr.response === "object") {
    const res = anyErr.response as Record<string, unknown>;
    if (typeof res.status === "number") return res.status;
  }
  return undefined;
}

function extractRetryAfter(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const anyErr = error as Record<string, unknown>;
  const headers = anyErr.headers || (anyErr.response as Record<string, unknown>)?.headers;
  if (headers && typeof headers === "object") {
    const retryHeader = (headers as Record<string, unknown>)["retry-after"] || (headers as Record<string, unknown>)["Retry-After"];
    if (typeof retryHeader === "string" || typeof retryHeader === "number") {
      const parsed = Number(retryHeader);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return undefined;
}

function sanitizeErrorText(text: string): string {
  // Strip Bearer tokens, sk- API keys, openrouter keys, etc.
  return text
    .replace(/(?:sk-[a-zA-Z0-9_-]{10,})/g, "[REDACTED_KEY]")
    .replace(/(?:Bearer\s+[a-zA-Z0-9._-]{10,})/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/(?:key=[a-zA-Z0-9_-]{10,})/gi, "key=[REDACTED_KEY]");
}
