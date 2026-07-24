// #180: parallel/opposite-direction edges must fan their labels apart instead
// of folding onto the same curve. Pure pixel math, no kernel/wasm needed.
import { describe, expect, it } from "vitest";
import { edgeGeometry } from "./geometry";
import type { CanvasModel } from "../kernel/types";

const things: CanvasModel["things"] = [
  { id: 1, name: "Controller", x: 200, y: 200, role: "Component" },
  { id: 2, name: "Timer", x: 400, y: 200, role: "Component" },
];

function model(relations: CanvasModel["relations"]): CanvasModel {
  return {
    lens: "Klir",
    things,
    relations,
    boundary: { porosity: 0, perceptive_fuzziness: 0 },
  };
}

describe("edgeGeometry parallel-edge fan", () => {
  it("separates two same-direction siblings", () => {
    const m = model([
      { id: 1, a: 1, b: 2, name: "start", is_bond: true, kind: "Informational" },
      { id: 2, a: 1, b: 2, name: "reset", is_bond: true, kind: "Informational" },
    ]);
    const g1 = edgeGeometry(m, m.relations[0], false)!;
    const g2 = edgeGeometry(m, m.relations[1], false)!;
    expect(g1.labelAt).not.toEqual(g2.labelAt);
    const sep = Math.hypot(g1.labelAt.x - g2.labelAt.x, g1.labelAt.y - g2.labelAt.y);
    expect(sep).toBeGreaterThan(10);
  });

  it("separates a BIDIRECTIONAL pair (b→a sibling) — the #180 regression", () => {
    const m = model([
      { id: 1, a: 1, b: 2, name: "start", is_bond: true, kind: "Informational" },
      { id: 2, a: 2, b: 1, name: "ack", is_bond: true, kind: "Informational" },
    ]);
    const g1 = edgeGeometry(m, m.relations[0], false)!;
    const g2 = edgeGeometry(m, m.relations[1], false)!;
    const sep = Math.hypot(g1.labelAt.x - g2.labelAt.x, g1.labelAt.y - g2.labelAt.y);
    // Before the fix, the a→b and b→a siblings computed opposite-signed
    // normals from their own (locally flipped) direction vectors, so their
    // offsets cancelled and both labels landed on the same point (sep ≈ 0).
    expect(sep).toBeGreaterThan(10);
  });

  it("fans three siblings onto three distinct label positions", () => {
    const m = model([
      { id: 1, a: 1, b: 2, name: "a", is_bond: true, kind: "Informational" },
      { id: 2, a: 2, b: 1, name: "b", is_bond: true, kind: "Informational" },
      { id: 3, a: 1, b: 2, name: "c", is_bond: true, kind: "Informational" },
    ]);
    const labels = m.relations.map((r) => edgeGeometry(m, r, false)!.labelAt);
    const key = (p: { x: number; y: number }) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    const distinct = new Set(labels.map(key));
    expect(distinct.size).toBe(3);
  });
});
