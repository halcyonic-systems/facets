# Terminology Concordance — Klir · Bunge · Mobus

**Status**: Reference (LIVE). Compiled 2026-07-18 from primary sources and primary-read notes; every cell carries a **VERIFIED** or **UNGROUNDED** mark, and no cell is filled from general knowledge. This is the SSOT the SL lexicon table (`spec.md` §3) summarizes; it also serves the per-lens UI copy (palette labels, `describe()` typesetting) and the K≅2 convergence program — a filled-in concordance *is* a compact convergence exhibit.

**How to read it.** For each kernel distinction, the row gives each tradition's term and its grounding. Convergence rows (all traditions share a word or an isomorphic concept) are evidence for the common core; divergence cells (a tradition lacks the distinction) are equally informative — they are exactly what the corresponding lens *drops*, and they explain the lens's rendering choices. **VERIFIED** = the term was found in a primary text on disk, or in a primary-read note that itself cites the book by page/line. **UNGROUNDED** = not found in an available source this pass; listed honestly in §14 rather than filled in.

**Citation roots** (sibling repos):
- `GSR/` = `halcyonic-projects/active/general-systems-reasoner/`
- `VAULT/` = the Obsidian vault, `operations/systems-science/`
- `SSF/` = `halcyonic-projects/active/systems-science-foundations/`
- bare paths = this repo

---

## The grid (summary; per-row notes below)

| # | Distinction | Klir | Bunge | Mobus |
|---|---|---|---|---|
| 1 | The system | `S = (T, R)` | `σ = ⟨C, E, S⟩` | 7-tuple `⟨C,N,G,B,T,H,Δt⟩`; SOI `S₀,₀` |
| 2 | Part inside | **thing** (element of T) | **component** (C) | **component** (C) |
| 3 | Thing outside | environment (observer-side, not a coordinate) | **environment** (E) | **environment** = sources & sinks |
| 4 | Connection | **relation** (R) | connection / coupling / **bond** (▷) | interaction / **flow** (N, G edges) |
| 5 | Bond vs mere | — (one undifferentiated R) | **bondage B vs B̄** | — (no such split) |
| 6 | Connection kind | — (thinghood, excluded) | flows of **energy, matter, fields; informational** | substances: **material, energy, message** |
| 7 | Direction | **directed vs neutral systems** (observer) | asymmetry of action ▷ (agent/patient) | inherent flow direction (k→o) |
| 8 | Boundary | observer-drawn distinction | **topological boundary** (1992), link-type-relative | **B = ⟨P, I⟩** |
| 9 | Interface | — | **interface points** = i/o terminals ∈ boundary | **interfaces I** (2nd coordinate of B) |
| 10 | Work-process primitives | — | — | **atomic process taxonomy** (combine, split, buffer, …) |
| 11 | System types | two-axis §2.4 (restrict T / restrict R) | **kingdoms + five genera** (Post. 6.4) | concrete/abstract + texture axes |
| 12 | Milieu vs objects | — | — (E is discrete things only) | discrete Src/Snk + **channels/fields** |

Bold marks the term SL adopted (or, in row 1, the formal object each lens typesets). Rows 2, 3, 6, 9, 11 are the strong convergence rows; rows 5, 7 (Klir), 10, 12 are single-tradition contributions — each is exactly one lens's distinctive vocabulary.

---

## 1. The system itself

- **Klir — `S = (T, R)`. VERIFIED.** "S = (T, R) — where T is 'a set of things distinguished within S' and R 'a relation … defined on T'" (`GSR/klir_markdowns/Klir-Systemhood-vs-Thinghood-(2001).md:19`).
- **Bunge — `σ = ⟨C, E, S⟩`. VERIFIED.** "the ordered triple σ = ⟨C, E, S⟩ is (or represents) a system over T iff C and E are mutually disjoint subsets of T … and S is a nonempty set of relations on the union of C and E" (`SSF/docs/reference/mobus-bunge-system-definitions-reference.md:185`; minimal model at `GSR/bunge_markdowns/Bunge-Concrete-System-Definition-CES-(1979).md:77-79`). The fourth CESM coordinate M (Mechanism) is VERIFIED as this repo's usage (`docs/theory-fidelity.md:24`) but not yet as a verbatim Bunge quote (§14).
- **Mobus — the 7-tuple, SOI. VERIFIED, with the provenance nuance this repo already carries:** the book prints a **7**-tuple `⟨C,N,G,B,T,H,Δt⟩` (`VAULT/mobus/4-a-model-of-system.md:196-199`); the 8-tuple with E first-class is the Lean formalization's deliberate improvement (`SSF/Systems/Mobus/Tuple.lean`), credited as such in anything published. "S₀,₀ is the designated SOI" (`SSF/docs/reference/mobus-bunge-system-definitions-reference.md:133`).

