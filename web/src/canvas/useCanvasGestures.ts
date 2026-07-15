// The canvas gesture layer — pointer events → editing actions. All ephemeral
// interaction state (pan, in-flight node drag, in-flight connection, the node
// name draft) lives in a PURE reducer; this hook only wires pointer events to
// dispatches and runs the model-mutating side effects (drag-move, edge commit,
// node commit). Legality is still Rust's: `validateConnection` asks the kernel
// before an edge is accepted. The reducer computes no dynamics and no systemhood.
import {
  useReducer,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { CanvasModel, Relation, Thing } from "../kernel/types";
import { validateConnection } from "../kernel";
import { NODE_R, thingById, type Pt } from "./geometry";

interface DraftNode {
  id: number;
  x: number;
  y: number;
  name: string;
}

export interface GestureState {
  pan: Pt;
  panStart: { startClient: Pt; startPan: Pt } | null;
  dragThing: number | null;
  dragOffset: Pt;
  connectFrom: number | null;
  connectPos: Pt | null;
  hoverTarget: number | null;
  draft: DraftNode | null;
}

type GestureAction =
  | { type: "panStart"; startClient: Pt }
  | { type: "panMove"; client: Pt }
  | { type: "panEnd" }
  | { type: "dragStart"; thingId: number; offset: Pt }
  | { type: "dragEnd" }
  | { type: "connectStart"; thingId: number; pos: Pt }
  | { type: "connectMove"; pos: Pt; hoverTarget: number | null }
  | { type: "connectEnd" }
  | { type: "draftStart"; draft: DraftNode }
  | { type: "draftName"; name: string }
  | { type: "draftClear" };

const INITIAL: GestureState = {
  pan: { x: 0, y: 0 },
  panStart: null,
  dragThing: null,
  dragOffset: { x: 0, y: 0 },
  connectFrom: null,
  connectPos: null,
  hoverTarget: null,
  draft: null,
};

function reducer(state: GestureState, action: GestureAction): GestureState {
  switch (action.type) {
    case "panStart":
      return { ...state, panStart: { startClient: action.startClient, startPan: state.pan } };
    case "panMove": {
      if (!state.panStart) return state;
      const dx = action.client.x - state.panStart.startClient.x;
      const dy = action.client.y - state.panStart.startClient.y;
      return { ...state, pan: { x: state.panStart.startPan.x + dx, y: state.panStart.startPan.y + dy } };
    }
    case "panEnd":
      return { ...state, panStart: null };
    case "dragStart":
      return { ...state, dragThing: action.thingId, dragOffset: action.offset };
    case "dragEnd":
      return { ...state, dragThing: null };
    case "connectStart":
      return { ...state, connectFrom: action.thingId, connectPos: action.pos };
    case "connectMove":
      return { ...state, connectPos: action.pos, hoverTarget: action.hoverTarget };
    case "connectEnd":
      return { ...state, connectFrom: null, connectPos: null, hoverTarget: null };
    case "draftStart":
      return { ...state, draft: action.draft };
    case "draftName":
      return state.draft ? { ...state, draft: { ...state.draft, name: action.name } } : state;
    case "draftClear":
      return { ...state, draft: null };
    default:
      return state;
  }
}

function nextId(ids: number[]): number {
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

interface GestureDeps {
  model: CanvasModel;
  svgRef: RefObject<SVGSVGElement | null>;
  onModelChange: (m: CanvasModel) => void;
  onReject: (message: string) => void;
}

export function useCanvasGestures({ model, svgRef, onModelChange, onReject }: GestureDeps) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  function toWorld(e: { clientX: number; clientY: number }): Pt {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left - state.pan.x, y: e.clientY - rect.top - state.pan.y };
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
    dispatch({ type: "dragStart", thingId: thing.id, offset: { x: p.x - thing.x, y: p.y - thing.y } });
  }

  function onHandlePointerDown(e: ReactPointerEvent, thing: Thing) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dispatch({ type: "connectStart", thingId: thing.id, pos: toWorld(e) });
  }

  function onStagePointerDown(e: ReactPointerEvent) {
    if (e.target !== e.currentTarget) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dispatch({ type: "panStart", startClient: { x: e.clientX, y: e.clientY } });
  }

  function onStagePointerMove(e: ReactPointerEvent) {
    if (state.dragThing !== null) {
      const p = toWorld(e);
      const x = p.x - state.dragOffset.x;
      const y = p.y - state.dragOffset.y;
      onModelChange({
        ...model,
        things: model.things.map((t) => (t.id === state.dragThing ? { ...t, x, y } : t)),
      });
      return;
    }
    if (state.connectFrom !== null) {
      const p = toWorld(e);
      const target = hitTest(p);
      dispatch({ type: "connectMove", pos: p, hoverTarget: target ? target.id : null });
      return;
    }
    if (state.panStart) {
      dispatch({ type: "panMove", client: { x: e.clientX, y: e.clientY } });
    }
  }

  function onStagePointerUp(e: ReactPointerEvent) {
    if (state.dragThing !== null) {
      dispatch({ type: "dragEnd" });
      return;
    }
    if (state.connectFrom !== null) {
      const p = toWorld(e);
      const target = hitTest(p) ?? (state.hoverTarget !== null ? thingById(model, state.hoverTarget) : undefined);
      if (target) {
        const candidate: Relation = {
          id: nextId(model.relations.map((r) => r.id)),
          a: state.connectFrom,
          b: target.id,
          name: "",
          is_bond: true,
          kind: "Unspecified",
        };
        // Event handlers are outside React's render, so a kernel throw here
        // won't reach the error boundary — surface it as a reject toast instead
        // of an uncaught exception (the edge is simply not added).
        try {
          const verdict = validateConnection(model, candidate);
          if (verdict.issues.length === 0) {
            onModelChange({ ...model, relations: [...model.relations, candidate] });
          } else {
            onReject(verdict.issues[0].message);
          }
        } catch (err) {
          onReject(err instanceof Error ? err.message : String(err));
        }
      }
      dispatch({ type: "connectEnd" });
      return;
    }
    dispatch({ type: "panEnd" });
  }

  function onStageDoubleClick(e: ReactMouseEvent) {
    if (e.target !== e.currentTarget) return;
    const p = toWorld(e);
    dispatch({ type: "draftStart", draft: { id: nextId(model.things.map((t) => t.id)), x: p.x, y: p.y, name: "" } });
  }

  function commitDraft() {
    if (!state.draft) return;
    const name = state.draft.name.trim() || `T${state.draft.id}`;
    onModelChange({
      ...model,
      things: [...model.things, { id: state.draft.id, name, x: state.draft.x, y: state.draft.y, role: "Component" }],
    });
    dispatch({ type: "draftClear" });
  }

  function setDraftName(name: string) {
    dispatch({ type: "draftName", name });
  }

  function clearDraft() {
    dispatch({ type: "draftClear" });
  }

  return {
    state,
    onNodePointerDown,
    onHandlePointerDown,
    onStagePointerDown,
    onStagePointerMove,
    onStagePointerUp,
    onStageDoubleClick,
    commitDraft,
    setDraftName,
    clearDraft,
  };
}
