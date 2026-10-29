# Makeover audit, 2026-10-26: canvas

**Status: RESEARCH.** One of seven read-only audits behind [`../makeover-2026-10.md`](../makeover-2026-10.md), written by an agent against the dev build of `design/makeover` at aa4b3d1. Rule numbers refer to the charter. Screenshots are not in the repo.

# Canvas audit — makeover 2026-10

Surface: the diagram (shapes, glyphs, flows, membrane, interfaces), the tool rail and palette, the three popovers, selection, hover, armed and drag states, and the Sandbox door. Read-only; nothing in the repo was changed. Rules cited are from `docs/design/makeover-2026-10.md`. Paths are relative to `web/src/` unless given in full. Measurements were taken in Chrome from the rendered SVG (`getBoundingClientRect`, attribute reads), not estimated from screenshots.

## 1. Verdict

The shape vocabulary is right (circle, open square, membrane ring, notch on the ring, warm triangle) and the ten glyphs already exist as drawings, but at the register the app ships in (`style.ts` S1) everything is drawn at 1px and 9 to 10px mono uppercase, which at the fit-to-view scale the three library models actually open at (0.53 to 0.76) puts names at 5.3 to 7.6 screen px, node bodies at 17 to 37 px, connect handles at 5 px and interface chevrons at 3 to 7 px: unreadable and untouchable.
Selection has no ring on nodes at all, the membrane's hit target is its own 1px stroke, three unrelated icon grammars share one rail, and the Sandbox is a fourth drawing language that ignores the theme; those four, plus the stroke and type scale, are the work.

## 2. Findings

Fix size: token (a value in `style.ts` or `index.css`), glyph (a drawn SVG), state (a render branch), surface (layout or component). Severity: blocks (breaks a charter rule a reader hits on first use), hurts (visible every session), polish.

