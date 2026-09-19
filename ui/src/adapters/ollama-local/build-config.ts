import type { CreateConfigValues } from "@geetorusai/adapter-utils";

export function buildOllamaLocalConfig(values: CreateConfigValues): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (typeof values.ollamaModel === "string" && values.ollamaModel.trim()) {
    result.model = values.ollamaModel.trim();
  }
  if (typeof values.ollamaHost === "string" && values.ollamaHost.trim()) {
    result.host = values.ollamaHost.trim();
  }
  if (typeof values.ollamaTemperature === "number") {
    result.temperature = values.ollamaTemperature;
  }
  return result;
}
