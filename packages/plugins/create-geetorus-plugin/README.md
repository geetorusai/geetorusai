# @geetorusai/create-geetorus-plugin

Scaffolding tool for creating new Geetorus plugins.

```bash
npx @geetorusai/create-geetorus-plugin my-plugin
```

Or with options:

```bash
npx @geetorusai/create-geetorus-plugin @acme/my-plugin \
  --template connector \
  --category connector \
  --display-name "Acme Connector" \
  --description "Syncs Acme data into Geetorus" \
  --author "Acme Inc"
```

Supported templates: `default`, `connector`, `workspace`  
Supported categories: `connector`, `workspace`, `automation`, `ui`

Generates:
- typed manifest + worker entrypoint
- example UI widget using the supported `@geetorusai/plugin-sdk/ui` hooks
- test file using `@geetorusai/plugin-sdk/testing`
- `esbuild` and `rollup` config files using SDK bundler presets
- dev server script for hot-reload (`geetorus-plugin-dev-server`)

The scaffold starts with plain React elements so the generated plugin stays minimal. For Geetorus-native controls, import shared host components such as `MarkdownEditor`, `FileTree`, `AssigneePicker`, and `ProjectPicker` from `@geetorusai/plugin-sdk/ui`.

Inside this repo, the generated package uses `@geetorusai/plugin-sdk` via `workspace:*`.

Outside this repo, the scaffold snapshots `@geetorusai/plugin-sdk` from your local Geetorus checkout into a `.geetorus-sdk/` tarball and points the generated package at that local file by default. You can override the SDK source explicitly:

```bash
node packages/plugins/create-geetorus-plugin/dist/bin.js @acme/my-plugin \
  --output /absolute/path/to/plugins \
  --sdk-path /absolute/path/to/geetorus/packages/plugins/sdk
```

That gives you an outside-repo local development path before the SDK is published to npm.

## Workflow after scaffolding

```bash
cd my-plugin
pnpm install
pnpm dev       # watch worker + manifest + ui bundles
pnpm dev:ui    # local UI preview server with hot-reload events
pnpm test
```
