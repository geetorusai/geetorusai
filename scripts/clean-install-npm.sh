#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PC_INSTALL_DRIVER="${PC_INSTALL_DRIVER:-source}"

PC_TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/geetorus-clean-install.XXXXXX")"
PC_HOME="$PC_TEST_ROOT/home"
PC_CACHE="$PC_TEST_ROOT/npm-cache"
mkdir -p "$PC_HOME" "$PC_CACHE"
trap 'rm -rf "$PC_TEST_ROOT"' EXIT

export HOME="$PC_HOME"
export GEETORUS_HOME="$PC_HOME/.geetorus"
export npm_config_cache="$PC_CACHE"
export npm_config_userconfig="$PC_HOME/.npmrc"
export PATH="$PC_HOME/.local/bin:$PATH"

if [ "$PC_INSTALL_DRIVER" = "published" ]; then
  (cd "$PC_TEST_ROOT" && npx --yes --registry https://registry.npmjs.org geetorusai install)
else
  (cd "$REPO_ROOT" && pnpm geetorusai install --yes)
fi

test -x "$PC_HOME/.local/bin/geetorusai"
test -L "$GEETORUS_HOME/cli/current"
test -f "$GEETORUS_HOME/cli/install.json"
geetorusai --version

mkdir -p "$GEETORUS_HOME/instances/default"
touch "$GEETORUS_HOME/instances/default/user-data-marker"
(cd "$REPO_ROOT" && pnpm geetorusai uninstall)

test ! -e "$GEETORUS_HOME/cli"
test ! -e "$PC_HOME/.local/bin/geetorusai"
test -f "$GEETORUS_HOME/instances/default/user-data-marker"
