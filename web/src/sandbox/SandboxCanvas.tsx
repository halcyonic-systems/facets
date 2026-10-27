// The sandbox canvas: hand-rolled SVG (ADR-0001 — no graph library), the
// desktop shell's interaction grammar re-expressed for the pointer:
//
//   drag a node's BODY   → move it (position is UI state, engine-mirrored)
//   drag a node's handle → wire it (drop on another node; Alt = gradient)
//   click a node / wire  → select (the inspector shows it)
//   Delete / Backspace   → remove the selection
//   Escape               → cancel a pending wire / clear selection
//
// The canvas renders the SNAPSHOT — engine truth — and never computes a
// number itself: activity, storage, and wire deliveries arrive computed.
//
// Drawn on the model canvas's own vocabulary (makeover slice E, canvas audit
// block 8): a component is a circle with its primitive's glyph in its hue, a
// source or sink the open square, the wire 2px in the substance's --kind-*
// with one arrowhead, the handle the same 8px disc, names on paper tabs,
// selection a ring in the accent. Surfaces are the real tokens, so dark works.

import { useEffect, useRef, useState } from "react";
import type { ProcessPrimitive, SandboxSnapshot } from "../kernel/types";
import { NODE_R } from "../canvas/geometry";
import { PaperTab } from "../canvas/lenses/common";
import { primitiveGlyph } from "../canvas/lenses/primitive-glyphs";
import { ARROW, HANDLE, LABEL } from "../canvas/style";
import { PRIMITIVE_ICON } from "../icons";
import { prim } from "../tokens";

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

/** The node's hit extent, world px: the canvas's own component radius, so a
 *  drop or a click lands the way it does on the model canvas. */
const R = NODE_R;
/** How far from the body a wire's end is taken as a drop on it. */
const DROP_PAD = 10;

/** The reserved KIND channel (web/src/tokens.ts / index.css): color means
 *  substance identity here, exactly as it does everywhere else in the app —
 *  never decoration. Material→matter green, Energy→amber, Message→info violet. */
const KIND_COLOR: Record<string, string> = {
  Material: "var(--kind-matter)",
  Energy: "var(--kind-energy)",
  Message: "var(--kind-informational)",
};

/** The node sparkline path: the spark ring scaled into a strip above the
 *  readout, normalized to its own max (shape, not magnitude). */
function sparkPoints(spark: number[]): string {
  const max = Math.max(...spark, 1e-6);
  const w = 28;
  const x0 = -w / 2;
  const y0 = -R - 24;
  const h = 8;
  return spark
    .map((v, i) => `${(x0 + (i / (spark.length - 1)) * w).toFixed(1)},${(y0 - (v / max) * h).toFixed(1)}`)
    .join(" ");
}

