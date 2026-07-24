// The authoring + drive canvas. It draws what the kernel gives it and computes
// no dynamics and decides no legality: WHICH nodes are boundary, WHICH edges are
// endo/exo/bond/self-loop, and WHICH ports exist are all Rust verdicts (read off
// `facts`); only their pixel placement is computed here. Gestures live in
// `useCanvasGestures` (pointer events → a pure reducer); per-lens rendering lives
// in the `LensRegistry` (stateless views, one set per lens). This file is the
// stage: backdrops, the render loop, and the node-name draft input.
import { useEffect, useRef, useState } from "react";
import type { CanvasModel, EdgeFact, Lens, LensFacts, PortFact, Thing } from "../kernel/types";
import type { SimFrame } from "./types";
import { bungeHull, membraneRing, ringPoint, thingById, NODE_R, type Hull, type Pt, type Ring } from "./geometry";
import { useCanvasGestures } from "./useCanvasGestures";
import { STYLE } from "./style";
import { LensRegistry, type PaletteTool } from "./lenses/registry";
import { MassOverlay } from "./MassOverlay";

interface Props {
  model: CanvasModel;
  lens: Lens;
  /** Kernel-computed lens facts (boundary identity set, edge ladder, ports,
   *  aggregate verdict). Every ontology-bearing visual below READS these —
   *  the canvas derives no systems fact itself. */
  facts?: LensFacts | null;
  onModelChange: (m: CanvasModel) => void;
  onReject: (message: string) => void;
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
  /** Click the Mobus membrane (or a port — interfaces belong to B) to open the
   *  boundary inspector; the anchor is a world-space point on the ring. */
  onSelectBoundary?: (at: Pt) => void;
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
  selectedRelationId = null,
  onSelectRelation,
  armed = null,
  onSelectThing,
  onEnterThing,
  onExitUp = null,
  onSelectBoundary,
  driven,
  sim,
  mass = null,
  onPanChange,
  onScaleChange,
  fitToken,
  placeName = null,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gestures = useCanvasGestures({ model, svgRef, onModelChange, onReject, armed, onSelectThing });
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

  const views = LensRegistry[lens];
  const containerBox = boundingBox(model.things);

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
  const ring: Ring | null = lens === "Mobus" ? membraneRing(model.things) : null;
  const hull: Hull | null = lens === "Bunge" ? bungeHull(model.things) : null;
  const outwardNormal = (r: Ring, p: Pt) => Math.atan2(p.y - r.cy, p.x - r.cx);
  const portsAt: { port: PortFact; at: Pt; angle: number }[] =
    ring && facts
      ? facts.ports.flatMap((port) => {
          const env = thingById(model, port.env);
          if (!env) return [];
          const at = ringPoint(ring, env);
          return [{ port, at, angle: outwardNormal(ring, at) }];
        })
      : [];

  // Authored-flowless interfaces (kernel fact: authored ∖ flow-crossing) get a
  // notch too — placed at the ring point toward the designated component itself
  // (the membrane meets the component; no env object exists to aim at). The
  // display attrs are presentation; membership in I is the kernel's.
  const flowlessAt: { port: PortFact; at: Pt; angle: number }[] =
    ring && facts
      ? facts.authored_interface_thing_ids
          .filter((id) => !facts.ports.some((p) => p.component === id))
          .flatMap((id) => {
            const comp = thingById(model, id);
            if (!comp) return [];
            const at = ringPoint(ring, comp);
            return [
              {
                port: {
                  component: id,
                  env: -1,
                  relation_ids: [],
                  direction: "Hybrid" as const,
                  protocol: "(flowless)",
                },
                at,
                angle: outwardNormal(ring, at),
              },
            ];
          })
      : [];

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

        {model.relations.map((r) => (
          <views.EdgeView
            key={r.id}
            model={model}
            relation={r}
            fact={edgeFactById.get(r.id)}
            ring={ring}
            sigIndex={model.relations.indexOf(r)}
            selected={selectedRelationId === r.id}
            driven={driven?.has(r.name) ?? false}
            sim={sim?.edges[r.name]}
            onSelect={onSelectRelation}
          />
        ))}

        {connectFrom !== null && connectPos && (
          <line
            data-export-ignore
            x1={thingById(model, connectFrom)?.x}
            y1={thingById(model, connectFrom)?.y}
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
        {mass && <MassOverlay things={model.things} mass={mass} />}

        {model.things.map((t) => (
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
          </g>
        ))}

        {/* Mobus interface ports — pill notches in the membrane, one per kernel
            PortFact (r = (S, φ): existence, direction, and protocol are kernel
            facts; only the pixel position is computed here). */}
        {portsAt.map(({ port, at, angle }) => (
          <views.PortView
            key={`${port.component}-${port.env}`}
            port={port}
            at={at}
            angle={angle}
            onSelect={onSelectBoundary ? () => onSelectBoundary(at) : undefined}
          />
        ))}
        {flowlessAt.map(({ port, at, angle }) => (
          <g key={`authored-${port.component}`} opacity={0.6}>
            <views.PortView
              port={port}
              at={at}
              angle={angle}
              onSelect={onSelectBoundary ? () => onSelectBoundary(at) : undefined}
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
