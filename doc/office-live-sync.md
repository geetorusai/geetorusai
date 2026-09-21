# Office Live Sync Design Document

**Document:** `doc/office-live-sync.md`  
**Status:** Proposed (Awaiting Approval)  
**Author:** Senior Full-Stack Engineer  
**Target:** Geetorus 2D Virtual Office (`ui/src/components/office/`)

---

## Executive Summary

The Geetorus 2D Virtual Office is currently an isolated procedural simulation representing the Geetorus 2D branch with interactive characters, random errand routines, and synthetic incidents. This design document specifies the architecture, data mapping, synchronization lifecycle, performance boundaries, and user experience to connect the 2D office to real-time Geetorus control-plane data (agents, heartbeat runs, issues/tasks, approvals, budgets, routines, goals).

When real server data is present, the office reflects real agent actions, presence, and company events. When live data is absent, empty, or toggled off by the user, the office runs in an explicitly labelled, non-destructive **DEMO** mode.

---

## 1. Architecture

The integration cleanly separates three layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│ UI Layer (React Components)                                           │
│  - Geetorus2DOfficePage.tsx (Page host, controls, layout)              │
│  - OfficeView.tsx (Canvas container, HUD, inspector drawer)           │
│  - OfficeModeBadge (LIVE / DEMO / DISCONNECTED indicator)              │
│  - OfficeLegend (Interactive status mapping guide)                    │
│  - OfficeAriaStatusList (Screen-reader accessible live region)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ State & Sync Hook (`useOfficeLiveSync`)                                │
│  - Subscribes to existing WebSocket via `useCompanyLiveEvent`          │
│  - Queries snapshot state via `@tanstack/react-query`                  │
│  - Fallback polling (3-5s with backoff) when socket disconnected       │
│  - Batches and debounces state updates (coalescing window: ~250ms)     │
│  - Manages tab visibility pausing and resyncing                        │
│  - Sends imperative commands to OfficeEngine                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Pure Mapping Layer (`officeMapping.ts`) - 100% Unit Testable           │
│  - Zero React / DOM / Engine dependencies                              │
│  - Pure function: (agent, runs, issues, approvals) => Presence & State│
│  - Precedence engine & anti-flicker dwell timers                       │
│  - Deterministic agent-to-character assignment algorithm               │
│  - Privacy / least-privilege sanitization & title truncation           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Canvas Engine (`OfficeEngine.ts`)                                      │
│  - 60 FPS requestAnimationFrame render loop                            │
│  - A* pathfinding and sprite animation                                │
│  - Pure rendering receiver: `setPresence`, `setTargetZone`,            │
│    `setCharacterVisibility`, `setAgentState`, `setSpeechBubble`        │
│  - Never recreates instance on data updates                            │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Boundaries

1. **`officeMapping.ts`**: Pure functions. No React hooks, no DOM manipulation, no canvas engine imports. Fully testable in Node/Vitest.
2. **`useOfficeLiveSync(engine, companyId, options)`**: Thin React hook. Connects React Query data, handles the shared WebSocket events (`useCompanyLiveEvent`), executes polling fallback on disconnect, runs diffing, and issues atomic commands to the engine.
3. **`OfficeEngine.ts`**: Remains a pure rendering engine. It receives primitive commands (`setPresence(charId, presence)`, `setTarget(charId, coord, state)`, `setVisibility(charId, boolean)`, `setGreyed(charId, boolean)`, `setBubble(charId, text)`). Server types do **not** leak into `OfficeEngine`.

---

## 2. Status Mapping Table as DATA

Instead of scattered conditional statements, state resolution is driven by a typed rule table evaluated in strict precedence order.

### Precedence Matrix (Highest Priority to Lowest)

