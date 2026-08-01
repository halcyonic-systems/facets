# Reader's tour — one model, grown line by line

**Status: LIVE.** A single running example built up one concept at a time, each step pairing the [SL](language/spec.md) lines with what the canvas and the three lenses render from them. This document makes no new claims: it curates and demonstrates what the [spec](language/spec.md), the [terminology concordance](language/terminology-concordance.md), the [README](language/README.md), and [`theory-fidelity.md`](theory-fidelity.md) already establish, and cites them rather than restating their arguments. The spec states the norms; this tour teaches by accretion.

The shape is borrowed deliberately. The SysML v2 language specification (formal/2026-03-02) closes with *Annex A — Example Model*, which grows one vehicle model concept by concept, each section introducing exactly one language area through the same running model. That is the shape here, scoped to SL's ~20-word lexicon and its one neutral spec. The running model is [`fixtures/sl/hal-projection.sl`](../fixtures/sl/hal-projection.sl) — a real structural model of the hal sovereign-AI stack, and one of the three round-trip goldens, so nothing shown here can drift from what the implementation proves ([`crates/bert-canvas/tests/sl_roundtrip.rs`](../crates/bert-canvas/tests/sl_roundtrip.rs)).

Every SL fragment below is verbatim from the fixture as it grows; every JSON fragment is the actual output of `parse_sl` on that fixture.

---

## Three ways in

The tour is one document, but three readers arrive with different questions. Each path is a named route through the sections below, with its own exits into the deeper docs — not separate content.

