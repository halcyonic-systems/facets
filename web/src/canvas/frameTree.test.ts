// #139 M2: the frame tree — that one aperture and a recursion of them really
// are the same code, that depth is composition and nothing else, and that
// resolution runs exactly one level below the deepest frame drawn. Pure, so no
// kernel and no DOM.
import { describe, expect, it } from "vitest";
import {
  applyEmbed,
  buildFrames,
  compose,
  embeddedBounds,
  embedTransform,
  flattenFrames,
  frameExtentPx,
  MAX_FRAME_DEPTH,
  PREFETCH_PX,
  SKELETON_PX,
  type ApertureTier,
} from "./embed";
import { bungeHull, NODE_R } from "./geometry";
import type { CanvasModel } from "../kernel/types";

/** A three-level ladder: each model's first component decomposes into the next. */
const level = (n: number, child?: string): CanvasModel => ({
  lens: "Mobus",
  things: [
    {
      id: 1,
      name: `A${n}`,
      x: 0,
      y: 0,
      role: "Component",
      ...(child ? { child_model: { id: child, name: child } } : {}),
    },
    { id: 2, name: `B${n}`, x: 400, y: 200, role: "Component" },
  ],
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
});

const shelf: Record<string, CanvasModel> = {
  L1: level(1, "L2"),
  L2: level(2, "L3"),
  L3: level(3, "L4"),
  L4: level(4),
};

function deps(asked: string[] = [], tiers = new Map<string, ApertureTier>()) {
  return {
    childModel: (id: string) => shelf[id],
    register: "Mobus" as const,
    tierOf: (key: string) => tiers.get(key) ?? ("sealed" as ApertureTier),
    setTier: (key: string, t: ApertureTier) => void tiers.set(key, t),
    approach: (id: string) => void asked.push(id),
  };
}

/** The view scale at which a frame's own apertures land `px` across. */
const scaleFor = (px: number) => px / (2 * NODE_R);

describe("buildFrames", () => {
  it("opens nothing while the apertures are sealed", () => {
    expect(buildFrames(level(0, "L1"), scaleFor(40), deps())).toHaveLength(0);
  });

  it("opens one level, then the level inside it, as the composite scale allows", () => {
    // Sealed apertures inside an open one: the child's own components land at a
    // fraction of the parent's scale, so depth is earned rather than granted.
    const shallow = buildFrames(level(0, "L1"), scaleFor(SKELETON_PX * 1.2), deps());
    expect(shallow).toHaveLength(1);
    expect(shallow[0].children).toHaveLength(0);

    // …and once the frame is large enough, its own aperture opens inside it.
    const deep = buildFrames(level(0, "L1"), 60, deps());
    expect(deep[0].children.map((c) => c.child)).toEqual([shelf.L2]);
  });

  it("stops at the depth cap however far the zoom goes", () => {
    const frames = buildFrames(level(0, "L1"), 4000, deps());
    const depthOf = (n: (typeof frames)[number]): number =>
      n.children.length === 0 ? 1 : 1 + Math.max(...n.children.map(depthOf));
    expect(depthOf(frames[0])).toBe(MAX_FRAME_DEPTH);
    expect(flattenFrames(frames)).toHaveLength(MAX_FRAME_DEPTH);
  });

  it("composes through depth: a nested frame's embeds multiply to its screen scale", () => {
    const viewScale = 60;
    const [top] = buildFrames(level(0, "L1"), viewScale, deps());
    const [sub] = top.children;
    expect(sub.screenScale).toBeCloseTo(viewScale * top.embed.s * sub.embed.s, 9);
    // The composed map takes a point in the deepest frame straight to the root's
    // coordinates — the same answer as walking it out one embed at a time.
    const p = { x: 400, y: 200 };
    const stepwise = applyEmbed(top.embed, applyEmbed(sub.embed, p));
    const composed = applyEmbed(compose(top.embed, sub.embed), p);
    expect(composed.x).toBeCloseTo(stepwise.x, 9);
    expect(composed.y).toBeCloseTo(stepwise.y, 9);
  });

  it("resolves one level below the deepest frame drawn, and no further", () => {
    // Two frames are drawn (the cap), and the door inside the deeper one is
    // asked for as it approaches a drawable size. The level below THAT is never
    // reached, so a deep model does not resolve its subtree on one gesture.
    // Only what is NOT yet held is asked for, so the shelf here stops at L2.
    const asked: string[] = [];
    const held: Record<string, CanvasModel | undefined> = { L1: shelf.L1, L2: shelf.L2 };
    buildFrames(level(0, "L1"), 600, { ...deps(asked), childModel: (id: string) => held[id] });
    expect(new Set(asked)).toEqual(new Set(["L3"]));
  });

  it("asks for the first level before it can draw anything at all", () => {
    const asked: string[] = [];
    buildFrames(level(0, "L1"), 60, { ...deps(asked), childModel: () => undefined });
    expect(new Set(asked)).toEqual(new Set(["L1"]));
  });

  it("asks for nothing while the door is far too small to matter", () => {
    const asked: string[] = [];
    buildFrames(level(0, "L1"), scaleFor(PREFETCH_PX * 0.5), deps(asked));
    expect(asked).toEqual([]);
  });

  it("draws no aperture for a referent that resolves nowhere, and raises nothing", () => {
    const d = { ...deps(), childModel: () => null };
    expect(() => buildFrames(level(0, "MISSING"), 60, d)).not.toThrow();
    expect(buildFrames(level(0, "MISSING"), 60, d)).toHaveLength(0);
  });

  it("culls at the root only — a nested frame is already inside a culled disc", () => {
    const d = { ...deps(), visible: () => false };
    expect(buildFrames(level(0, "L1"), 60, d)).toHaveLength(0);
  });

  it("keys a frame by its path, so two levels of the same component never collide", () => {
    const [top] = buildFrames(level(0, "L1"), 60, deps());
    expect(top.key).toBe("1");
    expect(top.children[0].key).toBe("1-1");
  });
});

describe("frameExtentPx", () => {
  it("is the number the aperture one level up reports for the same frame", () => {
    // This identity is what makes the rebase band a hysteresis band on ONE
    // quantity: a child fitted into a disc of radius r is exactly 2r across.
    const child = shelf.L3;
    const bounds = embeddedBounds(child)!;
    const embed = embedTransform({ x: 0, y: 0 }, NODE_R, bounds);
    const viewScale = 7;
    expect(frameExtentPx(child, viewScale * embed.s)).toBeCloseTo(2 * NODE_R * viewScale, 6);
  });

  it("frames Bunge's rectangle so its corners land inside the rim, not past it", () => {
    const hull = bungeHull(shelf.L3.things);
    const embed = embedTransform({ x: 0, y: 0 }, NODE_R, embeddedBounds(shelf.L3, "Bunge")!);
    for (const c of [
      { x: hull.x, y: hull.y },
      { x: hull.x + hull.w, y: hull.y + hull.h },
    ]) {
      const p = applyEmbed(embed, c);
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(NODE_R + 1e-9);
    }
  });
});
