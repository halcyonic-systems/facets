// Mobus lens views. The boundary ring is reified as a real membrane (drawn by
// the stage backdrop); components carry process-primitive badges; env
// sources/sinks are open shapes; flows are typed strokes (material solid heavy,
// energy glowing, message thin/dashed — Message is a peer substance, copyable,
// not conserved). Exo flows render as two segments because G is bipartite
// (Tuple.lean): the crossing is env-object ↔ port, never straight to interior.
import type { PortFact, Relation } from "../../kernel/types";
import { KIND_COLOR } from "../types";
import { edgeGeometry, rimPoint, ringPoint, straightPath, thingById, NODE_R, type Pt } from "../geometry";
import { EdgeScaffold, NodeBody, type EdgeStyle } from "./common";
import type { LensEdgeProps, LensNodeProps } from "./registry";

function NodeView({ thing, hovered, sim, onPointerDown, onHandlePointerDown }: LensNodeProps) {
  return (
    <NodeBody
      thing={thing}
      hovered={hovered}
      sim={sim}
      onPointerDown={onPointerDown}
      onHandlePointerDown={onHandlePointerDown}
      isSquare={thing.role === "Environment"}
      showHalo={thing.role === "Component"}
      envOpen={thing.role === "Environment"}
      stroke="var(--lens-node-stroke)"
      strokeOpacity={1}
      strokeWidth={1.75}
      badge={thing.primitive}
      labelSmall={false}
      boundaryRim={false}
    />
  );
}

function edgeStyle(relation: Relation): EdgeStyle {
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

/** A Mobus interface — a pill notch breaking the membrane stroke (Fig. 4.9:
 *  "round-edged rectangles that penetrate the boundary"). Direction glyph:
 *  ▸ receives / ◂ exports / ⇄ hybrid. Interfaces gate, they don't transform. */
function PortView({ port, at }: { port: PortFact; at: Pt }) {
  const glyph = port.direction === "Receives" ? "▸" : port.direction === "Exports" ? "◂" : "⇄";
  const label = port.protocol.length > 22 ? `${port.protocol.slice(0, 21)}…` : port.protocol;
  return (
    <g transform={`translate(${at.x}, ${at.y})`}>
      <title>{`interface — ${port.direction.toLowerCase()} · φ: ${port.protocol}`}</title>
      <rect x={-16} y={-9} width={32} height={18} rx={9} fill="var(--bg-primary)" stroke="var(--lens-accent)" strokeWidth={1.75} />
      <text textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--lens-accent)" className="pointer-events-none">
        {glyph}
      </text>
      <text y={-15} textAnchor="middle" fontSize={9} fill="var(--text-muted)" className="font-mono pointer-events-none">
        {label}
      </text>
    </g>
  );
}

export const Mobus = { NodeView, EdgeView, PortView };
