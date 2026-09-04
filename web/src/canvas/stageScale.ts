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
