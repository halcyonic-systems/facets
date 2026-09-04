// Nesting a child model's frame into its parent's (#139 M0). A `decomposes @id`
// seam is asserted by the language and checked by the kernel; what has never
// existed is a renderer that draws the child INSIDE the component it belongs
// to. That is one affine map per seam — uniform scale plus translation, no
// rotation and no shear, because child geometry already lives in its own world
// coordinates and the aperture it lands in is a disc.
//
// Nothing here reads or decides a systems fact. It is the same arithmetic
// `fitToBox` does for the viewport, aimed at a node's circle instead: framing a
// box inside a square window, which is why the round-trip against `fitToBox` is
// the test that keeps the two honest.
import { contentBounds, membraneRing, NODE_R, type Box, type Pt } from "./geometry";
import type { CanvasModel } from "../kernel/types";

/** A child frame's placement in its parent's world coordinates:
 *  `p_parent = p_child · s + (tx, ty)`. */
export interface Embed {
  s: number;
  tx: number;
  ty: number;
}

export const IDENTITY: Embed = { s: 1, tx: 0, ty: 0 };

/** Place `childBounds` inside the disc of radius `apertureR` centred on
 *  `parent`. The box's longer half-extent meets the rim, so the whole child
 *  fits and touches on its wide axis. */
export function embedTransform(parent: Pt, apertureR: number, childBounds: Box): Embed {
  const halfW = (childBounds.maxX - childBounds.minX) / 2;
  const halfH = (childBounds.maxY - childBounds.minY) / 2;
  const half = Math.max(halfW, halfH);
  const s = half > 0 ? apertureR / half : 1;
  const cx = (childBounds.minX + childBounds.maxX) / 2;
  const cy = (childBounds.minY + childBounds.maxY) / 2;
  return { s, tx: parent.x - cx * s, ty: parent.y - cy * s };
}

/** `outer ∘ inner` — the single map from the inner frame's coordinates to the
 *  frame `outer` lands in. Depth is composition, which is why M1's one level
 *  and a deeper recursion are the same code. */
export function compose(outer: Embed, inner: Embed): Embed {
  return {
    s: outer.s * inner.s,
    tx: outer.s * inner.tx + outer.tx,
    ty: outer.s * inner.ty + outer.ty,
  };
}

export function applyEmbed(e: Embed, p: Pt): Pt {
  return { x: p.x * e.s + e.tx, y: p.y * e.s + e.ty };
}

/** The SVG transform for an embedded frame. Written scale-last so the child's
 *  own coordinates go in unchanged. */
export function embedTransformAttr(e: Embed): string {
  return `translate(${e.tx}, ${e.ty}) scale(${e.s})`;
}

/** The extent of what an embedded frame actually DRAWS. Not `contentBounds`:
 *  inside an aperture the child's environment stand-ins are suppressed (they
 *  restate the parent's own neighbours — the seam's other half), so framing the
 *  child by a box that includes them would shrink the interior for objects that
 *  never appear. Falls back to `contentBounds` when nothing is left to draw. */
export function embeddedBounds(child: CanvasModel): Box | null {
  const components = child.things.filter((t) => t.role === "Component");
  if (components.length === 0) return contentBounds(child);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const t of components) {
    minX = Math.min(minX, t.x - NODE_R);
    minY = Math.min(minY, t.y - NODE_R);
    maxX = Math.max(maxX, t.x + NODE_R);
    maxY = Math.max(maxY, t.y + NODE_R);
  }
  const ring = membraneRing(components);
  minX = Math.min(minX, ring.cx - ring.rx);
  minY = Math.min(minY, ring.cy - ring.ry);
  maxX = Math.max(maxX, ring.cx + ring.rx);
  maxY = Math.max(maxY, ring.cy + ring.ry);
  return { minX, minY, maxX, maxY };
}

// ---- Level of detail (#139 M1) ---------------------------------------------
//
// Keyed on the aperture's diameter IN SCREEN PIXELS, not on view scale: what
// decides whether an interior is worth drawing is how big it lands, and a model
// laid out large and one laid out small should behave the same way at the same
// apparent size.

export type ApertureTier = "sealed" | "skeleton" | "full";

/** Below this the aperture is an ordinary node. */
export const SKELETON_PX = 40;
/** Above this the frame earns edges and labels. */
export const FULL_PX = 200;
/** Resolve the child a little before it is drawn — the hysteresis band below
 *  is exactly that head start, so the model is parsed by the time the skeleton
 *  tier opens rather than arriving a frame late mid-gesture. */
export const PREFETCH_PX = SKELETON_PX;

// A zoom gesture hovering on a threshold would otherwise flicker between tiers
// every frame; a tier has to be overshot to be entered and undershot to be left.
const HYSTERESIS = 0.15;

/** The tier for an aperture `px` screen-pixels across, given the tier it is
 *  already in. Pure — the caller owns the per-node memory. */
export function apertureTier(px: number, prev: ApertureTier = "sealed"): ApertureTier {
  const enterSkeleton = SKELETON_PX * (1 + HYSTERESIS);
  const leaveSkeleton = SKELETON_PX * (1 - HYSTERESIS);
  const enterFull = FULL_PX * (1 + HYSTERESIS);
  const leaveFull = FULL_PX * (1 - HYSTERESIS);
  if (prev === "full") return px < leaveSkeleton ? "sealed" : px < leaveFull ? "skeleton" : "full";
  if (prev === "skeleton") return px >= enterFull ? "full" : px < leaveSkeleton ? "sealed" : "skeleton";
  return px >= enterFull ? "full" : px >= enterSkeleton ? "skeleton" : "sealed";
}

/** How wide a node's aperture lands on screen at this view scale. */
export function apertureScreenPx(viewScale: number, apertureR = NODE_R): number {
  return viewScale * apertureR * 2;
}
