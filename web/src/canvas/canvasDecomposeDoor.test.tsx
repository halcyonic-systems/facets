// The decomposition door on the diagram: hover a component's rim and the way
// into it is right there, on the component, instead of only in the inspector.
// Pure render, no jsdom — this suite's convention (see canvasFlowlessPort).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Canvas from "./Canvas";
import type { CanvasModel, Thing } from "../kernel/types";
import type { DecomposeAffordance } from "./NodeEditor";

const things: Thing[] = [
  {
    id: 1,
    name: "Reactor",
    x: 200,
    y: 200,
    role: "Component",
    child_model: { id: "ref-1", name: "Reactor interior" },
  } as Thing,
  { id: 2, name: "Pump", x: 400, y: 200, role: "Component" },
  { id: 3, name: "Grid", x: 600, y: 200, role: "Environment" },
];

const model: CanvasModel = {
  lens: "Mobus",
  things,
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const doorFor = (t: Thing): DecomposeAffordance | null => {
  if (t.role !== "Component") return null;
  return t.child_model
    ? { kind: "entered", label: t.child_model.name, onEnter: () => {} }
    : { kind: "ready", onDecompose: () => {} };
};

const draw = (lens: CanvasModel["lens"]) =>
  renderToStaticMarkup(
    <Canvas
      model={{ ...model, lens }}
      lens={lens}
      onModelChange={() => {}}
      onReject={() => {}}
      doorFor={doorFor}
    />,
  );

describe("the rim decomposition door", () => {
  it("offers the child by name on a decomposed component", () => {
    expect(draw("Mobus")).toContain("<title>Enter Reactor interior</title>");
  });

  it("offers to mint one on a component that has none", () => {
    expect(draw("Mobus")).toContain("<title>Decompose this component</title>");
  });

  it("draws no door on an environment thing", () => {
    const markup = draw("Mobus");
    expect(markup).toContain('data-decompose-door="1"');
    expect(markup).toContain('data-decompose-door="2"');
    expect(markup).not.toContain('data-decompose-door="3"');
  });

  it("stays off the flat register", () => {
    expect(draw("Klir")).not.toContain("data-decompose-door");
  });
});
