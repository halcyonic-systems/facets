# Mobus's account of dynamics — source read

Corpus read: `operations/systems-science/mobus/` (chapters 2–5, 10–12) and
`operations/systems-science/mobus-kalton-2015/` (chapters 10–11). All citations
below are VERIFIED (I read the cited passage directly) unless marked UNVERIFIED.
File paths are relative to `/Users/home/Desktop/halcyonic/operations/systems-science/`.

---

## 0. Headline finding, up front

Mobus does not have one formal theory of dynamics. He has:

1. A **formal but generic definition** of dynamics as "how processes operate or
   change inputs into outputs over time" (Principle 4) — domain-neutral, says
   nothing about conservation.
2. A **specific, un-argued engineering commitment**: the 8-tuple's `T` element is
   implemented as "any suitable form, such as ODEs or computer codes" (4.3.3.4),
   and elsewhere he flatly asserts, "without formal proof," that any system can be
   represented as "a flow network where the nodes are work processes that observe
   the laws of conservation (mass and energy)" (10-model-archetypes.md:35). This
   is the sentence bert-lenses inherited. It is stated as an assertion, not derived
   from the 8-tuple or from Principle 4.
3. Explicit, un-integrated **acknowledgment of alternative dynamics formalisms**
   (FSM, Markov chains) as legitimate but treated as a footnote-level aside, never
   folded into the T/H/Δt machinery (12-governance-model.md:559).
4. An **implementation stance** — dynamics/behavior are "implemented using
   embedded scripts" (4.4.1.2.3, line 535) — that he presents as *the* mechanism
   for T, not one option among several. This is the line CLAUDE.md already flags
   as rejected engineering practice (JavaScript per element). Reading the source
   confirms: this is Mobus's *implementation choice* for a description language
   (SL/sysXML), not a theoretical requirement derivable from the 8-tuple.

So: the conservation-flow reading that bert-lenses runs today is **one of
Mobus's own claims**, but it is asserted rather than derived, sits alongside an
explicit acknowledgment that FSM/Markov dynamics exist and are used in the same
kinds of systems he's modeling, and his actual implementation mechanism (T as
"any suitable form... ODEs or computer codes") is already dynamics-agnostic at
the point of formal definition. The narrowing to conservation-flow happens in
his *prose commentary*, not in the 8-tuple's mathematics.

---

## (a) Formal definitions of dynamics / process / behavior

### Dynamics — Principle 4

