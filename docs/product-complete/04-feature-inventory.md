# 04 — Feature Inventory

This inventory provides an itemized, source-verified accounting of every major feature discovered across the GeetorusAI codebase.

---

## 1. Feature Status Summary Table

| Category | Feature Name | Primary Source Files | Verification Status |
| :--- | :--- | :--- | :--- |
| **Agent Orchestration** | Heartbeat Engine & Agent Schedulers | `server/src/services/heartbeat.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Agent Execution** | Native Runner & ACPX Sidecars | `packages/geetorus-runner/`, `server/src/services/native-runtime/` | `IMPLEMENTED_AND_VERIFIED` |
| **AI Providers** | Multi-Adapter Provider Subsystem (13 targets) | `packages/adapters/*` | `IMPLEMENTED_AND_VERIFIED` |
| **Tool Execution** | Tool Gateway & MCP Server Bridge | `server/src/services/tool-gateway.ts`, `packages/mcp-server/` | `IMPLEMENTED_AND_VERIFIED` |
| **Chat & Channels** | Discord / Slack / Teams / Telegram / GitHub Sync | `server/src/services/chat-channels.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Workspace Sandbox** | Git Worktrees & Bubblewrap Confinement | `server/src/services/execution-workspaces.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Security & RBAC** | Actor Authorization & Permission Grants | `server/src/services/authorization.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Secrets Management**| Encrypted Secrets & Versioned Proposals | `server/src/services/secrets.ts`, `server/src/routes/secrets.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Self-Healing & Pulse**| Health Monitoring & Circuit Breakers | `server/src/services/self-healing/`, `pulse/` | `IMPLEMENTED_AND_VERIFIED` |
| **Issue Management** | Multi-Agent Issue Tracking & Plans | `server/src/services/issues.ts`, `server/src/routes/issues.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Pipelines & Cases** | Multi-Stage Workflow Automation | `server/src/services/pipelines.ts`, `server/src/routes/pipelines.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Decisions & Triage**| Operator Decision Queues & Effect Exec | `server/src/services/decisions.ts`, `decision-queues.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Plugin Subsystem** | Dynamic Plugin SDK & Worker Sandbox | `packages/plugins/`, `server/src/services/plugin-loader.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Embedded DB** | Embedded PostgreSQL Lifecycle Manager | `packages/db/src/migration-runtime.ts` | `IMPLEMENTED_AND_VERIFIED` |
| **Administration CLI** | `geetorusai` CLI Command Suite | `cli/src/index.ts`, `cli/src/commands/*` | `IMPLEMENTED_AND_VERIFIED` |

---

## 2. Detailed Feature Audits

### Feature: Heartbeat Engine & Task Supervision
- **Purpose**: Autonomous scheduling loop that wakes assigned agents, evaluates checkout locks, handles dependencies, and runs tasks.
- **User-Facing Behavior**: When an issue is created or commented on with an `@agent` mention, the agent automatically wakes up, checks out the issue, executes turns, and posts progress comments.
- **Source Files**: `server/src/services/heartbeat.ts`, `server/src/services/task-watchdogs.ts`.
- **Key Functions/Classes**: `heartbeatService.tick()`, `runAgentTaskSession()`, `reconcileAbandonedExecutionControl()`.
- **API Endpoints**: `POST /api/agents/:id/wake`, `GET /api/heartbeat/status`.
- **Data Persistence**: `heartbeat_runs`, `agent_wakeup_requests`, `agent_runtime_state`.
- **Error Handling**: Watchdogs detect stalled runs (configurable timeout); automatic recovery attempts with exponential backoff.
- **Verification Evidence**: `server/src/services/__tests__/heartbeat.test.ts`, unit & E2E acceptance tests.
- **Status**: `IMPLEMENTED_AND_VERIFIED`

---

### Feature: Multi-Adapter AI Provider Connectivity
- **Purpose**: Connects GeetorusAI to 13 model providers via standardized CLI, ACP, and REST protocols.
- **Supported Adapters**:
  1. `claude_local` (Anthropic Claude Code CLI / ACP)
  2. `codex_local` (OpenAI Codex ACP)
  3. `gemini_local` (Google Gemini)
  4. `cursor_local` & `cursor_cloud` (Cursor IDE agents)
  5. `grok_local` (xAI Grok)
  6. `hermes` & `hermes_gateway` (Hermes Agent / Gateway)
  7. `kimi_local` (Moonshot Kimi)
  8. `ollama_local` (Local Ollama models)
  9. `openclaw_gateway` (OpenClaw SSE Gateway)
  10. `opencode_local` (OpenCode runtime)
  11. `pi_local` (Pi agent runtime)
- **Source Files**: `packages/adapters/*`, `server/src/routes/adapters.ts`.
- **Status**: `IMPLEMENTED_AND_VERIFIED`

---

### Feature: Tool Gateway & MCP Protocol Server
- **Purpose**: Centralized gateway authorizing, dispatching, and auditing tool invocations via Model Context Protocol (MCP) or stdio/HTTP.
- **User-Facing Behavior**: Operators assign tool profiles to agents (e.g. `github_pr_read`, `railway_deploy`). Invocations requiring approval generate human confirmation dialogs in the UI.
- **Source Files**: `server/src/services/tool-gateway.ts`, `server/src/services/tool-access.ts`, `packages/mcp-server/`.
- **Key Functions**: `toolGatewayService.invokeTool()`, `toolAccessService.evaluateDecision()`.
- **API Endpoints**: `POST /api/tool-gateway/invoke`, `POST /api/tool-gateway/mcp`.
- **Data Persistence**: `tool_catalog_entries`, `tool_policies`, `tool_invocations`, `tool_access_audit_events`.
- **Status**: `IMPLEMENTED_AND_VERIFIED`

---

### Feature: Multi-Channel Chat Synchronization
- **Purpose**: Bidirectional messaging and interaction bridge across external chat applications.
- **Supported Channels**: Discord, Slack, Microsoft Teams, Telegram, GitHub Webhooks, Photon (iMessage).
- **User-Facing Behavior**: Users comment on Discord/Slack/Teams threads; agents receive messages, execute tools in background worktrees, and reply with markdown summaries and rich interactive widgets.
- **Source Files**: `server/src/services/chat-channels.ts`, `server/src/routes/chat-channels.ts`.
- **Key Functions**: `chatChannelService.ingestInboundEvent()`, `chatChannelService.publishRunResponse()`.
- **API Endpoints**: `POST /api/chat-channels/webhook/:provider`, `GET /api/chat-channels`.
- **Data Persistence**: `chat_endpoints`, `chat_conversations`, `chat_deliveries`, `chat_publications`.
- **Status**: `IMPLEMENTED_AND_VERIFIED`

---

### Feature: Isolated Execution Workspaces (Git Worktrees)
- **Purpose**: Ensures safe, concurrent code mutations by creating isolated Git worktree checkouts per issue/task.
- **User-Facing Behavior**: Agent edits are committed to a temporary branch (e.g., `geetorus/issue-42-feat`). Developers review the worktree diff in the UI before merging.
- **Source Files**: `server/src/services/execution-workspaces.ts`, `packages/adapter-utils/src/git-workspace-sync.ts`.
- **API Endpoints**: `POST /api/execution-workspaces`, `GET /api/execution-workspaces/:id`.
- **Data Persistence**: `execution_workspaces`, `execution_workspace_runtime_leases`.
- **Status**: `IMPLEMENTED_AND_VERIFIED`

---

### Feature: Pulse Health Monitoring & Circuit Breakers
- **Purpose**: Continuous background health evaluation, automatic error classification, retry backoffs, and circuit breaker protection.
- **User-Facing Behavior**: The PulseCenter dashboard displays live component latencies, open circuit breakers, and active self-healing incidents.
- **Source Files**: `server/src/services/pulse/pulse-service.ts`, `server/src/services/self-healing/*`.
- **Key Functions**: `pulseService.getPulseStatus()`, `recoveryEngine.executeWithRecovery()`.
- **API Endpoints**: `GET /api/pulse`, `POST /api/pulse/circuit-breakers/:id/reset`.
- **Status**: `IMPLEMENTED_AND_VERIFIED`

---

### Feature: Pipelines & Cases Automation
- **Purpose**: Multi-stage stateful workflow engine for complex business processes (e.g. Ingestion -> Triage -> Plan -> Code -> Review -> Deploy).
- **User-Facing Behavior**: Cases progress across kanban stages; automated stage transitions execute agent tasks and evaluate blocking conditions.
- **Source Files**: `server/src/services/pipelines.ts`, `server/src/routes/pipelines.ts`, `server/src/routes/cases.ts`.
- **Data Persistence**: `pipelines`, `pipeline_stages`, `pipeline_cases`, `case_events`.
- **Status**: `IMPLEMENTED_AND_VERIFIED`
