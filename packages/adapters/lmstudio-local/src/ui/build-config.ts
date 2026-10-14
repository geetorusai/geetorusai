import type { CreateConfigValues } from "@geetorusai/adapter-utils";

export function buildLmStudioLocalConfig(values: CreateConfigValues): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (typeof values.lmStudioModel === "string" && values.lmStudioModel.trim()) {
    result.model = values.lmStudioModel.trim();
  }
  if (typeof values.lmStudioHost === "string" && values.lmStudioHost.trim()) {
    result.host = values.lmStudioHost.trim();
  }
  if (typeof values.lmStudioTemperature === "number") {
    result.temperature = values.lmStudioTemperature;
  }
  return result;
}
