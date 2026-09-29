# 0007 — A 3D exploded view of the Model face, behind a beta door

Status: accepted for stage 0 (spike), 2026-09-29. Tracking: facets#435.

## Decision

The Model face gains a read-only 3D view as a sibling of the SVG canvas: a
lazy-loaded `<Canvas3D>` that takes the same inputs (`CanvasModel`, the
kernel's `LensFacts`, the scrubbed `SimFrame`) and never calls
`onModelChange`. It is opened by a `3D · beta` pill beside the lens pills, and
the pill exists only when the beta door is open (`?beta=3d` once; the choice
persists in `localStorage` under `facets.beta.view3d`; `?beta=0` closes it).

The container is a capsule along the throughput axis, sources banking at one
end and sinks at the other. The model asserts exactly one direction; the
capsule is the shape with exactly that symmetry. Its round cross-section
leaves interior components unranked and its caps give crossings a readable
normal. Per lens, the registry declares the container (`shell3d`): Mobus's
membrane is the capsule, Bunge's hull a wire box, Klir none. The choice came
out of a three-arm blind pick over standalone pages, judged on the steel
plant at level 1; the box shell won on inside-versus-outside legibility and
the capsule is its principled refinement.

## Why not react-three-fiber

ADR 0001 hand-rolled the 2D canvas to keep the model and the pixels one
layer apart. R3F would put a second reconciler between them, double the lazy
chunk, and hand StrictMode's mount cycle to a library. Vanilla `three` in one
adapter file gives one explicit `dispose()`, one dynamic import, and a pure,
node-testable builder in front of it.

## Invariant 1 holds

`canvas3d/scene.ts` decides no systems fact. Interfaces come from
`authored_interface_thing_ids`, environment membership from `role`, ports
from `facts.ports`, orphans from `orphan_env_thing_ids`. With `facts: null`
the builder draws every component as interior and no ports at all; a test
pins that. The adapter resolves every colour through the token probe
(`colors.ts`), so no literal enters the file and the lens seam and theme
apply.

## Stage 0 kill criteria, as measured

| Criterion | Result |
|---|---|
| Main chunk unchanged within 5 KB; three loads only on pill press | +1.6 KB against a clean build at the same commit; three in its own chunk (553 KB, 141 KB gzip), fetched on the first press |
| 20 pill toggles under StrictMode leave one WebGL context | see facets#435 comment for the run |
| Scene builder under 20 ms | pinned by `scene.perf.test.ts` on a 60-component, 200-flow model |
| `tsc`, `check:tokens`, vitest | clean; 766 tests pass |
| Builder interprets no model field | `scene.test.ts` "without facts" |

## What stage 1 owes

Three populations separable by form at 0 % explode, filtering menus (kind,
environment thing, port), file open and drop, `ample` rendered as the word,
labels that never collide with the register chrome. Stage 2 drives glyph
weight from `SimFrame`. Stage 3 nests a child model inside the selected body.
