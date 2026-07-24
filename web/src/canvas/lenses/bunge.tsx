// Bunge lens views. Boundary components are MARKED with a rim accent (never a
// drawn perimeter — the dashed hull the stage draws is the observer's C/E
// partition, not a boundary object); connections split endo/exo as a
// kind-colored directed edge (one directed graph per connection-kind, §2.1);
// mere relations do not bond.
// Self-loops (feedback, the diagonal M_pp) render but flag their lack of a
// Mobus preimage — state the incompatibility, don't hide it.
import { KIND_COLOR } from "../types";
import type { EdgeFact, Relation } from "../../kernel/types";
import { edgeGeometry } from "../geometry";
import { STYLE } from "../style";
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
      // Env things are the SAME SHAPE as components (#100 phase 0): an
      // environment item is a thing viewed from one level up, not another kind
      // of entity — which side of the hull it sits on carries the partition.
      isSquare={false}
      showHalo={thing.role === "Component"}
      envOpen={false}
      stroke="var(--lens-node-stroke)"
      strokeOpacity={1}
      strokeWidth={STYLE.nodeStrokeWidth}
      labelSmall={false}
      boundaryRim={isBoundary}
      // #100 phase 2: the readout is a state-space POSITION (Fig 1.5), not a
      // tank level — Bunge's states are properties of things, and the value
      // locates the thing in its state space. Trajectory/lawful region: the
      // compose seam's scope, see NodeBody's comment.
      simPosition
      envHint={thing.role === "Environment"}
    />
  );
}

function edgeStyle(relation: Relation, fact: EdgeFact | undefined): EdgeStyle {
  // Mere relations ("older than") make no difference and do not bond.
  if (!relation.is_bond) {
    return { color: "var(--text-muted)", width: STYLE.edge.mere, dash: "3 4", opacity: 0.7 };
  }
  // Endo/exo as an edge split — kernel-computed (edge ∈ N vs edge ∈ G), kind-colored.
  // The exo dash further reads the kernel's coupling channel (#100 phase 2 F6,
  // Bunge's own matrix grammar): an INPUT arrives in short marks (M₀ᵣ — ℰ acts
  // on 𝒞), an OUTPUT departs in long ones (Mₛ₀ — 𝒞 acts on ℰ); internuncial
  // actions (Mᵣₛ) stay solid. Subtle by intent — the direction arrow still
  // carries the action; the dash only says which side of the cut is acting.
  const exo = fact?.locus === "Exo";
  return {
    color: KIND_COLOR[relation.kind],
    width: exo ? STYLE.edge.exo : STYLE.edge.bond,
    dash: exo ? (fact?.channel === "Input" ? "4 5" : "12 4") : undefined,
    opacity: 0.85,
  };
}

/** Bunge's channel vocabulary, verbatim (input / output / internuncial —
 *  his M₀ᵣ / Mₛ₀ / Mᵣₛ matrix reading), for the edge's hover copy. */
export function channelCopy(fact: EdgeFact | undefined, isBond: boolean): string {
  if (!isBond) return "mere relation — holds between its relata but acts on neither (no channel; Bunge Def 1.1)";
  switch (fact?.channel) {
    case "Input":
      return "input — the environment acts on the composition (M₀ᵣ)";
    case "Output":
      return "output — the composition acts on the environment (Mₛ₀)";
    case "Internuncial":
      return "internuncial — component acts on component (Mᵣₛ)";
    default:
      return "coupling outside 𝒮 — neither relatum is in the composition";
  }
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

  // Pair the name with the connection's formalism (#80): ▷ for a bond that acts
  // on its things, ∼ for a mere relation that does not (Bunge Def 1.1).
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
      <tspan fill="var(--text-secondary)">{` ${relation.is_bond ? "▷" : "∼"}`}</tspan>
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
      title={channelCopy(fact, relation.is_bond)}
    />
  );
}

export const Bunge = { NodeView, EdgeView, PortView: NullPortView };
