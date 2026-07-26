# Educational model suite — a graded curriculum for learn-while-authoring

**Status: RESEARCH** (2026-07-18). Not in-tool, and **untracked**: the curriculum was planned against [#80](https://github.com/halcyonic-systems/bert-lenses/issues/80) and #21, and both closed in July 2026 having shipped narrower things — #80 the on-canvas pairing of every lens's edge names with its math (2026-07-20), #21 law comments on tests (2026-07-19). Neither carried this curriculum.

*Planning doc, 2026-07-18. Ground truth for what the instrument can express today:
README, `docs/theory-fidelity.md`, `docs/kernel-architecture.md`,
`docs/design/lens-palettes.md`, ROADMAP.md. Pedagogy spine: Mobus Ch.4
(`operations/systems-science/mobus/4-a-model-of-system.md`), specifically the
systemese hypothesis (§4.2.4) and the formal 7/8-tuple definition (§4.3).
Serves #80 and #21 (learn-while-authoring, refusals-that-teach) and the
daily-driver thesis that the instrument teaches systems science as a
side-effect of use, not a separate curriculum bolted on.*

## Why this suite, and why now

Mobus's systemese hypothesis (Ch.4 §4.2.4) claims humans have innate
recognizers for source, sink, flow, interface, protocol, and container —
"a toddler observing [a catch] does not necessarily know the names of the
things involved, but already understands the roles." bert-lenses' job is not
to teach these concepts from nothing; it's to give the already-innate concepts
their formal names and show the learner that what they authored *is* the
concept, verified by a kernel that refuses when the concept is violated. Every
model in this suite is chosen to make exactly one archetype-to-formalism
mapping click, in an everyday domain, honestly under the lenses (no forced
runs on structural-only models — the `bill.json` FSA precedent, and #67).

## Audience tiers

**(a) Systems-curious newcomer** — no theory vocabulary. Has the systemese
intuitions Mobus claims are innate but has never named them. Needs: recognize
"this thing I already understand (a ball being caught, a bathtub filling) has
a name — source, flow, interface" and see that naming pay off as a kernel
verdict, not just a label. Structural authoring only; Klir/Mobus vocabulary
introduced through plain-English domains, never through the formalism first.

**(b) Student of systems science** — has read some Klir/Bunge/Mobus (or is
mid-Mobus-Ch.4 the way this doc's author was), knows the *names* (bond,
aggregate, 8-tuple) but has never authored a model a kernel checks. Needs: see
the named theory construct fire as a live verdict — the aggregate-vs-system
warning, the `check_self_loops` refusal, the boundary/interface reification
when toggling Bunge→Mobus. Structural + first dynamical runs; FSA/state-
machine as a *contrast* case (what a system without a dynamical face looks
like).

**(c) Practitioner wanting lens discipline** — already systems-literate,
wants fluency choosing the right lens for a real domain and reading a kernel
refusal as a modeling signal, not a bug. Needs: multi-level decomposition,
dynamical runs with real transfer functions and tether data, and the
Klir→Bunge→Mobus upgrade path performed by hand on one model so the
enrichment (docs/design/lens-palettes.md's "gradient is a forgetful
projection, rendered as enrichment") is felt, not just read.

## Existing models — the range already built

- `assets/models/examples/blank.json` — starter template (pre-seeded output
  sink). Good scaffold, not a lesson itself.
- `~/Desktop/bill.json` — 14-state legislative-bill FSA, `mode: Operational`
  but **no dynamical face** — the precedent for "structural-only and honest,"
  don't force a conservation run onto a state machine. Ties to bert-lenses#14
  target 3 (Penland FSA/DLG convergence).
- `~/Documents/bert-lenses/technical/hal-projection.json` /
  `.canvas.json` — hal modeled as SOI, one level of decomposition, structural
  projection. Also the **discovery case for #79** (closed system: only an
  export crossing, zero inbound interfaces, verdict read clean when it
  shouldn't have). Real-world, technical domain — not itself a lesson, but
  its bug *is* a lesson (see Lesson 7 below).
- `assets/models/demos/{reservoir,allocation,homeostat}.json` — small
  (2–5 system) dynamical demos, `mode: Operational`, already runnable.
  `homeostat.json` in particular is a built feedback/regulation example, but
  it's the harness-compiler domain, not an everyday one — good advanced
  cross-reference, not a Lesson-1-tier model.
- `assets/models/examples/{bitcoin,ethereum,solana,cosmos-hub,llm}.json` —
  18-system blockchain protocol models. Technical/advanced; useful as
  practitioner-tier capstones, wrong domain for newcomers.
- `~/Documents/bert-lenses/technical/{llm-market-target4*,rung2-alloc*,
  rung3-enterprise*,rung3-staircase*}.json` — the LLM-market Economy-face
  demos (bert-lenses#14 target 4), tether-driven, real dynamical runs against
  real CSV data. The tier-(c) "able to be wrong" capstone domain already
  exists; adapt rather than re-author.

Ground rule the existing set already honors and the new suite must keep:
**accessible everyday domains over technical ones** (bathtub, thermostat,
coffee shop, a cell, a traffic light, a legislative bill), and **honest
lenses** — no forced runs on structural models.

## The graded sequence

Primitive-first ordering: source/sink/flow → interface/protocol → stock/
buffer → feedback/regulation → boundary/openness → state-machine/modes →
decomposition. One concept per model.

**Lesson 1 — John catches the ball** (tier a, structural, Klir+Mobus)
Domain: Mobus's own systemese example (§4.2.4, ~line 114) — "John caught the
ball thrown by Jim." 3 nodes: Jim (source), ball (flow), John (sink) with
hand/glove as interface/protocol. **Teaches:** source, sink, flow, interface,
protocol as named formal roles for something already recognized pre-
verbally. **Discovery:** the exact sentence Mobus uses to argue these
concepts are innate becomes an authored, kernel-checked model — the
systemese thesis made literal. Effort: trivial, agent-generatable.

**Lesson 2 — Process M** (tier a/b, structural + optional dynamical, Mobus)
Domain: Mobus's canonical system-paragraph (§4.3.1, line 158): "Process M
takes in materials A and B from sources 1 and 2 along with energy E from
source 3 to make product Z with waste product X going to sinks 5 and 6, at an
efficiency of 68%." **Teaches:** multi-input/multi-output single process,
typed flows (Material vs Energy vs the implicit waste-heat), the "combine"
work-process primitive, and T (transformation/efficiency) as a real,
quantifiable slot. **Discovery:** the same paragraph Mobus uses to introduce
the formal 7-tuple becomes literally the model — verbal/graphical/
mathematical (his own "three complementary forms," §4.3) all visible on one
canvas. Effort: trivial, agent-generatable.

**Lesson 3 — Bathtub** (tier a, dynamical, Klir/Mobus)
Domain: fill/drain a tub. **Teaches:** stock-flow coupling and containment —
Mobus's own container-archetype argument (§4.2.4, ~line 127): "stocks are
invariably bounded; they are contained... tight coupling with flows." Run it:
watch the stock rise/fall as inflow/outflow vary. **Discovery:** the
intuitive "if I close the drain the water rises" becomes a conservation-
faithful run, the learner's first dynamical face. Effort: small,
agent-generatable + a manual run-parameter pass.

**Lesson 4 — Coffee shop** (tier a/b, structural, Bunge/Mobus)
Domain: order → make → serve. **Teaches:** decomposition into a short
work-process chain (combine, then split — cup out, receipt out), interface/
protocol at the register and counter. **Discovery:** a familiar 3-step
service becomes a 3-node Mobus chain with two typed interfaces; first
contact with "split" as a distinct primitive from "combine." Effort: small,
agent-generatable.

**Lesson 5 — Thermostat** (tier b, structural + dynamical, Mobus/Agency)
Domain: sense temperature → decide → actuate heater. **Teaches:** feedback/
regulation as a *cycle through distinct nodes*, and Mobus's minimal reactive
agent (chs. 10–11, cited in `lens-palettes.md` §Process-type taxonomy).
**Discovery, deliberately engineered:** a first-time author's instinct is to
draw the loop as a literal self-loop on the "thermostat" node — which the
kernel refuses (`check_self_loops`, Mobus §4.3 `k≠o`). The refusal *is* the
lesson: feedback is a cycle of ≥2 nodes, never a self-reference, and Bunge's
diagonal-bond feedback (which *would* allow a self-loop) has no Mobus
preimage — the two traditions genuinely disagree here (`lens-palettes.md`
"real cross-lens INCOMPATIBILITY, not a reification difference"). This
lesson should ship with the wrong-first-draft called out in its own
teaching copy. Effort: needs hand-authoring (the refusal has to be walked
into, not generated past).

**Lesson 6 — A cell** (tier b, structural, Mobus)
Domain: membrane, nutrient uptake (receives), waste export (exports).
**Teaches:** boundary/interface reification with *both* gating directions
present — porosity, first-class environment (E=⟨O,M⟩), the receives/exports/
hybrid interface taxonomy (`lens-palettes.md` §Mobus palette). **Discovery:**
toggling Klir→Bunge→Mobus on the same authored structure visibly reifies the
same boundary-component set into a membrane with named ports — the
"boundary identity" theorem (`lens-palettes.md` §The formal skeleton) made
visible on a domain everyone already has an intuition for. Effort: small,
hand-guided (lens-toggle walkthrough is the point).

**Lesson 7 — The closed system trap** (tier b, structural, Mobus)
Domain: something that only ever emits — a diary you write in but never
read, a one-way loudspeaker. **Teaches:** openness as a Mobus commitment,
not a neutral-kernel one (#79). **Discovery:** author it naturally (it feels
complete — one process, one export) and the model should trip a Mobus-lens
openness warning once #79 ships. **Status: staged, not payoff-complete.**
Author the model now; its "aha" (a verdict that reads ✓ today should read a
warning) activates the moment #79 lands. This lesson is a direct, accessible
recasting of the real bug that #79 itself was caught from (the hal-projection
model, export-only, verdict read clean). Effort: small to author; blocked on
#79 for the payoff.

**Lesson 8 — Traffic light** (tier b, structural only, Klir/Bunge)
Domain: red → green → yellow → red. **Teaches:** state-machine modeling as
categorically distinct from flow modeling — states/transitions ≈ things/
relations (Klir's bare kernel), no conserved substance, so **no run**.
**Discovery:** the learner tries to "run" it and the honesty discipline
(the same one `bill.json` already demonstrates — a structural model with no
dynamical face doesn't map onto `bert-compose`'s conservation semantics)
teaches the boundary between structural and dynamical modes directly.
Precursor to a Markov-mode payoff once #67 ships (probabilities on
transitions → absorption/expected-time questions). Effort: trivial,
agent-generatable.

**Lesson 9 — The legislative bill** (tier b/c, structural, Klir/Bunge — reuse)
Domain: **already built** at `~/Desktop/bill.json`, 14 states. **Teaches:**
the same FSA-is-structural-only lesson as Lesson 8, at real-world fidelity
and scale — promote it into the curriculum as the "this is what a real one
looks like" companion to the toy traffic light, rather than re-authoring.
Ties to bert-lenses#14 target 3 (Penland DLG/FSM). Effort: **zero new
authoring** — write teaching copy pointing at the existing file.

**Lesson 10 — Two friends, mere relation vs bond** (tier b/c, structural,
Klir→Bunge upgrade)
Domain: two people who share a birthday (mere relation — true, changes
nothing) vs one who lent the other money (a bond — modifies history, Bunge's
`FlowInducesAction`). **Teaches:** the bond-vs-mere distinction and the
aggregate-vs-system verdict directly and vividly — author the birthday-only
version first and watch the Bunge lens flag it as an aggregate/heap (zero
bonds), then add the loan and watch the verdict flip. **Discovery:** systemhood
is *earned*, not assumed — Bunge's Def 1.1 as a lived experience rather than
a definition to memorize. Effort: needs hand-authoring (the before/after
pair is the point; a generator would only produce the "already correct"
version).

**Lesson 11 — Lemonade stand** (tier c, structural + dynamical, Mobus/Economy)
Domain: buy lemons/sugar/cups (multiple sources with capacity) → make →
sell (multiple sinks). **Teaches:** multiple typed sources/sinks with
capacity constraints, a first taste of the Economy face at a domain scale
below the LLM-market capstone. Bridges toward bert-lenses#14 target 4
without needing real market data yet. Effort: small, agent-generatable +
manual capacity tuning.

**Lesson 12 — Decomposition capstone: inside "make espresso"** (tier c,
structural, Mobus recursion)
Domain: zoom into the coffee shop's "make" node (Lesson 4) as its own SOI
one level down — grind, tamp, extract, steam (Eq. 4.3's `c_{i,j,l} =
S_{i,j,l+1}`, the dotted-index recursion). **Teaches:** hierarchical
decomposition as a formal recursion, not just "drawing smaller boxes inside
a bigger box." **Status: BLOCKED.** Depends on the outcome of the ongoing
decomposition investigation (parallel work in this session, `decomp-
investigation`) — do not build until that lands, since the authoring UX for
"a component IS a system one level down" isn't settled.

**Lesson 13 — LLM market, tether-driven** (tier c, dynamical, Mobus/Economy —
reuse + adapt)
Domain: **already built and running** at `~/Documents/bert-lenses/technical/
llm-market-target4*.json` (+ the `rung2-alloc*` / `rung3-*` staged variants).
**Teaches:** T/H/Δt as executable, tether/CSV forcing against real market
data, and the "able to be wrong" criterion (bert-lenses#14: "the simulation
can be compared against the actual market... what makes a model able to be
wrong and therefore able to teach"). **Discovery:** the capstone payoff —
a model's predictions diverge from reality and the divergence itself
teaches. Effort: **adapt existing files' teaching framing**, not new
authoring; may need simplifying commentary to read as tier-(c) capstone
rather than raw research artifact.

## Sequencing vs instrument gaps

| Lesson | Blocked on | Nature of block |
|---|---|---|
| 5 (thermostat) | nothing | ships as-is; the refusal it demonstrates already fires |
| 7 (closed-system trap) | #79 (Mobus openness warning) | author now, payoff activates when #79 ships |
| 8 (traffic light) | nothing for the structural half; #67 (Markov mode) for a probabilistic follow-on | ships now as structural-only; revisit for a dynamics-lite sequel |
| 9 (legislative bill) | nothing | reuse existing file, zero build cost |
| 10 (mere-relation vs bond) | nothing | ships as-is |
| 12 (decomposition capstone) | the in-flight decomposition investigation | do not build until that settles the authoring UX |
| 13 (LLM market capstone) | nothing structurally; benefits from #80 (edge math pairing) for legibility | reuse existing files, add teaching copy |

Cross-cutting, non-blocking accelerants: #80 (pair edge names with formalism)
strengthens every lesson's Klir-notation legibility once shipped; #21
(refusals cite theory in one sentence) strengthens Lessons 5, 7, 8, 10
specifically, since their whole pedagogy IS a refusal or a verdict flip; #77
(kingdom/genus/domain declared before authoring) is a good onboarding
companion for tier (b)/(c) but doesn't gate any lesson's content.

## Production plan

**Agent-generatable now** (canonical, few nodes, textbook-cited — seed via
the in-process `generate()` / bert-json-creation discipline, never hand-
authored JSON, tested with primitive models first): Lessons 1, 2, 3, 4, 8, 11.

**Needs hand-authoring / hand-guided** (the pedagogy depends on a specific
wrong-then-right sequence or a live lens-toggle walkthrough a generator
wouldn't produce unprompted): Lessons 5, 6, 7, 10.

**Reuse existing, zero-to-low build cost** (already authored elsewhere in
the ecosystem; the work is teaching copy, not modeling): Lessons 9, 13.

**Blocked, do not schedule yet**: Lesson 12.

**Batch plan:**
1. **Batch 1 — primitives** (Lessons 1, 2, 4, 8): agent-generatable,
   structural-only, one session.
2. **Batch 2 — first dynamics** (Lesson 3, plus a dynamical pass on
   Lesson 2): agent-generated structure + manual run-parameter tuning, one
   session.
3. **Batch 3 — boundary pair** (Lessons 6, 7): hand-guided, ships together
   since 7's payoff is deferred but its authoring effort is identical to 6's.
4. **Batch 4 — regulation + accretion** (Lessons 5, 10): hand-authored,
   each needs a deliberate wrong-first-draft in the teaching copy.
5. **Batch 5 — capstones** (Lessons 9, 11, 13): 9 and 13 are copy-only;
   11 is a small new build. Lesson 12 joins this batch only after the
   decomposition investigation resolves.

## Proposed lesson-1-through-5 sequence

1. **John catches the ball** — source/sink/flow/interface/protocol, straight from Mobus's own systemese example.
2. **Process M** — multi-input/output single process, typed flows, efficiency as real T.
3. **Bathtub** — stock-flow coupling, first dynamical run.
4. **Coffee shop** — decomposition into a short work-process chain, first interfaces/protocols in a service domain.
5. **Thermostat** — feedback as a cycle (not a self-loop), the `check_self_loops` refusal as the lesson.

## Deliverable

Doc: `~/Desktop/halcyonic-projects/active/bert-lenses/docs/design/educational-model-suite.md` (this file, uncommitted per instructions — no starter model authored this pass; planning was the full scope given the time available).

## Appendix — faculty-appeal mapping (Binghamton SSIE)

*The suite doubles as a PhD-positioning artifact: Binghamton's Systems Science
and Industrial Engineering department is the primary PhD direction. Claims
below are verified against faculty profile pages / public bios (web search,
2026-07-18); marked unverified where I couldn't confirm directly. The 13
canonical lessons stay canonical — at most one optional, non-canonical
model is proposed per faculty member where a genuinely better hook exists.*

**Carlos Gershenson** — SUNY Empire Innovation Professor, SSIE; self-
organization, complex systems, artificial life, with named applications to
*transportation* (verified: profile + bio). His best-known transportation
work is decentralized **self-organizing traffic lights** — signals that
adapt from local rules rather than a fixed cycle. **Lesson 8 (traffic
light) is a partial hook**: it's authored as a fixed-cycle FSA
(red→green→yellow→red), which is Klir/Bunge structural, not
self-organizing. The multi-agent-intersection idea I'd flagged as an
alternative is feasibility-untested (unclear whether the current
single-conservation-engine run supports several interacting local-decision
loops) — downgraded to aspirational, not a near-term build.

**Better, verified hook: a minimal random Boolean network (RBN).** Read
López-Díaz, Rivera Torres, Febres & Gershenson (2026, *npj Systems Biology
and Applications*, doi 10.1038/s41540-026-00770-8; Gershenson co-author, in
Shingai's Zotero) — a real, current joint publication, not just a shared
interest. An RBN (Methods §"Random Boolean Networks") is `N` nodes, each
with a Boolean update rule over a fixed in-neighborhood; the classical
(deterministic, synchronous) case is *exactly* a function on a `2^N`-state
space — every state has precisely one successor. **This is authorable in
bert-lenses today, with higher confidence than the traffic-light idea**: a
tiny instance (N=3, 8 states) is a set of things (states) plus a directed
relation where every node has out-degree 1 — literally Klir's `S=(T,R)`,
no bond declaration, no flow typing, no engine dependency. It needs no new
kernel machinery, unlike the Markov-mode work #67 flags for the
legislative-bill FSA — a *deterministic* RBN doesn't need probability at
all, just the authored transition graph. **What it teaches, honestly
scoped:** deterministic state-space dynamics as pure relational structure,
and — the sharpest find — a **fixed-point attractor is a state that maps
to itself**, i.e. a self-loop: Klir-legal (no irreflexivity gate), but
**refused under Mobus** (`check_self_loops`, same mechanism as Lesson 5's
thermostat refusal) if the model is stamped Operational. Authoring a small
RBN and hitting that exact refusal on a real Gershenson-coauthored subject
sharpens the structure-vs-behavior distinction directly, and gives the
suite a second, independent instance of the self-loop lesson. **What it
does NOT teach**: the paper's actual analysis machinery — the Ω
open-endedness metric, attractor persistence over simulated time,
comparing non-classical-logic variants — needs iterating the trajectory
forward, which is a non-conservation dynamics mode the kernel doesn't have
(the same gap #67 names for the bill FSA). So: structural-only, honest, a
strong Klir showcase — not a simulation of the paper's findings.
**Proposed optional model (non-canonical, 14th), replacing the
traffic-light-as-primary-hook**: "Minimal RBN" — N=3, K=2, one sampled LUT
per node, authored as an 8-state Klir transition graph, deliberately
including at least one fixed point to trigger the self-loop contrast.

**Hiroki Sayama** — SUNY Distinguished Professor, SSIE; Director, Center
for Collective Dynamics of Complex Systems (CoCo); complex systems, network
science, artificial life, computational social science (verified: profile).
Creator of **PyCX**, a repository of minimal, "easy-to-understand sample
codes" for complex-systems education — cellular automata, dynamical
networks, agent-based models (verified: PyCX paper). **The kinship worth
naming is the whole suite's design philosophy**, not one lesson: PyCX's
ethos — one clear minimal model per concept, runnable, accessible — is
exactly this curriculum's ground rule (one concept per model, everyday
domains). Lessons that best exemplify it: **Lesson 3 (bathtub)** — a
minimal runnable dynamical model in the PyCX spirit; **Lesson 11 (lemonade
stand)** — multiple interacting flows at toy scale; **Lesson 12
(decomposition capstone, blocked)** — speaks directly to Sayama's
multi-scale collective-dynamics interest once it unblocks. No new model
proposed here: the fit is at the level of curriculum design, not a single
lesson, and inventing a swarm/network lesson would need multi-agent
interaction the run engine doesn't yet demonstrably support (same caveat as
Gershenson's, unverified against the current kernel).

**Cliff Joslyn** *(note spelling)* — visiting professor, SSIE; **direct
Klir lineage** — MS 1989 and PhD 1994 at Binghamton *under George Klir*
himself (verified: Wikipedia + profile). Works in order/lattice theory,
hypergraph analytics, and generalized information theory, including a
proven isomorphism between a hypergraph's intersection complex and the
concept lattice of its incidence matrix (verified: research summary). **This
is the strongest hook in the suite**: bert-lenses' Klir lens — `S = (T, R)`,
relations as subsets of a Cartesian product — is a direct instantiation of
the formalism Joslyn's own advisor originated and that Joslyn has spent a
career extending into order theory. Lessons that best showcase the Klir
formalism, in order of fit: **Lesson 10 (mere relation vs bond)** — the
sharpest one, since it's the moment a raw Klir relation (`R ⊆ T×T`, no
systemhood commitment) gets *typed* into a bond, exactly the relational
move Joslyn's order-theoretic reading of Klir cares about; **Lesson 1
(John catches the ball)** — the bare `(T,R)` object at its simplest;
**Lesson 8 (traffic light)** — states/transitions as a relation with no
conserved substance, closest to a pure order-theoretic object in the suite.
**The Gershenson RBN proposal above sharpens this angle further**: a
deterministic RBN's transition function IS a relation where every element
has out-degree exactly 1 — a degenerate, functional case of `R ⊆ T×T` that
sits precisely inside the order-theoretic reading Joslyn's career has
pursued (functional graphs, cycle/attractor structure, no hypergraph
machinery required). If built, it's arguably the single cleanest Klir
object in the whole suite — cleaner than Lesson 1 or 8, since it needs no
domain vocabulary (source, sink, protocol) at all, just states and their
unique successors.
**Proposed optional model (non-canonical, 15th):** an org-chart or
prerequisite-chain as an authored **partial order** (e.g. "who reports to
whom," or "course A must precede course B") — directly relational, needs no
hypergraph support the kernel may lack, and gives a Hasse-diagram-adjacent
reading a Joslyn conversation would recognize immediately. Note: the
kernel's Klir lens currently exposes binary relations, not general
hypergraphs, so a true hypergraph showcase is aspirational, not buildable
today — the partial-order proposal stays inside what's actually shippable.
