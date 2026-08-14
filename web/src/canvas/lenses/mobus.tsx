// Mobus lens views. The boundary ring is reified as a real membrane (drawn by
// the stage backdrop); a component stamped with a work process renders GLYPH-
// FIRST (it IS that process — #100 phase 4, #81 harvest), with the decision/
// regulator (Modulating) as the warm Fig 4.17 triangle; env
// sources/sinks are open shapes; flows are typed strokes (material solid heavy,
// energy glowing, message thin/dashed — Message is a peer substance, copyable,
// not conserved). Exo flows render as two segments because G is bipartite
// (Tuple.lean): the crossing is env-object ↔ port, never straight to interior.
import type { EdgeFact, PortFact, Relation } from "../../kernel/types";
import { KIND_COLOR } from "../types";
import { edgeGeometry, INTERFACE_SCALE, portHalfWidth, rimPoint, ringPoint, siblingStep, straightPath, thingById, NODE_R, type Pt } from "../geometry";
import { STYLE, elideEdgeLabel } from "../style";
import { EdgeScaffold, NodeBody, type EdgeStyle } from "./common";
import type { LensEdgeProps, LensNodeProps } from "./registry";

function NodeView({ thing, isOrphan, hovered, sim, onPointerDown, onHandlePointerDown }: LensNodeProps) {
  // #100 phase 4: the decision/regulator process is the ONE sub-kind Mobus's
  // own drawings give a shape — the warm triangle of Fig 4.17. Kernel taxonomy:
  // Modulating IS that decision/regulation primitive (the regulator monitor;
  // see primitive-glyphs.tsx). Components only — a primitive on an env object
  // is dead state project() ignores, so it never earns the shape.
  const regulator = thing.role === "Component" && thing.primitive === "Modulating";
  // #306: an authored interface sits ON the membrane, so it renders compact —
  // a pass-way, not a peer of the interior processes — and drops the
  // composition halo (the C/E wash is wrong for a thing straddling the cut).
  const iface = thing.role === "Component" && thing.interface === true;
  return (
    <NodeBody
      pending={isOrphan}
      thing={thing}
      hovered={hovered}
      sim={sim}
      onPointerDown={onPointerDown}
      onHandlePointerDown={onHandlePointerDown}
      isSquare={thing.role === "Environment"}
      showHalo={thing.role === "Component" && !iface}
      bodyScale={iface ? INTERFACE_SCALE : undefined}
      envOpen={thing.role === "Environment"}
      sphere={thing.role === "Component" && !regulator}
      regulatorTriangle={regulator}
      stroke={regulator ? "var(--verdict-warning)" : "var(--lens-node-stroke)"}
      strokeOpacity={1}
      strokeWidth={STYLE.nodeStrokeWidth}
      // Glyph-first (#81 harvest): a stamped component IS its process — the
      // glyph is the face, not a corner annotation. The triangle body already
      // says Modulating, so it carries no glyph on top. Components only: a
      // primitive on an env object is dead state project() ignores (the
      // designate gesture already rejects it), so it is not drawn either.
      badge={thing.role === "Component" && !regulator ? thing.primitive : undefined}
      badgeCentered
      labelSmall={false}
      boundaryRim={false}
      envHint={thing.role === "Environment"}
    />
  );
}

