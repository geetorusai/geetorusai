# CLI Reference

Geetorus CLI now supports both:

- installation and lifecycle management (`install`, `uninstall`, `update`, `upgrade`, `service`)
- instance setup/diagnostics (`onboard`, `doctor`, `configure`, `env`, `allowed-hostname`, `env-lab`)
- control-plane client operations (issues, approvals, agents, activity, dashboard)

## Security: safe invocation for content-bearing arguments

Use `npx geetorusai` for any command whose argument can hold untrusted or
semi-trusted content. Untrusted content includes issue text, comment bodies,
Markdown, pasted snippets, and model output. `npx` runs the CLI binary directly.
It passes the argument as an inert `argv` value. It does not run a shell over the
value. `npx geetorusai` works on any machine with Node: it runs a local install
of the `geetorusai` package, and it fetches the published package when no local
install is present.

Do not use `pnpm geetorusai` for a content-bearing argument. `pnpm geetorusai`
is a `package.json` script. `pnpm` builds a `/bin/sh` command string and appends
the argument to it, so the shell reads the argument first. The shell interprets
these spans before the CLI starts:

- command substitution: a backtick pair or `$( )`
- variable expansion: `$NAME` or `${NAME}` (this can leak a secret value into the persisted argument)

A crafted value can run an arbitrary command as the invoking user. A crafted
value can also expand an environment variable into the stored argument. No
CLI-side check stops this, because the shell runs before `cli/src` starts. This
is true even when the argument comes from a quoted shell variable, because `pnpm`
re-evaluates the value in its own shell.

Safe forms:

- `npx geetorusai <command> <args>` — the documented default. It passes an inert
  `argv` value and runs on any machine.
- `node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts <command> <args>` —
  the safe form to run the local source from a monorepo checkout. It is the exact
  command that the `pnpm geetorusai` script wraps, but it runs directly, so no
  shell reads the argument. Use it when you must test your local `cli/src`
  changes with a content-bearing argument.

Unsafe or broken forms:

- `pnpm geetorusai <command> <args>` — unsafe. `pnpm` runs the argument through a
  shell first.
- `pnpm run <script> -- <args>`, or any `package.json` script that wraps the CLI —
  unsafe for the same reason.
- `pnpm exec geetorusai <command> <args>` — broken. The root workspace does not
  depend on the `geetorusai` package, so `pnpm` does not link its binary into
  `node_modules/.bin`. The command fails with `Command "geetorusai" not found`,
  even after a build. Do not use it.

Static placeholders only: a document must show a static placeholder such as
`<host>` in a command example, never a live `$( )` or `$NAME` span. The reader's
own shell expands such a span on paste, before any CLI or `npx` receives argv, so
a direct-exec form does not stop it.

`pnpm geetorusai` stays acceptable only for a fully literal local lifecycle or
setup command. A fully literal command carries no substitutable value. It has no
placeholder, no example value the reader replaces, no interpolation, no path, no
ref, no id, and no name. It holds the subcommand and, at most, flags that take no
value.

The allowlist of literal commands lives in one place:
`server/src/__tests__/cli-invocation-safety.test.ts`. A guard test enforces it
fail-closed. Any `pnpm geetorusai` line whose command string is not an exact
allowlist entry is an offender. The allowlist holds commands such as `run`,
`onboard`, `onboard --yes`, `doctor`, `configure --section <name>`, `connect`,
`env-lab up`, `env-lab down`, `context show`, `context list`,
`worktree ensure-seeded`, and `worktree env`.

Every invocation that carries a positional value or an option value uses
`npx geetorusai` instead. This covers a hostname (`allowed-hostname`), an import
URL or folder (`company import`), an identifier or secret (`--company-id`,
`--agent-id`, `--claim-secret`), a payload (`--payload-json`), free text
(`--body`, `--title`, `--comment`), a data directory (`--data-dir`), an instance
(`--instance`), a bind preset (`--bind`), a context-profile name, and every
worktree path, ref, id, or name option. A runtime value counts as non-fixed even
when it looks safe. The private-hostname guard builds `allowed-hostname <value>`
from the request Host header, so it uses `npx geetorusai`.

For a command that must run the local checked-out source with a value, use the
direct-exec form: `node cli/node_modules/tsx/dist/cli.mjs cli/src/index.ts
<command> <args>`.

The `pnpm --filter @geetorusai/*` build and test commands are not CLI
invocation. They do not change.

### Offline and air-gapped use

`npx geetorusai` runs offline when the `geetorusai` package is already in a
local install or in the npm cache. It reaches the network only when the package
is in neither place.

To force cache-only resolution and block any network attempt, run
`npx --offline geetorusai <command> <args>`. Use `npx --prefer-offline
geetorusai` when you accept a fetch only for a missing package.

To prepare an air-gapped host, install the package one time while the host is
online. Run `npm install -g geetorusai`, or run the documented `install.sh`
path. After that step, both `npx geetorusai` and the installed `geetorusai`
binary run offline. Both pass an inert `argv` value.

To move the package without a registry, run `npm pack geetorusai` on an online
host. Copy the tarball to the air-gapped host. Run `npm install -g
./geetorusai-<version>.tgz`.

Do not use `pnpm geetorusai` as an offline fallback for a content-bearing
argument. It runs the argument through a shell first, offline or online. It also
resolves only inside a monorepo checkout.

A monorepo contributor who works offline uses the direct-exec form that this
section documents above: `node cli/node_modules/tsx/dist/cli.mjs
cli/src/index.ts <command> <args>`. It passes an inert `argv` value and runs the
local source.

## Base Usage

Use repo script in development:

```sh
pnpm geetorusai --help
```

Recommended installation and interactive onboarding:

```sh
curl -fsSLO https://geetorus.ing/install.sh
curl -fsSLO https://geetorus.ing/install.sh.sha256
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum -c install.sh.sha256
else
  shasum -a 256 -c install.sh.sha256
fi
bash install.sh
```

The checksum detects transfer or publishing mistakes but is served from the
same origin as the installer. Use a release-tag or commit-pinned GitHub copy
when you need an independently hosted source. Piped installs require supported
Node.js, npm, and npx to already be installed; download the script first before
allowing it to bootstrap Node.js with privileged package-manager commands.

First-time local bootstrap from a source checkout:

```sh
pnpm geetorusai run
```

Choose local instance:

```sh
npx geetorusai run --instance dev
```

## Isolated Manual Test Drives

`geetorusai test-drive` creates or reuses an isolated local data directory,
ensures one usable CEO agent exists in a fresh database, starts Geetorus in the
foreground, and opens the browser after initialization succeeds. It never
installs a background service and never creates a goal, project, issue, task,
or heartbeat.

