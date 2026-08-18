// The transport clock's laws: whole ticks from wall time, fraction carried,
// no burst after a dropped baseline. This is the piece of the live loop that
// can be wrong silently (a sim that creeps or leaps), so it is pinned pure.

import { describe, expect, it } from "vitest";
import { advance, dropBaseline, freshClock } from "./transportClock";

describe("transport clock", () => {
  it("steps whole ticks and carries the fraction", () => {
    const c = freshClock();
    expect(advance(c, 0, 4)).toBe(0); // baseline frame steps nothing
    // 100ms at 4 ticks/s = 0.4 ticks — not yet a whole one.
    expect(advance(c, 100, 4)).toBe(0);
    // another 200ms → carry 1.2 → one whole tick, 0.2 carried.
    expect(advance(c, 300, 4)).toBe(1);
    expect(c.carry).toBeCloseTo(0.2);
    // long frame: 1s at 4 ticks/s plus the carry → 4 ticks, carry intact.
    expect(advance(c, 1300, 4)).toBe(4);
    expect(c.carry).toBeCloseTo(0.2);
  });

  it("a second of frames yields ticksPerSec ticks, no drift", () => {
    const c = freshClock();
    advance(c, 0, 7);
    let total = 0;
    // 60 frames of 16.67ms ≈ one second.
    for (let f = 1; f <= 60; f++) total += advance(c, f * (1000 / 60), 7);
    expect(total).toBe(7);
  });

  it("a dropped baseline resumes without a burst", () => {
    const c = freshClock();
    advance(c, 0, 4);
    advance(c, 250, 4); // 1 tick
    dropBaseline(c); // tab hidden for ten "seconds"
    expect(advance(c, 10_250, 4)).toBe(0); // re-anchor, no fast-forward
    expect(advance(c, 10_500, 4)).toBe(1); // ticking resumes at rate
  });
});
