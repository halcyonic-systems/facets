# What Counts as Dynamics — The Principled Position

**Status: ADOPTED (2026-07-18, [#86](https://github.com/halcyonic-systems/bert-lenses/issues/86)).** This is the repo's position of record on what counts as dynamics. It supersedes the retired "dynamics = the conservation engine" framing (roadmap Arc 4). `language/spec.md` §8 is normatively bound to it; this doc is the single source of truth for the dynamics-record definition.

*Research → engineering translation. Written 2026-07-18 from the full research pass in
`dynamics-research/` (six primary-source reads → `synthesis.md` → two adversarial
critiques: `critique-novelty.md`, `critique-coverage.md`). This document is the
post-critique position: where the critiques refuted or downgraded a claim, the
downgrade is adopted here, not argued with. Companion genre: `llm-integration-research.md`.
Citations carry the research folder's VERIFIED/UNVERIFIED marks; anything newly asserted
here is marked. Confidence ratings: **HIGH** (verified primary source + survived critique),
**MEDIUM** (verified but secondary-sourced or partially critiqued), **LOW** (open/original work).*

---

## TL;DR (the one page)

1. **The position.** Dynamics is a state-transition family φ over a linearly-ordered
   support, satisfying the semigroup composition axiom (Mesarovic–Takahara Def 2.7,
   1975). A dynamics-*kind* is the shape of that family's codomain (its endofunctor).
   **Conservation is not a property of dynamics at all — it is an invariant declared on
   the state space by the model.** bert-lenses today implements one dynamics-kind
   (deterministic self-map on ℝⁿ stocks with an additive conservation invariant) and has
   been mistaking that special case for the category. (HIGH)

2. **The novelty claim did not survive as written — and that's fine.** The adversarial
   check found direct prior art: Petri-net P-invariants and CRN conservation-law theory
   have formalized "conservation as a structural invariant independent of the transition
   rule" for 30–50 years, and Willems already demotes conservation to one constraint
   among many on the behavior B. What survives is narrower and honest: **the first
   application of this well-understood structure/dynamics separation to a Mobus-flavored,
   Lean-formalized K≅2 kernel and to `circuit.rs` specifically.** That is an application,
   not a discovery. This doc claims exactly that and no more. (HIGH — §1.3)

3. **The kernel was never the problem.** The Lean 8-tuple's τ/η/δ are carried data with
   "no structural role in the ontology" (`Tuple.lean:47–49`, VERIFIED) — the structural
   theorems cannot depend on the dynamics slot. Conservation entered from Mobus's Ch.10
   prose (self-flagged "asserted, without formal proof") above the formalism and
   `circuit.rs` below it — never from the tuple. (HIGH; note this is parametricity, a
   standard type-theory fact, not a systems-theory result — per critique.)

4. **The engine already half-agrees.** `circuit.rs` routes conservation through a
   per-substance declaration ("Message copies," `DeclaredSubstance.base`, "the dynamics
   only ever read `base`" — lines 5/174/178, VERIFIED). The move is to finish that
   inversion: invariants become an open, optional, model-level declaration (axis D).
   The Boolean-network trajectory mode falls out for free. (HIGH)

5. **#67 (FSA/Markov) and #54 (porosity) get formal homes.** FSA = new functor `X^Σ`
   over event-indexed support, recording Bunge net-events ⟨s,s′⟩; Markov = `Dist(X)` —
   with the coverage critique's caveat that clock-driven `Dist(X)` and rate-driven
   continuous-time chains are different objects, and #67's spec must be checked for
   which one it needs before implementation. #54 is decided by a stated test: does
   porosity ever invalidate the current φ (metasystem swap, Klir) or only rescale a
   coefficient inside one φ (generative parameter)? **Hybrid automata (read-external §6)
   is the restored, best-matched formalism for flow-mode + discrete-jump combination**,
   and DEVS for multi-element discrete-event scheduling — both were read in the research
   pass and dropped by the synthesis; restored here. (HIGH/MEDIUM)

6. **CT verdict: adopt as classification, refuse as implementation.** The endofunctor
   is axis C of the taxonomy — a typing discipline that collapses three would-be boolean
   flags into one enumerable choice, costing ~zero runtime code. Heterogeneous
   composition (flow element wired to FSA element) is an unsolved research frontier in
   the categorical literature itself; do not restructure the kernel on it. (HIGH for
   the split; MEDIUM on the functor table itself — Rutten secondary-sourced.)

7. **Mobus departure, stated for SL 2.0:** T's formal definition ("any suitable
   form... formula, equation, or algorithm") is implementation-neutral; embedded
   scripts were his exploratory SL proposal, admitted as "playful exploration." A
   description language should **declare** dynamics (kind, carrier, invariants, rates)
   and never **embed** a simulator. (HIGH)

---

## 1. The adopted account, and what happened to the novelty claim

### 1.1 The four-layer stack (adopted)

The generic account is not one definition but four nested questions, each with a
different winner (full argument: `dynamics-research/synthesis.md §1`):

| Layer | Question | Winner | Evidence grade |
|---|---|---|---|
| 1 | What makes it dynamical? | **Mesarovic–Takahara Def 2.7**: state-transition family φ + semigroup axiom, over any linearly-ordered support (1975, p. 21) | HIGH — primary read, survived critique |
| 2 | What does a run *mean*? | **Willems (T, W, B)**: the behavior — a declared set of admissible trajectories; state is a constructed latent variable (2007, pp. 51, 69) | HIGH — primary read, survived critique |
| 3 | What *kind* is it? | **Coalgebra**: the codomain endofunctor F of (X, f: X → F(X)) (Rutten 2000) | MEDIUM — secondary-sourced; three-way convergence with Spivak and Klir's partition |
| 4 | Does the law itself change? | **Klir generative/metasystem**: a metasystem is an invariant procedure replacing one generative system with another (klir-facets.md:4618–4634) | HIGH — primary read |

Why MT beats the rivals at Layer 1: time is only linearly ordered (not ℝ), so an
event-indexed FSA run and a continuous flow are the same kind of object; "dynamical" is
*added structure* on a time system — the exact formal home for "Run = a mode
transition"; and the semigroup axiom (step t→t′ then t′→t″ = step t→t″) is a
mechanically checkable acceptance test for every mode bert-lenses ever ships.
Zargham–Shorish 2022 (GDS = {h, X}) is the citable modern restatement for engineers.

**Restored per the coverage critique (its two High-severity findings):**

- **Hybrid automata** (Alur–Henzinger; read-external §6, VERIFIED) — continuous flow
  *within* a mode plus discrete jumps *between* modes as one formal object, with
  invariant/guard apparatus. This is the closest match in the entire corpus to
  bert-lenses' actual requirement (a conservation engine and an FSA in one tool) and
  the synthesis dropped it. Cost stated honestly: general reachability is undecidable,
  but a forward-stepping simulator lives comfortably in the decidable-enough zone
  (timed / initialized-rectangular subclasses). It slots under Layer 1 as the
  *combination* recipe, not a rival definition.
- **DEVS** (Zeigler, via the Wymore bridge; read-external §5, VERIFIED) — the solved,
  mature mechanism for composing multiple discrete-event elements under one event
  calendar. The homogeneous-discrete-event half of the composition problem is not open;
  only the heterogeneous flow+discrete half is.

### 1.2 Rejected alternatives (summary)

- **Bertalanffy**: GST's dynamics is continuous, Markovian, fixed-rule by his own
  statement (p. 57); no bridge to discrete/automaton dynamics — and his
  immense-numbers argument (up to 2^(N(N−1)) connectivity states, p. 26) is *why*,
  and is kept here as the diagnosis of the ABM/heterogeneous gap (per coverage §6).
- **Mobus**: Principle 4 is too general to be a definition; the conservation-flow
  claim is his own "asserted, without formal proof" (10-model-archetypes:35). See §5.
- **Bunge as Layer-1 winner**: his automaton apparatus sits in Appendix A with no
  bridging theorem to the Ch.1 state-space apparatus (VERIFIED absence). But his
  event/net-event distinction (⟨s,s′,g⟩ vs ⟨s,s′⟩) is kept — it is the sharpest
  statement of what differs between an FSA run and a conservation run.

### 1.3 The novelty claim, post-critique (honest accounting)

The synthesis claimed: *"no existing systems framework has this property [structural
kernel provably independent of dynamics, conservation as declaration] demonstrated
rather than claimed."* **The adversarial check refuted this as stated** (`critique-novelty.md §1–§3`):

- **Petri-net P-invariants** (Murata-era, 1980s): a weighted token count constant under
  *every* firing sequence, computed from the incidence matrix alone — conservation
  declared on structure, independent of the firing rule. Petri nets even bridge
  flow-networks to FSAs directly (the reachability graph *is* an automaton over markings).
- **CRN conservation laws** (Feinberg/Horn–Jackson, 1970s): cokernel vectors of the
  stoichiometric matrix are conserved "regardless of kinetics."
- **Willems himself**, already cited in Layer 2, demotes conservation to one possible
  constraint defining B.
- The Lean "no structural role" fact is **parametricity** (Reynolds 1983 / Wadler
  1989) — real, useful, machine-checked, but a generic type-theory guarantee, not a
  systems-theory discovery.

**Adopted position:** the contribution is an **application, not a discovery** —
*the first application of the (well-established) structure/dynamics separation, with
conservation-as-declared-invariant, to a Mobus-grounded, Lean-formalized K≅2 kernel
and a working in-browser engine.* Petri/CRN prior art should be cited as the lineage,
not treated as a threat. Anything public says this in these words. (HIGH)

---

## 2. The taxonomy

Amended per critiques: **four load-bearing axes** (B, C, D, E — each shown to force
different code), one Layer-1-only observation (A), one research placeholder (F).

- **B. State-space structure** — bare set / finite alphabet / vector space. The axis
  nobody names and the one that matters most: conservation is not even *expressible*
  without additive structure. (HIGH)
- **C. Transition codomain functor** — `Id` / `X^Σ` / `Dist(X)` / `P(X)` / `(B×X)^A`.
  Subsumes deterministic-vs-stochastic, autonomous-vs-driven, silent-vs-emitting.
  **Amendment (coverage §3):** `Dist(X)` stepped per tick ≠ a rate-indexed
  continuous-time chain (Gillespie-style: a *when*, not just a *what*). If #67's
  transitions are event/rate-driven ("the committee votes when it votes"), a second
  stochastic entry is needed, with discrete-tick recovered as its degenerate limit. (MEDIUM until #67 spec checked)
- **D. Declared invariants on state** — none / conserved-additive / monotone /
  bounded. **Conservation lives here and only here.** (HIGH)
- **E. Generating relation fixed or mutable** — generative / metasystem order-n
  (Klir). Home of multi-timescale and of #54's decision. (HIGH)
- *(A. Support structure* — discrete/dense/event-indexed. Load-bearing at Layer 1 (MT's
  linear-order generality) but, per critique-novelty §5, never the sole differentiator
  in any "what's required" row; demoted to a Layer-1 note.)*
- *(F. Composition mode* — open/closed, homogeneous/heterogeneous. Honest status: the
  homogeneous discrete-event case is SOLVED (DEVS); the heterogeneous flow+discrete
  case is a research frontier (see §6). A placeholder for a cut, not a demonstrated one.)*

### Placement and requirements

| Kind | B state | C functor | D invariants | E | What the kernel/engine needs |
|---|---|---|---|---|---|
| Conservation flow (today) | ℝⁿ vector space | `Id` | additive conserved | generative | Nothing — this is the implemented cell |
| Boolean network (RBN, single run) | {0,1}ⁿ bare set | `Id` | **none** | generative | **Axis-D made optional** — decouple the stepping loop from the conservation ledger. Same functor as flow. Cheapest unlock on the board. |
| FSA / DLG (#67) | finite alphabet | `X^Σ` | none expressible | generative | New stepper: input alphabet + transition table; run records net-events ⟨s,s′⟩ (Bunge), not rates. Scope against a trivial-flow hybrid automaton first (§2.1). |
| Markov (#67) | finite alphabet | `Dist(X)` **or rate-indexed CTMC** | mass-1 on the distribution, not the state | generative | Sampling + seed + reproducibility discipline; H becomes *a* sampled path — a UI-visible semantics change. **Gate: check #67 spec, clock- vs event-driven.** |
| Hybrid (flow + jump) — *restored row* | per-mode ℝⁿ + mode label | mode-indexed | per-mode | generative w/ guards | Alur–Henzinger shape: mode-local flow, guard-triggered jumps. The principled combination target once FSA and flow both exist. |
| Agent trajectories | ∏ᵢ agent states | `Id`/`Dist` | usually none | generative | Heterogeneous composition — unsolved anywhere (VERIFIED absence, both CT reads + Open(Dynam)); Bertalanffy's immense-numbers argument explains why. Original work. |
| Multi-timescale hierarchy | product over levels | — | per-level | **metasystem** | Klir gives scheduled/threshold swap precedents, no continuously-coupled worked example. Original work. |

### Explicitly out of scope (declared, not ignored — per coverage §4–§5)

- **Ensemble/rule-space dynamics** (Kauffman-tradition Ω/criticality statistics over a
  *population* of rule tables): not a trajectory question at all — a statistic over a
  family of τ's. No source pass exists; the taxonomy takes no position. If the RBN
  model needs ensemble statistics (not just one trajectory), that is a **new source
  pass + possible seventh axis**, tracked as an open question (§9, issue draft). (LOW)
- **State-space dimensionality change mid-run** (Bunge's qualitative change, "new axes
  pop up," 1979:4026): neither axis D nor E covers a carrier changing shape. Added to
  the original-work list with Bunge as the named starting point. (LOW)

---

## 3. Where conservation sits

**Claim (HIGH): flow conservation is a special case the model declares, not a universal
the engine assumes.** The argument, post-critique:

1. **Expressibility**: conservation requires additive state structure (axis B). On a
   finite alphabet it is a type error. A definition of dynamics that presupposes it
   cannot even describe an FSA — so it cannot be the definition.
2. **Lineage, not novelty**: Petri P-invariants and CRN conservation laws demonstrate
   the same separation formally — invariant on structure, transition rule free
   underneath. We adopt their pattern and cite them; we do not rediscover it.
3. **Mobus's own permission**: the conservation-flow-network claim is his, flagged by
   him as "asserted, without formal proof" (10:35, VERIFIED), while his formal T is
   "any suitable form" (4-a-model:407). Generalizing is a *return to* §4.3.3.4, not a
   departure from Mobus.
4. **The code already half-agrees** (VERIFIED, spot-checked by the adversarial pass):
   `circuit.rs` line 5 "Energy/Material conserve, Message copies"; `DeclaredSubstance`
   (line 178) with "the dynamics only ever read `base`" (line 174). Conservation is
   *already* a per-substance declaration looked up by the dynamics — on a closed
   three-kind enum with conservation as default. Finishing the inversion = making
   axis D an open, optional, model-level declaration.
5. **A free load-bearing constraint** (Bertalanffy, pp. 132–133, VERIFIED): a closed
   system cannot be equifinal in its conserved quantities. Today's engine runs the one
   class of system that structurally cannot exhibit equifinality on conserved measures —
   any future attractor/robustness claim must be scoped against this theorem.

**Keep / shed:**

| Keep | Shed |
|---|---|
| Conservation ledger as a *declarable, checkable invariant* (axis D) | Conservation as the stepping loop's structural premise |
| `DeclaredSubstance` lookup pattern — extend it | The closed 3-kind enum as the only invariant vocabulary |
| Ledger history as first-class run evidence when declared | The assumption that every model has a ledger |
| Petri/CRN citation as lineage | The "no existing framework has this" sentence — refuted |

---

## 3a. First DTMC increment (2026-07-24) — the `Dist(X)` row, implemented general

`crates/bert-compose/src/markov.rs` (PR #168) is the first implementation of the axis-C **`Dist(X)`** cell (the Markov `#67` row), and it is deliberately built to the *axis*, not to a model.

- **What it is.** `Chain::from_edges(states, weighted_edges)` → a row-stochastic matrix; `trajectory` iterates `vₙ₊₁ = vₙ P`. This is the **distribution-evolution** (Chapman–Kolmogorov / Kleisli-composition) reading of `Dist(X)` that §4's contract names — the master-equation face of the chain, not a sampled path. `H` stays the full distribution trajectory, so there is **no RNG, seed, or reproducibility surface yet** — a deliberate first cut that sidesteps the "H becomes *a* sampled path" semantics change §2's Markov row flags.
- **General, not model-shaped.** Nothing in it knows about states counts, alphabets, or the parity automaton it is tested against (the parity chain is only the fixture: stochastic rows, one-step mixing at p=½, convergence to [½,½] for every biased coin, dead-ends absorb). Same stepper *shape* as conservation flow — the only difference is the codomain functor (axis C). Conservation-flow (`Id` + additive-invariant), DTMC (`Dist`), and the FSA stepper (`X^Σ`) are one dynamical face parameterized by C, **not parallel engines**. This is the K≅2 discipline at the dynamics layer: one neutral coalgebra `c: X → F(X)`, read through each lens — the P3 `mask` (`f: Ḡ → G`) is that coalgebra read in the register, and it is already lens-neutral (Bunge state-space / Mobus work-process / Klir behavior-function read the same trajectory).
- **Deferred, and explicitly *not* part of closing #67** (the doc's own open gates, kept open): sampled single-path trajectories (seed + reproducibility discipline); and the **event/rate-driven CTMC** — the axis-C "second stochastic entry" from §2's amendment ("the committee votes *when* it votes"), with discrete-tick as its degenerate limit. Both are real, both wait.

**Closeable `#67`, scoped in this frame** (useful/practical/closeable, in service of the general face): (1) the `Dist(X)` distribution stepper — **done** (this PR); (2) read edge weights off a Klir model — the general authoring flow (SL symbol→probability and/or a transition-weight CSV import/export), on any `(T,R)` model, never a parity form; (3) surface the trajectory through the existing lens readouts (the P3 `mask` + Bunge state-space), sharing `run.rs`'s trajectory shape. CTMC and sampled-path semantics are out of scope for the close. The permanent home of `markov.rs` is *inside* the shared `Dynamics` descriptor (the 7/23 spine: descriptor → typed transition → readout), one arm beside `run.rs`, not beside it.

---

## 4. The dynamics contract (the rules everything else hangs on)

1. **Semigroup axiom as the kernel's dynamics contract** (MT Def 2.7 β): for every
   mode bert-lenses ships, φ_{t′t″} ∘ φ_{tt′} = φ_{tt″}, checkable per engine
   (property test: step twice = step once with doubled span, for deterministic kinds;
   Chapman–Kolmogorov in the Kleisli category for `Dist(X)`).
2. **H is a record, never an input to T.** Mobus licenses H feeding back into T
   (4-a-model:419) with no mechanism; if T reads H the semigroup axiom fails. The rule,
   converged on independently by Willems (state = latent variable making past/future
   conditionally independent), Bertalanffy (integro-differential deferral, p. 57), and
   MT: *any history-dependence must be folded into the carrier.* If T needs the past,
   the state was misidentified. (HIGH — three-tradition convergence)
3. **A run advances over a positive, finite slice, or it is not a run.** Dynamics is a
   family of state transitions over a linearly-ordered support; a slice of zero is not a
   small step, it is not a step. Advancing by nothing yields no successor, so it defines
   no transition and there is nothing to record — and the same holds for a non-finite
   slice, and for a horizon that bounds no finite sequence of transitions. This is a
   precondition on `(Δt, T)`, not a numerical safety check, so it is refused with a
   verdict rather than clamped, defaulted, or repaired. **Where it lives:** in the engine,
   at the point the run is constructed (`bert_compose::ticks_over`, which `RecordedRun::record_over`
   calls to derive its tick count) — never in a particular caller, because every door
   into a run must meet it. Callers may ask early for a legible refusal; they may not be
   the only place that asks. (HIGH — direct consequence of the MT Def 2.7 account above)

   *Corollary, engineering rather than doctrine:* a `(Δt, T)` pair that resolves to no
   representable number of steps is refused for that reason, separately. Reachable with a
   perfectly legitimate positive, finite Δt (a small enough one over a long enough
   horizon), so it is its own refusal with its own witness, not a restatement of the
   precondition.

---

## 5. The Mobus departure, argued (liftable into the SL 2.0 spec)

Mobus's answer to "how does a model carry dynamics" was **embedded scripts**: "Behaviors
or dynamics are implemented using embedded scripts... transformations (T in Eq. 4.1)
are expressed in transfer functions or simulation programs" (4-a-model:535, §4.4.1.2.3,
VERIFIED), inside the SL/sysXML design chapter, analogized to HTML+JavaScript, and
self-described as "playful exploration" with "research... continu[ing]" (4-a-model:509/560).

We reject the mechanism while keeping the theory, and the rejection is not taste:

1. **It is not the theory's mandate.** T's formal definition — "any suitable form,
   such as... formula, equation, or algorithm" (4-a-model:407) — is
   implementation-neutral. The narrowing to scripts happens in prose about one
   candidate description language, not in the tuple's mathematics. Rejecting embedded
   JS rejects an engineering guess Mobus himself hedged, not a theorem. (VERIFIED)
2. **Embedded scripts destroy checkability.** A script is opaque to every validator:
   the semigroup axiom, conservation ledgers, mode-transition witnesses, and the Lean
   structural theorems can say nothing about arbitrary code. The entire bert-lenses
   premise — a deterministic kernel owning truth (`llm-integration-research.md §2`) —
   dies at the first `eval`.
3. **Declaration subsumes the need.** Everything a per-element script legitimately
   expresses is expressible as declared data: a rate constant, a transfer-function
   *family* name + parameters, a transition table, a distribution + seed.

**What SL declares if it ever gains dynamical syntax** (the liftable paragraph):

> An SL model never contains a simulator. It **declares** a dynamics record per
> system: the **support** (discrete Δt, event-indexed, …), the **carrier** (what the
> state space is), the **kind** (the transition functor: deterministic map, input-driven
> table, distribution), the **invariants** (conserved quantities, bounds — axis D,
> where conservation lives), and the **rates/parameters** of a named transfer-function
> family. Engines *interpret* declarations; they are substitutable and separately
> verified against the semigroup contract. A declaration is checkable, diffable,
> lens-translatable, and provable-about; a script is none of these. This is Mobus's own
> T ("any suitable form") taken at its formal word rather than at its Ch. 4 prose.

---

## 6. Category theory: the verdict

**Adopt as classification. Refuse as implementation. Say both publicly.** (Unchanged by
critique except an evidence-grade caveat.)

- **As classification (adopt, cost ≈ zero):** axis C *is* the endofunctor. It collapses
  three ad-hoc booleans into one enumerable choice; it turns "is deterministic a special
  case of Markov?" into a computation (yes — the Dirac unit `Id ⇒ Dist`, the principled
  bridge that keeps #67's deterministic case from being a special-cased branch); and
  three independent traditions (Rutten, Spivak, Klir-without-CT) produced the same
  partition. **Caveat carried from critique-novelty §6:** Rutten's core definitions were
  never read in primary — the functor table is MEDIUM-grade, cross-confirmed secondary.
- **As implementation (refuse, for now):** heterogeneous composition — a flow element
  wired to an FSA element — is unsolved in the categorical literature itself
  (Vagner–Spivak–Lerman ODE-only; `Open(Dynam)` continuous-only, VERIFIED absence;
  Myers a self-described "0th draft"; categorical ABM is blog-tier). Restructuring the
  kernel on this would be original research mistaken for adoption.
- **Incremental path:** (1) type axis C as an enum in the dynamics record now;
  (2) property-test the semigroup law per functor (Kleisli for `Dist`); (3) revisit
  implementation-CT only if heterogeneous wiring becomes the binding constraint — and
  enter knowingly, as research. The nearer-term composition wins are non-categorical:
  **DEVS** for homogeneous discrete-event, **hybrid automata** for flow+jump.

---

## 7. 8-tuple reconciliation

All VERIFIED against `Systems/Mobus/Tuple.lean` (read in the research pass;
spot-confirmed by the adversarial critique):

- **T (τ):** currently an opaque type parameter with "no structural role in the
  ontology" (lines 47–49). The kernel never committed to conservation — or to anything.
  Refine, don't extend: promote τ to a structured record
  `Dynamics := ⟨support (A), carrier (B), functor (C), invariants (D), order (E)⟩`.
  Strictly conservative — no existing proof quantifies over τ, so none can break.
  (Honesty note per critique: the "can't break" guarantee is parametricity
  (Reynolds/Wadler), credited as such — a type-theory mechanism, not a systems result.)
- **H (η):** the trajectory record — the graph of the state function over the support.
  Three-way independent convergence: Mobus's data stream (4-a-model:423–428), Bunge's
  h(x) = {⟨t, 𝔽(t)⟩} (1979:673–676), `circuit.rs`'s `history: Vec<Vec<f32>>` (line 424).
  Under Klir, a completed H is a *data system* — evidence dynamics occurred, never the
  generator. Rule: **H is a record, never an input** (§4). For `Dist(X)` kinds, H is
  *a sampled path*, and the UI must say so.
- **Δt (δ):** reinterpret as **support** (linearly ordered, per MT Def 2.1; need not be
  time, per Klir 4030–4042). Mobus half-anticipates this ("an unsettled area requiring
  more research," 4-a-model:436–444). Rename the concept; leave the field.
- **Attribution correction to carry:** the book prints a **7**-tuple ⟨C,N,G,B,T,H,Δt⟩;
  E-as-first-class is the Lean formalization's improvement on Mobus, and is credited
  that way in anything published. Also flag upstream: `Tuple.lean`'s doc comment says
  "first five type parameters (α, κ, μ, π)" — names four (source-file nit, per critique).

---

## 8. Roadmap consequence

Arc 4 (`ROADMAP.md:69–`) currently frames dynamics as **plumbing**: "converge with
bert-compose... Compose's conservation engine (`circuit.rs`, UI-free) is consumed as a
crate." That silently re-installs the assumption this research dismantles: it makes
*the conservation engine* the meaning of Run.

**What Arc 4 should say instead** (proposed replacement framing, 3 sentences + a rider):

> Run = exhibiting a state-transition family φ for the model (MT Def 2.7): the
> Operational upgrade supplies a **dynamics declaration** — support, carrier, functor,
> invariants — with witnesses, like any §A5 upgrade. The compose conservation engine is
> the **first interpreter** of one declarable kind (Id-functor, ℝⁿ carrier, conserved
> invariant), not the definition of Run; FSA/Markov (#67) and Boolean-network kinds are
> further interpreters over the same seam, each property-tested against the semigroup
> contract, with H always the recorded run. Downgrading drops the declaration and keeps
> structure, lossless. *Theory: `docs/design/dynamics-principled-position.md`.*

Phase gates 4.0–4.2 (shipped) are unaffected — they built the seam. The change is that
4.3+ scopes new *kinds* as declarations + interpreters, not as forks of `circuit.rs`.

---

## 9. Closeable open questions

| # | Question | Closes when |
|---|---|---|
| Q1 | Is #67's Markov clock-driven (`Dist(X)` per tick) or event/rate-driven (CTMC)? | Someone reads the #67 spec and records the answer (coverage §3) |
| Q2 | #54: does any porosity value invalidate the current φ (metasystem) or only rescale within it (generative parameter)? | The stated test is applied to the actual porosity model and the answer + reasoning recorded (coverage §2) |
| Q3 | Does the RBN model need one trajectory + summary stat, or ensemble statistics over rule realizations? | Read the source RBN/Ω material; if ensemble → new source pass, possible 7th axis or explicit scope ruling (coverage §4) |
| Q4 | Should the bill FSA be implemented as bare `X^Σ` or as a trivial-flow hybrid automaton (buying the flow+FSA combination path)? | #67 scoping decision recorded against read-external §6 |
| Q5 | τ refinement in Lean: land the 5-field `Dynamics` record? | Small SSF PR; parametricity guarantees conservativity |

---

## 10. Draft GitHub issue (ready to file — NOT filed)

**Title:** What counts as dynamics: the principled position (adopt + close)

**Body:**

> `docs/design/dynamics-principled-position.md` lands the theory the tool has been
> assuming without argument: **dynamics = a state-transition family satisfying the
> semigroup axiom (Mesarovic–Takahara Def 2.7); dynamics-kind = the transition functor;
> conservation = a declared model-level invariant (axis D), not the engine's premise.**
> Full research trail in `docs/design/dynamics-research/` (six primary reads + synthesis
> + two adversarial critiques; novelty claim deliberately downgraded to "first
> application to this kernel" — prior art: Petri P-invariants, CRN conservation laws,
> Willems).
>
> This issue is the closure checklist for W30:
>
> - [ ] **Adopt the position doc** — review `dynamics-principled-position.md`, fix or
>   file objections; merging this checklist = adoption.
> - [ ] **Answer Q1 for #67**: clock-driven `Dist(X)` vs rate-driven CTMC — read the
>   #67 spec, record the answer there. Also decide Q4 (bare `X^Σ` vs trivial-flow
>   hybrid automaton per `dynamics-research/read-external.md §6`).
> - [ ] **Answer Q2 for #54** with the stated test: does porosity ever invalidate the
>   current flow φ (metasystem swap, Klir) or only rescale a coefficient within one φ
>   (generative parameter)? Record answer + reasoning on #54; close it.
> - [ ] **RBN gap (Q3)**: check whether the random-Boolean-network model needs one
>   trajectory (unlocked by making the conservation ledger opt-in — axis D optional in
>   `circuit.rs`'s stepping loop) or ensemble/Ω statistics (out of current scope; spawn
>   a source-pass issue if so).
> - [ ] **Write the semigroup contract down** as a property test obligation for every
>   current and future stepper (deterministic: double-step law; stochastic:
>   Chapman–Kolmogorov), plus the rule "H is a record, never an input to T."
> - [ ] **Amend ROADMAP Arc 4** with the replacement framing in position-doc §8
>   (declaration + interpreters, not engine-as-definition).
>
> Out of scope here (tracked in position doc §2/§9): agent heterogeneous composition,
> multi-timescale metasystem, dimensionality-change, ensemble dynamics, Lean τ
> refinement (Q5 — separate SSF PR).
>
> Refs: #67, #54, `dynamics-research/` folder.

---

*Source-strength summary: every load-bearing quote in this document was either read in
primary during the research pass or independently spot-checked by the adversarial
critique (all four spot-checks exact — `critique-novelty.md §4`). The two known
MEDIUM-grade planks are the Rutten functor table (secondary-sourced) and the
Petri/CRN prior art (≥3 converged secondaries, no primary opened). Neither is
load-bearing for the engineering moves; both are load-bearing for the humility.*