```sh
npx geetorusai test-drive \
  [-d, --data-dir <path>] \
  [--company-name <name>] \
  [--agent-name <name>] \
  [--harness <claude|codex|opencode>] \
  [--model <model-id>] \
  [--api-key-env <variable> | --api-key <value>] \
  [--no-browser]
```

Defaults are `Test Company`, a `CEO` agent with the `ceo` role, and the Claude
harness. Without `--data-dir`, every invocation creates a unique OS temporary
directory and prints its absolute path. The directory is retained after exit
for inspection. An explicit data directory is reused and is never reset. The
reused directory must use Geetorus's embedded database; `DATABASE_URL`,
`DATABASE_MIGRATION_URL`, and configs with `database.mode: postgres` are
rejected so test-drive cannot mutate an external database. The server also
ignores the invocation directory's `.env` for test-drive launches, while still
loading the selected instance's own environment file. Reused directories also
retain the normal guard against colliding with a managed Geetorus service. The
server uses the first available loopback port at or above `3100`, so an
unrelated local Geetorus process can remain running.

Harness configuration:

| Harness | Agent adapter | Agent credential variable | Model |
| --- | --- | --- | --- |
| `claude` | `claude_local` | `ANTHROPIC_API_KEY` | Optional; omitted uses the adapter default |
| `codex` | `codex_local` | `OPENAI_API_KEY` | Optional; omitted uses the adapter default |
| `opencode` | `opencode_local` | `OPENROUTER_API_KEY` | Required and must begin with `openrouter/` |

OpenCode model references retain their complete path, including additional
slashes:

```sh
OPENROUTER_API_KEY=... npx geetorusai test-drive \
  --harness opencode \
  --model openrouter/anthropic/claude-sonnet-4.5
```

Credentials come from `--api-key`, the variable named by `--api-key-env`, or
the harness's canonical environment variable shown in the table. `--api-key`
and `--api-key-env` are mutually exclusive. A custom source variable is still
stored and projected under the canonical target variable:

```sh
MY_ROUTER_KEY=... npx geetorusai test-drive \
  --harness opencode \
  --model openrouter/openai/gpt-5.4 \
  --api-key-env MY_ROUTER_KEY
```

Credentials are stored through Geetorus's user-secret reference path and are
redacted from Geetorus command output. Geetorus does not print `--api-key`,
and it removes the value from its JavaScript argument view immediately after
Commander parses it. Geetorus does not put the raw argument list in telemetry,
API metadata, or diagnostics. Command wrappers, operating-system process
listings, and shell history can still expose values passed in arguments. This
is an explicit tradeoff for the local test-drive workflow. Prefer an exported
canonical variable or `--api-key-env` when that matters. Provider connectivity,
local harness installation, credential validity, and model availability are
intentionally checked only when the agent first runs.

When invoked inside a linked Git worktree, the command ignores inherited
`GEETORUS_IN_WORKTREE` state, launches in worktree mode, and verifies **Run
tasks in this worktree** is armed for the current instance before opening the
browser. In a primary checkout or non-Git directory it launches without
worktree mode and does not alter the setting. On reuse, if any company already
exists, all bootstrap flags are ignored and companies, agents, and secrets are
left untouched; worktree-setting reconciliation is the only permitted
mutation.

Use `--no-browser` for a foreground instance that prints its ready URL without
opening it.

## Install, Update, And Uninstall

Managed installs keep CLI payloads under `~/.geetorus/cli`, expose a stable
`~/.local/bin/geetorusai` shim, switch versions atomically, and retain two
previous payloads for rollback.

```sh
geetorusai install
geetorusai install --canary
geetorusai install --version <version>
geetorusai install --ref <branch|tag|sha> [--repo owner/repo]
geetorusai update
geetorusai update --latest|--canary|--version <version>
geetorusai update --rollback
geetorusai upgrade
geetorusai uninstall
```

`upgrade` aliases `update`. `uninstall` removes managed code and the shim but
preserves instance data under `~/.geetorus/instances/`. See
`doc/INSTALLING.md` for installation methods, security notes, PATH setup, and
the complete update and rollback behavior.

## Onboarding And Service Management

Interactive onboarding offers to install a background service on supported
platforms. `--yes` never installs it implicitly; automation must opt in.

```sh
geetorusai onboard
geetorusai onboard --yes
geetorusai onboard --yes --install-service
geetorusai onboard --yes --no-install-service
```

Service lifecycle commands remain under the `service` namespace:

```sh
geetorusai service install [--no-start-now] [--no-start-on-login]
geetorusai service uninstall
geetorusai service start
geetorusai service stop
geetorusai service restart [--wait]
geetorusai service status [--json]
geetorusai service logs [-f]
```

Every service verb supports `--instance <id>` and `--json`. Linux and WSL2 use
a systemd user unit when available; macOS uses a LaunchAgent. Unsupported
environments receive foreground `geetorusai run` guidance.

`geetorusai doctor` includes managed-install and service-health diagnostics in
addition to configuration, storage, database, logging, and port checks.

## Deployment Modes

Mode taxonomy and design intent are documented in `doc/DEPLOYMENT-MODES.md`.

Current CLI behavior:

- `geetorusai onboard` and `geetorusai configure --section server` set deployment mode in config
- server onboarding/configure ask for reachability intent and write `server.bind`
- `geetorusai run --bind <loopback|lan|tailnet>` passes a quickstart bind preset into first-run onboarding when config is missing
- runtime can override mode with `GEETORUS_DEPLOYMENT_MODE`
- `geetorusai run` and `geetorusai doctor` still do not expose a direct low-level `--mode` flag

Canonical behavior is documented in `doc/DEPLOYMENT-MODES.md`.

Allow an authenticated/private hostname (for example custom Tailscale DNS):

```sh
npx geetorusai allowed-hostname dotta-macbook-pro
```

Bring up the default local SSH fixture for environment testing:

```sh
pnpm geetorusai env-lab up
pnpm geetorusai env-lab doctor
pnpm geetorusai env-lab status --json
pnpm geetorusai env-lab down
```

All client commands support:

- `--data-dir <path>`
- `--api-base <url>`
- `--api-key <token>`
- `--context <path>`
- `--profile <name>`
- `--json`

Company-scoped commands also support `--company-id <id>`.

API base resolution order:

1. `--api-base <url>`
2. `GEETORUS_API_URL`
3. selected context profile `apiBase`
4. local Geetorus config server port
5. `http://localhost:3100`

Connection failures include the attempted URL and a `GET /api/health` check hint.

## Connect Wizard

```sh
pnpm geetorusai connect
```

`connect` confirms the resolved API base, verifies `GET /api/health`, authenticates board access when needed, and saves a persona-aware profile:

- `persona=board` for board operator profiles
- `persona=agent` with `agentId` and `agentName` for agent profiles

