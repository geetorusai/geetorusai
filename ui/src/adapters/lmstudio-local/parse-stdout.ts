import type { TranscriptEntry } from "../types";

export function parseLmStudioStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  return [
    {
      kind: "stdout",
      ts,
      text: line,
    },
  ];
}
