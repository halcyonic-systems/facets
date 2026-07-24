// #180 fix 1: a flowless-interface port (authored ∖ flow-crossing) must select
// its OWNING THING, not the boundary — you clicked it to see whose interface
// it is. `Mobus.PortView` is mocked so we can capture the `onSelect` closure
// Canvas.tsx builds for the flowless case without a DOM/click harness (this
// suite's own convention: pure render, no jsdom — see mobusRegister.test.tsx).
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel, LensFacts, PortFact } from "../kernel/types";

const { captured } = vi.hoisted(() => ({
  captured: [] as { component: number; onSelect?: () => void }[],
}));

vi.mock("./lenses/mobus", () => ({
  Mobus: {
    NodeView: () => null,
    EdgeView: () => null,
    PortView: (props: { port: PortFact; onSelect?: () => void }) => {
      captured.push({ component: props.port.component, onSelect: props.onSelect });
      return null;
    },
  },
}));

import Canvas from "./Canvas";

const model: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Thermostat", x: 200, y: 200, role: "Component", interface: true },
    { id: 2, name: "Furnace", x: 400, y: 200, role: "Component" },
  ],
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const facts: LensFacts = {
  boundary_thing_ids: [],
  environment_thing_ids: [],
  orphan_env_thing_ids: [],
  authored_interface_thing_ids: [1],
  boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
  aggregate: false,
  edges: [],
  ports: [], // no port for thing 1 — it is flowless
};

describe("flowless-interface port click (#180)", () => {
  it("selects the owning thing, not the boundary", () => {
    captured.length = 0;
    const onSelectThing = vi.fn();
    const onSelectBoundary = vi.fn();
    renderToStaticMarkup(
      <Canvas
        model={model}
        lens="Mobus"
        facts={facts}
        onModelChange={() => {}}
        onReject={() => {}}
        onSelectThing={onSelectThing}
        onSelectBoundary={onSelectBoundary}
      />,
    );

    const flowless = captured.find((c) => c.component === 1);
    expect(flowless).toBeDefined();
    flowless!.onSelect?.();

    expect(onSelectThing).toHaveBeenCalledWith(1);
    expect(onSelectBoundary).not.toHaveBeenCalled();
  });
});
