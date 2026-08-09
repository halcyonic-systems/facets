// 2026-08-09 field reports, both halves. (1) Clicking a flow-carrying interface
// capsule opened the BOUNDARY editor — it now opens the interface inspector
// (onSelectInterface with the PortFact); the boundary editor belongs to the
// membrane stroke alone. (2) #306, ratified: an authored interface component
// renders ON the membrane ring (extent from ALL components' authored spots),
// and an interface carrying several protocols says so instead of hiding it.
// Same pure-render harness as canvasFlowlessPort.test.tsx.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel, LensFacts, PortFact } from "../kernel/types";
import { NODE_R } from "./geometry";

const { captured, nodes } = vi.hoisted(() => ({
  captured: [] as { component: number; env: number; onSelect?: () => void }[],
  nodes: [] as { id: number; x: number; y: number }[],
}));

vi.mock("./lenses/mobus", () => ({
  Mobus: {
    NodeView: (props: { thing: { id: number; x: number; y: number } }) => {
      nodes.push({ id: props.thing.id, x: props.thing.x, y: props.thing.y });
      return null;
    },
    EdgeView: () => null,
    PortView: (props: { port: PortFact; onSelect?: () => void }) => {
      captured.push({ component: props.port.component, env: props.port.env, onSelect: props.onSelect });
      return null;
    },
  },
}));

import Canvas from "./Canvas";

const model: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Balance Sheet", x: 200, y: 260, role: "Component", interface: true },
    { id: 2, name: "Banking System", x: 500, y: 200, role: "Environment" },
    { id: 3, name: "Ledger Core", x: 300, y: 200, role: "Component" },
    { id: 4, name: "U.S. Treasury", x: 300, y: 520, role: "Environment" },
  ],
  relations: [
    { id: 10, a: 2, b: 1, name: "reserves", kind: "Matter", is_bond: true },
    { id: 11, a: 4, b: 1, name: "TGA deposits", kind: "Matter", is_bond: true },
  ],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const facts: LensFacts = {
  boundary_thing_ids: [1],
  environment_thing_ids: [2, 4],
  orphan_env_thing_ids: [],
  authored_interface_thing_ids: [1],
  boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
  aggregate: false,
  edges: [],
  ports: [
    { component: 1, env: 2, relation_ids: [10], direction: "Receives", protocol: "reserves" },
    { component: 1, env: 4, relation_ids: [11], direction: "Receives", protocol: "TGA deposits" },
  ],
};

describe("flow-carrying interface capsule click (2026-08-09)", () => {
  it("opens the interface inspector, never the boundary editor", () => {
    captured.length = 0;
    const onSelectInterface = vi.fn();
    const onSelectBoundary = vi.fn();
    renderToStaticMarkup(
      <Canvas
        model={model}
        lens="Mobus"
        facts={facts}
        onModelChange={() => {}}
        onReject={() => {}}
        onSelectInterface={onSelectInterface}
        onSelectBoundary={onSelectBoundary}
      />,
    );

    const capsule = captured.find((c) => c.component === 1 && c.env === 2);
    expect(capsule).toBeDefined();
    capsule!.onSelect?.();

    expect(onSelectInterface).toHaveBeenCalledTimes(1);
    expect(onSelectInterface.mock.calls[0][0].relation_ids).toEqual([10]);
    expect(onSelectBoundary).not.toHaveBeenCalled();
  });

  it("snaps the authored interface onto the membrane ring (#306)", () => {
    nodes.length = 0;
    renderToStaticMarkup(
      <Canvas model={model} lens="Mobus" facts={facts} onModelChange={() => {}} onReject={() => {}} />,
    );
    // Ring extent comes from ALL components at their AUTHORED positions
    // (excluding interfaces collapsed the Fed membrane to a bubble); Balance
    // Sheet renders projected onto that ellipse, not at its interior spot.
    const bs = nodes.find((n) => n.id === 1)!;
    expect(bs).toBeDefined();
    expect({ x: bs.x, y: bs.y }).not.toEqual({ x: 200, y: 260 });
    // componentRing over the two components' bbox: center (250, 230),
    // half-extents (50, 30) · √2 + pad.
    const pad = NODE_R + 36;
    const rx = 50 * Math.SQRT2 + pad;
    const ry = 30 * Math.SQRT2 + pad;
    const onRing = ((bs.x - 250) / rx) ** 2 + ((bs.y - 230) / ry) ** 2;
    expect(onRing).toBeCloseTo(1, 5);
    // The non-interface component stays where it was authored.
    const core = nodes.find((n) => n.id === 3)!;
    expect({ x: core.x, y: core.y }).toEqual({ x: 300, y: 200 });
  });

  it("states the multi-protocol coarseness instead of hiding it (ratified b)", () => {
    const html = renderToStaticMarkup(
      <Canvas model={model} lens="Mobus" facts={facts} onModelChange={() => {}} onReject={() => {}} />,
    );
    expect(html).toContain("2 protocols");
    expect(html).toContain("SSF #43");
  });
});
