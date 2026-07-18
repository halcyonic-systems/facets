# docs/design/

Design positions and research foundations, grouped by status. See [`../README.md`](../README.md) for the status vocabulary and the full docs tour.

**Repo-claims convention.** Claims a design doc makes about *this repo* — that a code path exists, that a corpus file is present, that a function behaves a certain way — are held to the same VERIFIED / UNVERIFIED standard as claims about external sources. A repo-claim carries no more authority than a web-claim by virtue of being about our own code; it can be stale or wrong the same way. Correspondingly, a session that executes one of these docs verifies the doc against the current code as its **first step**, before acting on it. This is not optional diligence: unmarked repo-claims in `sl2-authoring-language.md` (an assumed auto-layout pass; a named corpus file that did not exist) were caught only when this check was finally applied, and a stale supersession nearly drove a spec-writing step on retired framing.

## LIVE (current, load-bearing)

- [`lens-palettes.md`](lens-palettes.md) — the lens grounding for Phase 3/4 (Klir / Bunge / Mobus) and the two kernel primitives (boundary identity, edge classification) behind the faithful renderings.

## ADOPTED (a decision in force)

- [`dynamics-principled-position.md`](dynamics-principled-position.md) — what counts as dynamics: a state-transition family satisfying the semigroup axiom; a dynamics-*kind* is the transition functor; conservation is an invariant the model declares, not the engine's premise. Adopted via [#86](https://github.com/halcyonic-systems/bert-lenses/issues/86); `language/spec.md` §8 is normatively bound to it.

## PROPOSED (awaiting adoption)

- [`hierarchical-decomposition-investigation.md`](hierarchical-decomposition-investigation.md) — every active path is flat (`project()` forces level 1, `to_canvas()` drops deeper levels, `validate_operational()` refuses `level > 1`); recommends decomposition by reference, gated on deriving the parent↔child boundary math from the Lean 8-tuple. Tracked as [#89](https://github.com/halcyonic-systems/bert-lenses/issues/89).

## RESEARCH (foundations others build on; not themselves decisions)

- [`decomposition-foundations.md`](decomposition-foundations.md) — the 8-tuple math under the investigation's Option B ([#89](https://github.com/halcyonic-systems/bert-lenses/issues/89)): the Eq. 4.3 substitution slot by slot, the parent↔child boundary-contract bijection, the three Lean statements that must exist first, and the honest dependency order (Lean-first).
- [`dynamics-research/`](dynamics-research/) — the research trail behind the adopted dynamics position: six primary-source reads, a synthesis, and two adversarial critiques (`critique-novelty.md`, `critique-coverage.md`). Start at its [`README.md`](dynamics-research/README.md) for reading order.
- [`sl2-authoring-language.md`](sl2-authoring-language.md) — the research foundation behind `language/spec.md`: three concrete syntaxes over one neutral spec, the precedent survey, the keep/shed against Mobus and BERT SL v0.1, and the staged rung plan. Kept as historical record of the language's shaping.
- [`llm-integration-research.md`](llm-integration-research.md) — LLM context/authoring/analysis, resting on `../kernel-architecture.md`.
- [`shape-vocabulary-research.md`](shape-vocabulary-research.md) — notation precedents for the palette shape vocabulary ([#81](https://github.com/halcyonic-systems/bert-lenses/issues/81)).
- [`educational-model-suite.md`](educational-model-suite.md) — a graded curriculum teaching systems concepts through the instrument. RESEARCH — curriculum planned for [#80](https://github.com/halcyonic-systems/bert-lenses/issues/80); not yet in-tool.
- [`design-system-draft.md`](design-system-draft.md) — visual design system draft.
