// The port capsule's sizing rule. The capsule carries the direction chevron —
// the only mark saying which way a flow crosses the membrane — and it measured
// 4.6-5.6 SCREEN px at the Fed model's own fit zoom. The channel was correct
// and unreadable.
//
// Three regimes, and the test's job is that none of them runs away:
//   proportionate (zoomed in)  the world base wins
//   floored       (mid range)  holds a constant screen size so the chevron reads
//   capped        (far out)    never wider than a fraction of the node
import { describe, expect, it } from "vitest";
import { portHalfWidth, portHitRadius, NODE_R } from "./geometry";

const screenWidth = (scale: number) => 2 * portHalfWidth(scale) * scale;
const nodeScreenDiameter = (scale: number) => 2 * NODE_R * scale;

describe("portHalfWidth", () => {
  it("is proportionate when zoomed in — the drawing scales, the port scales with it", () => {
    expect(portHalfWidth(1)).toBe(portHalfWidth(2));
    expect(portHalfWidth(2)).toBe(portHalfWidth(6));
    // ...so on screen it grows exactly as the node does.
    expect(screenWidth(2) / nodeScreenDiameter(2)).toBeCloseTo(
      screenWidth(1) / nodeScreenDiameter(1),
    );
  });

  it("holds a constant screen size in the band where the floor governs", () => {
    // The floor governs between roughly 0.72 and 0.93; below that the node-size
    // cap binds first. Asserted as a band rather than a single number so the
    // regimes stay legible if NODE_R changes register.
    expect(screenWidth(0.8)).toBeCloseTo(screenWidth(0.9), 5);
    expect(portHalfWidth(0.8)).toBeGreaterThan(portHalfWidth(1));
  });

  it("is the CAP, not the floor, that governs at a typical fitted zoom", () => {
    // Worth pinning because it is counter-intuitive and it bounds the whole
    // approach: the shipped register has NODE_R 24, so the cap (18 world) binds
    // below scale ~0.72 — and a fitted model sits near 0.54. The capsule
    // therefore gains about 1.5x over the old fixed 12, not the 2x the screen
    // floor alone would suggest. A boundary notch cannot outgrow its node, so
    // per-flow direction has to carry the rest.
    expect(portHalfWidth(0.54)).toBe(NODE_R * 0.75);
    expect(portHalfWidth(0.54)).toBeGreaterThan(12);
    expect(portHalfWidth(0.54) / 12).toBeLessThan(2);
  });

  it("never grows wider than three quarters of the node it sits on", () => {
    // Without the cap the floor keeps inflating all the way to ZOOM_MIN (0.15),
    // where 13 screen px of half-width is 87 world px — a notch two and a half
    // times wider than the whole component. The floor buys legibility; it does
    // not get to eat the drawing to buy it.
    for (const scale of [0.15, 0.2, 0.25, 0.4, 0.5, 0.55, 1, 2, 6]) {
      expect(screenWidth(scale) / nodeScreenDiameter(scale)).toBeLessThanOrEqual(0.751);
    }
    expect(portHalfWidth(0.15)).toBe(portHalfWidth(0.25));
  });

  it("never inverts — a wider view never yields a smaller world capsule", () => {
    let prev = portHalfWidth(6);
    for (const scale of [3, 2, 1, 0.75, 0.55, 0.4, 0.25, 0.15]) {
      const cur = portHalfWidth(scale);
      expect(cur).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });

  it("survives a degenerate scale rather than dividing by zero", () => {
    expect(Number.isFinite(portHalfWidth(0))).toBe(true);
    expect(portHalfWidth(0)).toBe(portHalfWidth(0.15));
  });
});

describe("portHitRadius", () => {
  it("always clears the drawn capsule, at every zoom", () => {
    // The target is derived from the drawn half-width precisely so it cannot
    // drift; assert the relationship rather than a number.
    for (const scale of [0.15, 0.4, 0.55, 1, 3]) {
      expect(portHitRadius(scale)).toBeGreaterThan(portHalfWidth(scale));
    }
  });
});
