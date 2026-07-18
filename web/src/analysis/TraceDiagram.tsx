// The Trace/Evidence flow, rendered as a small inline SVG instead of a wall of
// text (#72). Nodes are the entities the narration cites; arrows are the hops it
// draws between them. Each node clicks through to the canvas on the SAME
// onNavigate seam the chips ride — the diagram is the chips, laid out as a graph.
// Presentation only; the graph is built in diagram.ts from resolved citations.
import type { CitationResolver } from "./citations";
import type { IssueTarget } from "../kernel/types";
import { buildTraceDiagram, type DiagramNode } from "./diagram";

export function TraceDiagram({
  trace,
  evidence,
  resolver,
  onNavigate,
}: {
  trace: string[];
  evidence: string[];
  resolver: CitationResolver;
  onNavigate: (target: IssueTarget) => void;
}) {
  const graph = buildTraceDiagram(trace, evidence, resolver);
  if (!graph) return null;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        width={graph.width}
        height={graph.height}
        role="img"
        aria-label="Trace flow: the entities the analysis cites and how it links them"
        style={{ maxWidth: "100%", height: "auto", display: "block" }}
      >
        <defs>
          <marker
            id="analyst-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth={6}
            markerHeight={6}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-slate)" />
          </marker>
        </defs>

        {graph.edges.map((e) => (
          <path
            key={`${e.from}->${e.to}`}
            d={e.d}
            fill="none"
            stroke="var(--accent-slate)"
            strokeWidth={1.25}
            markerEnd="url(#analyst-arrow)"
          />
        ))}

        {graph.nodes.map((n) => (
          <NodeChip key={n.key} node={n} onNavigate={onNavigate} />
        ))}
      </svg>
    </div>
  );
}

// A clickable chip mirroring the Cited chip: lens accent, rounded, click-through.
// A relation reads as a dashed outline (it is the canvas's edge, not a node), a
// thing as a solid one.
function NodeChip({
  node,
  onNavigate,
}: {
  node: DiagramNode;
  onNavigate: (target: IssueTarget) => void;
}) {
  const isRelation = node.kind === "relation";
  return (
    <g
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(node.target)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onNavigate(node.target);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      <title>{`${node.label}: click to select on the canvas`}</title>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={node.h / 2}
        fill="var(--lens-accent-soft)"
        stroke="var(--lens-accent)"
        strokeWidth={1}
        strokeDasharray={isRelation ? "3 2" : undefined}
      />
      <text
        x={node.x + node.w / 2}
        y={node.y + node.h / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fill="var(--lens-accent)"
      >
        {node.label}
      </text>
    </g>
  );
}
