# CLAUDE — bert-lenses (web-first)

## Invariants manifest

Read these before touching the repo. #1 is load-bearing; the whole architecture
exists to keep it true.

1. **Rust is the brain (as WASM in the browser); React/Tailwind is the face.**
   The kernel (`bert-core` + `bert-compose` engine → wasm) owns every systemhood
   verdict, all validation, and the entire simulation. The web layer holds ZERO
   formalism logic — presentation + ephemeral interaction state only. JS asks the
   wasm kernel for every verdict. **Any systems logic found in JS is a bug.**
2. **`crates/` = truth, `web/` = face.** The directory boundary embodies #1. New
   systems semantics go in a crate (default: `bert-core`, the semantic authority),
   consumed via the wasm boundary — never reimplemented in TS.
3. **Self-contained. No cross-repo path deps.** `bert-core` and `bert-compose` are
   vendored here. Do not re-introduce a `../bert` path dependency. `bert-compose`
   is engine-only (circuit/export/run/examples/ladder/lens) — no native egui shell,
   so it stays wasm-clean.
4. **The wasm API is frozen** (`crates/bert-lenses-kernel/API.md`). Add functions;
   don't mutate existing signatures. Wrappers are marshaling-only (deserialize →
   call kernel → serialize); no logic in `api.rs`.
5. **Web-first is a hard target:** browser + mobile + Claude-in-Chrome. Keep the
   kernel wasm-clean (no `std::fs`, `std::thread`, `SystemTime::now()`, native
   sockets on the wasm path — the browser supplies dates, fetch, storage).
6. **Fun to use is the north star.** Build simple, build beautiful, one honest
   step at a time. Design system: Halcyonic Frost (`web/DESIGN.md`).
7. **Mobus semantic authority = the Lean, not the book or memory.** Mobus's
   knowledge is scattered; the canonical, machine-checked source is
   `systems-science-foundations/Systems/Mobus/Tuple.lean` — the **8-tuple**
   `⟨C, N, E, G, B, T, H, Δt⟩`. CITE it, don't reconstruct. Essential facts that
   get forgotten: **E (environment) is first-class** (objects + milieu, `C∩E=∅`);
   **H is History**, not hierarchy; **Messages are copyable / not conserved**
   (Material + Energy are conserved). The lens palettes encode this:
   `docs/design/lens-palettes.md`.

## Layout

- `crates/bert-core` — vendored kernel. Wasm-clean (dropped the `reflect` feature).
  The semantic authority: `validate::validate`, `operational::validate_operational`.
- `crates/bert-compose` — vendored engine. `circuit` (physics), `export` (JSON seam
  both ways), `run` (recorder), plus `examples`/`ladder`/`lens` vocabulary. Uses
  `glam::Vec2` for node geometry (was `egui::Pos2`).
- `crates/bert-canvas` — the canvas/lens domain, pure Rust (NO wasm-bindgen).
  `canvas` (the serializable `CanvasModel`, `project` / `to_canvas` /
  `validate_connection`) + `lenses` (`lens_facts` — boundary identity set, edge
  ladder, ports, aggregate verdict, all canvas-keyed — and `describe`, the formal
  face). Depends on bert-core.
- `crates/bert-tether` — the boundary-interface subsystem, pure Rust (NO
  wasm-bindgen). The CSV import ritual (`tether`), the declarative run manifest
  (`manifest`), and the forced-run pipeline + `mapping_status` (`forcing`).
  Neither engine physics nor marshaling — the interface where empirical data
  becomes forcing on a model. Depends on bert-core + bert-compose.
- `crates/bert-lenses-kernel` — the wasm-bindgen boundary, MARSHALING ONLY
  (`api.rs`): deserialize JS input → call bert-core / bert-compose / bert-canvas /
  bert-tether (the truth) → serialize. Zero domain logic. Built to `pkg/` via
  wasm-pack (gitignored). Frozen surface: `API.md` (append-only).
