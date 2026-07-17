# docs/

Start at the main [`README.md`](../README.md) and [`CLAUDE.md`](../CLAUDE.md) for the repo overview and working rules. This folder is the deeper reference layer.

## Theory and kernel

- [`kernel-architecture.md`](kernel-architecture.md) — what the kernel *is* as a system: what `describe`/`lens_facts`/`validate_mode`/`analyze` actually compute, verified against source with confidence ratings. Read before trusting the substrate.
- [`theory-fidelity.md`](theory-fidelity.md) — per-tradition (Klir/Bunge/Mobus) take/drop/where/why, the mode-stamp semantics, the perspectival-realist scope statement, and the #5 collapse as a worked example of the refuse-don't-truncate discipline. For a reader assessing the theory's quality, not just its UI.
- [`on-the-word-ladder.md`](on-the-word-ladder.md) — the three distinct senses of "ladder/rung/climb" in this repo (mode entry, the compose dependency ladder, per-edge classification) and which one is the actual vocabulary debt.

## Design

- [`design/lens-palettes.md`](design/lens-palettes.md) — the lens grounding for Phase 3/4 (Klir / Bunge / Mobus), the two kernel primitives (boundary identity, edge classification) behind the faithful renderings.
- [`design/llm-integration-research.md`](design/llm-integration-research.md) — research foundation for LLM context/authoring/analysis (rests on `kernel-architecture.md`). §11 is the lens-fidelity mechanism; §12 is the recommended-first-rung plan the 2026-07-17 analysis rung executed.
- [`design/design-system-draft.md`](design/design-system-draft.md) — visual design system draft.

## Decisions

- [`decisions/0001-canvas-rendering-svg.md`](decisions/0001-canvas-rendering-svg.md) — the hand-rolled React+SVG canvas call (vs. a graph library), from the blind-pick spike.

## Historical (pre-web-rebuild, kept as record)

- [`canvas-architecture.md`](canvas-architecture.md) — the standalone egui canvas (`src/main.rs`). Superseded by the web rebuild; its kernel-seam semantics (mode stamping, audit-panel verdict-quoting) carried forward and are still accurate, but the UI mechanics it describes are gone. See its banner for what's current.
- [`fidelity-audit.md`](fidelity-audit.md) — faithfulness verdicts from the egui-era canvas.
- [`archive/`](archive/) — superseded design docs (see `archive/README.md`).

## Root-level references

- [`../ROADMAP.md`](../ROADMAP.md) — pre-web-rebuild plan of record, kept as history (see its banner for current status).
- [`../crates/bert-lenses-kernel/API.md`](../crates/bert-lenses-kernel/API.md) — the frozen JS↔wasm surface (append-only).
- [`../web/DESIGN.md`](../web/DESIGN.md) — Halcyonic Frost design tokens for the face.
