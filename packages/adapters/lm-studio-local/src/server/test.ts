import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "@geetorusai/adapter-utils";
import { asNumber, asString } from "@geetorusai/adapter-utils/server-utils";
import { testEnvironment as testOpenAICompatibleEnvironment } from "@geetorusai/adapter-openai-compatible-local/server";
import { discoverLmStudioModels } from "./models.js";
import {
  lmStudioRequestHeaders,
  normalizeLmStudioBaseUrl,
  withLmStudioDefaults,
} from "./config.js";

const MIN_AGENT_CONTEXT_LENGTH = 32_768;

function lmStudioManagementModelsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = "/api/v1/models";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

async function inspectLoadedContextLength(
  baseUrl: string,
  model: string,
  config: Record<string, unknown>,
): Promise<AdapterEnvironmentCheck> {
  try {
    const response = await fetch(lmStudioManagementModelsUrl(baseUrl), {
      headers: lmStudioRequestHeaders(config),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = asRecord(await response.json());
    const models = Array.isArray(payload?.models) ? payload.models : [];
    const selected = models.map(asRecord).find((entry) =>
      entry?.key === model ||
      (Array.isArray(entry?.loaded_instances) && entry.loaded_instances.some((instance) => asRecord(instance)?.id === model)),
    );
    const loadedInstances = Array.isArray(selected?.loaded_instances)
      ? selected.loaded_instances.map(asRecord).filter((entry): entry is Record<string, unknown> => entry !== null)
      : [];
    const loaded = loadedInstances.find((entry) => entry.id === model) ?? loadedInstances[0];
    const contextLength = asNumber(asRecord(loaded?.config)?.context_length, 0);
    if (!loaded || contextLength <= 0) {
      return {
        code: "lm_studio_model_not_loaded",
        level: "error",
        message: `Model "${model}" is not loaded in LM Studio.`,
        hint: "Load the selected model with at least a 32,768-token context, then test again.",
      };
    }
    if (contextLength < MIN_AGENT_CONTEXT_LENGTH) {
      return {
        code: "lm_studio_context_too_small",
        level: "error",
        message: `Model "${model}" is loaded with a ${contextLength.toLocaleString("en-US")}-token context; agent runs require at least ${MIN_AGENT_CONTEXT_LENGTH.toLocaleString("en-US")}.`,
        hint: "Reload the model in LM Studio with Context Length set to 32768 or higher.",
      };
    }
    return {
      code: "lm_studio_context_ready",
      level: "info",
      message: `LM Studio loaded context is ${contextLength.toLocaleString("en-US")} tokens.`,
    };
  } catch (error) {
    return {
      code: "lm_studio_context_unknown",
      level: "warn",
      message: "Could not verify the model's loaded context length.",
      detail: error instanceof Error ? error.message : String(error),
      hint: "In LM Studio, load the model with Context Length set to 32768 or higher.",
    };
  }
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const config = withLmStudioDefaults(ctx.config);
  const baseUrl = normalizeLmStudioBaseUrl(config.baseUrl);
  const model = asString(config.model, "").trim();
  const checks: AdapterEnvironmentCheck[] = [];

  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(baseUrl);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("LM Studio URL must use http or https");
    }
    checks.push({
      code: "lm_studio_base_url_valid",
      level: "info",
      message: `LM Studio base URL is valid: ${baseUrl}`,
    });
  } catch (error) {
    checks.push({
      code: "lm_studio_base_url_invalid",
      level: "error",
      message: error instanceof Error ? error.message : "LM Studio base URL is invalid",
      detail: baseUrl,
    });
  }

  if (!model) {
    checks.push({
      code: "lm_studio_model_required",
      level: "error",
      message: "Choose a model exposed by LM Studio before testing this adapter.",
      hint: "Start LM Studio's server and select a model returned by GET /v1/models.",
    });
  }

  if (parsedUrl) {
    try {
      const available = await discoverLmStudioModels(config);
      checks.push({
        code: "lm_studio_server_reachable",
        level: "info",
        message: `Connected to LM Studio at ${baseUrl} (${available.length} model${available.length === 1 ? "" : "s"} available).`,
      });
      if (model && available.some((entry) => entry.id === model)) {
        checks.push({
          code: "lm_studio_model_ready",
          level: "info",
          message: `Model "${model}" is available in LM Studio.`,
        });
        checks.push(await inspectLoadedContextLength(baseUrl, model, config));
      } else if (model) {
        checks.push({
          code: "lm_studio_model_missing",
          level: "error",
          message: `Model "${model}" is not exposed by LM Studio.`,
          detail: available.length > 0
            ? `Available models: ${available.slice(0, 8).map((entry) => entry.id).join(", ")}`
            : "LM Studio returned no models.",
          hint: "Load the model in LM Studio or enable just-in-time model loading.",
        });
      }
    } catch (error) {
      checks.push({
        code: "lm_studio_unreachable",
        level: "error",
        message: `Could not connect to LM Studio at ${baseUrl}.`,
        detail: error instanceof Error ? error.message : String(error),
        hint: "Start the local server from LM Studio's Developer tab or run `lms server start`.",
      });
    }
  }

  if (!checks.some((check) => check.level === "error")) {
    const useLightweightLocalProbe = !ctx.executionTarget;
    const harnessResult = await testOpenAICompatibleEnvironment({
      ...ctx,
      config: useLightweightLocalProbe
        ? { ...config, skipHelloProbe: true }
        : config,
    });
    checks.push(...harnessResult.checks.map((check) => ({
      ...check,
      code: check.code.replace(/^openai_compatible_/, "lm_studio_harness_"),
      message: check.message.replaceAll("OpenAI Compatible", "LM Studio"),
      ...(check.detail
        ? { detail: check.detail.replaceAll("OpenAI Compatible", "LM Studio") }
        : {}),
      ...(check.hint
        ? { hint: check.hint.replaceAll("OpenAI Compatible", "LM Studio") }
        : {}),
    })));

    // A full `opencode run` loads the coding harness, repository instructions,
    // and every tool schema. That is representative of an agent run, but it is
    // unnecessarily expensive for a connection test and can take minutes to
    // prefill on a local CPU-backed model. The generic harness test above still
    // verifies the working directory and executable; use a small completion to
    // verify that LM Studio itself can perform inference.
    if (
      useLightweightLocalProbe
      && !harnessResult.checks.some((check) => check.level === "error")
    ) {
      const timeoutSec = Math.max(1, asNumber(config.helloProbeTimeoutSec, 60));
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutSec * 1_000);
      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...lmStudioRequestHeaders(config),
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: "Reply only with hello." }],
            max_tokens: 8,
            temperature: 0,
            stream: false,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const detail = (await response.text()).replace(/\s+/g, " ").trim().slice(0, 240);
          checks.push({
            code: "lm_studio_hello_probe_failed",
            level: "error",
            message: `LM Studio inference returned HTTP ${response.status}.`,
            ...(detail ? { detail } : {}),
            hint: "Check the loaded model and LM Studio server logs, then retry the probe.",
          });
        } else {
          checks.push({
            code: "lm_studio_hello_probe_passed",
            level: "info",
            message: "LM Studio hello probe succeeded.",
          });
        }
      } catch (error) {
        const timedOut = error instanceof Error && error.name === "AbortError";
        checks.push({
          code: timedOut
            ? "lm_studio_hello_probe_timed_out"
            : "lm_studio_hello_probe_failed",
          level: timedOut ? "warn" : "error",
          message: timedOut
            ? `LM Studio did not return a completion within ${timeoutSec} seconds.`
            : "LM Studio hello probe failed.",
          detail: error instanceof Error ? error.message : String(error),
          hint: timedOut
            ? "Cancel queued predictions or reload the model. If it remains slow, reduce parallel requests and enable GPU offload in LM Studio."
            : "Check the loaded model and LM Studio server logs, then retry the probe.",
        });
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  const status = checks.some((check) => check.level === "error")
    ? "fail"
    : checks.some((check) => check.level === "warn")
      ? "warn"
      : "pass";
  return {
    adapterType: "lm_studio_local",
    status,
    checks,
    testedAt: new Date().toISOString(),
  };
}
