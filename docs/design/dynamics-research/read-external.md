# External literature: what counts as "dynamics"?

Research pass for bert-lenses dynamics generalization (issue #67 Markov/FSA sim, #54 porosity semantics,
Boolean-network trajectory mode). Question: is there a substrate-neutral formal definition of "dynamical
system" broad enough to cover conservation-flow ODEs (what bert-compose runs today), FSA/DLG state
machines, Boolean-network trajectories, agent-based trajectories, and multi-timescale hierarchies —
without picking flow-conservation as the one true answer the way Mobus's embedded-JS-per-element approach
implicitly did (ch4 lines 509/535/560, UNVERIFIED here — not re-checked this pass, cited from standing
context).

Every claim below is marked **VERIFIED** (I read the primary or the cited secondary text myself, this
session) or **UNVERIFIED** (inferred, recalled, or sourced only from a search-engine summary I could not
open and confirm). Page/line numbers are given wherever the source was actually opened.

---

## 1. Willems' behavioral approach — the strongest candidate for the generic account

**VERIFIED**, read in full: `/Users/home/Zotero/storage/U4CJSMHZ/willems-2007-behavioral-approach.pdf`
— J.C. Willems, "The Behavioral Approach to Open and Interconnected Systems," *IEEE Control Systems
Magazine*, vol. 27, no. 6, Dec 2007, pp. 46–99. (Extracted to `/tmp/dynresearch/willems-2007.md`,
259,933 chars — not copied into this repo per instructions; quote line numbers below refer to that
extraction, page numbers are the article's own printed page numbers.)

### The definition (p. 51, article's own page number)

> "For dynamical systems, the independent variable is time, and the set of independent variables is
> therefore a subset of ℝ... The set of dependent variables W is the set in which the outcomes of the
> signals being modeled take on their values. We call T the time axis and W the signal space. Hence a
> dynamical system is defined as a triple
> Σ = (T, W, B)
> with the behavior B a subset of W^T, where W^T denotes the set of all maps from T to W."
> "The behavior B is the central object in this definition. The behavior formalizes which trajectories
> w : T → W are possible, according to the model." (p. 51)

So: pick a time axis, a signal space, and declare a subset of all possible trajectories to be the
admissible ones. That subset — not a state equation, not an input/output map — *is* the model.

### Behavior is primary; state is a derived, optional latent variable

This is the single most load-bearing claim of the paper and it is explicit (p. 53, p. 69):

> "A dynamical system with latent variables is defined as Σ_full = (T, W, L, B_full), where T is the time
> axis, W is the set of manifest variables, L is the set of latent variables, and B_full ⊆ (W×L)^T is the
> full behavior... The system Σ_full induces, or represents, the manifest dynamical system Σ = (T, W, B)"
> (p. 53, lines 720–730 in extraction)

> "Obviously, a state-space model is a special case [of the latent-variable form], with the state a latent
> variable." (p. 53, lines 843–844)

> "The state of a dynamical system is a central concept in areas such as control, physics, **automata,
> discrete-event systems**, and algorithms... In behavioral theory the state is viewed as a special type
> of latent variable... There is no reason to give the state the central role in models for dynamical
> systems that it has been given. The state is a special, and very useful, latent variable that is
> constructed such that the past and future trajectories become conditionally independent given [the
> state]." (p. 69, lines 2487–2499)

**Important scope caveat, stated plainly rather than inferred:** Willems *names* automata and
discrete-event systems as domains where "state" matters, listing them alongside control/physics/algorithms
— but this 2007 article itself only *develops* the formalism for continuous-time differential systems
(LTI differential systems occupy essentially the whole paper). He does not, in this text, actually work
out a DES or automaton example inside the (T,W,B) formalism. So the (T,W,B) triple is stated with enough
generality (T is just "a time set," W just "a signal space," no continuity/differentiability required by
the base definition) to *accommodate* discrete/automaton dynamics, but Willems does not demonstrate it
here. This is an absence, not a claim he makes and fails to support — worth flagging as a genuine gap
rather than reading it in either direction.

### What it excludes / struggles with

**UNVERIFIED** (from a search-engine-summarized secondary source, the n-Category Café blog post on the
behavioral approach, not independently confirmed against a primary Willems text): stochastic systems,
contact mechanics / n-body problems, and components with genuinely asymmetric input/output semantics (e.g.
ideal amplifiers) are named as places the trajectory-set framework is awkward or contested. Treat this as
a lead to verify against Willems 1991 ("Paradigms and Puzzles in the Theory of Dynamical Systems," IEEE
Trans. Automatic Control — also in Shingai's library at
`/Users/home/Zotero/storage/NRXKIFUE/willems-1991-paradigms-puzzles.pdf`, **not opened this pass**) before
relying on it.

### Verdict for bert-lenses

Behavior-as-trajectory-set is exactly general enough for the instrument's actual requirement: conservation
flows are one behavior-generating mechanism (an ODE constraint on B), FSA/DLG transitions are another (a
combinatorial constraint on B over a discrete T), Boolean-network trajectories are a third (deterministic,
out-degree-1 constraint on B). All three are "the same kind of thing" — a declared subset of W^T — under
this definition, which is precisely the substrate-neutral framing the tool currently lacks. The cost is
that (T,W,B) alone is *too* general to be directly implementable — it says nothing about *how* B gets
specified (equations, automata, rules) — so it's a philosophical anchor, not a data structure. Latent
variables give the right vocabulary for "state" without hard-coding conservation-of-flow semantics into
the kernel: a BERT model's Mobus state (stocks) is *a* choice of latent variable, not *the* definition of
dynamics.

---

## 2. Mesarovic & Takahara — system as set-theoretic relation, dynamics as an added semigroup property

**VERIFIED**, read in full: `/Users/home/Zotero/storage/ZA3E2PD3/Mesarovic and Takahara - General Systems
Theory: Mathematical Foundations`, Academic Press, 1975 (OCR'd — image-based PDF, 77,845-char extraction
at `/tmp/dynresearch/mesarovic-takahara.md`). Page numbers below are the book's own printed pagination
(visible in the OCR as running headers).

### Definition 1.1 — a system is a relation (p. 11)

> "A (general) system is a relation on nonempty (abstract) sets S ⊆ ×{V_i : i ∈ I}... A component set V_i
> is referred to as a system object."

This is the entry point for the whole book (Chapter II, "Set-Theoretic Concept of a General System").
Definition 1.2 splits the index set I into input objects X and output objects Y, giving S ⊆ X × Y, the
"input-output system." Definition 1.3 restricts further to S: X → Y, the "function-type system."

**Independently corroborated** by a 1975 *Bulletin of the AMS* review I also read in full (Albert A.
Mullin, review of the same book, *Bull. Amer. Math. Soc.* 81(6), Nov 1975, pp. 1042–1044,
`/tmp/dynresearch` webfetch cache): "The point of entry for the authors' development of a general systems
theory is the identification of a *system* with a set-theoretical relation. This approach certainly has
the feature of generality and abstractness to it." Mullin's review also flags the book's actual
limitation, which matters for us: "little content in the results... the authors prove little that does
not depend on the use of more formidable algebraic structure for the sets" — i.e., the relation-only
definition buys generality but almost no theorems; the interesting results all require adding linear-space
structure back in. This is a real methodological warning for anyone tempted to stop at "dynamics = a
relation" and expect it to do work.

### General time system (p. 16–17) and general dynamical system (p. 20–21)

Definition 2.1 (p. 17): "A time set... is a linearly ordered (abstract) set" — no metric, no group
structure required by default (though it's noted additional structure like an Abelian group can be added
when needed). This alone is a stronger unification move than Willems' T ⊆ ℝ: it explicitly does not assume
time is real-valued or even numeric, only ordered.

Definition 2.2 (p. 17): "A **general time system** S on X and Y is a relation on X and Y" where X ⊆ A^T,
Y ⊆ B^T are sets of abstract time functions over an arbitrary time set T. This is structurally identical
to Willems' (T,W,B) — a relation/subset of time-indexed functions — arrived at independently and about 30
years earlier (1975 vs. Willems' mature statements in the 1980s–2000s, though Willems' own foundational
papers on the behavioral approach also date to the late 1970s–80s per citation [5] in the 2007 article,
**UNVERIFIED** exact date not checked this pass).

The crucial move, and the one directly useful for bert-lenses, is that **"time system" and "dynamical
system" are not the same thing** — dynamics is an *additional* structure imposed on a time system, not a
synonym for it. Definition 2.7 (p. 21):

> "A time system S ⊆ X × Y is a **dynamical system** (or has a dynamical system representation) if and
> only if there exist two families of mappings ρ = {ρ_t : C_t × X_t → Y_t}, the response family, and
> φ = {φ_{tt'} : C_t × X_{tt'} → C_{t'}}, the state-transition family, such that (α) ρ is consistent with
> S, and (β) φ satisfies the composition property φ_{t't''}(φ_{tt'}(c,x),x') = φ_{tt''}(c,x·x') [the
> **semigroup property**]."

So on this account: a general system is just a relation; a time system is a relation on time-indexed
functions (arbitrary ordered time, not necessarily ℝ or ℕ); and a *dynamical* system is a time system for
which you can additionally exhibit a state object C and a state-transition family φ satisfying the
semigroup/composition axiom. This is exactly the abstraction bert-lenses needs: **conservation flows,
FSA/DLG transitions, and Boolean-network updates are all "time systems," and all three become "dynamical
systems" in this strict sense by exhibiting their own state-transition family** — an ODE flow, a
transition-function δ, or a Boolean update function respectively — each satisfying the same semigroup
composition law (do t→t' then t'→t'' = do t→t'' directly). The semigroup property is the one formal
invariant that should hold across every mode bert-lenses runs, and it's a clean acceptance test: whatever
"Run" does per-mode, its state-transition family must compose.

### Verdict for bert-lenses

Best-documented case for splitting the kernel into two layers: (1) a *system* layer (K≅2's C,N,E,B,G —
already just structure, no time), and (2) a *dynamical-system* layer that is *any* (state-object,
state-transition-family) pair satisfying the semigroup composition axiom over *some* linearly ordered time
set — not necessarily ℝ, not necessarily requiring conservation. This directly licenses treating FSA
transitions and Boolean-network updates as first-class dynamics rather than as a different kind of thing
bolted alongside "real" (flow) dynamics. Mullin's warning stands, though: the definition alone proves
nothing; whatever bert-lenses' engine does per-mode still has to be built, this only tells you the shape
the contract must have.

**Additional related holding, not opened this pass:** `/Users/home/Zotero/storage/E2SDDQCQ/Cody - 2021 -
Mesarovician Abstract Learning Systems.pdf` — a 2021 paper applying the Mesarovic-Takahara apparatus to
learning systems; flagged as a lead, not read.

---

## 3. Zadeh on the concept of state — access gap, report the gap honestly

**UNVERIFIED at the primary-source level.** Zadeh's actual papers — "The Concept of State in System
Theory" (in Mesarovic, ed., *Views on General Systems Theory*, 1964) and the *System Theory* volume he
co-edited with E. Polak (McGraw-Hill, 1969) — were not locatable as full text through web search or
WebFetch in this session (only bibliographic records, Google Books stubs, and a USPTO/NASA citation
turned up). I did not find either text in Shingai's Zotero library either (filename search for "Zadeh"
returned only `Zadeh - A Framework for the Analysis of Humanistic Systems.pdf`, a different, later paper
on fuzzy/humanistic systems, **not opened this pass** and not obviously about the state-concept question).

What I *did* read in full is a different paper with the *same title* as Zadeh's, by a different author,
which explicitly builds on the same tradition: Siegfried Wendt, "The Concept of 'State' in System Theory"
(University of Kaiserslautern, 1998), fetched from `fmc-modeling.org` and read completely (5 pages). This
is **Wendt's own exposition**, not a quotation of Zadeh — I am flagging that distinction because it would
be easy to misattribute. Wendt gives a unified continuous/discrete state-machine account:

- Continuous: Y(t) = ω[Z(t), X(t)] (output function), Z(t+Δt) = δ[Z(t), "X(τ)" for t≤τ<t+Δt] (state
  transition function, taking a *course* — a function over an interval — as argument, "a kind of
  integration").
- Discrete: Y(n) = ω[Z(n), X(n)], Z(n+1) = δ[Z(n), X(n)] — explicitly identified as "the so-called state
  machine model by Mealy."
- Wendt is explicit that the two are the same formula family with t/τ (continuous index) swapped for n/j
  (discrete index) — a direct, worked instance of the discrete/continuous unification bert-lenses needs,
  independent of whether it is faithful to Zadeh's original wording.

**Verdict:** cite Wendt as a corroborating unified-state-machine account, not as Zadeh. The literature
does converge, independently, on "state = the part of context found by looking into the system, such
that Y=ω(Z,X) and Z updates via a transition function" as the substrate-neutral notion of state — which is
compatible with, and looks like a less abstract restatement of, Mesarovic-Takahara's response/
state-transition-family pair. Getting Zadeh's own words would require the physical 1964/1969 volumes;
worth a targeted library/ILL request if this becomes load-bearing, not worth more search-engine time now.

---

## 4. Padulo & Arbib — inaccessible this pass, flagged not fabricated

**UNVERIFIED / could not access.** *System Theory: A Unified State-Space Approach to Continuous and
Discrete Systems* (Saunders, 1974, 779pp) is confirmed to exist and to be exactly on-topic by title (a
1978 *Journal of Cybernetics* review blurb was found but not opened), but no excerptable text, review with
substantive content, or library copy surfaced through web search. Not in Shingai's Zotero (filename search
for "Padulo" returned nothing). I am not going to characterize its contents beyond the title's own claim
— doing so would be fabrication. If this framework is needed, it requires physical/library access; flagging
as a genuine gap rather than guessing at a "unified state-space" formalism from the title alone.

---

## 5. Wymore — T3SD, verified via a 2021 paper that explicitly bridges it to DEVS

**VERIFIED**, read in full: `/Users/home/Zotero/storage/BNPE2684/Wach et al. - 2021 - Conjoining Wymore's
Systems Theoretic Framework and the DEVS Modeling Formalism Toward Scientific Foundations.pdf` (in
Shingai's Zotero; 109,197-char extraction). This is a secondary source explaining and formalizing Wymore's
Tricotyledon Theory of System Design (T3SD), not Wymore's own 1967/1993 texts, but it quotes Wymore's core
equations directly with citation to the original.

### T3SD's discrete system model (Appendix B, eq. A1, citing Wymore [20] — i.e., Wymore's own original
formalization)

> "The basic mathematical definition of a discrete system model in T3SD is defined as a quintuple:
> Z = (S_Z, I_Z, O_Z, N_Z, R_Z), where Z is the name of the system, S_Z is the set of its states, I_Z is
> the set of its inputs, O_Z is the set of its outputs, N_Z is its next-state function, and R_Z is its
> readout function."

This is a Mealy-machine-shaped quintuple — states, inputs, outputs, next-state function, output/readout
function — i.e., structurally identical to the FSA formalism bert-lenses' DLG mode already needs for
issue #67 (Markov/FSA simulation). The paper's whole thesis (title: "Conjoining Wymore's... and DEVS...")
is that Wymore's system definition already underlies DEVS (Discrete Event System Specification, Zeigler),
and the paper works to make that pairing rigorous: "the basis of DEVS on Wymore's system definition
suggests that the foundation for the pairing of DEVS with T3SD is already present." (line 2681 in
extraction, citing Mesarovic & Takahara's later *Abstract Systems Theory*, Springer 1989, as a shared
ancestor — so Wymore, DEVS, and Mesarovic-Takahara are three branches of the same 1960s–70s
relation/automaton lineage, not independent inventions.)

