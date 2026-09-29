// Where things sit in the 3D scene. Pure pixel math, the same standing as
// canvas/geometry.ts: WHERE a body is drawn is layout; WHAT it is (component,
// interface, environment, port) comes from the kernel's lens_facts and is
// decided before any of this runs.
//
// The shell is a capsule along the x axis: sources bank at -x, sinks at +x.
// The model asserts exactly one direction, throughput, and the capsule is the
// shape with exactly that symmetry — the round cross-section leaves interior
// components unranked, the flat-ish caps give crossings a readable normal
// (facets#435, the stage 0 pick).

import { add, cross, dot, len, norm, scale, sub, v3, type Vec3 } from "./vec3";

/** The capsule: points within `radius` of the segment [-halfLength, halfLength] on x. */
export interface Capsule {
  halfLength: number;
  radius: number;
}

export interface SurfacePoint {
  at: Vec3;
  normal: Vec3;
}

const GOLD = Math.PI * (3 - Math.sqrt(5));

/** The ray from the origin along `dir` meets the capsule surface here. */
export function capsuleSurface(c: Capsule, dir: Vec3): SurfacePoint {
  const d = norm(dir);
  const rho = Math.hypot(d.y, d.z);
  if (rho > 1e-9) {
    const t = c.radius / rho;
    if (Math.abs(t * d.x) <= c.halfLength) {
      const at = scale(d, t);
      return { at, normal: v3(0, d.y / rho, d.z / rho) };
    }
  }
  // Past the cylinder: the ray hits one of the end spheres.
  const cx = d.x >= 0 ? c.halfLength : -c.halfLength;
  const center = v3(cx, 0, 0);
  // |t d - center|² = r², d unit: t² - 2t(d·center) + |center|² - r² = 0
  const b = -2 * dot(d, center);
  const cc = dot(center, center) - c.radius * c.radius;
  const disc = Math.max(0, b * b - 4 * cc);
  const t = (-b + Math.sqrt(disc)) / 2;
  const at = scale(d, t);
  return { at, normal: norm(sub(at, center)) };
}

/** Recenter authored 2D positions into the cross-section and along the axis.
 *  Canvas y grows downward, so it is negated. Depth is a small deterministic
 *  jitter by index so a flat authored layout still reads as a volume. */
export function placeInterior(
  points: { x: number; y: number }[],
  reach: number,
): Vec3[] {
  const n = points.length;
  if (n === 0) return [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let extent = 0;
  for (const p of points) extent = Math.max(extent, Math.hypot(p.x - cx, p.y - cy));
  const s = extent > 1e-6 ? reach / extent : 0;
  const seen = new Map<string, number>();
  return points.map((p, i) => {
    let at = v3((p.x - cx) * s, -(p.y - cy) * s, Math.sin(i * GOLD) * reach * 0.12);
    const key = at.x.toFixed(3) + "," + at.y.toFixed(3);
    const dup = seen.get(key) ?? 0;
    seen.set(key, dup + 1);
    if (dup) {
      const r = reach * 0.18 * Math.sqrt(dup);
      at = add(at, v3(Math.cos(dup * GOLD) * r, Math.sin(dup * GOLD) * r, dup * reach * 0.05));
    }
    return at;
  });
}

/** Environment things on a ring outside the shell, at the source or sink end.
 *  `side` is -1 for the source face, +1 for the sink face, 0 for neutral (the
 *  ring's crown). */
export function placeBank(count: number, side: -1 | 0 | 1, c: Capsule, gap: number): Vec3[] {
  const out: Vec3[] = [];
  const x = side * (c.halfLength + c.radius + gap);
  const ringR = c.radius * 1.15;
  for (let i = 0; i < count; i++) {
    if (side === 0) {
      // Neutral things sit above the shell along its length.
      const t = count === 1 ? 0 : -1 + (2 * i) / (count - 1);
      out.push(v3(t * c.halfLength, c.radius + gap, 0));
      continue;
    }
    if (count === 1) {
      out.push(v3(x, 0, 0));
      continue;
    }
    const a = (i / count) * Math.PI * 2 + Math.PI / 2;
    out.push(v3(x, Math.cos(a) * ringR, Math.sin(a) * ringR));
  }
  return out;
}

/** Push directions apart on the unit sphere until no pair is closer than
 *  `threshold`, so ports that share a counterpart do not stack. */
export function relaxDirections(dirs: Vec3[], threshold: number, passes = 18): Vec3[] {
  const out = dirs.map((d) => norm(d));
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = 0; j < i; j++) {
        let delta = sub(out[i], out[j]);
        const d = len(delta);
        if (d >= threshold) continue;
        if (d < 1e-4) {
          delta = cross(out[i], v3(0, 0, 1));
          if (len(delta) < 1e-3) delta = v3(0, 1, 0);
        }
        delta = scale(norm(delta), (threshold - d) * 0.3);
        out[i] = norm(add(out[i], delta));
        out[j] = norm(sub(out[j], delta));
      }
    }
  }
  return out;
}

/** Lane offsets for flows that share an endpoint pair: centred, so one flow
 *  sits on the line and two straddle it. Keyed on the unordered pair. */
export function bundleLanes(pairs: [number, number][]): number[] {
  const groups = new Map<string, number[]>();
  pairs.forEach(([a, b], i) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    const g = groups.get(key) ?? [];
    g.push(i);
    groups.set(key, g);
  });
  const lanes = new Array<number>(pairs.length).fill(0);
  for (const g of groups.values()) g.forEach((idx, k) => (lanes[idx] = k - (g.length - 1) / 2));
  return lanes;
}

/** A body's position at explode `t` (0..1): pushed out along its own radial. */
export function exploded(base: Vec3, t: number, reach: number): Vec3 {
  return add(base, scale(norm(base, v3(0, 1, 0)), t * reach));
}
