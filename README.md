# bert-lenses

**Rust is the brain, running as WASM in the browser. React/Tailwind is the face.**

bert-lenses is a web-first systems-modeling instrument. The Rust kernel
(`bert-core` + the `bert-compose` engine, compiled to WebAssembly) owns *all*
truth — every systemhood verdict, all validation, the entire conservation-faithful
simulation. It is the same Rust that runs native/mobile, compiled to wasm and
executing in the page. The web layer holds **zero formalism logic**: it renders
what the kernel decides and owns only presentation + ephemeral interaction state.
JS *asks* the wasm kernel for every verdict; it never decides anything about
systems itself. **`crates/` = truth · `web/` = face. Any systems logic in JS is a bug.**

There is no IPC and no back end: the kernel runs in the tab (wasm-bindgen,
synchronous), so bert-lenses runs in a browser, on mobile, and inside
Claude-in-Chrome. An optional Tauri wrapper can later host the *same* web app
natively.

## Structure

```
crates/                     # TRUTH — the kernel, self-contained + wasm-ready
  bert-core/                #   the semantic authority (WorldModel, validators, projection)
  bert-compose/             #   the executable dynamical engine (circuit / export / run)
  bert-lenses-kernel/       #   the JS-facing wasm-bindgen boundary (+ the pure CSV tether)
web/                        # FACE — React 19 + TS + Vite + Tailwind 4 (Halcyonic Frost)
assets/                     # sample BERT models (validation fixtures + demo samples)
pipeline/                   # Python data-prep (LLM-market panel for the demos)
```

`bert-core` and `bert-compose` are **vendored** (self-contained, no cross-repo
path deps). The `bert-compose` copy is engine-only — the native egui shell it
had upstream is dropped, so it carries no native dependency and compiles clean
to `wasm32-unknown-unknown`. Node geometry uses `glam::Vec2` in place of
`egui::Pos2`, so the engine pulls in no UI crate at all.

## Develop

```bash
# 1. build the kernel to a browser wasm package (regenerate after any crate change)
cd crates/bert-lenses-kernel
wasm-pack build --target web --out-dir pkg --dev     # --release for the shipped bundle

# 2. run the web app
cd ../../web
npm install                                          # first time (symlinks the wasm pkg)
npm run dev                                           # http://localhost:5173

# kernel checks
cargo test --workspace                                # native tests
cargo build --workspace --target wasm32-unknown-unknown
```

The frozen JS↔wasm API is documented in
[`crates/bert-lenses-kernel/API.md`](crates/bert-lenses-kernel/API.md). Design
tokens + the invariant are in [`web/DESIGN.md`](web/DESIGN.md).

## Status

Rebuilt web-first (egui → React) in phases; the kernel + engine were consolidated
here and made wasm-ready. **Phase 0 (self-contained wasm kernel + frozen API +
smoke slice) is complete.** Next: the CSV mapping wizard + run/results panel
(Phase 1), then an adversarial canvas spike (Phase 2). The prior egui app lives
on the `pre-web-rebuild` tag / `archive/egui-app` branch for reference.

The instrument is one of the two faces of the K≅2 kernel: the *structural* face
(author/validate) and the *dynamical* face (`bert-compose`, run) — here united in
one self-contained tool.
