import type { AdapterModel } from "@geetorusai/adapter-utils";
import { asString } from "@geetorusai/adapter-utils/server-utils";
import { models as declaredModels } from "../index.js";

export function requireOpenAICompatibleModelId(input: unknown): string {
  const model = asString(input, "").trim();
  return model || "openai_compatible/default-model";
}

export function isTruthyEnvFlag(value: string | undefined): boolean {
  if (value === undefined) return false;
  const v = value.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function parseOpenAICompatibleModelsOutput(stdout: string): AdapterModel[] {
  const parsed: AdapterModel[] = [];
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const firstToken = line.split(/\s+/)[0]?.trim() ?? "";
    if (!firstToken) continue;
    parsed.push({ id: firstToken, label: firstToken });
  }
  return parsed;
}

export async function ensureOpenAICompatibleModelConfiguredAndAvailable(input: {
  model?: unknown;
  command?: unknown;
  cwd?: unknown;
  env?: unknown;
}): Promise<AdapterModel[]> {
  const model = requireOpenAICompatibleModelId(input.model);
  return [{ id: model, label: model }];
}

export const DEFAULT_OPENAI_COMPATIBLE_MODELS: AdapterModel[] = declaredModels.map((m) => ({
  id: m.id,
  label: m.label,
}));

export async function listOpenAICompatibleModels(): Promise<AdapterModel[]> {
  return DEFAULT_OPENAI_COMPATIBLE_MODELS;
}

export async function discoverOpenAICompatibleModelsCached(): Promise<AdapterModel[]> {
  return DEFAULT_OPENAI_COMPATIBLE_MODELS;
}

export async function discoverOpenAICompatibleModels(_input?: unknown): Promise<AdapterModel[]> {
  return DEFAULT_OPENAI_COMPATIBLE_MODELS;
}

export function resetOpenAICompatibleModelsCacheForTests() {}
