# ADR 0001 — Canvas rendering: hand-rolled React+SVG, not xyflow

*2026-07-14 · Phase 2 (canvas spike) · status: **ADOPTED***

## Context

Phase 2 of the web-first rebuild is the canvas — the structural-modeling surface
where the Klir→Bunge→Mobus accretion lives (the *same* model re-read as the lens
deepens). The rendering/interaction stack was an open, load-bearing fork:

- **hand-rolled React + SVG** — full control over rendering + gestures.
- **xyflow / react-flow** — a batteries-included node-graph library.

The frontier council had flagged "xyflow fit assumed, not proven." The old egui
canvas used custom gestures (rim-drag to connect, Shift-latch source/sink,
auto-derive-environment) that don't obviously map onto a graph library's
handle/port connection model.

## The experiment (adversarial blind pick)

Both stacks built a **minimal author-only accretion canvas** to *one sealed
brief* (seed model, lens toggle → `validate_mode`, connect gesture →
`validate_connection`, live drag, place+name), in **isolated git worktrees**
(branches `spike/svg-canvas`, `spike/xyflow-canvas`), then evaluated **blind**
(stack labels stripped) against the kill criteria. Protocol: the `blind-pick`
skill; receipt in `operations/calibration/blind-pick-ledger.md` (2026-07-14 row).

**Both cleared the objective gates:** sub-50ms lens toggle, faithful accretion at
all three rungs, and the self-loop rejected at Mobus / accepted at Klir — with
bert-core's own error string surfaced verbatim. Zero systems logic in either JS.

**Blind result:** a near-tie on feel, with a *soft* lean toward the xyflow arm
("flows feel more flexible/flowy"). But two things surfaced on reveal:

1. **The blind partially leaked.** The rendering let the judge correctly guess
   which arm was the library — and that inference ("the more sophisticated canvas
   style") partly drove the lean. A feel-pick isn't clean when the artifact
   reveals its own stack.
2. **On the exact probe (self-loops), SVG was more faithful** — the SVG arm
   *renders* the self-cycle; the xyflow arm accepted it but didn't draw it at
   Klir/Bunge.

## Decision

**Build the Phase-3 canvas on hand-rolled React + SVG**, harvesting the one trait
the blind read preferred in xyflow — flowier bezier curves — which is cheap
control-point tuning in SVG, not a capability only a library provides.

## Rationale (why the soft blind lean was overturned)

- **Gesture fit.** The canvas's distinctive gestures — rim-drag-to-connect,
  Shift-latch source-vs-sink, auto-derive-environment, lens-conditional
  re-rendering — are *not* xyflow's handle/port model. The xyflow arm already hit
  real friction against it (double-click-to-zoom swallowing the place gesture;
  connection-drags requiring hand-scripted pointer sequences). SVG gives full
  control over exactly these.
- **The preferred trait is portable.** Flow "flowiness" is a bezier tuning knob,
  gettable in SVG. The traits unique to SVG in the spike (rendered self-cycles,
  boldness, color) were real and liked.
- **Precedent + surface.** gov-graphs already chose hand-rolled React+SVG over a
  graph library (Cytoscape) for this same class of structural viz. SVG carries no
  dependency, no imposed chrome, a smaller bundle, and no library gotchas.

## Modularity (why this is a safe, reversible call)

The rendering choice is **isolated behind the kernel projection seam** (Phase 2
Part 0, committed `e09f94b`): `project(canvas_model) → WorldModel`,
`validate_mode`, `validate_connection`. Both spike arms consumed that seam
*identically* — the kernel knows nothing about the renderer. So:

- All formalism stays in Rust; the renderer is pure face.
- If SVG proves wrong under the full-canvas load in Phase 3, the seam is untouched
  and the renderer can be swapped without touching a line of systems logic.

The bet is contained to `web/`'s rendering layer, not the kernel.

## Consequences

- **Phase 3** builds the full canvas on the `spike/svg-canvas` base (all gestures,
  primitive palette, save/export, boundary-ring/ports, harvested Bevy curved-flow
  polish). See the harvest note below.
- The `spike/xyflow-canvas` branch is kept for reference; its flowier-curve
  approach is the one thing to graft.
- The spike UIs are otherwise throwaway (not shipped in `web/`).

## Harvest (loser as organ donor)

From the xyflow arm (`spike/xyflow-canvas`): **the flowier bezier flow curves** —
port the control-point geometry into the SVG canvas's edge rendering so Phase 3
gets the flow feel the blind read preferred. (Everything else is xyflow-specific.)

## Note — SVG is text-native (a reinforcing bonus, not the reason)

The whole stack is text all the way down: `CanvasModel` JSON (the model) → Rust
kernel (the gate) → SVG (the rendered face). SVG being XML means the *rendered
output itself* is legible text — unlike xyflow's library-managed DOM or an opaque
bitmap `<canvas>`. That buys: readable/exportable diagrams (an LLM or a static
export can read the render, not just a screenshot); agent-inspectable output
(`read_page` gave clean semantics for the SVG spike vs library chrome for xyflow);
and no opaque layer anywhere — the shape a bounded-reasoner-in-the-loop wants.
**Guardrail:** the LLM authors the *model* (kernel-validated), never raw SVG (which
has no systemhood constraints). SVG's text-friendliness is for reading/export/
inspection, not for the LLM to draw systems. Wasn't load-bearing (gesture-fit +
control was), but it aligns with the guarded-LLM north star.