Profiles store token env-var names, not plaintext tokens. The wizard prints shell exports for the newly created token.

Use `--data-dir` on any CLI command to isolate all default local state (config/context/db/logs/storage/secrets) away from `~/.geetorus`:

```sh
npx geetorusai run --data-dir ./tmp/geetorus-dev
npx geetorusai issue list --data-dir ./tmp/geetorus-dev
```

## Context Profiles

Store local defaults in `~/.geetorus/context.json`:

```sh
npx geetorusai context set --api-base http://localhost:3100 --company-id <company-id>
npx geetorusai context set --persona agent --agent-id <agent-id> --api-key-env-var-name GEETORUS_API_KEY
pnpm geetorusai context show
pnpm geetorusai context list
npx geetorusai context use default
```

To avoid storing secrets in context, set `apiKeyEnvVarName` and keep the key in env:

```sh
npx geetorusai context set --api-key-env-var-name GEETORUS_API_KEY
export GEETORUS_API_KEY=...
```

## Organization Commands

```sh
npx geetorusai company list
npx geetorusai company get <company-id>
npx geetorusai company current [--company-id <company-id>]
npx geetorusai company stats
npx geetorusai company create --payload-json '{...}'
npx geetorusai company update <company-id> --payload-json '{...}'
npx geetorusai company branding:update <company-id> --payload-json '{...}'
npx geetorusai company archive <company-id>
npx geetorusai company export <company-id> --out ./company --include company,agents,projects,issues,skills
npx geetorusai company export:preview <company-id> --payload-json '{...}'
npx geetorusai company export:api <company-id> --payload-json '{...}'
npx geetorusai company import ./company --target new --new-company-name "Imported Company"
npx geetorusai company import:preview <company-id> --payload-json '{...}'
npx geetorusai company import:apply <company-id> --payload-json '{...}'
npx geetorusai company delete <company-id-or-prefix> --yes --confirm <same-id-or-prefix>
```

Examples:

```sh
npx geetorusai company delete PAP --yes --confirm PAP
npx geetorusai company delete 5cbe79ee-acb3-4597-896e-7662742593cd --yes --confirm 5cbe79ee-acb3-4597-896e-7662742593cd
```

Notes:

- With agent authentication, `company list` and `company current` are
  agent-safe company selectors. `company list` first tries the board-wide list;
  if that is forbidden, it uses `--company-id`, `GEETORUS_COMPANY_ID`, context,
  or `/api/agents/me` and then reads only that scoped company.
- `company create` requires board/instance-admin authentication because it is
  an instance-wide setup command.
- Deletion is server-gated by `GEETORUS_ENABLE_COMPANY_DELETION`.
- With agent authentication, company deletion is company-scoped. Use the current company ID/prefix (for example via `--company-id` or `GEETORUS_COMPANY_ID`), not another company.

## Issue Commands

```sh
npx geetorusai issue list --company-id <company-id> [--status todo,in_progress] [--assignee-agent-id <agent-id>] [--match text]
npx geetorusai issue get <issue-id-or-identifier>
npx geetorusai issue create --company-id <company-id> --title "..." [--description "..."] [--status todo] [--priority high]
npx geetorusai issue update <issue-id> [--status in_progress] [--comment "..."]
npx geetorusai issue delete <issue-id> --yes
npx geetorusai issue comment <issue-id> --body "..." [--attachment-id <id...>] [--reopen]
npx geetorusai issue comments <issue-id> [--limit 50]
npx geetorusai issue comment:get <issue-id> <comment-id>
npx geetorusai issue comment:delete <issue-id> <comment-id>
npx geetorusai issue runs <issue-id-or-identifier>
npx geetorusai issue live-runs <issue-id-or-identifier>
npx geetorusai issue active-run <issue-id-or-identifier>
npx geetorusai issue heartbeat-context <issue-id>
npx geetorusai issue checkout <issue-id> --agent-id <agent-id> [--expected-statuses todo,backlog,blocked]
npx geetorusai issue release <issue-id>
npx geetorusai issue force-release <issue-id>
```

Issue subresources are exposed as Geetorus API wrappers. Commands that map to broad server schemas accept JSON payloads and validate them with shared schemas before sending.

```sh
npx geetorusai issue child:create <issue-id> --payload-json '{"title":"Child task"}'
npx geetorusai issue approvals <issue-id>
npx geetorusai issue approval:link <issue-id> <approval-id>
npx geetorusai issue approval:unlink <issue-id> <approval-id>
npx geetorusai issue read <issue-id>
npx geetorusai issue unread <issue-id>
npx geetorusai issue archive <issue-id>
npx geetorusai issue unarchive <issue-id>
npx geetorusai issue recovery-actions <issue-id>
npx geetorusai issue recovery:resolve <issue-id> --outcome restored --source-issue-status todo
```

```sh
npx geetorusai issue documents <issue-id> [--include-system]
npx geetorusai issue document:get <issue-id> <key>
npx geetorusai issue document:put <issue-id> <key> --body-file ./plan.md [--title Plan]
npx geetorusai issue document:lock <issue-id> <key>
npx geetorusai issue document:unlock <issue-id> <key>
npx geetorusai issue document:revisions <issue-id> <key>
npx geetorusai issue document:restore <issue-id> <key> <revision-id>
npx geetorusai issue document:delete <issue-id> <key>
```

```sh
npx geetorusai issue work-products <issue-id>
npx geetorusai issue work-product:create <issue-id> --payload-json '{"type":"pull_request","provider":"github","title":"PR"}'
npx geetorusai issue work-product:update <work-product-id> --payload-json '{"status":"archived"}'
npx geetorusai issue work-product:delete <work-product-id>
npx geetorusai issue interactions <issue-id>
npx geetorusai issue interaction:create <issue-id> --payload-json '{"kind":"request_confirmation","payload":{"version":1,"prompt":"Continue?"}}'
npx geetorusai issue interaction:accept <issue-id> <interaction-id> [--selected-client-keys key1,key2]
npx geetorusai issue interaction:reject <issue-id> <interaction-id> [--reason "..."]
npx geetorusai issue interaction:respond <issue-id> <interaction-id> --answers-json '[{"questionId":"q1","optionIds":["yes"]}]'
npx geetorusai issue interaction:cancel <issue-id> <interaction-id> [--reason "..."]
```

