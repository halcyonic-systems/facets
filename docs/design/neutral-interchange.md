# The Neutral Interchange — CSV as a serialization of the kernel

*Status: RESEARCH SEED, 2026-07-24. From the Q6/CSV conversation (delegation-boundary session). Not a build spec yet — the framing to design against. Companion to the dynamics program (`dynamics-principled-position.md`, `dynamics-halfb-open-composition.md`) and the kernel (`theory-fidelity.md`). The compose semantics are tracked in #112; a faithful read of Baez's cospan paper is being mapped in (`operations/sessions/2026-07-24/references/baez-cospan-map.md`).*

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

## Composition — the interchange as an algebra, not a format
This is where the interchange stops being I/O and becomes structure. Under Baez's **variable-sharing paradigm**, open systems compose by *identifying variables*, via structured/decorated cospans. If the CSV is the *decoration* on a cospan whose apex is the shared **entities**, then **composing two models = gluing their sheets on shared variables = a cospan pushout.** So the interchange, done right, is the object of a decorated-cospan double category and composition comes with formal semantics (#112). This is the same machinery under **#166** (environment↔environment / the systems-of-systems seam — "compose by identifying variables" is its formal version) and **#112** (open composition of heterogeneous dynamics). *[The precise mapping — structured vs decorated cospans, what fits, what's a stretch — is being verified against the actual paper; do not overclaim until that read lands.]*

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
