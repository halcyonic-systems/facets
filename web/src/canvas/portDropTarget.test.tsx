// #213: the interface port is a real connection target, and it reads as
// belonging to its component.
//
// Shingai's report: stamp a component `interface`, a notch appears somewhere on
// the membrane, and dragging a flow onto it does nothing — you have to hit the
// component instead, after which the picture reads env → interface → component,
// a hop the ontology denies. Both halves are covered here: the drop resolves to
// the owner (`I ⊆ C`), and the rendered notch is tied to its component.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel, LensFacts } from "../kernel/types";
import Canvas from "./Canvas";
import { connectionTargetAt } from "./useCanvasGestures";
import { PORT_HIT_R, membraneRing, ringPoint, type PortTarget } from "./geometry";

const model: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Gate", x: 200, y: 200, role: "Component", interface: true },
    { id: 2, name: "Core", x: 320, y: 200, role: "Component" },
    { id: 3, name: "Supply", x: 700, y: 200, role: "Environment" },
  ],
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const facts: LensFacts = {
  boundary_thing_ids: [],
  environment_thing_ids: [3],
  orphan_env_thing_ids: [3],
  authored_interface_thing_ids: [1],
  boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
  aggregate: false,
  edges: [],
  ports: [], // thing 1 is stamped but flowless — the reported state
};

const portAt = ringPoint(membraneRing(model.things), model.things[0]);
const targets: PortTarget[] = [{ at: portAt, component: 1 }];

describe("port as a drop target (#213)", () => {
  it("resolves a drop on the port to the component that owns it", () => {
    expect(connectionTargetAt(model, targets, portAt)?.id).toBe(1);
  });

  it("resolves anywhere inside the port's hit disc", () => {
    const grazed = { x: portAt.x + PORT_HIT_R - 1, y: portAt.y };
    expect(connectionTargetAt(model, targets, grazed)?.id).toBe(1);
  });

  it("dropping on the port and on the component reach the same thing", () => {
    const onComponent = connectionTargetAt(model, targets, { x: 200, y: 200 });
    const onPort = connectionTargetAt(model, targets, portAt);
    expect(onPort).toBe(onComponent);
  });

  it("misses outside the disc — the membrane is not one big target", () => {
    const far = { x: portAt.x + PORT_HIT_R + 40, y: portAt.y + 60 };
    expect(connectionTargetAt(model, targets, far)).toBeUndefined();
  });

  it("a node under a port still wins the drop", () => {
    const overCore: PortTarget[] = [{ at: { x: 320, y: 200 }, component: 1 }];
    expect(connectionTargetAt(model, overCore, { x: 320, y: 200 })?.id).toBe(2);
  });

  it("nothing changes when no ports are drawn", () => {
    expect(connectionTargetAt(model, [], portAt)).toBeUndefined();
  });
});

describe("the port reads as its component's (#213)", () => {
  const markup = () =>
    renderToStaticMarkup(
      <Canvas model={model} lens="Mobus" facts={facts} onModelChange={() => {}} onReject={() => {}} />,
    );

  it("rides the component's rim with no tether — position says it now (#306)", () => {
    // The #213 dashed tether existed to stitch an interior node to its membrane
    // notch. Under the #306 snap the interface component IS on the membrane,
    // so the notch rides its rim and the tether is gone by design.
    expect(markup()).not.toContain("data-port-tether");
  });

  it("names the owning component on the notch instead of leaving it anonymous", () => {
    expect(markup()).toContain("Gate · no flow");
  });

  it("groups the notch under the component it designates", () => {
    expect(markup()).toContain('data-port-owner="1"');
  });
});
