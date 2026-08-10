# The epistemic ordering — research direction, not doctrine

**Status: RESEARCH**. Nothing here is Lean-proven, and nothing here changes the kernel. This note exists so the repo states, in one place and with its scope fenced, the reading that motivates data-first entry (#309) and the Data mode (#304). For the proven statements about the three lenses, read [`theory-fidelity.md`](../theory-fidelity.md) — that document wins every conflict with this one.

## Two axes, kept distinct

The repo carries two orthogonal structures over the same three traditions:

1. **The lens lattice** (proven). One kernel, three faithful views: `toKlir` unconditional, `toBunge` behind `HasBond`, `toMobus` behind `Irreflexive`, one proven composite, neither gate entailing the other. A meet-semilattice of parallel readings — not a tower, not a ladder ([`archive/on-the-word-ladder.md`](../archive/on-the-word-ladder.md) records the retirement of climb vocabulary here).

2. **Klir's epistemological levels** (adopted doctrine, censused). source → data → generative → structure → metasystem, per *Facets* §4.5; every shipped entry declares its level ([`288-level-census.md`](../288-level-census.md)); the kernel refuses cross-level comparison (`check_cross_level`, per Facets §5.4).

The research direction concerns the second axis only: **what the three traditions each say about moving along it** — how an investigator gets from observations to asserted structure.

## The reading

Extracted from the primary texts (full sources and line citations in the vault: `operations/systems-science/knowing-a-system-three-methods.md` and `dsa-realizes-gsps.md`):

- All three traditions accept that **behavior underdetermines structure** — Bunge's coupling-matrix argument, Klir's reconstruction families, Mobus's strong-inference critique are three statements of one fact.
- **Klir names the rungs**: the level hierarchy is his, and his reconstructability analysis is the honest machinery for ascending it — always returning candidate *sets*, never a single induced structure.
- **Bunge grades them**: his depth ladder (black box → grey box → translucid/mechanismic box) is a normative reading of the same climb — a generative-level model predicts without explaining; only disclosed mechanism explains.
- **Mobus climbs them procedurally**: DSA enters at the data rung (instrumented boundary = data system) and reaches structure by opening the box rather than inferring through it. This leg is **primary text, not our synthesis**: Mobus Ch. 6 §6.2.1 presents DSA as operationalizing Klir's GSPS, level by level, and describes his own definition as Klir's sparse `(T, R)` enriched.

## What this licenses in the repo

- **Data-first entry is canonical, not a workaround** (#309): the traditions' own ordering starts where the CSV starts.
- **The ascent sentence** — *inducing structure from observations is inference, not reading* — may appear in UI copy with confidence: it carries all three traditions' warrant.
- If structure induction ever ships (RA import, #309's named post-IS fork), it returns **candidate sets**, never a single answer. That is Klir's discipline, and the other two traditions' arguments for it.

## What this must never be cited as

- Not as proven. The lens lattice has Lean backing; this ordering has none and needs none — it is a reading of method texts, kept in the vault with line citations.
- The **Bunge leg is our construction**: Mobus never cites Bunge; Bunge never cites Klir. Only the Mobus→Klir edge is asserted in a primary source.
- Not as subsumption. Cross-tradition mappings are stated as **measured loss** (what a redescription drops), never as "X is contained in Y." The known losses in Mobus's own redescription of Klir are catalogued in the vault doc.
- Mode entry across the three lenses stays in lens vocabulary (see axis 1). The climb is along Klir's levels *within* a lens, never from one author's lens "up" to another's.