### What T3SD is *for*, and what it is not

T3SD's tricotyledon structure — one "leaf" for behavior models, one for available technologies, one for
the technologies-that-satisfy-the-behavior-models intersection — is a **systems-engineering design theory
(does a candidate implementation meet a spec?)**, built *on top of* a dynamical-system core (the port
automaton / discrete-system quintuple above), not itself a new account of dynamics. The dynamics primitive
is the quintuple; T3SD is what you do with many candidate quintuples once you have them (compare, rank,
select). This matters for scoping: Wymore is directly relevant to *modeling* FSA/DLG dynamics (the
quintuple is a ready-made automaton formalism) but not to the philosophical "what counts as dynamics"
question beyond confirming that automata are dynamical systems in exactly the Mesarovic-Takahara sense
(state-transition function + output function).

---

## 6. Hybrid automata — the discrete+continuous unification, formally

**VERIFIED**, read via Wikipedia's "Hybrid automaton" article (accessed directly, content matches the
well-known Alur–Henzinger formalization; cross-checked against search-engine summaries of the primary
Henzinger "The Theory of Hybrid Automata" LICS 1996 paper, which agree — but I did not open the LICS paper
itself this pass, so treat the *exact wording* below as **UNVERIFIED against the primary**, the *structure*
as reliable).

