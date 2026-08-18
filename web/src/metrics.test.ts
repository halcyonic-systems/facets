// The #203 evaluator: pure arithmetic over recorder-executed series, with
// every unresolvable declaration surfacing as a stated failure. Fixtures are
// minimal by design — the evaluator reads names, ids, and series only.
import { describe, expect, it } from "vitest";
import { evaluateMetrics } from "./metrics";
import type { CanvasModel, FlowSeries, RunResultRich } from "./kernel/types";

const thing = (id: number, name: string) => ({ id, name }) as CanvasModel["things"][number];
const rel = (id: number, a: number, b: number, name = "") =>
  ({ id, a, b, name, is_bond: true, kind: "Energy" }) as CanvasModel["relations"][number];
const flow = (from: string, to: string, series: number[], unit = "Gtok/day", name = ""): FlowSeries => ({
  name,
  from,
  to,
  unit,
  series,
});

const model = (metrics: CanvasModel["metrics"]): CanvasModel =>
  ({
    lens: "Mobus",
    things: [thing(1, "Clearing"), thing(2, "North"), thing(3, "South"), thing(4, "Served")],
    relations: [rel(10, 1, 2), rel(11, 1, 3), rel(12, 2, 4), rel(13, 3, 4)],
    boundary: { porosity: 0, perceptive_fuzziness: 0 },
    system_type: {},
    metrics,
  }) as unknown as CanvasModel;

const run = (flows: FlowSeries[], dt = 1): RunResultRich =>
  ({ ticks: 3, dt, residual: 0, conserved: true, levels: [], comparisons: [], trajectories: [], flows }) as RunResultRich;

describe("share of flow", () => {
  it("divides the anchored flow by everything leaving its source, per tick", () => {
    const m = model([{ name: "North share", expr: { ShareOfFlow: { relation: 10 } } }]);
    const r = run([flow("Clearing", "North", [1, 3, 2]), flow("Clearing", "South", [3, 1, 2])]);
    const { readings, failures } = evaluateMetrics(m, r);
    expect(failures).toEqual([]);
    expect(readings[0].series).toEqual([0.25, 0.75, 0.5]);
    expect(readings[0].endpoint).toBe(0.5);
    expect(readings[0].unit).toBe("");
  });

  it("reads 0, not NaN, on a tick when nothing left the source", () => {
    const m = model([{ name: "North share", expr: { ShareOfFlow: { relation: 10 } } }]);
    const r = run([flow("Clearing", "North", [0, 1]), flow("Clearing", "South", [0, 1])]);
    expect(evaluateMetrics(m, r).readings[0].series[0]).toBe(0);
  });

  it("fails stated, never silently, when the run recorded no such flow", () => {
    const m = model([{ name: "North share", expr: { ShareOfFlow: { relation: 10 } } }]);
    const { readings, failures } = evaluateMetrics(m, run([flow("Clearing", "South", [1])]));
    expect(readings).toEqual([]);
    expect(failures[0].reason).toContain("no flow Clearing → North");
  });
});

describe("sum into", () => {
  it("charts the RUNNING total (per-tick × Δt, accumulated); the endpoint is its last point", () => {
    const m = model([{ name: "Tokens served", expr: { SumInto: { thing: 4 } } }]);
    const r = run([flow("North", "Served", [1, 2, 3]), flow("South", "Served", [4, 5, 6])], 0.5);
    const { readings, failures } = evaluateMetrics(m, r);
    expect(failures).toEqual([]);
    // per tick: 5, 7, 9 → running total × Δt=0.5: 2.5, 6, 10.5 — the curve
    // rises to the headline instead of drawing a flat rate line (2026-08-16).
    expect(readings[0].series).toEqual([2.5, 6, 10.5]);
    expect(readings[0].endpoint).toBe(21 * 0.5);
    expect(readings[0].unit).toBe("Gtok/day");
  });

  it("refuses mixed units — their sum names no quantity", () => {
    const m = model([{ name: "Tokens served", expr: { SumInto: { thing: 4 } } }]);
    const r = run([flow("North", "Served", [1], "Gtok/day"), flow("South", "Served", [1], "kW")]);
    expect(evaluateMetrics(m, r).failures[0].reason).toContain("mixed units");
  });
});

describe("the leaderboard ordering", () => {
  it("orders a same-verb family by endpoint descending — the ranking view", () => {
    const m = model([
      { name: "North intake", expr: { SumInto: { thing: 2 } } },
      { name: "South intake", expr: { SumInto: { thing: 3 } } },
    ]);
    const r = run([flow("Clearing", "North", [1, 1]), flow("Clearing", "South", [5, 5])]);
    const names = evaluateMetrics(m, r).readings.map((x) => x.name);
    expect(names).toEqual(["South intake", "North intake"]);
  });
});
