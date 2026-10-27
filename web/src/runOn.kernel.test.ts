// Run on (one-surface.md) through the real wasm: the Model surface's live run
// is the held bench stepped past the run length, and a knob turned while it
// runs lands at that tick with the stocks kept. Pinned here so the face's
// running on never claims more than the engine does.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync } from "facets-kernel";
import { Bench, compileSl, project } from "./kernel";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../crates/facets-kernel/pkg/facets_kernel_bg.wasm")),
});

const TANKS = fs.readFileSync(path.resolve(__dirname, "../../assets/bench/two-tanks.sl"), "utf8");

function open(): Bench {
  const out = compileSl(TANKS);
  if ("errors" in out) throw new Error(JSON.stringify(out.errors));
  return Bench.openUnforced(JSON.stringify(project(out.ok)), 1);
}

const upper = (b: Bench) => b.readout().trajectories.find((s) => s.name === "Upper Tank")!.series;

describe("running on", () => {
  it("steps the held run past its run length, one tick at a time", () => {
    const b = open();
    b.stepOver(12);
    const at12 = b.readout().ticks;
    for (let i = 0; i < 30; i++) b.step(1);
    expect(b.readout().ticks).toBe(at12 + 30);
    b.free();
  });

  it("takes a knob at the current tick: the past is untouched, the future answers", () => {
    const plain = open();
    plain.stepOver(40);
    const without = upper(plain);

    const live = open();
    live.stepOver(12);
    for (let i = 0; i < 8; i++) live.step(1);
    const k = live.readout().ticks;
    live.setFlowAmount("water", "Mains", "Tap", 20); // double the tap mid-run
    while (live.readout().ticks < without.length) live.step(1);
    const withKnob = upper(live);

    expect(withKnob.slice(0, k)).toEqual(without.slice(0, k));
    expect(withKnob[withKnob.length - 1]).toBeGreaterThan(without[without.length - 1]);
    // The edit log stamps the tick it landed on, not tick zero.
    expect(live.edits().length).toBe(1);
    expect(live.edits()[0].value).toBe(20);
    expect([k - 1, k]).toContain(live.edits()[0].tick);
    plain.free();
    live.free();
  });
});
