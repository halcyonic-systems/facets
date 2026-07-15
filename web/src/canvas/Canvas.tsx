// The authoring + drive canvas — lifted from the bert-lenses-spike-svg canvas
// spike (NodeView/EdgeView + pan/drag/connect/place gestures) and extended for
// Phase 2b: a flow is clickable (drive), and a node/edge can carry a per-tick
// SimFrame readout from the scrubber. All of that readout is INDEXING — the
// canvas draws what it's given, it computes no dynamics and decides no
// legality. `validateConnection` still asks Rust before accepting a drawn edge.
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { CanvasModel, EdgeFact, Lens, LensFacts, PortFact, Relation, Thing } from "../kernel/types";
import { validateConnection } from "../kernel";
import { KIND_COLOR, PRIMITIVE_BADGE, type SimFrame } from "./types";
import { bezierPath, componentRing, midpoint, NODE_R, rimPoint, ringPoint, selfLoopPath, straightPath, type Pt, type Ring } from "./geometry";
import { humanize } from "../ui";

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
  driven?: Set<string>;
  sim?: SimFrame | null;
  onPanChange?: (pan: Pt) => void;
}

function nextId(ids: number[]): number {
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

function thingById(model: CanvasModel, id: number): Thing | undefined {
  return model.things.find((t) => t.id === id);
}

/** The `d` + label anchor for a drawn relation, shared by EdgeView and the
 *  DrivePopover anchor (App reads it to place the popover at the same point
 *  the edge renders its name) — pure pixel math, no systems meaning. */
export function edgeGeometry(
  model: CanvasModel,
  relation: Relation,
  curved: boolean,
): { d: string; labelAt: Pt } | null {
  const from = thingById(model, relation.a);
  const to = thingById(model, relation.b);
  if (!from || !to) return null;
  if (relation.a === relation.b) {
    const loop = selfLoopPath(from, NODE_R);
    return { d: loop.d, labelAt: loop.labelAt };
  }
  const a = rimPoint(from, to, NODE_R);
  const b = rimPoint(to, from, NODE_R);
  return { d: curved ? bezierPath(a, b) : straightPath(a, b), labelAt: midpoint(a, b) };
}

export default function Canvas({
  model,
  lens,
  facts = null,
  onModelChange,
  onReject,
  selectedRelationId = null,
  onSelectRelation,
  driven,
  sim,
  onPanChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });
  const panState = useRef<{ startClient: Pt; startPan: Pt } | null>(null);

  useEffect(() => {
    onPanChange?.(pan);
  }, [pan, onPanChange]);

  const [dragThing, setDragThing] = useState<number | null>(null);
  const dragOffset = useRef<Pt>({ x: 0, y: 0 });

  const [connectFrom, setConnectFrom] = useState<number | null>(null);
  const [connectPos, setConnectPos] = useState<Pt | null>(null);
  const [hoverTarget, setHoverTarget] = useState<number | null>(null);

  const [draft, setDraft] = useState<{ id: number; x: number; y: number; name: string } | null>(null);

  function toWorld(e: { clientX: number; clientY: number }): Pt {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left - pan.x, y: e.clientY - rect.top - pan.y };
  }

  function hitTest(p: Pt, exclude?: number): Thing | undefined {
    for (const t of model.things) {
      if (t.id === exclude) continue;
      if (Math.hypot(t.x - p.x, t.y - p.y) <= NODE_R) return t;
    }
    return undefined;
  }

  function onNodePointerDown(e: ReactPointerEvent, thing: Thing) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toWorld(e);
    setDragThing(thing.id);
    dragOffset.current = { x: p.x - thing.x, y: p.y - thing.y };
  }

  function onHandlePointerDown(e: ReactPointerEvent, thing: Thing) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setConnectFrom(thing.id);
    setConnectPos(toWorld(e));
  }

  function onStagePointerDown(e: ReactPointerEvent) {
    if (e.target !== e.currentTarget) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    panState.current = { startClient: { x: e.clientX, y: e.clientY }, startPan: pan };
  }

  function onStagePointerMove(e: ReactPointerEvent) {
    if (dragThing !== null) {
      const p = toWorld(e);
      const x = p.x - dragOffset.current.x;
      const y = p.y - dragOffset.current.y;
      onModelChange({
        ...model,
        things: model.things.map((t) => (t.id === dragThing ? { ...t, x, y } : t)),
      });
      return;
    }
    if (connectFrom !== null) {
      const p = toWorld(e);
      setConnectPos(p);
      const target = hitTest(p);
      setHoverTarget(target ? target.id : null);
      return;
    }
    if (panState.current) {
      const dx = e.clientX - panState.current.startClient.x;
      const dy = e.clientY - panState.current.startClient.y;
      setPan({ x: panState.current.startPan.x + dx, y: panState.current.startPan.y + dy });
    }
  }

  function onStagePointerUp(e: ReactPointerEvent) {
    if (dragThing !== null) {
      setDragThing(null);
      return;
    }
    if (connectFrom !== null) {
      const p = toWorld(e);
      const target = hitTest(p) ?? (hoverTarget !== null ? thingById(model, hoverTarget) : undefined);
      if (target) {
        const candidate: Relation = {
          id: nextId(model.relations.map((r) => r.id)),
          a: connectFrom,
          b: target.id,
          name: "",
          is_bond: true,
          kind: "Unspecified",
        };
        // Event handlers are outside React's render, so a kernel throw here
        // won't reach the error boundary — surface it as a reject toast instead
        // of an uncaught exception (the edge is simply not added).
        try {
          const verdict = validateConnection(model, candidate);
          if (verdict.issues.length === 0) {
            onModelChange({ ...model, relations: [...model.relations, candidate] });
          } else {
            onReject(verdict.issues[0].message);
          }
        } catch (err) {
          onReject(err instanceof Error ? err.message : String(err));
        }
      }
      setConnectFrom(null);
      setConnectPos(null);
      setHoverTarget(null);
      return;
    }
    panState.current = null;
  }

  function onStageDoubleClick(e: ReactMouseEvent) {
    if (e.target !== e.currentTarget) return;
    const p = toWorld(e);
    setDraft({ id: nextId(model.things.map((t) => t.id)), x: p.x, y: p.y, name: "" });
  }

  function commitDraft() {
    if (!draft) return;
    const name = draft.name.trim() || `T${draft.id}`;
    onModelChange({
      ...model,
      things: [...model.things, { id: draft.id, name, x: draft.x, y: draft.y, role: "Component" }],
    });
    setDraft(null);
  }

  const containerBox = boundingBox(model.things);

  // Kernel facts, indexed for the render loop. WHICH nodes are boundary, WHICH
  // edges are endo/exo/bond/self-loop, and WHICH ports exist are all Rust
  // verdicts; only their pixel placement is computed here.
  const boundarySet = new Set(facts?.boundary_thing_ids ?? []);
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

  return (
    <svg
      ref={svgRef}
      className="canvas-stage w-full h-full touch-none select-none"
      onPointerDown={onStagePointerDown}
      onPointerMove={onStagePointerMove}
      onPointerUp={onStagePointerUp}
      onDoubleClick={onStageDoubleClick}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-slate)" />
        </marker>
        {/* perceptive fuzziness → membrane edge blur (Mobus B properties) */}
        <filter id="ring-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={facts ? facts.boundary_props.perceptive_fuzziness * 6 : 0} />
        </filter>
        {/* energy flows glow (Mobus typed strokes) */}
        <filter id="energy-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="var(--accent)" floodOpacity="0.55" />
        </filter>
      </defs>
      <g transform={`translate(${pan.x}, ${pan.y})`}>
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
            fillOpacity={0.18}
            stroke="var(--accent-slate)"
            strokeWidth={2.5}
            strokeDasharray={
              facts && facts.boundary_props.porosity > 0
                ? `${Math.max(2, 14 - facts.boundary_props.porosity * 12)} ${2 + facts.boundary_props.porosity * 8}`
                : undefined
            }
            filter={facts && facts.boundary_props.perceptive_fuzziness > 0 ? "url(#ring-blur)" : undefined}
            pointerEvents="none"
          />
        )}

        {model.relations.map((r) => (
          <EdgeView
            key={r.id}
            model={model}
            relation={r}
            lens={lens}
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
            x1={thingById(model, connectFrom)?.x}
            y1={thingById(model, connectFrom)?.y}
            x2={connectPos.x}
            y2={connectPos.y}
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}

        {model.things.map((t) => (
          <NodeView
            key={t.id}
            thing={t}
            lens={lens}
            isBoundary={boundarySet.has(t.id)}
            hovered={hoverTarget === t.id}
            sim={sim?.nodes[t.name]}
            onPointerDown={(e) => onNodePointerDown(e, t)}
            onHandlePointerDown={(e) => onHandlePointerDown(e, t)}
          />
        ))}

        {/* Mobus interface ports — pill notches in the membrane, one per kernel
            PortFact (r = (S, φ): existence, direction, and protocol are kernel
            facts; only the pixel position is computed here). */}
        {portsAt.map(({ port, at }) => (
          <PortView key={`${port.component}-${port.env}`} port={port} at={at} />
        ))}

        {draft && (
          <foreignObject x={draft.x - 60} y={draft.y - 16} width={120} height={32}>
            <input
              autoFocus
              className="w-full rounded-md border px-2 py-1 text-xs font-body"
              style={{ borderColor: "var(--accent)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
              value={draft.name}
              placeholder="name…"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDraft();
                if (e.key === "Escape") setDraft(null);
              }}
              onBlur={commitDraft}
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

function NodeView({
  thing,
  lens,
  isBoundary,
  hovered,
  sim,
  onPointerDown,
  onHandlePointerDown,
}: {
  thing: Thing;
  lens: Lens;
  /** Kernel verdict: this component has an external flow (∈ boundary_thing_ids). */
  isBoundary: boolean;
  hovered: boolean;
  sim?: { value: number; unit: string; frac: number };
  onPointerDown: (e: ReactPointerEvent) => void;
  onHandlePointerDown: (e: ReactPointerEvent) => void;
}) {
  const isSquare = lens !== "Klir" && thing.role === "Environment";
  // Bunge's C/E wash: composition gets the soft halo, environment stays plain —
  // a set partition, deliberately NOT a boundary ring.
  const showHalo = lens !== "Klir" && thing.role === "Component";
  const badge = lens === "Mobus" ? thing.primitive : undefined;
  const stroke = lens === "Klir" ? "var(--text-secondary)" : "var(--accent-slate)";
  // Klir: nodes are recessed placeholders — thinghood is taken for granted,
  // the relation is the salient element (Facets Ch. 2).
  const strokeOpacity = lens === "Klir" ? 0.4 : 1;
  const strokeWidth = lens === "Klir" ? 1.25 : 1.75;
  // Mobus: env sources/sinks are open, unfilled shapes — their internals are
  // epistemically unknowable (§4.3.3.2.2).
  const envOpen = lens === "Mobus" && thing.role === "Environment";
  const frac = sim ? Math.max(0, Math.min(1, sim.frac)) : null;
  const clipId = `fill-clip-${thing.id}`;

  return (
    <g transform={`translate(${thing.x}, ${thing.y})`} onPointerDown={onPointerDown} className="cursor-grab">
      {showHalo && (
        <circle r={NODE_R + 10} fill="var(--accent-soft)" opacity={0.5} />
      )}
      {hovered && <circle r={NODE_R + 6} fill="none" stroke="var(--accent)" strokeWidth={2} />}

      {/* Bunge 1992: boundary components are MARKED (a rim accent on the nodes
          directly coupled to E), never a drawn perimeter. The same set Mobus
          reifies into ports — toggle the lens and watch it accrete. */}
      {lens === "Bunge" && isBoundary && (
        <circle r={NODE_R + 4} fill="none" stroke="var(--accent)" strokeWidth={2.25} strokeOpacity={0.9} />
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
              rx={6}
              fill="var(--accent)"
              opacity={0.32}
              clipPath={`url(#${clipId})`}
            />
          ) : (
            <circle r={NODE_R} fill="var(--accent)" opacity={0.32} clipPath={`url(#${clipId})`} />
          )}
        </>
      )}

      {isSquare ? (
        <rect
          x={-NODE_R}
          y={-NODE_R}
          width={NODE_R * 2}
          height={NODE_R * 2}
          rx={6}
          fill={envOpen ? "none" : "var(--bg-secondary)"}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          fillOpacity={frac !== null ? 0 : 1}
        />
      ) : (
        <circle
          r={NODE_R}
          fill="var(--bg-secondary)"
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          fillOpacity={frac !== null ? 0 : 1}
        />
      )}

      {badge && (
        <g transform={`translate(${NODE_R * 0.72}, ${-NODE_R * 0.72})`}>
          <circle r={10} fill="var(--accent)" />
          <text textAnchor="middle" dominantBaseline="central" fontSize={9} fill="white" className="font-mono">
            {PRIMITIVE_BADGE[badge]}
          </text>
        </g>
      )}

      {sim && (
        <text
          y={-NODE_R - 10}
          textAnchor="middle"
          fontSize={10}
          fill="var(--accent-strong)"
          className="font-mono tabular pointer-events-none"
        >
          {humanize(sim.value)} {sim.unit}
        </text>
      )}

      <text
        y={NODE_R + 16}
        textAnchor="middle"
        fontSize={lens === "Klir" ? 10 : 12}
        fill={lens === "Klir" ? "var(--text-muted)" : "var(--text-primary)"}
        className="font-body pointer-events-none"
      >
        {thing.name}
      </text>

      <circle
        cx={NODE_R * 0.75}
        cy={NODE_R * 0.75}
        r={7}
        fill="var(--bg-primary)"
        stroke="var(--accent)"
        strokeWidth={1.5}
        className="cursor-crosshair"
        onPointerDown={onHandlePointerDown}
      />
    </g>
  );
}

/** Per-lens stroke styling for the visible path — every branch below reads a
 *  kernel fact (locus, bond, kind), never re-derives one. */
function edgeStyle(
  lens: Lens,
  relation: Relation,
  fact: EdgeFact | undefined,
): { color: string; width: number; dash?: string; opacity: number; filter?: string } {
  if (lens === "Klir") {
    // The relation is the salient, designed element — neutral, substance-blind
    // (material/energy/message vocabulary is Mobus's, not Klir's).
    return { color: "var(--text-secondary)", width: 2.5, opacity: 0.9 };
  }
  if (lens === "Bunge") {
    // Mere relations ("older than") make no difference and do not bond.
    if (!relation.is_bond) {
      return { color: "var(--text-muted)", width: 1.5, dash: "3 4", opacity: 0.7 };
    }
    // Endo/exo as an edge split — kernel-computed (edge ∈ N vs edge ∈ G),
    // kind-colored (Bunge §2.1: one directed graph per connection-kind).
    const exo = fact?.locus === "Exo";
    return {
      color: KIND_COLOR[relation.kind],
      width: exo ? 1.75 : 2.5,
      dash: exo ? "10 3" : undefined,
      opacity: 0.85,
    };
  }
  // Mobus: typed flow strokes — material solid heavy, energy glowing, message
  // thin and dashed (Message is a peer substance, copyable, not conserved).
  switch (relation.kind) {
    case "Matter":
      return { color: KIND_COLOR[relation.kind], width: 3, opacity: 0.9 };
    case "Energy":
      return { color: KIND_COLOR[relation.kind], width: 2, opacity: 0.9, filter: "url(#energy-glow)" };
    case "Informational":
      return { color: KIND_COLOR[relation.kind], width: 1.25, dash: "1 4", opacity: 0.95 };
    default:
      return { color: KIND_COLOR[relation.kind], width: 2, opacity: 0.85 };
  }
}

function EdgeView({
  model,
  relation,
  lens,
  fact,
  ring,
  sigIndex,
  selected,
  driven,
  sim,
  onSelect,
}: {
  model: CanvasModel;
  relation: Relation;
  lens: Lens;
  /** The kernel's reading of this relation through the edge ladder. */
  fact?: EdgeFact;
  ring: Ring | null;
  sigIndex: number;
  selected: boolean;
  driven: boolean;
  sim?: { value: number; unit: string };
  onSelect?: (id: number) => void;
}) {
  const curved = lens !== "Klir";
  const geo = edgeGeometry(model, relation, curved);
  if (!geo) return null;
  const { d, labelAt } = geo;

  const style = edgeStyle(lens, relation, fact);
  // Klir: undirected neutral lines by default; direction is the observer's
  // explicit per-relation toggle. Bunge/Mobus: always directed.
  const marker = lens === "Klir" ? relation.klir_directed === true : true;

  // Mobus exo flows render as TWO segments — G is bipartite (Tuple.lean): the
  // crossing happens env-object ↔ port, never straight to an interior
  // component. The interior routing stays visible but muted so which component
  // the port serves is not lost.
  let visible: { d: string; markered: boolean }[] = [{ d, markered: marker }];
  let interior: string | null = null;
  if (lens === "Mobus" && ring && fact?.locus === "Exo" && relation.a !== relation.b) {
    const from = thingById(model, relation.a);
    const to = thingById(model, relation.b);
    if (from && to) {
      const [env, comp] = from.role === "Environment" ? [from, to] : [to, from];
      const portPt = ringPoint(ring, env);
      const envRim = rimPoint(env, portPt, NODE_R);
      const compRim = rimPoint(comp, portPt, NODE_R);
      const crossing =
        from.role === "Environment"
          ? straightPath(envRim, portPt) // env → port (flow enters at the interface)
          : straightPath(portPt, envRim); // port → env (flow exits at the interface)
      visible = [{ d: crossing, markered: true }];
      interior = straightPath(compRim, portPt);
    }
  }

  return (
    <g>
      {/* invisible wide hit-path — the click target for "drive this flow" */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: onSelect ? "pointer" : "default" }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(relation.id);
        }}
      />
      {selected && (
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth={6} strokeOpacity={0.22} pointerEvents="none" />
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
      {driven && (
        <circle cx={labelAt.x} cy={labelAt.y - 6} r={4} fill="var(--accent)" pointerEvents="none" />
      )}
      {/* Bunge shows self-loops (feedback, the diagonal M_pp) — but a diagonal
          bond has NO Mobus preimage (FlowNetwork.lean no_self_loops). State the
          incompatibility, don't hide it. */}
      {lens === "Bunge" && fact && fact.self_loop && !fact.mobus_ok && (
        <g transform={`translate(${labelAt.x + 16}, ${labelAt.y - 6})`} pointerEvents="all">
          <title>Bunge diagonal bond — no Mobus preimage (FlowNetwork.lean no_self_loops, §4.3 k ≠ o)</title>
          <circle r={9} fill="var(--bg-secondary)" stroke="var(--verdict-error)" strokeWidth={1.25} />
          <text textAnchor="middle" dominantBaseline="central" fontSize={8} fill="var(--verdict-error)" className="font-mono">
            ⊘M
          </text>
        </g>
      )}
      {lens === "Klir" ? (
        // Relation-by-signature: arity / Cartesian form — the observer's
        // vocabulary, never substance types.
        <text
          x={labelAt.x}
          y={labelAt.y - 8}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-secondary)"
          className="font-mono pointer-events-none"
        >
          {`r${sigIndex + 1} ⊆ T×T${relation.klir_directed ? " (directed)" : ""}`}
        </text>
      ) : (
        // At Mobus an exo flow's name already labels its port (φ) — repeating
        // it on the edge doubles the text right at the membrane.
        relation.name &&
        !(lens === "Mobus" && interior !== null) && (
          <text
            x={labelAt.x + (driven ? 9 : 0)}
            y={labelAt.y - 6}
            textAnchor={driven ? "start" : "middle"}
            fontSize={10}
            fill="var(--text-muted)"
            className="font-mono pointer-events-none"
          >
            {relation.name}
          </text>
        )
      )}
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

/** A Mobus interface — a pill notch breaking the membrane stroke (Fig. 4.9:
 *  "round-edged rectangles that penetrate the boundary"). Direction glyph:
 *  ▸ receives / ◂ exports / ⇄ hybrid. Interfaces gate, they don't transform. */
function PortView({ port, at }: { port: PortFact; at: Pt }) {
  const glyph = port.direction === "Receives" ? "▸" : port.direction === "Exports" ? "◂" : "⇄";
  const label = port.protocol.length > 22 ? `${port.protocol.slice(0, 21)}…` : port.protocol;
  return (
    <g transform={`translate(${at.x}, ${at.y})`}>
      <title>{`interface — ${port.direction.toLowerCase()} · φ: ${port.protocol}`}</title>
      <rect
        x={-16}
        y={-9}
        width={32}
        height={18}
        rx={9}
        fill="var(--bg-primary)"
        stroke="var(--accent-strong)"
        strokeWidth={1.75}
      />
      <text textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--accent-strong)" className="pointer-events-none">
        {glyph}
      </text>
      <text y={-15} textAnchor="middle" fontSize={9} fill="var(--text-muted)" className="font-mono pointer-events-none">
        {label}
      </text>
    </g>
  );
}
