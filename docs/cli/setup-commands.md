---
title: Setup Commands
summary: Onboard, run, doctor, and configure
---

Instance setup and diagnostics commands.

## `geetorusai run`

One-command bootstrap and start:

```sh
pnpm geetorusai run
```

Does:

1. Auto-onboards if config is missing
2. Runs `geetorusai doctor` with repair enabled
3. Starts the server when checks pass

Choose a specific instance:

```sh
npx geetorusai run --instance dev
```

## `geetorusai onboard`

Interactive first-time setup:

```sh
pnpm geetorusai onboard
```

If Geetorus is already configured, rerunning `onboard` keeps the existing config in place. Use `geetorusai configure` to change settings on an existing install.

First prompt:

1. `Quickstart` (recommended): local defaults (embedded database, no LLM provider, local disk storage, default secrets)
2. `Advanced setup`: full interactive configuration

Start immediately after onboarding:

```sh
pnpm geetorusai onboard --run
```

Quickstart defaults + immediate start:

```sh
pnpm geetorusai onboard --yes
```

When onboarding starts Geetorus from an interactive terminal, it opens the
onboarding page in your browser once. Non-interactive terminals stay silent.
Suppress browser opening explicitly for headless or automated runs with either
environment variable:

```sh
GEETORUS_NO_BROWSER=1 pnpm geetorusai onboard --yes
GEETORUS_OPEN_ON_LISTEN=false pnpm geetorusai onboard --yes
```

On an existing install, `--yes` now preserves the current config and just starts Geetorus with that setup.

## `geetorusai doctor`

Health checks with optional auto-repair:

```sh
pnpm geetorusai doctor
pnpm geetorusai doctor --repair
```

Validates:

- Server configuration
- Database connectivity
- Secrets adapter configuration, including AWS Secrets Manager non-secret env
  config when selected
- Storage configuration
- Missing key files

## `geetorusai configure`

Update configuration sections:

```sh
pnpm geetorusai configure --section server
pnpm geetorusai configure --section secrets
pnpm geetorusai configure --section storage
```

`--section secrets` updates the deployment-level provider used as the fallback
for secrets that do not target a specific company vault. Per-company provider
vaults (named instances, default vault selection, multiple vaults per provider,
coming-soon GCP/Vault) live in the board UI under
`Company Settings → Secrets → Provider vaults` and the
`/api/companies/{companyId}/secret-provider-configs` API.

## `geetorusai env`

Show resolved environment configuration:

```sh
pnpm geetorusai env
```

This now includes bind-oriented deployment settings such as `GEETORUS_BIND` and `GEETORUS_BIND_HOST` when configured.

## `geetorusai allowed-hostname`

Allow a private hostname for authenticated/private mode:

```sh
npx geetorusai allowed-hostname my-tailscale-host
```

## Local Storage Paths

| Data | Default Path |
|------|-------------|
| Config | `~/.geetorus/instances/default/config.json` |
| Database | `~/.geetorus/instances/default/db` |
| Logs | `~/.geetorus/instances/default/logs` |
| Storage | `~/.geetorus/instances/default/data/storage` |
| Secrets key | `~/.geetorus/instances/default/secrets/master.key` |

Override with:

```sh
GEETORUS_HOME=/custom/home GEETORUS_INSTANCE_ID=dev pnpm geetorusai run
```

Or pass `--data-dir` directly on any command:

```sh
npx geetorusai run --data-dir ./tmp/geetorus-dev
npx geetorusai doctor --data-dir ./tmp/geetorus-dev
```
