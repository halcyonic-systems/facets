# What Counts as Dynamics

*Position paper — 2026-07-18. Synthesis over six primary-source reads in this folder
(`read-mobus.md`, `read-bunge.md`, `read-klir.md`, `read-bertalanffy.md`,
`read-category-theory.md`, `read-external.md`). Citations to those reads are given as
`read-X §n`; underlying primary citations are carried through from them and re-marked
VERIFIED/UNVERIFIED at the strength the reader established. Two facts below are
newly VERIFIED by me directly against the codebase and the Lean source — flagged as
such.*

---

## 0. The position, stated once

**Dynamics is a state-transition family over an arbitrary linearly-ordered support,
satisfying semigroup composition. A dynamics-*kind* is the shape of that family's
codomain. Conservation is not a property of dynamics at all — it is an invariant
declared on the state space by the model.**

Three consequences, and they are the whole paper:

1. bert-lenses' current engine does not implement "dynamics." It implements **one
   dynamics-kind** (deterministic self-map on a vector-space state carrying an
   additive conservation invariant) and has been mistaking a special case for the
   category.
2. The K≅2 kernel does not need to be extended to host the other kinds. **It already
   hosts them and always did** — `T` is an opaque type parameter with no structural
   role (VERIFIED below, §4). The defect is under-specification, not
   over-commitment. Nobody argued for conservation in the kernel because nobody
   ever *put* conservation in the kernel; it was assumed in the engine and in
   Mobus's prose, two layers below and one layer above the formalism respectively.
3. The genuinely novel move available here is the inversion in (1): **conservation
   declared in the model, not assumed by the engine** — and it is already half-built
   in `circuit.rs` (VERIFIED, §5).

---

## 1. Is there a generic account? Yes — and it is a stack, not a single frame

The six reads converge on the same shape from six directions, which is itself the
strongest evidence available that the shape is real and not one author's taste. But
they answer *different* questions, and collapsing them into one "generic account" is
the error that would flatten the differences into uselessness. The honest structure is
four layers, each with a different winner.

### Layer 1 — What makes a system dynamical at all?

**Winner: Mesarovic & Takahara, Definition 2.7** (*General Systems Theory:
Mathematical Foundations*, 1975, p. 21; VERIFIED, `read-external §2`).

