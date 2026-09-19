# Hermes Gateway Adapter Compatibility Shim

`@geetorusai/adapter-hermes-gateway` is a deprecated compatibility shim.

Use `@geetorusai/hermes-geetorus-adapter` for new installs and import gateway
entrypoints from `@geetorusai/hermes-geetorus-adapter/gateway`. The adapter
type remains `hermes_gateway`; only package ownership changed.

`hermes_gateway` is for an already-running Hermes API server. It does not start
the local Hermes CLI. If Geetorus should launch local `hermes chat` as a child
process, use `hermes_local` from `@geetorusai/hermes-geetorus-adapter`
instead.

The shim preserves the legacy exports for one release:

- `.`
- `./server`
- `./ui`
- `./cli`
- `./ui-parser`

These exports forward to the unified Hermes package. Existing
`@geetorusai/adapter-hermes-gateway` plugin installs should continue to load
during the compatibility window, but should migrate to
`@geetorusai/hermes-geetorus-adapter` before the shim is removed.
