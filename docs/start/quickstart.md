---
title: Quickstart
summary: Rapid bootstrap guide for Geetorus Autonomous Control Plane
---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ RAPID OPERATIONAL DEPLOYMENT // BOOTSTRAP IN < 3 MINUTES                   │
│ ZERO CONFIGURATION DATABASE • AUTOMATED MIGRATIONS • INSTANT CONTROL ROOM   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## [ 01 // PRODUCTION BOOTSTRAP (NPX) ]

For instant unattended setup using the published distribution:

```bash
npx geetorusai onboard --yes
```

This automated runner:
1. Detects local toolchains and runtimes
2. Provisions embedded PostgreSQL transactional store
3. Applies complete Drizzle schema migrations
4. Mounts the Vite Control Room at `http://localhost:3100`

To start the engine later:
```bash
npx geetorusai run
```

---

## [ 02 // LOCAL DEVELOPER SETUP (SOURCE) ]

For operators and contributors developing inside the monorepo.

### SYSTEM SPECIFICATION:
- **Node.js**: `>= 24.11.0`
- **pnpm**: `>= 9.0.0`
- **OS**: Linux / macOS / Windows 10+ (PowerShell or WSL)

### EXECUTION SEQUENCE:
```bash
# 1. Clone repository
git clone https://github.com/geetorusai/geetorus.git
cd geetorus

# 2. Install workspace dependencies
pnpm install

# 3. Launch full-stack developer plane (Server + Vite UI)
pnpm dev
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ACCESS POINTS:                                                              │
│ • UI DASHBOARD:  http://localhost:3100                                      │
│ • REST API:      http://localhost:3100/api                                  │
│ • HEALTH CHECK:  http://localhost:3100/api/health                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## [ 03 // 6-STEP AGENT COMPANY ONBOARDING ]

```
[01] CREATE COMPANY  ──► [02] DEFINE STRATEGIC GOAL ──► [03] HIRE CEO AGENT
                                                             │
[06] COMMENCE RUNS   ◄── [05] ALLOCATE BUDGETS      ◄── [04] BUILD SQUAD
```

1. **CREATE COMPANY**: Register your organization in the UI.
2. **DEFINE GOAL**: Set high-level target (e.g., `"Deploy automated SaaS to production"`).
3. **PROVISION CEO AGENT**: Configure adapter runtime (`opencode_local`, `claude_local`, `ollama_local`).
4. **BUILD ORG STRUCTURE**: Delegate sub-teams (Frontend, Backend, DevOps, QA).
5. **SET BUDGET CAP**: Enforce token limits in dollars/cents to prevent runaway billing.
6. **COMMENCE RUNS**: Trigger initial heartbeat; agents decompose milestones into atomic tasks.
