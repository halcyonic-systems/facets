# Formalizing the system life cycle

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

> **The Mobus 8-tuple can represent a pre-system; the Bunge CES triple cannot. Origination is exactly the tick at which the Bunge bridge becomes definable**, and Dissolution its dual.

No thresholds, no free parameters — a life-cycle boundary *derived* from an existing type-level fact. Compare the prior art, which defines the same boundary via `V_min`, an undefined stipulation, where the type already supplies a derivable answer. **This is `F_coh` doing work `F_φ` was being asked to do.**

**Development / Decline** — monotone growth/shrinkage of composition over an interval. Parameter-free, and genuinely *dual*, which the union formulation could not deliver.

**Maturation / Stable Operation** — `C, N, E, G, B` frozen over the interval while `T, H, Δt` vary. Says something true and non-obvious: stable operation is **structural stasis with continued functional activity**; the tuple's parametric tail is exactly what keeps moving.

**One cute theorem**: `StructurallyStable I ↔ Developing I ∧ Declining I`. Maturation is the meet of growth and decline.

⚠️ **Stages are interval predicates, not a partition.** A trajectory can grow, shrink, and grow again; it may satisfy none, some, or several in alternation. Origination and Dissolution are **events** (single ticks); the other three are **interval predicates**. He lists all five as parallel "stages" — they are of two different logical types.

---

## 5. Dynamics typing — an existing cell, no amendment

Against the adopted taxonomy: axis B state-space = **bare set**; axis C functor = **`P(X)`**, the powerset functor, which is what a discrete inclusion *is* and which the position doc already lists; axis D invariants = **none** (correct and consistent — conservation is not expressible without an additive carrier); axis E = **generative** (`F` itself does not change; only which `δ ∈ F(S)` fires).

The semigroup contract is discharged by Kleisli composition in the powerset monad — `reach (m + n) = ⋃ P' ∈ reach m, reach P' n` — which is the Mesarovic–Takahara Def 2.7 acceptance test the repo has already declared normative.

**The phase must be carried, not computed**: `PhasedSystem := MobusSystem × Fin 5`. A φ that is a total function of the state cannot also depend on the previous phase, and folding history into the carrier is the adopted rule. Irreversibility then becomes an explicit property of `Step` rather than a selection rule smuggled in outside it.

---

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

---

## 8. Owed to George

- **His H insight is the direction.** *"the history of the system represents the knowledge of the system's possible states and trajectories, that is probable state transitions."* He was describing a set-valued transition structure in prose before the formalism was chosen. Cite it as his.
- **His adaptrode/EWMA history mechanism is unintegrated.** Multi-timescale tacit memory, periodically sampled to "trace the history of the system life cycle" — architecturally different from this repo's settled H position, and his own. Honouring his contribution means addressing it, not routing around it.
- Two items to route **internally, not to Mobus**: the φ-definition inconsistency and the `T(t+1) = f(T(t), H(t), …)` formula in the `bert` docs. Both predate #86 and neither has been reconciled with it.
