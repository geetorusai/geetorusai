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
  const wakePrompt = ctx.context.geetorusWake
    ? renderGeetorusWakePrompt(ctx.context.geetorusWake, {
        conversationMode: ctx.context.conversationMode === true,
      })
    : "";
  const directPrompt = asString(ctx.context.prompt, "");
  const prompt = wakePrompt || directPrompt || "Respond with hello.";
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

    // Auto-post output comment to issue thread and update disposition if running on an issue
    const issueId = asString(ctx.context.issueId, asString(ctx.context.taskId, ""));
    const geetorusApiUrl = process.env.GEETORUS_API_URL || "http://127.0.0.1:3100";
    if (issueId && fullOutput.trim()) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (ctx.authToken) headers["Authorization"] = `Bearer ${ctx.authToken}`;
      
      try {
        await fetch(`${geetorusApiUrl}/api/issues/${issueId}/comments`, {
          method: "POST",
          headers,
          body: JSON.stringify({ body: fullOutput.trim() }),
        });

        const recoveryActionId = asString(ctx.context.recoveryActionId, "");
        if (recoveryActionId) {
          await fetch(`${geetorusApiUrl}/api/issues/${issueId}/recovery-actions/resolve`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              actionId: recoveryActionId,
              outcome: "restored",
              sourceIssueStatus: "done",
              resolutionNote: "Resolved automatically by Ollama run completion",
            }),
          });
        }

        // Set issue disposition to done so Geetorus recovery watchdog doesn't get stuck in missing disposition loops
        await fetch(`${geetorusApiUrl}/api/issues/${issueId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            status: "done",
          }),
        });
      } catch {
        // Non-fatal
      }
    }

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: fullOutput.slice(0, 500),
      resultJson: {
        stdout: fullOutput,
      },
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
