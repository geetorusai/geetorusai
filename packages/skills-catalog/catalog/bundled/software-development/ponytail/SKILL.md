---
name: ponytail
description: Senior engineer anti-overengineering ruleset and decision ladder. Enforces minimal code, YAGNI, standard library reuse, token efficiency, and automated /ponytail-review audits.
key: geetorusai/bundled/software-development/ponytail
recommendedForRoles:
  - engineer
  - cto
  - ceo
  - developer
  - qa
defaultInstall: true
tags:
  - code-quality
  - anti-overengineering
  - architecture
  - yagni
  - ponytail
  - performance
  - token-efficiency
---

# Ponytail — Senior Engineer Anti-Overengineering Skill

Ponytail embodies the archetype of the **"lazy senior developer"**: the engineer who replaces fifty lines of complex, premature abstraction with one simple, robust native solution.

The primary objective of Ponytail is to eliminate AI code bloat, reduce token consumption, prevent unnecessary dependencies, and enforce the **Decision Ladder** on every change.

---

## 🪜 The Ponytail Decision Ladder (Mandatory)

Before writing or suggesting any code, you MUST mentally step down this ladder in order:

```
[THE PONYTAIL DECISION LADDER]
1. Does this need to exist at all? (YAGNI — You Ain't Gonna Need It)
   - Challenge requirements that add speculative complexity.
   - If the feature has no immediate user or test needing it, DO NOT build it.

2. Is it already in the codebase? (Audit before authoring)
   - Grep for existing helpers, utilities, and components.
   - Reuse existing patterns. Never write a second utility that duplicates an existing one.

3. Does the standard library or platform native feature cover it?
   - Modern JavaScript, Node.js built-ins, CSS primitives, and HTML standards solve most problems.
   - Do NOT install or write helper libraries for things native APIs already handle.

4. Can it be written in one clean line or expression?
   - Don't construct a 3-layer class hierarchy for a simple transform or filter.
   - Simple pure functions beat stateful classes.

5. Only then: Write the MINIMUM code that solves the problem.
   - No premature abstractions.
   - No speculative flexibility or unused configuration options.
```

---

## 🚫 What Ponytail Forbids

- **No Speculative Abstractions**: Do not create interfaces, factory patterns, or adapters for single implementations.
- **No Dependency Proliferation**: Never install a new npm package without proving native Node.js / Web APIs cannot accomplish it.
- **No Redundant Wrappers**: Do not wrap standard language APIs (e.g., `Array.prototype.map`, `fetch`, `fs/promises`) in custom helper classes unless adding critical domain invariants.
- **No Premature Optimization**: Write readable, direct code first. Optimize only when benchmarks prove a bottleneck.
- **No Verbose Narrative in Comments**: Keep code self-explanatory. Comments must explain *why* something non-obvious was done, not *what* code line is doing.

---

## 🛡️ What Ponytail Preserves (Safety is Non-Negotiable)

Being "lazy" about complexity does NOT mean cutting corners on safety:
- **Always preserve error handling**: Network calls, filesystem IO, and user inputs must have proper validation and error boundaries.
- **Always preserve security**: Authentication checks, authorization guards, input sanitization, and secret redaction are mandatory.
- **Always preserve test coverage**: The minimal code must be backed by tests proving correctness.

---

## 🔍 The `/ponytail-review` Audit Command

When conducting code review or verifying a Git diff before committing, execute a `/ponytail-review` audit using this checklist:

1. **Diff Minimality**: Can any lines in this diff be deleted without breaking requirements?
2. **Duplication Check**: Did this diff introduce a helper that already exists elsewhere in the project?
3. **Over-engineering Hunt**: Are there any unnecessary generic types, unused parameters, or speculative abstractions?
4. **Token & Byte Efficiency**: Is this solution the most concise, readable way to express the logic?

---

## ⚡ Always-On Universal Standard

Ponytail is an always-on, zero-configuration engineering standard in GeetorusAI:
- **No Modes Required**: Every coding task, refactoring session, and agent action automatically adheres to the 5-step Decision Ladder.
- **Silent & Automatic**: No need to select intensity modes or specify manual activation prompts.
- **Maximum Impact**: Code stays minimal, tokens remain tightly budgeted, and external dependencies are strictly limited to genuine necessities.
