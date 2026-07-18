# Coverage Critique of `synthesis.md`

*Coverage-critic pass — 2026-07-18. Read `synthesis.md` in full plus all six
`read-*.md` files. Every claim below is marked VERIFIED (I opened the cited
file/line myself this pass) or UNVERIFIED. Gaps are ranked by how soon they will
bite an actual decision (#67, #54, the RBN model), not by theoretical interest.*

---

## 1. Hybrid automata: dropped entirely, despite being the single most
### implementation-relevant formalism the corpus found — bites on #67 immediately

**VERIFIED.** `read-external.md` §6 (lines 259–298) reads the Alur–Henzinger hybrid
automaton formalism directly (cross-checked against the LICS 1996 paper's known
structure) and states plainly: it covers "exactly bert-lenses' actual requirement
set: continuous flow *within* a mode (bert-compose's conservation ODEs) plus
discrete mode-switching *between* modes (FSA/DLG transitions) as two halves of one
formal object, with the mode-invariant/guard apparatus giving a principled place to
put 'when does this system stop being in Operational mode' logic." It even notes
Boolean networks and ABM fit as *degenerate* hybrid automata (trivial continuous
part). `read-external.md`'s own closing "Cross-cutting synthesis" section (line
472–478) lists hybrid automata by name as one of the concrete instances of the
Mesarovic-Takahara state-transition family — on equal footing with Willems'
behavior and the categorical stock-flow ODE functor.

`synthesis.md` never cites this section. Grep confirms zero occurrences of
"hybrid" as a positive citation anywhere in the document — the only hit (line 303)
is a *negative* one, noting that `Open(Dynam)` (read-external §8) has "no
discrete-event, hybrid, or stochastic treatment." That is true of §8. It is not
true of §6, sitting three sections earlier in the same file, unread into the
synthesis. The taxonomy table (`synthesis.md` §2, lines 207–214) has no "hybrid"
row; the "Requires" table (lines 259–263) attributes "no citable solved treatment
anywhere" to agent trajectories citing `read-category-theory §4, read-external §8`
— correct for ABM, but the document never notices that the *flow+FSA* combination
(the more urgent one, since #67 wants exactly a Markov/FSA sim next to an already-
running conservation engine) has a citable, verified, directly-on-point candidate
one section away.

This is not a minor omission. Hybrid automata is a closer match to bert-lenses'
existing "Run = a mode transition (Mobus-structural → Operational)" framing than
anything the synthesis actually adopts — MT's Def 2.7 and Willems' (T,W,B) are both
more abstract than the working engineer needs, and Klir's metasystem-swap is a
scheduling discipline, not a per-mode dynamics representation.

**What closes it:** Add a "Hybrid (mode-local flow + discrete jump)" row to the
taxonomy, cite `read-external §6` directly, and state the cost honestly (general
reachability is undecidable — a straightforward counter-machine reduction,
`read-external` line 283 — but decidable restricted subclasses exist: timed
automata, initialized rectangular automata, piecewise-constant-derivative systems;
an interactive simulator that only needs to step forward, not verify reachability,
can likely live in the restricted-but-adequate zone). Then scope #67 against it
explicitly: does the bill FSA need to be wrapped as a hybrid automaton with
trivial `flow()` per mode (gets the FSA case for free, and leaves a real path to
combining flow-bearing modes with FSA modes later without inventing new theory), or
does axis C's bare `X^Σ` suffice on its own? That is a decidable scoping question
the current document doesn't ask because it doesn't know the candidate exists.

---

## 2. #54 is labeled "resolved as a level question" but no decision procedure is
### actually given — bites the moment anyone tries to close the issue

**VERIFIED.** `synthesis.md` §1 Layer 4 (lines 146–151) frames #54 as: "is porosity
a behavior-function parameter (generative level) or a metasystem replacement
trigger?" and calls this "a question with an answer, not a semantics fog." Action
item 4 (line 512–514) repeats the framing and says "Answer it explicitly and record
the answer" — but the document itself never answers it, and supplies no test for
*how* to answer it.

This matters because the two sources the framing leans on both under-determine the
case. Klir's worked example (kidney/dialysis, klir-facets.md:4725–4761, cited
`read-klir §1e`) is a *scheduled or threshold-triggered discrete* swap — porosity,
by contrast, is plausibly a continuous-valued property that modulates a rate
continuously, which is the generative-parameter case almost by construction unless
it can push the system somewhere the flow equation stops being defined. And
`read-klir.md`'s own "Honest limits" section (§5, cited in `synthesis.md` line
161–163) explicitly disclaims exactly this: "no opinion on modulated-connection
semantics." The synthesis cites the disclaimer and then, two sections later, calls
the question it disclaims "decidable."

