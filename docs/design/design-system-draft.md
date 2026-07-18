# bert-lenses — design system (DRAFT / sketch to react to)

> **Status: RESEARCH** — a sketch to react to, not committed and not a spec. Builds on
> `web/DESIGN.md` (Halcyonic Frost) and `web/src/tokens.ts` + `web/src/index.css`
> as-is; it does not fork them. Written to guide issue #50 (the per-lens authoring
> palette) and design work on this project going forward. Grounded in two prototype
> exemplars in the fleet — `active/pullback/` and `active/lemonaid/` — both already
> Halcyonic-family, so the lessons transfer directly.

The invariant is the first design principle (`web/DESIGN.md`): the page makes the
kernel's verdicts legible, it does not compute or embellish them. Every rule below
serves that. A visual that carries ontology reads a kernel fact; it never invents one.

---

## 1. What we learn from the exemplars

**From pullback** (`active/pullback/`, live at pullback.systems):

- **Tri-source tokens with a hard drift-gate.** `DESIGN.md` (portable brand spec) ↔
  `web/src/index.css` (`:root` vars components consume) ↔ `web/src/tokens.ts` (typed
  JS mirror for SVG/canvas), kept in lockstep by `npm run check:tokens`, which *fails
  the build on drift*. bert-lenses already has the three files (`DESIGN.md`,
  `index.css`, `tokens.ts`) but **no gate** — the tokens.ts header just says "keep in
  sync" by hand. Adopt the gate. (See §3.)
- **Accent discipline as a written law.** Exactly two saturated accents, each
  meaning-bearing: "if everything is indigo, nothing is" (`DESIGN.md`). We have one
  (teal) plus slate/indigo support — keep it that tight.
- **A reserved semantic color channel.** pullback's orb-precision greens/ambers
  (`--orb-exact #059669` …) are contractually *never decorative*. bert-lenses already
  has the exact analogue: `canvas/types.ts` `KIND_COLOR` (Matter `#5a7a4f`, Energy
  `#b06a1f`, Informational `#8a5a9c`, Field `#3f6f8f`). Name it a reserved channel and
  protect it the same way — substance color means substance type, nowhere else.
- **Warm-ink everything.** No pure black text, no neutral-black shadows — shadows
  carry `rgba(28,24,44,…)`. We already do this (`--text-primary #1a1a2e`, shadows
  `rgba(26,26,46,…)`). Cheap move, big cohesion payoff; keep it as a rule.
- **Avoid: legacy CSS drift.** pullback's `static/*.css` holds four divergent copies
  of the palette with *different accent hues*. Lesson: land the drift-gate before a
  second copy of a token exists, not after.
- **Avoid: partial gating.** pullback gates color but not type size, so
  `SectionTitle.tsx` drifted to 22px against a 28px spec. If we gate, cover the scale.

**From lemonaid** (`active/lemonaid/`, one core + `apps/{personal,team,culture}`):

- **The semantic-var "seam" is the transferable idea.** lemonaid has no shared
  stylesheet; instead every app redefines a fixed set of semantic var *names*
  (`--ink`, `--paper`, `--line`, lens colors — the "8-var seam",
  `apps/culture/frontend/style.css:28`) but never renames them. Swapping the whole
  palette (even inverting light↔dark) is one override block keyed on
  `body[data-theme="night"]`. **This is exactly the mechanism the lens toggle needs:
  a per-lens seam keyed on the active lens.** (See §2, lens-tinting rule.)
- **Per-skin identity = intentional signalling, reduced to a few family links.**
  personal (dark/clinical), team (light/editorial), culture (warm-paper) diverge on
  purpose; the family link is deliberately narrowed to *mono labels + accent
  discipline*. For us the three lenses are the three "skins," and the family link is
  the neutral Frost base + the reserved KIND channel.
- **Accent-encodes-state, derived with `color-mix()`.** lemonaid colors always mean a
  relationship state, and tints/washes/borders come from one `--accent` via
  `color-mix(in srgb, var(--accent) 13%, #fff)` (`apps/team/frontend/style.css`). One
  variable deep — adopt for lens washes/soft fills so a lens tint is a single knob.
- **Avoid: hand-copied palettes.** lemonaid's Night palette is copy-pasted into four
  `:root` blocks ("matches relational.html THEMES.night") with no single source — a
  standing sync debt. Our seam must be *one* set of vars overridden per lens, never
  duplicated per file.
