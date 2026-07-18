# docs/

Start at the main [`README.md`](../README.md) and [`CLAUDE.md`](../CLAUDE.md) for the repo overview and working rules. This folder is the deeper reference layer.

**Status vocabulary.** Every document below carries one: **LIVE** (current, load-bearing) · **ADOPTED** (a decision in force) · **PROPOSED** (a position awaiting adoption — see its tracking issue) · **RESEARCH** (a foundation others build on; not itself a decision) · **HISTORICAL** (kept as record, superseded). Where one document supersedes another, both say so.

## The language

- [`language/`](language/) — **SL, the bert-lenses system language.** Its [`README.md`](language/README.md) is the front door: what SL is, what it looks like, reading order, the corpus, and where the language lives in the code.
  - [`language/spec.md`](language/spec.md) — **LIVE** — the SL v1.0 specification: five design commitments, lexicon, EBNF grammar, semantics, annotation layer, round-trip contract, structure/dynamics boundary, worked examples, lineage, known gaps. Normative. (Was `docs/sl2-spec.md`; moved 2026-07-18 when the language got its own home.)
  - [`language/terminology-concordance.md`](language/terminology-concordance.md) — **LIVE** — the Klir·Bunge·Mobus terminology grid: 12 kernel distinctions × 3 traditions, every cell primary-cited and VERIFIED/UNGROUNDED-marked. SSOT for the spec's lexicon attribution, per-lens UI copy, and K≅2 convergence exhibits; federates the partial two-tradition mappings in SSF.

## Theory and kernel

- [`kernel-architecture.md`](kernel-architecture.md) — **LIVE** — what the kernel *is* as a system: what `describe`/`lens_facts`/`validate_mode`/`analyze` actually compute, verified against source with confidence ratings. Read before trusting the substrate.
- [`theory-fidelity.md`](theory-fidelity.md) — **LIVE** — per-tradition (Klir/Bunge/Mobus) take/drop/where/why, the mode-stamp semantics, the perspectival-realist scope statement, and the #5 collapse as a worked example of the refuse-don't-truncate discipline. For a reader assessing the theory's quality, not just its UI.
- [`on-the-word-ladder.md`](on-the-word-ladder.md) — **LIVE** — the three distinct senses of "ladder/rung/climb" in this repo (mode entry, the compose dependency ladder, per-edge classification) and which one is the actual vocabulary debt.

## Design positions and research

Positions — a stance the repo takes, or is being asked to take:

- [`design/dynamics-principled-position.md`](design/dynamics-principled-position.md) — **PROPOSED** ([#86](https://github.com/halcyonic-systems/bert-lenses/issues/86)) — what counts as dynamics: a state-transition family satisfying the semigroup axiom (Mesarovic–Takahara); a dynamics-*kind* is the transition functor; **conservation is an invariant the model declares, not the engine's premise**. Supersedes the "dynamics = the conservation engine" framing in the retired [`archive/roadmap-pre-web-rebuild.md`](archive/roadmap-pre-web-rebuild.md) Arc 4 (the amendment is checklist item 6 on #86). `language/spec.md` §8 is already written from it. Research trail: [`design/dynamics-research/`](design/dynamics-research/).
- [`design/hierarchical-decomposition-investigation.md`](design/hierarchical-decomposition-investigation.md) — **PROPOSED** (issue drafted in its §5, not yet filed) — the kernel's data model can carry arbitrary depth, but every active path is flat: `project()` forces level 1, `to_canvas()` drops deeper levels, `validate_operational()` refuses `level > 1`. Recommends decomposition by reference; implementation gated on deriving the parent↔child boundary math from the Lean 8-tuple.

Research foundations — what others build on; not themselves decisions:

- [`design/sl2-authoring-language.md`](design/sl2-authoring-language.md) — **RESEARCH** — the foundation behind `language/spec.md`: three concrete syntaxes over one neutral spec, the precedent survey (SysML v2, Modelica, Stella, Quint; gpt-jargon as negative control), keep/shed against Mobus and BERT SL v0.1, and the staged rung plan. Rungs 1–3 shipped 2026-07-18 ([#82](https://github.com/halcyonic-systems/bert-lenses/issues/82)); its 8 open questions remain closeable work.
- [`design/dynamics-research/`](design/dynamics-research/) — **RESEARCH** — six primary-source reads (Mobus, Bunge, Klir, Bertalanffy, category theory, external general-systems literature), a synthesis, and two adversarial critiques. See its [`README.md`](design/dynamics-research/README.md) for reading order.
- [`design/llm-integration-research.md`](design/llm-integration-research.md) — **RESEARCH** — LLM context/authoring/analysis (rests on `kernel-architecture.md`). §11 is the lens-fidelity mechanism; §12 is the recommended-first-rung plan the 2026-07-17 analysis rung executed.
- [`design/lens-palettes.md`](design/lens-palettes.md) — **LIVE** — the lens grounding for Phase 3/4 (Klir / Bunge / Mobus), and the two kernel primitives (boundary identity, edge classification) behind the faithful renderings.
- [`design/educational-model-suite.md`](design/educational-model-suite.md) — **RESEARCH** — a 13-model graded curriculum teaching systems concepts through the instrument (primitive-first; refusals as lessons), plus a faculty-appeal appendix.
- [`design/shape-vocabulary-research.md`](design/shape-vocabulary-research.md) — **RESEARCH** — notation precedents (Mobus's own icon set, Stella/Forrester, Odum, SysML ports, automata, Petri nets) for the palette shape vocabulary ([#81](https://github.com/halcyonic-systems/bert-lenses/issues/81)).
- [`design/design-system-draft.md`](design/design-system-draft.md) — **RESEARCH** — visual design system draft.

## Decisions

- [`decisions/0001-canvas-rendering-svg.md`](decisions/0001-canvas-rendering-svg.md) — **ADOPTED** — the hand-rolled React+SVG canvas call (vs. a graph library), from the blind-pick spike.

## Historical (pre-web-rebuild, kept as record)

- [`canvas-architecture.md`](canvas-architecture.md) — **HISTORICAL** — the standalone egui canvas (`src/main.rs`). Superseded by the web rebuild; its kernel-seam semantics (mode stamping, audit-panel verdict-quoting) carried forward and are still accurate, but the UI mechanics it describes are gone. See its banner for what's current.
- [`fidelity-audit.md`](fidelity-audit.md) — **HISTORICAL** — faithfulness verdicts from the egui-era canvas.
- [`archive/`](archive/) — **HISTORICAL** — superseded design docs (see [`archive/README.md`](archive/README.md)).

## Root-level references

- **[Roadmap board](https://github.com/orgs/halcyonic-systems/projects/12)** — **LIVE** — the forward-looking plan, organized by epic (Reality Interface · Joy Surface · Resident Co-author · Trusted Seam · Legible Foundations · The Language · What Runs · Notation · Teaching Surface). There is no roadmap *file*; the retired one is [`archive/roadmap-pre-web-rebuild.md`](archive/roadmap-pre-web-rebuild.md).
- [`../crates/bert-lenses-kernel/API.md`](../crates/bert-lenses-kernel/API.md) — **LIVE** — the frozen JS↔wasm surface (append-only). Includes the SL surface (`compile_sl` / `emit_sl`).
- [`../web/DESIGN.md`](../web/DESIGN.md) — **LIVE** — Halcyonic Frost design tokens for the face.
