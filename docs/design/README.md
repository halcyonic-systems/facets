# docs/design/

**Status: LIVE.** The status-grouped index of this folder.

Design positions and research foundations, grouped by status. See [`../README.md`](../README.md) for the status vocabulary and the full docs tour.

**Repo-claims convention.** Claims a design doc makes about *this repo* — that a code path exists, that a corpus file is present, that a function behaves a certain way — are held to the same VERIFIED / UNVERIFIED standard as claims about external sources. A repo-claim carries no more authority than a web-claim by virtue of being about our own code; it can be stale or wrong the same way. Correspondingly, a session that executes one of these docs verifies the doc against the current code as its **first step**, before acting on it. This is not optional diligence: unmarked repo-claims in `sl2-authoring-language.md` (an assumed auto-layout pass; a named corpus file that did not exist) were caught only when this check was finally applied, and a stale supersession nearly drove a spec-writing step on retired framing.

**One design-system owner.** [`../../web/DESIGN.md`](../../web/DESIGN.md) (Halcyonic Frost tokens) is the single authority on palette, type, and shape for the face. `design-system-draft.md`, `visual-language.md`, and `lens-palettes.md` below are subordinate to it and may not contradict it; [`../archive/design-system.md`](../archive/design-system.md) is the retired egui-era version. Where a rule appears in more than one of them, `web/DESIGN.md` wins.

## LIVE (current, load-bearing)

