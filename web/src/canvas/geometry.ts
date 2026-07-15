// Rim/bezier helpers. No systems meaning here — pure pixel math for the SVG
// stage. Node hit-radius is kept close to the kernel's own RADIUS (34) so the
// canvas and the projected WorldModel agree on "where a thing sits."
// Lifted verbatim from the bert-lenses-spike-svg canvas spike.

export const NODE_R = 34;
export const CURVE_BOW = 32;

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
