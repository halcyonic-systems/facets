// The Klir register's TYPOGRAPHY, which is all that is left here after #233.
//
// The cell-membership assertions this file used to hold — a neutral relation
// marks both orders, a directed one marks its own — moved with the rule itself
// into `crates/bert-canvas/src/notation.rs` (`neutral_relation_marks_both_orders`,
// `directed_relation_marks_its_own_order_only`, and their siblings), and cross
// the wasm edge under the `klir_incidence` contract fixture. What is tested
// below is the mapping from a kernel-decided mark to a character, and the layout
// that carries no Klir meaning at all.
import { describe, expect, it } from "vitest";
import type { KlirIncidence, Relation, Thing } from "../kernel/types";
import { cellIndex, klirGlyph, nextIdOf, nextThingPosition, relationsIn, relationTuple } from "./klirNotation";

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

describe("klirGlyph", () => {
  it("is empty for an unoccupied cell, whatever the mark says", () => {
    expect(klirGlyph({ mark: "empty" }, 0)).toBe("");
    expect(klirGlyph({ mark: "neutral" }, 0)).toBe("");
  });
  it("marks a neutral occupant ●, a directed one → (read row → col)", () => {
    expect(klirGlyph({ mark: "neutral" }, 1)).toBe("●");
    expect(klirGlyph({ mark: "directed" }, 1)).toBe("→");
  });
  it("marks the diagonal ↺ and counts stacked relations", () => {
    expect(klirGlyph({ mark: "self_loop" }, 1)).toBe("↺");
    expect(klirGlyph({ mark: "neutral" }, 2)).toBe("●×2");
  });
});

describe("cellIndex / relationsIn — reading the kernel's incidence back", () => {
  const incidence: KlirIncidence = {
    things: [1, 2],
    cells: [
      { row: 1, col: 1, relations: [], mark: { mark: "empty" }, status: { status: "authorable" } },
      { row: 1, col: 2, relations: [11, 10], mark: { mark: "neutral" }, status: { status: "occupied" } },
    ],
  };
  it("addresses a cell by (row, col) thing id", () => {
    expect(cellIndex(incidence).get("1,2")?.relations).toEqual([11, 10]);
    expect(cellIndex(incidence).get("2,1")).toBeUndefined();
  });
  it("resolves occupants in the kernel's order, not the model's", () => {
    const relations = [rel(10, 1, 2), rel(11, 1, 2)];
    expect(relationsIn(relations, [11, 10]).map((r) => r.id)).toEqual([11, 10]);
  });
  it("drops an id the model no longer carries rather than faking a relation", () => {
    expect(relationsIn([rel(10, 1, 2)], [10, 99]).map((r) => r.id)).toEqual([10]);
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
