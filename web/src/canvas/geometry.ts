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

/** Half-width of the port capsule along the membrane normal, in WORLD px, and
 *  the floor it will not render below on SCREEN.
 *
 *  The capsule carries the direction glyph — a chevron whose shape is the
 *  kernel's `PortFact.direction` (mobus.tsx `PortView`) — and at the Fed
 *  model's own fit zoom that chevron measured 4.6–5.6 SCREEN px. The channel
 *  was correct and simply too small to read.
 *
 *  The floor is why this takes `scale`. Text cannot be rescued this way — every
 *  label lives inside the one `scale()` group and nothing counter-scales, which
 *  is what made zoom-aware labels a dead end — but a GLYPH can, and the canvas
 *  already does it for the 18-screen-px edge hit paths via
 *  `vectorEffect="non-scaling-stroke"`. This is the same idea with an explicit
 *  number: proportionate when zoomed in (the base wins), legible when zoomed
 *  out (the floor wins). Not full counter-scaling — a constant-screen-size
 *  capsule would swell absurdly against the nodes at high zoom. */
const PORT_HW_WORLD = 14;
const PORT_MIN_SCREEN_HW = 13;

/** Ceiling on the capsule, as a fraction of the node RADIUS in world px.
 *  Without it the screen floor keeps inflating the capsule all the way down to
 *  ZOOM_MIN (0.15), where 13 screen px of half-width is 87 world px — a notch
 *  two and a half times wider than the whole component it sits on. The floor
 *  buys legibility; this stops it eating the drawing to get it. */
const PORT_HW_MAX_OF_NODE = 0.75;

/** The capsule's half-width in world px at a given stage scale. Three regimes:
 *  proportionate when zoomed in (the base wins), floored through the ordinary
 *  fitted range so the direction chevron stays readable, and capped past about
 *  0.5 so a far-out view does not turn every port into a blob. */
export function portHalfWidth(scale = 1): number {
  const floored = Math.max(PORT_HW_WORLD, PORT_MIN_SCREEN_HW / Math.max(scale, 0.05));
  return Math.min(floored, NODE_R * PORT_HW_MAX_OF_NODE);
}

/** Hit radius for an interface port — derived from the DRAWN half-width so the
 *  target cannot drift away from the capsule the reader is aiming at. The
 *  capsule grows when zoomed out; a fixed radius would have left its visible
 *  edge unclickable exactly where it is largest. */
