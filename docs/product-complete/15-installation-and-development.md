# 15 — Installation and Development Guide

This guide provides accurate, step-by-step instructions for installing, configuring, running, and developing GeetorusAI locally or in a team environment.

---

## 1. System Prerequisites

- **Node.js**: `>= 24.11.0` (Enforced by `packages/shared/src/node-version.ts`).
- **Package Manager**: `pnpm` (`v9.15.4` pinned via `packageManager` in `package.json`).
- **Git**: `>= 2.38.0` (Required for Git worktree management).
- **Operating Systems**: macOS (Apple Silicon / Intel), Linux (Ubuntu 22.04+, Debian 12+, Arch), Windows 10/11 (PowerShell or WSL2).
- **Optional Tools**: Docker (for containerized sandboxes), Bubblewrap (`bwrap` on Linux for filesystem confinement).

---

## 2. Quickstart Installation

```bash
# 1. Clone the repository
git clone https://github.com/geetorusai/geetorusai.git
cd geetorusai

# 2. Install dependencies (respecting pinned pnpm lockfile)
pnpm install

# 3. Create environment configuration
cp .env.example .env

# 4. Start local development server (starts embedded Postgres, backend, & Vite frontend)
pnpm dev
```

The application will be accessible at:
- **Web UI & Control Plane**: `http://localhost:3100`
- **REST API Base**: `http://localhost:3100/api`
- **WebSocket Live Events**: `ws://localhost:3100/ws/live-events`

---

## 3. Environment Configuration (`.env`)

```ini
# --- Core Server Configuration ---
PORT=3100
HOST=127.0.0.1
NODE_ENV=development

# --- Database Configuration (Leave unset for Embedded PostgreSQL) ---
# DATABASE_URL=postgresql://postgres:password@localhost:5432/geetorus

# --- AI Provider API Keys (Can also be configured via UI / Secrets) ---
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
OLLAMA_BASE_URL=http://localhost:11434

# --- Multi-Channel Chat Webhooks (Optional) ---
DISCORD_BOT_TOKEN=your_discord_bot_token
SLACK_BOT_TOKEN=your_slack_bot_token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
GITHUB_APP_PRIVATE_KEY=your_github_app_key

# --- Observability (Optional) ---
# SENTRY_DSN=https://your-sentry-dsn
# OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

---

## 4. Development Commands Reference

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Starts server with dev-runner in watch mode (compiles backend + embeds UI). |
| `pnpm dev:server` | Starts only the Express backend API on port 3100. |
| `pnpm dev:ui` | Starts only the Vite React frontend dev server with HMR. |
| `pnpm build` | Executes workspace preflight link verification and builds all packages. |
| `pnpm typecheck` | Typechecks the entire monorepo. |
| `pnpm --filter @geetorusai/ui exec tsc --noEmit` | Fast UI-only TypeScript typecheck. |
| `pnpm db:generate` | Generates Drizzle SQL migrations after schema changes. |
| `pnpm check:token-gates` | Verifies UI design token compliance (detects forbidden raw hex/px). |

---

## 5. Troubleshooting Common Failures

### 1. Windows: Embedded Postgres "Shared Memory Block" Error
- **Symptom**: `FATAL: could not create shared memory segment` on startup.
- **Root Cause**: A stale `postgres.exe` process is holding a PID lock from a previously interrupted session.
- **Resolution**:
  ```powershell
  Stop-Process -Name postgres -Force -ErrorAction SilentlyContinue
  pnpm dev
  ```

### 2. Node.js Version Refusal
- **Symptom**: `Error: Unsupported Node.js version. Required: >=24.11.0`.
- **Resolution**: Upgrade Node using `nvm` / `fnm`: `nvm install 24.11.0 && nvm use 24.11.0`.

### 3. Port 3100 in Use
- **Behavior**: GeetorusAI automatically scans for the next available port (e.g. `3101`) via `detect-port` and outputs the active URL in the console.