- [`lens-palettes.md`](lens-palettes.md) — the lens grounding for Phase 3/4 (Klir / Bunge / Mobus) and the two kernel primitives (boundary identity, edge classification) behind the faithful renderings.
- [`visual-language.md`](visual-language.md) — the register the app's pages are written in (a ledger / spec sheet / monograph plate, not a dashboard). Adopted 2026-07-24 from a three-way treatment bake-off; referenced from `web/src/HomeScreen.tsx` and `scripts/make-icon.py`. Subordinate to `web/DESIGN.md`.
- [`dynamics-coalgebra-halfa.md`](dynamics-coalgebra-halfa.md) — the buildable half of [#112](https://github.com/halcyonic-systems/bert-lenses/issues/112): the coalgebra classification, merged. The step `T` the Klir register reads and the Bunge trajectory unfolds; cited from `KlirRegister.tsx` and `BungeStateSpace.tsx`.

## ADOPTED (a decision in force)

- [`dynamics-principled-position.md`](dynamics-principled-position.md) — what counts as dynamics: a state-transition family satisfying the semigroup axiom; a dynamics-*kind* is the transition functor; conservation is an invariant the model declares, not the engine's premise. Adopted via [#86](https://github.com/halcyonic-systems/bert-lenses/issues/86); `language/spec.md` §8 is normatively bound to it.

## PROPOSED (awaiting adoption)

- [`mobus-lifecycle-formalization.md`](mobus-lifecycle-formalization.md) — the position on finishing the life-cycle extension Mobus's 8-tuple paper opens and abandons (five empty stage headers): what the kernel already answers, what is genuinely open, what is not ours to decide. Subordinate to `dynamics-principled-position.md`.
- [`hierarchical-decomposition-investigation.md`](hierarchical-decomposition-investigation.md) — every active path is flat (`project()` forces level 1, `to_canvas()` drops deeper levels, `validate_operational()` refuses `level > 1`); recommends decomposition by reference, gated on deriving the parent↔child boundary math from the Lean 8-tuple. Tracked as [#89](https://github.com/halcyonic-systems/bert-lenses/issues/89).

## RESEARCH (foundations others build on; not themselves decisions)

- [`decomposition-foundations.md`](decomposition-foundations.md) — the 8-tuple math under the investigation's Option B ([#89](https://github.com/halcyonic-systems/bert-lenses/issues/89)): the Eq. 4.3 substitution slot by slot, the parent↔child boundary-contract bijection, the three Lean statements that must exist first, and the honest dependency order (Lean-first).
- [`dynamics-research/`](dynamics-research/) — the research trail behind the adopted dynamics position: six primary-source reads, a synthesis, and two adversarial critiques (`critique-novelty.md`, `critique-coverage.md`). Start at its [`README.md`](dynamics-research/README.md) for reading order.
- [`sl2-authoring-language.md`](sl2-authoring-language.md) — the research foundation behind `../language/spec.md` (LIVE): three concrete syntaxes over one neutral spec, the precedent survey, the keep/shed against Mobus and BERT SL v0.1, and the staged rung plan. Rungs 1–3 shipped 2026-07-18 ([#82](https://github.com/halcyonic-systems/bert-lenses/issues/82)); its 8 open questions remain closeable work. **Not superseded** — the doc's own header says so, and this index said otherwise until 2026-07-26 ([#235](https://github.com/halcyonic-systems/bert-lenses/issues/235)).
- [`llm-integration-research.md`](llm-integration-research.md) — LLM context/authoring/analysis, resting on `../kernel-architecture.md`.
- [`shape-vocabulary-research.md`](shape-vocabulary-research.md) — notation precedents for the palette shape vocabulary ([#81](https://github.com/halcyonic-systems/bert-lenses/issues/81)).
- [`educational-model-suite.md`](educational-model-suite.md) — a graded curriculum teaching systems concepts through the instrument. RESEARCH — not in-tool, and untracked: planned against #80 and #21, both closed in July 2026 having shipped narrower things.
- [`design-system-draft.md`](design-system-draft.md) — a visual design-system sketch to react to, built on `web/DESIGN.md` rather than forking it. Not committed and not a spec; guides [#50](https://github.com/halcyonic-systems/bert-lenses/issues/50).
- [`dynamics-halfb-open-composition.md`](dynamics-halfb-open-composition.md) — the frontier half of [#112](https://github.com/halcyonic-systems/bert-lenses/issues/112): open composition of *heterogeneous* dynamics. Companion to `dynamics-coalgebra-halfa.md` (the merged half).
- [`lifecycle-prior-art.md`](lifecycle-prior-art.md) — the provenance record under `mobus-lifecycle-formalization.md`: 2025-02 → 2026-05 life-cycle work across three archive trees and two repos, read at source, with wrong claims marked wrong rather than quietly corrected.
- [`neutral-interchange.md`](neutral-interchange.md) — a seed (2026-07-24): the neutral interchange as a *serialization of the kernel* `(T, R)` rather than "CSV for a domain", with lenses doing the domain interpretation on ingest. Framing to design against, not a build spec.

## Plans and drafts (execution records, not positions)

These carry no normative weight; they exist so an implementation session is execution rather than re-derivation. A plan that has shipped stays here as the record of what was planned. In the six-word vocabulary they are **RESEARCH** — something later work builds on, not itself a decision — and each file says so; this heading is a reading aid, not a seventh status.

- [`corpus-contract-draft.md`](corpus-contract-draft.md) — [#132](https://github.com/halcyonic-systems/bert-lenses/issues/132): what an author-grounded teaching corpus entry **is**, mechanically — file layout, header grammar, and the corpus-precedence rule separating the golden corpus, the teaching fixtures, and the source corpus ([`../../assets/corpus/README.md`](../../assets/corpus/README.md)). The decision it records is [`../decisions/0004-neutral-archive-canvasmodel-json.md`](../decisions/0004-neutral-archive-canvasmodel-json.md).
- [`llm-sl-authoring-plan.md`](llm-sl-authoring-plan.md) — the draft→preview→assess→accept pipeline for LLM-authored SL, serving [#10](https://github.com/halcyonic-systems/bert-lenses/issues/10) and [#14](https://github.com/halcyonic-systems/bert-lenses/issues/14) as one program. Cited from `web/src/App.tsx`, `web/src/coauthor.ts`, and `crates/bert-canvas/examples/slcheck.rs`.
- [`issue-154-plan.md`](issue-154-plan.md) — [#154](https://github.com/halcyonic-systems/bert-lenses/issues/154): the Klir source-system C table and the phase-5 dynamics readouts, as three deliberately unlumped pieces.