export function portHitRadius(scale = 1): number {
  return portHalfWidth(scale) + 4;
}

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
export function portOwnerAt(targets: PortTarget[], p: Pt, scale = 1): number | null {
  const hitR = portHitRadius(scale);
  let best: { id: number; d: number } | null = null;
  for (const t of targets) {
    const d = Math.hypot(t.at.x - p.x, t.at.y - p.y);
    if (d <= hitR && (!best || d < best.d)) best = { id: t.component, d };
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

/** #264: an endpoint with at least this many edges is a fanout hub — labels on
 *  its wires slide toward the other (lower-degree) end, where the wires have
 *  spread apart, instead of piling at the clustered midpoints. */
const FANOUT_DEGREE = 4;

/** #306: an on-membrane interface renders at a fraction of a component's body —
 *  Mobus draws interfaces as pass-ways in the boundary, smaller than the
 *  processes they serve. Shared by NodeBody, edge rims, and notch placement. */
export const INTERFACE_SCALE = 0.65;

/** #306 write-back guard. Gestures hit-test against the PROJECTED model, so
 *  their writes carry projected interface positions for every thing they did
 *  not touch (untouched things pass through by reference). Persisting those
 *  positions feeds the next ring computation a bbox that includes points on
 *  the previous ring — the membrane inflates every drag frame (runaway
 *  stretch, 2026-08-09). Restore the AUTHORED thing wherever the outgoing
 *  object IS the projected one; anything the gesture actually changed is a
 *  fresh object and passes through untouched. */
export function unprojectWrite(authored: CanvasModel, projected: CanvasModel, outgoing: CanvasModel): CanvasModel {
  if (projected === authored) return outgoing;
  const restore = new Map<Thing, Thing>();
  projected.things.forEach((pt, i) => {
    const at = authored.things[i];
    if (at && pt !== at && pt.id === at.id) restore.set(pt, at);
  });
  if (restore.size === 0) return outgoing;
  return { ...outgoing, things: outgoing.things.map((t) => restore.get(t) ?? t) };
}

/** This relation's rank among siblings on the same unordered pair, and how many
 *  there are. Ordered by id so the assignment is stable across renders. */
function siblingRank(model: CanvasModel, relation: Relation): { i: number; n: number } {
  const siblings = model.relations
    .filter(
      (r) =>
        (r.a === relation.a && r.b === relation.b) || (r.a === relation.b && r.b === relation.a),
    )
    .sort((r1, r2) => r1.id - r2.id);
  return { i: siblings.findIndex((r) => r.id === relation.id), n: siblings.length };
}

/** Minimum angular gap, in radians, between two edges' contact points on one
 *  node's rim. At NODE_R this is roughly a 10px arc — enough that two
 *  arrowheads read as two.
 *
 *  Do not raise this without re-measuring a DENSE model. Widening the gap makes
 *  a resolved run wider, and a wider run walks into the edges on either side of
 *  it, which are not part of the run and do not move. Measured closest-pair on
 *  `llm-market.sl`: 2.91 world px at 0.3, but 1.64 at 0.42 — the wider gap made
 *  the crowded model WORSE while helping the sparse ones. Removing the tension
 *  needs the run to yield to its neighbours (an iterative relaxation) rather
 *  than a bigger constant. */
export const MIN_RIM_GAP = 0.3;

/** The contact ANGLE on `endpointId`'s rim for `relation`, or null if the
 *  relation does not touch that node.
 *
 *  This is what stops arrowheads landing on one pixel. A rim point is computed
 *  from the two node centres alone, so parallel siblings — which share both
 *  centres — contact the rim at *exactly* the same place. PARALLEL_BOW bows the
 *  middles of those curves apart and then delivers every arrowhead back to the
 *  identical point. Measured on `federal-reserve.sl`: 15 heads on 11 distinct
 *  points, three of them stacked on BANKING SYSTEM.
 *
 *  It spreads only what is ALREADY TOO CLOSE, and leaves everything else on its
 *  natural bearing. That restraint is the whole design, learned the hard way: an
 *  unconditional per-edge fan (rotate every contact by its rank) fixed the
 *  sibling case and REGRESSED `llm-market.sl`, whose 38 heads were already
 *  distinct — rotating edges that had room pushed some of them into each other.
 *  So the rule is not "fan the edges", it is "resolve the ties".
 *
 *  Self-loops are excluded: one draws its own bowed path and takes no rim point,
 *  so a slot for it would open a gap where no line arrives. */
export function rimAngleFor(
  model: CanvasModel,
  relation: Relation,
  endpointId: number,
): number | null {
  const node = thingById(model, endpointId);
  if (!node) return null;
  const incident = model.relations
    .filter((r) => r.a !== r.b && (r.a === endpointId || r.b === endpointId))
    .map((r) => {
      const other = thingById(model, r.a === endpointId ? r.b : r.a);
      return {
        id: r.id,
        ang: other ? Math.atan2(other.y - node.y, other.x - node.x) : 0,
      };
    })
    // Sorted by bearing, ties broken by id so the assignment is stable across
    // renders — an unstable order would make arrowheads swap places on a drag.
    .sort((x, y) => x.ang - y.ang || x.id - y.id);

  const idx = incident.findIndex((e) => e.id === relation.id);
  if (idx < 0) return null;

  // Walk the sorted bearings and find RUNS that crowd each other, then
  // redistribute each run at MIN_RIM_GAP about its own midpoint. A lone edge,
  // or one with room on both sides, is returned exactly as authored.
  const resolved = incident.map((e) => e.ang);
  let i = 0;
  while (i < incident.length) {
    let j = i;
    while (j + 1 < incident.length && incident[j + 1].ang - incident[j].ang < MIN_RIM_GAP) j++;
    if (j > i) {
      const n = j - i + 1;
      const mid = (incident[i].ang + incident[j].ang) / 2;
      for (let k = 0; k < n; k++) resolved[i + k] = mid + (k - (n - 1) / 2) * MIN_RIM_GAP;
    }
    i = j + 1;
  }
  return resolved[idx];
}

/** This relation's centered rank among siblings on the same unordered pair
 *  (…-1, 0, 1…) — the shared fan index for both the rim-to-rim bow and the
 *  exo crossing spread, so one flow occupies the same slot in both drawings. */
export function siblingStep(model: CanvasModel, relation: Relation): number {
  const { i, n } = siblingRank(model, relation);
  return i - (n - 1) / 2;
}

/** #335: how far apart siblings' labels sit ALONG the wire, as a fraction of
 *  its length. The perpendicular fan (`PARALLEL_BOW`, 30px) cannot separate
 *  labels — measured on `federal-reserve.sl`, an elided label is still ~100px
 *  wide against a 30px fan, and the gap shrinks further with zoom because the
 *  fan is model-space while the reader's eye is not. Staggering along the wire
 *  scales with the edge instead of fighting it, so two labels on one pair are
 *  as far apart as the wire is long. */
const SIBLING_LABEL_SPREAD = 0.46;

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
  // Contact points come from the resolved rim ANGLE, so edges that would land on
  // one pixel are separated while every edge with room keeps its true bearing.
  const ra = rr?.a ?? NODE_R;
  const rb = rr?.b ?? NODE_R;
  const angA = rimAngleFor(model, relation, relation.a);
  const angB = rimAngleFor(model, relation, relation.b);
  const a =
    angA === null
      ? rimPoint(from, to, ra)
      : { x: from.x + Math.cos(angA) * ra, y: from.y + Math.sin(angA) * ra };
  const b =
    angB === null
      ? rimPoint(to, from, rb)
      : { x: to.x + Math.cos(angB) * rb, y: to.y + Math.sin(angB) * rb };

  // Parallel edges between the same pair of nodes would draw the identical path
  // and stack into one indistinguishable, unclickable line. Rank this relation
  // among its siblings on the same unordered pair (stable, by id) and bow it by a
  // symmetric perpendicular offset so they fan apart.
  const step = siblingStep(model, relation);

  // #264: in a fanout, every wire's midpoint clusters at the hub side and the
  // labels pile into an unreadable stack. When one endpoint is a hub (degree ≥
  // FANOUT_DEGREE), slide the label along the wire toward the LOWER-degree end,
  // where the wires have spread apart. Symmetric edges keep the midpoint.
  const degree = (id: number) =>
    model.relations.filter((r) => r.a === id || r.b === id).length;
  const degA = degree(relation.a);
  const degB = degree(relation.b);
  const labelT =
    Math.max(degA, degB) >= FANOUT_DEGREE && degA !== degB ? (degA > degB ? 0.72 : 0.28) : 0.5;
  const lerp = (p: Pt, q: Pt, t: number): Pt => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });

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
    // Siblings share endpoints, so they share `labelT` and their labels would
    // pile at one point on the wire however far the curves bow apart. Spread
    // them along it instead, centred on labelT.
    const { i, n } = siblingRank(model, relation);
    const spread = n > 1 ? (i / (n - 1) - 0.5) * SIBLING_LABEL_SPREAD : 0;
    const at = lerp(a, b, Math.min(0.88, Math.max(0.12, labelT + spread)));
    return {
      d: `M ${a.x} ${a.y} Q ${cx} ${cy}, ${b.x} ${b.y}`,
      labelAt: { x: at.x + px * peak, y: at.y + py * peak },
    };
  }

  return { d: curved ? bezierPath(a, b) : straightPath(a, b), labelAt: lerp(a, b, labelT) };
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

