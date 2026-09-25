import { describe, expect, it } from "vitest";
import { NARROW_BREAKPOINT, NARROW_QUERY, secondaryOf } from "./narrow";

describe("#427 the narrow frame", () => {
  it("breaks at 900px, as ruled", () => {
    expect(NARROW_BREAKPOINT).toBe(900);
    expect(NARROW_QUERY).toBe("(max-width: 899px)");
  });
  it("names each mode's secondary pane for the toggle", () => {
    expect(secondaryOf("build")).toBe("Element");
    expect(secondaryOf("write")).toBe("Margin");
    expect(secondaryOf("read")).toBe("Diagram");
  });
});
