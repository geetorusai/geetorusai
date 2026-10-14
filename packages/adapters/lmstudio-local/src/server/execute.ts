import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@geetorusai/adapter-utils";
import { asNumber, asString, parseObject, renderGeetorusWakePrompt } from "@geetorusai/adapter-utils/server-utils";
import { DEFAULT_LMSTUDIO_HOST, DEFAULT_LMSTUDIO_LOCAL_MODEL } from "../index.js";

function normalizeHost(rawHost: string): string {
  const clean = rawHost.trim().replace(/\/+$/, "");
  if (clean.endsWith("/v1")) return clean;
  return `${clean}/v1`;
}

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
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

async function buildExecutionResult(
  ctx: AdapterExecutionContext,
  activeModel: string,
  provider: string,
  fullOutput: string,
  usage: { inputTokens: number; outputTokens: number },
): Promise<AdapterExecutionResult> {
  const issueId = asString(ctx.context.issueId || ctx.context.taskId, "").trim();

  if (issueId) {
    try {
      const apiBase = asString(process.env.GEETORUS_API_URL, "http://127.0.0.1:3100/api").replace(/\/+$/, "");
      await fetch(`${apiBase}/issues/${issueId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(ctx.authToken ? { Authorization: `Bearer ${ctx.authToken}` } : {}),
        },
        body: JSON.stringify({
          status: "in_review",
          comment: fullOutput.slice(0, 1000),
        }),
      });
    } catch {
      // Best-effort disposition write
    }
  }

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    summary: fullOutput.slice(0, 500),
    model: activeModel,
    provider,
    usage: {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    },
    usageBasis: "per_run",
    resultJson: {
      finalResponse: {
        disposition: "final",
        text: fullOutput,
      },
      finalResponseDisposition: "final",
      finalResponseText: fullOutput,
      nextAction: "Task completed and submitted for review.",
      semanticResult: {
        result: {
          schema: "geetorus.run_result.v1",
          summary: fullOutput.slice(0, 500),
          reportedWorkDisposition: "completed",
        },
      },
    },
  };
}

function boundPromptForLocalContext(rawPrompt: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (rawPrompt.length <= maxChars) {
    return rawPrompt;
  }
  const headLength = Math.floor(maxChars * 0.25);
  const tailLength = Math.floor(maxChars * 0.70);
  const head = rawPrompt.slice(0, headLength);
  const tail = rawPrompt.slice(-tailLength);
  return `${head}\n\n[... Context optimized: intermediate history compacted to fit local model window ...]\n\n${tail}`;
}

export async function execute(
  ctx: AdapterExecutionContext,
): Promise<AdapterExecutionResult> {
  ctx.onDispatch?.();

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

  let model = asString(config.model, "").trim();
  if (!model) {
    model = DEFAULT_LMSTUDIO_LOCAL_MODEL;
  }

  const isLocal = isLocalHost(host);
  const provider = "lmstudio_local";

  const temperature = asNumber(config.temperature, 0.2);
  const timeoutSec = asNumber(config.timeoutSec, isLocal ? 1200 : 300);
  const numCtx = asNumber(config.numCtx, 8192);
  const maxPromptTokens = Math.max(1024, numCtx - 1500);

  const rawPrompt = renderGeetorusWakePrompt(ctx.context) || asString(ctx.context.prompt, "");
  const prompt = boundPromptForLocalContext(rawPrompt, maxPromptTokens);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSec * 1000);

  if (ctx.signal) {
    ctx.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const authHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    authHeaders["Authorization"] = `Bearer ${apiKey}`;
  }

  try {
    if (ctx.onLog) {
      await ctx.onLog(
        "stdout",
        `[Geetorus LM Studio Runtime] Connecting to LM Studio endpoint ${host} for model "${model}"...\n`,
      );
    }

    const chatPayload = {
      model,
      messages: [
        {
          role: "system",
          content: "You are an autonomous AI agent working in GeetorusAI. Follow all instructions carefully and adhere strictly to the Ponytail anti-overengineering decision ladder: write minimal, direct, robust code without unnecessary abstractions.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      stream: true,
      temperature,
    };

    let chatRes = await fetch(`${host}/chat/completions`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(chatPayload),
      signal: controller.signal,
    });

    if (!chatRes.ok) {
      const errBody = await chatRes.text().catch(() => "");
      clearTimeout(timeout);
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: `LM Studio chat completion failed with status ${chatRes.status}: ${errBody.slice(0, 500)}`,
        model,
        provider,
      };
    }

    let fullOutput = "";
    if (chatRes.body) {
      const reader = chatRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;

            if (trimmed.startsWith("data: ")) {
              try {
                const parsed = JSON.parse(trimmed.slice(6));
                const textChunk = parsed.choices?.[0]?.delta?.content ?? "";
                if (textChunk) {
                  fullOutput += textChunk;
                  if (ctx.onLog) {
                    await ctx.onLog("stdout", textChunk);
                  }
                }
              } catch {
                // Ignore SSE framing artifacts
              }
            }
          }
        }
      } catch (streamErr) {
        if (controller.signal.aborted) {
          clearTimeout(timeout);
          return {
            exitCode: 1,
            signal: "SIGTERM",
            timedOut: true,
            summary: fullOutput.slice(0, 500) || "LM Studio execution timed out.",
            model,
            provider,
          };
        }
        throw streamErr;
      }
    }

    clearTimeout(timeout);

    const inputTokens = estimateTokens(prompt);
    const outputTokens = estimateTokens(fullOutput);

    return await buildExecutionResult(ctx, model, provider, fullOutput, {
      inputTokens,
      outputTokens,
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      return {
        exitCode: 1,
        signal: "SIGTERM",
        timedOut: true,
        errorMessage: `LM Studio run timed out after ${timeoutSec} seconds.`,
        model,
        provider,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: `LM Studio execution failed: ${message}`,
      model,
      provider,
    };
  }
}
