// Derive a small dependency/flow graph from the Analyst's Trace/Evidence — the
// `visual` the five-part grammar reserves, computed HERE from the citation
// tokens the narration already carries rather than trusted from the LLM. Same
// hallucination guard as the chips: only tokens that resolve to real canvas ids
// become nodes, so a fabricated element can never enter the diagram. No systems
// logic — pure display layout over resolved citations.
import { parseCitations, type CitationResolver } from "./citations";
import type { IssueTarget } from "../kernel/types";

export type NodeKind = "thing" | "relation";

export interface DiagramNode {
  key: string; // `${kind}:${id}` — the dedup identity
  kind: NodeKind;
  label: string;
  target: IssueTarget; // the click-through subject (same seam as the chips)
  x: number; // top-left of the chip
  y: number;
  w: number;
  h: number;
}

export interface DiagramEdge {
  from: string;
  to: string;
  d: string; // an SVG path `d`, source rim → target rim
}

export interface TraceDiagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  width: number;
  height: number;
}

// Chip metrics — fixed height, width approximated from the (truncated) label so
// the layered layout can place chips without measuring the DOM.
const CHIP_H = 26;
const CHAR_W = 6.6; // ~11px label
const CHIP_PAD_X = 20;
const CHIP_MIN_W = 44;
const CHIP_MAX_W = 132;
const MAX_LABEL = 20;
const COL_GAP = 46; // horizontal space between layers (room for the arrow)
const ROW_GAP = 12; // vertical space between chips in a layer
const MARGIN = 8;

function kindOf(t: IssueTarget): NodeKind {
  return t.thing !== null ? "thing" : "relation";
}

function idOf(t: IssueTarget): number {
  return (t.thing ?? t.relation) as number;
}

function truncate(label: string): string {
  return label.length > MAX_LABEL ? label.slice(0, MAX_LABEL - 1) + "…" : label;
}

function chipWidth(label: string): number {
  const w = truncate(label).length * CHAR_W + CHIP_PAD_X;
  return Math.max(CHIP_MIN_W, Math.min(CHIP_MAX_W, w));
}

// Pull the ordered, resolved citation subjects out of one narration line. Only
// navigable tokens survive (parseCitations already dropped the rest to text).
function citedTargets(line: string, r: CitationResolver): { key: string; target: IssueTarget; label: string }[] {
  const out: { key: string; target: IssueTarget; label: string }[] = [];
  for (const seg of parseCitations(line, r)) {
    if (seg.kind !== "cite") continue;
    out.push({ key: `${kindOf(seg.target)}:${idOf(seg.target)}`, target: seg.target, label: seg.label });
  }
  return out;
}

// Longest-path layering, cycle-safe: relax `layer[v] = max(layer[v], layer[u]+1)`
// over every edge, |V| passes. A DAG settles to true longest-path depths; a cycle
// simply stops at the cap instead of looping forever.
function layerNodes(keys: string[], edges: { from: string; to: string }[]): Map<string, number> {
  const layer = new Map<string, number>(keys.map((k) => [k, 0]));
  for (let pass = 0; pass < keys.length; pass++) {
    let moved = false;
    for (const e of edges) {
      const next = (layer.get(e.from) ?? 0) + 1;
      if (next > (layer.get(e.to) ?? 0)) {
        layer.set(e.to, next);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return layer;
}

// A cubic path from the source chip's right-center to the target chip's
// left-center, bowed toward the horizontal — the same left-to-right flow the
// canvas edges read as. Arrow lands on the target rim (the marker's refX insets
// it). Falls back to a centre-to-centre line when chips share a column.
function edgePath(a: DiagramNode, b: DiagramNode): string {
  const ax = a.x + a.w;
  const ay = a.y + a.h / 2;
  const bx = b.x;
  const by = b.y + b.h / 2;
  const dx = Math.max(Math.abs(bx - ax) * 0.4, 16);
  return `M ${ax} ${ay} C ${ax + dx} ${ay}, ${bx - dx} ${by}, ${bx} ${by}`;
}

/** Build the flow graph, or null when there is nothing worth drawing (fewer than
 *  two distinct nodes, or no edge between them — the panel then shows text only). */
export function buildTraceDiagram(
  trace: string[],
  evidence: string[],
  r: CitationResolver,
): TraceDiagram | null {
  const nodeIndex = new Map<string, { target: IssueTarget; label: string }>();
  const edgeSet = new Set<string>();
  const edges: { from: string; to: string }[] = [];

  // Each narration line is a reasoning step; consecutive elements it names form
  // a directed hop (A grounds B → A → B). Trace and evidence both contribute.
  for (const line of [...trace, ...evidence]) {
    const cited = citedTargets(line, r);
    for (const c of cited) if (!nodeIndex.has(c.key)) nodeIndex.set(c.key, { target: c.target, label: c.label });
    for (let i = 0; i + 1 < cited.length; i++) {
      const from = cited[i].key;
      const to = cited[i + 1].key;
      if (from === to) continue;
      const ek = `${from}->${to}`;
      if (edgeSet.has(ek)) continue;
      edgeSet.add(ek);
      edges.push({ from, to });
    }
  }

  if (nodeIndex.size < 2 || edges.length === 0) return null;

  const keys = [...nodeIndex.keys()];
  const layer = layerNodes(keys, edges);

  // Stack the nodes of each layer into a column, columns spaced by the widest
  // chip they hold so nothing overlaps.
  const byLayer = new Map<number, string[]>();
  for (const k of keys) {
    const l = layer.get(k) ?? 0;
    (byLayer.get(l) ?? byLayer.set(l, []).get(l)!).push(k);
  }

  const nodes = new Map<string, DiagramNode>();
  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  let colX = MARGIN;
  let maxBottom = MARGIN;
  for (const l of layers) {
    const col = byLayer.get(l)!;
    let colW = 0;
    let rowY = MARGIN;
    for (const k of col) {
      const meta = nodeIndex.get(k)!;
      const w = chipWidth(meta.label);
      colW = Math.max(colW, w);
      nodes.set(k, {
        key: k,
        kind: k.startsWith("thing:") ? "thing" : "relation",
        label: truncate(meta.label),
        target: meta.target,
        x: colX,
        y: rowY,
        w,
        h: CHIP_H,
      });
      rowY += CHIP_H + ROW_GAP;
    }
    maxBottom = Math.max(maxBottom, rowY - ROW_GAP);
    colX += colW + COL_GAP;
  }

  const drawnEdges: DiagramEdge[] = edges.map((e) => ({
    from: e.from,
    to: e.to,
    d: edgePath(nodes.get(e.from)!, nodes.get(e.to)!),
  }));

  return {
    nodes: [...nodes.values()],
    edges: drawnEdges,
    width: colX - COL_GAP + MARGIN,
    height: maxBottom + MARGIN,
  };
}
