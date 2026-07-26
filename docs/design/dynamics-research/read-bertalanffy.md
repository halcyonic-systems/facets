# Bertalanffy on Dynamics — GST 1968, primary-text read

Source: Von Bertalanffy, L. *General System Theory: Foundations, Development, Applications* (1968), George Braziller. Full-text extraction at [`../../archive/gst-1968-full.md`](../../archive/gst-1968-full.md) (from `/Users/home/Zotero/storage/GF2IPGGQ/Von_Bertalanffy_Ludwig_General_System_Theory_1968.pdf`, OCR — some line-wrap/character garbling in equations, noted where relevant). All page numbers below are the printed page numbers as they appear inline in the OCR text (isolated numeral lines between paragraphs) — VERIFIED by direct read of that PDF's extracted text, not the vault's derivative notes files (`General System Theory-merged.md`, `bertalanffy-direct-quotes.md` — these are secondary notes/theses about GST, not GST itself, and do not contain the equations; checked, confirmed thin).

Everything below is VERIFIED (I read the passage in the extracted PDF text) unless marked UNVERIFIED.

---

## (a) The differential-equation formulation of "system" — eq. (3.1)

**Location:** Chapter 3, "Some System Concepts," pp. 56–58.

Bertalanffy's *first formal move* in the book: define "system" itself via a set of simultaneous ODEs.

> "A system can be defined mathematically in various ways. For illustration, we choose a system of simultaneous differential equations. Denoting some measure of elements, p, (i = 1, 2, ...n), by Q₁, these, for a finite number of elements and in the simplest case, will be of the form: [eq. 3.1]" (p.56)

The OCR mangles the equation itself, but the surrounding text (p.57) states it explicitly in words:

> "Change of any measure Qᵢ therefore is a function of all Q's, from Q₁ to Qₙ; conversely, change of any Qᵢ entails change of all other measures and of the system as a whole." (p.57)

i.e., eq. (3.1) is the canonical **dQᵢ/dt = fᵢ(Q₁, Q₂, ... Qₙ)**, i = 1...n — a coupled first-order autonomous ODE system. He immediately generalizes it one step further to the **field form**, eq. (5.1) (Ch.5, "The Organism Considered as Physical System," p.126–127):

> "∂Qᵢ/∂t = Tᵢ + Pᵢ ... Tᵢ represents the velocity of transport of the element Qᵢ in a volume element at a certain point of space, while Pᵢ is the rate of production." (p.126–127)

**What (3.1) assumes** (Bertalanffy states these as explicit restrictions, not silently):
- **State = a vector of continuous, real-valued "measures" Qᵢ** — masses, concentrations, population counts treated as continuous. No discrete/symbolic state alphabet.
- **Markovian / no memory**: "It also abstracts from a possible dependence of happenings on the previous history of the system ('hysteresis' in a broad sense)... Introduction of such equations would have a definite meaning: The system under consideration would be not only a spatial but also a temporal whole." (p.57) — he flags this exclusion himself; extending to path-dependence requires **integro-differential** equations (cites Volterra 1931, Donnan 1937), a different formal class.
- **Spatial homogeneity in the simple case**: (3.1) uses ordinary derivatives; the general case (5.1) needs *partial* differential equations over x,y,z,t. He calls (3.1) "by no means general. It abstracts from spatial and temporal conditions, which would be expressed by partial differential equations." (p.57)
- **Smoothness**: the whole apparatus (Taylor expansion around stationary points, eq. 3.6–3.9) presupposes the fᵢ are differentiable / analytically expandable near equilibrium. This is what lets him linearize and get the eigenvalue (λ) stability classification (nodes, spirals, stable/unstable — pp.58–61).
- **Autonomy**: fᵢ depends only on the Q's, not explicitly on t (no exogenous forcing term in the base form).

## (b) Open systems, steady state / Fließgleichgewicht

