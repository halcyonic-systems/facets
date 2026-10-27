// The stage's zoom, for marks that must not grow with it. A node body or a
// membrane IS the world and scales with the view; a name, an edge label, an
// arrowhead or the connect handle is a reading of it, and past 1.5× a reading
// that keeps growing stops being one. The factor below holds those marks at
// the size they had at 1.5× — identity at and below it, so a fitted or
// zoomed-out model draws exactly as it always did.
import { createContext, useContext } from "react";

export const HOLD_FROM = 1.5;

export function screenHold(scale: number): number {
  return Math.min(1, HOLD_FROM / Math.max(scale, 0.0001));
}

/** The stage's current view scale, provided by Canvas around the scene. */
export const StageScale = createContext(1);

/** The hold factor for the frame being rendered. */
export function useStageHold(): number {
  return screenHold(useContext(StageScale));
}

/** The stage's view scale for the frame being rendered. */
export function useStageScale(): number {
  return useContext(StageScale);
}

const safe = (scale: number) => Math.max(scale, 0.0001);

/** World units for a mark that is `px` on screen whatever the zoom (handles,
 *  hit margins, tab padding): the tldraw `n / zoom` reading. */
export function screenWorld(px: number, scale: number): number {
  return px / safe(scale);
}

/** A world stroke of `world` px that never renders thinner than `floorPx` on
 *  screen (makeover rule 17: 2 px strokes that do not thin away at fit). */
export function strokeWorld(world: number, scale: number, floorPx: number): number {
  return Math.max(world, floorPx / safe(scale));
}

/** A reading's font size in world units: `size` px, held past 1.5x like every
 *  other reading, and never below `floorPx` on screen. */
export function textWorld(size: number, scale: number, floorPx: number): number {
  return Math.max(size * screenHold(scale), floorPx / safe(scale));
}

/** Pointer coarseness, read once: a touch pointer gets wider hit discs. */
export const COARSE_POINTER: boolean =
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
