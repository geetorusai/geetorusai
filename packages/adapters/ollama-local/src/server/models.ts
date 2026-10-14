import type { AdapterModel } from "@geetorusai/adapter-utils";
import { models as DEFAULT_OLLAMA_MODELS, DEFAULT_OLLAMA_HOST } from "../index.js";

const OLLAMA_MODELS_TIMEOUT_MS = 3000;
const OLLAMA_MODELS_CACHE_TTL_MS = 60_000;

let cached: { host: string; expiresAt: number; models: AdapterModel[] } | null = null;

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

export async function fetchLiveOllamaModels(host: string, apiKey?: string): Promise<AdapterModel[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_MODELS_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${host.replace(/\/+$/, "")}/api/tags`, {
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      return [];
    }

    const data = (await res.json()) as {
      models?: Array<{
        name: string;
        details?: { parameter_size?: string; quantization_level?: string };
      }>;
    };

    if (!data.models || !Array.isArray(data.models)) {
      return [];
    }

    return data.models.map((m) => {
      const sizeTag = m.details?.parameter_size ? ` (${m.details.parameter_size})` : " (Local)";
      return {
        id: m.name,
        label: `${m.name}${sizeTag}`,
      };
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function listOllamaModels(): Promise<AdapterModel[]> {
  const host = process.env.OLLAMA_HOST || process.env.OLLAMA_API_BASE || DEFAULT_OLLAMA_HOST;
  const apiKey = process.env.OLLAMA_API_KEY?.trim();
  const now = Date.now();

  if (cached && cached.host === host && cached.expiresAt > now) {
    return cached.models;
  }

  const live = await fetchLiveOllamaModels(host, apiKey);
  const models = live.length > 0 ? dedupeModels([...live, ...DEFAULT_OLLAMA_MODELS]) : DEFAULT_OLLAMA_MODELS;

  cached = {
    host,
    expiresAt: now + OLLAMA_MODELS_CACHE_TTL_MS,
    models,
  };

  return models;
}

export async function refreshOllamaModels(): Promise<AdapterModel[]> {
  cached = null;
  return listOllamaModels();
}