> "Dynamics (or overt behavior) refers to how the processes operate or change
> inputs into outputs over time."
— `mobus/2-principles-of-systems-science.md:323` (§2.3.4, "Principle 4: Systems
Are Dynamic over Multiple Spatial and Time Scales")

This is the closest thing to a formal top-level definition, and it is
**maximally general** — it does not mention conservation, flow rates, stocks,
or any particular mathematical machinery. The rest of §2.3.4 (lines 323–325) is
about multi-timescale mismatch and feedback-loop instability (clearcutting vs.
tree reproduction cycles), not about the mechanics of transformation.

Notably, in §2.1.3 (lines 108–110), Mobus explicitly warns against treating
dynamics (specifically System Dynamics / SD, stocks-flows-controls) as the
whole story:

> "For example, dynamical behavior is, of course, an extremely important aspect
> of a system... But dynamics, although extremely important, is just one aspect
> of a system that needs to be taken into consideration when attempting to
> understand the whole system."
— `mobus/2-principles-of-systems-science.md:110`

This is a direct textual warrant for the research question: Mobus himself flags
that treating SD-style flow dynamics as *the* dynamics facet is a category
error, even though (as shown below) he then does exactly that when it comes to
specifying `T`.

### Process — §3.5.2.2.1

> "A process is a system that performs a transformation on its inputs to
> produce outputs that are different in form, quantity, or organization."
— `mobus/3-system-ontology.md:1116`

This is the formal definition of PROCESS as an ontological primitive (Chap. 3),
distinct from Chapter 5's "process," which is a different sense of the word —
see the correction below.

**Correction to the task brief**: Chapter 5
(`5-introduction-to-process-understanding-systems.md`) is **not** about PROCESS
as a dynamical/work-process archetype. I read it in full (244 lines). It is
about the *meta-process of systems analysis* — Mobus's seven-component
methodology for doing Deep Systems Analysis (DSA): deep analysis →
knowledgebase → modeling → simulation → design/policy generation → monitoring →
governance (§5.2, lines 56–186). The one dynamics-relevant sentence is a
tautology, not a formalization:

> "Processes are defined as sustained only if they are in some way bounded and
> all sub-processes contribute to the purpose of the whole in a balanced way...
> as argued previously, system ↔ process; all systems are also processes!"
— `mobus/5-introduction-to-process-understanding-systems.md:42`

This is Principle 2 (below), restated, not a new formal contribution to "what
is dynamics." Absence finding: Chapter 5 does **not** address T, H, Δt, FSM, or
conservation at all — it's the wrong chapter for this research question despite
its title suggesting otherwise. The real formal content on process-as-dynamics
lives in Chapter 3 (§3.5.2.2.1, PROCESS ontological primitive + atomic work
processes) and Chapter 4 (§4.3.3.4, T).

### Principle 2 — systems are processes

> "Since all components and their interactions exist only as processes
> unfolding in time, the word 'system' and the word 'process' are essentially
> synonymous... Even systems that seem inert on the time scales of human
> perception, for example, a rock, are still processes."
— `mobus/2-principles-of-systems-science.md:285` (§2.3.2)

This is Mobus's ontological move: system = process, unconditionally, at every
scale. It licenses treating an FSA or a Boolean network as "a system" in his
sense (they transform inputs into outputs over time) without needing any
conservation commitment — Principle 2 doesn't mention substance conservation.

### Atomic work processes (the conservation-flow vocabulary)

> "All processes transform low-quality material, energy, or messages into
> high-quality versions of the same. Work processes require the input of
> high-potential energy to drive the work itself. In doing work, according to
> the Second Law of Thermodynamics, some of the energy does not accomplish
> work, but is transformed to a low-potential form — waste heat."
— `mobus/3-system-ontology.md`, Fig. 3.17 caption, lines 1125

Five atomic work-process types are given (combine, split, impede, propel, plus
a raw-stock buffer) in `mobus/4-a-model-of-system.md:250-251` (the "simplest
process rule," Fig. 4.5), and a sixth, **Copying**, is introduced separately in
`mobus/3-system-ontology.md:1195`:

> "Copying takes a patterned input substance and an un-patterned one, outputting
> the original input (think of it as a template) and a copy of the pattern in
> the second output (plus some waste from imprinting the pattern)."

This is the conservation-flow vocabulary bert-compose's circuit engine runs on.
It is real, formal, and Mobus commits to it explicitly for **material/energy**
transformation. See (e) below for why Copying already breaks a naive
conservation-only reading.

---

## (b) T — domain, codomain, what it does

> "T is the set of transformation rules for the subsystems in S. That is, for
> each $c_{i,l} \in C_{i,l}$ there is a formula, equation, or algorithm,
> $t_{i,l}$, that describes the transfer function of that component for
> transforming inputs to outputs. These may be expressed in any suitable form,
> such as ODEs or computer codes."
— `mobus/4-a-model-of-system.md:407` (§4.3.3.4 "Transformations")

Key facts, all VERIFIED from that same section (lines 406–416):

- **Domain/codomain**: T is defined *per component*, one transfer function
  $t_{i,l}$ per $c_{i,l} \in C_{i,l}$. It is not a single global transformation
  on the SOI; it's a family indexed the same way C is indexed.
- **Inputs/outputs of $t_{i,l}$ are the flows represented in graph G** (the
  environment-boundary flow graph) and by extension N (internal flows): "The
  inputs and outputs are the same flows as represented in the G graph" (line
  409). So T is explicitly typed against the flow-network structure — this is
  the textual root of the conservation-flow bias, because T's stated
  input/output type is *flows*, not e.g. discrete symbolic events or messages
  in the FSA sense.
- **T is explicitly form-agnostic at definition time**: "any suitable form,
  such as ODEs or computer codes" (line 407) — this phrase alone does not
  mandate conservation. An FSA transition function or a Boolean update rule is
  "a formula, equation, or algorithm" just as much as an ODE is.
- **T is progressively refined, not fully specified up front**: "it isn't
  necessary to make a full specification of the transformation at the start...
  a rough approximation... used as a placeholder" (lines 409–414), refined
  bottom-up as deconstruction proceeds (cites Principle 12).
- **T also appears overloaded as a symbol** in Chapter 4 §4.3.3.7.1 (Simonian
  complexity): "the number of transitions possible in the entire state space is
  T, a list of the pairs of from and to states" (`4-a-model-of-system.md:461`).
  This is a **second, distinct sense of T** — a finite-state transition
  relation used only for the complexity metric $|\mathcal{S}| = f(|S|+|T|)$,
  not the transfer-function T of the 8-tuple. Mobus reuses the symbol T for two
  different mathematical objects (transfer function vs. FSM transition list) in
  the same chapter without cross-referencing them. This is worth flagging: it
  is itself indirect textual evidence that Mobus's own apparatus already
  contains an FSM-shaped object (the transition-pair list) sitting right next
  to the conservation-flow transfer function, unreconciled.

**Bottom line on T**: the formal definition (line 407) does not mandate
conservation or ODE/flow semantics — it says "any suitable form." The
conservation-flow reading comes from (i) T's stated domain being tied to the
G/N flow graphs, and (ii) the *narrative gloss and worked example* (steel
plant, §4.5) always instantiating T as a material/energy transformation. bert
inherited the gloss, not a theorem.

---

## (c) H — record, state, or generator?

**H is a record (accumulated trace), not a state and not a generator**, per
Mobus's own formal definition:

> "H in very complex systems could be a super complex object that records the
> history of the system, or its record of state transitions... H augments T and
> all variables associated with elements in N and G in that it records traces
> of the changes in these variables over time."
— `mobus/4-a-model-of-system.md:419` (§4.3.3.5 "Memory")

The formal, mathematically stated version:

> "Let H at time t be defined as a set of measures (a list of variables in the
> system), $H_t = [v_1, v_2, v_3, ..., v_i, ..., v_n]_t$... The time series of
> $H_t$ sets provide a set of snapshots of the state of S at each time
> increment."
— `mobus/4-a-model-of-system.md:423-428`

