// #100 phase 4 — the Mobus register sharpenings, held to the register contract:
// (1) the decision/regulator triangle (Fig 4.17) fires for Modulating-typed
//     components ONLY, and only under Mobus;
// (2) glyph-first rendering: a primitive-typed component wears its glyph as
//     the body's face, not a corner medallion on an empty circle;
// (3) the palette's primitive tool stamps a component that IS that primitive
//     on an empty-stage click (one gesture), while designate-on-node survives;
// (4) Klir and Bunge output is BYTE-IDENTICAL with or without primitives —
//     no analog exists in those traditions by design.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel, ProcessPrimitive, Thing } from "../kernel/types";
import { LensRegistry, LensPalette, type LensNodeProps, type PaletteTool } from "./lenses/registry";
import { stampPrimitiveAt } from "./useCanvasGestures";

const noop = () => {};

const thing = (over: Partial<Thing>): Thing => ({
  id: 1,
  name: "regulator",
  x: 0,
  y: 0,
  role: "Component",
  ...over,
});

const nodeProps = (t: Thing): LensNodeProps => ({
  thing: t,
  isBoundary: false,
  isOrphan: false,
  hovered: false,
  onPointerDown: noop,
  onHandlePointerDown: noop,
});

const markup = (lens: "Klir" | "Bunge" | "Mobus", t: Thing): string => {
  const NodeView = LensRegistry[lens].NodeView;
  return renderToStaticMarkup(<NodeView {...nodeProps(t)} />);
};

describe("decision/regulator triangle (Mobus Fig 4.17)", () => {
  it("renders the triangle body for a Modulating component", () => {
    expect(markup("Mobus", thing({ primitive: "Modulating" }))).toContain('data-node-shape="triangle"');
  });

  it("no other primitive earns the shape — glyph-first circles instead", () => {
    const others: ProcessPrimitive[] = [
      "Combining",
      "Splitting",
      "Buffering",
      "Impeding",
      "Propelling",
      "Copying",
      "Sensing",
      "Amplifying",
      "Inverting",
    ];
    for (const p of others) {
      const m = markup("Mobus", thing({ primitive: p }));
      expect(m).not.toContain('data-node-shape="triangle"');
      expect(m).toContain('data-glyph="centered"');
    }
  });

  it("an unstamped component is a plain circle: no triangle, no glyph", () => {
    const m = markup("Mobus", thing({}));
    expect(m).not.toContain('data-node-shape="triangle"');
    expect(m).not.toContain('data-glyph="centered"');
  });

  it("a primitive on an env object stays dead state — no triangle, no glyph", () => {
    const m = markup("Mobus", thing({ role: "Environment", primitive: "Modulating" }));
    expect(m).not.toContain('data-node-shape="triangle"');
    expect(m).not.toContain('data-glyph="centered"');
  });

  it("the triangle IS the primitive — no glyph repeated on top of it", () => {
    expect(markup("Mobus", thing({ primitive: "Modulating" }))).not.toContain('data-glyph="centered"');
  });
});

describe("Klir/Bunge registers are byte-identical under primitives", () => {
  // The triangle and the glyph are Mobus register facts. Klir and Bunge have
  // no decision-primitive analog by design, so a primitive must be INVISIBLE
  // there: same bytes out, stamped or not.
  it.each(["Klir", "Bunge"] as const)("%s renders a Modulating thing byte-identically to a plain one", (lens) => {
    expect(markup(lens, thing({ primitive: "Modulating" }))).toBe(markup(lens, thing({})));
  });

  it.each(["Klir", "Bunge"] as const)("%s never draws the triangle or a glyph", (lens) => {
    const m = markup(lens, thing({ primitive: "Modulating" }));
    expect(m).not.toContain('data-node-shape="triangle"');
    expect(m).not.toContain('data-glyph="centered"');
  });
});

describe("stamp the primitive glyph as the placeable thing (#81 harvest)", () => {
  const model = {
    things: [thing({ id: 3, name: "boiler" })],
    relations: [],
    lens: "Mobus",
  } as unknown as CanvasModel;

  const tool = (id: string): PaletteTool => {
    const t = LensPalette.Mobus.designate.find((d) => d.id === id);
    if (!t) throw new Error(`no Mobus designate tool ${id}`);
    return t;
  };

  it("an armed primitive tool places a component that IS that primitive", () => {
    const next = stampPrimitiveAt(model, tool("primitive-Modulating"), { x: 40, y: -12 });
    expect(next).not.toBeNull();
    const stamped = next!.things[next!.things.length - 1];
    expect(stamped).toMatchObject({ role: "Component", primitive: "Modulating", x: 40, y: -12 });
    expect(stamped.id).toBe(4); // fresh id past the existing max
    expect(next!.things).toHaveLength(2); // ADDS; never mutates in place
    expect(model.things).toHaveLength(1);
  });

  it("interface designation stays unary-on-existing — no stage stamp", () => {
    expect(stampPrimitiveAt(model, tool("interface"), { x: 0, y: 0 })).toBeNull();
  });

  it("place tools keep their own branch — not routed through the stamp", () => {
    expect(stampPrimitiveAt(model, LensPalette.Mobus.place[0], { x: 0, y: 0 })).toBeNull();
  });

  it("the two-step path survives: every primitive still has its designate tool", () => {
    const ids = LensPalette.Mobus.designate.map((d) => d.id);
    for (const p of ["Modulating", "Buffering", "Combining"]) {
      expect(ids).toContain(`primitive-${p}`);
    }
  });
});
