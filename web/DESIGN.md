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
charter (rules 1 to 9e, 10, 13) is what this file now describes; the
primitives and surfaces that consume it follow in later slices.

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
  `tokens.ts` as `prim`, the way `kind` is; carried by the palette rail, the
  canvas badge and the inspector once the later slices consume them.
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
Since the makeover's token slice it also lists, as warnings until slice B
lands: `rounded-full` or `--radius-pill` without `data-pill`, literal radii
(the bare `rounded`, numeric `borderRadius`), and any `outline-none` or
`outline: none` without a `:focus-visible` replacement. No `box-shadow` other
than none or an inset 1px edge passes anywhere in `src/`. Growing the
vocabulary is fine — do it in `check-tokens.mjs`, deliberately, not ad hoc at a
call site.

## Growing this

Phase 1 (CSV wizard + run panel) extends these tokens — it does not invent a new
system. Add primitives (buttons, inputs, cards) as reusable components consuming
the same tokens. Charts: recharts/visx, colored from the accent ramp. The canvas
(Phase 2+) will harvest old BERT's curved-flow polish, but the token system stays.
