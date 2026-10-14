import type { PreflightCheckResult, ErrorSeverity } from "@geetorusai/shared";

export interface PreflightValidationInput {
  provider: string;
  model: string;
  prompt?: string;
  baseUrl?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  contextLengthEstimated?: number;
  knownModelContextWindow?: number | null;
  allowLocalhost?: boolean;
}

// SSRF blacklists for cloud metadata & sensitive endpoints
const BLOCKED_HOSTNAMES = new Set([
  "169.254.169.254", // AWS, GCP, Azure metadata
  "metadata.google.internal",
  "instance-data",
  "metadata",
  "fd00::", // IPv6 ULA
]);

export function isPrivateOrMetadataIp(host: string, allowLocalhost = false): boolean {
  const normalizedHost = host.toLowerCase().trim();

  // Strip brackets from IPv6
  const cleanHost = normalizedHost.replace(/^\[|\]$/g, "");

  if (BLOCKED_HOSTNAMES.has(cleanHost)) {
    return true;
  }

  // Check IPv4 Link-local (169.254.x.x)
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) {
    return true;
  }

  // Check Localhost
  if (cleanHost === "localhost" || cleanHost === "127.0.0.1" || cleanHost === "::1") {
    return !allowLocalhost;
  }

  // Private RFC1918 networks (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
  if (!allowLocalhost) {
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) return true;
  }

  return false;
}

export function validateBaseUrlSecurity(baseUrlStr: string, allowLocalhost = false): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(baseUrlStr);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { valid: false, reason: `Disallowed protocol '${parsed.protocol}'. Only http: and https: are permitted.` };
    }

    if (isPrivateOrMetadataIp(parsed.hostname, allowLocalhost)) {
      return { valid: false, reason: `Security restriction: host '${parsed.hostname}' is a protected metadata or private address.` };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, reason: `Malformed URL format: ${baseUrlStr}` };
  }
}

export function validatePreflight(input: PreflightValidationInput): PreflightCheckResult {
  const checks: Array<{
    name: string;
    passed: boolean;
    message: string;
    severity?: ErrorSeverity;
  }> = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Provider presence & format check
  if (!input.provider || typeof input.provider !== "string" || input.provider.trim().length === 0) {
    checks.push({
      name: "provider_configured",
      passed: false,
      message: "Provider identifier is missing.",
      severity: "critical",
    });
    errors.push("Provider identifier is required.");
  } else {
    checks.push({
      name: "provider_configured",
      passed: true,
      message: `Provider '${input.provider}' specified.`,
    });
  }

  // 2. Model selection check
  if (!input.model || typeof input.model !== "string" || input.model.trim().length === 0) {
    checks.push({
      name: "model_selected",
      passed: false,
      message: "Model identifier is missing.",
      severity: "critical",
    });
    errors.push("Target model is required.");
  } else {
    checks.push({
      name: "model_selected",
      passed: true,
      message: `Model '${input.model}' selected.`,
    });
  }

  // 3. Base URL and SSRF check (if custom endpoint provided)
  if (input.baseUrl) {
    const isLocalProvider = input.provider.toLowerCase() === "ollama" || input.allowLocalhost === true;
    const urlCheck = validateBaseUrlSecurity(input.baseUrl, isLocalProvider);
    if (!urlCheck.valid) {
      checks.push({
        name: "endpoint_ssrf_safety",
        passed: false,
        message: urlCheck.reason || "Endpoint failed SSRF verification.",
        severity: "critical",
      });
      errors.push(urlCheck.reason || "Custom endpoint failed security validation.");
    } else {
      checks.push({
        name: "endpoint_ssrf_safety",
        passed: true,
        message: "Endpoint URL passed security and protocol safety checks.",
      });
    }
  }

  // 4. API Key formatting check
  if (input.apiKey !== undefined) {
    if (input.apiKey.trim().length === 0 && input.provider !== "ollama") {
      checks.push({
        name: "api_key_presence",
        passed: false,
        message: "API key is empty.",
        severity: "high",
      });
      errors.push(`API key is required for provider '${input.provider}'.`);
    } else {
      checks.push({
        name: "api_key_presence",
        passed: true,
        message: "API key is present.",
      });
    }
  }

  // 5. Prompt content validation (if prompt provided)
  if (input.prompt !== undefined) {
    const trimmedPrompt = input.prompt.trim();
    if (trimmedPrompt.length === 0) {
      checks.push({
        name: "prompt_not_empty",
        passed: false,
        message: "Prompt is empty or contains only whitespace.",
        severity: "high",
      });
      errors.push("Empty prompt cannot be submitted to inference provider.");
    } else {
      checks.push({
        name: "prompt_not_empty",
        passed: true,
        message: "Prompt payload is non-empty.",
      });

      // Payload size check (e.g. max 10MB prompt)
      const sizeBytes = Buffer.byteLength(input.prompt, "utf8");
      const maxAllowedBytes = 10 * 1024 * 1024; // 10MB
      if (sizeBytes > maxAllowedBytes) {
        checks.push({
          name: "payload_size",
          passed: false,
          message: `Prompt size (${Math.round(sizeBytes / 1024)} KB) exceeds maximum allowed payload limit (10MB).`,
          severity: "critical",
        });
        errors.push("Prompt payload exceeds allowable limit.");
      } else {
        checks.push({
          name: "payload_size",
          passed: true,
          message: `Prompt size is within safe bounds (${Math.round(sizeBytes / 1024)} KB).`,
        });
      }
    }
  }

  // 6. Context window vs prompt estimate check
  if (input.contextLengthEstimated && input.knownModelContextWindow) {
    if (input.contextLengthEstimated > input.knownModelContextWindow) {
      checks.push({
        name: "context_window_limit",
        passed: false,
        message: `Estimated token count (${input.contextLengthEstimated}) exceeds known model context limit (${input.knownModelContextWindow}).`,
        severity: "high",
      });
      errors.push("Estimated tokens exceed model context limit.");
    } else if (input.contextLengthEstimated > input.knownModelContextWindow * 0.9) {
      warnings.push(`Warning: estimated tokens (${input.contextLengthEstimated}) are within 10% of model limit (${input.knownModelContextWindow}).`);
      checks.push({
        name: "context_window_limit",
        passed: true,
        message: "Token count is near context threshold.",
      });
    } else {
      checks.push({
        name: "context_window_limit",
        passed: true,
        message: "Estimated token count is within model context window.",
      });
    }
  }

  // 7. Parameter range checks
  if (input.temperature !== undefined) {
    if (input.temperature < 0 || input.temperature > 2) {
      warnings.push(`Temperature ${input.temperature} is outside normal bounds [0, 2].`);
      checks.push({
        name: "temperature_bounds",
        passed: false,
        message: `Temperature ${input.temperature} is out of typical range [0.0 - 2.0].`,
        severity: "low",
      });
    } else {
      checks.push({
        name: "temperature_bounds",
        passed: true,
        message: "Temperature parameter is valid.",
      });
    }
  }

  if (input.maxTokens !== undefined) {
    if (input.maxTokens <= 0) {
      errors.push("max_tokens must be greater than 0.");
      checks.push({
        name: "max_tokens_positive",
        passed: false,
        message: "maxTokens parameter must be positive.",
        severity: "medium",
      });
    } else {
      checks.push({
        name: "max_tokens_positive",
        passed: true,
        message: "maxTokens parameter is valid.",
      });
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    provider: input.provider,
    model: input.model,
    checks,
    warnings,
    errors,
    checkedAt: new Date().toISOString(),
  };
}