- **Avoid: no spacing/type scale tokens.** lemonaid (and pullback's `:root`) leave
  spacing as ad-hoc px literals, so rhythm is held by eye. We already have radius but
  no space scale — worth emitting one before the palette grows (§2).

---

## 2. The system outline

### Tokens (build on `index.css` + `tokens.ts` as-is)

Keep the existing set unchanged. It is already good: cool indigo-tinted surface,
teal accent, verdict tokens (never raw green/amber/red), radius + shadow ramps, the
Cormorant / Inter / JetBrains triad, light + dark both first-class. Two additions:

- **A space scale.** Emit `--space-1…6` (4/8/12/16/24/32px) to `:root` + mirror in
  `tokens.ts`, so SVG padding and layout gaps stop being magic numbers. (Gap noted in
  both exemplars.)
- **The per-lens seam** (new, the load-bearing addition). A small fixed set of
  semantic names the *active lens* redefines, set on the canvas root via a
  `data-lens` attribute (lemonaid's `data-theme` pattern):

  ```
  --lens-accent          the lens's identity color (chrome, toggle, port, rim)
  --lens-accent-soft     its wash / halo fill        (color-mix from --lens-accent)
  --lens-node-stroke     default node stroke for this lens
  ```

  Bound to the "constrained → empowered" gradient using **only tokens that already
  exist** (the Frost family is literally slate / indigo / teal, `DESIGN.md`):

  | lens | mode (kernel) | `--lens-accent` | reads as |
  |---|---|---|---|
  | **Klir** | Core | `--accent-slate` | recessed, epistemic, observer-behind |
  | **Bunge** | Structural | `--accent-indigo` | structural, realist middle |
  | **Mobus** | Operational | `--accent` (teal) | the instrument's home accent, empowered end |

  Saturation rises slate → indigo → teal, so the *color itself* tracks the enrichment
  gradient. No new hex. The lens is a kernel `Mode` (`canvas/types.ts` `LENS_TO_MODE`),
  so the seam is bound to a kernel fact, not a free reskin — the invariant holds.

### The reserved KIND channel

`KIND_COLOR` (`canvas/types.ts`) is a reserved semantic channel like pullback's orb
colors: it means substance type and nothing else. It is **constant across lenses** —
only the lens's *ontology* decides whether it shows (Klir suppresses it: relations are
substance-blind, `klir.tsx`; Bunge/Mobus paint it). Never tint chrome with a KIND
color; never tint a flow with `--lens-accent`.

### Component inventory

*Exists (`web/src/ui.tsx`, presentation-only, all consume `var(--x)`):* `Card`
(title + `source` label — the brain/face provenance tag), `Pill` (tone ok/warning/
error/neutral), `Verdict`, `Stat`, `humanize()`.

*Exists on the canvas (`canvas/lenses/`):* `NodeBody` + `EdgeScaffold` (the shared
chrome; per-lens views resolve style knobs from kernel facts — the right pattern,
keep it), `PortView` (Mobus pill notch), the Bunge aggregate banner + `⊘M`
overlay (`App.tsx`, `bunge.tsx`), `EdgePopover` (per-lens edge editing:
`Title`/`Row`/`SmallButton`/`CloseRow` micro-primitives inside it).

*Gaps #50 will need:*

- **Palette dock** — a docked surface listing the *addable kinds for the active lens*.
  New. Reuse `Card` chrome + `SmallButton`.
- **Tool button** — a stampable kind (icon + label + tooltip), selected/armed state.
  New; generalize `EdgePopover`'s `SmallButton` into a shared `ToolButton` in `ui.tsx`.
- **Inspector** — a persistent read/edit panel for the selected element (harvest #5:
  inspector + audit navigation). The `EdgePopover` bodies are the seed; promote
  `Title`/`Row` into shared inspector rows in `ui.tsx` so the popover and a docked
  inspector share one row vocabulary.
- **Boundary-property authoring control** — porosity / fuzziness sliders (Mobus only;
  rendered but pinned 0.0 today, `lens-palettes.md` status). A labelled range row.
- **Verdict banner** — the aggregate/heap banner is currently inline JSX in `App.tsx`.
  Promote to a shared `Banner` (tone-driven, like `Pill`) so palette-legality feedback
  ("this lens can't add that") reuses it.

### Interaction vocabulary

- **Hover:** node halo ring `--lens-accent` (today hardcodes `--accent`,
  `common.tsx:68` — route through the seam). Edge: no change; selection halo already
  `--accent` at 0.22 (route through seam).
- **Active / armed:** the lens toggle and any armed tool fill `--lens-accent`, white
  text (matches `App.tsx` toggle). One armed tool at a time.
- **Drag:** the teal connect-handle dot (`common.tsx`) → seam color. Node drag =
  `cursor-grab`; handle = `cursor-crosshair`. Keep.
- **The accretion pattern (load-bearing):** toggling a lens must read as the *same
  model gaining/shedding structure*, never a swap. The boundary set is the canonical
  case — Bunge marks the nodes with a rim, Mobus reifies the *same* nodes into ports
  (`lens-palettes.md` §boundary). The palette must inherit this: switching lens
  *adds/removes authoring verbs* on the same elements, it does not reset the canvas.

### The lens-tinting rule (how per-lens identity composes with neutral Frost)

One sentence: **the lens tints its own chrome via `--lens-accent`; the Frost base
(surface, text, borders, verdict tokens) and the reserved KIND channel stay constant.**
So a lens change re-tints rims, ports, halos, toggle, armed tools, and washes — and
nothing else. Because slate/indigo/teal are already Frost support colors, the tint
never fights the base; because the KIND channel is reserved, substance color never
drifts when the lens changes. This is lemonaid's seam, narrowed to chrome and bound to
a kernel Mode.

---

## 3. Rules of engagement (checkable)

A coding agent can check each of these against a diff:

1. **No new hex outside `index.css` / `tokens.ts`.** Every color in a component is
   `var(--x)` or `color-mix()` of one. (grep for `#[0-9a-fA-F]{3,6}` in `src/**` outside
   the two token files → zero hits. Today `KIND_COLOR` is the sanctioned exception; it
   lives in `canvas/types.ts` and is the reserved channel — move it or annotate it, but
   no *other* raw hex.)
2. **Every ontology-bearing visual reads a kernel fact.** A rim, port, badge, wash, or
   verdict must trace to a `lens_facts` / `validate_mode` / `describe` value, not a JS
   decision. (Same gate Phase 3 held; cite the kernel field in the code comment.)
3. **One `--lens-accent` per surface.** Chrome uses the seam; nothing hardcodes
   `--accent` for lens-identity purposes. (grep chrome for `--accent` that should be
   `--lens-accent`.)
4. **The KIND channel is reserved.** `KIND_COLOR` values appear only on flows/bonds,
   never on chrome; `--lens-accent` never colors a flow.
5. **Tokens stay tri-synced.** Any token added to `index.css` is mirrored in
   `tokens.ts` and noted in `DESIGN.md`; add a `check:tokens` script (pullback's) so CI
   fails on drift. Gate the *whole* scale (color + type size + space), not just color.
6. **Primitives are presentation-only.** Anything in `ui.tsx` / `canvas/lenses/`
   decides no systems fact (the `ui.tsx` header already states this). New primitives
   (ToolButton, inspector rows, Banner) inherit the rule.
7. **Light + dark both ship.** Every new token gets a `prefers-color-scheme: dark`
   value; the smoke slice renders in either (`DESIGN.md`). Light is the default.
8. **Palette legality is a kernel verdict, not a UI list** (#50 ground rule): the
   palette *offers* only what `project()` + `validate_mode` accept at the active lens.

---

## 4. How #50 should consume this

Mapping the four palette design questions (issue #50) to the components and rules above:

- **Q1 — docked palette vs contextual menu?** Both, one vocabulary. A **docked palette
  dock** (Card chrome, left or right rail) is the home for *adding* kinds; the existing
  **EdgePopover / a docked inspector** stays the home for *editing* a selected element.
  Reuse the seam so the dock re-tints per lens. Don't build a third surface — promote
  `EdgePopover`'s `Title`/`Row`/`SmallButton` into shared primitives both consume.
- **Q2 — is double-click enough, or a picker?** Heterogeneous kinds (source vs
  component vs interface at Mobus) need an explicit **ToolButton** picker in the dock:
  arm a tool, then place (stamp-then-place). Double-click stays a shortcut for the
  lens's *default* kind (Component). One armed tool at a time (interaction rule).
- **Q3 — does the addable set change with the lens?** Yes, and the seam makes it
  *look* like it changes: the dock re-renders the lens's addable kinds (Klir: thing +
  relation; Bunge: + environment thing, bond/mere; Mobus: + source/sink/interface,
  work-process primitives) and re-tints to `--lens-accent`. Gained/shed authoring verbs
  mirror gained/shed rendered structure (accretion pattern). Each entry registers per
  lens in the LensRegistry (#48) and is offered only if kernel-legal (rule 8).
- **Q4 — where does boundary-property authoring live?** Mobus-only, in the **inspector**
  when a boundary/interface is selected: labelled porosity / fuzziness range rows
  (rendered but 0.0 today). It is an *edit* on an existing element, not an *add*, so it
  belongs in the inspector surface, not the dock. Reads/writes the kernel's `B=⟨P,I⟩`
  properties; no JS-side geometry.

**First slice suggestion:** promote the shared primitives (ToolButton, inspector rows,
Banner) + wire the `--lens-accent` seam, before adding any new node kind. That makes the
dock, popover, and inspector one system, and every subsequent kind is a registry entry
plus a legality check, not a new surface.

---

### Decisions (Shingai, 2026-07-15)

1. **Per-lens accent = slate / indigo / teal (Klir / Bunge / Mobus) — ADOPTED.** The
   app shifts off "teal everywhere"; the accent reuses existing Frost tokens and
   tracks the constrained→empowered enrichment gradient. Implementation lands with
   **#50** via the `--lens-accent` semantic-var seam (§2), bound to the kernel `Mode`.
2. **Dock placement = left rail.** The palette dock lives on the left, keeping the
   right side clear for the FormalPanel / inspector so they don't compete.
3. **`KIND_COLOR` moved into the token files — DONE (this pass).** `--kind-*` vars in
   `index.css` + a `kind` mirror in `tokens.ts`; `canvas/types.ts` `KIND_COLOR` now
   aliases the mirror, so rule 1 is a clean "no raw hex outside the token files." The
   channel stays reserved (substance identity, constant across lenses and themes).
4. **`check:tokens` gate added — DONE (this pass).** pullback-style drift-gate
   (`web/scripts/check-tokens.mjs`), wired into `npm run check:tokens`, `just check`,
   and CI: every `var(--x)` in `tokens.ts` must exist in `index.css`, and each
   `--kind-*` hex must match across the two sources.
