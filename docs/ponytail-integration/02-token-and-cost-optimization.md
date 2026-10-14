# 02 — Token & Cost Minimization

## Core Token Reduction Techniques

GeetorusAI enforces continuous token minimization across context, prompt, tool, and output stages:

---

### A. Context Optimization
1. **Search Before Loading**:
   - Uses `grep_search` with line ranges (`StartLine`/`EndLine`) instead of unconstrained full-file reads.
   - Prevents loading entire repository trees into prompt context.
2. **Context Deduplication**:
   - `deduplicateContextChunks` filters out repeated instruction blocks, duplicate rule sets, and identical documentation snippets.
3. **Compact Task State Ledger**:
   - Replaces long transcript histories with `compactExecutionHistory` (recent milestones, decisions, remaining actions).
4. **Session Compaction**:
   - Regulated by `ADAPTER_SESSION_MANAGEMENT` in `packages/adapter-utils/src/session-compaction.ts` to prevent runaway context growth across turns.

---

### B. Prompt Optimization
1. **Canonical Shared Directives**:
   - Invariant Ponytail Decision Ladder injected once per wake prompt.
   - Eliminates redundant explanations and verbose conversational pleasantries.
2. **Intent-Tailored Scope**:
   - Lightweight guidance for simple tasks; modular structure only when complexity warrants it.

---

### C. Tool Call Optimization
1. **Deduplicated Queries**:
   - Caches initialized clients and previous execution results.
2. **Diff Inspections**:
   - Analyzes git diffs and specific file changes rather than inspecting entire projects repeatedly.
3. **Deterministic Local Tools**:
   - Executes deterministic file and shell operations directly without invoking extraneous LLM reasoning calls.

---

### D. Cost Accounting & Metrics
1. **Measured vs. Estimated**:
   - Directly ingests `prompt_eval_count` and `eval_count` from Ollama and provider-reported usage summaries.
   - Accurately tracks `costUsd` and cache discounts.
2. **Honest Billing Invariants**:
   - Never switches from local/free models to paid cloud models upon task failure.
   - Exceeding budget thresholds requires explicit user confirmation.
