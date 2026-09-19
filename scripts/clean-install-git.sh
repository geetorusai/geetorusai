#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PC_TEST_ROOT="${PC_TEST_ROOT:-$(mktemp -d "${TMPDIR:-/tmp}/geetorus-clean-install-git.XXXXXX")}"
PC_HOME="${PC_HOME:-$PC_TEST_ROOT/home}"
PC_CACHE="${PC_CACHE:-$PC_TEST_ROOT/npm-cache}"
KEEP_TEMP="${KEEP_TEMP:-0}"

cleanup() {
  if [ "$KEEP_TEMP" != "1" ]; then
    rm -rf "$PC_TEST_ROOT"
  fi
}
trap cleanup EXIT

mkdir -p "$PC_HOME" "$PC_CACHE"

echo "REPO_ROOT: $REPO_ROOT"
echo "PC_TEST_ROOT: $PC_TEST_ROOT"
echo "PC_HOME: $PC_HOME"

env \
  HOME="$PC_HOME" \
  GEETORUS_HOME="$PC_HOME/.geetorus" \
  npm_config_cache="$PC_CACHE" \
  npm_config_userconfig="$PC_HOME/.npmrc" \
  PATH="$PC_HOME/.local/bin:$PATH" \
  pnpm --dir "$REPO_ROOT" geetorusai install --yes

test -x "$PC_HOME/.local/bin/geetorusai"
test -L "$PC_HOME/.geetorus/cli/current"
test -f "$PC_HOME/.geetorus/cli/install.json"

env HOME="$PC_HOME" GEETORUS_HOME="$PC_HOME/.geetorus" PATH="$PC_HOME/.local/bin:$PATH" geetorusai --version
env HOME="$PC_HOME" GEETORUS_HOME="$PC_HOME/.geetorus" PATH="$PC_HOME/.local/bin:$PATH" geetorusai doctor \
  --config "$PC_TEST_ROOT/missing-config.json" >/dev/null || true

env \
  HOME="$PC_HOME" \
  GEETORUS_HOME="$PC_HOME/.geetorus" \
  PATH="$PC_HOME/.local/bin:$PATH" \
  pnpm --dir "$REPO_ROOT" geetorusai uninstall

test ! -e "$PC_HOME/.geetorus/cli"
test ! -e "$PC_HOME/.local/bin/geetorusai"
