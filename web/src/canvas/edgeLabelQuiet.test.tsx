// #335 detail-on-demand: the scaffold contract that the rest of the feature is
// built on. Canvas measures `[data-edge-label]` boxes to decide crowding and
// exportDiagram forces those same groups back to full strength, so BOTH depend
// on the tag being present and on quieting being done with opacity rather than
// by unmounting. Pure render, no jsdom — this suite's convention (see
// canvasFlowlessPort.test.tsx).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EdgeScaffold } from "./lenses/common";

const render = (over: { crowded?: boolean; selected?: boolean } = {}) =>
  renderToStaticMarkup(
    <EdgeScaffold
      labelAt={{ x: 100, y: 100 }}
      style={{ color: "var(--text-secondary)", width: 1, opacity: 1 }}
      interior={null}
      visible={[{ d: "M 0 0 L 200 0", markered: true }]}
      selected={over.selected ?? false}
      driven={false}
      relationId={7}
      label={<text>securities sold</text>}
      crowded={over.crowded ?? false}
    />,
  );

describe("#335 the edge label goes quiet, it does not disappear", () => {
  it("tags the label group so Canvas can measure it and export can restore it", () => {
    expect(render()).toContain('data-edge-label="7"');
    expect(render({ crowded: true })).toContain('data-edge-label="7"');
  });

  it("leaves an uncrowded label completely alone", () => {
    const out = render();
    expect(out).toContain("securities sold");
    expect(out).not.toContain('opacity="0"');
  });

  it("quiets a crowded label with OPACITY, keeping the text in the DOM", () => {
    // Unmounting would erase the very box that proves the collision: Canvas
    // would measure it as uncrowded, bring it back, collide again, and flicker
    // forever. Opacity keeps the geometry fixed, so the measurement settles.
    const out = render({ crowded: true });
    expect(out).toContain("securities sold");
    expect(out).toContain('opacity="0"');
  });

  it("a SELECTED edge keeps its label however crowded it is", () => {
    // Selection is the reader asking for exactly this edge — the one label they
    // want is the one that must never be the one withheld.
    const out = render({ crowded: true, selected: true });
    expect(out).toContain("securities sold");
    expect(out).not.toContain('opacity="0"');
  });
});
