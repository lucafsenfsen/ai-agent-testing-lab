#!/bin/bash
# Optional launcher: prefer Node on PATH, otherwise use the existing Codex runtime.
set -eu
LAB_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$LAB_ROOT"
LAB_NODE="$(command -v node || true)"
if [ -z "$LAB_NODE" ]; then
  LAB_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$LAB_NODE" ]; then
  echo 'Node.js 22 or newer is needed. See README.md.' >&2
  exit 1
fi
export PATH="$(dirname "$LAB_NODE"):$PATH"
case "${1:-test}" in
  start) exec "$LAB_NODE" automation/server.cjs ;;
  test) exec "$LAB_NODE" automation/run.cjs all ;;
  todo) shift; exec "$LAB_NODE" automation/run.cjs evaluation "$@" ;;
  dashboard) shift; exec "$LAB_NODE" automation/run.cjs dashboard "$@" ;;
  *) echo 'Usage: bash automation/lab.sh [start|test|todo|dashboard]' >&2; exit 1 ;;
esac
