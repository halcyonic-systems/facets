# The Steel-Plant walk — demo script

A live-demo companion for showing George Mobus his own ch. 4 procedure running
end to end: open the Steel-Plant, decompose it, and walk the hierarchy —
Fig. 4.14's opaque box, Fig. 4.16's transparent box, Fig. 4.17's inventory
room — with the boundary contract checked at every seam.

Three shipped artifacts carry it, all editorial (the citation-gated corpus
entry `assets/corpus/mobus/steel-plant.sl` is untouched and stops at Fig. 4.14
on purpose):

| Level | Model | Where it ships |
|---|---|---|
| 0 | Steel-Plant — Deep Systems Analysis (opaque SOI among its six transaction partners) | `assets/examples/steel-plant-walk.sl` — the examples gallery, genus Technical |
| 1 | Steel-Plant (Figs. 4.15 + 4.16: six boundary interfaces, four subsystems) | `assets/walkthroughs/steel-plant/level-1.{sl,json}` — bundled shelf |
| 2 | Iron-Inventory (Fig. 4.17: pumps, stock, sensor, decider) | `assets/walkthroughs/steel-plant/level-2.{sl,json}` — bundled shelf |

The hierarchy needs no setup: the parent's `decomposes @id` references resolve
against the bundled shelf (`web/src/walkthroughs.ts`), so the walk works in a
fresh browser with an empty library. Both seams are held clean in CI by
`crates/bert-lenses-kernel/tests/steel_walkthrough.rs`.

## The click path

1. **Home → Examples → Technical → "Steel-Plant — Deep Systems Analysis".**
   The card opens Fig. 4.14 at the chapter's own pause: one Combining process
   among the six entities of level −1, F-numbers on every flow, substances
   from Listing 4.1's own subtype attributes.

   *Say:* this is the SOI as an opaque box. The one departure from the figure
   is that the sources and sinks are drawn as residents, because each is a
   system in its own right — the same promotion his Listing 4.4 makes when it
   writes Src-1.1 into Iron-Inventory's environment. The message traffic
   (purchase orders out, shipping documents in) is Listing 4.1's
   `subtype=MESSAGE` announcement, cashed early so the seam below can carry it.

2. **Click the Steel-Plant component.** The node inspector shows
   `decomposes "Steel-Plant"` with an **enter** affordance — the door is
   already stamped.

3. **Double-click Steel-Plant.** The view dives through the component and the
   level-1 model arrives: the breadcrumb appears —
   `✓ Steel-Plant — Deep Systems Analysis › Steel-Plant` — and the ✓ on each
   segment is the kernel's live verdict on that descent's seam, not
   decoration.

   *Say:* the seam is the boundary contract from the Lean `Decomposition`
   structure: same number of crossings in and out, kind for kind
   (five in — one energy, two matter, two message — five out), and the child's
   environment must be exactly the parent's neighborhood of the decomposed
   component, name for name. Point at the six stand-ins ringing the model:
   Energy-Source through ATMOSPHERE, the level-0 residents seen from inside.
   Then point at what the level reveals: Fig. 4.15's six interfaces (FuseBox,
   the two loading docks, the two shipping docks, Ventilation) and Fig. 4.16's
   four subsystems, including Material-Purchasing — the messages-only hybrid
   interface, "an often overlooked one in real life."

4. **Double-click Iron-Inventory.** Second dive; the breadcrumb reads
   `✓ … › ✓ Steel-Plant › Iron-Inventory`. Fig. 4.17's room: Move-In and
   Move-Out (the pump shapes, Propelling), Iron-Stock (Buffering, stock unit
   tons from Listing 4.3's `units=TONS`), the Level-Sensor on the stock, and
   the Inventory-Decider — Listing 4.4's `type=AGENT` — managing both pumps
   and sending the purchase request out through the membrane to
   Material-Purchasing.

   *Say:* this is the recursion of Eq. 4.3 made navigable — every subsystem a
   system in its own right, with its own boundary, its own environment (the
   level-1 neighbors, exactly), and its own faster clock: `time unit week`,
   Listing 4.4's `delta_t WEEKLY`, against the parent's month.

5. **Breadcrumb back up.** Click `Steel-Plant`, then the root segment. Each
   exit re-runs the seam check against the stored children — the ✓ glyphs are
   recomputed, not remembered. Reduced-motion users get instant swaps; everyone
   else gets the dive/rise choreography.

6. **Optional coda — show the text.** Open the SL pane at any level: every
   modeling choice is justified in the file's own comments, with the figure
   and listing citations inline. The `decomposes "Iron-Inventory" @…` line is
   the whole mechanism: a name for humans, an id for the store, a contract for
   the kernel.

## Where the glyphs live

- **Breadcrumb segments** (only while walking): ✓ seams hold / ⚠ violations,
  per level, kernel-fed (`SeamGlyph` in `web/src/App.tsx`).
- **The verdict pill** on the control strip folds seam issues into the same
  list as every other validation verdict; a broken referent is as loud as a
  dangling flow.
- **The node inspector** on a decomposed component names its child; on an
  interface component it explains v1's refusal instead (the Lean contract
  covers the internal network only — which is why the walkable boxes at
  levels 0 and 1 are interior components).

## If something looks wrong

- A ⚠ on a breadcrumb segment means a seam violation — check the review panel;
  every row navigates to its component. The shipped models cannot do this
  (CI holds both seams clean); a library model shadowing a pinned id can.
  Deleting the like-named library records restores the shipped resolution.
- The walk saves nothing at these levels unless a model is edited: exits
  autosave dirty models only, and only into named library slots.
