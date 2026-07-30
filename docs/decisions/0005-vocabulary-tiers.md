# ADR 0005 — Four vocabulary tiers: a tradition without a definition of *system* is not a lens

*2026-07-30 · status: **ADOPTED***

## Context

The repo carries four different kinds of named vocabulary, in four different
places, and until now the distinction between them lived only in module
docstrings. That was fine while the set was stable. It stopped being fine when a
concrete proposal arrived: **encode Troncale's Systems Process Theory as a fourth
lens alongside Klir, Bunge, and Mobus.**

The proposal is natural. SPT's process list (cycles, hierarchy, boundaries,
networks, feedback, flows) reads like lens vocabulary, it comes from a
card-carrying systems-science tradition, and `ladder.rs` already names Troncale
in the engine. An independent practitioner working from SPT in a different domain
(SNN authoring tools) arrived at the same list as a proposed set of authoring
primitives, which is real evidence the vocabulary is ergonomically right.

Getting this wrong in either direction is expensive: adding a fifth faithful lens
that isn't one would dilute the only claim the lens stack makes, and rejecting
SPT outright would throw away a catalogue the engine already uses.

## Decision

**Four tiers, named, with SPT placed at tier 2.**

| Tier | What it is | Where it lives | What it claims |
|---|---|---|---|
| 1. **Primitives** | The alphabet the engine steps. Ten `ProcessPrimitive` variants: Combining, Splitting, Buffering, Impeding, Propelling, Copying, Sensing, Modulating, Amplifying, Inverting | `bert-core/src/lib.rs` | atomic under this engine |
| 2. **Compositions** | Patterns wired *from* primitives. Troncale's processes live here | `bert-compose/src/ladder.rs` | a named wiring, plus its demonstration |
| 3. **Faithful lenses** | Klir, Bunge, Mobus — kernel verdicts, grounded claim-by-claim in Lean via `lean-provenance.md` | `bert-canvas/src/lenses.rs` | this is what that tradition *says* about this model |
| 4. **Vocabulary packs** | Domain renamings (Neuromorphics, political economy, protocol, Odum) | `bert-compose/src/lens.rs` | nothing dynamical — pure display |

Structure is owned by `bert-core` (`WorldModel` + the 8-tuple element types +
the 4-layer validator). Dynamics is owned by `bert-compose/src/circuit.rs`
(`step_dt`). Every tier above is data or presentation over those two.

**Tiers 3 and 4 are different objects and must not be collapsed.** Tier 3 is a
decision procedure whose verdicts carry Lean provenance. Tier 4 is an honest
renaming that claims nothing and is *tested* by claiming nothing: run the
homeostat under all four packs and the CSVs are byte-identical. That identity is
the artifact (`lens.rs`). A tier-4 pack that changed a number would be a defect;
a tier-3 lens that changed no verdict would be pointless.

## Why Troncale is tier 2, not tier 3

**A lens answers "what is a system." Troncale never does.** SPT is a catalogue of
what systems *do* — isomorphies and the Linkage Propositions between them — and
it is explicit that it is not an axiomatization. That is a type mismatch with
tier 3, not a quality judgment: Klir, Bunge, and Mobus each commit to an answer
that the kernel can hold them to, and SPT declines to.

The consequence is visible in SPT's own shape. With no object to reduce processes
to, there is no criterion for when two entries are the same or when the list is
complete, which is why the count keeps growing.

Tier 1 is also wrong for SPT: the sweep found its processes are mostly *not*
atomic under this engine, with two exceptions that are (Storage = the Buffering
primitive; Potential Fields = the gradient flow mode).

So **SPT is a consumer of the kernel, not a rival to it** — and supplying the
missing object is what lets the ladder say something SPT alone cannot.

## What the ladder does with it, and the honest limit

`sweep.rs` is careful in a way worth preserving: it does **not** claim SPT reduces
to our primitives. Troncale rejected linear reduction ("all are axiomatic, all
needed," 1978). Instead the sweep climbs *his own stated dependency ladder* and
asks per rung whether the signature behavior emerges from a primitive circuit,
judged by *his own* criteria (sustainability, influence-richness). Four outcomes,
and the boundary is the finding: constructible, is-a-primitive, out-of-scope
(structural rather than flow-dynamical), needs-agent-layer.

That converts Linkage Propositions from asserted dyads into passing tests where
the assertion *is* the demonstration.

**Known gap, recorded here rather than omitted:** `sweep.rs` and the
`troncale-sweep/` artifact bundle live only in the deprecated `bert` repo and
last ran 2026-06-17 against an engine with no `step_dt`. Within bert-lenses the
ladder's builders are present but its proofs are not, and `palette_macros()` and
`by_name()` currently have no callers. So "a stamped block is a demonstrated
block" is the intent, not yet the state of this tree.

## Consequences

- A new tradition earns tier 3 only by committing to an answer the kernel can
  check. Absent that, it is tier 2 or tier 4.
- Tier-4 packs stay dynamically inert by construction; the byte-identical-CSV
  property is the test, not a nicety.
- The Neuromorphics pack (tier 4) currently claims nothing, so it is not wrong.
  Whether it is *faithful* — whether a LIF membrane integrating to threshold and
  resetting is the same object as a conserved buffer — is an open question, and
  the place a separating instance would live.
