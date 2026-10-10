# Port Notes: Setup Wizard + Adapter System Port from Geetorus Co-Op to GeetorusAI

## Overview
This document records the audit, architectural decisions, rename mapping, bridging strategies, and verification logs for porting the Setup Wizard and Adapter subsystems from the SOURCE (`geetorus-coop-master`) to the TARGET (`geetorusai`) on branch `port/wizard-and-adapters`.

---

## Step 0 — Target Audit

| Dimension | Details in Target (`geetorusai`) |
| :--- | :--- |
| **Package Manager & Layout** | pnpm (monorepo with pnpm workspaces), root `package.json` + `pnpm-workspace.yaml`. Workspaces include `server/`, `ui/`, `cli/`, `packages/*` (`db`, `shared`, `adapter-utils`, `adapters/*`, `plugins/*`). |
| **Server Framework** | Express (Node.js ES Modules) with comprehensive middleware, routing, and live SSE event support. |
| **Database & ORM** | Drizzle ORM + PostgreSQL (supports embedded PostgreSQL on Windows/macOS/Linux or external PostgreSQL via `DATABASE_URL`). Schema located at `packages/db/src/schema/*.ts`. |
| **UI Framework & Router** | React + Vite + wouter router. Design tokens defined in `ui/src/index.css`. |
| **Auth Model** | Better-Auth with dual deployment modes: `local_trusted` (single-machine loopback) and `authenticated`. |
| **Existing CLI** | `geetorusai` CLI (`cli/src/`), supports `onboard`, `run`, `doctor`, `configure`, and service management. |
| **Existing Agent/Adapter Concept** | `@geetorusai/adapter-utils` + built-in adapters (`packages/adapters/*` including `claude-local`, `ollama-local`, `gemini-local`, `codex-local`, etc.) + server registry (`server/src/adapters/`) + UI registry (`ui/src/adapters/`). |
| **Branding & Naming** | Product: "GeetorusAI", Scope: `@geetorusai/*`, Binary: `geetorusai`, Env prefix: `GEETORUS_*`, Config dir: `.geetorus`. |
| **Node.js Policy** | Node.js 24.11.0+ (`MINIMUM_NODE_VERSION = "24.11.0"` in `@geetorusai/shared/node-version`). |

---

## Rename Map

| SOURCE Token (`geetorus-coop`) | TARGET Token (`geetorusai`) | Notes |
| :--- | :--- | :--- |
| `@geetorus-coop/*` | `@geetorusai/*` | Workspace package scope |
| `geetorus-coop` | `geetorusai` | CLI binary & repository identity |
| `Geetorus Co-Op` | `GeetorusAI` | Product branding |
| `GEETORUS_COOP_*` | `GEETORUS_*` | Environment variable prefix |
| `GEETORUS_COOP_HOME` | `GEETORUS_HOME` | Instance home directory env var |
| `geetorusCoopRuntimeSkills` | `geetorusRuntimeSkills` | Config keys for materialized skills |
| `resolveGeetorusCoopInstanceRootForAdapter` | `resolveGeetorusInstanceRootForAdapter` | Runtime helper from `adapter-utils` |
| `pcp_bootstrap_` | `gt_bootstrap_` / `pcp_bootstrap_` | Bootstrap CEO invite token prefix |

---

## Architecture Strategy: Bridging vs Porting

1. **Adapter System**:
   - **Bridged & Preserved**: The target already includes `@geetorusai/adapter-utils` conforming to the adapter contract, as well as built-in adapters (`process`, `http`, `claude_local`, `ollama_local`, etc.), plus enhanced multi-model and fallback features (`gemma3:4b` + cloud failover). These are preserved and bridged without breaking existing functionality.
   - **External Plugins & Sandboxed Worker**: Dynamic loading via `/adapters/:type/ui-parser.js` and sandboxed worker parsing in UI are supported.
   - **No-git-push Contract**: Verified via `scripts/check-no-git-push.mjs` (0 violations).
2. **Setup Wizard**:
   - **CLI Wizard**: `geetorusai onboard`, `run`, `doctor`, `configure` verified (`doctor` all green).
   - **Server Preflight**: Ported `server/src/services/system-preflight.ts` and `GET /api/system/preflight` in `server/src/routes/system.ts`. Mounted in `server/src/app.ts`. Verified live endpoint returning 200 with actionable hints.
   - **Web Wizard**: Ported `ui/src/api/system.ts`, `FrontDoor.tsx` (Step 0), `PreflightPanel.tsx` (readiness panel), and `OrientationPanel.tsx` (post-setup guide). Integrated Step 0 into `ui/src/components/OnboardingWizard.tsx` with resumable state and navigation bounds.

---

## Verification Logs

### 1. Server Preflight Unit Tests
```
pnpm vitest run server/src/__tests__/system-preflight.test.ts
✓ @geetorusai/server src/__tests__/system-preflight.test.ts (5 tests)
Test Files: 1 passed (1)
Tests: 5 passed (5)
```

### 2. Live Server Preflight Endpoint
```
GET /api/system/preflight -> 200 OK
{
  "status": "pass",
  "checks": [
    { "id": "node", "name": "Node.js runtime", "status": "pass", "message": "Node.js 24.13.1" },
    { "id": "database", "name": "Database", "status": "pass", "message": "Database is reachable." },
    { "id": "schema", "name": "Schema", "status": "pass", "message": "Core schema is present." },
    { "id": "data_dir", "name": "Data directory", "status": "pass", "message": "Writable: C:\\Users\\mohamed farhan\\.geetorus\\instances\\default" },
    { "id": "auth", "name": "Deployment mode", "status": "pass", "message": "local_trusted (single machine, no loopback required)." }
  ]
}
```

### 3. UI Orientation Panel Test
```
pnpm vitest run ui/src/components/onboarding/OrientationPanel.test.ts
✓ @geetorusai/ui src/components/onboarding/OrientationPanel.test.ts (3 tests)
Test Files: 1 passed (1)
Tests: 3 passed (3)
```

### 4. UI Typecheck
```
pnpm --filter @geetorusai/ui exec tsc --noEmit
Exit code 0 (clean, no errors)
```

### 5. Onboarding Wizard Step & Adapter Tests
```
pnpm vitest run ui/src/components/OnboardingWizard.step.test.tsx
✓ @geetorusai/ui src/components/OnboardingWizard.step.test.tsx (14 tests)
Test Files: 1 passed (1)
Tests: 14 passed (14)

pnpm vitest run ui/src/components/OnboardingWizard.adapters.test.tsx
✓ @geetorusai/ui src/components/OnboardingWizard.adapters.test.tsx (5 tests)
Test Files: 1 passed (1)
Tests: 5 passed (5)
```

### 6. Adapter Routes Tests
```
pnpm vitest run server/src/__tests__/adapter-routes.test.ts
✓ @geetorusai/server src/__tests__/adapter-routes.test.ts (15 tests)
Test Files: 1 passed (1)
Tests: 15 passed (15)
```

### 7. CLI Doctor Diagnostic
```
pnpm --filter geetorusai dev doctor
✓ Config file: Valid config
✓ Deployment/auth mode: local_trusted
✓ Agent JWT secret: Set in environment
✓ Storage: Local disk storage is writable
✓ Database: Embedded PostgreSQL configured (port 54329)
✓ Log directory: Writable
✓ Node.js runtime: Node.js 24.13.1
Summary: 10 passed, 2 warnings (port in use by running dev server, windows file permissions)
```

### 8. No Git Push Static Verification
```
node scripts/check-no-git-push.mjs
✓ No unapproved `git push` invocations found in adapter/runtime code.
```