function edgeStyle(relation: Relation, fact?: EdgeFact): EdgeStyle {
  // BONDHOOD (#320), stated at its strongest here. Under Mobus N IS the flow
  // set, a bond is a flow, and a flow is transport — so an arrowhead means a
  // bond with NO exception, and a `mere` relation gets none. It also loses its
  // substance colour: `mere` is Bunge's construct and never projects (spec
  // §4.4), so under this reading the relation is in neither N nor G and no
  // substance moves along it. Drawing it kind-coloured would name a substance
  // that this lens does not see. Muted ink, coupling caps, still visible: the
  // author wrote it, and the 2026-08-12 ribosome case is what happens when the
  // reader cannot tell it apart from a flow.
  if (!relation.is_bond) {
    return {
      color: "var(--text-muted)",
      width: STYLE.edge.mere,
      dash: "2 6",
      opacity: 0.5,
      marker: "coupling",
      markerStart: "coupling",
    };
  }
  // #C phase 2: a crossing gets the amplified head. `locus` is the KERNEL's
  // reading (Exo = one endpoint in the environment), not a guess from role, so
  // the heavier mark tracks the boundary the kernel drew and nothing else.
  const marker = `arrow-${relation.kind}${fact?.locus === "Exo" ? "-exo" : ""}`;
  switch (relation.kind) {
    case "Matter":
      return { color: KIND_COLOR[relation.kind], width: STYLE.edge.matter, opacity: 0.9, marker };
    case "Energy":
      return {
        color: KIND_COLOR[relation.kind],
        width: STYLE.edge.energy,
        opacity: 0.9,
        filter: STYLE.energyGlow.enabled ? "url(#energy-glow)" : undefined,
        marker,
      };
    case "Informational":
      return { color: KIND_COLOR[relation.kind], width: STYLE.edge.info, dash: "1 4", opacity: 0.95, marker };
    default:
      return { color: KIND_COLOR[relation.kind], width: STYLE.edge.energy, opacity: 0.85, marker };
  }
}

