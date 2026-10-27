// The canvas style spec — every geometry/stroke/label/wash knob in ONE table,
// so a visual register is a value set, not a five-file hunt (#53). Pure
// presentation: nothing here decides or colors a systems fact — KIND colors
// and the --lens-accent seam stay where they are; these are px and opacities.
//
// The active spec is chosen by URL (?s=1|2|3) for the #53 blind pick; the
// default remains the incumbent look until the pick lands. Specs are read
// once at module load (a page reload switches — fine for a pick).

export interface StyleSpec {
  nodeR: number;
  curveBow: number;
  /** Corner radius of env-object squares. */
  squareRx: number;
  klirNode: { width: number; opacity: number };
  nodeStrokeWidth: number;
  /** Node body fill token. */
  nodeFill: "var(--bg-secondary)" | "var(--bg-surface)";
  badge: { form: "filled" | "outline" | "corner"; r: number; strokeWidth: number };
  portRx: number;
  portStrokeWidth: number;
  label: {
    size: number;
    smallSize: number;
    mono: boolean;
    uppercase: boolean;
    tracking: string;
    fill: string;
  };
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
  compHalo: { pad: number; opacity: number };
  boundaryRim: { pad: number; width: number; opacity: number };
  selection: { width: number; opacity: number };
  handle: { r: number; width: number };
  ring: { fillOpacity: number; strokeWidth: number };
  simFillOpacity: number;
  arrowSize: number;
  grid: { mode: "dots" | "lines"; gap: number; ink: string; wash: boolean };
  dockRadius: number;
  chipRx: number;
}

/** The incumbent (pre-#53) register. */
const CURRENT: StyleSpec = {
  nodeR: 34,
  curveBow: 32,
  squareRx: 6,
  klirNode: { width: 1.25, opacity: 0.4 },
  nodeStrokeWidth: 1.75,
  nodeFill: "var(--bg-secondary)",
  badge: { form: "filled", r: 10, strokeWidth: 1 },
  portRx: 9,
  portStrokeWidth: 1.75,
  label: { size: 12, smallSize: 10, mono: false, uppercase: false, tracking: "0", fill: "var(--text-primary)" },
  simReadoutSize: 10,
  edge: { klir: 2.5, bond: 2.5, exo: 1.75, mere: 1.5, matter: 3, energy: 2, info: 1.25 },
  hoverHalo: { pad: 6, width: 2 },
  compHalo: { pad: 10, opacity: 0.5 },
  boundaryRim: { pad: 4, width: 2.25, opacity: 0.9 },
  selection: { width: 6, opacity: 0.22 },
  handle: { r: 7, width: 1.5 },
  ring: { fillOpacity: 0.18, strokeWidth: 2.5 },
  simFillOpacity: 0.32,
  arrowSize: 7,
  grid: { mode: "dots", gap: 24, ink: "color-mix(in srgb, var(--lens-accent) 38%, var(--border))", wash: true },
  dockRadius: 12,
  chipRx: 9999,
};

// Makeover slice E (2026-10-26, charter rules 17 and 19, canvas audit blocks 1
// and 2): every world stroke is 2 px and never thins below STROKE_FLOOR_PX on
// screen; names are Inter, authored case, 13 px with a 12 px screen floor; the
// register's old 1 px / 10 px mono uppercase values are recorded in the audit.
const S1: StyleSpec = {
  nodeR: 24,
  curveBow: 14,
  squareRx: 0,
  klirNode: { width: 2, opacity: 0.6 },
  nodeStrokeWidth: 2,
  nodeFill: "var(--bg-secondary)",
  badge: { form: "outline", r: 9, strokeWidth: 2 },
  portRx: 4,
  portStrokeWidth: 2,
  label: { size: 13, smallSize: 12, mono: false, uppercase: false, tracking: "0", fill: "var(--text-primary)" },
  simReadoutSize: 9,
  edge: { klir: 2, bond: 2, exo: 2, mere: 2, matter: 2, energy: 2, info: 2 },
  hoverHalo: { pad: 4, width: 1 },
  compHalo: { pad: 6, opacity: 0.12 },
  boundaryRim: { pad: 3, width: 2, opacity: 1 },
  selection: { width: 2.5, opacity: 0.35 },
  handle: { r: 5, width: 1 },
  ring: { fillOpacity: 0.06, strokeWidth: 2 },
  simFillOpacity: 0.2,
  arrowSize: 5,
  grid: { mode: "dots", gap: 20, ink: "var(--hairline)", wash: false },
  dockRadius: 8,
  chipRx: 3,
};

