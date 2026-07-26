# Does category theory give a generic account of "dynamics"?

**Status: RESEARCH.**

*Research memo — 2026-07-18. Assesses Shingai's question ("Does category theory come into play here? Perhaps.") against bert-lenses' actual dynamics zoo: conservation flows (bert-compose), FSA/DLG transitions (#67), Boolean-network trajectories, agent-based trajectories, multi-timescale hierarchies.*

**Epistemic key**: every claim tagged VERIFIED (I read the primary/secondary source directly) or UNVERIFIED (inferred, or read only an abstract/search-snippet summary, not the full argument). Where a source was fetched but returned only an abstract, I say so — that is a real evidentiary gap, not full verification of the paper's content.

---

## 0. Short answer

**Yes, with a specific, nameable mechanism — and it is not new.** The general theory is **F-coalgebra** (Rutten, *Universal Coalgebra: A Theory of Systems*, 2000): a "system" is a pair `(X, f: X → F(X))` where `X` is the state space and `F` is an endofunctor whose shape encodes *what kind* of transition structure the system has. Different dynamics kinds = different functors on the *same* schema. Deterministic automata, Mealy/Moore machines, Markov chains, and (trivially) Boolean networks are all coalgebras; Spivak's own textbook independently arrives at the same pattern from a different direction (functors out of the `Loop` schema into `Set` or a Kleisli category) without ever naming Rutten or coalgebra. Continuous-time conservation flows (bert-compose's actual domain) sit in a *related but distinct* body of work — Vagner-Spivak-Lerman's operadic "algebras of open dynamical systems" and Myers/Schultz-Spivak's double-category and sheaf treatments of *open* systems — which is about **composition** of dynamics under interconnection, not about unifying the internal transition-functor shape. These two literatures overlap but are not identical, and conflating them is the single most important thing to get right before using any of this in bert-lenses.

