// 2026-08-09 field report: clicking a flow-carrying interface capsule opened
// the BOUNDARY editor — it now opens the interface inspector (onSelectInterface
// with the PortFact), and the boundary editor belongs to the membrane stroke
// alone. Same pure-render harness as canvasFlowlessPort.test.tsx. Also the
// separating instance for the authored-interface ring: a marked component WITH
// flows renders the INTERFACE tag (it was invisible exactly there before).
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel, LensFacts, PortFact } from "../kernel/types";

const { captured } = vi.hoisted(() => ({
  captured: [] as { component: number; env: number; onSelect?: () => void }[],
}));

vi.mock("./lenses/mobus", () => ({
  Mobus: {
    NodeView: () => null,
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
    { id: 1, name: "Balance Sheet", x: 200, y: 200, role: "Component", interface: true },
    { id: 2, name: "Banking System", x: 500, y: 200, role: "Environment" },
  ],
  relations: [{ id: 10, a: 2, b: 1, name: "reserves", kind: "Matter", is_bond: true }],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const facts: LensFacts = {
  boundary_thing_ids: [1],
  environment_thing_ids: [2],
  orphan_env_thing_ids: [],
  authored_interface_thing_ids: [1],
  boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
  aggregate: false,
  edges: [],
  ports: [{ component: 1, env: 2, relation_ids: [10], direction: "Receives", protocol: "reserves" }],
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

  it("marks a flow-carrying authored interface on the node itself", () => {
    const html = renderToStaticMarkup(
      <Canvas model={model} lens="Mobus" facts={facts} onModelChange={() => {}} onReject={() => {}} />,
    );
    expect(html).toContain("INTERFACE");
  });
});