So concretely: $H_t$ is a snapshot of state variables at time $t$; H as a whole
is the *time series* of those snapshots — "a data stream" (line 428). It is
explicitly **not required** ("Some simple systems, like atoms for example, may
have a NULL H; that is there is no memory of past states and future states
depend only on the current state and current inputs," line 419) — meaning H is
optional/nullable per system, and its presence is what distinguishes
memory-having systems (brains, biological systems generally) from Markovian
ones.

Critically, Mobus also says H **feeds back into T**: "the current state of T
can be based on all previous states" (line 419) — i.e., H is not causally
inert; it can parametrize the transfer function (this is how he'd represent
non-Markovian / path-dependent dynamics within the same 8-tuple). But he gives
no formal mechanism for *how* H parametrizes T beyond that one sentence — it's
asserted, not specified. This is an opening for bert-lenses: H-conditioned T is
explicitly licensed by Mobus but never formalized by him, so a principled
generalization (H as a queryable trace that a transition function can read)
would be extending the theory in a direction he pointed at but didn't build.

Direct answer to the brief's question: **H is a record**, specifically a time
series of state-variable snapshots (a "data stream"), not itself a state and
not a generator — though it can act as an *input to* T, making T's evolution
non-Markovian when H is non-null.

---

## (d) Δt and multi-timescale semantics

> "Δt, a time interval relevant to the level of the system of interest... In
> general, higher levels in the hierarchy of organization have larger Δts; the
> activities take longer than those at lower levels. Δt is generally an integer
> multiple of the lowest level time constant that is deemed relevant for a
> particular system. In discrete-time simulation, it is the time step over
> which the model of that level is computed."
— `mobus/4-a-model-of-system.md:432` (§4.3.3.6 "Time")

Two refinements given immediately after (both VERIFIED):

- **Time indexing** (§4.3.3.6.1, line 436): Δt may be replaced by a tuple
  $\langle\Delta t, x\rangle$ where $x$ is an integer cycle count — i.e., Δt is
  not just a scalar step size but can carry a discrete counting structure.
- **Cyclic intervals** (§4.3.3.6.2, lines 438–444): for periodic/quasiperiodic
  systems, Δt "can be replaced by a 'clock' or 'quasi-clock' function that
  counts Δt units until that count reaches a limit and the counter is reset to
  0." Explicitly flagged as "an unsettled area requiring more research" (line
  444).

