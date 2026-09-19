import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@geetorusai/adapter-utils";
import { asString, parseObject } from "@geetorusai/adapter-utils/server-utils";
import { DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_LOCAL_MODEL } from "../index.js";

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const host = asString(config.host, process.env.OLLAMA_HOST || process.env.OLLAMA_API_BASE || DEFAULT_OLLAMA_HOST).replace(/\/+$/, "");
  const model = asString(config.model, DEFAULT_OLLAMA_LOCAL_MODEL);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${host}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      checks.push({
        code: "ollama_server_error",
        level: "error",
        message: `Ollama server at ${host} returned HTTP status ${res.status}`,
      });
    } else {
      const data = (await res.json()) as { models?: Array<{ name: string }> };
      const availableModels = (data.models || []).map((m) => m.name);
      
      checks.push({
        code: "ollama_server_reachable",
        level: "info",
        message: `Connected to Ollama at ${host} (${availableModels.length} models installed)`,
      });

      const hasRequestedModel = availableModels.some(
        (name) => name === model || name.startsWith(`${model}:`) || model.startsWith(`${name}:`),
      );

      if (availableModels.length === 0) {
        checks.push({
          code: "ollama_no_models",
          level: "warn",
          message: `No models installed in Ollama. Pull a model with: ollama pull ${model}`,
        });
      } else if (!hasRequestedModel) {
        checks.push({
          code: "ollama_model_missing",
          level: "warn",
          message: `Configured model "${model}" not found in local Ollama instance. Available: ${availableModels.slice(0, 5).join(", ")}. Pull it with: ollama pull ${model}`,
        });
      } else {
        checks.push({
          code: "ollama_model_ready",
          level: "info",
          message: `Model "${model}" is ready on Ollama server.`,
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({
      code: "ollama_unreachable",
      level: "error",
      message: `Could not connect to Ollama at ${host} (${message}). Make sure Ollama is running with: ollama serve`,
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
