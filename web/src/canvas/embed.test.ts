// #139 M0: the embedding's algebra, and the one claim that makes it the right
// arithmetic — an embed is `fitToBox` into a square window the size of the
// aperture. Pure math, so no kernel/wasm is needed.
import { describe, expect, it } from "vitest";
import {
  applyEmbed,
  apertureScreenPx,
  apertureTier,
  compose,
  embedTransform,
  embeddedBounds,
  FULL_PX,
  IDENTITY,
  SKELETON_PX,
  type Embed,
} from "./embed";
import { fitToBox, NODE_R, type Box } from "./geometry";
import type { CanvasModel, Thing } from "../kernel/types";

const box = (minX: number, minY: number, maxX: number, maxY: number): Box => ({ minX, minY, maxX, maxY });

describe("embedTransform", () => {
  it("puts the child's centre on the component and its wide axis on the rim", () => {
    const e = embedTransform({ x: 100, y: 50 }, 34, box(0, 0, 400, 200));
    expect(applyEmbed(e, { x: 200, y: 100 })).toEqual({ x: 100, y: 50 });
    const rim = applyEmbed(e, { x: 400, y: 100 });
    expect(Math.hypot(rim.x - 100, rim.y - 50)).toBeCloseTo(34, 9);
  });

  it("fits the short axis inside the rim rather than cropping it", () => {
    const e = embedTransform({ x: 0, y: 0 }, 34, box(0, 0, 400, 200));
    const shortEnd = applyEmbed(e, { x: 200, y: 200 });
    expect(Math.hypot(shortEnd.x, shortEnd.y)).toBeLessThan(34);
  });

  it("is uniform — one scale for both axes, no shear", () => {
    const e = embedTransform({ x: 7, y: -3 }, 20, box(-50, 10, 150, 30));
    const a = applyEmbed(e, { x: 0, y: 0 });
    const dx = applyEmbed(e, { x: 10, y: 0 });
    const dy = applyEmbed(e, { x: 0, y: 10 });
    expect(dx.x - a.x).toBeCloseTo(dy.y - a.y, 9);
    expect(dx.y - a.y).toBe(0);
    expect(dy.x - a.x).toBe(0);
  });

  it("survives a degenerate (zero-extent) child without dividing by zero", () => {
    const e = embedTransform({ x: 5, y: 5 }, 34, box(3, 3, 3, 3));
    expect(Number.isFinite(e.s)).toBe(true);
    expect(applyEmbed(e, { x: 3, y: 3 })).toEqual({ x: 5, y: 5 });
  });

  it("is fitToBox into a viewport the size of the aperture", () => {
    const b = box(-120, 40, 380, 300);
    const A = 34;
    const P = { x: 210, y: -60 };
    const e = embedTransform(P, A, b);
    const fit = fitToBox(b, 2 * A, 2 * A, { pad: 0, minScale: 0, maxScale: Infinity });
    expect(e.s).toBeCloseTo(fit.scale, 9);
    // The viewport's own centre is (A, A); moving it onto P is the whole difference.
    expect(e.tx).toBeCloseTo(fit.pan.x - A + P.x, 9);
    expect(e.ty).toBeCloseTo(fit.pan.y - A + P.y, 9);
  });
});

describe("compose", () => {
  const a: Embed = { s: 0.5, tx: 10, ty: -4 };
  const b: Embed = { s: 0.25, tx: -3, ty: 8 };

  it("agrees with applying the two in order — depth is composition", () => {
    for (const p of [{ x: 0, y: 0 }, { x: 17, y: -33 }, { x: -2.5, y: 900 }]) {
      const viaCompose = applyEmbed(compose(a, b), p);
      const viaChain = applyEmbed(a, applyEmbed(b, p));
      expect(viaCompose.x).toBeCloseTo(viaChain.x, 9);
      expect(viaCompose.y).toBeCloseTo(viaChain.y, 9);
    }
  });

  it("has the identity on both sides", () => {
    expect(compose(IDENTITY, a)).toEqual(a);
    expect(compose(a, IDENTITY)).toEqual(a);
  });

  it("is associative", () => {
    const c: Embed = { s: 2, tx: 1, ty: 1 };
    const left = compose(compose(a, b), c);
    const right = compose(a, compose(b, c));
    expect(left.s).toBeCloseTo(right.s, 9);
    expect(left.tx).toBeCloseTo(right.tx, 9);
    expect(left.ty).toBeCloseTo(right.ty, 9);
  });
});

describe("embeddedBounds", () => {
  const thing = (id: number, x: number, y: number, role: Thing["role"]): Thing =>
    ({ id, name: `t${id}`, x, y, role }) as Thing;
  const model = (things: Thing[]): CanvasModel =>
    ({ lens: "Mobus", things, relations: [], boundary: {} }) as unknown as CanvasModel;

  it("frames the components alone — a suppressed env stand-in cannot widen the frame", () => {
    const interior = [thing(1, 0, 0, "Component"), thing(2, 100, 0, "Component")];
    const withEnv = embeddedBounds(model([...interior, thing(3, 4000, 0, "Environment")]))!;
    const without = embeddedBounds(model(interior))!;
    expect(withEnv).toEqual(without);
    expect(withEnv.maxX).toBeLessThan(1000);
  });

  it("includes the membrane, which reaches past the component bodies", () => {
    const b = embeddedBounds(model([thing(1, 0, 0, "Component"), thing(2, 100, 0, "Component")]))!;
    expect(b.maxX).toBeGreaterThan(100 + NODE_R);
  });
});

describe("apertureTier", () => {
  it("seals, skeletons and fills at the stated sizes", () => {
    expect(apertureTier(10)).toBe("sealed");
    expect(apertureTier(SKELETON_PX * 1.2)).toBe("skeleton");
    expect(apertureTier(FULL_PX * 1.2)).toBe("full");
  });

  it("needs an overshoot to enter a tier and an undershoot to leave it", () => {
    // Just above the nominal skeleton threshold: not yet, from sealed.
    expect(apertureTier(SKELETON_PX * 1.05, "sealed")).toBe("sealed");
    expect(apertureTier(SKELETON_PX * 1.2, "sealed")).toBe("skeleton");
    // Coming back down, the same size stays open.
    expect(apertureTier(SKELETON_PX * 1.05, "skeleton")).toBe("skeleton");
    expect(apertureTier(SKELETON_PX * 0.8, "skeleton")).toBe("sealed");
    expect(apertureTier(FULL_PX * 1.05, "skeleton")).toBe("skeleton");
    expect(apertureTier(FULL_PX * 1.2, "skeleton")).toBe("full");
    expect(apertureTier(FULL_PX * 0.95, "full")).toBe("full");
    expect(apertureTier(FULL_PX * 0.8, "full")).toBe("skeleton");
  });

  it("does not flicker: a size inside the band holds whatever tier it is in", () => {
    const px = SKELETON_PX * 1.05;
    expect(apertureTier(px, apertureTier(px, "sealed"))).toBe("sealed");
    expect(apertureTier(px, apertureTier(px, "skeleton"))).toBe("skeleton");
  });

  it("drops straight to sealed from full when the view leaves in one step", () => {
    expect(apertureTier(1, "full")).toBe("sealed");
  });
});

describe("apertureScreenPx", () => {
  it("measures the node's diameter on screen", () => {
    expect(apertureScreenPx(1)).toBe(NODE_R * 2);
    expect(apertureScreenPx(3)).toBe(NODE_R * 6);
  });
});
