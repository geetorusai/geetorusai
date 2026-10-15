---
title: What is Geetorus?
summary: The brutalist control plane for autonomous AI workforces
---

```
 ██████╗ ███████╗███████╗████████╗ ██████╗ ██████╗ ██╗   ██╗███████╗
██╔════╝ ██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██║   ██║██╔════╝
██║  ███╗█████╗  █████╗     ██║   ██║   ██║██████╔╝██║   ██║███████╗
██║   ██║██╔══╝  ██╔══╝     ██║   ██║   ██║██╔══██╗██║   ██║╚════██║
╚██████╔╝███████╗███████╗   ██║   ╚██████╔╝██║  ██║╚██████╔╝███████║
 ╚═════╝ ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CORE SPECIFICATION // 01: IDENTITY                                         │
│ GEETORUS IS THE CONTROL PLANE FOR AUTONOMOUS AI COMPANIES.                 │
│ INFRASTRUCTURE BACKBONE FOR SCALED, GOVERNED, AND AUDITED AI WORKFORCES.    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## [ 01 // SYSTEM DEFINITION ]

One instance of **Geetorus** operates multi-tenant organizations simultaneously. Each company maintains its own agents (employees), org charts, milestones, budget guardrails, and task routing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  THE CORE PRINCIPLE:                                                        │
│  "IF AN AI AGENT IS AN EMPLOYEE, GEETORUS IS THE COMPANY ENGINE."           │
│  Manage business targets and strategic milestones, not loose pull requests. │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## [ 02 // THE PROBLEM WITH CONVENTIONAL AGENT TOOLING ]

Most agent frameworks are fragile loops:
- Runaway token burn with no hard caps
- Orphan terminal processes crashing host memory
- Lack of role-based authorization and secret boundaries
- Zero hierarchy: every agent is a lone wolf with no reporting structure

---

## [ 03 // THE GEETORUS OPERATING ENGINE ]

```
                               ┌───────────────────┐
                               │  BOARD / HUMAN    │
                               └─────────┬─────────┘
                                         │ (Goals, Approvals, Budget Caps)
                                         ▼
                               ┌───────────────────┐
                               │  GEETORUS KERNEL  │
                               └─────────┬─────────┘
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
           ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
           │   CEO AGENT     │  │   CTO AGENT     │  │   CMO AGENT     │
           │  [OpenCode/GPT] │  │  [Claude Code]  │  │ [Ollama/Local]  │
           └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
                    ▼                    ▼                    ▼
           ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
           │ SQUAD EXECUTORS │  │ DEV SANDBOXES   │  │ CAMPAIGN BOTS   │
           └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### OPERATIONAL CAPABILITIES:
1. **AGENT REGISTRY AS EMPLOYEES**: Define skills, reporting lines, titles, and budget quotas.
2. **STRICT ORG CHARTS**: Enforced delegation hierarchies for task assignment and escalation.
3. **REAL-TIME WORK MONITORING**: Real-time event streams capturing stdout, tool calls, and workspace diffs.
4. **COST & TOKEN GOVERNANCE**: Hard stop execution when monthly cent/token budgets are breached.
5. **HUMAN-IN-THE-LOOP GATES**: High-risk operations require explicit board approvals.

---

## [ 04 // TWO-LAYER ARCHITECTURE ]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 // THE CONTROL PLANE (GEETORUS CORE)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ • Agent Registry & Hierarchy Management                                      │
│ • Task State Machine & Atomic Checkout Locks                                │
│ • Budget & Token Burn Tracking                                              │
│ • Heartbeat Supervision & Process Watchdogs                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ (Heartbeat Frames & Stdio Protocol)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 2 // EXECUTION SERVICES (ADAPTER ENGINES)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ • OpenCode CLI (Local & Remote SSH)                                         │
│ • Ollama / LM Studio (Offline Zero-Cloud LLMs)                              │
│ • Anthropic Claude Code / Cursor / Codex                                    │
│ • Bare POSIX Shells & HTTP Webhook Endpoints                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

> **EXECUTION TENET**: The control plane does not block on agents. It orchestrates them. Agents run in isolated sandboxes and phone home.
