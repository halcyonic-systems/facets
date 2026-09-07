# The co-author walks the deep-analysis procedure

**Status: PROPOSED.**

*2026-09-07. Tracking issue: [#377](https://github.com/halcyonic-systems/facets/issues/377). Written after the first stranger-run of the hosted co-author
(the "aquarium" draft, below). Grounded in Mobus ch. 3 (ontology), ch. 4
(the 8-tuple and Eq. 4.3), ch. 6 (the process of deep systems analysis),
the machine-checked `MobusSystem` in SSF `Systems/Mobus/Tuple.lean`, and the
seam contract in `Systems/Core/{Decomposition,InterfaceDecomposition}.lean`.
Subsumes [#354](https://github.com/halcyonic-systems/facets/issues/354)
(boundary-first incremental generation); builds on
[`llm-sl-authoring-plan.md`](llm-sl-authoring-plan.md) (the draft → preview →
accept loop) and [`decomposition-foundations.md`](decomposition-foundations.md)
(the seam). No code changed by this document.*

---

## 1. The specimen

Prompt: "an aquarium". Hosted co-author, Claude Haiku, first try:

```
system "Aquarium" : Concrete/Physical
domain "closed aquatic ecosystem"
component Water  primitive Buffering  interface
component Filter primitive Impeding   interface
component Heater primitive Modulating interface
component Pump   primitive Propelling interface
component Lights primitive Modulating interface
source Fish
source Algae
sink Atmosphere
flow Fish -> Water : matter "waste"
flow Algae -> Water : matter "oxygen"
flow Water -> Filter : matter "circulation"
flow Filter -> Water : matter "cleaned water"
flow Water -> Heater : energy "regulation"
flow Heater -> Water : energy "warmth"
flow Lights -> Water : energy "illumination"
flow Water -> Atmosphere : matter "evaporation" mere
@lens mobus
```

Read against the 8-tuple ⟨C, N, E, G, B, T, H, Δt⟩ this draft makes four
claims, three of them false, and it forecloses the fourth thing the
instrument exists to do.

| Slot | Claim the draft makes | Verdict |
|---|---|---|
| **B = ⟨P, I⟩** | five of five components are interfaces | `Tuple.lean` `interfaces_carry_flow`: an interface carries a membrane crossing. Only Water touches a source or sink. Four stamps are false. |
| **C, atomicity** | every component is a `primitive`, i.e. an atomic leaf | Eq. 4.3 and the simplest-process rule: atomic means "no internal decision rules beyond the transformation function". A heater is a homeostat (Fig. 4.12: sensor, inverter, comparator, actuator). Lights on a timer are a controller plus a lamp. The draft declared the tree to have no depth. |
| **E, G** | fish and algae are neighbouring systems; nothing supplies energy | In a "closed aquatic ecosystem" the fish are inside. Every work process imports energy (ch. 3 §3.5.2.2.1); heater, pump and lights draw from a grid that is absent. The keeper, who is both the customer (teleonomy, ch. 3 §3.4.2.2.1) and the supplier of food and water, is absent. |
| **N** | Pump belongs to the network | Pump has no flows. A component that touches nothing is not a component of this system. |

The kernel already knows three of these. At Operational mode `validate.rs`
runs `check_interfaces_carry_flow`, `check_dead_ends`,
`check_crossing_flows_route_through_interface` and
`check_interface_declarations_match_flows`. **The drafter never asked it.**
`draftSlWithRetry` (`web/src/coauthor.ts`) heals only `compile_sl` parse
errors; the model above compiles clean, so the loop stopped, the canvas
drew it, and the findings waited behind the Review button.

## 2. The core issue, stated once

The SL grammar carries three level claims: `interface` (this component
touches the membrane), `primitive` (this component is an atomic leaf),
`decomposes` (this component opens onto a child model). The instrument's
whole depth mechanism, the door and the seam contract, runs on those claims.

The co-author's contract is "one flat model from one description". It has
no notion of level, so it flattens the claims: stamps atomic on everything,
interface on everything, emits `decomposes` never. And its prompt teaches
none of the three, while every rule it does teach is about the boundary
(name the neighbours, materials are not things, ask who receives). A
boundary-only vocabulary plus a level-blind contract yields exactly the
pattern seen for weeks: interface-heavy first drafts and nothing below
them.

This is not a prompt bug to patch. Mobus's procedure is recursive and
iterative (ch. 6 §6.4.3, §6.7.3): identify the SOI, walk its boundary,
open it once, treat each subsystem as a new SOI. The instrument's spine is
that recursion (Eq. 4.3 by reference, `derive_child`, the seam). The
drafter is the one part of the instrument that does not run on it.

## 3. The fix as a system

Four moves. Each is independently shippable and testable; together they
give the co-author the procedure instead of a paragraph.

### 3.1 The drafter asks the kernel, not just the parser

`draftSlWithRetry` gains one more turn of the existing loop: after a clean
compile, run `validate` at the lens's mode (`MODE_BY_LENS`), and if
Error-severity findings exist, feed them back through the same `prior_sl` +
`errors` seam once. The kernel's messages already name the fix ("no flow
routes through this interface", "dead end at Pump"). Warnings stay for the
human. No new plumbing: `kernelFindingsBrief` already renders findings for
the correction path (#314).

*Effect on the specimen:* four false interface stamps and the flowless Pump
are refused by the kernel and repaired by the drafter before the canvas
draws anything.

### 3.2 The prompt teaches the three claims and the archetype

Replace decoration with definition, in `SL_AUTHORING_PROMPT` (GSR
`serve.py`):

- **`interface`**: a component that carries a flow to or from a source or
  sink. Most components are not interfaces. Never stamp one that has no
  crossing.
- **`primitive`**: an atomic leaf by the simplest-process rule. Use it only
  when the component does one kind of work with no sensor, controller,
  schedule or parts of its own. A component that has those is complex:
  leave `primitive` off and write a `description` naming what would be
  inside it. That description is the door the author will open.
- **Inside vs outside**: whatever the description places inside the system
  is a component; the environment is what the system exchanges with.
- **The archetype pass** (ch. 6 §6.6.1, Fig. 6.3): before writing sources
  and sinks, account for at least one energy input (every work process
  consumes energy: who supplies it?), matter in, product or behaviour out
  to a customer (start with the output, §6.5.1.2: what does this system do
  and for whom?), waste out, waste heat out. Missing categories are
  omissions, not simplifications.
- The worked example gains an interior component without the stamp and a
  complex component with a description door, so the pattern copied is the
  right one.

This is the half-day fix and the one that changes first drafts most.

### 3.3 The interior draft: the co-author walks through the door

This is the fuller fix and the answer to #354.

Today the door on a component mints a child through `derive_child`: a
`WorldModel` whose environment E′ is derived (one stand-in per parent
neighbour, the crossing half per SSF #43), whose boundary flows are fixed by
the seam bijection, and whose interior C′, N′ is empty. The human then draws
the interior by hand. The seam contract
(`check_decomposition_contract`) judges the result.

The move: **"Draft the interior" on the door.** The client sends the
drafter the derived child as SL (the stand-ins, the crossing flows, the
parent component's name and description, the lens) and asks for C′ and N′
only, in the order ch. 6 §6.7.2 prescribes:

1. the importer or exporter that owns each crossing (the interface members
   I′ ⊆ C′, one per stand-in flow);
2. the internal work processes that connect them, found by following the
   flows (§6.7.2.2, "follow the money"), energy first, then the main
   material by embedded energy, messages last;
3. `primitive` only on atomic leaves; a `description` door on every complex
   component; no new sources or sinks (E′ is derived, not authored; a child
   that bonds with something its parent slot never touches falsifies the
   substitution).

The kernel checks the seam and the child's own mode; the retry loop of
§3.1 heals. The human sees the child on the canvas exactly as the hand-drawn
path shows it, accepts or discards, and the parent's `decomposes` reference
is stamped only on accept.

Why this granularity and not per-port (#354's literal proposal): a level is
the unit Eq. 4.3 names, the unit the seam contract checks, and the unit
`derive_child` already produces. Per-port acceptance is free, because the
draft is SL text the author edits at the gate before accepting. Per-port
generation would cost one reasoner call per port (about eight seconds each
on the hosted tier) for no additional truth.

What this buys, beyond depth: the drafter never invents a boundary twice.
The first draft's boundary is the only one it invents; every deeper
boundary is derived from an accepted parent. The interior draft is the
smallest authoring task in the instrument (a fixed boundary, a few
components, a few flows), which is exactly the task a local model can
carry. #354's hope that "small local models become viable for authoring"
is realised here, not at the port level.

### 3.4 The first draft becomes phase A of the procedure

With §3.3 in place, the one-shot "Draft" is re-read as **phase A: identify
and bound** (ch. 6 §6.5 and §6.6, Figs. 4.14 and 4.15). Its honest output
is the opaque box: `system`, `domain`, purpose, the neighbouring systems,
the crossings, and the SOI as a single root interface component, the exact
shape of `assets/walkthroughs/steel-plant/level-0.sl`. Phase B is then one
click on the door: the interior draft of §3.3 against that boundary.

Two ways to offer it, both cheap once §3.3 exists. **Ruled 2026-09-07: A
only; the root's door is the lit invitation to B.** One call, one gate,
depth a visible choice. Flip trigger, on the rig's stranger runs: first
drafts accepted and the door never opened.

- **A then B automatically** for a stranger: "Draft" runs phase A, the
  accept gate shows the boundary, accepting it opens the door and drafts
  the interior. Two reasoner calls, two accept gates, one level of depth in
  the first minute.
- **A only** for the expert: the boundary comes back, and depth is the
  human's choice, breadth-first or depth-first (§6.7.3.1.3), by where they
  click.

Recursion is free: every component at every level already has the door.

## 4. What is deliberately not proposed

- **Multi-level SL in one call.** Nesting is not in the grammar, Option B
  (by reference) is settled, and one-call depth is guessing three
  boundaries at once.
- **A conversational drafter.** The locked #10 design is one-shot per turn;
  §3.3 keeps that. Each interior draft is one turn with a derived context.
- **Kernel changes to structure.** Every check §3.1 needs already exists.
  One advisory is worth adding to the Mobus lens later, not now: a work
  process with no energy inflow reaching it (ch. 3 §3.5.2.2.1). It is a
  lens finding, not a structural error, and it belongs with the lens.

## 5. How it is tested, quickly

A fixture script in the seam-audit style (`scripts/seam_audit.py` is the
model) runs N short descriptions ("an aquarium", "a bakery", "a wall
thermostat", "a neuron") through the reasoner under two or three models and
scores each draft mechanically from the compiled model, nothing the kernel
does not already carry:

| Measure | Reads from | Target after §3.1 and §3.2 |
|---|---|---|
| interface stamps without a crossing | `check_interfaces_carry_flow` | 0 |
| components with no flows | `check_dead_ends` | 0 |
| share of components stamped `primitive` | compiled model | well under 1 |
| components carrying a description door | compiled model | most complex ones |
| energy input present | G edges of kind energy | every system with a work process |
| kernel retries per draft | the turn ledger | 0 or 1 |

For §3.3, the same descriptions decomposed one level: seam contract passes
on first or second try; a human rubric on three specimens (the heater comes
back complex, the pump atomic). Two models compared blind, per the
experiment discipline.

## 6. The usage loop

Every co-author turn already records description, SL, model, status and the
human's ruling (#325). Add three fields: phase (A, interior), level, and the
kernel's finding count before and after the retry. A twenty-line weekly
readout over the ledger then answers the question this document started
from: are first drafts still flat, and are interiors being drafted through
the door. The readout, not a feeling, decides the next prompt change.

## 7. Order and cost

1. §3.1 and §3.2 together: one session. They fix the specimen and every
   first draft after it.
2. §3.3: one to two sessions. `derive_child`, `authorSl` with
   `prior_sl`/`errors`, the seam check and the door all exist; the new parts
   are one prompt variant in GSR, one client function that renders the
   derived child as SL, and one affordance on the door.
3. §3.4 and §6: one session, after §3.3 has been used by hand for a week.
4. #354 closed into #377 on 2026-09-07 with a point-by-point disposition.

None of it displaces the week's unit. Each step is a small block, and the
first step is the one worth taking before Nick Mobus opens the door.
