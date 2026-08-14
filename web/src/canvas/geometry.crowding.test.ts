// #335: the label-crowding clustering. Pure box math — the DOM measurement that
// feeds it lives in Canvas (jsdom has no getBBox), so this is where the rule
// itself is pinned.
import { describe, expect, it } from "vitest";
import { crowdedLabelIds, type LabelBox } from "./geometry";

const box = (id: number, x: number, y: number, w = 80, h = 12): LabelBox => ({ id, x, y, w, h });

describe("crowdedLabelIds", () => {
  it("reports nothing when labels are clear of each other", () => {
    expect(crowdedLabelIds([box(1, 0, 0), box(2, 500, 0), box(3, 0, 500)]).size).toBe(0);
  });

  it("reports BOTH members of an overlapping pair, never a winner", () => {
    // Keeping one of a pair would re-collide the moment its neighbour is
    // hovered back in — the cluster has to go quiet together.
    const out = crowdedLabelIds([box(1, 0, 0), box(2, 40, 0)]);
    expect([...out].sort()).toEqual([1, 2]);
  });

  it("pulls a whole chain in, even where the ends do not touch", () => {
    // 1 overlaps 2, 2 overlaps 3, but 1 and 3 are 160px apart and clear. All
    // three are still unreadable as drawn, because 2 sits across both.
    const out = crowdedLabelIds([box(1, 0, 0), box(2, 70, 0), box(3, 140, 0)]);
    expect([...out].sort()).toEqual([1, 2, 3]);
    expect(crowdedLabelIds([box(1, 0, 0), box(3, 160, 0)]).size).toBe(0);
  });

  it("separates on the y axis, not just x — sibling labels stack vertically", () => {
    expect(crowdedLabelIds([box(1, 0, 0), box(2, 0, 40)]).size).toBe(0);
    expect([...crowdedLabelIds([box(1, 0, 0), box(2, 0, 6)])].sort()).toEqual([1, 2]);
  });

  it("takes INTERSECTION as the rule — touching boxes do not collide", () => {
    // No slack term. A text box already spans the em box plus side bearing, so
    // the whitespace a pad would buy is inside the measurement; adding one made
    // the rule fire on boxes that do not overlap. Edge-to-edge is clear, one px
    // of overlap is not.
    expect(crowdedLabelIds([box(1, 0, 0), box(2, 80, 0)]).size).toBe(0);
    expect(crowdedLabelIds([box(1, 0, 0), box(2, 79, 0)]).size).toBe(2);
    // The case that motivated it: adjacent horizontally, offset vertically,
    // zero shared area — federal-reserve.sl's `policy directive` /
    // `reserves minted`, which the pad quieted and intersection does not.
    expect(crowdedLabelIds([box(1, 0, 0), box(2, 80, 5)]).size).toBe(0);
  });

  it("makes the flow label yield to a node NAME, never the other way", () => {
    // A name has no hover gesture to give it back, so it never quiets — but it
    // still pushes the edge label that lands on it into the quiet set.
    const name = { ...box(9, 40, 0), fixed: true };
    expect([...crowdedLabelIds([box(1, 0, 0), name])]).toEqual([1]);
  });

  it("never quiets two node names that collide with each other", () => {
    // Nothing here can yield, so the pass reports nothing — overlapping names
    // are a layout problem this rule deliberately does not claim to fix.
    const a = { ...box(8, 0, 0), fixed: true };
    const b = { ...box(9, 40, 0), fixed: true };
    expect(crowdedLabelIds([a, b]).size).toBe(0);
  });

  it("is order-independent and stable for a lone label", () => {
    const a = [box(1, 0, 0), box(2, 40, 0), box(3, 900, 0)];
    expect([...crowdedLabelIds(a)].sort()).toEqual([...crowdedLabelIds([...a].reverse())].sort());
    expect(crowdedLabelIds([box(7, 0, 0)]).size).toBe(0);
    expect(crowdedLabelIds([]).size).toBe(0);
  });
});
