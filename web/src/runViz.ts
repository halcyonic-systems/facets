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
