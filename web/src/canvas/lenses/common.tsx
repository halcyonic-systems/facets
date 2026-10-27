// Scaffolding shared by every lens's stateless renderers. NONE of this decides
// a systems fact — the per-lens views (klir/bunge/mobus) resolve which kernel
// verdict drives which visual and hand the resolved styling + accents here.
// `NodeBody` draws the shared node chrome; `EdgeScaffold` draws the shared edge
// plumbing (hit-path, selection, segments, drive dot, sim readout).
import type { CanvasRole, EnvKind, Grounding, ProcessPrimitive } from "../../kernel/types";
import { primitiveGlyph } from "./primitive-glyphs";
import { humanize } from "../../ui";
import { prim } from "../../tokens";
import { NODE_R, type Pt } from "../geometry";
import { groundingLine, groundingStroke, useGroundingOverlay } from "../grounding";
import { HANDLE, LABEL, STROKE_FLOOR_PX, STYLE, TAB } from "../style";
import type { ReactElement, ReactNode, PointerEvent as ReactPointerEvent, SVGProps } from "react";
import { Children, cloneElement, isValidElement, useLayoutEffect, useRef, useState } from "react";
import { COARSE_POINTER, screenHold, screenWorld, strokeWorld, textWorld, useStageHold, useStageScale } from "../stageScale";

/** The text of a label element, flattened, so a paper tab can re-measure only
 *  when the words change. */
function flatText(node: ReactNode): string {
  let out = "";
  Children.forEach(node, (c) => {
    if (typeof c === "string" || typeof c === "number") out += String(c);
    else if (isValidElement<{ children?: ReactNode }>(c) && c.type !== "title") out += flatText(c.props.children);
  });
  return out;
}

/** A reading on a paper tab (makeover rule 19): a `--paper` rect behind the
 *  text, 2 screen px of padding and radius, so a label reads over any crossing.
 *  The box is the DOM's own `getBBox`, taken after layout; before it, under SSR
 *  and in jsdom (no `getBBox`) the text draws bare, which is what the unit
 *  suite sees. Group attributes (`data-edge-label`, `data-node-label`) go on the
 *  wrapper so Canvas's crowding pass measures tab and text as one box and the
 *  aperture CSS hides both. */
export function PaperTab({ children, ...group }: { children: ReactElement<SVGProps<SVGTextElement>> } & SVGProps<SVGGElement>) {
  const scale = useStageScale();
  const ref = useRef<SVGTextElement>(null);
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const text = flatText(children);
  const { x, y, fontSize } = children.props;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.getBBox !== "function") return;
    const b = el.getBBox();
    if (b.width === 0 && b.height === 0) return;
    setBox((prev) =>
      prev && prev.x === b.x && prev.y === b.y && prev.w === b.width && prev.h === b.height
        ? prev
        : { x: b.x, y: b.y, w: b.width, h: b.height },
    );
  }, [text, scale, x, y, fontSize]);
  const pad = screenWorld(TAB.pad, scale);
  return (
    <g {...group}>
      {box && (
        <rect
          data-paper-tab
          x={box.x - pad}
          y={box.y - pad}
          width={box.w + 2 * pad}
          height={box.h + 2 * pad}
          rx={screenWorld(TAB.rx, scale)}
          fill="var(--paper)"
          pointerEvents="none"
        />
      )}
      {cloneElement(children, { ref } as Partial<SVGProps<SVGTextElement>>)}
    </g>
  );
}


/** Resolved per-lens stroke styling for a visible edge path. */
export interface EdgeStyle {
  color: string;
  width: number;
  dash?: string;
  opacity: number;
  filter?: string;
  /** Marker def id (e.g. `arrow-Matter`) so the head carries the stroke's
   *  substance color — a slate head on a green line reads as a terminus, not a
   *  direction. Omit for the neutral `arrow` (Klir's substance-blind line). */
  marker?: string;
  /** The BONDHOOD channel (#320): a start-side marker, set only where the edge
   *  must NOT read as directed transport. A `mere` relation caps both ends with
   *  `coupling` so no end is the arrow end. Bonds leave this unset. */
  markerStart?: string;
}

