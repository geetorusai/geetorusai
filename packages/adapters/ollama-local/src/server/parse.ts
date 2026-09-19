export interface ParsedOllamaStreamChunk {
  model?: string;
  response?: string;
  done?: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export function parseOllamaStdoutLine(line: string): { type: "text" | "error" | "meta"; content: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as ParsedOllamaStreamChunk;
    if (parsed.response) {
      return { type: "text", content: parsed.response };
    }
    if (parsed.done) {
      return { type: "meta", content: `Run completed (${parsed.eval_count ?? 0} tokens generated)` };
    }
  } catch {
    return { type: "text", content: line };
  }
  return { type: "text", content: line };
}
