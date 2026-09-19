import type { CapabilityJsonValue } from "../mock-core/capability-control-plane-types.js";
import type { GeetorusJsonValue } from "../catalog/semantic-action-types.js";

export const CAPABILITY_REDACTED = "[REDACTED]";

export function containsProtectedSemanticData(value: unknown, key = ""): boolean {
  const inspected = inspectGeetorusSemanticValue(
    key.length === 0 ? value : { [key]: value },
  );
  // Fail closed when provider-controlled values exceed the shared safety bound.
  return inspected.containsProtectedData || !inspected.withinBounds;
}

export function redactSemanticValue(value: unknown, key = ""): CapabilityJsonValue {
  if (key.length === 0) {
    return redactGeetorusSemanticValue(value) as CapabilityJsonValue;
  }
  const wrapped = redactGeetorusSemanticValue({ [key]: value });
  if (typeof wrapped !== "object" || wrapped === null || Array.isArray(wrapped)) {
    return CAPABILITY_REDACTED;
  }
  const object = wrapped as { readonly [entryKey: string]: GeetorusJsonValue };
  return (object[key] ?? CAPABILITY_REDACTED) as CapabilityJsonValue;
}

const GEETORUS_SENSITIVE_KEY =
  /(?:authorization|cookie|credential|password|passwd|private.?key|secret|token|api.?key|connection.?string)/i;
const GEETORUS_SECRET_VALUE =
  /(?:\bBearer\s+[A-Za-z0-9._~+/=-]{8,}|\b(?:sk|pk|pcgw|ghp|github_pat)_[A-Za-z0-9_-]{8,}|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})/gi;
