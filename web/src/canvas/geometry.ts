// Rim/bezier helpers. No systems meaning here — pure pixel math for the SVG
// stage. Node hit-radius is kept close to the kernel's own RADIUS (34) so the
// canvas and the projected WorldModel agree on "where a thing sits."
// Lifted verbatim from the bert-lenses-spike-svg canvas spike.
import type { CanvasModel, Relation, Thing } from "../kernel/types";
import { STYLE } from "./style";

export const NODE_R = STYLE.nodeR;
export const CURVE_BOW = STYLE.curveBow;

export interface Pt {
  x: number;
  y: number;
}

/** Hit radius for an interface port. The capsule is 24×14 about its center, so
 *  a disc a little wider than its long half-axis. */
export const PORT_HIT_R = 16;

/** A port's pixel position and the component it belongs to. `I ⊆ C`
 *  (`Tuple.lean:97` `interfaces_sub`): an interface is a component wearing a
 *  designation, never a node of its own — so a port that is hit resolves to the
 *  component, and the canvas never has a third node type to connect to. */
export interface PortTarget {
  at: Pt;
  component: number;
}

/** The component owning the port under `p`, or null. Nearest wins when two
 *  ports overlap on a crowded membrane. */
export function portOwnerAt(targets: PortTarget[], p: Pt): number | null {
  let best: { id: number; d: number } | null = null;
  for (const t of targets) {
    const d = Math.hypot(t.at.x - p.x, t.at.y - p.y);
    if (d <= PORT_HIT_R && (!best || d < best.d)) best = { id: t.component, d };
  }
  return best ? best.id : null;
}

/** Point on the segment from `center` toward `target`, offset by `r` — the rim. */
export function rimPoint(center: Pt, target: Pt, r: number): Pt {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: center.x + (dx / len) * r, y: center.y + (dy / len) * r };
}

