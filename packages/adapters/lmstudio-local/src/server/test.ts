import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@geetorusai/adapter-utils";
import { asString, parseObject } from "@geetorusai/adapter-utils/server-utils";
import { DEFAULT_LMSTUDIO_HOST, DEFAULT_LMSTUDIO_LOCAL_MODEL } from "../index.js";

function normalizeHost(rawHost: string): string {
  const clean = rawHost.trim().replace(/\/+$/, "");
  if (clean.endsWith("/v1")) return clean;
  return `${clean}/v1`;
}

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
  const rawHost = asString(
    config.host,
    process.env.LMSTUDIO_HOST || process.env.LM_STUDIO_HOST || DEFAULT_LMSTUDIO_HOST,
  );
  const host = normalizeHost(rawHost);

  const envConfig = parseObject(config.env);
  const apiKey = asString(
    config.apiKey,
    asString(envConfig.LMSTUDIO_API_KEY, process.env.LMSTUDIO_API_KEY || ""),
  ).trim();

  const model = asString(config.model, DEFAULT_LMSTUDIO_LOCAL_MODEL).trim();
  const isLocal = isLocalHost(host);

  const authHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    authHeaders["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${host}/models`, {
      headers: authHeaders,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 401 || res.status === 403) {
      checks.push({
        code: "lmstudio_auth_failed",
        level: "error",
        message: `Authentication failed for LM Studio at ${host} (HTTP ${res.status}). Verify API key.`,
      });
    } else if (!res.ok) {
      checks.push({
        code: "lmstudio_server_error",
        level: "error",
        message: `LM Studio at ${host} returned HTTP status ${res.status}`,
      });
    } else {
      const data = (await res.json()) as { data?: Array<{ id: string }> };
      const availableModels = (data.data || []).map((m) => m.id);

      checks.push({
        code: "lmstudio_server_reachable",
        level: "info",
        message: isLocal
          ? `Connected to local LM Studio service at ${host} (${availableModels.length} models loaded/available)`
          : `Connected to remote LM Studio endpoint at ${host} (${availableModels.length} models available)`,
      });

      if (availableModels.length === 0) {
        checks.push({
          code: "lmstudio_no_models_loaded",
          level: "warn",
          message: "No models currently loaded in LM Studio. Please load a model in LM Studio before running.",
          hint: "Open LM Studio and load a model, or configure LM Studio auto-load.",
        });
      } else {
        const matchesRequested =
          model === "local-model" ||
          availableModels.some((m) => m.toLowerCase().includes(model.toLowerCase()));

        if (matchesRequested) {
          checks.push({
            code: "lmstudio_model_ready",
            level: "info",
            message: `Model "${model}" is ready in LM Studio.`,
          });
        } else {
          checks.push({
            code: "lmstudio_model_note",
            level: "info",
            message: `Currently loaded model in LM Studio: ${availableModels[0]}. Requests will be handled by LM Studio.`,
          });
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({
      code: "lmstudio_unreachable",
      level: "error",
      message: `Could not connect to LM Studio at ${host} (${message}).`,
      hint: "Make sure LM Studio is open and the local server is started ('lms server start' in CLI or click Start Server on the Developer tab in LM Studio).",
    });
  }

  const status = checks.some((c) => c.level === "error")
    ? "fail"
    : checks.some((c) => c.level === "warn")
      ? "warn"
      : "pass";

  return {
    adapterType: "lmstudio_local",
    status,
    checks,
    testedAt: new Date().toISOString(),
  };
}
