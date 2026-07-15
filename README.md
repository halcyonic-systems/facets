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
here and made wasm-ready. **Phases 0–3 are complete:**

- **Phase 0** — self-contained wasm kernel + frozen API + smoke slice.
- **Phase 1** — CSV tether wizard + domain-legible forced run/results panel.
- **Phase 2/2b** — hand-rolled React+SVG canvas (ADR 0001) + drive-a-flow + run
  + SimScrubber (the sim animates on the structure).
- **Phase 3** (#44) — the lens toggle switches *ontologies*: two kernel
  primitives (`boundary_components`, `edges` — the boundary identity and the
  flow→bond→relation ladder) feed three faithful renderings (Mobus membrane +
  interface ports + first-class environment; Bunge marked boundary set + the
  aggregate-vs-system verdict; Klir relation-primary neutral lines), per-lens
  edge editing, and a KaTeX formal face (`describe(model, lens)`). Grounding:
  `docs/design/lens-palettes.md`.

Next: the per-lens authoring palette (how each lens adds its own kinds of
things — sources/sinks/interfaces at Mobus, the stripped Bunge set), grounded in
the same design doc + Bunge chs. 1–2 / Mobus ch. 4. The prior egui app lives
on the `pre-web-rebuild` tag / `archive/egui-app` branch for reference.

The instrument is one of the two faces of the K≅2 kernel: the *structural* face
(author/validate) and the *dynamical* face (`bert-compose`, run) — here united in
one self-contained tool.
