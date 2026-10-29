# Makeover audit, 2026-10-26: readouts

**Status: RESEARCH.** One of seven read-only audits behind [`../makeover-2026-10.md`](../makeover-2026-10.md), written by an agent against the dev build of `design/makeover` at aa4b3d1. Rule numbers refer to the charter. Screenshots are not in the repo.

# Readouts audit: the reading surfaces

Scope: inspector dock (Element tab; Formal, Review, Analyst live on the Read sheet in this build), run card, Readouts expansion (Story, Fit to data, Table, Log), every chart, the Measurements sheet, the Bunge register. Model: LLM Serving Market, run to 660 ticks. Read-only; no file changed. Branch state as of 2026-10-26.

Method notes. The shared Chrome window sits at 90 percent page zoom, so "1440" screenshots are a 1600 CSS px viewport (`innerWidth` 1600, `outerWidth` 1440); every number below is measured in CSS px with `getComputedStyle`, not read off the image. `resize_window` had no effect (the window is shared with other auditors), so 1024 and 390 were captured as same-origin iframes of exact CSS size inside the page; media queries and layout in them are true to the width, the chrome around them is not. Under Bunge this model has no mechanism (⊘M), so the kernel refuses to run and the state-space readout never mounts; `BungeStateSpace` is audited from code only. The DTMC panel likewise (no Klir chain model was opened).

## Verdict

The readouts are honest and the chart ink is right (the four series tokens pass all six dataviz checks in both modes), but the chrome around them is pre-charter: pill buttons and 8px inputs, unicode glyphs as icons, 15px hit targets, no focus ring on tabs, a hairline that vanishes in dark, and a 384px rail that pushes the whole readout off a phone.
Fix order: tokens (hairline, radius, shadow, type vocabulary) first, then the Tabs/Card/Pill primitives, then three chart fixes (ticks, single-series legends, cursor readout), then the rail at 1024 and 390.

## Findings

Severity: blocks = charter rule broken in a way a reader hits every session; hurts = visible and costly; polish = consistent fix, low risk.

