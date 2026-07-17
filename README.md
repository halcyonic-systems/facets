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

## What this tool believes

*Draft (2026-07-17, part of #23), awaiting Shingai's voice pass. Content is
grounded and cited; register/voice is not yet final — treat every `[Shingai: ...]`
marker as an open call, not a placeholder to ignore.*

**The kernel claim.** `bert-core`'s three lenses — Klir, Bunge, Mobus — are not
three opinions about a model; they are three faithful views the K ≅ **2**
kernel *generates*, each licensed by its own machine-checked precondition, and
the generation is proven, not asserted:
`systems-science-foundations/Systems/Klir/ViewGeneration.lean`. `describe(model,
lens)` hands you the model back in each lens's own named vocabulary (Klir
`(T,R)`, Bunge `⟨C,E,S,M⟩`, Mobus `⟨C,N,E,G,B,T,H,Δt⟩`) — counts hold, words
change, and that invariant is itself machine-tested
(`describe_counts_hold_across_lenses`). Full grounding, per-tradition, with
file:line: [`docs/theory-fidelity.md`](docs/theory-fidelity.md).

**What a lens commits you to.** Choosing a lens isn't cosmetic — it's a claim
the kernel checks. Klir commits you to nothing beyond things-in-relation (every
model is a valid Klir system). Bunge commits you to at least one bond between
distinct components, or the model is refused as an aggregate. Mobus commits
you to no self-dependency (`k ≠ o`). The three preconditions are independent —
satisfying one says nothing about the others — which is a lattice, not a
ladder. See [`docs/on-the-word-ladder.md`](docs/on-the-word-ladder.md) if
"lens"/"rung"/"mode" language elsewhere in this repo reads like a linear
ordering; it isn't one, and that doc says exactly where the word choice still
needs cleanup.

**Save vs Export.** These are deliberately two different artifacts, not two
names for one save button. **Save** writes the canvas's own editing state —
things, relations, the active lens, GSR-spec provenance — the shape you keep
working on. **Export** writes a `bert-core::WorldModel`, projected and
`mode`-stamped, the artifact other tools (and other lenses) consume. Save is
"what I'm mid-authoring"; Export is "what I'm asserting is true, as of this
lens." `[Shingai: a third tier — a run Ledger recording a simulation's
conservation history (RecordedRun/H, bert#108) — is on the roadmap
(ROADMAP.md Arc 4.2) but I couldn't confirm from the code whether it's wired
into the web app yet as of this pass; please confirm current status and I'll
fold it in, or cut this sentence if it's still Save/Export only today.]`

**The refuse policy.** The kernel would rather error loudly than silently drop
or guess at authored structure. Two examples: a legacy model file with a
multi-primitive component array does not silently keep the first entry — it
refuses to load, naming the fix (`docs/theory-fidelity.md`'s "#5 collapse"
section); mode transitions never invent structure to satisfy a target mode —
upgrade "checks the target edge's named hypothesis... and refuses with that
name, leaving the required edits to the author"
(`crates/bert-core/src/transition.rs:20-22`). If you see a refusal, it's
citing a specific formal precondition you can look up, not a generic "invalid
model" message.

**Who this is for.** `[Shingai: voice call — my draft: an engineer, scientist,
or mathematician who's already convinced the tool is worth using and wants to
dig into and assess the quality of the theory underneath it, independently or
with LLM/expert help. Everything in docs/theory-fidelity.md is written for
that reader — cited, checkable, honest about what's thin. A secondary,
harder-nosed reading (a scholar looking for the weak points) is answered by
the same doc's perspectival-realist scope section. Adjust freely — this is
your call, not a fact I derived.]`

**Map.** [`docs/README.md`](docs/README.md) indexes the deeper docs;
[`docs/theory-fidelity.md`](docs/theory-fidelity.md) is the one-pager this
section summarizes.

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
- [`docs/theory-fidelity.md`](docs/theory-fidelity.md) — per-tradition
  (Klir/Bunge/Mobus) take/drop/where/why, mode-stamp semantics, and the
  perspectival-realist scope statement. Start here if you're assessing the
  theory, not just the tool.
- [`docs/on-the-word-ladder.md`](docs/on-the-word-ladder.md) — the three
  distinct senses of "ladder/rung" in this repo's docs and code, and which one
  is the actual vocabulary debt.
- [`docs/README.md`](docs/README.md) — index of the full docs/ folder.
- [`docs/design/llm-integration-research.md`](docs/design/llm-integration-research.md)
  — research foundation for LLM context/authoring/analysis (rests on the kernel
  above); the read-only analysis rung it specified shipped 2026-07-17.
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

**LLM integration, read-only rung** (2026-07-17, outside the phase numbering
above): deterministic graph checks (#66 — dead-end, duplicate-edge,
reachability) landed in `validate.rs`, and the Analyst panel
(`web/src/AnalystPanel.tsx`) narrates kernel-computed facts through GSR's
`/analyze` endpoint, citing canvas elements, local-first with a frontier
opt-in. It proposes no structure and has no write path. See
`docs/design/llm-integration-research.md` for the research foundation and
`docs/kernel-architecture.md` for what closed with #66.

The instrument is one of the two faces of the K≅2 kernel: the *structural* face
(author/validate) and the *dynamical* face (`bert-compose`, run) — here united in
one self-contained tool.
