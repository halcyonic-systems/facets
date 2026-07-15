// Klir lens views. Boundary is the investigator's drawn distinction (handled by
// the stage backdrop, not here); nodes are recessed placeholders and the
// relation is the salient, designed element — labelled by signature (arity /
// Cartesian form), never by substance type (that vocabulary is Mobus's).
import { edgeGeometry } from "../geometry";
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
      stroke="var(--text-secondary)"
      strokeOpacity={0.4}
      strokeWidth={1.25}
      labelSmall={true}
      boundaryRim={false}
    />
  );
}

// The relation is neutral, substance-blind: no material/energy/message coloring.
const KLIR_STYLE: EdgeStyle = { color: "var(--text-secondary)", width: 2.5, opacity: 0.9 };

function EdgeView({ model, relation, sigIndex, selected, driven, sim, onSelect }: LensEdgeProps) {
  const geo = edgeGeometry(model, relation, false);
  if (!geo) return null;
  const { d, labelAt } = geo;
  // Direction is the observer's explicit per-relation toggle; default undirected.
  const marker = relation.klir_directed === true;
  const label = (
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
  );
  return (
    <EdgeScaffold
      d={d}
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
