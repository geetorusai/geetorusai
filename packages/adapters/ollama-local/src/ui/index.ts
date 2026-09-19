import { parseOllamaStdoutLine } from "../server/parse.js";

export { parseOllamaStdoutLine };

export function buildOllamaLocalConfig(values: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (typeof values.ollamaModel === "string" && values.ollamaModel.trim()) {
    result.model = values.ollamaModel.trim();
  }
  if (typeof values.ollamaHost === "string" && values.ollamaHost.trim()) {
    result.host = values.ollamaHost.trim();
  }
  return result;
}
