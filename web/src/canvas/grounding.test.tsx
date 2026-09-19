// #411: the grounding overlay is a reading the reader switches on. Off, the
// canvas draws exactly what it drew before the clause existed; on, the stroke
// says whose word the element rests on, an ungraded element fades rather than
// vanishes, and `unknown` is a hollow dashed outline. Pure render, no jsdom.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EdgeScaffold, NodeBody } from "./lenses/common";
import { GROUNDING_GRADES } from "../kernel/types";
import type { Grounding } from "../kernel/types";
import { GroundingLegend, GroundingOverlayContext, gradeCensus, groundingLine, groundingStroke } from "./grounding";

const LENS_COLOR = "var(--lens-color-under-test)";

const edge = (grounding: Grounding | undefined, on: boolean) =>
  renderToStaticMarkup(
    <GroundingOverlayContext.Provider value={on}>
      <EdgeScaffold
        labelAt={{ x: 100, y: 100 }}
        style={{ color: LENS_COLOR, width: 1, opacity: 1, marker: "arrow-Matter" }}
        interior={null}
        visible={[{ d: "M 0 0 L 200 0", markered: true }]}
        selected={false}
        driven={false}
        relationId={7}
        grounding={grounding}
      />
    </GroundingOverlayContext.Provider>,
  );

const node = (grounding: Grounding | undefined, on: boolean) =>
  renderToStaticMarkup(
    <GroundingOverlayContext.Provider value={on}>
      <NodeBody
        thing={{ id: 1, x: 0, y: 0, name: "Staking", role: "Component", grounding }}
        hovered={false}
        onPointerDown={() => {}}
        onHandlePointerDown={() => {}}
        isSquare={false}
        showHalo={false}
        envOpen={false}
        stroke={LENS_COLOR}
        strokeOpacity={1}
        strokeWidth={1.5}
        labelSmall={false}
        boundaryRim={false}
      />
    </GroundingOverlayContext.Provider>,
  );

describe("#411 the grounding overlay", () => {
  it("off, a graded element renders exactly as its lens draws it", () => {
    const g: Grounding = { grade: "chain", reference: "StakingV2.sol:314" };
    expect(edge(g, false)).toContain(`stroke="${LENS_COLOR}"`);
    expect(edge(g, false)).toContain('marker-end="url(#arrow-Matter)"');
    expect(node(g, false)).toContain(`stroke="${LENS_COLOR}"`);
    expect(node(g, false)).not.toContain("grounding:");
  });

  it("on, the stroke is the grade's and the head follows the shaft", () => {
    const g: Grounding = { grade: "chain", reference: "StakingV2.sol:314" };
    const out = edge(g, true);
    expect(out).not.toContain(`stroke="${LENS_COLOR}"`);
    expect(out).toContain(`stroke="${groundingStroke(g).color}"`);
    expect(out).toContain('marker-end="url(#arrow-grounding)"');
    expect(node(g, true)).toContain("grounding: chain · StakingV2.sol:314");
  });

  it("on, an ungraded element fades and an unknown one is hollow and dashed", () => {
    expect(groundingStroke(undefined).opacity).toBeLessThan(0.5);
    expect(edge(undefined, true)).toContain('stroke-opacity="0.35"');
    const hole = groundingStroke({ grade: "unknown" });
    expect(hole.dash).toBeDefined();
    expect(node({ grade: "unknown" }, true)).toContain(`stroke-dasharray="${hole.dash}"`);
    expect(node(undefined, true)).toContain("grounding: ungraded");
  });

  it("every grade has its own ink, ordered weakest first", () => {
    const colors = GROUNDING_GRADES.map((grade) => groundingStroke({ grade }).color);
    expect(new Set(colors).size).toBe(GROUNDING_GRADES.length);
    expect(GROUNDING_GRADES[0]).toBe("unknown");
    expect(GROUNDING_GRADES[GROUNDING_GRADES.length - 1]).toBe("chain");
  });

  it("reads back as `grade · reference`, or the grade alone", () => {
    expect(groundingLine({ grade: "observed", reference: "GET /models 2026-09-17" })).toBe("observed · GET /models 2026-09-17");
    expect(groundingLine({ grade: "asserted" })).toBe("asserted");
    expect(groundingLine(undefined)).toBeNull();
  });

  it("the legend carries the model's own census", () => {
    const things = [
      { id: 1, x: 0, y: 0, name: "a", role: "Component" as const, grounding: { grade: "chain" as const } },
      { id: 2, x: 0, y: 0, name: "b", role: "Environment" as const },
    ];
    const relations = [
      { id: 3, a: 1, b: 2, name: "f", is_bond: true, kind: "Matter" as const, klir_directed: false, grounding: { grade: "chain" as const } },
    ];
    const census = gradeCensus(things, relations);
    expect(census.chain).toBe(2);
    expect(census.ungraded).toBe(1);
    const out = renderToStaticMarkup(<GroundingLegend things={things} relations={relations} />);
    expect(out).toContain("data-grounding-legend");
    for (const grade of GROUNDING_GRADES) expect(out).toContain(`>${grade}<`);
  });
});
