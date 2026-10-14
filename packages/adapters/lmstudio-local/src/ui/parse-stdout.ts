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

export function parseLmStudioStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const raw = safeJsonParse(trimmed);
  const rec = asRecord(raw);

  if (rec && typeof rec.delta === "string") {
    return [
      {
        ts,
        kind: "assistant",
        text: rec.delta,
      },
    ];
  }

  if (rec && typeof rec.content === "string") {
    return [
      {
        ts,
        kind: "assistant",
        text: rec.content,
      },
    ];
  }

  return [
    {
      ts,
      kind: "stdout",
      text: line,
    },
  ];
}
