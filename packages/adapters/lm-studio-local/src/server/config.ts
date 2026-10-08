import { asString, parseObject } from "@geetorusai/adapter-utils/server-utils";
import { DEFAULT_LM_STUDIO_BASE_URL } from "../index.js";

export function normalizeLmStudioBaseUrl(value: unknown): string {
  const raw = asString(value, DEFAULT_LM_STUDIO_BASE_URL).trim() || DEFAULT_LM_STUDIO_BASE_URL;
  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  return withoutTrailingSlash.endsWith("/v1")
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/v1`;
}

export function withLmStudioDefaults(configInput: Record<string, unknown>): Record<string, unknown> {
  const config = { ...configInput };
  const env = parseObject(config.env);
  const baseUrl = normalizeLmStudioBaseUrl(
    config.baseUrl ?? env.LM_STUDIO_BASE_URL ?? process.env.LM_STUDIO_BASE_URL,
  );
  const apiKey = asString(
    config.apiKey,
    asString(env.LM_STUDIO_API_TOKEN, process.env.LM_STUDIO_API_TOKEN ?? ""),
  ).trim();

  config.baseUrl = baseUrl;
  if (apiKey) config.apiKey = apiKey;
  return config;
}

export function lmStudioRequestHeaders(configInput: Record<string, unknown>): Record<string, string> {
  const config = withLmStudioDefaults(configInput);
  const apiKey = asString(config.apiKey, "").trim();
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}