- `web/` — React 19 + TS + Vite 6 + Tailwind 4. `src/kernel/` is the only place the
  face touches the wasm; `src/kernel/types.ts` mirrors the API.md shapes.
- `assets/` — sample models. `models/examples/*.json` (blockchain models) are the
  **canonical epitome of old-bert's STRUCTURAL/diagramming peak** — kept for
  reference and future revamp (old bert peaked as a structure visual tool; its
  sim bolt-ons never landed — that executable frontier is what this rebuild cracks
  via the in-browser compose engine). They are structural, not executable. No
  model here is precious; all bert-lenses models to date were toy demos. Phase 1
  builds purpose-built bert-lenses-native samples (executable where run() needs
  them). `models/runnable-sample.json` is a throwaway minted from the engine.

## Working rules

- After changing any crate, rebuild the wasm pkg (`just wasm`, or `wasm-pack build
  --target web --out-dir pkg` in `crates/bert-lenses-kernel`) before the web app
  will see it. A crate change must never silently serve stale wasm to `web/`.
- Gate: `just check` runs the full suite (cargo test + clippy `-D warnings` +
  wasm32 build + wasm pkg build + `tsc --noEmit` + `vite build`) — the same gates
  CI enforces (`.github/workflows/ci.yml`). `cargo build --workspace --target
  wasm32-unknown-unknown` must stay green.
- Most asset models are STRUCTURAL (mode=Full but not executable) — they validate
  but do not project to a runnable spec. Only genuinely parameterized models run.
  Don't "fix" a structural model to make run() work; that's expected.
- The prior egui app is on tag `pre-web-rebuild` / branch `archive/egui-app`.
- Full phase plan: `~/.claude/plans/cold-start-prompt-scalable-galaxy.md`;
  GitHub issues #11 (plan) + #41/#42/#43/#44 (phases 0–3, all implemented).
- Phase 3 rule of thumb: every ontology-bearing visual reads a `lens_facts` /
  `describe` field (kernel verdicts, canvas-keyed). If a rendering branch needs
  a systems fact the kernel doesn't expose yet, extend `lenses.rs` — don't
  derive it in TS. Faithfulness cites live in code comments next to each rule.

## Extending the palette (new node / port type)

Adding a node or port type touches the kernel first and the face last — the
verdict is born in Rust and only rendered in TS. Do the eight steps in order; the
type is not "real" until every layer knows it. Skipping a step (e.g. rendering a
type the kernel never validates) reintroduces systems logic in JS — invariant #1.

1. **bert-core type** — add the variant to the domain type in `crates/bert-core`
   (`src/lib.rs`). This is the semantic authority; the type exists here or nowhere.
2. **`validate_mode` case** — teach `crates/bert-core/src/validate.rs`
   (`validate` / `validate_mode`) what makes the new type well-formed per mode.
   No verdict lives outside this crate.
3. **bert-canvas projection** — map it across the canvas↔model seam in
   `crates/bert-canvas/src/canvas.rs` (`project` / `to_canvas`), so the authoring
   shape and the formal `WorldModel` stay in sync.
4. **`lens_facts` field** — expose whatever the face needs to render as a
   canvas-keyed fact in `crates/bert-canvas/src/lenses.rs` (`lens_facts`). The
   face reads facts; it never recomputes them.
5. **`describe` branch** — add the formal-object text to `describe` in the same
   `lenses.rs`, per lens (`Lens::Klir | Bunge | Mobus`).
6. **`LensRegistry` entry** — wire the render in `web/src/canvas/lenses/registry.ts`
   (`LensRegistry`), the one place the face binds a lens to its views.
7. **contract fixture** — add/extend a golden in `fixtures/contract/` and its
   parser in `web/src/kernel/contract.test.ts` (regenerate with `BLESS_FIXTURES=1`
   after a crate change, then rebuild the wasm pkg — see Working rules).
8. **view module** — render it in the per-lens view module under
   `web/src/canvas/lenses/{klir,bunge,mobus}.tsx` (shared bits in `common.tsx`),
   reading only the `lens_facts` / `describe` fields from steps 4–5.
