// Klir lens views. Boundary is the investigator's drawn distinction (handled by
// the stage backdrop, not here); nodes are recessed placeholders and the
// relation is the salient, designed element — labelled by signature (arity /
// Cartesian form), never by substance type (that vocabulary is Mobus's).
import { edgeGeometry } from "../geometry";
import { STYLE } from "../style";
import { EdgeScaffold, NodeBody, NullPortView, type EdgeStyle } from "./common";
import type { LensEdgeProps, LensNodeProps } from "./registry";

function NodeView({ thing, hovered, sim, onPointerDown, onHandlePointerDown }: LensNodeProps) {
  return (
    <NodeBody
      thing={thing}
      hovered={hovered}
      sim={sim}
      onPointerDown={onPointerDown}
      onHandlePointerDown={onHandlePointerDown}
      isSquare={false}
      showHalo={false}
      envOpen={false}
      stroke="var(--lens-node-stroke)"
      strokeOpacity={STYLE.klirNode.opacity}
      strokeWidth={STYLE.klirNode.width}
      labelSmall={true}
      boundaryRim={false}
    />
  );
}

// The relation is neutral, substance-blind: no material/energy/message coloring.
const KLIR_STYLE: EdgeStyle = { color: "var(--text-secondary)", width: STYLE.edge.klir, opacity: 0.9 };

function EdgeView({ model, relation, sigIndex, selected, driven, sim, onSelect }: LensEdgeProps) {
  const geo = edgeGeometry(model, relation, false);
  if (!geo) return null;
  const { d, labelAt } = geo;
  // Direction is the observer's explicit per-relation toggle; default undirected.
  //
  // BONDHOOD (#320): Klir is EXEMPT, deliberately. `(T, R)` has no bond/non-bond
  // split — every authored relation is a member of R and counts the same — so
  // `is_bond` names nothing this lens can see, and drawing a distinction here
  // would encode a Bunge construct in Klir's chrome. Which also means the rule
  // "an arrowhead asserts a bond" is LENS-RELATIVE, not global: under Klir this
  // head asserts that the observer toggled the relation directed, and nothing
  // more. The head is the neutral slate `arrow` for the same reason the line is
  // substance-blind.
  const marker = relation.klir_directed === true;
  // Pair the name with the signature (#80): the name to anchor on, the formalism
  // to read. Without a name the relation was pure notation — the bounce-off case.
  const sig = `r${sigIndex + 1} ⊆ T×T${relation.klir_directed ? " (directed)" : ""}`;
  const label = relation.name ? (
    <text x={labelAt.x} y={labelAt.y - 12} textAnchor="middle" className="font-mono pointer-events-none">
      <tspan x={labelAt.x} fontSize={11} fill="var(--text-secondary)">
        {relation.name}
      </tspan>
      <tspan x={labelAt.x} dy={11} fontSize={9} fill="var(--text-muted)">
        {sig}
      </tspan>
    </text>
  ) : (
    <text
      x={labelAt.x}
      y={labelAt.y - 8}
      textAnchor="middle"
      fontSize={10}
      fill="var(--text-secondary)"
      className="font-mono pointer-events-none"
    >
      {sig}
    </text>
  );
  return (
    <EdgeScaffold
      labelAt={labelAt}
      style={KLIR_STYLE}
      interior={null}
      visible={[{ d, markered: marker }]}
      selected={selected}
      driven={driven}
      sim={sim}
      relationId={relation.id}
      onSelect={onSelect}
      label={label}
    />
  );
}

export const Klir = { NodeView, EdgeView, PortView: NullPortView };
