# 02 — Repository and Codebase Map

## 1. Monorepo Structural Overview

GeetorusAI is structured as a high-performance **pnpm monorepo** containing the server, frontend application, database package, shared schemas, provider adapters, native runner runtime, MCP servers, plugins, and administration CLI.

```
geetorusai/
├── cli/                         # GeetorusAI command-line interface binary & commands
├── doc/                         # Operational documents, design decisions, and RFCs
├── docs/                        # Project documentation (Mintlify & Markdown)
├── evals/                       # Promptfoo evaluation suites & agent benchmarks
├── packages/                    # Monorepo packages & libraries
│   ├── adapter-utils/           # Git sync, runtime token & target utilities
│   ├── adapters/                # 13 AI model provider adapters
│   ├── db/                      # Drizzle ORM schemas & embedded PostgreSQL supervisor
│   ├── geetorus-eval-kernel/    # Private matrix orchestration & test oracle
│   ├── geetorus-runner/         # Native runnerd, PRP protocol & ACPX sidecars
│   ├── google-sheets-mcp-server/# Google Sheets MCP tool bridge
│   ├── kv-demo-mcp-server/      # Key-value demo MCP server
│   ├── mcp-server/              # Core Geetorus Model Context Protocol server
│   ├── plugins/                 # Plugin SDK, runtime sandboxes & examples
│   ├── shared/                  # Common TypeScript types, constants & Zod schemas
│   ├── skills-catalog/          # Curated reusable agent skills
│   ├── tailscale-https-broker/  # Tailscale HTTPS ingress/egress proxy
│   └── teams-catalog/           # Pre-configured agent team definitions
├── patches/                     # Pinned package patches for embedded PostgreSQL & ACP
├── scripts/                     # Dev runners, build scripts, migration & release tools
├── server/                      # Core Express backend, API routes & services
├── tests/                       # E2E Playwright tests & acceptance suites
├── ui/                          # React 19 + Vite frontend SPA
├── package.json                 # Monorepo root manifest, scripts & dependencies
├── pnpm-lock.yaml               # Pinned pnpm lockfile
└── pnpm-workspace.yaml          # Monorepo workspace configuration
```

---

## 2. Package Boundaries & Responsibilities

### Core Applications

| Path | Package / App Name | Primary Responsibilities | Entry Point |
| :--- | :--- | :--- | :--- |
| `server/` | `@geetorusai/server` | Express API, WebSocket hubs, Heartbeat engine, Tool Gateway, multi-channel chat, RBAC | `server/src/index.ts` |
| `ui/` | `@geetorusai/ui` | React 19 SPA, dashboard, real-time live events, chat, kanban boards, code editor | `ui/src/main.tsx` |
| `cli/` | `@geetorusai/cli` | Terminal commands, onboarding, doctor, updates, database backups, test drive | `cli/src/index.ts` |

### Shared & Foundation Packages

| Path | Package Name | Primary Responsibilities | Key Files |
| :--- | :--- | :--- | :--- |
| `packages/db/` | `@geetorusai/db` | 137 Drizzle ORM entity tables, migration engine, embedded PostgreSQL supervisor | `packages/db/src/schema/index.ts`, `packages/db/src/migration-runtime.ts` |
| `packages/shared/` | `@geetorusai/shared` | Cross-package TypeScript interfaces, Zod validators, token gates, constants | `packages/shared/src/index.ts`, `packages/shared/src/constants.ts` |
| `packages/adapter-utils/` | `@geetorusai/adapter-utils` | Git workspace synchronization, GitHub operation launcher, auth token helpers | `packages/adapter-utils/src/git-workspace-sync.ts` |

### Execution & Protocol Runtimes

| Path | Package Name | Primary Responsibilities | Key Files |
| :--- | :--- | :--- | :--- |
| `packages/geetorus-runner/` | `@geetorusai/geetorus-runner` | Process Runtime Provider (PRP v1), Rust runnerd, ACPX sidecar, durable WS | `packages/geetorus-runner/src/index.ts`, `packages/geetorus-runner/runner/` |
| `packages/mcp-server/` | `@geetorusai/mcp-server` | MCP stdio/HTTP server exposing Geetorus tools to agent runtimes | `packages/mcp-server/src/index.ts`, `packages/mcp-server/src/tools.ts` |
| `packages/plugins/` | `@geetorusai/plugins` | Plugin SDK, lifecycle coordinator, worker isolation, scheduled jobs | `packages/plugins/sdk/src/index.ts` |

---

## 3. Directory Breakdown

### `server/src/` (Backend Control Plane)