| # | Finding | Rule | Where (file:line) | Fix size | Severity |
|---|---|---|---|---|---|
| 1 | Node names are forced uppercase and set in JetBrains Mono at 10px world (`label.uppercase: true`, `mono: true`, `size: 10`). Measured 5.3 px on LLM at fit (scale 0.533), 7.6 px on Fed (0.761), 7.4 px on Bitcoin (0.744). `visual-language.md` rule 7 forbids `uppercase` on any name; rule 5 reserves Mono for the kernel's numbers. | 5, 17 | `canvas/style.ts:92`; `canvas/lenses/common.tsx:421-426` | token | blocks |
| 2 | Node body stroke is 1 world px (`nodeStrokeWidth: 1`), env square stroke 1, membrane ring 1 (`ring.strokeWidth: 1`), port capsule 1 (`portStrokeWidth: 1`). At fit these render 0.53 to 0.76 screen px; the charter asks for 2px strokes. Node body diameter at fit: 16.6 px (LLM), 36.5 (Fed), 35.7 (Bitcoin) for a `nodeR` of 24. | 17 | `canvas/style.ts:83,87,102,91`; `common.tsx:333-341`; `canvas/Canvas.tsx:1249-1257` | token | blocks |
| 3 | No selection ring on a selected node. `NodeBody` has no `selected` prop (props at `common.tsx:34-98`); `selectedThingId` only lights the rim door (`Canvas.tsx:1440`). Selecting Frontier Serving changed nothing on the canvas except the inspector. | 20 | `canvas/lenses/common.tsx:34-98`; `canvas/Canvas.tsx:1440` | state | blocks |
| 4 | Membrane hit target is the 1px stroke (`pointerEvents="stroke"`, `strokeWidth 1`). A click 1 px off the ring (tried at the 60 degree point) missed and nothing opened. Rule 11 asks for 24 px; tldraw uses `hitTestMargin` 4.5 world px plus a 1.5px indicator, Excalidraw a 8px dashed border with a 10px drag threshold. | 11, 20 | `canvas/Canvas.tsx:1249-1268` | state | blocks |
| 5 | Connect handle is `r: 5` world, 1px stroke, scaled with the stage: 5.3 px across at LLM fit, 7.6 at Fed, 12.3 at 1.23x. tldraw's handle is 8/zoom visual with a 6/zoom half-extent hit (so 12 px screen minimum, 21 px coarse); Excalidraw's is 8 px mouse, 16 pen, 28 touch, held constant on screen. | 11, 20 | `canvas/style.ts:101`; `common.tsx:429-438` | token | blocks |
| 6 | Interface direction chevron measured 2.8 to 4.6 px wide at LLM fit and 4.9 to 7.5 on Fed; capsules 13 x 9 to 20 x 20 px. The one mark that carries direction is below the 16px glyph floor the charter sets, and the `screenHw` floor (`PORT_MIN_SCREEN_HW 13`) only lifts the capsule, not the stroke. | 17, 18 | `canvas/lenses/mobus.tsx:325-371`; `canvas/geometry.ts:40-52` | glyph | blocks |
| 7 | Flow strokes: matter 1.5, energy 1.25, informational 1 (dotted `1 4`), mere 1, bond 1.25, exo 1. Rule 19 asks for 2px by substance, one arrowhead size. Energy additionally carries a `feDropShadow` glow filter (a shadow, rule 2), and crossing heads are drawn at 2x (`EXO_ARROW_GAIN = 2`), so heads come in three sizes (4, 5, 10 marker units). | 19, 2 | `canvas/style.ts:94-95`; `mobus.tsx:97-112`; `Canvas.tsx:69,988-996,1098-1104` | token | hurts |
| 8 | Flow labels are 10px Mono in `--text-muted`, drawn straight on the stroke with no paper tab (`paintOrder` is used only for the membrane name at `Canvas.tsx:1282-1285`). On Fed 17 of 25 labels are quieted by the crowding pass at fit; the ones that stay cross green strokes with no backing. | 19 | `canvas/lenses/mobus.tsx:210-240`; `bunge.tsx:120-132`; `klir.tsx:54-75` | state | hurts |
| 9 | Hover halo and selection halo are the same mark at two opacities: edge hover = `selection.width` x `selection.opacity * 0.45` (2.5px at 0.16), selection = 2.5px at 0.35; node hover = 1px accent ring at 0.35. Rule 20 wants hover as a surface step and selection as a ring, distinct in kind not in alpha. | 20 | `common.tsx:190-211, 538-563`; `style.ts:97,100` | state | hurts |
| 10 | Drag state is cursor only (`cursor-grab`, no `grabbing`, no lift, no ghost or snap guide); armed tool is a crosshair cursor on the stage plus the rail fill. Nothing on the canvas says a stamp will land here. | 20 | `common.tsx:173`; `Canvas.tsx:959` | state | hurts |
| 11 | Three icon grammars on one rail: `SelectGlyph` 16px at stroke 1.3; `RoleChip`, `GlyphChip` 14px at 1.4; `PasswayChip` 16 x 14 at 1.3; `GestureGlyph` 26 x 14 at 1.2; the SL button is the text `{ }`. Rule 21 is 20px icons in 32px squares; rule 14 one grammar, drawn. Measured buttons: 48 x 39 (select), 48 x 47 (place), 48 x 27 (primitives), 48 x 36 (agent). | 21, 14 | `canvas/ToolRail.tsx:14-19, 48, 87-183`; `canvas/PaletteRail.tsx:16-70` | glyph, surface | blocks |
| 12 | Primitive rows show the two-letter badge code (`Bu`, `Mo`, `Sp`...) as the visible label at 10px beside a 14px chip. Rule 18 retires the two-letter badges; the codes still name the tools. Hovering shows a gloss card with `boxShadow: var(--shadow-card)` (rule 2). | 18, 21, 2 | `canvas/types.ts:43-54`; `ToolRail.tsx:132-136, 146-169`; `registry.ts:272` | surface | hurts |
| 13 | Rail labels are 9px (`text-[9px]`), below the 11/600 uppercase label style, and the rail has no `focus-visible` style (measured `outlineStyle: none` on every rail button; the one `auto` was the browser default on the just-clicked button). The `PaletteRail` variant uses `ToolButton`, a `rounded-full` pill. | 21, 10, 3 | `ToolRail.tsx:56`; `ui.tsx:112-142` | token | hurts |
| 14 | The rail clips. At 1137 x 663 CSS px the rail's scroll height is 667 against a 486 px box with no `overflow: auto`: `In`, `agent` and `SL` are cut off. At a 390px body the stage collapses to 0 width (measured `stage: [0, 418]`); the rail keeps its 56px. | 16, 21 | `ToolRail.tsx:83`; `Canvas.tsx` stage container | surface | blocks |
| 15 | Popover: `boxShadow: var(--shadow-card-hover)` (measured `0 2px 8px rgba(22,35,43,.09)`), no `role="dialog"`, no focus move in or return, Escape handled by the caller not the popover. `delete flow`, `close` buttons are `rounded-full`. | 2, 15, 3 | `ui.tsx:352-366`; `EdgePopover.tsx:107`; `BoundaryPopover.tsx:68`; `InterfacePopover.tsx:81` | surface | hurts |
| 16 | Interface popover uses typographic arrows as icons: `↔ {env.name}`, `→ in`, `out →`; Bunge edge labels append `▷` and `∼`; the self-loop overlay prints `⊘M`. Rule 14: no unicode doing an icon's job; rule 12: the `▷` is the only cue beyond colour that a relation bonds in the label itself. | 14, 12 | `InterfacePopover.tsx:47,75`; `bunge.tsx:113,131` | glyph | hurts |
| 17 | Mobus components carry a radial "sphere" sheen (`url(#mobus-sphere)`), a three-stop gradient. Visual-language rule 4 and the token gate forbid gradients in `web/src`; the SVG `<radialGradient>` escapes the grep. Rule 17 asks for clear fills. | 17, 1 | `Canvas.tsx:1075-1079`; `common.tsx:335`; `mobus.tsx:53` | token | hurts |
| 18 | Mobus membrane fill is `--accent-soft` at 0.06 and the Bunge/Mobus composition halo is `--lens-accent-soft` at 0.12 per node: two tints that name nothing, residue of the withdrawn world tint. | 7, 8 | `style.ts:98,102`; `common.tsx:200-202`; `Canvas.tsx:1254-1255` | token | polish |
| 19 | Centered process glyph: 0.94 world px stroke (2.1 / (24 x 0.56 / 6)), 9.3 to 9.6 px wide at LLM fit, 21 x 12 px at 1.23x; round caps and joins (`strokeLinecap="round"`) against the charter's square caps and mitre joins. The corner badge path (`r 9`, `strokeWidth 1.5`) is still compiled in. | 18 | `common.tsx:359-398`; `primitive-glyphs.tsx:1-84` | glyph | hurts |
| 20 | Regulator triangle fill is `color-mix(var(--verdict-warning) 16%, var(--bg-secondary))` with a `--verdict-warning` stroke: a verdict token spent on a shape. The Modulating glyph in the rail is a filled warm triangle while its nine siblings are 1.4px outlines. | 9, 8 | `common.tsx:305-317`; `primitive-glyphs.tsx:14-15,58`; `mobus.tsx:55` | token | polish |
| 21 | Open env square has `rx 2` (S1) and the legacy registers use 6, 3, 1: four corner values on one shape; `--radius-lg 12` and `--radius-card 10` remain defined, `dockRadius` 8/12/10/6 and `chipRx` 3/9999/4/2 per register. | 3 | `style.ts:85,106-107,58,79`; `index.css:128-129` | token | polish |
| 22 | Three dead registers (`CURRENT`, `S2`, `S3`) remain reachable by `?s=`, each a different stroke, type and radius system; the pick landed on 2026-07-15. | 17 | `canvas/style.ts:55-172` | token | polish |
| 23 | The canvas hint line ("hover a rail chip for what it is...") sits inside the stage and overprints the bottom row of the diagram: on Fed it runs through the `FINANCIAL MARKETS` label at fit; on Bitcoin at 1137px it wraps to three lines over the membrane. Fit-to-view does not reserve its height. | 6, 16 | `Canvas.tsx` hint overlay (bottom of the stage); `geometry.ts:502` `fitToBox` | surface | hurts |
| 24 | Sandbox draws its own grammar: 92 x 40 rounded rects (`rx 3`), a 3px `--kind-matter` bar on top, unicode `▶`/`◀` for source and sink, `r 5` handles, 1.25px wires, and `var(--surface, #fff)` fills. `--surface` is not a token in `index.css`, so the `#fff` fallback always wins: in dark mode the page stays white while the selected card alone goes dark (screenshot). Text selection fires on drag (`user-select: auto`). | 17, 7, 8, 21 | `sandbox/SandboxCanvas.tsx:57-58,129,154-173,228-269`; `sandbox/SandboxSurface.tsx:85` | surface | blocks |
| 25 | Dark: `--kind-informational` dotted 1px at `#9e79b8` on `#16181a` reads as noise at fit; the sphere gradient flips to a dark bubble; `--accent-slate` ring at 1px on `#1d2022` is near invisible (Bitcoin dark shot). Contrast of 1px dotted strokes is a stroke problem first, a colour problem second. | 7, 19 | `index.css:105-108`; `mobus.tsx:109` | token | hurts |
| 26 | Klir recesses node strokes to opacity 0.35 at 1px and labels to 9px muted (`labelSmall`); the deliberate recession plus the 1px stroke leaves a Klir node at fit as a 17px grey smudge. | 17 | `style.ts:86`; `klir.tsx:24-26`; `common.tsx:421-422` | token | hurts |
| 27 | Flowless (authored) ports render at opacity 0.6 with a 1.25px dashed tether; the mere relation at opacity 0.5 dashed `2 6`; the exo interior segment at opacity 0.3 dashed `4 4`: three dashed greys with three meanings and no legend beyond `<title>`. | 12 | `Canvas.tsx:1508-1520`; `mobus.tsx:84-91`; `common.tsx:564-575` | state | polish |

