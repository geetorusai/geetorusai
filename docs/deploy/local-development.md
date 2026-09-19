---
title: Local Development
summary: Set up Geetorus for local development
---

Run Geetorus locally with zero external dependencies.

## Prerequisites

- Node.js 24.11+
- pnpm 9+

## Start Dev Server

```sh
pnpm install
pnpm dev
```

This starts:

- **API server** at `http://localhost:3100`
- **UI** served by the API server in dev middleware mode (same origin)

No Docker or external database required. Geetorus uses embedded PostgreSQL automatically.

## One-Command Bootstrap

For a first-time install:

```sh
pnpm geetorusai run
```

This does:

1. Auto-onboards if config is missing
2. Runs `geetorusai doctor` with repair enabled
3. Starts the server when checks pass

## Bind Presets In Dev

Default `pnpm dev` stays in `local_trusted` with loopback-only binding.

To open Geetorus to a private network with login enabled:

```sh
pnpm dev --bind lan
```

For Tailscale-only binding on a detected tailnet address:

```sh
pnpm dev --bind tailnet
```

Legacy aliases still work and map to the older broad private-network behavior:

```sh
pnpm dev --tailscale-auth
pnpm dev --authenticated-private
```

Allow additional private hostnames:

```sh
npx geetorusai allowed-hostname dotta-macbook-pro
```

For full setup and troubleshooting, see [Tailscale Private Access](/deploy/tailscale-private-access).

## Health Checks

```sh
curl http://localhost:3100/api/health
# -> {"status":"ok"}

curl http://localhost:3100/api/companies
# -> []
```

## Safe Worktree Bootstrap for Local Agent Runs

For safer parallel local experiments, initialize a dedicated worktree instance instead of reusing your main checkout:

```sh
npx geetorusai worktree:make local-lab --seed-mode minimal
cd ~/geetorus-local-lab
pnpm geetorusai worktree env                       # inspect generated env exports
eval "$(npx geetorusai worktree env)"             # bash/zsh
pnpm geetorusai run
pnpm geetorusai doctor
```

If the experiment gets noisy, repair or reseed the worktree without touching the main branch:

```sh
# worktree repair rebuilds the local checkout metadata, so run the checked-out CLI through the direct-exec form.
node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts worktree repair --branch geetorus-local-lab
npx geetorusai worktree reseed --from . --to geetorus-local-lab
```

When done, shut it down and remove the isolated state explicitly:

```sh
npx geetorusai worktree:cleanup local-lab --force
```

## Reset Dev Data

To wipe local data and start fresh:

```sh
rm -rf ~/.geetorus/instances/default/db
pnpm dev
```

## Data Locations

| Data | Path |
|------|------|
| Config | `~/.geetorus/instances/default/config.json` |
| Database | `~/.geetorus/instances/default/db` |
| Storage | `~/.geetorus/instances/default/data/storage` |
| Secrets key | `~/.geetorus/instances/default/secrets/master.key` |
| Logs | `~/.geetorus/instances/default/logs` |

Override with environment variables:

```sh
GEETORUS_HOME=/custom/path GEETORUS_INSTANCE_ID=dev pnpm geetorusai run
```
