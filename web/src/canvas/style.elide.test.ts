// #335: a label is an identifier, a sentence is a description. The budget and
// its edge cases, pinned — the canvas is unreadable when this drifts.
import { describe, expect, it } from "vitest";
import { EDGE_LABEL_MAX, elideEdgeLabel } from "./style";

describe("elideEdgeLabel", () => {
  it("leaves a real name untouched — a well-named flow is never decorated", () => {
    expect(elideEdgeLabel("reserves minted")).toBe("reserves minted");
    expect(elideEdgeLabel("securities")).toBe("securities");
  });

  it("elides a sentence on a word boundary", () => {
    const long = "published measurements — PCE inflation, payrolls, unemployment";
    const out = elideEdgeLabel(long);
    expect(out.length).toBeLessThanOrEqual(EDGE_LABEL_MAX + 1);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\s…$/);
  });

  it("collapses whitespace so a wrapped name measures honestly", () => {
    expect(elideEdgeLabel("  reserves   minted  ")).toBe("reserves minted");
  });

  it("cuts mid-word rather than to almost nothing when there is no late space", () => {
    const out = elideEdgeLabel("supercalifragilisticexpialidociousflow");
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeGreaterThan(EDGE_LABEL_MAX / 2);
  });

  it("is exact at the boundary — max fits, max+1 elides", () => {
    const at = "x".repeat(EDGE_LABEL_MAX);
    expect(elideEdgeLabel(at)).toBe(at);
    expect(elideEdgeLabel(at + "y").endsWith("…")).toBe(true);
  });
});
