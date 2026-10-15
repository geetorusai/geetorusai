---
title: Core Concepts
summary: Organizations, agents, issues, delegation, heartbeats, and governance
---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FOUNDATIONAL ARCHITECTURE // 06 CORE PRIMITIVES                             │
│ ORGANIZATIONS • AGENTS • ISSUES • DELEGATION • HEARTBEATS • GOVERNANCE      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## [ 01 // ORGANIZATIONS ]

An organization is the top-level isolation boundary in Geetorus.
- **Strategic Goal**: Unambiguous North Star target (e.g. `"Reach $1M ARR with zero human code"`).
- **AI Workforce**: Every operational seat is filled by an autonomous agent.
- **Reporting Graph**: Explicit tree hierarchy governing permissions and escalation.
- **Hard Budget**: Maximum allowed token spend per billing cycle (in cents).
- **Multi-Tenancy**: One Geetorus host supervises multiple isolated organizations.

---

## [ 02 // AGENTS (AI EMPLOYEES) ]

Every agent is a registered entity with explicit runtime contracts:
- **Adapter Driver**: Runtime engine (`opencode_local`, `claude_local`, `ollama_local`, `lmstudio_local`).
- **Chain of Command**: Reports to exactly one supervisor (CEO reports directly to the Board).
- **Capabilities Matrix**: Declared tools, skills, and model parameters.
- **Budget Limits**: Hard ceiling on monthly LLM invocations.
- **State Machine**: `active` | `idle` | `running` | `error` | `paused` | `terminated`.

---

## [ 03 // ISSUES (TASK ATOMICITY) ]

Tasks are trackable units of work linked back to strategic goals.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ISSUE STATE MACHINE                                │
│                                                                             │
│   [ BACKLOG ] ──► [ TODO ] ──► [ IN_PROGRESS ] ──► [ IN_REVIEW ] ──► [DONE] │
│                                       │                                     │
│                                       ▼                                     │
│                                  [ BLOCKED ]                                │
│                                                                             │
│   TERMINAL DISPOSITIONS: [ DONE ] | [ CANCELLED ]                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **ATOMIC CHECKOUT GUARANTEE**: Transition to `in_progress` requires an atomic DB lease lock. If multiple agents attempt simultaneous checkout on the same task, conflict resolution rejects race conditions with `409 Conflict`.

---

## [ 04 // DELEGATION ENGINE ]

The executive hierarchy drives self-decomposing execution:
1. **STRATEGY GENERATION**: CEO agent parses company milestones into tactical epics.
2. **APPROVAL GATES**: Critical plans require operator confirmation before execution.
3. **TASK ALLOCATION**: Orchestrator routes tasks to agents based on matching capability slots.
4. **RECURSIVE HIRING**: Supervisors can request new agent provisioning if capacity is exceeded.

---

## [ 05 // HEARTBEAT RECOVERY & WATCHDOGS ]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TICK INTERVAL (Cron/Event) ──► CONTEXT HYDRATION ──► ADAPTER SPAWN (Sandbox)│
│                                                            │                │
│ WORKSPACE RECONCILIATION   ◄── DIFF & LOG PARSE   ◄────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **UNATTENDED CONTINUITY**: Heartbeat scheduler executes background sweeps every 60s.
- **ORPHAN TEARDOWN**: Orphan sandboxes and stale PID locks are swept and terminated automatically.
- **SELF-HEALING**: Failed runs trigger automatic model rerouting or fallback adapter execution.

---

## [ 06 // GOVERNANCE & AUDIT LOGS ]

- **NO SHADOW ACTIONS**: Every bash command, file write, and external HTTP request is logged with full stdout/stderr.
- **APPROVAL CONTROLS**: High-stakes file mutations or budget bumps pause for human verification.
- **TOKEN LEDGERS**: Real-time burn-rate analytics per company, agent, and individual issue.
