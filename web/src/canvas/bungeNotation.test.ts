import { describe, expect, it } from "vitest";
import type { CanvasModel, CanvasRole, Relation, Thing } from "../kernel/types";
import {
  bungeCellGlyph,
  bungeCellRelations,
  kindGlyph,
  matrixSlots,
  matrixThings,
  slotCellGlyph,
  slotCellRelations,
} from "./bungeNotation";

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

describe("matrixSlots — Bunge's (m+1)×(m+1), ℰ as index 0", () => {
  const m = model([thing(3, "Environment"), thing(1), thing(4, "Environment"), thing(2)], []);
  it("puts index 0 first and keeps only the components after it (1979 §2.1)", () => {
    expect(matrixSlots(m, true).map((s) => (s.kind === "env" ? 0 : s.thing.id))).toEqual([0, 1, 2]);
  });
  it("itemized is the old reading — composition, then each env thing", () => {
    expect(matrixSlots(m, false).map((s) => (s.kind === "env" ? 0 : s.thing.id))).toEqual([1, 2, 3, 4]);
  });
  it("raises no index 0 when the model has no environment at all", () => {
    const closed = model([thing(1), thing(2)], []);
    expect(matrixSlots(closed, true).every((s) => s.kind === "thing")).toBe(true);
  });
});

describe("slotCellRelations — index 0 gathers every environment thing at once", () => {
  const m = model(
    [thing(1), thing(2), thing(3, "Environment"), thing(4, "Environment")],
    [rel(10, 3, 1), rel(11, 4, 1), rel(12, 2, 3), rel(13, 1, 2), rel(14, 3, 4)],
  );
  const [env, c1, c2] = matrixSlots(m, true);
  it("collects both env things' actions into the input row 0", () => {
    expect(slotCellRelations(m, env, c1).map((r) => r.id)).toEqual([10, 11]);
  });
  it("collects the outputs into column 0", () => {
    expect(slotCellRelations(m, c2, env).map((r) => r.id)).toEqual([12]);
  });
  it("leaves the interior untouched — internuncial actions read as before", () => {
    expect(slotCellRelations(m, c1, c2).map((r) => r.id)).toEqual([13]);
  });
  it("empties M₀₀ — env-to-env couplings are not in 𝒮", () => {
    expect(slotCellRelations(m, env, env)).toEqual([]);
  });
  it("never double-counts a relation gathered from two directions", () => {
    const mere = model([thing(1), thing(3, "Environment")], [rel(20, 1, 3, false)]);
    const [e, c] = matrixSlots(mere, true);
    expect(slotCellRelations(mere, e, c).map((r) => r.id)).toEqual([20]);
  });
  it("marks no self-cell on index 0 — only a thing acts on itself", () => {
    expect(slotCellGlyph(env, env, [rel(10, 3, 3)])).toBe("·");
    expect(slotCellGlyph(c1, c1, [rel(10, 1, 1)])).toBe("↺");
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
