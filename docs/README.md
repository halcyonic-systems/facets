# docs/

Start at the main [`README.md`](../README.md) and [`CLAUDE.md`](../CLAUDE.md) for the repo overview and working rules. This folder is the deeper reference layer.

**Status vocabulary.** Every document below carries one: **LIVE** (current, load-bearing) · **ADOPTED** (a decision in force) · **PROPOSED** (a position awaiting adoption — see its tracking issue) · **CONTINGENT(#N)** (normative content conditional on a pending decision — see issue #N) · **RESEARCH** (a foundation others build on; not itself a decision) · **HISTORICAL** (kept as record, superseded). Where one document supersedes another, both say so.

**Invariant.** LIVE/normative sections may not contain verbatim lifts from PROPOSED documents.

## Start here

- [`quickstart.md`](quickstart.md) — **LIVE** — ten minutes from `just dev` to a judged, running model, using the two smallest corpus files (bathtub, then process-m). The newcomer on-ramp.
- [`glossary.md`](glossary.md) — **LIVE** — fast definitions of the ~15 load-bearing terms (system, lens, bond/mere, conservation invariant, WorldModel, Save vs Export, run ledger, SL, systemhood, mode/rung, neutral spec, golden, dynamics-kind, precondition, concordance), each grounded in a fuller doc.

## The language

- [`language/`](language/) — **SL, the bert-lenses system language.** Its [`README.md`](language/README.md) is the front door: what SL is, what it looks like, reading order, the corpus, and where the language lives in the code.
  - [`language/spec.md`](language/spec.md) — **LIVE** — the SL v1.0 specification: five design commitments, lexicon, EBNF grammar, semantics, annotation layer, round-trip contract, structure/dynamics boundary, worked examples, lineage, known gaps. Normative. (Was `docs/sl2-spec.md`; moved 2026-07-18 when the language got its own home.)
  - [`language/terminology-concordance.md`](language/terminology-concordance.md) — **LIVE** — the Klir·Bunge·Mobus terminology grid: 12 kernel distinctions × 3 traditions, every cell primary-cited and VERIFIED/UNGROUNDED-marked. SSOT for the spec's lexicon attribution, per-lens UI copy, and K≅2 convergence exhibits; federates the partial two-tradition mappings in SSF.

## Theory and kernel

- [`kernel-architecture.md`](kernel-architecture.md) — **LIVE** — what the kernel *is* as a system: what `describe`/`lens_facts`/`validate_mode`/`analyze` actually compute, verified against source with confidence ratings. Read before trusting the substrate.
- [`theory-fidelity.md`](theory-fidelity.md) — **LIVE** — per-tradition (Klir/Bunge/Mobus) take/drop/where/why, the mode-stamp semantics, the perspectival-realist scope statement, and the #5 collapse as a worked example of the refuse-don't-truncate discipline. For a reader assessing the theory's quality, not just its UI.
- [`on-the-word-ladder.md`](on-the-word-ladder.md) — **LIVE** — the three distinct senses of "ladder/rung/climb" in this repo (mode entry, the compose dependency ladder, per-edge classification) and which one is the actual vocabulary debt.

## Design positions and research

[`design/README.md`](design/README.md) is the status-grouped index of this section (LIVE · ADOPTED · PROPOSED · RESEARCH). The highlights follow.

Positions — a stance the repo takes, or is being asked to take:

- [`design/dynamics-principled-position.md`](design/dynamics-principled-position.md) — **ADOPTED** (adopted via [#86](https://github.com/halcyonic-systems/bert-lenses/issues/86)) — what counts as dynamics: a state-transition family satisfying the semigroup axiom (Mesarovic–Takahara); a dynamics-*kind* is the transition functor; **conservation is an invariant the model declares, not the engine's premise**. Supersedes the "dynamics = the conservation engine" framing in the retired [`archive/roadmap-pre-web-rebuild.md`](archive/roadmap-pre-web-rebuild.md) Arc 4. `language/spec.md` §8 is normatively bound to it. Research trail: [`design/dynamics-research/`](design/dynamics-research/).
- [`design/hierarchical-decomposition-investigation.md`](design/hierarchical-decomposition-investigation.md) — **PROPOSED** ([#89](https://github.com/halcyonic-systems/bert-lenses/issues/89)) — the kernel's data model can carry arbitrary depth, but every active path is flat: `project()` forces level 1, `to_canvas()` drops deeper levels, `validate_operational()` refuses `level > 1`. Recommends decomposition by reference; implementation gated on deriving the parent↔child boundary math from the Lean 8-tuple.
- [`design/decomposition-foundations.md`](design/decomposition-foundations.md) — **RESEARCH** ([#89](https://github.com/halcyonic-systems/bert-lenses/issues/89)) — the math layer under the investigation's Option B: the Eq. 4.3 substitution slot by slot over the Lean 8-tuple, the boundary-contract bijection β, the three Lean statements that open the gate, and the Lean-first dependency order. Explicit non-goals: no grammar, kernel, or neutral-spec change.

Research foundations — what others build on; not themselves decisions:

- [`design/sl2-authoring-language.md`](design/sl2-authoring-language.md) — **RESEARCH** — the foundation behind `language/spec.md`: three concrete syntaxes over one neutral spec, the precedent survey (SysML v2, Modelica, Stella, Quint; gpt-jargon as negative control), keep/shed against Mobus and BERT SL v0.1, and the staged rung plan. Rungs 1–3 shipped 2026-07-18 ([#82](https://github.com/halcyonic-systems/bert-lenses/issues/82)); its 8 open questions remain closeable work.
- [`design/dynamics-research/`](design/dynamics-research/) — **RESEARCH** — the research trail behind the adopted dynamics position: six primary-source reads (Mobus, Bunge, Klir, Bertalanffy, category theory, external general-systems literature), a synthesis, and two adversarial critiques (`critique-novelty.md`, `critique-coverage.md`). Start at its [`README.md`](design/dynamics-research/README.md) for the reading order.
- [`design/llm-integration-research.md`](design/llm-integration-research.md) — **RESEARCH** — LLM context/authoring/analysis (rests on `kernel-architecture.md`). §11 is the lens-fidelity mechanism; §12 is the recommended-first-rung plan the 2026-07-17 analysis rung executed.
- [`design/lens-palettes.md`](design/lens-palettes.md) — **LIVE** — the lens grounding for Phase 3/4 (Klir / Bunge / Mobus), and the two kernel primitives (boundary identity, edge classification) behind the faithful renderings.
- [`design/educational-model-suite.md`](design/educational-model-suite.md) — **RESEARCH** — a 13-model graded curriculum teaching systems concepts through the instrument (primitive-first; refusals as lessons), plus a faculty-appeal appendix. Curriculum planned for [#80](https://github.com/halcyonic-systems/bert-lenses/issues/80); not yet in-tool.
- [`design/shape-vocabulary-research.md`](design/shape-vocabulary-research.md) — **RESEARCH** — notation precedents (Mobus's own icon set, Stella/Forrester, Odum, SysML ports, automata, Petri nets) for the palette shape vocabulary ([#81](https://github.com/halcyonic-systems/bert-lenses/issues/81)).
- [`design/design-system-draft.md`](design/design-system-draft.md) — **RESEARCH** — visual design system draft.

## Decisions

- [`decisions/0001-canvas-rendering-svg.md`](decisions/0001-canvas-rendering-svg.md) — **ADOPTED** — the hand-rolled React+SVG canvas call (vs. a graph library), from the blind-pick spike.
- [`decisions/0002-web-first-rebuild.md`](decisions/0002-web-first-rebuild.md) — **ADOPTED** — the egui → React/wasm rebuild (Rust brain, React face); written retrospectively from the repo record.
- [`decisions/0003-conservation-declared-not-assumed.md`](decisions/0003-conservation-declared-not-assumed.md) — **ADOPTED** — conservation is an invariant a model declares, never the engine's premise; the compose engine is the first interpreter of one dynamics-kind. Records the #86 position in force.

## Historical (pre-web-rebuild, kept as record)

- [`archive/canvas-architecture.md`](archive/canvas-architecture.md) — **HISTORICAL** — the standalone egui canvas (`src/main.rs`). Superseded by the web rebuild; its kernel-seam semantics (mode stamping, audit-panel verdict-quoting) carried forward and are still accurate, but the UI mechanics it describes are gone. (A stub remains at the old `canvas-architecture.md` path.)
- [`archive/fidelity-audit.md`](archive/fidelity-audit.md) — **HISTORICAL** — faithfulness verdicts from the egui-era canvas; the current fidelity assessment is [`theory-fidelity.md`](theory-fidelity.md).
- [`archive/`](archive/) — **HISTORICAL** — superseded design docs (see [`archive/README.md`](archive/README.md)).

## Root-level references

- **[Roadmap board](https://github.com/orgs/halcyonic-systems/projects/12)** — **LIVE** — the forward-looking plan, organized by epic (Reality Interface · Joy Surface · Resident Co-author · Trusted Seam · Legible Foundations · The Language · What Runs · Notation · Teaching Surface). There is no roadmap *file*; the retired one is [`archive/roadmap-pre-web-rebuild.md`](archive/roadmap-pre-web-rebuild.md).
- [`../crates/bert-lenses-kernel/API.md`](../crates/bert-lenses-kernel/API.md) — **LIVE** — the frozen JS↔wasm surface (append-only). Includes the SL surface (`compile_sl` / `emit_sl`).
- [`../web/DESIGN.md`](../web/DESIGN.md) — **LIVE** — Halcyonic Frost design tokens for the face.