function EdgeView({ model, relation, fact, ring, selected, driven, sim, crowded, onSelect }: LensEdgeProps) {
  const geo = edgeGeometry(model, relation, true);
  if (!geo) return null;
  let { d, labelAt } = geo;
  const style = edgeStyle(relation, fact);

  // Exo flows render as TWO segments — G is bipartite (Tuple.lean): the crossing
  // happens env-object ↔ port, never straight to an interior component. The
  // interior routing stays visible but muted so which component the port serves
  // is not lost. Siblings on one coupling share the interface but must not share
  // a stroke — all five Fed Balance-Sheet↔Banking flows once drew the identical
  // segment and read as ONE bold line. They converge AT the interface (that is
  // the semantics) but spread at the env rim and nudge apart at the capsule.
  let visible: { d: string; markered: boolean }[] = [{ d, markered: true }];
  let interior: string | null = null;
  let title: string | undefined = relation.is_bond
    ? undefined
    : "mere relation — Bunge's bond/non-bond distinction. It never projects under Mobus (spec §4.4), so it is in neither N nor G and moves no substance in this reading.";
  let exoAtInterface = false;
  // `is_bond` gates the crossing routing too (#320): a mere relation crosses
  // nothing, so it never earns the port/interior two-segment treatment — that
  // machinery is the picture of a flow entering the system.
  if (ring && relation.is_bond && fact?.locus === "Exo" && relation.a !== relation.b) {
    const from = thingById(model, relation.a);
    const to = thingById(model, relation.b);
    if (from && to) {
      const [env, comp] = from.role === "Environment" ? [from, to] : [to, from];
      // #306: an authored-interface component sits ON the membrane, so the
      // ordinary rim-to-rim edge IS the crossing — no synthetic crossing
      // segment, no dashed interior, nothing to explain away. The two-segment
      // machinery below survives only for crossings WITHOUT declared boundary
      // apparatus (a non-interface component reached through a bare capsule).
      if (comp.interface) {
        exoAtInterface = true;
        title = `${relation.name ? `"${relation.name}"` : "flow"} · ${relation.kind.toLowerCase()} — ${
          from.role === "Environment" ? "enters" : "exits"
        } the system at ${comp.name} (interface)`;
        // The compact body's rim is closer in — recompute so heads touch it.
        const rr =
          relation.a === comp.id
            ? { a: NODE_R * INTERFACE_SCALE }
            : { b: NODE_R * INTERFACE_SCALE };
        const geoI = edgeGeometry(model, relation, true, rr);
        if (geoI) {
          d = geoI.d;
          labelAt = geoI.labelAt;
        }
      } else {
        // The dashed interior segment finally says what it means on hover —
        // "which component the interface serves" lived only in a code comment
        // until the 2026-08-09 field report asked what the dotted line was.
        title = `${relation.name ? `"${relation.name}"` : "flow"} · ${relation.kind.toLowerCase()} — ${
          from.role === "Environment" ? "enters" : "exits"
        } at ${comp.name}'s interface; the dashed segment shows the interface serves ${comp.name}`;
        const step = siblingStep(model, relation);
        const portPt = ringPoint(ring, env);
        // Env-side spread: rotate this flow's rim contact around the env node.
        const baseAngle = Math.atan2(portPt.y - env.y, portPt.x - env.x);
        const angle = baseAngle + step * 0.42;
        const envRim = { x: env.x + Math.cos(angle) * NODE_R, y: env.y + Math.sin(angle) * NODE_R };
        // Capsule-side nudge, perpendicular to the segment — heads stay distinct.
        const len = Math.hypot(portPt.x - envRim.x, portPt.y - envRim.y) || 1;
        const ux = (portPt.x - envRim.x) / len;
        const uy = (portPt.y - envRim.y) / len;
        const portEnd = { x: portPt.x - uy * step * 8, y: portPt.y + ux * step * 8 };
        // Inbound heads end CLEAR of the capsule (24×14, opaque) — it paints
        // after the edges, so a marker at the capsule center is never seen.
        const inboundEnd = { x: portEnd.x - ux * 14, y: portEnd.y - uy * 14 };
        const compRim = rimPoint(comp, portPt, NODE_R);
        const crossing =
          from.role === "Environment"
            ? straightPath(envRim, inboundEnd) // env → interface (flow enters)
            : straightPath(portEnd, envRim); // interface → env (flow exits)
        visible = [{ d: crossing, markered: true }];
        interior = straightPath(compRim, portPt);
      }
    }
  }

  // At Mobus an exo flow's name already labels its port (φ) — repeating it on
  // the edge doubles the text right at the membrane.
  // Pair the name with its flow-set (#80): an internal flow lives in N. Exo flows
  // (interior set) carry their name at the port φ and stay in G, so they skip this.
  // #306 exception: a crossing at an on-membrane interface has no capsule label
  // (compact notch), so the edge carries the name — tagged G, its actual set.
  const label =
    relation.name && interior === null ? (
      <text
        x={labelAt.x + (driven ? 9 : 0)}
        y={labelAt.y - 6}
        textAnchor={driven ? "start" : "middle"}
        fontSize={10}
        fill="var(--text-muted)"
        className="font-mono pointer-events-none"
      >
        {/* #335: the drawn label is the NAME, elided to a budget. The full
            text is never lost — it is on hover here and in the inspector. */}
        <title>{relation.name}</title>
        {elideEdgeLabel(relation.name)}
        {/* The set tag has to be true (#320): a mere relation is in NEITHER N
            nor G, and tagging it `· N` printed a flow-set membership the lens
            does not grant. */}
        <tspan fill="var(--text-secondary)">
          {!relation.is_bond ? " ∉ N ∪ G" : exoAtInterface ? " · G" : " · N"}
        </tspan>
      </text>
    ) : null;

  return (
    <EdgeScaffold
      labelAt={labelAt}
      style={style}
      interior={interior}
      visible={visible}
      selected={selected}
      driven={driven}
      sim={sim}
      ample={relation.ample}
      relationId={relation.id}
      onSelect={onSelect}
      label={label}
      crowded={crowded}
      title={title}
    />
  );
}

/** A Mobus interface — a round-edged capsule that PENETRATES the boundary (Fig.
 *  4.9), straddling the membrane along its outward normal so it reads as a
 *  pass-way, not a bead on the ring. The direction chevron points the way the
 *  substance crosses; ⇄ for a bidirectional message interface (Fig. 4.16).
 *  Interfaces gate, they don't transform. `angle` is the outward normal (rad). */