// ---- #335 detail-on-demand: which labels are crowded -------------------------
//
// The three findings that shaped this. (1) Crowding is ZOOM-INVARIANT — every
// label lives inside the one `scale()` group and nothing counter-scales, so
// text and separation grow together and a zoom threshold changes only WHEN
// labels vanish, never whether they collide. Boxes are therefore compared in
// world space, and the answer holds at every zoom. (2) Placement cannot fix the
// remainder — siblings on a short edge want ~80px of text in the ~45px
// `SIBLING_LABEL_SPREAD` can offer, and two unrelated edges can simply share a
// midpoint. (3) So the surviving move is deferral, not tuning: a colliding
// cluster goes quiet and gives its name back on hover or selection.
//
// Boxes come from the DOM's own `getBBox`, never from an estimate — a
// monospace character-count guess drifts per lens (Klir stacks a signature
// line, Bunge and Mobus append a set/bond tag) and would have to restate the
// per-lens label logic to stay true. Measuring the rendered text keeps one
// source of truth: the lens draws it, this reads what was drawn.

/** A rendered label's box, tagged with the relation it names. Boxes arrive in
 *  SCREEN space (`getBoundingClientRect`), not world space, for two reasons: a
 *  node's name is nested inside its own transformed group while an edge's label
 *  sits on the stage, so only screen space compares them without unwinding
 *  transforms; and the pad below then buys real perceived air rather than world
 *  px that shrink under the reader's zoom. Overlap itself is unaffected — the
 *  stage transform is a uniform scale plus a translate, which preserves whether
 *  two boxes intersect. */
export interface LabelBox {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** A box that collides but can never yield — a node's NAME. It has no hover
   *  gesture of its own to give it back, and identity outranks a flow's label,
   *  so the flow label is the one that defers. */
  fixed?: boolean;
}

/** Slack, in world px, before two labels count as colliding. Text that merely
 *  touches is already unreadable, so the pad buys a little air rather than
 *  waiting for a true overlap. */
export const LABEL_COLLISION_PAD = 2;

/** Every id in a colliding cluster — BOTH members of each overlapping pair, not
 *  a winner and a loser. Keeping one of a pair visible would only re-collide
 *  the moment its neighbour is hovered back in, so the cluster goes quiet
 *  together and hover picks exactly one to speak. `fixed` boxes are the
 *  exception: they collide but never yield. */
export function crowdedLabelIds(boxes: LabelBox[], pad: number = LABEL_COLLISION_PAD): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const p = boxes[i];
      const q = boxes[j];
      const apart =
        p.x + p.w + pad <= q.x ||
        q.x + q.w + pad <= p.x ||
        p.y + p.h + pad <= q.y ||
        q.y + q.h + pad <= p.y;
      if (!apart) {
        if (!p.fixed) out.add(p.id);
        if (!q.fixed) out.add(q.id);
      }
    }
  }
  return out;
}
