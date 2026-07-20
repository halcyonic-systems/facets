// Mobus lens views. The boundary ring is reified as a real membrane (drawn by
// the stage backdrop); components carry process-primitive badges; env
// sources/sinks are open shapes; flows are typed strokes (material solid heavy,
// energy glowing, message thin/dashed — Message is a peer substance, copyable,
// not conserved). Exo flows render as two segments because G is bipartite
// (Tuple.lean): the crossing is env-object ↔ port, never straight to interior.
import type { PortFact, Relation } from "../../kernel/types";
import { KIND_COLOR } from "../types";
import { edgeGeometry, rimPoint, ringPoint, straightPath, thingById, NODE_R, type Pt } from "../geometry";
import { STYLE } from "../style";
import { EdgeScaffold, NodeBody, type EdgeStyle } from "./common";
import type { LensEdgeProps, LensNodeProps } from "./registry";

function NodeView({ thing, isOrphan, hovered, sim, onPointerDown, onHandlePointerDown }: LensNodeProps) {
  return (
    <NodeBody
      pending={isOrphan}
      thing={thing}
      hovered={hovered}
      sim={sim}
      onPointerDown={onPointerDown}
      onHandlePointerDown={onHandlePointerDown}
      isSquare={thing.role === "Environment"}
      showHalo={thing.role === "Component"}
      envOpen={thing.role === "Environment"}
      sphere={thing.role === "Component"}
      stroke="var(--lens-node-stroke)"
      strokeOpacity={1}
      strokeWidth={STYLE.nodeStrokeWidth}
      badge={thing.primitive}
      labelSmall={false}
      boundaryRim={false}
    />
  );
}

function edgeStyle(relation: Relation): EdgeStyle {
  switch (relation.kind) {
    case "Matter":
      return { color: KIND_COLOR[relation.kind], width: STYLE.edge.matter, opacity: 0.9 };
    case "Energy":
      return {
        color: KIND_COLOR[relation.kind],
        width: STYLE.edge.energy,
        opacity: 0.9,
        filter: STYLE.energyGlow.enabled ? "url(#energy-glow)" : undefined,
      };
    case "Informational":
      return { color: KIND_COLOR[relation.kind], width: STYLE.edge.info, dash: "1 4", opacity: 0.95 };
    default:
      return { color: KIND_COLOR[relation.kind], width: STYLE.edge.energy, opacity: 0.85 };
  }
}

function EdgeView({ model, relation, fact, ring, selected, driven, sim, onSelect }: LensEdgeProps) {
  const geo = edgeGeometry(model, relation, true);
  if (!geo) return null;
  const { d, labelAt } = geo;
  const style = edgeStyle(relation);

  // Exo flows render as TWO segments — G is bipartite (Tuple.lean): the crossing
  // happens env-object ↔ port, never straight to an interior component. The
  // interior routing stays visible but muted so which component the port serves
  // is not lost.
  let visible: { d: string; markered: boolean }[] = [{ d, markered: true }];
  let interior: string | null = null;
  if (ring && fact?.locus === "Exo" && relation.a !== relation.b) {
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

  // At Mobus an exo flow's name already labels its port (φ) — repeating it on
  // the edge doubles the text right at the membrane.
  // Pair the name with its flow-set (#80): an internal flow lives in N. Exo flows
  // (interior set) carry their name at the port φ and stay in G, so they skip this.
  const label =
    relation.name && interior === null ? (
      <text
        x={labelAt.x + (driven ? 9 : 0)}
        y={labelAt.y - 6}
        textAnchor={driven ? "start" : "middle"}
        fontSize={10}
        fill="var(--text-muted)"
        className="font-mono pointer-events-none"
      >
        {relation.name}
        <tspan fill="var(--text-secondary)">{" · N"}</tspan>
      </text>
    ) : null;

  return (
    <EdgeScaffold
      d={d}
      labelAt={labelAt}
      style={style}
      interior={interior}
      visible={visible}
      selected={selected}
      driven={driven}
      sim={sim}
      relationId={relation.id}
      onSelect={onSelect}
      label={label}
    />
  );
}

/** A Mobus interface — a round-edged capsule that PENETRATES the boundary (Fig.
 *  4.9), straddling the membrane along its outward normal so it reads as a
 *  pass-way, not a bead on the ring. The direction chevron points the way the
 *  substance crosses; ⇄ for a bidirectional message interface (Fig. 4.16).
 *  Interfaces gate, they don't transform. `angle` is the outward normal (rad). */
function PortView({
  port,
  at,
  angle = 0,
  onSelect,
}: {
  port: PortFact;
  at: Pt;
  angle?: number;
  onSelect?: () => void;
}) {
  const chevron =
    port.direction === "Receives"
      ? "M2.5-3.4 L-2 0 L2.5 3.4" // inward — flow enters
      : port.direction === "Exports"
        ? "M-2.5-3.4 L2 0 L-2.5 3.4" // outward — flow leaves
        : "M1-3 L4 0 L1 3 M-1-3 L-4 0 L-1 3"; // ⇄ hybrid
  const label = port.protocol.length > 22 ? `${port.protocol.slice(0, 21)}…` : port.protocol;
  const out = { x: Math.cos(angle), y: Math.sin(angle) };
  return (
    <g
      transform={`translate(${at.x}, ${at.y})`}
      className={onSelect ? "cursor-pointer" : undefined}
      onClick={
        onSelect &&
        ((e) => {
          e.stopPropagation();
          onSelect();
        })
      }
    >
      <title>{`interface — ${port.direction.toLowerCase()} · φ: ${port.protocol}`}</title>
      {/* long axis along the normal → half inside, half outside the membrane */}
      <g transform={`rotate(${(angle * 180) / Math.PI})`}>
        <rect
          x={-12}
          y={-7}
          width={24}
          height={14}
          rx={STYLE.portRx + 4}
          fill="var(--bg-primary)"
          stroke="var(--lens-accent)"
          strokeWidth={STYLE.portStrokeWidth}
        />
        <path d={chevron} fill="none" stroke="var(--lens-accent)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <text
        x={out.x * 20}
        y={out.y * 20}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={9}
        fill="var(--text-muted)"
        className="font-mono pointer-events-none"
      >
        {label}
      </text>
    </g>
  );
}

export const Mobus = { NodeView, EdgeView, PortView };
