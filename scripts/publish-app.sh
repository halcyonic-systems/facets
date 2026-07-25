#!/bin/bash
# Builds the wasm kernel + web frontend and rsyncs the static output to
# ~/halcyonic-apps/bert-lenses/dist, outside ~/Desktop's TCC sandbox so
# launchd (com.halcyonic.bert-lenses) can serve it. Repo stays put; only
# the built dist moves. See docs/running-permanently.md for the full story.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KERNEL_DIR="$REPO_ROOT/crates/bert-lenses-kernel"
WEB_DIR="$REPO_ROOT/web"
PUBLISH_DIR="$HOME/halcyonic-apps/bert-lenses"
SERVER_DIR="$PUBLISH_DIR/server"
PORT=5190

needs_wasm_build() {
  local pkg_js="$KERNEL_DIR/pkg/bert_lenses_kernel.js"
  [ ! -f "$pkg_js" ] && return 0
  find "$KERNEL_DIR/src" "$REPO_ROOT/crates/bert-core/src" \
       "$REPO_ROOT/crates/bert-compose/src" "$REPO_ROOT/crates/bert-canvas/src" \
       "$REPO_ROOT/crates/bert-tether/src" \
       -newer "$pkg_js" -name '*.rs' -print -quit 2>/dev/null | grep -q .
}

if needs_wasm_build; then
  echo "==> Building wasm kernel"
  (cd "$KERNEL_DIR" && wasm-pack build --target web --out-dir pkg)
else
  echo "==> wasm kernel pkg is up to date, skipping"
fi

echo "==> Installing web deps"
(cd "$WEB_DIR" && npm install)

echo "==> Building web frontend"
(cd "$WEB_DIR" && npm run build)

echo "==> Publishing dist to $PUBLISH_DIR"
mkdir -p "$PUBLISH_DIR"
rsync -a --delete "$WEB_DIR/dist/" "$PUBLISH_DIR/dist/"

# The launchd job serves from here, not from web/node_modules, because the repo
# lives under ~/Desktop (TCC-protected) and launchd can't read into it. This is
# a standalone vite install, unrelated to the app's own package.json.
if [ ! -x "$SERVER_DIR/node_modules/.bin/vite" ]; then
  echo "==> Setting up standalone vite server (outside ~/Desktop)"
  mkdir -p "$SERVER_DIR"
  if [ ! -f "$SERVER_DIR/package.json" ]; then
    cat > "$SERVER_DIR/package.json" <<'PKGJSON'
{
  "name": "bert-lenses-serve",
  "private": true,
  "version": "0.0.0",
  "description": "Standalone vite install (outside ~/Desktop's TCC sandbox) used only to run `vite preview` against the published bert-lenses dist. Not the app's real package.json.",
  "devDependencies": {
    "vite": "^6.0.3"
  }
}
PKGJSON
  fi
  (cd "$SERVER_DIR" && npm install)
fi

echo "==> Published. Serve permanently via launchd/com.halcyonic.bert-lenses.plist,"
echo "    or check it now: http://127.0.0.1:$PORT/ (once the launchd service is loaded)"
