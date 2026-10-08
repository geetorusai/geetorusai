import type { AdapterModel } from "@geetorusai/adapter-utils";
import {
  normalizeLmStudioBaseUrl,
  lmStudioRequestHeaders,
  withLmStudioDefaults,
} from "./config.js";

type ModelsResponse = {
  data?: Array<{ id?: unknown }>;
};

export function requireLmStudioModelId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("model must be a non-empty LM Studio model ID");
  }
  return value.trim();
}

export async function discoverLmStudioModels(
  config: Record<string, unknown> = {},
  options: { timeoutMs?: number } = {},
): Promise<AdapterModel[]> {
  const resolvedConfig = withLmStudioDefaults(config);
  const baseUrl = normalizeLmStudioBaseUrl(resolvedConfig.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 5_000);
  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: lmStudioRequestHeaders(resolvedConfig),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`LM Studio returned HTTP ${response.status} from ${baseUrl}/models`);
    }
    const payload = (await response.json()) as ModelsResponse;
    const ids = new Set(
      (payload.data ?? [])
        .map((entry) => typeof entry.id === "string" ? entry.id.trim() : "")
        .filter(Boolean),
    );
    return [...ids]
      .sort((a, b) => a.localeCompare(b))
      .map((id) => ({ id, label: id }));
  } finally {
    clearTimeout(timeout);
  }
}

export async function listLmStudioModels(
  config: Record<string, unknown> = {},
): Promise<AdapterModel[]> {
  try {
    return await discoverLmStudioModels({
      ...config,
      baseUrl: config.baseUrl ?? process.env.LM_STUDIO_BASE_URL,
      apiKey: config.apiKey ?? process.env.LM_STUDIO_API_TOKEN,
    });
  } catch (error) {
    // A caller-provided URL came from an interactive discovery request. Surface
    // its connection error so the UI can explain the failure instead of showing
    // an indistinguishable empty model list. Background default discovery stays
    // best-effort for compatibility with other adapters.
    if (config.baseUrl) throw error;
    return [];
  }
}

export async function detectLmStudioModel(
  config: Record<string, unknown> = {},
): Promise<{
  model: string;
  provider: string;
  source: string;
  candidates?: string[];
} | null> {
  const discovered = await listLmStudioModels(config);
  const first = discovered[0];
  if (!first) return null;
  return {
    model: first.id,
    provider: "lm_studio",
    source: `${normalizeLmStudioBaseUrl(config.baseUrl ?? process.env.LM_STUDIO_BASE_URL)}/models`,
    candidates: discovered.slice(1).map((entry) => entry.id),
  };
}
