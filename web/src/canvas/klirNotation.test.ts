import { describe, expect, it } from "vitest";
import type { CanvasModel, Relation, Thing } from "../kernel/types";
import { cellRelations, nextIdOf, nextThingPosition, relationTuple } from "./klirNotation";

const thing = (id: number, x = 0, y = 0): Thing => ({ id, name: `T${id}`, x, y, role: "Component" });
const rel = (id: number, a: number, b: number, directed?: boolean): Relation => ({
  id,
  a,
  b,
  name: "",
  is_bond: true,
  kind: "Unspecified",
  ...(directed !== undefined ? { klir_directed: directed } : {}),
});
const model = (things: Thing[], relations: Relation[]): CanvasModel => ({
  lens: "Klir",
  things,
  relations,
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
});

describe("relationTuple", () => {
  const names = (id: number) => (id === 1 ? "A" : "B");
  it("typesets a neutral relation as an unordered pair-set", () => {
    expect(relationTuple(rel(1, 1, 2), names)).toBe("{A, B}");
    expect(relationTuple(rel(1, 1, 2, false), names)).toBe("{A, B}");
  });
  it("typesets a directed relation as an ordered pair", () => {
    expect(relationTuple(rel(1, 1, 2, true), names)).toBe("(A, B)");
  });
});

describe("cellRelations", () => {
  const m = model([thing(1), thing(2), thing(3)], [rel(10, 1, 2), rel(11, 2, 3, true)]);
  it("marks both orders for a neutral relation", () => {
    expect(cellRelations(m, 1, 2).map((r) => r.id)).toEqual([10]);
    expect(cellRelations(m, 2, 1).map((r) => r.id)).toEqual([10]);
  });
  it("marks only its own order for a directed relation", () => {
    expect(cellRelations(m, 2, 3).map((r) => r.id)).toEqual([11]);
    expect(cellRelations(m, 3, 2)).toEqual([]);
  });
  it("leaves unrelated cells empty", () => {
    expect(cellRelations(m, 1, 3)).toEqual([]);
  });
});

describe("nextIdOf", () => {
  it("is max + 1, and 1 on empty", () => {
    expect(nextIdOf([])).toBe(1);
    expect(nextIdOf([3, 7, 2])).toBe(8);
  });
});

describe("nextThingPosition", () => {
  it("starts at the origin on an empty model", () => {
    expect(nextThingPosition([])).toEqual({ x: 0, y: 0 });
  });
  it("always lands strictly right of the existing content", () => {
    let things: Thing[] = [thing(1, 0, 0), thing(2, 120, 40)];
    for (let i = 0; i < 6; i++) {
      const p = nextThingPosition(things);
      const maxX = Math.max(...things.map((t) => t.x));
      expect(p.x).toBeGreaterThan(maxX);
      things = [...things, { ...thing(100 + i), x: p.x, y: p.y }];
    }
    // No two things share a spot.
    const spots = new Set(things.map((t) => `${t.x},${t.y}`));
    expect(spots.size).toBe(things.length);
  });
});