| # | Finding | Rule | Where | Fix size | Severity |
|---|---|---|---|---|---|
| 1 | Every reading-surface control is a unicode glyph doing an icon's job: ⤢ readouts, ▸ collapse, ↺ reset, ⤡ model, ▶ Run, ⏭ Step, ⏮, ⏸, ✓ conserved, ✓ clean, → in "enter →", ⊘, ▾ | 14 | `RunCard.tsx:121,129,234`; `Readouts.tsx:240`; `canvas/NodeEditor.tsx:300-314`; `RunPanel.tsx:1232` | primitive (icon set) | blocks |
| 2 | Hit targets far under 24×24: "⤢ readouts" 55×17, "▸" 10×16, "↺ reset to declared" 100×17, "⏮" 20×16, "keep baseline →" 95×15, "⤡ model" 61×16, "where this comes from" 119×17, "export run (.json) →" 10px text | 11 | `RunCard.tsx:115-130,228-236`; `Readouts.tsx:224-241,174`; `ReadSheet.tsx:222` | primitive (quiet button with 24px box) | blocks |
| 3 | Tab buttons have no visible keyboard focus: computed `outline: none 2.22px` on `:focus-visible` for Story/Fit/Table/Log and the dock's Element tab; the only focus rules in the sheet are `.record-row`, `.home-panel`, `.hue-panel`, range inputs | 10 | `ui.tsx:505-530` (TabButton), `index.css:464` (only range has a ring) | primitive | blocks |
| 4 | Hairline is invisible in dark: `--hairline` dark is `#2a2f32` at 0.376 alpha on `#1d2022`, ratio about 1.08:1; every chart gridline, axis line, run-card band divider and Readouts rail border disappears (see `readouts-story-1440-dark.png`, `readouts-runcard-dock-1440-dark.png`). Light is 1.14:1 on `#fafafb`, also under the 1.5:1 a hairline needs to read | 1, 2, 7 | `index.css:124` | token | blocks |
| 5 | Readouts rail is a fixed 384px (`w-96`): at 1024 it leaves 518px for charts (the two-up grid collapses to one column); at 390 the rail alone is the viewport and the readout section (391px) sits entirely off-screen with horizontal scroll; the Log table wrapper is 64px wide | 16 | `Readouts.tsx:245` | surface | blocks |
| 6 | Run card is a fixed 288px (`w-72`) absolutely over the canvas: at 1024 it covers 52 percent of a 552px canvas; at 390 it covers 288 of 302px (95 percent), the diagram is unusable, and the "✓ conserved" chip overlaps the pause button | 16, 11 | `RunCard.tsx:99`; transport strip (owner: canvas) | surface | blocks |
| 7 | At 1024 the Readouts header collides: "tick 2 / 659" renders under "✓ conserved" (`readouts-story-1024+390-light.png`) | 16, 6 | `Readouts.tsx:204-242` (`min-w-0 flex-1` transport with no wrap rule) | surface | hurts |
| 8 | Measurements sheet at 390 renders no table (`table` width 0, the Read sheet stays on top); at 1024 the 1350px table gets a 238px wrapper | 16 | `DataMode.tsx:607-720` | surface | blocks |
| 9 | Measurements column headers are full provenance sentences in 11px mono ("Routed demand → Router ← routed_workload · Gtok/day · forces the flow"), making each bound column about 390px, so three bound columns never fit even at 1600 (table 1350 in 847) | 6 | `DataMode.tsx:616-630` | surface | hurts |
| 10 | Measurements values are raw 13-digit integers ("1501044287786"), no grouping, no compaction; the eye cannot compare rows | dataviz: y ticks compact from 1,000 up; marks-and-anatomy | `DataMode.tsx:651-660` | primitive (number formatter) | hurts |
| 11 | "Declared, not bound" rail wraps flow names to three lines ("closed weights & API") in a 200px column with an 11px mono source on the right | 6 | `DataMode.tsx:505-520` | surface | hurts |
| 12 | Pill radius on things that are not the verdict chip: "enter →", "delete", "deselect" (dock), "graph / matrix" and 𝒞/ℰ segmented chips and "system — 𝔹 ≠ ∅" (register), "ran the model as shipped" and "Markov chain" Pills, `Pill` and `Verdict` primitives themselves, the focus toggle | 3 | `canvas/NodeEditor.tsx:279,283,314`; `ui.tsx:64,130,428-443`; `canvas/BungeRegister.tsx:235,376,542,545`; `FormalPanel.tsx:82` | primitive (Pill → 4px chip; keep pill for the one verdict) | blocks |
| 13 | Inputs and selects at 8px radius (`rounded-md`): name, grounding, work process, decision rule in the Element tab; step size and run length in TimeRow; register name and editor fields. The amount field is 4px (`rounded`). Two radii on one row | 3 | `canvas/NodeEditor.tsx:107,183,218,252`; `Readouts.tsx:309`; `canvas/BungeRegister.tsx:208,436,459,505`; `ParamControl.tsx:40` | token (`--radius-input` = 4) | hurts |
| 14 | Card and run card carry a real shadow (`0 1px 2px rgba(22,35,43,.05)`), run-card collapsed button too; charter says the tokens resolve to none | 2 | `index.css:140-141`; `ui.tsx:14-19`; `RunCard.tsx:85,104` | token | polish |
| 15 | `--radius-lg` 12 and `--radius-card` 10 still exist | 3 | `index.css:128-129` | token | polish |
| 16 | Card titles ("Time", "Inputs", "The formal object", "Analyst", "Result") are Inter 18/600; 18 is outside the eight sizes and a section name belongs in Cormorant 700 at 20 | 5 | `ui.tsx:26` | primitive | hurts |
| 17 | Tab labels and the READOUTS/RUN/ELEMENT eyebrows are 12/600 uppercase at +0.3px (0.025em); charter label is 11/600 uppercase +0.06em | 5 | `ui.tsx:509`; `RunCard.tsx:109`; `Readouts.tsx:209`; `InspectorDock.tsx:233` | primitive | polish |
| 18 | 10px type on reading surfaces: mechanism and flow-group headers, "at t=5 / final / unit" column heads, "accept" button, chart axis ticks and labels, the boundary note in the run card, register column headers | 5 | `ElementMechanism.tsx:69,100`; `RunPanel.tsx:1133-1140,1224,1232`; `RunChart.tsx:62-63`; `RunCard.tsx:243`; `canvas/BungeRegister.tsx:649-678`; `RunInputs.tsx:327` | token (drop 10 from the vocabulary; charts may keep 10 per DESIGN.md's SVG 8 to 12 allowance, see chart section) | hurts |
| 19 | Source stamps ("edits re-run", "declared · edits re-run", "facets-compose · wasm", "Mobus · describe(model, lens)") wear `--accent-strong`, the action colour, on something you cannot act on; 7 stamps per Readouts screen in teal name nothing | 7, 8 (colour names something) | `ui.tsx:31-33` | primitive | hurts |
| 20 | Review block header is a tinted band (`--accent-soft` fill, border-x border-t) with an 11px mono label at +0.2em, and its gutter numerals sit on the same tint; visual-language says a header is a label over a rule, not a fill | 1 (three neutral surface steps), visual-language rule 2 | `ReviewPanel.tsx:102-120,124-131` | surface | hurts |
| 21 | Dock inputs are 22px tall and selects 21px (under the 24px target); the name field is 112px and truncates "Open-weight serving" to "Open-weight ser" | 11, 6 | `canvas/NodeEditor.tsx:107` | primitive | hurts |
| 22 | Selecting a flow does not read in the Element tab: the dock stays on the last component and a canvas popover opens instead, whose own grounding field clips ("575,897 Gtok ove"). The brief's "select a flow and read the Element tab" has no Element reading of a flow | 15 (one place to read a selection), 6 | `InspectorDock.tsx:33-60` (ELEMENT face keyed on `thing` only); `ReadSheet.tsx:141-143` does carry `relation` | surface | hurts |
| 23 | Table tab: level rows are separated by 4px of whitespace, no rule, no zebra; 11 rows in three groups blend | visual-language rule 3 (discrete rows), 2 | `RunPanel.tsx:1121-1130` | primitive (row rule) | hurts |
| 24 | Table tab mixes sizes in one numeric column: at-cursor value 12px mono in `--accent`, final 14px in `--text-secondary`, so the cursor column reads as a different table | 5 (13/600 numerals), 8 | `RunPanel.tsx:1195-1200`; `RunPanel.tsx:1162-1215` | primitive | hurts |
| 25 | Log table: 660 rows at 16px height, 0 vertical padding, no row rules, 41 columns, Inter 12 without `tabular-nums`, header `th` 700; the cursor row goes bold 600 which reflows every column width as the scrubber moves | 5, visual-language rule 3; Geist and Radix use 32px+ rows (below) | `TickLogTable.tsx:35-73` | primitive (table) | hurts |
| 26 | Three hero numbers in one view: the glance row's 18.4%, then the Table tab's "0 (exact)", "660", "1.0" at 24px mono | dataviz: exactly one hero figure per view | `RunPanel.tsx:109-167, 317-328`; `ui.tsx:94` | surface | hurts |
| 27 | Hero and stat values are JetBrains Mono with `tabular-nums` at 24px ("18.4%", "71.9"): equal-width digits loosen a display number | dataviz: proportional figures for big numbers; tabular only in columns | `RunCard.tsx:147`; `RunPanel.tsx:131,617`; `ui.tsx:94` | token (`.tabular` off for `text-2xl`) | polish |
| 28 | `ample` as an italic value, "data ends at tick 21" italic, `driven by "x"` mono-in-quotes: three different registers for "not a number" in one rail | 5 (two families; italic is not in the vocabulary) | `RunInputs.tsx:58`; `RunPanel.tsx:793`; `ParamControl.tsx:125-130` | primitive | polish |
| 29 | Register (matrix) column headers are rotated 10px mono in an 82px band and the canvas hint strip ("hover a rail chip for what it is…") is painted over them; matrix cells are 30×30, under 44 for touch | 5, 11, 6 | `canvas/BungeRegister.tsx:649-678`; hint strip owner: canvas | surface | hurts |
| 30 | Register chips (𝒞 𝓔 𝒮 M as pills, "ε = 0", "ε itemized", "+ component", "+ env thing") are 20 to 26px high and every one is a pill; the segmented "graph / matrix" uses the lens accent as a filled pill | 3, 8, 11 | `canvas/BungeRegister.tsx:235,376,542-545` | primitive | polish |
| 31 | `--text-muted` on `--bg-primary` (the Readouts ground: axis ticks, legends, rail notes) is 4.39:1 in light, under 4.5 | 7 | `index.css:44,50` | token | hurts |
| 32 | Chart-3 (`#6b74e0`) on `--bg-secondary` is 3.87:1 and all four series sit between 3.9 and 4.9:1; passes the 3:1 mark floor but every series value is also carried only by colour in the Levels legend (no table twin on the Story tab, the Table tab holds end values only) | dataviz: contrast WARN obligates a table view or labels | `RunPanel.tsx:952-1070` | chart | polish |
| 33 | Progressive draw leaves the future curve at 0.25 opacity; on `--bg-secondary` chart-1 at 0.25 is about 1.6:1, a ghost that reads as a gridline | dataviz: contrast vs surface; 13 (motion) | `RunChart.tsx:43` | chart | polish |
| 34 | Readouts "⤡ model" sits 20px from "keep baseline →" and both are 10 to 12px quiet text; Esc is bound but nothing on screen says so except a `title` | 11, 12 | `Readouts.tsx:223-241` | surface | polish |
| 35 | Measurements chip "Measurements" and the status-bar "✓ clean" are pills at 22px; "REPLACE CSV…" is an uppercase mono 11px button with an accent border (a fourth button style on one screen) | 3, 8, 21 (one instrument) | `DataMode.tsx:293-297,534` | primitive | polish |
| 36 | Dock width `basis-96` (384px) at 1024 is 37.5 percent of the viewport; the Read sheet `basis-[32rem]` (512px) is 50 percent, leaving the canvas 440px with the run card on top of it | 16 | `InspectorDock.tsx:258`; `ReadSheet.tsx:152` | surface | hurts |
| 37 | Row-level colour in the Table tab (`--accent` for the at-cursor column, `--verdict-ok` for "declared ✓") and the run card's hero in `--accent-strong`: the action colour is spent on three non-actions | 8 | `RunPanel.tsx:1195,1232`; `RunCard.tsx:148` | token (a `--text-emphasis` ink) | polish |
| 38 | Sparkline in the Element tab: 1.25px stroke, 2.5px marker (5px dot), no scale, no surface ring | dataviz: 2px line, marker >= 8px with 2px surface ring | `ElementMechanism.tsx:17-31` | chart | polish |
| 39 | Verdict and status chips use `--verdict-warning` as a tab badge fill with white ink (5.57:1 light, fine) but the badge is a 10px pill; the charter's one true pill is the verdict chip only | 3, 12 | `ui.tsx:520` | primitive | polish |
| 40 | ReadSheet "clear selection" and "where this comes from" are underlined 11px links; the rest of the instrument has no underline-link style, so two link grammars coexist | 21, 5 | `ReadSheet.tsx:163,222` | primitive | polish |

## Charts

Every run chart mounts `RunChart` (recharts `LineChart`): hairline horizontal grid, no vertical grid, hairline axes, 10px ticks and labels in `--text-muted`, a shared-cursor `ReferenceLine` in `--accent`, no tooltip by design.

### Series palette, measured

| Slot | Light | Dark | Where used |
|---|---|---|---|
| `--chart-1` | `#0d82a6` | `#33a0bf` | 1st entity, alphabetical, per chart |
| `--chart-2` | `#b0642d` | `#c77436` | 2nd |
| `--chart-3` | `#6b74e0` | `#8188e8` | 3rd |
| `--chart-4` | `#4a7a35` | `#699a4e` | 4th |
| `--accent` | `#3d6373` | `#6fa5b8` | run-card headline, MetricRow single series, Fit "executed" |
| `--accent-indigo` | `#545c93` | `#8b93cf` | Fit "actual" line; DTMC state 2 |
| `--accent`, `--accent-indigo`, `--accent-strong`, `--accent-slate`, `--verdict-warning`, `--verdict-error` | | | DTMC `STATE_COLORS`, cycled with `i % 6` |

Validator (`scripts/validate_palette.js`), `--chart-1..4`: light on `#fafafb` ALL PASS, worst adjacent CVD ΔE 16.9 (protan), normal-vision 22.6; dark on `#1d2022` ALL PASS, worst adjacent 18.7 (deutan), normal 23.4. The series tokens are sound; keep them. For comparison the `--kind-*` set FAILS as a categorical palette (field vs informational ΔE 1.6 under deutan, chroma floor 0.092 and 0.099), which is fine because kind is never a series, but it means a flow colour must never leak into a chart.

What the skill says should change:

1. **Colour follows the entity, not its row.** `colorOf` assigns slots by alphabetical index inside each chart (`RunPanel.tsx:398-399, 500, 983`), so "Router" is chart-3 in Levels and would be chart-1 alone; the run-card headline draws the same series in `--accent` that the Story draws in `--chart-1`. One model-wide entity → slot map (sorted once over all plotted entities) and the headline in that entity's slot. (chart)
2. **Never cycle.** `LevelsChart` wraps with `CHART_SERIES[i % 4]` (`RunPanel.tsx:983`) and `DtmcPanel` cycles six accent and verdict tokens (`RunPanel.tsx:806-813, 882`). A fifth stock folds to "Other" or facets by unit family (already grouped); the DTMC states take `--chart-1..4` and status tokens leave the series role entirely (status never impersonates a series). (chart)
3. **Legends.** Present for every >= 2-series chart (good, with endpoint values in text ink, good). Remove the one-swatch legend on single-series charts ("level · Routed buyers", MetricRow) where the title already names the series. Swatch is a 12×2px line; the Fit legend's 24×8 `LegendSwatch` mirrors dash and width, keep that one. (chart)
4. **Axis ticks.** `axisTicks` emits every 25 for n > 120 and recharts then drops colliding labels unevenly, giving "0 25 50 75 125 175 225 … 625 659" (`RunChart.tsx:48-54`): pick a step so at most 8 labels fit the plot width, and always include the last. Y ticks are raw ("3800000", "2850000", "19500"); compact from 1,000 (3.8M, 2.85M, 19.5K). The rotated y label ("Gtok/day") collides with wide tick labels because `YAxis width` is fixed at 52 (`RunChart.tsx:111`); measure the widest tick or put the unit in the title line only. Ticks at 10px are allowed by DESIGN.md's SVG vocabulary; Observable Plot also uses 10px, so this is the one place 10 stays. (chart)
5. **Hover layer.** The skill ships a crosshair plus tooltip on every line chart by default; here scrubbing is the crosshair but no chart states its value at the cursor (only the glance row does, for two quantities). Add the value-at-cursor to each chart's legend line (the leaderboard already has the slot) so the cursor reads on every chart, and keep the no-tooltip decision. Keyboard: the scrubber is a range input and gets a ring; the charts themselves have no focusable element, acceptable with the legend readout. (chart)
6. **Marks.** Lines are 2.5px (spec 2px); baseline dashed, actual dashed, declared dotted encode role, which is legitimate secondary encoding, but `6 4` and `4 4` dashes on the forecast boundary read as "projection" in the Fit chart where the region is literally a projection, fine; the `ReferenceArea` wash is `--text-muted` at 0.06, keep. (chart)
7. **Fit chart form.** The bound data covers ticks 0 to 21 of 659, so the observed window is 3 percent of the x range and the "100 percent off" comparison is invisible at the left edge. Fit should plot the observed window (0 to 21, plus a short tail) with the executed curve clipped to it, and state "the remaining 638 ticks run past the data" as text, which it already does. (chart)
8. **Hero figure.** One per view: the glance row's share. The Table tab's three 24px stats become 13/600 numerals in a row. (surface)
9. **Dark.** The series tokens are selected for dark (validated), but the grid and axes vanish (finding 4) and the future-curve ghost at 0.25 drops below 2:1. (token)

**The one headline chart (run card).** The right form is what it is: a single line of the lead metric over time with the at-cursor value as its header. Fix list for it alone: series in the entity's slot not `--accent` (`RunCard.tsx:189,200`), 2px stroke, compact y ticks, 7 or fewer x labels at 262px plot width (today 10 labels in 262px, "25 100 175 … 659"), the "share" y label as part of the header line ("Open-weight share, routed · share") and the axis unlabeled, height 140 kept, grid two lines only (0.5, 1). At 390 the card is the canvas; the chart should be the card's only beat with the knobs below the fold, or the card should become a bottom sheet.

## Exemplar numbers measured

Fetched for numbers only.

| Source | What | Value |
|---|---|---|
| Radix Themes 3.2.1 `styles.css` | space scale | 4, 8, 12, 16, 24, 32, 40, 48, 64 px (matches charter rule 4) |
| Radix Themes | font sizes 1 to 4 | 12, 14, 16, 18 px |
| Radix Themes Table | cell padding size 1 / 2 / 3 | 8 / 12 / 12×16 px; row divider `inset 0 -1px var(--gray-a5)` (an alpha hairline, visible on any surface) |
| Radix Themes Tabs | trigger height size 1 / 2 | 32 / 40 px (`--tab-height: --space-6 / --space-7`); inner padding 4 / 8 px |
| Observable Plot 0.6.16 `axis.js` | tick size, tick padding, grid opacity | tickSize 6; tickPadding `max(3, 9 − tickSize)` = 3; grid `opacity = 0.1` of currentColor (a true hairline, not a near-white) |
| Observable Plot `swatches.js` | legend | 10px system-ui, swatch 15×15, `margin-right: 1em` per item |
| Geist table docs (vercel.com/geist/table) | numeric alignment | `tabular-nums` or Geist Mono on numeric columns; striped / bordered / interactive as body flags; no px published |
| Linear (linear.app) | side panel | docs page 404 and marketing page carries no numbers; not measured |
| Stella (iseesystems.com) | run surfaces | marketing copy only (graphs, tables, sliders, knobs, run comparison); no numbers published |

Facets today against those: table rows 16 to 21px (Radix 32+), tab triggers 37px (Radix 32 or 40, fine), tick font 10 (Plot 10, fine), grid hairline 1.14:1 (Plot's 0.1 opacity on ink is about 1.4:1 on white and scales with the surface, which is why it survives dark).

Contrast table, computed from the tokens as they resolve in the running app (WCAG 2 ratio):

| Pair | Light | Dark |
|---|---|---|
| text-muted on bg-secondary | 4.72 | 4.47 |
| text-muted on bg-primary (Readouts ground) | 4.39 | 4.85 |
| text-secondary on bg-secondary | 8.81 | 7.85 |
| accent on bg-secondary | 6.23 | 6.05 |
| accent-strong on bg-secondary | 8.95 | 8.60 |
| accent-strong on accent-soft (system chip) | 7.06 | 7.29 |
| verdict-ok / warning / error on bg-secondary | 5.55 / 5.57 / 5.24 | 6.98 / 7.34 / 6.00 |
| text-on-accent on accent | 6.50 | 6.57 |
| chart-1 / 2 / 3 / 4 on bg-secondary | 4.23 / 4.28 / 3.87 / 4.88 | 5.40 / 4.66 / 5.16 / 4.94 |
| accent-indigo (Fit "actual", DTMC) | 6.05 | 5.59 |
| hairline on bg-secondary | 1.14 | about 1.08 (alpha 0.376) |
| border on bg-secondary | 1.31 | 1.38 |
| bg-surface (cursor row) on bg-primary | 1.10 | 1.20 |

Two text pairs miss 4.5 (muted on bg-primary light 4.39; muted on bg-secondary dark 4.47); every hairline and surface step is under 1.4:1, which is why rows and grids do not separate.

## Screenshots

All under `/private/tmp/claude-501/-Users-home-vault/c399e3e2-1755-476f-baa0-965c9b5ae3fd/scratchpad/makeover/shots/`. "1440" files are the 1440 window at 90 percent zoom (1600 CSS px); "1024+390" files show two iframes at exactly 1024×768 and 390×844 side by side.

- `readouts-runcard-build-1440-light.png`, `readouts-runcard-zoom-1440-light.png` (the headline chart close up)
- `readouts-story-1440-light.png`, `readouts-fit-1440-light.png`, `readouts-table-1440-light.png`, `readouts-log-1440-light.png`
- `readouts-readsheet-1440-light.png`, `readouts-readsheet-analyst-1440-light.png` (Read mode: Review band, Formal, Analyst)
- `readouts-dock-element-component-1440-light.png` (Element tab, Open-weight serving selected, mechanism and sparkline)
- `readouts-flow-popover-not-dock-1440-light.png` (a flow click opens a popover; the dock does not change)
- `readouts-measurements-1440-light.png`
- `readouts-bunge-graph-1440-light.png`, `readouts-bunge-register-1440-light.png`, `readouts-bunge-register-1440-dark.png`
- `readouts-runcard-dock-1440-dark.png`, `readouts-story-1440-dark.png`, `readouts-story-zoom-1440-dark.png` (grid gone), `readouts-story-readmode-1440-dark.png`
- `readouts-runcard-dock-1024+390-light.png`, `readouts-story-1024+390-light.png`, `readouts-log-1024+390-light.png`, `readouts-readsheet-1024+390-light.png`, `readouts-measurements-1024+390-light.png`
- `readouts-runcard-dock-1024+390-dark.png`, `readouts-story-1024+390-dark.png`
- `readouts-write-mode-1440-light.png` (the model as it opens, before Build)

Not captured: the Bunge state-space readout and the DTMC panel (this model cannot run under Bunge; no chain model opened), and a 390 Measurements table (it does not render, finding 8).
