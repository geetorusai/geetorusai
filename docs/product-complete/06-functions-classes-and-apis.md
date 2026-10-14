# 06 — Function, Class, and API Reference

This document provides a comprehensive technical reference for core services, functions, classes, API routes, and interfaces across the GeetorusAI codebase.

---

## 1. Core Services Reference

### `HeartbeatService`
- **File**: `server/src/services/heartbeat.ts`
- **Responsibility**: Central orchestration loop managing agent wakeups, task assignment, execution workspace checkout, watchdog monitoring, and run finalization.
- **Key Methods**:
  - `tick(): Promise<void>`: Scans for unfulfilled wakeups, unassigned issues, and timed-out runs.
  - `runAgentTaskSession(options: AgentTaskSessionOptions): Promise<AgentTaskSessionResult>`: Executes an individual agent turn, mounting the isolated worktree, injecting secrets, and streaming output.
  - `reconcileAbandonedExecutionControl(): Promise<void>`: Detects orphaned runs on server reboot and reconciles their execution states.
- **Side Effects**: Modifies `heartbeat_runs`, `issues`, `agent_runtime_state`, `execution_workspaces`.

---

### `ToolGatewayService`
- **File**: `server/src/services/tool-gateway.ts`
- **Responsibility**: Manages MCP server registrations, tool invocations, stdio command execution, parameter validation, security policy enforcement, and secret redaction.
- **Key Methods**:
  - `invokeTool(input: ToolInvocationInput): Promise<ToolInvocationResult>`: Authorizes and routes a tool call to local stdio, HTTP MCP, or native system handler.
  - `createToolMcpGateway(companyId: string, data: CreateToolMcpGateway): Promise<ToolMcpGateway>`: Provisions a new MCP endpoint with bearer token access.
  - `testToolConnection(connectionId: string): Promise<ToolConnectionTestResult>`: Runs diagnostic ping against external MCP servers or APIs.
- **Exceptions**: `ToolAccessDeniedError`, `ToolExecutionTimeoutError`, `ToolApprovalRequiredError`.

---

### `AuthorizationService`
- **File**: `server/src/services/authorization.ts`
- **Responsibility**: Role-Based Access Control (RBAC) and actor verification across human users, agents, board API keys, and cloud tenants.
- **Key Functions**:
  - `authorizeActor(actor: AuthorizationActor, action: AuthorizationAction, resource?: AuthorizationResource): Promise<AuthorizationDecision>`
  - `assertCompanyScope(actor: AuthorizationActor, companyId: string): void`
  - `grantsForHumanRole(role: string): PermissionKey[]`
- **Supported Roles**: `owner`, `admin`, `member`, `contractor`, `observer`, `system_agent`.

---

### `PulseService` & `RecoveryEngine`
- **Files**: `server/src/services/pulse/pulse-service.ts`, `server/src/services/self-healing/recovery-engine.ts`
- **Responsibility**: System health monitoring, circuit breaker state tracking, classified error recovery, and automated model failovers.
- **Key Methods**:
  - `pulseService.getPulseStatus(db?: Db): Promise<PulseSystemStatus>`: Collects latency and health metrics for API gateway, PostgreSQL, model providers, and runnerd.
  - `recoveryEngine.executeWithRecovery<T>(options: RecoveryExecutionOptions<T>): Promise<T>`: Wraps async operations with retry backoff, circuit breaker evaluation, and fallback model delegation.

---

## 2. API Routes Reference

### Agent Management (`/api/agents`)
- **Route File**: `server/src/routes/agents.ts`
- **Authentication**: Bearer Token (Session or Board API Key)

| Method | Path | Description | Request Body | Response Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/companies/:cid/agents` | List company agents | None | `200 OK` |
| `POST` | `/api/companies/:cid/agents` | Create new agent | `CreateAgentSchema` | `201 Created` |
| `GET` | `/api/agents/:id` | Get agent details | None | `200 OK` |
| `PATCH` | `/api/agents/:id` | Update agent config | `UpdateAgentSchema` | `200 OK` |
| `POST` | `/api/agents/:id/wake` | Trigger immediate agent wake | `{ reason?: string }` | `200 OK` |
| `GET` | `/api/agents/:id/runs` | List agent run history | Query params (page, limit) | `200 OK` |

---

### Issue Tracking & Multi-Agent Collaboration (`/api/issues`)
- **Route File**: `server/src/routes/issues.ts`

| Method | Path | Description | Request Body | Response Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/companies/:cid/issues` | List company issues | Filter params (status, assignee) | `200 OK` |
| `POST` | `/api/companies/:cid/issues` | Create new issue | `CreateIssueSchema` | `201 Created` |
| `GET` | `/api/issues/:id` | Get issue details | None | `200 OK` |
| `PATCH` | `/api/issues/:id` | Update status/assignment | `UpdateIssueSchema` | `200 OK` |
| `POST` | `/api/issues/:id/comments` | Add comment / trigger @mention | `{ content: string }` | `201 Created` |
| `POST` | `/api/issues/:id/checkout` | Agent issue lock checkout | `{ agentId: string }` | `200 OK` |
| `POST` | `/api/issues/:id/release` | Release issue lock | None | `200 OK` |

---

### Tool Gateway & MCP Protocol (`/api/tool-gateway`)
- **Route File**: `server/src/routes/tool-gateway.ts`

| Method | Path | Description | Request Body | Response Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/tool-gateway/invoke` | Invoke a tool by name | `{ tool: string, args: object }` | `200 OK` / `403 Forbidden` |
| `GET` | `/api/tool-gateway/mcp/manifest` | Retrieve MCP manifest | None | `200 OK` |
| `POST` | `/api/tool-gateway/mcp/rpc` | JSON-RPC 2.0 MCP endpoint | Standard MCP RPC payload | `200 OK` |
| `GET` | `/api/tool-gateway/tokens` | List active gateway tokens | None | `200 OK` |

---

### Health & Pulse Diagnostics (`/api/pulse`, `/api/health`)
- **Route Files**: `server/src/routes/pulse.ts`, `server/src/routes/health.ts`

| Method | Path | Description | Request Body | Response Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Basic readiness / liveness check | None | `200 OK` |
| `GET` | `/api/pulse` | Comprehensive system health & metrics | None | `200 OK` |
| `POST` | `/api/pulse/circuit-breakers/:id/reset` | Reset tripped circuit breaker | None | `200 OK` |
| `GET` | `/api/pulse/incidents` | List active & past incidents | None | `200 OK` |
