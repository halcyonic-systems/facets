# Hierarchical Decomposition in bert-lenses — Investigation & Design Options

*Status: PROPOSED, 2026-07-18. Tracking issue: [#89](https://github.com/halcyonic-systems/bert-lenses/issues/89) (filed 2026-07-18 from the §5 draft, with the Option B endorsement and the Lean-first gate). Investigation only, no implementation. Math layer: `decomposition-foundations.md` (RESEARCH).*

## TL;DR

The kernel **data model can represent** arbitrary-depth decomposition (inherited
wholesale from old BERT: `Id.indices`, `IdType::Subsystem`, `Info.level`,
`System.parent`, `Complexity::Complex/Atomic`). But **every active path in
bert-lenses is flat by construction**: the canvas authoring model is a single
`things`/`relations` list, `project()` hardcodes every component to level 1 under
one root, `to_canvas()` silently drops anything below level 1, the operational
projection **explicitly refuses** `level > 1`, and the web face has no
enter/expand/drill affordance. Decomposition is *representable-but-unhandled*:
unauthored, unexecutable, unviewable. Old BERT's defining feature (recursive
SOI → subsystem deconstruction, ovals-in-ovals, double-click to enter) has no
successor here and no tracking issue.

---

## 1. Ground truth (cited)

### 1.1 The data model *can* carry hierarchy — legacy from old BERT

`bert-core` inherited old BERT's hierarchical ID scheme intact:

- `Id { ty: IdType, indices: Vec<i64> }` — indices encode the path from root;
  `[0]` = root system, `[0,1]` = subsystem 1 of root, `[0,1,2]` = its child, etc.
  (`crates/bert-core/src/lib.rs:807-885`, `950-998`).
- `IdType::Subsystem` ("C" prefix) — "Nested system component within a parent
  system … enabling hierarchical modeling at multiple levels of detail"
  (`lib.rs:985-998`).
- `Info.level: i32` — "Hierarchical depth level … `level = indices.len() - 1`,
  Environment = -1, Subsystems = 1,2,3…" (`lib.rs:1051-1109`).
- `System.parent: Id` — "Id of the parent system or the environment if this is
  the root" (`lib.rs:1132-1133`).
- `Complexity::{ Complex{adaptable,evolveable}, Atomic, Multiset(n) }` — the
  Mobus complex-vs-atomic distinction that *marks the stopping condition*
  (`lib.rs:1458-1542`). `is_atomic()` = leaf; `is_complex()` = decomposable.
- `WorldModel` doc: "Systems (hierarchical system tree) ├ Root System └ Nested
  Subsystems (any depth) … stored in a flat list with hierarchical relationships
  maintained through parent ID references" (`lib.rs:539-618`).

So the *representation* is arbitrary-depth. Nothing in bert-lenses *produces* or
*consumes* depth beyond 1.

### 1.2 The systemhood validator accepts depth but doesn't require it

`validate.rs` checks level/index consistency for whatever tree is present —
`expected = indices.len() - 1; if level != expected { error }`
(`crates/bert-core/src/validate.rs:716-722`) — and references "level-1 subsystem"
for root-membrane interface designation (`validate.rs:918-940`). It validates a
deep tree structurally if one is handed to it, but every authoring path hands it
a 2-level model.

### 1.3 The canvas authoring surface is strictly two-level

`CanvasModel` is flat by type: `{ lens, things: Vec<Thing>, relations:
Vec<Relation>, boundary, system_type }` (`crates/bert-canvas/src/canvas.rs:163-177`).
A `Thing` is a node with `role: Component | Environment` — **no child list, no
parent pointer, no nesting** (`canvas.rs:72-89`). The boundary props are
documented "for the ROOT system's membrane (**the canvas is single-root**)"
(`canvas.rs:115-118`).

`project_with_map()` (`canvas.rs:257-455`) builds a **fixed two-level model**:

- one root at `indices: [0]`, `level 0` (`canvas.rs:264-282`);
- every `Component` thing → `IdType::Subsystem`, `indices: [0, comp_idx]`,
  **`level: 1`, `Complexity::Atomic`** (`canvas.rs:288-308`, and `new_system` forces
  `Complexity::Atomic` at `canvas.rs:212`);
- every touched `Environment` thing → Source/Sink at `level -1`.

There is no code path that makes a component itself a system (no C/N/E/B of its
own). `to_canvas()` — the inverse — iterates `model.systems.iter().filter(|s|
s.info.level == 1)` (`canvas.rs:486`) and `.find(|s| s.info.level == 0)` for the
boundary (`canvas.rs:551-554`): **anything at level ≥ 2 is silently dropped** when
a model is loaded onto the canvas.

