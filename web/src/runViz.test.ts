import { describe, it, expect } from "vitest";

import { horizonOf, unitLabel } from "./runViz";

describe("unitLabel", () => {
  it("discloses abstract units when none is declared", () => {
    expect(unitLabel("")).toEqual({ text: "no unit declared", abstract: true });
    expect(unitLabel("   ")).toEqual({ text: "no unit declared", abstract: true });
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