Multi-timescale hierarchy semantics — the load-bearing principle is **Principle
4** itself, restated: "the lower the level of resolution in space dimensions,
the smaller the resolution in time scales relevant to dynamics" (§2.3.4, line
323), with the explicit warning that mismatched timescales across levels
("interdependent components operate with feedback loops of different temporal
scales") is a primary root cause of system instability and collapse (line
325). This is stated as a *structural/organizational* principle (faster
dynamics nest inside slower ones, tied to the same level index $l$ used for
C, N, G, B), not derived from any conservation law — it's orthogonal to (e).

**Answer to the brief**: Δt is level-indexed (tied to $l$, same index as C/N/G/B/T),
generally an integer multiple of the lowest relevant time constant, and can be
either a plain scalar step or a clock/counter structure for periodic behavior.
Multi-timescale hierarchy is a *consequence of the structural hierarchy* (each
level of organization gets its own Δt), not a separately derived dynamical
law — this matches the CLAUDE.md project note that "dynamics hierarchy = fixed-
point approximations" is a live research thread, not something Mobus already
formalized.

---

## (e) Conservation vs. non-conserved dynamics — does Mobus commit, and does he break his own commitment?

**The explicit conservation commitment** (this is the sentence bert-lenses
inherited):

> "It is asserted, without formal proof, that any system, no matter how
> complex, can be represented by Eq. 4.1, which captures both structural and
> functional information down to some level of detail. In other words, a model
> of any system (having the requisite systemness properties) can be represented
> by a flow network where the nodes are work processes that observe the laws of
> conservation (mass and energy) along with the second law of thermodynamics."
— `mobus/10-model-archetypes.md:35` (§10.1.1 "Representing Models")

This is the single most important sentence in the corpus for the research
question. Two things to note precisely:

1. Mobus flags it himself as **unproven** ("asserted, without formal proof").
   It is not a theorem of the 8-tuple; it is a working hypothesis about what
   Eq. 4.1 (the 8-tuple/7-tuple, see note under (f) on the tuple-count
   discrepancy) can represent.
2. The conservation claim is scoped to **mass and energy** explicitly — not to
   messages, and not to informational/decision state. This matters directly
   for (e).

**Where he allows/requires non-conserved dynamics — three separate textual
threads:**

