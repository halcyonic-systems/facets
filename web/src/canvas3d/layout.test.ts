import { describe, expect, it } from "vitest";
import { bundleLanes, capsuleSurface, exploded, placeBank, placeInterior, relaxDirections } from "./layout";
import { len, v3 } from "./vec3";

const cap = { halfLength: 1, radius: 0.5 };

describe("the capsule surface", () => {
  it("meets a sideways ray on the cylinder with a radial normal", () => {
    const s = capsuleSurface(cap, v3(0, 1, 0));
    expect(s.at.y).toBeCloseTo(0.5);
    expect(s.normal).toEqual({ x: 0, y: 1, z: 0 });
  });
  it("meets an axial ray on the end cap", () => {
    const s = capsuleSurface(cap, v3(1, 0, 0));
    expect(s.at.x).toBeCloseTo(1.5);
    expect(s.normal.x).toBeCloseTo(1);
  });
  it("lands every direction at distance r from the segment", () => {
    for (let i = 0; i < 40; i++) {
      const d = v3(Math.sin(i * 1.7), Math.cos(i * 2.3), Math.sin(i * 0.9));
      const p = capsuleSurface(cap, d).at;
      const ax = Math.max(-cap.halfLength, Math.min(cap.halfLength, p.x));
      expect(Math.hypot(p.x - ax, p.y, p.z)).toBeCloseTo(cap.radius, 5);
    }
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
    const [src] = placeBank(1, -1, cap, 1);
    const [snk] = placeBank(1, 1, cap, 1);
    expect(src.x).toBeLessThan(-cap.halfLength - cap.radius);
    expect(snk.x).toBeGreaterThan(cap.halfLength + cap.radius);
  });
  it("spreads a bank on a ring at one x", () => {
    const bank = placeBank(5, 1, cap, 1);
    const xs = new Set(bank.map((p) => p.x.toFixed(6)));
    expect(xs.size).toBe(1);
    const radii = bank.map((p) => Math.hypot(p.y, p.z));
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(1e-9);
  });
});

describe("port relaxation", () => {
  it("pushes stacked directions apart and keeps them unit length", () => {
    const dirs = Array.from({ length: 5 }, () => v3(0, 1, 0));
    const out = relaxDirections(dirs, 0.3);
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
    const p = exploded(v3(0, 2, 0), 1, 3);
    expect(p).toEqual({ x: 0, y: 5, z: 0 });
  });
  it("leaves a body at the centre alone at 0 and lifts it upward at 1", () => {
    expect(exploded(v3(), 0, 3)).toEqual({ x: 0, y: 0, z: 0 });
    expect(exploded(v3(), 1, 3).y).toBeCloseTo(3);
  });
});