```sh
npx geetorusai issue tree-state <issue-id>
npx geetorusai issue tree-preview <issue-id> --payload-json '{"mode":"pause"}'
npx geetorusai issue tree-holds <issue-id> [--status active] [--include-members]
npx geetorusai issue tree-hold:create <issue-id> --payload-json '{"mode":"pause","reason":"review"}'
npx geetorusai issue tree-hold:get <issue-id> <hold-id>
npx geetorusai issue tree-hold:release <issue-id> <hold-id> [--payload-json '{"reason":"done"}']
npx geetorusai issue attachments <issue-id>
npx geetorusai issue attachment:upload <issue-id> --company-id <company-id> --file ./artifact.txt
npx geetorusai issue attachment:download <attachment-id> [--out ./artifact.txt]
npx geetorusai issue attachment:delete <attachment-id>
npx geetorusai issue label:list --company-id <company-id>
npx geetorusai issue label:create --company-id <company-id> --name bug --color '#ff0000'
npx geetorusai issue label:delete <label-id>
npx geetorusai issue feedback:votes <issue-id>
npx geetorusai issue feedback:vote <issue-id> --payload-json '{"targetType":"issue_comment","targetId":"...","vote":"up"}'
```

## Project Commands

```sh
npx geetorusai project list --company-id <company-id>
npx geetorusai project get <project-id-or-shortname> [--company-id <company-id>]
npx geetorusai project create --company-id <company-id> --name "Launch Site" [--goal-ids <id1,id2>] [--lead-agent-id <id>]
npx geetorusai project update <project-id-or-shortname> [--status in_progress] [--company-id <company-id>]
npx geetorusai project delete <project-id-or-shortname> --yes [--company-id <company-id>]
```

Advanced project fields accept JSON:

```sh
npx geetorusai project create --company-id <company-id> --name "Ops" --env-json '{"OPENAI_API_KEY":{"kind":"secret","secretName":"openai-api-key"}}'
npx geetorusai project update <project-id> --execution-workspace-policy-json '{"enabled":true,"defaultMode":"shared_workspace"}'
```

## Goal Commands

```sh
npx geetorusai goal list --company-id <company-id>
npx geetorusai goal get <goal-id>
npx geetorusai goal create --company-id <company-id> --title "Grow revenue" [--level company] [--status active]
npx geetorusai goal update <goal-id> [--title "..."] [--status achieved]
npx geetorusai goal delete <goal-id> --yes
```

## Agent Commands

```sh
npx geetorusai agent list --company-id <company-id>
npx geetorusai agent get <agent-id>
npx geetorusai agent create --company-id <company-id> --payload-json '{"name":"Builder","adapterType":"codex_local"}'
npx geetorusai agent hire --company-id <company-id> --payload-json '{...}'
npx geetorusai agent update <agent-id> --payload-json '{"title":"Senior Builder"}'
npx geetorusai agent delete <agent-id> --yes
npx geetorusai agent me
npx geetorusai agent inbox
npx geetorusai agent inbox-mine --user-id <board-user-id>
npx geetorusai agent wake <agent-id-or-shortname> [--company-id <company-id>] [--reason "..."] [--payload '{"issueId":"..."}']
npx geetorusai agent pause <agent-id>
npx geetorusai agent resume <agent-id>
npx geetorusai agent approve <agent-id>
npx geetorusai agent terminate <agent-id>
npx geetorusai agent heartbeat:invoke <agent-id>
npx geetorusai agent claude-login <agent-id>
npx geetorusai agent local-cli <agent-id-or-shortname> --company-id <company-id>
```

Agent configuration and runtime endpoints:

```sh
npx geetorusai agent permissions:update <agent-id> --payload-json '{"canCreateAgents":true,"canCreateSkills":true,"canAssignTasks":true}'
npx geetorusai agent configuration <agent-id>
npx geetorusai agent config-revisions <agent-id>
npx geetorusai agent config-revision:get <agent-id> <revision-id>
npx geetorusai agent config-revision:rollback <agent-id> <revision-id>
npx geetorusai agent runtime-state <agent-id>
npx geetorusai agent runtime-state:reset-session <agent-id> [--task-key <key>]
npx geetorusai agent task-sessions <agent-id>
npx geetorusai agent skills <agent-id>
npx geetorusai agent skills:sync <agent-id> --desired-skills geetorus,github --mode add
npx geetorusai agent instructions-path:update <agent-id> --payload-json '{"path":"/path/to/AGENTS.md"}'
npx geetorusai agent instructions-bundle <agent-id>
npx geetorusai agent instructions-bundle:update <agent-id> --payload-json '{"mode":"managed"}'
npx geetorusai agent instructions-file:get <agent-id> --path AGENTS.md
npx geetorusai agent instructions-file:put <agent-id> --path AGENTS.md --content-file ./AGENTS.md
npx geetorusai agent instructions-file:delete <agent-id> --path AGENTS.md
```

Agent config, instructions, skills, project env, environment, secret, and workspace edits affect the next run. Active runs finish with the config they started with. When a saved session, reused workspace, or sandbox lease no longer matches the effective next-run config, Geetorus may start fresh execution and records non-sensitive freshness categories in run result JSON and workspace operation logs.

`agent local-cli` is the quickest way to run local Claude/Codex manually as a Geetorus agent:

- creates a new long-lived agent API key
- installs missing Geetorus skills into `~/.codex/skills` and `~/.claude/skills`
- prints `export ...` lines for `GEETORUS_API_URL`, `GEETORUS_COMPANY_ID`, `GEETORUS_AGENT_ID`, and `GEETORUS_API_KEY`

Example for shortname-based local setup:

```sh
npx geetorusai agent local-cli codexcoder --company-id <company-id>
npx geetorusai agent local-cli claudecoder --company-id <company-id>
```

## Token Commands

Agent API keys are scoped to one company and one agent. Plaintext tokens are printed once at creation.

```sh
npx geetorusai token agent create --company-id <company-id> --agent <agent-id-or-name> --name external-worker
npx geetorusai token agent list --company-id <company-id> --agent <agent-id-or-name>
npx geetorusai token agent revoke --company-id <company-id> --agent <agent-id-or-name> <key-id>
```

Named board API keys use the board authorization model, support revocation and expiration metadata, and are audited server-side.

```sh
npx geetorusai token board create --company-id <company-id> --name external-admin
npx geetorusai token board create --name short-lived --ttl-days 7
npx geetorusai token board list
npx geetorusai token board revoke <key-id>
```

## Run Commands

`geetorusai run` without a subcommand still bootstraps and starts a local Geetorus instance. The subcommands below inspect and control API heartbeat runs.

```sh
npx geetorusai run list --company-id <company-id> [--agent-id <agent-id>] [--limit 50]
npx geetorusai run live --company-id <company-id> [--limit 50] [--min-count 0]
npx geetorusai run get <run-id>
npx geetorusai run events <run-id> [--after-seq 0] [--limit 200]
npx geetorusai run log <run-id> [--offset 0] [--limit-bytes 16384] [--text]
npx geetorusai run cancel <run-id>
npx geetorusai run issues <run-id>
npx geetorusai run workspace-operations <run-id>
npx geetorusai run workspace-log <operation-id> [--offset 0] [--limit-bytes 16384] [--text]
npx geetorusai run watchdog-decision <run-id> --decision continue [--reason "..."]
```

