// kernel/params (ws5) — the ONE param→relation resolution, shared by the run
// rail and the canvas EdgePopover. Pins: Flow anchors resolve to the declared
// relation (and only a declared one), Shares anchors need a real group,
// flowParamFor never answers for a Shares param, and forcing wins by column.
import { describe, expect, it } from "vitest";
import type { CanvasModel, Manifest, Relation } from "./types";
import { declaredRelations, flowParamFor, forcedByColumn, resolveParamRows } from "./params";

const rel = (id: number, a: number, b: number, over: Partial<Relation> = {}): Relation =>
  ({
    id,
    a,
    b,
    name: `f${id}`,
    kind: "Matter",
    is_bond: true,
    amount: "10",
    ...over,
  }) as Relation;

const model = (relations: Relation[], params: CanvasModel["params"]): CanvasModel =>
  ({ name: "m", lens: "Mobus", things: [], relations, params }) as unknown as CanvasModel;

describe("kernel/params", () => {
  it("declaredRelations keeps bonds with an amount or ample, drops the rest", () => {
    const m = model(
      [
        rel(1, 0, 1),
        rel(2, 0, 1, { amount: undefined, ample: true }),
        rel(3, 0, 1, { amount: undefined }),
        rel(4, 0, 1, { is_bond: false }),
      ],
      [],
    );
    expect(declaredRelations(m).map((r) => r.id)).toEqual([1, 2]);
  });

  it("resolves Flow anchors to their declared relation and drops missing ones", () => {
    const m = model(
      [rel(1, 0, 1)],
      [
        { name: "supply", anchor: { Flow: { relation: 1 } } },
        { name: "ghost", anchor: { Flow: { relation: 99 } } },
      ] as CanvasModel["params"],
    );
    const rows = resolveParamRows(m);
    expect(rows).toHaveLength(1);
    expect(rows[0].param.name).toBe("supply");
    expect(rows[0].relation?.id).toBe(1);
  });

  it("resolves Shares anchors only when the group has at least two flows", () => {
    const m = model(
      [rel(1, 5, 1), rel(2, 5, 2), rel(3, 6, 1)],
      [
        { name: "split", anchor: { Shares: { thing: 5 } } },
        { name: "lonely", anchor: { Shares: { thing: 6 } } },
      ] as CanvasModel["params"],
    );
    const rows = resolveParamRows(m);
    expect(rows).toHaveLength(1);
    expect(rows[0].param.name).toBe("split");
    expect(rows[0].group?.map((r) => r.id)).toEqual([1, 2]);
  });

  it("flowParamFor answers for Flow anchors only, never Shares", () => {
    const m = model(
      [rel(1, 5, 1), rel(2, 5, 2)],
      [
        { name: "supply", anchor: { Flow: { relation: 1 } } },
        { name: "split", anchor: { Shares: { thing: 5 } } },
      ] as CanvasModel["params"],
    );
    expect(flowParamFor(m, 1)?.name).toBe("supply");
    expect(flowParamFor(m, 2)).toBeNull();
  });

  it("forcedByColumn reads the forcing flow mapping by element name", () => {
    const manifest = {
      model: "m",
      data: "d",
      t: 10,
      mapping: [{ as: "flow", force: true, element: "f1", column: "obs" }],
    } as unknown as Manifest;
    expect(forcedByColumn(manifest, rel(1, 0, 1))).toBe("obs");
    expect(forcedByColumn(manifest, rel(2, 0, 1))).toBeUndefined();
    expect(forcedByColumn(null, rel(1, 0, 1))).toBeUndefined();
  });
});

// #343 (#463 move 3): a Field anchor resolves to its component and the engine
// field the component line declares; one naming a field the line never
// declared, or a thing that is not there, drops out — exactly as a Flow
// anchor with no declared relation always has.
describe("kernel/params · Field anchors", () => {
  it("resolve to the component and the declared field, and drop the rest", () => {
    const barrel = {
      id: 2,
      name: "Barrel",
      role: "Component",
      primitive: "Buffering",
      cognitive_params: { release_rate: 12, capacity: 200 },
    } as unknown as CanvasModel["things"][number];
    const m = {
      name: "m",
      lens: "Mobus",
      things: [barrel],
      relations: [],
      params: [
        { name: "drain", anchor: { Field: { thing: 2, field: "release_rate" } }, range: { min: "0", max: "40" } },
        { name: "tank", anchor: { Field: { thing: 2, field: "capacity" } } },
        { name: "upkeep", anchor: { Field: { thing: 2, field: "maintenance" } } },
        { name: "ghost", anchor: { Field: { thing: 9, field: "release_rate" } } },
      ],
    } as unknown as CanvasModel;
    expect(resolveParamRows(m).map((r) => [r.param.name, r.thing?.name, r.field])).toEqual([
      ["drain", "Barrel", "release_rate"],
      ["tank", "Barrel", "capacity"],
    ]);
    expect(flowParamFor(m, 1)).toBeNull();
  });
});