### 1.4 The operational (executable) projection *refuses* depth > 1

The hardest evidence. `validate_operational()` walks systems and:

```rust
if sys.info.level > 1 {
    errors.push(OperationalError::new(
        format!("systems[{i}]"),
        format!("\"{}\" sits at level {} — hierarchy below level 1 has no \
                 executable reading in the flat circuit vocabulary", …),
        Some("Flatten the model to one level of work processes first"),
    ));
    continue;
}
```

(`crates/bert-core/src/operational.rs:226-241`; doc contract at `operational.rs:177-178`:
"every level-1 system carries a primitive, **no hierarchy below level 1**".) The
dynamical face is two-level *by design decision*, not by omission.

### 1.5 The dynamical face (compose/tether) is flat too

`bert-compose` export operates on level 0 (root name) and level > 0 (the
one flat tier of subsystems): `.find(|s| s.info.level == 0)`,
`.filter(|s| s.info.level > 0)` (`crates/bert-compose/src/export.rs:280, 457`).
The tether's drive-target picker exposes only "components (**level-1 systems**)"
(`crates/bert-lenses-kernel/src/api.rs:88`, `model_targets`). No composite has an
interior the simulator descends into.

### 1.6 The web face has no decomposition affordance

Grepping `web/src/` for `subsystem|decompos|enter|expand|drill|nest|breadcrumb`
returns only stock-*level* readouts (dynamical) and one canvas tooltip: "a member
of C — a subsystem one level down" (`web/src/canvas/lenses/registry.ts:172`). There
is no double-click-to-enter, no breadcrumb, no zoom-into-oval. The canvas is a
single flat plane.

### 1.7 Today's real model corroborates

