// The icon set: one grammar for every drawn mark in the web app (makeover
// charter rules 14, 18, 21; Arcadia DESIGN.md "Icons"). A 24 x 24 grid with
// the art inside 3 to 21, a 2px stroke in currentColor, square caps, mitre
// joins, outline by default, a fill only for a solid too small to outline (a
// dot, an arrowhead) or where a glyph needs paper to occlude (Copying's front
// card). Colour comes from the parent: set `color` with a token and the icon
// takes it.
//
// Three families share the grammar and this file:
//   UI      — controls and states that today are unicode glyphs (✕ → ▸ ⤢ ▶ …).
//   CANVAS  — the ten process primitives (canvas audit § 3.1), the shapes of
//             rule 17 (component, environment, interface, membrane, flow,
//             agent) and the four substances.
//   DOORS   — the four Home doors, redrawn from their 96 x 64 bespoke drawings.
//
// Every glyph is DATA (a list of shapes on the 24 grid), not JSX, so the same
// drawing can be rendered on the 24 grid by <Icon> and mapped into the ±6 box
// the canvas lenses already scale (canvas/lenses/primitive-glyphs.tsx). One
// drawing, every surface. The names table with what each replaces: icons.md.
import type { CSSProperties, ReactNode } from "react";
import type { ProcessPrimitive } from "./kernel/types";

// ---- Shapes ------------------------------------------------------------------

/** What a filled region is filled with. `ink` is currentColor (a solid mass);
 *  `paper` occludes what is behind it; `wash` is the soft accent tint the Home
 *  doors carry on a closed shape (HomeScreen's glyphWash). */
export type Fill = "ink" | "paper" | "wash";

export type Shape =
  | { k: "path"; d: string; fill?: Fill }
  | { k: "circle"; cx: number; cy: number; r: number; fill?: Fill }
  | { k: "ellipse"; cx: number; cy: number; rx: number; ry: number; fill?: Fill }
  | { k: "rect"; x: number; y: number; w: number; h: number; rx?: number; fill?: Fill };

const P = (d: string, extra?: { fill?: Fill }): Shape => ({ k: "path", d, ...extra });
const C = (cx: number, cy: number, r: number, fill?: Fill): Shape => ({ k: "circle", cx, cy, r, fill });
const E = (cx: number, cy: number, rx: number, ry: number, fill?: Fill): Shape => ({ k: "ellipse", cx, cy, rx, ry, fill });
const R = (x: number, y: number, w: number, h: number, extra?: { rx?: number; fill?: Fill }): Shape => ({
  k: "rect",
  x,
  y,
  w,
  h,
  ...extra,
});

// ---- The UI set ----------------------------------------------------------------