const S2: StyleSpec = {
  nodeR: 28,
  curveBow: 18,
  squareRx: 3,
  klirNode: { width: 1, opacity: 0.45 },
  nodeStrokeWidth: 1.25,
  nodeFill: "var(--bg-secondary)",
  badge: { form: "outline", r: 9, strokeWidth: 1 },
  portRx: 3,
  portStrokeWidth: 1.25,
  label: { size: 11, smallSize: 10, mono: false, uppercase: false, tracking: "0", fill: "var(--text-secondary)" },
  simReadoutSize: 10,
  edge: { klir: 1.25, bond: 1.5, exo: 1.25, mere: 1, matter: 2, energy: 1.5, info: 1.25 },
  hoverHalo: { pad: 5, width: 1.5 },
  compHalo: { pad: 8, opacity: 0.2 },
  boundaryRim: { pad: 4, width: 1.5, opacity: 0.9 },
  selection: { width: 4, opacity: 0.25 },
  handle: { r: 6, width: 1.25 },
  ring: { fillOpacity: 0.12, strokeWidth: 1.5 },
  simFillOpacity: 0.28,
  arrowSize: 6,
  grid: { mode: "dots", gap: 22, ink: "color-mix(in srgb, var(--lens-accent) 20%, var(--border))", wash: false },
  dockRadius: 10,
  chipRx: 4,
};

const S3: StyleSpec = {
  nodeR: 26,
  curveBow: 12,
  squareRx: 1,
  klirNode: { width: 1, opacity: 0.5 },
  nodeStrokeWidth: 1.5,
  nodeFill: "var(--bg-surface)",
  badge: { form: "corner", r: 7, strokeWidth: 1 },
  portRx: 1,
  portStrokeWidth: 1.25,
  label: { size: 10, smallSize: 9, mono: true, uppercase: true, tracking: "0.06em", fill: "var(--text-muted)" },
  simReadoutSize: 9,
  edge: { klir: 1.25, bond: 1.5, exo: 1, mere: 1, matter: 1.75, energy: 1.25, info: 1 },
  hoverHalo: { pad: 3, width: 1 },
  compHalo: { pad: 5, opacity: 0.15 },
  boundaryRim: { pad: 3, width: 1.25, opacity: 1 },
  selection: { width: 2, opacity: 0.5 },
  handle: { r: 5, width: 1 },
  ring: { fillOpacity: 0.08, strokeWidth: 1.25 },
  simFillOpacity: 0.22,
  arrowSize: 5,
  grid: { mode: "lines", gap: 28, ink: "var(--hairline)", wash: false },
  dockRadius: 6,
  chipRx: 2,
};

// Blind pick 2026-07-15 (#53): Drafting Table won (ranked 1>2>3; rationale =
// field recession — neutral grid, quiet dots). It is now the default register;
// the others stay reachable for reference (?s=0 = the pre-#53 incumbent).
function pick(): StyleSpec {
  // No `window` under a node test runner — this module is imported transitively
  // by pure-geometry unit tests, so fall back to the default register there.
  if (typeof window === "undefined") return S1;
  const s = new URLSearchParams(window.location.search).get("s");
  return s === "0" ? CURRENT : s === "2" ? S2 : s === "3" ? S3 : S1;
}

export const STYLE: StyleSpec = pick();

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