### The tuple

A hybrid automaton H comprises:
1. **Continuous variables** X = {x₁,...,xₙ}, plus Ẋ (derivatives) and X' (post-transition values).
2. **Control structure**: a finite multidigraph (V, E) — vertices = "control modes" (discrete locations),
   edges = "control switches" (discrete transitions).
3. Per-mode predicates: `init(v)` (initial condition), `inv(v)` (invariant — the mode may only be occupied
   while this holds), `flow(v)` (an ODE/flow condition over X ∪ Ẋ — continuous dynamics *within* the mode).
4. Per-edge predicates: `jump(e)` (guard/reset condition over X ∪ X'), and an event label.

### What it covers, and what it doesn't

Covers exactly bert-lenses' actual requirement set: continuous flow *within* a mode (bert-compose's
conservation ODEs) plus discrete mode-switching *between* modes (FSA/DLG transitions) as two halves of one
formal object, with the mode-invariant/guard apparatus giving a principled place to put "when does this
system stop being in Operational mode" logic. **Undecidability is the real cost**: reachability is
undecidable for general hybrid automata (a straightforward reduction from counter machines using three
continuous variables proves this); decidable subclasses exist (timed automata — uniform-rate variables;
initialized rectangular automata; piecewise-constant-derivative systems) but they're restrictive. For an
interactive authoring/simulation tool rather than a verifier this is likely an acceptable cost — bert-lenses
doesn't need to *prove* reachability properties, just *simulate* forward — but it's worth naming as the
formal price of adopting the fully general hybrid-automaton account rather than a restricted decidable
subclass.

