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
import { bungeHull, contentBounds, membraneRing, NODE_R, type Box, type Pt } from "./geometry";
import type { CanvasModel, Lens, Thing } from "../kernel/types";

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

/** The register an aperture is read in. Mobus reads a child through its
 *  membrane; Bunge reads it through the observer's hull, which is the same
 *  seam seen with the other register's container (#139 rule 5). Klir draws no
 *  container, so it draws no aperture and never reaches here. */
export type ApertureRegister = Extract<Lens, "Mobus" | "Bunge">;

/** The extent of what an embedded frame actually DRAWS. Not `contentBounds`:
 *  inside an aperture the child's environment stand-ins are suppressed (they
 *  restate the parent's own neighbours — the seam's other half), so framing the
 *  child by a box that includes them would shrink the interior for objects that
 *  never appear. Falls back to `contentBounds` when nothing is left to draw.
 *
 *  Bunge's container is a RECTANGLE, so its corners sit further from the centre
 *  than either half-extent; framed by the box alone they would be cropped by
 *  the disc. Squaring the box on the corner distance is what puts the whole
 *  hull inside the rim, at the cost of a slightly smaller interior. */
export function embeddedBounds(child: CanvasModel, register: ApertureRegister = "Mobus"): Box | null {
  if (register === "Bunge") {
    const comps = child.things.filter((t) => t.role === "Component");
    if (comps.length === 0) return contentBounds(child);
    const h = bungeHull(child.things);
    const cx = h.x + h.w / 2;
    const cy = h.y + h.h / 2;
    const half = Math.hypot(h.w / 2, h.h / 2);
    return { minX: cx - half, minY: cy - half, maxX: cx + half, maxY: cy + half };
  }
  return membraneBounds(child);
}

