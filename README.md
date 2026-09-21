<p align="center">
  <img src="doc/assets/banner.jpg" alt="Geetorus - Autonomous AI Workforce Orchestration Engine" width="720" />
</p>

```
  ██████╗ ███████╗███████╗████████╗ ██████╗ ██████╗ ██╗   ██╗███████╗
 ██╔════╝ ██╔════╝██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██║   ██║██╔════╝
 ██║  ███╗█████╗  █████╗     ██║   ██║   ██║██████╔╝██║   ██║███████╗
 ██║   ██║██╔══╝  ██╔══╝     ██║   ██║   ██║██╔══██╗██║   ██║╚════██║
 ╚██████╔╝███████╗███████╗   ██║   ╚██████╔╝██║  ██║╚██████╔╝███████║
  ╚═════╝ ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝
                     AUTONOMOUS AGENT ORCHESTRATION ENGINE
```

<div align="center">

```
[ PROTOCOL: AGENT CONTROL PLANE ]   [ CORE: V1.0 ]   [ STATUS: PRODUCTION READY ]
```

[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-000000?style=for-the-badge&logoColor=white)](LICENSE)
[![Node](https://img.shields.io/badge/NODE-%3E%3D24.11-000000?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TYPESCRIPT-5.X-000000?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![pnpm](https://img.shields.io/badge/PNPM-9.X-000000?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io)
[![Docker](https://img.shields.io/badge/DOCKER-READY-000000?style=for-the-badge&logo=docker&logoColor=white)](#-05-quickstart)

<p align="center">
  <a href="#-05-quickstart"><strong>[ QUICKSTART ]</strong></a> &bull;
  <a href="#-03-core-subsystems"><strong>[ FEATURES ]</strong></a> &bull;
  <a href="#-04-architecture-matrix"><strong>[ ARCHITECTURE ]</strong></a> &bull;
  <a href="#-06-cli-interface-geetorusai"><strong>[ CLI ]</strong></a> &bull;
  <a href="#-07-development"><strong>[ DEV ]</strong></a>
</p>

</div>

---

### // 00. MANIFESTO

> **STOP BABYSITTING ISOLATED TERMINAL TABS.**
>
> Geetorus is an industrial-grade control plane that orchestrates teams of autonomous AI agents like an operating company: strict reporting chains, hard token budgets, atomic ticket checkouts, human-in-the-loop approval gates, and deterministic pulse execution.

---

### // 01. WORKFLOW PIPELINE

```
[ GOAL DIRECTIVE ] ──> [ DAG DECOMPOSITION ] ──> [ ATOMIC TASK LOCK ]
                                                          │
                                                          ▼
[ AUDIT LOG & COST ] <── [ GOVERNANCE GATE ] <── [ PULSE EXECUTION RUN ]
```

| STEP | PHASE | OPERATIONAL SPEC |
| :--- | :--- | :--- |
| `[ 01 ]` | **DEFINE OBJECTIVE** | Feed high-level mission goals. The control plane handles task breakdown. |
| `[ 02 ]` | **DEPLOY THE WORKFORCE** | Assign Chief of Staff, Architects, Engineers, and QA — local or cloud. |
| `[ 03 ]` | **GOVERN & EXECUTE** | Enforce dollar caps, inspect approval fences, track pulses from the dashboard. |

---

### // 02. COMPATIBILITY MATRIX

<div align="center">
<table>
  <tr>
    <td align="center"><strong>DRIVER</strong></td>
    <td align="center"><img src="doc/assets/logos/openclaw.svg" width="32" alt="OpenCode" /><br/><sub><b>OpenCode</b></sub></td>
    <td align="center"><img src="doc/assets/logos/claude.svg" width="32" alt="Claude" /><br/><sub><b>Claude Code</b></sub></td>
    <td align="center"><img src="doc/assets/logos/codex.svg" width="32" alt="Codex" /><br/><sub><b>Codex</b></sub></td>
    <td align="center"><img src="doc/assets/logos/cursor.svg" width="32" alt="Cursor" /><br/><sub><b>Cursor</b></sub></td>
    <td align="center"><img src="doc/assets/logos/bash.svg" width="32" alt="Bash" /><br/><sub><b>Bash CLI</b></sub></td>
    <td align="center"><img src="doc/assets/logos/http.svg" width="32" alt="HTTP" /><br/><sub><b>HTTP API</b></sub></td>
  </tr>
  <tr>
    <td align="center"><strong>STATUS</strong></td>
    <td align="center"><code>READY (FREE)</code></td>
    <td align="center"><code>READY (NATIVE)</code></td>
    <td align="center"><code>READY (CLOUD)</code></td>
    <td align="center"><code>READY (LOCAL)</code></td>
    <td align="center"><code>READY (SANDBOX)</code></td>
    <td align="center"><code>READY (BRIDGE)</code></td>
  </tr>
</table>

```
RULE: If an agent runtime can receive a pulse, Geetorus can orchestrate it.
```
</div>

---

### // 03. CORE SUBSYSTEMS

| SUBSYSTEM | CAPABILITY SPECIFICATION |
| :--- | :--- |
| **💓 PULSE ENGINE** | Periodic cron triggers and reactive event wakes. Full session and memory persistence across machine restarts. |
| **💰 FISCAL GOVERNANCE** | Hard dollar and token caps at agent, project, and company boundaries. Zero runaway API bills. |
| **🏢 MULTI-TENANCY** | Complete company separation. Isolated Git worktrees, isolated database namespaces, and partitioned secret vaults. |
| **🎫 ATOMIC TICKETING** | Ticket checkout locks eliminate race conditions. Full audit logs, issue hierarchies, and watchdog recovery. |
| **🛠️ TOOL & MCP STUDIO** | Live runtime injection of MCP (Model Context Protocol) servers, custom tools, and workspace skills. |
| **🛡️ APPROVAL GATES** | Human-in-the-loop review fences for sensitive actions: production pushes, high-dollar calls, and strategic overrides. |

---

### // 04. ARCHITECTURE MATRIX

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GEETORUS CONTROL PLANE                          │
│                                                                        │
│   ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐    │
│   │ IDENTITY & ACCESS │ │  TASK LIFECYCLE   │ │   PULSE ENGINE    │    │
│   │ RBAC / Session    │ │  DAG / Checkouts  │ │  Cron & Reactive  │    │
│   └───────────────────┘ └───────────────────┘ └───────────────────┘    │
│   ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐    │
│   │  ORG HIERARCHY    │ │ WORKSPACE RUNTIME │ │   BUDGET LEDGER   │    │
│   │ Roles & Reporting │ │  Worktree Sandbox │ │ Hard Dollar Caps  │    │
│   └───────────────────┘ └───────────────────┘ └───────────────────┘    │
│   ┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐    │
│   │  TOOL & PLUGIN GW │ │   SECRET VAULT    │ │ AUDIT TELEMETRY   │    │
│   │ MCP Tool Gateway  │ │ KMS & Redactions  │ │ NDJSON Event Logs │    │
│   └───────────────────┘ └───────────────────┘ └───────────────────┘    │
└────────────────────────────────────────────────────────────────────────┘
          ▲                         ▲                         ▲
   ┌──────┴──────┐           ┌──────┴──────┐           ┌──────┴──────┐
   │  OPENCODE   │           │ CLAUDE CODE │           │   CODEX /   │
   │ Local / Free│           │ Native ACP  │           │   GEMINI    │
   └─────────────┘           └─────────────┘           └─────────────┘
```

---

### // 05. QUICKSTART

#### `[ METHOD 01 ]` ONE-CLICK DOCKER (RECOMMENDED)

Zero local Node.js or database installation required:

```bash
git clone https://github.com/geetorusai/geetorus.git
cd geetorus/docker

# Generate secret token
export BETTER_AUTH_SECRET="$(openssl rand -hex 32)"

# (Optional) Cloud model API keys
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# Launch isolated stack
docker compose -f docker-compose.quickstart.yml up --build
```

```
DASHBOARD: http://localhost:3100
API SERVER: http://localhost:3100/api
```

---

#### `[ METHOD 02 ]` LOCAL SOURCE

```bash
# Clone and install
git clone https://github.com/geetorusai/geetorus.git
cd geetorus
pnpm install

# Interactive onboarding wizard
pnpm geetorusai onboard --yes

# Launch dev stack (API + Dashboard)
pnpm dev
```

---

### // 06. CLI INTERFACE (`geetorusai`)

```bash
$ geetorusai onboard          # Interactive setup wizard
$ geetorusai onboard --yes    # Zero-touch headless bootstrap
$ geetorusai start            # Start production control plane daemon
$ geetorusai configure        # Live configuration manager
$ geetorusai company export   # Export portable company blueprint
$ geetorusai company import   # Ingest company blueprint bundle
$ geetorusai test-drive       # Ephemeral isolated sandbox runner
```

---

### // 07. DEVELOPMENT

```bash
$ pnpm dev                    # Full hot-reloading dev server (port 3100)
$ pnpm dev:server             # API server only
$ pnpm build                  # Monorepo release build
$ pnpm test                   # Vitest suite (fast)
$ pnpm check:token-gates      # Design token compliance gate
$ pnpm db:generate            # Drizzle schema migrations
$ pnpm db:migrate             # Apply migrations to database
```

---

### // 08. TELEMETRY POLICY

Geetorus collects anonymous crash and lifecycle telemetry to verify agent loop stability:
- **ZERO** prompts, code files, task descriptions, or secrets are ever recorded.
- **OPT-OUT:** `export DO_NOT_TRACK=1` or `export GEETORUS_TELEMETRY_DISABLED=1`.

---

### // 09. LICENSE

Released under the **[MIT License](LICENSE)**. Free for commercial and private deployment.
