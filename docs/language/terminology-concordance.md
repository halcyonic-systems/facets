# Terminology Concordance — Klir · Bunge · Mobus

**Status: LIVE.** The reference grid, compiled 2026-07-18 from primary sources and primary-read notes; every cell carries a **VERIFIED** mark or an explicit attribution **ruling** (the §14 ledger closed same day), and no cell is filled from general knowledge. This is the SSOT the SL lexicon table (`spec.md` §3) summarizes; it also serves the per-lens UI copy (palette labels, `describe()` typesetting) and the K≅2 convergence program — a filled-in concordance *is* a compact convergence exhibit.

**How to read it.** For each kernel distinction, the row gives each tradition's term and its grounding. Convergence rows (all traditions share a word or an isomorphic concept) are evidence for the common core; divergence cells (a tradition lacks the distinction) are equally informative — they are exactly what the corresponding lens *drops*, and they explain the lens's rendering choices. **VERIFIED** = the term was found in a primary text on disk, or in a primary-read note that itself cites the book by page/line. **UNGROUNDED** = not found in an available source this pass; listed honestly in §14 rather than filled in.

**Two verification targets, marked separately** (council outside-pass, 2026-07-18): *source-verified* — the tradition's own text says this (the default meaning of VERIFIED above); *repo-verified* — the instrument implements this. They fail independently: a cell can be repo-verified yet source-UNGROUNDED (row 1's Bunge M was, until §14.1 closed) or source-verified yet unimplemented. Where the split matters, the row says which target a mark hits; a bare VERIFIED is source-verified.

**Citation roots** (sibling repos):
- `GSR/` = `halcyonic-projects/active/general-systems-reasoner/`
- `VAULT/` = the Obsidian vault, `operations/systems-science/`
- `SSF/` = `halcyonic-projects/active/systems-science-foundations/`
- bare paths = this repo

---

## The grid (summary; per-row notes below)

| # | Distinction | Klir | Bunge | Mobus |
|---|---|---|---|---|
| 1 | The system | `S = (T, R)` | `σ = ⟨C, E, S⟩` (1979); CESM `µ(σ)` (2004) | 7-tuple `⟨C,N,G,B,T,H,Δt⟩`; SOI `S₀,₀` |
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
- **Bunge — `σ = ⟨C, E, S⟩`. VERIFIED.** "the ordered triple σ = ⟨C, E, S⟩ is (or represents) a system over T iff C and E are mutually disjoint subsets of T … and S is a nonempty set of relations on the union of C and E" (`SSF/docs/reference/mobus-bunge-system-definitions-reference.md:185`; minimal model at `GSR/bunge_markdowns/Bunge-Concrete-System-Definition-CES-(1979).md:77-79`). The fourth CESM coordinate M (Mechanism) is now **VERIFIED verbatim** (2004, not the 1979 CES paper): "The simplest sketch or model of a concrete system σ is the list of its composition, environment, structure, and mechanism, or µ(σ) = ⟨C(σ), E(σ), S(σ), M(σ)⟩ … M(σ) stands for the mechanisms, or characteristic processes of σ" (`GSR/bunge_markdowns/Bunge-How-Does-It-Work-(2004).md:289-294`); "M(σ) is empty for conceptual systems" (`:300`). So CES (1979) and CESM (2004) are both Bunge's, a quarter-century apart — the kernel's CES-with-mechanism-note is faithful to the 1979 formal object while acknowledging the 2004 extension.
- **Mobus — the 7-tuple, SOI. VERIFIED, with the provenance nuance this repo already carries:** the book prints a **7**-tuple `⟨C,N,G,B,T,H,Δt⟩` (`VAULT/mobus/4-a-model-of-system.md:196-199`); the 8-tuple with E first-class is the Lean formalization's deliberate improvement (`SSF/Systems/Mobus/Tuple.lean`), credited as such in anything published. "S₀,₀ is the designated SOI" (`SSF/docs/reference/mobus-bunge-system-definitions-reference.md:133`).

**Convergence reading:** three formal objects, one referent — this is the K≅2 claim itself, and the three `describe()` typesettings render exactly these three signatures.

