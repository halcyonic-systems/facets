// Scaffolding shared by every lens's stateless renderers. NONE of this decides
// a systems fact — the per-lens views (klir/bunge/mobus) resolve which kernel
// verdict drives which visual and hand the resolved styling + accents here.
// `NodeBody` draws the shared node chrome; `EdgeScaffold` draws the shared edge
// plumbing (hit-path, selection, segments, drive dot, sim readout).
import type { ProcessPrimitive } from "../../kernel/types";
import { PRIMITIVE_BADGE } from "../types";
import { humanize } from "../../ui";
import { NODE_R, type Pt } from "../geometry";
import { STYLE } from "../style";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

// ---- The node shape alphabet -------------------------------------------------
// Exactly three closed glyphs carry role across the lenses: circle (component),
// square (environment object), triangle (Mobus regulator). Every finer
// distinction stays a marking (rim accent, badge, port notch), never a fourth
// shape. The glyphs are drawn to equal visual WEIGHT, not equal bounding box —
// a full-side square reads heavier than the circle and an inscribed triangle
// lighter, so each is scaled to parity.
export type NodeShape = "circle" | "square" | "triangle";

const SQUARE_HALF = NODE_R * 0.9;
const TRI_R = NODE_R * 1.15;
const TRI_CORNER = TRI_R * 0.16;

// Equilateral, apex up, centroid at the origin.
const TRI_PTS: Pt[] = [-90, 30, 150].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return { x: TRI_R * Math.cos(a), y: TRI_R * Math.sin(a) };
});

// Vertical extent + half-width per glyph — drives the sim-fill clip so a stock
// fills from its own base rather than a circle's.
const SHAPE_BOX: Record<NodeShape, { top: number; bottom: number; halfW: number }> = {
  circle: { top: -NODE_R, bottom: NODE_R, halfW: NODE_R },
  square: { top: -SQUARE_HALF, bottom: SQUARE_HALF, halfW: SQUARE_HALF },
  triangle: { top: -TRI_R, bottom: TRI_R / 2, halfW: (TRI_R * Math.sqrt(3)) / 2 },
};

function unitFrom(to: Pt, from: Pt): Pt {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** A closed polygon path with each corner rounded by `r` (quadratic corners). */
function roundedPolygon(pts: Pt[], r: number): string {
  const n = pts.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const cur = pts[i];
    const toPrev = unitFrom(pts[(i - 1 + n) % n], cur);
    const toNext = unitFrom(pts[(i + 1) % n], cur);
    const a = { x: cur.x + toPrev.x * r, y: cur.y + toPrev.y * r };
    const b = { x: cur.x + toNext.x * r, y: cur.y + toNext.y * r };
    d += `${i === 0 ? "M" : "L"} ${a.x.toFixed(2)} ${a.y.toFixed(2)} Q ${cur.x.toFixed(2)} ${cur.y.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)} `;
  }
  return `${d}Z`;
}

interface GlyphProps {
  fill: string;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  fillOpacity?: number;
  clipPath?: string;
}

/** The node body glyph — the single place the shape alphabet is drawn to SVG. */
function bodyGlyph(shape: NodeShape, props: GlyphProps): ReactNode {
  if (shape === "square") {
    return (
      <rect x={-SQUARE_HALF} y={-SQUARE_HALF} width={SQUARE_HALF * 2} height={SQUARE_HALF * 2} rx={STYLE.squareRx} strokeLinejoin="round" {...props} />
    );
  }
  if (shape === "triangle") {
    return <path d={roundedPolygon(TRI_PTS, TRI_CORNER)} strokeLinejoin="round" {...props} />;
  }
  return <circle r={NODE_R} {...props} />;
}

/** Resolved per-lens stroke styling for a visible edge path. */
export interface EdgeStyle {
  color: string;
  width: number;
  dash?: string;
  opacity: number;
  filter?: string;
}