**Convergence reading:** three formal objects, one referent — this is the K≅2 claim itself, and the three `describe()` typesettings render exactly these three signatures.

## 2. A thing inside the system — the strongest shared word

- **Klir — "thing." VERIFIED.** T = "a set of things distinguished within S"; thinghood resides in T (`Klir-Systemhood-vs-Thinghood-(2001).md:19`).
- **Bunge — "component," composition C. VERIFIED.** "the A-composition of σ at a given time t is the set of its A-parts at t" (`Bunge-Concrete-System-Definition-CES-(1979).md:55-56`).
- **Mobus — "component," C. VERIFIED.** "C is a set of components and their 'type' … may have partial inclusion" (`mobus-bunge-system-definitions-reference.md:137`).

**Convergence reading:** Bunge and Mobus *share the word and the letter* — SL's `component` is a two-tradition word. Klir's divergence ("thing") is principled, not lexical accident: his T carries thinghood, which he excludes from systemhood — which is why the Klir lens relabels what the other two share.

## 3. A thing outside the system

- **Klir — "environment," observer-side. VERIFIED, not a coordinate.** "an agent that is not part of the system … referred to as an environment of the system; it includes in many cases the investigator" (`VAULT/klir/klir-facets.md:3648-3656`). The bare `S=(T,R)` has no environment slot; environment enters through input variables.
- **Bunge — "environment," E. VERIFIED.** E_A = the things outside C that act on or are acted on by a component (`Bunge-Concrete-System-Definition-CES-(1979).md:58-59`).
- **Mobus — "environment" = sources and sinks. VERIFIED.** "The environment contains all of the sources of inputs … and the sinks for outputs … all of the channels (or fields) through which flows occur" (`mobus-bunge-system-definitions-reference.md:40`).

**Convergence reading:** `environment` is a Bunge–Mobus shared word (with Bunge's E the formal coordinate SL's `Role::Environment` mirrors); Mobus contributes the source/sink refinement SL uses as author-intent words, with identity edge-derived (`spec.md` §5.2).

## 4. A connection between parts

- **Klir — "relation," the seat of systemhood. VERIFIED.** Binary `R ⊆ T×T` (`GSR/klir_markdowns/Klir-Relations-(2001).md:5-7`); Klir explicitly subsumes "interaction, interconnection, coupling, linkage, cohesion, constraint, interdependence, function, organization, structure…" under mathematical relation (`:63`).
- **Bunge — "connected (or coupled, or linked, or bonded)." VERIFIED.** "two things are connected … if at least one of them acts on the other"; action `a▷b` "modifies the latter's behavior line, or trajectory, or history" (`Bunge-Concrete-System-Definition-CES-(1979).md:27-29`).
- **Mobus — "interactions"/flows. VERIFIED.** "N is generally a flow network through which real substances are moving from one node (component) to the next with causal influence" (`mobus-bunge-system-definitions-reference.md:157-161`); boundary flows form the bipartite graph G (`:167`).

**Convergence reading:** one concept, three vocabularies at three levels of commitment — Klir's bare relation, Bunge's action-backed connection, Mobus's substance-carrying flow. SL's `flow` keyword is Mobus's word; the kernel's `Relation` is Klir's object; the bond semantics are Bunge's. One line of SL touches all three, which is the unified-language thesis in miniature.

## 5. Bond vs mere relation — Bunge's alone

- **Bunge — VERIFIED, verbatim.** "the total set of relations among the components … may be decomposed into its bondage B_A and the set B̄_A of nonbonding relations"; "Unlike a mere relation, a connection makes some difference to its relata"; systemhood requires B_A ≠ ∅ (`Bunge-Concrete-System-Definition-CES-(1979).md:23, 33, 62-69`).
- **Klir — absent, VERIFIED.** All of systemhood collapses into one undifferentiated R (`Klir-Relations-(2001).md:63`); the Klir lens drops bond-vs-mere (`docs/theory-fidelity.md:20`).
- **Mobus — absent** in sources read (§14).

SL's `mere` is therefore a **single-tradition contribution**, and the aggregate/system verdict it feeds (Bunge Def 1.1 in the UI) is the most lens-specific rule in the tool.

## 6. The kind of a connection — SL's kind words are Bunge's, verbatim

