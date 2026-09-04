// #139 M1: a decomposed component draws its child inside its own circle. What
// is asserted here is the three things that make it safe to leave on — it needs
// a resolved child and never invents one, it is pointer-transparent so the
// author still works the parent model, and it is a Mobus reading (the membrane
// is what an aperture is read through; Bunge's hull is a cut and Klir draws no
// container at all). Pure render, no jsdom — this suite's convention.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Canvas from "./Canvas";
import type { CanvasModel, LensFacts } from "../kernel/types";

const parent: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Steel-Plant", x: 300, y: 200, role: "Component", child_model: { id: "CHILD", name: "level 1" } },
    { id: 2, name: "Yard", x: 480, y: 200, role: "Component" },
  ],
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const child: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Furnace", x: 0, y: 0, role: "Component" },
    { id: 2, name: "Caster", x: 400, y: 120, role: "Component" },
    { id: 3, name: "Iron-Mine", x: 9000, y: 9000, role: "Environment" },
  ],
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const facts: LensFacts = {
  boundary_thing_ids: [],
  environment_thing_ids: [],
  orphan_env_thing_ids: [],
  authored_interface_thing_ids: [],
  boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
  aggregate: false,
  edges: [],
  ports: [],
};

const render = (props: Partial<React.ComponentProps<typeof Canvas>> = {}) =>
  renderToStaticMarkup(
    <Canvas
      model={parent}
      lens="Mobus"
      facts={facts}
      onModelChange={() => {}}
      onReject={() => {}}
      childModel={() => child}
      initialScale={3}
      {...props}
    />,
  );

describe("the decomposition aperture", () => {
  it("draws the child inside the component that decomposes into it", () => {
    const svg = render();
    expect(svg).toContain('data-aperture="aperture-1"');
    expect(svg).toContain('clip-path="url(#aperture-1)"');
  });

  it("stays out of the way: the frame takes no pointer events, so hit-testing is still the parent's", () => {
    const frame = /<g pointer-events="none" data-aperture="aperture-1">/;
    expect(render()).toMatch(frame);
  });

  it("draws nothing until the child resolves, and nothing at all if it never does", () => {
    expect(render({ childModel: () => undefined })).not.toContain("data-aperture");
    expect(render({ childModel: () => null })).not.toContain("data-aperture");
    expect(render({ childModel: undefined })).not.toContain("data-aperture");
  });

  it("reads through the register's own container — Bunge's hull, and never Klir", () => {
    // #139 rule 5: the seam is the language's, so both registers that draw a
    // container can show it. Bunge's is the observer's cut, dashed and
    // unfilled; Klir draws no container at all, so it opens no aperture.
    const bunge = render({ lens: "Bunge" });
    expect(bunge).toContain("data-aperture");
    expect(bunge).toContain('stroke-dasharray="8 6"');
    expect(render({ lens: "Klir" })).not.toContain("data-aperture");
  });

  it("leaves the component itself on the stage — the node keeps its label and its handle", () => {
    const svg = render();
    expect(svg).toContain('data-node-label="1"');
    // The register may set the label in caps; what matters is that it is there.
    expect(svg.toUpperCase()).toContain("STEEL-PLANT");
  });
});