`~/Documents/bert-lenses/technical/hal-projection.json` (today's hal model):
`system levels: [0, 1]`, 6 systems — a single flat two-level view of the whole hal
stack. Its canvas twin: 9 things, 10 relations, one plane. This is the *de facto*
usage: the entire system rendered as one flat map.

### 1.8 No tracking issue

`gh issue list` on the repo shows **no** open issue mentioning
decomp/hierarch/nest/subsystem/recursi/zoom/drill. The ROADMAP mentions
"decompose-further" only as the single-primitive-per-component rule
(bert-lenses#5: a component needing two primitives must be split — which is *itself*
an unhonored decomposition prompt, since there's nowhere to put the split).

**Verdict:** *The bert-lenses kernel is flat. Hierarchical decomposition is
representable in the inherited data model but is unhandled end-to-end — no
authoring, no execution below one level (actively refused), no viewing, no issue.*

---

## 2. What faithful decomposition requires (the fidelity bar)

### 2.1 Mobus Ch.4 (§4.3.3.1, the recursion)

Eq. 4.3 is the recursive substitution:

```
c_{i,j,l} = { S_{i,j,l+1}  if the component is complex
            { c_a          if the component is atomic
```

"Treat **any complex component at any level as a system in its own right**" — a
child SOI with its own internal flow network `N`, environment `G = ⟨Src, Snk⟩`,
boundary `B`, at level `l+1`. The dotted index maintains global position; the tree
is rooted at the level-0 SOI. Critically, **the environment is relative to each
level**: `E_{i,l} = ⟨Src_{i,l}, Snk_{i,l}⟩` is the environment *of component i at
level l* (footnote 11: the "unmodeled internals" rule for sources/sinks relaxes as
you descend).

**Stopping conditions** (what makes a leaf):
- *Simplest-process rule* (semi-formal): a component needs no further
  deconstruction if it does one atomic work process — combine two inputs → one
  output, split one → two, impede a flow, propel a flow — or is a raw buffer
  stock, with no internal decision rules beyond its transformation function.
- *Informal*: internals already well-specified elsewhere (transistor, ATP molecule).

The two views: **tree view** (hierarchy legible) and **map view** (ovals inside
ovals — "unwieldy but possible").

### 2.2 The Lean formalization *already machine-checks this*

`systems-science-foundations/Systems/Core/Systemness.lean` carries
`RecursiveSystem` — "**Mobus Eq. 4.3 enriched with Bunge's CES constraints**":

```lean
inductive RecursiveSystem (α) where
  | primitive (thing : α)                        -- atomic leaf
  | composite (thing) (system : ConcreteSystem α)
              (children : List (RecursiveSystem α))
```

with `depth`, `primitiveCount`, `isPrimitive/isComposite`, and a **`WellFormed`**
predicate: at every composite level, the children's things **biject** with the
system's `composition` (`Systemness.lean:150-158`). Decomposition **terminates by
structural recursion** (no well-foundedness proof needed) — the "recursion cannot
go on forever" stopping guarantee, formalized. Principle 1 (Systemness) is
"recursive systems with CES constraints at every level" (`Systemness.lean:3`).

So the fidelity bar is not aspirational — it is a proven object. Any decomposition
design in bert-lenses should be readable as an *implementation of `RecursiveSystem`*:
composite carries a full system (C,E,S,M / 8-tuple) at each level, leaves are
process primitives, and the parent↔child boundary is the WellFormed bijection.

(Note on the 8-tuple ⟨C,N,E,G,B,T,H,Δt⟩: **H = History, not hierarchy.** The level
structure lives in Eq. 4.3's recursion and `RecursiveSystem`, not in a tuple slot.
`Tuple.lean` describes one system at one level; the hierarchy is the tree of tuples.)

---

## 3. Design options

Four options, floor to ceiling. Each is scored on kernel impact, lens fidelity
(does Klir / Bunge / Mobus each survive?), authoring UX, and composition with the
dynamical face (compose/tether).

### Option A — Declare flatness the contract (the floor)

Make `level > 1` a hard *systemhood* error too (not just operational), delete the
representable-but-unhandled ambiguity, and document: "one system = one plane of
work processes; to go deeper, author a separate model." Ship the honest boundary.

- **Kernel impact**: trivial (lift one check into `validate`).
- **Lens fidelity**: each lens stays exactly as today — but the model can never
  express Mobus's *defining* recursive structure. Klir/Bunge/Mobus all survive
  *at one level only*.
- **Authoring UX**: unchanged; but a genuinely complex system can't be built —
  bert-lenses#5's "decompose further" prompt still has nowhere to land.
- **Dynamical face**: unchanged (already flat).
- **Verdict**: cheapest and most honest, but *abandons* old BERT's reason for
  existing. Acceptable only as a stated interim, not an endpoint.

### Option B — Decomposition by reference (linked flat models) ★

A `Component` thing may carry an optional `child_model` reference (a stable id or
path) to **another `CanvasModel`**. "Entering" a component loads that child model
as a fresh flat canvas (breadcrumb trail to exit). The kernel **stays flat per
level**; the hierarchy is a *relation over flat models*, not a nested data
structure. This is Eq. 4.3's substitution made literal: `c_{i,j,l} = S_{i,j,l+1}`
is exactly "this component *is* that (separately authored) child system."

The one load-bearing fidelity gate: a **boundary contract** — the child model's
environment terminals (its Src/Snk) must biject with the parent component's
incoming/outgoing flows. This is the Lean `WellFormed` bijection lifted to the
reference seam; without it you have two disconnected diagrams, not a decomposition.

- **Kernel impact**: *low.* Add `child_model: Option<ModelRef>` to `Thing` and a
  `boundary_contract(parent_component, child_model)` check. `project()`,
  `validate_operational`, compose/tether all keep working **unchanged** because
  every level is still a flat model they already handle. The `level > 1` refusal
  stays true and correct (no single model ever exceeds 2 levels).
- **Lens fidelity**: *full, per level.* Each level is validated at its own rung
  (Klir/Bunge/Mobus) by the existing machinery. Descent is orthogonal to the lens
  — you can decompose a component whether you're reading Klir, Bunge, or Mobus.
  The boundary contract is the Bunge/Mobus interface-identity (interface IS a
  subsystem) made explicit across the seam.
- **Authoring UX**: strong and incremental — reuses the entire existing flat
  editor at every level; adds only enter/exit + breadcrumb + a "decompose this
  component" action (which seeds a child model whose environment is pre-populated
  from the parent's flows — turning bert-lenses#5's prompt into an action).
- **Dynamical face**: *composes cleanly by deferral.* The leaf-level model runs
  as today. A parent treats a decomposed child as an atomic primitive at its own
  level (the stopping-condition boundary) **until** a substitution/aggregation
  semantics is defined. This parks the genuinely hard multi-timescale composition
  question (see `project_multitimescale_architecture`) instead of blocking on it.
- **Verdict**: the **satisficing** option. Maximum fidelity-per-unit-surgery;
  every existing invariant survives; the hard dynamical-composition problem is
  isolated and deferrable. Precedent: today's hal-projection is already one flat
  level; this makes "the interior of a hal component" the next flat level.

### Option C — Nested-in-model tree (revive old BERT's in-place recursion)

One `WorldModel` carries arbitrary-depth `Subsystem`s (already representable). The
canvas gains ovals-in-ovals rendering + zoom/enter (old BERT had `NestingLevel(u16)`,
`SUBSYSTEM_SCALING_FACTOR^level` scaling, double-click "Enter Subsystem" —
`bert/src/bevy_app/components/zoom.rs`, `.../leptos_app/.../controls_menu.rs:56`).
`project()` builds the tree; `validate_operational` recurses per composite and the
`level > 1` refusal is lifted.

- **Kernel impact**: *high.* `CanvasModel` becomes recursive; `project`/`to_canvas`
  rewritten; the operational projection needs a **recursion vocabulary it does not
  have** — how a composite's dynamics compose from its children (the exact question
  Option B defers). Compose/tether need a story for descending.