| Precedence | Condition / Server State | Presence State | Engine State | Location / Zone | Badge / Visual Modifier | Bubble Text Policy | Dwell Time |
|---|---|---|---|---|---|---|---|
| **1. Panic: Hard Stop** | Agent status is `paused` AND `pauseReason === "budget"`, OR `spentMonthlyCents >= budgetMonthlyCents` | `offline` | `panic` | Desk or corridor | Amber/Red Budget Hard-Stop Badge | `"Budget hard-stop reached"` | 5000ms |
| **2. Panic: Run Failed** | Active run status is `failed`, `interrupted`, or `timed_out` | `focus` | `panic` | Desk | Warning icon | `"Run failed: investigating"` (redacted) | 4000ms |
| **3. Terminated** | Agent status is `terminated` | `offline` | `working` | Desk | Character hidden (`visible: false`) | None | N/A |
| **4. Paused** | Agent status is `paused` (manual/system) | `away` | `idle_chat` | Break room (`kitchen_break`) | 50% opacity greyed | `"Paused"` | 3000ms |
| **5. Blocked / Approval** | Active approval pending (`approvals.requestedByAgentId === agent.id`) OR assigned issue is `blocked` | `meeting` | `walking` / `idle_chat` | Manager Office / Conference doorway | Awaiting Approval Icon | `"Awaiting approval: " + truncatedTitle` | 3000ms |
| **6. Phone: Tool/MCP Call** | Active run has `currentToolName != null` | `focus` | `phone` | Desk | Phone icon / tool name | `"Calling " + toolName` | 2000ms |
| **7. Working: Running** | Active run status is `running` | `working` | `working` (typing) | Desk | Green pulse | `"Working on: " + truncatedTitle` | 2000ms |
| **8. Queued / Wakeup** | Active run status is `queued` OR wakeup pending | `focus` | `working` | Desk | Waiting indicator | `"Queued for task"` | 2000ms |
| **9. Idle: Recent Task** | No active run, agent status `idle` or `active`, last run finished < 5 min ago | `working` | `working` | Desk | Normal | None | 1500ms |
| **10. Idle: Drift** | No active run, idle > 5 min | `break` | `coffee` / `idle_chat` | Break room / Water cooler | Cup icon | `"Taking a quick coffee break"` | 6000ms |
| **11. Offline / Default** | Agent status `error` or unrecognized status | `away` | `working` | Desk | Muted dot | None (logged once upstream) | 2000ms |

### Office-Wide Event Triggers

| Trigger Event | Source of Truth | Office Event Kind | Engine Response | Duration |
|---|---|---|---|---|
| **Company Budget Hard-Stop / Incident** | `activity.logged` (`action === "budget.hard_threshold_crossed"` company scope) OR company `status === "paused"` & `pauseReason === "budget"` | `fire_drill` | Siren sound (if unmuted), alarm pulse, smoke particles, agents scramble | 6500ms |
| **Routine Execution (Standup)** | `activity.logged` (`entityType === "routine_run"` or `action === "routine.triggered"`) | `all_hands` | Click sound, CEO announces, agents gather in conference room | 8000ms |
| **Goal Completed / Major Issue Done** | `activity.logged` (`action === "goal.updated"` with `status === "achieved"` OR `action === "issue.updated"` with `status === "done"`) | `dundies` | Fanfare jingle, confetti burst, spotlight on responsible agent | 7000ms |
| **Agent Creation Milestone** | `agent.createdAt` today or anniversary / `activity.logged` (`action === "agent.created"`) | `birthday` | Party banner, breakroom gathering, confetti | 6000ms |
| **Multi-Agent Collaboration** | Issue has active runs or assignees spanning 2+ agents simultaneously | Custom Engine Group Meeting | Collaborating agents walk to conference table | While collaborating |

### Anti-Flicker & Dwell Rule
A state transition is locked for `minDwellMs` (e.g. 2000ms) unless a higher-precedence event occurs (such as `failed` or `panic` which immediately preempts lower-precedence states). This guarantees characters do not jitter or pathfind incessantly during fast heartbeat transitions.

---

## 3. Agent-to-Character Assignment

The office has 16 crafted character slots in `officeConstants.ts`. A company may have fewer or more than 16 agents.

### Assignment Rules
1. **Stability**: Mapping is a pure, deterministic hash function:
   $$\text{index} = \text{hash}(\text{agent.id}) \pmod{\text{availableSlots}}$$
