import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { CanvasModel, Lens, Relation, Thing } from "./types";
import { KIND_COLOR, PRIMITIVE_BADGE } from "./types";
import { bezierPath, midpoint, NODE_R, rimPoint, selfLoopPath, straightPath, type Pt } from "./geometry";
import { validateConnection } from "./kernel";

interface Props {
  model: CanvasModel;
  lens: Lens;
  onModelChange: (m: CanvasModel) => void;
  onReject: (message: string) => void;
}

function nextId(ids: number[]): number {
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

function thingById(model: CanvasModel, id: number): Thing | undefined {
  return model.things.find((t) => t.id === id);
}

export default function Canvas({ model, lens, onModelChange, onReject }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState<Pt>({ x: 0, y: 0 });
  const panState = useRef<{ startClient: Pt; startPan: Pt } | null>(null);

  const [dragThing, setDragThing] = useState<number | null>(null);
  const dragOffset = useRef<Pt>({ x: 0, y: 0 });

  const [connectFrom, setConnectFrom] = useState<number | null>(null);
  const [connectPos, setConnectPos] = useState<Pt | null>(null);
  const [hoverTarget, setHoverTarget] = useState<number | null>(null);

  const [draft, setDraft] = useState<{ id: number; x: number; y: number; name: string } | null>(null);

  function toWorld(e: { clientX: number; clientY: number }): Pt {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left - pan.x, y: e.clientY - rect.top - pan.y };
  }

  function hitTest(p: Pt, exclude?: number): Thing | undefined {
    for (const t of model.things) {
      if (t.id === exclude) continue;
      if (Math.hypot(t.x - p.x, t.y - p.y) <= NODE_R) return t;
    }
    return undefined;
  }

  function onNodePointerDown(e: ReactPointerEvent, thing: Thing) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toWorld(e);
    setDragThing(thing.id);
    dragOffset.current = { x: p.x - thing.x, y: p.y - thing.y };
  }

  function onHandlePointerDown(e: ReactPointerEvent, thing: Thing) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setConnectFrom(thing.id);
    setConnectPos(toWorld(e));
  }

  function onStagePointerDown(e: ReactPointerEvent) {
    if (e.target !== e.currentTarget) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    panState.current = { startClient: { x: e.clientX, y: e.clientY }, startPan: pan };
  }

  function onStagePointerMove(e: ReactPointerEvent) {
    if (dragThing !== null) {
      const p = toWorld(e);
      const x = p.x - dragOffset.current.x;
      const y = p.y - dragOffset.current.y;
      onModelChange({
        ...model,
        things: model.things.map((t) => (t.id === dragThing ? { ...t, x, y } : t)),
      });
      return;
    }
    if (connectFrom !== null) {
      const p = toWorld(e);
      setConnectPos(p);
      const target = hitTest(p);
      setHoverTarget(target ? target.id : null);
      return;
    }
    if (panState.current) {
      const dx = e.clientX - panState.current.startClient.x;
      const dy = e.clientY - panState.current.startClient.y;
      setPan({ x: panState.current.startPan.x + dx, y: panState.current.startPan.y + dy });
    }
  }

  function onStagePointerUp(e: ReactPointerEvent) {
    if (dragThing !== null) {
      setDragThing(null);
      return;
    }
    if (connectFrom !== null) {
      const p = toWorld(e);
      const target = hitTest(p) ?? (hoverTarget !== null ? thingById(model, hoverTarget) : undefined);
      if (target) {
        const candidate: Relation = {
          id: nextId(model.relations.map((r) => r.id)),
          a: connectFrom,
          b: target.id,
          name: "",
          is_bond: true,
          kind: "Unspecified",
        };
        const verdict = validateConnection(model, candidate);
        if (verdict.issues.length === 0) {
          onModelChange({ ...model, relations: [...model.relations, candidate] });
        } else {
          onReject(verdict.issues[0].message);
        }
      }
      setConnectFrom(null);
      setConnectPos(null);
      setHoverTarget(null);
      return;
    }
    panState.current = null;
  }

  function onStageDoubleClick(e: ReactMouseEvent) {
    if (e.target !== e.currentTarget) return;
    const p = toWorld(e);
    setDraft({ id: nextId(model.things.map((t) => t.id)), x: p.x, y: p.y, name: "" });
  }

  function commitDraft() {
    if (!draft) return;
    const name = draft.name.trim() || `T${draft.id}`;
    onModelChange({
      ...model,
      things: [...model.things, { id: draft.id, name, x: draft.x, y: draft.y, role: "Component" }],
    });
    setDraft(null);
  }

  const containerBox = boundingBox(model.things);

  return (
    <svg
      ref={svgRef}
      className="canvas-stage w-full h-full touch-none select-none"
      onPointerDown={onStagePointerDown}
      onPointerMove={onStagePointerMove}
      onPointerUp={onStagePointerUp}
      onDoubleClick={onStageDoubleClick}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-slate)" />
        </marker>
      </defs>
      <g transform={`translate(${pan.x}, ${pan.y})`}>
        {lens === "Klir" && containerBox && (
          <g>
            <rect
              x={containerBox.x - 40}
              y={containerBox.y - 40}
              width={containerBox.w + 80}
              height={containerBox.h + 80}
              rx={24}
              fill="none"
              stroke="var(--border)"
              strokeWidth={1.5}
              strokeDasharray="6 5"
            />
            <text x={containerBox.x - 34} y={containerBox.y - 18} className="font-mono text-xs" fill="var(--text-muted)">
              T
            </text>
          </g>
        )}

        {model.relations.map((r) => (
          <EdgeView key={r.id} model={model} relation={r} lens={lens} />
        ))}

        {connectFrom !== null && connectPos && (
          <line
            x1={thingById(model, connectFrom)?.x}
            y1={thingById(model, connectFrom)?.y}
            x2={connectPos.x}
            y2={connectPos.y}
            stroke="var(--accent)"
            strokeWidth={2}
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}

        {model.things.map((t) => (
          <NodeView
            key={t.id}
            thing={t}
            lens={lens}
            hovered={hoverTarget === t.id}
            onPointerDown={(e) => onNodePointerDown(e, t)}
            onHandlePointerDown={(e) => onHandlePointerDown(e, t)}
          />
        ))}

        {draft && (
          <foreignObject x={draft.x - 60} y={draft.y - 16} width={120} height={32}>
            <input
              autoFocus
              className="w-full rounded-md border px-2 py-1 text-xs font-body"
              style={{ borderColor: "var(--accent)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
              value={draft.name}
              placeholder="name…"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitDraft();
                if (e.key === "Escape") setDraft(null);
              }}
              onBlur={commitDraft}
            />
          </foreignObject>
        )}
      </g>
    </svg>
  );
}