interface NodeBodyProps {
  /** Stage scale (see LensNodeProps.scale). */
  scale?: number;
  /** role/env_kind feed the run-time role grammar (source = emitter, never a
   *  fill); optional so glyph-only callers stay valid. */
  thing: { id: number; x: number; y: number; name: string; role?: CanvasRole; env_kind?: EnvKind; grounding?: Grounding };
  hovered: boolean;
  /** Rule 20: selection is a ring, the body's outline offset 4 screen px,
   *  2 screen px of the accent. Driven by the shell's selectedThingId. */
  selected?: boolean;
  /** A drag in flight: the body steps to the well surface, the cursor closes
   *  and the connect handle hides. No lift, no shadow. */
  dragging?: boolean;
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
  /** facets#269: the thing is an agent — Mobus's management oval (ch. 12
   *  figures) drawn inside the body, in place of a work-process glyph. */
  agentOval?: boolean;
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
  /** #308 part A: the reserved `unresolved` pass-way draws dashed — an
   *  interface whose identity is not yet known, on the membrane where it
   *  will be. Overrides the grounding dash only when no grounding dash applies. */
  dash?: string;
  /** #306: an on-membrane interface renders at a fraction of the body size —
   *  a pass-way in the boundary, not a peer of the interior processes. Scales
   *  the drawn body (shapes, halos, glyph); the hit disc, label text size, and
   *  connect handle stay full-size for usability. */
  bodyScale?: number;
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
  selected = false,
  dragging = false,
  sim,
  scale,
  onPointerDown,
  onHandlePointerDown,
  isSquare,
  showHalo,
  envOpen,
  stroke: lensStroke,
  strokeOpacity: lensStrokeOpacity,
  strokeWidth: lensStrokeWidth,
  badge,
  badgeCentered = false,
  regulatorTriangle = false,
  agentOval = false,
  labelSmall,
  boundaryRim,
  pending = false,
  simPosition = false,
  envHint = false,
  bodyScale = 1,
  dash,
}: NodeBodyProps) {
  const ctxScale = useStageScale();
  const sc = scale === undefined ? ctxScale : scale;
  const hold = screenHold(sc);
  const frac = sim ? Math.max(0, Math.min(1, sim.frac)) : null;
  const clipId = `fill-clip-${thing.id}`;
  const [selfHover, setSelfHover] = useState(false);
  // Run-time role grammar (walkthrough #8): a SOURCE emits, it never fills.
  // The per-node min-max normalization renders a constant emitter as a
  // half-full box and a forced one as a filling stock — both lies. Sources
  // get an outward pulse instead; sinks and stocks keep the fill, which for
  // them is the truth (accumulation / level).
  const emitter = thing.role === "Environment" && thing.env_kind === "Source";
  // #411: with the grounding overlay on, the body's stroke says whose word
  // the thing rests on and nothing else — the lens's stroke is set aside for
  // the reading, and comes back untouched when the overlay goes.
  const overlay = useGroundingOverlay();
  const gs = overlay ? groundingStroke(thing.grounding) : null;
  const stroke = gs ? gs.color : lensStroke;
  const strokeOpacity = gs ? gs.opacity : lensStrokeOpacity;
  // Rule 17: 2 world px, never thinner than the screen floor at fit.
  const strokeWidth = strokeWorld(gs ? lensStrokeWidth * 2.2 : lensStrokeWidth, sc, STROKE_FLOOR_PX);
  const strokeDash = gs?.dash ?? dash;
  const groundingTitle = overlay ? (groundingLine(thing.grounding) ?? "ungraded") : null;
  // Vertical extents of the body shape — the sim fill's clip rises bottom-up
  // between them, so the triangle drains/fills over ITS height, not the circle's.
  const [shapeTop, shapeBot] = regulatorTriangle ? [-TRI_R, TRI_BOT] : [-NODE_R, NODE_R];
  const shapeH = shapeBot - shapeTop;
  // The surface step: hover or drag lifts the body one step (paper to well).
  const stepped = (selfHover && !hovered) || dragging;

  return (
    <g
      transform={`translate(${thing.x}, ${thing.y})`}
      onPointerDown={onPointerDown}
      onMouseEnter={() => setSelfHover(true)}
      onMouseLeave={() => setSelfHover(false)}
      className={dragging ? "cursor-grabbing" : "cursor-grab"}
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
      {/* #306: everything DRAWN scales down for an on-membrane interface; the
          group scales strokes with it, which reads right for a smaller body. */}
      <g transform={bodyScale !== 1 ? `scale(${bodyScale})` : undefined}>
        {groundingTitle && <title>{`grounding: ${groundingTitle}`}</title>}
      {/* Rule 20: hover is a SURFACE STEP (the body fill steps to the well),
          selection a RING, the drop target (`hovered`) its own accent ring.
          Three states, three kinds of change, never the same mark at three
          alphas. The ring's geometry follows the body: a square for an
          environment object, a circle for everything else (the triangle
          sits inside its circumcircle). Export-ignored: a still has no
          selection. */}
      {selected && (
        isSquare ? (
          <rect
            data-export-ignore
            data-selection-ring
            x={-NODE_R - screenWorld(4, sc)}
            y={-NODE_R - screenWorld(4, sc)}
            width={2 * (NODE_R + screenWorld(4, sc))}
            height={2 * (NODE_R + screenWorld(4, sc))}
            rx={screenWorld(2, sc)}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={screenWorld(2, sc)}
            pointerEvents="none"
          />
        ) : (
          <circle
            data-export-ignore
            data-selection-ring
            r={(regulatorTriangle ? TRI_R : NODE_R) + screenWorld(4, sc)}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={screenWorld(2, sc)}
            pointerEvents="none"
          />
        )
      )}
      {/* The composition halo (a lens-accent wash around every component) was
          the last residue of the withdrawn world tint: a colour on a surface
          that named nothing the membrane or hull does not already say
          (makeover rule 9e, canvas audit finding 18). `showHalo` stays in the
          lens contract; it draws nothing. */}
      {showHalo && null}
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
          strokeWidth={strokeWorld(STYLE.boundaryRim.width, sc, STROKE_FLOOR_PX)}
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
          fill={stepped ? "var(--bg-surface)" : "color-mix(in srgb, var(--prim-modulating) 18%, var(--bg-secondary))"}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
          strokeLinejoin="miter"
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
          fill={stepped ? "var(--bg-surface)" : envOpen ? "none" : STYLE.nodeFill}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
          fillOpacity={frac !== null && !simPosition && !emitter ? 0 : 1}
        />
      ) : (
        <circle
          r={NODE_R}
          fill={stepped ? "var(--bg-surface)" : STYLE.nodeFill}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
          fillOpacity={frac !== null && !simPosition && !emitter ? 0 : 1}
        />
      )}

      {/* The management oval (facets#269, ADR 0008): an agent is a decision
          model, not a work process, and Mobus draws management as its own
          oval on the process (ch. 12). The oval is the face; no glyph. */}
      {agentOval && (
        <g data-glyph="agent-oval" pointerEvents="none">
          <title>agent: a decision model — watches a stock or a flow, commands a process</title>
          <ellipse rx={NODE_R * 0.62} ry={NODE_R * 0.36} fill="none" stroke="var(--lens-accent)" strokeWidth={1.6} />
          <circle r={NODE_R * 0.09} fill="var(--lens-accent)" />
        </g>
      )}

      {/* Process-primitive glyph, centered (#100 phase 4, #81 harvest): the
          component IS the process, so the glyph is the body's face — not a
          corner medallion on an otherwise empty circle. The glyphs are a
          facets stroke family in Mobus's spirit, not his printed icons. */}
      {badge && badgeCentered && (
        <g
          data-glyph="centered"
          transform={`scale(${(NODE_R * GLYPH_FRAC) / 6})`}
          // Rule 9b: the process wears its own hue, the same one the rail row
          // and the inspector carry, so it is known by colour before its
          // silhouette is read.
          style={{ color: prim[badge] }}
          fill="none"
          stroke={prim[badge]}
          strokeWidth={strokeWorld(2, sc, STROKE_FLOOR_PX) / ((NODE_R * GLYPH_FRAC) / 6)}
          strokeLinecap="square"
          strokeLinejoin="miter"
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
            stroke={prim[badge]}
            strokeWidth={STYLE.badge.strokeWidth}
          />
          <g
            transform={`scale(${(STYLE.badge.r * 0.8) / 6})`}
            style={{ color: prim[badge] }}
            fill="none"
            stroke={prim[badge]}
            strokeWidth={2}
            strokeLinecap="square"
            strokeLinejoin="miter"
          >
            {primitiveGlyph(badge)}
          </g>
        </g>
      )}

      </g>

      {sim && (
        <text
          y={-NODE_R * bodyScale - 10}
          textAnchor="middle"
          fontSize={STYLE.simReadoutSize * hold}
          fill="var(--accent-strong)"
          className="font-mono tabular pointer-events-none"
        >
          {humanize(sim.value)} {sim.unit}
        </text>
      )}

      {/* #335: a thing's NAME is a fixed obstacle in the label-crowding pass —
          an edge label landing on it is the one that goes quiet, since a name
          has no hover gesture to give it back. Tagged, never quieted. */}
      <PaperTab data-node-label={thing.id}>
        <text
          y={NODE_R * bodyScale + 16}
          textAnchor="middle"
          fontSize={textWorld(labelSmall ? LABEL.small : LABEL.size, sc, LABEL.floorPx)}
          fontWeight={LABEL.weight}
          fill={labelSmall ? "var(--text-secondary)" : STYLE.label.fill}
          className="font-body pointer-events-none"
        >
          {thing.name}
        </text>
      </PaperTab>

      {/* The connect handle is a reading, not a world object: an 8 px disc on
          screen at every zoom (tldraw's 8 / zoom), over a hit disc of r 12
          (the 24 px target of rule 11; 1.75x under a coarse pointer). Hidden
          while this body is being dragged. */}
      {!dragging && (<>
      <circle
        data-export-ignore
        data-handle-hit
        cx={NODE_R * 0.75 * bodyScale}
        cy={NODE_R * 0.75 * bodyScale}
        r={screenWorld(HANDLE.hitR * (COARSE_POINTER ? HANDLE.coarse : 1), sc)}
        fill="transparent"
        className="cursor-crosshair"
        onPointerDown={onHandlePointerDown}
      />
      <circle
        data-handle
        cx={NODE_R * 0.75 * bodyScale}
        cy={NODE_R * 0.75 * bodyScale}
        r={screenWorld(HANDLE.r, sc)}
        fill="var(--bg-primary)"
        stroke="var(--lens-accent)"
        strokeWidth={screenWorld(HANDLE.width, sc)}
        className="cursor-crosshair"
        onPointerDown={onHandlePointerDown}
      />
      </>)}
    </g>
  );
}

