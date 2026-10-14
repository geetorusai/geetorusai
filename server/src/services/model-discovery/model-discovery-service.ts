import type { DiscoveredModel, ModelDiscoveryResult } from "@geetorusai/shared";
import { validateBaseUrlSecurity } from "../self-healing/preflight-validator.js";
import { classifyError } from "../self-healing/error-classifier.js";

export interface ProviderConnectionCredentials {
  provider: string;
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
}

export interface ConnectionTestResult {
  connected: boolean;
  latencyMs: number;
  provider: string;
  error?: string;
  statusCode?: number;
  checkedAt: string;
}

interface CacheEntry {
  result: ModelDiscoveryResult;
  expiresAt: number;
}

export class ModelDiscoveryService {
  private cache = new Map<string, CacheEntry>();
  private defaultTtlMs = 15 * 60 * 1000; // 15 minutes

  /**
   * Test basic connectivity and authentication to the provider endpoint.
   */
  async testConnection(creds: ProviderConnectionCredentials): Promise<ConnectionTestResult> {
    const start = performance.now();
    const provider = creds.provider.toLowerCase().trim();
    const checkedAt = new Date().toISOString();

    try {
      // Validate custom baseUrl security if provided
      if (creds.baseUrl) {
        const allowLocal = provider === "ollama";
        const urlCheck = validateBaseUrlSecurity(creds.baseUrl, allowLocal);
        if (!urlCheck.valid) {
          return {
            connected: false,
            latencyMs: 0,
            provider,
            error: urlCheck.reason,
            checkedAt,
          };
        }
      }

      let res: Response;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        switch (provider) {
          case "ollama": {
            const base = creds.baseUrl?.replace(/\/+$/, "") || "http://127.0.0.1:11434";
            const headers: Record<string, string> = {};
            if (creds.apiKey) {
              headers["Authorization"] = `Bearer ${creds.apiKey}`;
            }
            res = await fetch(`${base}/api/tags`, {
              method: "GET",
              headers,
              signal: controller.signal,
            });
            break;
          }
          case "anthropic": {
            res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
              method: "GET",
              headers: {
                "x-api-key": creds.apiKey || "",
                "anthropic-version": "2023-06-01",
              },
              signal: controller.signal,
            });
            break;
          }
          case "google":
          case "gemini": {
            res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(creds.apiKey || "")}`,
              {
                method: "GET",
                signal: controller.signal,
              },
            );
            break;
          }
          case "openrouter": {
            res = await fetch("https://openrouter.ai/api/v1/models", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${creds.apiKey || ""}`,
              },
              signal: controller.signal,
            });
            break;
          }
          case "openai":
          default: {
            const base = creds.baseUrl?.replace(/\/+$/, "") || "https://api.openai.com";
            res = await fetch(`${base}/v1/models`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${creds.apiKey || ""}`,
                ...(creds.organizationId ? { "OpenAI-Organization": creds.organizationId } : {}),
              },
              signal: controller.signal,
            });
            break;
          }
        }
      } finally {
        clearTimeout(timeoutId);
      }

      const latencyMs = Math.round(performance.now() - start);

      if (res.ok) {
        return {
          connected: true,
          latencyMs,
          provider,
          statusCode: res.status,
          checkedAt,
        };
      }

      const classified = classifyError(new Error(`HTTP ${res.status} ${res.statusText}`), {
        provider,
        component: "provider-connection-test",
      });

      return {
        connected: false,
        latencyMs,
        provider,
        error: classified.userFacingExplanation,
        statusCode: res.status,
        checkedAt,
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      const classified = classifyError(err, {
        provider,
        component: "provider-connection-test",
      });

      return {
        connected: false,
        latencyMs,
        provider,
        error: classified.userFacingExplanation,
        checkedAt,
      };
    }
  }

  /**
   * Discover available models from the provider's live API or return cached results.
   */
  async discoverModels(
    creds: ProviderConnectionCredentials,
    options: { forceRefresh?: boolean; ttlMs?: number } = {},
  ): Promise<ModelDiscoveryResult> {
    const provider = creds.provider.toLowerCase().trim();
    const cacheKey = `${provider}:${creds.baseUrl || "default"}:${(creds.apiKey || "").slice(-6)}`;
    const now = Date.now();

    if (!options.forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return {
          ...cached.result,
          models: cached.result.models.map((m) => ({ ...m, source: "cached" })),
        };
      }
    }

    const fetchedAt = new Date().toISOString();
    const ttlMs = options.ttlMs ?? this.defaultTtlMs;

    try {
      let models: DiscoveredModel[] = [];

      switch (provider) {
        case "ollama":
          models = await this.discoverOllamaModels(creds);
          break;
        case "anthropic":
          models = await this.discoverAnthropicModels(creds);
          break;
        case "google":
        case "gemini":
          models = await this.discoverGeminiModels(creds);
          break;
        case "openrouter":
          models = await this.discoverOpenRouterModels(creds);
          break;
        case "openai":
        default:
          models = await this.discoverOpenAiCompatibleModels(creds);
          break;
      }

      const result: ModelDiscoveryResult = {
        provider,
        success: true,
        models,
        fetchedAt,
        cacheTtlMs: ttlMs,
      };

      this.cache.set(cacheKey, {
        result,
        expiresAt: now + ttlMs,
      });

      return result;
    } catch (err) {
      const classified = classifyError(err, { provider, component: "model-discovery" });
      return {
        provider,
        success: false,
        models: [],
        error: classified.userFacingExplanation,
        fetchedAt,
        cacheTtlMs: 0,
      };
    }
  }

  /**
   * Discovers OpenAI / OpenAI-compatible models (Together, Groq, DeepSeek, vLLM, etc.)
   */
  private async discoverOpenAiCompatibleModels(creds: ProviderConnectionCredentials): Promise<DiscoveredModel[]> {
    const base = creds.baseUrl?.replace(/\/+$/, "") || "https://api.openai.com";
    const res = await fetch(`${base}/v1/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${creds.apiKey || ""}`,
        ...(creds.organizationId ? { "OpenAI-Organization": creds.organizationId } : {}),
      },
    });

    if (!res.ok) {
      throw new Error(`OpenAI models endpoint returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as { data?: Array<{ id: string; created?: number; owned_by?: string }> };
    const rawList = data.data || [];
    const now = new Date().toISOString();

    return rawList.map((item) => {
      const id = item.id;
      const lower = id.toLowerCase();

      // Normalize verified capabilities based on architecture families
      const isO1O3 = /^o[13]/i.test(id);
      const isGpt4o = /gpt-4o/i.test(id);
      const isGpt4 = /gpt-4/i.test(id);
      const isGpt35 = /gpt-3\.5/i.test(id);

      const contextWindow = isO1O3 || isGpt4o ? 128000 : isGpt4 ? 128000 : isGpt35 ? 16385 : null;
      const toolCalling = isGpt4o || isGpt4 || isGpt35 || isO1O3;
      const vision = isGpt4o || /vision/i.test(id);

      return {
        id,
        name: id,
        provider: creds.provider,
        contextWindow,
        maxOutputTokens: isO1O3 ? 65536 : isGpt4o ? 16384 : 4096,
        modalities: vision ? ["text", "image"] : ["text"],
        capabilities: {
          toolCalling,
          vision,
          streaming: true,
          jsonOutput: toolCalling,
        },
        status: "available",
        discoveredAt: now,
        source: "live_api",
        rawMetadata: { owned_by: item.owned_by, created: item.created },
      };
    });
  }

  /**
   * Discovers Anthropic models via official /v1/models
   */
  private async discoverAnthropicModels(creds: ProviderConnectionCredentials): Promise<DiscoveredModel[]> {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": creds.apiKey || "",
        "anthropic-version": "2023-06-01",
      },
    });

    if (!res.ok) {
      throw new Error(`Anthropic models endpoint returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as { data?: Array<{ id: string; display_name?: string; created_at?: string }> };
    const list = data.data || [];
    const now = new Date().toISOString();

    return list.map((item) => {
      const id = item.id;
      const isClaude3 = id.includes("claude-3");
      const isSonnet = id.includes("sonnet");
      const isOpus = id.includes("opus");

      return {
        id,
        name: item.display_name || id,
        provider: "anthropic",
        contextWindow: 200000,
        maxOutputTokens: isSonnet || isOpus ? 8192 : 4096,
        modalities: isClaude3 ? ["text", "image"] : ["text"],
        capabilities: {
          toolCalling: true,
          vision: isClaude3,
          streaming: true,
          jsonOutput: true,
        },
        status: "available",
        discoveredAt: now,
        source: "live_api",
        rawMetadata: { created_at: item.created_at },
      };
    });
  }

  /**
   * Discovers Google Gemini models via Generative Language API
   */
  private async discoverGeminiModels(creds: ProviderConnectionCredentials): Promise<DiscoveredModel[]> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(creds.apiKey || "")}`,
      { method: "GET" },
    );

    if (!res.ok) {
      throw new Error(`Google GenerativeLanguage API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = (await res.json()) as {
      models?: Array<{
        name: string;
        displayName?: string;
        description?: string;
        inputTokenLimit?: number;
        outputTokenLimit?: number;
        supportedGenerationMethods?: string[];
      }>;
    };

    const now = new Date().toISOString();
    const list = data.models || [];

    // Filter to generateContent supported models
    return list
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => {
        const id = m.name.replace(/^models\//, "");
        const is15Pro = id.includes("1.5-pro");
        const isFlash = id.includes("flash");
        const is20 = id.includes("2.0");

        return {
          id,
          name: m.displayName || id,
          provider: "google",
          contextWindow: m.inputTokenLimit || (is15Pro ? 2097152 : isFlash ? 1048576 : 32768),
          maxOutputTokens: m.outputTokenLimit || 8192,
          modalities: ["text", "image", "audio", "video"],
          capabilities: {
            toolCalling: is15Pro || isFlash || is20,
            vision: true,
            streaming: true,
            jsonOutput: true,
          },
          status: "available",
          discoveredAt: now,
          source: "live_api",
          rawMetadata: { description: m.description },
        };
      });
  }

  /**
   * Discovers models via OpenRouter
   */
  private async discoverOpenRouterModels(creds: ProviderConnectionCredentials): Promise<DiscoveredModel[]> {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${creds.apiKey || ""}` },
    });

    if (!res.ok) {
      throw new Error(`OpenRouter API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        name?: string;
        context_length?: number;
        top_provider?: { max_completion_tokens?: number };
        architecture?: { modality?: string; instruct_type?: string };
        pricing?: Record<string, string>;
      }>;
    };

    const now = new Date().toISOString();
    return (json.data || []).map((m) => {
      const modalities = m.architecture?.modality
        ? m.architecture.modality.split("->")[0].split("+").map((s) => s.trim())
        : ["text"];

      return {
        id: m.id,
        name: m.name || m.id,
        provider: "openrouter",
        contextWindow: m.context_length || null,
        maxOutputTokens: m.top_provider?.max_completion_tokens || null,
        modalities,
        capabilities: {
          toolCalling: true,
          vision: modalities.includes("image"),
          streaming: true,
          jsonOutput: true,
        },
        status: "available",
        discoveredAt: now,
        source: "live_api",
        rawMetadata: { pricing: m.pricing },
      };
    });
  }

  /**
   * Discovers local and cloud-routed models from Ollama
   */
  private async discoverOllamaModels(creds: ProviderConnectionCredentials): Promise<DiscoveredModel[]> {
    const base = creds.baseUrl?.replace(/\/+$/, "") || "http://127.0.0.1:11434";
    const now = new Date().toISOString();
    const isLocal = base.includes("127.0.0.1") || base.includes("localhost") || base.includes("0.0.0.0");

    const cloudModels: DiscoveredModel[] = [
      {
        id: "deepseek-v3:cloud",
        name: "DeepSeek V3 (Ollama Cloud)",
        provider: "ollama",
        contextWindow: 128000,
        maxOutputTokens: 8192,
        modalities: ["text"],
        capabilities: {
          toolCalling: true,
          vision: false,
          streaming: true,
          jsonOutput: true,
        },
        status: "available",
        discoveredAt: now,
        source: "catalog",
        rawMetadata: {
          parameterSize: "cloud",
          isLocal: false,
          cloudRouted: true,
        },
      },
      {
        id: "deepseek-r1:cloud",
        name: "DeepSeek R1 (Ollama Cloud)",
        provider: "ollama",
        contextWindow: 128000,
        maxOutputTokens: 8192,
        modalities: ["text"],
        capabilities: {
          toolCalling: false,
          vision: false,
          streaming: true,
          jsonOutput: true,
        },
        status: "available",
        discoveredAt: now,
        source: "catalog",
        rawMetadata: {
          parameterSize: "cloud",
          isLocal: false,
          cloudRouted: true,
        },
      },
      {
        id: "llama3.3:cloud",
        name: "Llama 3.3 70B (Ollama Cloud)",
        provider: "ollama",
        contextWindow: 128000,
        maxOutputTokens: 8192,
        modalities: ["text"],
        capabilities: {
          toolCalling: true,
          vision: false,
          streaming: true,
          jsonOutput: true,
        },
        status: "available",
        discoveredAt: now,
        source: "catalog",
        rawMetadata: {
          parameterSize: "cloud",
          isLocal: false,
          cloudRouted: true,
        },
      },
      {
        id: "qwen2.5-coder:32b:cloud",
        name: "Qwen 2.5 Coder 32B (Ollama Cloud)",
        provider: "ollama",
        contextWindow: 128000,
        maxOutputTokens: 8192,
        modalities: ["text"],
        capabilities: {
          toolCalling: true,
          vision: false,
          streaming: true,
          jsonOutput: true,
        },
        status: "available",
        discoveredAt: now,
        source: "catalog",
        rawMetadata: {
          parameterSize: "cloud",
          isLocal: false,
          cloudRouted: true,
        },
      },
    ];

    try {
      const headers: Record<string, string> = {};
      if (creds.apiKey) {
        headers["Authorization"] = `Bearer ${creds.apiKey}`;
      }

      const res = await fetch(`${base}/api/tags`, { headers });
      if (res.ok) {
        const data = (await res.json()) as {
          models?: Array<{
            name: string;
            modified_at?: string;
            size?: number;
            details?: { parameter_size?: string; quantization_level?: string; families?: string[] };
          }>;
        };

        const liveModels: DiscoveredModel[] = (data.models || []).map((m) => {
          const hasVision = m.details?.families?.includes("clip") || /llava|vision/i.test(m.name);
          return {
            id: m.name,
            name: `${m.name}${isLocal ? "" : " (Remote)"}`,
            provider: "ollama",
            contextWindow: 128000,
            maxOutputTokens: 8192,
            modalities: hasVision ? ["text", "image"] : ["text"],
            capabilities: {
              toolCalling: !m.name.includes("deepseek-r1"),
              vision: hasVision,
              streaming: true,
              jsonOutput: true,
            },
            status: "available",
            discoveredAt: now,
            source: "live_api",
            rawMetadata: {
              sizeBytes: m.size,
              parameterSize: m.details?.parameter_size,
              quantization: m.details?.quantization_level,
              isLocal,
            },
          };
        });

        const combined = [...liveModels];
        for (const cm of cloudModels) {
          if (!combined.some((m) => m.id === cm.id)) {
            combined.push(cm);
          }
        }
        return combined;
      }
    } catch {
      // If local daemon is unreachable, still provide cloud-capable Ollama models
    }

    return cloudModels;
  }

  /**
   * Clear cache for a provider or all cache
   */
  clearCache(provider?: string): void {
    if (!provider) {
      this.cache.clear();
      return;
    }
    const prefix = provider.toLowerCase();
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const modelDiscoveryService = new ModelDiscoveryService();
