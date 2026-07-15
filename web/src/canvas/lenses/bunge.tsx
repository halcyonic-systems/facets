// Bunge lens views. Boundary components are MARKED with a rim accent (never a
// drawn perimeter); connections split endo/exo as a kind-colored directed edge
// (one directed graph per connection-kind, §2.1); mere relations do not bond.
// Self-loops (feedback, the diagonal M_pp) render but flag their lack of a
// Mobus preimage — state the incompatibility, don't hide it.
import { KIND_COLOR } from "../types";
import type { EdgeFact, Relation } from "../../kernel/types";
import { edgeGeometry } from "../geometry";
import { EdgeScaffold, NodeBody, NullPortView, type EdgeStyle } from "./common";
import type { LensEdgeProps, LensNodeProps } from "./registry";

function NodeView({ thing, isBoundary, isOrphan, hovered, sim, onPointerDown, onHandlePointerDown }: LensNodeProps) {
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
      envOpen={false}
      stroke="var(--lens-node-stroke)"
      strokeOpacity={1}
      strokeWidth={1.75}
      labelSmall={false}
      boundaryRim={isBoundary}
    />
  );
}

function edgeStyle(relation: Relation, fact: EdgeFact | undefined): EdgeStyle {
  // Mere relations ("older than") make no difference and do not bond.
  if (!relation.is_bond) {
    return { color: "var(--text-muted)", width: 1.5, dash: "3 4", opacity: 0.7 };
  }
  // Endo/exo as an edge split — kernel-computed (edge ∈ N vs edge ∈ G), kind-colored.
  const exo = fact?.locus === "Exo";
  return {
    color: KIND_COLOR[relation.kind],
    width: exo ? 1.75 : 2.5,
    dash: exo ? "10 3" : undefined,
    opacity: 0.85,
  };
}

function EdgeView({ model, relation, fact, selected, driven, sim, onSelect }: LensEdgeProps) {
  const geo = edgeGeometry(model, relation, true);
  if (!geo) return null;
  const { d, labelAt } = geo;
  const style = edgeStyle(relation, fact);

  // Bunge shows self-loops but a diagonal bond has NO Mobus preimage
  // (FlowNetwork.lean no_self_loops). State the incompatibility, don't hide it.
  const overlay =
    fact && fact.self_loop && !fact.mobus_ok ? (
      <g transform={`translate(${labelAt.x + 16}, ${labelAt.y - 6})`} pointerEvents="all">
        <title>Bunge diagonal bond — no Mobus preimage (FlowNetwork.lean no_self_loops, §4.3 k ≠ o)</title>
        <circle r={9} fill="var(--bg-secondary)" stroke="var(--verdict-error)" strokeWidth={1.25} />
        <text textAnchor="middle" dominantBaseline="central" fontSize={8} fill="var(--verdict-error)" className="font-mono">
          ⊘M
        </text>
      </g>
    ) : null;

  const label = relation.name ? (
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
      interior={null}
      visible={[{ d, markered: true }]}
      selected={selected}
      driven={driven}
      sim={sim}
      relationId={relation.id}
      onSelect={onSelect}
      overlay={overlay}
      label={label}
    />
  );
}

export const Bunge = { NodeView, EdgeView, PortView: NullPortView };