> "A time system S ⊆ X × Y is a **dynamical system** iff there exist a response
> family ρ and a state-transition family φ = {φ_{tt'} : C_t × X_{tt'} → C_{t'}} such
> that (α) ρ is consistent with S, and (β) φ satisfies the composition property
> φ_{t't''}(φ_{tt'}(c,x),x') = φ_{tt''}(c, x·x')."

Why this wins Layer 1 over every rival:

- **Time is only linearly ordered** (Def 2.1, p. 17) — not ℝ, not ℕ, not metric.
  This is strictly more general than Willems, whose T ⊆ ℝ (`read-external §1`,
  Willems 2007 p. 51), and it is what lets an event-indexed FSA run and a
  continuous flow be the same kind of object rather than two.
- **Dynamics is an added structure, not a synonym for time-indexing.** MT separate
  "time system" (a relation on time-indexed functions) from "dynamical system" (a
  time system *for which you can exhibit* a state-transition family). This is the
  precise formal home for bert-lenses' "Run = a mode transition" framing: the
  structural model is a time system; **running it is exhibiting a φ**.
- **The semigroup axiom is a real acceptance test**, not vocabulary. Stepping
  t→t' then t'→t'' must equal stepping t→t'' directly. Every mode bert-lenses ever
  ships must satisfy it, and it is mechanically checkable per-engine. This is the
  single most valuable engineering artifact in the entire six-reader corpus.

Zargham & Shorish 2022 (`read-external §7a`, VERIFIED, in-library) is the same idea
restated for arbitrary data structures — GDS = the pair {h, X}, h: X → X — and is the
more *citable modern* form; MT is the more general and better-axiomatized one. Use
Zargham-Shorish when writing for engineers, MT Def 2.7 when writing for the kernel.

**Rejected for Layer 1:**
- **Bertalanffy.** GST's eq. (3.1) is continuous, Markovian, fixed-rule, and
  Bertalanffy says so himself (p. 57, `read-bertalanffy §a`). He explicitly declines
  to rank ODE dynamics above automaton dynamics (pp. 25–27, `read-bertalanffy §f`)
  and builds no bridge. Absence is a finding: GST 1968 contains **no** treatment of
  discrete-state trajectories, rule-change, or agents. It is an ancestor, not a
  candidate.
- **Mobus.** Principle 4's "how processes operate or change inputs into outputs over
  time" (`read-mobus §a`, 2-principles:323) is general enough to be true and too
  general to be a definition. His only *specific* answer, the conservation-flow-
  network claim, he himself flags as "asserted, without formal proof"
  (10-model-archetypes:35, `read-mobus §e`).

### Layer 2 — What does a run *mean*, independent of any engine?

**Winner: Willems' behavior, B ⊆ W^T** (2007, p. 51; VERIFIED, `read-external §1`).

A dynamical system is a triple Σ = (T, W, B) where B — a declared subset of all
trajectories — *is* the model. State is demoted to "a special, and very useful, latent
variable" (p. 69), constructed so past and future are conditionally independent given
it.

This layer exists because **issue #54 is not a Layer-1 question**. "Does porosity
modulate crossing flows" is not asking what φ is; it is asking which trajectories
count as admissible runs of a model whose boundary has a porosity property. Willems
gives that question a formal home that does not presuppose a stepping algorithm. It is
also the correct answer to the standing worry that adopting a state-first account
would hard-code Mobus stocks into the kernel: under Willems, **a BERT model's stocks
are *a* choice of latent variable, not the definition of dynamics.**

Cost, stated plainly: (T, W, B) is too general to implement. It specifies nothing
about *how* B is presented. It is a semantics anchor, not a data structure. Use it to
adjudicate meaning disputes (#54), never to design a runtime.

Bunge lands in the same place by a different road and deserves credit for it: event =
⟨s, s′, g⟩, net event = ⟨s, s′⟩, and **E_L(K) ⊊ S_L(K) × S_L(K)** — not every state
pair is a lawful transition (Bunge 1979 lines 654, 658; VERIFIED, `read-bunge §2, §4`).
Laws are cashed out extensionally as the bundle of lawful trajectories (line 1221).
That *is* Willems' B, twenty years earlier, in ontological dress. And Bunge's
event/net-event distinction is a genuine conceptual resource we should keep: **an
FSA/DLG records only net events (which state to which, labelled); a conservation-flow
run tracks the full g.** That is the sharpest available statement of what actually
differs between #67's target and today's engine.

**Bunge is not, however, the Layer-1 winner**, and the read is honest about why: the
automaton apparatus lives in Appendix A as a *sibling* formalism sharing vocabulary
with Ch.1, with no bridging theorem identifying automaton `S` with `S_L(K)` or `M`
with `g` (`read-bunge §5b`). Citing Bunge for "FSA transitions are dynamics in my
kernel's sense" would be attributing to him a synthesis he did not perform.

### Layer 3 — What *kind* of dynamics is this?

**Winner: coalgebra of an endofunctor** (Rutten 2000; `read-category-theory §2a`).
A system is (X, f : X → F(X)); the endofunctor F *is* the dynamics-kind. Full
argument in §3 below.

### Layer 4 — Does the generating relation itself change?

**Winner: Klir's generative/metasystem split** (`read-klir §1c, §1e`,
klir-facets.md:4030–4042, 4618–4634; VERIFIED).

This is the layer the other five traditions do not have, and it is the one that
decides two live issues. Klir's hierarchy places **finite-state machines
(deterministic or probabilistic), Markov chains, and constant-coefficient differential
equations in one undifferentiated category** — generative systems — named together in
a single sentence (klir-facets.md:4043–4045). That is a citable, textual, pre-existing
statement that conservation-flow ODEs and FSA transitions are the *same epistemological
level*. It is the argument bert-lenses has never made, already written down in 1991.

One level up, a **metasystem** specifies a support-invariant replacement procedure that
swaps one generative system for another. Klir's worked kidney/dialysis example — frame
replacement triggered by a state variable crossing a threshold (klir-facets.md:4725–
4761) — makes #54 crisp and *decidable* rather than vague: **is porosity a
behavior-function parameter (generative level) or a metasystem replacement trigger?**
That is a question with an answer, not a semantics fog.

Klir also supplies the one concrete common interface in the corpus: **mask + behavior
function** (klir-facets.md:4126–4135, 4229–4246). A mask says which variables at which
support-offsets are read; a behavior function (or behavior-probability table) computes
the generated values. Every one of our five target kinds is an instance. Determinism
is not a separate axis for Klir — it is just whether the relation R ⊆ Ḡ × G happens to
be functional. That is the same collapse coalgebra achieves by swapping F, arrived at
independently.

**Klir's honest limits** (`read-klir §5`): no algorithm unification (same shape ≠ same
engine — correct level of claim for us); no within-run multi-timescale worked example;
and no opinion on modulated-connection semantics. He gives us the slot, not the filling.

