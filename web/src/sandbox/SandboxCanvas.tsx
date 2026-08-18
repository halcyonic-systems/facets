// The sandbox canvas: hand-rolled SVG (ADR-0001 — no graph library), the
// desktop shell's interaction grammar re-expressed for the pointer:
//
//   drag a node's BODY   → move it (position is UI state, engine-mirrored)
//   drag a node's ∘ PORT → wire it (drop on another node; Alt = gradient)
//   click a node / wire  → select (the inspector shows it)
//   Delete / Backspace   → remove the selection
//   Escape               → cancel a pending wire / clear selection
//
// The canvas renders the SNAPSHOT — engine truth — and never computes a
// number itself: activity, storage, and wire deliveries arrive computed.

import { useEffect, useRef, useState } from "react";
import type { SandboxSnapshot } from "../kernel/types";

export interface CanvasSelection {
  kind: "node" | "wire";
  index: number;
}

interface Props {
  snapshot: SandboxSnapshot;
  selected: CanvasSelection | null;
  onSelect: (sel: CanvasSelection | null) => void;
  onMoveNode: (i: number, x: number, y: number) => void;
  onWire: (from: number, to: number, mode: "pushed" | "gradient") => void;
  onDelete: (sel: CanvasSelection) => void;
}

const NODE_W = 92;
const NODE_H = 40;

/** The node sparkline path: the spark ring scaled into a strip along the
 *  node's lower edge, normalized to its own max (shape, not magnitude). */
function sparkPoints(spark: number[]): string {
  const max = Math.max(...spark, 1e-6);
  const x0 = 46;
  const w = NODE_W - x0 - 6;
  const y0 = NODE_H - 6;
  const h = 9;
  return spark
    .map((v, i) => `${(x0 + (i / (spark.length - 1)) * w).toFixed(1)},${(y0 - (v / max) * h).toFixed(1)}`)
    .join(" ");
}

/** Kind glyph — a compact visual anchor per primitive (full name is below). */
const GLYPH: Record<string, string> = {
  Source: "▶",
  Sink: "◀",
  Buffering: "▭",
  Combining: "⊕",
  Splitting: "⑂",
  Amplifying: "△",
  Modulating: "⊗",
  Sensing: "◉",
  Inverting: "±",
  Copying: "⧉",
  Propelling: "→",
  Impeding: "⊣",
};

