# ADR 0008 — The agent layer: an agent is a distinct thing that reads a level and commands a work process

*2026-10-10 · status: **ADOPTED*** (design pass on the main loop, six decisions ratified by Shingai on 2026-10-10, each under one standing condition: documented with Mobus's own sentences and stress-tested early and often; #269)

## Context

The engine is process-based: every component is one of Mobus's ten atomic work
processes doing its own work each tick, every engine field is a declared, ranged,
session-addressable knob (`param`, #474/#475), and the bench logs each knob edit
with tick, target, field and value. #269 asked where an agent lives, what
composition discipline unblocks a first honest rung, which model goes first, and
what the Lean side owes.

Mobus ch. 11 gives the agent in one figure and one sentence. Fig. 11.1: "a
computational engine, a decision model, and an experiential memory." §11.2.1:
"The agent is given agency, the power to affect the necessary response to the
environmental conditions, when its output signals command an actuator having the
necessary power to affect changes on those conditions (requisite variety, Ashby
1958)." Goals come from outside the agent ("Agents are supplied with motivations
and goals from sources outside the basic agent model"). §11.3.4.1 splits policy
from procedure: "in a homeostatic mechanism, the set point represents the ideal
value … The policy is thus given in the system's construction and the procedures
are embodied in the response mechanisms." Ch. 12 §12.2.3.1: "Every work process
has at least a minimal decision agent that adjusts the operations to match the
real-time flows being processed."

Read against the engine line by line, the thermostat room already contains that
minimal agent, built from three primitives: a Sensing tap reads the room's
level; an Inverting comparator emits `setpoint − reading`, floored at zero
(`circuit.rs`, Fig. 4.12); a back-pressured Modulating valve reads that message
as its gate. Observation, decision model, actuator. No memory. What the engine
cannot say is who turned the knob, and what it cannot express is any decision
rule the ten primitives do not already compute (there is no bang-bang
primitive).

## Decision

**D1. The agent is a distinct thing kind, and it extends the compose stepper.**
No third executor. In SL an `agent` line beside `component`; on the canvas a
palette item drawn with ch. 12's management oval; in the engine a node kind
whose transfer function is its policy. The ten work-process kinds stay ten:
Mobus separates work processes from the agents that manage them, so an eleventh
thing kind is not an eleventh work process. Fig. 11.1's three parts are fields
on the node (the rule; the memory trace; the tick is the engine). Opening an
agent to see its parts is a decomposition, later.

An agent acts in one of two forms, both "managing a work process":

| Form | Emits | Lands on | Mobus |
|---|---|---|---|
| Signal | a number on a message wire, each tick | a work process's control input | operational, §12.2.3.1 |
| Command | a knob write on a declared `param` | a field (a setpoint, a share weight) | coordination, §12.2.3.2 ("change an operational parameter (e.g., the set point)") |

Signal form is built first: the agent drops into the comparator's slot and the
equivalence with the existing chain is exact by construction. The command form
lands with the second model, and it reaches **declared params, never raw engine
fields**, for three reasons. A param carries a `range`, which is the only place
requisite variety can be checked: the agent's output span against the knob's
declared span, refusable with both ranges printed. Declaring the knob is Mobus's
"goals supplied from outside" done in the open. And the bench already addresses
every knob, flow amount or component field, by the model's names through one
path. Consequence for spec §4.5: **a param is inert until an agent names it;
then it is required**, exactly as a setpoint in Mobus is a declared value the
procedure depends on. The "byte-identical projection with and without param
lines" guarantee holds for every param no agent names.

Timing: the agent reads the pre-tick level, the same number an observation tap
delivers, then the ordinary step runs. Synchronous, read-before-write, as the
gradient phase already is.

**D2. All agents in a run share one dynamics kind; deterministic at the first
rung. Rule names mix freely.** The position doc's "unsolved" blocker
(`design/dynamics-principled-position.md`, Agent trajectories row) is
heterogeneous composition of *functor kinds*; SSF `Transition.lean` says the
same in its header ("HOMOGENEOUS / PER-KIND ONLY"). Threshold, Proportional,
Table and Trace are all `Id`-kind transfers, the same kind as the ten
primitives, so a thermostat and a quota agent in one run add coordinates to a
state that is already a product. Markov crosses the line (a `Dist`-kind node in
an `Id` circuit) and waits for its own rung with the seed-and-reproducibility
discipline the position doc names.

**No agent over agent at the first rung**, as two refusable checks: an agent's
observation reads a stock's level, never another agent's output; its command
lands on a work process, never on an agent. The engine could run the simple
chain today (`eval_order` already orders signal nodes within a tick); the
deferral is for the proof, not for capability. A manager layers the state and
separates time scales (§12.2.3.3: each level "works, essentially, on
time-averaged values from the level below it"), which is a second obligation
with its own separating instance. The simple manager case is the rung after.

What an agent may manage at the first rung is a **property, not a family**: the
work process reads a control signal. Today that is Modulating (gate),
Amplifying (drive) and Buffering (release). The Review check reads that
property, never a hardcoded list.

**D3. The thermostat room is the first model, and Proportional carries the
proof.** The comparator *is* `setpoint − reading`: a proportional rule with gain
one. So the agent form must trace the Inverting form float for float at the
same setpoint; that is a pinned test, not a theorem, and it is the first PR's
terminal proof. Threshold follows at once as the first trajectory only an agent
can produce (a square wave none of the ten primitives can express); its witness
is that curve. Then the bench models with their aggregate forms as controls:
hospital beds (admissions on occupancy), SIR (contact rate on infected count),
logistic harvest (quota on stock), bank run (withdrawals on reserves). llm-market
buyers, the issue's own target, come with the command form.

**D4. The policy vocabulary is closed, one reading each, each owing a refusal,
on Mobus's ladder (§11.2.1.1) in order.**

| Rule | Reading | Mobus type | Memory | Refusal |
|---|---|---|---|---|
| Threshold | reading ≥ a → emit x, else y | purely reactive ("a simple thermostat is an easy example") | none | x or y outside the managed process's reach |
| Proportional | gain · (target − reading) | purely reactive; Wiener's error correction, §12.3.2 | none | zero gain, which watches nothing |
| Table | a declared map from reading bins to outputs | purely reactive ("an algorithmic or heuristic program of response") | none | overlapping or gapped bins |
| Trace | emit from a statistic over the agent's own past readings | adaptive reactive ("tracks the input variables and responds in kind. This is the homeostatic mechanism") | yes; the first use of H | a zero window |

Named in the spec and not built: **Markov** (#67; changes the dynamics kind),
**anticipatory** (a rule that rewrites its own table or gain from its trace;
"capable of 'learning' or modifying their own decision model"; the word
*learning* is reserved for this rung), **intentional** (forms new goals; out of
scope). Two of Mobus's distinctions are carried into the spec verbatim: policy
versus procedure (the goal is a declared `param` the author writes; the rule
kind is the procedure the kernel supplies), and agency requires requisite
variety (a rule whose outputs the managed process cannot reach is not in
control, and is refused). Claim hygiene on every surface that shows a decision:
"the policy chose", never "the agent wanted".

**D5. The agent line walks the author through the four decisions in order:
watch, rule, goal, manage.** New spec §4.7, after `metric`.

```
agent Thermostat watches Room rule proportional target 1 gain 1 manages Switch
param "setpoint" : target of Thermostat range 0.2..2

agent Thermostat watches Room rule threshold above 1 emit 0 else 1 manages Switch
param "comfort" : above of Thermostat range 0.2..2
```

`watches` names one stock and reads its **level** (Mobus: "state information at
time t"); the compiler draws the observation tap. `manages` names one
control-reading work process; the compiler draws the command wire. Parser
refusals: `watches` a non-stock; `manages` a process that reads no signal, or an
agent; a hand-written flow duplicating the tap or the command wire. Later, each
as its own word because each is a different decision: `manages param "…"` (the
command form); `watches flow …` (feedforward, §12.3.2.3 "measuring the value of
inputs as compared with ideal values"; tactical, §12.2.3.2 watching "the
behaviors of the external agents").

**D6. The Lean obligation is `agent_step_is_product`.** For a circuit whose
agents are all deterministic, the step with agents is a deterministic transition
on the product of the stock coordinates and the agent-memory coordinates, with
no new functor. It builds on `JointState.lean` (run state as a dependent
product, adopted 2026-09-04) and `Transition.lean` (per-kind coalgebra).
Separating instance: the same statement with one Markov agent fails to
typecheck as deterministic, which is the proof that homogeneity is a
constraint and not a label. Not claimed: agents over agents, Markov, H beyond a
finite trace. Each is written as a later obligation with its own name.

## The work-process taxonomy, sourced

`design/lens-palettes.md` carried a two-family split marked UNVERIFIED:
matter/energy primitives (combining, splitting, buffering, impeding,
propelling) versus information primitives (sensing, copying, modulating,
amplifying, inverting). Checked against Mobus ch. 3 on 2026-10-10:

- **Fig. 3.18, "four simple work processes":** combining, splitting, impeding,
  buffering. Each shapes a substance flow.
- **Fig. 3.19, "additional atomic processes":** copying, propelling, sensing,
  amplifying, modulating. Of the last three: "when the input substance is a
  force or energy flow, we have the sensor or amplifier effect," and the
  modulator "is in this same category."
- **Inverting** is in neither figure. It enters in ch. 4's comparator example
  (Fig. 4.12: "sensing, an inverter, a modulator, and a combiner").

The guess was wrong on propelling (Fig. 3.19, not the substance family), and
Mobus's own signal category is three members, not five. The corrected note
stands in `lens-palettes.md`. The set an agent can manage straddles his two
figures (buffering is a Fig. 3.18 process), which is why D2 makes
"manageable" a property and not a family.

## Rationale

- **Why not a third executor.** The agent writes what the bench knob writes and
  reads what the tap reads; the session, tick log, recorder, `bert bench`,
  keep-baseline and the inputs rail attach to the stepper already. A separate
  executor would need all six rebuilt and would split the decision log in two.
- **Why a distinct thing kind and not a badge on a Sensing node.** A threshold
  rule cannot be built from the ten primitives; the decision model is a
  genuinely new transfer function, licensed by the 8-tuple (T is "a formula,
  equation, or algorithm … computer codes"). A new rule deserves a visible
  carrier, and Mobus draws management as its own oval on the process.
- **Why signal before command.** The thermostat needs only the signal form, and
  the equivalence proof falls out of the existing chain. The command form is
  the coordination level, which deserves its own instance.
- **Why the cut is the functor and not the rule.** The product state the Lean
  side can write is per kind. Forbidding mixed rule names buys no safety and
  loses the hospital and fishery models in one stroke.
- **Why the thermostat and not llm-market.** One agent, one managed process,
  no composition question, an exact control on the same shelf, and a decisions
  column readable by eye (on, off, on). It proves the mechanism and nothing
  else, which is what a first rung should prove.

## Consequences

- Build in the #463 manner on the epic branch `agent-rung`: small PRs, a
  terminal proof each, folded on green; merges to main on Shingai's word.
  Order: this record and the taxonomy correction → the Agent node kind with
  Proportional and the float-for-float thermostat test → the SL line, spec
  §4.7 and the §4.5 amendment → Threshold, Table, Trace with one witness and
  one refusal each → canvas palette item, management oval, command edge,
  Review checks → the four bench stress tests → SSF `agent_step_is_product`
  (separate repo) → command form and llm-market buyers.
- The tick log gains a decisions column (an agent's observation, the rule's
  output, the wire written) and `KnobEdit` gains an author; a human knob and
  an agent knob become one record, distinguishable.
- Every surface that shows an agent's decision carries the claim-hygiene line.
- The spec states, next to the vocabulary table, that the aggregate forms on
  the shelf are the controls, and that every rung beyond the first is named
  and unbuilt.

Vault record of the pass:
`operations/sessions/2026-10-10/facets-agent-rung-reference.md` (not in this
repo). Issue: [#269](https://github.com/halcyonic-systems/facets/issues/269).