- **Bunge — VERIFIED, verbatim.** "Dynamic connections are often called flows — of **energy, matter, or fields**. If a physical flow happens to carry information, the connection is called **informational** … the physical/informational distinction is one of emphasis, not a dichotomy, for every information flow rides on some energy flow" (`Bunge-Concrete-System-Definition-CES-(1979).md:92`). SL's `energy | matter | field | informational` is this sentence as an enum (`crates/bert-canvas/src/canvas.rs:52-62`).
- **Mobus — material / energy / message. VERIFIED.** "All processes transform low-quality material, energy, or messages into high-quality versions of the same" (`dynamics-research/read-mobus.md:120-124`); messages copy rather than conserve (`read-mobus.md:305-324`). The 1:1 mapping Kind→Substance is code (`canvas.rs:64-70`): Matter→Material, Informational→Message, Energy/Field→Energy.
- **Klir — absent, VERIFIED.** Kind is a thinghood property, excluded from R (`docs/theory-fidelity.md:20`).

**Convergence reading:** a genuine two-tradition near-isomorphism (4 Bunge kinds ↔ 3 Mobus substances, collapse documented in code), with Klir's principled abstention explaining why the Klir lens shows untyped edges.

## 7. Direction

- **Klir — "directed" vs "neutral" systems. VERIFIED, verbatim.** "Systems whose variables are classified into input and output variables are called directed systems; those for which no such classification is given are called neutral systems" (`VAULT/klir/klir-facets.md:3657-3659`). An observer's commitment, added to the source system — exactly why SL carries it as the `@directed` *annotation* (view state), not a structure word.
- **Bunge — asymmetry of ▷. VERIFIED.** Agent/patient: "If a thing acts upon another, and the latter does not react back, the former is called the agent and the latter the patient" (`Bunge-Concrete-System-Definition-CES-(1979).md:29`).
- **Mobus — inherent flow direction. VERIFIED.** "the direction is assumed from k to o" (`mobus-bunge-system-definitions-reference.md:159`).

**Divergence reading — the most instructive row:** the *same arrow* is observer-optional for Klir, action-asymmetry for Bunge, and substance-transport for Mobus. SL's `->` (structural, always present) plus `@directed` (view state, Klir's toggle) encodes the difference precisely.

## 8. The boundary — Bunge formalized it too (correction to earlier framing)

- **Mobus — `B = ⟨P, I⟩`. VERIFIED (partial).** "B_{i,l}=⟨P_{i,l},I_{i,l}⟩ where P is the set of properties and … I_{i,l} is the set of interfaces. The exact form of P is still an object of research" (`mobus-bunge-system-definitions-reference.md:175-177`). The specific property words *porosity* and *perceptive fuzziness* are grounded in read-notes and `theory-fidelity.md:31`, not yet a verbatim book quote (§14).
- **Bunge — a topological boundary, VERIFIED verbatim (1992).** "A boundary component of a system is … one every neighborhood of which contains at least one system component and at least one thing in the environment"; boundaries are **link-type-relative** ("different link types induce different boundaries") and universal ("every concrete system, except for the universe as a whole, has at least one boundary") (`GSR/bunge_markdowns/Bunge-System-Boundary-(1992).md:47-51`). *Earlier repo framing ("Bunge's boundary is informal") is corrected by this source.*
- **Klir — an observer-drawn distinction. VERIFIED.** "A distinction splits the world into two parts … 'environment' and … system of interest" (`VAULT/klir/klir-facets.md:1442-1446`, `9851`).

**Convergence reading:** stronger than previously credited — Bunge's boundary-as-set-of-boundary-*components* independently anticipates the boundary-identity result the lenses already render (boundary(Bunge) = interfaces(Mobus) as a component set), and his link-type relativity resonates with kind-typed membranes. A genuine two-tradition convergence with Klir's observer reading as the Core-level floor.

## 9. Interface

- **Mobus — "interfaces," I. VERIFIED** as the second coordinate of B (`mobus-bunge-system-definitions-reference.md:177`). The subset relation I ⊆ C is the **Lean formalization's** coherence constraint (`SSF/Systems/Mobus/Tuple.lean`, `iface_sub`) — machine-checked and load-bearing in this repo, but not confirmed as Mobus's own verbatim claim this pass (§14); cite the Lean when the constraint is meant, the book when the word is.
- **Bunge — "interface points." VERIFIED.** "it has some boundary or interface points … the input and output terminals of a system are members of its boundary" (`Bunge-System-Boundary-(1992).md:168, 236-237`).
- **Klir — absent** (§14).

