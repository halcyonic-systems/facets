// Pure formatting/windowing helpers for the run panel. No React, no wasm, no
// systems logic — every number here comes from the kernel; these only relabel
// and window it so the face can render it without misreading.

/** A unit for display: the declared unit, or an explicit "abstract units"
 *  disclosure when the model carries none — so a unitless magnitude is never
 *  rendered bare, where it could read as a count. */
export function unitLabel(unit: string): { text: string; abstract: boolean } {
  const u = unit.trim();
  return u ? { text: u, abstract: false } : { text: "abstract units", abstract: true };
}

/** Last index where both series are defined — the in-sample endpoint. Null if
 *  either series is empty. */
export function horizonOf(c: { simulated: number[]; actual: number[] }): number | null {
  const k = Math.min(c.simulated.length, c.actual.length);
  return k > 0 ? k - 1 : null;
}

/** In-sample % divergence at the horizon. Mirrors Comparison::divergence_pct
 *  (tether.rs) exactly — |s−a|/|a|·100, absolute-×100 fallback when |a|<1e-9 —
 *  but evaluated at the last COMMONLY-DEFINED point, not each series' own last.
 *  The kernel's field compares sim.last() vs actual.last(), so on a run longer
 *  than the data it measures a forecast endpoint against the data endpoint. This
 *  windows the same series with the same formula; the kernel-home fix is a
 *  follow-up issue. Null if either series is empty. */
export function inSampleDivergencePct(c: { simulated: number[]; actual: number[] }): number | null {
  const k = horizonOf(c);
  if (k == null) return null;
  const s = c.simulated[k];
  const a = c.actual[k];
  if (Math.abs(a) < 1e-9) return Math.abs(s - a) * 100;
  return (Math.abs(s - a) / Math.abs(a)) * 100;
}
