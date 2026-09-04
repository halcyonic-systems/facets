// Re-expressing the view on a child frame (#139 M2). An aperture that has taken
// the stage is no longer a detail inside a model — it IS the model being read,
// and the honest move is to stop drawing it through its parent and start
// drawing it as the root. That is not a swap: the composite screen transform is
// unchanged, so the frame it lands on is the frame it left. Only what is
// editable and what the breadcrumb says change (#139 M3).
//
// The view is `p_screen = pan + p_world · scale` and an embed is
// `p_parent = p_child · s + (tx, ty)`, so composing them is one substitution:
//
//     p_screen = pan + (p_child · s + t) · scale
//              = (pan + t · scale) + p_child · (s · scale)
//
// which is `rebaseIn` below, and `rebaseOut` is the same identity read right to
// left. Nothing here decides a systems fact — the hierarchy is the language's
// (`decomposes @id`) and the seam's verdict is the kernel's; this is arithmetic
// on pixels plus one question about size.
//
// The two thresholds measure THE SAME NUMBER. A child's aperture diameter seen
// from its parent equals that child's drawn extent once it is the root, because
// `embedTransform` puts the child's longer half-extent exactly on the rim. So
// the band between them is a hysteresis band on one quantity rather than a
// coincidence between two, and a wheel hovering on the line cannot oscillate:
// arriving at either edge lands the far side of the other by a factor of 2.25.
//
// Each direction therefore FIRES on its own line and RE-ARMS a clear band short
// of it. A wheel resting on a single threshold would otherwise cross it with
// every ease frame, and each crossing is a walk segment nobody asked for; the
// band is what makes a fired decision stay fired. It is a quarter, not the whole
// distance to the other line: a frame that ARRIVES at fit scale — the walk's own
// door, a child opened from the inspector — sits between the two lines, and
// demanding the far line before arming would mean such a frame could never be
// zoomed out of at all.
//
// Which is the other hazard, and the reason for the bit. An arrival can land
// already past a threshold, and answering that reading would re-fire the
// crossing immediately and run the walk away down the tree. So a fresh frame is
// DISARMED and arms only once it has been read on the near side. The one
// arrival that lands below its own arming line is the far side of a rebase,
// which is exactly the case that must not re-fire.
import type { Embed } from "./embed";
import type { Pt } from "./geometry";

export interface View {
  pan: Pt;
  scale: number;
}

/** Diameter, as a fraction of the smaller viewport side, at which an open
 *  aperture has taken the stage and its child becomes the render root. */
export const RB_IN = 0.75;
/** The same quantity for the focused frame's own drawn extent, below which it
 *  is read from its parent again. */
export const RB_OUT = 0.22;
/** How far short of its firing line a decision re-arms. Wide enough that a
 *  gesture resting on the line cannot wander back across it, narrow enough that
 *  a frame arriving at fit scale is on the armed side. */
export const ARM_SLACK = 1.25;

export interface RebaseDecision {
  /** Cross now — at most once per arming. */
  fire: boolean;
  /** The bit to carry into the next reading. */
  armed: boolean;
}

function decide(fires: boolean, rearms: boolean, armed: boolean): RebaseDecision {
  if (!armed) return { fire: false, armed: rearms };
  return fires ? { fire: true, armed: false } : { fire: false, armed: true };
}

/** Should the view rebase INTO the child behind this aperture? `diameterPx` is
 *  the aperture's screen diameter, `minView` the smaller viewport side. */
export function wantsRebaseIn(diameterPx: number, minView: number, armed: boolean): RebaseDecision {
  if (minView <= 0) return { fire: false, armed };
  return decide(diameterPx >= minView * RB_IN, diameterPx <= (minView * RB_IN) / ARM_SLACK, armed);
}

/** Should the view rebase OUT to this frame's parent? `extentPx` is the focused
 *  frame's drawn extent in screen pixels — the same measure the aperture read. */
export function wantsRebaseOut(extentPx: number, minView: number, armed: boolean): RebaseDecision {
  if (minView <= 0) return { fire: false, armed };
  return decide(extentPx <= minView * RB_OUT, extentPx >= minView * RB_OUT * ARM_SLACK, armed);
}

/** The view that draws `e`'s child as the root, pixel-identical to `view`
 *  drawing it through the aperture. */
export function rebaseIn(view: View, e: Embed): View {
  return {
    scale: view.scale * e.s,
    pan: { x: view.pan.x + e.tx * view.scale, y: view.pan.y + e.ty * view.scale },
  };
}

/** The inverse: the parent's view that draws the child exactly where `view`
 *  has it. `rebaseOut(rebaseIn(v, e), e) === v`. */
export function rebaseOut(view: View, e: Embed): View {
  const scale = view.scale / e.s;
  return { scale, pan: { x: view.pan.x - e.tx * scale, y: view.pan.y - e.ty * scale } };
}

/** The scale at which an aperture on the current frame reaches the rebase-in
 *  line — where an animated ride is heading (#139 M3, rule 7). */
export function rebaseInScale(minView: number, apertureR: number): number {
  return (minView * RB_IN) / (2 * apertureR);
}

/** …and the scale at which the frame's own extent reaches the rebase-out line. */
export function rebaseOutScale(minView: number, extentWorld: number): number {
  return extentWorld > 0 ? (minView * RB_OUT) / extentWorld : 0;
}
