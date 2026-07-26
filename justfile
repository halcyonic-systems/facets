# bert-lenses tasks. Rust is the brain (wasm), web/ is the face.
# A crate change must never silently serve stale wasm to web/ — `wasm` rebuilds
# the pkg, and `check` runs the full gate suite the CI enforces.

kernel := "crates/bert-lenses-kernel"

# List recipes.
default:
    @just --list

# Check every tool `dev`, `check` and `desktop` need, and print the exact install
# line for whatever is missing. Run this first on a cold clone: the one thing it
# cannot check is `just` itself, and README's Prerequisites carries that line.
preflight:
    #!/usr/bin/env bash
    set -uo pipefail
    missing=0
    have() { command -v "$1" >/dev/null 2>&1; }
    ok()   { printf '  ok      %s\n' "$1"; }
    gone() { printf '  MISSING %s\n            %s\n' "$1" "$2"; missing=$((missing+1)); }

    echo "bert-lenses preflight"
    echo

    have python3 && ok "python3          (doc_lint.py — the first step of \`just check\`)" \
      || gone "python3          (doc_lint.py — the first step of \`just check\`)" \
              "macOS: xcode-select --install   ·   Debian/Ubuntu: sudo apt install python3"

    have cargo && ok "rust / cargo     (the kernel)" \
      || gone "rust / cargo     (the kernel)" \
              "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"

    if have rustup; then
      if rustup target list --installed 2>/dev/null | grep -qx wasm32-unknown-unknown; then
        ok "wasm32 target    (rust-toolchain.toml installs it on first cargo run)"
      else
        gone "wasm32 target    (the browser build)" "rustup target add wasm32-unknown-unknown"
      fi
      if rustup component list --installed 2>/dev/null | grep -q '^clippy'; then
        ok "clippy           (the \`-D warnings\` gate)"
      else
        gone "clippy           (the \`-D warnings\` gate)" "rustup component add clippy"
      fi
    else
      gone "rustup           (manages the toolchain, target and clippy)" \
           "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    fi

    have wasm-pack && ok "wasm-pack        (builds the pkg web/ imports)" \
      || gone "wasm-pack        (builds the pkg web/ imports)" \
              "cargo install wasm-pack   (or: brew install wasm-pack)"

    if have node; then
      major=$(node --version | sed 's/^v\([0-9]*\).*/\1/')
      want=$(cat .nvmrc 2>/dev/null || echo 22)
      if [ "$major" -ge "$want" ]; then ok "node $(node --version)     (>= v${want}, per .nvmrc)"
      else gone "node >= v${want}    (yours: $(node --version); .nvmrc pins the floor)" \
                "nvm install   (reads .nvmrc)   ·   or: brew install node"; fi
    else
      gone "node             (the web face)" "nvm install   (reads .nvmrc)   ·   or: brew install node"
    fi

    if [ -d web/node_modules ]; then ok "web/node_modules (installed)"
    else printf '  note    web/node_modules not installed — `just dev` and `just check` install it for you\n'; fi

    have cargo-tauri && ok "cargo-tauri      (\`just desktop\` only)" \
      || printf '  note    cargo-tauri not found — needed only by `just desktop`\n            cargo install tauri-cli --version "^2"\n'

    echo
    if [ "$missing" -eq 0 ]; then
      echo "All set. Next: just dev"
    else
      echo "$missing missing. Install the lines above, then run \`just preflight\` again."
      exit 1
    fi

# Install web/ dependencies if they are not there yet. `dev` and `check` both
# depend on this, so a cold clone can run either without a separate documented
# step. Guarded rather than unconditional: `npm ci` deletes and reinstalls
# node_modules, which is not what you want before every gate run.
web-deps:
    @test -d web/node_modules || (cd web && npm ci)

# Rebuild the wasm pkg the web app consumes (run after any crate change).
wasm:
    cd {{kernel}} && wasm-pack build --target web --out-dir pkg

# Rebuild wasm, then start the vite dev server (face sees the fresh brain).
dev: web-deps wasm
    cd web && npm run dev

# The full gate suite — mirrors CI. Rust brain first, then the web face against
# a freshly built pkg, so a stale-wasm mismatch can never pass silently.
check: web-deps
    python3 scripts/doc_lint.py
    cargo test --workspace
    cargo clippy --workspace --all-targets -- -D warnings
    cargo build --workspace --target wasm32-unknown-unknown
    cd {{kernel}} && wasm-pack build --target web --out-dir pkg
    cd web && npm run check:tokens
    cd web && npx tsc --noEmit
    cd web && npx vitest run
    cd web && npx vite build

# Re-render docs/lean-provenance.md's tables from docs/lean-manifest.json, then
# run Gate A: every cited SSF symbol resolves at the pin WITH its declared kind.
# The tables are generated — edit the manifest, never the doc. `just check` runs
# the read-only half of this (render-check + Gate A when SSF is present) via
# doc_lint; CI's lean-provenance.yml clones SSF so it can never skip.
provenance:
    python3 scripts/lean_provenance.py render
    python3 scripts/lean_provenance.py resolve

# Gate B (mirrors .github/workflows/lean-provenance-head.yml). Non-blocking by
# design: it asks whether the citations still resolve against SSF HEAD, and a
# failure is the trigger to replay the pin, not a reason to fail a PR.
provenance-head:
    python3 scripts/lean_provenance.py resolve --rev origin/main --label "Gate B (SSF HEAD)"

# Execute the shipped wasm package (mirrors .github/workflows/wasm-exec.yml).
# The boundary gate: `cargo test` is native and `vitest` reads committed
# fixtures, so nothing else in this repo runs the marshaling layer the face
# reads every verdict through. The second package carries the panic probe —
# a deliberate panic no release build has — so the trap path is measured
# rather than assumed.
wasm-exec:
    cd {{kernel}} && wasm-pack build --target web --out-dir pkg
    cd {{kernel}} && wasm-pack build --target web --out-dir pkg-probe --features panic-probe
    node scripts/wasm_exec.mjs --probe crates/bert-lenses-kernel/pkg-probe

# Bundle the macOS .app. Builds the same web/dist the served version publishes,
# then wraps it. NOTE: `cargo tauri dev` is a false positive — it serves over
# http://127.0.0.1:1430 and applies devCsp, not the config CSP, so wasm can pass
# there and die in the bundle. Verify with this recipe, never with dev.
desktop: wasm
    cd web && npm run build
    cd src-tauri && cargo tauri build
    @echo "bundle: src-tauri/target/release/bundle/macos/bert-lenses.app"
