// Scaffolding shared by every lens's stateless renderers. NONE of this decides
// a systems fact — the per-lens views (klir/bunge/mobus) resolve which kernel
// verdict drives which visual and hand the resolved styling + accents here.
// `NodeBody` draws the shared node chrome; `EdgeScaffold` draws the shared edge
// plumbing (hit-path, selection, segments, drive dot, sim readout).
import type { ProcessPrimitive } from "../../kernel/types";
import { primitiveGlyph } from "./primitive-glyphs";
import { humanize } from "../../ui";
import { NODE_R, type Pt } from "../geometry";
import { STYLE } from "../style";
import type { ReactNode, PointerEvent as ReactPointerEvent } from "react";

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
  isSquare,
  showHalo,
  envOpen,
  sphere = false,
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

      {/* the sim payoff: a stock's disc fills/drains as the scrubber indexes ticks */}
      {frac !== null && (
        <>
          <clipPath id={clipId}>
            <rect x={-NODE_R} y={NODE_R - 2 * NODE_R * frac} width={NODE_R * 2} height={2 * NODE_R * frac} />
          </clipPath>
          {isSquare ? (
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

      {isSquare ? (
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
          fillOpacity={frac !== null ? 0 : 1}
        />
      ) : (
        <circle
          r={NODE_R}
          fill={sphere ? "url(#mobus-sphere)" : STYLE.nodeFill}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          fillOpacity={frac !== null ? 0 : 1}
        />
      )}

      {/* Process-primitive badge — a drawn Mobus icon (Fig. 4.5) on a surface
          medallion, so every primitive reads as one hand. Modulating carries its
          own warm fill (the regulator, Fig. 4.17); the rest inherit the accent. */}
      {badge && (
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
