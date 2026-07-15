import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type OnConnect,
  type NodeChange,
} from "@xyflow/react";
import * as kernel from "../kernel";
import type { CanvasModel, Kind, Relation, Thing } from "../kernel/types";
import { KIND_COLOR } from "../kernel/types";
import { ThingNode, type ThingNodeType } from "./ThingNode";
import { RelationEdge, markerId, type RelationEdgeType } from "./RelationEdge";
import { KlirFrameNode, type KlirFrameNodeType } from "./KlirFrameNode";

const nodeTypes = { thing: ThingNode, klirFrame: KlirFrameNode };
const edgeTypes = { relation: RelationEdge };
const KINDS: Kind[] = ["Unspecified", "Energy", "Matter", "Field", "Informational"];

function thingNode(t: Thing, lens: CanvasModel["lens"], editing: boolean, onRename: (id: number, name: string) => void, onStopEditing: () => void): ThingNodeType {
  return {
    id: String(t.id),
    type: "thing",
    position: { x: t.x, y: t.y },
    data: { thing: t, lens, editing, onRename, onStopEditing },
  };
}

function klirFrameNode(things: Thing[]): KlirFrameNodeType | null {
  if (things.length === 0) return null;
  const pad = 90;
  const xs = things.map((t) => t.x);
  const ys = things.map((t) => t.y);
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad - 20;
  const width = Math.max(...xs) - minX + pad * 2;
  const height = Math.max(...ys) - minY + pad + 40;
  return {
    id: "__klir_frame__",
    type: "klirFrame",
    position: { x: minX, y: minY },
    data: { width, height },
    draggable: false,
    selectable: false,
    zIndex: -1,
  };
}

function edgeFrom(r: Relation, lens: CanvasModel["lens"]): RelationEdgeType {
  return {
    id: String(r.id),
    type: "relation",
    source: String(r.a),
    target: String(r.b),
    sourceHandle: "src",
    targetHandle: "tgt",
    data: { relation: r, lens },
  };
}

export function CanvasStage({
  model,
  onModelChange,
  onToast,
  onFps,
}: {
  model: CanvasModel;
  onModelChange: (updater: (m: CanvasModel) => CanvasModel) => void;
  onToast: (msg: string) => void;
  onFps: (fps: number) => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner model={model} onModelChange={onModelChange} onToast={onToast} onFps={onFps} />
    </ReactFlowProvider>
  );
}

function CanvasInner({
  model,
  onModelChange,
  onToast,
  onFps,
}: {
  model: CanvasModel;
  onModelChange: (updater: (m: CanvasModel) => CanvasModel) => void;
  onToast: (msg: string) => void;
  onFps: (fps: number) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<ThingNodeType | KlirFrameNodeType>([]);
  const [edges, setEdges] = useEdgesState<RelationEdgeType>([]);

  const rename = useCallback(
    (id: number, name: string) => {
      onModelChange((m) => ({ ...m, things: m.things.map((t) => (t.id === id ? { ...t, name } : t)) }));
    },
    [onModelChange],
  );
  const stopEditing = useCallback(() => setEditingId(null), []);

  // Sync xyflow's node list from the model. Existing nodes keep their live
  // drag position; only data (lens read, name, primitive) is refreshed.
  useEffect(() => {
    setNodes((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      const next: (ThingNodeType | KlirFrameNodeType)[] = [];
      const frame = model.lens === "Klir" ? klirFrameNode(model.things) : null;
      if (frame) next.push(frame);
      for (const t of model.things) {
        const id = String(t.id);
        const existing = byId.get(id) as ThingNodeType | undefined;
        if (existing) {
          next.push({ ...existing, data: { thing: t, lens: model.lens, editing: editingId === t.id, onRename: rename, onStopEditing: stopEditing } });
        } else {
          next.push(thingNode(t, model.lens, editingId === t.id, rename, stopEditing));
        }
      }
      return next;
    });
  }, [model, editingId, rename, stopEditing, setNodes]);

  useEffect(() => {
    setEdges(model.relations.map((r) => edgeFrom(r, model.lens)));
  }, [model, setEdges]);

  // Commit a drag's final position back into the model (the source of truth).
  const onNodesChange = useCallback(
    (changes: NodeChange<ThingNodeType | KlirFrameNodeType>[]) => {
      onNodesChangeBase(changes);
      for (const c of changes) {
        if (c.type === "position" && c.dragging === false && c.position) {
          const id = Number(c.id);
          onModelChange((m) => ({
            ...m,
            things: m.things.map((t) => (t.id === id ? { ...t, x: c.position!.x, y: c.position!.y } : t)),
          }));
        }
      }
    },
    [onNodesChangeBase, onModelChange],
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (!params.source || !params.target) return;
      const nextId = model.relations.reduce((m, r) => Math.max(m, r.id), 0) + 1;
      const candidate: Relation = {
        id: nextId,
        a: Number(params.source),
        b: Number(params.target),
        name: "",
        is_bond: true,
        kind: "Unspecified",
      };
      // THE KERNEL DECIDES: no legality logic here, only marshaling.
      const verdict = kernel.validateConnection(model, candidate);
      if (verdict.issues.length > 0) {
        onToast(verdict.issues[0].message);
        return;
      }
      onModelChange((m) => ({ ...m, relations: [...m.relations, candidate] }));
      setEdges((eds) => addEdge({ ...params, id: String(nextId) }, eds));
    },
    [model, onModelChange, onToast, setEdges],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const onNodeOrEdge = target.closest(".react-flow__node, .react-flow__edge");
      if (!target.closest(".react-flow__pane") || onNodeOrEdge) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const nextId = model.things.reduce((m, t) => Math.max(m, t.id), 0) + 1;
      const newThing: Thing = { id: nextId, name: "New", x: pos.x, y: pos.y, role: "Component" };
      onModelChange((m) => ({ ...m, things: [...m.things, newThing] }));
      setEditingId(nextId);
    },
    [model, onModelChange, screenToFlowPosition],
  );

  // fps: a continuous rAF sampler, independent of xyflow's own render loop.
  const frameCount = useRef(0);
  const lastSample = useRef(performance.now());
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      frameCount.current += 1;
      const now = performance.now();
      if (now - lastSample.current >= 1000) {
        onFps(Math.round((frameCount.current * 1000) / (now - lastSample.current)));
        frameCount.current = 0;
        lastSample.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onFps]);

  return (
    <div className="h-full w-full" onDoubleClick={onDoubleClick}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          {KINDS.map((k) => (
            <marker
              key={k}
              id={markerId(k)}
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={KIND_COLOR[k]} />
            </marker>
          ))}
        </defs>
      </svg>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--border)" gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