## Routine Commands

`geetorusai routines disable-all` remains the local maintenance command. The singular `routine` group maps to the REST API.

```sh
npx geetorusai routine list --company-id <company-id> [--project-id <project-id>]
npx geetorusai routine create --company-id <company-id> --payload-json '{...}'
npx geetorusai routine get <routine-id>
npx geetorusai routine update <routine-id> --payload-json '{...}'
npx geetorusai routine revisions <routine-id>
npx geetorusai routine revision:restore <routine-id> <revision-id>
npx geetorusai routine runs <routine-id> [--limit 50]
npx geetorusai routine run <routine-id> [--payload-json '{...}']
npx geetorusai routine trigger:create <routine-id> --payload-json '{...}'
npx geetorusai routine trigger:update <trigger-id> --payload-json '{...}'
npx geetorusai routine trigger:delete <trigger-id>
npx geetorusai routine trigger:rotate-secret <trigger-id>
npx geetorusai routine trigger:fire <public-id> [--payload-json '{...}']
```

## Prompt Handoff

Prompt handoff creates Geetorus work. It does not create a chat session.

```sh
npx geetorusai agent-prompt <agent-name-or-id> <agent-api-key> "Prompt here"
npx geetorusai agent prompt --agent <agent-name-or-id> --api-key-env GEETORUS_API_KEY "Prompt here"
npx geetorusai agent prompt --profile my-agent "Prompt here"
npx geetorusai board prompt --company-id <company-id> --agent <agent-name-or-id> "Prompt here"
```

By default the command creates a `todo` issue assigned to the target agent and wakes the agent. Use `--issue <issue-id>` to add a comment to existing work, and `--no-wake` to skip the wakeup.

## Skills Commands

`geetorusai skills` covers three distinct operations:

1. **Company install** — adds or updates a row in `company_skills` for the
   whole company. This is what `skills install`, `skills import`, `skills create`,
   and `skills scan-projects` do.
2. **Agent attach** — merges an agent's *desired* company skill set with an
   explicit `add`, `remove`, or `replace` mode (`skills agent sync`/`clear`).
   This is a desired-state operation on the agent's adapter config; it does not
   change the company library.
3. **Adapter runtime sync** — the adapter reconciles the desired skill set
   with files on disk and reports an `AgentSkillSnapshot` (`skills agent list`).
   `skills agent sync` triggers this automatically after updating desired state.

Required Geetorus runtime skills (heartbeat, etc.) remain server-enforced and
are added on top of whatever the desired set names.

Company skill mutations (`skills install`, `skills import`, `skills create`, and
`skills scan-projects`) are open to same-company actors by default. Missing
`skills:create` grants and `canCreateSkills` settings do not deny these commands;
only an explicit company skill policy restriction does. Core safety and company
boundary checks still apply, and `agents:create` remains required when a command
also creates agents.

### Catalog (app-shipped skills)

The Geetorus app ships a curated catalog under `@geetorusai/skills-catalog`.
Browse and inspect commands never mutate company state; `install` adds a catalog
skill to the company library.

```sh
npx geetorusai skills browse [--kind bundled|optional] [--category <slug>] [--query <text>]
npx geetorusai skills search "<text>" [--kind bundled|optional] [--category <slug>]
npx geetorusai skills inspect <catalog-id-or-key-or-slug>
npx geetorusai skills install <catalog-id-or-key-or-slug> [--as <slug>] [--force] --company-id <company-id>
```

Catalog semantics:

- **Bundled** skills live in `packages/skills-catalog/catalog/bundled/<category>/<slug>`
  and are recommended defaults for most companies. They use canonical key
  `geetorusai/bundled/<category>/<slug>`.
- **Optional** skills live in `packages/skills-catalog/catalog/optional/<category>/<slug>`
  and are role-specific or domain-specific (browser, AWS ops, etc.). Same key
  shape with `optional` in place of `bundled`.
- `skills install` materializes the catalog files into a company-managed skill
  directory and records provenance (`catalogId`, `catalogKey`, `packageVersion`,
  `originHash`, …) so future updates and audit decisions stay consistent.
- `--as <slug>` overrides the company skill slug. `--force` may replace a
  same-key catalog-managed skill but never bypasses hard validation or hard-stop
  audit findings.

Examples:

```sh
npx geetorusai skills browse --kind bundled --company-id <company-id>
npx geetorusai skills search "pull request" --kind bundled
npx geetorusai skills inspect github-pr-workflow
npx geetorusai skills install github-pr-workflow --company-id <company-id>
npx geetorusai skills install geetorusai:optional:browser:agent-browser --company-id <company-id>
```

External GitHub, skills.sh, local-path, and URL sources still go through
`skills import`; catalog commands are for the app-shipped catalog only.

### Organization library

```sh
npx geetorusai skills list --company-id <company-id>
npx geetorusai skills show <skill-id-or-key-or-slug> --company-id <company-id>
npx geetorusai skills file <skill-id-or-key-or-slug> [--path SKILL.md] --company-id <company-id>
npx geetorusai skills import <source> --company-id <company-id>
npx geetorusai skills create --name "Review PRs" [--slug review-prs] [--description "..."] [--body-file SKILL.md] --company-id <company-id>
npx geetorusai skills scan-projects [--project-id <id>...] [--workspace-id <id>...] --company-id <company-id>
npx geetorusai skills check [skill-id-or-key-or-slug] --company-id <company-id>
npx geetorusai skills update <skill-id-or-key-or-slug> [--force] --company-id <company-id>
npx geetorusai skills update --all [--force] --company-id <company-id>
npx geetorusai skills audit [skill-id-or-key-or-slug] --company-id <company-id>
npx geetorusai skills reset <skill-id-or-key-or-slug> [--yes] [--force] --company-id <company-id>
npx geetorusai skills remove <skill-id-or-key-or-slug> --yes --company-id <company-id>
```

`skills import <source>` accepts a skills.sh URL, the equivalent
`<owner>/<repo>/<skill>` shorthand, a GitHub URL, a local path, or an
`npx skills add …` command. See `references/company-skills.md` in the agent
skill bundle for the source-type table.

`skills check`, `skills update`, `skills audit`, and `skills reset` are the
maintenance loop for catalog-installed skills:

- `check` reports whether each skill's installed bytes match its pinned origin
  (`hasUpdate`, `installedHash`, `originHash`, `updateHoldReason`,
  `auditVerdict`).
- `update` installs the pinned update through the existing install-update API.
  `--all` checks every company skill and updates only those with
  `hasUpdate=true`. `--force` discards local-modification or soft-audit holds;
  hard-stop audit findings still block the update.