const UI = {
  close: [P("M6 6 L18 18 M18 6 L6 18")],
  back: [P("M20 12 H5 M11 6 L5 12 L11 18")],
  forward: [P("M4 12 H19 M13 6 L19 12 L13 18")],
  "chevron-down": [P("M5 9 L12 16 L19 9")],
  "chevron-up": [P("M5 15 L12 8 L19 15")],
  "chevron-right": [P("M9 5 L16 12 L9 19")],
  "chevron-left": [P("M15 5 L8 12 L15 19")],
  expand: [P("M14 4 H20 V10 M20 4 L13 11 M10 20 H4 V14 M4 20 L11 13")],
  collapse: [P("M20 4 L14 10 M14 5 V10 H19 M4 20 L10 14 M10 19 V14 H5")],
  play: [P("M7 5 V19 L19 12 Z")],
  pause: [P("M8 5 V19 M16 5 V19")],
  step: [P("M5 5 V19 L15 12 Z M19 5 V19")],
  "step-back": [P("M19 5 V19 L9 12 Z M5 5 V19")],
  reset: [P("M12 7 A6 6 0 1 0 18 13 M15 16 L18 13 L21 16")],
  check: [P("M5 12 L10 17 L19 8")],
  external: [P("M7 17 L17 7 M9 7 H17 V15")],
  edit: [P("M4 20 V16 L15 5 L19 9 L8 20 Z M12 8 L16 12")],
  delete: [P("M4 7 H20 M9 7 V4 H15 V7 M6 7 L7 20 H17 L18 7 M10 11 V16 M14 11 V16")],
  search: [C(10, 10, 6), P("M14.5 14.5 L20 20")],
  file: [P("M6 3 H14 L19 8 V21 H6 Z M14 3 V8 H19")],
  folder: [P("M3 6 H10 L12 8 H21 V19 H3 Z")],
  // A disk with its shutter and label, for keeping a copy in the library.
  save: [P("M4 4 H16 L20 8 V20 H4 Z M8 4 V9 H15 V4 M8 20 V14 H16 V20")],
  // An arrow down into a tray, for a file that lands on this machine.
  download: [P("M12 4 V15 M7 10 L12 15 L17 10 M4 15 V20 H20 V15")],
  pin: [P("M9 4 H15 V10 L18 13 H6 L9 10 Z M12 13 V20")],
  theme: [C(12, 12, 8), P("M12 4 A8 8 0 0 1 12 20 Z", { fill: "ink" })],
  menu: [P("M4 7 H20 M4 12 H20 M4 17 H20")],
  plus: [P("M12 5 V19 M5 12 H19")],
  minus: [P("M5 12 H19")],
  drag: [
    R(7, 4, 3, 3, { fill: "ink" }),
    R(14, 4, 3, 3, { fill: "ink" }),
    R(7, 10.5, 3, 3, { fill: "ink" }),
    R(14, 10.5, 3, 3, { fill: "ink" }),
    R(7, 17, 3, 3, { fill: "ink" }),
    R(14, 17, 3, 3, { fill: "ink" }),
  ],
  warning: [P("M12 4 L21 20 H3 Z M12 10 V14"), R(11, 16, 2, 2, { fill: "ink" })],
  error: [C(12, 12, 8), P("M8 12 H16")],
  info: [C(12, 12, 8), P("M12 11 V16"), R(11, 7, 2, 2, { fill: "ink" })],
  ok: [C(12, 12, 8), P("M8 12 L11 15 L16 9")],
  keyboard: [R(3, 7, 18, 10), P("M6 10 H8 M11 10 H13 M16 10 H18 M7 14 H17")],
  command: [
    P("M9 9 H15 V15 H9 Z"),
    P("M9 9 V6 A3 3 0 1 0 6 9 H9 M15 9 V6 A3 3 0 1 1 18 9 H15 M9 15 V18 A3 3 0 1 1 6 15 H9 M15 15 V18 A3 3 0 1 0 18 15 H15"),
  ],
  return: [P("M18 6 V13 H6 M10 9 L6 13 L10 17")],
  scale: [P("M12 4 V20 M8 20 H16 M4 8 H20 M6 8 L3 14 H9 Z M18 8 L15 14 H21 Z")],
  tree: [P("M8 4 V16 H20")],
  dot: [C(12, 12, 2.5, "ink")],
  braces: [P("M9 4 H7 V10 L5 12 L7 14 V20 H9 M15 4 H17 V10 L19 12 L17 14 V20 H15")],
  select: [P("M6 4 L19 12 L12.5 13.2 L16 19.5 L13.5 20.5 L10.2 14.3 L6 18 Z")],
} satisfies Record<string, Shape[]>;

// ---- The CANVAS set ------------------------------------------------------------
//
// The ten primitives follow canvas.md § 3.1: where a glyph has a flow line it is
// the horizontal at y = 12 from x = 4 to x = 20 and part of the silhouette, so
// every substance primitive reads as "something done to a line"; the signal
// primitives (Sensing, Amplifying, Inverting, Copying) have no through line.
// These are facets drawings in the spirit of Mobus Fig. 4.5, not his printed
// iconography (the #100 honesty note). No glyph carries a substance or verdict
// colour; the Modulating triangle is a silhouette, its warm fill belongs to the
// node body if the colour sweep keeps it.

