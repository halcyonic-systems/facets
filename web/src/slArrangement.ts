// How the SL pane and the diagram share the working width. Three settings:
// the text alone, the two side by side, or the diagram with the pane folded to
// a rail. A small per-browser preference, kept the way the pane's width is.
//
// The rules that must hold are here as plain functions so they can be tested
// without a DOM: a draft waiting on Accept/Discard is never out of sight, and
// a description handed to the co-author never lands in a folded pane.

export type SlArrangement = "sl" | "split" | "diagram";

export const SL_ARRANGEMENTS: { value: SlArrangement; label: string; title: string }[] = [
  { value: "sl", label: "Text", title: "Text only: the pane takes the full width and the diagram is hidden" },
  { value: "split", label: "Split", title: "Text and diagram side by side" },
  { value: "diagram", label: "Diagram", title: "Diagram only: the pane folds to a rail at the left edge" },
];

const KEY = "sl-pane-arrangement";

function isArrangement(v: unknown): v is SlArrangement {
  return v === "sl" || v === "split" || v === "diagram";
}

export function loadSlArrangement(): SlArrangement {
  try {
    const v = localStorage.getItem(KEY);
    return isArrangement(v) ? v : "split";
  } catch {
    return "split";
  }
}

export function saveSlArrangement(a: SlArrangement): void {
  try {
    localStorage.setItem(KEY, a);
  } catch {
    // private mode etc. — the arrangement just won't survive a reload
  }
}

/** True when the diagram is out of sight because the text has the width. */
export function diagramHidden(a: SlArrangement, paneShown: boolean): boolean {
  return paneShown && a === "sl";
}

/** Where the Accept/Discard gate for a previewed draft has to be. The canvas
 *  banner is the gate whenever the canvas is visible; with the canvas hidden
 *  the pane carries it instead, so the draft can never sit uncommitted with
 *  nothing on screen saying so. */
export function previewGateInPane(a: SlArrangement, paneShown: boolean, previewing: boolean): boolean {
  return previewing && diagramHidden(a, paneShown);
}

/** A description arriving for the co-author needs a pane to arrive in. */
export function arrangementForSeed(a: SlArrangement): SlArrangement {
  return a === "diagram" ? "split" : a;
}
