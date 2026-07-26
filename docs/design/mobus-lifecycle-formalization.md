# Formalizing the system life cycle

**Status: PROPOSED (#144).** The tracking issue was retired into [`../parked.md`](../parked.md#i144) on 2026-07-26; the position still awaits adoption.

*2026-07-23 · design position · specification and plan, no production code yet*

George Mobus's paper *"Revising and extending the mathematical framework for defining a system"* revises his 7-tuple to the 8-tuple and then opens a life-cycle extension it does not finish: five stage headers with nothing under them. This document is the position on finishing it — what the kernel already answers, what is genuinely open, and what is not ours to decide.

Provenance and the state of the 2025–26 prior art: [`lifecycle-prior-art.md`](lifecycle-prior-art.md). Dynamics typing: [`dynamics-principled-position.md`](dynamics-principled-position.md) (#86, ADOPTED), which this document is subordinate to and does not amend.

**Posture.** The goal is a paper finished *with* Mobus, not a correction issued *at* him. Several findings below are corrections; all of them are corrections his own text licenses, and each is stated with the line that licenses it. Where a contribution is his, it is marked his.

---

## 1. What the kernel already answers

**The blocker he was waiting on is closed.** The Feb-2025 evaluation of the boundary proposal named the open problem: *"we need a very elegant and sound manner of accounting for the fact that our 8-tuple will have sets whose members are members of other sets."* The proposed fix was to dissolve `B` into a boundary-formation function and move `I` into `C`; it was sidelined as "promising but not prioritized."

`Systems/Mobus/Tuple.lean` answers it and takes neither horn:

| Field | Settles |
|---|---|
| `interfaces_sub : boundary.interfaces ⊆ components` | interfaces **are** components — the 2025 insight — **without** dissolving `B` |
| `disjoint : components ∩ environment.objects = ∅` | the C/E overlap |
| `externalFlows_nodes : ⊆ environment.objects ∪ boundary.interfaces` | G's node set |
| `network_components : internalNetwork.nodes = components` | N's node set |
| `bipartite` | every G edge crosses; boundary completeness then *derives* rather than being assumed |

Overlapping membership stops being an ambiguity and becomes an explicit typed subset relation. The boundary-formation detour is not merely deprioritized — it is unnecessary.

---

## 2. The central claim: F(S) factors, and the factorization is the thesis

Adopt the prior art's formalism — Veliov's discrete inclusion, `ΔS ∈ F(S)`, a set-valued map of permissible transitions. The contribution is what `F` turns out to be:

> ### **F(S) = F_coh(S) ∩ F_φ(S)**
>
> **`F_coh(S)` is derivable.** The set of changes yielding a well-formed 8-tuple is *fully determined* by the five coherence fields. Nothing is chosen. The type is the specification.
>
> **`F_φ(S)` is stipulated.** The phase constraints are the only free part — and every arbitrary threshold in the informal treatment lives here.

**The derivable/stipulated boundary is the principled/arbitrary boundary.** That is what gives the empty stage sections an organizing distinction, and it gives formalization a job prose cannot do: it *forces* stipulations to appear as explicit hypotheses instead of dissolving into a bullet list. A reader of the prose cannot tell which phase constraints are consequences and which are assumptions. A reader of the Lean can — derivable ones are theorems, stipulated ones are arguments.

The current phase constraints are, verbatim, "ΔC **tends to be** additive," "at a **higher rate** than in other phases," "reached an **optimal** configuration," "**rapid** loss of components." Higher rate than what — there is no rate on `Set α`. Optimal by what objective — none is named anywhere. These are not predicates; they are promises of predicates, and they all sit in `F_φ`.

---

## 3. Corrections to the paper, with the lines that license them

### 3.1 ⚠️ Union cannot express three of his own five stages

He writes `S_{t+1} = S_t ∪ ⟨ΔS⟩`, in prose too ("union some new (changed) state"). Union is monotone — it can only add. But Decline requires components being removed, Dissolution requires the boundary coming apart, and **three lines later he writes `ΔB = ⟨B \ {b_k}, B ∪ {b_new}⟩`** — set difference, contradicting the `∪` above it. He also notes "we could also define deletions" without doing so.

**The stages section is empty because the equation preceding it cannot reach three of the five stages.**

The obvious patch — keep union, bolt on subtraction, `S_{t+1} = (S_t ∪ Δ⁺) \ Δ⁻` — **provably fails on his own examples**:

1. **`replaceInterface` is atomic.** As add-then-remove it passes through an intermediate tuple that may violate `interfaces_sub` — the patch forces an illegal waypoint into a legal transition.
2. **Capacity modification is neither.** He explicitly wants it ("changing a flow capacity"). It is a *relabel*; `FlowEdge` carries `capacity : κ`, so remove-plus-add is an accident of encoding, not the meaning.
3. It leaves coherence repair implicit — removing from `C` says nothing about `N`'s node set, which `network_components` makes mandatory.

**The repair is structural**: replace `∪` with *application of an operator*, `S_{t+1} = apply(S_t, δ)`, where deletion is a first-class constructor rather than an exception. Growth and decline become the same kind of object differing only in which constructor fires — which is what five dual stages require.

### 3.2 His one asymmetry claim is one of a family of three

He states "changes in C automatically imply changes in N, though not reciprocal." **It is a theorem, and essentially definitional** — one term, chaining `network_components`. That is the finding: the claim is not an observation about how systems age, it is *forced by his own Eq. 4.4 from 2022* (`N = ⟨C, L⟩`; the vertex set of N **is** C). It costs him nothing and grounding strengthens it.

⚠️ **One correction his prose invites**: the theorem is about **node sets only**. The stronger reading — "adding a component forces a new edge" — is **false**; nothing requires connectivity, and `addComponent` adds an isolated node. The paper should say "changes in C imply changes in N's *vertex set*."

**The bigger result**: the five constraints generate a three-way taxonomy determined by each constraint's *logical shape*.

| Shape | Forcing | Instance |
|---|---|---|
| **Equality** | forces change **unconditionally** | `network_components` → ΔC ⟹ ΔN (his claim) |
| **Subset** | forces change **conditionally** | `interfaces_sub` → ΔC ⟹ ΔB; `externalFlows_nodes` → ΔB ⟹ ΔG — **neither stated by him** |
| **Disjointness** | forces **nothing** | `disjoint` is symmetric: a legality *precondition* on ΔC, never a consequence of it |

A side finding for this repo: `Category/ShapeMobus.lean`'s `env_disjoint_comp` arrow is therefore **a different kind** from the other four — a mutual exclusion drawn as a directed dependency.

### 3.3 The precondition catalogue

His informal operators omit legality conditions entirely. `addComponent c` requires `c ∉ environment.objects`. `replaceInterface bOld bNew` requires `bNew ∈ components` **and** that no G edge is incident to `bOld`, else G must be rewired — his prose *presumes* the rewiring ("an organization replaces one type of customer interface with another"); his formula does not express it.

### 3.4 ΔT and ΔH presuppose what the 8-tuple does not assert

He writes `ΔT = ⟨T ∪ {t_new}⟩`. But `transforms : τ` is an opaque type parameter — "carried data with no structural role in the ontology." **There is no `∪` on `τ`.** His ΔT and ΔH operators presuppose set-valued T and H, which his own 8-tuple does not assert. This is worth telling him; it is not worth fixing here (see §6).

---

## 4. The stages, honestly

**Origination and Dissolution — the best result available, and threshold-free.** `MobusSystem` has no nonemptiness constraint, so a composition-empty tuple satisfies all five fields. But `ConcreteSystem` requires `bondage_nonempty`, and `toBunge` correspondingly demands a nonempty internal edge set. Therefore:

> **The Mobus 8-tuple can represent a pre-system; the Bunge CES triple cannot.** The tick at which the Bunge bridge becomes definable is a threshold in the trajectory, and Dissolution is its dual.

No thresholds, no free parameters. Compare the prior art, which defines the same boundary via `V_min`, an undefined stipulation, where the type already supplies a derivable answer. **This is `F_coh` doing work `F_φ` was being asked to do.**

⚠️ **State it as a theorem about the bridge, not as a property of the Mobus trajectory.** As written above it defines a *Mobus-side* life-cycle boundary via a *Bunge-side* precondition — which is the ascending tower this repo explicitly swore off: `HasBond` and `Irreflexive` are **independent** predicates, `toMobus_toBunge` is the *only* proven composite, the mode poset is "a meet-semilattice (tree-shaped); no joins by design," and "'mode' language must never be read as an ascending path where later modes presuppose earlier ones."

The result is probably the most interesting thing in this document — *the pre-system is Mobus-representable and Bunge-inadmissible* is a genuine K≅2 finding about **where the lenses come apart**. But it is a cross-lens claim and must be labelled one, with the independence caveat attached. Called "Origination," it reads as a Mobus stage derived from a Bunge gate, and the first careful reader files it as the tower.

⚠️ **And component identity across time is assumed, not established.** In `Tuple.lean` `components : Set α`, so identity across ticks is free — α is stable *by assumption*. **In the tool it is not**: ids are machine mechanics normalized on canonicalization, names are the stable handle, and names are author-editable. The Lean's cleanliness will make this look solved when it is not. Increment 1 is Lean-only and safe; Increment 2 and any model-history UI inherit the problem whole. `ΔC = ⟨C ∪ c_new⟩` presupposes an answer nobody has.

**Development / Decline** — monotone growth/shrinkage of composition over an interval. Parameter-free, and genuinely *dual*, which the union formulation could not deliver.

**Maturation / Stable Operation** — `C, N, E, G, B` frozen over the interval while `T, H, Δt` vary. Says something true and non-obvious: stable operation is **structural stasis with continued functional activity**; the tuple's parametric tail is exactly what keeps moving.

**One cute theorem**: `StructurallyStable I ↔ Developing I ∧ Declining I`. Maturation is the meet of growth and decline.

⚠️ **Stages are interval predicates, not a partition.** A trajectory can grow, shrink, and grow again; it may satisfy none, some, or several in alternation. Origination and Dissolution are **events** (single ticks); the other three are **interval predicates**. He lists all five as parallel "stages" — they are of two different logical types.

---

## 5. Dynamics typing — an existing cell, no amendment

Against the adopted taxonomy: axis B state-space = **the set of coherent 8-tuples**; axis C functor = **`P(X)`**, the powerset functor, which is what a discrete inclusion *is* and which the position doc already lists; axis D invariants = **none**; axis E = **generative** (`F` itself does not change; only which `δ ∈ F(S)` fires).

⚠️ **Coherence is axis B, not axis D. Do not call it "the structural conservation law."** Conservation is *declared* on the state space, is optional, and **can be violated** — that is why `circuit.rs`'s `balance()` returns a real-valued residual and a nonzero residual is a bug by definition. The coherence constraints are fields of a Lean structure: not declared, not optional, **cannot** be violated, because a tuple failing them does not typecheck. The shapes differ too — conservation is quantitative and holds *across* a transition; coherence is set-theoretic well-formedness *at each endpoint*, with no metric, no residual, and no "approximately coherent."

This flips the design rather than merely renaming it. As axis B, `f : X → P(X)` is coherence-preserving **by typing** — no ledger, no residual, no runtime check, free. As axis D you would build a checker and a residual and thereby *admit* violations: strictly more machinery for strictly less guarantee.

**Is anything conserved across a Δ?** Honestly, nothing obvious. Identity has no coordinate in the tuple. Component count plainly is not. Simonian complexity is asserted monotone in development, not conserved. **The slot is empty, and it is reported empty** — if someone finds a genuine ΔS invariant, that is a real theorem.

**Why no kernel change** — and the reason matters more than the axis-C listing. `P(X)` appearing in the taxonomy says the *runtime* kind is pre-typed; it says nothing about the Lean. The load-bearing fact is simpler and stronger: a life-cycle trajectory is a **definition added**, and **no existing theorem quantifies over a time index**, so none can break.

The semigroup contract is discharged by Kleisli composition in the powerset monad — `reach (m + n) = ⋃ P' ∈ reach m, reach P' n` — which is the Mesarovic–Takahara Def 2.7 acceptance test the repo has already declared normative.

**The phase must be carried, not computed**: `PhasedSystem := MobusSystem × Fin 5`. A φ that is a total function of the state cannot also depend on the previous phase, and folding history into the carrier is the adopted rule. Irreversibility then becomes an explicit property of `Step` rather than a selection rule smuggled in outside it.

---

## 5a. Where it belongs: a lenses extension, and the paper's two halves

**Verdict: an extension of bert-lenses.** Not a compose feature, not a third face, not a kernel change.

**The decisive evidence against "structure is just more state" is empirical, not abstract.** bert-compose *already* meets structural change at runtime, and its considered answer is to destroy the history:

```rust
// Record the tick. A topology change invalidates prior columns.
if self.history.last().map(|r| r.len()) != Some(width) {
    self.history.clear();
    self.ledger_history.clear();
}
```

The history row is **indexed by node count**; `balance()` says the same for the ledger ("editing a stock mid-run moves the baseline; Reset re-baselines"). A user dragging a node onto a running canvas *is* ΔC, and the engine's answer is "this is a different system, start over." That is correct under the semigroup contract, already implemented, and a flat refutation of structure-as-more-state.

Two corroborations: [`dynamics-principled-position.md`](dynamics-principled-position.md) already lists, under *explicitly out of scope*, "state-space dimensionality change mid-run… neither axis D nor E covers a carrier changing shape." And bert-compose's own Troncale sweep has a bucket for "structural/relational, not flow-dynamical" — hierarchy went there, and the life cycle goes there by the same test.

### ⚠️ The paper's two halves have opposite epistemic status

**The Δ / diff half is content-free** — it computes only what is in the two models, invents nothing, and is checkable. **Ship it.**

**The stages half is invention, and it is blocked on data, not on engineering.** Every phase constraint supplied in the prior art is a statistical *tendency*: "ΔC **tends to be** additive," "changes **tend to be** homeostatic," and one clause conflates "likely **or** permissible" outright. **A tendency cannot be a membership predicate**, and both readings fail:

- **As hard constraints**, a component added during Decline is *unrepresentable* — the formalism forbids observed reality (firms hire during layoffs). An instrument whose selling point is refusing with a citable reason would be refusing reality.
- **As tendencies**, `{δ | C_φ(S,δ)}` is ill-formed, and φ becomes a statistical **classifier** requiring a fitted corpus of annotated real life cycles. That corpus does not exist.

This collides directly with the governing rule: *the kernel proves or refuses a stated fact, never invents one.* **The five empty stage sections stay empty.** Stage naming is author free-text — ungated, the same class as `system_type` — not a kernel verdict.

**Reconciling this with §4**, which does give stage definitions: the two are compatible and the distinction is sharp. **Interval predicates** (monotone growth/shrinkage of composition, structural fixed point, Origination as bridge-definability) are derivable, threshold-free, and stay. **A classifier φ assigning each system its stage** is what is blocked. Predicates that may hold on intervals, yes; an assignment of the five stages, no.

### What would change the verdict

| Option | Would require |
|---|---|
| **(a) third face** | stage classification becoming machine-checkable — then a Developmental precondition parallel to Structural and Operational is warranted. Today there is nothing to gate on. |
| **(b) compose extension** | a *fixed* carrier: pre-declare a maximal component set, model removal as capacity → 0. Works narrowly (a plant idling) but **lies about C** — the component stays in the composition, so `describe` reports it and Bunge's aggregate verdict counts it. Fine as an author-chosen idiom, not as the tool's account of structural change. |
| **(d) kernel change** | persistence-of-identity having to be *certified*. `MobusSystem` has no identity coordinate and Mobus's `i,l` indices are dropped in the formalization. Identity belongs with `is_bond` and `system_type`: declared, checked, never derived. |
| **(e) out of scope** | nobody having a model whose structural change is the object of study. We do — charters amended over time, org restructurings, protocol upgrades: ΔC/ΔB/ΔG over a support of years. |

### ⚠️ Two further defects in the paper

**ΔH is vacuous as written.** If `X = MobusSystem` and the tuple *contains* `history : η`, then the carrier contains its own trajectory record. The adopted rule — "H is a record, never an input to T; any history-dependence must be folded into the carrier" — gets inverted, because the carrier already swallowed the record. So the life-cycle `f` must be defined on `MobusSystem` **with H quotiented out**, or ΔH reduces to "the history changed because the history was recorded." Mobus lists ΔH as a member of ΔS and never notices.

**ΔS has seven members for an eight-tuple.** `ΔΔt` is missing — Δt is excluded by fiat ("we take Δt to be the eighth element, so it will be assumed below"). That defines away one of the most interesting life-cycle facts available: *a maturing organization's decision cycle slowing down*. Worth raising with him; it may be the single most useful thing Δt could do.

**And the notation does not typecheck.** `S_{t+1} = S_t ∪ ⟨ΔS⟩` unions a tuple with a tuple; `ΔC = ⟨C ∪ c_new⟩` is not a delta but the new `C`; and arity is inconsistent across coordinates — `ΔC` is a set while `ΔB` is a *pair* of sets.

## 5b. K≅2: this is not where Mobus diverges

**Do not publish a "Bunge and Klir are static, Mobus extends them" framing. It is false, and it is refuted by citations already in this repo.**

- **Klir's metasystem is precisely the apparatus for structural change** — "important for capturing systems phenomena that involve change, such as adaptation, self-organization, morphogenesis, autopoiesis, evolution." It is excluded from the kernel **by a named scope decision**: "the kernel takes the 1967 kernel-system, not the full GSPS hierarchy of system types."
- **Bunge has qualitative change with new state axes appearing** (1979:4026, already cited in the adopted position under out-of-scope). The kernel **deliberately drops** "emergence-as-process, historicity."

So the life cycle is **not** a Mobus divergence. It is where **all three traditions have an account and the formalization has so far taken none of them.** A reviewer who knows Klir would catch the divergence claim immediately.

That reframes the question, and improves it:

> **Structural change is the next real test of K≅2, and a stronger test than anything the static core has faced.** The static convergence was found over three accounts of what a system *is*. If Klir's metasystem replacement, Bunge's qualitative change, and Mobus's ΔS turn out to be three descriptions of one operator on the kernel, the thesis extends to how systems *become* — a materially larger claim. If they do not converge, we have located the boundary of the common core, which is a first-class result and the kind of finding a purely confirmatory programme never produces.

⚠️ **The real risk is asymmetry, not divergence.** If the life cycle ships as a Mobus-only coordinate, the instrument acquires content only one lens can read — ADR 0004's defect re-introduced on a new axis. **Hard rule from day one: the delta renders in all three vocabularies or it does not ship.** Klir's is a delta over the incidence structure, Bunge's is Δ⟨C,E,S⟩ with the aggregate verdict recomputed, Mobus's is the paper's ΔS. *If one of the three cannot be written down, that is the finding.*

Restate the scope note pre-emptively: the second-order traditions (Varela, Luhmann, von Foerster) are outside this lineage by declared scope — and autopoiesis is *the* second-order account of a system maintaining itself through structural change. Every reader will draw the comparison.

## 6. What we will not formalize

1. **ΔT and ΔH.** Unreachable from the current kernel on three independent grounds: committing `T` to a set breaks the parametricity the Mobus module rests on and ripples through the bridge's six loss categories; the position doc already *schedules* τ-refinement as its own small SSF change, so doing it here pre-empts a planned decision; and letting T read H would break the semigroup contract outright.
2. **A symmetric operator suite over all seven Δ-components.** Six near-identical lemma blocks around one interesting one (`removeComponent`, whose B/G repair cascade is the real work).
3. **The phase constraint sets as written.** Importing "optimal", "higher rate", "rapid" into Lean as named opaque predicates *looks* rigorous and is **worse than prose** — it lends the appearance of definition to placeholders. Take them as hypotheses at the use site or not at all.
4. **A five-stage partition theorem** (false), **numeric life-cycle shapes** (empirical, unfalsifiable in Lean), **fitness-directed decline** (that is `Evolution.lean`'s territory — life cycle is *structural* change, evolution is *fitness-directed* change), **Δt-varying trajectories**, and **continuous-time life cycles**.
5. **Do not inflate ΔC ⟹ ΔN into a section.** It is one term; its entire worth is the diagnosis.

---

## 7. Plan

**Scoping fact that sets the cost:** the repo has **never constructed a `MobusSystem`.** `Composition.lean` proves an edge-classification theorem and builds nothing; `Bridge.lean` maps *out* of the tuple. `LifeCycle.lean` would be the first place discharging all five coherence fields of a *derived* 8-tuple. Nearest precedent is `ConcreteSystem.compose` — ~45 lines of tactic proof for three fields.

**Increment 1 (self-contained, and it is the entire paper contribution).** The three-way forced-change taxonomy, the non-reciprocity witness, the stage predicates, and `originates_iff_bunge_definable`. Depends only on `Tuple.lean` — **does not require `apply`.**

**Increment 2.** The primitive operators, `F_coh`, `apply` (the hard part: the `removeComponent` B/G cascade), ordered `List Δ` composition with a non-commutation witness, and `reach_semigroup` — the increment that discharges the #86 contract.

Composite change is `List (MobusDelta α κ)`, **ordered**: the primitives do not commute (`removeComponent c` then `addFlow e` incident to `c` is illegal; the reverse is legal-then-invalidated), so the informal `P(ΔS)` cannot name a transition.

Session close-out ritual applies (companion doc, axiom-table changelog, `Systems.lean` imports). **The axiom count should not change** — this is all definitions and theorems.

### 7a. The engineering increment — narrower than "model history"

**Ship a typed structural diff between two models already in the library.** No sequence metadata, no schema change, no SL syntax, no stage vocabulary, no run integration, no H.

Output: a Δ sectioned by C/N/E/G/B, kernel-computed, keyed to canvas ids, rendered in the active lens's vocabulary, plus a **coherence verdict naming which constraint a bad delta broke.** Days of work.

**The seam, concretely:**

| Where | What |
|---|---|
| `crates/bert-core/src/transition.rs` | `StructuralDelta` as a sibling to `LossWitness`, computed between two **`CanvasModel`s** (never `WorldModel`s — see below). Reuse `LossEntry`'s `{section, owner, slot, value}` shape and its enumerate-don't-summarize discipline. Its reversibility guarantee is *already ΔS's exact shape*; only the reason differs. |
| `crates/bert-core/src/validate.rs` | coherence-preservation joins the `check_*` family beside `check_bond` and `check_self_loops`, mirroring the five Lean constraints. **This is the missing theorem and the real contribution.** |
| `crates/bert-canvas/src/lenses.rs` | `describe()` already typesets each tradition's named object; the delta must render the same way or the tri-lens symmetry breaks. |

**Validate it for free against the corpus.** The corpus already teaches by diff — Klir's four paradigms over two elements and Bunge's three structures over one composition are *exactly* ΔN with ΔC = ∅, the degenerate case of a life-cycle diff, in two traditions, with known-correct answers. A test harness that already exists.

⚠️ **But the corpus rhyme is a pun in modality, and that is a hazard.** Those items are **alternatives** (modal: what a composition *admits*). A life cycle is a **succession** (temporal: what it *became*). Identical diff, opposite semantics. Render them alike and the tool teaches that "could have been organized this way" and "became organized this way" are the same claim — misrepresenting Bunge, whose example is explicitly about what a composition admits. The relation between two models must therefore be an **author declaration**: `variant-of` / `revision-of` / `succeeds`. Repo doctrine already supplies the mechanism — observed warns, declared refuses.

That same declaration solves a separate hazard: an author saves a revision because they fixed a typo or changed their mind about the boundary, and the diff reports a life-cycle event. **The system did not change; the model did.** Nothing structural distinguishes epistemic from ontic change.

### 7b. What the increment teaches — the reason to do it first

It hits **component identity across time** on the first real pair. `ΔC = ⟨C ∪ c_new⟩` presupposes you can say which `c` at *t+1* **is** which `c` at *t*. In this instrument ids are machine mechanics that get renumbered on canonicalization, and **names are the stable handle — and names are author-editable.** So *"renamed a component"* and *"deleted one, added another"* are **the same diff**.

Take two saved versions of a model we already have and ask whether the diff is stable and meaningful. If yes, everything downstream is buildable. **If it drowns in renames and id churn, Mobus's ΔS algebra has an unsolved identity problem at its base — and we learned it in days rather than a quarter.** Publishable either way.

### 7c. Three constraints on any design here

1. **ADR 0004 is a hard precondition, and it is a sequencing signal worth stating.** Before 2026-07-22 the archive was `project(canvasModel)` — the lossy Mobus projection, dropping `mere`, `: field`, `@directed`, and `system_type`. A sequence of saved models on the old archive would have destroyed Bunge and Klir content **at every step, compounding once per stage.** This capability was impossible to build honestly two months ago.
2. **Therefore it belongs in bert-lenses, not `bert`** — even though both theory docs live in `bert`. `bert`'s storage is `WorldModel`-based, i.e. exactly the lossy projection ADR 0004 moved off; building it there would construct the compounding-loss defect ADR 0004 exists to eliminate. The only archive that can hold a sequence losslessly across three lenses is `CanvasModel`. (And bert-lenses has already vendored bert-compose, so "two faces, one instrument" is now literally one repo — don't split it back.)
3. **The storage collision, which does not bite Increment 1 but bites the moment there is a UI.** `fsAccess.ts` resolves a child reference by reading **every file in the picked folder** and calling `modelIdentity` on each — there is no index, and that indexlessness is ADR 0004's *deciding* argument for JSON over SL. A history multiplies files-per-model by step count, so decompose-reference resolution degrades **linearly in history length**. Worse, a chain's ordering has nowhere to live but a predecessor pointer inside each file, so a move or rename can orphan a chain with no index to repair it. **Chain repair must therefore be an explicit, visible operation, never a silent re-link.** Also say plainly in any new ADR that a history is *instances of one generation*, so ADR 0004's write seal and single-reader guarantee carry over unchanged — and note that hierarchy (`child_model`) and time (`succeeds`) are two axes now crossing in the library tree: forty versions must not render as forty library entries.
4. **The git test.** Without stage semantics, ΔS *is* `git diff`. The three things git does not give: a diff **typed by tuple coordinate** rather than by line, **checked against the five coherence constraints**, and **readable in three traditions' vocabularies**. If a design does not deliver all three, don't build it — use git.

**Hard line:** none of this reaches `circuit.rs`. If a life-cycle step ever drives a run, it drives it as a *metasystem replacement* — stop φ₁, re-base, start φ₂, discontinuity witnessed and visible — never as mutation inside the stepping loop. The position doc already designs for this: new kinds arrive as declarations plus interpreters, not as forks of `circuit.rs`.

**Do not cross life cycle with decomposition yet.** Decompose-by-reference is recent and `interface` + `decomposes` are still refused together. A change at level *l* may be invisible or forced at *l−1*. Flat models first.

---

## 8. Owed to George

- **His H insight is the direction.** *"the history of the system represents the knowledge of the system's possible states and trajectories, that is probable state transitions."* He was describing a set-valued transition structure in prose before the formalism was chosen. Cite it as his.
- **His adaptrode/EWMA history mechanism is unintegrated.** Multi-timescale tacit memory, periodically sampled to "trace the history of the system life cycle" — architecturally different from this repo's settled H position, and his own. Honouring his contribution means addressing it, not routing around it.
- Two items to route **internally, not to Mobus**. Both predate #86 and neither has been reconciled with it:
  - **The φ inconsistency** — `lifecycle-dynamics.md` defines φ *three* incompatible ways: a derived function of state, a carried value defined from the previous phase, and trajectory-dependent ("path dependence… influences future states"). Pick **carrier coordinate** and drop the third.
  - **`T(t+1) = f(T(t), H(t), Input(t))`** in `h-element-theory.md`, which #86 forbids — and the implementation does the forbidden thing: the release factor reads a fixed 10-snapshot window using trend *and acceleration*, which is not in the carrier. Being fair, storage genuinely *is* in the carrier ("the stock IS the history"), which satisfies the adopted rule's own escape clause; it is the smoothed window that violates it. **The fix is cheap and should be stated as such: fold smoothed trend and acceleration into the node carrier, so state becomes `(storage, trend, accel)`. "Fold into the carrier," not "abandon adaptation."** The same trap awaits stage-transition predicates — the obvious design is "read H, detect decline," which is the identical violation one order up.
  - **A governance gap, worth fixing independently:** neither `bert` doc is status-marked or indexed against this repo's doc index, and one of them contradicts an ADOPTED position in the other repo. Nothing in the current setup would have caught that.
  - **Stale and unblocking:** `lifecycle-dynamics.md` declares itself blocked on "process primitive step logic + H being implemented first." That presumes the life cycle is a *runtime* phenomenon. It is not — a structural diff over two archived models needs no H, no step logic, no simulation. **The doc has been blocking itself on a dependency half the capability does not have.**
