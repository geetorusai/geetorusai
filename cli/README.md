# @geetorusai/cli

The official command-line interface for Geetorus — the open-source orchestration platform for teams of AI agents.

## Installation

Run directly with `npx` or install globally:

```bash
# Run without installing
npx geetorusai onboard

# Or install globally via pnpm
pnpm add -g @geetorusai/cli

# Or install globally via npm
npm install -g @geetorusai/cli
```

## Commands

### `geetorusai onboard`

Runs interactive or automated first-run setup to configure the database, environment, and hire your initial agent:

```bash
# Interactive setup
geetorusai onboard

# Non-interactive automated setup (defaults to local loopback)
geetorusai onboard --yes

# Bind to specific network interfaces
geetorusai onboard --yes --bind lan
geetorusai onboard --yes --bind tailnet
```

### `geetorusai start`

Starts the Geetorus API server daemon:

```bash
geetorusai start
```

### `geetorusai configure`

Inspect and update current instance settings and agent configurations:

```bash
geetorusai configure
```

### `geetorusai test-drive`

Boots an isolated, temporary Geetorus foreground instance for testing without altering your main instance:

```bash
# Run with local model or API key
geetorusai test-drive
```

### `geetorusai company`

Export and import complete organization blueprints:

```bash
# Export company blueprint
geetorusai company export <company-id> --out ./backup

# Import company blueprint
geetorusai company import ./backup --dry-run
geetorusai company import ./backup
```

## Development

```bash
# Run CLI from monorepo source
pnpm --filter @geetorusai/cli build
pnpm --filter @geetorusai/cli test
```

## License

MIT © [Geetorus](https://github.com/geetorusai/geetorus)