Not a finding, recorded so it is not re-derived: the 18 screen px `non-scaling-stroke` hit path on flows (`common.tsx:515-523`) is right and matches tldraw's and Excalidraw's thresholds; keep it. The `screenHold` cap at 1.5x for labels, heads and handles (`stageScale.ts`) is the right mechanism; it only needs a floor as well as a ceiling. Escape closed the edge popover and disarmed a tool in testing.

## 3. Proposal

### 3.1 The ten primitives at 16px on the 24px grid

Grid: 24 x 24 viewBox, 2px stroke, square caps, mitre joins, live area 16 x 16 (4px margin), fills only where stated. The flow line, where a glyph has one, is a horizontal at y = 12 from x = 4 to x = 20 and is part of the silhouette: every substance primitive reads as "something done to a line". Signal primitives have no through line. Stroke colour is `currentColor`; no glyph carries a substance or verdict colour (the Modulating triangle included: the warm fill moves to the node body only, and even there is a question for the colour sweep).

| Primitive | Silhouette at 16px |
|---|---|
| Combining | Two lines enter from the left at y = 7 and y = 17, meet at a mitre at (11, 12), one line leaves to x = 20. A Y lying on its side, point right. |
| Splitting | Mirror of Combining: one line enters from x = 4 to (13, 12), two leave to (20, 7) and (20, 17). Point left. |
| Impeding | Through line interrupted by a bowtie: two triangles, apexes touching at (12, 12), bases vertical at x = 8 and x = 16, 8px tall. The Stella valve, unfilled. |
| Propelling | Through line from x = 4 to x = 9; two chevrons `>` at x = 9 to 14 and 14 to 19, each 8px tall. Reads as push. |
| Buffering | Through line stubs at x = 4 to 7 and 17 to 20; between them a drum: a rectangle 10 x 10 (x 7 to 17, y 7 to 17) with a horizontal fill line at y = 13 (the level). Stella's stock, with a level so it is a drum and not a box. |
| Modulating | Equilateral triangle, apex up at (12, 5), base y = 18 from x = 5 to 19, unfilled, 2px. A short through line enters at left to x = 5. Mobus Fig. 4.17 by silhouette, not by colour. |
| Sensing | A 2px dot (filled circle r = 2) at (7, 12) and two arcs to its right, radii 4 and 8, from 60 degrees above to 60 degrees below. Probe and field. |
| Amplifying | Three vertical bars from the baseline y = 19 at x = 7, 12, 17, heights 4, 8, 12. Gain as a staircase. |
| Inverting | Two vertical arrows side by side: one from (9, 19) up to (9, 5) with a head, one from (15, 5) down to (15, 19) with a head; heads 4px wide, open (two strokes, no fill). |
| Copying | Two 9 x 9 squares offset by 4: back one at (5, 10), front one at (10, 5); the front square's fill is the node fill so it occludes the back one. The one glyph that needs a fill, and it is paper. |

