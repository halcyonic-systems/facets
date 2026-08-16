// The authoring + drive canvas. It draws what the kernel gives it and computes
// no dynamics and decides no legality: WHICH nodes are boundary, WHICH edges are
// endo/exo/bond/self-loop, and WHICH ports exist are all Rust verdicts (read off
// `facts`); only their pixel placement is computed here. Gestures live in
// `useCanvasGestures` (pointer events → a pure reducer); per-lens rendering lives
// in the `LensRegistry` (stateless views, one set per lens). This file is the
// stage: backdrops, the render loop, and the node-name draft input.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CanvasModel, EdgeFact, Lens, LensFacts, PortFact, Thing } from "../kernel/types";
import { KIND_COLOR, type SimFrame } from "./types";
import {
  bungeHull,
  INTERFACE_SCALE,
  membraneRing,
  rimPoint,
  ringPoint,
  unprojectWrite,
  straightPath,
  thingById,
  crowdedLabelIds,
  NODE_R,
  type LabelBox,
  type Hull,
  type PortTarget,
  type Pt,
  type Ring,
} from "./geometry";
import { useCanvasGestures } from "./useCanvasGestures";
import { STYLE } from "./style";
import { LensRegistry, type PaletteTool } from "./lenses/registry";
import { MassOverlay } from "./MassOverlay";

/** #335: the "nothing is crowded" set. Hoisted to module scope so the common
 *  case allocates nothing per render; the size-and-membership guard on
 *  `setCrowded` is what actually keeps the measure/render pass from looping. */
const EMPTY_CROWD: ReadonlySet<number> = new Set<number>();

/** How much larger a boundary-crossing flow's arrowhead is drawn than an
 *  interior one. The head is the per-flow direction mark, and at the shipped
 *  register it renders 3-4 screen px on a fitted model — correct and
 *  unreadable, the same failure the port chevron had. */
const EXO_ARROW_GAIN = 2;

interface Props {
  model: CanvasModel;
  lens: Lens;
  /** Kernel-computed lens facts (boundary identity set, edge ladder, ports,
   *  aggregate verdict). Every ontology-bearing visual below READS these —
   *  the canvas derives no systems fact itself. */
  facts?: LensFacts | null;
  onModelChange: (m: CanvasModel) => void;
  onReject: (message: string) => void;
  /** The soft channel for a Warning that rides along with a legal edge. */
  onNotice?: (message: string) => void;
  selectedRelationId?: number | null;
  onSelectRelation?: (id: number) => void;
  /** The rail's armed tool — place stamps on stage click, designate on node click. */
  armed?: PaletteTool | null;
  onSelectThing?: (id: number | null) => void;
  /** Double-click a thing — the decomposition walk's enter gesture (#89 step
   *  5b). The canvas only reports the gesture; whether the thing has a child to
   *  enter (and what entering means) is the shell's call. */
  onEnterThing?: (thing: Thing) => void;
  /** #109 exit gesture: while walking, double-click on the EMPTY stage (not on
   *  any thing/relation/boundary) exits one level up — the mirror of
   *  double-click-to-enter. Null/undefined = not walking, and the stage
   *  double-click keeps its node-draft meaning. The shell owns the exit
   *  (same autosaving exitTo path as the breadcrumb). */
  onExitUp?: (() => void) | null;
  /** Click the Mobus membrane STROKE to open the boundary inspector; the
   *  anchor is a world-space point on the ring. Capsules no longer route here —
   *  clicking an interface used to answer a different question ("the boundary")
   *  than the one asked (2026-08-09 field report). */
  onSelectBoundary?: (at: Pt) => void;
  /** Click a flow-carrying capsule to open the INTERFACE inspector — the
   *  crossing flows at that r = (S, φ), each clickable through to the flow.
   *  UI word is "interface" (Mobus's term); "port" stays code-internal. */
  onSelectInterface?: (port: PortFact, at: Pt) => void;
  driven?: Set<string>;
  sim?: SimFrame | null;
  /** Probability mass per state name at the scrubbed tick (#67 J9). Present for
   *  a Klir/Markov run; each node gets a disc scaled to its P(state). Absent for
   *  every other run — the diagram draws unchanged. */
  mass?: Record<string, number> | null;
  onPanChange?: (pan: Pt) => void;
  onScaleChange?: (scale: number) => void;
  /** Bump to request a fit-to-content pass against the current viewport (e.g.
   *  after an SL compile lays the model out around a fixed center that may sit
   *  outside the narrower SL-pane viewport). Each distinct value fits once. */
  fitToken?: number;
  /** The containing system's name (author SOI name, else the shell's label) —
   *  the per-lens container labels itself with it (#100 phase 0), so a model
   *  can never impersonate its only component. */
  placeName?: string | null;
}