const isPrimitive = (kind: string): kind is ProcessPrimitive => kind in PRIMITIVE_ICON;

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
      const target = snapshot.nodes.findIndex((n) => Math.hypot(p.x - n.x, p.y - n.y) <= R + DROP_PAD);
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
      className="h-full w-full select-none"
      style={{ background: "var(--bg-primary)", touchAction: "none", userSelect: "none" }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerDown={(e) => {
        if (e.target === svgRef.current) onSelect(null);
      }}
    >
      <defs>
        {/* One head per substance, the canvas's size, filled with the stroke. */}
        {Object.entries(KIND_COLOR).map(([k, color]) => (
          <marker
            key={k}
            id={`sb-arrow-${k}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerUnits="userSpaceOnUse"
            markerWidth={ARROW.size}
            markerHeight={ARROW.size}
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
        <marker id="sb-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerUnits="userSpaceOnUse" markerWidth={ARROW.size} markerHeight={ARROW.size} orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
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
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={18} />
            {/* Selection is a halo behind the stroke; the stroke thickens by
                one px and keeps its substance hue (rule 20). */}
            {isSel && (
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent)" strokeOpacity={0.35} strokeWidth={6} />
            )}
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={KIND_COLOR[w.substance_base] ?? "var(--text-muted)"}
              strokeOpacity={0.9}
              strokeWidth={isSel ? 3 : 2}
              strokeDasharray={w.mode === "gradient" ? "6 4" : undefined}
              markerEnd={KIND_COLOR[w.substance_base] ? `url(#sb-arrow-${w.substance_base})` : "url(#sb-arrow)"}
            />
            {w.last_amount > 0.02 && (
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={KIND_COLOR[w.substance_base] ?? "var(--accent)"}
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
                fontSize={10}
                fill="var(--accent-strong)"
                className="font-mono tabular"
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
          strokeWidth={2}
          strokeDasharray="4 4"
        />
      )}

      {/* nodes */}
      {snapshot.nodes.map((n, i) => {
        const isSel = selected?.kind === "node" && selected.index === i;
        const onLoop = cycle.has(i);
        const isBuffer = n.kind === "Buffering";
        const open = n.kind === "Source" || n.kind === "Sink";
        const hue = isPrimitive(n.kind) ? prim[n.kind] : "var(--text-secondary)";
        const ring = onLoop ? "var(--verdict-error)" : isSel ? "var(--accent)" : null;
        return (
          <g
            key={`n${i}`}
            transform={`translate(${n.x}, ${n.y})`}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect({ kind: "node", index: i });
              const p = toCanvas(e);
              setDrag({ i, dx: p.x - n.x, dy: p.y - n.y });
            }}
            style={{ cursor: drag?.i === i ? "grabbing" : "grab" }}
          >
            <title>{onLoop ? `${n.name}: on a loop of pure relays` : n.name}</title>
            {/* Selection (and a loop fault) as a ring offset 4 from the body. */}
            {ring &&
              (open ? (
                <rect x={-R - 4} y={-R - 4} width={2 * R + 8} height={2 * R + 8} rx={2} fill="none" stroke={ring} strokeWidth={2} />
              ) : (
                <circle r={R + 4} fill="none" stroke={ring} strokeWidth={2} />
              ))}
            {open ? (
              /* Source and sink: Mobus's open square, no interior (rule 17);
                 the stub says which way the substance goes. */
              <g stroke="var(--text-secondary)" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" fill="none">
                <rect x={-R} y={-R} width={2 * R} height={2 * R} rx={0} />
                {/* the stub: leaving a source, entering a sink */}
                <path d={n.kind === "Source" ? `M ${R} 0 H ${R + 10}` : `M ${-R - 10} 0 H ${-R}`} />
              </g>
            ) : (
              <>
                <circle r={R} fill="var(--bg-secondary)" stroke="var(--text-secondary)" strokeWidth={2} />
                {isPrimitive(n.kind) && (
                  <g
                    transform={`scale(${(R * 0.56) / 6})`}
                    style={{ color: hue }}
                    fill="none"
                    stroke={hue}
                    strokeWidth={2 / ((R * 0.56) / 6)}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    pointerEvents="none"
                  >
                    {primitiveGlyph(n.kind)}
                  </g>
                )}
              </>
            )}
            {/* the readout above the body, the canvas's sim register */}
            <text y={-R - 10} textAnchor="middle" fontSize={10} fill="var(--accent-strong)" className="font-mono tabular pointer-events-none">
              {isBuffer ? `stock ${n.storage.toFixed(1)}` : `act ${n.activity.toFixed(1)}`}
            </text>
            {/* inline sparkline: the node's last SPARK_CAP ticks (engine trace) */}
            {n.spark.length > 1 && (
              <polyline points={sparkPoints(n.spark)} fill="none" stroke="var(--accent)" strokeWidth={1} opacity={0.7} pointerEvents="none" />
            )}
            <PaperTab>
              <text y={R + 16} textAnchor="middle" fontSize={LABEL.size} fontWeight={LABEL.weight} fill="var(--text-primary)" className="font-body pointer-events-none">
                {n.name}
              </text>
            </PaperTab>
            {/* output handle: drag from here to wire. The canvas's own 8px disc
                over a 24px hit disc (rule 11). */}
            <circle
              cx={R * 0.75}
              cy={R * 0.75}
              r={HANDLE.hitR}
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                const p = toCanvas(e);
                setPendingWire({ from: i, x: p.x, y: p.y });
              }}
            />
            <circle
              cx={R * 0.75}
              cy={R * 0.75}
              r={HANDLE.r}
              fill="var(--bg-primary)"
              stroke={KIND_COLOR[n.substance_base] ?? "var(--accent)"}
              strokeWidth={HANDLE.width}
              pointerEvents="none"
            />
          </g>
        );
      })}
    </svg>
  );
}