interface NodeBodyProps {
  thing: { id: number; x: number; y: number; name: string };
  hovered: boolean;
  sim?: { value: number; unit: string; frac: number };
  onPointerDown: (e: ReactPointerEvent) => void;
  onHandlePointerDown: (e: ReactPointerEvent) => void;
  /** The node body glyph. Klir keeps every thing a circle (its deliberate
   *  flattening); Bunge/Mobus draw env objects as squares; Mobus draws the
   *  regulator primitive as a triangle. The alphabet is exactly these three. */
  shape: NodeShape;
  /** Bunge/Mobus composition halo (the C/E wash); a set partition, not a ring. */
  showHalo: boolean;
  /** Mobus env sources/sinks are open unfilled shapes (epistemically unknowable). */
  envOpen: boolean;
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  /** Mobus process-primitive badge (undefined for Klir/Bunge). */
  badge?: ProcessPrimitive;
  /** Klir recesses labels (thinghood taken for granted; the relation is salient). */
  labelSmall: boolean;
  /** Bunge marks boundary components with a rim accent (kernel `isBoundary`). */
  boundaryRim: boolean;
  /** Kernel `orphan_env_thing_ids`: an env thing no bond touches — not yet in ℰ
   *  (Bunge Def 1.2 ii), dropped by project(). Rendered muted, never hidden. */
  pending?: boolean;
}

/** The node chrome common to every lens — the per-lens views resolve the style
 *  knobs above from kernel facts (role, primitive, boundary membership). */
export function NodeBody({
  thing,
  hovered,
  sim,
  onPointerDown,
  onHandlePointerDown,
  shape,
  showHalo,
  envOpen,
  stroke,
  strokeOpacity,
  strokeWidth,
  badge,
  labelSmall,
  boundaryRim,
  pending = false,
}: NodeBodyProps) {
  const frac = sim ? Math.max(0, Math.min(1, sim.frac)) : null;
  const clipId = `fill-clip-${thing.id}`;

  return (
    <g
      transform={`translate(${thing.x}, ${thing.y})`}
      onPointerDown={onPointerDown}
      className="cursor-grab"
      opacity={pending ? 0.5 : 1}
    >
      {pending && <title>not yet in ℰ — no bond touches this thing (Bunge Def 1.2 ii); connect a flow to admit it</title>}
      {showHalo && (
        <circle r={NODE_R + STYLE.compHalo.pad} fill="var(--lens-accent-soft)" opacity={STYLE.compHalo.opacity} />
      )}
      {hovered && (
        <circle
          data-export-ignore
          r={NODE_R + STYLE.hoverHalo.pad}
          fill="none"
          stroke="var(--lens-accent)"
          strokeWidth={STYLE.hoverHalo.width}
        />
      )}

      {/* Bunge 1992: boundary components are MARKED (a rim accent on the nodes
          directly coupled to E), never a drawn perimeter. The same set Mobus
          reifies into ports — toggle the lens and watch it accrete. */}
      {boundaryRim && (
        <circle
          r={NODE_R + STYLE.boundaryRim.pad}
          fill="none"
          stroke="var(--lens-accent)"
          strokeWidth={STYLE.boundaryRim.width}
          strokeOpacity={STYLE.boundaryRim.opacity}
        />
      )}

      {/* the sim payoff: a stock fills/drains from its own base as the scrubber
          indexes ticks — the clip spans this glyph's extent, not a circle's. */}
      {frac !== null && (
        <>
          <clipPath id={clipId}>
            <rect
              x={-SHAPE_BOX[shape].halfW}
              y={SHAPE_BOX[shape].bottom - (SHAPE_BOX[shape].bottom - SHAPE_BOX[shape].top) * frac}
              width={SHAPE_BOX[shape].halfW * 2}
              height={(SHAPE_BOX[shape].bottom - SHAPE_BOX[shape].top) * frac}
            />
          </clipPath>
          {bodyGlyph(shape, {
            fill: "var(--accent)",
            fillOpacity: STYLE.simFillOpacity,
            clipPath: `url(#${clipId})`,
          })}
        </>
      )}

      {bodyGlyph(shape, {
        fill: envOpen ? "none" : STYLE.nodeFill,
        stroke,
        strokeOpacity,
        strokeWidth,
        fillOpacity: frac !== null ? 0 : 1,
      })}

      {badge && (
        <g transform={`translate(${NODE_R * 0.72}, ${-NODE_R * 0.72})`}>
          {STYLE.badge.form === "filled" && <circle r={STYLE.badge.r} fill="var(--lens-accent)" />}
          {STYLE.badge.form === "outline" && (
            <circle
              r={STYLE.badge.r}
              fill={STYLE.nodeFill}
              stroke="var(--lens-accent)"
              strokeWidth={STYLE.badge.strokeWidth}
            />
          )}
          {STYLE.badge.form === "corner" && (
            <rect
              x={-STYLE.badge.r}
              y={-STYLE.badge.r}
              width={STYLE.badge.r * 2}
              height={STYLE.badge.r * 2}
              rx={1}
              fill={STYLE.nodeFill}
              stroke="var(--lens-accent)"
              strokeWidth={STYLE.badge.strokeWidth}
            />
          )}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fill={STYLE.badge.form === "filled" ? "white" : "var(--lens-accent)"}
            className="font-mono"
          >
            {PRIMITIVE_BADGE[badge]}
          </text>
        </g>
      )}

      {sim && (
        <text
          y={-NODE_R - 10}
          textAnchor="middle"
          fontSize={STYLE.simReadoutSize}
          fill="var(--accent-strong)"
          className="font-mono tabular pointer-events-none"
        >
          {humanize(sim.value)} {sim.unit}
        </text>
      )}

      <text
        y={NODE_R + 16}
        textAnchor="middle"
        fontSize={labelSmall ? STYLE.label.smallSize : STYLE.label.size}
        fill={labelSmall ? "var(--text-muted)" : STYLE.label.fill}
        letterSpacing={STYLE.label.tracking}
        className={`${STYLE.label.mono ? "font-mono" : "font-body"} pointer-events-none`}
      >
        {STYLE.label.uppercase ? thing.name.toUpperCase() : thing.name}
      </text>

      <circle
        cx={NODE_R * 0.75}
        cy={NODE_R * 0.75}
        r={STYLE.handle.r}
        fill="var(--bg-primary)"
        stroke="var(--lens-accent)"
        strokeWidth={STYLE.handle.width}
        className="cursor-crosshair"
        onPointerDown={onHandlePointerDown}
      />
    </g>
  );
}

