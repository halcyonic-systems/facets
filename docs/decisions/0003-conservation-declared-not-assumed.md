# ADR 0003 — Conservation is declared, not assumed

*2026-07-18 · dynamics doctrine (#86) · status: **ADOPTED***

## Context

From the first compose engine, "conservation-faithful simulation" was the run
face's public identity: the ledger balanced every tick, and the framing implied
that balancing was what dynamics *is*. The dynamics research trail
(`docs/design/dynamics-research/`) and the resulting position
(`docs/design/dynamics-principled-position.md`, ADOPTED via #86) showed that
this mistakes a special case for the category: dynamics is a state-transition
family satisfying the semigroup axiom (Mesarovic–Takahara Def 2.7); a
dynamics-*kind* is the transition functor; conservation is one declarable
invariant (axis D), not the engine's premise. An outside council pass
(2026-07-18) independently flagged the old framing as the repo's #1
inconsistency: the LIVE spec already spoke the new position while the front
door still sold the old one.

## Decision

Conservation is an invariant a **model declares**, never a premise the engine
assumes.

- The spec's structure/dynamics boundary (`docs/language/spec.md` §8) binds
  normatively to the position doc; models declare a dynamics record (support,
  carrier, kind, invariants, rates) and engines interpret it.
- The compose engine is the **first interpreter of one kind** (Id-functor over
  ℝⁿ stocks with an additive conservation invariant), not the meaning of Run.
  Further kinds are declarable — the first non-conservation kind (a DTMC over
  bare `X^Σ`) is scoped in #67.
- In code: `Circuit.invariant` (axis D) defaults to `ConservedAdditive` — the
  ledger stays on for every existing model — and may be declined, which removes
  the accounting without touching the transition math. The semigroup contract
  and "H is a record, never an input to T" are pinned as property tests in
  `crates/bert-compose/src/circuit.rs`.

## Rationale

The position doc carries the full argument; this ADR records that it is in
force. The short form: an engine that *assumes* conservation cannot host kinds
whose carrier has no conserved quantity (Markov chains, Boolean networks), and
it misattributes to "dynamics" what is really one declared invariant of one
kind. Declaring the invariant keeps the ledger's honesty where it is earned
(the conservation kind balances every tick, checked) while opening the
architecture the K≅2 program needs: kinds as transition functors, verdicts and
invariants per declaration.

## Consequences

- README and kernel-architecture were reworded off "conservation-faithful" as
  Run's identity (2026-07-18); the doc-lint (#92) guards adjacent provenance
  drift.
- The opt-in ledger unblocks single-trajectory non-conservation targets (RBN;
  #86 Q3 decision) and the second dynamics-kind (#67, DTMC).
- Any future engine claiming a conservation guarantee must earn it as a
  declared invariant it checks, not inherit it as vocabulary.
