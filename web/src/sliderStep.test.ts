// Slider steps for declared ranges (#463 feel-test 2026-10-09): a release
// declared `range 0..40` drags by whole litres, not by 0.2 with a float
// tail; a narrow or fractional range keeps the fine step.
import { describe, expect, it } from "vitest";
import { sliderStep, snapToStep } from "./ParamControl";

describe("sliderStep", () => {
  it("drags whole units over a wide integer range", () => {
    expect(sliderStep(0, 40)).toBe(1);
    expect(sliderStep(0, 12000)).toBe(1);
  });
  it("keeps a fine step for narrow or fractional ranges", () => {
    expect(sliderStep(0, 10)).toBe(0.05);
    expect(sliderStep(0.5, 40.5)).toBe(0.2);
    expect(sliderStep(5, 5)).toBe(1);
  });
  it("snaps a drag to the step with no float tail", () => {
    expect(snapToStep(30.200000762939453, 1)).toBe(30);
    expect(snapToStep(30.200000762939453, 0.2)).toBe(30.2);
    expect(snapToStep(7.04, 0.05)).toBe(7.05);
  });
});