**The named referent (#84, shipped 2026-07-18):** SL now names the SOI — `system "Name" [: Kingdom/Genus]` → `CanvasModel.name` → the root system's `info.name`. The name is the one place all three traditions already agreed without a shared word: Mobus's designated SOI `S₀,₀`, Bunge's `σ`, Klir's `S` each denote *this* system, and the paragraph's proper name ("Process M", "Steel-Plant") is what the denotation binds to.

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
- **Mobus — absent, VERIFIED by scoped sweep** (§14.5). Chapters 3–4 swept for bond/bonding, coupling, connection/relation type, mere aggregate, glue, "makes a difference": every bond hit is physical/chemical/social bonding in the ontogenesis narrative, never a structural typology partitioning relations. His nearest device — boundaries implied where interrelations are "much stronger" among internal components (`VAULT/mobus/3-system-ontology.md:1182`) — is an interaction-strength/endo-exo criterion, not Bunge's difference-making partition.

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

- **Mobus — `B = ⟨P, I⟩`. VERIFIED.** "B_{i,l}=⟨P_{i,l},I_{i,l}⟩ where P is the set of properties and … I_{i,l} is the set of interfaces. The exact form of P is still an object of research" (`mobus-bunge-system-definitions-reference.md:175-177`). The property words are now **VERIFIED verbatim**: "as porosity (0 being completely non-porous) and 'perceptive fuzziness,' meaning the degree to which it is easily perceived" (`VAULT/mobus/4-a-model-of-system.md:376`).
- **Bunge — a topological boundary, VERIFIED verbatim (1992).** "A boundary component of a system is … one every neighborhood of which contains at least one system component and at least one thing in the environment"; boundaries are **link-type-relative** ("different link types induce different boundaries") and universal ("every concrete system, except for the universe as a whole, has at least one boundary") (`GSR/bunge_markdowns/Bunge-System-Boundary-(1992).md:47-51`). *Earlier repo framing ("Bunge's boundary is informal") is corrected by this source.*
- **Klir — an observer-drawn distinction. VERIFIED.** "A distinction splits the world into two parts … 'environment' and … system of interest" (`VAULT/klir/klir-facets.md:1442-1446`, `9851`).

**Convergence reading:** stronger than previously credited — Bunge's boundary-as-set-of-boundary-*components* independently anticipates the boundary-identity result the lenses already render (boundary(Bunge) = interfaces(Mobus) as a component set), and his link-type relativity resonates with kind-typed membranes. A genuine two-tradition convergence with Klir's observer reading as the Core-level floor.

## 9. Interface

- **Mobus — "interfaces," I. VERIFIED** as the second coordinate of B (`mobus-bunge-system-definitions-reference.md:177`). **Ruling on I ⊆ C (§14.3, resolved 2026-07-18):** the book's claim is that interfaces are components *of the boundary subsystem* and systems in their own right — "the set of interfaces embedded in the boundary are components in the boundary subsystem and are themselves subsystems. That is, every r_{i,l} ∈ I_{i,l} is an S itself" (`VAULT/mobus/4-a-model-of-system.md:386`; also `:334`). The **flat subset I ⊆ C over the system's own component set** is the Lean formalization's choice (`SSF/Systems/Mobus/Tuple.lean`, `iface_sub`) — a faithful simplification (the boundary subsystem's components are components), credited as the Lean's, same pattern as the 8th tuple slot. Cite the book for interfaces-as-(boundary-)components, the Lean for the flat subset constraint.
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

- **Mobus — VERIFIED for the distinction; letters RULED Lean-side (§14.4, resolved 2026-07-18).** Environment = discrete sources/sinks *plus* "all of the channels (or fields) through which flows occur" (`mobus-bunge-system-definitions-reference.md:40`). The letter-names O (objects) and M (milieu) do **not** appear in the book as environment letters — chapters 3–4 denote the environment `G = ⟨Src, Snk⟩` throughout (`VAULT/mobus/4-a-model-of-system.md:285, 301, 304`; the E/M letters near Fig. 4.7 label *internal* processes, not environment sets). The O/M lettering is the Lean layer's convention (`SSF/Systems/Mobus/Interface.lean:7`), credited as such.
- **Bunge — no such split, VERIFIED.** E is discrete acting things only; "field" appears as a flow substance, not an environment partition (`Bunge-Concrete-System-Definition-CES-(1979).md:58-59, 92`). **Klir — absent** (`klir-facets.md:4153`).

---

