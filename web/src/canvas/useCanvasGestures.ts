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
import type { PaletteTool } from "./lenses/registry";
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
  /** View zoom — pure view state like pan; no verdict ever reads it. */
  scale: number;
  panStart: { startClient: Pt; startPan: Pt } | null;
  dragThing: number | null;
  dragOffset: Pt;
  /** Where the node grab started (client coords) — a pointer-up inside the
   *  click threshold is a SELECT, not a drag. */
  dragStartClient: Pt | null;
  dragMoved: boolean;
  connectFrom: number | null;
  connectPos: Pt | null;
  hoverTarget: number | null;
  draft: DraftNode | null;
}

type GestureAction =
  | { type: "panStart"; startClient: Pt }
  | { type: "panMove"; client: Pt }
  | { type: "panEnd" }
  | { type: "zoom"; scale: number; pan: Pt }
  | { type: "dragStart"; thingId: number; offset: Pt; startClient: Pt }
  | { type: "dragMoved" }
  | { type: "dragEnd" }
  | { type: "connectStart"; thingId: number; pos: Pt }
  | { type: "connectMove"; pos: Pt; hoverTarget: number | null }
  | { type: "connectEnd" }
  | { type: "draftStart"; draft: DraftNode }
  | { type: "draftName"; name: string }
  | { type: "draftClear" };

const INITIAL: GestureState = {
  pan: { x: 0, y: 0 },
  scale: 1,
  panStart: null,
  dragThing: null,
  dragOffset: { x: 0, y: 0 },
  dragStartClient: null,
  dragMoved: false,
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
    case "zoom":
      return { ...state, scale: action.scale, pan: action.pan };
    case "dragStart":
      return {
        ...state,
        dragThing: action.thingId,
        dragOffset: action.offset,
        dragStartClient: action.startClient,
        dragMoved: false,
      };
    case "dragMoved":
      return { ...state, dragMoved: true };
    case "dragEnd":
      return { ...state, dragThing: null, dragStartClient: null, dragMoved: false };
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

/** Pointer jitter under this many client px reads as a click, not a drag. */
const CLICK_SLOP = 4;

interface GestureDeps {
  model: CanvasModel;
  svgRef: RefObject<SVGSVGElement | null>;
  onModelChange: (m: CanvasModel) => void;
  onReject: (message: string) => void;
  /** The rail's armed tool (null = no tool armed; gestures behave as before). */
  armed?: PaletteTool | null;
  /** Click-select a node (null clears). Selection is view state, never projected. */
  onSelectThing?: (id: number | null) => void;
}

export function useCanvasGestures({
  model,
  svgRef,
  onModelChange,
  onReject,
  armed = null,
  onSelectThing,
}: GestureDeps) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  function toWorld(e: { clientX: number; clientY: number }): Pt {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - state.pan.x) / state.scale,
      y: (e.clientY - rect.top - state.pan.y) / state.scale,
    };
  }

  /** Wheel / trackpad-pinch zoom around the cursor: the world point under the
   *  pointer stays fixed while the scale changes. Pure view state, like pan. */
  function onStageWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    // Trackpad pinch arrives as ctrl+wheel with fine deltas; plain wheel zooms too.
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002));
    const next = Math.min(4, Math.max(0.25, state.scale * factor));
    if (next === state.scale) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    // Keep the cursor's world point stationary: pan' = c - (c - pan) * k'/k.
    const k = next / state.scale;
    dispatch({
      type: "zoom",
      scale: next,
      pan: { x: cx - (cx - state.pan.x) * k, y: cy - (cy - state.pan.y) * k },
    });
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
    if (armed?.verb === "designate") {
      // Designations land on components only: project() carries `primitive`
      // into subsystems and ignores it on env objects (their internals are
      // epistemically opaque, Mobus §4.3.3.2.2) — offering the stamp there
      // would author dead state.
      if (thing.role !== "Component") {
        onReject("work processes stamp onto components — environment objects are opaque (Mobus §4.3.3.2.2)");
        return;
      }
      switch (armed.designation.type) {
        case "primitive": {
          const primitive = armed.designation.primitive;
          onModelChange({
            ...model,
            things: model.things.map((t) => (t.id === thing.id ? { ...t, primitive } : t)),
          });
          break;
        }
        case "interface": {
          // Toggle membership in I — designation is a status, so a second
          // stamp undoes it (unlike the primitive stamp, which replaces).
          onModelChange({
            ...model,
            things: model.things.map((t) =>
              t.id === thing.id ? { ...t, interface: !t.interface } : t,
            ),
          });
          break;
        }
      }
      return; // stays armed for repeat stamping
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toWorld(e);
    dispatch({
      type: "dragStart",
      thingId: thing.id,
      offset: { x: p.x - thing.x, y: p.y - thing.y },
      startClient: { x: e.clientX, y: e.clientY },
    });
  }

  function onHandlePointerDown(e: ReactPointerEvent, thing: Thing) {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    dispatch({ type: "connectStart", thingId: thing.id, pos: toWorld(e) });
  }

  function onStagePointerDown(e: ReactPointerEvent) {
    if (e.target !== e.currentTarget) return;
    if (armed?.verb === "place") {
      // Stamp at the point and STAY armed (repeat-stamp; Esc or a second
      // tool-click disarms). Same nullary act as the double-click draft, with
      // the kind the armed tool carries instead of the lens default.
      const p = toWorld(e);
      const id = nextId(model.things.map((t) => t.id));
      const name = armed.role === "Environment" ? `E${id}` : `T${id}`;
      onModelChange({
        ...model,
        things: [...model.things, { id, name, x: p.x, y: p.y, role: armed.role }],
      });
      return;
    }
    onSelectThing?.(null);
    (e.target as Element).setPointerCapture(e.pointerId);
    dispatch({ type: "panStart", startClient: { x: e.clientX, y: e.clientY } });
  }

  function onStagePointerMove(e: ReactPointerEvent) {
    if (state.dragThing !== null) {
      // Inside the click slop nothing moves — so a plain click never nudges
      // the node it is selecting.
      if (!state.dragMoved && state.dragStartClient) {
        const d = Math.hypot(e.clientX - state.dragStartClient.x, e.clientY - state.dragStartClient.y);
        if (d < CLICK_SLOP) return;
        dispatch({ type: "dragMoved" });
      }
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
      if (!state.dragMoved) onSelectThing?.(state.dragThing);
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
    onStageWheel,
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