1. **Messages are a distinct substance class governed by different physics.**
   `mobus/3-system-ontology.md:1238`: "Messages are specialized versions of
   energy (and often time material) flows. They are characterized by using
   very little energy in their transmission... They take little energy to
   propagate signals... and are most often amplified at the receiving end."
   Messages carry information, and information content is what does work on
   the *receiver's structure* (line 1135, "conversion of the information to
   knowledge for storage in the structure of the system"). Mobus never states
   "messages are not conserved" in so many words in this corpus (I searched;
   see method note below) — **this specific phrasing is UNVERIFIED against
   this text** and should be treated as an inference from the Lean
   formalization (per CLAUDE.md's `reference_mobus_8tuple_provenance.md`), not
   as a direct Mobus quote. What Mobus *does* say, verified, is that messages
   are physically cheap-to-transmit, amplified-on-receipt, and that a message
   received twice (identical encoding) carries zero *information* the second
   time even though the physical signal recurs (`3-system-ontology.md:226`,
   Fig. 3.3 caption) — i.e., informational content is not a conserved quantity
   even when the physical carrier flow is.

2. **Copying is a first-class atomic work process, and it is definitionally
   non-depleting.** `mobus/3-system-ontology.md:1195`: "Copying takes a
   patterned input substance and an un-patterned one, outputting the original
   input... and a copy of the pattern in the second output." By construction,
   the *pattern* is duplicated, not conserved-and-redistributed — the source
   pattern is not diminished by being copied (only the raw "un-patterned"
   substrate is consumed, plus waste heat from imprinting). This is a direct,
   textual crack in the "any system = a conservation-respecting flow network"
   claim from (10-model-archetypes.md:35): Mobus's own atomic-process
   vocabulary contains a process type whose defining feature is that the thing
   being moved through it (the pattern/information) is **not** conserved in
   the way mass or energy is, even though he lists Copying as one of the same
   five/six atomic processes that supposedly all "observe the laws of
   conservation."

3. **T is explicitly not required to be flow-shaped.** As shown in (b), the
   formal definition of T says "any suitable form, such as ODEs or computer
   codes" — it does not say "any suitable form, provided it conserves mass and
   energy." The conservation requirement is stated once, separately, in
   Chapter 10 as a claim about what Eq. 4.1 *can* represent, not as part of
   T's definition in Chapter 4.

**Method note on messages/conservation**: I ran targeted greps for
"conserv","copie","copy" across `3-system-ontology.md` and
`4-a-model-of-system.md` looking specifically for a "messages are not
conserved" or "copyable" claim in Mobus's own words. I did not find one.
CLAUDE.md's `reference_mobus_8tuple_provenance.md` line ("Message
copyable/not-conserved") is therefore either (a) drawn from the Lean
formalization's own semantic commitments rather than being a direct Mobus
quote, or (b) present somewhere I haven't read (e.g., Mobus & Kalton 2015 Chap.
7/8 on information, which I did not read for this task). **Flagging as an open
citation gap, not resolving it by inference.**

**Verdict for (e)**: Mobus commits to conservation explicitly but narrowly
(mass and energy, in one un-argued sentence in Ch. 10), while his own
ontological vocabulary (Copying as an atomic process, T's form-agnostic
definition, the informational-content-vs-physical-signal distinction in Fig.
3.3) already contains the seeds of a non-conservation-only account. He never
reconciles these. This is exactly the gap bert-lenses needs to fill with
argument rather than more assertion.

---

## (f) Implementation stance — theory requirement or engineering guess?

**Engineering guess, and Mobus effectively admits it.**

The "embedded scripts" line, in full context:

> "Behaviors or dynamics are implemented using embedded scripts. For example,
> the above flows are associated with scripts that run algorithms for
> simulation of the flow rates specific to the kind of flow. The
> transformations (T in Eq. 4.1) are expressed in transfer functions or
> simulation programs for the relevant component."
— `mobus/4-a-model-of-system.md:535` (§4.4.1.2.3 "Behaviors")

This sentence sits inside §4.4, "Toward a Language of Systems" — the chapter
where Mobus is designing SL (System Language) as a *description/markup*
language, explicitly analogized to HTML/XML with JavaScript for behavior:

> "SL is a 'description' language... An algorithmic description language (i.e.,
> programming language like JavaScript) is incorporated into SL to specify the
> operations of behaviors of the various elements, such as interface
> protocols."
— `mobus/4-a-model-of-system.md:509` (§4.4.1)

