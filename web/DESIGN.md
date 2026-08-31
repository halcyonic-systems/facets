# bert-lenses — design

**The invariant is a design principle too:** the page's job is to make the
kernel's verdicts legible, not to compute or embellish them. Every number shown
is the kernel's. Labels name the source (`bert-core · wasm`, `bert-compose · wasm`)
so the brain/face split is visible in the UI itself.

## Halcyonic Frost

Inherited from the fleet (trade-observatory, finance-app, germen) — a cool,
faintly indigo-tinted surface (never flat grey) with one restrained accent.
bert-lenses takes **teal** as its accent to distinguish the instrument within the
Frost family (slate / teal / indigo).

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
- **Surfaces:** soft cards (`--radius-card`, `--shadow-card`) on a radial-tinted
  stage. Generous whitespace; legibility over decoration.
- **Theme is three states — system / light / dark.** System is the default and is
  the ABSENCE of a stamped attribute, so `color-scheme: light dark` follows
  `prefers-color-scheme` natively; an explicit choice sets
  `data-theme="light" | "dark"` on `<html>`, which narrows `color-scheme` and
  therefore flips every `light-dark()` pair at once. `src/theme.ts` owns the
  attribute and the stored choice (`bert-lenses.theme`); the control is the one
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
`<foreignObject>` overlay carries `data-export-ignore`. Growing the vocabulary
is fine — do it in `check-tokens.mjs`, deliberately, not ad hoc at a call site.

## Growing this

Phase 1 (CSV wizard + run panel) extends these tokens — it does not invent a new
system. Add primitives (buttons, inputs, cards) as reusable components consuming
the same tokens. Charts: recharts/visx, colored from the accent ramp. The canvas
(Phase 2+) will harvest old BERT's curved-flow polish, but the token system stays.