- **Lens fidelity**: full and native to Mobus's map view (ovals-in-ovals is
  literally Fig. 4.4/4.6). But every lens's validators must be re-proven to hold
  *per level within one model* rather than per model.
- **Authoring UX**: the richest single-canvas experience (no context switch), but
  couples authoring depth to render/zoom complexity — old BERT's zoom/geometry
  system was a substantial subsystem in its own right.
- **Dynamical face**: forces the multi-timescale composition problem to be solved
  *now*, as a precondition to shipping anything.
- **Verdict**: highest ceiling, highest cost, and it front-loads the unsolved
  dynamical-composition research. This is old BERT's design; the *baggage* is that
  in-place recursion couples four hard problems (authoring, render/zoom, per-level
  validation, dynamical composition) into one indivisible change.

### Option D — Decomposition as a `project()` view over one rich master model

Keep a single richer master model; a "subsystem view" is a *filtered projection*
of it (`project()` restricted to a subtree). Suggestive precedent: today's
hal-projection is already a `project()`-shaped flat view.

- **Kernel impact**: medium (a filtering/scoping projection).
- **Lens fidelity**: fine for *viewing*, since each view is a flat model.
- **Authoring UX**: **weak — this solves viewing, not authoring.** It presupposes
  the rich master already exists; it gives no way to *build* the interior of a
  component. It's a read-path answer to a construction question.
- **Dynamical face**: inherits whatever the master model can run.
- **Verdict**: useful as a *complement* (a "flatten/zoom-out" view over an
  Option-B reference tree), not as the primary mechanism. Note it and move on.

---

## 4. Recommendation

**Adopt Option B — decomposition by reference (linked flat models) — with the
parent↔child boundary contract as the one non-negotiable fidelity gate, and
dynamical composition across levels explicitly deferred.**

Reasoning (satisfice, not optimize):

1. **It reuses the kernel's existing flatness instead of surgically adding
   recursion.** Every current invariant — the 2-level `project`, the `level > 1`
   operational refusal, per-rung lens verdicts, compose/tether — keeps working
   *unchanged*, because each level simply *is* a flat model the kernel already
   handles. Option C rewrites all of them and inherits an unsolved dynamical
   problem as a blocker.
2. **It is faithful to Eq. 4.3 and to `RecursiveSystem`.** "Treat any complex
   component at any level as a system in its own right" is exactly a child
   `CanvasModel`; the reference *is* the `c_{i,j,l} = S_{i,j,l+1}` substitution;
   the boundary contract *is* the Lean `WellFormed` bijection at the seam.
3. **It turns bert-lenses#5 from a dead-end prompt into an action** — "this
   component needs two primitives" becomes "decompose it," seeding a child model
   whose environment is pre-filled from the parent's flows.
4. **It isolates the one genuinely hard problem** (multi-timescale dynamical
   composition of a child into its parent) behind a clean deferral: a decomposed
   child reads as atomic at the parent level until aggregation semantics are
   defined. That question tracks `project_multitimescale_architecture` and does not
   need to be answered to ship structural decomposition.

Interaction with open issues: **#24** (lens-entry bridge / `gates_truth_table`) is
*unaffected* — the same per-rung gate table applies at every level, no new gate
vocabulary. **#17** (Quint mode-transition machine) is *orthogonal but adjacent* —
"descend into a subsystem" is a navigation transition, not a mode-ladder
transition; worth noting a subsystem-entry transition to the Quint model but not
coupling it. **#69** (specific-sink reachability in the kernel) *eventually* wants
to compose across the reference boundary, but per-level-first is the right scope and
Option B keeps each level's reachability check exactly as-is.