So there are really **two separate categorical answers** bert-lenses needs, not one:
1. **What is a dynamics-kind, generically?** → coalgebra of an endofunctor (Rutten). Answers "what shape is the transition."
2. **How do dynamics-of-different-kinds compose across a system boundary (porosity, crossing flows, #54)?** → operads/wiring diagrams and double categories of open systems (Vagner-Spivak-Lerman, Myers, Schultz-Spivak-Vasilakopoulos). Answers "how do parts' transitions become the whole's transition."

Neither is aspirational hand-waving — both have working formal definitions below, verified against primary or near-primary sources. What's aspirational is any claim that adopting this *changes bert-lenses' implementation* today. It does not have to; see §4.

---

## 1. In-vault sources: what's already there, and what's genuinely missing

### 1a. Spivak, *Category Theory for the Sciences* (`operations/systems-science/spivak/category-theory-sciences-full.md`) — VERIFIED, read directly

Spivak independently builds most of the coalgebraic pattern without ever using the word "coalgebra." This matters: it means the pattern is not exotic, it's what falls out naturally when you take "system = functor out of a schema" seriously, which is already bert-lenses' own framing (Mobus-structural schema → Operational instantiation).

- **Discrete dynamical system (DDS)** — Ex. 4.5.2.10, line 4278: a set `s` with a function `f: s → s` is called a DDS; formalized (Ex. 6.1.1.7/6.1.1.22, lines 7238, 7406) as a functor `I : Loop → Set`, where `Loop` is the one-object-one-loop-arrow schema. **This is literally a Boolean network or any deterministic out-degree-1 trajectory system** — the state set `s` can be `{0,1}^n`; nothing in the definition restricts it to be small or "meaningful," only that `f` be a total function. Spivak never says "Boolean network," but the specialization is immediate and requires no new theory (UNVERIFIED as an explicit citation — this is my own derivation, not something the text states — but it is mathematically forced, not a stretch).
- **Finite state machines as monoid actions** — §4.1.2.10, line 2891 ff. `δ: Σ × S → S` (the FSA transition function) is shown (Prop. 4.1.2.11, "Slogan" 4.1.2.12) to be *equivalent to* an action of the free monoid `List(Σ)` on `S`. This is exactly bert-lenses' DLG/FSA-native transition structure (#67's Markov/FSA simulation target). Curried, `δ: S → S^Σ` is a coalgebra of the functor `F(X) = X^Σ` — the same coalgebraic shape independently verified via a different (monoid-action) route in the same book.
- **Markov chains as a Kleisli-category instance of the SAME schema** — Ex. 7.3.4.3, line 10155. A time-homogeneous Markov chain is *literally the same `Loop → –` functor pattern*, but landing in `Kls(Dist)` (the Kleisli category of the finite-distribution monad) instead of `Set`: `δ(f): S → Dist(S)`. **This is the single most load-bearing fact in the in-vault material**: it shows that DDS (deterministic), FSA (monoid action), and Markov chains (probabilistic) are all instances of *one schema* (`Loop`), differing only in which category the functor lands in. That's coalgebra's core move — vary the functor/codomain, keep the shape — arrived at independently and without the word "coalgebra."
- **Continuous dynamical systems as monoid actions in Top** — Ex. 5.2.3.3, line 5774: `(ℝ, 0, +)` as a topological monoid, a functor `a: ℝ → Top` (equivalently a continuous action) models a continuous-time dynamical system. This generalizes the same "monoid/schema acting on a state object" pattern from discrete time (`ℕ`/`Loop`) to continuous time (`ℝ`) — directly relevant to conservation-flow ODEs, though Spivak stops at the definition and does not connect it to open/interconnected systems (that connection is external — §2).
- **Wiring diagram operad `W`** (§7.4.2.4–7.4.2.15, line 10490 ff.) — objects are finite sets of "wires," morphisms are commutative-diagram interconnection patterns, composition = pushout/substitution. Spivak cites his own 2013 paper "The operad of wiring diagrams" [ref 41] as the source. **This is the exact operad that Vagner-Spivak-Lerman (2015, §2 below) put dynamical-systems algebras on top of** — the static substrate is in-vault; the dynamics-carrying algebra on top of it is not.
- **What is absent from this book, confirmed by direct grep of the full text**: no mention of "coalgebra," "Rutten," "Myers" (David Jaz), "Willems," "behavioral approach," or "Lawvere" in connection with dynamics/state (Lawvere appears only as a name-check for foundations of set theory, lines 237–240, 5979). Spivak's own later dynamical-systems work (Vagner-Spivak-Lerman 2015, Schultz-Spivak-Vasilakopoulos 2016) postdates or sits outside this 2014 textbook and is not summarized in it.

### 1b. Mac Lane/Eilenberg, *Automata, Languages, and Machines* (`operations/systems-science/maclane/automata-languages-machines-full.md`) — VERIFIED, grepped + read directly