export default function Canvas({
  model,
  lens,
  facts = null,
  onModelChange,
  onReject,
  onNotice,
  selectedRelationId = null,
  onSelectRelation,
  armed = null,
  onSelectThing,
  onEnterThing,
  onExitUp = null,
  onSelectBoundary,
  onSelectInterface,
  driven,
  sim,
  mass = null,
  onPanChange,
  onScaleChange,
  fitToken,
  placeName = null,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // The Mobus membrane and its ports are computed BEFORE the gesture hook: a
  // port is a drop target for a flow drag (#213), and the hook hit-tests
  // against these pixels. Ring math is pure and reads only props.
  //
  // #306 (ratified 2026-08-09): an authored `interface` component lives ON the
  // membrane — Mobus's interfaces are boundary subsystems (Fig 4.9), not
  // interior nodes tethered to a capsule. So the ring is computed from the
  // NON-interface components (breaking the ring←components circularity), and
  // interface components are PROJECTED onto it for rendering. The projection is
  // presentation: the authored position survives in the model and dragging an
  // interface slides it along the ring (the constraint teaches the ontology).
  const authoredInterfaceIds = new Set(facts?.authored_interface_thing_ids ?? []);
  // Ring extent comes from the INTERIOR components alone (#226, 2026-08-16):
  // an interface lives ON the ring, so its position must never feed the fit —
  // that feedback was why dragging an interface resized the whole membrane.
  // The one guarded fallback is the degenerate interior (fewer than two
  // interior components — the Fed's single plain component): there the fit
  // falls back to ALL components at authored positions, exactly the pre-#226
  // behavior, so a membrane never collapses to a bubble.
  const interiorThings = model.things.filter(
    (t) => !(t.role === "Component" && authoredInterfaceIds.has(t.id)),
  );
  const interiorComponentCount = interiorThings.filter((t) => t.role === "Component").length;
  const ring: Ring | null =
    lens === "Mobus"
      ? membraneRing(interiorComponentCount >= 2 ? interiorThings : model.things)
      : null;
  // The display model — identical to the authored model except interface
  // components snap to the ring. Every consumer below (gestures, edges, nodes,
  // ports, fit) reads THIS, so pixels and hit-tests always agree.
  const dModel: CanvasModel =
    ring && authoredInterfaceIds.size > 0
      ? {
          ...model,
          things: model.things.map((t) =>
            t.role === "Component" &&
            authoredInterfaceIds.has(t.id) &&
            // Degenerate guard: a sole-component interface (the walk's opaque
            // L0 box) IS the ring's center — projecting it would throw it onto
            // an arbitrary rim point. The box stays put; it is the system.
            Math.hypot(t.x - ring.cx, t.y - ring.cy) > 1
              ? { ...t, ...ringPoint(ring, t) }
              : t,
          ),
        }
      : model;
  const outwardNormal = (r: Ring, p: Pt) => Math.atan2(p.y - r.cy, p.x - r.cx);
  // A port owned by an authored interface rides ITS component's rim (the
  // component is on the membrane; the crossing happens at the component) —
  // a small chevron notch toward its environment, label suppressed (the flow
  // names live on the edges and in the interface inspector). A port on a
  // NON-interface component keeps the classic membrane capsule + interior
  // tether — visibly second-class, which is the point: the drawing shows
  // which crossings have declared boundary apparatus and which do not.
  type PortAt = { port: PortFact; at: Pt; angle: number; tetherTo: Pt | null; compact: boolean };
  const portsAt: PortAt[] =
    ring && facts
      ? facts.ports.flatMap((port): PortAt[] => {
          const env = thingById(dModel, port.env);
          if (!env) return [];
          if (authoredInterfaceIds.has(port.component)) {
            const comp = thingById(dModel, port.component);
            if (!comp) return [];
            const at = rimPoint(comp, env, NODE_R * INTERFACE_SCALE);
            return [{ port, at, angle: Math.atan2(env.y - comp.y, env.x - comp.x), tetherTo: null, compact: true }];
          }
          const at = ringPoint(ring, env);
          return [{ port, at, angle: outwardNormal(ring, at), tetherTo: null, compact: false }];
        })
      : [];

  // Authored-flowless interfaces (kernel fact: authored ∖ flow-crossing) still
  // get a notch — the component sits on the membrane already (#306 snap), so
  // the notch rides its outward rim and the #213 tether is gone: position now
  // says what the dashed line used to.
  const flowlessAt: PortAt[] =
    ring && facts
      ? facts.authored_interface_thing_ids
          .filter((id) => !facts.ports.some((p) => p.component === id))
          .flatMap((id) => {
            const comp = thingById(dModel, id);
            if (!comp) return [];
            const angle = outwardNormal(ring, comp);
            const r = NODE_R * INTERFACE_SCALE;
            const at = { x: comp.x + Math.cos(angle) * r, y: comp.y + Math.sin(angle) * r };
            return [
              {
                port: {
                  component: id,
                  env: -1,
                  relation_ids: [],
                  direction: "Hybrid" as const,
                  // φ is empty until a flow crosses; the port names its owner
                  // instead, so the notch is never anonymous (#213).
                  protocol: `${comp.name} · no flow`,
                },
                at,
                angle,
                tetherTo: null,
                compact: true,
              },
            ];
          })
      : [];

  const portTargets: PortTarget[] = [...portsAt, ...flowlessAt].map(({ port, at }) => ({
    at,
    component: port.component,
  }));

  const gestures = useCanvasGestures({
    model: dModel,
    // #306 write-back guard: gestures see the projected model, but writes must
    // land in AUTHORED coordinates for everything they didn't touch — else the
    // projection persists and the ring inflates every drag frame.
    onModelChange: (m) => onModelChange(unprojectWrite(model, dModel, m)),
    svgRef,
    onReject,
    onNotice,
    armed,
    onSelectThing,
    portTargets,
  });
  const { pan, scale, connectFrom, connectPos, hoverTarget, draft } = gestures.state;

  // Click-to-edit container label (#116): the membrane/hull/place label writes
  // the model's SELF-name (CanvasModel.name — the field the SL `system "..."`
  // declaration round-trips), never the shell's library label it may be
  // displaying as a fallback. Escape cancels; Enter/blur commits; an empty
  // commit clears to unnamed (the label falls back as before).
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const beginNameEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameDraft(model.name ?? "");
  };
  const commitName = () => {
    if (nameDraft === null) return;
    const name = nameDraft.trim();
    if (name !== (model.name ?? "")) {
      const next = { ...model };
      if (name) next.name = name;
      else delete next.name;
      onModelChange(next);
    }
    setNameDraft(null);
  };
  const nameField = (widthClass: string) => (
    <input
      autoFocus
      className={`${widthClass} rounded-md border px-2 py-1 text-xs font-body`}
      style={{ borderColor: "var(--lens-accent)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
      value={nameDraft ?? ""}
      placeholder="name this system…"
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setNameDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitName();
        if (e.key === "Escape") setNameDraft(null);
      }}
      onBlur={commitName}
    />
  );
  const nameInput = (props: React.SVGProps<SVGForeignObjectElement>) => (
    <foreignObject data-export-ignore pointerEvents="auto" {...props} height={32}>
      {nameField("w-full")}
    </foreignObject>
  );

  useEffect(() => {
    onPanChange?.(pan);
  }, [pan, onPanChange]);

  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  // Fit-to-content on request: a new `fitToken` frames the current model in the
  // live viewport (read from the SVG's client rect, so an open SL pane's
  // narrower width is respected). Keyed on the token alone — the render that
  // carries a given token already holds the compiled model, so `fitToViewport`
  // closes over it; adding it to deps would refit on every render (e.g. drags).
  const { fitToViewport } = gestures;
  useEffect(() => {
    if (fitToken === undefined) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    fitToViewport(rect.width, rect.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

  // Wheel zoom needs a NON-passive native listener (browsers default wheel to
  // passive, which would ignore preventDefault and scroll the page instead).
  const { onStageWheel } = gestures;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", onStageWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onStageWheel);
  }, [onStageWheel]);

  // #335 detail-on-demand: which edge labels collide, measured off what was
  // actually drawn. Every lens renders its label inside a `[data-edge-label]`
  // group, so this reads the rendered boxes rather than re-deriving per-lens
  // text — the lens stays the single author of its own label.
  //
  // useLayoutEffect, not useEffect: the quieting is applied before paint, so a
  // crowded label never flashes at full strength and then dims.
  //
  // No dependency array by design. Label boxes move with node drags, lens
  // changes, sibling counts and name edits — enumerating those is a bug farm,
  // and the `setCrowded` below is idempotent, so an extra pass costs one
  // measurement and changes nothing. It TERMINATES because quieting is done
  // with opacity: the boxes measured on pass 2 are identical to pass 1, the set
  // compares equal, and no further render is scheduled.
  //
  // Boxes are read in SCREEN space, so the pad is real perceived air. Whether
  // two labels collide is still zoom-invariant — the stage transform is a
  // uniform scale, which is why zoom-aware labels were a dead end — but the pan
  // and scale state that this effect reruns on keep the rects honest.
  const [crowded, setCrowded] = useState<ReadonlySet<number>>(EMPTY_CROWD);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Node NAMES join the pass as fixed obstacles — an edge label landing on a
    // thing's name is as unreadable as one landing on another label, and it is
    // the flow label that yields (a name has no hover of its own).
    const els = Array.from(
      svg.querySelectorAll<SVGElement>("[data-edge-label], [data-node-label]"),
    );
    const boxes: LabelBox[] = [];
    for (const el of els) {
      // Screen space, so an edge label on the stage and a name inside its
      // node's transformed group compare directly. jsdom reports every rect as
      // 0×0, so the unit suite measures nothing, nothing is crowded, and every
      // label renders — the pre-#335 behaviour. The clustering rule itself is
      // covered directly in geometry.crowding.test.ts.
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // Thing ids and relation ids share one number space here, which is safe
      // only because a `fixed` box is never ADDED to the result — the returned
      // set holds relation ids alone, so `crowded.has(r.id)` cannot be answered
      // by a node that happens to carry the same number.
      const fixed = el.dataset.nodeLabel !== undefined;
      boxes.push({
        id: Number(fixed ? el.dataset.nodeLabel : el.dataset.edgeLabel),
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        fixed,
      });
    }
    const next = crowdedLabelIds(boxes);
    setCrowded((prev) =>
      prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next,
    );
  });

  const views = LensRegistry[lens];
  const containerBox = boundingBox(dModel.things);

  // Kernel facts, indexed for the render loop. WHICH nodes are boundary, WHICH
  // edges are endo/exo/bond/self-loop, and WHICH ports exist are all Rust
  // verdicts; only their pixel placement is computed here.
  const boundarySet = new Set(facts?.boundary_thing_ids ?? []);
  const orphanSet = new Set(facts?.orphan_env_thing_ids ?? []);
  const edgeFactById = new Map<number, EdgeFact>((facts?.edges ?? []).map((e) => [e.id, e]));

  // The per-lens container (#100 phase 0) — one mechanism, three honest
  // renderings. Mobus: B = ⟨P, I⟩ reified, a membrane around the components,
  // present from birth (an empty interior draws it small — an empty system is
  // still a system). Bunge: a dashed hull, the observer's partition over one
  // flat ontology — never a membrane object. Klir: neither; a place label does
  // the orientation via copy, faithful to the flat (T, R). Env objects and a
  // walked child's G′ stand-ins sit outside both containers by construction
  // (they follow Components only; an env thing dragged inside is a layout
  // artifact, not a semantic error: C ∩ E = ∅ is enforced by the kernel's roles).
  const hull: Hull | null = lens === "Bunge" ? bungeHull(dModel.things) : null;

  return (
    <svg
      ref={svgRef}
      className={`canvas-stage absolute inset-0 h-full w-full touch-none select-none${armed ? " cursor-crosshair" : ""}`}
      data-grid={STYLE.grid.mode}
      style={
        {
          "--grid-gap": `${STYLE.grid.gap}px`,
          "--grid-ink": STYLE.grid.ink,
          backgroundColor: STYLE.grid.wash ? "color-mix(in srgb, var(--lens-accent) 4%, transparent)" : undefined,
        } as React.CSSProperties
      }
      onPointerDown={gestures.onStagePointerDown}
      onPointerMove={gestures.onStagePointerMove}
      onPointerUp={gestures.onStagePointerUp}
      onDoubleClick={(e) => {
        // #109: while walking, an empty-stage double-click exits one level
        // (things/edges/membrane are child elements, so target ≠ currentTarget
        // for them — a double-click ON a thing still enters via its own
        // handler). Not walking → the gesture stays the node-draft creator.
        if (onExitUp && e.target === e.currentTarget) {
          onExitUp();
          return;
        }
        gestures.onStageDoubleClick(e);
      }}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth={STYLE.arrowSize}
          markerHeight={STYLE.arrowSize}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-slate)" />
        </marker>
        {/* Substance-colored heads for the kind-colored lenses (Mobus, Bunge) —
            the head is part of the stroke, not a neutral terminus. Klir keeps
            the slate `arrow`: its line is deliberately substance-blind. */}
        {Object.entries(KIND_COLOR).map(([k, color]) => (
          <marker
            key={k}
            id={`arrow-${k}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth={STYLE.arrowSize}
            markerHeight={STYLE.arrowSize}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
        {/* #C phase 2: a boundary CROSSING carries a heavier head.
            Direction is a per-FLOW question and the port cannot answer it — on
            federal-reserve.sl four of five ports are `hybrid`, carrying inbound
            and outbound at once, so their glyph says "both" however large it is
            drawn. The head is the only mark that belongs to one flow.
            It needed the gain because `markerUnits` defaults to strokeWidth: at
            arrowSize 5 a matter head is 7.5 world units and an informational
            one 5, which at a fitted 0.54 render as ~4 and ~2.7 SCREEN px.
            Endo edges keep the plain head — inside the boundary there is no
            in/out to read, so amplifying there would be decoration. */}
        {Object.entries(KIND_COLOR).map(([k, color]) => (
          <marker
            key={`${k}-exo`}
            id={`arrow-${k}-exo`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth={STYLE.arrowSize * EXO_ARROW_GAIN}
            markerHeight={STYLE.arrowSize * EXO_ARROW_GAIN}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
        {/* The BONDHOOD channel (#320). An arrowhead asserts a bond; a relation
            authored `mere` must stay visible and must not read as transport, so
            it terminates in an open coupling cap at BOTH ends — adjacency, with
            no end that is the receiving one. Hollow and unfilled on purpose: a
            filled terminus reads as a stop, and a mere relation does not stop
            anything, it simply holds. Klir never uses it (see klir.tsx). */}
        <marker id="coupling" viewBox="0 0 10 10" refX="5" refY="5" markerWidth={STYLE.arrowSize} markerHeight={STYLE.arrowSize} orient="auto">
          <circle cx="5" cy="5" r="3" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" />
        </marker>
        {/* the "work sphere" sheen of the house drawings (Fig. 4.5) — a neutral
            top-left highlight, never a substance color. */}
        <radialGradient id="mobus-sphere" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="var(--bg-surface)" />
          <stop offset="62%" stopColor="var(--bg-secondary)" />
          <stop offset="100%" stopColor="var(--bg-surface)" />
        </radialGradient>
        {/* perceptive fuzziness → membrane edge blur (Mobus B properties) */}
        <filter id="ring-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={facts ? facts.boundary_props.perceptive_fuzziness * 6 : 0} />
        </filter>
        {/* energy flows glow (Mobus typed strokes) */}
        <filter id="energy-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={STYLE.energyGlow.dev}
            floodColor="var(--accent)"
            floodOpacity={STYLE.energyGlow.opacity}
          />
        </filter>
      </defs>
      <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
        {lens === "Klir" && containerBox && (
          <g>
            {/* the observer's distinction frame — a drawn distinction, NOT a
                system boundary (Klir: boundary is the investigator's act) */}
            <rect
              x={containerBox.x - 40}
              y={containerBox.y - 40}
              width={containerBox.w + 80}
              height={containerBox.h + 80}
              rx={24}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1.5}
              strokeDasharray="6 5"
            />
            <text x={containerBox.x - 34} y={containerBox.y - 18} className="font-mono text-xs" fill="var(--text-muted)">
              T
            </text>
          </g>
        )}

        {/* Bunge: the C/E partition as a dashed hull — the observer's
            re-cuttable cut, not a boundary object (unfilled, unclickable, no
            ports; the rim-accent on boundary components stays the only
            boundary marking). The label names the containing system, and only
            the label is interactive — click to rename (#116). */}
        {hull && (
          <g pointerEvents="none">
            <rect
              x={hull.x}
              y={hull.y}
              width={hull.w}
              height={hull.h}
              rx={18}
              fill="none"
              stroke="var(--lens-accent)"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeDasharray="8 6"
            />
            {nameDraft !== null && nameInput({ x: hull.x + 8, y: hull.y - 26, width: 160 })}
            {nameDraft === null && placeName && (
              <text
                x={hull.x + 12}
                y={hull.y - 10}
                fontSize={11}
                fill="var(--text-secondary)"
                className="font-mono cursor-text"
                pointerEvents="auto"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={beginNameEdit}
              >
                <title>Click to rename this system (writes the SL system declaration)</title>
                {placeName}
              </text>
            )}
          </g>
        )}

        {/* Mobus: the boundary ring is the star — a real membrane, drawn behind
            the flows and labeled with the system's name ON the boundary (the
            membrane is an object with properties, its name among them).
            Porosity → dash density; fuzziness → edge blur. */}
        {ring && (
          <>
            {/* The milieu M (E = ⟨O, M⟩): the bath, drawn as bathing — a soft
                halo band hugging the membrane's outside, pointer-transparent,
                with the variables named once in a quiet line beneath the ring.
                Never a box, never an arrow: the milieu "surrounds or bathes
                the system... does not interact necessarily through a discrete
                set of interfaces" (lifecycle paper). Mobus lens only — Klir
                and Bunge count it in their hidden residue instead. */}
            {(model.milieu?.length ?? 0) > 0 && (
              <g pointerEvents="none">
                <ellipse
                  cx={ring.cx}
                  cy={ring.cy}
                  rx={ring.rx + 20}
                  ry={ring.ry + 20}
                  fill="none"
                  stroke="var(--milieu)"
                  strokeWidth={34}
                  opacity={0.14}
                />
                <text
                  x={ring.cx}
                  y={ring.cy + ring.ry + 48}
                  textAnchor="middle"
                  fontSize={STYLE.label.size - 1}
                  fontStyle="italic"
                  fill="var(--milieu)"
                  paintOrder="stroke"
                  stroke="var(--bg-primary)"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  className="font-body"
                >
                  {"milieu — " +
                    model
                      .milieu!.map((m) =>
                        m.value != null ? `${m.name} ${m.value}${m.unit ? ` ${m.unit}` : ""}` : m.name,
                      )
                      .join(" · ")}
                </text>
              </g>
            )}
            <ellipse
              cx={ring.cx}
              cy={ring.cy}
              rx={ring.rx}
              ry={ring.ry}
              fill="var(--accent-soft)"
              fillOpacity={STYLE.ring.fillOpacity}
              stroke="var(--accent-slate)"
              strokeWidth={STYLE.ring.strokeWidth}
              strokeDasharray={
                facts && facts.boundary_props.porosity > 0
                  ? `${Math.max(2, 14 - facts.boundary_props.porosity * 12)} ${2 + facts.boundary_props.porosity * 8}`
                  : undefined
              }
              filter={facts && facts.boundary_props.perceptive_fuzziness > 0 ? "url(#ring-blur)" : undefined}
              pointerEvents={onSelectBoundary ? "stroke" : "none"}
              className={onSelectBoundary ? "cursor-pointer" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBoundary?.({ x: ring.cx, y: ring.cy - ring.ry });
              }}
            />
            {/* The name ON the membrane is click-to-edit (#116): only the text
                is interactive — the ellipse keeps its stroke-only hit area, so
                boundary clicks behave exactly as before. */}
            {nameDraft !== null && nameInput({ x: ring.cx - 60, y: ring.cy - ring.ry - 16, width: 120 })}
            {nameDraft === null && placeName && (
              <text
                x={ring.cx}
                y={ring.cy - ring.ry}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={STYLE.label.size}
                fill="var(--accent-slate)"
                paintOrder="stroke"
                stroke="var(--bg-primary)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="font-body cursor-text"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={beginNameEdit}
              >
                <title>Click to rename this system (writes the SL system declaration)</title>
                {placeName}
              </text>
            )}
          </>
        )}

        {dModel.relations.map((r) => (
          <views.EdgeView
            key={r.id}
            model={dModel}
            relation={r}
            fact={edgeFactById.get(r.id)}
            ring={ring}
            sigIndex={dModel.relations.indexOf(r)}
            selected={selectedRelationId === r.id}
            crowded={crowded.has(r.id)}
            driven={driven?.has(r.name) ?? false}
            sim={sim?.edges[r.name]}
            onSelect={onSelectRelation}
          />
        ))}

        {connectFrom !== null && connectPos && (
          <line
            data-export-ignore
            x1={thingById(dModel, connectFrom)?.x}
            y1={thingById(dModel, connectFrom)?.y}
            x2={connectPos.x}
            y2={connectPos.y}
            stroke="var(--lens-accent)"
            strokeWidth={2}
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}

        {/* #67 J9: probability mass rides UNDER the nodes — the state-transition
            structure stays the primary read, the distribution is the overlay. */}
        {mass && <MassOverlay things={dModel.things} mass={mass} />}

        {dModel.things.map((t) => (
          <g
            key={t.id}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onEnterThing?.(t);
            }}
          >
            <views.NodeView
              thing={t}
              isBoundary={boundarySet.has(t.id)}
              isOrphan={orphanSet.has(t.id)}
              hovered={hoverTarget === t.id}
              sim={sim?.nodes[t.name]}
              onPointerDown={(e) => gestures.onNodePointerDown(e, t)}
              onHandlePointerDown={(e) => gestures.onHandlePointerDown(e, t)}
            />
            {/* #306: position now carries the interface meaning (the component
                sits ON the membrane), so the interim ring/tag is gone. What
                remains is the multi-protocol notice — one interface carrying
                couplings to several environments is drawable but coarser than
                Mobus's one-protocol interfaces. State it, don't hide it (the
                Bunge ⊘M pattern); the remedy lives in the title. */}
            {authoredInterfaceIds.has(t.id) &&
              (facts?.ports.filter((p) => p.component === t.id).length ?? 0) >= 2 && (
                <g transform={`translate(${t.x}, ${t.y - NODE_R - 11})`} pointerEvents="all">
                  <title>
                    {`one interface carrying ${facts!.ports.filter((p) => p.component === t.id).length} protocols — decompose it when the seam contract supports interface decomposition (SSF #43); or split into sibling interfaces now`}
                  </title>
                  <text
                    textAnchor="middle"
                    fontSize={8}
                    fill="var(--verdict-warning)"
                    className="font-mono"
                    letterSpacing={0.5}
                  >
                    {facts!.ports.filter((p) => p.component === t.id).length} protocols
                  </text>
                </g>
              )}
          </g>
        ))}

        {/* Mobus interface ports — pill notches in the membrane, one per kernel
            PortFact (r = (S, φ): existence, direction, and protocol are kernel
            facts; only the pixel position is computed here). */}
        {portsAt.map(({ port, at, angle, compact }) => (
          <views.PortView
            key={`${port.component}-${port.env}`}
            port={port}
            at={at}
            angle={angle}
            compact={compact}
            scale={scale}
            onSelect={onSelectInterface ? () => onSelectInterface(port, at) : undefined}
          />
        ))}
        {/* A flowless port has no membrane crossing to inspect — it names one
            component (#180), so its click selects THAT thing, not the
            boundary (the fixable warning for the same fact is emitted by
            check_flowless_interfaces in bert-canvas/src/lenses.rs).

            #213: the notch is TETHERED to the component it designates and
            labelled with its name. `I ⊆ C` — the port is not a second object
            next to the component, it is that component seen at the membrane,
            and until a flow crosses there is no other mark saying so. The
            tether borrows the exo edge's muted interior treatment (dashed,
            0.3 opacity) so the same line means the same thing in both cases:
            "this port serves that component." */}
        {flowlessAt.map(({ port, at, angle, tetherTo, compact }) => (
          <g
            key={`authored-${port.component}`}
            data-port-owner={port.component}
            // Dragging a flow over the port lights the port AND its component
            // (hitTest resolves the port to the owner, which sets hoverTarget) —
            // the two react as one thing because they ARE one thing.
            opacity={hoverTarget === port.component ? 1 : 0.6}
          >
            {tetherTo && (
              <path
                data-port-tether={port.component}
                d={straightPath(tetherTo, at)}
                fill="none"
                stroke="var(--lens-accent)"
                strokeOpacity={0.45}
                strokeWidth={1.25}
                strokeDasharray="4 4"
                pointerEvents="none"
              />
            )}
            <views.PortView
              port={port}
              at={at}
              angle={angle}
              compact={compact}
              scale={scale}
              onSelect={onSelectThing ? () => onSelectThing(port.component) : undefined}
            />
          </g>
        ))}

        {draft && (
          <foreignObject data-export-ignore x={draft.x - 60} y={draft.y - 16} width={120} height={32}>
            <input
              autoFocus
              className="w-full rounded-md border px-2 py-1 text-xs font-body"
              style={{ borderColor: "var(--lens-accent)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
              value={draft.name}
              placeholder="name…"
              onChange={(e) => gestures.setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") gestures.commitDraft();
                if (e.key === "Escape") gestures.clearDraft();
              }}
              onBlur={gestures.commitDraft}
            />
          </foreignObject>
        )}
      </g>

      {/* Klir: NO ontological container — orientation is copy. A screen-space
          place label (outside the pan/zoom group) does the you-are-here work;
          the export path re-anchors it into the diagram's frame. */}
      {lens === "Klir" && nameDraft !== null && (
        <foreignObject data-export-ignore x="0" y={8} width="100%" height={32} pointerEvents="auto">
          <div className="flex justify-center">{nameField("w-40")}</div>
        </foreignObject>
      )}
      {lens === "Klir" && nameDraft === null && placeName && (
        <text
          data-place-label
          x="50%"
          y={24}
          textAnchor="middle"
          fontSize={11}
          fill="var(--text-muted)"
          className="font-mono cursor-text"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={beginNameEdit}
        >
          <title>Click to rename this system (writes the SL system declaration)</title>
          viewing: {placeName}
        </text>
      )}
    </svg>
  );
}

function boundingBox(things: Thing[]): { x: number; y: number; w: number; h: number } | null {
  if (things.length === 0) return null;
  const xs = things.map((t) => t.x);
  const ys = things.map((t) => t.y);
  const minX = Math.min(...xs) - NODE_R;
  const maxX = Math.max(...xs) + NODE_R;
  const minY = Math.min(...ys) - NODE_R;
  const maxY = Math.max(...ys) + NODE_R;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