function boundingBox(things: Thing[]): { x: number; y: number; w: number; h: number } | null {
  if (things.length === 0) return null;
  const xs = things.map((t) => t.x);
  const ys = things.map((t) => t.y);
  const minX = Math.min(...xs) - NODE_R;
  const maxX = Math.max(...xs) + NODE_R;
  const minY = Math.min(...ys) - NODE_R;
  const maxY = Math.max(...ys) + NODE_R;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function NodeView({
  thing,
  lens,
  hovered,
  onPointerDown,
  onHandlePointerDown,
}: {
  thing: Thing;
  lens: Lens;
  hovered: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  onHandlePointerDown: (e: ReactPointerEvent) => void;
}) {
  const isSquare = lens !== "Klir" && thing.role === "Environment";
  const showHalo = lens !== "Klir" && thing.role === "Component";
  const badge = lens === "Mobus" ? thing.primitive : undefined;
  const stroke = lens === "Klir" ? "var(--text-secondary)" : "var(--accent-slate)";
  const strokeOpacity = lens === "Klir" ? 0.55 : 1;

  return (
    <g transform={`translate(${thing.x}, ${thing.y})`} onPointerDown={onPointerDown} className="cursor-grab">
      {showHalo && (
        <circle r={NODE_R + 10} fill="var(--accent-soft)" opacity={0.5} />
      )}
      {hovered && <circle r={NODE_R + 6} fill="none" stroke="var(--accent)" strokeWidth={2} />}

      {isSquare ? (
        <rect
          x={-NODE_R}
          y={-NODE_R}
          width={NODE_R * 2}
          height={NODE_R * 2}
          rx={6}
          fill="var(--bg-secondary)"
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={1.75}
        />
      ) : (
        <circle
          r={NODE_R}
          fill="var(--bg-secondary)"
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={1.75}
        />
      )}

      {badge && (
        <g transform={`translate(${NODE_R * 0.72}, ${-NODE_R * 0.72})`}>
          <circle r={10} fill="var(--accent)" />
          <text textAnchor="middle" dominantBaseline="central" fontSize={9} fill="white" className="font-mono">
            {PRIMITIVE_BADGE[badge]}
          </text>
        </g>
      )}

      <text
        y={NODE_R + 16}
        textAnchor="middle"
        fontSize={12}
        fill="var(--text-primary)"
        className="font-body pointer-events-none"
      >
        {thing.name}
      </text>

      <circle
        cx={NODE_R * 0.75}
        cy={NODE_R * 0.75}
        r={7}
        fill="var(--bg-primary)"
        stroke="var(--accent)"
        strokeWidth={1.5}
        className="cursor-crosshair"
        onPointerDown={onHandlePointerDown}
      />
    </g>
  );
}

function EdgeView({ model, relation, lens }: { model: CanvasModel; relation: Relation; lens: Lens }) {
  const from = thingById(model, relation.a);
  const to = thingById(model, relation.b);
  if (!from || !to) return null;

  const isSelfLoop = relation.a === relation.b;
  const color = lens === "Klir" ? "var(--text-secondary)" : KIND_COLOR[relation.kind];
  const dashed = lens !== "Klir" && !relation.is_bond;
  const curved = lens !== "Klir";
  const marker = lens !== "Klir";

  let d: string;
  let labelAt: Pt;

  if (isSelfLoop) {
    const loop = selfLoopPath(from, NODE_R);
    d = loop.d;
    labelAt = loop.labelAt;
  } else {
    const a = rimPoint(from, to, NODE_R);
    const b = rimPoint(to, from, NODE_R);
    d = curved ? bezierPath(a, b) : straightPath(a, b);
    labelAt = midpoint(a, b);
  }

  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeOpacity={lens === "Klir" ? 0.55 : 0.85}
        strokeWidth={2}
        strokeDasharray={dashed ? "6 4" : undefined}
        markerEnd={marker ? "url(#arrow)" : undefined}
      />
      {lens !== "Klir" && relation.name && (
        <text
          x={labelAt.x}
          y={labelAt.y - 6}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-muted)"
          className="font-mono pointer-events-none"
        >
          {relation.name}
        </text>
      )}
    </g>
  );
}
