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
import { MIN_RING_R, NODE_R, unprojectWrite } from "./geometry";

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
import { DoorSettings } from "./InterfacePopover";
import type { Thing } from "../kernel/types";

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
  source_thing_ids: [],
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
    // componentRing over the two components: a circle centred on their bbox
    // (250, 230), through the farthest centre plus the pad, floored at
    // MIN_RING_R (2026-11-02). Here the floor wins.
    const r = Math.max(MIN_RING_R, Math.hypot(50, 30) + NODE_R + 36);
    const onRing = Math.hypot(bs.x - 250, bs.y - 230) / r;
    expect(onRing).toBeCloseTo(1, 5);
    // The non-interface component stays where it was authored.
    const core = nodes.find((n) => n.id === 3)!;
    expect({ x: core.x, y: core.y }).toEqual({ x: 300, y: 200 });
  });

  it("gesture writes restore authored coords for untouched things (no ring runaway)", () => {
    // The 2026-08-09 drag bug: gestures hold the PROJECTED model, and a drag
    // writes untouched things through by reference — persisting projected
    // interface positions, whose bbox inflates the next ring, every frame.
    const projected: CanvasModel = {
      ...model,
      things: model.things.map((t) => (t.id === 1 ? { ...t, x: 999, y: 999 } : t)),
    };
    // A drag of Ledger Core (id 3): fresh object for it, references for the rest.
    const outgoing: CanvasModel = {
      ...projected,
      things: projected.things.map((t) => (t.id === 3 ? { ...t, x: 310, y: 210 } : t)),
    };
    const clean = unprojectWrite(model, projected, outgoing);
    const bs = clean.things.find((t) => t.id === 1)!;
    expect({ x: bs.x, y: bs.y }).toEqual({ x: 200, y: 260 }); // authored survives
    const core = clean.things.find((t) => t.id === 3)!;
    expect({ x: core.x, y: core.y }).toEqual({ x: 310, y: 210 }); // the drag lands
  });

  it("states the multi-protocol coarseness instead of hiding it (ratified b)", () => {
    const html = renderToStaticMarkup(
      <Canvas model={model} lens="Mobus" facts={facts} onModelChange={() => {}} onReject={() => {}} />,
    );
    expect(html).toContain("2 protocols");
    expect(html).toContain("refine each crossing");
  });
});

// Walk row 29: a door's settings where the interface is clicked. The protocol
// is the author's words (written to SL, never read by the run); what the door
// does is the run's side, and only pass and gate are offered (resist waits on
// an SL word for its share, walk row 18).

const door = (over: Partial<Thing> = {}): Thing => ({
  id: 3,
  name: "I3",
  x: 0,
  y: 0,
  role: "Component",
  interface: true,
  passway: true,
  ...over,
});
const show = (t: Thing) => renderToStaticMarkup(<DoorSettings thing={t} onEditThing={() => {}} onEditBehaviour={() => {}} />);

describe("a door's settings", () => {
  it("offers pass and gate, with the protocol in the author's words", () => {
    const html = show(door({ protocol: "graded ore only" }));
    expect(html).toContain("passes everything");
    expect(html).toContain("gates it");
    expect(html).not.toContain("resist");
    expect(html).toContain("graded ore only");
    expect(html).toContain("The run does not read these words");
  });

  it("reads a Modulating door as a gate and says how to close it", () => {
    const html = show(door({ passway: false, primitive: "Modulating" }));
    expect(html).toMatch(/<option value="gate" selected="">/);
    expect(html).toContain("until a message flow into it closes the gate");
  });

  it("leaves a process sited on the membrane alone, saying what it runs", () => {
    const html = show(door({ passway: false, primitive: "Combining" }));
    expect(html).not.toContain("door-behaviour");
    expect(html).toContain("It runs as Combining");
  });
});
