import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@geetorusai/adapter-utils";
import { asString, parseObject } from "@geetorusai/adapter-utils/server-utils";
import { DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_LOCAL_MODEL } from "../index.js";

function isLocalHost(host: string): boolean {
  try {
    const url = new URL(host);
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".localhost")
    );
  } catch {
    return host.includes("127.0.0.1") || host.includes("localhost");
  }
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const host = asString(config.host, process.env.OLLAMA_HOST || process.env.OLLAMA_API_BASE || DEFAULT_OLLAMA_HOST).replace(/\/+$/, "");
  const envConfig = parseObject(config.env);
  const apiKey = asString(
    config.apiKey,
    asString(envConfig.OLLAMA_API_KEY, process.env.OLLAMA_API_KEY || ""),
  ).trim();
  const model = asString(config.model, DEFAULT_OLLAMA_LOCAL_MODEL).trim();
  const apiModel = model.replace(/:cloud$/, "");

  const isLocal = isLocalHost(host) && !apiKey;

  const authHeaders: Record<string, string> = {};
  if (apiKey) {
    authHeaders["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${host}/api/tags`, {
      headers: authHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 401 || res.status === 403) {
      checks.push({
        code: "ollama_cloud_auth_failed",
        level: "error",
        message: `Authentication failed for Ollama endpoint at ${host} (HTTP ${res.status}). Verify your API key credentials.`,
      });
    } else if (!res.ok) {
      checks.push({
        code: isLocal ? "ollama_server_error" : "ollama_cloud_error",
        level: "error",
        message: `Ollama endpoint at ${host} returned HTTP status ${res.status}`,
      });
    } else {
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const availableModels = (data.models || []).map((m) => m.name);

      checks.push({
        code: isLocal ? "ollama_server_reachable" : "ollama_cloud_reachable",
        level: "info",
        message: isLocal
          ? `Connected to local Ollama service at ${host} (${availableModels.length} models installed)`
          : `Connected to Ollama Cloud / remote gateway at ${host} (${availableModels.length} models discovered)`,
      });

      const hasRequestedModel = availableModels.some(
        (name) =>
          name === apiModel ||
          name === `${apiModel}:latest` ||
          `${name}:latest` === apiModel ||
          name.split(":")[0] === apiModel ||
          (availableModels.length === 1 && availableModels[0].startsWith(apiModel.split(":")[0])),
      );

      if (availableModels.length === 0 && isLocal) {
        checks.push({
          code: "ollama_no_models",
          level: "warn",
          message: `No models installed in local Ollama. Install a model with: ollama pull ${apiModel}`,
        });
      } else if (!hasRequestedModel && isLocal) {
        checks.push({
          code: "ollama_model_missing",
          level: "warn",
          message: `Configured model "${model}" not found in local Ollama. Available: ${availableModels.slice(0, 5).join(", ")}. Pull it with: ollama pull ${apiModel}`,
        });
      } else {
        checks.push({
          code: "ollama_model_ready",
          level: "info",
          message: `Model "${model}" is verified and ready for execution.`,
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({
      code: isLocal ? "ollama_unreachable" : "ollama_cloud_unreachable",
      level: "error",
      message: isLocal
        ? `Could not connect to local Ollama at ${host} (${message}). Make sure Ollama is running with: ollama serve`
        : `Could not connect to Ollama Cloud endpoint at ${host} (${message}). Check network and endpoint settings.`,
    });
  }

  const status = checks.some((c) => c.level === "error")
    ? "fail"
    : checks.some((c) => c.level === "warn")
      ? "warn"
      : "pass";

  return {
    adapterType: "ollama_local",
    status,
    checks,
    testedAt: new Date().toISOString(),
  };
}
