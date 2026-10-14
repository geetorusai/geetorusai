/**
 * Ponytail Always-On Optimization Engine
 *
 * Implements DietrichGebert/ponytail principles as a prebuilt, permanently active
 * execution and coding efficiency layer for GeetorusAI:
 * - 5-Step Decision Ladder: YAGNI -> Audit Existing -> Native First -> Direct Expression -> Minimal Code
 * - Zero Mode Toggles: runs automatically on every task without Lite/Full/Ultra modes
 * - Extreme Token Minimization: deduplicates context, compacts task state, bounds history
 * - High-Speed Execution: targeted search before full reads, narrowest verification, concise outputs
 */

export type TaskIntent =
  | "code_modification"
  | "product_development"
  | "research_documentation"
  | "architecture_design"
  | "testing_validation"
  | "project_management"
  | "simple_direct";

export interface TaskComplexityAnalysis {
  intent: TaskIntent;
  isSimple: boolean;
  isSecuritySensitive: boolean;
  recommendedVerification: "lightweight" | "standard_tests" | "security_gated";
  optimizationDirectives: string[];
}

export interface ExecutionMetricsRecord {
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  durationMs: number;
  toolCalls?: number;
  costUsd?: number | null;
  optimizationApplied: true;
}

const PONYTAIL_CANONICAL_DECISION_LADDER = [
  "1. Does this need to exist at all? (YAGNI — reject speculative requirements)",
  "2. Is it already in the codebase? (Audit existing utilities before authoring; never duplicate)",
  "3. Does the platform native API cover it? (Use standard built-ins; avoid unneeded packages)",
  "4. Can it be expressed directly? (Pure functions and single expressions beat multi-layer abstractions)",
  "5. Write the MINIMAL code that works (Surgical diffs, no dead code, preserve safety & error handling)",
];

/**
 * Automatically classifies task intent and complexity without user configuration.
 */
export function analyzeTaskComplexity(prompt: string): TaskComplexityAnalysis {
  const p = prompt.toLowerCase();

  const isSecurity =
    /\b(auth|token|credential|secret|password|permission|rbac|vulnerability|exploit|sanitize)\b/i.test(p);

  const isSimple =
    prompt.length < 250 &&
    !/\b(refactor|architect|migrate|rebuild|full|pipeline|database|distributed)\b/i.test(p) &&
    /\b(what|where|how|fix typo|rename|explain|summarize|show|get|format)\b/i.test(p);

  let intent: TaskIntent = "code_modification";
  if (/\b(test|spec|verify|benchmark|assert|coverage)\b/i.test(p)) {
    intent = "testing_validation";
  } else if (/\b(doc|readme|guide|explain|architecture doc|spec)\b/i.test(p)) {
    intent = "research_documentation";
  } else if (/\b(architect|system design|schema|data model|protocol)\b/i.test(p)) {
    intent = "architecture_design";
  } else if (/\b(plan|issue|triage|milestone|schedule|roadmap)\b/i.test(p)) {
    intent = "project_management";
  } else if (/\b(build|create app|new feature|implement|component)\b/i.test(p)) {
    intent = "product_development";
  } else if (isSimple) {
    intent = "simple_direct";
  }

  const directives: string[] = [...PONYTAIL_CANONICAL_DECISION_LADDER];

  if (isSimple) {
    directives.push("Direct execution: answer immediately without multi-phase planning boilerplate.");
  } else if (intent === "code_modification" || intent === "product_development") {
    directives.push(
      "Targeted diffs: grep/inspect relevant symbols before reading files; edit only target blocks; do not rewrite whole files.",
    );
  } else if (intent === "testing_validation") {
    directives.push(
      "Narrowest test: run single test file or specific describe/it suite rather than full monorepo suites.",
    );
  }

  return {
    intent,
    isSimple,
    isSecuritySensitive: isSecurity,
    recommendedVerification: isSecurity
      ? "security_gated"
      : isSimple
        ? "lightweight"
        : "standard_tests",
    optimizationDirectives: directives,
  };
}

/**
 * Deduplicates retrieved text snippets and instructions to minimize token consumption.
 */
export function deduplicateContextChunks(chunks: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    // Normalized key (hash or sanitized prefix)
    const key = trimmed.slice(0, 120).replace(/\s+/g, " ");
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }

  return result;
}

/**
 * Renders the compact, universal Ponytail Always-On execution contract.
 * Injected automatically on every task and agent turn.
 */
export function renderPonytailOptimizationMandate(options: {
  intent?: TaskIntent;
  isSimple?: boolean;
} = {}): string {
  const lines: string[] = [
    "## ⚡ Ponytail Always-On Optimization Directive",
    "Apply the 5-step Decision Ladder across all operations:",
    "1. YAGNI: Build only what is directly requested; challenge speculative complexity.",
    "2. Audit Before Authoring: Search existing code/utilities before authoring; never duplicate.",
    "3. Native-First: Prefer language & platform built-ins over external dependencies.",
    "4. Clean & Direct: Single pure functions beat unnecessary class hierarchies or wrappers.",
    "5. Minimal Code & Diffs: Make surgical edits, search before reading whole files, and produce concise, actionable results.",
  ];

  if (options.isSimple) {
    lines.push("6. Direct Path: Answer simply without preamble or unneeded planning calls.");
  }

  return lines.join("\n");
}

/**
 * Summarizes completed execution history into a compact state ledger to prevent
 * resending huge conversation transcripts.
 */
export function compactExecutionHistory(
  entries: Array<{ action: string; outcome?: string; error?: string }>,
  maxEntries = 5,
): string {
  if (!entries || entries.length === 0) return "";

  const recent = entries.slice(-maxEntries);
  const formatted = recent.map((e, i) => {
    const status = e.error ? `FAILED: ${e.error.slice(0, 80)}` : `OK: ${(e.outcome || "completed").slice(0, 100)}`;
    return `- Step ${i + 1} (${e.action}): ${status}`;
  });

  return [
    "### Compact Execution State",
    ...formatted,
  ].join("\n");
}