**Convergence reading:** `interface` turns out to be a *shared* Bunge–Mobus word too — Bunge's i/o terminals as boundary members is structurally the same claim as Mobus's I inside B, and both agree with the Lean's identification of interfaces with (boundary) components.

## 10. Work-process primitives — Mobus's alone

- **Mobus — VERIFIED.** The atomic work-process taxonomy and the simplest-process stopping rule (`dynamics-research/read-mobus.md:129-135`, citing `VAULT/mobus/4-a-model-of-system.md:250-251` and `3-system-ontology.md:1195`); general process definition: "A process is a system that performs a transformation on its inputs to produce outputs that are different in form, quantity, or organization" (`read-mobus.md:76-77`). Shipped as `ProcessPrimitive` (`crates/bert-core/src/lib.rs:1263`).
- **Bunge — absent** (process = trajectory in state space, no primitive taxonomy; `dynamics-research/read-bunge.md:29-30`). **Klir — absent** (behavior functions, not functional primitives; `read-klir.md:158-172`).

## 11. System types

- **Bunge — kingdoms + genera, VERIFIED verbatim.** "These are the only system kingdoms we recognize: conceptual and concrete"; "there are five system genera: physical, chemical, biological, social, and technical" (Postulate 6.4; `SSF/docs/reference/system-type-typologies.md:15, 23`).
- **Klir — the §2.4 two-axis scheme. VERIFIED.** Classify "by restricting T to certain kinds of things; by restricting R to certain kinds of relations"; the type-(a) list "physical, chemical, biological, economic, social, etc." (`system-type-typologies.md:66-71`). The Bunge-genera ≅ Klir-type-(a) convergence table already exists at `system-type-typologies.md:84-92` — this row defers to it.
- **Mobus — concrete/abstract + texture axes. VERIFIED.** (`system-type-typologies.md:45, 53-56`).

## 12. Milieu vs discrete objects — Mobus's alone

- **Mobus — VERIFIED for the distinction, UNGROUNDED for the letters.** Environment = discrete sources/sinks *plus* "all of the channels (or fields) through which flows occur" (`mobus-bunge-system-definitions-reference.md:40`). The letter-names O (objects) and M (milieu) were not found verbatim this pass (§14).
- **Bunge — no such split, VERIFIED.** E is discrete acting things only; "field" appears as a flow substance, not an environment partition (`Bunge-Concrete-System-Definition-CES-(1979).md:58-59, 92`). **Klir — absent** (`klir-facets.md:4153`).

---

## 13. Existing partial mappings (what this doc federates, not duplicates)

- `SSF/docs/reference/system-type-typologies.md` §4 — the row-11 Bunge≅Klir convergence table (two traditions, one row). Deferred to above.
- `SSF/docs/reference/mobus-bunge-system-definitions-reference.md` §8 — Mobus-tuple ↔ Bunge-CES definitional side-by-side (two traditions).
- `docs/theory-fidelity.md` — per-tradition keep/drop and the three canonical signatures (framing, not a term grid).
- `SSF/docs/reference/mobus-bunge-mathematical-reformulation-guide.md` — Mobus→Bunge reformulation (not incorporated this pass).

This document is the first full three-way, twelve-row grid; those four remain the deeper dives per pair.

## 14. UNGROUNDED ledger (open verification work)

Cells asserted nowhere above until a primary source lands; each is a small, closeable verification task:

1. Bunge's fourth CESM coordinate **M (Mechanism)** — verbatim quote (repo usage is grounded; the Bunge sentence is not on disk).
2. Mobus **porosity / perceptive fuzziness** — verbatim book quote for the property words (the P = properties structure is grounded).
3. Mobus **I ⊆ C** — whether the book states the subset relation, or it is purely the Lean's (correctly conservative) formalization choice.
4. Mobus environment letters **O / M** — verbatim naming (the distinction is grounded).
5. Any Mobus bond-vs-nonbond counterpart (believed absent; confirm absence in Ch. 3–4).

## 15. Consumers

- **SL lexicon** (`spec.md` §3) — summarizes the "Contributed by" column from this grid.
- **Per-lens UI copy** — palette labels and `describe()` typesetting should match column vocabulary per lens (Klir says *thing/relation*, Bunge says *component/bond*, Mobus says *component/flow*): this grid is the check.
- **K≅2 convergence program** — rows 2, 3, 6, 8, 9, 11 are citable convergence exhibits; rows 5, 7, 10, 12 are the honest divergence ledger that keeps the convergence claim falsifiable.
