# The Neutral Interchange — CSV as a serialization of the kernel

**Status: RESEARCH.**

*A seed, not a build spec — 2026-07-24, from the Q6/CSV conversation (delegation-boundary session). Not a build spec yet — the framing to design against. Companion to the dynamics program (`dynamics-principled-position.md`, `dynamics-halfb-open-composition.md`) and the kernel (`theory-fidelity.md`). The compose semantics are tracked in #112; a faithful read of Baez's cospan paper is being mapped in (`operations/sessions/2026-07-24/references/baez-cospan-map.md`).*

## The core claim
The neutral interchange is **not "CSV for a domain." It is a serialization of the kernel** — `(T, R)` plus the coalgebraic dynamics layer. Everything domain-specific is a *lens over* that serialization, so "legible across many domains" falls out for free: a domain author reads/writes tables, the tool ingests them as a kernel object, and the **lenses do the domain interpretation on ingest**. (Lineage: Cliff's point that a pandas DataFrame is another view of Klir's things-and-relations — the same K≅2 discipline, pushed down to the file format.)

## The small family (one table, one concern)
A **small family of sheets sharing an entity vocabulary**, not one mega-schema — because a spreadsheet author thinks in one table, one concern. The family is grounded in **Klir's epistemological hierarchy**, so it isn't arbitrary:

| Sheet | What it carries | Klir level |
|---|---|---|
| **entities** | the variables/nodes + their state-sets, scale | source system |
| **relations** | the edges/couplings between entities | structure system |
| **transitions** | the dynamics rule — the coalgebra `c: X → F(X)` as data (transition table + weights) | generative system |
| **trajectory** | the run record — state-over-time (`H`) | data system |

**Open question (3 vs 4):** `structure` could be one sheet (entities+relations with a type column) or split into `entities` and `relations`. The argument for the split: **entities are the compositional interface** — composing two models means *identifying shared variables* (below), so making the entity/variable sheet first-class makes composition an operation rather than a parse. Leaning 4, but undecided.

## Composition — the formal home to build *toward* (not yet an instance)
*(Grounded in a full read of Baez, arXiv 2509.22584v2 → `operations/sessions/2026-07-24/references/baez-cospan-map.md`. Faithfulness tags below are that read's.)*

Under Baez's **variable-sharing paradigm**, open systems compose by *identifying variables*, via **decorated cospans** (dynamical systems need the decorated form, not the lighter structured one — §3.3, Thm 3.3). Composition = **pushout of the shared entities**; for dynamical systems specifically the decorations *sum* where variables overlap (§5: "forces add, rates add"). Natural reading: **entities are the compose interface** (the cospan feet), relations/transitions are the summed decoration, and the **trajectory is a black-boxing *output*** — which nudges the sheet family toward **3 composable (entities/relations/transitions) + 1 derived (trajectory)** [OUR-INFERENCE, low-med].

**What this is and is NOT — do not overclaim (this is OURS, never Baez's claim about our system):** "the interchange *is* a decorated cospan" is an **analogy and a target, not a proven instance.** Baez never touches the K≅2 kernel; has **no first-class environment** (only interfaces — Mobus's `E` has no Baez counterpart); composes at shared *entities*, not Mobus boundary-flows; and his summing rule **presumes additive dynamics — a type error for the FSA/Markov kinds** (you cannot sum transition functions / distributions the way you sum vector fields). Earning "is a decorated cospan" means building the decoration functor + laxator + coherence laws — undone work. The honest claim: **decorated-cospan / variable-sharing is the right formal home to build toward.**

What it *does* give us now [PAPER-SAYS, high]: peer-reviewed backing for `bert-compose`'s "sum contributions at shared nodes," and validation of **#112 Half A** (homogeneous composition). And it **confirms by omission that #112 Half B (heterogeneous, mixed-kind) is a genuine frontier** — Baez only maps *between* kinds via double functors (translation), never composes kind-A with kind-B in one model; the halfb doc's honesty holds exactly. **#166** (env↔env / SoS) maps cleanly to leaving the single-SoI Mobus lens for the peer-composition frame — Baez's cospan composition is that frame's formal model [med-high].

## Provenance — the epistemic-status trichotomy (load-bearing from line one)
The interchange ingests **observed** real-world data AND emits/holds **generated** synthetic data. Conflating them inverts the tool's whole promise ("minimize wild hallucination in LLM-driven systems research"). So provenance is a **first-class dimension**, not a flag — extending the prove/simulate layering into a trichotomy:

- **Proven** — the kernel/Lean layer (structural claims, formally verified). The floor.
- **Observed** — empirical data from a real system; has empirical warrant. *(Klir's data system.)*
- **Generated** — model-produced or LLM-synthesized; plausible, **no empirical warrant.** *(Klir's generative-system output.)*

Design consequences:
- **Per-cell, not per-file.** Real datasets are mixed (observed where measured, imputed where not), so provenance is a column/attribute, not a file tag.
- **It composes.** Glue an observed system to a synthetic one and the composite is mixed-provenance; provenance must survive the cospan pushout, not be lost at the seam.
- **UI must never let Generated occupy an Observed slot.** This is the anti-hallucination promise at the *data* layer (the general form of the dynamics doc's "H is *a* sampled path — the UI must say so").
- **Extends existing practice:** the `llm-drafted-pending` marker on the swept models, the `editorial` stamp on the parity corpus entry. Instinct → architecture.
- **Live in #67 now:** transition weights split exactly this way — "real counts" (Observed; the `List(X×Nat)` Nat-counts form the Lean type already carries) vs assumed priors (Generated).

## The LLM's place
Mediates the messy↔neutral boundary, **both directions, with provenance preserved**:
- **Ingest:** arbitrary real-world spreadsheet → the neutral kernel schema, tagged **Observed**. (Format stays rigorous; the *mapping* is fluid — the same layering as prove-vs-simulate.)
- **Generate:** theoretical model / prompt → plausible synthetic dynamics, stamped **Generated** — never presented as Observed.

## The tether is legacy — subsume, don't extend
The existing CSV tether (`crates/bert-tether/`) was built for the egui-era conservation engine: a *closed* column-role vocabulary (time / flow-magnitude / stock / parameter / ignore) whose only job is forcing the conservation run. The neutral interchange **subsumes** it — the old tether becomes one *consumer* of the `trajectory` sheet. Refactor warranted; **staged**, not part of #67.

## Relationship to existing issues (this consolidates, it doesn't sprawl)
- **Subsumes as consumers:** #67-thread-1 (model CSV round-trip) and #121 (ensemble dataset export) are special cases of this general interchange.
- **Compose semantics live in #112** (universal coalgebra / dynamics-semantics); the Baez cospan mapping feeds it.
- **#166** (env↔env / SoS) is the same "compose by shared variables" seam.
- **#67 lays the first brick:** the minimal transition-table round-trip the DTMC needs is the first real "transitions as CSV" — forward-compatible with this, without building it.

## Open, staged (the "long conversation")
The exact schema; 3-vs-4 sheets; the tether migration; the provenance UI grammar; the LLM ingest/generate mapping discipline; how far to lean on the decorated-cospan formalism vs a pragmatic first cut. None of this is #67. It is its own deep track — deliberately parked here so the framing is captured while hot.