function PortView({
  port,
  at,
  angle = 0,
  onSelect,
  compact = false,
  scale = 1,
}: {
  port: PortFact;
  at: Pt;
  angle?: number;
  onSelect?: () => void;
  /** #306: a notch riding an on-membrane interface component's rim — smaller
   *  capsule, no protocol label (the flow names live on the edges and in the
   *  interface inspector; the title keeps φ for hover). */
  compact?: boolean;
  /** Stage scale, so the capsule can hold a screen-size floor. The direction
   *  chevron is the only mark that says which way a flow crosses, and it
   *  measured under 6 screen px at the Fed model's own fit zoom. */
  scale?: number;
}) {
  const label = port.protocol.length > 22 ? `${port.protocol.slice(0, 21)}…` : port.protocol;
  const out = { x: Math.cos(angle), y: Math.sin(angle) };
  // Capsule half-width along the normal, floored on SCREEN so the chevron stays
  // readable when the model is fitted. `compact` keeps its #306 proportion of
  // the full notch — a pass-way in the boundary, not a peer of the processes.
  const hw = portHalfWidth(scale) * (compact ? 0.66 : 1);
  const hh = hw * (compact ? 0.62 : 0.58);
  // The glyph is drawn against a 7px half-height and scaled with the capsule, so
  // enlarging the notch enlarges the one mark that carries direction.
  const k = hh / 7;
  const n = (v: number) => (v * k).toFixed(2);
  const chevron =
    port.direction === "Receives"
      ? `M ${n(2.5)} ${n(-3.4)} L ${n(-2)} 0 L ${n(2.5)} ${n(3.4)}` // inward — flow enters
      : port.direction === "Exports"
        ? `M ${n(-2.5)} ${n(-3.4)} L ${n(2)} 0 L ${n(-2.5)} ${n(3.4)}` // outward — flow leaves
        : `M ${n(1)} ${n(-3)} L ${n(4)} 0 L ${n(1)} ${n(3)} M ${n(-1)} ${n(-3)} L ${n(-4)} 0 L ${n(-1)} ${n(3)}`; // ⇄ hybrid
  return (
    <g
      transform={`translate(${at.x}, ${at.y})`}
      className={onSelect ? "cursor-pointer" : undefined}
      onClick={
        onSelect &&
        ((e) => {
          e.stopPropagation();
          onSelect();
        })
      }
    >
      <title>{`interface — ${port.direction.toLowerCase()} · φ: ${port.protocol}`}</title>
      {/* long axis along the normal → half inside, half outside the membrane */}
      <g transform={`rotate(${(angle * 180) / Math.PI})`}>
        <rect
          x={-hw}
          y={-hh}
          width={hw * 2}
          height={hh * 2}
          rx={STYLE.portRx + (compact ? 2 : 4)}
          fill="var(--bg-primary)"
          stroke="var(--lens-accent)"
          strokeWidth={STYLE.portStrokeWidth}
        />
        <path
          d={chevron}
          fill="none"
          stroke="var(--lens-accent)"
          strokeWidth={1.6 * k}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* The label sits OUTSIDE the capsule, anchored away from it — centering
          it on the outward normal put half the string back across the notch and
          the interior, which is how `T1 · no flow` printed as `no flow`. */}
      {!compact && (
        <text
          x={out.x * 16}
          y={out.y * 16}
          textAnchor={out.x > 0.25 ? "start" : out.x < -0.25 ? "end" : "middle"}
          dominantBaseline="central"
          fontSize={9}
          fill="var(--text-muted)"
          className="font-mono pointer-events-none"
        >
          {label}
        </text>
      )}
    </g>
  );
}

export const Mobus = { NodeView, EdgeView, PortView };
