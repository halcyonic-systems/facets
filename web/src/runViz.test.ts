import { describe, it, expect } from "vitest";

import { horizonOf, inSampleDivergencePct, unitLabel } from "./runViz";

describe("unitLabel", () => {
  it("discloses abstract units when none is declared", () => {
    expect(unitLabel("")).toEqual({ text: "abstract units", abstract: true });
    expect(unitLabel("   ")).toEqual({ text: "abstract units", abstract: true });
  });

  it("passes a declared unit through", () => {
    expect(unitLabel("tok/mo")).toEqual({ text: "tok/mo", abstract: false });
  });
});

describe("horizonOf", () => {
  it("takes the shorter series' last index", () => {
    expect(horizonOf({ simulated: [1, 2, 3, 4, 5], actual: [1, 2, 3] })).toBe(2);
  });

  it("is the shared last index when equal length", () => {
    expect(horizonOf({ simulated: [1, 2, 3], actual: [4, 5, 6] })).toBe(2);
  });

  it("is null when either series is empty", () => {
    expect(horizonOf({ simulated: [], actual: [1, 2] })).toBeNull();
    expect(horizonOf({ simulated: [1, 2], actual: [] })).toBeNull();
  });
});

describe("inSampleDivergencePct", () => {
  it("matches the Rust divergence_pct_at_horizon fixture (≈33.333)", () => {
    // tether.rs `divergence_pct_at_horizon`: equal-length series, horizon = last.
    const c = { simulated: [100, 100, 100], actual: [100, 120, 150] };
    expect(inSampleDivergencePct(c)!).toBeCloseTo(33.333, 2);
  });

  it("windows to the data endpoint, not the forecast endpoint (#34)", () => {
    // A 30-tick run against 19 observations: the horizon is index 18. The last
    // point of `simulated` (index 29) is a forecast and must not be measured.
    const actual = Array<number>(19).fill(100);
    const simulated = Array<number>(30).fill(0);
    simulated[18] = 120; // in-sample endpoint
    simulated[29] = 500; // forecast endpoint — never compared

    // In-sample: |120 − 100| / 100 = 20%.
    expect(inSampleDivergencePct({ simulated, actual })!).toBeCloseTo(20, 6);
    // Last-vs-last (the kernel field's bug) would report 400% — assert we differ.
    const lastVsLast = (Math.abs(500 - 100) / 100) * 100;
    expect(inSampleDivergencePct({ simulated, actual })).not.toBeCloseTo(lastVsLast, 6);
  });

  it("falls back to the absolute residual when the actual endpoint is ~0", () => {
    expect(inSampleDivergencePct({ simulated: [5], actual: [0] })!).toBeCloseTo(500, 6);
  });

  it("is null when either series is empty", () => {
    expect(inSampleDivergencePct({ simulated: [], actual: [1, 2] })).toBeNull();
  });
});
