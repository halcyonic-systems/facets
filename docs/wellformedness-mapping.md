# Well-formedness, three ways — Lean, kernel, paper

**Status: RESEARCH.** An audit read, not a decision and not a normative contract. Nothing here changes kernel behaviour; where it finds a gap it says what an issue for it would claim and stops.

*Three well-formedness predicates are in circulation and nobody had compared them: the Lean `WellFormed` structure in `systems-science-foundations`, the ~28 checks the kernel enforces, and the four-conjunct predicate the life-cycle paper prints. This maps them in both directions. The discipline throughout: a row either cites the Lean field and the kernel code and says why they mean the same thing, or it is marked PARTIAL with an explicit "covers X, does not cover Y", or UNKNOWN. Three of the gaps were demonstrated by running a probe rather than by reading; those rows say which probe.*

## What the three predicates are

**The Lean.** `WellFormed` is a `structure` with **eight** fields, declared in `Systems/Mobus/Lifecycle.lean` (SSF commit `1f6ec1c`, 2026-07-25, "the 8-tuple is closed under lawful change (#30)"; read at SSF HEAD `7efa91b`, where `lake build Systems.Mobus.Lifecycle` completes and the file contains no `sorry`). It is a predicate on `PreTuple` — the eight slots as raw data with every law stripped — and it is *unconditional*: no mode, no lens, no gate. Two adequacy results pin it to the type: `wellFormed_toPre` (the predicate is no stronger than `MobusSystem` enforces) and `PreTuple.toMobus` + `toPre_toMobus` (no weaker).

Attribution for the eight slots themselves is the concordance's job, not this doc's: see [`language/terminology-concordance.md`](language/terminology-concordance.md) and [`lean-provenance.md`](lean-provenance.md).

**Note on citation strength.** `Systems/Mobus/Lifecycle.lean` is **outside** this repo's pinned citation set. `lean-manifest.json`'s staleness block says so explicitly — the file is new at SSF HEAD and "this repo cites none of them" — so the claims below are cited by declaration name at a commit, not by `claim_id`, and they are not covered by Gate A. Adding them to the manifest means moving the pin, which is a separate decision.

