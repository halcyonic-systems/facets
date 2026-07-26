# docs/

**Status: LIVE.** The canonical index for `docs/` and `spec/`.

Start at the main [`README.md`](../README.md) and [`CLAUDE.md`](../CLAUDE.md) for the repo overview and working rules. This folder is the deeper reference layer.

**This file is the canonical index.** Every document under `docs/` and `spec/` is reachable from here, either listed directly or through a folder's own `README.md` ([`language/`](language/), [`design/`](design/), [`design/dynamics-research/`](design/dynamics-research/), [`archive/`](archive/)). `scripts/doc_lint.py` enforces exactly that, plus "nothing is orphaned" and "every relative link resolves" ([#235](https://github.com/halcyonic-systems/bert-lenses/issues/235)). There is deliberately no second hand-maintained index: two of them drift, and the drift is invisible.

**Status vocabulary.** Every document below carries one: **LIVE** (current, load-bearing) · **ADOPTED** (a decision in force) · **PROPOSED** (a position awaiting adoption — see its tracking issue) · **CONTINGENT(#N)** (normative content conditional on a pending decision — see issue #N) · **RESEARCH** (a foundation others build on; not itself a decision) · **HISTORICAL** (kept as record, superseded). Where one document supersedes another, both say so. The status lives **in the file**, above its first `## ` heading — a bolded `Status: <WORD>` line, or an ADR's bolded-word byline — and `scripts/doc_lint.py` fails the build on a file that carries none, carries two, or names a word outside the six ([#234](https://github.com/halcyonic-systems/bert-lenses/issues/234)). It was free prose in four different shapes until then, which is why nothing could check it. The carrier form and the reasoning are in [`../CONTRIBUTING.md`](../CONTRIBUTING.md#where-the-status-goes).

**Invariant.** LIVE/normative sections may not contain verbatim lifts from PROPOSED documents.

## Start here

- [`quickstart.md`](quickstart.md) — **LIVE** — ten minutes from `just dev` to a judged, running model, using the two smallest corpus files (bathtub, then process-m). The newcomer on-ramp.
- [`tour.md`](tour.md) — **LIVE** — the reader's tour: one running model (hal-projection) grown line by line, each step pairing SL with what the canvas and the three lenses render; three audience entry paths and the SL ↔ canvas ↔ JSON ↔ kernel notation table.
- [`glossary.md`](glossary.md) — **LIVE** — fast definitions of the ~15 load-bearing terms (system, lens, bond/mere, conservation invariant, WorldModel, Save vs Export, run ledger, SL, systemhood, mode/lens, neutral spec, golden, dynamics-kind, precondition, concordance), each grounded in a fuller doc.

## The language

- [`language/`](language/) — **SL, the bert-lenses system language.** Its [`README.md`](language/README.md) is the front door: what SL is, what it looks like, reading order, the corpus, and where the language lives in the code.
  - [`language/spec.md`](language/spec.md) — **LIVE** — the SL v1.0 specification: five design commitments, lexicon, EBNF grammar, semantics, annotation layer, round-trip contract, structure/dynamics boundary, worked examples, lineage, known gaps. Normative. (Was `docs/sl2-spec.md`; moved 2026-07-18 when the language got its own home.)
  - [`language/terminology-concordance.md`](language/terminology-concordance.md) — **LIVE** — the Klir·Bunge·Mobus terminology grid: 12 kernel distinctions × 3 traditions, every cell primary-cited and VERIFIED/UNGROUNDED-marked. SSOT for the spec's lexicon attribution, per-lens UI copy, and K≅2 convergence exhibits; federates the partial two-tradition mappings in SSF.

## Theory and kernel

- [`kernel-architecture.md`](kernel-architecture.md) — **LIVE** — what the kernel *is* as a system: what `describe`/`lens_facts`/`validate_mode`/`analyze` actually compute, **CODE-READ** against source with confidence ratings (its two marks — CODE-READ vs MACHINE-CHECKED — are defined at the top of the doc). Read before trusting the substrate.
- [`lean-provenance.md`](lean-provenance.md) — **LIVE** — the pinned `systems-science-foundations` commit behind every "machine-checked" claim, the **generated** per-claim map (rendered from [`lean-manifest.json`](lean-manifest.json), with each declaration's Lean *kind*), the staleness budget against SSF HEAD, the K ≅ 2 scope fence, the two resolution gates, the from-this-repo-alone audit path, and the pin-moves-with-the-fixture update discipline (issues [#128](https://github.com/halcyonic-systems/bert-lenses/issues/128), [#232](https://github.com/halcyonic-systems/bert-lenses/issues/232); the provenance complement to [`../spec/LENS_ENTRY_SPEC.md`](../spec/LENS_ENTRY_SPEC.md) §D).
- `lean-manifest.json` — **LIVE** — the machine-readable source of truth behind `lean-provenance.md`: one row per claim, carrying the SSF symbol and the Lean keyword it is declared with. The doc's tables are generated from it (`just provenance`); nobody hand-edits a citation string.
- [`theory-fidelity.md`](theory-fidelity.md) — **LIVE** — per-tradition (Klir/Bunge/Mobus) take/drop/where/why, the mode-stamp semantics, the perspectival-realist scope statement, and the #5 collapse as a worked example of the refuse-don't-truncate discipline. For a reader assessing the theory's quality, not just its UI.

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
- [`design/educational-model-suite.md`](design/educational-model-suite.md) — **RESEARCH** — a 13-model graded curriculum teaching systems concepts through the instrument (primitive-first; refusals as lessons), plus a faculty-appeal appendix. Not in-tool, and untracked: the curriculum was planned against #80 and #21, both of which closed in July 2026 having shipped narrower things.
- [`design/shape-vocabulary-research.md`](design/shape-vocabulary-research.md) — **RESEARCH** — notation precedents (Mobus's own icon set, Stella/Forrester, Odum, SysML ports, automata, Petri nets) for the palette shape vocabulary ([#81](https://github.com/halcyonic-systems/bert-lenses/issues/81)).
- [`design/design-system-draft.md`](design/design-system-draft.md) — **RESEARCH** — visual design system draft.

## Decisions

- [`decisions/0001-canvas-rendering-svg.md`](decisions/0001-canvas-rendering-svg.md) — **ADOPTED** — the hand-rolled React+SVG canvas call (vs. a graph library), from the blind-pick spike.
- [`decisions/0002-web-first-rebuild.md`](decisions/0002-web-first-rebuild.md) — **ADOPTED** — the egui → React/wasm rebuild (Rust brain, React face); written retrospectively from the repo record.
- [`decisions/0003-conservation-declared-not-assumed.md`](decisions/0003-conservation-declared-not-assumed.md) — **ADOPTED** — conservation is an invariant a model declares, never the engine's premise; the compose engine is the first interpreter of one dynamics-kind. Records the #86 position in force.
- [`decisions/0004-neutral-archive-canvasmodel-json.md`](decisions/0004-neutral-archive-canvasmodel-json.md) — **ADOPTED** — the neutral archive format is `CanvasModel` JSON. Adopted, then indexed nowhere for four days; its only inbound link was from an orphan until [#235](https://github.com/halcyonic-systems/bert-lenses/issues/235).

## The parked ledger

- [`parked.md`](parked.md) — **LIVE** — the permanent record of work that was thought through, decided on, or found out, and then deliberately not scheduled. Eleven entries retired from the issue board in the W30 ratification audit ([#234](https://github.com/halcyonic-systems/bert-lenses/issues/234)), each carrying what it is, what was decided, the evidence that settled it, and whether it has a live unpark trigger. It exists because 8 of 11 parked issues recorded a *finding*, and an issue is the wrong container for a finding.

## Historical (pre-web-rebuild, kept as record)

- [`archive/canvas-architecture.md`](archive/canvas-architecture.md) — **HISTORICAL** — the standalone egui canvas (`src/main.rs`). Superseded by the web rebuild; its kernel-seam semantics (mode stamping, audit-panel verdict-quoting) carried forward and are still accurate, but the UI mechanics it describes are gone. (A stub remains at the old `canvas-architecture.md` path.)
- [`archive/on-the-word-ladder.md`](archive/on-the-word-ladder.md) — **HISTORICAL** — the concordance of the three senses of "ladder/rung/climb" in this repo. Its mode-entry hazard (Bucket A) is retired: mode entry now speaks **lens** vocabulary (see [`theory-fidelity.md`](theory-fidelity.md), gated by `scripts/doc_lint.py`); the doc survives as the record of the words that legitimately stay (compose dependency ladder, per-edge classification, project-phase "rung"). Issue [#90](https://github.com/halcyonic-systems/bert-lenses/issues/90). (A stub remains at the old `on-the-word-ladder.md` path.)
- [`archive/fidelity-audit.md`](archive/fidelity-audit.md) — **HISTORICAL** — faithfulness verdicts from the egui-era canvas; the current fidelity assessment is [`theory-fidelity.md`](theory-fidelity.md).
- [`archive/`](archive/) — **HISTORICAL** — superseded design docs; [`archive/README.md`](archive/README.md) lists them all. One file there is **RESEARCH** rather than historical: `archive/gst-1968-full.md`, the Bertalanffy source extraction, which nothing superseded and which the dynamics research still reads against. It lives under `archive/` for its size.

Three redirect stubs remain at the pre-move paths so old links do not rot. They are three lines each and carry no content: [`canvas-architecture.md`](canvas-architecture.md), [`fidelity-audit.md`](fidelity-audit.md), [`on-the-word-ladder.md`](on-the-word-ladder.md).

## Root-level references

- **[Roadmap board](https://github.com/orgs/halcyonic-systems/projects/12)** — **LIVE** — the forward-looking plan, organized by epic (Reality Interface · Joy Surface · Resident Co-author · Trusted Seam · Legible Foundations · The Language · What Runs · Notation · Teaching Surface). There is no roadmap *file*; the retired one is [`archive/roadmap-pre-web-rebuild.md`](archive/roadmap-pre-web-rebuild.md).
- [`../crates/bert-lenses-kernel/API.md`](../crates/bert-lenses-kernel/API.md) — **LIVE** — the frozen JS↔wasm surface (append-only). Includes the SL surface (`compile_sl` / `emit_sl`).
- [`../web/DESIGN.md`](../web/DESIGN.md) — **LIVE** — Halcyonic Frost design tokens for the face, and the **one owner** of the design system. `design/design-system-draft.md`, `design/visual-language.md`, `design/lens-palettes.md`, and the retired `archive/design-system.md` are all subordinate to it.
- [`../spec/LENS_ENTRY_SPEC.md`](../spec/LENS_ENTRY_SPEC.md) — **LIVE** — the lens-entry specification; §D is the provenance complement to `lean-provenance.md`.
- [`running-permanently.md`](running-permanently.md) — **LIVE** — how to keep the app running as a permanent local service rather than a `just dev` session.
- [`../pipeline/README.md`](../pipeline/README.md) — **LIVE** — the corpus pipeline: its own venv, its own dependencies, and how to run it.
- [`../examples/README.md`](../examples/README.md) — **LIVE** — what the worked examples are and how to open them.
