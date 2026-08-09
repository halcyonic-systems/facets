// #264: labels on fanout wires slide toward the low-degree end instead of
// piling at the clustered midpoints (llm-market: 2 Splitting x 9 Amplifying =
// 18 wires whose midpoints stack in the canvas center).
import { describe, expect, it } from "vitest";
import type { CanvasModel } from "../kernel/types";
import { edgeGeometry } from "./geometry";

const hub = { id: 1, name: "Hub", x: 0, y: 0, role: "Component" as const };
const receivers = [2, 3, 4, 5].map((id) => ({
  id,
  name: `R${id}`,
  x: 400,
  y: (id - 2) * 120,
  role: "Component" as const,
}));

const model: CanvasModel = {
  lens: "Mobus",
  things: [hub, ...receivers],
  relations: receivers.map((r) => ({
    id: 100 + r.id,
    a: 1,
    b: r.id,
    name: `share ${r.id}`,
    kind: "Informational" as const,
    is_bond: true,
  })),
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

describe("fanout label placement (#264)", () => {
  it("slides the label toward the low-degree receiver end", () => {
    const geo = edgeGeometry(model, model.relations[0], true)!;
    // Hub has degree 4, receiver degree 1 — the label sits past the midpoint,
    // in the receiver's half of the wire.
    const mid = 200; // x midpoint between hub (0) and receiver (400) rims ≈ center
    expect(geo.labelAt.x).toBeGreaterThan(mid + 40);
  });

  it("keeps the midpoint when degrees are symmetric", () => {
    const pair: CanvasModel = {
      ...model,
      things: [hub, receivers[0]],
      relations: [model.relations[0]],
    };
    const geo = edgeGeometry(pair, pair.relations[0], true)!;
    expect(Math.abs(geo.labelAt.x - 200)).toBeLessThan(1);
  });
});
