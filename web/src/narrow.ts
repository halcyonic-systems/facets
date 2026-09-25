// The narrow frame (#427, ruled 2026-09-25): below 900px each mode is its
// Focus arrangement — the primary surface alone — and the secondary pane
// (Build's Element inspector, Write's margin, Read's diagram) opens as a
// sheet over it on demand, closing when dismissed and never remembered.
// Above 900px nothing changes. The number: the frame measured fine at
// ~1000px, cramped at 680 (a 241px canvas beside a full inspector) and
// broken at 484 (44px); the chat's 1100px would push a laptop half-screen
// into sheet mode, too eager for an authoring surface.
import { useEffect, useState } from "react";
import type { WorkspaceMode } from "./workspace";

export const NARROW_BREAKPOINT = 900;
export const NARROW_QUERY = `(max-width: ${NARROW_BREAKPOINT - 1}px)`;

/** Is the viewport narrow? Tracks the media query live; false where
 *  matchMedia is absent (tests, SSR). */
export function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(NARROW_QUERY).matches : false,
  );
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(NARROW_QUERY);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

/** The secondary pane a mode puts behind a sheet when narrow, by the name
 *  the status-bar toggle shows. */
export function secondaryOf(mode: WorkspaceMode): string {
  return mode === "build" ? "Element" : mode === "write" ? "Margin" : "Diagram";
}
