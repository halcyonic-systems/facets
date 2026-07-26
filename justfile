# bert-lenses tasks. Rust is the brain (wasm), web/ is the face.
# A crate change must never silently serve stale wasm to web/ — `wasm` rebuilds
# the pkg, and `check` runs the full gate suite the CI enforces.

kernel := "crates/bert-lenses-kernel"

# List recipes.
default:
    @just --list

# Rebuild the wasm pkg the web app consumes (run after any crate change).
wasm:
    cd {{kernel}} && wasm-pack build --target web --out-dir pkg

# Rebuild wasm, then start the vite dev server (face sees the fresh brain).
dev: wasm
    cd web && npm run dev

# The full gate suite — mirrors CI. Rust brain first, then the web face against
# a freshly built pkg, so a stale-wasm mismatch can never pass silently.
check:
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