interface EdgeScaffoldProps {
  /** The full-length path `d` — the click target and the selection halo. */
  d: string;
  labelAt: Pt;
  style: EdgeStyle;
  /** Mobus routes exo flows through a muted interior segment; other lenses pass null. */
  interior: string | null;
  /** The drawn segments (one for most edges; the crossing segment for Mobus exo). */
  visible: { d: string; markered: boolean }[];
  selected: boolean;
  driven: boolean;
  sim?: { value: number; unit: string };
  relationId: number;
  onSelect?: (id: number) => void;
  /** Per-lens badge overlays (e.g. Bunge's ⊘M no-Mobus-preimage mark). */
  overlay?: ReactNode;
  /** The per-lens edge label (Klir signature vs Bunge/Mobus flow name). */
  label?: ReactNode;
}

/** The edge plumbing common to every lens — hit target, selection halo, muted
 *  interior, drawn segments, drive dot, and sim readout. The per-lens views
 *  supply the resolved style, routing, label, and any badge overlays. */
export function EdgeScaffold({
  d,
  labelAt,
  style,
  interior,
  visible,
  selected,
  driven,
  sim,
  relationId,
  onSelect,
  overlay,
  label,
}: EdgeScaffoldProps) {
  return (
    <g>
      {/* invisible wide hit-path — the click target for "drive this flow" */}
      <path
        data-export-ignore
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: onSelect ? "pointer" : "default" }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(relationId);
        }}
      />
      {selected && (
        <path
          data-export-ignore
          d={d}
          fill="none"
          stroke="var(--lens-accent)"
          strokeWidth={STYLE.selection.width}
          strokeOpacity={STYLE.selection.opacity}
          pointerEvents="none"
        />
      )}
      {interior && (
        <path
          d={interior}
          fill="none"
          stroke={style.color}
          strokeOpacity={0.3}
          strokeWidth={1.25}
          strokeDasharray="4 4"
          pointerEvents="none"
        />
      )}
      {visible.map((seg, i) => (
        <path
          key={i}
          d={seg.d}
          fill="none"
          stroke={style.color}
          strokeOpacity={style.opacity}
          strokeWidth={style.width}
          strokeDasharray={style.dash}
          filter={style.filter}
          markerEnd={seg.markered ? "url(#arrow)" : undefined}
          pointerEvents="none"
        />
      ))}
      {driven && <circle cx={labelAt.x} cy={labelAt.y - 6} r={4} fill="var(--accent)" pointerEvents="none" />}
      {overlay}
      {label}
      {sim && (
        <text
          x={labelAt.x}
          y={labelAt.y + 14}
          textAnchor="middle"
          fontSize={10}
          fill="var(--accent-strong)"
          className="font-mono tabular pointer-events-none"
        >
          {humanize(sim.value)} {sim.unit}
        </text>
      )}
    </g>
  );
}

/** Klir and Bunge have no ports — their boundary is a distinction / a marked
 *  component-subset, never a reified interface. Registered so the lens table
 *  stays total; never actually invoked (only Mobus builds a port set). */
export function NullPortView(): null {
  return null;
}