export default function SandboxCanvas({ snapshot, selected, onSelect, onMoveNode, onWire, onDelete }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<{ i: number; dx: number; dy: number } | null>(null);
  const [pendingWire, setPendingWire] = useState<{ from: number; x: number; y: number } | null>(null);

  const toCanvas = (e: { clientX: number; clientY: number }) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
  };

  // Keyboard: deletion and escape act on the current selection/pending wire.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        setPendingWire(null);
        onSelect(null);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selected) {
        e.preventDefault();
        onDelete(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onDelete, onSelect]);

  const nodeCenter = (i: number) => {
    const n = snapshot.nodes[i];
    return n ? { x: n.x, y: n.y } : { x: 0, y: 0 };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toCanvas(e);
    if (drag) onMoveNode(drag.i, p.x - drag.dx, p.y - drag.dy);
    if (pendingWire) setPendingWire({ ...pendingWire, x: p.x, y: p.y });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pendingWire) {
      const p = toCanvas(e);
      const target = snapshot.nodes.findIndex(
        (n) => Math.abs(p.x - n.x) <= NODE_W / 2 && Math.abs(p.y - n.y) <= NODE_H / 2 + 8,
      );
      if (target >= 0 && target !== pendingWire.from) {
        onWire(pendingWire.from, target, e.altKey ? "gradient" : "pushed");
      }
      setPendingWire(null);
    }
    setDrag(null);
  };

  const cycle = new Set(snapshot.algebraic_cycle ?? []);

  return (
    <svg
      ref={svgRef}
      className="h-full w-full"
      style={{ background: "var(--surface, #fff)", touchAction: "none" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerDown={(e) => {
        if (e.target === svgRef.current) onSelect(null);
      }}
    >
      <defs>
        <marker id="sb-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--text-muted)" />
        </marker>
        {/* The flow animation: a dash marching down the wire. Speed and weight
            carry the delivery (engine's last_amount) — the canvas never
            computes a number, only renders one. */}
        <style>{`@keyframes sb-flow { to { stroke-dashoffset: -14; } }`}</style>
      </defs>

      {/* wires */}
      {snapshot.wires.map((w, k) => {
        const a = nodeCenter(w.from);
        const b = nodeCenter(w.to);
        const isSel = selected?.kind === "wire" && selected.index === k;
        return (
          <g key={`w${k}`} onPointerDown={(e) => { e.stopPropagation(); onSelect({ kind: "wire", index: k }); }}>
            {/* wide invisible hit line */}
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={12} />
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={isSel ? "var(--accent)" : "var(--text-muted)"}
              strokeWidth={isSel ? 2 : 1.25}
              strokeDasharray={w.mode === "gradient" ? "4 3" : undefined}
              markerEnd="url(#sb-arrow)"
            />
            {w.last_amount > 0.02 && (
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--accent)"
                strokeWidth={Math.min(4, 1 + Math.sqrt(w.last_amount))}
                strokeDasharray="7 7"
                opacity={0.65}
                style={{ animation: `sb-flow ${Math.max(0.25, 1.2 / Math.sqrt(w.last_amount))}s linear infinite` }}
              />
            )}
            {w.last_amount > 0 && (
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 5}
                textAnchor="middle"
                fontSize={9}
                fontFamily="monospace"
                fill="var(--text-muted)"
              >
                {w.last_amount.toFixed(1)}
              </text>
            )}
          </g>
        );
      })}

      {/* pending wire rubber band */}
      {pendingWire && (
        <line
          x1={nodeCenter(pendingWire.from).x}
          y1={nodeCenter(pendingWire.from).y}
          x2={pendingWire.x}
          y2={pendingWire.y}
          stroke="var(--accent)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />
      )}

      {/* nodes */}
      {snapshot.nodes.map((n, i) => {
        const isSel = selected?.kind === "node" && selected.index === i;
        const onLoop = cycle.has(i);
        const isBuffer = n.kind === "Buffering";
        return (
          <g
            key={`n${i}`}
            transform={`translate(${n.x - NODE_W / 2}, ${n.y - NODE_H / 2})`}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect({ kind: "node", index: i });
              const p = toCanvas(e);
              setDrag({ i, dx: p.x - n.x, dy: p.y - n.y });
            }}
            style={{ cursor: "grab" }}
          >
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={3}
              fill={isBuffer ? "var(--lens-accent-soft, var(--accent-soft, #eef))" : "var(--surface, #fff)"}
              stroke={onLoop ? "var(--verdict-error)" : isSel ? "var(--accent)" : "var(--text-muted)"}
              strokeWidth={isSel || onLoop ? 2 : 1}
            />
            <text x={8} y={16} fontSize={11}>
              {GLYPH[n.kind] ?? "□"}
            </text>
            <text x={24} y={16} fontSize={10} fill="var(--text-primary)">
              {n.kind}
            </text>
            <text x={8} y={31} fontSize={9} fontFamily="monospace" fill="var(--text-muted)">
              {isBuffer ? `stock ${n.storage.toFixed(1)}` : `act ${n.activity.toFixed(1)}`}
            </text>
            {/* inline sparkline: the node's last SPARK_CAP ticks (engine trace) */}
            {n.spark.length > 1 && (
              <polyline
                points={sparkPoints(n.spark)}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={0.75}
                opacity={0.7}
              />
            )}
            {/* output port: drag from here to wire */}
            <circle
              cx={NODE_W}
              cy={NODE_H / 2}
              r={5}
              fill="var(--surface, #fff)"
              stroke="var(--accent)"
              style={{ cursor: "crosshair" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const p = toCanvas(e);
                setPendingWire({ from: i, x: p.x, y: p.y });
              }}
            />
            <text x={NODE_W / 2} y={NODE_H + 12} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
              {n.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
