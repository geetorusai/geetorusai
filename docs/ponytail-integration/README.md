# GeetorusAI — Always-On Ponytail Integration

## Executive Summary

GeetorusAI embeds [`DietrichGebert/ponytail`](https://github.com/DietrichGebert/ponytail.git) as a permanently enabled, prebuilt execution and coding-efficiency layer across all agent runtimes, models, and tasks.

**Core Invariant**: There are **no modes** (no Lite, Full, Ultra, or Off selectors) and **no manual activation steps**. The optimization pipeline runs automatically as part of GeetorusAI's core task execution lifecycle.

---

## 🪜 The Ponytail 5-Step Decision Ladder

Every operation executed by GeetorusAI strictly evaluates against the 5-step Decision Ladder:

```
[THE PONYTAIL DECISION LADDER]
1. Does this need to exist at all? (YAGNI — reject speculative requirements)
2. Is it already in the codebase? (Audit existing utilities before authoring; never duplicate)
3. Does the platform native API cover it? (Use standard built-ins; avoid unneeded packages)
4. Can it be expressed directly? (Pure functions and single expressions beat multi-layer wrappers)
5. Write the MINIMAL code that works (Surgical diffs, no dead code, preserve safety & error handling)
```

---

## 📂 Documentation Directory Map

| Document | Focus & Scope |
| :--- | :--- |
| [01 — Execution Pipeline](./01-execution-pipeline.md) | Request lifecycle: Intent detection, context retrieval, targeted tool selection, verification. |
| [02 — Token & Cost Optimization](./02-token-and-cost-optimization.md) | Context deduplication, prompt structuring, search-before-read, exact metric tracking. |
| [03 — Model Runtime Compatibility](./03-model-runtime-compatibility.md) | Universal execution contract for Local Ollama, Ollama Cloud, Claude, Codex, Gemini, Grok. |
| [04 — Benchmarks & Measurements](./04-benchmarks-and-measurements.md) | Measured before vs. after empirical benchmarks across representative tasks. |
| [05 — Operations & Troubleshooting](./05-operations-and-troubleshooting.md) | Startup verification, error recovery, persistence across restarts, diagnostic guides. |

---

## ⚡ Always-On Architecture Highlights

1. **Prebuilt & Idempotent**: Bundled directly in `packages/adapter-utils/src/ponytail-optimizer.ts` and seeded into standard instructions (`AGENTS.md`). Preserved across sessions, restarts, and background workers.
2. **Extreme Token Minimization**: Automatically deduplicates context blocks, prevents full-repository dumps, limits histories to compact state ledgers, and captures measured token frames.
3. **Honest Model Routing**: Never silently switches to paid models upon local model errors. Model selection explicitly follows user configuration.
