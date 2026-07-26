# Klir's Epistemological Hierarchy as a Theory of Dynamics

**Status: RESEARCH.**

*Source: George J. Klir, "Facets of Systems Science" (2nd ed.), OCR'd full text at
`operations/systems-science/klir/klir-facets.md` in the vault (2,082,617 bytes,
36,995 lines, poor OCR but legible in the load-bearing sections). All citations below
are `klir-facets.md:<line>`, VERIFIED means I read the passage directly.*

## 0. What this file is for

bert-lenses today assumes ONE answer to "what is dynamics" — conservation flow over
Mobus work processes (bert-compose's `circuit.rs`) — without ever arguing for it. Issue
#67 wants Markov/FSA simulation (not conservation). #54 asks what porosity-modulated
crossing flows *mean* (a run-semantics question). A random-Boolean-network model has no
trajectory mode at all. This doc mines Klir's GSPS epistemological hierarchy — source →
data → generative → structure → metasystem — for a general, substrate-neutral account of
dynamics that could ground a taxonomy instead of a single hard-coded engine.

**Prior vault context, VERIFIED**: `operations/sessions/_archive/2026-06-11/session-facets-klir-bunge-lenses.md:41`
already flags this exact fork — Klir's Ch.2 static definition `S=(T,R)` (systemhood = R,
thinghood = T) is what got pulled into the K≅2 kernel comparison; the GSPS epistemological
hierarchy (Ch.4, what this doc covers) is explicitly called out there as "a separate outer
construction," not yet integrated. This assignment is that integration attempt.

**Separately**, `strategy/spine/decisions/channel-theory-over-klir-git.md` (VERIFIED, locked)
rejected Klir's GIT (Generalized Information Theory, a measurement/uncertainty toolbox) in
favor of Barwise–Seligman channel theory for the *information* face of K≅2. That is a
different piece of Klir's corpus (uncertainty measures, not the epistemological hierarchy)
and that decision does not bear on this one — flagging so it isn't mistaken for "Klir was
already rejected here."

---

## 1. The hierarchy and how each level relates to dynamics

Klir derives the categories from three primitives — investigator, investigated object,
interaction — left undefined, used only in common-sense meaning (klir-facets.md:3608-3614,
VERIFIED). Categories are ordered by knowledge content into a meet semilattice, "usually
called an epistemological hierarchy of systems" (klir-facets.md:3589-3592, VERIFIED). A
system at a higher level contains all the knowledge of the systems below it plus additional
knowledge (klir-facets.md:3586-3588).

### 1a. Source system — no dynamics yet, but the substrate for it

A source system = a set of variables (partitioned into basic/supporting), their state sets,
and optionally real-world interpretation (klir-facets.md:3639-3643, VERIFIED). Supporting
variables typically encode time, space, or population — the **support set** within which
basic-variable states change (klir-facets.md:3630-3635). Source systems "do not contain any
relations among their variables" (klir-facets.md:3666) — no dynamics is even expressible
here. This is the bare state-space + support scaffold: in bert terms, C/N/E (components,
network, environment) before any T is attached.

### 1b. Data system — dynamics as raw trace, not law

Source system + actual data (a function from support set to variable states) = a data
system (klir-facets.md:3890-3894, VERIFIED). "In general, every time series qualifies as a
data set" (klir-facets.md:3898). This is a *recorded trajectory* — a run's output log — but
still no generating law. In bert-lenses terms: a completed simulation run's H (History) IS
a data system over the source system's C/N/E. Important: a data system is evidence dynamics
occurred, not a specification of dynamics.

### 1c. Generative system — THIS is where "dynamics" as a generating law lives

"On the next level higher than the level of data systems, each system is represented by one
overall support-invariant characterization (time-invariant, space-invariant,
population-invariant, etc.) of the relation among the basic variables... systems on this
level are called generative systems" (klir-facets.md:4030-4042, VERIFIED). Klir is explicit
that this is deliberately substrate-neutral across time AND space AND population supports —
not time-privileged.

