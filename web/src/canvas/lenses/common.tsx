// Scaffolding shared by every lens's stateless renderers. NONE of this decides
// a systems fact — the per-lens views (klir/bunge/mobus) resolve which kernel
// verdict drives which visual and hand the resolved styling + accents here.
// `NodeBody` draws the shared node chrome; `EdgeScaffold` draws the shared edge
// plumbing (hit-path, selection, segments, drive dot, sim readout).
import type { CanvasRole, EnvKind, ProcessPrimitive } from "../../kernel/types";
import { primitiveGlyph } from "./primitive-glyphs";
import { humanize } from "../../ui";
import { NODE_R, type Pt } from "../geometry";
import { STYLE } from "../style";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";
import { useState } from "react";

/** Resolved per-lens stroke styling for a visible edge path. */
export interface EdgeStyle {
  color: string;
  width: number;
  dash?: string;
  opacity: number;
  filter?: string;
}

interface NodeBodyProps {
  /** role/env_kind feed the run-time role grammar (source = emitter, never a
   *  fill); optional so glyph-only callers stay valid. */
  thing: { id: number; x: number; y: number; name: string; role?: CanvasRole; env_kind?: EnvKind };
  hovered: boolean;
  sim?: { value: number; unit: string; frac: number };
  onPointerDown: (e: ReactPointerEvent) => void;
  onHandlePointerDown: (e: ReactPointerEvent) => void;
  /** Env objects render as squares under Mobus only; Klir and Bunge keep every
   *  thing the same shape (Bunge's env is the same kind of entity, one level up). */
  isSquare: boolean;
  /** Bunge/Mobus composition halo (the C/E wash); a set partition, not a ring. */
  showHalo: boolean;
  /** Mobus env sources/sinks are open unfilled shapes (out of scope at this bounding — flows only, by choice). */
  envOpen: boolean;
  /** Mobus components carry the "work sphere" sheen of the house drawings (Fig. 4.5). */
  sphere?: boolean;
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  /** Mobus process-primitive badge (undefined for Klir/Bunge). */
  badge?: ProcessPrimitive;
  /** Mobus only (#100 phase 4, #81 harvest): draw the primitive glyph AT THE
   *  CENTER of the body — the component IS the process — instead of the
   *  corner medallion. Default false keeps the corner-badge rendering, so
   *  Klir/Bunge output is untouched (they never pass a badge anyway). */
  badgeCentered?: boolean;
  /** Mobus only (#100 phase 4): render the body as the decision/regulator
   *  triangle — the one shape Mobus reserves for a process sub-kind (his
   *  Fig 4.17, drawn warm). No Klir/Bunge analog exists by design; neither
   *  lens ever sets this. */
  regulatorTriangle?: boolean;
  /** Klir recesses labels (thinghood taken for granted; the relation is salient). */
  labelSmall: boolean;
  /** Bunge marks boundary components with a rim accent (kernel `isBoundary`). */
  boundaryRim: boolean;
  /** Kernel `orphan_env_thing_ids`: an env thing no bond touches — not yet in ℰ
   *  (Bunge Def 1.2 ii), dropped by project(). Rendered muted, never hidden. */
  pending?: boolean;
  /** #180 fix 3 (Option 1): Environment-role things drag freely across the
   *  hull with no effect — the hull is computed from role, not position (see
   *  geometry.ts componentRing / Canvas.tsx C ∩ E = ∅). Purely informational;
   *  no drag/drop behavior changes. Mobus + Bunge only (both compute a hull
   *  from role) — Klir has no C/E hull, so it never sets this. */
  envHint?: boolean;
  /** Bunge only (#100 phase 2): render the sim value as a POSITION in state
   *  space (a marker on an axis beside the thing — his Fig 1.5 register), not
   *  as the tank-level disc fill (a Mobus stock metaphor). Default false, so
   *  Klir/Mobus output is unchanged. */
  simPosition?: boolean;
}

// The regulator triangle (Mobus Fig 4.17), apex up, circumradius optically
// enlarged 1.15× so it reads the same visual weight as the circle (#81 V2
// harvest: optical-sizing constants — triangles read smaller than their box).
// The centered process glyph's share of the node radius. Sized so the glyph
// reads as the body's face while the circle still breathes around it — the
// phase-4 beauty pass called 0.62 a touch large.
const GLYPH_FRAC = 0.56;

const TRI_R = NODE_R * 1.15;
const TRI_HALF_W = TRI_R * 0.866;
const TRI_BOT = TRI_R * 0.5;
const TRI_PATH = `M 0 ${-TRI_R} L ${TRI_HALF_W} ${TRI_BOT} L ${-TRI_HALF_W} ${TRI_BOT} Z`;

/** The node chrome common to every lens — the per-lens views resolve the style
 *  knobs above from kernel facts (role, primitive, boundary membership). */
