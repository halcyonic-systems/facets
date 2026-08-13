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
  energyGlow: { enabled: boolean; dev: number; opacity: number };
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
  energyGlow: { enabled: true, dev: 2.2, opacity: 0.55 },
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

const S1: StyleSpec = {
  nodeR: 24,
  curveBow: 14,
  squareRx: 2,
  klirNode: { width: 1, opacity: 0.35 },
  nodeStrokeWidth: 1,
  nodeFill: "var(--bg-secondary)",
  badge: { form: "outline", r: 9, strokeWidth: 1 },
  portRx: 2,
  portStrokeWidth: 1,
  label: { size: 10, smallSize: 9, mono: true, uppercase: true, tracking: "0.04em", fill: "var(--text-secondary)" },
  simReadoutSize: 9,
  edge: { klir: 1, bond: 1.25, exo: 1, mere: 1, matter: 1.5, energy: 1.25, info: 1 },
  energyGlow: { enabled: false, dev: 0, opacity: 0 },
  hoverHalo: { pad: 4, width: 1 },
  compHalo: { pad: 6, opacity: 0.12 },
  boundaryRim: { pad: 3, width: 1, opacity: 1 },
  selection: { width: 2.5, opacity: 0.35 },
  handle: { r: 5, width: 1 },
  ring: { fillOpacity: 0.06, strokeWidth: 1 },
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
  energyGlow: { enabled: true, dev: 1.2, opacity: 0.3 },
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
  energyGlow: { enabled: false, dev: 0, opacity: 0 },
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
