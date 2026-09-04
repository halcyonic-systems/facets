// The canvas gesture layer — pointer events → editing actions. All ephemeral
// interaction state (pan, in-flight node drag, in-flight connection, the node
// name draft) lives in a PURE reducer; this hook only wires pointer events to
// dispatches and runs the model-mutating side effects (drag-move, edge commit,
// node commit). Legality is still Rust's: `validateConnection` asks the kernel
// before an edge is accepted, and only a kernel Error refuses it (see
// connectionVerdict). The reducer computes no dynamics and no systemhood.
import {
  useEffect,
  useReducer,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import type { CanvasModel, Relation, Thing } from "../kernel/types";
import type { PaletteTool } from "./lenses/registry";
import { validateConnection } from "../kernel";
import { observations, refusal } from "./connectionVerdict";
import { NODE_R, portOwnerAt, thingById, contentBounds, fitToBox, type PortTarget, type Pt } from "./geometry";

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

/** #139: view-zoom bounds — widened from the old [0.25, 4] so a long zoom
 *  gesture has room to run continuously instead of hitting a hard wall.
 *
 *  The ceiling doubled again with M1 (6 → 12). A child model's drawn extent is
 *  an order of magnitude wider than the node it is embedded in, so its interior
 *  only becomes legible in the top of the old range — the ceiling was where the
 *  seam wanted to be crossed, which made it the wall rather than the limit. The
 *  floor is unchanged; zooming OUT never crosses a seam. */
export const ZOOM_MIN = 0.15;
// #139 M2: the ceiling is a per-FRAME band, not a depth limit. Frame rebasing
// re-expresses the view on a child once its aperture takes the stage, so the
// number restarts near 1 at every level and depth costs nothing numerically.
// The band only has to reach the rebase line from a fitted model: on the
// tallest viewport this build targets that is `RB_IN · minView / (2 · NODE_R)`
// ≈ 17, so 24 leaves the gesture room to overshoot it.
export const ZOOM_MAX = 24;

/** Pure zoom math, exported for testing: given the scale/pan a gesture is
 *  currently reasoning from, a wheel event's deltaY, and whether it arrived as
 *  a trackpad pinch (ctrlKey), returns the next clamped scale and the pan that
 *  keeps `cursor` (view-space) fixed under the pointer. No React, no side
 *  effects — both the direct wheel path and the easing loop below call it. */
export function computeWheelZoom(
  scale: number,
  pan: Pt,
  deltaY: number,
  pinch: boolean,
  cursor: Pt,
): { scale: number; pan: Pt } {
  const factor = Math.exp(-deltaY * (pinch ? 0.01 : 0.0015));
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, scale * factor));
  const k = next / scale;
  return {
    scale: next,
    pan: { x: cursor.x - (cursor.x - pan.x) * k, y: cursor.y - (cursor.y - pan.y) * k },
  };
}

/** Fraction of the remaining distance to the target closed per animation
 *  frame — the easing loop's only tuning knob. Low enough to smooth over a
 *  single large mouse-wheel notch, high enough that a held gesture still
 *  tracks the pointer without a felt lag. */
const ZOOM_EASE = 0.35;
const ZOOM_DONE_SCALE_EPS = 0.0005;
const ZOOM_DONE_PAN_EPS = 0.05;

/** Pointer jitter under this many client px reads as a click, not a drag. */
const CLICK_SLOP = 4;

/** #100 phase 4 (#81 harvest): a primitive designate tool doubles as a STAMP —
 *  clicking the empty stage places a new component that IS that work process,
 *  collapsing place-then-badge into one gesture. Pure: returns the next model,
 *  or null when the armed tool isn't a primitive (interface designation stays
 *  unary-on-existing; place tools have their own branch). The two-step path —
 *  place a component, then stamp it — is untouched. */
export function stampPrimitiveAt(model: CanvasModel, armed: PaletteTool, p: Pt): CanvasModel | null {
  if (armed.verb !== "designate" || armed.designation.type !== "primitive") return null;
  const id = nextId(model.things.map((t) => t.id));
  return {
    ...model,
    things: [
      ...model.things,
      { id, name: `T${id}`, x: p.x, y: p.y, role: "Component", primitive: armed.designation.primitive },
    ],
  };
}

