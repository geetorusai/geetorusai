# 21 — Complete System Diagrams

This document collects verified Mermaid diagrams representing the architecture, execution lifecycles, data flows, and security boundaries across GeetorusAI.

---

## 1. Complete System Architecture

```mermaid
flowchart TB
    subgraph Clients [Interaction Clients]
        WebUI[React 19 Frontend SPA]
        CLI[geetorusai CLI]
        ChatDiscord[Discord Bot]
        ChatSlack[Slack App]
        ChatTeams[MS Teams Bot]
        ChatTG[Telegram Bot]
        ChatGH[GitHub Webhook]
    end

    subgraph ControlPlane [GeetorusAI Control Plane :3100]
        Ingress[Express HTTP / WebSocket Ingress]
        AuthZ[RBAC & Actor Security Guard]
        Heartbeat[Heartbeat Scheduler & Watchdogs]
        ToolGW[Tool Gateway & Redaction Engine]
        Pulse[Pulse Health & Circuit Breakers]
        WS_Hub[Live Events WebSocket Hub]
    end

    subgraph ExecutionPlane [Subprocess & Execution Substrate]
        Runner[Native Runner / Rust runnerd]
        ACPX[ACPX Sidecar Bridges]
        Bwrap[Bubblewrap / Docker Sandboxes]
        MCP_Engine[Geetorus MCP Server]
    end

    subgraph Persistence [Data Tier]
        Drizzle[Drizzle ORM Engine]
        Postgres[(Embedded / External PostgreSQL 18)]
        GitWorktrees[(Git Repositories & Worktrees)]
    end

    Clients <-->|HTTP / WebSockets| Ingress
    Ingress --> AuthZ --> Heartbeat & ToolGW & Pulse
    Heartbeat <--> Drizzle <--> Postgres
    Heartbeat --> Runner --> ACPX --> Bwrap
    Heartbeat <--> GitWorktrees
    ToolGW <--> MCP_Engine
    Heartbeat -.->|Emit Events| WS_Hub -.->|Push Updates| WebUI
```

---

## 2. Inbound Multi-Channel Message Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor ExternalUser as External Chat User
    participant ChatApp as Discord / Slack / Teams / GitHub
    participant Webhook as /api/chat-channels/webhook/:provider
    participant ChatService as chatChannelService
    participant DB as PostgreSQL
    participant HB as Heartbeat Engine
    participant Agent as AI Agent Subprocess

    ExternalUser->>ChatApp: Sends message in connected channel
    ChatApp->>Webhook: Dispatches HTTPS Webhook Payload
    Webhook->>ChatService: ingestInboundEvent(provider, rawBody)
    ChatService->>ChatService: Verify HMAC signature & parse event
    ChatService->>DB: Persist chat_conversations & chat_deliveries
    ChatService->>DB: Create / Update Issue & queue agentWakeupRequest
    Webhook-->>ChatApp: 200 OK (Instant Acknowledgement)

    Note over HB,Agent: Asynchronous Agent Execution
    HB->>DB: Detects wakeup request
    HB->>Agent: Starts task turn in isolated worktree
    Agent-->>HB: Generates response markdown & artifacts
    HB->>ChatService: publishRunResponse(channelId, responseText)
    ChatService->>ChatApp: POST external message API (Discord/Slack/Teams)
    ChatApp-->>ExternalUser: Agent response appears in chat thread
```

---

## 3. Tool Execution & Approval Lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant Agent as Agent Subprocess
    participant ToolGW as Tool Gateway Service
    participant Policy as Tool Policy Evaluator
    participant DB as PostgreSQL
    participant UI as React UI
    actor Human as Human Operator
    participant Target as Target System (Railway / GitHub / MCP)

    Agent->>ToolGW: invokeTool("railway_deploy", { env: "prod" })
    ToolGW->>Policy: evaluateDecision("railway_deploy", args)
    
    alt Policy = 'allow'
        Policy-->>ToolGW: Allowed
        ToolGW->>Target: Execute command
        Target-->>ToolGW: Raw Output
        ToolGW->>ToolGW: Redact Secrets
        ToolGW-->>Agent: Redacted Output JSON
    else Policy = 'require_approval'
        Policy-->>ToolGW: Require Human Approval
        ToolGW->>DB: Insert tool_action_requests (status: 'pending')
        ToolGW-->>Agent: Stop turn (status: 'approval_required')
        ToolGW->>UI: WebSocket push approval card
        
        Human->>UI: Reviews diff & clicks "Approve"
        UI->>ToolGW: POST /api/approvals/:id/decision (approved: true)
        ToolGW->>Target: Execute approved action
        Target-->>ToolGW: Raw Output
        ToolGW->>DB: Log tool_access_audit_events
        ToolGW->>DB: Re-queue agent wake to resume turn
    end
```

---

## 4. Reliability, Error Classification & Circuit Breaker Failover

```mermaid
flowchart TD
    RunStart[Agent Execution Turn] --> CheckCB{Circuit Breaker Open?}
    CheckCB -- Yes --> FallbackModel[Route to Approved Fallback Model]
    CheckCB -- No --> ExecPrimary[Execute Primary Model Provider]
    
    ExecPrimary --> CheckResult{Success or Failure?}
    CheckResult -- Success --> RecordSuccess[Reset Failures & Return Output]
    CheckResult -- Failure --> Classify[Classify Error via ErrorClassifier]
    
    Classify --> Category{Category}
    Category -- Transient Network --> Retry[Exponential Backoff Retry 3x]
    Category -- Rate Limit (429) --> TripCB[Increment Provider Failure Counter]
    Category -- Context Overflow --> Compact[Trigger Context Compaction & Retry]
    Category -- Auth Failure --> Fatal[Halt Execution & Log Incident]
    
    TripCB --> ThresholdCheck{Failures >= 5?}
    ThresholdCheck -- Yes --> OpenCB[Trip Circuit Breaker to OPEN]
    ThresholdCheck -- No --> Retry
    
    OpenCB --> FallbackModel
    FallbackModel --> ReturnFallback[Return Fallback Output & Record Pulse Incident]
```