**Location:** pp.39–40 (qualitative intro, Ch.2 "The Meaning of General System Theory"); pp.126–134 (Ch.5, formal treatment); pp.158–160 (Ch.6, restated with the German term).

Closed-system dynamics under (3.1)-type equations converges to a **true equilibrium** (all fᵢ = 0, entropy maximized, composition fixed by conservation laws). Bertalanffy's central move is to note biological systems are **open**: they continuously exchange matter/energy with environment and never reach that equilibrium while alive.

> "Every living organism is essentially an open system. It maintains itself in a continuous inflow and outflow, a building up and breaking down of components, never being, so long as it is alive, in a state of chemical and thermodynamic equilibrium but maintained in a so-called steady state." (p.39–40)

He coins/uses **Fließgleichgewicht** (his own term, introduced ~20 years earlier per his own note) for this:

> "...open systems may attain, under certain conditions, a time-independent state which is called a steady state, Fliessgleichgewicht, using a term which I introduced some twenty years ago. In the steady state, the composition of the system remains constant in spite of continuous exchange of components." (p.159)

**Why open dynamics differ from closed, formally:**
- Closed system: some integral M(Qᵢ) (total mass/energy) is a **constant of the motion** — conserved by definition, and the equilibrium state is a *function of* the initial condition through that conservation law (p.133, theorem 2, see below).
- Open system: no such closed conservation law holds internally (constant only in a *balance* sense — inflow rate meets outflow/reaction rate) — so the time-independent state depends only on the **system constants** (rate coefficients E, k), not on where you started.
- Formal example he works fully (eq. 5.2, p.127–128): a single-component open chemical system, `dQ/dt = E − kQ` (E = constant inflow rate, k = reaction constant). Solution: `Q(t) = (E/k) + (Q₀ − E/k)e^(−kt)`, so as t→∞, **Q∞ = E/k independent of Q₀** — the simplest possible worked proof that steady state under open-system dynamics erases dependence on initial condition.
- Chapter 5 also gives the multi-component reaction-network version (eq. 5.9ff, p.128–131: import a₁, reversible a₁⇌a₂, irreversible a₁→a₃ removed), with a steady-state ratio x₁:x₂:x₃ that depends only on rate constants — "self-regulation," his word (p.132).
- Multi-timescale / hierarchy note (p.160), directly relevant to WP-level dynamics: *"The living organism is a hierarchical order of open systems. What imposes as an enduring structure at a certain level, in fact, is maintained by continuous exchange of components of the next lower level... As a general rule, turnover rates are the faster the smaller the components envisaged."* — i.e. he explicitly grounds a **multi-timescale hierarchy** claim in Fließgleichgewicht: each level is a steady state relative to faster flux at the level below it. This is the closest GST gets to an explicit multi-timescale dynamics claim, and it is stated as a *consequence* of open-system steady-state reasoning, not argued independently.

## (c) Equifinality — the formal statement

**Location:** Qualitative statement pp.39–40; formal definition + two theorems pp.132–133.

**Qualitative (p.40):** "In any closed system, the final state is unequivocally determined by the initial conditions... If either the initial conditions or the process is altered, the final state will also be changed. This is not so in open systems. Here, the same final state may be reached from different initial conditions and in different ways."

**Formal definition (p.132):**
> "A system of elements Qᵢ(x,y,z,t) is equifinal in any subsystem of elements Qᵢ' if the initial conditions Qᵢ₀(x,y,z) can be changed without changing the value of Qᵢ'(x,y,z,∞)."

I.e., equifinality is a property of the **map from initial condition to asymptotic (t→∞) state**: it says that map is *constant* (locally, on the relevant subsystem) — the asymptotic value is invariant under variation of the initial condition. It is explicitly a statement about **trajectories converging to a common attractor regardless of starting point**, not about the trajectories themselves being identical (different pathways are explicitly allowed — "in different ways", p.40).

**Two theorems he states (p.132–133):**

