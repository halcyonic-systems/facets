import { describe, expect, it } from "vitest";
import {
  ENTER_FRACTION,
  ENTER_RESET_FRACTION,
  EXIT_FRACTION,
  EXIT_RESET_FRACTION,
  wantsEnter,
  wantsExit,
} from "./seamCrossing";

const MIN = 800;

/** Run a sweep of readings through one decision, returning how many times it
 *  fired — the only number that matters, since a second fire is a second walk
 *  segment nobody asked for. */
function sweep(
  decide: (v: number, minView: number, latched: boolean) => { fire: boolean; latched: boolean },
  values: number[],
  latched: boolean,
): { fires: number; latched: boolean } {
  let fires = 0;
  for (const v of values) {
    const next = decide(v, MIN, latched);
    if (next.fire) fires += 1;
    latched = next.latched;
  }
  return { fires, latched };
}

describe("wantsEnter", () => {
  it("fires once as the aperture takes the view, not on every frame past it", () => {
    const past = MIN * ENTER_FRACTION;
    const { fires, latched } = sweep(wantsEnter, [0.5 * MIN, 0.8 * MIN, past, past + 40, past + 90], false);
    expect(fires).toBe(1);
    expect(latched).toBe(true);
  });

  it("stays silent below the threshold", () => {
    expect(sweep(wantsEnter, [100, 300, MIN * ENTER_FRACTION - 1], false).fires).toBe(0);
  });

  it("re-arms only after the aperture shrinks clear of the reset line", () => {
    let latched = wantsEnter(MIN * ENTER_FRACTION, MIN, false).latched;
    // Still large: a wobble back over the fire line must not fire again.
    latched = sweep(wantsEnter, [MIN * 0.7, MIN * ENTER_FRACTION + 10], latched).latched;
    expect(latched).toBe(true);
    // Now well below the reset line, and the next approach fires.
    latched = wantsEnter(MIN * ENTER_RESET_FRACTION - 1, MIN, latched).latched;
    expect(latched).toBe(false);
    expect(wantsEnter(MIN * ENTER_FRACTION, MIN, latched).fire).toBe(true);
  });

  it("does not re-enter on the fit that follows a swap", () => {
    // A model change re-arms the latch as already fired; the first reading of
    // the new frame is a fit, which cannot fire however large it lands.
    const atFit = MIN * 0.9;
    expect(wantsEnter(atFit, MIN, true).fire).toBe(false);
  });

  it("reads nothing before the stage is measured", () => {
    expect(wantsEnter(400, 0, false)).toEqual({ fire: false, latched: false });
  });
});

describe("wantsExit", () => {
  it("fires once as the model recedes", () => {
    const past = MIN * EXIT_FRACTION;
    const { fires, latched } = sweep(wantsExit, [MIN, MIN * 0.6, past - 1, past - 60, 20], false);
    expect(fires).toBe(1);
    expect(latched).toBe(true);
  });

  it("stays silent while the model still fills its share of the view", () => {
    expect(sweep(wantsExit, [MIN, MIN * 0.8, MIN * EXIT_FRACTION + 1], false).fires).toBe(0);
  });

  it("re-arms only after the model grows back clear of the reset line", () => {
    let latched = wantsExit(MIN * EXIT_FRACTION - 1, MIN, false).latched;
    latched = sweep(wantsExit, [MIN * 0.4, 10], latched).latched;
    expect(latched).toBe(true);
    latched = wantsExit(MIN * EXIT_RESET_FRACTION + 1, MIN, latched).latched;
    expect(latched).toBe(false);
    expect(wantsExit(MIN * EXIT_FRACTION - 1, MIN, latched).fire).toBe(true);
  });

  it("does not rise again on the fit that follows a rise", () => {
    expect(wantsExit(MIN * 0.2, MIN, true).fire).toBe(false);
  });

  it("reads nothing before the stage is measured", () => {
    expect(wantsExit(10, 0, false)).toEqual({ fire: false, latched: false });
  });
});
