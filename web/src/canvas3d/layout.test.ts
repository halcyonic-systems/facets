import { describe, expect, it } from "vitest";
import { bundleLanes, exploded, exponentFor, placeBank, placeInterior, relaxDirections, shellField, shellPoint, shellSurface } from "./layout";
import { dot, len, v3 } from "./vec3";

const round = { halfLength: 1, radius: 0.5, e: 1, e2: 1 };
const square = { halfLength: 1, radius: 0.5, e: 0.2, e2: 1 };
const boxy = { halfLength: 1, radius: 0.5, e: 0.2, e2: 0.2 };
const hard = { halfLength: 1, radius: 0.5, e: 1, e2: 1, box: true };

describe("the shell surface", () => {
  it("meets a sideways ray at the radius with a radial normal", () => {
    for (const c of [round, square]) {
      const s = shellSurface(c, v3(0, 1, 0));
      expect(s.at.y).toBeCloseTo(0.5);
      expect(s.normal.y).toBeCloseTo(1);
    }
  });
  it("meets an axial ray at the half-length", () => {
    for (const c of [round, square]) {
      const s = shellSurface(c, v3(1, 0, 0));
      expect(s.at.x).toBeCloseTo(1);
      expect(s.normal.x).toBeCloseTo(1);
    }
  });
  it("lands every direction on the implicit surface, with an outward normal", () => {
    for (const c of [round, square, boxy, hard, { halfLength: 2, radius: 0.7, e: 0.5, e2: 0.4 }]) {
      for (let i = 0; i < 40; i++) {
        const d = v3(Math.sin(i * 1.7), Math.cos(i * 2.3), Math.sin(i * 0.9));
        const s = shellSurface(c, d);
        expect(shellField(c, s.at)).toBeCloseTo(1, 6);
        expect(dot(s.normal, s.at)).toBeGreaterThan(0);
        expect(len(s.normal)).toBeCloseTo(1, 6);
      }
    }
  });
  it("is an ellipsoid at e = 1 and flattens toward a box as e falls", () => {
    const diag = v3(1, 1, 0);
    const r = shellSurface(round, diag).at;
    expect(r.x * r.x / 1 + r.y * r.y / 0.25).toBeCloseTo(1, 6);
    const sq = shellSurface(square, diag).at;
    expect(len(sq)).toBeGreaterThan(len(r));
  });
  it("squares the cross-section with the second exponent and the box hits its faces", () => {
    const diag = v3(0, 1, 1);
    const r = shellSurface(round, diag).at;
    const b = shellSurface(boxy, diag).at;
    expect(Math.hypot(b.y, b.z)).toBeGreaterThan(Math.hypot(r.y, r.z));
    const h = shellSurface(hard, v3(1, 0.2, 0.1));
    expect(h.at.x).toBeCloseTo(1);
    expect(h.normal).toEqual({ x: 1, y: 0, z: 0 });
    const side = shellSurface(hard, v3(0.1, 1, 0.2));
    expect(side.at.y).toBeCloseTo(0.5);
    expect(side.normal).toEqual({ x: 0, y: 1, z: 0 });
  });
  it("meshes onto the same surface", () => {
    for (const c of [round, square, boxy]) {
      for (let i = 0; i <= 8; i++) {
        const v = -Math.PI / 2 + (i / 8) * Math.PI;
        const p = shellPoint(c, 0.7, v);
        expect(shellField(c, p)).toBeCloseTo(1, 4);
      }
    }
  });
  it("maps the dial from round to square", () => {
    expect(exponentFor(0)).toBe(1);
    expect(exponentFor(1)).toBeCloseTo(0.15);
    expect(exponentFor(2)).toBeCloseTo(0.15);
  });
});

describe("interior placement", () => {
  it("is deterministic", () => {
    const pts = [{ x: 0, y: 0 }, { x: 100, y: 40 }, { x: 30, y: 90 }];
    expect(placeInterior(pts, 2)).toEqual(placeInterior(pts, 2));
  });
  it("negates canvas y so up on the canvas is up in the scene", () => {
    const [top, bottom] = placeInterior([{ x: 0, y: 0 }, { x: 0, y: 100 }], 2);
    expect(top.y).toBeGreaterThan(bottom.y);
  });
  it("separates coincident authored positions", () => {
    const [a, b] = placeInterior([{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 50, y: 50 }], 2);
    expect(len({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })).toBeGreaterThan(0.1);
  });
  it("stays within reach of the centre", () => {
    const pts = Array.from({ length: 12 }, (_, i) => ({ x: i * 37, y: (i * 53) % 200 }));
    for (const p of placeInterior(pts, 2)) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(2 + 1e-9);
  });
});

describe("environment banks", () => {
  it("puts sources at negative x and sinks at positive x, outside the shell", () => {
    const [src] = placeBank(1, -1, round, 1);
    const [snk] = placeBank(1, 1, round, 1);
    expect(src.x).toBeLessThan(-round.halfLength);
    expect(snk.x).toBeGreaterThan(round.halfLength);
  });
  it("crowns neutral things around the waist without touching", () => {
    const shell = { halfLength: 1.4, radius: 1.6, e: 0.5, e2: 1 };
    const crown = placeBank(5, 0, shell, 1.4);
    for (const p of crown) expect(Math.hypot(p.y, p.z)).toBeCloseTo(3, 6);
    for (let i = 0; i < crown.length; i++)
      for (let j = 0; j < i; j++)
        expect(len({ x: crown[i].x - crown[j].x, y: crown[i].y - crown[j].y, z: crown[i].z - crown[j].z })).toBeGreaterThan(1.2);
    expect(placeBank(1, 0, shell, 1.4)[0].y).toBeCloseTo(3);
  });
  it("spreads a bank on a ring at one x", () => {
    const bank = placeBank(5, 1, round, 1);
    expect(new Set(bank.map((p) => p.x.toFixed(6))).size).toBe(1);
    const radii = bank.map((p) => Math.hypot(p.y, p.z));
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(1e-9);
  });
});

describe("port relaxation", () => {
  it("pushes stacked directions apart and keeps them unit length", () => {
    const out = relaxDirections(Array.from({ length: 5 }, () => v3(0, 1, 0)), 0.3);
    for (const d of out) expect(len(d)).toBeCloseTo(1, 6);
    for (let i = 0; i < out.length; i++)
      for (let j = 0; j < i; j++)
        expect(len({ x: out[i].x - out[j].x, y: out[i].y - out[j].y, z: out[i].z - out[j].z })).toBeGreaterThan(0.27);
  });
});

describe("lane bundling", () => {
  it("centres a bundle and ignores endpoint order", () => {
    expect(bundleLanes([[1, 2], [2, 1], [1, 2], [3, 4]])).toEqual([-1, 0, 1, 0]);
  });
});

describe("explode", () => {
  it("moves a body outward along its own radial by the reach", () => {
    expect(exploded(v3(0, 2, 0), 1, 3)).toEqual({ x: 0, y: 5, z: 0 });
  });
  it("leaves a body at the centre alone at 0 and lifts it upward at 1", () => {
    expect(exploded(v3(), 0, 3)).toEqual({ x: 0, y: 0, z: 0 });
    expect(exploded(v3(), 1, 3).y).toBeCloseTo(3);
  });
});
