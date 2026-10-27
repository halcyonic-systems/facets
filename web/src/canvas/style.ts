// The canvas style spec — every geometry/stroke/label/wash knob in ONE table,
// so a visual register is a value set, not a five-file hunt (#53). Pure
// presentation: nothing here decides or colors a systems fact — KIND colors
// and the --lens-accent seam stay where they are; these are px and opacities.

export interface StyleSpec {
  nodeR: number;
  curveBow: number;
  /** Corner radius of env-object squares (0: a grid cell, R8). */
  squareRx: number;
  klirNode: { width: number; opacity: number };
  nodeStrokeWidth: number;
  /** Node body fill token. */
  nodeFill: "var(--bg-secondary)" | "var(--bg-surface)";
  badge: { form: "filled" | "outline" | "corner"; r: number; strokeWidth: number };
  portRx: number;
  portStrokeWidth: number;
  label: { size: number; fill: string };
  simReadoutSize: number;
  edge: {
    klir: number;
    bond: number;
    exo: number;
    mere: number;
    matter: number;
    energy: number;
    info: number;
  };
  hoverHalo: { pad: number; width: number };
  boundaryRim: { pad: number; width: number; opacity: number };
  selection: { width: number; opacity: number };
  ring: { fillOpacity: number; strokeWidth: number };
  simFillOpacity: number;
  grid: { mode: "dots" | "lines"; gap: number; ink: string; wash: boolean };
  chipRx: number;
}

// The one register. "Drafting Table" won the 2026-07-15 blind pick (#53:
// field recession, a neutral grid, quiet dots); the makeover's canvas slice
// (2026-10-26, charter rules 17 and 19, canvas audit blocks 1 and 2) made it
// bolder: every world stroke is 2 px and never thins below STROKE_FLOOR_PX on
// screen; names are Inter, authored case, 13 px with a 12 px screen floor. The
// three registers the pick rejected, once reachable by `?s=`, are deleted; the
// audit records their values.
export const STYLE: StyleSpec = {
  nodeR: 24,
  curveBow: 14,
  squareRx: 0,
  klirNode: { width: 2, opacity: 0.6 },
  nodeStrokeWidth: 2,
  nodeFill: "var(--bg-secondary)",
  badge: { form: "outline", r: 9, strokeWidth: 2 },
  portRx: 4,
  portStrokeWidth: 2,
  label: { size: 13, fill: "var(--text-primary)" },
  simReadoutSize: 9,
  edge: { klir: 2, bond: 2, exo: 2, mere: 2, matter: 2, energy: 2, info: 2 },
  hoverHalo: { pad: 4, width: 1 },
  boundaryRim: { pad: 3, width: 2, opacity: 1 },
  selection: { width: 2.5, opacity: 0.35 },
  ring: { fillOpacity: 0, strokeWidth: 2 },
  simFillOpacity: 0.2,
  grid: { mode: "dots", gap: 20, ink: "var(--hairline)", wash: false },
  chipRx: 3,
};

// ---- Screen-space readings (makeover slice E) ----------------------------------
// A node body or a membrane IS the world and scales with the view; a stroke, a
// name, an arrowhead or a handle is a reading of it and has a size the eye
// needs whatever the zoom. These are the floors and holds, in SCREEN px, that
// stageScale.ts turns into world units for the frame being drawn. Numbers from
// the canvas audit § 4 (tldraw handle 8/zoom with a hit half-extent, Excalidraw
// default stroke 2) and the charter (rule 11: 24 px targets, rule 17: 2 px
// strokes, visual-language rule 7: authored case, no mono on a name).

/** A world stroke never renders thinner than this on screen. */
export const STROKE_FLOOR_PX = 1.5;

/** Type on the canvas: Inter, sentence case. `size` is a thing's name, `small`
 *  the Klir recession (by weight and ink, not by shrinking), `edge` a flow's
 *  label; the floors keep a fitted model readable. Weight 500 for a name. */
export const LABEL = { size: 13, small: 12, edge: 12, floorPx: 12, edgeFloorPx: 10, weight: 500 } as const;

/** The paper tab behind a label (rule 19): padding and radius, screen px. */
export const TAB = { pad: 2, rx: 2 } as const;

/** The connect handle, screen px: an 8 px disc (r 4) with a 2 px stroke, a hit
 *  disc of r 12 (the 24 px target of rule 11), 1.75x under a coarse pointer. */
export const HANDLE = { r: 4, width: 2, hitR: 12, coarse: 1.75 } as const;

/** One arrowhead for every flow: 10 world px, floored to 8 on screen, held at
 *  the 1.5x cap like every other reading. `markerUnits="userSpaceOnUse"` so the
 *  stroke no longer sizes it (the exo 2x gain and the 0.8 crossing head went). */
export const ARROW = { size: 10, floorPx: 8 } as const;

/** The interface chevron is the one mark that carries direction: never under
 *  this many screen px tall. */
export const CHEVRON_MIN_PX = 10;

/** How many characters of a flow's NAME the canvas will draw before eliding it
 *  (#335). A label is an identifier; a sentence belongs in `description`.
 *
 *  Measured on `federal-reserve.sl`: 23 labels, 7 overlapping pairs, the widest
 *  420 model px against a parallel-sibling fan of 30 (`PARALLEL_BOW`). The fan
 *  is an order of magnitude smaller than the text, so no amount of fanning
 *  separates sentence-length labels — the text has to get shorter. Full text
 *  stays reachable on hover and in the inspector; nothing is hidden, only
 *  deferred.
 *
 *  28 keeps a real name ("reserve balances minted") whole while cutting the
 *  clauses that made labels into prose. */
export const EDGE_LABEL_MAX = 28;

/** Elide a flow name to the drawing budget, breaking on a word so the ellipsis
 *  reads as a truncation rather than as damage. Returns the name unchanged when
 *  it already fits, so a well-named flow is never decorated. */
export function elideEdgeLabel(name: string, max: number = EDGE_LABEL_MAX): string {
  const one = name.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
