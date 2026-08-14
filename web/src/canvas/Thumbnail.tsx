// #311: a model rendered as a small diagram of itself, so the library reads as
// a plate of specimens rather than a list of names — "a reader should recognise
// a model by its shape before reading its title."
//
// It draws from the SAME geometry the canvas uses (contentBounds, fitToBox,
// membraneRing, edgeGeometry), so a thumbnail is the model's own projection at
// small scale and not a hand-drawn icon that can drift from it. What it does
// NOT do is mount the interactive canvas: no gestures, no lens registry, no
// kernel facts, no state. Everything ontology-bearing — ports, boundary
// identity, the edge ladder — is deliberately absent, because at 40px it would
// be noise, and because reading a kernel verdict here would make this a second
// place where a systems fact is decided.
import type { CanvasModel } from "../kernel/types";
import { KIND_COLOR } from "./types";
import { contentBounds, fitToBox, membraneRing } from "./geometry";

/** Node radius as drawn in the thumbnail, in SCREEN px after the fit. Nodes are
 *  drawn at a fixed size rather than scaled with the model: a 3-node model and a
 *  30-node model should read as the same KIND of drawing, and scaling the dots
 *  would make the small model look like a different species. */
const DOT_R = 2.4;

export interface ThumbnailProps {
  model: CanvasModel;
  /** Square edge in px. The library gutter is 3rem. */
  size?: number;
}

/** A small, static diagram of a model. Pure: same model in, same SVG out. */
export default function Thumbnail({ model, size = 40 }: ThumbnailProps) {
  const box = contentBounds(model);
  // An empty model is not an error and not a placeholder glyph — it is simply
  // nothing to draw, and the row falls back to its folio numeral.
  if (!box) return null;

  const { pan, scale } = fitToBox(box, size, size, { pad: DOT_R + 2, minScale: 0, maxScale: 8 });
  const to = (p: { x: number; y: number }) => ({ x: p.x * scale + pan.x, y: p.y * scale + pan.y });
  const ring = model.lens === "Mobus" ? membraneRing(model.things) : null;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      focusable="false"
      style={{ overflow: "visible" }}
    >
      {ring && (
        <ellipse
          cx={ring.cx * scale + pan.x}
          cy={ring.cy * scale + pan.y}
          rx={ring.rx * scale}
          ry={ring.ry * scale}
          fill="none"
          stroke="var(--ink-muted)"
          strokeOpacity={0.35}
          strokeWidth={0.6}
        />
      )}
      {model.relations.map((r) => {
        // Centre-to-centre chords, not the canvas's rim-to-rim beziers: at 40px
        // a bow is invisible and the rim inset eats most of the line. The
        // FRAMING still comes from the canvas (contentBounds + fitToBox), which
        // is what keeps a thumbnail recognisable as the model you then open.
        const from = model.things.find((t) => t.id === r.a);
        const toThing = model.things.find((t) => t.id === r.b);
        if (!from || !toThing) return null;
        const a = to(from);
        const b = to(toThing);
        return (
          <line
            key={r.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={r.is_bond ? KIND_COLOR[r.kind] : "var(--ink-muted)"}
            strokeOpacity={r.is_bond ? 0.75 : 0.35}
            strokeWidth={0.7}
          />
        );
      })}
      {model.things.map((t) => {
        const p = to(t);
        // The one distinction worth keeping at this size is inside/outside —
        // it is the shape difference a reader already knows from the canvas
        // (env objects are squares under Mobus), and it is what makes a
        // boundary-heavy model look different from an interior-heavy one.
        return t.role === "Environment" ? (
          <rect
            key={t.id}
            x={p.x - DOT_R}
            y={p.y - DOT_R}
            width={DOT_R * 2}
            height={DOT_R * 2}
            fill="none"
            stroke="var(--ink-secondary)"
            strokeWidth={0.8}
          />
        ) : (
          <circle key={t.id} cx={p.x} cy={p.y} r={DOT_R} fill="var(--ink-secondary)" />
        );
      })}
    </svg>
  );
}
