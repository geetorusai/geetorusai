# 05 — Complete Functional Flows

This document details the actual execution sequences for primary user journeys and system operations in GeetorusAI, complete with Mermaid sequence diagrams, function call chains, and failure recovery paths.

---

## 1. Application Startup & Crash Recovery Flow

```mermaid
sequenceDiagram
    autonumber
    participant CLI as CLI / dev-runner.ts
    participant Index as server/src/index.ts
    participant DB_Sup as Embedded Postgres Supervisor
    participant DB as PostgreSQL (Drizzle)
    participant Recov as Recovery Resolution Service
    participant App as Express App (app.ts)
    participant WS as WebSocket Hubs

    CLI->>Index: Node.js startup (startServer)
    Index->>Index: Initialize OTel & Sentry Instrumentation
    Index->>DB_Sup: prepareEmbeddedPostgresNativeRuntime()
    DB_Sup->>DB_Sup: Check for stale PID / shared memory lock
    DB_Sup->>DB: Start / Connect to PostgreSQL (:5432 or dynamic)
    Index->>DB: applyPendingMigrations() & inspectMigrations()
    
    Note over Index,Recov: Startup Recovery Phase
    Index->>Recov: reconcileAbandonedExecutionControl()
    Index->>Recov: reconcileSafeNativeReplacements()
    Index->>Recov: deliverReconciledExecutions()
    Recov->>DB: Mark orphaned runs as FAILED or RECOVERING
    
    Index->>App: createApp({ db, storageService, ... })
    App->>App: Register 80+ route modules & middleware
    Index->>WS: setupLiveEventsWebSocketServer()
    Index->>WS: setupRunnerPrpWebSocketServer()
    Index->>Index: Start Heartbeat & Watchdog timers
    Index-->>CLI: Server listening on http://localhost:3100
```

### Step-by-Step Breakdown:
1. **Trigger**: Developer runs `pnpm dev` or Docker container boots.
2. **Instrumentation**: `instrumentationReady` and `sentryReady` bootstrap OpenTelemetry and Sentry before opening database connections.
3. **Database Supervisor**: `prepareEmbeddedPostgresNativeRuntime()` ensures PostgreSQL is alive. On Windows, it cleans orphaned PID locks to prevent shared memory block crashes.
4. **Migration Engine**: Drizzle schema migrations are inspected and applied sequentially.
5. **Crash Reconciliation**:
   - `reconcileAbandonedExecutionControl()` finds active task sessions that were interrupted by an ungraceful server shutdown.
   - Settles unrecoverable executions and logs recovery events.
6. **HTTP & WebSocket Ingress**: Express router mounts routes and starts listening on port 3100. Real-time WebSocket hubs open for live UI event streaming.

---

## 2. User Chat & Multi-Agent Issue Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Developer / Operator
    participant UI as React 19 Frontend
    participant API as Issues API (routes/issues.ts)
    participant Auth as Authorization Service
    participant DB as PostgreSQL
    participant HB as Heartbeat Engine (heartbeat.ts)
    participant WS_Sync as Workspace Sync
    participant Runner as Native Runner / ACPX
    participant LLM as AI Model Provider (Claude/Codex/Gemini)

    User->>UI: Types issue comment: "@coder-agent fix auth token bug"
    UI->>API: POST /api/issues/:id/comments
    API->>Auth: authorizeActor(actor, "issue:comment")
    Auth-->>API: Authorized
    API->>DB: Insert issueComment & create agentWakeupRequest
    API->>UI: 201 Created (Instant UI update)

    Note over HB,Runner: Heartbeat Tick (Async Execution)
    HB->>DB: Poll agent_wakeup_requests
    DB-->>HB: Wakeup found for agent 'coder-agent'
    HB->>DB: Check agent lock & acquire issue checkout
    HB->>WS_Sync: createExecutionWorkspace(issueId, baseBranch)
    WS_Sync-->>HB: Ephemeral Worktree Created (/path/to/worktree)
    
    HB->>Runner: Start Agent Session (worktreeCwd, instructions, context)
    Runner->>LLM: Send Structured ACP / stdio Prompt
    LLM-->>Runner: Reasoning Stream & Tool Call Request
    Runner-->>HB: Stream Progress Chunks
    HB->>DB: Persist Run Events & Broadcast Live Event
    DB-->>UI: WebSocket Live Stream Update
```

---

## 3. Tool Invocation & Human Approval Gate Flow

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent Subprocess
    participant GW as Tool Gateway Service
    participant Access as Tool Access Policy Service
    participant DB as PostgreSQL
    participant UI as React UI (Approval Card)
    actor Operator as Human Operator
    participant Tool as Target System (Railway / GitHub / MCP)

    Agent->>GW: invokeTool("railway_deploy_service", { serviceId: "srv-1" })
    GW->>Access: evaluateDecision(agentId, toolName, args)
    Access->>DB: Check tool_policies & connection_grants
    
    alt Policy = 'allow'
        Access-->>GW: Decision: ALLOW
        GW->>Tool: Execute action directly
        Tool-->>GW: Result payload
        GW-->>Agent: Redacted JSON output
    else Policy = 'require_approval'
        Access-->>GW: Decision: REQUIRE_APPROVAL
        GW->>DB: Insert tool_action_requests (status: 'pending')
        GW-->>Agent: Yield turn with status 'approval_required'
        GW->>UI: WebSocket push approval notification
        
        Operator->>UI: Reviews parameters & clicks "Approve"
        UI->>GW: POST /api/approvals/:id/decision (approved: true)
        GW->>DB: Update tool_action_requests (status: 'approved')
        GW->>Tool: Execute approved tool action
        Tool-->>GW: Result payload
        GW->>DB: Log tool_access_audit_events
        GW->>DB: Queue agent wake to resume task
    end
```

---

## 4. Self-Healing, Circuit Breakers & Failover Flow

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent Task Execution
    participant Recov as Recovery Engine
    participant CB as Circuit Breaker Registry
    participant Classify as Error Classifier
    participant Primary as Primary LLM (e.g. Claude Opus)
    participant Fallback as Fallback LLM (e.g. Claude Sonnet)
    participant Pulse as Pulse Health Service

    Agent->>Recov: executeWithRecovery(primaryModel, fallbackModel)
    Recov->>CB: canExecute("anthropic")
    CB-->>Recov: Allowed (Circuit Closed)
    
    Recov->>Primary: Execute inference request
    Primary-->>Recov: Error: 429 Rate Limit / 503 Overloaded
    
    Recov->>Classify: classifyError(err)
    Classify-->>Recov: { category: "rate_limit", isTransient: true, suggestedAction: "fallback" }
    Recov->>CB: recordFailure("anthropic")
    
    Note over Recov,Fallback: Automated Failover Sequence
    Recov->>Fallback: Execute inference on fallback model
    Fallback-->>Recov: Successful response payload
    Recov->>CB: recordSuccess("anthropic")
    Recov->>Pulse: Record recovery incident log
    Recov-->>Agent: Return valid result seamlessly
```
