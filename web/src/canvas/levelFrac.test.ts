import { describe, expect, it } from "vitest";
import { atFrame, exactAtFrame, frameCount, frameOf, levelFrac } from "./types";

// 2026-11-02 walk: a stock that sat at 0 all run drew half full, so rewinding
// looked like it never reset. The fill now measures from zero.
describe("levelFrac", () => {
  it("draws a stock that stays empty as empty, not half full", () => {
    expect(levelFrac([0, 0, 0], 0)).toBe(0);
  });
  it("draws a constant nonzero level as full: it is at its run's extreme", () => {
    expect(levelFrac([1, 1, 1], 1)).toBe(1);
  });
  it("measures a filling stock from zero, so tick 0 of a stock starting at 0 is empty", () => {
    const s = [0, 5, 10];
    expect(levelFrac(s, s[0])).toBe(0);
    expect(levelFrac(s, s[1])).toBe(0.5);
    expect(levelFrac(s, s[2])).toBe(1);
  });
  it("does not start at empty when the stock never drops to zero", () => {
    // A stock between 8 and 10 reads high, as the zero-based chart shows it.
    expect(levelFrac([8, 9, 10], 8)).toBeCloseTo(0.8);
  });
});

// 2026-11-03 walk: a run of N steps has N + 1 instants. A level has a value at
// each, the first before anything moved; a flow has one per step, shown at the
// instant its step ended.
describe("frames", () => {
  const level = [0, 5, 9]; // two steps: the start, then after each
  const flow = [10, 10]; // what moved in each step
  it("counts the start as a frame", () => {
    expect(frameCount(2)).toBe(3);
  });
  it("reads a level at its instant, the start included", () => {
    expect([0, 1, 2].map((k) => atFrame(level, k, false))).toEqual([0, 5, 9]);
  });
  it("shows no flow at the start, then the step that ended at each frame", () => {
    expect([0, 1, 2].map((k) => atFrame(flow, k, true))).toEqual([null, 10, 10]);
  });
  it("holds the last value when scrubbed past the end, but a chart row there is empty", () => {
    expect(atFrame(level, 7, false)).toBe(9);
    expect(exactAtFrame(level, 7, false)).toBeNull();
  });
  it("places a step's value at the instant it ended", () => {
    expect(frameOf(0, true)).toBe(1);
    expect(frameOf(0, false)).toBe(0);
  });
});
