// facets#269: the agent on the canvas — a distinct thing kind, stamped from
// the rail, drawn with the management oval, its rule edited in the inspector.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel } from "../kernel/types";
import { LensPalette } from "./lenses/registry";
import { agentFields, stampPrimitiveAt } from "./useCanvasGestures";
import { NodeBody } from "./lenses/common";

const empty: CanvasModel = { lens: "Mobus", things: [], relations: [], boundary: { porosity: 0, perceptive_fuzziness: 0 } };

describe("the agent designation", () => {
  it("is on the Mobus rail and nowhere else", () => {
    const has = (lens: "Mobus" | "Klir" | "Bunge") =>
      LensPalette[lens].designate.some((t) => t.verb === "designate" && t.designation.type === "agent");
    expect(has("Mobus")).toBe(true);
    expect(has("Klir")).toBe(false);
    expect(has("Bunge")).toBe(false);
  });

  it("places an agent with its rule's numbers and no primitive", () => {
    const tool = LensPalette.Mobus.designate.find((t) => t.verb === "designate" && t.designation.type === "agent")!;
    const next = stampPrimitiveAt(empty, tool, { x: 10, y: 20 })!;
    expect(next.things).toHaveLength(1);
    const a = next.things[0];
    expect(a.rule).toBe("proportional");
    expect(a.primitive).toBeUndefined();
    expect(a.cognitive_params).toEqual({ target: 1, gain: 1 });
    expect(agentFields("threshold").cognitive_params).toEqual({ above: 1, emit: 0, else: 1 });
    // A table starts with two bins (one bin is a threshold, and the compiler
    // says so); a trace with a three-tick window.
    expect(agentFields("table").cognitive_params).toEqual({ under1: 1, emit1: 1, under2: 2, emit2: 0.5, else: 0 });
    expect(agentFields("trace").cognitive_params).toEqual({ window: 3, target: 1, gain: 1 });
  });

  it("draws the management oval on an agent body", () => {
    const html = renderToStaticMarkup(
      <svg>
        <NodeBody
          scale={1}
          thing={{ id: 1, name: "Thermostat", x: 0, y: 0, role: "Component" }}
          hovered={false}
          onPointerDown={() => {}}
          onHandlePointerDown={() => {}}
          isSquare={false}
          showHalo
          envOpen={false}
          stroke="var(--lens-node-stroke)"
          strokeOpacity={1}
          strokeWidth={1}
          labelSmall={false}
          boundaryRim={false}
          agentOval
        />
      </svg>,
    );
    expect(html).toContain('data-glyph="agent-oval"');
  });
});