/** What a pointer at `p` connects to: a node, else an interface port resolved to
 *  the component that owns it, else nothing.
 *
 *  The resolution is the whole of #213's first half. A port is not a node to
 *  land on — `I ⊆ C` (`Tuple.lean:97` `interfaces_sub`), so it IS its component
 *  seen at the membrane, and the edge a drop there builds is `env ↔ component`:
 *  the same edge dropping on the component itself builds. Before this the port
 *  was inert to a flow drag and only the component would take the drop, which is
 *  precisely what made the notch read as a third object standing between the
 *  environment and the interior.
 *
 *  Nodes are tested first — a port that happens to sit over a node never steals
 *  its drop. */
export function connectionTargetAt(
  model: CanvasModel,
  portTargets: PortTarget[],
  p: Pt,
  exclude?: number,
  /** Stage scale — the port capsule holds a screen-size floor, so its hit
   *  target has to grow with it or the visible capsule stops being clickable
   *  exactly where it is largest (zoomed out). */
  scale = 1,
): Thing | undefined {
  for (const t of model.things) {
    if (t.id === exclude) continue;
    if (Math.hypot(t.x - p.x, t.y - p.y) <= NODE_R) return t;
  }
  const owner = portOwnerAt(portTargets, p, scale);
  if (owner !== null && owner !== exclude) return thingById(model, owner);
  return undefined;
}

interface GestureDeps {
  model: CanvasModel;
  svgRef: RefObject<SVGSVGElement | null>;
  onModelChange: (m: CanvasModel) => void;
  onReject: (message: string) => void;
  /** The soft channel: a kernel Warning that accompanies a legal edge. Distinct
   *  from `onReject`, which is reserved for refusals. */
  onNotice?: (message: string) => void;
  /** The rail's armed tool (null = no tool armed; gestures behave as before). */
  armed?: PaletteTool | null;
  /** Click-select a node (null clears). Selection is view state, never projected. */
  onSelectThing?: (id: number | null) => void;
  /** Where the Mobus interface ports are drawn, and whose they are (#213). The
   *  canvas computes the pixels; the hook only needs them to hit-test. */
  portTargets?: PortTarget[];
  /** Starting zoom — tests render above a threshold without a gesture. */
  initialScale?: number;
}

