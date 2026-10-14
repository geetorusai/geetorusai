export interface ParsedLmStudioStreamChunk {
  id?: string;
  choices?: Array<{
    delta?: { content?: string; role?: string };
    finish_reason?: string | null;
  }>;
}

export function parseLmStudioStdoutLine(line: string): { type: "text" | "error" | "meta"; content: string } | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data: ")) {
    const jsonStr = trimmed.slice(6).trim();
    if (jsonStr === "[DONE]") {
      return { type: "meta", content: "Run completed." };
    }
    try {
      const parsed = JSON.parse(jsonStr) as ParsedLmStudioStreamChunk;
      const content = parsed.choices?.[0]?.delta?.content;
      if (content) {
        return { type: "text", content };
      }
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(trimmed) as ParsedLmStudioStreamChunk;
    const content = parsed.choices?.[0]?.delta?.content;
    if (content) {
      return { type: "text", content };
    }
  } catch {
    return { type: "text", content: line };
  }

  return { type: "text", content: line };
}