2. **Executive Placement**:
   - The top-level agent (CEO role, or root node where `reportsTo === null`) is guaranteed assignment to the **Manager slot** (`michael`, desk at `[7, 6]` in Michael's Office).
   - If multiple root agents exist, the one with `role === "ceo"` takes priority, followed by alphabetical `id`.
3. **Managers**: Agents who have reportees in `OrgNode.reports` are assigned to perimeter desks adjacent to the conference room or bullpen anchors.
4. **Fewer than 16 Agents**:
   - In **LIVE** mode: Desks for unassigned characters are cleared, and the sprites are hidden (`visible: false`). Only real agents occupy the office.
   - In **DEMO** mode: All 16 Scranton cast members are displayed in full autonomous simulation.
5. **More than 16 Agents**:
   - The first 16 assigned agents occupy dedicated desks.
   - Additional overflow agents cycle through collaborative hotspot zones (conference room seating, visitor couch in reception, breakroom tables) using deterministic secondary coordinates, styled with standard desk/laptop props.
6. **No DB Migration in v1**:
   - Avoid adding an `office_character_id` column to `agentsTable`. Deterministic assignment based on `(agent.role, agent.reportsTo, agent.id)` produces stable, repeatable placement across reloads without altering database schema.

---

## 4. Data Flow & Reconnection Lifecycle

```
Mount Office View
       │
       ▼
Fetch Initial Snapshot (Parallel):
  - agentsApi.list(companyId)
  - agentsApi.org(companyId)
  - heartbeatsApi.companyLiveRuns(companyId)
  - approvalsApi.list(companyId, "pending")
  - issuesApi.list(companyId)
       │
       ▼
Compute Initial Agent State via officeMapping.ts
Apply to OfficeEngine (setPresence, setTarget, setVisibility)
       │
       ▼
Subscribe to useCompanyLiveEvent(handleLiveEvent)
       │
   ┌───┴──────────────────────────────────────────┐
   ▼                                              ▼
[Live Event Received via WebSocket]        [Connection Lost]
 - heartbeat.run.queued                     - Transition badge to DISCONNECTED
 - heartbeat.run.status                     - Fallback poll (3s, 6s, 12s backoff)
 - heartbeat.run.progress (tool calls)      - On reconnect: fetch full snapshot
 - agent.status                             - Invalidate and re-sync
 - activity.logged
   │
   ▼
Buffer in 250ms coalescing queue
Resolve diff -> Apply imperative commands to engine
```

### Event Idempotency & Monotonic Ordering
Each agent state tracks `lastUpdatedAt: number` (epoch timestamp from `event.createdAt` or run update time). Out-of-order or duplicate WebSocket events with older timestamps are discarded.

---

## 5. Performance Boundaries

1. **Update Coalescing**: Bursts of live events (e.g. 200 events from high-concurrency runner runs) are accumulated in a 250ms batch window. Only the net diff is pushed to the engine per frame.
2. **Animation Loop Stability**: The engine `OfficeEngine` instance is created **once** on mount and never recreated on data updates.
3. **Tab Visibility**:
   - When `document.visibilityState === "hidden"`, the animation loop continues ticking at low frequency or pauses, audio is suspended, and DOM updates are deferred.
   - On return to visibility, a single query invalidation reconciles missed state.
4. **Framerate Target**: 60 FPS maintained with 50 agents rendered on canvas, with pathfinding cache keyed by `(startTile, endTile)`.

---

## 6. UX & Accessibility Specifications

1. **Status Indicator Badge**:
   - `🟢 LIVE`: Connected to WebSocket, real company agents displayed.
   - `🟠 DEMO`: Showing simulated Geetorus 2D characters; labelled clearly with a one-click toggle.
   - `🔴 DISCONNECTED`: Reconnecting with retry timer; falls back to cached snapshot.
2. **Simulation Control Safety**:
   - The HUD event buttons (All-Hands, Fire Drill, Birthday, Dundies, Call Pam) stay as local visual simulation only.
   - In Live Mode, they carry a subtle badge tag: `[Simulation Action]`. Clicking them never triggers mutations against the server.
3. **Inspector Drawer**:
   - Displays real agent name, role (e.g. "CEO", "Engineer"), current status, assigned task title (truncated to 72 characters), monthly budget usage (`$spent / $budget`), and last active timestamp.
   - **Privacy Guard**: Never exposes run logs, API keys, secret tokens, system prompts, or private conversation context.
4. **Audio Policy**:
   - Audio is **muted by default** (`soundOn = false`).
   - Sound only plays after explicit user toggle or interaction.
5. **Accessibility (a11y)**:
   - `prefers-reduced-motion`: When set, walking animations jump directly to destination tile without path interpolation; siren and alarm flashes are disabled.
   - Screen-reader text alternative: Hidden `aria-live="polite"` live region outputting agent presence changes: e.g. `"Dwight Schrute is now working on Task GEE-1"`.
   - Keyboard accessible navigation for room quick-jump buttons and inspector drawer.

---

## 7. Theming & Customization

The retro Geetorus 2D theming is completely isolated inside `ui/src/components/office/officeConstants.ts`.
- Room names, desk coordinates, character names, and fallback quotes are config entries.
- The mapping engine and live sync hook operate on generic interfaces (`PresenceState`, `OfficeZone`, `SimState`), allowing the visual theme to be swapped to a generic modern tech office or cyberpunk motif without changing mapping logic or engine contracts.

---

## 8. Rollout & Verification Plan

1. **Vitest Unit Tests**:
   - `officeMapping.test.ts`: Exhaustive test of all server status permutations, precedence resolution, dwell times, deterministic character assignment, overflow (>16 agents), and underflow (<16 agents).
   - `useOfficeLiveSync.test.tsx`: Fake timer verification of snapshot fetch, event dispatch, duplicate rejection, and reconnection.
2. **Lint & Typecheck**:
   - `pnpm -r typecheck`: Zero TypeScript errors with strict checking.
   - `scripts/check-token-gates.mjs`: Strict design token adherence.
3. **Manual Verification**:
   - Verified live in browser against active company: triggering real heartbeat runs, paused states, and approval gates.
