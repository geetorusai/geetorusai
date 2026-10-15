---
title: CLI Overview
summary: Industrial CLI toolchain for Geetorus control-plane management
---

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ COMMAND LINE INTERFACE // INSTANCE SUPERVISION & CONTROL PLANE OPERATOR     │
│ PROFILES • DATA ROOTS • ATOMIC DEPLOYMENTS • HEADLESS GOVERNANCE            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## [ 01 // CLI INVOCATION ]

The Geetorus CLI provides headless control over instances, database provisioning, and agent execution.

```bash
# Production NPX invocation
npx geetorusai --help

# Monorepo developer invocation
pnpm geetorusai --help
```

---

## [ 02 // GLOBAL OPERATIONAL FLAGS ]

| PARAMETER | TYPE | DEFAULT | OPERATIONAL FUNCTION |
| :--- | :--- | :--- | :--- |
| `--data-dir <path>` | Path | `~/.geetorus` | Isolates state, SQLite/PG runtime, and workspace assets. |
| `--api-base <url>` | URL | `http://localhost:3100` | Target Geetorus daemon base URL. |
| `--api-key <token>` | Token | Env fallback | Authentication bearer token. |
| `--company-id <id>` | UUID | Active context | Target organization scope identifier. |
| `--profile <name>` | String | `default` | Swappable operator credentials context profile. |
| `--json` | Flag | `false` | Machine-readable stdout pipe (JSON format). |

> **OPERATOR TIP**: Run isolated test instances without polluting your global root:
> ```bash
> npx geetorusai run --data-dir ./tmp/isolated-node
> ```

---

## [ 03 // CONTEXT & IDENTITY PROFILES ]

Persist connection configurations across terminal sessions:

```bash
# 1. Set default endpoint and organization scope
npx geetorusai context set --api-base http://localhost:3100 --company-id <ORG_UUID>

# 2. Inspect active profile state
pnpm geetorusai context show

# 3. List stored contexts
pnpm geetorusai context list

# 4. Switch context profile
npx geetorusai context use production-us-east
```

### SECRET SAFETY BEST PRACTICE:
Do not write plaintext API tokens to disk. Delegate to an environment pointer:
```bash
npx geetorusai context set --api-key-env-var-name GEETORUS_API_KEY
export GEETORUS_API_KEY="gtk_live_..."
```
