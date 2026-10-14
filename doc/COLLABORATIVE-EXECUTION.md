# Intelligent Task Distribution and Collaborative Multi-Agent Execution

This document specifies the operational design, database schema, APIs, governance safeguards, and verification procedures for GeetorusAI's collaborative multi-agent execution subsystem.

## 1. Architectural Overview

Instead of delegating all incoming work to a single monolithic agent, GeetorusAI assesses task complexity and decomposes non-trivial work into an orchestrated Directed Acyclic Graph (DAG) of specialized subtasks:

1. **Intelligent Task Analyzer**: Evaluates workload, skills, tools, and complexity. Classifies tasks into `single_agent` (for low complexity) vs `multi_agent_collaborative` (medium/high/critical).
2. **Task Allocator**: Scores agent capabilities, domain affinity, model tier, and load to assign subtasks to the most qualified agents.
3. **Multi-Agent Orchestrator**: Manages execution state, unblocks downstream subtasks as prerequisites complete, enforces concurrency limits, and consolidates final outputs.
4. **Shared Workspace Context**: Enforces pessimistic file locks on target source files to prevent concurrent edits and code collision, maintains shared contract definitions, and generates token-optimized context summaries.
5. **Governance & Budget Guards**: Integrates with Geetorus's budget policies and approval engine to automatically pause execution when budgets are exceeded or manual approval is configured.

## 2. Database Schema & Persistence

Tables are defined in `@geetorusai/db` (`packages/db/src/schema/collaboration.ts`) with migration `0280_collaboration_workflows.sql`:

- `collaboration_workflows`: Tracks execution strategy, status (`analyzing`, `ready`, `in_progress`, `verification`, `completed`, `failed`, `paused`), token budgets, and verification results. Scoped by `company_id` and unique per `(company_id, issue_id)`.
- `collaboration_subtasks`: Individual subtasks with assigned agent IDs, roles (`lead_architect`, `backend_developer`, `frontend_developer`, `tester_qa`, etc.), dependencies array, and token metrics.
- `collaboration_shared_contexts`: Persists active file locks, architectural directives, and shared API schemas.
- `company_collaboration_settings`: Company-level controls for concurrency limits (`default_max_parallel_agents`), cost thresholds, and auto-decomposition toggle.

## 3. REST API & Company Scoping

All endpoints enforce `assertCompanyAccess(req, companyId)` and emit audit entries to `activity_log`:

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/analyze` | Evaluates complexity and returns recommended strategy |
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/plan` | Creates workflow DAG and persists to database |
| `GET` | `/api/companies/:companyId/issues/:id/collaboration` | Returns active workflow, subtasks, locks, and logs |
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/start` | Advances assigned subtasks up to concurrency limits |
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/pause` | Pauses workflow execution |
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/resume` | Resumes paused workflow execution |
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/subtasks/:subtaskId/complete` | Marks subtask complete and resolves blockers |
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/subtasks/:subtaskId/stream-tokens` | Streams incremental token consumption via WebSocket live events |
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/budget-override` | Requests administrative budget override for locked/paused workflows |
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/budget-override/resolve` | Resolves budget override and automatically resumes execution |
| `POST` | `/api/companies/:companyId/issues/:id/collaboration/locks` | Claims a file lock for a subtask |
| `DELETE` | `/api/companies/:companyId/issues/:id/collaboration/locks` | Releases an acquired file lock |
| `GET` | `/api/companies/:companyId/collaboration/settings` | Gets company collaboration settings |
| `PUT` | `/api/companies/:companyId/collaboration/settings` | Updates company collaboration settings |

## 4. Completed Reliability Capabilities

### 1. External Git Branch Isolation
- Dedicated per-subtask Git worktrees and branch slugs (`collab/<issueId>/<subtaskId>`) with associated `execution_workspace_id`.
- Stored directly in `collaboration_subtasks` schema and displayed on the UI dashboard.
- Ensures concurrent agents operate in isolated Git worktrees, preventing commit collisions before final integration and verification.

### 2. WebSocket Real-Time Token Streaming
- Fine-grained token consumption streams via Geetorus's live event emitter with event types `collaboration.token.stream` and `collaboration.workflow.progress`.
- Incremental token updates push directly to subscribed clients and refresh metrics live during task execution without waiting for full subtask completion.

### 3. Agent Pool Availability & Dynamic Specialist Synthesis
- `TaskAllocator.synthesizeSpecialistPool` monitors required roles across planned subtasks.
- If a company agent pool has fewer workers than required roles or lacks specialized role coverage (e.g. planner, researcher, implementer, tester, reviewer, documenter), the system synthesizes virtual specialist agents with role-tailored system instructions and model tiers.
- Prevents degradation to monolithic single-agent execution even when a company has only 1 active agent or an empty pool.

### 4. Resilient Budget Locking & Cost Throttling
- When approaching budget thresholds or when an active `budget_incident` is detected, workflows downshift model tiers to economical lightweight models (`gemini-2.0-flash`) instead of abruptly terminating.
- Automatically generates approval escalations with dedicated endpoints (`POST .../budget-override` and `POST .../budget-override/resolve`).
- Workflows seamlessly resume execution once the administrator approves the override.

## 5. Governance & Safety Invariants

1. **Company Scoping**: Every workflow and subtask is strictly constrained to `company_id`.
2. **Resilient Budget Throttling**: Auto-downshifts models and gates with administrative approvals.
3. **Collision Prevention**: Pessimistic file locks and per-subtask git branch isolation prevent race conditions.
4. **Audit Trail**: Every workflow creation, phase transition, lock acquisition, token stream, budget override, and setting modification logs an entry to Geetorus's central `activity_log`.

## 6. Manual Verification Steps

1. Start dev server: `pnpm dev`
2. Open issue details page: `http://localhost:3100/issues/<issue-id>`
3. Check the **Collaborative Multi-Agent Execution** panel in the issue sidebar/main view.
4. Click **Start Execution**: observe parallel subtasks transitioning to `in_progress` with dedicated Git branches.
5. In agent scarcity scenarios, observe synthesized specialist worker badges.
6. Verify token stream events updating live metrics.
7. Test budget override escalation: simulate budget incident and approve override to verify auto-resume.
