import type { AdapterSessionCodec } from "@geetorusai/adapter-utils";

export const sessionCodec: AdapterSessionCodec = {
  deserialize(raw: unknown) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    const sessionId = typeof record.sessionId === "string" ? record.sessionId : null;
    return sessionId ? { sessionId } : null;
  },
  serialize(params: Record<string, unknown> | null) {
    if (!params) return null;
    const sessionId = typeof params.sessionId === "string" ? params.sessionId : null;
    return sessionId ? { sessionId } : null;
  },
  getDisplayId(params: Record<string, unknown> | null) {
    if (!params) return null;
    return typeof params.sessionId === "string" ? params.sessionId : null;
  },
};

export { execute } from "./execute.js";
export { listOllamaSkills, syncOllamaSkills } from "./skills.js";
export { testEnvironment } from "./test.js";
export { parseOllamaStdoutLine } from "./parse.js";
