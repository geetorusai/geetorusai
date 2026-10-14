import type { AdapterModel } from "@geetorusai/adapter-utils";
import { models as DEFAULT_LMSTUDIO_MODELS, DEFAULT_LMSTUDIO_HOST } from "../index.js";

const LMSTUDIO_MODELS_TIMEOUT_MS = 3000;
const LMSTUDIO_MODELS_CACHE_TTL_MS = 60_000;

let cached: { host: string; expiresAt: number; models: AdapterModel[] } | null = null;

function normalizeHost(rawHost: string): string {
  const clean = rawHost.trim().replace(/\/+$/, "");
  if (clean.endsWith("/v1")) return clean;
  return `${clean}/v1`;
}

function dedupeModels(models: AdapterModel[]): AdapterModel[] {
  const seen = new Set<string>();
  const deduped: AdapterModel[] = [];
  for (const model of models) {
    const id = model.id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push({ id, label: model.label.trim() || id });
  }
  return deduped;
}

export async function fetchLiveLmStudioModels(host: string, apiKey?: string): Promise<AdapterModel[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LMSTUDIO_MODELS_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const apiBase = normalizeHost(host);
    const res = await fetch(`${apiBase}/models`, {
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as {
      data?: Array<{ id: string; object?: string }>;
    };

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((m) => ({
      id: m.id,
      label: `${m.id} (LM Studio Local)`,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function listLmStudioModels(config?: Record<string, unknown>): Promise<AdapterModel[]> {
  const host = typeof config?.host === "string" && config.host.trim()
    ? config.host.trim()
    : process.env.LMSTUDIO_HOST || process.env.LM_STUDIO_HOST || DEFAULT_LMSTUDIO_HOST;

  const apiKey = typeof config?.apiKey === "string" && config.apiKey.trim()
    ? config.apiKey.trim()
    : process.env.LMSTUDIO_API_KEY || "";

  const now = Date.now();
  if (cached && cached.host === host && cached.expiresAt > now) {
    return cached.models;
  }

  const live = await fetchLiveLmStudioModels(host, apiKey);
  const combined = dedupeModels([...live, ...DEFAULT_LMSTUDIO_MODELS]);

  cached = {
    host,
    expiresAt: now + LMSTUDIO_MODELS_CACHE_TTL_MS,
    models: combined,
  };

  return combined;
}

export async function refreshLmStudioModels(config?: Record<string, unknown>): Promise<AdapterModel[]> {
  cached = null;
  return listLmStudioModels(config);
}
