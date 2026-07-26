# docs/archive

**Status: HISTORICAL.** Every document here except one — `gst-1968-full.md` is
**RESEARCH**, a source text rather than a superseded document; see "Source
material, not design history" below.

egui-era design history, superseded by the web rebuild; see
[`web/DESIGN.md`](../../web/DESIGN.md) + [`docs/design/`](../design/) for the live
design surface. Kept for reference, not current truth. Nothing here is corrected in
place — where a claim was withdrawn it is annotated, because the archive is the record
of what was circulated.

- [`canvas-architecture.md`](canvas-architecture.md) — **HISTORICAL** — the standalone egui canvas (`src/main.rs`). Its kernel-seam semantics carried forward; the UI mechanics it describes are gone.
- [`fidelity-audit.md`](fidelity-audit.md) — **HISTORICAL** — egui-era faithfulness verdicts. Current assessment: [`../theory-fidelity.md`](../theory-fidelity.md).
- [`on-the-word-ladder.md`](on-the-word-ladder.md) — **HISTORICAL** — the concordance of the three senses of "ladder/rung/climb". The mode-entry sense is retired ([#90](https://github.com/halcyonic-systems/bert-lenses/issues/90)); the doc records the senses that legitimately survive.
- [`roadmap-pre-web-rebuild.md`](roadmap-pre-web-rebuild.md) — **HISTORICAL** — the retired arc-based roadmap. The forward plan is the [roadmap board](https://github.com/orgs/halcyonic-systems/projects/12); there is no roadmap *file*.
- [`arc2-authoring-design.md`](arc2-authoring-design.md) — **HISTORICAL** — the Arc 2 authoring spec (deterministic spine, per-lens editable UI, live convergence, persistence) written for the egui shell.
- [`design-system.md`](design-system.md) — **HISTORICAL** — the egui-era palette and accreting shape grammar. Demoted 2026-07-26: [`../../web/DESIGN.md`](../../web/DESIGN.md) is the one design-system owner.

## Source material, not design history

- [`gst-1968-full.md`](gst-1968-full.md) — **RESEARCH**, not HISTORICAL: nothing
  superseded it, and it is still read against. A verbatim OCR extraction of Von Bertalanffy, *General System Theory* (1968), read against by [`../design/dynamics-research/read-bertalanffy.md`](../design/dynamics-research/read-bertalanffy.md). Moved here from `docs/design/dynamics-research/` on 2026-07-26 ([#235](https://github.com/halcyonic-systems/bert-lenses/issues/235)): at 14,229 lines it is a source text, not a document this repo authored, and it dominated every doc-tree metric and grep while it sat in an active research folder.
