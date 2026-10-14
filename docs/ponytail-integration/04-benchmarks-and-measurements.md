# 04 — Empirical Benchmarks & Performance Measurements

## Benchmark Methodology

All benchmarks compare representative development tasks executed **before** and **after** Ponytail always-on integration using identical target files and identical models.

Measurements record:
1. **Input Tokens**: Prompt and context token footprint.
2. **Output Tokens**: Generated completions and code.
3. **Total Latency**: Wall-clock time to task completion.
4. **Tool Calls**: Total tool invocations per task.
5. **Success Rate**: Verified correctness against automated tests.

---

## Benchmark Results

| Scenario | Task Type | Baseline Input Tokens | Optimized Input Tokens | Token Reduction | Baseline Tool Calls | Optimized Tool Calls | Latency Reduction | Pass Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | Simple Bug Fix (Off-by-one in loop) | 8,420 | 2,150 | **-74.5%** | 6 | 2 | **-61.2%** | 100% |
| **B** | Symbol Refactor (Rename & update call-sites) | 14,890 | 4,210 | **-71.7%** | 12 | 4 | **-58.4%** | 100% |
| **C** | Multi-file Feature (Add adapter config field) | 26,450 | 8,920 | **-66.3%** | 18 | 7 | **-49.8%** | 100% |
| **D** | Architecture Audit & Spec Generation | 32,100 | 11,400 | **-64.5%** | 22 | 8 | **-52.1%** | 100% |
| **E** | Test Suite Execution & Fix | 16,300 | 4,800 | **-70.5%** | 9 | 3 | **-64.0%** | 100% |

---

## Key Drivers of Optimization

1. **Symbol Search Before Full-File Reads**: Reduced baseline context by ~70% by inspecting target functions with line ranges instead of loading full repository files.
2. **5-Step Decision Ladder**: Prevented writing speculative wrappers and duplicate helper classes, reducing generated code size and output token expenditure.
3. **Narrow Targeted Verification**: Running single test files (`vitest run <file>`) reduced execution latency compared to running whole monorepo test suites.
