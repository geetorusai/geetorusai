<div align="center">

```
 ██████╗ ███████╗███████╗████████╗ ██████╗ ██████╗ ██╗   ██╗███████╗
██╔════╝ ██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██║   ██║██╔════╝
██║  ███╗█████╗  █████╗     ██║   ██║   ██║██████╔╝██║   ██║███████╗
██║   ██║██╔══╝  ██╔══╝     ██║   ██║   ██║██╔══██╗██║   ██║╚════██║
╚██████╔╝███████╗███████╗   ██║   ╚██████╔╝██║  ██║╚██████╔╝███████║
 ╚═════╝ ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
```

### **AUTONOMOUS AGENT ORCHESTRATION KERNEL**
**IF AN AI AGENT IS AN EMPLOYEE, GEETORUS IS THE COMPANY ENGINE.**

[![VERSION](https://img.shields.io/badge/RELEASE-v0.3.1--STABLE-black?style=for-the-badge&logo=github&labelColor=white)](https://github.com/geetorusai/geetorus)
[![RUNTIME](https://img.shields.io/badge/RUNTIME-NODE_24+-black?style=for-the-badge&logo=node.js&labelColor=white)](https://nodejs.org)
[![DATABASE](https://img.shields.io/badge/STORAGE-POSTGRES%20+%20DRIZZLE-black?style=for-the-badge&logo=postgresql&labelColor=white)](https://orm.drizzle.team)
[![LICENSE](https://img.shields.io/badge/LICENSE-MIT-black?style=for-the-badge&logo=opensourceinitiative&labelColor=white)](LICENSE)
[![DISCORD](https://img.shields.io/badge/COMMUNITY-DISCORD-black?style=for-the-badge&logo=discord&labelColor=white)](https://discord.gg/m4HZY7xNG3)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  [!] NO FLUFF. NO PROMPT CHAINS. JUST RAW, RELENTLESS AGENT GOVERNANCE.    │
│  Orchestrate autonomous agent fleets across multiple machines, sandboxes,   │
│  and providers with org charts, hard budget limits, and proactive heartbeats.│
└──────────────────────────────────────────────────────────────────────────────┘
```

[ **[GET STARTED](#-quickstart)** ] • [ **[ADAPTER MATRIX](#-adapter-matrix)** ] • [ **[ARCHITECTURE](#-system-topology)** ] • [ **[DOCS](https://docs.geetorus.ing)** ]

</div>

---

## ⚡ [01 // THE MANIFESTO]

Most agent tooling is toys: single prompts in loop, fragile memory, zero guardrails, runaway API bills, and orphan processes crashing terminal sessions.

**Geetorus** is the industrial-strength control plane:
- **MANAGE GOALS, NOT PULL REQUESTS**: Define strategic milestones. Agents decompose tasks, delegate subtasks, and execute.
- **ZERO ORPHAN PROCESSES**: Hard process supervisors, PID tracking, and teardown sweeps.
- **DETERMINISTIC GOVERNANCE**: Human-in-the-loop approvals, budget hard-caps, and token-burn audits.
- **UNIVERSAL ADAPTER FABRIC**: Plug in OpenCode, Ollama, LM Studio, Claude Code, Cursor, Codex, or raw shell scripts under one unified org chart.

```
                      ┌────────────────────────────┐
                      │    HUMAN EXECUTIVE / CEO   │
                      └─────────────┬──────────────┘
                                    │ (Strategic Milestones & Budgets)
                                    ▼
                      ┌────────────────────────────┐
                      │  GEETORUS ORCHESTRATOR     │
                      │  [Express Daemon + React]  │
                      └─────────────┬──────────────┘
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  AGENT: FRONTEND │       │  AGENT: BACKEND  │       │  AGENT: QA/AUDIT │
│  Runtime: Claude │       │  Runtime: OpenCode│       │  Runtime: Ollama │
│  Sandbox: SSH/VM │       │  Sandbox: Docker │       │  Sandbox: Local  │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

---

## 🔌 [02 // ADAPTER MATRIX]

Geetorus communicates with agents over a standard, verifiable heartbeat protocol. **If it can receive an execution frame, it is hired.**

| RUNTIME KEY | ADAPTER ENGINE | MODES | PERSISTENCE | TARGET ENVIRONMENTS |
| :--- | :--- | :--- | :--- | :--- |
| `opencode_local` | **OpenCode CLI** | Headless / JSONL | `--session` Resume | Local Shell, Remote SSH, Sandboxes |
| `ollama_local` | **Ollama** | Local LLM / REST | Native Context | Local Host (No cloud dependencies) |
| `lmstudio_local` | **LM Studio** | Local OpenAI-Compat | State Cache | Local Workstation, GPU Clusters |
| `claude_local` | **Claude Code** | CLI Pipe | Session JSON | Local Developer Environment |
| `cursor_local` | **Cursor CLI** | Agentic IDE | Workspace State | Local Project Trees |
| `codex_local` | **Codex Exec** | Exec Loop | Rollout Ledger | Unattended Background Daemons |
| `process` | **POSIX / Shell** | Bash, Zsh, CMD, PS | Exit Status | Bare-Metal, CI/CD Pipelines |
| `http` | **HTTP Webhook** | JSON Post / Callback | Client-Side | Cloud Functions, OpenClaw Gateway |

---

## 🚀 [03 // QUICKSTART]

### SYSTEM REQUIREMENTS
- **Node.js**: `v24.11.0` or higher
- **Package Manager**: `pnpm` (v9+)
- **OS**: Linux, macOS, or Windows 10/11 (PowerShell & WSL supported)

### 1. CLONE & INSTALL
```bash
git clone https://github.com/geetorusai/geetorus.git
cd geetorus
pnpm install
```

### 2. START THE ENGINE (AUTO-BOOTSTRAP)
Geetorus ships with an **embedded PostgreSQL cluster** that initializes and migrates automatically on first boot. Zero external database setup required.

```bash
pnpm dev
```

*Server boots on `http://localhost:3100` with the Vite UI mounted simultaneously.*

### 3. VERIFY HEALTH
```bash
curl http://localhost:3100/api/health
# {"status":"ok","version":"0.3.1","uptime":12.4}
```

---

## 🏛️ [04 // THE FOUR PILLARS]

```
┌───────────────────────────────────────┬───────────────────────────────────────┐
│ [01] AGENTIC TASK MANAGER             │ [02] MULTI-AGENT ORG CHART            │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ • Strict task state machine           │ • Mixed human + agent reporting lines │
│ • Review gates & approval policies    │ • Delegation & cross-agent messaging  │
│ • Deterministic execution runs        │ • Scoped permission boundaries        │
│ • Full diff, screenshot & test audit  │ • Dedicated per-agent working dirs    │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ [03] AGENT TRAINING & EVALUATION      │ [04] AGENTIC OPERATING SYSTEM         │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ • Skill Studio & shared org skills    │ • Cross-provider model discovery      │
│ • Regression evals & saved test cases │ • Hard token burn rate monitors       │
│ • Self-healing error classifiers      │ • Ephemeral environment sandbox leases│
│ • Automated performance dispositions  │ • Embedded transactional storage      │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 🧱 [05 // SYSTEM TOPOLOGY]

```
geetorus/
├── server/                     # Core Orchestration Daemon
│   ├── src/index.ts            # Route handlers, middleware & WebSocket server
│   ├── src/services/heartbeat  # Autonomous run loop, recovery & wake engine
│   ├── src/services/memory     # Hybrid vector + keyword context retriever
│   └── src/services/healing    # Circuit breaker & adapter self-recovery
├── ui/                         # React 19 + Vite 8 Operations Dashboard
│   ├── src/pages/              # Control Room, Org Chart, Issues, Terminal
│   ├── src/components/         # Onboarding Wizard, Live Runs, Cost Counters
│   └── src/index.css           # Brutalist Design System Tokens (Zero Hex Leaks)
├── packages/
│   ├── db/                     # Drizzle Schema + Embedded Postgres Engine
│   ├── shared/                 # Universal TypeScript Contracts & Validators
│   ├── adapter-utils/          # Process Spawners, Stdio Parsers & Sandboxes
│   └── adapters/               # Pluggable Agent Drivers
│       ├── opencode-local/     # Local/Remote OpenCode execution engine
│       ├── ollama-local/       # Offline zero-cloud local LLM bridge
│       ├── lmstudio-local/     # LM Studio workstation integration
│       └── cursor-local/       # Cursor IDE agent pipe
└── doc/                        # Operational Specifications & Architecture Maps
```

---

## ⚙️ [06 // CONFIGURATION]

Create a `.env` in the project root to override operational defaults:

```ini
# CORE BINDINGS
PORT=3100
HOST=0.0.0.0
NODE_ENV=development

# DATABASE (Leave blank to use automatic embedded Postgres)
DATABASE_URL=

# AUTHENTICATION & ENCRYPTION
BETTER_AUTH_SECRET=super-secret-random-32-character-key
BETTER_AUTH_URL=http://localhost:3100

# RUNTIME ENFORCEMENT
OPENCODE_ALLOW_ALL_MODELS=false
GEETORUS_OPENCODE_PRINT_LOGS=false
DEFAULT_RUN_TIMEOUT_SEC=1800
```

---

## 🛠️ [07 // OPERATOR CHEATSHEET]

```bash
# --- DEVELOPMENT ---
pnpm dev                       # Start server + UI (Port 3100)
pnpm build                     # Production compile full monorepo
pnpm clean                     # Wipe all dist folders & build caches

# --- TESTING & AUDIT ---
pnpm test                      # Run lightning-fast unit tests (Vitest)
pnpm check:token-gates         # Enforce design system token compliance
pnpm --filter @geetorusai/ui exec tsc --noEmit # UI TypeScript verification

# --- DATABASE WORKFLOW ---
pnpm db:generate               # Generate migration SQL from schema changes
pnpm db:migrate                # Apply pending migrations to database
```

> **WINDOWS OPERATOR NOTE**: If Postgres reports `shared memory block locked` after an abnormal process kill:
> ```powershell
> Stop-Process -Name postgres -Force -ErrorAction SilentlyContinue
> ```

---

## 🛡️ [08 // SECURITY & GOVERNANCE]

- **NO SILENT CALLS**: Every outbound LLM tool call, file modification, and shell execution is recorded as an immutable run event.
- **SANDBOX ISOLATION**: Remote agent runs execute within dedicated, ephemeral workspaces with automated lease reclamation.
- **SECRET ISOLATION**: Keys are securely scoped per-company and per-agent. Child agent processes never inherit host root secrets.

---

## 📜 [09 // LICENSE]

Distributed under the **MIT License**. Build businesses. Ship agents. Break bottlenecks.

```
Copyright (c) 2026 Geetorus AI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

<div align="center">
<strong>GEETORUS // UNCOMPROMISING AI AGENT INFRASTRUCTURE</strong>
</div>
