import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@geetorusai/adapter-utils";
import { asNumber, asString, parseObject, renderGeetorusWakePrompt } from "@geetorusai/adapter-utils/server-utils";
import { DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_LOCAL_MODEL } from "../index.js";

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  const config = parseObject(ctx.config);
  const host = asString(config.host, process.env.OLLAMA_HOST || process.env.OLLAMA_API_BASE || DEFAULT_OLLAMA_HOST).replace(/\/+$/, "");
  const model = asString(config.model, DEFAULT_OLLAMA_LOCAL_MODEL);
  const temperature = asNumber(config.temperature, 0.2);
  const prompt = renderGeetorusWakePrompt(ctx.context) || asString(ctx.context.prompt, "");
  const timeoutSec = asNumber(config.timeoutSec, 300);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSec * 1000);

  let fullOutput = "";

  try {
    const response = await fetch(`${host}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: {
          temperature,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: `Ollama error (${response.status}): ${errText}`,
        model,
        provider: "ollama",
      };
    }

    if (!response.body) {
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: "No response body received from Ollama",
        model,
        provider: "ollama",
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            fullOutput += parsed.response;
            if (ctx.onLog) {
              await ctx.onLog("stdout", parsed.response);
            }
          }
        } catch {
          // ignore non-json chunk lines
        }
      }
    }

    clearTimeout(timeout);

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: fullOutput.slice(0, 500),
      model,
      provider: "ollama",
    };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : String(err);
    return {
      exitCode: 1,
      signal: null,
      timedOut: controller.signal.aborted,
      errorMessage: `Ollama execution error: ${message}`,
      model,
      provider: "ollama",
    };
  }
}
