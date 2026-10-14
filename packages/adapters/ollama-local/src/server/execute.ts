import type {
  AdapterExecutionContext,
  AdapterExecutionResult,
} from "@geetorusai/adapter-utils";
import { asNumber, asString, parseObject, renderGeetorusWakePrompt } from "@geetorusai/adapter-utils/server-utils";
import { DEFAULT_OLLAMA_HOST, DEFAULT_OLLAMA_LOCAL_MODEL } from "../index.js";

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

/**
 * Builds execution result with durable semantic output and updates issue disposition.
 */
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
  const host = asString(config.host, process.env.OLLAMA_HOST || process.env.OLLAMA_API_BASE || DEFAULT_OLLAMA_HOST).replace(/\/+$/, "");
  const envConfig = parseObject(config.env);
  const apiKey = asString(
    config.apiKey,
    asString(envConfig.OLLAMA_API_KEY, process.env.OLLAMA_API_KEY || ""),
  ).trim();

  let model = asString(config.model, "").trim();
  if (!model) {
    model = DEFAULT_OLLAMA_LOCAL_MODEL;
  }

  const isLocal = isLocalHost(host) && !apiKey;
  const provider = isLocal ? "ollama_local" : "ollama_cloud";
  const apiModel = model.replace(/:cloud$/, "");

  const temperature = asNumber(config.temperature, 0.2);
  const timeoutSec = asNumber(config.timeoutSec, isLocal ? 1200 : 300);
  const numCtx = asNumber(config.numCtx, isLocal ? 8192 : 16384);
  const numPredict = asNumber(config.numPredict, 2048);
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
    // 1. For local Ollama instances, verify reachability and model availability before running
    if (isLocal) {
      let tagsRes: Response;
      try {
        const pingCtrl = new AbortController();
        const pingTimer = setTimeout(() => pingCtrl.abort(), 6000);
        tagsRes = await fetch(`${host}/api/tags`, {
          method: "GET",
          signal: pingCtrl.signal,
        });
        clearTimeout(pingTimer);
      } catch (pingErr) {
        clearTimeout(timeout);
        const errMsg = pingErr instanceof Error ? pingErr.message : String(pingErr);
        return {
          exitCode: 1,
          signal: null,
          timedOut: false,
          errorMessage: `Cannot connect to local Ollama daemon at ${host} (${errMsg}). Please make sure Ollama is installed and running ("ollama serve").`,
          model,
          provider,
        };
      }

      if (!tagsRes.ok) {
        clearTimeout(timeout);
        return {
          exitCode: 1,
          signal: null,
          timedOut: false,
          errorMessage: `Local Ollama service at ${host} returned HTTP status ${tagsRes.status}`,
          model,
          provider,
        };
      }

      const tagsData = (await tagsRes.json()) as { models?: Array<{ name: string }> };
      const installedModels = (tagsData.models || []).map((m) => m.name);
      const isAvailable = installedModels.some(
        (name) =>
          name === apiModel ||
          name === `${apiModel}:latest` ||
          `${name}:latest` === apiModel ||
          name.split(":")[0] === apiModel ||
          (installedModels.length === 1 && installedModels[0].startsWith(apiModel.split(":")[0])),
      );

      if (!isAvailable) {
        clearTimeout(timeout);
        const availableHint = installedModels.length > 0
          ? ` Installed models: ${installedModels.slice(0, 5).join(", ")}.`
          : " No models are currently installed.";
        return {
          exitCode: 1,
          signal: null,
          timedOut: false,
          errorMessage: `Configured Ollama model "${model}" is not installed locally.${availableHint} Please install it with "ollama pull ${apiModel}" before running this task.`,
          model,
          provider,
        };
      }
    }

    if (ctx.onLog) {
      await ctx.onLog(
        "stdout",
        `[Geetorus ${isLocal ? "Local" : "Cloud"} Model Runtime] Connecting to Ollama endpoint ${host} for model "${apiModel}"...\n`,
      );
    }

    // 2. Execute via Ollama /api/chat with streaming
    const chatPayload = {
      model: apiModel,
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
      options: {
        temperature,
        num_ctx: numCtx,
        num_predict: numPredict,
      },
    };

    let chatRes = await fetch(`${host}/api/chat`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(chatPayload),
      signal: controller.signal,
    });

    // If /api/chat is not found (legacy Ollama), fall back to /api/generate
    let isLegacyGenerate = false;
    if (chatRes.status === 404) {
      isLegacyGenerate = true;
      chatRes = await fetch(`${host}/api/generate`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          model: apiModel,
          prompt,
          stream: true,
          options: {
            temperature,
            num_ctx: numCtx,
            num_predict: numPredict,
          },
        }),
        signal: controller.signal,
      });
    }

    if (!chatRes.ok) {
      clearTimeout(timeout);
      const errText = await chatRes.text();
      let friendlyError = `Ollama execution error (HTTP ${chatRes.status}): ${errText}`;

      if (chatRes.status === 401 || chatRes.status === 403) {
        friendlyError = `Ollama Cloud authentication failed (HTTP ${chatRes.status}). Please check your OLLAMA_API_KEY configuration.`;
      } else if (chatRes.status === 404) {
        friendlyError = `Model "${apiModel}" was not found on Ollama endpoint ${host}.`;
      } else if (chatRes.status === 429) {
        friendlyError = `Ollama Cloud rate limit exceeded. Please wait before retrying.`;
      }

      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: friendlyError,
        model,
        provider,
      };
    }

    if (!chatRes.body) {
      clearTimeout(timeout);
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage: `Empty stream response received from Ollama at ${host}`,
        model,
        provider,
      };
    }

    const reader = chatRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullOutput = "";
    let promptTokens = estimateTokens(prompt);
    let completionTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);

          // Extract token counts if provided by Ollama final frame
          if (parsed.done) {
            if (typeof parsed.prompt_eval_count === "number") {
              promptTokens = parsed.prompt_eval_count;
            }
            if (typeof parsed.eval_count === "number") {
              completionTokens = parsed.eval_count;
            }
          }

          // Extract chunk content
          const chunkText = isLegacyGenerate
            ? (parsed.response ?? "")
            : (parsed.message?.content ?? "");

          if (chunkText) {
            fullOutput += chunkText;
            if (ctx.onLog) {
              await ctx.onLog("stdout", chunkText);
            }
          }
        } catch {
          // Ignore non-json chunk fragments
        }
      }
    }

    clearTimeout(timeout);

    if (completionTokens === 0) {
      completionTokens = estimateTokens(fullOutput);
    }

    return await buildExecutionResult(ctx, model, provider, fullOutput, {
      inputTokens: promptTokens,
      outputTokens: completionTokens,
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : String(err);
    const timedOut = controller.signal.aborted;

    return {
      exitCode: 1,
      signal: null,
      timedOut,
      errorMessage: timedOut
        ? `Ollama execution timed out after ${timeoutSec} seconds`
        : `Ollama execution failed: ${message}`,
      model,
      provider,
    };
  }
}