- `audit` re-scans installed bytes and reports findings without executing
  anything.
- `reset` reinstalls a catalog-managed skill from its pinned origin, discarding
  local edits. Prompts in a TTY; requires `--yes` for non-interactive use.

### Agent attach

```sh
npx geetorusai skills agent list <agent-id-or-shortname> --company-id <company-id>
npx geetorusai skills agent sync <agent-id-or-shortname> --skill <skill-id-or-key-or-slug> [--skill <skill-id-or-key-or-slug>...] --mode <add|remove|replace> --company-id <company-id>
npx geetorusai skills agent clear <agent-id-or-shortname> --yes --company-id <company-id>
```

`skills agent sync` requires a merge mode and returns the resulting adapter
`AgentSkillSnapshot`. `add` preserves all unnamed assignments, `remove` deletes
only named assignments, and `replace` destructively overwrites the complete
non-required desired skill set.
`skills agent clear` sends an empty desired list. Required Geetorus skills are
still enforced by the server in both cases.

### Notes

- Skill references accept company skill `id`, canonical `key`, or unique
  `slug`; catalog references accept catalog `id`, `key`, or unique `slug`.
- `skills file` prints raw file content in human mode so it can be piped.
- `skills create --body-file -` reads the skill markdown body from stdin.
- `skills remove`, `skills reset`, and `skills agent clear` prompt in a TTY and
  require `--yes` in non-interactive use.
- `--json` prints the raw API result for each command.

## Teams Commands

`geetorusai teams` works with the app-shipped team catalog in
`@geetorusai/teams-catalog`. Browse, search, inspect, and file reads do not
change company state. `preview` runs the company import planner, and `install`
imports the catalog team into an existing company.

```sh
npx geetorusai teams browse [--kind bundled|optional] [--category <slug>] [--query <text>]
npx geetorusai teams search "<text>" [--kind bundled|optional] [--category <slug>]
npx geetorusai teams inspect <catalog-id-or-key-or-slug> [--file TEAM.md]
npx geetorusai teams preview <catalog-id-or-key-or-slug> --company-id <company-id>
npx geetorusai teams install <catalog-id-or-key-or-slug> --company-id <company-id>
```

Preview/install options:

- Under agent authentication, use `geetorusai company list --json`,
  `geetorusai company current --json`, or `GEETORUS_COMPANY_ID` to select the
  target company. `company list` falls back to the scoped current company when
  board-wide listing is forbidden. `teams install` creates agents and therefore
  requires board authentication, an `agents:create` grant, or an agent with the
  `canCreateAgents` permission (enabled by default for newly created
  standard-trust agents; low-trust agents and pre-existing agents without an
  explicit value stay disabled).
- `--request-approval-on-forbidden` turns a 403 install denial into a linked
  board approval request instead of a raw failed command; use
  `--approval-issue-id <id>` to attach it to a specific issue. During Geetorus
  task runs with `GEETORUS_TASK_ID` set, this fallback is automatic so
  agent-run walkthroughs leave a pending approval path instead of a raw 403.
- `--target-manager-agent-id <id>` or `--target-manager-slug <slug>` reparents
  catalog root agents under an existing manager.
- `--agent <slug>` and `--selected-file <path>` narrow the import.
- `--collision-strategy rename|skip|replace` controls name/key collisions.
- `--allow-external-sources`, `--allow-unpinned-optional-sources`, and
  `--allow-local-path-sources` explicitly opt into higher-trust source policy.
  Local-path sources are development-only and stay blocked unless that flag is
  passed.

## Secrets Commands

```sh
npx geetorusai secrets list --company-id <company-id>
npx geetorusai secrets declarations --company-id <company-id> [--include agents,projects] [--kind secret]
npx geetorusai secrets create --company-id <company-id> --name anthropic-api-key --value-env ANTHROPIC_API_KEY
npx geetorusai secrets link --company-id <company-id> --name prod-stripe-key --provider aws_secrets_manager --external-ref <provider-ref>
npx geetorusai secrets doctor --company-id <company-id>
npx geetorusai secrets provider-configs --company-id <company-id>
npx geetorusai secrets provider-config:create --company-id <company-id> --payload-json '{...}'
npx geetorusai secrets provider-config:discovery-preview --company-id <company-id> --payload-json '{...}'
npx geetorusai secrets provider-config:get <config-id>
npx geetorusai secrets provider-config:update <config-id> --payload-json '{...}'
npx geetorusai secrets provider-config:default <config-id>
npx geetorusai secrets provider-config:health <config-id>
npx geetorusai secrets provider-config:delete <config-id>
npx geetorusai secrets remote-import:preview --company-id <company-id> --payload-json '{...}'
npx geetorusai secrets remote-import --company-id <company-id> --payload-json '{...}'
npx geetorusai secrets migrate-inline-env --company-id <company-id> [--apply]
```

Secret listing and declarations never print secret values. `create` accepts
`--value-env` so shell history does not capture the value. `link` records
provider-owned references without copying the secret value into Geetorus.
For AWS-backed secrets, `secrets doctor` reports missing non-secret provider
env and the expected AWS SDK runtime credential source; do not store AWS
bootstrap credentials in Geetorus secrets.

