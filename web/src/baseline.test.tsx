// The kept baseline (#463 move 4): every live series gets a dashed twin and
// the glance says "vs baseline". The merge is pure and pinned; the glance is
// rendered to static markup (charts need a measured container and are not
// asserted here).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BASE, RunGlance, withBaselineRows } from "./RunPanel";
import type { CanvasModel, RunResultRich } from "./kernel/types";

const run = (tub: number[]): RunResultRich => ({
  ticks: tub.length,
  dt: 1,
  residual: 0,
  conserved: true,
  levels: [
    { name: "Drain", unit: "", unit_derived: false, value: 9, category: "product" },
    { name: "Tub", unit: "L", unit_derived: false, value: tub[tub.length - 1], category: "internal" },
  ],
  comparisons: [],
  trajectories: [{ name: "Tub", unit: "L", unit_derived: false, series: tub }],
  flows: [],
});

describe("the kept baseline", () => {
  it("rides each row as a b_<name> twin and leaves rows alone without one", () => {
    const rows = [{ t: 0, Tub: 3 }, { t: 1, Tub: 6 }, { t: 2, Tub: 9 }];
    expect(withBaselineRows(rows, null)).toBe(rows);
    const merged = withBaselineRows(rows, [{ name: "Tub", series: [3, 5] }]);
    expect(merged.map((r) => r[BASE("Tub")])).toEqual([3, 5, null]);
    expect(merged.map((r) => r.Tub)).toEqual([3, 6, 9]);
  });

  it("the glance reads the stock against the baseline, and says nothing when equal", () => {
    const model = { lens: "Mobus", things: [], relations: [], boundary: { porosity: 0, perceptive_fuzziness: 0 } } as unknown as CanvasModel;
    const live = run([3, 6, 9, 12]);
    const html = renderToStaticMarkup(<RunGlance result={live} model={model} baseline={run([3, 5, 7, 9])} />);
    expect(html).toContain("vs 9");
    const same = renderToStaticMarkup(<RunGlance result={live} model={model} baseline={run([3, 6, 9, 12])} />);
    expect(same).not.toContain("vs ");
  });
});
