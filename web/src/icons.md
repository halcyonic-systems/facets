# The icon set (`src/icons.tsx`)

One grammar for every drawn mark (makeover charter rules 14, 18, 21; Arcadia DESIGN.md "Icons"): a 24 x 24 viewBox with the art inside 3 to 21, a 2px stroke in `currentColor`, square caps, mitre joins, outline by default. A fill only for a solid too small to outline (a dot, an arrowhead) or where paper must occlude (Copying's front card). No `<text>`, no dashes (square caps extend a dash by a stroke width, so dashes read solid at icon sizes), no raw colour.

Use: `<Icon name="close" size={16} />` is decorative (`aria-hidden`); the control's text names it. `<Icon name="close" title="Close" />` is `role="img"` with a `<title>` for a control that has no text. Sizes: 16 inline and standalone, 20 inside a 32px rail square (rule 21), 24 and 32 for doors and heroes. Colour comes from the parent: `style={{ color: "var(--verdict-error)" }}`.

The ten primitives also render in the lenses' ±6 box through `canvas/lenses/primitive-glyphs.tsx` (`primitiveGlyph(p)`), so the canvas badge, the palette rail and the inspector draw from the same table. `PRIMITIVE_ICON` maps the kernel's primitive names to icon names.

## UI (39)

| Name | Replaces | Where it goes |
|---|---|---|
| `close` | `✕` | SL pane close, status bar narrow toggle, dialogs, chat dismiss |
| `back` | `‹`, `←` | "Home", "Doors", "back to the model" links; SL "Layout only", "From canvas" |
| `forward` | `→`, `›` | "all N", "manage", "and N more", "enter", "keep baseline", "export run" links; sandbox hints |
| `chevron-down` | `▾` | Switch trigger, SL history toggle (open), Export and Consult menus |
| `chevron-up` | `▴` | the up state of any `chevron-down` toggle |
| `chevron-right` | `▸` | run card collapse, rail arrow, status bar "Margin", history toggle (closed) |
| `chevron-left` | `◂` | palette collapse |
| `expand` | `⤢` | run card "readouts" |
| `collapse` | `⤡` | Readouts "model" |
| `play` | `▶` | transport Run |
| `pause` | `⏸` | transport pause |
| `step` | `⏭` | transport Step |
| `step-back` | `⏮` | transport step back |
| `reset` | `↺` | run card "reset to declared" |
| `check` | `✓` | verdict chip "clean", "declared", "pinned", "conserved" (with the word) |
| `external` | `↗` | "SL grammar", "lean-provenance", Build, Read and every external link |
| `edit` | `✎` | rename controls on Home and in LibraryRow |
| `delete` | `×` (delete) | delete controls on Home and in LibraryRow, dock "delete" |
| `search` | the 14px search drawing | Library "Find a model" |
| `file` | `·` placeholder | the file door's thumbnail cell, model rows |
| `folder` | none today | "Save to folder", "Open" (folder-backed library) |
| `pin` | "pin" text toggle | the pin control (with `aria-pressed`) |
| `theme` | the theme word | the light/dark toggle |
| `menu` | none today | the narrow-width menu trigger |
| `plus` | "+" text | add controls (new model, add param) |
| `minus` | "−" text | remove controls, stepper down |
| `drag` | `⋮⋮` | reorder handles in lists |
| `warning` | `⚠` | transport "leak", Review warnings, Banner tone warning |
| `error` | `!` (SL gutter) | SL fault gutter mark, Banner tone error |
| `info` | none today | Banner tone info, "where this comes from" |
| `ok` | `✓` in a ring | Banner tone ok, the run card's conserved mark |
| `keyboard` | none today | shortcut help trigger |
| `command` | `⌘` | shortcut slots ("Save", `⌘⏎` hints) |
| `return` | `⏎` | shortcut slots (`⌘⏎` compile hints) |
| `scale` | `⚖` | sandbox "conserved / residual" readout |
| `tree` | `└` | Switch child rows, Library tree connector |
| `dot` | `•`, `·` | active model marker, dirty marker (with "unsaved" in the name) |
| `braces` | `{ }` text | the SL drawer button on the tool rail |
| `select` | the 16px cursor drawing | the tool rail's select row |

## Canvas (23)

The ten primitives follow `docs/design/makeover-audit/canvas.md` § 3.1: where a glyph has a flow line it is the horizontal at y 12 from x 4 to 20, so a substance primitive reads as something done to a line; the signal primitives have none. Facets drawings in the spirit of Mobus Fig. 4.5, not his printed iconography. No glyph carries a substance or verdict colour; the per-primitive hue of rule 9b rides `color` on the parent.

| Name | Silhouette | Replaces | Where it goes |
|---|---|---|---|
| `combining` | two lines in from the left meeting at one line out: a Y on its side | the ±6 merge drawing (kept) | rail row, canvas badge, inspector, ProcessReference |
| `splitting` | one line in forking to two out | the ±6 fork drawing (kept) | same |
| `impeding` | the line interrupted by a bowtie valve | the bowtie (kept, redrawn on the grid) | same |
| `propelling` | a stub and two chevrons pushing right | the two chevrons (kept, stub shortened) | same |
| `buffering` | a drum between two stubs with its level line | the elliptical drum (redrawn: a square drum with a level, Stella's stock) | same |
| `modulating` | the regulator triangle on the line, unfilled | the filled orange triangle (redrawn: silhouette only, the warm fill is the node body's) | same |
| `sensing` | a dot and two arcs to its right | the probe (kept) | same |
| `amplifying` | three bars rising from one baseline | the bars (kept) | same |
| `inverting` | an arrow up beside an arrow down, open heads | the antiparallel arrows (kept) | same |
| `copying` | two cards, the front on paper | the two cards (kept, corners squared) | same |
| `component` | circle | RoleChip circle | rail place rows, legends |
| `environment` | square | RoleChip square | rail place rows, legends |
| `environment-open` | square with a gap on the side facing the system | none | Mobus environment object rows, legends |
| `interface` | a capsule straddling a membrane segment, chevron inside | the pass-way chip | rail place row, legends |
| `membrane` | the one ellipse | none | boundary editor, legends |
| `flow` | a line with one filled head | `→` | connect hints, legends |
| `agent` | the management oval with its dot | the agent chip | rail designate row, inspector |
| `matter` | a solid dot | none | substance pickers, legend; wears `--kind-matter` |
| `energy` | a bolt | none | same; `--kind-energy` |
| `informational` | three dashes (the flow's `6 4`) | none | same; `--kind-informational` |
| `field` | four short dashes (the flow's `2 4`) | none | same; `--kind-field` |
| `source` | open square with the stub leaving | `▶` | Sandbox source card |
| `sink` | open square with the stub entering | `◀` | Sandbox sink card |

## Doors (4)

Redrawn from the 96 x 64 and 48 x 48 bespoke drawings in `HomeScreen.tsx`, keeping each one's idea; drawn for 32 inside a tinted well (rule 9c). Closed shapes wear `--accent-soft` as a `wash` fill.

| Name | Idea kept | Replaces |
|---|---|---|
| `draw` | a membrane holding two processes and the flow between them | `DrawGlyph` |
| `describe` | lines of prose and a checked box where the verdict lands | `DescribeGlyph` |
| `open` | a stack of saved sheets | `OpenGlyph` |
| `sandbox` | two things and the loop that runs between them | `SandboxGlyph` |

## Adding one

Add a `Shape[]` to the right family in `icons.tsx` using only absolute `M L H V A Z` path commands on the 24 grid; `mapPath` knows no others. Add its row here. `icons.test.tsx` checks the grammar for every name.
