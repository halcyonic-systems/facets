// The authoring + drive canvas. It draws what the kernel gives it and computes
// no dynamics and decides no legality: WHICH nodes are boundary, WHICH edges are
// endo/exo/bond/self-loop, and WHICH ports exist are all Rust verdicts (read off
// `facts`); only their pixel placement is computed here. Gestures live in
// `useCanvasGestures` (pointer events → a pure reducer); per-lens rendering lives
// in the `LensRegistry` (stateless views, one set per lens). This file is the
// stage: backdrops, the render loop, and the node-name draft input.
import { useEffect, useRef } from "react";
import type { CanvasModel, EdgeFact, Lens, LensFacts, PortFact, Thing } from "../kernel/types";
import type { SimFrame } from "./types";
import { componentRing, ringPoint, thingById, NODE_R, type Pt, type Ring } from "./geometry";
import { useCanvasGestures } from "./useCanvasGestures";
import { STYLE } from "./style";
import { LensRegistry, type PaletteTool } from "./lenses/registry";

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
  /** Click the Mobus membrane (or a port — interfaces belong to B) to open the
   *  boundary inspector; the anchor is a world-space point on the ring. */
  onSelectBoundary?: (at: Pt) => void;
  driven?: Set<string>;
  sim?: SimFrame | null;
  onPanChange?: (pan: Pt) => void;
  onScaleChange?: (scale: number) => void;
  /** Bump to request a fit-to-content pass against the current viewport (e.g.
   *  after an SL compile lays the model out around a fixed center that may sit
   *  outside the narrower SL-pane viewport). Each distinct value fits once. */
  fitToken?: number;
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
  onSelectBoundary,
  driven,
  sim,
  onPanChange,
  onScaleChange,
  fitToken,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gestures = useCanvasGestures({ model, svgRef, onModelChange, onReject, armed, onSelectThing });
  const { pan, scale, connectFrom, connectPos, hoverTarget, draft } = gestures.state;

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

  // Mobus: B = ⟨P, I⟩ reified — the membrane around the components (env objects
  // stay outside; an env thing dragged inside the ellipse is a layout artifact,
  // not a semantic error: C ∩ E = ∅ is enforced by the kernel's roles).
  const ring: Ring | null =
    lens === "Mobus" ? componentRing(model.things.filter((t) => t.role === "Component")) : null;
  const portsAt: { port: PortFact; at: Pt }[] =
    ring && facts
      ? facts.ports.flatMap((port) => {
          const env = thingById(model, port.env);
          return env ? [{ port, at: ringPoint(ring, env) }] : [];
        })
      : [];

  // Authored-flowless interfaces (kernel fact: authored ∖ flow-crossing) get a
  // notch too — placed at the ring point toward the designated component itself
  // (the membrane meets the component; no env object exists to aim at). The
  // display attrs are presentation; membership in I is the kernel's.
  const flowlessAt: { port: PortFact; at: Pt }[] =
    ring && facts
      ? facts.authored_interface_thing_ids
          .filter((id) => !facts.ports.some((p) => p.component === id))
          .flatMap((id) => {
            const comp = thingById(model, id);
            return comp
              ? [
                  {
                    port: {
                      component: id,
                      env: -1,
                      relation_ids: [],
                      direction: "Hybrid" as const,
                      protocol: "(flowless)",
                    },
                    at: ringPoint(ring, comp),
                  },
                ]
              : [];
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
      onDoubleClick={gestures.onStageDoubleClick}
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

        {/* Mobus: the boundary ring is the star — a real membrane, drawn behind
            the flows. Porosity → dash density; fuzziness → edge blur. Bunge gets
            NO ring: its boundary is a marked component-subset, never a perimeter. */}
        {ring && (
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

        {model.things.map((t) => (
          <views.NodeView
            key={t.id}
            thing={t}
            isBoundary={boundarySet.has(t.id)}
            isOrphan={orphanSet.has(t.id)}
            hovered={hoverTarget === t.id}
            sim={sim?.nodes[t.name]}
            onPointerDown={(e) => gestures.onNodePointerDown(e, t)}
            onHandlePointerDown={(e) => gestures.onHandlePointerDown(e, t)}
          />
        ))}

        {/* Mobus interface ports — pill notches in the membrane, one per kernel
            PortFact (r = (S, φ): existence, direction, and protocol are kernel
            facts; only the pixel position is computed here). */}
        {portsAt.map(({ port, at }) => (
          <views.PortView
            key={`${port.component}-${port.env}`}
            port={port}
            at={at}
            onSelect={onSelectBoundary ? () => onSelectBoundary(at) : undefined}
          />
        ))}
        {flowlessAt.map(({ port, at }) => (
          <g key={`authored-${port.component}`} opacity={0.6}>
            <views.PortView
              port={port}
              at={at}
              onSelect={onSelectBoundary ? () => onSelectBoundary(at) : undefined}
            />
          </g>
        ))}

        {draft && (
          <foreignObject x={draft.x - 60} y={draft.y - 16} width={120} height={32}>
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