const GEETORUS_SECRET_QUERY =
  /([?&](?:code|key|secret|state|token|api[_-]?key|access[_-]?token)=)[^&#\s]+/gi;
const GEETORUS_GEETORUS_SECRET_QUERY_DETECT =
  /[?&](?:code|key|secret|state|token|api[_-]?key|access[_-]?token)=[^&#\s]+/i;

const GEETORUS_MAX_DEPTH = 16;
const GEETORUS_MAX_NODES = 10_000;
const GEETORUS_MAX_ARRAY_ITEMS = 512;
const GEETORUS_MAX_OBJECT_KEYS = 512;
const GEETORUS_MAX_STRING_LENGTH = 200_000;

export const GEETORUS_SEMANTIC_REDACTED = "[REDACTED]";
export const GEETORUS_SEMANTIC_TRUNCATED = "[TRUNCATED]";

export interface GeetorusSemanticValueSafety {
  readonly containsProtectedData: boolean;
  readonly withinBounds: boolean;
}

export function inspectGeetorusSemanticValue(
  value: unknown,
): GeetorusSemanticValueSafety {
  const state = { nodes: 0, protected: false, withinBounds: true };
  inspect(value, "", 0, state, new Set<object>());
  return Object.freeze({
    containsProtectedData: state.protected,
    withinBounds: state.withinBounds,
  });
}

export function redactGeetorusSemanticValue(
  value: unknown,
): GeetorusJsonValue {
  const state = { nodes: 0 };
  return redact(value, "", 0, state, new Set<object>());
}

function inspect(
  value: unknown,
  key: string,
  depth: number,
  state: { nodes: number; protected: boolean; withinBounds: boolean },
  ancestors: Set<object>,
): void {
  state.nodes += 1;
  if (state.nodes > GEETORUS_MAX_NODES || depth > GEETORUS_MAX_DEPTH) {
    state.withinBounds = false;
    return;
  }
  if (GEETORUS_SENSITIVE_KEY.test(key)) state.protected = true;
  if (typeof value === "string") {
    if (value.length > GEETORUS_MAX_STRING_LENGTH) state.withinBounds = false;
    GEETORUS_SECRET_VALUE.lastIndex = 0;
    if (GEETORUS_SECRET_VALUE.test(value) || GEETORUS_GEETORUS_SECRET_QUERY_DETECT.test(value)) {
      state.protected = true;
    }
    GEETORUS_SECRET_VALUE.lastIndex = 0;
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > GEETORUS_MAX_ARRAY_ITEMS) state.withinBounds = false;
    if (ancestors.has(value)) {
      state.withinBounds = false;
      return;
    }
    ancestors.add(value);
    for (const child of value.slice(0, GEETORUS_MAX_ARRAY_ITEMS)) {
      inspect(child, "", depth + 1, state, ancestors);
    }
    ancestors.delete(value);
    return;
  }
  if (typeof value === "object" && value !== null) {
    if (ancestors.has(value)) {
      state.withinBounds = false;
      return;
    }
    const entries = Object.entries(value);
    if (entries.length > GEETORUS_MAX_OBJECT_KEYS) state.withinBounds = false;
    ancestors.add(value);
    for (const [childKey, child] of entries.slice(0, GEETORUS_MAX_OBJECT_KEYS)) {
      inspect(child, childKey, depth + 1, state, ancestors);
    }
    ancestors.delete(value);
    return;
  }
  if (
    value !== null &&
    typeof value !== "number" &&
    typeof value !== "boolean" &&
    typeof value !== "undefined"
  ) {
    state.withinBounds = false;
  }
}

function redact(
  value: unknown,
  key: string,
  depth: number,
  state: { nodes: number },
  ancestors: Set<object>,
): GeetorusJsonValue {
  state.nodes += 1;
  if (state.nodes > GEETORUS_MAX_NODES || depth > GEETORUS_MAX_DEPTH) {
    return GEETORUS_SEMANTIC_TRUNCATED;
  }
  if (GEETORUS_SENSITIVE_KEY.test(key)) return GEETORUS_SEMANTIC_REDACTED;
  if (typeof value === "string") {
    GEETORUS_SECRET_VALUE.lastIndex = 0;
    const redacted = value
      .replace(GEETORUS_SECRET_VALUE, GEETORUS_SEMANTIC_REDACTED)
      .replace(GEETORUS_SECRET_QUERY, `$1${GEETORUS_SEMANTIC_REDACTED}`);
    GEETORUS_SECRET_VALUE.lastIndex = 0;
    return redacted.length <= GEETORUS_MAX_STRING_LENGTH
      ? redacted
      : `${redacted.slice(0, GEETORUS_MAX_STRING_LENGTH)}${GEETORUS_SEMANTIC_TRUNCATED}`;
  }
  if (Array.isArray(value)) {
    if (ancestors.has(value)) return GEETORUS_SEMANTIC_TRUNCATED;
    ancestors.add(value);
    const result = value
      .slice(0, GEETORUS_MAX_ARRAY_ITEMS)
      .map((child) => redact(child, "", depth + 1, state, ancestors));
    ancestors.delete(value);
    if (value.length > GEETORUS_MAX_ARRAY_ITEMS) {
      result.push(GEETORUS_SEMANTIC_TRUNCATED);
    }
    return result;
  }
  if (typeof value === "object" && value !== null) {
    if (ancestors.has(value)) return GEETORUS_SEMANTIC_TRUNCATED;
    ancestors.add(value);
    const entries = Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, GEETORUS_MAX_OBJECT_KEYS)
      .map(
        ([childKey, child]) =>
          [
            childKey,
            redact(child, childKey, depth + 1, state, ancestors),
          ] as const,
      );
    ancestors.delete(value);
    const result: Record<string, GeetorusJsonValue> =
      Object.fromEntries(entries);
    if (Object.keys(value).length > GEETORUS_MAX_OBJECT_KEYS) {
      result.__geetorus_truncated__ = GEETORUS_SEMANTIC_TRUNCATED;
    }
    return result;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "boolean" || value === null) return value;
  return GEETORUS_SEMANTIC_TRUNCATED;
}
