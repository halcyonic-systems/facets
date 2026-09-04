// Zoom crosses the decomposition seam (#139 M1). An aperture opened in place
// stops being a detail and becomes the view; past that point the honest next
// move is the walk the app already owns — enter the child as its own document,
// with its breadcrumb, its autosave and its dive. The mirror holds going out: a
// model drawn small in a viewport it no longer fills is a child you have
// already stepped back from, so the rise fires. Nothing here decides a systems
// fact. The hierarchy is the language's (`decomposes @id`); this only reads how
// big a thing lands and asks whether the gesture has left one frame for another.
//
// The arithmetic is trivial and the LATCH is the whole problem, which is why
// both decisions are pure and live here. A swap answers the gesture by
// replacing the model at fit scale, and a fit is itself well past a threshold —
// without memory the arrival re-fires immediately and the walk runs away down
// (or up) the tree. So a fired latch is released only by crossing back clear of
// a second, slacker line, and the gap between the two is the distance a single
// continuing gesture cannot cover. A model change re-arms every latch as ALREADY
// FIRED: the new frame has to be read from the other side before it can fire.

/** Diameter, as a fraction of the smaller viewport side, at which an open
 *  aperture has taken the view and the walk enters its child. */
export const ENTER_FRACTION = 0.85;
/** …and where that latch releases. */
export const ENTER_RESET_FRACTION = 0.6;
/** Drawn extent, same fraction, below which the current model has receded far
 *  enough that the walk rises to its parent. */
export const EXIT_FRACTION = 0.33;
/** …and where that latch releases. */
export const EXIT_RESET_FRACTION = 0.5;

export interface SeamDecision {
  /** Cross the seam now — once per latch. */
  fire: boolean;
  /** The latch state to carry into the next reading. */
  latched: boolean;
}

/** Should zooming IN hand off to the walk? `diameterPx` is the aperture's
 *  screen diameter, `minView` the smaller side of the viewport. */
export function wantsEnter(diameterPx: number, minView: number, latched: boolean): SeamDecision {
  if (minView <= 0) return { fire: false, latched };
  if (latched) return { fire: false, latched: diameterPx >= minView * ENTER_RESET_FRACTION };
  if (diameterPx >= minView * ENTER_FRACTION) return { fire: true, latched: true };
  return { fire: false, latched: false };
}

/** Should zooming OUT hand off to the walk? `extentPx` is the drawn model's
 *  longer side in screen pixels. */
export function wantsExit(extentPx: number, minView: number, latched: boolean): SeamDecision {
  if (minView <= 0) return { fire: false, latched };
  if (latched) return { fire: false, latched: extentPx <= minView * EXIT_RESET_FRACTION };
  if (extentPx < minView * EXIT_FRACTION) return { fire: true, latched: true };
  return { fire: false, latched: false };
}
