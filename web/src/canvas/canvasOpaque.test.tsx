// The opaque view (#308 part B): the open model seen from outside. The same
// pure-render harness as canvasInterfaceClick.test.tsx. What it pins: only
// the neighbours and the interfaces are drawn, only the crossings are drawn
// (and without their dashed interior segment), the ports are untouched, the
// membrane is the transparent view's membrane exactly, and no aperture opens.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel, LensFacts, PortFact } from "../kernel/types";
import { OPAQUE_EXIT, wantsOpaqueExit } from "./frameRebase";

const { nodes, edges, ports } = vi.hoisted(() => ({
  nodes: [] as number[],
  edges: [] as { id: number; hideInterior?: boolean }[],
  ports: [] as number[],
}));

vi.mock("./lenses/mobus", () => ({
  Mobus: {
    NodeView: (props: { thing: { id: number } }) => {
      nodes.push(props.thing.id);
      return null;
    },
    EdgeView: (props: { relation: { id: number }; hideInterior?: boolean }) => {
      edges.push({ id: props.relation.id, hideInterior: props.hideInterior });
      return null;
    },
    PortView: (props: { port: PortFact }) => {
      ports.push(props.port.component);
      return null;
    },
  },
}));

import Canvas from "./Canvas";

// Two interior components, one interface, two neighbours. Four relations: an
// interior bond, interface→interior, env→interface (a crossing through the
// interface), env→interior (a crossing with no interface: the capsule case).
const model: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Dock", x: 200, y: 260, role: "Component", interface: true },
    { id: 2, name: "Furnace", x: 320, y: 300, role: "Component" },
    { id: 3, name: "Store", x: 360, y: 200, role: "Component" },
    { id: 4, name: "Supplier", x: 520, y: 200, role: "Environment" },
    { id: 5, name: "Grid", x: 300, y: 540, role: "Environment" },
  ],
  relations: [
    { id: 10, a: 2, b: 3, name: "hot metal", kind: "Matter", is_bond: true },
    { id: 11, a: 1, b: 2, name: "ore", kind: "Matter", is_bond: true },
    { id: 12, a: 4, b: 1, name: "shipments", kind: "Matter", is_bond: true },
    { id: 13, a: 5, b: 2, name: "power", kind: "Energy", is_bond: true },
  ],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const edge = (id: number, a: number, b: number, kind: "Matter" | "Energy", locus: "Endo" | "Exo") => ({
  id, a, b, bond: true, kind, locus, channel: locus === "Exo" ? ("Input" as const) : null, self_loop: false, mobus_ok: true,
});

const facts: LensFacts = {
  boundary_thing_ids: [1, 2],
  environment_thing_ids: [4, 5],
  orphan_env_thing_ids: [],
  authored_interface_thing_ids: [1],
  boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
  aggregate: false,
  edges: [edge(10, 2, 3, "Matter", "Endo"), edge(11, 1, 2, "Matter", "Endo"), edge(12, 4, 1, "Matter", "Exo"), edge(13, 5, 2, "Energy", "Exo")],
  ports: [
    { component: 1, env: 4, relation_ids: [12], direction: "Receives", protocol: "shipments" },
    { component: 2, env: 5, relation_ids: [13], direction: "Receives", protocol: "power" },
  ],
};

function render(opaque: boolean, childModel?: (id: string) => CanvasModel | null) {
  nodes.length = 0;
  edges.length = 0;
  ports.length = 0;
  return renderToStaticMarkup(
    <Canvas
      model={model}
      lens="Mobus"
      facts={facts}
      opaque={opaque}
      childModel={childModel}
      onModelChange={() => {}}
      onReject={() => {}}
    />,
  );
}

const membrane = (html: string) => /<ellipse[^>]*class="[^"]*membrane[^"]*"[^>]*>/.exec(html)?.[0] ?? /<ellipse[^>]*>/.exec(html)?.[0] ?? "";

describe("the opaque view (#308 part B)", () => {
  it("draws the neighbours and the interfaces, and nothing inside", () => {
    render(true);
    expect([...nodes].sort()).toEqual([1, 4, 5]);
  });

  it("draws only the crossings, up to the membrane and no further", () => {
    render(true);
    expect(edges.map((e) => e.id).sort()).toEqual([12, 13]);
    expect(edges.every((e) => e.hideInterior === true)).toBe(true);
    render(false);
    expect(edges.map((e) => e.id).sort()).toEqual([10, 11, 12, 13]);
    expect(edges.every((e) => e.hideInterior === false)).toBe(true);
  });

  it("keeps every port: the crossings' landings are the view's whole point", () => {
    render(true);
    expect([...ports].sort()).toEqual([1, 2]);
  });

  it("keeps the transparent view's membrane exactly", () => {
    const opaque = membrane(render(true));
    const transparent = membrane(render(false));
    expect(opaque).not.toBe("");
    expect(opaque).toBe(transparent);
  });

  it("marks the stage and opens no aperture", () => {
    const child: CanvasModel = { ...model, things: model.things.slice(0, 1), relations: [] };
    const withDoor: CanvasModel = {
      ...model,
      things: model.things.map((t) => (t.id === 2 ? { ...t, child_model: { name: "Furnace", id: "WVv2pzPHybekS7U3ewwVxx" } } : t)),
    };
    nodes.length = 0;
    const html = renderToStaticMarkup(
      <Canvas model={withDoor} lens="Mobus" facts={facts} opaque childModel={() => child} onModelChange={() => {}} onReject={() => {}} />,
    );
    expect(html).toContain('data-opaque="true"');
    expect(html).not.toContain("data-aperture");
    expect(render(false)).not.toContain("data-opaque");
  });
});

describe("wantsOpaqueExit", () => {
  it("fires only once the frame has grown well past the arming band", () => {
    const minView = 1000;
    expect(wantsOpaqueExit(minView * OPAQUE_EXIT - 1, minView)).toBe(false);
    expect(wantsOpaqueExit(minView * OPAQUE_EXIT, minView)).toBe(true);
    expect(wantsOpaqueExit(5000, 0)).toBe(false);
  });
});
