# The Steel-Plant walk — demo script

**Status: LIVE.**

A live-demo companion for showing George Mobus his own ch. 4 procedure running
end to end: open the Steel-Plant, decompose it, and walk the hierarchy —
Fig. 4.16's transparent box, Fig. 4.17's inventory room — with the boundary
contract checked at the seam.

Two shipped artifacts carry it, both editorial (the citation-gated corpus
entry `assets/corpus/mobus/steel-plant.sl` is untouched and stops at Fig. 4.14
on purpose):

| Level | Model | Where it ships |
|---|---|---|
| 1 | Steel-Plant (Figs. 4.15 + 4.16: six boundary interfaces, four subsystems) | `assets/walkthroughs/steel-plant/level-1.sl` — the root, registered on the examples shelf |
| 2 | Iron-Inventory (Fig. 4.17: pumps, stock, sensor, decider) | `assets/walkthroughs/steel-plant/level-2.{sl,json}` — bundled shelf |

Until 2026-10-09 a level 0 stood above these: the plant as one component
inside a frame named for the plant, every crossing on it, decomposing into
level 1. It was removed under #308 — a system drawn as a component of itself
is a wrapper, not a level, and its seam could not fail. Fig. 4.14's opaque box
is the root with its interior hidden, and the corpus entry keeps the figure.

The hierarchy needs no setup: the root's `decomposes @id` reference resolves
against the bundled shelf (`web/src/walkthroughs.ts`), so the walk works in a
fresh browser with an empty library. The seam is held clean in CI by
`crates/bert-lenses-kernel/tests/steel_walkthrough.rs`.

## The click path

1. **Home → Open a model → "The Steel-Plant, two levels deep".**
   (The card is registered by hand in `web/src/examples.ts`; the file is
   `assets/walkthroughs/steel-plant/level-1.sl`, and `Open a file…` on it
   still works.) It opens Figs. 4.15 and 4.16 at once: the six transaction
   partners of level −1 ringing the membrane, F-numbers on every flow,
   substances from Listing 4.1's own subtype attributes; on the membrane,
   Fig. 4.15's six interfaces (FuseBox, the two loading docks, the two
   shipping docks, Ventilation); inside, Fig. 4.16's four subsystems,
   including Material-Purchasing — the messages-only hybrid interface, "an
   often overlooked one in real life."

   *Say:* this is the SOI as a transparent box. The sources and sinks are
   drawn as systems in their own right — the same promotion his Listing 4.4
   makes when it writes Src-1.1 into Iron-Inventory's environment. The
   message traffic (purchase orders out, shipping documents in) is
   Listing 4.1's `subtype=MESSAGE` announcement, cashed early so the seam
   below can carry it. The opaque box of Fig. 4.14 is this same model seen
   from outside; it is not a separate document (#308).

2. **Click Iron-Inventory.** The node inspector shows
   `decomposes "Iron-Inventory"` with an **enter** affordance — the door is
   already stamped.

3. **Say what the seam will check before you open it.** The boundary contract
   from the Lean `Decomposition` structure: same number of crossings in and
   out, kind for kind, and the child's environment must be exactly the
   parent's neighborhood of the decomposed component, name for name.

4. **Double-click Iron-Inventory.** The view dives through the component and
   the level-2 model arrives; the breadcrumb reads
   `✓ Steel-Plant › Iron-Inventory`, and the ✓ is the kernel's live verdict
   on the seam, not decoration. Fig. 4.17's room: Move-In and
   Move-Out (the pump shapes, Propelling), Iron-Stock (Buffering, stock unit
   tons from Listing 4.3's `units=TONS`), the Level-Sensor on the stock, and
   the Inventory-Decider — Listing 4.4's `type=AGENT` — managing both pumps
   and sending the purchase request out through the membrane to
   Material-Purchasing.

   *Say:* this is the recursion of Eq. 4.3 made navigable — every subsystem a
   system in its own right, with its own boundary, its own environment (the
   level-1 neighbors, exactly), and its own faster clock: `time unit week`,
   Listing 4.4's `delta_t WEEKLY`, against the parent's month.

5. **Breadcrumb back up.** Click `Steel-Plant`. The exit re-runs the seam
   check against the stored child — the ✓ glyph is recomputed, not remembered. Reduced-motion users get instant swaps; everyone
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
- **The node inspector** on a decomposed component names its child. Interface
  components decompose too since #307 lifted the v1 refusal (the crossing
  contract transcribed from SSF #43) — the walkable box at level 1 being an
  interior component is a fact about this model, not a limit of the contract.

## If something looks wrong

- A ⚠ on a breadcrumb segment means a seam violation — check the review panel;
  every row navigates to its component. The shipped models cannot do this
  (CI holds the seam clean); a library model shadowing a pinned id can.
  Deleting the like-named library records restores the shipped resolution.
- The walk saves nothing at these levels unless a model is edited: exits
  autosave dirty models only, and only into named library slots.
