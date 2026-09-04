// The authoring + drive canvas. It draws what the kernel gives it and computes
// no dynamics and decides no legality: WHICH nodes are boundary, WHICH edges are
// endo/exo/bond/self-loop, and WHICH ports exist are all Rust verdicts (read off
// `facts`); only their pixel placement is computed here. Gestures live in
// `useCanvasGestures` (pointer events → a pure reducer); per-lens rendering lives
// in the `LensRegistry` (stateless views, one set per lens). This file is the
// stage: backdrops, the render loop, and the node-name draft input.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CanvasModel, EdgeFact, Lens, LensFacts, PortFact, Thing } from "../kernel/types";
import { KIND_COLOR, type SimFrame } from "./types";
import {
  bungeHull,
  INTERFACE_SCALE,
  membraneRing,
  rimPoint,
  ringPoint,
  unprojectWrite,
  straightPath,
  thingById,
  crowdedLabelIds,
  NODE_R,
  type LabelBox,
  type Hull,
  type PortTarget,
  type Pt,
  type Ring,
} from "./geometry";
import { useCanvasGestures, ZOOM_MAX, ZOOM_MIN } from "./useCanvasGestures";
import {
  apertureScreenPx,
  buildFrames,
  flattenFrames,
  frameExtentPx,
  type ApertureRegister,
  type ApertureTier,
  type Embed,
  type FrameNode,
} from "./embed";
import {
  rebaseIn,
  rebaseInScale,
  rebaseOutScale,
  wantsRebaseIn,
  wantsRebaseOut,
  type View,
} from "./frameRebase";
import { EmbeddedFrame } from "./EmbeddedFrame";
import { STYLE } from "./style";
import { LensRegistry, type PaletteTool } from "./lenses/registry";
import { MassOverlay } from "./MassOverlay";
import { screenHold } from "./lenses/common";

/** #335: the "nothing is crowded" set. Hoisted to module scope so the common
 *  case allocates nothing per render; the size-and-membership guard on
 *  `setCrowded` is what actually keeps the measure/render pass from looping. */
const EMPTY_CROWD: ReadonlySet<number> = new Set<number>();

/** How much larger a boundary-crossing flow's arrowhead is drawn than an
 *  interior one. The head is the per-flow direction mark, and at the shipped
 *  register it renders 3-4 screen px on a fitted model — correct and
 *  unreadable, the same failure the port chevron had. */
const EXO_ARROW_GAIN = 2;

// #139 rule 7 — the ride an accelerator takes to a crossing. One notch per
// frame at roughly the wheel's own rate, so a double-click and a hand on the
// wheel arrive by the same path; the overshoot lands past the line the rebase
// reads rather than resting on it; and the component being ridden into closes
// a fraction of its distance to the middle each frame, which is what makes the
// motion read as going somewhere.
const RIDE_STEP = 1.09;
const RIDE_OVERSHOOT = 1.02;
const RIDE_CENTER_EASE = 0.14;

// Instant arrival under prefers-reduced-motion, matching the walk choreography
// the shell already gates the same way (#109).
const prefersReducedMotion = () =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Props {
  model: CanvasModel;
  lens: Lens;
  /** Kernel-computed lens facts (boundary identity set, edge ladder, ports,
   *  aggregate verdict). Every ontology-bearing visual below READS these —
   *  the canvas derives no systems fact itself. */
  facts?: LensFacts | null;
  onModelChange: (m: CanvasModel) => void;
  onReject: (message: string) => void;
  /** The soft channel for a Warning that rides along with a legal edge. */
  onNotice?: (message: string) => void;
  selectedRelationId?: number | null;
  onSelectRelation?: (id: number) => void;
  /** The rail's armed tool — place stamps on stage click, designate on node click. */
  armed?: PaletteTool | null;
  onSelectThing?: (id: number | null) => void;
  /** Double-click a thing — the decomposition walk's enter gesture (#89 step
   *  5b). The canvas only reports the gesture; whether the thing has a child to
   *  enter (and what entering means) is the shell's call. */
  onEnterThing?: (thing: Thing) => void;
  /** #109 exit gesture: while walking, double-click on the EMPTY stage (not on
   *  any thing/relation/boundary) exits one level up — the mirror of
   *  double-click-to-enter. Null/undefined = not walking, and the stage
   *  double-click keeps its node-draft meaning. The shell owns the exit
   *  (same autosaving exitTo path as the breadcrumb). */
  onExitUp?: (() => void) | null;
  /** Click the Mobus membrane STROKE to open the boundary inspector; the
   *  anchor is a world-space point on the ring. Capsules no longer route here —
   *  clicking an interface used to answer a different question ("the boundary")
   *  than the one asked (2026-08-09 field report). */
  onSelectBoundary?: (at: Pt) => void;
  /** Click the milieu band/label to read M — the bath answers when asked. */
  onSelectMilieu?: (at: Pt) => void;
  /** Click a flow-carrying capsule to open the INTERFACE inspector — the
   *  crossing flows at that r = (S, φ), each clickable through to the flow.
   *  UI word is "interface" (Mobus's term); "port" stays code-internal. */
  onSelectInterface?: (port: PortFact, at: Pt) => void;
  driven?: Set<string>;
  sim?: SimFrame | null;
  /** Probability mass per state name at the scrubbed tick (#67 J9). Present for
   *  a Klir/Markov run; each node gets a disc scaled to its P(state). Absent for
   *  every other run — the diagram draws unchanged. */
  mass?: Record<string, number> | null;
  onPanChange?: (pan: Pt) => void;
  onScaleChange?: (scale: number) => void;
  /** Bump to request a fit-to-content pass against the current viewport (e.g.
   *  after an SL compile lays the model out around a fixed center that may sit
   *  outside the narrower SL-pane viewport). Each distinct value fits once. */
  fitToken?: number;
  /** Fraction of the viewport's HEIGHT a bottom overlay (the run dock,
   *  recomposition 2026-08-16) covers — fit frames the content into the band
   *  that stays visible. 0/absent = the whole viewport, as ever. */
  fitBottomFraction?: number;
  /** The containing system's name (author SOI name, else the shell's label) —
   *  the per-lens container labels itself with it (#100 phase 0), so a model
   *  can never impersonate its only component. */
  placeName?: string | null;
  /** #139 M1: a resolved child model by ref id, SYNCHRONOUSLY — the aperture is
   *  drawn mid-gesture, so it cannot wait on I/O. `undefined` = not resolved
   *  yet (ask for it), `null` = does not resolve (the kernel's decomposition
   *  issue stays the only complaint, and the node draws as an ordinary node). */
  childModel?: (id: string) => CanvasModel | null | undefined;
  /** A decomposed component is approaching the size at which its interior
   *  would be drawn. Resolution is the shell's; this is the ask. */
  onApproachChild?: (id: string) => void;
  /** Starting zoom (tests). */
  initialScale?: number;
  /** #139 M2: an aperture has taken the stage and its child becomes the render
   *  root. Carries the composed view (pixel-identical to the frame it fires on)
   *  and the embed that produced it, which is what the shell inverts on the way
   *  back out. */
  onRebaseIn?: (thing: Thing, next: View, embed: Embed) => void;
  /** …and outward: the focused frame has receded far enough to be read from its
   *  parent again, with the view to invert. */
  onRebaseOut?: (view: View) => void;
  /** Put the view exactly here — a rebase's arrival. Each distinct token
   *  applies once, and it must win over the fit a swap would otherwise do. */
  viewCommand?: { token: number; pan: Pt; scale: number } | null;
  /** Ride the zoom path until a rebase fires (#139 rule 7): `in` toward a
   *  component's aperture, `out` until the frame recedes. Each token rides once. */
  ride?: RideOrder | null;
}

