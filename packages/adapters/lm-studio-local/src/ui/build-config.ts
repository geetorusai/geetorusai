import { buildAdapterEnvConfig, type CreateConfigValues } from "@geetorusai/adapter-utils";
import { DEFAULT_LM_STUDIO_BASE_URL } from "../index.js";

export function buildLmStudioLocalConfig(values: CreateConfigValues): Record<string, unknown> {
  const config: Record<string, unknown> = {
    baseUrl: values.url?.trim() || values.baseUrl?.trim() || DEFAULT_LM_STUDIO_BASE_URL,
    dangerouslySkipPermissions: values.dangerouslySkipPermissions,
    timeoutSec: 0,
    graceSec: 20,
  };
  if (values.model.trim()) config.model = values.model.trim();
  if (values.cwd) config.cwd = values.cwd;
  if (values.instructionsFilePath) config.instructionsFilePath = values.instructionsFilePath;
  if (values.command) config.command = values.command;
  const env = buildAdapterEnvConfig(values.envBindings, values.envVars);
  if (Object.keys(env).length > 0) config.env = env;
  return config;
}