Boolean networks and agent-based trajectories both fit as degenerate hybrid automata (no continuous
`flow`, pure discrete `jump`/mode structure, or the reverse — Boolean networks are arguably *purely*
discrete-mode with trivial X). This suggests hybrid automata are a reasonable *implementation* target for
"one runtime, many dynamics," even though (per §1–2 above) they're not the most philosophically primitive
account — they're closer to Wymore's quintuple/DEVS lineage with continuous flow spliced in, i.e., a
specific representation of a Mesarovic-Takahara "dynamical system," not a rival to the relation/behavioral
definition.

---

## 7. General dynamical systems — the classical Birkhoff/semigroup-action minimal answer, plus two verified modern variants in Shingai's own library

**UNVERIFIED at the primary-Birkhoff level.** G.D. Birkhoff's 1927 *Dynamical Systems* (AMS Colloquium
Publications) is confirmed by search-engine summary (not opened) to be the origin of qualitative/topological
dynamical-systems theory. The classical minimal definition — attributed by search-engine summary, not
independently verified against a primary topological-dynamics text — is: a dynamical system is a pair
(X, T) where X is a phase space and T is a group or semigroup of self-maps of X acting on it (equivalently,
a continuous action π: S × X → X of a topological semigroup S on a Hausdorff space X). This is the
"minimal classical answer" the task description asked for. I could not verify exact wording or a citable
page this pass — flagging as UNVERIFIED, worth a direct check against e.g. Nemytskii & Stepanov,
*Qualitative Theory of Differential Equations* (the standard reference for this exact formulation) if it
becomes load-bearing.

