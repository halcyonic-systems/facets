import { describe, expect, it } from "vitest";
import type { CanvasModel, CanvasRole, Relation, Thing } from "../kernel/types";
import { bungeCellGlyph, bungeCellRelations, kindGlyph, matrixThings } from "./bungeNotation";

const thing = (id: number, role: CanvasRole = "Component"): Thing => ({
  id,
  name: `T${id}`,
  x: 0,
  y: 0,
  role,
});
const rel = (id: number, a: number, b: number, is_bond = true, kind: Relation["kind"] = "Unspecified"): Relation => ({
  id,
  a,
  b,
  name: "",
  is_bond,
  kind,
});
const model = (things: Thing[], relations: Relation[]): CanvasModel => ({
  lens: "Bunge",
  things,
  relations,
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
});

describe("matrixThings", () => {
  it("orders composition before environment, keeping authoring order within each", () => {
    const m = model([thing(3, "Environment"), thing(1), thing(4, "Environment"), thing(2)], []);
    expect(matrixThings(m).map((t) => t.id)).toEqual([1, 2, 3, 4]);
  });
});

describe("bungeCellRelations", () => {
  const m = model(
    [thing(1), thing(2), thing(3, "Environment")],
    [rel(10, 1, 2), rel(11, 3, 1), rel(12, 1, 2, false)],
  );
  it("reads a bond as directed action — row acts on col, own order only", () => {
    expect(bungeCellRelations(m, 1, 2).map((r) => r.id)).toEqual([10, 12]);
    // Only the mere relation mirrors into the reverse order.
    expect(bungeCellRelations(m, 2, 1).map((r) => r.id)).toEqual([12]);
    expect(bungeCellRelations(m, 3, 1).map((r) => r.id)).toEqual([11]);
    expect(bungeCellRelations(m, 1, 3)).toEqual([]);
  });
});

describe("kindGlyph / bungeCellGlyph", () => {
  it("speaks Bunge's four-kind enum, · for unstated", () => {
    expect(kindGlyph("Energy")).toBe("e");
    expect(kindGlyph("Matter")).toBe("m");
    expect(kindGlyph("Field")).toBe("f");
    expect(kindGlyph("Informational")).toBe("i");
    expect(kindGlyph("Unspecified")).toBe("·");
  });
  it("shows the acting bond's kind; ∼ when only a mere relation holds", () => {
    expect(bungeCellGlyph(1, 2, [])).toBe("");
    expect(bungeCellGlyph(1, 2, [rel(10, 1, 2, true, "Energy")])).toBe("e");
    expect(bungeCellGlyph(1, 2, [rel(10, 1, 2, false)])).toBe("∼");
    // A bond outranks a co-resident mere relation, and stacks count.
    expect(bungeCellGlyph(1, 2, [rel(10, 1, 2, false), rel(11, 1, 2, true, "Matter")])).toBe("m×2");
  });
  it("marks the diagonal ↺", () => {
    expect(bungeCellGlyph(1, 1, [rel(10, 1, 1)])).toBe("↺");
  });
});