interface EdgeScaffoldProps {
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
  /** #411: the flow's grounding, read only while the overlay is on. */
  grounding?: Grounding;
  /** #335: this label overlaps another (Canvas measures the rendered boxes —
   *  `crowdedLabelIds`). A crowded label goes quiet at rest and speaks again on
   *  hover or selection; an uncrowded one is never touched. */
  crowded?: boolean;
  /** Hover copy on the edge's hit path (e.g. Bunge's channel vocabulary,
   *  #100 phase 2 F6). Omitted by Klir/Mobus — their output is unchanged. */
  title?: string;
}

/** The edge plumbing common to every lens — hit target, selection halo, muted
 *  interior, drawn segments, drive dot, and sim readout. The per-lens views
 *  supply the resolved style, routing, label, and any badge overlays. */
export function EdgeScaffold({
  labelAt,
  style: lensStyle,
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
  crowded = false,
  title,
  grounding,
}: EdgeScaffoldProps) {
  const hold = useStageHold();
  const scale = useStageScale();
  // #411: under the overlay the stroke reads grade, not substance. The
  // arrowhead keeps its marker (direction is not in question) but takes the
  // grade's colour through the generic marker, since kind markers are inked.
  const groundingOn = useGroundingOverlay();
  const gs = groundingOn ? groundingStroke(grounding) : null;
  const style: EdgeStyle = gs
    ? { ...lensStyle, color: gs.color, opacity: gs.opacity, dash: gs.dash, width: lensStyle.width * 1.6, filter: undefined, marker: "arrow-grounding", markerStart: undefined }
    : lensStyle;
  const [hover, setHover] = useState(false);
  // Hit, hover, and selection must trace the strokes the reader can SEE. An exo
  // flow's `d` is the rim-to-rim curve, but its drawn geometry is the crossing
  // segment + muted interior — anchoring the hit path on `d` left the visible
  // line unclickable and lit phantom highlights on empty canvas (2026-08-09).
  const feltPaths = [...visible.map((seg) => seg.d), ...(interior ? [interior] : [])];
  return (
    <g>
      {/* Invisible wide hit-paths — the click target for "drive this flow".
          non-scaling-stroke keeps the target 18 SCREEN px at any zoom: a fitted
          big model halves the world scale, and a world-space target halves with
          it, which is how flows got "hard to click" (walkthrough #14). Hit
          testing follows the rendered stroke, so the effect applies to clicks. */}
      {feltPaths.map((fp, i) => (
        <path
          key={i}
          data-export-ignore
          d={fp}
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
      ))}
      {/* Rule 20: a hovered or selected flow THICKENS by one screen px and
          never changes hue (the stroke below); selection also keeps its
          halo behind the stroke so a chosen flow is found at a glance. The
          old hover halo (the same mark at a lower alpha) is gone. */}
      {selected &&
        feltPaths.map((fp, i) => (
          <path
            key={i}
            data-export-ignore
            d={fp}
            fill="none"
            stroke="var(--lens-accent)"
            strokeWidth={STYLE.selection.width}
            strokeOpacity={STYLE.selection.opacity}
            pointerEvents="none"
          />
        ))}
      {interior && (
        <path
          d={interior}
          fill="none"
          stroke={style.color}
          strokeOpacity={0.3}
          strokeWidth={1.25}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
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
          // Rule 19: 2 world px, floored on screen. The stroke is non-scaling,
          // so the world width is applied here as its screen reading.
          strokeWidth={Math.max(style.width * scale, STROKE_FLOOR_PX) + (selected || (hover && onSelect) ? 1 : 0)}
          strokeDasharray={style.dash}
          vectorEffect="non-scaling-stroke"
          filter={style.filter}
          markerEnd={seg.markered ? `url(#${style.marker ?? "arrow"})` : undefined}
          markerStart={seg.markered && style.markerStart ? `url(#${style.markerStart})` : undefined}
          pointerEvents="none"
        />
      ))}
      {driven && <circle cx={labelAt.x} cy={labelAt.y - 6} r={4} fill="var(--accent)" pointerEvents="none" />}
      {overlay}
      {/* #335: the label stays MOUNTED when quieted, hidden by opacity rather
          than by unmounting. Canvas measures these boxes to decide crowding, so
          removing a quiet label would erase the very evidence that it collides
          — it would measure as uncrowded, come back, collide, and flicker
          forever. Opacity leaves the geometry intact, so the measurement is a
          fixed point and settles in one pass. `data-edge-label` is the handle
          Canvas queries to measure, and the handle exportDiagram uses to force
          every label back to full strength — a still has no hover. */}
      {label &&
        (isValidElement<SVGProps<SVGTextElement>>(label) ? (
          <PaperTab
            data-edge-label={relationId}
            opacity={crowded && !hover && !selected ? 0 : 1}
            pointerEvents={crowded && !hover && !selected ? "none" : undefined}
          >
            {label}
          </PaperTab>
        ) : (
          <g
            data-edge-label={relationId}
            opacity={crowded && !hover && !selected ? 0 : 1}
            pointerEvents={crowded && !hover && !selected ? "none" : undefined}
          >
            {label}
          </g>
        ))}
      {ample ? (
        <text
          x={labelAt.x}
          y={labelAt.y + 14 * hold}
          textAnchor="middle"
          fontSize={10 * hold}
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
            y={labelAt.y + 14 * hold}
            textAnchor="middle"
            fontSize={10 * hold}
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