/** A cubic-bezier `d` between two rim points, bowed perpendicular to the line. */
export function bezierPath(a: Pt, b: Pt): string {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const c1 = { x: a.x + dx * 0.33 + nx * CURVE_BOW, y: a.y + dy * 0.33 + ny * CURVE_BOW };
  const c2 = { x: a.x + dx * 0.67 + nx * CURVE_BOW, y: a.y + dy * 0.67 + ny * CURVE_BOW };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

/** A straight `d` between two rim points — Klir's neutral undirected line. */
export function straightPath(a: Pt, b: Pt): string {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

/** A self-loop path bulging out from one rim point back to a nearby one on the same node. */
export function selfLoopPath(center: Pt, r: number): { d: string; labelAt: Pt } {
  const a = { x: center.x - r * 0.4, y: center.y - r * 0.92 };
  const b = { x: center.x + r * 0.4, y: center.y - r * 0.92 };
  const bow = r * 1.8;
  const c1 = { x: a.x - bow * 0.3, y: a.y - bow };
  const c2 = { x: b.x + bow * 0.3, y: b.y - bow };
  return {
    d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`,
    labelAt: { x: center.x, y: center.y - r - bow * 0.7 },
  };
}

export function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** A model thing by id — a trivial array lookup, no systems meaning. */
export function thingById(model: CanvasModel, id: number): Thing | undefined {
  return model.things.find((t) => t.id === id);
}

/** Perpendicular bow (px) per step between parallel edges — the visual peak
 *  offset so two flows on the same pair fan apart instead of overlapping. */
const PARALLEL_BOW = 30;

/** #306: an on-membrane interface renders at a fraction of a component's body —
 *  Mobus draws interfaces as pass-ways in the boundary, smaller than the
 *  processes they serve. Shared by NodeBody, edge rims, and notch placement. */
export const INTERFACE_SCALE = 0.65;

/** This relation's centered rank among siblings on the same unordered pair
 *  (…-1, 0, 1…) — the shared fan index for both the rim-to-rim bow and the
 *  exo crossing spread, so one flow occupies the same slot in both drawings. */
export function siblingStep(model: CanvasModel, relation: Relation): number {
  const siblings = model.relations
    .filter(
      (r) =>
        (r.a === relation.a && r.b === relation.b) || (r.a === relation.b && r.b === relation.a),
    )
    .sort((r1, r2) => r1.id - r2.id);
  return siblings.findIndex((r) => r.id === relation.id) - (siblings.length - 1) / 2;
}

/** The `d` + label anchor for a drawn relation, shared by every lens's EdgeView
 *  and the DrivePopover anchor (App reads it to place the popover at the same
 *  point the edge renders its name) — pure pixel math, no systems meaning. */
export function edgeGeometry(
  model: CanvasModel,
  relation: Relation,
  curved: boolean,
  /** Per-endpoint rim radii — an on-membrane interface (#306) has a smaller
   *  body, so its edges must land on the smaller rim, not float off NODE_R. */
  rr?: { a?: number; b?: number },
): { d: string; labelAt: Pt } | null {
  const from = thingById(model, relation.a);
  const to = thingById(model, relation.b);
  if (!from || !to) return null;
  if (relation.a === relation.b) {
    const loop = selfLoopPath(from, NODE_R);
    return { d: loop.d, labelAt: loop.labelAt };
  }
  const a = rimPoint(from, to, rr?.a ?? NODE_R);
  const b = rimPoint(to, from, rr?.b ?? NODE_R);

  // Parallel edges between the same pair of nodes would draw the identical path
  // and stack into one indistinguishable, unclickable line. Rank this relation
  // among its siblings on the same unordered pair (stable, by id) and bow it by a
  // symmetric perpendicular offset so they fan apart.
  const step = siblingStep(model, relation);

  if (step !== 0) {
    const mid = midpoint(a, b);
    // #180: the normal must come from a direction CANONICAL to the unordered
    // pair, not this relation's own a→b — a bidirectional sibling (b→a) has
    // that vector pointing the opposite way, which flips the normal and folds
    // its offset back onto the first relation's curve instead of fanning away
    // from it. Order by node id so every sibling bows off the same axis.
    const [lo, hi] = relation.a < relation.b ? [from, to] : [to, from];
    const dx = hi.x - lo.x;
    const dy = hi.y - lo.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len;
    const py = dx / len;
    const peak = step * PARALLEL_BOW;
    const cx = mid.x + px * peak * 2;
    const cy = mid.y + py * peak * 2;
    return {
      d: `M ${a.x} ${a.y} Q ${cx} ${cy}, ${b.x} ${b.y}`,
      labelAt: { x: mid.x + px * peak, y: mid.y + py * peak },
    };
  }

  return { d: curved ? bezierPath(a, b) : straightPath(a, b), labelAt: midpoint(a, b) };
}

// ---- The Mobus membrane (Phase 3) -------------------------------------------
// Pure pixel math: WHERE the ring is drawn is layout; THAT there is a boundary,
// which nodes are on it, and where the ports are all come from the kernel's
// lens_facts. An ellipse (not a convex hull) because it stays sane at 1–2 nodes.

export interface Ring {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

const RING_PAD = NODE_R + 36;

/** Ellipse around the COMPONENT things only — env objects live outside it. */
export function componentRing(components: Pt[]): Ring | null {
  if (components.length === 0) return null;
  const xs = components.map((p) => p.x);
  const ys = components.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  // √2 so the ellipse CIRCUMSCRIBES the node bounding box (passes through its
  // corners) instead of being inscribed in it — otherwise corner nodes drift
  // outside the membrane as the layout spreads. RING_PAD (> NODE_R) then keeps
  // the node bodies, not just their centers, inside.
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    rx: ((maxX - minX) / 2) * Math.SQRT2 + RING_PAD,
    ry: ((maxY - minY) / 2) * Math.SQRT2 + RING_PAD,
  };
}

/** The point ON the ring at the parametric angle of `toward` from its center —
 *  port placement that tracks an env object as it drags. */
export function ringPoint(ring: Ring, toward: Pt): Pt {
  const theta = Math.atan2((toward.y - ring.cy) / ring.ry, (toward.x - ring.cx) / ring.rx);
  return { x: ring.cx + ring.rx * Math.cos(theta), y: ring.cy + ring.ry * Math.sin(theta) };
}

// ---- The per-lens container (#100 phase 0) ----------------------------------
// Still pure pixel math: WHAT the containment means per lens (Mobus's membrane
// object vs Bunge's observer partition vs Klir's none) is decided by which of
// these the canvas draws — here is only WHERE. Both follow the COMPONENT things
// as they move, and fall back to a small enclosure when the interior is empty:
// an empty system is still a system, and the walked-into newborn (G′ stand-ins
// only) must read as a place, not a blank.

/** Half-extent of the empty-interior container. */
const EMPTY_HALF = NODE_R * 2;

type Placed = Pick<Thing, "role" | "x" | "y">;

/** Where an empty interior sits: a newborn's stand-ins surround it, so their
 *  centroid; a fully blank canvas centers on the world origin. */
function interiorCenter(things: Placed[]): Pt {
  if (things.length === 0) return { x: 0, y: 0 };
  const n = things.length;
  return {
    x: things.reduce((s, t) => s + t.x, 0) / n,
    y: things.reduce((s, t) => s + t.y, 0) / n,
  };
}

/** The Mobus membrane for a model's things: the component ring, or — empty
 *  interior — a small membrane at the stand-ins' centroid. Never null: under
 *  Mobus the boundary is a reified object, present from birth. */
export function membraneRing(things: Placed[]): Ring {
  const ring = componentRing(things.filter((t) => t.role === "Component"));
  if (ring) return ring;
  const c = interiorCenter(things);
  return { cx: c.x, cy: c.y, rx: EMPTY_HALF, ry: EMPTY_HALF };
}

/** Bunge's hull box — the observer's cut over one flat ontology. Drawn dashed,
 *  unfilled, unclickable by the canvas; an axis-aligned box (not an ellipse) so
 *  the partition and the Mobus membrane cannot be mistaken for each other. */
export interface Hull {
  x: number;
  y: number;
  w: number;
  h: number;
}

const HULL_PAD = NODE_R + 28;

export function bungeHull(things: Placed[]): Hull {
  const comps = things.filter((t) => t.role === "Component");
  if (comps.length === 0) {
    const c = interiorCenter(things);
    return { x: c.x - EMPTY_HALF, y: c.y - EMPTY_HALF, w: EMPTY_HALF * 2, h: EMPTY_HALF * 2 };
  }
  const xs = comps.map((t) => t.x);
  const ys = comps.map((t) => t.y);
  const minX = Math.min(...xs) - HULL_PAD;
  const maxX = Math.max(...xs) + HULL_PAD;
  const minY = Math.min(...ys) - HULL_PAD;
  const maxY = Math.max(...ys) + HULL_PAD;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// ---- Fit-to-content (#83; #78 PNG export reuses `contentBounds`) ------------
// Pure view/pixel math: the world-space extent of everything drawn, and the
// pan+scale that frames it in a viewport. No systems meaning — no verdict reads
// pan or scale, and the box is layout, not systemhood.

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** World-space bounding box of everything drawn for `model`: node bodies
 *  (center ± NODE_R) unioned with the per-lens container (#100 phase 0 — the
 *  Mobus membrane / Bunge hull reach past the node box, and draw even for an
 *  empty interior, so an empty Mobus/Bunge model still has drawn content).
 *  Null only when nothing at all is drawn (an empty Klir model — no
 *  container). Shared by fit-to-content and SVG/PNG export. */
export function contentBounds(model: CanvasModel): Box | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const t of model.things) {
    minX = Math.min(minX, t.x - NODE_R);
    minY = Math.min(minY, t.y - NODE_R);
    maxX = Math.max(maxX, t.x + NODE_R);
    maxY = Math.max(maxY, t.y + NODE_R);
  }
  if (model.lens === "Mobus") {
    const ring = membraneRing(model.things);
    minX = Math.min(minX, ring.cx - ring.rx);
    minY = Math.min(minY, ring.cy - ring.ry);
    maxX = Math.max(maxX, ring.cx + ring.rx);
    maxY = Math.max(maxY, ring.cy + ring.ry);
  } else if (model.lens === "Bunge") {
    const hull = bungeHull(model.things);
    minX = Math.min(minX, hull.x);
    minY = Math.min(minY, hull.y);
    maxX = Math.max(maxX, hull.x + hull.w);
    maxY = Math.max(maxY, hull.y + hull.h);
  }
  if (minX === Infinity) return null;
  return { minX, minY, maxX, maxY };
}

export interface ViewTransform {
  pan: Pt;
  scale: number;
}

/** Pan+scale that centers `box` in a `vw`×`vh` viewport with a `pad` px inset,
 *  clamped to [minScale, maxScale]. maxScale (default 1) keeps a tiny model from
 *  blowing up to fill the stage; the clamp range mirrors the wheel-zoom limits.
 *  Same transform the stage `<g translate scale>` consumes — no new system. */
export function fitToBox(
  box: Box,
  vw: number,
  vh: number,
  opts: { pad?: number; minScale?: number; maxScale?: number } = {},
): ViewTransform {
  const pad = opts.pad ?? 48;
  const minScale = opts.minScale ?? 0.25;
  const maxScale = opts.maxScale ?? 1;
  const bw = Math.max(1, box.maxX - box.minX);
  const bh = Math.max(1, box.maxY - box.minY);
  const raw = Math.min((vw - 2 * pad) / bw, (vh - 2 * pad) / bh);
  const scale = Math.max(minScale, Math.min(maxScale, raw));
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  return { pan: { x: vw / 2 - scale * cx, y: vh / 2 - scale * cy }, scale };
}