Named examples, VERIFIED, klir-facets.md:4043-4045: **finite-state machines (deterministic
or probabilistic), Markov chains, and differential equations with constant coefficients**
are all, by Klir's own account, generative systems — the *same epistemological level*. This
is the single strongest finding for bert-lenses: Klir's hierarchy already places
conservation-flow ODEs (bert-compose today), FSA/DLG transitions (issue #67), and Markov
chains in one undifferentiated category, distinguished only by *what kind* of time-invariant
relation generates the trajectory, not by level.

### 1d. Structure system — composition of generative (or lower) systems

Two systems are integrated as subsystems sharing variables into a larger whole; recursive
(order-n structure system's elements are order-(n-1) structure systems, bottoming out at
source/data/generative systems) (klir-facets.md:4371-4416, VERIFIED). This is bert's
decomposition/hierarchy axis (Mobus's recursive systemhood), largely orthogonal to
dynamics-per-se — it's about *composing* generative (or static) pieces via shared variables,
not about a different account of time.

### 1e. Metasystem — where the generating relation itself changes over time

"An overall system is viewed as varying within the relevant support... The change from one
system to another in the delimited class is described by a replacement procedure that is
invariant with respect to the support employed. Overall systems of this type are called
metasystems." Metasystems can themselves vary, giving metasystems of second order,
recursively (klir-facets.md:4618-4628, VERIFIED).

"Metasystems... are important for capturing systems phenomena that involve change, such as
adaptation, self-organization, morphogenesis, autopoiesis, evolution, etc. Evolution, for
example, is conceptualized in terms of transitions from lower- to higher-order metasystems
by Turchin [1977]" (klir-facets.md:4629-4634, VERIFIED).

This is the direct answer to (e) in the assignment: a metasystem is one order up from a
generative system — its *elements are (generative or other) systems*, and the metasystem's
job is to specify the **invariant replacement procedure** that swaps one generative system
for another as the support advances. Klir's worked examples (all VERIFIED,
klir-facets.md:4642-4924):
- traffic-light controller with three time-of-day modes, replaced by a scheduled procedure
  keyed on clock time (klir-facets.md:4642-4719) — a **mode-switching** metasystem
- a patient's monitored source system swapped between "natural kidneys" and "hemodialysis
  machine" frames, replacement triggered by a *variable's value* (`v4=1` → swap)
  (klir-facets.md:4725-4761) — replacement triggered by system state, not just clock
- cellular-automaton neighborhoods generating new active-cell subsets each step
  (klir-facets.md:4762-4855) — replacement procedure = the CA's own local rule, applied at
  the structure-system level
- Lindenmayer/L-systems: production-rule string rewriting as a metasystem over data systems
  (klir-facets.md:4856-4923)

**Assessment of whether metasystem is the right home for bert-lenses's mode-transition
(Mobus-structural → Operational)**: yes, structurally. A mode transition in bert-compose is
exactly "replace the generative system that's running" — swap out one T (transformation law
+ support) for another, per an invariant procedure. Klir's second worked example (the
kidney/dialysis frame swap, triggered by a state variable crossing a threshold) is close
kin to what #54's porosity-modulated-crossing question is actually asking: does a
structural parameter (porosity) act as a metasystem replacement trigger (switching which
generative law governs a boundary-crossing flow), or as a parameter *inside* one fixed
generative system (a coefficient in the flow equation)? Klir's apparatus makes that
question precise and answerable — it's a decision about which epistemological level
porosity operates at, not a vague semantics question.

Caveat, UNVERIFIED as applied to bert: Klir gives no worked example of adaptation/evolution
*within* one continuous run at the same timescale as the base dynamics — his metasystem
examples all have replacement keyed to a coarser support (clock time, a threshold crossing,
a discrete generation index). Whether bert-lenses's multi-timescale hierarchy
(`project_multitimescale_architecture.md`, UNVERIFIED cross-reference, not read this
session) maps cleanly onto nested metasystem orders, or needs its own machinery, is open —
flagging rather than asserting.

---

## 2. Behavior function, mask/window, time-invariant relation

**Time-invariant relation** (klir-facets.md:4094-4098, VERIFIED): given sampling variables
`s1(t)=v(t)`, `s2(t)=v(t+1)` derived from a basic variable `v` by translation rules, the
relation between `s1` and `s2` "is time invariant in the sense that it holds for every value
of t," even though `s1(t)` and `s2(t)` individually vary with t. This is the general
definition of a dynamical law in Klir's framework: not "the values don't change" but "the
*relation among sampled values* doesn't change as the support advances."

**Translation rule / sampling variable** (klir-facets.md:4034-4036, 4100-4120, VERIFIED): a
translation rule is a bijection on the support set (e.g. `t ↦ t - α`); a sampling variable
`sk(t) = vi(t+α)` picks out a shifted view of a basic variable. `α=0` is the identity
translation (sk ≡ vi); `α<0`/`α>0` give past/future values.

