# #112 Half B — open composition of heterogeneous dynamics (the frontier)

**Status: RESEARCH** (2026-07-23). Near-ready design pass on the frontier-council-directed
half of #112. Companion to [`dynamics-coalgebra-halfa.md`](dynamics-coalgebra-halfa.md)
(the buildable half, merged) and the council triage
(`~/Desktop/halcyonic/operations/sessions/2026-07-23/references/dynamics-halfb-council-triage.md`,
not in this repo — cited, not duplicated). This doc makes the council's verdict concrete
enough to schedule: the composition model for the homogeneous case, and a precise sketch
of the one pioneering theorem. It is a design document, not a merge candidate for the
kernel — see §5.

---

## 0. Where this picks up

Half A classified dynamics: each `kind` names an endofunctor, `T` is that functor's
coalgebra structure map, `H` is its unfolding. Half A is deliberately **homogeneous and
per-model** — one element, one functor, no wiring.

Half B is the other half of the split `read-category-theory.md` found: **how do parts'
transitions become the whole's transition when the parts are different kinds** — a
conservation-flow element and an FSA element in one composite. The survey found this
open in the categorical literature itself (§3, §4 of that memo); the council's job was
to decide how bert-lenses should relate to an open problem, not to solve it. Its
answer, restated as the plan this doc executes:

1. **Substrate: Poly**, referenced by comment, never imported.
2. **Ship homogeneous composition first.** Solved, months, low-risk.
3. **Heterogeneous composition: one restricted theorem**, published beside the kernel,
   not in it. FSA-gates-conservation is the forcing case, tracked against #14.
4. **Own every kernel definition.** No external library in the kernel's types.

This doc works through 1–3 concretely. §5 restates 4 as the standing constraint on
everything above it.

---

## 1. Why Poly, and what it buys without importing anything

