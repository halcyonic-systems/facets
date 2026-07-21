// The Klir matrix register's cell semantics (#100 phase 1). These pin the
// reading discipline of the incidence table — which relations occupy which
// cell — since that mapping IS the register's honesty: a neutral relation
// mirrors, a directed one doesn't, a self-loop sits on the diagonal once.
import { describe, expect, it } from "vitest";
import type { CanvasModel, Relation, Thing } from "../kernel/types";
import { relationsAt, sigLabel, nextFreeId, mintThingPosition } from "./klirTable";

const thing = (id: number, over: Partial<Thing> = {}): Thing => ({
  id,
  name: `T${id}`,
  x: id * 100,
  y: 0,
  role: "Component",
  ...over,
});

const rel = (id: number, a: number, b: number, over: Partial<Relation> = {}): Relation => ({
  id,
  a,
  b,
  name: "",
  is_bond: true,
  kind: "Unspecified",
  ...over,
});

const modelWith = (things: Thing[], relations: Relation[]): CanvasModel => ({
  lens: "Klir",
  things,
  relations,
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
});

describe("relationsAt — the incidence-table reading", () => {
  it("mirrors a neutral relation into both (a,b) and (b,a)", () => {
    const m = modelWith([thing(1), thing(2)], [rel(1, 1, 2)]);
    expect(relationsAt(m, 1, 2).map((r) => r.id)).toEqual([1]);
    expect(relationsAt(m, 2, 1).map((r) => r.id)).toEqual([1]);
  });

  it("keeps a directed relation in its own cell only", () => {
    const m = modelWith([thing(1), thing(2)], [rel(1, 1, 2, { klir_directed: true })]);
    expect(relationsAt(m, 1, 2)).toHaveLength(1);
    expect(relationsAt(m, 2, 1)).toHaveLength(0);
  });

  it("reads a self-loop once on the diagonal, never twice through its mirror", () => {
    const m = modelWith([thing(1)], [rel(1, 1, 1)]);
    expect(relationsAt(m, 1, 1)).toHaveLength(1);
  });

  it("stacks multiple occupants of one cell", () => {
    const m = modelWith(
      [thing(1), thing(2)],
      [rel(1, 1, 2), rel(2, 2, 1), rel(3, 1, 2, { klir_directed: true })],
    );
    // Two neutral relations mirror in; the directed one adds only to (1,2).
    expect(relationsAt(m, 1, 2)).toHaveLength(3);
    expect(relationsAt(m, 2, 1)).toHaveLength(2);
  });

  it("leaves unrelated cells empty", () => {
    const m = modelWith([thing(1), thing(2), thing(3)], [rel(1, 1, 2)]);
    expect(relationsAt(m, 1, 3)).toHaveLength(0);
    expect(relationsAt(m, 3, 3)).toHaveLength(0);
  });
});

describe("sigLabel — matches the diagram face's rN convention", () => {
  it("labels by position in the relation list, 1-based", () => {
    const m = modelWith([thing(1), thing(2)], [rel(7, 1, 2), rel(3, 2, 1)]);
    expect(sigLabel(m, m.relations[0])).toBe("r1");
    expect(sigLabel(m, m.relations[1])).toBe("r2");
  });
});

describe("thing minting", () => {
  it("nextFreeId is max + 1, and 1 on empty", () => {
    expect(nextFreeId([])).toBe(1);
    expect(nextFreeId([4, 9, 2])).toBe(10);
  });

  it("mints positions below existing content, and distinct across successive adds", () => {
    const base = [thing(1), thing(2)];
    const p1 = mintThingPosition(base);
    expect(p1.y).toBeGreaterThan(Math.max(...base.map((t) => t.y)));
    const p2 = mintThingPosition([...base, thing(3, { x: p1.x, y: p1.y })]);
    expect(p2).not.toEqual(p1);
  });

  it("starts at the origin for an empty model", () => {
    expect(mintThingPosition([])).toEqual({ x: 0, y: 0 });
  });
});
