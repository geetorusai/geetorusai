# 05 — Operations & Troubleshooting

## Installation & Startup

The Ponytail always-on integration is permanently bundled into the GeetorusAI codebase:

1. **Core Package Integration**:
   - `packages/adapter-utils/src/ponytail-optimizer.ts`
   - Bundled skill: `packages/skills-catalog/catalog/bundled/software-development/ponytail/SKILL.md`
2. **Build and Test Verification**:
   ```bash
   # Rebuild adapter-utils
   pnpm --filter @geetorusai/adapter-utils exec tsc --noEmit

   # Run Ponytail optimizer unit tests
   pnpm -w exec vitest run packages/adapter-utils/src/ponytail-optimizer.test.ts

   # Run Ollama local and cloud execution tests
   pnpm -w exec vitest run packages/adapters/ollama-local/src/server/execute.test.ts
   ```
3. **Persistence Across Restarts**:
   - Instruction files (`AGENTS.md`) and wake prompt rendering automatically embed the optimization mandate on every session initialization.

---

## Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **"Cannot connect to local Ollama daemon at http://127.0.0.1:11434"** | Ollama local process is not running. | Start Ollama using `ollama serve` in a terminal. |
| **"Configured Ollama model is not installed locally"** | Requested model tag has not been pulled. | Run `ollama pull <model>` (e.g. `ollama pull gemma3:4b`). |
| **"Ollama Cloud authentication failed (HTTP 401)"** | Invalid or missing API key for remote gateway. | Set `OLLAMA_API_KEY` in environment or configure the API key in the agent's adapter settings. |
| **"Ollama Cloud rate limit exceeded (HTTP 429)"** | Remote gateway concurrency quota exhausted. | The adapter applies exponential backoff; reduce task concurrency or increase quota on the gateway. |
| **Embedded Postgres Port Conflict on Windows** | Stale `postmaster.pid` from previous process. | Run `Stop-Process -Name postgres -Force` and delete `~/.geetorus/instances/default/db/postmaster.pid`. |

---

## Rollback Procedure

Because Ponytail is integrated cleanly within `@geetorusai/adapter-utils`, rolling back changes is safe and straightforward:
1. Revert `packages/adapter-utils/src/ponytail-optimizer.ts` and `server-utils.ts`.
2. Re-run `pnpm test`.
3. No external database migrations or state mutations are required.