Spivak's `Loop → Set` functor and Rutten's coalgebra (both already adopted in Half A)
say what a dynamics kind *is*. Neither says how to **wire two of them together**. That is
what Poly (Spivak & Niu, *Polynomial Functors: A General Theory of Interaction*, and the
Vagner–Spivak–Lerman / Myers line the council's finding 1 names) is *for* — it is a
category whose objects are interfaces and whose morphisms are the general notion of
"plug this system into that one," with dynamical systems appearing as a *particular
shape of object* inside it, not as an add-on.

**The reading, stated once, own words:**

A polynomial functor `p` is a sum of monomials, `p(y) = Σ_{i ∈ p(1)} y^{p[i]}`. Read
concretely: `p(1)` is a set of **positions**, and `p[i]` is a set of **directions**
attached to position `i`. For an interface, "position" = an output value; "directions
at that position" = the inputs the interface still needs, *possibly depending on which
output you're looking at*. That dependency (directions depending on position) is the one
thing a plain product of sets cannot express and Poly can — which is exactly why it is
the right frame for BERT's descriptor rather than a restatement of it.

**The descriptor already has this shape.** Half A's Mealy form of a kind is
`F(X) = (B × X)^A` — `B = outputType`, `A = inputType`. Read as a polynomial: this is
the monomial `p(y) = Σ_{b ∈ B} y^A` — one position per possible output value `b`, and at
every position, `A`-many directions (the same `A` at each position, since BERT's ports
are not yet output-dependent — see §4's open question on this). **Output ports are
positions; input ports are directions.** `Unit = closed` is the degenerate case
`p(y) = y` (one position, one direction) — a system with nothing left to plug in.

A **dynamics** (a `p`-coalgebra, in the sense Half A already committed to) is then a
lens `S·y^S → p`: for every state `s ∈ S`, choose a position in `p(1)` (what this state
currently outputs) and, for every direction at that position (every required input),
choose the next state. That is precisely `Transition` from Half A, re-read: `d.step`
*is* this lens, `S·y^S` is the generic "system on carrier `S`" object, and `p` is the
descriptor's polynomial reading. Nothing about Half A's Lean sketch has to change; this
section only says what category that sketch already lives in.

**What this buys, concretely, before any composition is built:** Poly's morphisms
(lenses) compose associatively and its monomials have both a **parallel** product (`×`,
independent systems side by side, no wiring) and a **composition product** (`◁` /
substitution, output of one plugged into input of another). Those two operations *are*
the homogeneous and (eventually) heterogeneous composition operators bert-lenses needs
— they are not bespoke machinery to invent, only to instantiate against BERT's own
types. §2 does that for the homogeneous case.

---

## 2. The homogeneous composition model

"Homogeneous" means: every element being wired shares one `kind`, hence one polynomial
shape `p`. This is what #100 phase 5's canvas already needs to route two conservation-
flow elements or two FSA elements into one run, and it is what ships first.

### 2.1 The wiring-diagram picture

Two elements, same kind, same descriptor shape `p`, wired output-of-one to input-of-
other (the canvas's existing flow-port connection, read categorically):

```
  element A                    element B
  ┌────────────┐               ┌────────────┐
  │  S_A, p_A  │── output b ──▶│ input a    │
  │  step_A    │               │  S_B, p_B  │
  └────────────┘               └────────────┘
```

Categorically this is Poly's **composition product**: the composite interface is
`p_A ◁ p_B` restricted along the actual wire (which output feeds which input — the same
data the canvas's port-connection already records, not new state). The composite
carrier is `S_A × S_B`; the composite transition is the pointwise pairing of the two
lenses, with `A`'s chosen output position fed as (part of) `B`'s input direction before
`B`'s own step is taken. This is exactly a **Moore machine built by cascading two Moore
machines** — nothing exotic, the standard "sequential composition of automata" result,
now stated so the *n*-element wiring diagram case (not just the binary one) has a
well-defined answer: iterate the composition product over the diagram's edges.

For elements that are wired **without** a shared port — independent, run side by side,
no signal crossing — the operator is Poly's **parallel product** (`×`), which is just
`S_A × S_B` with each half stepping on its own `step_A`, `step_B`. This is the case
most bert-compose models are in today (parallel conservation-flow elements sharing a
tick, no cross-signal) and it requires no new theory — it is stated here mainly so the
*wired* case (composition product) has a contrast to be defined against.

### 2.2 Grounded in `kindCodomain` / `Transition`

Concretely, for two elements of the **same** `kind` (say both `deterministic`, both
`F = Id`, from Half A's table), composing is:

```
-- both elements share kindCodomain .deterministic = id
def composeHomogeneous
    (dA : Dynamics SA) (dB : Dynamics SB)
    (tA : Transition dA) (tB : Transition dB)
    (wire : dA.outputType → dB.inputType)  -- the canvas's existing port connection
    : Transition (dA.paired dB) where        -- paired : the composite descriptor, ports = the unwired residue
  step := fun (aIn, sa, sb) =>
    let (bOut, sa') := tA.step (aIn, sa)
    let (bOut', sb') := tB.step (wire bOut, sb)
    (bOut', sa', sb')
```

(Sketch, matching Half A's convention of showing shape without committing Lean syntax.)
For `markov` or `nondeterministic` kinds the same shape holds with `kindCodomain`
supplying `FinDist` or `List` instead of `id`, and the pairing becomes a monadic bind
(`Dist(X) × Dist(Y) → Dist(X × Y)` via the product distribution; `List X × List Y →
List (X × Y)` via the Cartesian product of successor sets) rather than a bare pair —
still homogeneous, still no new functor, still the composition-product reading of §2.1.

### 2.3 What phase 5 gets from this

Once `composeHomogeneous` exists, the canvas's existing wiring UI is already the data
this needs (which output port feeds which input port) — this section adds no new UI
concept, only the typed composition operator underneath the existing port-connection
edges, gated by `kind` equality (a `check_composable_kind` alongside `check_transition`).
Mismatched kinds fail this gate and fall through to Half B, §3.

---

## 3. The pioneering theorem: FSA gates conservation

This is the council's finding 3, made precise enough to hand to `lean-formalize`.
**Scope discipline, stated up front:** this is one binary case, not a general
heterogeneous-composition theorem, and it is designed to be published as a note beside
the kernel (§5), not folded into `Transition`/`kindCodomain`.

### 3.1 The forcing case, restated concretely

A discrete controller (`nondeterministic`-or-`deterministic` kind, e.g. bert-lenses'
FSA/DLG element from #67) whose current state determines a **mode**, wired to a
conservation-flow element (`deterministic` kind, `F = Id`) whose **active equation set**
is selected by that mode. This is the canonical switched-system / hybrid-automaton
shape (Alur–Henzinger, already named in `dynamics-principled-position.md` §1 as the
restored best-matched formalism) — restricted here to the one direction of coupling
(controller → plant) that is actually tractable without inventing new theory.

### 3.2 Setup

```
-- the controller: a Moore machine, output = Mode (Fintype), matches FSA kind
structure Controller (Σc : Type) (Mode : Type) [Fintype Mode] where
  Sc      : Type
  δc      : Σc → Sc → Sc          -- FSA transition (kindCodomain .deterministic form)
  readout : Sc → Mode              -- Moore-style: mode is a function of current state

-- the plant: one deterministic (F = Id) step per equation set, invariant declared per Half A
structure Plant (EquationSet : Type) (invValue : Type) where
  Sp        : Type
  stepSet   : EquationSet → Sp → Sp
  inv       : Sp → invValue
  inv_pres  : ∀ (e : EquationSet) (s : Sp), inv (stepSet e s) = inv s   -- declared, per-equation-set

-- the coupling: the one datum Half A's descriptor doesn't yet carry
def φ {Mode EquationSet} (coupling : Mode → EquationSet) := coupling
```

`inv_pres` is not new work here — it is exactly the invariant declaration Half A's
descriptor already carries (`support`, `invariants`), now required to hold for *every*
member of the equation-set family, not just one fixed equation. That is the honest cost
of admitting a mode-switched plant: the model author declares one invariant per
equation set, or (more commonly) proves the shared invariant once, generically, and
`inv_pres` is discharged by one proof term applied to every `e`.

### 3.3 The composite and the theorem

```
def compositeStep {Σc Mode EquationSet Sc Sp}
    (C : Controller Σc Mode) (P : Plant EquationSet _)
    (φ : Mode → EquationSet)
    : Σc → (C.Sc × P.Sp) → (C.Sc × P.Sp) :=
  fun σ ⟨sc, sp⟩ => ⟨C.δc σ sc, P.stepSet (φ (C.readout sc)) sp⟩

theorem compositeStep_preserves_invariant
    {Σc Mode EquationSet Sc Sp invValue}
    (C : Controller Σc Mode) (P : Plant EquationSet invValue)
    (φ : Mode → EquationSet) :
    ∀ (σ : Σc) (sc : C.Sc) (sp : P.Sp),
      P.inv ((compositeStep C P φ σ ⟨sc, sp⟩).2) = P.inv sp := by
  intro σ sc sp
  simp [compositeStep]
  exact P.inv_pres (φ (C.readout sc)) sp
```

**Proof strategy, not a full proof:** the theorem is nearly immediate given
`inv_pres` — `unfold compositeStep`, project to the plant half, apply `inv_pres` at
the equation set `φ (C.readout sc)`. That immediacy *is the finding*, not a gap in the
work: it demonstrates that **well-typed heterogeneous coupling of this restricted shape
does not by itself endanger a per-branch invariant** — the risk one might expect from
mixing kinds turns out to be fully absorbed by the existing per-equation-set
declaration, with no new proof obligation at the composition site. The actual labor is
elsewhere — in showing `compositeStep` is well-typed as a coalgebra *at all* (§3.4), and
that is where the general problem's difficulty is concentrated, not in the invariant
corollary.

### 3.4 Well-typedness, and what it establishes

`compositeStep` has type `Σc → (Sc × Sp) → (Sc × Sp)` — a bare deterministic coalgebra,
`kindCodomain .deterministic`, over the product state `Sc × Sp`. This is the concrete
claim the council asked for: **a composite of a `nondeterministic`-or-`deterministic`
kind and a `deterministic` kind, coupled one-directionally through a finite mode, is
itself a well-typed member of Half A's existing functor table** (here, `deterministic`
again, at the composite level — a Moore machine over the product carrier). No new
`kindCodomain` case, no change to `Transition`'s shape. The composite is a `p_C ◁ p_P`
in Poly terms (§2.1's composition product, now instantiated across kinds rather than
within one), restricted to the case where the wire carries exactly one finite value
(`Mode`) and the receiving element only ever branches its per-tick behavior on that
value (never on continuous plant state).

### 3.5 What this does *not* generalize to (the honest boundary, and the next agenda)

Stated as the note's own closing section when it publishes, not smoothed over:

1. **One-directional only.** The plant cannot gate the controller — no guard on
   continuous state triggering a discrete transition (`sp` crossing a threshold forces
   `sc` to change). That is the actual hard direction (Alur–Henzinger's guards), and
   this theorem says nothing about it.
2. **Binary, not *n*-ary.** Two kinds, one coupling map. A model with three heterogeneous
   elements (controller, plant, and e.g. a Markov absorbing-chain element per #67) is
   not covered by iterating this theorem naively — the composite's `kindCodomain` would
   need to mix `id` and `Dist`, and nothing here says what that composite functor is.
3. **Discrete-tick coupling, not continuous.** `Σc` ticks and the plant's `stepSet`
   tick together, once per composite step. Real conservation flows integrate over `Δt`;
   reconciling a discrete-event clock (FSA) with a continuous clock (flow) inside one
   coalgebra — rather than assuming they share a tick — is exactly the multi-timescale
   problem `read-category-theory.md` (§3, finding 4) flagged as unresolved, and this
   theorem sidesteps it by fiat (one shared tick).
4. **Mode must be finite and the coupling must be pure gating.** `φ : Mode → EquationSet`
   selects among a *fixed* finite family; it cannot itself carry continuous parameters
   (e.g. a PID-style continuously-varying coupling). General Poly composition does not
   require this restriction — it is imposed here to keep the theorem provable without
   new infrastructure.
5. **No general wiring-diagram operator.** §2.1's iteration-over-edges claim for the
   homogeneous *n*-element case is not proven here for the heterogeneous case; whether
   Poly's composition product associates cleanly across a diagram with mixed kinds at
   each node is exactly the open question this whole document is scoped around, not
   answered by it.

**This list is the next research agenda**, not an appendix — each numbered gap is a
candidate for the *second* pioneering theorem, once a real user need (tracked against
#14) forces the question, per the council's gating condition (§0, point 3).

---

## 4. Open questions for the general heterogeneous case

Carried forward, not resolved here — the council's instruction was to defer these, not
silently drop them:

1. **Output-dependent input ports.** Half A's descriptor gives every position the same
   direction set (`A` is fixed across all of `B`). Real heterogeneous wiring may need
   directions to depend on the specific output chosen (a genuine dependent polynomial,
   not the fixed-`A` monomial §1 used). Does BERT's port model need this, or is it a
   Poly-theoretic nicety with no bert-lenses instance yet?
2. **What functor does a mixed `Dist`/`List`/`Id` composite have?** §3.5's gap 2. Poly's
   own machinery (Kleisli-lifted composition) may answer this directly, but it has not
   been checked against BERT's `kindCodomain` table.
3. **Bidirectional coupling / guards.** §3.5's gap 1 — the actually-hard direction,
   requiring something closer to full hybrid-automaton semantics (invariants + guards +
   resets, Alur–Henzinger), not a coalgebra-composition trick.
4. **Multi-timescale reconciliation.** §3.5's gap 3 — whether Myers' "clock systems"
   line (`read-category-theory.md` §4, cited but unread) is the answer, and whether it
   is mature enough to *read*, let alone adopt.
5. **Where does a composite descriptor live?** §3.4 produces a new `deterministic`
   coalgebra at the composite level, but does not say whether that composite gets its
   own first-class `Dynamics` record in the canvas/model file, or is only ever a derived
   runtime object. This is a real modeling-tool question (does the composite need to be
   inspectable, saved, re-wired?) that this design pass explicitly leaves to whoever
   schedules the implementation.
6. **Bisimulation across a heterogeneous composite.** The root issue's finding 4 (#112)
   asks for bisimulation as model-comparison; whether bisimilarity is compositional
   across this construction (bisimilar parts ⟹ bisimilar composite) is unchecked.

None of these block Half A or §2's homogeneous composition. All of them block treating
§3's theorem as anything more than the single restricted case it is.

---

## 5. The standing constraint (council finding 4, restated as a rule for this doc)

Everything above is written so that **adopting it costs the kernel nothing**:

- `Transition`, `kindCodomain`, and the descriptor (Half A) are unchanged by this doc.
  §2's `composeHomogeneous` is a new function *over* those types, not a revision of them.
- §3's theorem is scoped for a standalone Lean file (a `BERT.Interop` or research-note
  module) — it introduces `Controller`, `Plant`, `φ` as local structures for the proof,
  not as kernel types. If it ever needs to become a kernel-native pattern, that is a
  second, later decision, gated on the §3.5 list actually closing.
- Poly and Myers appear in this document only as comments and citations. No `import`.
  If a Lean formalization of §3 wants scaffolding beyond core, it version-pins at a
  fixed commit and treats any bump as a deliberate migration — never a live dependency
  of the 8-tuple.
- **Gate on scheduling any of this**: §3 is worth a `lean-formalize` pass once picked
  up; §2 is worth building once #100 phase 5 needs cross-element wiring; §4 is not
  worth touching until a real CPS-shaped model (tracked against #14) forces the
  question, per the council's own gating condition.

## Build order (when scheduled)

1. `composeHomogeneous` (§2.2) — same-kind product/composition-product wiring, joining
   `check_transition` with a new `check_composable_kind` gate. Unblocks phase 5's
   cross-element canvas wiring for same-kind models.
2. §3's `Controller`/`Plant`/`compositeStep` Lean instance, as a standalone note-and-proof
   pair, not a kernel PR. Publish with §3.5 as its closing section verbatim.
3. Nothing in §4 is scheduled. Revisit only against a real #14 target or an independent-
   review pull on §3's theorem generalizing past two kind-pairs, per the council's net
   plan for #112.
