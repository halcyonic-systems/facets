// Fit-to-content math (#83): the reusable bbox + viewport-fit helpers. Pure
// pixel math, so no kernel/wasm needed — just assert framing and clamps.
import { describe, expect, it } from "vitest";
import { contentBounds, fitToBox, NODE_R } from "./geometry";
import type { CanvasModel } from "../kernel/types";

const base: Omit<CanvasModel, "things" | "lens"> = {
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

function klir(things: CanvasModel["things"]): CanvasModel {
  return { ...base, lens: "Klir", things };
}

describe("contentBounds", () => {
  it("returns null for an empty model", () => {
    expect(contentBounds(klir([]))).toBeNull();
  });

  it("pads node centers by NODE_R", () => {
    const box = contentBounds(klir([{ id: 1, name: "A", x: 100, y: 200, role: "Component" }]));
    expect(box).toEqual({
      minX: 100 - NODE_R,
      minY: 200 - NODE_R,
      maxX: 100 + NODE_R,
      maxY: 200 + NODE_R,
    });
  });

  it("unions the Mobus membrane ring, which reaches past the node box", () => {
    const things: CanvasModel["things"] = [
      { id: 1, name: "A", x: 400, y: 320, role: "Component" },
      { id: 2, name: "B", x: 560, y: 320, role: "Component" },
    ];
    const nodeOnly = contentBounds({ ...base, lens: "Klir", things })!;
    const withRing = contentBounds({ ...base, lens: "Mobus", things })!;
    // The ring circumscribes the components (√2 + pad), so it extends past the
    // bare node bounding box on every side.
    expect(withRing.minX).toBeLessThan(nodeOnly.minX);
    expect(withRing.maxX).toBeGreaterThan(nodeOnly.maxX);
    expect(withRing.minY).toBeLessThan(nodeOnly.minY);
    expect(withRing.maxY).toBeGreaterThan(nodeOnly.maxY);
  });
});

describe("fitToBox", () => {
  const box = { minX: 0, minY: 0, maxX: 200, maxY: 100 };

  it("centers the content in the viewport", () => {
    const { pan, scale } = fitToBox(box, 1000, 1000, { pad: 0, maxScale: 4 });
    // Content center (100, 50) maps to viewport center (500, 500).
    expect(pan.x + scale * 100).toBeCloseTo(500);
    expect(pan.y + scale * 50).toBeCloseTo(500);
  });

  it("caps scale at maxScale so a tiny model does not blow up", () => {
    // A 10×10 box in a huge viewport would want a large scale; maxScale holds it.
    const tiny = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    const { scale } = fitToBox(tiny, 2000, 2000, { maxScale: 1 });
    expect(scale).toBe(1);
  });

  it("shrinks a large model to fit, honoring padding", () => {
    const big = { minX: 0, minY: 0, maxX: 2000, maxY: 2000 };
    const { scale } = fitToBox(big, 500, 500, { pad: 50, minScale: 0.1, maxScale: 4 });
    // (500 - 2*50) / 2000 = 0.2 on both axes.
    expect(scale).toBeCloseTo(0.2);
  });

  it("clamps to minScale for an oversized model", () => {
    const huge = { minX: 0, minY: 0, maxX: 100000, maxY: 100000 };
    const { scale } = fitToBox(huge, 500, 500, { minScale: 0.25 });
    expect(scale).toBe(0.25);
  });
});
