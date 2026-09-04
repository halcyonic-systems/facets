// A decomposed component's interior, drawn INSIDE it (#139 M1). Past a size
// threshold the component's disc stops being a filled body and becomes an
// aperture: the child model's membrane and its components are drawn in the
// child's own coordinates, mapped into the parent's frame by one embedding and
// clipped to the circle. No state changes when this appears — the model on the
// canvas, the breadcrumb and the walk stack are all untouched. It is a picture
// of the hierarchy the language already asserts.
//
// Read-only and pointer-transparent by construction: hit-testing stays on the
// parent model, so what the author drags, selects and edits is exactly what it
// was before the aperture opened.
//
// The child's ENVIRONMENT stand-ins are not drawn. They are the seam's other
// half — by the boundary contract each one names an interior neighbour of this
// very component (`derived_env`), so inside the parent's picture they would
// restate objects already on the stage, one aperture-width away from
// themselves. Membrane plus components is what the composed picture asserts.
//
// The child's own marks are NOT the lens views. Those carry per-thing element
// ids and a `data-node-label` the stage's crowding pass measures, and a child's
// thing ids collide with the parent's — so an embedded frame draws its own
// quiet marks instead, and nothing about the parent's rendering shifts.
import type { CanvasModel, Relation, Thing } from "../kernel/types";
import { KIND_COLOR } from "./types";
import { embedTransformAttr, type ApertureTier, type Embed } from "./embed";
import { INTERFACE_SCALE, membraneRing, NODE_R, thingById } from "./geometry";
import { STYLE, elideEdgeLabel } from "./style";

/** Screen pixels a nested caption holds, whatever the depth scales it to. */
const CAPTION_PX = 9;
/** Longest nested label drawn — an aperture is an orientation, not a reading. */
const CAPTION_CHARS = 14;

interface Props {
  child: CanvasModel;
  /** The child frame's placement in the PARENT's world coordinates. */
  embed: Embed;
  /** Where the aperture sits and how wide, in parent world coordinates. */
  at: { x: number; y: number };
  apertureR: number;
  /** Skeleton draws the membrane and the components; full adds the flows
   *  between them and short labels. Sealed never reaches here. */
  tier: ApertureTier;
  /** Total on-screen scale of the child's own coordinates — the view scale
   *  times the embedding. Captions and hairlines are divided by it so they
   *  hold a screen size instead of shrinking into the seam. */
  screenScale: number;
  clipId: string;
}

export function EmbeddedFrame({ child, embed, at, apertureR, tier, screenScale, clipId }: Props) {
  const components = child.things.filter((t) => t.role === "Component");
  if (components.length === 0) return null;
  const ring = membraneRing(components);
  const drawn = new Set(components.map((t) => t.id));
  const flows: Relation[] =
    tier === "full" ? child.relations.filter((r) => drawn.has(r.a) && drawn.has(r.b) && r.a !== r.b) : [];
  const caption = CAPTION_PX / Math.max(screenScale, 0.0001);
  const bodyR = (t: Thing) => (t.interface === true ? NODE_R * INTERFACE_SCALE : NODE_R);

  return (
    <g pointerEvents="none" data-aperture={clipId}>
      {/* The parent's own face is behind this; the aperture is a hole, not a
          translucent overlay, so the body it replaces must not read through. */}
      <circle cx={at.x} cy={at.y} r={apertureR} fill="var(--bg-primary)" />
      <g clipPath={`url(#${clipId})`}>
        <g transform={embedTransformAttr(embed)}>
          {/* The child's membrane IS the aperture's inner border — the same
              mark the child draws for itself one level down. */}
          <ellipse
            cx={ring.cx}
            cy={ring.cy}
            rx={ring.rx}
            ry={ring.ry}
            fill="var(--accent-soft)"
            fillOpacity={STYLE.ring.fillOpacity}
            stroke="var(--accent-slate)"
            strokeWidth={STYLE.ring.strokeWidth}
            vectorEffect="non-scaling-stroke"
          />
          {flows.map((r) => {
            const a = thingById(child, r.a);
            const b = thingById(child, r.b);
            if (!a || !b) return null;
            return (
              <line
                key={r.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={r.is_bond ? KIND_COLOR[r.kind] : "var(--text-muted)"}
                strokeOpacity={r.is_bond ? 0.85 : 0.45}
                strokeWidth={STYLE.edge.exo}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {components.map((t) => (
            <circle
              key={t.id}
              cx={t.x}
              cy={t.y}
              r={bodyR(t)}
              fill={STYLE.nodeFill}
              stroke="var(--lens-node-stroke)"
              strokeWidth={STYLE.nodeStrokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {tier === "full" &&
            components.map((t) => (
              <text
                key={t.id}
                x={t.x}
                y={t.y + bodyR(t) + caption * 1.2}
                textAnchor="middle"
                fontSize={caption}
                fill="var(--text-secondary)"
                className="font-body"
              >
                {elideEdgeLabel(t.name, CAPTION_CHARS)}
              </text>
            ))}
        </g>
      </g>
      {/* The rim the child is read through. Thin and unfilled: the component's
          own outline, now standing for a way in rather than a body. */}
      <circle
        cx={at.x}
        cy={at.y}
        r={apertureR}
        fill="none"
        stroke="var(--lens-accent)"
        strokeOpacity={0.7}
        strokeWidth={STYLE.nodeStrokeWidth}
      />
    </g>
  );
}