**What closes it:** State the actual discriminator, not just the two category
labels. A candidate test, derivable from Klir's own definition of a generative
system (a single φ valid over its whole state-space) versus a metasystem
(replacement of φ itself): does porosity, at some value, make the *current* flow
equation undefined or discontinuous in a way that requires substituting a
different φ (metasystem) — or does it only rescale a coefficient continuously
inside one φ that stays valid across the whole porosity range (generative
parameter)? Apply that test to the actual porosity model in bert-lenses and record
the answer with the reasoning, not just the category chosen.

---

## 3. Axis C's `Dist(X)` conflates discrete-time Markov chains with continuous-time
### stochastic processes — a real ambiguity for #67, not a cosmetic one

**VERIFIED.** `synthesis.md`'s taxonomy (line 194, 211, 227) treats stochastic
dynamics as one thing: `Dist(X)`, a per-tick distribution-valued step, discrete
support (`ℕ`). But `read-bunge.md` §5(b)–(c) (lines 85, 87–90) independently
surfaces a genuinely different stochastic structure — Bunge's probabilistic
automaton (`M: S×Σ→[0,1]^(n+1)`, Definition A6) is transition-probability-per-
symbol, closer to a labelled Markov chain — and separately flags, as an explicit
absence, that neither Bunge nor anything else in the corpus generalizes this to
continuous-time, rate-indexed stochastic dynamics ("a Gillespie-style stochastic
conservation process... Bunge doesn't hand you that generalization," line 114).
Continuous-time Markov processes (random, exponentially-distributed inter-event
timing driven by a rate/hazard function, not a fixed clock sampling a distribution
each tick) are not the same mathematical object as `Dist(X)` stepped at discrete
`ℕ`-indexed ticks — they need a *when* (a rate), not just a *what* (a
distribution over next-states).

This is directly relevant to #67 because a bill's FSA/DLG transitions are
plausibly event-triggered, not clocked — "the committee votes" happens when it
happens, not on tick 47. If the Markov/FSA sim needs continuous or irregular
inter-event timing, `Dist(X)` alone under-specifies the engine: axis A already
allows "event-indexed" support (line 187), but axis C's single `Dist(X)` entry
doesn't distinguish "distribution sampled once per fixed tick" from "rate function
determining both the next state and the waiting time."

**What closes it:** Before scoping #67's implementation against `Dist(X)`, check
the actual #67 spec for whether transitions are clock-driven or rate/event-driven.
If rate-driven, add a second axis-C stochastic entry (continuous-time /
rate-indexed) distinct from discrete-time `Dist(X)`, and note (per the Dirac-unit
argument already in the document, `synthesis.md` line 284–286) that the discrete
case is recovered as the rate-indexed case's degenerate limit, not the other way
around.

---

## 4. Ensemble/rule-space dynamics — the RBN "Ω metric" kind — is not in the
### corpus at all, and the taxonomy has no slot for it even in principle

**VERIFIED absence.** Grepping all seven files in this folder for "Ω", "omega",
"open-ended", "evolvab", "RBN", "random boolean," and "Kauffman" returns zero
hits outside one unrelated symbol-reuse in Bunge's automaton tuple notation
(`𝒜 = ⟨Σ, Ω, σ₀, ...⟩`, read-bunge line 79 — Bunge's Ω is an output alphabet, not
an evolvability statistic; unrelated). None of the six reads, and therefore
`synthesis.md`, address the Kauffman-tradition random-Boolean-network literature's
actual open-endedness/criticality questions (order/chaos/critical regime,
attractor-basin structure, or an "Ω" evolvability metric computed over a
*population* of rule-table realizations rather than one run).

This is a different kind of question from anything in the six-axis taxonomy. Axes
A–F (`synthesis.md` §2) all describe a single system's single trajectory or a
single system's rule-swap schedule (axis E). An Ω-style metric asks about a
statistic over a *family* of τ's (rule tables) — closer to "dynamics of dynamics"
than to Klir's metasystem, which swaps among a *given, fixed* menu of rules within
one run rather than characterizing the space of possible menus. The synthesis's
placement of Boolean networks (line 212, "cheapest unlock... axis-D declaration
made optional," line 218–225, line 259) is correct as far as it goes — it is a
correct answer to "how do I run one Boolean network" — but it says nothing about
whether the RBN model in question needs to run *many* rule-table realizations and
report a statistic over that ensemble, which is a different and unaddressed
engineering question, not a smaller version of the one that's answered.

**What closes it:** This needs its own source pass — none of the six reads touch
it, so nothing here can adjudicate it. Get the actual RBN/Ω paper Shingai is
working from, extract the metric's formal definition, and check explicitly whether
it requires (a) one trajectory with a summary statistic (fits existing taxonomy,
no new axis needed) or (b) a statistic over multiple trajectories/rule
realizations (needs a seventh axis, or an explicit scope ruling that ensemble
dynamics is out of bounds for this taxonomy and belongs to a different layer of
the tool).

---

## 5. State-space dimensionality change (emergence) has no home in the six axes —
### Bunge supplies the mechanism and the synthesis doesn't use it

**VERIFIED.** `read-bunge.md` (line 101) surfaces Bunge's distinction between
quantitative change (movement within a fixed state space) and qualitative change
("some new axes pop up and others drop out," 1979 line 4026) and explicitly flags
it as relevant "if your multi-timescale/hierarchy work needs a notion of a run
that changes its own state-space dimensionality (e.g., mode transitions,
structural learning in a Boolean network, or Facets' own 'grounding' mode-shift
work)."

`synthesis.md`'s six axes (§2, lines 186–204) do not have a slot for this. Axis B
("state-space structure") is chosen once per dynamics-kind and treated as fixed
(the taxonomy table, lines 207–214, assigns one B-value per row). Axis E
(generative/metasystem) covers the *rule* changing, not the *carrier* changing
shape. A run whose state space gains or loses dimensions mid-run — which is
exactly what "structural learning in a Boolean network" or an evolving-topology
agent population would need — is a third kind of non-stationarity that is neither
"the rule swaps" (axis E) nor "the invariant changes" (axis D), and it sits
unindexed. The multi-timescale-hierarchy row (line 214) and the "requires original
work" note (line 263) don't mention it either, even though the mechanism that
would ground it is sitting, cited, in the same corpus.

**What closes it:** Add this to the "original work" list in §2's Requires table
(alongside multi-timescale) rather than leaving it silently unaddressed, and
credit Bunge's qualitative-change passage as the starting point rather than
starting from zero — it is the one place in the corpus that already names the
phenomenon.

---

## 6. Bertalanffy's sharpest specific argument is quoted but never connected to
### the gap it actually explains

**VERIFIED, lower urgency — a missed connection, not a missing source.**
Bertalanffy is used substantively elsewhere (equifinality/conservation tension,
`synthesis.md` §5; the H-feedback semigroup hazard, §4) — the tradition is not
decorative. But `read-bertalanffy.md` §f (lines 107–128) contains a specific,
citable argument the synthesis never uses: any finite-automaton description of a
system with N interacting components can require up to 2^(N(N-1)) connectivity
states — "immense numbers... exceeding the estimated number of particles in the
universe" (p.26) — which is *why* Bertalanffy declines to unify continuous and
discrete/automaton dynamics rather than merely failing to. `synthesis.md` line
78–83 cites this section only for "he declines to rank ODE above automaton," and
drops the actual mechanism.

That mechanism is precisely relevant to the place the synthesis itself admits
weakness: "Agent trajectories... no citable solved treatment anywhere... requires
original work" (`synthesis.md` line 262). Bertalanffy's immense-numbers argument
is a 1968 diagnosis of *why* that combinatorial explosion happens for
component-interaction systems generally — it explains the difficulty rather than
just naming it, and it costs nothing to add since the section is already read and
cited elsewhere in the document.

**What closes it:** One paragraph in §2 (Requires table) or §3 connecting
Bertalanffy's immense-numbers argument to the ABM/heterogeneous-composition gap.
Free, and it strengthens exactly the place the paper is honest about being weak.

---

## 7. Wymore/DEVS dropped alongside hybrid automata — the solved half of the
### discrete-event composition problem

**VERIFIED.** `read-external.md` §5 (lines 219–257) reads a 2021 paper (Wach et
al., in Shingai's Zotero) that formally bridges Wymore's T3SD to DEVS (Discrete
Event System Specification, Zeigler) — a mature, widely-used formalism for
*composing multiple event-driven elements* with a shared event-scheduling
discipline (a global event calendar/priority queue), which is exactly the axis-F
composition question for the homogeneous discrete-event case (running several
FSA/DLG elements together) — a case that, unlike heterogeneous flow+discrete
composition, is actually solved in the literature and not flagged anywhere as an
open problem.

`synthesis.md` never cites Wymore or DEVS. Given finding #1 above already
recommends restoring hybrid automata for the flow+FSA case, DEVS is the natural
partner citation for the "run two or more discrete-event elements in the same
composed model" sub-problem, and it is sitting unread into the document exactly
where §1 needs a companion.

**What closes it:** Fold DEVS into the "what to do" list (§6) as the concrete
event-scheduling mechanism for multi-element discrete-event composition — cite it
as solved and adopt-able, distinct from (and prerequisite to) the harder
continuous+discrete hybrid case in finding #1.

---

## Summary table

| # | Gap | Bites on | Severity | What closes it |
|---|---|---|---|---|
| 1 | Hybrid automata dropped despite being the best-matched formalism found | #67 (flow+FSA), immediately | High | Add taxonomy row, cite `read-external §6`, scope #67 against it |
| 2 | #54 labeled decidable but no discriminating test given | #54, immediately | High | State the actual test (does porosity invalidate the current φ, or just rescale within it) |
| 3 | `Dist(X)` conflates discrete-tick and continuous-time stochastic dynamics | #67, on first implementation attempt | Medium-High | Check #67 spec for event- vs clock-driven; add rate-indexed axis-C entry if needed |
| 4 | Ensemble/rule-space (Ω) dynamics has no source pass and no axis | RBN model, when Ω work starts | Medium | New source pass on the actual RBN/Ω paper; add axis or explicit scope ruling |
| 5 | State-space dimensionality change (emergence) unindexed | Multi-timescale/structural-learning work | Medium | Add to "original work" list, credit Bunge's qualitative-change passage |
| 6 | Bertalanffy's immense-numbers argument unconnected to the ABM gap | Whenever ABM/heterogeneous work starts | Low | One paragraph connecting the two, already-cited material |
| 7 | DEVS dropped alongside hybrid automata | Multi-element discrete-event composition | Low-Medium | Cite as the solved homogeneous-discrete-event composition mechanism |

None of these seven require new primary-source work except #4 (RBN/Ω) — six of
seven are sitting, already read and already cited for something else, inside the
existing six `read-*.md` files. The fastest fix available is restoring §1 and §7
(hybrid automata + DEVS), since both are fully verified, already extracted, and
directly address the two live issues (#67, #54) the synthesis was written to
serve.