function membraneBounds(child: CanvasModel): Box | null {
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

/** Below this a top-level aperture is an ordinary node. */
export const SKELETON_PX = 120;
/** …and below THIS for a frame already inside one. A nested interior is
 *  orientation — "there is more in here" — not a reading, and it has to be
 *  legible before the crossing rather than after it: at the size an aperture
 *  takes the stage its own children land around fifty pixels, so holding them
 *  to the top-level line would mean depth 2 could never be seen from depth 0.
 *  This is the brief's own sealed line, which is where a mark stops being
 *  worth drawing at all. */
export const NESTED_SKELETON_PX = 40;

/** The skeleton line for a frame `level` deep inside the focused one. */
export function skeletonPxAt(level: number): number {
  return level === 0 ? SKELETON_PX : NESTED_SKELETON_PX;
}
/** Above this the frame earns edges and labels. */
export const FULL_PX = 260;
/** Resolve the child a little before it is drawn — the hysteresis band above
 *  the skeleton line is exactly that head start, so the model is parsed by the
 *  time the tier opens rather than arriving a frame late mid-gesture. The line
 *  is the frame's own, so a nested child is fetched on its own smaller clock. */
export const PREFETCH_PX = SKELETON_PX;

// A zoom gesture hovering on a threshold would otherwise flicker between tiers
// every frame; a tier has to be overshot to be entered and undershot to be left.
const HYSTERESIS = 0.15;

/** The tier for an aperture `px` screen-pixels across, given the tier it is
 *  already in. Pure — the caller owns the per-node memory. */
export function apertureTier(px: number, prev: ApertureTier = "sealed", skeletonPx = SKELETON_PX): ApertureTier {
  const enterSkeleton = skeletonPx * (1 + HYSTERESIS);
  const leaveSkeleton = skeletonPx * (1 - HYSTERESIS);
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

/** The focused frame's own drawn extent in screen pixels — the SAME quantity an
 *  aperture reports for it one level up, which is what lets the rebase band be
 *  a hysteresis band on one number (see `frameRebase`). */
export function frameExtentPx(model: CanvasModel, viewScale: number, register: ApertureRegister = "Mobus"): number {
  const box = embeddedBounds(model, register);
  if (!box) return 0;
  return Math.max(box.maxX - box.minX, box.maxY - box.minY) * viewScale;
}

// ---- The frame tree (#139 M2) ----------------------------------------------
//
// One level of aperture and a recursion of them are the same code: an embed
// composes, so a frame's own decomposed components open on exactly the reading
// that opened it, taken at the composite scale their coordinates land at. The
// tree is built in the frames' OWN coordinates — each node's `thing` and
// `embed` are expressed in its enclosing frame — because that is the space the
// renderer is already in when it draws them, and it keeps depth out of the
// arithmetic entirely.

/** How many levels of interior are drawn below the focused frame. Deeper than
 *  this a preview is pixels, not orientation, and it is paid for every frame. */
export const MAX_FRAME_DEPTH = 2;

export interface FrameNode {
  /** Stable across renders — the path of component ids, which is what the tier
   *  memory and the clip ids are keyed on. */
  key: string;
  /** The component whose disc is this aperture, in its enclosing frame's coords. */
  thing: Thing;
  child: CanvasModel;
  /** Child coordinates → the enclosing frame's coordinates. One level. */
  embed: Embed;
  tier: ApertureTier;
  /** On-screen scale of this child's own coordinates — the view scale times
   *  every embed above it. Screen-held sizes divide by this. */
  screenScale: number;
  children: FrameNode[];
}

export interface FrameDeps {
  /** The parsed child, synchronously. `undefined` = unresolved (ask for it),
   *  `null` = resolves nowhere (draw an ordinary node, raise nothing). */
  childModel: (id: string) => CanvasModel | null | undefined;
  /** Per-path tier memory — the hysteresis is stateful and the caller owns it. */
  tierOf: (key: string) => ApertureTier;
  setTier: (key: string, tier: ApertureTier) => void;
  /** A child is nearing the size at which its interior would be drawn. */
  approach: (id: string) => void;
  register: ApertureRegister;
  /** Root-level culling. Nested frames are inside a disc that is already
   *  culled, so only the top level asks. */
  visible?: (t: Thing) => boolean;
}

/** The frames worth drawing for `model` at `frameScale` — the on-screen scale
 *  of `model`'s own coordinates. Depth is spent one level per recursion; at
 *  zero, children are still PREFETCHED (one level below the deepest drawn
 *  frame, per the brief) and nothing is returned. */
export function buildFrames(
  model: CanvasModel,
  frameScale: number,
  deps: FrameDeps,
  depth: number = MAX_FRAME_DEPTH,
  prefix = "",
  level = 0,
): FrameNode[] {
  const px = apertureScreenPx(frameScale);
  const skeletonPx = skeletonPxAt(level);
  const doors = model.things.filter(
    (t) => t.role === "Component" && t.child_model && (prefix !== "" || !deps.visible || deps.visible(t)),
  );
  if (px >= skeletonPx) {
    for (const t of doors) {
      if (deps.childModel(t.child_model!.id) === undefined) deps.approach(t.child_model!.id);
    }
  }
  if (depth <= 0) return [];
  return doors.flatMap((t) => {
    const key = `${prefix}${t.id}`;
    const tier = apertureTier(px, deps.tierOf(key), skeletonPx);
    deps.setTier(key, tier);
    if (tier === "sealed") return [];
    const child = deps.childModel(t.child_model!.id);
    if (!child) return [];
    const bounds = embeddedBounds(child, deps.register);
    if (!bounds) return [];
    const embed = embedTransform(t, NODE_R, bounds);
    const screenScale = frameScale * embed.s;
    return [
      {
        key,
        thing: t,
        child,
        embed,
        tier,
        screenScale,
        children: buildFrames(child, screenScale, deps, depth - 1, `${key}-`, level + 1),
      },
    ];
  });
}

/** Every node in the forest, parents before children — the order the clip paths
 *  have to be declared in. */
export function flattenFrames(nodes: readonly FrameNode[]): FrameNode[] {
  return nodes.flatMap((n) => [n, ...flattenFrames(n.children)]);
}
