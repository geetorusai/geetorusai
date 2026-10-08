import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { asBoolean, asString } from "@geetorusai/adapter-utils/server-utils";

export type PreparedOpenAICompatibleRuntimeConfig = {
  env: Record<string, string>;
  notes: string[];
  modelFlag: string;
  projectConfigPath?: string;
  cleanup: () => Promise<void>;
};

function resolveXdgConfigHome(env: Record<string, string>): string {
  return (
    (typeof env.XDG_CONFIG_HOME === "string" && env.XDG_CONFIG_HOME.trim()) ||
    (typeof process.env.XDG_CONFIG_HOME === "string" && process.env.XDG_CONFIG_HOME.trim()) ||
    path.join(os.homedir(), ".config")
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeModelSlug(model: string): string {
  const clean = model.startsWith("openai_compatible/") ? model.slice("openai_compatible/".length) : model;
  return clean.replace(/[^a-zA-Z0-9_-]/g, "-") || "custom-model";
}

export async function prepareOpenAICompatibleRuntimeConfig(input: {
  env: Record<string, string>;
  config: Record<string, unknown>;
  cwd?: string;
  targetIsRemote?: boolean;
}): Promise<PreparedOpenAICompatibleRuntimeConfig> {
  const notes: string[] = [];
  const rawModel = asString(input.config.model, "").trim();
  const actualModelId = rawModel.startsWith("openai_compatible/") ? rawModel.slice("openai_compatible/".length) : rawModel;
  const modelSlug = actualModelId ? sanitizeModelSlug(actualModelId) : "default-model";
  const modelFlag = `openai_compatible/${modelSlug}`;

  const baseUrl = asString(input.config.baseUrl, input.env.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || "").trim();
  const apiKey = asString(input.config.apiKey, input.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "").trim();

  const runtimeConfigHome = await fs.mkdtemp(path.join(os.tmpdir(), "geetorus-opencode-config-"));
  const runtimeConfigDir = path.join(runtimeConfigHome, "opencode");
  const runtimeConfigPath = path.join(runtimeConfigDir, "opencode.json");
  await fs.mkdir(runtimeConfigDir, { recursive: true });

  const customProviderConfig: Record<string, unknown> = {
    npm: "@ai-sdk/openai-compatible",
    name: "OpenAI Compatible",
    options: {
      ...(baseUrl ? { baseURL: baseUrl } : {}),
      ...(apiKey ? { apiKey: apiKey } : {}),
    },
    models: {
      ...(actualModelId
        ? {
            [modelSlug]: {
              id: actualModelId,
              name: actualModelId,
              limit: {
                context: 128000,
                output: 8192,
              },
            },
          }
        : {}),
    },
  };

  const nextConfig: Record<string, unknown> = {
    $schema: "https://opencode.ai/config.json",
    permission: {
      external_directory: "allow",
    },
    provider: {
      openai_compatible: customProviderConfig,
    },
  };

  notes.push(
    `Configured OpenAI Compatible custom provider with baseURL="${baseUrl || "default"}" and model="${actualModelId || modelSlug}".`,
  );

  const jsonContent = `${JSON.stringify(nextConfig, null, 2)}\n`;
  await fs.writeFile(runtimeConfigPath, jsonContent, "utf8");

  let projectConfigPath: string | undefined;
  if (input.cwd) {
    try {
      projectConfigPath = path.join(input.cwd, "opencode.json");
      await fs.writeFile(projectConfigPath, jsonContent, "utf8");
    } catch {
      // Best effort for project config
    }
  }

  const outEnv: Record<string, string> = {
    ...input.env,
    XDG_CONFIG_HOME: runtimeConfigHome,
    OPENCODE_ALLOW_ALL_MODELS: "true",
  };
  if (baseUrl) outEnv.OPENAI_BASE_URL = baseUrl;
  if (apiKey) outEnv.OPENAI_API_KEY = apiKey;

  return {
    env: outEnv,
    notes,
    modelFlag,
    projectConfigPath,
    cleanup: async () => {
      await fs.rm(runtimeConfigHome, { recursive: true, force: true }).catch(() => {});
      if (projectConfigPath) {
        await fs.rm(projectConfigPath, { force: true }).catch(() => {});
      }
    },
  };
}

export function prepareManagedOpenAICompatibleRemoteHomes(input: {
  env: Record<string, string>;
  config: Record<string, unknown>;
  runtimeRootDir: string | null | undefined;
  runId: string;
  configDir?: string;
}): void {
  if (!input.config.managedAiConnection) return;
  if (!input.runtimeRootDir) throw new Error("Managed OpenAI Compatible authentication requires an isolated remote runtime directory.");
  const home = path.posix.join(input.runtimeRootDir, "managed-auth", input.runId);
  Object.assign(input.env, {
    HOME: home,
    XDG_CONFIG_HOME: input.configDir ?? path.posix.join(home, "config"),
    XDG_DATA_HOME: path.posix.join(home, "data"),
    XDG_CACHE_HOME: path.posix.join(home, "cache"),
    XDG_STATE_HOME: path.posix.join(home, "state"),
  });
}
