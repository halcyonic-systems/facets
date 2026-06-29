# BERT Lenses

A choose-a-paradigm prototype over the K≅2 kernel. Open it, pick a thinker's lens — **Klir**, **Bunge**, or **Mobus** — and read one system through that vocabulary. Switch lenses freely; the model underneath never changes.

## Two binaries (front-door swap, 2026-06-29)
- **`bert-lenses`** (`src/main.rs`, `cargo run`) — the **Arc-2 authoring canvas** and the **front door**: direct-manipulation (place/connect/type/name), live Mathematical view, save/load. As-built reference: [`docs/canvas-architecture.md`](docs/canvas-architecture.md). **Standalone — not yet `bert-core`-backed.**
- **`viewer`** (`src/bin/viewer.rs`, `cargo run --bin viewer`) — the **Arc-1 list viewer**, now a demoted REFERENCE bin: reads bundled `WorldModel`s (thermostat + generics) through 3 lenses as structural lists, with cited `validate_mode` verdicts. **This is the one wired to `bert-core`** — the canonical worked example of consuming it; mine it at canvas↔bert-core convergence.

**Integration direction:** the canvas is now the front door (`main.rs`); next it gets backed by `bert-core` (`WorldModel` + `validate_mode` replacing the canvas's hand-rolled checks), consuming the viewer's example models + teaching copy. Faithfulness: [`docs/fidelity-audit.md`](docs/fidelity-audit.md).

## What this is the seed of

bert-lenses is **step 1 of a model-*creation* tool, not a viewer.** The arc:

1. **View** *(this prototype)* — see one stored model through Klir / Bunge / Mobus, and learn *why* a model is or isn't a faithful system in each (cited to the tradition, e.g. "an unbonded collection is an aggregate — Bunge Def 1.1").
2. **Author** — build a model *in* a lens's vocabulary: as Klir (things + undirected relations), as Bunge (composition + **directed, typed-by-kind** bonds), as Mobus (typed flows + boundary, with Message a peer of Energy/Material). The UI speaks that thinker's language. The faithful Klir→Bunge→Mobus accretion gradient is documented in `docs/design-system.md` §9.
3. **Translate** — move losslessly between lenses (read-only view-switching is lossless by theorem; explicit mode transitions project down with documented loss or generate up with minimal witnesses).

Eventually this folds into BERT as the lens/mode-aware authoring surface.

**The one precision that makes it cohere: there is one kernel underneath, always.** "Build in Core or in a lens" is not three model formats — it is one stored kernel you populate through whichever vocabulary you prefer. That is *why* "translate my Klir model to Bunge" is a faithful, well-defined operation rather than a lossy reinterpretation: both are views of the same object. This is the payoff of founding BERT on the kernel — before it, lens-translation was hand-wavy; after it, it is a theorem (`systems-science-foundations/Systems/Klir/ViewGeneration.lean`).

Dependency order is **view → author → translate**: authoring-in-a-lens only makes sense once the lens is a verified-faithful window on the kernel, so we prove the view first.

## Framing discipline

"One kernel, lenses as faithful **derived views**" — never "derived core." The kernel was *discovered* by comparing seven traditions but is *logically prior*; the views are the derived layer. Discovery order ≠ dependency order.

## Architecture

- **bert-core is the engine.** All formalism — the kernel projection, the `Mode` ladder, the `validate_mode` precondition gate — lives in `bert-core` (consumed as a path dependency). This shell holds **zero formalism logic**: if it wants a rule bert-core doesn't have, that's a bert-core issue, not shell code.
- **Deterministic, traceable verdicts.** Every "you can / can't view this as Bunge" answer is a derivation from `validate_mode`, cited — no LLM in the explanation path.
- **Sovereign.** The thermostat model is generated offline via GSR `generate()` and bundled; the app runs as a static WASM page with no server dependency.

## Run

```sh
cargo run                      # native window (the canvas front door)
cargo run --bin viewer         # the demoted Arc-1 list viewer (reference)
trunk serve --open             # WASM (after: rustup target add wasm32-unknown-unknown && cargo install trunk)
```

**Self-contained macOS app:** `scripts/bundle-macos.sh` builds `/Applications/bert-lenses.app` with the
release binary copied *inside* the bundle (`Contents/MacOS/`) — it keeps working after `cargo clean`.
Re-run the script after code changes to refresh the app. Default install dir is `/Applications`; pass a
path to override.

## Status

Read-only view spine. The bundled `assets/thermostat.json` (a generated feedback-control system) enters Core/Structural/Operational; the per-lens *rendering* of structure and the §A5 mode transitions are the next steps.