**The systems scientist / PhD reader** (formal objects, Lean grounding, the K ≅ 2 claim). Your question is whether the tool does what a prose prospectus could only assert. Read [§"The model grows"](#the-model-grows) for how one object is read three ways, then [§"Three lenses, one model"](#three-lenses-one-model) for the three formal signatures, then [§"The notation table"](#the-notation-table) for the neutral-spec correspondence made explicit. Exit into [`theory-fidelity.md`](theory-fidelity.md) (what each lens takes, drops, and where the Lean proves it), the [concordance](language/terminology-concordance.md) (12 distinctions × 3 traditions, every cell primary-cited), and [`design/decomposition-foundations.md`](design/decomposition-foundations.md) (the 8-tuple math under the deferred nesting). The claim these carry: the faithfulness ledger, the honest deferral, and the machine-checked core are artifacts, not promises.

**The newcomer / practitioner** (write your first model). Start at the [`quickstart.md`](quickstart.md) ten-minute path, then read [§"The model grows"](#the-model-grows) in order — each step adds one idea and shows what it draws. Exit into the graded [`fixtures/sl/teaching/`](../fixtures/sl/teaching/) set (a two-thing first model, a copy-and-adapt, and two files that fail on purpose so you learn to read the errors) and the lens palettes in [`design/lens-palettes.md`](design/lens-palettes.md).

**The philosopher of science** (what the tool refuses, and why refusal is the credential). Read the growth steps where a single line changes the verdict — [§"Flows: systemhood is earned"](#flows-systemhood-is-earned) especially — then the honest-boundary table in [`theory-fidelity.md`](theory-fidelity.md#honest-boundary-table), then the decision records [`decisions/`](decisions/) (ADRs 0001–0003) and the status vocabulary in [`docs/README.md`](README.md). The tool's willingness to refuse — an unbonded heap is not a system, a self-loop is not operational, a two-primitive component must decompose — is the epistemic argument: verdicts mean something exactly because they can come out negative, and the dated decision records show the discipline that keeps them honest.

---

## The model grows

A file is a sequence of lines, each independently a comment, a structure line, or an annotation ([spec §4](language/spec.md#4-grammar)). We add them in the fixture's order and watch the model accrue.

> **The running model's referent, in thirty seconds.** hal is the author's own local sovereign-AI stack, in daily use: a proxy fronting a fleet of language models, a daily loop that drives routine work through it, and a council that convenes several models to deliberate; its public face is live at [homeostat.systems](https://homeostat.systems). It is the running model because it is real — the instrument turned on the builder's own infrastructure, and one of the round-trip goldens — not because you need to know hal: the eleven lines below are self-contained, and no step depends on the referent.

### A comment, then the system itself

```
# The hal stack (the sovereign AI infrastructure) as a bounded system — the
# model sketched in docs/design/sl2-authoring-language.md §2.3, authored for
# real as the third corpus entry.
system "hal stack" : Concrete/Technical
```

`#` begins a comment to end of line; it carries nothing into the model. The `system` line names the system of interest and asserts its ontological type: the quoted `"hal stack"` is the name (Mobus's designated SOI, Bunge's σ, Klir's S all denote *this* system — [concordance §1](language/terminology-concordance.md#1-the-system-itself)), and `Concrete/Technical` is the kingdom and genus ([spec §4.1](language/spec.md#41-system); Bunge's kingdoms + five genera, Postulate 6.4, which Klir's §2.4 axis independently corroborates — [concordance row 11](language/terminology-concordance.md#11-system-types)).

Compiled, this sets `CanvasModel.name` and `system_type`; it draws nothing yet, and it gates nothing. The type assertion is **semantic metadata, not a systemhood verdict** — no validator reads it ([`theory-fidelity.md`, "Asserted system type"](theory-fidelity.md#asserted-system-type-metadata-not-a-gate)).

```json
"system_type": { "kingdom": "Concrete", "genus": "Technical", "domain": null },
"name": "hal stack"
```

### The domain framing

```
domain "sovereign AI infrastructure"
```

The free-text subject area that frames the analyst's narration ([spec §4.2](language/spec.md); the word is Mobus's, [concordance row 3's domain sense](language/terminology-concordance.md)). It fills `system_type.domain` and, like the type, is ungated metadata.

### Components inside the boundary

```
component Proxy interface
component DailyLoop interface
component Council
```

A `component` is a thing inside the boundary — a member of the composition C ([spec §4.3](language/spec.md#43-thing-lines)). `component` is the strongest shared word in the lexicon: both Bunge's C and Mobus's C ([concordance §2](language/terminology-concordance.md#2-a-thing-inside-the-system--the-strongest-shared-word)). The trailing `interface` on `Proxy` and `DailyLoop` designates each a member of the root membrane's interface set I (I ⊆ C; [concordance §9](language/terminology-concordance.md#9-interface)); `Council` carries no attribute and stays interior. **CONTINGENT([#226](https://github.com/halcyonic-systems/bert-lenses/issues/226)):** the attribute stamps the interface *onto a component*, which is the Lean's flat `I ⊆ C` convention; whether an interface should instead be placed on the boundary is open, and a decision there would change this line's gesture, not its meaning.

The canvas places components on a deterministic inner N-gon in declaration order (same text, same picture — [spec §6.1](language/spec.md#61-pos-name-x-y)). Each lens names the node in its own vocabulary: the Klir palette offers a **thing** (a member of T), the Bunge palette a **component** (𝒞, Def 1.2(i)), the Mobus palette a **component** (a subsystem one level down) — the palette rows are settled-term-faithful per the [concordance §15.1 audit](language/terminology-concordance.md#151-per-lens-ui-copy-audit-2026-07-20).

```json
{ "id": 1, "name": "Proxy", "x": 480.0, "y": 150.0, "role": "Component", "interface": true }
```

`interface` on `Council` would be absent, emitting `"interface": false`.

### Environment things

```
source Operator
sink UpstreamAPIs
```

`source` and `sink` declare things *outside* the boundary; both compile to `Role::Environment` ([spec §4.3](language/spec.md#43-thing-lines); environment is a Bunge–Mobus shared word, [concordance §3](language/terminology-concordance.md#3-a-thing-outside-the-system)). The two words are **author-intent sugar**: the Source-vs-Sink identity is not stored but *derived from the drawn flows* by `project()` — a thing that originates a flow reads as a Source, one a flow merely reaches as a Sink ([spec §5.2](language/spec.md#52-source-sink-environment--author-intent-edge-derived-identity)). Until a flow touches it, an environment thing renders pending (the kernel would drop it as an orphan). Attribute words (`primitive`, `interface`) are rejected on environment things — their internals are opaque.

### Flows: systemhood is earned

```
flow Council -> Proxy : informational "convene models"
flow Proxy -> DailyLoop : informational "tool calls"
flow Operator -> DailyLoop : informational "requests"
flow Proxy -> UpstreamAPIs : informational "model requests"
```

A `flow` is a directed connection `from -> to`, optionally typed by a kind clause and named by a quoted label ([spec §4.4](language/spec.md#44-flow)). One flow line touches all three traditions at once: the keyword is Mobus's, the kernel object it builds is Klir's `Relation`, and its bond semantics are Bunge's ([concordance §4](language/terminology-concordance.md#4-a-connection-between-parts)). The `informational` kind is Bunge's connection-flow taxonomy verbatim (`energy | matter | field | informational`, [concordance §6](language/terminology-concordance.md#6-the-kind-of-a-connection--sls-kind-words-are-bunges-verbatim)), which the Mobus lens reads through the 1:1 map onto its substances (Informational → Message).

This is the step where the verdict turns. Before any flow, three components are a heap; the flows `Council -> Proxy` and `Proxy -> DailyLoop` are bonds among distinct components, and **one bond is what Bunge's Def 1.1 requires to earn systemhood** — otherwise the collection is an aggregate ([`theory-fidelity.md`, Bunge](theory-fidelity.md#per-tradition-take--drop--where--why); the gate is `check_bond`). No flow depends on itself, so the model is irreflexive and admissible under the Mobus operational gate (`check_self_loops`, k ≠ o). SL gates none of this — compilation is total on parse success ([spec §5.3](language/spec.md#53-compilation-is-total-on-parse-success)); the kernel delivers the verdict, live, exactly as it does for a model drawn by gesture ([spec §5.1](language/spec.md#51-what-a-compiled-model-means)).

```json
{ "id": 6, "a": 3, "b": 1, "name": "convene models",
  "is_bond": true, "kind": "Informational", "klir_directed": false }
```

Ids are assigned sequentially in declaration order across things then relations, so `Council` (id 3) → `Proxy` (id 1) is `"a": 3, "b": 1`.

Note the coherence the flows reveal: `Proxy` and `DailyLoop` are the two components with flows crossing the boundary (to `UpstreamAPIs`, from `Operator`), so the kernel derives them as the boundary set ∂C — and they are exactly the two the author designated `interface`.

They agree here in **one direction by enforcement and the other by the author's care**, and the distinction is worth keeping straight. Since the 7/25 interfaces sweep ([#213](https://github.com/halcyonic-systems/bert-lenses/issues/213), [#225](https://github.com/halcyonic-systems/bert-lenses/issues/225)) the kernel *requires* I ⊆ ∂C: a component stamped `interface` that carries no boundary-crossing flow is refused at Operational and Full, not merely noted (`check_interfaces_carry_flow`, mirroring the Lean structure field `MobusSystem.interfaces_carry_flow`). The converse — a component with a crossing flow that the author did *not* designate `interface` — is Lean's `bipartite` field and is **not** enforced by the Rust gates, so nothing would have stopped this model from designating only one of the two. The agreement in that direction is a property of this model, not of the tool.

### The boundary membrane

```
boundary porosity 0.15 fuzziness 0.05
```

The root membrane's properties P ([spec §4.7](language/spec.md#47-boundary)). Both `porosity` and `perceptive_fuzziness` are Mobus's, verbatim, as the property half of B = ⟨P, I⟩ ([concordance §8](language/terminology-concordance.md#8-the-boundary--bunge-formalized-it-too-correction-to-earlier-framing)); Bunge independently formalized the boundary as a set of boundary components (1992), which is the same object the lenses render from the interface set. Key-value pairs in any order, either omittable; an absent line means unauthored (0.0, the kernel default).

```json
"boundary": { "porosity": 0.15, "perceptive_fuzziness": 0.05 }
```

### The annotation layer

```

@lens bunge
```

Annotations are `@`-prefixed lines, conventionally last. They carry **view state, never meaning** (commitment C4): a diff of the structure lines shows systems changing, never a lens switch or a node drag ([spec §6](language/spec.md#6-the-annotation-layer)). `@lens bunge` pins which tradition's reading the app opens with; the lens is a *reading* of the model, not a property of it, so every model is a valid Core model regardless of which lens is pinned. The parser reports whether the text pinned a lens, and the reference UI preserves the author's current lens when it did not. Unknown annotations are skipped, not errors — the ignorable contract that lets future view-state vocabulary degrade softly.

The model is now complete: eleven structure lines and one annotation.

```json
"lens": "Bunge"
```

---

## Three lenses, one model

The finished model is one neutral object; the kernel generates three faithful views by three Lean-proven maps ([`theory-fidelity.md`, "What the kernel actually is"](theory-fidelity.md#what-the-kernel-actually-is)). Switching `@lens` re-describes the *same* hal-projection in the vocabulary and formal object of each tradition — this is the K ≅ 2 claim made operational, not asserted. The three formal signatures the `describe()` faces typeset ([concordance §15.1, FormalPanel row](language/terminology-concordance.md#151-per-lens-ui-copy-audit-2026-07-20)):

- **Klir** — `S = (T, R)`: five things, four relations, each neutral unless the observer toggles it directed. Direction, substance, and the bond/mere distinction are dropped — Klir is the unconditional floor, relational structure only ([`theory-fidelity.md`, Klir](theory-fidelity.md#per-tradition-take--drop--where--why)).
- **Bunge** — `σ = ⟨C, E, S⟩`: composition (Proxy, DailyLoop, Council), environment (Operator, UpstreamAPIs once bonded), the bonds as structure with the aggregate-vs-system verdict, the boundary components, and mechanism carried as an untyped note (delivered as CES; M is prose, not a Lean-projected coordinate — [`theory-fidelity.md`, Bunge](theory-fidelity.md#per-tradition-take--drop--where--why)).
- **Mobus** — the 8-tuple `⟨C, N, E, G, B, T, H, Δt⟩`, where E is first-class as the Lean formalization's deliberate improvement on the book's printed 7-tuple ([concordance row 1](language/terminology-concordance.md#1-the-system-itself)): components, endostructure N, environment objects, exostructure G, and the boundary B = ⟨P, I⟩ with the porosity and fuzziness this model authored; the T/H/Δt dynamical slots stay thin, stringly-typed notes ([`theory-fidelity.md`, Mobus](theory-fidelity.md#per-tradition-take--drop--where--why)).

Each face speaks its own column: Klir says *thing / relation*, Bunge says *component / bond*, Mobus says *component / flow* — the concordance is the check that keeps them faithful.

---

## The notation table

One row per construct: the SL line, the equivalent canvas gesture, the JSON fragment it compiles to, and the kernel referent it denotes. This is [spec §2](language/spec.md#2-the-neutral-spec-compile-target)'s "three concrete syntaxes, one neutral spec" made visible rather than asserted; the [lexicon table](language/spec.md#3-lexicon) carries the kernel-distinction column this one extends. JSON fragments are from `parse_sl` on the fixture; constructs absent from hal-projection (marked ⁘) show the fragment from the fixture that carries them.

| Construct | SL | Canvas gesture | JSON fragment | Kernel referent |
|---|---|---|---|---|
| System name | `system "hal stack"` | the SOI title field | `"name": "hal stack"` | `CanvasModel.name` → root `info.name` |
| Kingdom / genus | `: Concrete/Technical` | system-type inspector | `"system_type": {"kingdom":"Concrete","genus":"Technical"}` | `SystemType` (metadata, ungated) |
| Domain | `domain "sovereign AI infrastructure"` | system-type inspector | `"domain": "sovereign AI infrastructure"` | `SystemType.domain` |
| Component | `component Council` | place-tool, inner N-gon | `{"id":3,"name":"Council","role":"Component","interface":false}` | `Role::Component` (C) |
| Interface | `component Proxy interface` | designate-tool | `"interface": true` | `Thing.interface` (I ⊆ C) |
| Primitive ⁘ | `component Tub primitive Buffering` | designate-tool (badge) | `"primitive": "Buffering"` | `Thing.primitive` (`ProcessPrimitive`) |
| Env. source / sink | `source Operator` | place-env-tool, outer ring | `{"id":4,"name":"Operator","role":"Environment","interface":false}` | `Role::Environment` (Src/Snk edge-derived in `project()`) |
| Flow | `flow Council -> Proxy : informational "convene models"` | drag the handle between things | `{"id":6,"a":3,"b":1,"name":"convene models","is_bond":true,"kind":"Informational","klir_directed":false}` | `Relation` |
| Connection kind | `: informational` | edge editor, kind / substance select | `"kind": "Informational"` | `Kind` (→ `SubstanceType` under Mobus) |
| Mere relation ⁘ | `flow A -> B mere` | edge editor, bond ⇄ mere toggle | `"is_bond": false` | `Relation.is_bond = false` (Bunge's B̄) |
| Boundary | `boundary porosity 0.15 fuzziness 0.05` | boundary inspector | `"boundary": {"porosity":0.15,"perceptive_fuzziness":0.05}` | `CanvasBoundaryProps` (B's P) |
| Position | `@pos Proxy 480 150` (auto when absent) | drag a node | `"x": 480.0, "y": 150.0` | `Thing.x` / `.y` (view state) |
| Lens | `@lens bunge` | lens switcher | `"lens": "Bunge"` | `CanvasModel.lens` (view state) |
| Directed toggle ⁘ | `@directed 1` | Klir edge neutral ⇄ directed | `"klir_directed": true` | `Relation.klir_directed` (view state) |

The three view-state rows (`@pos`, `@lens`, `@directed`) are the annotation layer; the rest are model content. That split is the whole of C4: presentation is co-located but semantically null, and a structure-lines diff never sees it ([spec §2](language/spec.md#2-the-neutral-spec-compile-target), [§6](language/spec.md#6-the-annotation-layer)). hal-projection carries no `@pos` line, so its positions come from the deterministic auto-layout; the fragment shown is that auto-laid value.

---

## Where to go next

- **Assessing the theory:** [`theory-fidelity.md`](theory-fidelity.md) → [`language/terminology-concordance.md`](language/terminology-concordance.md) → [`design/decomposition-foundations.md`](design/decomposition-foundations.md).
- **Writing your own model:** [`quickstart.md`](quickstart.md) → [`fixtures/sl/teaching/`](../fixtures/sl/teaching/) → the full [`language/`](language/) spec and corpus.
- **Reading the process:** [`decisions/`](decisions/) (ADRs 0001–0003) → the status vocabulary and doc-lint gate in [`docs/README.md`](README.md).
- **Every term above, defined:** [`glossary.md`](glossary.md).
