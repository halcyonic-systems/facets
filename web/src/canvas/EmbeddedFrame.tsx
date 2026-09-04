// A decomposed component's interior, drawn INSIDE it (#139 M1, recursive at
// M2). Past a size threshold the component's disc stops being a filled body and
// becomes an aperture: the child model's container and its components are drawn
// in the child's own coordinates, mapped into the enclosing frame by one
// embedding and clipped to the circle. Nothing about the document changes when
// this appears — the model on the canvas, the breadcrumb and the walk stack are
// untouched until the view rebases onto the child (`frameRebase`).
//
// Read-only and pointer-transparent by construction: hit-testing stays on the
// focused frame, so what the author drags, selects and edits is exactly what it
// was before the aperture opened.
//
// Depth is the same code twice. A frame renders its own sub-frames INSIDE its
// clipped group, so nesting the clips is nesting the elements and the sub-
// frame's coordinates are already the ones its `thing` and `embed` are written
// in — no depth appears in any expression below.
//
// The child's ENVIRONMENT stand-ins are not drawn. They are the seam's other
// half — by the boundary contract each one names an interior neighbour of this
// very component (`derived_env`), so inside the parent's picture they would
// restate objects already on the stage, one aperture-width away from
// themselves. Container plus components is what the composed picture asserts.
//
// The child's own marks are NOT the lens views. Those carry per-thing element
// ids and a `data-node-label` the stage's crowding pass measures, and a child's
// thing ids collide with the parent's — so an embedded frame draws its own
// quiet marks instead, and nothing about the parent's rendering shifts.
import type { Relation, Thing } from "../kernel/types";
import { KIND_COLOR } from "./types";
import { embedTransformAttr, type ApertureRegister, type FrameNode } from "./embed";
import { bungeHull, INTERFACE_SCALE, membraneRing, NODE_R, thingById } from "./geometry";
import { STYLE, elideEdgeLabel } from "./style";

/** Screen pixels a nested caption holds, whatever the depth scales it to. */
const CAPTION_PX = 9;
/** Longest nested label drawn — an aperture is an orientation, not a reading. */
const CAPTION_CHARS = 14;

interface Props {
  node: FrameNode;
  /** On-screen scale of the ENCLOSING frame's coordinates — the space this
   *  aperture's disc and rim caption live in, so their screen-held sizes
   *  divide by it. */
  frameScale: number;
  /** Which container the child is read through (#139 rule 5). */
  register: ApertureRegister;
  /** The component's name, demoted from a label under a body to a caption on a rim. */
  caption?: string;
}

export function EmbeddedFrame({ node, frameScale, register, caption: captionText }: Props) {
  const { child, embed, thing: at, tier, screenScale } = node;
  const clipId = `aperture-${node.key}`;
  const components = child.things.filter((t) => t.role === "Component");
  if (components.length === 0) return null;
  const flows: Relation[] = drawnFlows(node, tier);
  const caption = CAPTION_PX / Math.max(screenScale, 0.0001);
  // A component that is itself an open frame carries its name on that frame's
  // rim; a second caption under it would collide with the first.
  const openBelow = new Set(node.children.map((sub) => sub.thing.id));
  const rim = CAPTION_PX / Math.max(frameScale, 0.0001);
  const bodyR = (t: Thing) => (t.interface === true ? NODE_R * INTERFACE_SCALE : NODE_R);

  return (
    <g pointerEvents="none" data-aperture={clipId}>
      {/* The component's own face is behind this; the aperture is a hole, not a
          translucent overlay, so the body it replaces must not read through. */}
      <circle cx={at.x} cy={at.y} r={NODE_R} fill="var(--bg-primary)" />
      <g clipPath={`url(#${clipId})`}>
        <g transform={embedTransformAttr(embed)}>
          {register === "Mobus" ? <Membrane components={components} /> : <Hull child={child} />}
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
            components.filter((t) => !openBelow.has(t.id)).map((t) => (
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
          {/* One level deeper, in the coordinates this group already establishes. */}
          {node.children.map((sub) => (
            <EmbeddedFrame
              key={sub.key}
              node={sub}
              frameScale={screenScale}
              register={register}
              caption={sub.thing.name}
            />
          ))}
        </g>
      </g>
      {/* The rim the child is read through. Thin and unfilled: the component's
          own outline, now standing for a way in rather than a body. */}
      <circle
        cx={at.x}
        cy={at.y}
        r={NODE_R}
        fill="none"
        stroke="var(--lens-accent)"
        strokeOpacity={0.7}
        strokeWidth={STYLE.nodeStrokeWidth}
      />
      {captionText && (
        <text
          x={at.x}
          y={at.y + NODE_R + rim * 1.6}
          textAnchor="middle"
          fontSize={rim + 1 / Math.max(frameScale, 0.0001)}
          fill="var(--text-secondary)"
          letterSpacing={0.4 / Math.max(frameScale, 0.0001)}
          className="font-mono"
        >
          {captionText.toUpperCase()}
        </text>
      )}
    </g>
  );
}

/** Mobus: B = ⟨P, I⟩ reified. The child's membrane IS the aperture's inner
 *  border — the same mark the child draws for itself one level down. */
function Membrane({ components }: { components: Thing[] }) {
  const ring = membraneRing(components);
  return (
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
  );
}

/** Bunge: the observer's cut, dashed and unfilled, in the register's own hull
 *  style. Never a membrane — the child is seen through the same distinction the
 *  parent is drawn with, which is the point of the second register. */
function Hull({ child }: { child: FrameNode["child"] }) {
  const h = bungeHull(child.things);
  return (
    <rect
      x={h.x}
      y={h.y}
      width={h.w}
      height={h.h}
      rx={8}
      fill="none"
      stroke="var(--lens-accent)"
      strokeOpacity={0.55}
      strokeWidth={1.5}
      strokeDasharray="8 6"
      vectorEffect="non-scaling-stroke"
    />
  );
}

/** Edges earn their place at the full tier only, and only between things the
 *  frame actually draws. */
function drawnFlows(node: FrameNode, tier: FrameNode["tier"]): Relation[] {
  if (tier !== "full") return [];
  const drawn = new Set(node.child.things.filter((t) => t.role === "Component").map((t) => t.id));
  return node.child.relations.filter((r) => drawn.has(r.a) && drawn.has(r.b) && r.a !== r.b);
}
