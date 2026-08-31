# Workbench declutter — ranked options

*2026-08-31 session observation, from live screenshots of the loaded
workbench (Bitcoin model, Mobus lens, 1200px viewport). Proposal only — each
item below touches a surface that carries a deliberate prior decision, so
nothing was changed without triage.*

The operator's read: the model app is "a bit clunky and overcrowded." The
crowding is real but most of it is *decided* crowding: #345 dissolved the
control strip upward into the menu bar, and the lens question was already
quieted once (2026-08-12, "orientation, not a headline"). So the options are
ranked by how much they relitigate.

## 1. Menu bar hierarchy, not population (low relitigation)

The bar holds ~12 items at near-uniform visual weight: wordmark, HOME, FILE,
SWITCH, title, Model/Data axis, lens axis, REVIEW, issues chip, SL, pinned.
The population is #345 doctrine; the *flat hierarchy* is not. Options that
keep every control where it is:

- Group separation: let the three clusters (navigation / identity / axes+
  verdict) breathe — wider gaps between clusters, tighter within.
- Weight ladder: navigation entries (HOME, FILE, SWITCH) one step quieter
  than the axes; REVIEW keeps its filled emphasis as the one primary action.
- The `pinned` / `✓ clean` status chips could share a single slot (status is
  one word at a time).

## 2. Lens question row (medium — it survived one quieting already)

The question rents a full-width row (~30px) below the bar. Keeping the row
but right-aligning the question into the same visual band as the palette
header, or docking it as the first line of the inspector, would return the
vertical space without silencing the question. Counterargument on record:
it is the orientation device for a first-time reader.

## 3. Palette prose (medium)

"CONNECT — A GESTURE" + "drag the handle dot off a node" +
"THE KERNEL DRAWS THESE" are teaching text that every returning modeller
re-reads. An "expert mode" collapse (remember-in-localStorage) that reduces
the palette to its chips would declutter for the second session onward
without costing the first.

## 4. DESIGNATE chip legibility (small, independent)

Ten two-letter chips (Bu, Mo, Sp, Cm, Im, Pr, Cp, Se, Am, In) are opaque
until hovered. Tooltips-on-first-visit or a one-line legend under the group
would help without widening the palette.

## Not proposed

Removing controls from the bar (reverses #345), removing the lens question
(reverses #100/#7/#309 chain), or restyling the canvas itself (the lens/KIND
channels are kernel semantics).