export function NodeBody({
  thing,
  hovered,
  sim,
  onPointerDown,
  onHandlePointerDown,
  isSquare,
  showHalo,
  envOpen,
  sphere = false,
  stroke,
  strokeOpacity,
  strokeWidth,
  badge,
  badgeCentered = false,
  regulatorTriangle = false,
  labelSmall,
  boundaryRim,
  pending = false,
  simPosition = false,
  envHint = false,
}: NodeBodyProps) {
  const frac = sim ? Math.max(0, Math.min(1, sim.frac)) : null;
  const clipId = `fill-clip-${thing.id}`;
  const [selfHover, setSelfHover] = useState(false);
  // Run-time role grammar (walkthrough #8): a SOURCE emits, it never fills.
  // The per-node min-max normalization renders a constant emitter as a
  // half-full box and a forced one as a filling stock — both lies. Sources
  // get an outward pulse instead; sinks and stocks keep the fill, which for
  // them is the truth (accumulation / level).
  const emitter = thing.role === "Environment" && thing.env_kind === "Source";
  // Vertical extents of the body shape — the sim fill's clip rises bottom-up
  // between them, so the triangle drains/fills over ITS height, not the circle's.
  const [shapeTop, shapeBot] = regulatorTriangle ? [-TRI_R, TRI_BOT] : [-NODE_R, NODE_R];
  const shapeH = shapeBot - shapeTop;

  return (
    <g
      transform={`translate(${thing.x}, ${thing.y})`}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setSelfHover(true)}
      onMouseLeave={() => setSelfHover(false)}
      className="cursor-grab"
      opacity={pending ? 0.5 : 1}
    >
      {pending && <title>not yet in ℰ — no bond touches this thing (Bunge Def 1.2 ii); connect a flow to admit it</title>}
      {!pending && envHint && (
        <title>Environment role — membership is set by role, not position. Change it in the node editor.</title>
      )}
      {/* Invisible padded hit disc — the grab/click target extends past the
          drawn glyph (walkthrough #14: bodies were exactly their ink, small at
          fitted zoom). First child so every visible layer draws over it. */}
      <circle data-export-ignore r={NODE_R + 10} fill="transparent" />
      {/* Plain-hover halo — clickable-affordance feedback, softer than the
          connect-drag target halo (`hovered`) so the two meanings stay apart. */}
      {selfHover && !hovered && (
        <circle
          data-export-ignore
          r={NODE_R + STYLE.hoverHalo.pad}
          fill="none"
          stroke="var(--lens-accent)"
          strokeWidth={STYLE.hoverHalo.width}
          strokeOpacity={0.35}
        />
      )}
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

      {/* Bunge's dynamics register is the STATE SPACE (Fig 1.5): the value is a
          position on an axis of the thing's state, not a level in a tank — so
          under Bunge the readout is a marker on a state axis beside the node.
          Static by design (#100 phase 2 / F4): the trajectory h(x) through
          this space and the lawful region S_L(K) are the compose seam's scope
          (a recorded run IS a trajectory — H = History) and are deliberately
          not drawn here. */}
      {simPosition && frac !== null && (
        <g pointerEvents="none">
          <title>position in the thing&apos;s state space (Bunge Fig 1.5) — the trajectory h(x) arrives with the compose seam</title>
          <line
            x1={NODE_R + 10}
            y1={-NODE_R}
            x2={NODE_R + 10}
            y2={NODE_R}
            stroke="var(--hairline)"
            strokeWidth={1}
          />
          {[-NODE_R, NODE_R].map((y) => (
            <line key={y} x1={NODE_R + 7.5} y1={y} x2={NODE_R + 12.5} y2={y} stroke="var(--hairline)" strokeWidth={1} />
          ))}
          <circle cx={NODE_R + 10} cy={NODE_R - 2 * NODE_R * frac} r={3} fill="var(--accent)" />
        </g>
      )}

      {/* An emitting source radiates — two staggered rings, the run-time face
          of "this node produces flow; it holds nothing". */}
      {emitter && frac !== null && !simPosition && (
        <g data-export-ignore pointerEvents="none">
          {[0, 1].map((i) => (
            <circle key={i} r={NODE_R} fill="none" stroke="var(--accent)" strokeWidth={1.5}>
              <animate
                attributeName="r"
                values={`${NODE_R};${NODE_R + 16}`}
                dur="2.4s"
                begin={`${i * 1.2}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-opacity"
                values="0.55;0"
                dur="2.4s"
                begin={`${i * 1.2}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </g>
      )}

      {/* the sim payoff: a stock's disc fills/drains as the scrubber indexes ticks */}
      {!simPosition && frac !== null && !emitter && (
        <>
          <clipPath id={clipId}>
            <rect x={-TRI_HALF_W} y={shapeBot - shapeH * frac} width={TRI_HALF_W * 2} height={shapeH * frac} />
          </clipPath>
          {regulatorTriangle ? (
            <path d={TRI_PATH} fill="var(--accent)" opacity={STYLE.simFillOpacity} clipPath={`url(#${clipId})`} />
          ) : isSquare ? (
            <rect
              x={-NODE_R}
              y={-NODE_R}
              width={NODE_R * 2}
              height={NODE_R * 2}
              rx={STYLE.squareRx}
              fill="var(--accent)"
              opacity={STYLE.simFillOpacity}
              clipPath={`url(#${clipId})`}
            />
          ) : (
            <circle r={NODE_R} fill="var(--accent)" opacity={STYLE.simFillOpacity} clipPath={`url(#${clipId})`} />
          )}
        </>
      )}

      {regulatorTriangle ? (
        /* Mobus Fig 4.17: the decision/regulator process is the ONE process
           sub-kind the house tradition gives its own shape — a warm triangle.
           The body IS the primitive here, so no glyph repeats it. */
        <path
          data-node-shape="triangle"
          d={TRI_PATH}
          fill="color-mix(in srgb, var(--verdict-warning) 16%, var(--bg-secondary))"
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          fillOpacity={frac !== null && !simPosition && !emitter ? 0 : 1}
        >
          <title>decision ⁄ regulator — a modulating work process (Mobus Fig 4.17)</title>
        </path>
      ) : isSquare ? (
        <rect
          x={-NODE_R}
          y={-NODE_R}
          width={NODE_R * 2}
          height={NODE_R * 2}
          rx={STYLE.squareRx}
          fill={envOpen ? "none" : STYLE.nodeFill}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          fillOpacity={frac !== null && !simPosition && !emitter ? 0 : 1}
        />
      ) : (
        <circle
          r={NODE_R}
          fill={sphere ? "url(#mobus-sphere)" : STYLE.nodeFill}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          fillOpacity={frac !== null && !simPosition && !emitter ? 0 : 1}
        />
      )}

      {/* Process-primitive glyph, centered (#100 phase 4, #81 harvest): the
          component IS the process, so the glyph is the body's face — not a
          corner medallion on an otherwise empty circle. The glyphs are a
          bert-lenses stroke family in Mobus's spirit, not his printed icons. */}
      {badge && badgeCentered && (
        <g
          data-glyph="centered"
          transform={`scale(${(NODE_R * GLYPH_FRAC) / 6})`}
          style={{ color: "var(--lens-accent)" }}
          fill="none"
          stroke="var(--lens-accent)"
          strokeWidth={2.1 / ((NODE_R * GLYPH_FRAC) / 6)}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        >
          <title>{`work process: ${badge.toLowerCase()}`}</title>
          {primitiveGlyph(badge)}
        </g>
      )}

      {/* Corner-medallion badge — the pre-phase-4 form, kept for any caller
          that wants the annotation reading rather than the glyph-first one. */}
      {badge && !badgeCentered && (
        <g transform={`translate(${NODE_R * 0.72}, ${-NODE_R * 0.72})`}>
          <circle
            r={STYLE.badge.r}
            fill={STYLE.nodeFill}
            stroke="var(--lens-accent)"
            strokeWidth={STYLE.badge.strokeWidth}
          />
          <g
            transform={`scale(${(STYLE.badge.r * 0.8) / 6})`}
            style={{ color: "var(--lens-accent)" }}
            fill="none"
            stroke="var(--lens-accent)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {primitiveGlyph(badge)}
          </g>
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
  /** Availability assertion (#9): the edge carries "enough", not a number —
   *  the readout says the word instead of a quantity. */
  ample?: boolean;
  relationId: number;
  onSelect?: (id: number) => void;
  /** Per-lens badge overlays (e.g. Bunge's ⊘M no-Mobus-preimage mark). */
  overlay?: ReactNode;
  /** The per-lens edge label (Klir signature vs Bunge/Mobus flow name). */
  label?: ReactNode;
  /** Hover copy on the edge's hit path (e.g. Bunge's channel vocabulary,
   *  #100 phase 2 F6). Omitted by Klir/Mobus — their output is unchanged. */
  title?: string;
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
  ample,
  relationId,
  onSelect,
  overlay,
  label,
  title,
}: EdgeScaffoldProps) {
  const [hover, setHover] = useState(false);
  return (
    <g>
      {/* Invisible wide hit-path — the click target for "drive this flow".
          non-scaling-stroke keeps the target 18 SCREEN px at any zoom: a fitted
          big model halves the world scale, and a world-space target halves with
          it, which is how flows got "hard to click" (walkthrough #14). Hit
          testing follows the rendered stroke, so the effect applies to clicks. */}
      <path
        data-export-ignore
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        vectorEffect="non-scaling-stroke"
        style={{ cursor: onSelect ? "pointer" : "default" }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(relationId);
        }}
      >
        {title && <title>{title}</title>}
      </path>
      {/* Hover feedback — the affordance that tells the reader this is
          clickable BEFORE they commit; softer than selection so the two states
          stay distinct. */}
      {hover && !selected && onSelect && (
        <path
          data-export-ignore
          d={d}
          fill="none"
          stroke="var(--lens-accent)"
          strokeWidth={STYLE.selection.width}
          strokeOpacity={STYLE.selection.opacity * 0.45}
          pointerEvents="none"
        />
      )}
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
      {ample ? (
        <text
          x={labelAt.x}
          y={labelAt.y + 14}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-muted)"
          fontStyle="italic"
          className="font-body pointer-events-none"
        >
          ample
        </text>
      ) : (
        sim && (
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
        )
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