/** A ride along the zoom path to the next crossing (#139 rule 7): toward a
 *  component's aperture, or back out until the frame recedes. */
export type RideOrder =
  | { token: number; dir: "in"; thingId: number }
  | { token: number; dir: "out" };

export default function Canvas({
  model,
  lens,
  facts = null,
  onModelChange,
  onReject,
  onNotice,
  selectedRelationId = null,
  onSelectRelation,
  armed = null,
  onSelectThing,
  onEnterThing,
  onExitUp = null,
  onSelectBoundary,
  onSelectMilieu,
  onSelectInterface,
  driven,
  sim,
  mass = null,
  onPanChange,
  onScaleChange,
  fitToken,
  fitBottomFraction,
  placeName = null,
  childModel,
  onApproachChild,
  initialScale,
  onRebaseIn,
  onRebaseOut,
  viewCommand = null,
  ride = null,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  // The Mobus membrane and its ports are computed BEFORE the gesture hook: a
  // port is a drop target for a flow drag (#213), and the hook hit-tests
  // against these pixels. Ring math is pure and reads only props.
  //
  // #306 (ratified 2026-08-09): an authored `interface` component lives ON the
  // membrane — Mobus's interfaces are boundary subsystems (Fig 4.9), not
  // interior nodes tethered to a capsule. So the ring is computed from the
  // NON-interface components (breaking the ring←components circularity), and
  // interface components are PROJECTED onto it for rendering. The projection is
  // presentation: the authored position survives in the model and dragging an
  // interface slides it along the ring (the constraint teaches the ontology).
  const authoredInterfaceIds = new Set(facts?.authored_interface_thing_ids ?? []);
  // #139: which components are currently drawn as apertures. Declared here, and
  // filled further down where the view scale is known — the port geometry below
  // has to run BEFORE the gesture hook that owns the scale, so it reads the
  // PREVIOUS render's tiers. A tier only changes on a scale change, which is
  // itself a render, so the lag is one frame and self-correcting.
  const tiersRef = useRef(new Map<string, ApertureTier>());
  // Tier memory is the hysteresis, and hysteresis is about ONE frame's history.
  // A crossing puts a different document under the same component ids, so
  // carrying the memory across would open an aperture on whatever now holds the
  // id that was open before. Cleared on the document, not on every edit — a
  // drag must not make an open interior blink.
  const tierDocRef = useRef<string | null>(null);
  const tierDocKey = `${model.model_id ?? model.name ?? ""}|${model.things.map((t) => t.id).join(",")}`;
  if (tierDocRef.current !== tierDocKey) {
    tierDocRef.current = tierDocKey;
    tiersRef.current.clear();
  }
  const openApertureIds = new Set(
    [...tiersRef.current]
      .filter(([key, tier]) => tier !== "sealed" && !key.includes("-"))
      .map(([key]) => Number(key)),
  );
  // An on-membrane interface draws a small body and hangs its notches on THAT
  // rim (#306). When the component opens into an aperture, the face grows to
  // the node's circle and the notches ride out with it — they belong on the
  // rim, and the rim is what moved. Without this they sit inside the aperture
  // and cover the interior they are supposed to frame.
  const interfaceRim = (id: number) => NODE_R * (openApertureIds.has(id) ? 1 : INTERFACE_SCALE);
  // While the interior fills the disc, the notches on its rim hold a screen size:
  // they are the seam's pass-ways, a rim detail, not peers of what is inside.
  const APERTURE_PORT_SCREEN_HW = 9;
  // Ring extent comes from the INTERIOR components alone (#226, 2026-08-16):
  // an interface lives ON the ring, so its position must never feed the fit —
  // that feedback was why dragging an interface resized the whole membrane.
  // The one guarded fallback is the degenerate interior (fewer than two
  // interior components — the Fed's single plain component): there the fit
  // falls back to ALL components at authored positions, exactly the pre-#226
  // behavior, so a membrane never collapses to a bubble.
  const interiorThings = model.things.filter(
    (t) => !(t.role === "Component" && authoredInterfaceIds.has(t.id)),
  );
  const interiorComponentCount = interiorThings.filter((t) => t.role === "Component").length;
  const ring: Ring | null =
    lens === "Mobus"
      ? membraneRing(interiorComponentCount >= 2 ? interiorThings : model.things)
      : null;
  // The display model — identical to the authored model except interface
  // components snap to the ring. Every consumer below (gestures, edges, nodes,
  // ports, fit) reads THIS, so pixels and hit-tests always agree.
  const dModel: CanvasModel =
    ring && authoredInterfaceIds.size > 0
      ? {
          ...model,
          things: model.things.map((t) =>
            t.role === "Component" &&
            authoredInterfaceIds.has(t.id) &&
            // Degenerate guard: a sole-component interface (the walk's opaque
            // L0 box) IS the ring's center — projecting it would throw it onto
            // an arbitrary rim point. The box stays put; it is the system.
            Math.hypot(t.x - ring.cx, t.y - ring.cy) > 1
              ? { ...t, ...ringPoint(ring, t) }
              : t,
          ),
        }
      : model;
  const outwardNormal = (r: Ring, p: Pt) => Math.atan2(p.y - r.cy, p.x - r.cx);
  // A port owned by an authored interface rides ITS component's rim (the
  // component is on the membrane; the crossing happens at the component) —
  // a small chevron notch toward its environment, label suppressed (the flow
  // names live on the edges and in the interface inspector). A port on a
  // NON-interface component keeps the classic membrane capsule + interior
  // tether — visibly second-class, which is the point: the drawing shows
  // which crossings have declared boundary apparatus and which do not.
  type PortAt = { port: PortFact; at: Pt; angle: number; tetherTo: Pt | null; compact: boolean };
  const portsAt: PortAt[] =
    ring && facts
      ? facts.ports.flatMap((port): PortAt[] => {
          const env = thingById(dModel, port.env);
          if (!env) return [];
          if (authoredInterfaceIds.has(port.component)) {
            const comp = thingById(dModel, port.component);
            if (!comp) return [];
            const at = rimPoint(comp, env, interfaceRim(comp.id));
            return [{ port, at, angle: Math.atan2(env.y - comp.y, env.x - comp.x), tetherTo: null, compact: true }];
          }
          const at = ringPoint(ring, env);
          return [{ port, at, angle: outwardNormal(ring, at), tetherTo: null, compact: false }];
        })
      : [];

  // Authored-flowless interfaces (kernel fact: authored ∖ flow-crossing) still
  // get a notch — the component sits on the membrane already (#306 snap), so
  // the notch rides its outward rim and the #213 tether is gone: position now
  // says what the dashed line used to.
  const flowlessAt: PortAt[] =
    ring && facts
      ? facts.authored_interface_thing_ids
          .filter((id) => !facts.ports.some((p) => p.component === id))
          .flatMap((id) => {
            const comp = thingById(dModel, id);
            if (!comp) return [];
            const angle = outwardNormal(ring, comp);
            const r = interfaceRim(comp.id);
            const at = { x: comp.x + Math.cos(angle) * r, y: comp.y + Math.sin(angle) * r };
            return [
              {
                port: {
                  component: id,
                  env: -1,
                  relation_ids: [],
                  direction: "Hybrid" as const,
                  // φ is empty until a flow crosses; the port names its owner
                  // instead, so the notch is never anonymous (#213).
                  protocol: `${comp.name} · no flow`,
                },
                at,
                angle,
                tetherTo: null,
                compact: true,
              },
            ];
          })
      : [];

  const portTargets: PortTarget[] = [...portsAt, ...flowlessAt].map(({ port, at }) => ({
    at,
    component: port.component,
  }));

  const gestures = useCanvasGestures({
    model: dModel,
    // #306 write-back guard: gestures see the projected model, but writes must
    // land in AUTHORED coordinates for everything they didn't touch — else the
    // projection persists and the ring inflates every drag frame.
    onModelChange: (m) => onModelChange(unprojectWrite(model, dModel, m)),
    svgRef,
    onReject,
    onNotice,
    armed,
    onSelectThing,
    portTargets,
    initialScale,
  });
  const { pan, scale, connectFrom, connectPos, hoverTarget, draft } = gestures.state;

  // Click-to-edit container label (#116): the membrane/hull/place label writes
  // the model's SELF-name (CanvasModel.name — the field the SL `system "..."`
  // declaration round-trips), never the shell's library label it may be
  // displaying as a fallback. Escape cancels; Enter/blur commits; an empty
  // commit clears to unnamed (the label falls back as before).
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const beginNameEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNameDraft(model.name ?? "");
  };
  const commitName = () => {
    if (nameDraft === null) return;
    const name = nameDraft.trim();
    if (name !== (model.name ?? "")) {
      const next = { ...model };
      if (name) next.name = name;
      else delete next.name;
      onModelChange(next);
    }
    setNameDraft(null);
  };
  const nameField = (widthClass: string) => (
    <input
      autoFocus
      className={`${widthClass} rounded-md border px-2 py-1 text-xs font-body`}
      style={{ borderColor: "var(--lens-accent)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
      value={nameDraft ?? ""}
      placeholder="name this system…"
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) => setNameDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitName();
        if (e.key === "Escape") setNameDraft(null);
      }}
      onBlur={commitName}
    />
  );
  const nameInput = (props: React.SVGProps<SVGForeignObjectElement>) => (
    <foreignObject data-export-ignore pointerEvents="auto" {...props} height={32}>
      {nameField("w-full")}
    </foreignObject>
  );

  useEffect(() => {
    onPanChange?.(pan);
  }, [pan, onPanChange]);

  useEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  // Fit-to-content on request: a new `fitToken` frames the current model in the
  // live viewport (read from the SVG's client rect, so an open SL pane's
  // narrower width is respected). Keyed on the token alone — the render that
  // carries a given token already holds the compiled model, so `fitToViewport`
  // closes over it; adding it to deps would refit on every render (e.g. drags).
  const { fitToViewport } = gestures;
  useEffect(() => {
    if (fitToken === undefined) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    fitToViewport(rect.width, rect.height * (1 - (fitBottomFraction ?? 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

  // Wheel zoom needs a NON-passive native listener (browsers default wheel to
  // passive, which would ignore preventDefault and scroll the page instead).
  const { onStageWheel } = gestures;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", onStageWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onStageWheel);
  }, [onStageWheel]);

  // #335 detail-on-demand: which edge labels collide, measured off what was
  // actually drawn. Every lens renders its label inside a `[data-edge-label]`
  // group, so this reads the rendered boxes rather than re-deriving per-lens
  // text — the lens stays the single author of its own label.
  //
  // useLayoutEffect, not useEffect: the quieting is applied before paint, so a
  // crowded label never flashes at full strength and then dims.
  //
  // No dependency array by design. Label boxes move with node drags, lens
  // changes, sibling counts and name edits — enumerating those is a bug farm,
  // and the `setCrowded` below is idempotent, so an extra pass costs one
  // measurement and changes nothing. It TERMINATES because quieting is done
  // with opacity: the boxes measured on pass 2 are identical to pass 1, the set
  // compares equal, and no further render is scheduled.
  //
  // Boxes are read in SCREEN space, so the pad is real perceived air. Whether
  // two labels collide is still zoom-invariant — the stage transform is a
  // uniform scale, which is why zoom-aware labels were a dead end — but the pan
  // and scale state that this effect reruns on keep the rects honest.
  const [crowded, setCrowded] = useState<ReadonlySet<number>>(EMPTY_CROWD);
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Node NAMES join the pass as fixed obstacles — an edge label landing on a
    // thing's name is as unreadable as one landing on another label, and it is
    // the flow label that yields (a name has no hover of its own).
    const els = Array.from(
      svg.querySelectorAll<SVGElement>("[data-edge-label], [data-node-label]"),
    );
    const boxes: LabelBox[] = [];
    for (const el of els) {
      // Screen space, so an edge label on the stage and a name inside its
      // node's transformed group compare directly. jsdom reports every rect as
      // 0×0, so the unit suite measures nothing, nothing is crowded, and every
      // label renders — the pre-#335 behaviour. The clustering rule itself is
      // covered directly in geometry.crowding.test.ts.
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // Thing ids and relation ids share one number space here, which is safe
      // only because a `fixed` box is never ADDED to the result — the returned
      // set holds relation ids alone, so `crowded.has(r.id)` cannot be answered
      // by a node that happens to carry the same number.
      const fixed = el.dataset.nodeLabel !== undefined;
      boxes.push({
        id: Number(fixed ? el.dataset.nodeLabel : el.dataset.edgeLabel),
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        fixed,
      });
    }
    const next = crowdedLabelIds(boxes);
    setCrowded((prev) =>
      prev.size === next.size && [...next].every((id) => prev.has(id)) ? prev : next,
    );
  });

  const views = LensRegistry[lens];
  const containerBox = boundingBox(dModel.things);

  // Kernel facts, indexed for the render loop. WHICH nodes are boundary, WHICH
  // edges are endo/exo/bond/self-loop, and WHICH ports exist are all Rust
  // verdicts; only their pixel placement is computed here.
  const boundarySet = new Set(facts?.boundary_thing_ids ?? []);
  const orphanSet = new Set(facts?.orphan_env_thing_ids ?? []);
  const edgeFactById = new Map<number, EdgeFact>((facts?.edges ?? []).map((e) => [e.id, e]));

  // The per-lens container (#100 phase 0) — one mechanism, three honest
  // renderings. Mobus: B = ⟨P, I⟩ reified, a membrane around the components,
  // present from birth (an empty interior draws it small — an empty system is
  // still a system). Bunge: a dashed hull, the observer's partition over one
  // flat ontology — never a membrane object. Klir: neither; a place label does
  // the orientation via copy, faithful to the flat (T, R). Env objects and a
  // walked child's G′ stand-ins sit outside both containers by construction
  // (they follow Components only; an env thing dragged inside is a layout
  // artifact, not a semantic error: C ∩ E = ∅ is enforced by the kernel's roles).
  const hull: Hull | null = lens === "Bunge" ? bungeHull(dModel.things) : null;

  // #139 M1: which decomposed components are open, and how far. Keep zooming
  // and a component stops being a filled body and becomes an APERTURE — its
  // child model drawn inside its own circle, in place, with no swap, no walk
  // segment and no breadcrumb change. Nothing here decides a systems fact: the
  // hierarchy is the language's (`decomposes @id`) and the seam's verdict is
  // the kernel's; this only chooses what is worth drawing at this size.
  //
  // Mobus only, for now. The membrane is what an aperture is read through, and
  // Bunge's hull is the observer's cut rather than a border a child could be
  // seen inside; Klir draws no container at all.
  //
  // The aperture is the node's circle, always — a decomposition must not invent
  // a second node shape for the thing it is already drawing.
  const aperturePx = apertureScreenPx(scale);
  // Only frames in view are drawn. Read off the live element rather than kept
  // in state — every pan and zoom re-renders this anyway, so the numbers cannot
  // go stale, and before mount nothing is culled.
  // Arrowheads are sized in stroke units (markerUnits' default), so past 1.5×
  // they would grow with the world; edges hold a screen stroke and the heads
  // hold with them.
  const headHold = screenHold(scale);
  const viewW = svgRef.current?.clientWidth ?? 0;
  const viewH = svgRef.current?.clientHeight ?? 0;
  const inViewport = (t: Thing) => {
    if (viewW === 0 || viewH === 0) return true;
    const r = aperturePx / 2;
    const sx = pan.x + t.x * scale;
    const sy = pan.y + t.y * scale;
    return sx + r >= 0 && sx - r <= viewW && sy + r >= 0 && sy - r <= viewH;
  };
  // Klir draws no container at all, so it has nothing for a child to be seen
  // inside and opens no aperture (#139 rule 5).
  const register: ApertureRegister | null = lens === "Klir" ? null : lens;
  const approaching: string[] = [];
  const frames: FrameNode[] =
    register && childModel
      ? buildFrames(dModel, scale, {
          childModel,
          register,
          tierOf: (key) => tiersRef.current.get(key) ?? "sealed",
          setTier: (key, tier) => tiersRef.current.set(key, tier),
          approach: (id) => approaching.push(id),
          visible: inViewport,
        })
      : [];
  const allFrames = flattenFrames(frames);

  const approachKey = [...new Set(approaching)].join(" ");
  useEffect(() => {
    if (!approachKey) return;
    for (const id of approachKey.split(" ")) onApproachChild?.(id);
  }, [approachKey, onApproachChild]);

  // The port geometry above read the PREVIOUS render's open set, so the frame
  // in which an aperture first opens still hangs that component's notches on
  // the small interface rim. One more render settles it — and it terminates,
  // because that render reads the tiers this one just wrote.
  const [, settleApertures] = useState(0);
  const openNow = frames.map((f) => f.thing.id).sort().join(" ");
  const openWhenPortsWerePlaced = [...openApertureIds].sort().join(" ");
  useEffect(() => {
    if (openNow !== openWhenPortsWerePlaced) settleApertures((n) => n + 1);
  }, [openNow, openWhenPortsWerePlaced]);

  // The crossing IS the rebase (#139 M2/M3). Keep pushing into an open aperture
  // and the child stops being drawn through its parent and becomes the render
  // root: the composite screen transform is unchanged, so the frame is
  // pixel-identical and only what is editable and what the breadcrumb says
  // change. Keep pulling back and the mirror runs. The canvas reports the
  // crossing and the composed view; the shell still owns what entering and
  // rising mean, which is how the autosave and dirty-state discipline stay in
  // exactly one place.
  //
  // The arming bits are keyed on the AUTHORED model's `things` — the display
  // model is rebuilt every render and would re-arm on every frame. A rebase
  // arrives at a view that is already past the line it fired on, so a fresh
  // frame starts DISARMED and has to be read on the near side before it can
  // fire; without that the arrival answers the gesture and the walk runs away.
  // An in-flight ride (below) is abandoned the moment the crossing it was
  // heading for happens — the destination is on the far side of the line, and
  // continuing to chase it would keep zooming after the frame changed.
  const rideRef = useRef<{ raf: number; token: number } | null>(null);
  const seamDocRef = useRef<readonly Thing[] | null>(null);
  const inArmRef = useRef(new Map<number, boolean>());
  const outArmRef = useRef(false);
  useEffect(() => {
    const minView = Math.min(viewW, viewH);
    if (minView <= 0) return;
    if (seamDocRef.current !== model.things) {
      seamDocRef.current = model.things;
      inArmRef.current.clear();
      outArmRef.current = false;
    }
    // Every door's bit is read each pass, whatever tier it is in — a bit only
    // touched once its aperture is already open can never fall back below its
    // own line, and so never arms. Only the aperture nearest the middle of the
    // stage can be the one being pushed into, and only an open one is a door.
    let target: FrameNode | null = null;
    let nearest = Infinity;
    for (const f of frames) {
      const dx = pan.x + f.thing.x * scale - viewW / 2;
      const dy = pan.y + f.thing.y * scale - viewH / 2;
      if (dx * dx + dy * dy < nearest) {
        nearest = dx * dx + dy * dy;
        target = f;
      }
    }
    for (const t of dModel.things) {
      if (!t.child_model) continue;
      const next = wantsRebaseIn(aperturePx, minView, inArmRef.current.get(t.id) ?? false);
      inArmRef.current.set(t.id, next.armed);
      if (next.fire && target && t.id === target.thing.id && onRebaseIn) {
        rideRef.current = null;
        onRebaseIn(t, rebaseIn({ pan, scale }, target.embed), target.embed);
        return;
      }
    }
    if (onRebaseOut && register) {
      const extent = frameExtentPx(dModel, scale, register);
      const next = wantsRebaseOut(extent, minView, outArmRef.current);
      outArmRef.current = next.armed;
      if (next.fire) {
        rideRef.current = null;
        onRebaseOut({ pan, scale });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, pan, aperturePx, viewW, viewH, model.things, openNow, onRebaseIn, onRebaseOut]);

  // An arriving rebase sets the view outright — the whole claim of the crossing
  // is that the picture does not move, so this must land before paint and must
  // beat the fit a model swap would otherwise run.
  const { setView } = gestures;
  useLayoutEffect(() => {
    if (!viewCommand) return;
    setView(viewCommand.pan, viewCommand.scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewCommand?.token]);

  // The accelerators ride the same path the wheel does (#139 rule 7). A
  // double-click, or a breadcrumb click, does not swap anything: it animates
  // the view until the rebase decision above fires on its own, so there is one
  // crossing mechanism and the shortcut is only a faster hand on it. Reduced
  // motion takes the ride's last frame directly, which fires the same way.
  const rideStateRef = useRef({ pan, scale, viewW, viewH, dModel, register, frames });
  rideStateRef.current = { pan, scale, viewW, viewH, dModel, register, frames };
  // One queue for both callers — the shell asks through `ride` (a breadcrumb
  // click), the stage asks through a double-click, and neither can tell the
  // difference afterwards because there is only the one path.
  const [order, setOrder] = useState<RideOrder | null>(null);
  const orderSeq = useRef(0);
  const startRide = (r: { dir: "in"; thingId: number } | { dir: "out" }) =>
    setOrder({ ...r, token: (orderSeq.current += 1) });
  useEffect(() => {
    if (ride) startRide(ride);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.token]);
  useEffect(() => {
    if (!order) return;
    const ride = order;
    const stop = () => {
      if (rideRef.current) cancelAnimationFrame(rideRef.current.raf);
      rideRef.current = null;
    };
    /** Where the ride is heading: past the line the rebase reads, so the
     *  arrival is unambiguous rather than resting exactly on it. */
    const destination = () => {
      const st = rideStateRef.current;
      const minView = Math.min(st.viewW, st.viewH);
      if (minView <= 0) return null;
      if (ride.dir === "in") return Math.min(ZOOM_MAX, rebaseInScale(minView, NODE_R) * RIDE_OVERSHOOT);
      const extentWorld = st.register ? frameExtentPx(st.dModel, 1, st.register) : 0;
      return Math.max(ZOOM_MIN, rebaseOutScale(minView, extentWorld) / RIDE_OVERSHOOT);
    };
    /** The view one ride frame on. Zooming in pulls the component toward the
     *  middle of the stage; zooming out holds the middle still — the anchor is
     *  what makes a ride read as a move toward something rather than a rescale. */
    const frame = (next: number, ease: number): View => {
      const st = rideStateRef.current;
      const at = ride.dir === "in" ? thingById(st.dModel, ride.thingId) : undefined;
      if (!at) {
        const k = next / st.scale;
        const cx = st.viewW / 2;
        const cy = st.viewH / 2;
        return { scale: next, pan: { x: cx - (cx - st.pan.x) * k, y: cy - (cy - st.pan.y) * k } };
      }
      const cur = { x: st.pan.x + at.x * st.scale, y: st.pan.y + at.y * st.scale };
      const want = {
        x: cur.x + (st.viewW / 2 - cur.x) * ease,
        y: cur.y + (st.viewH / 2 - cur.y) * ease,
      };
      return { scale: next, pan: { x: want.x - at.x * next, y: want.y - at.y * next } };
    };
    const step = () => {
      const st = rideStateRef.current;
      // Nothing above the outermost frame to ride to. Without this the ride
      // that answered the last crossing goes on shrinking the model afterwards.
      if (ride.dir === "out" && !onExitUp) return stop();
      const to = destination();
      if (to === null) return stop();
      if (ride.dir === "in" ? st.scale >= to : st.scale <= to) {
        // Reaching the destination without a crossing means the seam never
        // opened — an unresolved child, most often. The gesture still meant
        // "go in", so it falls back to the shell's own door rather than
        // leaving the view zoomed at a thing it could not enter.
        const crossed = rideRef.current === null;
        stop();
        const t = ride.dir === "in" ? thingById(st.dModel, ride.thingId) : undefined;
        if (!crossed && t) onEnterThing?.(t);
        return;
      }
      const next = ride.dir === "in" ? Math.min(to, st.scale * RIDE_STEP) : Math.max(to, st.scale / RIDE_STEP);
      const v = frame(next, RIDE_CENTER_EASE);
      setView(v.pan, v.scale);
      if (rideRef.current) rideRef.current.raf = requestAnimationFrame(step);
    };
    if (prefersReducedMotion()) {
      const to = destination();
      if (to === null) return;
      const v = frame(to, 1);
      setView(v.pan, v.scale);
      return;
    }
    rideRef.current = { raf: requestAnimationFrame(step), token: ride.token };
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.token]);


  return (
    <svg
      ref={svgRef}
      className={`canvas-stage absolute inset-0 h-full w-full touch-none select-none${armed ? " cursor-crosshair" : ""}`}
      data-grid={STYLE.grid.mode}
      style={
        {
          "--grid-gap": `${STYLE.grid.gap}px`,
          "--grid-ink": STYLE.grid.ink,
          backgroundColor: STYLE.grid.wash ? "color-mix(in srgb, var(--lens-accent) 4%, transparent)" : undefined,
        } as React.CSSProperties
      }
      onPointerDown={gestures.onStagePointerDown}
      onPointerMove={gestures.onStagePointerMove}
      onPointerUp={gestures.onStagePointerUp}
      onDoubleClick={(e) => {
        // #109: while walking, an empty-stage double-click exits one level
        // (things/edges/membrane are child elements, so target ≠ currentTarget
        // for them — a double-click ON a thing still enters via its own
        // handler). Not walking → the gesture stays the node-draft creator.
        if (onExitUp && e.target === e.currentTarget) {
          if (onRebaseOut) startRide({ dir: "out" });
          else onExitUp();
          return;
        }
        gestures.onStageDoubleClick(e);
      }}
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth={STYLE.arrowSize * headHold}
          markerHeight={STYLE.arrowSize * headHold}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-slate)" />
        </marker>
        {/* Substance-colored heads for the kind-colored lenses (Mobus, Bunge) —
            the head is part of the stroke, not a neutral terminus. Klir keeps
            the slate `arrow`: its line is deliberately substance-blind. */}
        {Object.entries(KIND_COLOR).map(([k, color]) => (
          <marker
            key={k}
            id={`arrow-${k}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth={STYLE.arrowSize * headHold}
            markerHeight={STYLE.arrowSize * headHold}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
        {/* #C phase 2: a boundary CROSSING carries a heavier head.
            Direction is a per-FLOW question and the port cannot answer it — on
            federal-reserve.sl four of five ports are `hybrid`, carrying inbound
            and outbound at once, so their glyph says "both" however large it is
            drawn. The head is the only mark that belongs to one flow.
            It needed the gain because `markerUnits` defaults to strokeWidth: at
            arrowSize 5 a matter head is 7.5 world units and an informational
            one 5, which at a fitted 0.54 render as ~4 and ~2.7 SCREEN px.
            Endo edges keep the plain head — inside the boundary there is no
            in/out to read, so amplifying there would be decoration. */}
        {Object.entries(KIND_COLOR).map(([k, color]) => (
          <marker
            key={`${k}-exo`}
            id={`arrow-${k}-exo`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth={STYLE.arrowSize * EXO_ARROW_GAIN * headHold}
            markerHeight={STYLE.arrowSize * EXO_ARROW_GAIN * headHold}
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
        {/* The BONDHOOD channel (#320). An arrowhead asserts a bond; a relation
            authored `mere` must stay visible and must not read as transport, so
            it terminates in an open coupling cap at BOTH ends — adjacency, with
            no end that is the receiving one. Hollow and unfilled on purpose: a
            filled terminus reads as a stop, and a mere relation does not stop
            anything, it simply holds. Klir never uses it (see klir.tsx). */}
        <marker id="coupling" viewBox="0 0 10 10" refX="5" refY="5" markerWidth={STYLE.arrowSize} markerHeight={STYLE.arrowSize} orient="auto">
          <circle cx="5" cy="5" r="3" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" />
        </marker>
        {/* the "work sphere" sheen of the house drawings (Fig. 4.5) — a neutral
            top-left highlight, never a substance color. */}
        <radialGradient id="mobus-sphere" cx="38%" cy="34%" r="72%">
          <stop offset="0%" stopColor="var(--bg-surface)" />
          <stop offset="62%" stopColor="var(--bg-secondary)" />
          <stop offset="100%" stopColor="var(--bg-surface)" />
        </radialGradient>
        {/* perceptive fuzziness → membrane edge blur (Mobus B properties) */}
        <filter id="ring-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={facts ? facts.boundary_props.perceptive_fuzziness * 6 : 0} />
        </filter>
        {/* #139: an aperture clips its child to the component's own circle.
            The decision was the disc, not a box — a decomposition must not
            invent a second node shape for the thing it is already drawing. */}
        {allFrames.map((f) => (
          <clipPath key={f.key} id={`aperture-${f.key}`}>
            {/* A clip path is read in the user space of whatever REFERENCES it,
                and a nested frame references this from inside its ancestors'
                embeddings — so the circle is written in the frame's own
                coordinates at every depth, and the ancestors' clips come from
                the elements it is nested inside. */}
            <circle cx={f.thing.x} cy={f.thing.y} r={NODE_R} />
          </clipPath>
        ))}
        {/* energy flows glow (Mobus typed strokes) */}
        <filter id="energy-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation={STYLE.energyGlow.dev}
            floodColor="var(--accent)"
            floodOpacity={STYLE.energyGlow.opacity}
          />
        </filter>
      </defs>
      <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
        {lens === "Klir" && containerBox && (
          <g>
            {/* the observer's distinction frame — a drawn distinction, NOT a
                system boundary (Klir: boundary is the investigator's act) */}
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

        {/* Bunge: the C/E partition as a dashed hull — the observer's
            re-cuttable cut, not a boundary object (unfilled, unclickable, no
            ports; the rim-accent on boundary components stays the only
            boundary marking). The label names the containing system, and only
            the label is interactive — click to rename (#116). */}
        {hull && (
          <g pointerEvents="none">
            <rect
              x={hull.x}
              y={hull.y}
              width={hull.w}
              height={hull.h}
              rx={18}
              fill="none"
              stroke="var(--lens-accent)"
              strokeOpacity={0.55}
              strokeWidth={1.5}
              strokeDasharray="8 6"
            />
            {nameDraft !== null && nameInput({ x: hull.x + 8, y: hull.y - 26, width: 160 })}
            {nameDraft === null && placeName && (
              <text
                x={hull.x + 12}
                y={hull.y - 10}
                fontSize={11}
                fill="var(--text-secondary)"
                className="font-mono cursor-text"
                pointerEvents="auto"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={beginNameEdit}
              >
                <title>Click to rename this system (writes the SL system declaration)</title>
                {placeName}
              </text>
            )}
          </g>
        )}

        {/* Mobus: the boundary ring is the star — a real membrane, drawn behind
            the flows and labeled with the system's name ON the boundary (the
            membrane is an object with properties, its name among them).
            Porosity → dash density; fuzziness → edge blur. */}
        {ring && (
          <>
            {/* The milieu M (E = ⟨O, M⟩): the bath, drawn as bathing — a soft
                halo band hugging the membrane's outside, pointer-transparent,
                with the variables named once in a quiet line beneath the ring.
                Never a box, never an arrow: the milieu "surrounds or bathes
                the system... does not interact necessarily through a discrete
                set of interfaces" (lifecycle paper). Mobus lens only — Klir
                and Bunge count it in their hidden residue instead. */}
            {(model.milieu?.length ?? 0) > 0 && (
              <g>
                {/* The ambient wash: M pervades the whole EXTERIOR (the env
                    objects sit in the bath — that is what a milieu is), cut
                    away inside the membrane. Flat fill, not a gradient (the
                    instrument register forbids gradients); the band below
                    doubles the tint where system meets bath, so density at
                    the boundary reads without a fade. */}
                <path
                  fillRule="evenodd"
                  d={
                    `M ${ring.cx - ring.rx - 4000} ${ring.cy - ring.ry - 4000} ` +
                    `H ${ring.cx + ring.rx + 4000} V ${ring.cy + ring.ry + 4000} ` +
                    `H ${ring.cx - ring.rx - 4000} Z ` +
                    `M ${ring.cx - ring.rx} ${ring.cy} ` +
                    `A ${ring.rx} ${ring.ry} 0 1 0 ${ring.cx + ring.rx} ${ring.cy} ` +
                    `A ${ring.rx} ${ring.ry} 0 1 0 ${ring.cx - ring.rx} ${ring.cy} Z`
                  }
                  fill="var(--milieu)"
                  opacity={0.05}
                  pointerEvents="none"
                />
                {/* The band: same tint, denser where the system meets its
                    bath. Clickable — the bath answers when asked. */}
                <ellipse
                  cx={ring.cx}
                  cy={ring.cy}
                  rx={ring.rx + 20}
                  ry={ring.ry + 20}
                  fill="none"
                  stroke="var(--milieu)"
                  strokeWidth={34}
                  opacity={0.14}
                  pointerEvents={onSelectMilieu ? "stroke" : "none"}
                  className={onSelectMilieu ? "cursor-pointer" : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMilieu?.({ x: ring.cx, y: ring.cy + ring.ry + 56 });
                  }}
                />
                <text
                  x={ring.cx}
                  y={ring.cy + ring.ry + 48}
                  textAnchor="middle"
                  fontSize={STYLE.label.size - 1}
                  fontStyle="italic"
                  fill="var(--milieu)"
                  paintOrder="stroke"
                  stroke="var(--bg-primary)"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  className={`font-body${onSelectMilieu ? " cursor-pointer" : ""}`}
                  pointerEvents={onSelectMilieu ? "all" : "none"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMilieu?.({ x: ring.cx, y: ring.cy + ring.ry + 56 });
                  }}
                >
                  <title>The milieu M — click to read its variables</title>
                  {"milieu — " +
                    model
                      .milieu!.map((m) =>
                        m.value != null ? `${m.name} ${m.value}${m.unit ? ` ${m.unit}` : ""}` : m.name,
                      )
                      .join(" · ")}
                </text>
              </g>
            )}
            <ellipse
              cx={ring.cx}
              cy={ring.cy}
              rx={ring.rx}
              ry={ring.ry}
              fill="var(--accent-soft)"
              fillOpacity={STYLE.ring.fillOpacity}
              stroke="var(--accent-slate)"
              strokeWidth={STYLE.ring.strokeWidth}
              strokeDasharray={
                facts && facts.boundary_props.porosity > 0
                  ? `${Math.max(2, 14 - facts.boundary_props.porosity * 12)} ${2 + facts.boundary_props.porosity * 8}`
                  : undefined
              }
              filter={facts && facts.boundary_props.perceptive_fuzziness > 0 ? "url(#ring-blur)" : undefined}
              pointerEvents={onSelectBoundary ? "stroke" : "none"}
              className={onSelectBoundary ? "cursor-pointer" : undefined}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBoundary?.({ x: ring.cx, y: ring.cy - ring.ry });
              }}
            />
            {/* The name ON the membrane is click-to-edit (#116): only the text
                is interactive — the ellipse keeps its stroke-only hit area, so
                boundary clicks behave exactly as before. */}
            {nameDraft !== null && nameInput({ x: ring.cx - 60, y: ring.cy - ring.ry - 16, width: 120 })}
            {nameDraft === null && placeName && (
              <text
                x={ring.cx}
                y={ring.cy - ring.ry}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={STYLE.label.size}
                fill="var(--accent-slate)"
                paintOrder="stroke"
                stroke="var(--bg-primary)"
                strokeWidth={4}
                strokeLinejoin="round"
                className="font-body cursor-text"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={beginNameEdit}
              >
                <title>Click to rename this system (writes the SL system declaration)</title>
                {placeName}
              </text>
            )}
          </>
        )}

        {dModel.relations.map((r) => (
          <views.EdgeView
            key={r.id}
            model={dModel}
            relation={r}
            fact={edgeFactById.get(r.id)}
            ring={ring}
            sigIndex={dModel.relations.indexOf(r)}
            selected={selectedRelationId === r.id}
            crowded={crowded.has(r.id)}
            driven={driven?.has(r.name) ?? false}
            sim={sim?.edges[r.name]}
            onSelect={onSelectRelation}
          />
        ))}

        {connectFrom !== null && connectPos && (
          <line
            data-export-ignore
            x1={thingById(dModel, connectFrom)?.x}
            y1={thingById(dModel, connectFrom)?.y}
            x2={connectPos.x}
            y2={connectPos.y}
            stroke="var(--lens-accent)"
            strokeWidth={2}
            strokeDasharray="4 4"
            pointerEvents="none"
          />
        )}

        {/* #67 J9: probability mass rides UNDER the nodes — the state-transition
            structure stays the primary read, the distribution is the overlay. */}
        {mass && <MassOverlay things={dModel.things} mass={mass} />}

        {dModel.things.map((t) => (
          <g
            key={t.id}
            className={openApertureIds.has(t.id) ? "aperture-open" : undefined}
            onDoubleClick={(e) => {
              e.stopPropagation();
              // The accelerator rides the zoom path to the seam rather than
              // swapping across it (#139 rule 7). The ride resolves the child
              // on the way — it passes the prefetch line long before the
              // crossing — and falls back to the shell's door if it arrives
              // without one, so a register that opens no aperture and a
              // referent that resolves nowhere both still work.
              if (onRebaseIn && t.child_model && register) startRide({ dir: "in", thingId: t.id });
              else onEnterThing?.(t);
            }}
          >
            <views.NodeView
              thing={t}
              isBoundary={boundarySet.has(t.id)}
              isOrphan={orphanSet.has(t.id)}
              hovered={hoverTarget === t.id}
              sim={sim?.nodes[t.name]}
              scale={scale}
              onPointerDown={(e) => gestures.onNodePointerDown(e, t)}
              onHandlePointerDown={(e) => gestures.onHandlePointerDown(e, t)}
            />
            {/* #306: position now carries the interface meaning (the component
                sits ON the membrane), so the interim ring/tag is gone. What
                remains is the multi-protocol notice — one interface carrying
                couplings to several environments is drawable but coarser than
                Mobus's one-protocol interfaces. State it, don't hide it (the
                Bunge ⊘M pattern); the remedy lives in the title. */}
            {authoredInterfaceIds.has(t.id) &&
              (facts?.ports.filter((p) => p.component === t.id).length ?? 0) >= 2 && (
                <g data-protocols-notice transform={`translate(${t.x}, ${t.y - NODE_R - 11})`} pointerEvents="all">
                  <title>
                    {`one interface carrying ${facts!.ports.filter((p) => p.component === t.id).length} protocols — split it into sibling interfaces, or decompose it and let the child's boundary refine each crossing`}
                  </title>
                  <text
                    textAnchor="middle"
                    fontSize={8}
                    fill="var(--verdict-warning)"
                    className="font-mono"
                    letterSpacing={0.5}
                  >
                    {facts!.ports.filter((p) => p.component === t.id).length} protocols
                  </text>
                </g>
              )}
          </g>
        ))}

        {/* #139 M1: the open apertures, over the nodes whose faces they take.
            Drawn AFTER the node so the component keeps its hit disc, its drag
            and its connect handle — the frame is pointer-transparent, so the
            author still works the parent model through it. The node's name goes
            on drawing beneath the rim, which is what demotes it to a caption:
            the disc it used to sit under is now a way in. */}
        {frames.map((f) => (
          <g key={`aperture-${f.key}`}>
            <EmbeddedFrame node={f} frameScale={scale} register={register!} caption={f.thing.name} />
            {/* The handle stays clickable through the frame, so it must stay
                visible through it too — an echo of the one underneath. */}
            <circle
              cx={f.thing.x + NODE_R * 0.75}
              cy={f.thing.y + NODE_R * 0.75}
              r={STYLE.handle.r * headHold}
              fill="var(--bg-primary)"
              stroke="var(--lens-accent)"
              strokeWidth={STYLE.handle.width * headHold}
              pointerEvents="none"
            />
          </g>
        ))}

        {/* Mobus interface ports — pill notches in the membrane, one per kernel
            PortFact (r = (S, φ): existence, direction, and protocol are kernel
            facts; only the pixel position is computed here). */}
        {portsAt.map(({ port, at, angle, compact }) => (
          <views.PortView
            key={`${port.component}-${port.env}`}
            port={port}
            at={at}
            angle={angle}
            compact={compact}
            scale={scale}
            screenHw={openApertureIds.has(port.component) ? APERTURE_PORT_SCREEN_HW : undefined}
            onSelect={onSelectInterface ? () => onSelectInterface(port, at) : undefined}
          />
        ))}
        {/* A flowless port has no membrane crossing to inspect — it names one
            component (#180), so its click selects THAT thing, not the
            boundary (the fixable warning for the same fact is emitted by
            check_flowless_interfaces in bert-canvas/src/lenses.rs).

            #213: the notch is TETHERED to the component it designates and
            labelled with its name. `I ⊆ C` — the port is not a second object
            next to the component, it is that component seen at the membrane,
            and until a flow crosses there is no other mark saying so. The
            tether borrows the exo edge's muted interior treatment (dashed,
            0.3 opacity) so the same line means the same thing in both cases:
            "this port serves that component." */}
        {flowlessAt.map(({ port, at, angle, tetherTo, compact }) => (
          <g
            key={`authored-${port.component}`}
            data-port-owner={port.component}
            // Dragging a flow over the port lights the port AND its component
            // (hitTest resolves the port to the owner, which sets hoverTarget) —
            // the two react as one thing because they ARE one thing.
            opacity={hoverTarget === port.component ? 1 : 0.6}
          >
            {tetherTo && (
              <path
                data-port-tether={port.component}
                d={straightPath(tetherTo, at)}
                fill="none"
                stroke="var(--lens-accent)"
                strokeOpacity={0.45}
                strokeWidth={1.25}
                strokeDasharray="4 4"
                pointerEvents="none"
              />
            )}
            <views.PortView
              port={port}
              at={at}
              angle={angle}
              compact={compact}
              scale={scale}
              screenHw={openApertureIds.has(port.component) ? APERTURE_PORT_SCREEN_HW : undefined}
              onSelect={onSelectThing ? () => onSelectThing(port.component) : undefined}
            />
          </g>
        ))}

        {draft && (
          <foreignObject data-export-ignore x={draft.x - 60} y={draft.y - 16} width={120} height={32}>
            <input
              autoFocus
              className="w-full rounded-md border px-2 py-1 text-xs font-body"
              style={{ borderColor: "var(--lens-accent)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
              value={draft.name}
              placeholder="name…"
              onChange={(e) => gestures.setDraftName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") gestures.commitDraft();
                if (e.key === "Escape") gestures.clearDraft();
              }}
              onBlur={gestures.commitDraft}
            />
          </foreignObject>
        )}
      </g>

      {/* Klir: NO ontological container — orientation is copy. A screen-space
          place label (outside the pan/zoom group) does the you-are-here work;
          the export path re-anchors it into the diagram's frame. */}
      {lens === "Klir" && nameDraft !== null && (
        <foreignObject data-export-ignore x="0" y={8} width="100%" height={32} pointerEvents="auto">
          <div className="flex justify-center">{nameField("w-40")}</div>
        </foreignObject>
      )}
      {lens === "Klir" && nameDraft === null && placeName && (
        <text
          data-place-label
          x="50%"
          y={24}
          textAnchor="middle"
          fontSize={11}
          fill="var(--text-muted)"
          className="font-mono cursor-text"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={beginNameEdit}
        >
          <title>Click to rename this system (writes the SL system declaration)</title>
          viewing: {placeName}
        </text>
      )}
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
