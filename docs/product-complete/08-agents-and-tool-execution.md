# 08 — Agent System and Tool Execution

GeetorusAI treats AI agents as first-class operational entities with defined lifecycles, permissions, tool boundaries, working memory, and execution worktrees.

---

## 1. Agent Architecture & Lifecycle

```mermaid
stateDiagram-v2
    [*] --> CREATED: Created via UI / API / CLI
    CREATED --> IDLE: Configured & Tools Assigned
    
    IDLE --> WAKING: Wakeup Event (@mention, Routine, API)
    WAKING --> ACQUIRING_LOCK: Check Agent & Issue Concurrency
    ACQUIRING_LOCK --> PROVISIONING_WS: Checkout Git Worktree
    PROVISIONING_WS --> RUNNING: Spawn Runner Process (ACPX / CLI)
    
    RUNNING --> WAITING_TOOL: Tool Invoked
    WAITING_TOOL --> WAITING_APPROVAL: Tool Requires Human Approval
    WAITING_APPROVAL --> WAITING_TOOL: Operator Approves
    WAITING_TOOL --> RUNNING: Tool Result Injected
    
    RUNNING --> FINALIZING: Goal Reached / Max Turns
    FINALIZING --> SETTLED: Work Product Saved & Worktree Cleaned
    SETTLED --> IDLE: Ready for next task
    
    RUNNING --> BLOCKED: Watchdog Timeout / Unrecoverable Error
    BLOCKED --> IDLE: Operator Triage & Reset
```

---

## 2. Planning & Task Decomposition

When agents receive large or ambiguous issues, GeetorusAI triggers structured task plan decomposition:
- **`issue_plan_decompositions` Schema**: Stores sub-tasks, dependencies, completion criteria, and order of operations.
- **Hierarchical Issues**: Agents can spawn sub-issues, assign child tasks to specialized peer agents (e.g. `@tester-agent`, `@docs-agent`), and wait for completion signals.
- **Completion Contracts**: The `completion_contracts` table enforces verifiable exit criteria before an agent can transition an issue to `COMPLETED`.

---

## 3. Tool Gateway & Execution Pipeline

```mermaid
flowchart TD
    Agent[Agent Reasoner] -->|JSON-RPC Tool Call| Gateway[Tool Gateway Service]
    Gateway --> Policy[Tool Access Policy Evaluator]
    
    Policy -->|Check RBAC & Connection Grants| Decision{Decision Mode}
    Decision -- Deny --> DenyErr[Return 403 Forbidden Error]
    Decision -- Require Approval --> Block[Generate Approval Request & Pause Turn]
    Decision -- Allow --> Executor[Tool Execution Subsystem]
    
    Executor --> Target{Tool Type}
    Target -- Local Stdio --> Process[Spawn Local CLI / Script]
    Target -- Remote MCP --> HTTP_MCP[Dispatch to External MCP Server]
    Target -- Railway Integration --> Railway[Execute Railway API / SSH]
    Target -- GitHub API --> GH[Execute GitHub PR / Issue Action]
    
    Process --> Redact[Redaction Engine: Scrub Secrets & Keys]
    HTTP_MCP --> Redact
    Railway --> Redact
    GH --> Redact
    
    Redact --> Output[Inject Clean Tool Response to Agent Context]
```

### Supported Core Tool Categories:
1. **File & Workspace Tools**: `read_file`, `write_file`, `list_dir`, `grep_search`, `git_commit`, `git_diff`.
2. **Issue & Communication Tools**: `geetorusAddComment`, `geetorusCreateIssue`, `geetorusAskUserQuestions`, `geetorusRequestConfirmation`.
3. **Infrastructure & Deployment Tools**: `railway_deploy_service`, `railway_ssh_exec`, `docker_container_run`.
4. **Integration Tools**: Google Sheets MCP, Google Workspace, GitHub PR review, Notion, PostHog.

---

## 4. Confinement, Sandboxing & Resource Management

| Isolation Mechanism | Supported OS | Implementation Details |
| :--- | :--- | :--- |
| **Git Worktree Isolation** | All Platforms | Every task operates in a unique worktree path (`.geetorus/worktrees/issue-XYZ`). Never mutates the active branch directly. |
| **Bubblewrap Confinement** | Linux | Unprivileged namespace sandbox restricting filesystem access to `rw` inside worktree and blocking raw network sockets. |
| **Docker / Daytona Sandbox** | Linux / macOS / Windows | Spins up ephemeral containers with custom image templates (`environment_custom_image_templates`). |
| **Process Watchdogs** | All Platforms | `TaskWatchdogService` kills hung processes after configurable `timeoutSec` (default 600s) and records stack traces. |
| **Loop Prevention** | All Platforms | Maximum turns per session (`maxTurnsPerRun`, default 25) prevents runaway agent execution loops. |
