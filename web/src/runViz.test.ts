import { describe, it, expect } from "vitest";

import { unitLabel } from "./runViz";

describe("unitLabel", () => {
  it("discloses abstract units when none is declared", () => {
    expect(unitLabel("")).toEqual({ text: "abstract units", abstract: true });
    expect(unitLabel("   ")).toEqual({ text: "abstract units", abstract: true });
  });

  it("passes a declared unit through", () => {
    expect(unitLabel("tok/mo")).toEqual({ text: "tok/mo", abstract: false });
  });
});
