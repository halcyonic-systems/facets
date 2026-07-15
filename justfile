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
    cargo test --workspace
    cargo clippy --workspace --all-targets -- -D warnings
    cargo build --workspace --target wasm32-unknown-unknown
    cd {{kernel}} && wasm-pack build --target web --out-dir pkg
    cd web && npx tsc --noEmit
    cd web && npx vitest run
    cd web && npx vite build