Old BERT's in-place nesting is the design worth *learning from* (its stopping
conditions, its interface-subsystem identity) but not *reviving wholesale* — its
single-model recursion is precisely the coupling that makes decomposition a
four-headed change rather than a one-field addition.

---

## 5. Draft issue text (gated on review — not yet filed)

> **Title:** Hierarchical decomposition: how does a component become a system?
> (kernel is flat; old BERT's defining feature has no successor)
>
> **Labels:** design, kernel, fidelity
>
> **Body:**
>
> **Ground truth (2026-07-18).** bert-lenses's `bert-core` data model *can*
> represent arbitrary-depth decomposition (`Id.indices`, `IdType::Subsystem`,
> `Info.level`, `System.parent`, `Complexity::Complex/Atomic` — all inherited from
> old BERT). But every active path is **flat**:
> - `CanvasModel` is a single `things`/`relations` list; "the canvas is
>   single-root" (`bert-canvas/src/canvas.rs:115-177`).
> - `project()` forces every component to `level 1`, `Complexity::Atomic`, under
>   one root (`canvas.rs:288-308`); `to_canvas()` **drops everything below level 1**
>   (`canvas.rs:486`).
> - `validate_operational()` **explicitly refuses `level > 1`**: "hierarchy below
>   level 1 has no executable reading in the flat circuit vocabulary — flatten the
>   model first" (`bert-core/src/operational.rs:226-241`).
> - The web canvas has no enter/expand/drill affordance.
>
> So recursive decomposition — old BERT's defining feature (SOI → subsystem
> deconstruction, ovals-in-ovals, double-click to enter) — is
> **representable-but-unhandled**: unauthored, unexecutable, unviewable, and (until
> now) untracked.
>
> **Fidelity bar.** Mobus Ch.4 Eq. 4.3 (`c_{i,j,l} = S_{i,j,l+1}` if complex, else
> atomic), with the simplest-process stopping rule, is **machine-checked** in
> `systems-science-foundations/Systems/Core/Systemness.lean` as `RecursiveSystem`
> (composite carries a full `ConcreteSystem`; `WellFormed` = children biject with
> composition; terminates by structural recursion). Any design here should read as
> an implementation of `RecursiveSystem`. (NB: in the 8-tuple, H = History, *not*
> hierarchy — level structure lives in the recursion, not a tuple slot.)
>
> **Proposed direction (for discussion): decomposition by reference.** A component
> thing carries an optional reference to another (flat) `CanvasModel`; "enter"
> loads it as a fresh canvas with a breadcrumb; the kernel stays flat *per level*.
> The load-bearing gate is a **parent↔child boundary contract**: the child's
> environment terminals must biject with the parent component's flows (the Lean
> `WellFormed` bijection at the seam). This keeps `project`, `validate_operational`,
> and compose/tether working unchanged, validates each level at its own lens rung,
> and defers the one hard problem — multi-timescale dynamical composition of a child
> into its parent (a decomposed child reads as atomic at the parent level until
> aggregation semantics exist; tracks the multi-timescale-architecture thread).
>
> Alternatives considered: (A) declare flatness the contract [floor — honest but
> abandons the feature]; (C) revive old BERT's in-place nested tree [highest
> fidelity, but couples authoring + render/zoom + per-level validation + unsolved
> dynamical composition into one indivisible change]; (D) decomposition as a
> `project()` view over a rich master [solves viewing, not authoring — keep as a
> complementary zoom-out].
>
> **Implementation gate (Shingai, 7/18 — Option B endorsed on review):** before
> any implementation, do the math from **our Lean-specified 8-tuple**
> ⟨C,N,E,G,B,T,H,Δt⟩ (`Tuple.lean` is the semantic authority), NOT the source
> book's 7-tuple — work out the parent↔child boundary bijection, the seam's
> N/G/B treatment, and what the reference substitution does to E and H, as
> 8-tuple statements first. The Lean `RecursiveSystem`/`WellFormed` pair is the
> anchor; the design must be derivable from it, not merely analogous to it.
>
> **Scope of this issue:** agree the *mechanism* (reference vs nested-in-model),
> the boundary-contract check, and whether dynamical composition is in or out of
> v1. Interactions: #24 (same gate table per level — unaffected), #17 (a
> subsystem-entry transition is navigation, not a mode transition — note, don't
> couple), #69 (per-level reachability first; cross-boundary composition later).
> Full investigation: `docs/design/hierarchical-decomposition-investigation.md`.
