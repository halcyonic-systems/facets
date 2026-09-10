// #377 M3 — the interior draft: what the drafter is told, and what its text
// becomes. The kernel is mocked (compile, emit, validate); the point here is
// the brief's contract and the adopt step's two carry-overs.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanvasModel, Thing } from "./kernel/types";

const authorSlMock = vi.hoisted(() => vi.fn());
const compileSlMock = vi.hoisted(() => vi.fn());
const emitSlMock = vi.hoisted(() => vi.fn());
vi.mock("./gsr", () => ({ authorSl: authorSlMock }));
vi.mock("./kernel", () => ({
  compileSl: compileSlMock,
  emitSl: emitSlMock,
  validateMode: () => ({ issues: [] }),
}));

import { adoptInterior, buildInteriorBrief, draftInteriorWithRetry, pendingCrossings } from "./interior";

const thing = (id: number, name: string, role: Thing["role"], extra: Partial<Thing> = {}): Thing =>
  ({ id, name, x: 0, y: 0, role, description: "", ...extra }) as Thing;

/** The aquarium's Aerator, one level down, as `derive_child` + `to_canvas`
 *  make it: two stand-ins, two crossings on the root, nothing inside. */
function newborn(): CanvasModel {
  return {
    lens: "Mobus",
    model_id: "child-1",
    name: "Aerator",
    things: [
      thing(1, "Atmosphere", "Environment", { env_kind: "Source" }),
      thing(2, "Water", "Environment", { env_kind: "Sink" }),
    ],
    relations: [],
    crossings: [
      { env: 1, inbound: true, name: "air", kind: "Matter" },
      { env: 2, inbound: false, name: "bubbles", kind: "Matter" },
    ],
    boundary: { porosity: 0, perceptive_fuzziness: 0 },
  };
}

function parent(): CanvasModel {
  return {
    lens: "Mobus",
    name: "Aquarium",
    things: [
      thing(10, "Water", "Component", { interface: true }),
      thing(11, "Aerator", "Component", { interface: true, description: "pump, airline, stone", child_model: { id: "child-1", name: "Aerator" } }),
      thing(12, "Atmosphere", "Environment", { env_kind: "Source" }),
    ],
    relations: [],
    boundary: { porosity: 0, perceptive_fuzziness: 0 },
  };
}

beforeEach(() => {
  authorSlMock.mockReset();
  compileSlMock.mockReset();
  emitSlMock.mockReset();
  emitSlMock.mockReturnValue('system "Aerator"\nsource Atmosphere\nsink Water\n# 2 boundary flows land on this system itself until an interface component takes them:\n#   Atmosphere -> (this system) : matter "air"\n#   (this system) -> Water : matter "bubbles"\n@lens mobus\n');
});

describe("pendingCrossings", () => {
  it("counts every crossing on a newborn", () => {
    expect(pendingCrossings(newborn()).map((c) => c.name)).toEqual(["air", "bubbles"]);
  });

  it("retires a crossing once a bond of the same kind reaches a component from its stand-in", () => {
    const m = newborn();
    m.things.push(thing(3, "Intake", "Component", { interface: true }));
    m.relations.push({ id: 9, a: 1, b: 3, name: "air", is_bond: true, kind: "Matter" });
    expect(pendingCrossings(m).map((c) => c.name)).toEqual(["bubbles"]);
  });

  it("does not retire on a flow of a different kind or the wrong direction", () => {
    const m = newborn();
    m.things.push(thing(3, "Intake", "Component", { interface: true }));
    m.relations.push({ id: 9, a: 1, b: 3, name: "air", is_bond: true, kind: "Energy" });
    m.relations.push({ id: 10, a: 3, b: 1, name: "back", is_bond: true, kind: "Matter" });
    expect(pendingCrossings(m)).toHaveLength(2);
  });
});

