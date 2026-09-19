# @geetorusai/ui

Published static assets for the Geetorus board UI.

## What gets published

The npm package contains the production build under `dist/`. It does not ship the UI source tree or workspace-only dependencies.

## Storybook

Storybook config, stories, and fixtures live under `ui/storybook/`.

```sh
pnpm --filter @geetorusai/ui storybook
pnpm --filter @geetorusai/ui build-storybook
```

## Typical use

Install the package, then serve or copy the built files from `node_modules/@geetorusai/ui/dist`.