And later, describing the worked sysXML example, every `source_model` /
`sink_model` tag is typed `type="JavaScript"` (Listing 4.1, lines 593, 602,
610, 620, 631, 638) — confirming this is a literal implementation choice for
his SL/sysXML prototype, not an abstract requirement.

Mobus's own hedging language in that section is the strongest evidence this is
a guess, not a derivation:

> "We should emphasize that this exercise is just a preliminary concept of how
> SL might be implemented and is as much a playful exploration as a serious
> example. Research into how SL might be realized continues."
— `mobus/4-a-model-of-system.md:560` (§4.5)

So: **the theory (the 7-tuple/8-tuple, T as "any suitable form... formula,
equation, or algorithm") does not require embedded scripts.** T's formal
definition is implementation-neutral. "Embedded JavaScript" is Mobus's specific
engineering proposal for *one candidate description language* (sysXML), which
he himself calls exploratory and unfinished, not the theory's mandate. This
directly supports CLAUDE.md's existing stance ("Mobus's own answer to dynamics
was embedded JavaScript per element — we reject that") — the read confirms
that rejection is rejecting an engineering choice, not a theorem.

---

## Bonus finding: the tuple-count discrepancy (C,N,G,B,T,H,Δt = 7, not 8)

The text in `mobus/4-a-model-of-system.md:196-199` defines:

> "a system S is a 7-tuple: $S_{i,l} = \langle C, N, G, B, T, H, \Delta t
> \rangle_{i,l}$"

That is **seven** elements: C, N, G, B, T, H, Δt. There is no separate
top-level `E` (environment) in this tuple as printed. Environment appears only
as a *derived* construct nested inside G: "In certain contexts we will talk
about the tuple $E_{i,l} = \langle Src_{i,l}, Snk_{i,l}\rangle$ as being the
environment of component i at level l" (`4-a-model-of-system.md:303`) — E is
explicitly presented as contingent phrasing ("in certain contexts"), not a
first-class member of S.

CLAUDE.md's `reference_mobus_8tuple_provenance.md` describes the project's
anchor as "the machine-checked Lean 8-tuple ⟨C,N,E,G,B,T,H,Δt⟩... E
first-class." This is a **deliberate departure from the book text**, promoting
E out of G into a first-class tuple slot — which is a legitimate and probably
correct formalization move (Src/Snk-as-environment genuinely deserves
first-class status once you're doing type theory), but it should be named as
*the Lean formalization's improvement on Mobus*, not attributed to Mobus's own
7-tuple as printed. Flagging so the dynamics-research doc doesn't
retroactively misattribute the 8th slot to the book.

---

## Summary table

| Question | Mobus's answer (as read) | Formality | Citation |
|---|---|---|---|
| What is dynamics? | "How processes operate or change inputs into outputs over time" | Definitional, generic, no math | 2-principles:323 |
| What is T? | Per-component transfer function, "any suitable form... formula, equation, or algorithm," typed over G/N flows | Formal but form-agnostic | 4-a-model:407 |
| What is H? | Time series of state-variable snapshots; a record, nullable, can feed back into T | Formal, partial (feedback mechanism unspecified) | 4-a-model:419-428 |
| What is Δt? | Level-indexed time step, integer multiple of lowest relevant time constant; optionally a clock/counter for periodicity | Formal, with an admitted open research area (quasi-clocks) | 4-a-model:432-444 |
| Conservation commitment | "Any system... can be represented by a flow network where the nodes are work processes that observe the laws of conservation (mass and energy)" — asserted, unproven | Prose assertion, not derived from the tuple | 10-model-archetypes:35 |
| Non-conserved dynamics allowed? | Not stated as a general theory, but Copying (pattern duplication) and information-content-vs-signal both violate naive conservation in his own vocabulary; "messages not conserved" as an explicit phrase is UNVERIFIED in this corpus | Implicit tension, unreconciled | 3-system-ontology:1195, :226 |
| Alternative formalisms (FSM/Markov) acknowledged? | Yes — "finite state machines... hidden Markov chains... and other statistical methods" listed as legitimate coordinator decision models, "thoroughly explored elsewhere," not integrated into T/H/Δt | Acknowledged, not formalized into the 8-tuple | 12-governance:559 |
| Agent dynamics require finite states? | No — "the general model of an agent does not require a finitude of states of the system (or of the inputs)" | Explicit generalization beyond FSM | 11-agent-model:75 |
| Implementation stance (embedded scripts) | Presented as one exploratory candidate for SL/sysXML, explicitly hedged ("playful exploration," "research... continues"), not a theoretical requirement | Engineering guess, admitted as such | 4-a-model:509,535,560 |

---

## What this means for the "genuinely novel-but-grounded position" (not built here, just staged)

Three load-bearing facts from the read, for whoever writes the position:

1. **T's formal definition is already dynamics-agnostic** ("any suitable form
   ... formula, equation, or algorithm"). The conservation-only reading is not
   in the 8-tuple's math; it's in Mobus's Chapter 10 gloss and his worked
   examples. This means a more general account (FSA transitions, Boolean
   updates, agent policies, conservation flows — all as *instances of T*) is
   not a deviation from Mobus, it's a return to what he actually wrote in
   §4.3.3.4, un-narrowed by the Ch. 10 assertion.
2. **H is the right hook for non-Markovian / trajectory-recording dynamics**
   (DLG/FSA transition history, agent memory, Boolean-network state traces) —
   Mobus already licenses "T conditioned on H" in one sentence but never built
   it out. That's an open formal slot, not an invention from scratch.
3. **Mobus's own text warns against exactly the trap bert-lenses is in**:
   treating one dynamics facet (SD-style flow) as if it covers the whole
   territory (2-principles:110). The fix is textually authorized by Mobus
   himself, even though he didn't take it in his own worked examples.

---

## Files read (full or targeted) and NOT read

**Read in full**: `mobus/4-a-model-of-system.md` (873 lines),
`mobus/5-introduction-to-process-understanding-systems.md` (244 lines).

**Read in targeted sections** (grep-located, then read with context):
`mobus/2-principles-of-systems-science.md` (§2.1.2.2, §2.1.3, §2.3.2, §2.3.3,
§2.3.4, §2.3.5, §2.3.6), `mobus/3-system-ontology.md` (§3.5.2.2.1 PROCESS,
Fig. 3.3 caption, atomic work processes incl. Copying, messages passage),
`mobus/10-model-archetypes.md` (§10.1–10.1.2), `mobus/11-agent-model.md`
(§11.2.1–11.2.2, FSM footnote), `mobus/12-governance-model.md` (§12.3.4.2,
coordinator decision models incl. FSM/Markov line).

**Read the abstract/intro of, then grep-scanned for dynamics-specific
vocabulary (trajectory/attractor/state-space/Boolean network) without finding
formal content, so did NOT read in full**: `mobus-kalton-2015/10-auto-
organization-and-emergence.md` (2884 lines — "trajectory" used narratively re:
evolutionary direction, not as a dynamical-systems formalism),
`mobus-kalton-2015/11-evolution.md` (2796 lines — same pattern). Absence
finding: neither chapter offers a state-space/phase-space/attractor-basin
formal treatment of evolutionary dynamics; "trajectory" throughout is used
colloquially (a system's developmental direction over historical/evolutionary
time), not as a technical term tied to T/H/Δt. If genealogy of the K≅2
Boolean-network or multi-timescale work needs Mobus-Kalton 2015 specifically,
it likely lives in chapters I did not read for this task (their Chap. 6 on
dynamics generally, or Chap. 9 on regulatory/cybernetic subsystems) —
UNVERIFIED, flagging as a gap rather than guessing.

**Not read at all**: `mobus/1-Introduction.md`, `6` through `9`, `13`
through `16`.
