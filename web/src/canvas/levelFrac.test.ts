import { describe, expect, it } from "vitest";
import { levelFrac } from "./types";

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
