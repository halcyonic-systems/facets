# On the word "ladder" (and "rung", and "climb")

> **Status: HISTORICAL.** Record (2026-07-18), not current terminology. The
> mode-entry hazard this doc named (Bucket A below) has been retired at the
> source: LIVE docs and user-facing strings no longer call mode entry a
> "ladder"/"rung"/"climb" — the modes are the **three lenses** (Klir→Core,
> Bunge→Structural, Mobus→Operational), a meet-semilattice, and one says "enter
> the Bunge lens" / "satisfy the Bunge precondition", never "climb a rung."
> `docs/theory-fidelity.md` and `docs/kernel-architecture.md` carry the honest
> lattice statement; `scripts/doc_lint.py` now gates the mode-entry sense out of
> LIVE docs. This file is kept as the **concordance of the three surviving
> senses** (compose dependency ladder, per-edge classification, project-phase
> "rung") so the words that legitimately stay are legible. See issue
> [#90](https://github.com/halcyonic-systems/bert-lenses/issues/90).

This repo's docs and code use "ladder"/"rung"/"climb" for **three unrelated concepts**. None of the three is wrong on its own terms, but the same word carrying three different shapes is a readability hazard worth naming explicitly, so a reader (human or LLM) doesn't import one sense's properties into another sense's sentence.

## Bucket A — mode entry (Core / Structural / Operational / Full). The one that's actually misleading.

This is a **lattice**, not a ladder: `Kernel.toBunge` (gated on `Kernel.HasBond`, `ViewGeneration.lean:115,119`) and `Kernel.toMobus` (gated on `Kernel.Irreflexive`, `:163,203`) are independent preconditions over the same kernel. Neither entails the other — a model can satisfy Mobus's irreflexivity while failing Bunge's bond requirement, and vice versa. `crates/bert-core/src/transition.rs:6-9` states this precisely: "a meet-semilattice (tree-shaped); no joins by design — Core is the meet of every pair, Structural and Full are parallel leaves with no join." `crates/bert-core/src/validate.rs:114-116` says the same thing in `validate_mode`'s own doc comment: "the rungs are parallel lenses, not a tower... they share only Core's on-ness."

The app's own lens-entry test fixtures encode this correctly — non-nesting is by design (a Klir-only aggregate can enter Operational, since irreflexivity doesn't require a bond, while being barred from Structural, since it has none). "Ladder / climb / rung" language, used *without* the caveat above in the same breath, tells a reader the opposite of what's true: that Klir → Bunge → Mobus is one ascending path where later stages presuppose earlier ones. It doesn't.

**Where this word choice appears** (non-exhaustive; see the `feat/theory-front-door` branch history for the fuller grep): `crates/bert-core/src/lib.rs` (`Mode` enum doc comment), `validate.rs` (`validate_mode` doc comment, a section-header comment), `crates/bert-canvas/src/lenses.rs` (`analyze` doc comment), `crates/bert-lenses-kernel/src/api.rs` (the frozen wasm API doc comment for `validate_mode`), `docs/canvas-architecture.md` and `ROADMAP.md` (both marked historical, pre-web-rebuild). One location is a **live runtime string**, not just a doc comment: `crates/bert-core/src/operational.rs`'s `validate_operational` error/hint text ("a representational rung with no flow semantics to execute" / "Author the model at the Operational rung...") is surfaced verbatim in the app's audit panel — that's the one place this word choice reaches an end user mid-task rather than a developer reading source.

Most of these instances are qualified correctly nearby (as `transition.rs` and `validate.rs` are) — the risk is concentrated in places that use the word *without* the caveat, especially anything a reader might land on first (a README, a roadmap, an error message). `ROADMAP.md`'s Arc 4 previously asserted the false version outright ("this closes the ladder... dynamics arrives as the top rung") — that line has been corrected (2026-07-17) to name the lattice explicitly and point here. `docs/theory-fidelity.md` is the canonical place to send a reader who needs the honest version once, rather than re-deriving it per file.

## Bucket B — the compose "dependency ladder" (`crates/bert-compose/src/ladder.rs`). Correctly named — leave it.

A genuinely different, genuinely linear concept: Troncale's systems processes ordered by build-complexity. The module's own doc comment: "the atomic→composite gradient: roots (Potential Fields, Flows) sit nearest the atoms; higher processes (Feedback → Oscillation → Networks) are increasingly composite" (`ladder.rs:15-17`). Rung *N* here really does build on rung *N-1*'s primitives, and the module already states the honesty explicitly: "a Troncale process is not a brick — it's a pattern wired from bricks" (`ladder.rs:8-9`). Also covers the "rung 2 / rung 3" multi-timescale pipeline demonstration stages (`pipeline/rung2_allocation.py`, `pipeline/rung3_enterprise.py`, `pipeline/rung3_staircase.py`, and their mirrors in `bert-tether` and `bert-compose`'s `circuit.rs`/`export.rs`), where stage 3 literally depends on stage 2's infra. No reframe proposed.

## Bucket C — the "edge ladder" (flow → bond-candidate → relation, a per-edge classification). Also a real ordering — leave it, but note the collision.

`crates/bert-canvas/src/lenses.rs:10-13`: "The edge ladder (edges): flow (κ + substance) → bond-candidate (directed + action test) → relation (neutral)." This describes how one relation is classified through increasingly rich per-lens predicates on the *same edge*, not model-level mode entry — and unlike Bucket A, there is a genuine subset relationship here: a bond is a relation with `is_bond: true`, a mere relation is a relation with `is_bond: false`. "Ladder" for a single edge's classification is licensed by an actual nesting fact. The only issue is that it's the same word as Bucket A for a structurally different kind of claim (per-edge, not per-model); a reader skimming both docs in one sitting could reasonably conflate the two. No reframe proposed — flagged here so the collision is legible rather than silently confusing.

## A third, unrelated sense: "rung" as roadmap-stage

`docs/design/llm-integration-research.md` uses "rung" a third way — as a project-plan stage ("the analysis rung," "Rung A / Rung B" for authoring milestones, §12 "Recommended first rung"). This is an ordinary project-sequencing metaphor (each rung is a prerequisite for the next *build*, unrelated to the Lean lattice). Not part of the vocabulary debt; noted so the word isn't reflexively swapped out where it's the right word.

## Bottom line

Only Bucket A is a fidelity problem, because only Bucket A's plain-English meaning contradicts what the Lean proves. Buckets B and C use the same words for genuinely ordered/nested things and are fine as-is. Where you see "ladder/rung/climb" in this repo, check which bucket you're in before assuming linearity.