## 13. Existing partial mappings (what this doc federates, not duplicates)

- `SSF/docs/reference/system-type-typologies.md` §4 — the row-11 Bunge≅Klir convergence table (two traditions, one row). Deferred to above.
- `SSF/docs/reference/mobus-bunge-system-definitions-reference.md` §8 — Mobus-tuple ↔ Bunge-CES definitional side-by-side (two traditions).
- `docs/theory-fidelity.md` — per-tradition keep/drop and the three canonical signatures (framing, not a term grid).
- `SSF/docs/reference/mobus-bunge-mathematical-reformulation-guide.md` — Mobus→Bunge reformulation (not incorporated this pass).

This document is the first full three-way, twelve-row grid; those four remain the deeper dives per pair.

## 14. Verification ledger (all cells resolved 2026-07-18)

The five UNGROUNDED cells of the first pass, each now closed as VERIFIED-with-citation or as an explicit attribution ruling. The distinction between the two outcomes is deliberate: a ruling is not a failure — it records that the constraint is the formalization's contribution, credited as such.

1. Bunge's fourth CESM coordinate **M (Mechanism)** — **VERIFIED verbatim.** µ(σ) = ⟨C(σ), E(σ), S(σ), M(σ)⟩ with M the "mechanisms, or characteristic processes" (`GSR/bunge_markdowns/Bunge-How-Does-It-Work-(2004).md:289-294, 311-316`). Source is the 2004 paper, not the 1979 CES definition — row 1 now carries the two-paper provenance.
2. Mobus **porosity / perceptive fuzziness** — **VERIFIED verbatim** (`VAULT/mobus/4-a-model-of-system.md:376`; further porosity usages `:664, :677, :736, :738`). Row 8 updated.
3. Mobus **I ⊆ C** — **RULED.** Book states interfaces are components of the *boundary subsystem* and systems in their own right (`4-a-model-of-system.md:386`); the flat subset over the system's own C is the Lean's formalization choice (`Tuple.lean`, `iface_sub`), credited as such. Row 9 updated; `spec.md` §3 wording aligned.
4. Mobus environment letters **O / M** — **RULED.** Not the book's (environment is `G = ⟨Src, Snk⟩`; `4-a-model-of-system.md:285-304`); Lean-side convention (`Interface.lean:7`). Row 12 updated.
5. Mobus **bond-vs-nonbond counterpart** — **absence VERIFIED, scoped.** Sweep of `VAULT/mobus/3-system-ontology.md` + `4-a-model-of-system.md` for: bond, bonding, coupling, connection type, relation type, structural relation, mere aggregate, aggregate vs system, glue, non-bond, "makes a difference," "hold together," internal/external relation. No structural bonding/nonbonding partition exists; nearest device is the interaction-strength boundary criterion (`3-system-ontology.md:1182`), a location criterion rather than a difference-making one. Row 5 updated.

**Bibliographic independence (the empty citation edge).** Mobus does not cite Bunge: a case-insensitive sweep for "Bunge" across all 16 chapter bodies of *Systems Science: Theory, Analysis, Modeling, and Design* in `VAULT/mobus/` returns zero hits, against a text that cites heavily inline (Checkland, Shannon & Weaver, Smith & Morowitz, Mobus 2019 ×10). Caveat, stated honestly: the end-of-book reference list is not on disk (the vault holds chapter bodies only; the full PDF is not in Zotero), so the finding covers the chapter bodies, not the printed bibliography. Why it matters: rows 2, 8, and 9 show Bunge and Mobus converging on *component*, a formalized *boundary*, and *interface* — and the empty citation edge is what makes that convergence evidential rather than genealogical. Independent arrivals at the same distinctions are K≅2 evidence; borrowed vocabulary would not be.

## 15. Consumers

- **SL lexicon** (`spec.md` §3) — summarizes the "Contributed by" column from this grid.
- **Per-lens UI copy** — palette labels and `describe()` typesetting should match column vocabulary per lens (Klir says *thing/relation*, Bunge says *component/bond*, Mobus says *component/flow*): this grid is the check. The audit against the web app is §15.1.
- **K≅2 convergence program** — rows 2, 3, 6, 8, 9, 11 are citable convergence exhibits; rows 5, 7, 10, 12 are the honest divergence ledger that keeps the convergence claim falsifiable.

