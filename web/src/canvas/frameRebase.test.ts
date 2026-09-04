// #139 M2: the two claims that make frame rebasing a crossing rather than a
// jump — the composed view is the SAME view (so the frame it lands on is the
// frame it left), and the decision fires once per crossing however a gesture
// wanders around the line. Pure math and one bit of memory; no kernel needed.
import { describe, expect, it } from "vitest";
import {
  RB_IN,
  RB_OUT,
  rebaseIn,
  rebaseInScale,
  rebaseOut,
  rebaseOutScale,
  wantsRebaseIn,
  wantsRebaseOut,
  type View,
} from "./frameRebase";
import { applyEmbed, compose, type Embed } from "./embed";

const view = (scale: number, x = 0, y = 0): View => ({ scale, pan: { x, y } });
const screen = (v: View, p: { x: number; y: number }) => ({
  x: v.pan.x + p.x * v.scale,
  y: v.pan.y + p.y * v.scale,
});

const e: Embed = { s: 0.07, tx: 310, ty: -42 };

describe("rebaseIn", () => {
  it("draws the child exactly where the aperture had it", () => {
    const v = view(3.5, 120, -60);
    const rebased = rebaseIn(v, e);
    for (const p of [
      { x: 0, y: 0 },
      { x: 400, y: 220 },
      { x: -180, y: 95 },
    ]) {
      const through = screen(v, applyEmbed(e, p));
      const direct = screen(rebased, p);
      expect(direct.x).toBeCloseTo(through.x, 9);
      expect(direct.y).toBeCloseTo(through.y, 9);
    }
  });

  it("is inverted by rebaseOut", () => {
    const v = view(2.2, -30, 400);
    const back = rebaseOut(rebaseIn(v, e), e);
    expect(back.scale).toBeCloseTo(v.scale, 9);
    expect(back.pan.x).toBeCloseTo(v.pan.x, 9);
    expect(back.pan.y).toBeCloseTo(v.pan.y, 9);
  });

  it("keeps the number in a sane band while the picture keeps growing", () => {
    // The whole point of the clamp lift: two levels of a real steel-plant-sized
    // embedding cost a factor of ~200 in raw scale and nothing after rebasing.
    const deep = compose(e, e);
    const raw = 17 * deep.s;
    expect(raw).toBeLessThan(0.1);
    expect(rebaseIn(rebaseIn(view(17), e), e).scale).toBeCloseTo(raw, 9);
    expect(rebaseIn(view(17), e).scale).toBeGreaterThan(0.5);
  });
});

describe("the rebase decision", () => {
  const MIN = 900;
  /** Read a sweep of sizes, counting crossings — a second fire is a second walk
   *  segment nobody asked for. */
  const sweep = (
    decide: (v: number, min: number, armed: boolean) => { fire: boolean; armed: boolean },
    values: number[],
    armed = false,
  ) => {
    let fires = 0;
    for (const v of values) {
      const next = decide(v, MIN, armed);
      if (next.fire) fires += 1;
      armed = next.armed;
    }
    return { fires, armed };
  };

  it("fires once as the aperture takes the stage, not on every frame past it", () => {
    const past = MIN * RB_IN;
    expect(sweep(wantsRebaseIn, [0.2 * MIN, 0.5 * MIN, past, past + 40, past + 200]).fires).toBe(1);
  });

  it("will not fire on the frame it arrives in", () => {
    // A model that appears already past the line — a fit, or the far side of a
    // crossing — must be read from the near side before it can cross again.
    expect(sweep(wantsRebaseIn, [MIN, MIN, MIN]).fires).toBe(0);
    expect(sweep(wantsRebaseOut, [1, 1, 1]).fires).toBe(0);
  });

  it("cannot oscillate: a fired decision re-arms only on the far line", () => {
    // A wheel resting on the threshold crosses it every ease frame. Demanding
    // the full retreat — a factor of more than two in scale — is what makes one
    // gesture one crossing.
    expect(RB_IN / RB_OUT).toBeGreaterThan(2);
    const wiggle = (line: number) => Array.from({ length: 40 }, (_, i) => MIN * line + (i % 2 ? 3 : -3));
    expect(sweep(wantsRebaseIn, wiggle(RB_IN), true).fires).toBe(1);
    expect(sweep(wantsRebaseOut, wiggle(RB_OUT), true).fires).toBe(1);
  });

  it("arms a frame that arrives at fit scale, so it can be left again", () => {
    // A fit lands between the two lines. Arming only at the far line would
    // strand it: too small to rebase in, too large to rebase out, forever.
    const fit = MIN * 0.8;
    expect(wantsRebaseOut(fit, MIN, false).armed).toBe(true);
    expect(wantsRebaseIn(2 * 24, MIN, false).armed).toBe(true);
  });

  it("does not arm on the far side of the crossing it just made", () => {
    // The runaway case: a rebase-out lands the parent at 0.4 of the viewport,
    // which must NOT arm another rebase-out, and a rebase-in lands its child
    // filling 0.9, which must not arm another rebase-in.
    expect(wantsRebaseOut(MIN * RB_OUT, MIN, false).armed).toBe(false);
    expect(wantsRebaseIn(MIN * RB_IN, MIN, false).armed).toBe(false);
  });

  it("rises out only once the frame is plainly small", () => {
    const { fires } = sweep(wantsRebaseOut, [0.9 * MIN, 0.6 * MIN, 0.41 * MIN, 0.3 * MIN, 0.1 * MIN]);
    expect(fires).toBe(1);
  });

  it("says nothing before the viewport is measured", () => {
    expect(wantsRebaseIn(1e6, 0, true).fire).toBe(false);
    expect(wantsRebaseOut(0, 0, true).fire).toBe(false);
  });
});

describe("where a ride is heading", () => {
  it("aims past the line the decision reads, in both directions", () => {
    const min = 900;
    expect(wantsRebaseIn(2 * 24 * rebaseInScale(min, 24), min, true).fire).toBe(true);
    expect(wantsRebaseOut(700 * rebaseOutScale(min, 700), min, true).fire).toBe(true);
  });

  it("has nowhere to go for a frame with no extent", () => {
    expect(rebaseOutScale(900, 0)).toBe(0);
  });
});
