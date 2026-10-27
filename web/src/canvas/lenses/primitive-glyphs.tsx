// The process-primitive glyph family, in the ±6 box the lenses scale. The
// drawings themselves live in src/icons.tsx (the CANVAS set, canvas audit
// § 3.1): one drawing per primitive, shared by the canvas badge, the palette
// rail, the inspector and every <Icon name="combining" /> in the chrome. This
// file only maps them from the 24 grid into the ±6 box so existing callers
// (common.tsx, PaletteRail.tsx, ProcessReference.tsx) keep wrapping the body
// in their own <g> with their own stroke.
//
// They are a facets stroke vocabulary IN THE SPIRIT of Mobus's atomic
// processes (Fig. 4.5) and derived work processes (Fig. 4.12/4.13), NOT his
// printed iconography (the #100 honesty note). Substance topology only (merge /
// fork / gate / push / drum); the substance TYPE stays on the flow
// (KIND_COLOR), never in the glyph. The regulator triangle is a silhouette
// here; its warm fill (Fig. 4.17) is the node body's to carry.
import type { ProcessPrimitive } from "../../kernel/types";
import type { ReactNode } from "react";
import { ICONS, PRIMITIVE_ICON, renderShapes, type Box } from "../../icons";

/** The lenses' box: origin at the centre, 12 grid units across, paper the
 *  node fill so Copying's front card occludes the back one on the body. */
const BOX: Box = { origin: 0, scale: 0.5, paper: "var(--bg-secondary)" };

/** The glyph body for a primitive, in a ±6 box. Filled marks set their own fill
 *  and stroke="none"; everything else inherits the wrapper's stroke. */
export function primitiveGlyph(primitive: ProcessPrimitive): ReactNode {
  return <>{renderShapes(ICONS[PRIMITIVE_ICON[primitive]], BOX)}</>;
}