**The kernel.** `crates/bert-core/src/validate.rs` emits 28 distinct `code`s (every issue has carried one since [#319](https://github.com/halcyonic-systems/bert-lenses/issues/319), so the set is enumerable rather than estimated). `validate` runs 13 universal checks; `validate_mode` adds one check at Structural and nine at Operational, ten at Full. Two sibling files carry checks that are **not** in scope here and are treated separately at the end: `operational.rs` (the executability seam, which emits `OperationalError`, not coded issues) and `decomposition.rs` (20 seam codes transcribing a *different* Lean structure, `Decomposition`).

**The paper.** `paper.tex` §"Closure under lawful change" prints `WF(S)` with **four** conjuncts. Read only; that repo is untouched.

## Lean → kernel

Eight rows. Two map cleanly, four are PARTIAL, two have no kernel counterpart because the kernel's representation makes them unviolable.

| # | Lean field (`WellFormed`) | What it says | Kernel | Verdict |
|---|---|---|---|---|
| 1 | `internal_lawful` (a) | `∀ e ∈ N.edges`, both endpoints ∈ `N.nodes` | `interaction_endpoint_unresolved` (`validate.rs:976`, Error, all modes) | **PARTIAL** |
| 2 | `internal_lawful` (b) | `∀ e ∈ N.edges`, `source ≠ target` | `self_loop_flow` (`validate.rs:406`, Error) | **PARTIAL** |
| 3 | `external_lawful` (a) | `∀ e ∈ G.edges`, both endpoints ∈ `G.nodes` | — | **UNVIOLABLE** |
| 4 | `external_lawful` (b) | `∀ e ∈ G.edges`, `source ≠ target` | `self_loop_flow` (same check as row 2) | **PARTIAL** |
| 5 | `network_components` | `N.nodes = C` | — | **UNVIOLABLE** |
| 6 | `disjoint` | `C ∩ O = ∅` | — | **UNVIOLABLE** |
| 7 | `interfaces_sub` | `I ⊆ C` | `interface_without_processor` (`validate.rs:1647`, Warning, level-0 only) | **PARTIAL** — barely |
| 8 | `bipartite` + `externalFlows_nodes` | every `G` edge runs `O ↔ I`; `G.nodes ⊆ O ∪ I` | `crossing_flow_without_interface` (`validate.rs:1099`, Error, Operational/Full) | **PARTIAL** |
| 9 | `interfaces_carry_flow` | `∀ i ∈ I, ∃ e ∈ G.edges` with `i` an endpoint | `interface_carries_no_flow` (`validate.rs:1143`, Error, Operational/Full) | **PARTIAL** |

Rows 8 and 9 are the two the kernel enforces *by name* — `check_crossing_flows_route_through_interface` and `check_interfaces_carry_flow` both cite their Lean referents in their own doc comments. Everything else is either a representational coincidence or a gap.

Counting the way a reader will want it: of the eight Lean fields, **zero map cleanly**, **six are PARTIAL** (rows 1, 2, 4, 7, 8, 9 — where rows 8 and 9 collapse the three interface-and-boundary fields into two entries), and **two have no kernel check at all** because the `WorldModel` cannot express their violation (rows 3, 5, 6). Splitting the conjunctions the other way — one row per Lean field — gives 8 fields: 6 PARTIAL, 2 UNVIOLABLE, 0 clean.

### Row by row

**1 — `internal_lawful`, edges land on vertices.** The Lean requires an internal edge's endpoints to be members of `N.nodes`, which row 5 pins to `C`. The kernel checks something weaker and something wider: `check_interaction_references` requires each endpoint to resolve against `collect_known_ids`, which is the **union** of systems, environment sources, environment sinks, per-system sources and sinks, *and interface records*. It never asks "is this endpoint in C". Covers: a dangling id, in every mode, as an Error. Does not cover: an endpoint that resolves to something outside `C ∪ O`. The kernel has no declared N-vs-G split — locus is derived from endpoint type in `bert-canvas` — so most of the Lean's condition is carried by the representation rather than by a check.

The exception is demonstrated. An interaction whose `source` and `sink` are both **interface** ids resolves (interface ids are in `collect_known_ids`), and then falls into neither derived class: `is_system_relatum` is false for `IdType::Interface`, so the internal-graph checks skip it, and `external()` is false too, so the crossing check skips it. Probe: `crates/bert-core/tests/wellformedness_probes.rs::an_interaction_endpointed_on_an_interface_is_in_neither_edge_class`. Whether that violates the Lean depends on how `I` is read into `C`, which the kernel's representation does not settle — so this is recorded as **UNKNOWN**, not as a gap. What is certain is the silence.

**2 and 4 — no self-loops.** `self_loop_flow` is an exact statement of `PreNetwork.Lawful`'s second conjunct, and it applies to every interaction regardless of locus, so it covers `N` and `G` at once. Covers: any `source == sink` interaction, as an Error. Does not cover: Core and Structural mode, where the check does not run at all.

Demonstrated: `fixtures/wellformedness/self-loop.sl` carries a genuine `A → A` flow. `bert verdict … --lens klir` exits **0** with zero issues; `--lens bunge` exits **0** with zero issues; `--lens mobus` exits **4** on `self_loop_flow`. The `lens_facts` payload names the edge `"self_loop": true, "mobus_ok": false` under all three lenses, so the kernel *sees* it and declines to rate it at two of them.

This gap is arguable rather than plain. The Lean `WellFormed` is a predicate on a Mobus 8-tuple (attribution per the [concordance](language/terminology-concordance.md)), and a model authored at Klir's or Bunge's lens is not claiming to be one — the parallel-lens architecture ([`theory-fidelity.md`](theory-fidelity.md)) says a Klir model owes no Mobus constraint. The honest statement is therefore: **the Lean predicate is unconditional and the kernel's enforcement is not**, and whether that is a defect depends on a scope question the repo has already answered for the interface checks ("Klir and Bunge carry no interface concept") but has never stated for self-loops.

**3 and 5 — the node sets.** `PreNetwork` carries `nodes` and `edges` as independent fields, so `edges_on` and `network_components` are real conditions there. A `WorldModel` carries no node set for either network: `C` is `model.systems`, and the vertices of `N` and `G` are read off the endpoints of `model.interactions`. Neither `N.nodes = C` nor `G.edges ⊆ G.nodes` can be written false, so there is nothing to check. Recorded as UNVIOLABLE rather than UNENFORCED, because the two are different findings and only the second would justify an issue.

**6 — `C ∩ O = ∅`.** Also unviolable, for two independent reasons. `systems` and `environment.sources` / `environment.sinks` are separate arrays, so nothing can be filed in both; and `Id` serializes with a type prefix (`Serialize for Id`, `lib.rs:987`), so a `Subsystem` id and a `Source` id cannot collide as strings even if they shared indices. `check_duplicate_ids` collects all four families into one map and would report a collision as `duplicate_id`, but it can never fire on a C/O pair for exactly that reason. On the canvas path the same holds one layer up: `Role` is an enum, and a `Thing` is `Component` or `Environment`, never both.

**7 — `I ⊆ C`.** This is the row where the two representations diverge most. In the Lean, `I` and `C` are two subsets of one carrier `Set α`, and `interfaces_sub` relates them. In the `WorldModel`, `Interface` is its own record type living on `System.boundary.interfaces`, tied to a component only by *another* system's `boundary.parent_interface` pointer. There is no subset relation to enforce, and the check nearest to the intent — `check_s0_interface_processors`, which asks whether some system claims each interface — is a **Warning**, looks only at the level-0 system, and is (per its own #220 note) unfireable for canvas-projected models because `project` claims every interface it mints.

Demonstrated: an interface on a *level-1* subsystem's boundary that no system claims draws nothing, in any of the four modes. Probe: `wellformedness_probes.rs::an_unclaimed_interface_below_level_zero_draws_nothing`.

On the canvas path alone, `I ⊆ C` does hold by construction: `Thing.interface` is a boolean flag on a thing whose `role` is `Component` (`canvas.rs:172`), and `project` only mints an `Interface` for a designated component (`canvas.rs:682`). So the authoring surface cannot violate it; a hand-authored or generated file can, and nothing below level 0 catches it.

**8 — `bipartite` and `externalFlows_nodes`.** These two Lean fields say the same thing from two sides: every external edge has one end in `O` and one in `I`, and `G`'s nodes lie in `O ∪ I`. `check_crossing_flows_route_through_interface` enforces the half where a flow has one external end and one system end and the system end is routed through no interface. That half fires, as a control confirms: `fixtures/wellformedness/crossing-flow-no-interface.sl` exits **4** with `crossing_flow_without_interface` under the Mobus lens.

It does **not** cover the case where *both* ends are environment objects. The check skips those deliberately — its comment says env→env flows "are the direction checks' subject, not this one's" — and the direction checks it defers to do not do this job. `check_flow_direction`, named in two source comments (`lib.rs:1540`, `canvas.rs:644`), **does not exist anywhere in the workspace**; the direction rules that do exist live inline in `validate_operational` (`operational.rs:344-367`) and only reject a flow *leaving a sink* or *entering a source*. A `Source → Sink` edge violates neither.

Demonstrated, and the strongest gap in this audit: `fixtures/wellformedness/env-to-env-flow.sl` adds `flow Src -> Snk` alongside a normal in/out pair. Under the Mobus lens `bert verdict` exits **0** with `"issues": []`, and the edge is counted in `G` (`"g": 3`, `"locus": "Exo"`). Under the Klir lens it is likewise clean. `bert run --t 3` produces a trajectory. So the edge passes `validate`, passes `validate_mode` at Operational, and passes the executability seam — while the Lean's `bipartite` forbids it outright.

Also not covered at Core and Structural, which is a decided non-goal rather than a gap ([#213](https://github.com/halcyonic-systems/bert-lenses/issues/213), [#219](https://github.com/halcyonic-systems/bert-lenses/issues/219): Klir and Bunge carry no interface concept).

**9 — `interfaces_carry_flow`.** The closest correspondence in the table, and still not clean. The Lean's `InterfacesCarryEdges` (`Systems/Mobus/Interface.lean:53`) is a **graph** condition: for each `i ∈ I` there must exist an edge of `G` with `i` as an endpoint. `check_interfaces_carry_flow` accepts three ways of satisfying it — the interface is routed through by some interaction, *or* its `receives_from` is non-empty, *or* its `exports_to` is non-empty. The last two are declarations, not edges. The sibling `check_interface_declarations_match_flows` then backstops the declaration, but weakly: a declaration counts as recorded when *some* interaction has the declared entity at its far end and its near end merely "reaches" the interface — which includes landing on the system whose boundary carries it, not only being routed through it.

Demonstrated: two interfaces on one membrane, one crossing flow routed through the first, the second carrying only an `exports_to` naming the same sink. The second interface is an endpoint of no edge in `G`, and the model is clean at Operational — both interface checks silent, zero errors. Probe: `wellformedness_probes.rs::an_interface_with_no_edge_in_g_passes_both_interface_checks`.

Covers: an interface with no routing and no declaration. Does not cover: an interface whose declaration is corroborated by a flow that reaches the parent system rather than the interface.

## Kernel → Lean

All 28 codes from `validate.rs`. Nineteen have **no counterpart in `WellFormed`**, and that is not a defect — the kernel is checking more than well-formedness. Three families account for all nineteen: file-format and identity hygiene (things a Lean `structure` cannot be malformed in), Mobus-semantic observations about a model that is well-formed and still questionable, and author-declared requirements the `PreTuple` carries no slot for.

| code | severity · where | Lean counterpart |
|---|---|---|
| `self_loop_flow` | Error · Operational, Full | `internal_lawful` / `external_lawful`, second conjunct. Mode-gated where the Lean is unconditional |
| `crossing_flow_without_interface` | Error · Operational, Full | `bipartite` + `externalFlows_nodes`, forward half only |
| `interface_carries_no_flow` | Error · Operational, Full | `interfaces_carry_flow`, weakened by the declaration escape |
| `interaction_endpoint_unresolved` | Error · all | nearest to `internal_lawful`/`external_lawful` first conjunct, but quantified over a wider carrier |
| `interface_without_processor` | Warning · all | nearest to `interfaces_sub`; level-0 only, and a Warning |
| `aggregate_no_bond` | Error · Structural | **NO WELLFORMED COUNTERPART.** The Bunge lens gate, grounded in a different Lean object (`Kernel.HasBond`, a `def` in `Systems/Klir/ViewGeneration.lean`). Its own doc comment records that the Rust is deliberately *stronger* than that `def` |
| `orphan_source` | Error · all | **NO COUNTERPART — and the kernel is stronger.** See the asymmetry note below |
| `orphan_sink` | Error · all | **NO COUNTERPART — and the kernel is stronger.** Same note |
| `interface_declaration_contradicts_flows` | Error · Operational, Full | **NO COUNTERPART.** `receives_from` / `exports_to` are representation fields with no Lean analogue; the check is internal consistency between two author declarations |
| `interface_reference_unresolved` | Error · all | **NO COUNTERPART.** Referential integrity on the routing annotation, which the Lean's `G` does not carry (an edge in the Lean simply *has* an interface endpoint) |
| `interface_processor_without_flows` | Warning · all | **NO COUNTERPART.** Hierarchical-model hygiene: a processor claiming a parent interface but wired to nothing |
| `dead_end` | Warning · Operational, Full | **NO COUNTERPART.** Mobus-semantic observation; an absorbing state is well-formed |
| `unreachable` | Warning · Operational, Full | **NO COUNTERPART.** Mobus-semantic observation; a disconnected island is well-formed |
| `flow_not_consumed` | Warning · Operational, Full | **NO COUNTERPART.** Mobus-semantic: the receiving primitive cannot read the substance. `PreTuple`'s `τ` is opaque, so the Lean cannot state it |
| `duplicate_edge` | Warning · all | **NO COUNTERPART.** `N.edges` is a `Set`, so parallel identical edges are not expressible in the Lean at all |
| `dynamical_face_empty` | Warning · Full | **NO COUNTERPART.** An observation about `T`/`H`/`Δt` being unpopulated; the Lean's are opaque type parameters |
| `stock_unit_rate_like` | Warning · all | **NO COUNTERPART.** Dimensional analysis on declared units |
| `stock_unit_dimension_mismatch` | Error · Operational, Full | **NO COUNTERPART.** Dimensional analysis across two declarations. Per #220, unreachable from the canvas today |
| `reachability_requirement_unmet` | Error · Operational, Full | **NO COUNTERPART.** Author-declared requirement ([#69](https://github.com/halcyonic-systems/bert-lenses/issues/69)); `PreTuple` has no slot for it |
| `alternative_path_unmet` | Error · Operational, Full | **NO COUNTERPART.** Same |
| `reachability_requirement_unresolved` | Error · Operational, Full | **NO COUNTERPART.** Same, malformed-requirement case |
| `duplicate_id` | Error · all | **NO COUNTERPART.** File-format hygiene; a Lean `Set` has no repeated members |
| `parent_unresolved` | Error · all | **NO COUNTERPART.** File-format hygiene on the hierarchy pointer |
| `environment_id_unexpected` | Warning · all | **NO COUNTERPART.** Convention (`E-1`), not structure |
| `model_version_stale` | Warning · all | **NO COUNTERPART.** File-format hygiene |
| `level_id_mismatch` | Warning · all | **NO COUNTERPART.** Consistency between two encodings of depth |
| `required_field_missing` | Error · pre-parse | **NO COUNTERPART.** A `PreTuple` cannot be missing a field |
| `field_not_an_object` | Error · pre-parse | **NO COUNTERPART.** Same |

**The orphan asymmetry, worth naming.** SSF #31 added a coverage constraint on `I` — every interface must be an endpoint of some external flow — and stated none on `O`. The kernel states the analogous constraint on `O` as well, at Error severity, in every mode: `orphan_source` and `orphan_sink` refuse an environment object that couples to nothing. Under the Lean, a `PreTuple` whose `envObjects` contains an object touched by no edge of `G` is perfectly well-formed. So on this one point the kernel is strictly stronger than the formalization it cites, and nothing in the repo says so. That is a claim-hygiene item, not a bug: it means "the kernel enforces the Lean's well-formedness" is false in *both* directions, and neither should be asserted without the qualifier.

### The two sibling files

`crates/bert-core/src/operational.rs` is the executability seam. It emits `OperationalError` — location, reason, hint — with **no `code` field**, so it is outside the code census above and outside any grouping a surface can do. Its checks are about whether a model can be *run* (level ≤ 1, a primitive on every process, endpoints that project to nodes, flow direction against declared source/sink roles), not about whether it is a well-formed 8-tuple. One of its rules is the nearest thing the repo has to a direction check, and it is the one row 8 shows is insufficient.

`crates/bert-core/src/decomposition.rs` emits 20 coded issues (`decomposition.beta_src`, `interface_decomposition.gamma_snk`, and so on). Every one transcribes a row of a **different** Lean structure — the boundary contract `Decomposition`, documented in [`design/decomposition-foundations.md`](design/decomposition-foundations.md) — governing the parent↔child seam rather than a single tuple's internal coherence. It is out of scope here and would want its own mapping doc.

## The paper's four

`paper.tex` prints `WF(S)` as four conjuncts. They are not a different predicate; they are the same conditions with three pairs folded together, minus one.

| paper conjunct | Lean field(s) | kernel |
|---|---|---|
| `I ⊆ C` | `interfaces_sub` | PARTIAL — row 7 |
| `N` connects distinct members of `C` only | `network_components` + `internal_lawful` (both conjuncts) | PARTIAL — rows 1, 2, 5 |
| `G` connects members of `O` to members of `I` | `bipartite` + `externalFlows_nodes` + `external_lawful` | PARTIAL — rows 3, 4, 8 |
| `C ∩ O = ∅` | `disjoint` | UNVIOLABLE — row 6 |
| — | `interfaces_carry_flow` | **not printed by the paper** |

So the answer to "why does the paper print fewer" is two answers. Three of the four conjuncts are **compressions**: "N connects distinct members of C only" is one English clause carrying `network_components` and both halves of `internal_lawful`, which the Lean must separate because `PreNetwork` carries `nodes` and `edges` as independent fields. That is prose economy, not a weaker claim.

The fourth is an **omission**. `interfaces_carry_flow` — the converse coverage constraint, added by SSF #31 and proved non-redundant by SSF #35 — appears nowhere in the paper's definition, and the appendix's case table has four columns matching the four printed conjuncts, so the omission is systematic rather than a slip in one sentence. It is also the conjunct the kernel enforces most directly (`interface_carries_no_flow` is the one check whose doc comment names its Lean field). A reader who takes the paper's `WF` as the whole of well-formedness will under-count by one, in the direction of the constraint the instrument leans on hardest.

## What "machine-checked" covers, and what it does not

`Step`, the admissible-successor relation in `Lifecycle.lean`, has **exactly two constructors**:

```lean
inductive Step … where
  | grow    (p …) (a : α) (h : a ∉ p.envObjects)  : Step p (p.addComponent a)
  | decline (p …) (a : α) (h : a ∉ p.interfaces)  : Step p (p.removeComponent a)
```

So `Step.preserves_wellFormed` and the closure theorem `wellFormed_of_reaches` are machine-checked for **add component and remove component, and nothing else**. The paper's appendix table `tab:cases` has **14 rows** (idle · add component · remove component · replace component · add connection · remove connection · add env. object · remove env. object · connect environment · disconnect environment · add / retire function · add / remove milieu var. · swap interface · modify). Two of those fourteen are in `Step`. The other twelve are argued by hand in the table.

Say it that way when quoting the result. "The closure theorem is machine-checked" is true; "the 14-row taxonomy is machine-checked" is not, and the difference is twelve rows. The Lean file's own header is careful about a related point — the non-vacuity section exists precisely because every theorem above it "would still be true of a regime that never removes anything" — and `step_not_additive` is the separating instance that rules that out. That witness covers `decline`; it says nothing about the other twelve rows.

Two further scope facts a quoter needs. The closure theorem is about `PreTuple`, not `MobusSystem`, and that is load-bearing: the file's `DOES NOT COUNT` note says a `Step` typed on `MobusSystem` "makes this `fun _ h => h` and asserts nothing", because the structure enforces its constraints by construction. And `decline` carries the side condition `a ∉ p.interfaces` — removing an interface is explicitly out of the increment, so "remove component" is machine-checked for non-interface components only.

## Probes

Every gap above that is stated as demonstrated has a file. The `.sl` probes are read through the CLI; the Rust probes construct `WorldModel`s directly, because a hand-authored `WorldModel` opened through the CLI is normalized by `archive::read` → `to_canvas` → `project` and the pathology is laundered on the way in. That normalization is itself worth knowing: **the CLI cannot reach the checks that only fire on hand-authored models.**

| probe | what it shows | how to run |
|---|---|---|
| `fixtures/wellformedness/env-to-env-flow.sl` | a `Source → Sink` edge is admitted clean, counted in `G`, and runs — row 8's gap | `just bert verdict fixtures/wellformedness/env-to-env-flow.sl --lens mobus` → exit 0, `"issues": []` |
| `fixtures/wellformedness/crossing-flow-no-interface.sl` | the control: the half of row 8 the kernel *does* enforce | same command → exit 4, `crossing_flow_without_interface` |
| `fixtures/wellformedness/self-loop.sl` | `self_loop_flow` is mode-gated where the Lean is unconditional — row 2 | `--lens klir` → exit 0 · `--lens bunge` → exit 0 · `--lens mobus` → exit 4 |
| `crates/bert-core/tests/wellformedness_probes.rs` | rows 7, 9, and the row-1 UNKNOWN, on hand-authored `WorldModel`s | `cargo test -p bert-core --test wellformedness_probes` |

The Rust probes pin **current** behaviour, and each assertion of silence names the row it belongs to. Repairing a gap turns them red, which is the intent: the doc row and the test move together or the doc is wrong.

## What issues this audit would file

Recorded, not opened, and deliberately not fixed here.

1. **`bipartite`'s environment-to-environment half is unenforced.** A flow whose source and sink are both environment objects passes every layer. Claim: `check_crossing_flows_route_through_interface` should either own the env→env case or the deferral target should exist. Evidence: `env-to-env-flow.sl`, plus the fact that `check_flow_direction` — named in two source comments as the owner — is not a function in this workspace. That stale name should go regardless of whether the check is added.
2. **`interfaces_carry_flow` can be satisfied by a declaration alone.** A non-empty `exports_to` substitutes for an edge of `G`, and the declaration check accepts corroboration by a flow that reaches the parent system rather than the interface. Claim: the graph condition and the declaration condition should be separable in the verdict, so a model can be told which one it satisfies. Evidence: `an_interface_with_no_edge_in_g_passes_both_interface_checks`.
3. **`interfaces_sub` has no check below level 0.** Claim: either state that `I ⊆ C` is a canvas-path invariant and out of the validator's remit, or extend `check_s0_interface_processors` past level 0. The current state — a Warning that its own source calls unfireable on the models the app produces — is neither. Evidence: `an_unclaimed_interface_below_level_zero_draws_nothing`.
4. **The self-loop scope question is unstated.** The interface checks say in prose why they are silent at Core and Structural; `check_self_loops` says nothing about why it is silent there while the Lean predicate is unconditional. Claim: a one-line scope statement, not a behaviour change.
5. **The orphan asymmetry is unrecorded.** `orphan_source` / `orphan_sink` are strictly stronger than the Lean, and no doc says so. Claim: a line in [`theory-fidelity.md`](theory-fidelity.md)'s take/drop section.

Not filed, on purpose: rows 3, 5 and 6. An issue for an unviolable condition is an issue nobody can close.
