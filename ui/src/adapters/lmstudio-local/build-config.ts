import type { CreateConfigValues } from "../types";

export function buildLmStudioLocalConfig(values: CreateConfigValues): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (typeof values.lmStudioModel === "string" && values.lmStudioModel.trim()) {
    result.model = values.lmStudioModel.trim();
  }
  if (typeof values.lmStudioHost === "string" && values.lmStudioHost.trim()) {
    result.host = values.lmStudioHost.trim();
  }
  if (typeof values.lmStudioApiKey === "string" && values.lmStudioApiKey.trim()) {
    result.apiKey = values.lmStudioApiKey.trim();
  }
  if (typeof values.lmStudioTemperature === "number") {
    result.temperature = values.lmStudioTemperature;
  }
  return result;
}