- `index.ts`: Application bootstrap, telemetry initialization (OTel, Sentry), database check, WebSocket setup, service startups.
- `app.ts`: Express application instantiation, route registration, middleware chaining, Vite dev server integration.
- `routes/` (81 files):
  - `agents.ts`: Agent CRUD, wakeups, prompt overrides, task session management.
  - `issues.ts`: Issue tracking, state transitions, assignments, task plan decomposition, relations.
  - `tool-gateway.ts` & `tool-access.ts`: MCP Gateway endpoints, token issuance, connection management.
  - `chat-channels.ts`: Discord, Slack, Teams, Telegram, and GitHub webhook ingestion endpoints.
  - `pipelines.ts` & `cases.ts`: Multi-stage pipeline automation, case transitions, and blockers.
  - `routines.ts` & `goals.ts`: Scheduled routines, cron definitions, company objectives.
  - `secrets.ts`: Secret definitions, encrypted storage, versioning, proposal approvals.
  - `decisions.ts` & `decision-queues.ts`: Operator triage queue, decision bundles, and effect execution.
  - `health.ts` & `pulse.ts`: Health probes, system status, circuit breaker states.
  - `openapi.ts`: Auto-generated OpenAPI v3 schema endpoints.
- `services/` (488 files):
  - `heartbeat.ts`: Core 29k-line heartbeat scheduler, issue checkouts, workspace assignment, watchdog supervision.
  - `chat-channels.ts`: 37k-line multi-channel communication engine with rich interaction handling.
  - `tool-gateway.ts`: 10k-line tool routing, MCP stdio/HTTP invocations, Railway and cloud bridge.
  - `authorization.ts`: Granular RBAC, actor resolution, company scope boundary checks.
  - `secrets.ts`: Company and user secret encryption, redaction policies, versioning.
  - `native-runtime/`: Native session execution, ACP process supervision, question bridging.
  - `self-healing/`: Circuit breakers, error classifier, recovery engine, model routing fallbacks.
  - `pulse/`: Live health checks and system incident recording.
  - `execution-workspaces.ts`: Ephemeral Git worktree provisioning, branch lifecycles, and port management.

### `ui/src/` (Frontend Application)

- `main.tsx`: React 19 entry point, CSS imports, i18n initialization, font loading.
- `App.tsx`: Central client-side router, layout wrappers, feature-flag gates, modal providers.
- `index.css`: Complete design system (142 KB) containing design tokens, color ramps, dark mode, glassmorphism, animations.
- `pages/` (143 files):
  - `Dashboard.tsx` & `DashboardLive.tsx`: High-level company status, live agent activity, real-time metrics.
  - `Agents.tsx` & `AgentDetail.tsx`: Agent configuration, live run terminal, prompt engineering, tool assignments.
  - `Issues.tsx` & `IssueDetail.tsx`: Multi-agent issue tracker, threaded chat, question cards, approval links.
  - `Workspaces.tsx` & `ExecutionWorkspaceDetail.tsx`: Git worktree manager, branch explorer, runtime service ports.
  - `Pipelines.tsx` & `Cases.tsx`: Automated multi-step pipelines and case review queues.
  - `Secrets.tsx`: Company secret manager, versioning history, pending secret proposals.
  - `CompanySkills.tsx` & `SkillStudio.tsx`: Agent skill authoring, markdown parsing, tool attachment.
  - `PulseCenter.tsx`: Real-time system health dashboard, circuit breaker toggles, incident logs.
  - `AdapterManager.tsx` & `ModelExplorer.tsx`: Provider configuration, API key setup, model testing.
- `components/`: Reusable UI components (buttons, dialogs, kanban columns, markdown renderers, Monaco/CodeMirror editors, terminal outputs).

### `packages/adapters/` (AI Provider Adapters)

1. `claude-local/`: Anthropic Claude Code (ACP protocol via `@agentclientprotocol/claude-agent-acp` and CLI engine).
2. `codex-local/`: OpenAI Codex (ACP protocol via `@agentclientprotocol/codex-acp`).
3. `gemini-local/`: Google Gemini Local provider integration.
4. `cursor-local/` & `cursor-cloud/`: Cursor agent protocol drivers.
5. `grok-local/`: xAI Grok provider adapter.
6. `hermes/` & `hermes-gateway/`: Hermes agent protocol and gateway broker.
7. `kimi-local/`: Moonshot Kimi adapter.
8. `ollama-local/`: Local model inference via Ollama HTTP API.
9. `openclaw-gateway/`: OpenClaw bidirectional gateway with SSE streams.
10. `opencode-local/`: OpenCode local engine.
11. `pi-local/`: Pi agent adapter.

---

## 4. Key Configuration Files

- `pnpm-workspace.yaml`: Declares workspace members (`server`, `ui`, `cli`, `packages/*`).
- `package.json`: Monorepo scripts, patched dependencies (`embedded-postgres`, `acpx`, `@agentclientprotocol/*`, `@chat-adapter/*`), and overrides.
- `tsconfig.base.json` & `tsconfig.json`: TypeScript compiler options with strict typechecking enabled.
- `vitest.config.ts`: Unit and integration test configuration.
- `tests/e2e/playwright.config.ts`: Playwright browser automation test configuration.
- `Dockerfile`: Multi-stage production container build for server, embedded Postgres, and static UI.