### The stack, assembled

| Layer | Question | Winner | Status for us |
|---|---|---|---|
| 1 | What makes it dynamical? | MT Def 2.7 (φ + semigroup) | Adopt as kernel contract |
| 2 | What does a run mean? | Willems (T, W, B) | Adopt as semantics anchor (#54) |
| 3 | What kind is it? | Coalgebra (functor F) | Adopt as classification only |
| 4 | Does the law itself change? | Klir generative/metasystem | Adopt as the mode-transition home |

Nothing in this stack is in conflict. Layers 2–4 are *refinements of* the state-
transition family that Layer 1 posits. That is why the differences don't flatten: the
generic account is a single sentence, and every distinction engineers care about lives
in a named, separately-varying parameter of that sentence.

---

## 2. The taxonomy

Six axes. They were chosen by the test "does bert-lenses have to write different code
if this varies" — axes that fail that test are ontology, not engineering.

- **A. Support structure.** Discrete (ℕ) / dense (ℝ) / arbitrary linear order /
  event-indexed (irregular, generated by the run itself). Per Klir, support need not
  be time at all (space, population — klir-facets.md:4030–4042).
- **B. State-space structure.** Bare set / finite alphabet / vector space with additive
  structure. **This axis is the one that matters most and is the one nobody names.**
  Conservation is not even *expressible* unless the state carries additive structure.
  A conservation invariant on a finite alphabet is a type error, not a modelling choice.
- **C. Transition codomain functor F.** `Id` (deterministic autonomous) / `X^Σ`
  (input-driven) / `Dist(X)` (stochastic) / `P(X)` (nondeterministic) / `(B×X)^A`
  (transducer, emits output on transition). This single axis subsumes what would
  otherwise be three separate axes (deterministic-vs-stochastic, autonomous-vs-driven,
  silent-vs-emitting). That collapse is what coalgebra buys, and it is real.
- **D. Declared invariants on state.** None / conserved additive quantity /
  monotone / bounded. **Conservation lives here and only here.**
- **E. Generating relation fixed or mutable.** Generative (fixed φ) / metasystem
  order-1 (φ replaced by an invariant procedure) / order-n. Klir's axis.
- **F. Composition mode.** Closed / open-with-ports, and homogeneous vs.
  heterogeneous wiring (all elements same kind vs. mixed kinds in one diagram).

### Placement

| Kind | A support | B state | C functor | D invariants | E | F |
|---|---|---|---|---|---|---|
| Conservation flow (today) | discrete Δt (ℝ-approximating) | ℝ^n vector space | `Id` | additive conserved | generative | open, homogeneous |
| FSA / DLG (#67) | event-indexed | finite alphabet | `X^Σ` | none expressible | generative | closed today |
| Markov / probabilistic FSA (#67) | discrete ℕ | finite alphabet | `Dist(X)` | none (mass-1 on the *distribution*, not the state) | generative | closed today |
| Boolean network | discrete ℕ | {0,1}^n (bare set) | `Id` | none | generative | closed |
| Agent trajectories | discrete ℕ or event | ∏ᵢ agent states | `Id` or `Dist(X)` | usually none | generative | open, heterogeneous |
| Multi-timescale hierarchy | nested supports (Δt_l per level) | product over levels | — | per-level | **metasystem** | open |

Two observations that fall directly out of the table and are worth more than the table:

**(i) Conservation flow and Boolean networks are the same functor.** Both are `F = Id`
— a deterministic self-map. They differ *only* in axes B and D: vector-space state
with a conserved additive quantity versus a bare finite set with none. This is why the
Boolean-network model has "no trajectory mode" today: not because it needs a new
engine, but because the existing engine's stepping loop is entangled with a
conservation ledger it has no state structure to satisfy. **The Boolean-network
trajectory mode is the cheapest unlock on the board** — it needs axis-D declaration to
become optional, nothing more.

**(ii) Markov (#67) is the only target requiring a genuinely new functor.** `Dist(X)`
is not reachable by relaxing anything; it changes the codomain. It is also the only
one where the semigroup axiom needs re-checking in a different category (Kleisli of
the distribution monad) rather than in `Set`.

### What today's engine supports — VERIFIED directly

Read of `crates/bert-compose/src/circuit.rs` (2,479 lines) confirms:

- `Circuit::step()` (line 705) is a fixed-Δt deterministic self-map — axis C = `Id`,
  axis A = discrete, axis B = ℝ-valued node stocks.
- `history: Vec<Vec<f32>>` (line 424) and `ledger_history: Vec<[f32; 4]>` (line 434)
  are the trajectory record — H, concretely, exactly as Mobus and Bunge both define it
  (§4 below).
- **Critically: the engine already has a non-conserved substance kind.** The module
  header (line 5) reads "substance-aware: Energy/Material conserve, **Message copies**",
  and `DeclaredSubstance` (line 178) carries a base "conserved kind whose physics this
  substance inherits" with the comment "the dynamics only ever read `base`" (line 174).
  There is a `consumes()` predicate (line 148) and an `emits_signal()` predicate (line
  109).

That last point is the most important engineering fact in this document. **The
inversion this paper recommends is already partially implemented.** Conservation in
`circuit.rs` is not a global engine law; it is a per-substance property looked up
through a declaration. The engine currently makes that declaration on a closed
three-kind enum with conservation as the default; the generalization is to make axis-D
a first-class, open, model-level declaration.

### What each unsupported kind requires

| Kind | Requires |
|---|---|
| **Boolean network** | Axis-D declaration made optional (conservation ledger becomes opt-in, not structural). State type generalized from `f32` node stocks to a bare carrier. **No new functor, no new stepping architecture.** Smallest change. |
| **FSA / DLG (#67)** | New functor `X^Σ`: an input alphabet and a transition-relation representation. Bunge's net-event framing (⟨s,s′⟩ without g) is the right data model — the run records *which* transition fired, not a rate. Needs a second stepper, not a modified one. |
| **Markov (#67)** | `Dist(X)`: sampling, a seed, and reproducibility discipline in the run record. H becomes a sampled path, not *the* path — a semantics change to what "a run" means that must be surfaced in the UI, not just the code. |
| **Agent trajectories** | Axis F heterogeneous composition. This is the one with no citable solved treatment anywhere (`read-category-theory §4`, `read-external §8`). Requires original work. |
| **Multi-timescale** | Axis E: a metasystem-order construct. Klir gives precedents (scheduled swap, threshold-triggered swap) but explicitly no within-run continuously-coupled example (`read-klir §1e`). Also original work. |

---

## 3. Does category theory earn its place?

**Partially. Yes as classification, no as implementation. Adopt the first, refuse the
second, and say so publicly rather than letting the ambiguity ride.**

### Yes, as classification — and here is the specific thing it buys

Axis C in the taxonomy above *is* the endofunctor. That is not a coincidence and not a
re-description. Three concrete returns:

1. **It collapses three ad-hoc axes into one.** Deterministic-vs-stochastic,
   autonomous-vs-input-driven, silent-vs-emitting are not three independent design
   questions to be argued separately. They are one question — what is the codomain of
   T — with a small, closed, enumerable answer set. Without this, bert-lenses would
   grow a boolean flag per distinction and the combinations would be unmanageable.
2. **It converts "is X a generalization of Y" from an argument into a computation.**
   Is a deterministic system a degenerate Markov chain? The question becomes: is there
   a natural transformation `Id ⇒ Dist`? Yes — the Dirac unit η of the distribution
   monad, already documented in-vault at Spivak line 10149 (`read-category-theory §3`).
   #67 needs exactly this answer, and needs it to not be an ad hoc code path.
3. **Two independent traditions produced the identical functor table.** Rutten's
   coalgebra and Spivak's `Loop → Kls(Dist)` land on `Dist(X)` for Markov chains and
   `X^Σ` for automata by wholly different routes (`read-category-theory §1a, §2a`).
   Klir got the same *partition* with no category theory at all
   (klir-facets.md:4043–4045). Three-way convergence on the same carve is evidence the
   carve tracks something, not a style preference.

Cost of adopting classification: **approximately zero.** It is a typing discipline on
`T` plus a design checklist. It touches no runtime code.

### No, as implementation

Three reasons, all sourced:

1. **The heterogeneous-composition case is unsolved.** Vagner-Spivak-Lerman's
   `G`-algebra is ODE-only; Rutten's coalgebra is one-functor-at-a-time; Baez et al.'s
   `Open(Dynam)` is continuous vector fields on ℝ^S with *no* discrete-event, hybrid,
   or stochastic treatment — an absence VERIFIED by reading the relevant section, not
   inferred (`read-external §8`). Wiring a conservation-flow element to an FSA element
   in one diagram is precisely bert-lenses' problem and precisely what no source
   solves. Myers' double-categorical synthesis is the closest, and its own author
   calls the book a "0th draft" (`read-category-theory §2c`).
2. **ABM is the weakest link.** The only categorical treatment of agent trajectories
   found is Baez's Azimuth blog series — exploratory, not peer-reviewed
   (`read-category-theory §2f`). Treat "coalgebra covers ABM" as UNVERIFIED and likely
   shallow.
3. **Applied to one system in isolation it is vacuous.** Calling today's engine "a
   coalgebra of the identity functor" is true and buys nothing. The leverage is
   entirely comparative.

### Recommendation

Adopt CT as the **classification vocabulary for axis C** and cite it that way, with the
honest framing already drafted in `read-category-theory §4`: *dynamics-kind is
classified by the codomain functor of the transformation map, following Rutten;
heterogeneous open-system composition is an active unsettled frontier, not an adopted
pattern.* Do **not** describe bert-lenses as a categorical tool. Do not restructure the
kernel. Revisit implementation only if and when the heterogeneous-wiring problem
(axis F) becomes the binding constraint — at which point we would be doing original
research, not adoption, and should know that going in.

---

## 4. The 8-tuple

**Newly VERIFIED, directly against
`systems-science-foundations/Systems/Mobus/Tuple.lean` (read this session):**

```
structure MobusSystem (α κ μ π τ η δ : Type*) where
  ...
  transforms : τ    -- "T: transformation functions (domain-specific, parametric)"
  history    : η    -- "H: history / stored knowledge (domain-specific, parametric)"
  timeScale  : δ    -- "Δt: time scale / temporal resolution (domain-specific, parametric)"
```

with the design note at lines 47–49:

> "The first five type parameters (α, κ, μ, π) are structurally active — they
> participate in coherence constraints. The last three (τ, η, δ) are **carried data
> with no structural role in the ontology**."

This settles question 4 and reverses its premise.

**Is T general enough to host all these dynamics kinds?** Yes — *trivially and
uselessly*. τ is an unconstrained type variable. It can be a conservation flow field, an
FSA transition table, a distribution-valued kernel, an agent policy, or the integer 7.
**The kernel never committed to conservation. It never committed to anything.** The
conservation assumption entered at two other places entirely: Mobus's Chapter 10 prose
("asserted, without formal proof", `read-mobus §e`) above the formalism, and
`circuit.rs`'s stepping loop below it. The Lean tuple has been innocent the whole time.

So the answer to "does the tuple need extension, reinterpretation, or nothing" is
**none of the three as posed — it needs *refinement*.** Not a new slot; a *type* where
there is currently a type variable. Concretely: promote τ from opaque to a structured
record carrying the taxonomy's axes.

```
Dynamics := ⟨ support     -- axis A (linearly ordered, per MT Def 2.1)
            , carrier     -- axis B
            , functor     -- axis C
            , invariants  -- axis D  ← conservation lives HERE
            , order       -- axis E (generative | metasystem n)
            ⟩
```

This is a strictly conservative move: every existing proof that ignores τ continues to
hold, because they ignore it structurally by design (that is what "no structural role"
guarantees). No existing theorem can break.

**Is H the trajectory record?** Yes, and this is the cleanest convergence in the entire
corpus. Three independent sources define it identically:

- Mobus: H_t = [v₁,…,v_n]_t, and H is the time series of those snapshots, "a data
  stream" (4-a-model:423–428, `read-mobus §c`).
- Bunge: h(x) = {⟨t, 𝔽(t)⟩ | t ∈ τ} — the graph of the state function
  (1979 lines 673–676, `read-bunge §3`), reused verbatim across chemistry, biology,
  evolution, and society.
- `circuit.rs`: `history: Vec<Vec<f32>>` — a vector of per-tick state rows (line 424,
  VERIFIED).

The book, the philosopher, and the running code independently landed on "H = graph of
the state function over the support." That is worth stating as a finding, not just
using. It also confirms Klir's placement: a completed run's H **is a data system** over
the model's source system (`read-klir §1b`) — evidence dynamics occurred, not a
specification of dynamics. H is never the generator.

**One real hazard, and it is theorem-shaped.** Mobus licenses H feeding back into T —
"the current state of T can be based on all previous states" (4-a-model:419) — but
gives no mechanism (`read-mobus §c`). If T reads H, **the semigroup axiom (MT Def 2.7
β) fails**, because φ_{tt'} is no longer a function of the state alone. The fix is
standard and should be a stated kernel rule: *any history-dependence must be folded
into the carrier.* Either the state is Markovian with respect to φ, or the "state" was
misidentified. This is exactly Willems' point about state being the latent variable
constructed so that past and future are conditionally independent given it (2007
p. 69). Bertalanffy flagged the same exclusion in 1968 and deferred it to
integro-differential equations (p. 57, `read-bertalanffy §a`). Three traditions, one
rule: **H is a record, never an input.**

**Δt** should be reinterpreted, not extended: per Klir, the support need not be time
(klir-facets.md:4030–4042), and per MT it need only be linearly ordered. Mobus already
half-anticipates this — Δt may carry a cycle-count tuple ⟨Δt, x⟩ or become a clock
function, which he calls "an unsettled area requiring more research"
(4-a-model:436–444, `read-mobus §d`). Rename the *concept* to support; leave the field.

**Correction to carry forward:** the book text prints a **7**-tuple ⟨C,N,G,B,T,H,Δt⟩
with E derived inside G (4-a-model:196–199, 303; `read-mobus`, bonus finding).
Promoting E to first class is the Lean formalization's improvement on Mobus, not
Mobus's own move, and should be attributed that way in anything published.

---

## 5. Where is the novel contribution?

Honest accounting first, because most of this is not novel.

**Not novel:** the generic account (Mesarovic-Takahara 1975, Willems 1980s). The
functor taxonomy (Rutten 2000). Generative-vs-metasystem (Klir 1991). Stock-flow → ODE
as a functor (Baez et al. 2022). H-as-trajectory (Bunge 1979). Every one of these
predates us by decades, and the correct posture is citation, not claim. Anyone
positioning "dynamics-kind taxonomy" as a discovery would be re-deriving 1975.

**What *is* novel, and I think it is genuinely so:**

### The contribution: conservation as a declared model-level invariant over a
### dynamics-free structural kernel

Two halves, and the combination is the thing.

**Half one — the kernel is structurally dynamics-free, and this is provable, not
asserted.** The Lean tuple's τ/η/δ are carried data with *no structural role*, and this
is machine-checked: the coherence constraints (`network_components`, `disjoint`,
`interfaces_sub`, bipartite external flows) quantify only over α, κ, μ, π. So the K≅2
structural core is formally independent of any dynamics commitment. That means it can
serve as the **index** for a dynamics-kind taxonomy: one structural model, many
dynamics-kinds attachable, with a machine-checked guarantee that attaching a different
kind cannot violate a structural theorem. As far as the six reads found, no existing
systems framework has this property demonstrated rather than claimed — Bunge's
automata sit in a separate appendix with no bridging theorem (`read-bunge §5b`);
Klir's uniformity is definitional, not mechanized (`read-klir §3` caveat); Mobus's
conservation claim is explicitly unproven.

**Half two — conservation demoted from engine law to model declaration, in working
code.** `circuit.rs` already routes conservation through a per-substance declaration
that the dynamics reads (`DeclaredSubstance`, line 178; "Message copies", line 5;
"the dynamics only ever read `base`", line 174) — VERIFIED. Completing that inversion
so the invariant set is open and optional (axis D) gives an instrument where you can
build a Boolean network and a conservation flow *in the same tool, on the same kernel,
with the same structural validators*, and the difference is a declaration rather than a
fork. That is not a theory result. It is a **theory-shaped engineering result**, which
is exactly the register asked for.

The novel sentence, then, is not "here is a generic account of dynamics" — MT wrote
that. It is:

> **Conservation is a model-level invariant declared on a state space, not a property
> of dynamics; a structurally-formalized systems kernel that is provably independent of
> its dynamics slot can therefore index a taxonomy of dynamics-kinds, and conservation
> becomes one declarable point in that taxonomy rather than the engine's premise.**

That is defensible, grounded in six primary sources, machine-checked at the load-
bearing step, and it is what the tool needs to build next regardless. It also earns
Mobus's own permission: he warns against treating flow dynamics as the whole story
(2-principles:110, `read-mobus §a`) and defines T form-agnostically (4-a-model:407)
before narrowing it in Chapter 10 prose. **Generalizing is not a departure from Mobus.
It is a return to §4.3.3.4, un-narrowed by the Chapter 10 assertion.**

### Two adjacent candidates, honestly rated

- **Functorial mode-transitions between dynamics kinds.** Attractive, and Klir's
  metasystem gives it a home (`read-klir §1e`). But nobody has the heterogeneous case
  (`read-category-theory §4`, `read-external §8`). Rate this as a *research program*,
  not a contribution we currently hold. Do not claim it.
- **Multi-timescale as nested metasystem orders.** Bertalanffy independently grounds
  hierarchy in steady-state reasoning — each level is a Fließgleichgewicht relative to
  faster flux below (GST p. 160, `read-bertalanffy §b`) — which is a real convergence
  with Klir's nesting and with the standing "dynamics hierarchy = fixed-point
  approximations" thread. Worth pursuing. Not yet a result.

### One sharp theoretical finding worth keeping

Bertalanffy's second theorem (GST pp. 132–133, VERIFIED, `read-bertalanffy §c`):
*a closed system cannot be equifinal with regard to all Qᵢ* — because a conserved
quantity makes the asymptote depend on initial conditions. **Conservation and
equifinality are in structural tension.** Today's engine simulates conservation-faithful
flow, which means it is running the one class of system that *structurally cannot*
exhibit equifinality on its conserved measures. Any future claim bert-lenses makes about
attractors, robustness, or convergence has to be scoped against that theorem. This is a
free, cheap, load-bearing constraint we would otherwise have discovered by being wrong.

---

## 6. What to do, in order

1. **Make axis D optional.** Conservation becomes a declared invariant, not the
   stepping loop's premise. Unlocks the Boolean-network trajectory mode with no new
   functor. Smallest change, largest conceptual return, and it is the paper's thesis
   in code.
2. **Write the semigroup axiom down as the kernel's dynamics contract** (MT Def 2.7 β)
   and state the rule *H is a record, never an input to T*. Both are cheap, both are
   checkable, both prevent a class of future bugs that three traditions independently
   warned about.
3. **Refine τ in Lean** from an opaque type variable to the five-field Dynamics record.
   Strictly conservative — no existing proof can break, guaranteed by "no structural
   role."
4. **Resolve #54 as a level question, not a semantics fog**: is porosity a
   behavior-function parameter or a metasystem replacement trigger (Klir's
   kidney/dialysis pattern)? Answer it explicitly and record the answer.
5. **Scope #67 against the functor table**: FSA needs `X^Σ`, Markov needs `Dist(X)`,
   and the `Id ⇒ Dist` Dirac unit is the principled bridge that keeps the deterministic
   case from being a special-cased branch.
6. **Do not adopt CT as implementation.** Cite it as classification, with the honest
   frontier caveat.

---

## Appendix: source-strength ledger

| Claim | Strength |
|---|---|
| MT Def 2.7 semigroup dynamical-system definition, p. 21 | VERIFIED (`read-external §2`, primary read) |
| Willems (T,W,B), p. 51; state-as-latent-variable, p. 69 | VERIFIED (`read-external §1`, primary read) |
| Klir: FSM + Markov + ODEs as co-equal generative systems, 4043–4045 | VERIFIED (`read-klir §1c`) |
| Klir metasystem = invariant replacement procedure, 4618–4634 | VERIFIED (`read-klir §1e`) |
| Bunge event ⟨s,s′,g⟩; E_L ⊊ S_L×S_L; h(x) = {⟨t,𝔽(t)⟩} | VERIFIED (`read-bunge §2–4`) |
| Bunge does NOT bridge Ch.1 to Appendix-A automata | VERIFIED absence (`read-bunge §5b`) |
| Mobus T "any suitable form… ODEs or computer codes", 4-a-model:407 | VERIFIED (`read-mobus §b`) |
| Mobus conservation claim "asserted, without formal proof", 10:35 | VERIFIED (`read-mobus §e`) |
| Mobus embedded-JS = admitted "playful exploration", 4-a-model:560 | VERIFIED (`read-mobus §f`) |
| Book prints a 7-tuple; E-first-class is the Lean improvement | VERIFIED (`read-mobus`, bonus) |
| Bertalanffy: closed system cannot be equifinal, pp. 132–133 | VERIFIED (`read-bertalanffy §c`) |
| Bertalanffy: no GST bridge to FSA/Boolean/ABM | VERIFIED absence (`read-bertalanffy §f`) |
| Rutten functor table (`X^Σ`, `Dist(X)`, `(B×X)^A`) | UNVERIFIED beyond abstract; cross-confirmed ≥2 secondary + independently by Spivak (`read-category-theory §2a`) |
| Baez et al. `Open(Dynam)` is continuous-only | VERIFIED absence, section read (`read-external §8`) |
| Heterogeneous dynamics-kind composition unsolved | VERIFIED absence across both CT reads |
| Categorical ABM treatment is blog-tier | VERIFIED (`read-category-theory §2f`) |
| Lean τ/η/δ opaque, "no structural role in the ontology" | **VERIFIED this session**, `Systems/Mobus/Tuple.lean:47–49, 75–82` |
| `circuit.rs`: Message copies; `DeclaredSubstance` base lookup; `history` field | **VERIFIED this session**, lines 5, 174–178, 424, 705 |
| Zadeh's own state papers; Padulo & Arbib | UNVERIFIED / inaccessible (`read-external §3, §4`) — not characterized |