**What I *can* verify** is that Shingai's own Zotero library holds two papers that are explicitly in this
"generalized dynamical system via a state-transition/semiflow map" lineage, both read in full this pass:

**(a)** Michael Zargham & Jamsheed Shorish, "Generalized Dynamical Systems Part I: Foundations," WU Vienna
working paper, 14 Jul 2022 (`/Users/home/Zotero/storage/EZBZDWEN/`, 45,469-char extraction, VERIFIED). Their
stated goal (p. 3 of the extraction, their own framing) is explicitly to generalize "the theory of dynamical
systems beyond smooth manifolds to arbitrary data structures. State spaces must be made up of 'dimensions'
which are abstract classes, and points in these state spaces are instances of those classes... The dynamics
of these systems can be any transformation from the state space to itself." Their core chain of definitions:

> Def 2.1 State Space: "the collection of all objects X that are sufficient to define a dynamical system."
> Def 2.2 State: "an object x ∈ X that represents the current configuration of the system."
> Def 2.3 (State) Trajectory: "a sequence of States x₀, x₁,..."
> Def 2.6 State Update Map: f : X × U_x → X.
> Def 2.9 State Transition Map: h : X → X, h(x) := f(x, g(x)) — i.e., closing the loop with an input-selection
> map g gives an autonomous self-map of X.
> Def 2.10 (Autonomous) Generalized Dynamical System (GDS): the pair {h, X}.