Per-company provider vaults (multiple vault instances per provider, default
vault selection, coming-soon GCP/Vault) can be configured from the board UI under
`Organization Settings → Secrets → Provider vaults` or through the provider-config CLI
commands above. See the
[secrets deploy guide](../docs/deploy/secrets.md#provider-vaults) and
[API reference](../docs/api/secrets.md#provider-vaults) for the contract.

## Approval Commands

```sh
npx geetorusai approval list --company-id <company-id> [--status pending]
npx geetorusai approval get <approval-id>
npx geetorusai approval create --company-id <company-id> --type hire_agent --payload '{"name":"..."}' [--issue-ids <id1,id2>]
npx geetorusai approval approve <approval-id> [--decision-note "..."]
npx geetorusai approval reject <approval-id> [--decision-note "..."]
npx geetorusai approval request-revision <approval-id> [--decision-note "..."]
npx geetorusai approval resubmit <approval-id> [--payload '{"...":"..."}']
npx geetorusai approval comment <approval-id> --body "..."
```

## Activity Commands

```sh
npx geetorusai activity list --company-id <company-id> [--agent-id <agent-id>] [--entity-type issue] [--entity-id <id>]
npx geetorusai activity create --company-id <company-id> --payload-json '{...}'
npx geetorusai activity issue <issue-id>
```

## Dashboard Commands

```sh
npx geetorusai dashboard get --company-id <company-id>
```

## Org And Agent Config Commands

```sh
npx geetorusai whoami
npx geetorusai openapi
npx geetorusai org get --company-id <company-id>
npx geetorusai org svg --company-id <company-id> [--out org.svg]
npx geetorusai org png --company-id <company-id> [--out org.png]
npx geetorusai agent-config list --company-id <company-id>
```

## Access, Profile, And Instance Commands

```sh
npx geetorusai profile session
npx geetorusai profile get
npx geetorusai profile update --payload-json '{...}'
npx geetorusai profile company-user <user-slug> --company-id <company-id>
npx geetorusai invite list --company-id <company-id>
npx geetorusai invite create --company-id <company-id> --payload-json '{...}'
npx geetorusai invite revoke <invite-id>
npx geetorusai invite show <token>
npx geetorusai invite accept <token> [--payload-json '{...}']
npx geetorusai invite onboarding:text <token>
npx geetorusai join list --company-id <company-id> [--status pending_approval]
npx geetorusai join approve <request-id> --company-id <company-id>
npx geetorusai join reject <request-id> --company-id <company-id>
npx geetorusai join claim-key <request-id> --claim-secret <secret>
npx geetorusai member list --company-id <company-id>
npx geetorusai member update <member-id> --company-id <company-id> --payload-json '{...}'
npx geetorusai member role-and-grants <member-id> --company-id <company-id> --payload-json '{...}'
npx geetorusai member permissions <member-id> --company-id <company-id> --payload-json '{...}'
npx geetorusai member archive <member-id> --company-id <company-id> [--payload-json '{...}']
npx geetorusai admin user list [--query <text>]
npx geetorusai admin user promote <user-id>
npx geetorusai admin user demote <user-id>
npx geetorusai admin user company-access <user-id>
npx geetorusai admin user company-access:update <user-id> --payload-json '{...}'
```

CLI auth challenge endpoints are also exposed for tooling that needs the raw challenge lifecycle:

```sh
npx geetorusai auth challenge create --payload-json '{...}'
GEETORUS_CHALLENGE_SECRET=<challenge-secret> npx geetorusai auth challenge get <challenge-id> --token-env GEETORUS_CHALLENGE_SECRET
GEETORUS_CHALLENGE_SECRET=<challenge-secret> npx geetorusai auth challenge approve <challenge-id> --token-env GEETORUS_CHALLENGE_SECRET
GEETORUS_CHALLENGE_SECRET=<challenge-secret> npx geetorusai auth challenge cancel <challenge-id> --token-env GEETORUS_CHALLENGE_SECRET
npx geetorusai auth revoke-current
```

`--token <challenge-secret>` is still supported for compatibility, but `--token-env` avoids putting challenge secrets in shell history or process arguments.

## Instance Settings Commands

```sh
npx geetorusai instance scheduler-heartbeats
npx geetorusai instance settings:general
npx geetorusai instance settings:general:update --payload-json '{...}'
npx geetorusai instance settings:experimental
npx geetorusai instance settings:experimental:update --payload-json '{...}'
npx geetorusai instance database-backup
```

Experimental features are opt-in and are provided without compatibility guarantees. They may break, change, or be removed at any time. Use them at your own risk.

```sh
npx geetorusai sidebar preferences
npx geetorusai sidebar preferences:update --payload-json '{...}'
npx geetorusai sidebar project-preferences --company-id <company-id>
npx geetorusai sidebar project-preferences:update --company-id <company-id> --payload-json '{...}'
npx geetorusai sidebar badges --company-id <company-id>
npx geetorusai inbox dismissals --company-id <company-id>
npx geetorusai inbox dismiss --company-id <company-id> --payload-json '{"itemKey":"run:<run-id>"}'
npx geetorusai board-claim show <token>
npx geetorusai board-claim claim <token> [--payload-json '{...}']
npx geetorusai openclaw invite-prompt --company-id <company-id> --payload-json '{...}'
npx geetorusai available-skill list
npx geetorusai available-skill index
npx geetorusai available-skill get <skill-name>
npx geetorusai llm agent-configuration
npx geetorusai llm agent-configuration:adapter <adapter-type>
npx geetorusai llm agent-icons
```

Hermes gateway uses the generic invite/join commands above rather than
`openclaw invite-prompt`. Create an agent invite, read
`invite onboarding:text`, submit a join request with
`adapterType: "hermes_gateway"` and `agentDefaultsPayload.apiBaseUrl` /
`agentDefaultsPayload.apiKey`, then approve and claim the key with the `join`
commands. See [HERMES_GATEWAY_ONBOARDING.md](./HERMES_GATEWAY_ONBOARDING.md).

## Adapter, Asset, And Skill Commands

```sh
npx geetorusai adapter list
npx geetorusai adapter install --payload-json '{"packageName":"@scope/adapter","version":"1.2.3"}'
npx geetorusai adapter get <adapter-type>
npx geetorusai adapter update <adapter-type> --payload-json '{"disabled":true}'
npx geetorusai adapter override <adapter-type> --payload-json '{"paused":true}'
npx geetorusai adapter reload <adapter-type>
npx geetorusai adapter reinstall <adapter-type>
npx geetorusai adapter delete <adapter-type>
npx geetorusai adapter config-schema <adapter-type>
npx geetorusai adapter ui-parser <adapter-type>
npx geetorusai adapter models <adapter-type> --company-id <company-id> [--refresh] [--environment-id <id>]
npx geetorusai adapter detect-model <adapter-type> --company-id <company-id>
npx geetorusai adapter test-environment <adapter-type> --company-id <company-id> --payload-json '{...}'
```

```sh
npx geetorusai asset image:upload --company-id <company-id> --file ./image.png [--namespace docs] [--alt "..."]
npx geetorusai asset logo:upload --company-id <company-id> --file ./logo.svg
npx geetorusai asset content <asset-id> --out ./asset.bin
```

```sh
npx geetorusai skill list --company-id <company-id>
npx geetorusai skill get <skill-id> --company-id <company-id>
npx geetorusai skill file <skill-id> --company-id <company-id> [--path SKILL.md]
npx geetorusai skill create --company-id <company-id> --payload-json '{...}'
npx geetorusai skill file:update <skill-id> --company-id <company-id> --payload-json '{...}'
npx geetorusai skill import --company-id <company-id> --payload-json '{"source":"github:owner/repo/path"}'
npx geetorusai skill scan-projects --company-id <company-id> --payload-json '{...}'
npx geetorusai skill update-status <skill-id> --company-id <company-id>
npx geetorusai skill install-update <skill-id> --company-id <company-id>
npx geetorusai skill delete <skill-id> --company-id <company-id>
```

## Cost, Finance, And Budget Commands

```sh
npx geetorusai cost summary --company-id <company-id>
npx geetorusai cost by-agent --company-id <company-id>
npx geetorusai cost by-agent-model --company-id <company-id>
npx geetorusai cost by-provider --company-id <company-id>
npx geetorusai cost by-biller --company-id <company-id>
npx geetorusai cost by-project --company-id <company-id>
npx geetorusai cost window-spend --company-id <company-id>
npx geetorusai cost quota-windows --company-id <company-id>
npx geetorusai cost issue <issue-id>
npx geetorusai cost event:create --company-id <company-id> --payload-json '{...}'
```

```sh
npx geetorusai finance event:create --company-id <company-id> --payload-json '{...}'
npx geetorusai finance events --company-id <company-id>
npx geetorusai finance summary --company-id <company-id>
npx geetorusai finance by-biller --company-id <company-id>
npx geetorusai finance by-kind --company-id <company-id>
npx geetorusai budget overview --company-id <company-id>
npx geetorusai budget policy:upsert --company-id <company-id> --payload-json '{...}'
npx geetorusai budget company:update --company-id <company-id> --payload-json '{...}'
npx geetorusai budget agent:update <agent-id> --payload-json '{...}'
npx geetorusai budget incident:resolve <incident-id> --company-id <company-id> [--payload-json '{...}']
```

## Workspace And Environment Commands

```sh
npx geetorusai workspace list --company-id <company-id>
npx geetorusai workspace get <execution-workspace-id>
npx geetorusai workspace close-readiness <execution-workspace-id>
npx geetorusai workspace operations <execution-workspace-id>
npx geetorusai workspace update <execution-workspace-id> --payload-json '{...}'
npx geetorusai workspace runtime-service <execution-workspace-id> start --payload-json '{...}'
npx geetorusai workspace runtime-command <execution-workspace-id> run --payload-json '{...}'
```

```sh
npx geetorusai environment list --company-id <company-id>
npx geetorusai environment capabilities --company-id <company-id>
npx geetorusai environment create --company-id <company-id> --payload-json '{...}'
npx geetorusai environment get <environment-id>
npx geetorusai environment leases <environment-id>
npx geetorusai environment lease <lease-id>
npx geetorusai environment update <environment-id> --payload-json '{...}'
npx geetorusai environment delete <environment-id>
npx geetorusai environment probe <environment-id>
npx geetorusai environment probe-config --company-id <company-id> --payload-json '{...}'
```

```sh
npx geetorusai project-workspace list <project-id>
npx geetorusai project-workspace create <project-id> --payload-json '{...}'
npx geetorusai project-workspace update <project-id> <workspace-id> --payload-json '{...}'
npx geetorusai project-workspace delete <project-id> <workspace-id>
npx geetorusai project-workspace runtime-service <project-id> <workspace-id> restart --payload-json '{...}'
npx geetorusai project-workspace runtime-command <project-id> <workspace-id> run --payload-json '{...}'
```

## Plugin Commands

Existing plugin lifecycle commands remain available: `plugin init`, `list`, `install`, `uninstall`, `enable`, `disable`, `inspect`, and `examples`.

```sh
npx geetorusai plugin ui-contributions
npx geetorusai plugin tools
npx geetorusai plugin tool:execute --payload-json '{...}'
npx geetorusai plugin health <plugin-id>
npx geetorusai plugin logs <plugin-id>
npx geetorusai plugin upgrade <plugin-id>
npx geetorusai plugin config <plugin-id> --company-id <company-id>
npx geetorusai plugin config:set <plugin-id> --company-id <company-id> --payload-json '{"configJson":{...}}'
npx geetorusai plugin config:test <plugin-id> --company-id <company-id> --payload-json '{"configJson":{...}}'
npx geetorusai plugin jobs <plugin-id>
npx geetorusai plugin job:runs <plugin-id> <job-id>
npx geetorusai plugin job:trigger <plugin-id> <job-id> [--payload-json '{...}']
npx geetorusai plugin webhook <plugin-id> <endpoint-key> [--payload-json '{...}']
npx geetorusai plugin dashboard <plugin-id>
npx geetorusai plugin bridge:data <plugin-id> --payload-json '{...}'
npx geetorusai plugin bridge:action <plugin-id> --payload-json '{...}'
npx geetorusai plugin bridge:stream <plugin-id> <channel> [--duration-ms 10000]
npx geetorusai plugin data <plugin-id> <key> --payload-json '{...}'
npx geetorusai plugin action <plugin-id> <key> --payload-json '{...}'
npx geetorusai plugin local-folders <plugin-id> --company-id <company-id>
npx geetorusai plugin local-folder:status <plugin-id> <folder-key> --company-id <company-id>
npx geetorusai plugin local-folder:validate <plugin-id> <folder-key> --company-id <company-id> [--payload-json '{...}']
npx geetorusai plugin local-folder:set <plugin-id> <folder-key> --company-id <company-id> --payload-json '{...}'
```

Feedback traces can be fetched directly by ID when automating export workflows:

```sh
npx geetorusai feedback trace <trace-id>
npx geetorusai feedback bundle <trace-id>
```

## Heartbeat Command

`heartbeat run` now also supports context/api-key options and uses the shared client stack:

```sh
npx geetorusai heartbeat run --agent-id <agent-id> [--api-base http://localhost:3100] [--api-key <token>]
```

## Local Storage Defaults

Local Geetorus data lives under the selected instance root. `GEETORUS_HOME` chooses the home directory and `GEETORUS_INSTANCE_ID` chooses the instance.

```text
~/.geetorus/                                     # GEETORUS_HOME
└── instances/
    └── default/                                  # instance root (GEETORUS_INSTANCE_ID)
        ├── config.json                           # runtime config
        ├── .env                                  # instance env file
        ├── db/                                   # embedded PostgreSQL data
        ├── data/
        │   ├── storage/                          # local_disk uploads
        │   └── backups/                          # automatic DB backups
        ├── logs/
        ├── secrets/
        │   └── master.key                        # local_encrypted master key
        ├── workspaces/                           # default agent workspaces
        ├── projects/                             # project execution workspaces
        ├── companies/                            # per-company adapter homes (e.g. codex-home)
        └── codex-home/                           # per-instance codex home (when not company-scoped)
```

Default paths for the canonical install:

- config: `~/.geetorus/instances/default/config.json`
- embedded db: `~/.geetorus/instances/default/db`
- logs: `~/.geetorus/instances/default/logs`
- storage: `~/.geetorus/instances/default/data/storage`
- secrets key: `~/.geetorus/instances/default/secrets/master.key`

Override base home or instance with env vars:

```sh
GEETORUS_HOME=/custom/home GEETORUS_INSTANCE_ID=dev pnpm geetorusai run
```

## Storage Configuration

Configure storage provider and settings:

```sh
pnpm geetorusai configure --section storage
```

Supported providers:

- `local_disk` (default; local single-user installs)
- `s3` (S3-compatible object storage)
