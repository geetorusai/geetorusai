---
title: Architecture
summary: Stack overview, request flow, and adapter execution model
---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TECHNICAL SPECIFICATION // TOPOLOGY & REQUEST INGESTION                    │
│ MONOREPO • DRIZZLE ORM • EXPRESS 5 • REACT 19 • PROCESS ISOLATION           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## [ 01 // STACK SCHEMATIC ]

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LAYER 1 // CLIENT INTERFACE (REACT 19 + VITE 8)                             │
│ Real-time Dashboard, Org Topology, Issue Board, Live Terminal Event Streams │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2 // ORCHESTRATION DAEMON (NODE 24 + EXPRESS 5)                       │
│ REST API, Heartbeat Scheduler, Context Hydration, Self-Healing Watchdogs    │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3 // STORAGE FABRIC (POSTGRESQL 17 + DRIZZLE ORM)                     │
│ 137 Tabular Schemas, Transactional Lease Locks, Vector Embeddings           │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 4 // ADAPTER EXECUTION RUNTIME (SUBPROCESS / DOCKER / SSH)            │
│ OpenCode CLI, Ollama Local, LM Studio, Claude Code, Cursor, POSIX Shell     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## [ 02 // MONOREPO STRUCTURE ]

```
geetorus/
├── server/                     # Express.js REST Core & Event Dispatcher
│   ├── src/routes/             # Fast API Endpoints (Heartbeats, Issues, Agents)
│   ├── src/services/           # Core Orchestrator, Memory, Healing, Pulse
│   └── src/middleware/         # Actor Auth, RBAC, Request Rate-Limiting
│
├── ui/                         # React 19 Frontend Operations Dashboard
│   ├── src/pages/              # Control Room, Org Structure, Terminal, Issues
│   ├── src/components/         # Onboarding Wizard, Live Runs, Cost Counters
│   └── src/index.css           # Brutalist Design System Tokens
│
├── packages/
│   ├── db/                     # Drizzle Schema, Migrations & Embedded PG
│   ├── shared/                 # Universal TypeScript Contracts & Validators
│   ├── adapter-utils/          # Subprocess Spawners, Stdio Parsers & Bridge
│   └── adapters/               # Pluggable Agent Drivers
│       ├── opencode-local/     # OpenCode CLI runner with session resume
│       ├── ollama-local/       # Offline zero-cloud LLM connection
│       ├── lmstudio-local/     # Local workstation model bridge
│       └── cursor-local/       # Cursor agent pipe
│
└── doc/ & docs/                # Architecture Maps, Specs, and Audits
```

---

## [ 03 // REQUEST & HEARTBEAT LIFECYCLE ]

```
[1. TICK INGESTION]
  │
  ├─► Heartbeat Cron / Wake Event fires for Agent
  │
[2. CONTEXT HYDRATION]
  │
  ├─► Query DB for Assigned Issue, Parent Milestones & Relevant Memory
  ├─► Assemble Prompt Frame (Instructions + Wake Directive + Issue Markdown)
  │
[3. PROCESS SPAWN & SANDBOX]
  │
  ├─► Check adapter availability & resolve model aliases
  ├─► Spawn Child Process (isolated cwd, sanitized env, timeout guards)
  │
[4. STREAM CAPTURE & TEARDOWN]
  │
  ├─► Parse JSONL / Stdio stream in real time; push events to WebSockets
  ├─► Atomic state commit: Update issue status, record token spend, log diff
  └─► Reclaim sandbox leases and prune stale PID locks
```