This is the Birkhoff-style "semigroup acting on a state space" definition, restated for arbitrary abstract
data structures rather than smooth manifolds — and it's explicitly motivated (their intro, not re-quoted
here in full) by wanting dynamics over things like governance contracts and agent decisions, i.e., exactly
the non-continuous, non-conservation cases bert-lenses needs (Boolean networks: X = {0,1}ⁿ, h = the update
rule; ABM trajectories: X = joint agent-state space, h = one simulation step). This is a strong, directly
citable, already-in-library answer to "the minimal classical account, modernized for arbitrary state
structure."

**(b)** Emilio Roxin, "On Generalized Dynamical Systems Defined by Contingent Equations," *Journal of
Differential Equations* 1, 1965, pp. 188–205 (`/Users/home/Zotero/storage/XKJ5XZW8/`, 27,497-char
extraction, VERIFIED). This is a *different* generalization axis from (a) — it generalizes dynamical
systems to allow **non-unique trajectories** (differential inclusions / "contingent equations," following
Marchaud, Zaremba, and Barbashin, who is credited (§1, p. 191 of the extraction) with introducing
"generalized dynamical systems" in this specific technical sense). A contingent equation replaces "the"
derivative ẋ = f(x,t) with a *set* of admissible tangent directions C(x,t) ⊆ X, so multiple trajectories
can emanate from one point. **Relevance flagged but not oversold:** this is about existence/non-uniqueness
of continuous trajectories, not about discrete/hybrid unification — it's the "generalized dynamical
system" label attached to a different problem than the one bert-lenses has. Worth knowing the term is
overloaded in the literature (Barbashin/Roxin's "generalized dynamical system" ≠ Zargham/Shorish's), so as
to not conflate them when citing "generalized dynamical systems" in future bert-lenses docs.

### Verdict for bert-lenses

Zargham & Shorish (2022) is the best already-verified, already-in-library instance of "dynamics = a
self-map h: X → X of an arbitrary state space X, with trajectories as its orbits" — the classical
semigroup-action idea stripped of any assumption that X is a manifold or that time is continuous. It is a
clean, modern, directly citable formalization that a Boolean-network mode (X = {0,1}ⁿ) and an ABM mode
(X = joint agent state) both instantiate exactly, with bert-compose's conservation-flow engine being the
special case where X carries a linear/vector-space structure and h arises by integrating a flow field.

---

## 8. Categorical stock-and-flow diagrams — yes, this literature exists and is recent

**VERIFIED**, read in full via direct PDF extraction from arXiv (not via WebFetch, which failed to decode
the PDF twice — extraction done via the zotero skill's pdftotext pipeline against the downloaded arXiv PDF,
54,682-char extraction at `/tmp/dynresearch/stockflow-cat.md`): John Baez, Xiaoyan Li, Sophie Libkind,
Nathaniel D. Osgood, Evan Patterson, "Compositional Modeling with Stock and Flow Diagrams," *Electronic
Proceedings in Theoretical Computer Science* 380 (ACT 2022), arXiv:2205.08373.

