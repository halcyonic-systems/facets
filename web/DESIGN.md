# facets — design

**The invariant is a design principle too:** the page's job is to make the
kernel's verdicts legible, not to compute or embellish them. Every number shown
is the kernel's. Labels name the source (`facets-core · wasm`, `facets-compose · wasm`)
so the brain/face split is visible in the UI itself.

## Halcyonic Frost

Nord paper and ink, one restrained accent, colour on marks and never on
surfaces. facets takes **teal** as its accent to distinguish the instrument
within the Frost family (slate / teal / indigo). The register is the makeover
charter's (`docs/design/makeover-2026-10.md`, 2026-10-26): a considered
scientific instrument that is also fun to use. The token slice of that
charter (rules 1 to 9e, 10, 13) is what this file describes first; the
primitives that consume it are under "Primitives" below (slice B2), and the
surfaces follow in later slices.

- **Tokens** live in `src/index.css` as CSS custom properties on `:root`, each
  themed one written **once** as `light-dark(<light>, <dark>)`. Components consume
  them via `var(--x)` in inline styles; `src/tokens.ts` mirrors the few needed as
  JS strings for SVG / numeric props. Change tokens in one place; keep this file
  in sync.
- **The tokens' reach is repo-wide (2026-08-31):** `scripts/gen-frost-shared.mjs`
  extracts the cross-app subset into the generated `shared/frost.css`, which
  portal and chat link — so an edit here restyles all three surfaces. Re-run the
  generator after changing a shared token; `publish-site.sh` gates on `--check`.
  Mechanism and shared/private split: `docs/design/frost-shared.md`.