Agent (not a primitive, but it shares the rail): the management oval, an ellipse rx 8 ry 5 at centre, unfilled, with a 2px dot at centre. Source and sink in the Sandbox: use the open square from 3.2, with the flow stub entering or leaving; no `▶`/`◀`.

### 3.2 Shapes and strokes

All values are world px at `nodeR` 24 unless marked screen. The rule for every stroke below: it holds at 2 screen px from the fit scale upward (`vectorEffect="non-scaling-stroke"` or a `max(2, 2 x scale)` floor), and labels, heads and handles keep the existing 1.5x ceiling.

| Element | Shape | Stroke | Fill | Notes |
|---|---|---|---|---|
| Component | circle r 24 | 2, `--text-primary` (ink) | `--bg-secondary` flat, no gradient | Centered glyph at 0.56 r, 2px screen, square caps. The sphere gradient goes. |
| On-membrane interface component | circle r 24 x 0.65 (keep `INTERFACE_SCALE`) | 2 ink | paper | Its notch (below) sits on its rim at the outward normal. |
| Regulator (Modulating) | triangle, circumradius 24 x 1.15, apex up | 2 ink | paper | Warm tint only if the colour sweep keeps `--verdict-warning` for it; default paper. The shape is the signal. |
| Environment object (Bunge, filled) | circle r 24 (Bunge keeps circles by its own commitment) | 2 ink | paper | No change in kind; the Bunge rim ring for boundary components becomes a second ring at r + 4, 2px, `--lens-accent`. |
| Open environment object (Mobus) | square 48 x 48, rx 0 (grid cell, R8 says 0 for cells) or at most 4 | 2 ink | none | Open means open: no fill at all, no tint; the one shape on the canvas with no interior. Source and sink identity stays in the arrowhead direction and the inspector, never in a fill. |
| Interface notch | capsule straddling the ring: 28 long along the normal, 16 across, rx 4 (R8 nested box) | 2 `--lens-accent` | paper | Chevron inside at 2px screen, 8px tall minimum (floor the chevron, not only the capsule). Hybrid is two chevrons back to back. Hit target: the capsule plus 8 on every side (minimum 32 x 44 world at fit). |
| Membrane | the one ellipse | 2, `--text-secondary`, dash by porosity as now | none (drop the 0.06 tint) | Hit: an invisible second ellipse stroke of 24 world px over the ring (`pointerEvents: stroke`), so a click within 12 px either side opens the boundary editor. The system name on the ring keeps its paper `paintOrder` stroke, 4px. |
| Selection ring | the element's outline offset 4, 2px screen, `--lens-accent`, opacity 1 | | | Same geometry for circle, square, triangle, capsule and ring; flows get a 6px screen halo at 0.35 behind the stroke (keep) and the stroke itself goes to 3px. |
| Hover | a surface step: fill `--bg-surface` on the body (paper to paper-3), no ring | | | Flows: stroke 3px, no hue change. Rail: `--bg-surface` square. |
| Armed | rail square filled `--lens-accent`, `--text-on-accent` glyph; on the stage a 24 x 24 crosshair cursor and a ghost of the shape (open circle or square, 1px dashed accent) following the pointer | | | The ghost is the one addition; it is what tells a reader where the stamp lands. |
| Drag | `cursor: grabbing`, body fill steps to `--bg-surface`, handles hidden | | | No shadow lift. |
| Connect handle | circle r 6 screen, 2px `--lens-accent`, paper fill, hit disc r 12 screen (r 22 coarse) | | | Held on screen below and above the 1.5x cap: it is a reading, not a world object. |
| Flow, Matter | 2 (2.5 selected) `--kind-matter`, solid | | | |
| Flow, Energy | 2 `--kind-energy`, solid, no glow filter | | | |
| Flow, Informational | 2 `--kind-informational`, dashed `6 4` (not dotted `1 4`; dots vanish at 2px when scaled) | | | Command from an agent: same dash, 2.5px, `--lens-accent` (keep the distinction, drop the extra weight step). |
| Flow, Field | 2 `--kind-field`, dash `2 4` | | | Distinct from Informational by dash period, not by weight. |
| Mere relation | 2 `--text-muted` at 0.6, dash `2 6`, open `coupling` caps both ends | | | Unchanged in meaning. |
| Arrowhead | one marker, 8 x 8 world at scale 1 with `markerUnits="userSpaceOnUse"` so stroke width no longer sizes it, floored to 8 screen px; filled with the stroke colour; exo heads the same size, the crossing is already shown by the notch | | | Removes the 2x exo gain and the 0.8 crossing head. |
| Flow label | 12px Inter (`label.size`), `--text-secondary`, on a paper tab: `paintOrder="stroke"` with a 4px `--bg-primary` stroke, or a `rect` at 2px padding, rx 2 | | | Elision budget (28) stays; the crowding pass stays. |
| Node label | 12px Inter 500, `--text-primary`, authored case, 16 below the rim; Klir 11px `--text-secondary` (recession by weight, not by size and opacity) | | | `uppercase: false`, `mono: false`, `tracking: 0`. |
| Zoom rules | labels, heads, handles, notch chevrons: screen size = world size x min(scale, 1.5) with a floor of 10px for text and 8px for heads and chevrons; strokes: 2 screen px below scale 1, 2 x scale above | | | tldraw: `textShadowLod 0.35` hides text outlines below 35 percent zoom; Facets should hide flow labels (not node names) below 0.45 and show them on hover, which is what the crowding pass already does by another route. |