const CANVAS = {
  // two inputs merge to one output: a Y on its side, point right
  combining: [P("M4 7 L11 12 L4 17 M11 12 H20")],
  // one input forks to two outputs: the mirror, point left
  splitting: [P("M4 12 H13 M20 7 L13 12 L20 17")],
  // the through line interrupted by a bowtie valve, apexes touching at centre
  impeding: [P("M4 12 H8 M16 12 H20 M8 8 V16 L16 8 V16 Z")],
  // a line pushed onward by two chevrons
  propelling: [P("M4 12 H8 M9 8 L14 12 L9 16 M14 8 L19 12 L14 16")],
  // a drum between two stubs, with its level
  buffering: [P("M4 12 H7 M17 12 H20 M7 13 H17"), R(7, 7, 10, 10)],
  // the regulator triangle on the line (Fig. 4.17 by silhouette, not colour)
  modulating: [P("M4 12 H8.2 M15.8 12 H20 M12 5 L19 18 H5 Z")],
  // a probe and its field: a dot and two arcs
  sensing: [C(8, 12, 2, "ink"), P("M10 8.54 A4 4 0 0 1 10 15.46 M12 5.07 A8 8 0 0 1 12 18.93")],
  // gain as a staircase: three bars from one baseline
  amplifying: [P("M7 19 V15 M12 19 V11 M17 19 V7")],
  // reversal: an arrow up beside an arrow down, open heads
  inverting: [P("M9 19 V5 M5 9 L9 5 L13 9 M15 5 V19 M11 15 L15 19 L19 15")],
  // duplication: two cards, the front one on paper so it occludes the back
  copying: [R(5, 10, 9, 9), R(10, 5, 9, 9, { fill: "paper" })],

  // rule 17: the shapes carry systems meaning first
  component: [C(12, 12, 8)],
  environment: [R(4, 4, 16, 16)],
  // open means open: the square has no interior and a gap on the side that
  // faces the system (a facets drawing; Mobus Fig. 4.7 has unfilled rectangles)
  "environment-open": [P("M20 8 V4 H4 V20 H20 V16")],
  // the notch: a capsule straddling the membrane, its chevron inside
  interface: [P("M12 3 V8 M12 16 V21"), R(6, 8, 12, 8, { rx: 4, fill: "paper" }), P("M10 10 L13 12 L10 14")],
  // the one ring
  membrane: [E(12, 12, 9, 6)],
  // a flow: the line and its one-size filled head
  flow: [P("M3 12 H15"), P("M15 8 L21 12 L15 16 Z", { fill: "ink" })],
  // the management oval (Mobus ch. 11) with its dot
  agent: [E(12, 12, 8, 5), C(12, 12, 2, "ink")],
  // the four substances as small marks; the dashes match the flow strokes
  // (solid, solid, 6 4, 2 4) so a rail chip and a wire say the same thing
  matter: [C(12, 12, 4, "ink")],
  energy: [P("M13 3 L6 13 H12 L11 21 L18 11 H12 Z")],
  informational: [P("M3 12 H7 M10 12 H14 M17 12 H21")],
  field: [P("M3 12 H5 M8 12 H10 M13 12 H15 M18 12 H20")],
  // the Sandbox's source and sink: the open square with the flow stub leaving or entering
  source: [P("M3 6 H15 V18 H3 Z M15 12 H21")],
  sink: [P("M9 6 H21 V18 H9 Z M3 12 H9")],
} satisfies Record<string, Shape[]>;

// ---- The Home doors ------------------------------------------------------------
//
// Each keeps the idea of the bespoke drawing it replaces (HomeScreen.tsx):
// a boundary holding two processes and the flow between them; lines of prose and a
// checked box; a stack of saved sheets; two things and the loop that runs
// between them. No dashes anywhere in the set: square caps extend each dash by
// a stroke width, so a dash reads as solid at icon sizes (the dashed flows on
// the canvas are strokes at world scale, not icons).

const DOORS = {
  draw: [E(12, 12, 9, 7), C(8, 15, 2.5, "wash"), C(16, 9, 2.5, "wash"), P("M10 13.5 L14 10.5")],
  describe: [P("M3 6 H13 M3 10 H11 M3 14 H12 M3 18 H8"), R(14, 7, 7, 7), P("M15.5 10.5 L17.2 12.2 L20 9.2")],
  open: [R(8, 3, 12, 15, { fill: "paper" }), R(4, 6, 12, 15, { fill: "wash" }), P("M7 11 H13 M7 14 H13")],
  sandbox: [C(6, 12, 3, "wash"), C(18, 12, 3, "wash"), P("M9 8 H15 M13 6 L15 8 L13 10 M15 16 H9 M11 14 L9 16 L11 18")],
} satisfies Record<string, Shape[]>;

// ---- The table ----------------------------------------------------------------

export const ICONS = { ...UI, ...CANVAS, ...DOORS } satisfies Record<string, Shape[]>;
export type IconName = keyof typeof ICONS;

export const UI_ICONS = Object.keys(UI) as IconName[];
export const CANVAS_ICONS = Object.keys(CANVAS) as IconName[];
export const DOOR_ICONS = Object.keys(DOORS) as IconName[];
export const ICON_NAMES = Object.keys(ICONS) as IconName[];

/** The primitive's icon: the kernel's word, lowercased. Kept as a table so a
 *  renamed primitive fails to compile here instead of drawing nothing. */
export const PRIMITIVE_ICON: Record<ProcessPrimitive, IconName> = {
  Combining: "combining",
  Splitting: "splitting",
  Buffering: "buffering",
  Impeding: "impeding",
  Propelling: "propelling",
  Copying: "copying",
  Sensing: "sensing",
  Modulating: "modulating",
  Amplifying: "amplifying",
  Inverting: "inverting",
};

