import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, type Edge } from "@xyflow/react";
import type { Kind, Lens, Relation } from "../kernel/types";
import { KIND_COLOR } from "../kernel/types";

export type RelationEdgeData = {
  relation: Relation;
  lens: Lens;
};

export type RelationEdgeType = Edge<RelationEdgeData, "relation">;

const INK_SOFT = "var(--text-muted)";

export function markerId(kind: Kind): string {
  return `bl-arrow-${kind}`;
}

/** Curved flows: an undirected ink-soft line at Klir; a directed, kind-colored,
 * (dashed if a mere relation) bond at Bunge/Mobus. Same Relation, different read. */
export function RelationEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<RelationEdgeType>) {
  const relation = data!.relation;
  const lens = data!.lens;
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  const isKlir = lens === "Klir";
  const isBond = relation.is_bond ?? true;
  const kind = relation.kind ?? "Unspecified";
  const color = isKlir ? INK_SOFT : KIND_COLOR[kind];

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={isKlir ? undefined : `url(#${markerId(kind)})`}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.75,
          strokeDasharray: isBond ? undefined : "5 4",
          opacity: selected ? 1 : 0.85,
        }}
      />
      {relation.name && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan select-none"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
              background: "var(--bg-primary)",
              padding: "1px 5px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--hairline)",
            }}
          >
            {relation.name}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