- The book explicitly builds **categories of automata**: "deterministic Σ-automata and their state-mappings form a category… `A(Σ)`" (line 3179), with subcategories for proper/complete automata (lines 3181–3217) and analogous categories `SM(Σ,Γ)` for sequential machines (Mealy-style, with output alphabet `Γ`) at line 21063. This is genuinely categorical automata theory, predating Rutten's coalgebra program by ~25 years (this book: 1974-ish era per copyright markers in the OCR) — it uses category-theoretic *language* explicitly (line 1140: "many of the notions... lead to categories... convenient to identify them as such") but does **not** use functor/endofunctor/coalgebra machinery to unify automata with other dynamics kinds (no functor-of-dynamics framing found; confirmed by grep — "functor" appears zero times outside the general disclaimer at line 1464 that functors/naturality/adjointness are *not* used in this book).
- **Finding, stated plainly**: this text is the historical precedent for "automata form a category," which is necessary groundwork but is NOT the coalgebraic unification claim. It shows category theory has always been *available* as a language for FSA (relevant to #67 being framed FSA-natively) but the book itself never reaches toward Boolean networks, Markov chains, or ODEs as siblings under one functorial umbrella. That reach is what Rutten supplies two decades later, externally.

### 1c. `maclane-systems-theory-connections.md` — VERIFIED, read directly

Confirms (headline finding, line 9) that CT↔systems-theory is "real but surprisingly thin at the center, thick at the periphery" — Goguen (1970s, migrated to CS and orphaned), Rosen (metabolic-repair, adjacent tradition), Ehresmann-Vanbremeersch (colimits for emergence), Spivak (the modern wave). Two entries are directly load-bearing for this memo and were *already* flagged in-vault before this research pass:
- Line 56: "David Spivak — *Category Theory for the Sciences* (2014)... Topos Institute" — confirms Spivak/Topos Institute as the modern-wave anchor.
- Line 60: "**Libkind & Myers (2025)** — 'Towards a Double Operadic Theory of Systems' — explicitly notes nobody agrees on what a 'system' is, proposes CT to relate diverse system theories" — this is the same David Jaz Myers as the external target in this assignment, already on the file. Its abstract-level content is folded into §2c below (fetched fresh, still abstract-level — UNVERIFIED beyond the abstract).
- Line 57: CyberCat (Hedges, Capucci, Gavranović, "Towards Foundations of Categorical Cybernetics," 2022) — the `Para`-construction lineage that Myers/Spivak build open-dynamical-systems composition on (§2b, §3).

**No mention in this file of Rutten, coalgebra, or Willems** — confirming those are genuinely new to this research thread, not previously catalogued.

### 1d. `table-1-1-systems-mapping.md` — VERIFIED, read directly

Not about dynamics directly; maps Mac Lane's *Form and Function* Table 1.1 (human cognitive activities) onto Mobus's SL/8-tuple. Relevant row: "Successive Actions → Composition; transformation group → Flow chains, transformation pipelines... interpretation functors" (line 30), flagged as "the activity that grounds category theory... most important row for the formal program." This is a *composition* argument, structurally the same shape as the coalgebra/operad split in §0: composition (Successive Actions row) is the wiring/operad half of the story, not the transition-functor half. The table doesn't address dynamics-kind-generality at all — no finding to report beyond noting the composition emphasis is consistent with what external material (§2) says composition actually requires.

---

## 2. External: the two literatures, verified as far as fetchable

### 2a. Rutten, "Universal coalgebra: a theory of systems" (2000) — UNVERIFIED beyond abstract/secondary summary; PDF full text not fetched (binary garble on WebFetch)

Confirmed via WebSearch snippets converging across independent secondary sources (Semantic Scholar abstract, ScienceDirect listing, multiple follow-on papers citing the definition identically):

- Core definition: an **F-coalgebra** is a pair `(X, f: X → F(X))`, `X` the *carrier* (state space), `F` an endofunctor (on `Set`, typically) whose shape is the "type" of dynamics. Bisimulation is the natural notion of behavioral equivalence, generic across all `F`.
- Named instance functors (all independently cross-verified across ≥2 secondary sources, so treated as reliable despite not reading Rutten's PDF directly):
  - **Deterministic automaton without output**: `F(X) = X^Σ` (curried transition `δ: X → X^Σ`, equivalent to `δ: Σ×X→X`) — matches Spivak's monoid-action result in §1a exactly, independently derived, convergent.
  - **Mealy machine** (input `A`, output `B`): `F(X) = (B × X)^A`.
  - **Moore machine** (structured output `T(O)`, input `I`): `F(X) = T(O) × X^I`.
  - **Streams / infinite sequences**: `F(X) = O × X` (no input — pure output-emitting trajectory).
  - **Labelled transition systems**: `F(X) = P(A × X)` (powerset — nondeterministic).
  - **Markov chains**: `F(X) = Dist(X)` (finite-distribution functor) — matches Spivak's Kleisli-category `Loop → Kls(Dist)` result in §1a exactly. Two independent formalizations (Rutten's coalgebraic and Spivak's Kleisli-functor-instance) land on the identical functor for the identical dynamics kind. That convergence is itself evidence the pattern is real, not an artifact of one author's taste.

**What this buys, concretely, for bert-lenses' zoo**:
| Dynamics kind | Functor `F(X)` | bert-lenses target |
|---|---|---|
| Boolean network trajectory (deterministic, out-degree 1) | `X` (identity) or `X^{}=X` — degenerate case of automaton functor with empty input alphabet | random-BN model, no current trajectory mode |
| Conservation flow, discretized (`Δt` stepping) | `X` (identity, if treated as a DDS on a continuous/real state space) — see caveat below | bert-compose circuit.rs |
| FSA / DLG transition (#67) | `X^Σ` | bill FSA |
| Markov/probabilistic FSA (#67) | `Dist(X)` | issue #67 explicitly |
| Mealy-style transducer (state + input → state + output) | `(B×X)^A` | any element emitting an output signal on transition, e.g. porosity-gated crossing (#54) |

**Caveat, stated honestly**: treating bert-compose's conservation-flow stepping as a bare DDS-coalgebra (`F=Id`) is technically true but nearly vacuous — it says "the next state is a function of the current state," which is what *any* deterministic simulator does, coalgebraic language or not. The coalgebra framing earns its keep only when it's doing classificatory work across *heterogeneous* functors (comparing FSA to Markov to Mealy), not when applied to a single continuous-flow system in isolation. This is the central "just re-description" risk flagged in §3.

### 2b. Vagner, Spivak, Lerman, "Algebras of Open Dynamical Systems on the Operad of Wiring Diagrams" (arXiv:1408.1598, TAC 2015) — VERIFIED at abstract level via WebFetch; full formal definitions of the G/L-algebras NOT independently verified (WebFetch returned abstract-only, PDF body not parsed)

- Confirmed: builds a symmetric monoidal category `W` → operad `O_W` (objects = "black boxes" with typed input/output ports; morphisms = wiring diagrams; composition = pushout/substitution — **this is the same operad Spivak's textbook introduces**, §1a, cross-confirmed since Spivak co-authors both).
- Two **algebras** on that operad: `G` (general dynamical systems — general systems of ODEs, `ẋ = f(x,u)`, output `y=r(x)`) and `L` (linear systems, ODE-restricted). An algebra on an operad assigns to each object a set of "things of that interface shape" and to each wiring-diagram morphism a function combining sub-box dynamics into a composite box's dynamics — i.e., **this is literally the formal answer to #54** ("does porosity modulate crossing flows" is exactly a question about how a wiring-diagram morphism's structure constrains the composite dynamics from component dynamics).
- **This is the correct home for conservation-flow ODEs**, not the coalgebra literature. Conservation flows are continuous-state, continuous-time, open (have ports/interfaces to environment) — coalgebra (Rutten) is silent on openness/interconnection; operads (Vagner-Spivak-Lerman) are specifically about that.

### 2c. Myers (and Libkind), double categories / operadic theory of open dynamical systems (arXiv:2005.05956 "Double Categories of Open Dynamical Systems," and the in-vault-flagged Libkind-Myers 2025 "Towards a Double Operadic Theory of Systems") — VERIFIED at abstract level via WebFetch (2005.05956); full body not parsed (WebFetch summarized, did not quote verbatim with page numbers)

- Confirmed from the abstract directly: "A (closed) dynamical system is a notion of how things can be, together with a notion of how they may change given how they are." **Open** systems are indexed by their *interface* (a double Grothendieck construction organizes systems-with-interfaces); two kinds of morphism are distinguished — **covariant** (trajectories, steady states, periodic orbits — i.e., the coalgebra/behavior side) and **contravariant** (plugging outputs of one system into parameters of another — i.e., the wiring/operad side). This is the field's own explicit synthesis of exactly the two-literatures split proposed in §0: Myers names both halves in one paper.
- This is squarely aspirational-but-real research literature: 2020–2025, unfinished book draft (`davidjaz.com/Papers/DynamicalBook.pdf`, confirmed via search as "0th draft" — i.e., admittedly unfinished by its own author). Citing it as "the mature standard" would overstate its maturity. Citing it as "the frontier researchers converging on exactly the split bert-lenses needs" is accurate and defensible.

### 2d. Willems' behavioral approach, categorified (Schultz-Spivak-Vasilakopoulos, "Dynamical Systems and Sheaves," arXiv:1609.08086, *Applied Categorical Structures* 2019) — VERIFIED at abstract/secondary-summary level via WebSearch, not independently read in full

- Willems' original (1980s, non-categorical) move: define a system not by an input-output map but as **a set of admissible trajectories** ("behavior") — decouples "system" from any particular representation (state-space, transfer function, etc.). Interconnection = trajectory-sharing on shared variables.
- Categorified via "behavior type" = **a sheaf on the interval domain of the real line** (glue trajectories on overlapping time-intervals the way a sheaf glues sections on overlapping opens) — this is the exact sheaf machinery Spivak's textbook covers generically in §7.2.3 (line 9452 ff., "consistent system of translation formulas is called a sheaf") but never explicitly connects to dynamics in the in-vault text (confirmed absent by grep, §1a).
- **Relevance to bert-lenses**: this is a *third* generic account, orthogonal-ish to coalgebra — behavior-first (what trajectories are admissible) rather than state-first (what function generates the next state). For a tool whose issue #54 is precisely a *semantics* question ("what does porosity modulating crossing flows MEAN, independent of any one simulator's step function"), the behavior-type framing may be the more natural fit than coalgebra, because it separates "what counts as a valid run" from "how a particular engine computes one." This is not the answer Shingai asked about by name, but it surfaced as directly relevant and should not be buried.

### 2e. Lawvere on state/time — largely a dead end for this purpose (UNVERIFIED, thin)

WebSearch surfaced only "Toposes of Laws of Motion" (1997 AMS talk, Montreal) — synthetic-differential-geometry treatment of classical mechanics (second-order ODEs) via topos-theoretic "infinitesimal object" models, not general discrete/hybrid dynamics. No direct connection found to automata, Markov chains, or agent trajectories. **Finding**: Lawvere's dynamics work is real but scoped to continuous mechanics in the SDG tradition, not a generic multi-kind dynamics theory — it does not do the unifying work Shingai's question is after, despite Lawvere's general reputation as *the* foundational categorical thinker. Flagging this explicitly so it isn't silently assumed relevant later.

### 2f. Agent-based trajectories — genuinely thin, stated as an honest gap

WebSearch found: John Baez's Azimuth blog series "Agent-Based Models" (parts 1–4, 2023, informal/expository, not peer-reviewed) discussing coalgebras for ABM dynamics and the `Para` construction (parameterized morphisms — agents affected by/affecting an external environment) as the composition mechanism; one peer-reviewed hit, "Analyzing Agent-Based Models Using Category Theory" (IEEE, no read of content, title-only). **Finding, stated plainly**: there is no mature, widely-cited categorical treatment of ABM trajectories analogous to Rutten-for-automata or Vagner-Spivak-Lerman-for-ODEs. What exists is blog-tier exploratory work by a category theorist (Baez) applying the same coalgebra+Para toolkit informally. This is the weakest link in the "coalgebra unifies everything" claim — ABM trajectories are *plausibly* coalgebras of some stochastic/nondeterministic functor over a product state space (`X = ∏ᵢ agent states`), but no one has done the formal work to show this is more than a restatement. Treat "coalgebra covers ABM" as UNVERIFIED-and-likely-shallow until better sourced.

---

## 3. What the categorical view actually buys vs. what's just re-description

**Buys something real:**
1. **A genuine classification, not just vocabulary.** The functor-table in §2a is a real taxonomy: it says precisely *how* an FSA differs from a Markov chain differs from a DDS (swap `X^Σ` for `Dist(X)` for `Id`), not just that they're "all dynamics." That's falsifiable structure, not rebranding — you can check whether a proposed new dynamics-kind fits an existing functor or needs a new one.
2. **Functorial semantics between dynamics kinds becomes a real question, with a real answer-shape.** "Is a Markov chain a generalization of a DDS?" becomes "is there a natural transformation/functor map `Id ⇒ Dist` (yes — the Dirac delta unit `η` of the `Dist` monad, confirmed in-vault at Spivak line 10149–10150) that lets any DDS be viewed as a degenerate (deterministic) Markov chain?" This is exactly the kind of question #67 (Markov/FSA sim) needs answered rigorously rather than by ad hoc code paths.
3. **Composition gets a genuine calculus, separate from the transition-shape question.** The operad/double-category half (§2b, §2c) answers #54 directly: porosity modulating crossing flow is a question about the *wiring-diagram morphism's* effect on the composite algebra, not about the internal functor of any one element. bert-lenses currently has no principled place to put that question; the operad literature is built for exactly it.
4. **A real place to stand for the multi-timescale hierarchy request.** Nested `Loop`-schema functors (a DDS whose states are themselves DDS-histories) or double-categorical "clock systems" (Myers' cited follow-on "Clock systems for stochastic and non-deterministic categorical systems theories," arXiv:2603.29573, found in the Myers search but not independently read — UNVERIFIED, flagged for follow-up) are the natural place multi-timescale composition would live. Not fetched/verified in this pass; name it as a lead, not a citation.

**Is largely re-description (be honest about this):**
1. Calling bert-compose's current Euler-stepped conservation flow "a coalgebra of the identity functor" is true but adds zero engineering leverage on its own (§2a caveat). The leverage only shows up when comparing it *against* a different functor (Mealy, Markov) — i.e., the payoff is comparative/classificatory, not implementational.
2. None of this literature tells you *how to build* a WASM-fast simulator. Coalgebra and operad theory are about *what the mathematical object is* and *how it composes*, not about execution strategy, performance, or UI. Framing this as an implementation technology would be a category error (pun intended) — it's a **specification/classification layer**, and the runtime stays whatever it already is (Rust/WASM stepping).
3. The double-category/operadic-open-systems literature (Myers, Vagner-Spivak-Lerman, Schultz-Spivak-Vasilakopoulos) is real but young (2014–2025, one explicitly an unfinished draft) and not yet battle-tested at the scale of "arbitrary interconnection of heterogeneous element types" that bert-lenses would need (conservation ports next to FSA ports next to Boolean-network ports in the same wiring diagram). No source found claiming this heterogeneous-composition case has actually been worked out anywhere. That is a genuine open research gap, not a solved problem bert-lenses can just adopt.

---

## 4. Interfacing with the Lean 8-tuple, and the honest cost

**Interface, sketched (my synthesis, not sourced — flagged as such):**

The 8-tuple `⟨C,N,E,G,B,T,H,Δt⟩` already has a slot built for exactly this: **`T` (transformation)** is the per-step function, **`H` (history)** is the accumulated trajectory, **`Δt`** is the clocking. In coalgebra terms, `T` is (the curried form of) the coalgebra structure map `f: State → F(State)`, and the *dynamics-kind* question is: **what functor is `T`'s codomain shaped like?** That's a single new piece of information to attach to `T` — not a new element of the tuple, a *refinement* of what `T`'s type is allowed to be:
- `T: State → State` (bare function) → DDS/Boolean-network/conservation-flow shape (`F = Id`).
- `T: State → State^Σ` or equivalently `Σ×State→State` → FSA/DLG shape.
- `T: State → Dist(State)` → Markov/probabilistic-FSA shape (#67).
- `T: State → (Output × State)^Input` → Mealy/transducer shape (porosity-gated crossing, #54, if a crossing event is modeled as an emitted output signal).

`H` is then, in every case, the coinductive unfolding of `T` — literally what Rutten's framework calls the **final coalgebra** (the canonical "stream of all possible futures" object that every coalgebra of a given functor maps into uniquely). This is a clean, non-disruptive fit: it says the Lean 8-tuple's `T`/`H` pair was *already* coalgebra-shaped, it just never had to say so because bert-lenses only ever instantiated one functor (`Id`, conservation flow). **This connection (T=coalgebra structure map, H=final-coalgebra unfolding) is my own inference from the definitions above, not something any source states explicitly — mark it UNVERIFIED/aspirational until it's actually checked against the Lean file (`Tuple.lean`) for whether `T`'s current type signature could even accommodate a codomain swap without breaking existing proofs.**

**Honest cost:**
- **Does it demand a rewrite? No, not to adopt as classification.** Nothing above requires touching circuit.rs, bert-core's validators, or the WASM runtime. It requires (a) picking, for each dynamics-kind bert-lenses wants to support, which functor it is, and (b) checking that choice is consistent with what `T` in the Lean spec can express.
- **Can it be adopted incrementally? Yes — that's the strongest honest recommendation this memo can make.** Treat the functor table in §2a as a **design checklist**, not a runtime library: for issue #67 (Markov/FSA), the deliverable is "confirm `T: S → Dist(S)` is representable given the current `T` type, and that composing it with the existing conservation-flow `T: S → S` doesn't require a shared supertype yet" — a scoping question, answerable in an afternoon, not a rewrite.
- **What it does NOT license**: claiming today that bert-lenses "is" a coalgebraic or operadic tool, or that adopting this vocabulary externally (papers, positioning docs) is backed by an implementation. It isn't yet. The honest framing, if this ever goes into a paper or the kernel-authority doc, is: *"dynamics-kind is classified by the codomain functor of the transformation map, following Rutten's universal coalgebra; open-system composition of heterogeneous dynamics-kinds is an active, unsettled research frontier (Myers 2020–2025, unfinished), not a solved engineering pattern bert-lenses can cite as already-adopted."*
- **Biggest concrete unresolved gap for bert-lenses specifically**: the operadic/wiring-diagram literature (§2b, §2c) that would answer #54 has NOT been shown (by anyone found in this search) to handle **heterogeneous** interconnection — Vagner-Spivak-Lerman's `G`-algebra is ODE-only, Rutten's coalgebra is single-functor-at-a-time. Wiring a conservation-flow element to an FSA element in one composite dynamics is the actual shape of bert-lenses' problem and does not have a citable, verified solved treatment. That is the most important honest finding of this whole memo: **the classification half (coalgebra) is solid and low-risk to adopt; the heterogeneous-composition half (needed for #54 and for mixing FSA next to conservation-flow elements in one model) is a genuine open problem, not an off-the-shelf answer.**

---

## 5. Bottom line for Shingai

Category theory does come into play — but as **two separable, well-defined technical answers** (coalgebra for "what shape is a dynamics," operads/double categories for "how do dynamics compose across a boundary"), not as one grand unification. The coalgebra half is mature (2000, Rutten), independently re-derived inside Spivak's own textbook already in-vault, and directly gives a functor for every dynamics-kind on the list except agent-based trajectories (thin literature) and multi-timescale hierarchies (a lead, not yet verified). The composition half is real but young, and its hardest case for bert-lenses — heterogeneous wiring across dynamics-kinds — is an open research question, not a citable solved pattern. Adopting the coalgebra classification costs nothing structurally (it's a typing discipline on `T`, checkable against the Lean 8-tuple this week); claiming the composition story is settled would be overclaiming.
