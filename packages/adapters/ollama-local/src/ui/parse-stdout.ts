import type { TranscriptEntry } from "@geetorusai/adapter-utils";

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function parseOllamaStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  const parsed = asRecord(safeJsonParse(trimmed));
  if (!parsed) {
    return [{ kind: "stdout", ts, text: line }];
  }

  const response = asString(parsed.response);
  if (response) {
    return [{ kind: "assistant", ts, text: response }];
  }

  const message = asRecord(parsed.message);
  if (message && typeof message.content === "string") {
    return [{ kind: "assistant", ts, text: message.content }];
  }

  if (parsed.done === true) {
    return [{
      kind: "result",
      ts,
      text: "Completion finished",
      inputTokens: typeof parsed.prompt_eval_count === "number" ? parsed.prompt_eval_count : 0,
      outputTokens: typeof parsed.eval_count === "number" ? parsed.eval_count : 0,
      cachedTokens: 0,
      costUsd: 0,
      subtype: "result",
      isError: false,
      errors: [],
    }];
  }

  if (parsed.error) {
    return [{ kind: "stderr", ts, text: String(parsed.error) }];
  }

  return [{ kind: "stdout", ts, text: line }];
}