- **Type:** Cormorant Garamond (display / wordmark) · Inter (body) · JetBrains
  Mono (the kernel's numbers, `.tabular`).
- **Accent:** teal (`--accent`), with indigo + slate support. Verdicts use
  ok/warning/error tokens, never raw green/amber/red.
- **The per-lens seam:** `--lens-accent` / `--lens-accent-soft` /
  `--lens-node-stroke`, redefined by `data-lens` on the workspace root (Klir →
  slate, Bunge → indigo, Mobus → teal — saturation tracks the enrichment
  gradient; pure indirection over existing tokens, no new hex). Chrome only:
  rims, halos, handles, the lens toggle, armed tools. Never a flow — substance
  color is the reserved `--kind-*` channel, constant across lenses and themes.
- **Surfaces: three neutral steps, no hue cast (rules 1, 7).** The sheet is white,
  the ground it sits on is one step away, a third step carries header bands,
  chips and wells. The workspace names and the home register's names are two
  vocabularies for the same three steps: `--bg-secondary` = `--paper` (`#ffffff` /
  `#1d2022`), `--bg-primary` = `--paper-edge` (`#f3f6f9` / `#16181a`),
  `--bg-surface` = `--paper-ground` (`#e5edf4` / `#0e0f11`). The stage tokens
  collapse onto the same steps; the body carries no radial wash. Ink is Nord
  Polar Night: `--text-primary` / `--ink` `#2e3440`, `--text-secondary` /
  `--ink-secondary` `#3b4252`, `--text-muted` / `--ink-muted` `#5b6577` (dark
  `#8e9499`). Every text pair in the audit's contrast table clears 4.5:1 in
  both themes (`docs/design/makeover-audit/sweeps.md`).
- **Edges (rule 2):** every edge is a 1px line or a surface step, never a shadow.
  `--border` / `--rule` `#d8dee9`, `--rule-strong` `#aebdcf`, and `--hairline`
  (`#c2ccda` / `#3b4252`), the one line that must read on its own at 1.5:1 on
  the sheet and the ground in both themes. `--shadow-card`, `--shadow-card-hover`
  resolve to `none` and `--shadow-ink*` to `transparent`; the names stay so no
  call site changes.
- **Radii (rule 3):** three values. `--radius-md` 8 for a window or card,
  `--radius-sm` 4 for a box nested inside one and for chips, buttons and inputs,
  0 for grid cells, rows and bars. `--radius-lg` and `--radius-card` collapse
  onto 8. `--radius-pill` is for the one true pill, the verdict chip, which
  carries `data-pill`. Tailwind's `rounded-sm` / `rounded-md` / `rounded-lg`
  read these same variables; the bare `rounded` does not.
- **Focus (rule 10):** one ring, `--focus-ring` (2px of the accent, offset 2px),
  applied globally on `:focus-visible` and never removed. A component may move
  the ring inward on a surface that fills its pane (the SL editor) but not
  delete it.
- **Type (rule 5):** two families, eight sizes, stated as tokens. Cormorant
  Garamond 700 for names of things at `--t-d1` 30, `--t-d2` 24, `--t-d3` 20.
  Inter for everything scanned: `--t-body` 16, `--t-sm` 14 rows and controls,
  `--t-num` 13/600 numerals, `--t-meta` 12, `--t-label` 11/600 uppercase at
  `--tracking-label` 0.06em. JetBrains Mono only for the kernel's numbers and SL
  (`.tabular`).
- **Motion (rule 13):** `--motion-fast` 140ms, `--motion` 200ms, ease-out,
  and a global `prefers-reduced-motion` gate that stops every animation and
  transition. Nothing loops.
- **Chart series and world hues** keep their four and three; the light values of
  `--chart-1..3`, `--kind-energy`, `--kind-matter`, `--world-bunge`, `--world-mobus`
  were stepped down one notch (hue held) so each clears 4.5:1 on the ground.
- **Process primitive hues (rule 9b):** `--prim-buffering`, `-modulating`,
  `-splitting`, `-combining`, `-impeding`, `-propelling`, `-copying`, `-sensing`,
  `-amplifying`, `-inverting`, one Nord Frost or Aurora hue each, held across
  themes, at least 3:1 as a filled mark on the sheet. Nord has nine chromatic
  hues, so Amplifying takes an emerald between Aurora green and Frost teal and
  Inverting an indigo between Frost blue and Aurora purple. Mirrored in
  `tokens.ts` as `prim`, the way `kind` is; carried by the palette rail and
  the canvas badge (slice E) and by the inspector.
- **Theme is three states — system / light / dark.** System is the default and is
  the ABSENCE of a stamped attribute, so `color-scheme: light dark` follows
  `prefers-color-scheme` natively; an explicit choice sets
  `data-theme="light" | "dark"` on `<html>`, which narrows `color-scheme` and
  therefore flips every `light-dark()` pair at once. `src/theme.ts` owns the
  attribute and the stored choice (`facets.theme`); the control is the one
  quiet word in the menu bar's right-hand chrome cluster, beside the kernel chip.
  Bound by `src/theme.test.ts`, which also holds "the palette is stated once".
- Light + dark are both first-class — and since 2026-08-12 dark has actually been
  looked at, which it never had been before the toggle existed.
- **Ink on filled accents:** `--text-on-accent` — never a raw `#fff` in a
  component. It is **themed**, because dark lightens the accents and verdicts: a
  fixed white put the selected mode, the active lens, ▶ Run and every primary
  button at 1.9–2.7:1 in dark.

## The canvas (makeover slice E, 2026-10-26)

What `web/src/canvas` draws, as shipped; rules are the makeover charter's
(`docs/design/makeover-2026-10.md`), measurements from the three library
models at their fit scale.

- **Strokes (rule 17):** node, square, ring, capsule and flow strokes are 2
  world px and never thinner than `STROKE_FLOOR_PX` 1.5 on screen
  (`stageScale.ts strokeWorld`; flows are `non-scaling-stroke`, so the same
  reading is applied as their screen width). The membrane is ink, unfilled.
  No gradient and no glow filter on the stage.
- **Type (rules 5, 19; visual-language rule 7):** names are Inter 500,
  authored case, 13 px with a 12 px screen floor; flow labels and interface
  protocols Inter 12 with a 10 px floor; the Klir recession is weight and
  ink, not size. Every label sits on a paper tab (`PaperTab`: a `--paper`
  rect from `getBBox`, 2 px pad and radius) so it reads over any crossing.
  JetBrains Mono stays on the kernel's numbers (sim readouts, signatures).
- **Marks and colour (rules 9a, 9b):** a component's process glyph wears its
  `--prim-*` hue (centered on the body, and on the rail row and inspector);
  the regulator triangle takes `--prim-modulating`; flows and the substance
  glyphs wear `--kind-*`; environment squares and the membrane are ink. The
  per-node composition halo draws nothing. Nothing tints a surface.
- **One arrowhead:** `markerUnits="userSpaceOnUse"`, 10 world px held at 1.5x
  and floored at 8 on screen, filled with the stroke's colour; the exo 2x
  gain is gone.
- **States (rule 20):** selection is a ring, the body's outline offset 4
  screen px in 2 px of `--accent` (a square for an environment object);
  hover is a surface step (`--bg-surface` on the body, or on a rail square);
  a drag closes the cursor, steps the fill and hides the handle; the drop
  target keeps its lens-accent ring; selected and hovered flows thicken by
  one screen px and never change hue. Selection and hit marks carry
  `data-export-ignore`.
- **Targets (rule 11):** the connect handle is an 8 px disc over a 24 px hit
  disc (`HANDLE`, 1.75x under a coarse pointer); the membrane has a 24 px
  transparent hit stroke; flows keep their 18 px hit path; the interface
  chevron is at least 10 px tall and 2 px square-capped.
- **The rail (rule 21):** 80 px wide, 20 px `<Icon>`s in 32 px squares with a
  4 px radius and an 11 px word beneath, grouped select | place and the flow
  gesture | designate | SL, hairlines between; the armed tool is a filled
  accent square; the rail scrolls inside itself and becomes a strip along
  the stage's foot under 900 px of width. The hint line is a 28 px band
  under the stage, never over the diagram.
- **Popovers (rule 15):** `PopoverDialog` gives the edge, boundary, interface
  and milieu editors `role="dialog"`, a label, focus in and back, Escape;
  8 px radius, hairline edge, no shadow. Buttons are `ui.tsx`'s as they are
  (the pill is slice B2's).
- **Keyboard:** the stage is tabbable (`role="group"`), each thing is
  tabbable, Enter or Space selects, arrow keys move the selection to the
  nearest thing that way.
- **Measured at fit, 2026-10-26, 1372 px viewport:** LLM Serving Market at
  0.755: names 12.0 px (floor), flow labels 10.0, node and ring strokes 1.51,
  flow 1.51, handle 8 over a 24 hit, chevron 10.0, heads 8.0. Federal
  Reserve and Bitcoin at 1.0: names 13.0, strokes 2.0, handle 8, chevron 10.
- **Open:** the style register is one table (`canvas/style.ts`); the `?s=`
  registers are gone. Not done in this slice: a ghost of the armed shape
  following the pointer, snap guides on drag, hiding flow labels below 0.45
  zoom, a Sandbox that renders through `NodeBody`/`EdgeScaffold` rather than
  its own copy of the vocabulary, and Bunge's `▷`/`∼` label glyphs.

## Fitness functions (#131)

`npm run check:tokens` (in `just check` and CI) enforces this file mechanically:
no raw color literals outside `tokens.ts` / `canvas/style.ts` (var(--x) or token
imports only); px type only from the frozen vocabulary (`text-[9px|10px|11px]`,
numeric SVG/recharts sizes 8–12); lens registers import their matrix/confirm
chrome from `canvas/registerChrome.ts` instead of re-deriving it; every
`<foreignObject>` overlay carries `data-export-ignore`; the KIND channel holds
its hue across themes and clears 4.5:1 as text on the sheet and the ground; the
ten primitive hues hold their hue and clear 3:1 as marks; the shadow tokens
resolve to none; the global focus ring and reduced-motion gate exist.
Since the makeover's token slice it also checks rules 3 and 10: `rounded-full`
or `--radius-pill` without `data-pill`, literal radii (the bare `rounded`,
numeric `borderRadius`), and any `outline-none` or `outline: none` without a
`:focus-visible` replacement. These FAIL in the files named by
`RADIUS_OUTLINE_STRICT` (`ui.tsx`, `index.css` since slice B2; `SlPane.tsx`,
`SlChain.tsx`, `CoAuthorMode.tsx`, `ReasonerGate.tsx`, `SystemTypeEditor.tsx`
since slice G, the text surfaces) and are listed
as warnings elsewhere; each surface slice adds its files to the set as it
clears them (the open list is under "Open at slice B2" below), and when the set
covers `src/` the `RADIUS_OUTLINE_FAIL` switch flips and the set goes. A
`fontSize` may read a type token (`var(--t-*)`). No `box-shadow` other than
none or an inset 1px edge passes anywhere in `src/`. Growing the vocabulary is
fine: do it in `check-tokens.mjs`, deliberately, not ad hoc at a call site.

## Primitives (`src/ui.tsx`, slice B2, 2026-10-26)

One file, every control the surfaces share. Each consumes the tokens above,
draws its glyphs with `<Icon>` (rule 14), keeps the global focus ring (rule 10)
and meets the 24px floor (rule 11). Keyboard behaviour follows the APG patterns
the chrome audit tabulated (rule 15); no library was added. The states an
inline style cannot express (hover, the focused menu row, placeholders) are the
`prim-*` classes at the end of `index.css`.

| Primitive | Size | Radius | Edge and fill | Keyboard |
|---|---|---|---|---|
| `Button` | 32 tall (default) or 28; `px-3` / `px-2.5`; a square of the same size when it has only an icon; 14px Inter 500; icon slot `<Icon size={16}>` | 4 (`rounded-sm`) | `primary`: `--accent` under `--text-on-accent`; `danger`: `--verdict-error` under `--text-on-accent`; `quiet`: the sheet with a `--rule-strong` hairline, `--bg-surface` on hover; disabled: `--text-muted` on `--bg-surface`, never opacity | Native button; the global ring |
| `ToolButton` | 32 tall, at least 32 wide; a 32x32 square with `<Icon size={20}>` when given `icon` and no word | 4 | `--bg-surface` with a `--border` edge; armed: filled `--lens-accent` under `--text-on-accent` (rule 9c; the seam resolves to the accent) and `aria-pressed="true"` | Native button; the global ring |
| `Pill` | 20 tall, 12px Inter 500, `px-1.5`; optional `<Icon size={16}>` | 4; the verdict chip passes `pill` and is the one `rounded-full` with `data-pill` (rule 3) | Colour by meaning (rule 9d), always with a word: `ok` `--verdict-ok`, `warning` `--verdict-warning`, `error` `--verdict-error` (solid, urgent), `runs` `--accent`, `drafted` `--prim-modulating`, `with` `--prim-combining`, `bench` `--prim-buffering`; tinted at 14% over the sheet with the hue as ink; `neutral` is `--text-secondary` on `--bg-surface`. `data-tone` names it | None (not a control) |
| `Tabs` | 32 tall, `px-2.5`, the 11/600 uppercase label at `--tracking-label`; badge a 16px 4px chip | 0 on the strip, 4 on the badge; the active tab is a 2px `--lens-accent` underline | Hairline below; `role="tablist"` of `role="tab"` with `aria-selected`; only the active tab is in the tab order | ArrowLeft / ArrowRight (wrapping), Home, End select and focus; `tabKeyTarget` is the table |
| `Menu` / `MenuItem` / `MenuSection` / `MenuSeparator` | Trigger: a `Button` (28 quiet by default) with `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, and a 16px chevron; panel `role="menu"` labelled by the trigger, at least 10rem, 4px below; items 32 tall, 14px, a 16px icon or check slot, a right shortcut slot in the label style; section headings 11/600 uppercase inside `role="group"` | 8 on the panel | `--rule-strong` edge (1.9:1 on the sheet, so the edge reads with no shadow); hover and focus highlight `--bg-surface`; disabled `--text-muted` with `aria-disabled` | Enter, Space, ArrowDown open and focus the first item, ArrowUp the last; ArrowDown / ArrowUp rove (wrapping), Home / End jump, Escape closes and returns focus to the trigger, Tab closes, pointer down outside closes, picking closes. `menuKeyTarget` is the table. State is the Menu's own unless `open` / `onOpenChange` are passed |
| `ConfirmDialog` | A 20rem window, `p-5`; buttons are `Button` 32: Cancel quiet, the destructive verb danger, the alternative primary | 8 | Sheet with a `--hairline` edge, no shadow, over a 55% ground scrim | `role="dialog"`, `aria-modal`, `aria-labelledby` the message; focus moves to Cancel on open, Tab and Shift+Tab cycle inside, Escape and the backdrop cancel, focus returns to the opener on close |
| `Panel`, `Card` | Panel is the bare window; Card adds `p-5` and a header: the title in Cormorant 700 at `--t-d3`, the source stamp in the 11px label style in `--text-muted` | 8 (`rounded-md`) | Sheet with a `--hairline` edge, no shadow | None |
| `Input`, `Select`, `Textarea` | 32 tall (Textarea grows from 32), 14px Inter, `px-2` | 4 | `--rule-strong` edge on the ground; placeholder `--text-muted` (5.4:1) via `.prim-field::placeholder` | Native; the global ring |
| `DescriptionField`, `GroundingField` | The fields above under an 11px label; Description's label is a `<label for>` | 4 | as the fields | Native |
| `Banner` | `px-3 py-1.5`, 12px, a 16px `error` or `info` icon before the word | 4 | `error`: `--verdict-error` under `--text-on-accent`; `soft`: `--lens-accent-soft` | None |
| `Popover` | Viewport-clamped, `p-3` | 8 | Sheet with a `--hairline` edge (`--lens-accent` when `accent`), no shadow | The caller's (no dismiss logic, as before) |

What did not change: no handler's meaning, no state and no kernel call.
`ToolButton` keeps its text children (the register's graph / matrix, the
editors' bond / mere) and only becomes the square when a surface passes `icon`
alone; `Pill` is a chip until the status bar passes `pill`; `Menu` is built and
tested here and wired to FILE and SWITCH by the chrome slice.

## Open at slice B2

Rule 3 and rule 10 offenders in files the primitives slice does not own, as
`check:tokens` lists them at this commit (105 warnings; the six in `ui.tsx`
are cleared and `ui.tsx` fails on any new one). Each surface slice clears its
own files and adds them to `RADIUS_OUTLINE_STRICT` in `check-tokens.mjs`.
"pill" is `rounded-full` or `--radius-pill` without `data-pill`; "radius" is a
literal (`rounded`, `rounded-pill`, numeric `borderRadius`); "outline" is
`outline-none`.

| File | pill | radius | outline |
|---|---|---|---|
| `App.tsx` | 2964, 2972, 2985, 2998, 3011, 3018, 3039, 3051, 3071, 3902, 3910, 3917 | 3672, 3686, 4375, 4390, 4434, 4584 | |
| `StatusBar.tsx` | 91, 107, 123, 138, 153 | | |
| `Transport.tsx` | 58, 71 | | |
| `InspectorDock.tsx` | 242 | 240 | |
| `HomeScreen.tsx` | | | 1581, 1695 |
| `StartSurface.tsx` | 88 | | 80 |
| `AnalystPanel.tsx` | 144 | 289 | |
| `FormalPanel.tsx` | 82 | | |
| `ParamControl.tsx` | | 40 | |
| `RunInputs.tsx` | | 101, 102, 103, 186, 263 | |
| `RunPanel.tsx` | | 1224 | |
| `canvas/BoundaryPopover.tsx` | 68 | | |
| `canvas/BungeRegister.tsx` | 235, 376, 542, 545 | | |
| `canvas/BungeStateSpace.tsx` | | 37 (`borderRadius: 8`) | |
| `canvas/EdgePopover.tsx` | 107, 218 | | |
| `canvas/InterfacePopover.tsx` | 68, 81 | 63 | |
| `canvas/KlirLadderPanel.tsx` | 211, 237 | | |
| `canvas/KlirRegister.tsx` | 964, 967, 1019, 1022 | | |
| `canvas/MilieuPopover.tsx` | 47 | | |
| `canvas/NodeEditor.tsx` | 279, 283, 314 | | |
| `canvas/SimScrubber.tsx` | 67 | | |
| `sandbox/SandboxInspector.tsx` | | 138, 177, 217, 225, 289, 324, 333 | |
| `sandbox/SandboxMetrics.tsx` | | 97 | |
| `sandbox/SandboxSurface.tsx` | | 91, 97, 100, 105, 113, 172, 176, 180, 210, 234 | |

Also owed to the surface slices by this one: `StatusBar.tsx:70` passes `pill`
to the verdict `Pill` so the status bar keeps the one true pill; `Transport.tsx:105`
and `StatusBar.tsx:73` move their `✓` / `⚠` into the Pill's `icon` slot;
`canvas/PaletteRail.tsx:92` passes `icon` to `ToolButton` for the 32px square;
`App.tsx` FILE and SWITCH become `Menu` / `MenuItem` / `MenuSection`.

## Growing this

Phase 1 (CSV wizard + run panel) extends these tokens — it does not invent a new
system. Add primitives (buttons, inputs, cards) as reusable components consuming
the same tokens. Charts: recharts/visx, colored from the accent ramp. The canvas
(Phase 2+) will harvest old BERT's curved-flow polish, but the token system stays.