### 15.1 Per-lens UI-copy audit (2026-07-20)

The web app's user-facing lens strings, audited against the settled terms above, per lens. Where a string is *authored* (palette, node inspector, edge-editor titles) a mismatch would be fixed here; none were — every authored label already speaks its lens's column. Where a mismatch lived in a *code string* (`describe()` typesetting or the shared edge-editor enum), it is recorded below; all three were fixed by #80's build, which consumed this stabilized section rather than the doc re-deriving it.

**Matched — authored labels are settled-term-faithful.**

| Surface (`web/src/…`) | Klir | Bunge | Mobus |
|---|---|---|---|
| palette place / connect (`canvas/lenses/registry.ts`) | thing · relation | component · environment thing · bond ⁄ mere relation | component · environment object · typed flow · interface · primitives |
| node inspector (`canvas/NodePopover.tsx:56`) | thing | component · environment thing | component · environment object |
| edge-editor title (`canvas/EdgePopover.tsx`) | relation rₙ ⊆ T×T · neutral / directed | bond ⁄ mere relation · connection kind | flow · substance |
| formal face (`FormalPanel.tsx`) | \|T\| things (thinghood) · \|R\| relations (systemhood) | 𝒞 · ℰ · bonds (endo/exo) + mere · boundary (1992) | C · N · E=⟨O,M⟩ · G · B=⟨P,I⟩ · porosity / fuzziness |

Each cell traces to a row: thing/relation (rows 2, 4) and Klir neutral/directed (row 7); component/bond, environment thing, and boundary-1992 (rows 2, 3, 5, 8); component/flow, environment object, B=⟨P,I⟩, interfaces, and primitives (rows 2, 3, 9, 10). The Bunge/Mobus environment split — Bunge says "thing," Mobus says "object" — is itself row-12-faithful (milieu-vs-object is Mobus's alone).

**Mismatched — code strings, since fixed.** The authored labels above were correct; these three lived in `describe()` typesetting and the shared edge enum, so they belonged to #80's pair-names-with-math build rather than a doc fix. **All three shipped 2026-07-20 with #80** and are kept here as the record of the audit, not as open items — the line numbers below are the pre-fix ones:

1. **The Mobus "substance" picker offers Bunge's kind enum, not Mobus's substances.** The Mobus edge editor's `substance` select (`web/src/canvas/EdgePopover.tsx:13,277`) lists the raw `Kind` enum `{unspecified, energy, matter, field, informational}`. Per row 6, the Mobus lens's substance words are **material · energy · message**, and the collapse already exists in Rust (`kind_to_substance`, `crates/bert-canvas/src/canvas.rs:64-68`: Matter→Material, Informational→Message, Energy/Field→Energy). The Mobus picker should present the substance names through that map. The same enum under the Bunge lens (`connection kind`, `EdgePopover.tsx:209`) is correct as-is — row 6 has energy/matter/field/informational as Bunge verbatim.
2. **The Bunge formal object labels the four-coordinate object with the symbol σ.** `FormalPanel.tsx:73` and `kernel/context.ts:48` print the Bunge object as a four-coordinate σ (composition, environment, structure, mechanism). Per row 1 / §14.1, σ is the 1979 CES triple; the four-coordinate object is µ(σ) (Bunge 2004, the `mechanism_note` provenance). The formal face should carry µ(σ) for the four-tuple, or keep σ to the triple and hold M as the mechanism note.
3. **The Mobus formal object prints the eight-tuple without crediting E as the Lean's improvement.** The Mobus formal face (`FormalPanel.tsx:106`, `kernel/context.ts:49`) prints `⟨C, N, E, G, B, T, H, Δt⟩` as "S". Per row 1, the book prints the seven-tuple; E-as-first-class is the Lean formalization's deliberate improvement (`SSF/Systems/Mobus/Tuple.lean`), to be credited as such on any published surface. The formal face is a published surface, so it should carry that credit (a source-note or the "Lean improvement" label), not present the eight-tuple as the book's own.

A fourth, lower-priority note: `kernel/context.ts` (`renderElements`) labels every element `[thing:id]` / `[relation:id]` regardless of lens. This is a lens-invariant serialization prefix for the LLM context, not lens chrome, and was flagged so #80 could rule on it explicitly. **It did:** ruled LLM-context-only and left unchanged.