describe("buildInteriorBrief", () => {
  const ctx = () => ({ parent: parent(), component: parent().things[1], child: newborn() });

  it("names the component, its description, and forbids a new boundary", () => {
    const brief = buildInteriorBrief(ctx());
    expect(brief).toContain('INTERIOR of one component, "Aerator"');
    expect(brief).toContain("pump, airline, stone");
    expect(brief).toContain("Declare NO new source, sink or environment");
  });

  it("lists each pending crossing with its neighbour, direction, kind and label", () => {
    const brief = buildInteriorBrief(ctx());
    expect(brief).toContain('flow Atmosphere -> <the interface component that receives it> : matter "air"');
    expect(brief).toContain('flow <the interface component that sends it> -> Water : matter "bubbles"');
  });

  it("asks for the owners first, then the work processes, then the level claims", () => {
    const brief = buildInteriorBrief(ctx());
    const owners = brief.indexOf("importer or exporter that owns each crossing");
    const work = brief.indexOf("internal work processes");
    const claims = brief.indexOf("`primitive` only on atomic leaves");
    expect(owners).toBeGreaterThan(-1);
    expect(work).toBeGreaterThan(owners);
    expect(claims).toBeGreaterThan(work);
  });

  it("carries the child's own SL as the skeleton, kernel-emitted", () => {
    const brief = buildInteriorBrief(ctx());
    expect(emitSlMock).toHaveBeenCalledTimes(1);
    expect(brief).toContain("=== THE CHILD AS IT STANDS ===");
    expect(brief).toContain("source Atmosphere");
    expect(brief).toContain("#   Atmosphere -> (this system) : matter \"air\"");
  });

  it("rides the ordinary draft loop with the child's lens", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "drafted", model: "gemma4:e4b" });
    compileSlMock.mockReturnValueOnce({ ok: newborn(), lens_explicit: true });
    const out = await draftInteriorWithRetry(ctx());
    expect(out.sl).toBe("drafted");
    expect(authorSlMock).toHaveBeenCalledWith(expect.objectContaining({ lens: "Mobus" }));
    expect(authorSlMock.mock.calls[0][0].description).toContain("=== THE CHILD AS IT STANDS ===");
  });
});

describe("adoptInterior", () => {
  it("carries the child's identity and name, and re-attaches crossings by stand-in name", () => {
    // the compiler mints fresh ids: Atmosphere is 7 now, Water is 8
    const compiled: CanvasModel = {
      lens: "Mobus",
      name: "Aerator interior",
      things: [
        thing(7, "Atmosphere", "Environment", { env_kind: "Source" }),
        thing(8, "Water", "Environment", { env_kind: "Sink" }),
        thing(9, "Intake", "Component", { interface: true }),
      ],
      relations: [{ id: 1, a: 7, b: 9, name: "air", is_bond: true, kind: "Matter" }],
      boundary: { porosity: 0, perceptive_fuzziness: 0 },
    };
    compileSlMock.mockReturnValueOnce({ ok: compiled, lens_explicit: true });
    const out = adoptInterior("text", newborn());
    expect(out.kind).toBe("compiled");
    if (out.kind !== "compiled") return;
    expect(out.model.model_id).toBe("child-1");
    expect(out.model.name).toBe("Aerator");
    expect(out.model.crossings).toEqual([
      { env: 7, inbound: true, name: "air", kind: "Matter" },
      { env: 8, inbound: false, name: "bubbles", kind: "Matter" },
    ]);
    expect(out.lostCrossings).toEqual([]);
    // the air crossing is now taken, bubbles still pending
    expect(pendingCrossings(out.model).map((c) => c.name)).toEqual(["bubbles"]);
    // everything else is the compiler's output by identity
    expect(out.model.things).toBe(compiled.things);
  });

  it("reports a crossing whose stand-in the drafter dropped, rather than losing it silently", () => {
    const compiled: CanvasModel = {
      lens: "Mobus",
      things: [thing(7, "Atmosphere", "Environment", { env_kind: "Source" })],
      relations: [],
      boundary: { porosity: 0, perceptive_fuzziness: 0 },
    };
    compileSlMock.mockReturnValueOnce({ ok: compiled, lens_explicit: true });
    const out = adoptInterior("text", newborn());
    if (out.kind !== "compiled") throw new Error("expected compiled");
    expect(out.lostCrossings).toEqual(['-> Water "bubbles"']);
    expect(out.model.crossings).toHaveLength(1);
  });

  it("returns the parser's faults untouched when the text is not a model", () => {
    compileSlMock.mockReturnValueOnce({ errors: [{ line: 3, message: "`Intake` is not declared" }] });
    const out = adoptInterior("text", newborn());
    expect(out).toEqual({ kind: "compile-error", errors: [{ line: 3, message: "`Intake` is not declared" }] });
  });
});
