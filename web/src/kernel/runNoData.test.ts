// Move 1 of the dynamics MVP (facets#463): a hand-authored model runs with no
// data attached, and a declared amount is a knob. Against the REAL kernel, the
// same path the Run button now takes when no CSV is bound (run_rich). What it
// pins: the run produces ticks, a stock moves, and raising the inflow amount
// raises the stock — the headless reproduction the epic asks for behind every
// number the bench shows.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync, compile_sl, project, run_rich } from "bert-lenses-kernel";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../../crates/bert-lenses-kernel/pkg/bert_lenses_kernel_bg.wasm")),
});

type Outcome = { ok: unknown } | { errors: { line: number; message: string }[] };
interface Rich {
  ticks: number;
  conserved: boolean;
  levels: { name: string; value: number }[];
  trajectories: { name: string; series: number[] }[];
}

function run(sl: string, dt = 1, t = 10): Rich {
  const out = compile_sl(sl) as Outcome;
  if ("errors" in out) throw new Error(`${out.errors[0].line}: ${out.errors[0].message}`);
  return run_rich(JSON.stringify(project(JSON.stringify(out.ok))), dt, t) as Rich;
}

const tub = (inflow: number) => `system "Bathtub" : Concrete/Physical
component Tub primitive Buffering interface stock L initial 0
source Faucet
sink Drain
flow Faucet -> Tub : matter "inflow" amount ${inflow}
flow Tub -> Drain : matter "outflow" amount 1
@lens mobus
`;

describe("a model runs from its declared amounts alone (#463 move 1)", () => {
  it("runs with no CSV and the stock moves", () => {
    const r = run(tub(3));
    expect(r.ticks).toBeGreaterThan(1);
    expect(r.conserved).toBe(true);
    const tubSeries = r.trajectories.find((s) => s.name === "Tub");
    expect(tubSeries, JSON.stringify(r.trajectories.map((s) => s.name))).toBeDefined();
    const v = tubSeries!.series;
    expect(v[v.length - 1]).toBeGreaterThan(v[0]);
    // 3 in, 1 out, ten ticks: the ledger says 21 in the tub at the end.
    expect(r.levels.find((l) => l.name === "Tub")?.value).toBe(21);
  });

  it("a declared amount is a knob: more inflow, higher stock", () => {
    const last = (inflow: number) => run(tub(inflow)).levels.find((l) => l.name === "Tub")!.value;
    expect(last(5)).toBeGreaterThan(last(3));
  });
});
