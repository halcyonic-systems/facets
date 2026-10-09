// The bench on the REAL kernel (facets#463, move 2b): the same path the Run
// button now takes. Open the reservoir from its declared amounts, step five,
// turn one knob by the names the author sees, step one: tick 6 carries the
// new amount and ticks 1..5 do not. And the tick log is there, named.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync, BenchHandle } from "bert-lenses-kernel";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../../crates/bert-lenses-kernel/pkg/bert_lenses_kernel_bg.wasm")),
});

const RESERVOIR = fs.readFileSync(path.resolve(__dirname, "../../../assets/archive/demos/reservoir-model.json"), "utf8");

interface Rich {
  ticks: number;
  flows: { name: string; from: string; to: string; series: number[] }[];
  levels: { name: string; value: number }[];
}

describe("the bench on the kernel (#463 move 2)", () => {
  it("a knob at tick 5 changes tick 6 and nothing before", () => {
    const control = BenchHandle.open_unforced(RESERVOIR, 1.0);
    control.step(6);
    const plain = control.readout() as Rich;
    const bench = BenchHandle.open_unforced(RESERVOIR, 1.0);
    bench.step(5);
    const f = plain.flows[0];
    const was = f.series[5];
    bench.set_flow_amount(f.name, f.from, f.to, 2 * was);
    bench.step(1);
    const edited = bench.readout() as Rich;
    expect(edited.flows[0].series.slice(0, 5)).toEqual(f.series.slice(0, 5));
    expect(edited.flows[0].series[5]).toBeCloseTo(2 * was, 3);
    const edits = bench.edits() as { tick: number; target: string }[];
    expect(edits[0].tick).toBe(5);
    expect(edits[0].target).toContain(f.name);
    control.free();
    bench.free();
  });

  it("step_over lands on the batch run's tick count and the log is named", () => {
    const b = BenchHandle.open_unforced(RESERVOIR, 1.0);
    b.step_over(12);
    expect(b.tick()).toBe(12);
    const log = b.tick_log_since(1) as { tick: number; nodes: { name: string }[]; wires: unknown[] }[];
    expect(log.length).toBe(12);
    expect(log[0].nodes.map((n) => n.name)).toContain("Reservoir");
    // A column-bound flow refuses; an unknown name is named back.
    expect(() => b.set_flow_amount("nope", "x", "y", 1)).toThrow(/no flow/);
    b.free();
  });
});