1. *"If there exists a solution of form (5.9), initial conditions do not enter into the solution for the steady state. This means: If open systems (of the kind discussed) attain a steady state, this has a value equifinal or independent of initial conditions. A general proof is difficult because of the lack of general criteria for the existence of steady states; but it can be given for special cases."* — he is explicit this is NOT a general proof, only shown for the worked special cases (eq. 5.2, 5.9).

2. *"In a closed system, some function of the elements — e.g., total mass or energy — is by definition a constant... M, however, cannot be entirely independent of Qᵢ₀; with change of Qᵢ₀, also M and therefore M(Qᵢ') are altered. This, however, is contrary to the definition of equifinality. We may therefore stipulate the theorem: A closed system cannot be equifinal with regard to all Qᵢ."* — this is a genuine (if informal) proof: conservation ⇒ initial-condition-dependence of the asymptote ⇒ non-equifinality, for any true conserved quantity. So equifinality and strict conservation are, per Bertalanffy, in *tension* — a closed conservative system (which is what bert-lenses/bert-compose's circuit.rs currently simulates: conservation-faithful flow over work processes) is, by this theorem, the one class of system that structurally **cannot** be equifinal on its conserved measures. Equifinality requires the openness — a boundary term (import/export) that breaks the conservation law internally.

Bertalanffy also explicitly ties equifinality to Driesch's vitalism dispute and states GST's resolution is *not* mystical: open-system steady-state reasoning suffices, "so the supposed violation of physical laws disappears" (p.40, cross-ref p.132f).

## (d) Growth/competition equations as archetypal dynamics

**Location:** pp.58–66 (Ch.3), worked directly off eq. (3.1)/(3.12).

He treats "growth" as the paradigm case for demonstrating cross-domain formal identity, by successive truncation of a Taylor expansion of the single-variable case dQ/dt = f(Q):

- **Zeroth-order retained term** → eq. (3.13): `dQ/dt = a₁Q` → exponential law, `Q = Q₀e^(a₁t)` (p.61–62). He lists its instantiations across fields *by name*: compound interest (a₁>0, economics), bacterial/unrestricted population growth (biology), Malthusian law (sociology), growth of scientific literature (p.62), and with a₁<0: radioactive decay, monomolecular chemical decomposition, starvation-driven tissue loss, population extinction (p.63).
- **Next-order term retained** → eq. (3.15): produces the **logistic curve** (sigmoid, bounded) (p.62–63). Cross-domain instances he names: autocatalytic chemical reaction, Verhulst's law of population growth under limited resources (p.63).
- **Two-element coupled linear system** (eq. 3.17, aᵢⱼ=0 off-diagonal) → **allometric equation**, `Q₁ = bQ₂^α` (p.64–65). Instantiated as: organ-growth allometry in morphogenesis, basal-metabolism-vs-body-weight (α=2/3 surface law), and — his own cross-domain jump — **Pareto's law of income distribution in economics** (p.65), with an explicit structural mapping (total organism ↔ national income, partition coefficient ↔ "economic abilities of individuals").
- **Full coupled nonlinear system** (aᵢⱼ≠0) → **Volterra competition/predator-prey equations** (p.65–66), cited to Volterra (1931) and Spiegelman (1945, intra-organism competition). He draws a specific dynamical distinction: competition for a shared resource is "more fatal" than predator-prey (leads to extinction of the weaker-growth-capacity species) vs. predator-prey which only produces periodic oscillation around a mean (p.66) — this is a genuine dynamical-systems claim (different attractor types: extinction fixed point vs. limit cycle) about which structural class of coupling produces which class of trajectory.

He is explicit that the point of the exercise is **formal**, not empirical — the identity of the equations across fields is arrived at deductively from (3.1) + Taylor truncation + boundary conditions, independent of physical interpretation:

> "such laws are 'a priori,' independent from their physical, chemical, biological, sociological, etc., interpretation... this shows the existence of a general system theory which deals with formal characteristics of systems, concrete facts appearing as their special applications by defining variables and parameters." (p.62–63)

## (e) Explicit generality/isomorphism claims — the K≅2 ancestor

**Location:** pp.36–38 (Ch.2), the passage that most directly anticipates the convergence thesis.

> "Not only are general aspects and viewpoints alike in different sciences; frequently we find formally identical or isomorphic laws in different fields. In many cases, isomorphic laws hold for certain classes or subclasses of 'systems,' irrespective of the nature of the entities involved. There appear to exist general system laws which apply to any system of a certain type, irrespective of the particular properties of the system and of the elements involved." (p.36–37)

> "General system theory, therefore, is a general science of 'wholeness'... In elaborate form it would be a logico-mathematical discipline, in itself purely formal but applicable to the various empirical sciences. For sciences concerned with 'organized wholes,' it would be of similar significance to that which probability theory has for sciences concerned with 'chance events.'" (p.37–38)

Four explicit "aims" (p.38):
1. general tendency toward integration across sciences;
2. that integration centers on a general theory of systems;
3. GST as a route to exact theory in nonphysical fields;
4. "developing unifying principles running 'vertically' through the universe of the individual sciences" — his own phrase for K≅2-style cross-domain convergence.

He also explicitly scopes what grounds the isomorphism claim — not resemblance of the entities, but shared applicability of an abstraction under limited aspects:

> "The isomorphism under discussion is more than mere analogy. It is a consequence of the fact that, in certain respects, corresponding abstractions and conceptual models can be applied to different phenomena. Only in view of these aspects will system laws apply." (p.36)

— the analogy is to Newton's law of gravitation applying to apples, planets, and tides without those objects otherwise resembling each other (p.36). **This is a live methodological caution for K≅2**: isomorphism-of-law is scoped to "certain aspects," not full system identity — a warning against overclaiming domain-general dynamics beyond the aspect actually captured by the shared equation form.

And he flags the growth-equation exercise as *the* worked demonstration of this claim: "growth equations found in various fields can help demonstrate the existence of a GST" (cross-referenced already in the vault's `General System Theory-merged.md` notes file, p.60 — UNVERIFIED against primary text at that exact page but consistent with and subsumed by the pp.58–66 material read directly above).

## (f) Honest limits — what continuous-ODE dynamics excludes

This is the part GST does *not* resolve, and Bertalanffy is unusually candid about it in two separate places.

**1. He explicitly puts continuous/ODE-style dynamics in competition with discrete automaton models, and argues automata are limited by a different failure mode (pp.25–27, Ch.1 "Introduction," under the heading of general vs. specialized models):**

He frames it as a live open question which formal model — "analysis," "linear (including circular) causality," "automata," or "wholeness/interaction/dynamics" — is "the more general and fundamental one," and casts it explicitly as "a question to be put to the Turing machine as a general automaton" (p.25).

His answer is NOT that continuous dynamics wins outright — he argues Turing/automaton models fail on a *different* axis: the "problem of immense numbers." Any Turing machine / McCulloch-Pitts neural automaton can only realize behavior specifiable in a *finite* number of "words" — but for real biological systems (e.g., a genetic code with millions of positions, or a graph on N components with 2^(N(N-1)) possible connectivity states) that finite number is so large ("immense" — exceeding the estimated number of particles in the universe, ~10^80) as to be physically unrealizable even in principle (p.26). He concludes:

> "It appears therefore... the mechanistic conception, even taken in the modern and generalized form of a Turing automaton, founders with regulations after 'arbitrary' disturbances, and similarly in happenings where the number of steps required is 'immense'... Problems of realizability appear even apart from the paradoxes connected with infinite sets." (p.27)

— i.e., he does **not** argue discrete-state (Turing/automaton/FSM-style) models are formally excluded from GST or subordinate to the ODE formulation; he argues they hit their own distinct combinatorial-explosion ceiling when regulation must cover "arbitrary," unforeseen disturbances (citing embryonic regulation, Driesch; neural regulation, Lashley). His diagnosis is that this connects to **open-system-ness itself** — "with their open-system nature which is not provided even in the abstract model of automaton such as a Turing machine" (p.27). So his position is closer to: *neither the continuous-ODE nor the discrete-automaton formalism, taken alone, is the general one* — open-system reasoning is offered as what's missing from **both**, not as a replacement for state-machine models.

**What this means concretely for what eq. (3.1)/(5.1) exclude, read directly against the text:**

- **No native symbolic/discrete state.** (3.1) is built on continuous, differentiable Qᵢ. He never extends it to a discrete state alphabet or transition-table formulation — that's the separate "automata" branch he discusses only qualitatively (pp.25–27), never formalizes, and never unifies with (3.1). **This is the gap bert-lenses' bill-FSA / #67 Markov-FSA work sits in — GST has no worked bridge from Fließgleichgewicht-style flow dynamics to FSA/DLG transition dynamics; it treats them as two candidate "general models" and argues about which is more fundamental, without resolving it.**
- **No rule-change / adaptive dynamics.** Everything in Ch.3/Ch.5 assumes the fᵢ (the transition/rate functions) are **fixed** for the duration of the trajectory — differentiate, linearize, integrate. There is no treatment anywhere I read of a system whose own transition rule changes as a function of its history or state (e.g., an evolving Boolean-network rule table, or online rule-learning). Memory/history-dependence is flagged as excluded even in the *simplest* sense (hysteresis, p.57) and deferred to a different formalism (integro-differential equations) that he cites but does not develop.
- **No explicit treatment of deterministic-out-degree-1 discrete trajectories** (i.e., Boolean-network-style state graphs). Not mentioned anywhere I found; the closest adjacent material is the automata/Turing-machine discussion (pp.25–27) and the "immense numbers" combinatorics of a directed graph on N points (p.26, N(N−1) possible edges) — relevant to *state-space size* arguments but not to trajectory dynamics on such a graph.
- **Growth/competition equations (section d) are all continuous-state, continuous-time, and (with the exception of the coupled nonlinear Volterra case) linear or low-order-polynomial in Q.** None of them are agent-based (no discrete individual agents with distinct rule-following behavior — Volterra's "species" are treated as continuous population densities, not populations of individually-updating agents). **Agent-based trajectory dynamics (bert-lenses ABM target) is not addressed by GST's equations at all** — it is a 1968-era text; ABM as a formal class postdates it.

**Bottom line for the research question:** GST's ODE formulation is honestly scoped by Bertalanffy himself to continuous, Markovian (no-memory), spatially-either-lumped-or-fielded, fixed-rule dynamics. He is aware discrete/automaton dynamics exists as a rival general formalism and explicitly declines to declare either one the winner — he diagnoses automata's failure mode (combinatorial explosion under "immense numbers" / arbitrary disturbances) without offering a formalism that subsumes both. **No bridge from GST 1968 to FSA/DLG/Boolean-network/ABM dynamics exists in the primary text — building it is genuinely open ground, not a gap in reading.**

---

## Cross-reference note

The vault's `bertalanffy-genealogy.md` (secondary/speculative synthesis document, dated Jan 2026, explicitly labeled "Conceptual synthesis for future development") claims equifinality was Bertalanffy's *mathematical translation* of Driesch's "entelechy" and traces a lineage through Steiner's 1894 proto-cybernetic "mental picture" passage. That genealogical claim is UNVERIFIED against the primary GST 1968 text — Bertalanffy's own equifinality chapter (pp.39–40, 132–133, read above) cites Driesch directly and by name as the source of the vitalism dispute he is resolving, which is consistent with the genealogy note's framing, but I found **no** direct-quote evidence in GST 1968 itself connecting Bertalanffy to Steiner — the genealogy document itself says the same ("No direct evidence found... Circumstantial case", its §VII.1). Flagging so this research doesn't get cited as if GST 1968 itself makes the Steiner connection — it does not; that's the secondary document's own speculative synthesis.