// ---- Rendering -----------------------------------------------------------------

/** Where a drawing lands: the 24 grid as drawn (`origin` 12, `scale` 1), or
 *  the lenses' ±6 box (`origin` 0, `scale` 0.5). `paper` is what a `paper`
 *  fill resolves to on that surface. */
export interface Box {
  origin: number;
  scale: number;
  paper: string;
}

export const GRID: Box = { origin: 12, scale: 1, paper: "var(--bg-primary)" };

const WASH = "var(--accent-soft)";

const fillOf = (f: Fill | undefined, box: Box): string | undefined =>
  f === "ink" ? "currentColor" : f === "paper" ? box.paper : f === "wash" ? WASH : undefined;

const fmt = (v: number) => String(Math.round(v * 1000) / 1000);

/** Map an absolute-command path (M L H V A Z, the only commands the set uses)
 *  into a box. Arc radii scale; arc flags and rotation do not. */
export function mapPath(d: string, box: Box): string {
  const m = (v: number) => box.origin + (v - 12) * box.scale;
  const s = (v: number) => v * box.scale;
  const tokens = d.match(/[MLHVAZ]|-?\d*\.?\d+/g) ?? [];
  const out: string[] = [];
  let cmd = "";
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MLHVAZ]/.test(t)) {
      cmd = t;
      out.push(t);
      i += 1;
      continue;
    }
    const n = (k: number) => Number(tokens[i + k]);
    switch (cmd) {
      case "M":
      case "L":
        out.push(fmt(m(n(0))), fmt(m(n(1))));
        i += 2;
        break;
      case "H":
      case "V":
        out.push(fmt(m(n(0))));
        i += 1;
        break;
      case "A":
        out.push(fmt(s(n(0))), fmt(s(n(1))), fmt(n(2)), fmt(n(3)), fmt(n(4)), fmt(m(n(5))), fmt(m(n(6))));
        i += 7;
        break;
      default:
        throw new Error(`icons: unsupported path token "${t}" in "${d}"`);
    }
  }
  return out.join(" ");
}

/** The shapes of a glyph as SVG elements in a box. Stroke attributes are NOT
 *  set here: the caller's wrapper carries them (Icon sets the grammar; the
 *  canvas lenses set their own scaled stroke). A solid sets its own fill and
 *  drops its stroke; an occluding paper fill keeps the stroke. */
export function renderShapes(shapes: readonly Shape[], box: Box = GRID): ReactNode {
  const m = (v: number) => box.origin + (v - 12) * box.scale;
  const s = (v: number) => v * box.scale;
  return shapes.map((sh, i) => {
    const fill = fillOf(sh.fill, box);
    const solid = sh.fill === "ink";
    const attrs = { fill: fill ?? "none", stroke: solid ? "none" : undefined };
    switch (sh.k) {
      case "path":
        return <path key={i} {...attrs} d={mapPath(sh.d, box)} />;
      case "circle":
        return <circle key={i} {...attrs} cx={m(sh.cx)} cy={m(sh.cy)} r={s(sh.r)} />;
      case "ellipse":
        return <ellipse key={i} {...attrs} cx={m(sh.cx)} cy={m(sh.cy)} rx={s(sh.rx)} ry={s(sh.ry)} />;
      case "rect":
        return (
          <rect
            key={i}
            {...attrs}
            x={m(sh.x)}
            y={m(sh.y)}
            width={s(sh.w)}
            height={s(sh.h)}
            rx={sh.rx === undefined ? undefined : s(sh.rx)}
          />
        );
    }
  });
}

export type IconSize = 16 | 20 | 24 | 32;

export interface IconProps {
  name: IconName;
  /** 16 inline and standalone, 20 in a 32px rail square, 24 and 32 for doors and heroes. */
  size?: IconSize;
  /** An accessible name. Given, the icon is `role="img"` with a <title>;
   *  absent, it is decorative (`aria-hidden`) and the control's text names it. */
  title?: string;
  className?: string;
  style?: CSSProperties;
}

/** One drawn icon on the 24 grid. Colour is currentColor: the parent sets it
 *  with a token. Stroke 2, square caps, mitre joins, fill none unless a shape
 *  declares one. */
export function Icon({ name, size = 16, title, className, style }: IconProps) {
  const shapes = ICONS[name];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
      strokeMiterlimit={10}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={className}
      style={style}
      data-icon={name}
    >
      {title ? <title>{title}</title> : null}
      {renderShapes(shapes, GRID)}
    </svg>
  );
}
