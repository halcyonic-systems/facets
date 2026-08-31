# The shared Frost foundation

*2026-08-31 — the unification seam between the three surfaces.*

Facets has three faces — the portal (`portal/index.html`), chat
(`chat/index.html`), and the model workbench (`web/`) — and until this pass
they lived in three design universes: chat carried a warm-paper palette
(Fraunces/Newsreader on `#f7f4ef`) from its standalone days, the portal held
its own hardcoded Tailwind-slate hexes, and only the model app spoke
Halcyonic Frost. One value could not be changed everywhere.

## The mechanism

**`web/src/index.css` is the single source of truth for every token value.**
That was already the model app's doctrine (`web/DESIGN.md`, enforced by
`web/scripts/check-tokens.mjs`); the unification extends its reach instead of
adding a second authority.

`scripts/gen-frost-shared.mjs` extracts the cross-app subset into
`shared/frost.css` and copies the vendored faces into `shared/fonts/`. The
output is GENERATED — never hand-edited (the homeostat idiom). Portal and
chat `<link>` the sheet; the publish script ships `/shared/` and refuses to
assemble if the sheet is stale (`--check`).

To change a color, radius, shadow, or face everywhere:

1. edit `web/src/index.css` (or `web/src/fonts.css`),
2. `node scripts/gen-frost-shared.mjs`,
3. done — model, chat, portal all follow.

## What is shared, what is private

Shared (the foundation): the base Frost register (surfaces, text, accents,
verdicts, border/hairline, radii, shadows), the printed-record register
(`--paper`/`--ink`/`--rule`/`--seal`), the type stacks, `--transition-base`.

Private to the model app (kernel semantics, not foundation): the per-lens
seam (`--lens-*`), the KIND channel (`--kind-*`), chart series, world hues.

Private to chat: the facet dimension channels (`--dim-*`), themed in place as
`light-dark(hue, color-mix(...white 38%))` pairs — hue is the identity, the
dark half lifts lightness.

## Consumption pattern in the static surfaces

Chat and the portal keep their historical var names as an **alias layer**
(`--ink-dim: var(--ink-secondary)`, `--flow: var(--accent)`, …) so thousands
of lines of existing rules needed no churn. New rules in those files should
consume the shared tokens directly; the aliases are a compatibility shim, not
a vocabulary to grow.

Theming follows the model app's doctrine: palette stated once as
`light-dark()` pairs, `color-scheme` decides. Chat therefore has a real dark
mode (system-following; no toggle yet — `data-theme` on `<html>` is the seam
when it grows one). The **portal is pinned light** (`color-scheme: light`)
because the gem SVG's fills are presentation attributes, which cannot read
`var()`; unpinning requires moving those fills into CSS rules.

## Known follow-ups

- Portal dark mode (move gem fills to CSS classes, unpin).
- Chat theme toggle (adopt `web/src/theme.ts`'s three-state pattern).
- The structural half of the alignment — chat's linear flow toward the
  workbench paradigm — is specced in the vault
  (`operations/sessions/2026-08-31/ui-spec-facets-alignment.md`) and was
  deliberately deferred; this pass was visual unification only.
- Workbench declutter: ranked options in
  `docs/proposals/workbench-declutter.md`, awaiting triage.
