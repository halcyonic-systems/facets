// Where things sit in the 3D scene. Pure pixel math, the same standing as
// canvas/geometry.ts: WHERE a body is drawn is layout; WHAT it is (component,
// interface, environment, port) comes from the kernel's lens_facts and is
// decided before any of this runs.
//
// The shell is a superellipsoid of revolution about the x axis: sources bank
// at -x, sinks at +x. The model asserts exactly one direction, throughput,
// and a solid of revolution is the shape with exactly that symmetry — the
// round cross-section leaves interior components unranked, the caps give
// crossings a readable normal (facets#435, the stage 0 pick). One exponent
// slides it from an ellipsoid (e = 1) toward a rounded box (e → 0).

import { add, cross, len, norm, scale, sub, v3, type Vec3 } from "./vec3";

/** A superellipsoid about the x axis:
 *  (|x|/L)^(2/e) + ((|y|/R)^(2/e2) + (|z|/R)^(2/e2))^(e2/e) = 1.
 *  `e` shapes the profile along the axis (1 ellipsoid, 0.15 nearly flat caps),
 *  `e2` the cross-section (1 round, 0.15 nearly square). `box` overrides both
 *  with a hard-edged box of the same extents. */
export interface Shell {
  halfLength: number;
  radius: number;
  e: number;
  e2: number;
  box?: boolean;
}

export interface SurfacePoint {
  at: Vec3;
  normal: Vec3;
}

const GOLD = Math.PI * (3 - Math.sqrt(5));

/** The dial the face offers, 0 (round) to 1 (square), as an exponent. */
export function exponentFor(squareness: number): number {
  const s = Math.max(0, Math.min(1, squareness));
  return 1 - 0.85 * s;
}

/** The implicit function's value at a point: 1 on the surface, less inside.
 *  For the box it is the Chebyshev form, max of the scaled coordinates. */
export function shellField(c: Shell, p: Vec3): number {
  if (c.box) return Math.max(Math.abs(p.x) / c.halfLength, Math.abs(p.y) / c.radius, Math.abs(p.z) / c.radius);
  const k = 2 / c.e;
  const k2 = 2 / c.e2;
  const cross = Math.pow(Math.abs(p.y) / c.radius, k2) + Math.pow(Math.abs(p.z) / c.radius, k2);
  return Math.pow(Math.abs(p.x) / c.halfLength, k) + Math.pow(cross, c.e2 / c.e);
}

/** The ray from the origin along `dir` meets the shell here. Closed form:
 *  the field is homogeneous of degree 2/e along a ray (degree 1 for the box). */
export function shellSurface(c: Shell, dir: Vec3): SurfacePoint {
  const d = norm(dir);
  const field = shellField(c, d);
  if (c.box) {
    const at = scale(d, 1 / field);
    const fx = Math.abs(at.x) / c.halfLength, fy = Math.abs(at.y) / c.radius, fz = Math.abs(at.z) / c.radius;
    const normal =
      fx >= fy && fx >= fz ? v3(Math.sign(at.x), 0, 0) : fy >= fz ? v3(0, Math.sign(at.y), 0) : v3(0, 0, Math.sign(at.z));
    return { at, normal };
  }
  const t = Math.pow(field, -c.e / 2);
  const at = scale(d, t);
  const k = 2 / c.e;
  const k2 = 2 / c.e2;
  const ay = Math.abs(at.y) / c.radius, az = Math.abs(at.z) / c.radius;
  const cross = Math.pow(ay, k2) + Math.pow(az, k2);
  const outer = cross === 0 ? 0 : (c.e2 / c.e) * Math.pow(cross, c.e2 / c.e - 1);
  const gx = at.x === 0 ? 0 : (k * Math.pow(Math.abs(at.x) / c.halfLength, k - 1) * Math.sign(at.x)) / c.halfLength;
  const gy = ay === 0 ? 0 : (outer * k2 * Math.pow(ay, k2 - 1) * Math.sign(at.y)) / c.radius;
  const gz = az === 0 ? 0 : (outer * k2 * Math.pow(az, k2 - 1) * Math.sign(at.z)) / c.radius;
  return { at, normal: norm(v3(gx, gy, gz), d) };
}

/** A point on the shell by parameters, for meshing: v is latitude from the
 *  -x cap (-π/2) to the +x cap (π/2), u the angle around the axis. */
export function shellPoint(c: Shell, u: number, v: number): Vec3 {
  const f = (w: number, e: number) => Math.sign(w) * Math.pow(Math.abs(w), e);
  const cv = f(Math.cos(v), c.e);
  return v3(c.halfLength * f(Math.sin(v), c.e), c.radius * cv * f(Math.cos(u), c.e2), c.radius * cv * f(Math.sin(u), c.e2));
}

/** Recenter authored 2D positions into the cross-section and along the axis.
 *  Canvas y grows downward, so it is negated. Depth is a small deterministic
 *  jitter by index so a flat authored layout still reads as a volume. */
export function placeInterior(points: { x: number; y: number }[], reach: number): Vec3[] {
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
export function placeBank(count: number, side: -1 | 0 | 1, c: Shell, gap: number): Vec3[] {
  const out: Vec3[] = [];
  const x = side * (c.halfLength + gap);
  const ringR = c.radius * 1.15;
  for (let i = 0; i < count; i++) {
    if (side === 0) {
      const t = count === 1 ? 0 : -1 + (2 * i) / (count - 1);
      out.push(v3(t * c.halfLength * 0.8, c.radius + gap, 0));
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