### The formal structure

A **primitive stock-flow diagram** is a functor F: H → FinSet, where H is a fixed small index category
whose objects/morphisms encode "stock," "flow," "link," and the source/target relations among them (§3.1).
`StockFlow` is the category with these as objects; open (composable) versions are built via **decorated
cospans** (Fong's framework) so that stock-flow diagrams can be glued together along shared boundary
stocks — the compositional payoff (§3.2–3.3, Theorem 3.1).

### The dynamics semantics, verified precisely (§3.4, Theorem 3.2–3.3)

Separately, `Open(Dynam)` is defined (attributed to Baez–Pollard) as the category whose objects are finite
sets and whose morphisms are **open dynamical systems** — and their "dynamical system" here is concretely
a vector field: for stock set S, a dynamical system on S is a function v: ℝ^S → ℝ^S (a right-hand-side for
ẋ = v(x)). The semantics functor θ: C ⇒ D (Theorem 3.3) sends each stock-flow diagram to the ODE vector
field obtained by summing signed flow rates in and out of each stock (their eq. 2, worked out explicitly
in the extraction — literally the standard system-dynamics stock-flow-to-ODE translation, now given a
functorial/compositional proof of well-definedness under gluing).

### What it covers, and — verified as an absence, not fabricated — what it doesn't

Covers: exactly bert-compose's conservation-flow engine, formalized compositionally (diagrams glue, and
gluing commutes with taking the ODE semantics — that commutation is the actual theorem, not the ODE
translation itself, which was already standard practice). This is real, useful, on-topic, recent (2022)
work directly validating that "stock-and-flow → ODE" is a mathematically principled special case, not an
ad hoc choice.

Does **not** cover: I read the full paper (both the modeling section and the AlgebraicJulia/Catlab
implementation section) and found no discussion of discrete-event transitions, hybrid switching, or
stochastic dynamics — `Open(Dynam)`'s objects are, by the definition actually stated (§3.4), continuous
vector fields on ℝ^S. This is an absence I confirmed by reading the relevant section, not an inference from
silence elsewhere in the paper. If bert-lenses wants a categorical account that also covers FSA/DLG or
Boolean-network modes, this specific paper's `Open(Dynam)` is not it as written — though the broader
AlgebraicJulia ecosystem the authors cite (Catlab, decorated/structured cospans generally) is
substrate-agnostic in principle and *could* host a discrete-transition-system analogue; that would be new
work, not something this paper already provides.

### Verdict for bert-lenses

Directly relevant precedent for "formalize the compositional/gluing structure of stock-flow diagrams
categorically, get the ODE semantics as a theorem about a functor" — validates that bert-compose's engine
sits on solid, actively-developed theoretical ground. Does not, by itself, extend to the FSA/Boolean/agent
modes; those would need either a second semantics functor (discrete-transition-system valued) glued in
alongside this one, or a hybrid-automaton-valued semantics functor covering both — which nothing found
this pass actually constructs.

---

## Zotero sweep — what's already in Shingai's library

Ran `./scripts/zotero_pdf_workflow.sh find` (filename match, cheap) for: Willems, Mesarovic, Zadeh, Wymore,
"hybrid automata," "dynamical system," "stock and flow," Birkhoff, Padulo, "behavioral approach." No
full-text search run (per instructions, reserved for narrow phrases only — not needed this pass since
filename search already surfaced everything used above).

**Hits, all VERIFIED to exist at these paths (I opened five of them; the rest are listed but not opened
this pass):**

