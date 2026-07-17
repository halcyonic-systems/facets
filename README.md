# bert-lenses

**Rust is the brain, running as WASM in the browser. React/Tailwind is the face.**

bert-lenses is a web-first systems-modeling instrument. The Rust kernel (compiled
to WebAssembly) owns *all* truth: every systemhood verdict, all validation, the
entire conservation-faithful simulation. The web layer holds **zero formalism
logic**. It renders what the kernel decides and owns only presentation plus
ephemeral interaction state. JS *asks* the wasm kernel for every verdict; it never
decides anything about systems itself. **`crates/` = truth · `web/` = face. Any
systems logic in JS is a bug.**

There is no IPC and no back end: the kernel runs in the tab (wasm-bindgen,
synchronous), so bert-lenses runs in a browser, on mobile, and inside
Claude-in-Chrome. An optional Tauri wrapper can later host the *same* web app
natively.

## Structure

```
crates/                     # TRUTH — the kernel, self-contained + wasm-ready
  bert-core/                #   semantic authority: WorldModel, validators, projection
  bert-compose/             #   executable dynamical engine: circuit / export / run
  bert-canvas/              #   canvas/lens domain: CanvasModel, lens_facts, describe
  bert-tether/              #   boundary interface: CSV import, run manifest, forcing
  bert-lenses-kernel/       #   JS-facing wasm-bindgen boundary (marshaling only)
web/                        # FACE — React 19 + TS + Vite 6 + Tailwind 4 (Halcyonic Frost)
fixtures/                   # serde↔TS contract goldens (fixtures/contract/)
docs/                       # design + architecture docs (see docs/design/, docs/archive/)
assets/models/              # sample BERT models (demos + blockchain examples)
assets/fonts/               # STIX fonts for the formal face
pipeline/                   # OPTIONAL Python data-prep — off the product path, not in CI
```

`bert-core`, `bert-compose`, `bert-canvas`, and `bert-tether` are **vendored**
(self-contained, no cross-repo path deps). The `bert-compose` copy is engine-only:
the native egui shell it had upstream is dropped, so it carries no native
dependency and compiles clean to `wasm32-unknown-unknown`. Node geometry uses
`glam::Vec2` in place of `egui::Pos2`, so the engine pulls in no UI crate at all.

`pipeline/` produces the LLM-market panel CSVs some demos are shaped around. It has
its own venv and README and is **not** load-bearing for the product or the gates.

## Develop

The `justfile` is the entry point. Rust is the brain (wasm), `web/` is the face; a
crate change must never silently serve stale wasm.

```bash
just wasm     # rebuild the wasm pkg the web app consumes (run after any crate change)
just dev      # rebuild wasm, then start the vite dev server (face sees fresh brain)
just check    # the full gate suite — CI parity
```

`just check` runs exactly what CI enforces (`.github/workflows/ci.yml`): `cargo
test --workspace`, `cargo clippy -D warnings`, the `wasm32-unknown-unknown` build,
the wasm pkg build, then `tsc --noEmit`, `vitest`, `check:tokens`, and `vite build`
in `web/`.

<details>
<summary>Manual commands (what the recipes wrap)</summary>

```bash
cd crates/bert-lenses-kernel
wasm-pack build --target web --out-dir pkg --dev     # --release for the shipped bundle
cd ../../web && npm install && npm run dev            # http://localhost:5173
cargo test --workspace
cargo build --workspace --target wasm32-unknown-unknown
```
</details>

## Where to look

- [`CLAUDE.md`](CLAUDE.md) — the agent runbook: invariants, the 5-crate layout,
  working rules, and the 8-step palette-extension procedure. Start here.
- [`crates/bert-lenses-kernel/API.md`](crates/bert-lenses-kernel/API.md) — the
  frozen JS↔wasm surface (append-only).
- [`docs/kernel-architecture.md`](docs/kernel-architecture.md) — what the kernel
  *is* as a system: what `describe`/`lens_facts`/`validate_mode`/`analyze` actually
  compute, verified against source with confidence ratings. Read before trusting
  the substrate.
- [`docs/design/llm-integration-research.md`](docs/design/llm-integration-research.md)
  — research foundation for LLM context/authoring/analysis (rests on the kernel above).
- [`docs/design/lens-palettes.md`](docs/design/lens-palettes.md) — the lens
  grounding for Phase 3/4 (Klir / Bunge / Mobus).
- [`web/DESIGN.md`](web/DESIGN.md) — Halcyonic Frost design tokens for the face.
- [`ROADMAP.md`](ROADMAP.md) — history (predates the web rebuild; see Status below
  for current truth).

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

Next: **Phase 4** — the per-lens authoring palette (#50): how each lens adds its
own kinds of things (sources/sinks/interfaces at Mobus, the stripped Bunge set),
grounded in the same design doc + Bunge chs. 1–2 / Mobus ch. 4. The prior egui app
lives on the `pre-web-rebuild` tag / `archive/egui-app` branch for reference.

The instrument is one of the two faces of the K≅2 kernel: the *structural* face
(author/validate) and the *dynamical* face (`bert-compose`, run) — here united in
one self-contained tool.
