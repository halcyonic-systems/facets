// Mobus lens views. The boundary ring is reified as a real membrane (drawn by
// the stage backdrop); components carry process-primitive badges; env
// sources/sinks are open shapes; flows are typed strokes (material solid heavy,
// energy glowing, message thin/dashed — Message is a peer substance, copyable,
// not conserved). Exo flows render as two segments because G is bipartite
// (Tuple.lean): the crossing is env-object ↔ port, never straight to interior.
import type { PortFact, Relation } from "../../kernel/types";
import { KIND_COLOR } from "../types";
import { edgeGeometry, rimPoint, ringPoint, straightPath, thingById, NODE_R } from "../geometry";
import { STYLE } from "../style";
import { EdgeScaffold, NodeBody, type EdgeStyle } from "./common";
import type { LensEdgeProps, LensNodeProps, LensPortProps } from "./registry";

function NodeView({ thing, isOrphan, hovered, sim, onPointerDown, onHandlePointerDown }: LensNodeProps) {
  // Modulating is Mobus's regulator/decision process — reify it as a triangle
  // (Fig. 4.17), the shape carrying what the corner badge otherwise would,
  // so the badge is dropped for it to avoid a doubled marker.
  const isRegulator = thing.role === "Component" && thing.primitive === "Modulating";
  const shape = thing.role === "Environment" ? "square" : isRegulator ? "triangle" : "circle";
  return (
    <NodeBody
      pending={isOrphan}
      thing={thing}
      hovered={hovered}
      sim={sim}
      onPointerDown={onPointerDown}
      onHandlePointerDown={onHandlePointerDown}
      shape={shape}
      showHalo={thing.role === "Component"}
      envOpen={thing.role === "Environment"}
      stroke="var(--lens-node-stroke)"
      strokeOpacity={1}
      strokeWidth={STYLE.nodeStrokeWidth}
      badge={isRegulator ? undefined : thing.primitive}
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

/** A Mobus interface — a notch breaking the membrane (Fig. 4.9: "round-edged
 *  rectangles that penetrate the boundary"), its outline carrying direction:
 *  an arrowhead pointing inward receives, outward exports, a diamond is hybrid.
 *  The notch rotates to the membrane normal so the arrow reads before any glyph;
 *  φ rides above as the protocol label. Interfaces gate, they don't transform. */
function portNotch(direction: PortFact["direction"]): string {
  // Local frame: +x is the outward normal (the caller rotates it there); the
  // membrane runs along ±y. A home-plate whose tip points inward/outward gives
  // the direction its outline; the hybrid is a symmetric diamond.
  switch (direction) {
    case "Receives":
      return "-15,0 -2,-9 15,-9 15,9 -2,9";
    case "Exports":
      return "15,0 2,-9 -15,-9 -15,9 2,9";
    default:
      return "15,0 0,-9 -15,0 0,9";
  }
}

function PortView({ port, at, normal, onSelect }: LensPortProps) {
  const label = port.protocol.length > 22 ? `${port.protocol.slice(0, 21)}…` : port.protocol;
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
      <polygon
        transform={`rotate(${(normal * 180) / Math.PI})`}
        points={portNotch(port.direction)}
        strokeLinejoin="round"
        fill="var(--bg-primary)"
        stroke="var(--lens-accent)"
        strokeWidth={STYLE.portStrokeWidth}
      />
      <text y={-15} textAnchor="middle" fontSize={9} fill="var(--text-muted)" className="font-mono pointer-events-none">
        {label}
      </text>
    </g>
  );
}

export const Mobus = { NodeView, EdgeView, PortView };