Rail and palette (rule 21): 56px rail keeps its width; buttons 32 x 32 at 4px radius centred in a 40px row with the 11/600 uppercase label beneath (so a row is 32 + 4 + 13 = 49, close to today's 47); 20px icons at 2px stroke from one file (`canvas/icons.tsx`), the ten primitives from 3.1 at 20px, `{ }` replaced by a drawn braces glyph; one hairline between place, designate and the SL drawer; `overflow-y: auto` on the rail with the SL button pinned; focus ring 2px accent offset 2. The primitive rows drop the two-letter code and take the full word as the label under the glyph; the word fits at 11px in 56px for all ten.

Popovers: shadow to none and a `--border` hairline plus a 2px `--lens-accent` top rule for the accented ones (the accent still names the lens); `role="dialog"`, `aria-labelledby` the title, focus moved to the first field on open and returned to the canvas on close, Escape handled inside `Popover`; buttons to 4px radius.

Sandbox: either the Sandbox renders through `NodeBody` and `EdgeScaffold` with the shapes above (preferred; the research doc's note that source and sink are open squares applies here too), or at minimum it reads `--bg-secondary`, `--bg-primary` and the kind tokens with no raw hex fallbacks, sets `user-select: none` on the stage, and takes its source and sink glyphs from `canvas/icons.tsx`. The green 3px bar across each card is a second substance channel and should go: the wire already carries `--kind-matter`.

## 4. Exemplar numbers

Measured from source on 2026-10-26 (tldraw `main`, Excalidraw `master`). Taken for the state model and sizes only.

| Measure | tldraw | Excalidraw | Facets today (S1) |
|---|---|---|---|
| Resize or transform handle, visual | 8 / zoom (constant 8 screen px) | 8 mouse, 16 pen, 28 touch, / zoom (`transformHandleSizes`) | connect handle r 5 world, scales with stage (5.3 px at LLM fit) |
| Handle hit target | half-extent 6 / zoom, x 1.75 coarse; corner hit x 1.5; mobile rotate bg max(14/zoom, 20/max(1, zoom)) | handle margin = size / zoom around each handle; `DRAGGING_THRESHOLD 10` | none beyond the drawn circle |
| Shape hit margin | `hitTestMargin` 4.5, `coarseHitTestMargin` 4 (world px, in addition to geometry) | selection padding `DEFAULT_TRANSFORM_HANDLE_SPACING * 2` = 4 / zoom; `SIDE_RESIZING_THRESHOLD` 4; collision 8 | node hit disc r + 10 world; flow 18 screen px; membrane 1 px; port r = capsule + 4 world |
| Selection outline | `lineWidth 1.5 / zoom` (`SelectionForegroundOverlayUtil.options`), shape indicator `1.5px * --tl-scale`, drawn on expanded bounds | 1 / zoom solid (4 / zoom for active embeddable); multi-select dash `[8/zoom, 4/zoom]`; offset 4 / zoom from the element | flows: 2.5 px at 0.35 over the stroke; nodes: none |
| Hover | shape indicator 1.5px stroke, accent | text hover box 1 / zoom at alpha 0.5, dash `[6, 4]` / zoom | 1px ring at 0.35 (node), 2.5px at 0.16 (flow) |
| Binding highlight (drop target) | handle bg fills `--tl-color-selection-fill` on hover | stroke `clamp(1.75, element.strokeWidth, 4) / max(0.25, zoom)`, midpoint dot r 4 / zoom | 1px accent ring (`hovered`) |
| Default stroke | 2 (`sm`) in draw shapes | `strokeWidth` medium = 2 | 1 (node), 1 to 1.5 (flows) |
| Drag threshold | 4 px (16 squared), 6 coarse; toolbar 25 coarse | 10 px | none measured |
| Snap distance | 8 screen px | `TEXT_TO_CENTER_SNAP_THRESHOLD 30` | n/a |
| Zoom steps | 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8 | 0.1 to 30 in steps of 0.1 | continuous; `ZOOM_MIN` 0.15 |
| Zoom to fit padding | 128 px, capped at 28 percent of the viewport | n/a | not reserving the hint line |
| Label LOD | text outline fades at `textShadowLod` 0.35; outline width `min(0.5, 1/zoom) * 2px` | font 20 default, bound text padding 5 | 10px world, scales with stage; crowding pass hides overlaps |
| Toolbar | 40 x 40 buttons, 18px icons (16 on mobile), `::after` inset 4 active fill, focus `2px solid --tl-color-focus` offset -5, radius 10 | n/a (own toolbar, 36px buttons) | 48 x 27 to 48 x 47, 14 to 16 px icons, no focus ring |
| Grid | steps 64 / 16 / 4 / 1 by zoom band (`gridSteps`) | 20 | 20 dots |

Stella and Loopy (from the shape research and public docs, not measured): Stella stock = rectangle, flow = double-line pipe with a bowtie valve, converter = circle, cloud = unbounded source or sink, connector = thin arrow; Loopy = filled circles with a signed arrow and a level fill animation. The bowtie valve and the drum with a level line in 3.1 come from Stella; the level fill Facets already animates in `NodeBody` matches Loopy's reading.

## 5. Screenshots

All under `/private/tmp/claude-501/-Users-home-vault/c399e3e2-1755-476f-baa0-965c9b5ae3fd/scratchpad/makeover/shots/`. The widths in the names are the CSS viewport actually rendered: Chrome on this machine would not resize the window below 1600 x 810 in the first window or 1137 x 663 in the second, so the 1440 and 1024 passes ran at 1600 and 1137, and the 390 pass is a `body { width: 390px }` approximation, noted as such. The `-1440-` names are the 1600 viewport captured at 0.9.

| File | What |
|---|---|
| `canvas-llm-fit-1600-light.png` | LLM Serving Market, Build, fit-to-view, scale 0.533 |
| `canvas-llm-node-selected-1440-light.png` | Frontier Serving selected: inspector changes, canvas does not |
| `canvas-llm-edge-popover-1440-light.png` | self-hosted workload selected, edge popover open |
| `canvas-llm-membrane-click-miss-1600-light.png` | after a click 1px off the ring: nothing opened |
| `canvas-llm-interface-popover-1600-light.png` | Serving endpoint notch, interface popover |
| `canvas-rail-armed-1600-light.png` | rail with the component tool armed (zoomed crop) |
| `canvas-llm-zoom-1600-light.png` | LLM at 1.23x: uppercase mono names, glyphs, doors |
| `canvas-llm-zoom-1600-dark.png` | same view, dark |
| `canvas-llm-bunge-zoom-1600-light.png` | Bunge lens: hull, rim rings, `▷` labels |
| `canvas-fed-read-fit-1600-light.png` | Federal Reserve, Read mode, fit 0.761 |
| `canvas-fed-read-fit-1600-dark.png` | same, dark |
| `canvas-fed-build-fit-1600-light.png` | Federal Reserve, Build: on-membrane interfaces, hint line over the bottom label |
| `canvas-bitcoin-fit-1600-light.png` | Bitcoin, Build, fit 0.744 |
| `canvas-bitcoin-fit-1600-dark.png` | same, dark |
| `canvas-bitcoin-fit-1137-light.png` | Bitcoin at 1137 x 663: rail clipped, RUN card over the diagram |
| `canvas-bitcoin-fit-1137-dark.png` | same, dark |
| `canvas-bitcoin-390-approx-light.png` | 390px body: stage collapses to 0 width |
| `canvas-sandbox-empty-819-light.png` | Sandbox door, empty |
| `canvas-sandbox-wired-819-light.png` | Source, Buffering, Sink wired |
| `canvas-sandbox-running-819-dark.png` | running, `data-theme=dark`: page stays white, selected card alone goes dark |
