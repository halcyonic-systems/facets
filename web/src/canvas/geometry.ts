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

/** The `d` + label anchor for a drawn relation, shared by every lens's EdgeView
 *  and the DrivePopover anchor (App reads it to place the popover at the same
 *  point the edge renders its name) — pure pixel math, no systems meaning. */
export function edgeGeometry(
  model: CanvasModel,
  relation: Relation,
  curved: boolean,
): { d: string; labelAt: Pt } | null {
  const from = thingById(model, relation.a);
  const to = thingById(model, relation.b);
  if (!from || !to) return null;
  if (relation.a === relation.b) {
    const loop = selfLoopPath(from, NODE_R);
    return { d: loop.d, labelAt: loop.labelAt };
  }
  const a = rimPoint(from, to, NODE_R);
  const b = rimPoint(to, from, NODE_R);

  // Parallel edges between the same pair of nodes would draw the identical path
  // and stack into one indistinguishable, unclickable line. Rank this relation
  // among its siblings on the same unordered pair (stable, by id) and bow it by a
  // symmetric perpendicular offset so they fan apart.
  const siblings = model.relations
    .filter(
      (r) =>
        (r.a === relation.a && r.b === relation.b) || (r.a === relation.b && r.b === relation.a),
    )
    .sort((r1, r2) => r1.id - r2.id);
  const step = siblings.findIndex((r) => r.id === relation.id) - (siblings.length - 1) / 2;

  if (step !== 0) {
    const mid = midpoint(a, b);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
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
 *  (center ± NODE_R) unioned with the Mobus membrane ring when that lens draws
 *  it (the ring circumscribes the components and can reach past the node box).
 *  Returns null for an empty model. Shared by fit-to-content and PNG export. */
export function contentBounds(model: CanvasModel): Box | null {
  if (model.things.length === 0) return null;
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
    const ring = componentRing(model.things.filter((t) => t.role === "Component"));
    if (ring) {
      minX = Math.min(minX, ring.cx - ring.rx);
      minY = Math.min(minY, ring.cy - ring.ry);
      maxX = Math.max(maxX, ring.cx + ring.rx);
      maxY = Math.max(maxY, ring.cy + ring.ry);
    }
  }
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