export function useCanvasGestures({
  model,
  svgRef,
  onModelChange,
  onReject,
  onNotice,
  armed = null,
  onSelectThing,
  portTargets = [],
  initialScale = 1,
}: GestureDeps) {
  const [state, dispatch] = useReducer(reducer, { ...INITIAL, scale: initialScale });

  // #139: wheel/pinch zoom is eased toward a target rather than snapped —
  // a raw mouse-wheel notch (large, sparse deltaY) would otherwise still read
  // as a jump even though the math is continuous. `target` is where the
  // gesture is heading (fed by every wheel event); `cur` is the animated
  // value actually dispatched, one ease step closer each frame. null = no
  // zoom animation in flight (idle between gestures).
  const zoomAnimRef = useRef<{
    raf: number;
    cur: { scale: number; pan: Pt };
    target: { scale: number; pan: Pt };
  } | null>(null);

  useEffect(
    () => () => {
      if (zoomAnimRef.current) cancelAnimationFrame(zoomAnimRef.current.raf);
    },
    [],
  );

  function stepZoomAnim() {
    const anim = zoomAnimRef.current;
    if (!anim) return;
    anim.cur.scale += (anim.target.scale - anim.cur.scale) * ZOOM_EASE;
    anim.cur.pan = {
      x: anim.cur.pan.x + (anim.target.pan.x - anim.cur.pan.x) * ZOOM_EASE,
      y: anim.cur.pan.y + (anim.target.pan.y - anim.cur.pan.y) * ZOOM_EASE,
    };
    const settled =
      Math.abs(anim.target.scale - anim.cur.scale) < ZOOM_DONE_SCALE_EPS &&
      Math.hypot(anim.target.pan.x - anim.cur.pan.x, anim.target.pan.y - anim.cur.pan.y) < ZOOM_DONE_PAN_EPS;
    if (settled) {
      dispatch({ type: "zoom", scale: anim.target.scale, pan: anim.target.pan });
      zoomAnimRef.current = null;
      return;
    }
    dispatch({ type: "zoom", scale: anim.cur.scale, pan: anim.cur.pan });
    anim.raf = requestAnimationFrame(stepZoomAnim);
  }

  function toWorld(e: { clientX: number; clientY: number }): Pt {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - state.pan.x) / state.scale,
      y: (e.clientY - rect.top - state.pan.y) / state.scale,
    };
  }

  /** Wheel / trackpad-pinch zoom around the cursor: the world point under the
   *  pointer stays fixed while the scale changes. Pure view state, like pan.
   *  #139: each event only updates the animation TARGET; `stepZoomAnim` eases
   *  the dispatched scale/pan toward it, so a sparse mouse-wheel notch reads
   *  as continuous motion instead of a snap, and a dense trackpad stream just
   *  keeps moving the target the animation was already chasing. */
  function onStageWheel(e: WheelEvent) {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const cursor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const anim = zoomAnimRef.current;
    // Reason from wherever the gesture is currently heading, not the (stale,
    // not-yet-rendered) committed state — chaining wheel events mid-animation
    // should feel like one continuous pull, not a re-anchor each tick.
    const base = anim ? anim.target : { scale: state.scale, pan: state.pan };
    const next = computeWheelZoom(base.scale, base.pan, e.deltaY, e.ctrlKey, cursor);
    if (next.scale === base.scale) return;
    if (anim) {
      anim.target = next;
    } else {
      zoomAnimRef.current = {
        raf: requestAnimationFrame(stepZoomAnim),
        cur: { scale: state.scale, pan: { ...state.pan } },
        target: next,
      };
    }
  }

  /** Frame the whole model in a `vw`×`vh` viewport — reuses the same `zoom`
   *  action (scale + pan together) the wheel path uses, so no new view state is
   *  introduced. A no-op for an empty model. Called after compile (#83).
   *  Cancels any in-flight wheel-zoom animation first so a fit request can't
   *  be clobbered by the next eased frame landing after it. */
  function fitToViewport(vw: number, vh: number) {
    if (zoomAnimRef.current) {
      cancelAnimationFrame(zoomAnimRef.current.raf);
      zoomAnimRef.current = null;
    }
    const box = contentBounds(model);
    if (!box) return;
    const { pan, scale } = fitToBox(box, vw, vh);
    dispatch({ type: "zoom", scale, pan });
  }

  /** Put the view exactly here (#139 M2). The rebase's arrival and the ride
   *  that reaches it both need to SET the transform rather than nudge it, and
   *  a rebase in particular has to land on the pixel it left — so this is a
   *  plain assignment through the same `zoom` action, with any in-flight ease
   *  cancelled so a stale frame cannot arrive on top of it. */
  function setView(pan: Pt, scale: number) {
    if (zoomAnimRef.current) {
      cancelAnimationFrame(zoomAnimRef.current.raf);
      zoomAnimRef.current = null;
    }
    dispatch({ type: "zoom", scale, pan });
  }

  function hitTest(p: Pt, exclude?: number): Thing | undefined {
    return connectionTargetAt(model, portTargets, p, exclude, state.scale);
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
      // #226: the interface place-tool births a PASS-WAY — interface: true so
      // the membrane projection owns its rendering (it snaps to the ring
      // wherever the click lands), passway: true so projection fuses it to
      // its Interface record once flows route through it.
      if (armed.passway) {
        onModelChange({
          ...model,
          things: [
            ...model.things,
            { id, name: `I${id}`, x: p.x, y: p.y, role: "Component", interface: true, passway: true },
          ],
        });
        return;
      }
      const name = armed.role === "Environment" ? `E${id}` : `T${id}`;
      onModelChange({
        ...model,
        things: [...model.things, { id, name, x: p.x, y: p.y, role: armed.role }],
      });
      return;
    }
    if (armed?.verb === "designate") {
      // A primitive tool stamps the glyph as the placeable thing (one gesture,
      // stays armed for repeat-stamping). The interface tool keeps its unary
      // meaning: empty-stage click does nothing, tool stays armed (lens-
      // palettes.md § Gesture spec).
      const next = stampPrimitiveAt(model, armed, toWorld(e));
      if (next) onModelChange(next);
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
          const refused = refusal(verdict);
          if (refused) {
            onReject(refused.message);
          } else {
            onModelChange({ ...model, relations: [...model.relations, candidate] });
            const observed = observations(verdict);
            if (observed.length > 0) onNotice?.(observed[0].message);
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
    fitToViewport,
    setView,
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