| File | Opened this pass? |
|---|---|
| `FRIGBC4G/willems-1972-dissipative-systems.pdf` | No |
| `U4CJSMHZ/willems-2007-behavioral-approach.pdf` | **Yes** — primary source for §1 |
| `NRXKIFUE/willems-1991-paradigms-puzzles.pdf` | No — flagged in §1 as the next place to verify the stochastic/asymmetric-I/O exclusions claim |
| `MFD4EGYY/Mesarovic - AL, GENERAL SYSTS THEORY AND ITS MATHENLATICAL FOUNDATION.pdf` | No (near-duplicate of the one opened) |
| `QMQB9R4K/Mesarovic - GENERAL SYSTEMS THEORY AND ITS MATHEMATICAL FOUNDATIONS.pdf` | No (near-duplicate) |
| `ZA3E2PD3/Mesarovic and Takahara - General Systems Theory Mathematical Foundations.pdf` | **Yes** — primary source for §2 |
| `E2SDDQCQ/Cody - 2021 - Mesarovician Abstract Learning Systems.pdf` | No — flagged in §2 |
| `8JDE8WR6/Zadeh - A Framework for the Analysis of Humanistic Systems.pdf` | No — not the state-concept paper, flagged in §3 |
| `BNPE2684/Wach et al. - 2021 - Conjoining Wymore's...DEVS...pdf` | **Yes** — primary source for §5 |
| `XKJ5XZW8/Roxin - 1965 - On generalized dynamical systems...pdf` | **Yes** — source for §7(b) |
| `EZBZDWEN/Zargham and Shorish - 2022 - Generalized Dynamical Systems Part I.pdf` | **Yes** — source for §7(a) |

No hits at all for: "hybrid automata," "stock and flow," "Birkhoff," "Padulo." These four gaps are real —
not a search-syntax failure (filenames were checked against straightforward substrings that would catch
author-surname or short-title conventions used elsewhere in the library) — so if hybrid-automata or
categorical-stock-flow theory becomes load-bearing for bert-lenses, that reading has to come from outside
Shingai's existing collection; the arXiv/Wikipedia sources cited in §6 and §8 above are the current best
available, already fetched.

**Headline finding on the library sweep itself:** Shingai's Zotero already contains primary Willems (2007,
1991, 1972) and primary Mesarovic-Takahara (the actual 1975 book, in triplicate/near-duplicate — worth a
dedup pass sometime) — i.e., the two strongest candidates for "the generic account" were already sitting
in the collection, unread for this specific question until this pass. The Wymore-DEVS bridge paper (Wach
2021) was also already there. Nothing had to be newly acquired to answer 5 of the 8 target frameworks at
VERIFIED, primary-or-near-primary depth.

---

## Cross-cutting synthesis (for whoever picks this up next)

Three genuinely different formal moves are on offer, and they are not competitors — they answer different
questions bert-lenses actually has:

1. **"What is a system, prior to any dynamics?"** → Mesarovic-Takahara Definition 1.1: a relation on
   abstract sets. (Already effectively what K≅2's C,N,E,B,G give you, structurally.)
2. **"What makes a system dynamical?"** → Mesarovic-Takahara Definition 2.7: a time system (relation on
   time-indexed functions, arbitrary linearly-ordered time) *plus* a state-transition family satisfying the
   semigroup composition axiom. This is the substrate-neutral generalization target named in the
   assignment — verified, with a citable page number, and it is agnostic to whether time is ℝ, ℕ, or some
   other ordered set, and agnostic to whether the state-transition family is continuous flow, an FSA δ, or
   a Boolean update rule.
3. **"What does the state-transition family actually equal, concretely, for a given mode?"** → this is
   where Willems' behavior-as-trajectory-set (mode-agnostic declaration of admissible trajectories),
   Zargham-Shorish's h: X→X self-map (mode-agnostic orbit generator), hybrid automata (a specific
   discrete+continuous representation), and the categorical stock-flow ODE functor (a specific
   continuous-only representation) all live as *particular instances* of #2's abstract state-transition
   family — each is a different concrete answer to "how is φ specified," not a different definition of
   dynamics.

The practical implication: bert-lenses' "Run = a mode transition" framing (Mobus-structural → Operational)
already has the right shape at level #1–2; the actual engineering gap is that only one instance of #3
(conservation-flow ODE, via bert-compose's circuit.rs) is implemented, and the kernel doesn't yet expose a
seam for "state-transition family satisfying the semigroup axiom" as a pluggable thing FSA/DLG, Boolean
networks, and ABM trajectories could each fill in as siblings of the flow engine rather than as
bolted-on exceptions.
