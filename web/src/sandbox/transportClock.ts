// The sandbox transport clock, as a pure accumulator — the desktop shell's
// loop (`app.rs`: whole steps per frame from elapsed wall time) with the
// state made explicit so it is testable without a DOM or a frame source.
//
// The driver (useSandboxSession) feeds it frame timestamps; it answers how
// many WHOLE ticks to step, carrying the fraction. A null `last` means the
// clock has no baseline (just started, or the tab was hidden): that frame
// establishes "now" and steps nothing, so a background tab resumes instead of
// fast-forwarding a burst.

export interface TransportClock {
  /** Fractional ticks accumulated but not yet stepped. */
  carry: number;
  /** Last frame's timestamp (ms), or null when the baseline is gone. */
  last: number | null;
}

export function freshClock(): TransportClock {
  return { carry: 0, last: null };
}

/** Drop the baseline (tab hidden / transport paused): the next frame
 *  re-anchors at its own "now" and steps nothing. */
export function dropBaseline(clock: TransportClock): void {
  clock.last = null;
}

/** Advance to frame time `now` (ms) at `ticksPerSec`; returns the whole ticks
 *  to step this frame. Mutates the clock's carry/baseline. */
export function advance(clock: TransportClock, now: number, ticksPerSec: number): number {
  if (clock.last === null) {
    clock.last = now;
    return 0;
  }
  clock.carry += ((now - clock.last) / 1000) * ticksPerSec;
  clock.last = now;
  const whole = Math.floor(clock.carry);
  if (whole > 0) clock.carry -= whole;
  return whole;
}