**Mask** (klir-facets.md:4126-4135, VERIFIED, def'd Klir 1985a): "A set of these pairs
[(vi, α)], by which desirable sampling variables are defined, is usually called a mask...
It may be viewed as a 'window' through which appropriate samples of data are obtained."
Fig. 4.3 shows a concrete mask (α ∈ {-2,-1,0}) sliding over a data matrix, producing a
7-tuple of sampled values at each `t`.

**Behavior function** (klir-facets.md:4229-4238, VERIFIED): split the mask's sampling
variables into generated `G` and generating `G̅` (including inputs). "States g̅ are
determined by a function f: G̅ → G... called a behavior function." If the time-invariant
relation is expressible as such a function, the system is **deterministic**; otherwise
**nondeterministic**, with uncertainty expressed as conditional "behavior probabilities"
`P(g|g̅)` (klir-facets.md:4240-4246, VERIFIED).

Practical read for bert-lenses: a **mask + behavior function pair is Klir's general schema
for "one step of a run."** bert-compose's circuit-stepping conservation engine, an FSA
transition table, and a Boolean-network update rule are all specific instances of "mask
picks (present, and maybe past) states of some variables; behavior function computes the
generated (future) states." This gives a literal, implementable common interface: *any*
dynamics engine = (a) a mask spec (which variables, which offsets) + (b) a behavior function
or behavior-probability table over that mask. That is a genuine engineering handle, not just
a philosophical unification.

---

## 3. Discrete/continuous, deterministic/stochastic treated uniformly — is this real?

Largely yes, VERIFIED at the definitional level, with one caveat.

- Klir explicitly walks the *same* generative-system definition through: a discrete
  two-state alternator (klir-facets.md:4055-4098), a 2-D spatial chessboard pattern generated
  by a spatial mask (klir-facets.md:4249-4325 — support = space, not time, same apparatus), and
  continuous ODEs with constant coefficients, where "sampling variables cannot be defined
  directly... instead, they are defined indirectly, in terms of derivatives" and the
  differential equation itself is the time-invariant relation (klir-facets.md:4326-4407,
  VERIFIED). The `v̈ = -v` / sin(t) worked example is explicit about this substitution:
  derivatives stand in for the translation-rule sampling variables that discrete supports get
  for free.
- Deterministic vs. stochastic is handled by one clause inside the *same* definition —
  behavior function (deterministic) vs. behavior probabilities over the same time-invariant
  relation `R ⊂ G̅ × G` (nondeterministic) (klir-facets.md:4240-4246, VERIFIED). It is not two
  separate frameworks bolted together; determinism is a property of whether `R` happens to be
  functional.
- Klir independently flags finite-state machines (det. or probabilistic), Markov chains, and
  constant-coefficient ODEs as co-equal generative-system examples in the very same sentence
  (klir-facets.md:4043-4045) — discrete-state-discrete-time, continuous-state-discrete-time
  (probabilistic), and continuous-state-continuous-time all named as instances of one category.
- Later (Ch.6, Systems Metamethodology), Klir compares Mealy, Moore, finite-memory and
  "combined" finite-state machine paradigms and proves they're equivalent *as generative
  systems* even though they diverge in expressiveness one level up, at the structure-system
  level (klir-facets.md:6375-6420, VERIFIED: "the three paradigms are equivalent in terms of
  the classes of generative systems they capture [but] not equivalent in terms of the classes
  of structure systems they represent"). This is a second, independent piece of evidence that
  Klir treats generative-system-level dynamics as the substrate-neutral layer, with richer
  distinctions only entering once you compose (structure) or vary-over-support (metasystem).

**Caveat, VERIFIED but limiting**: the "uniform treatment" is a definitional/expressive
uniformity, not a computational one. Klir gives no unified *algorithm* — the continuous case
needs a differential-equation solver, the discrete case needs table lookup or matrix
multiplication (Markov), and he says so implicitly by using different generating mechanisms
for each example. The uniformity is "same epistemological slot, same mask/behavior-function
*shape*," not "same engine." For bert-lenses that's actually the right level of claim: a
common *interface* (mask + behavior function) that different *engines* (ODE stepper, FSA
transition table, Boolean-network update, ABM rule) implement — not a single numerical
method that swallows all four.

---

## 4. State-transition structures

Ch.5's homomorphism discussion (klir-facets.md:5344-5367, VERIFIED) explicitly recasts a
generic state-transition system as a generative system: `S=(X,R)`, `X` = set of overall
states, `R ⊂ X×X` a transition relation. Weak homomorphism: `h: X→Y` onto such that
`(x1,x2)∈R ⇒ (h(x1),h(x2))∈Q`. Strong homomorphism adds the converse-existence condition.
"Such systems could be described, more precisely, as special generative systems, possibly
nondeterministic" (klir-facets.md:5347-5348).

This matters for bert-lenses directly: an FSA/DLG (issue #67) and a deterministic Boolean
network (out-degree-1 state graph) are BOTH literally `(X,R)` generative systems in Klir's
sense — the FSA has a possibly-nondeterministic `R`, the Boolean network has a functional
(deterministic, single-next-state) `R`. They are the same object type at the generative
level; the difference bert cares about (probabilistic branching vs. forced single successor)
is exactly Klir's deterministic/nondeterministic behavior-function distinction from §2, not a
different category of dynamics. Klir also gives, for free, the right notion of "is this
smaller/coarser FSA a valid reduction of that larger one" — homomorphism, with strong vs.
weak flavors depending on whether you need exact converse-preservation. That is potentially
useful machinery for any future bert-lenses feature that collapses/abstracts a state machine.

---

## 5. Does Klir's hierarchy already give bert-lenses its dynamics taxonomy?

**Partially, and the part it gives is real and load-bearing. The part it doesn't give is
also real, and matters more for engineering than for theory.**

What it DOES give, VERIFIED from the above:
1. A principled reason all four target dynamics (conservation flow, FSA/DLG, Boolean
   network, ABM) belong in **one category** — generative system — rather than requiring bert
   to special-case each: they are all "a time(-or-other-support)-invariant relation over
   sampling variables drawn from a mask, evaluated via a behavior function/probability."
2. A genuine engineering interface, not just a philosophical label: mask (which variables,
   which offsets) + behavior function/probabilities = the shape every dynamics engine must
   implement. bert-lenses could define a `Mask` + `BehaviorFunction` trait pair once and
   have circuit.rs (continuous flow), an FSA stepper, a Boolean-network updater, and an ABM
   step function all be *instances*, not siblings needing separate architectures.
3. A principled home for mode-transitions and adaptation: **metasystem** — one order above
   generative, "replace the generative system per an invariant procedure." This gives
   bert-lenses's Mobus-structural → Operational transition a formal name and a family of
   precedents (scheduled mode-switch, threshold-triggered frame-swap, CA neighborhood rule,
   L-system rewrite) to draw implementation patterns from, and gives #54 a crisp question:
   is porosity a metasystem-replacement trigger or a behavior-function parameter?
4. Explicit, textually demonstrated indifference to discrete/continuous and
   deterministic/stochastic at the generative level (§3) — which is the "substrate-neutral"
   property the assignment asked me to check, and it holds up under direct reading, not just
   reputation.

What it does NOT give (gaps, flagged not glossed over):
1. **No algorithm/engine unification** — as noted in §3, "same shape" is not "same
   computation." bert-lenses still needs to build (or already has, for flow) a separate
   stepper per behavior-function kind. Klir tells you *where the seam is*, not how to write
   the four steppers.
2. **No multi-timescale nesting worked example** at odds-of-magnitude timescales within one
   run (my §1e caveat) — Klir's metasystems replace *whole* generative systems at
   support-boundaries; whether a within-run, continuously-coupled multi-timescale hierarchy
   (fast conservation dynamics nested inside slow structural adaptation, per
   `project_multitimescale_architecture.md`, UNVERIFIED this session) is best modeled as
   nested metasystem orders or needs its own construct is not settled by this text.
3. **No opinion on composition semantics** (#54's actual question in one framing): Klir's
   structure systems compose generative systems via shared variables and input/output typing
   (klir-facets.md:4435-4439, VERIFIED — "no variable is allowed to be an output variable of
   more than one element"), but that's wiring discipline, not a theory of what a *modulated*
   connection (porosity scaling a flow) *means*. That's a semantics question sitting on top of
   Klir's syntax, and Klir doesn't answer it — he gives you the slot (is porosity part of the
   mask/behavior-function, or part of a metasystem replacement condition) without telling you
   which slot is correct for bert's domain.
4. Klir's own hierarchy is a **classification of systems as objects**, not a runtime
   specification for an interactive tool — it says nothing about UI/mode-transition triggers,
   real-time stepping, or how a user should observe/interrupt a running generative system.
   That's bert-lenses's problem to solve, informed by but not answered by Klir.

**Bottom line for the K≅2 kernel work**: Klir's generative/metasystem split is a strong
candidate for the missing "why flow-conservation is not privileged" argument, and the
mask + behavior-function schema is concrete enough to prototype against. It should be
weighed against Zeigler's DEVS (which Klir himself cites as the parallel independent
framework, klir-facets.md:3573-3577, VERIFIED, and which is *specifically* built for
discrete-event/hybrid simulation — closer to bert's actual engineering need than Klir's more
philosophical treatment) before committing. That comparison is out of scope for this doc.
