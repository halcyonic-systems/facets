# New-user walk: the run

**Status: RESEARCH.** A running log of what a first-time user hits while building and running a model, in the order Shingai found it, started 2026-11-02. Each row says what was seen, why it happens, and where it stands. It feeds the run surface redesign; it is not itself a decision.

The walk so far: draw an environment object, an interface, a Splitting process, a Buffering process, an interface and a second environment object, wire them, and press Run.

## The pattern

A model drawn on the canvas has no visible place for its numbers. Starting levels, rates and drains exist only in SL, or as knobs that appear after something has been declared, so the run looks fixed and the user cannot tell what to change. Most rows below are that one gap seen from a different place.

## Log

| # | What the user saw | Why | State |
|---|---|---|---|
| 1 | Rewinding left the middle stocks and the input object half full; only the output object went back to empty | Fill was each node's place between its own run minimum and maximum, and a level that never moved was drawn at exactly half. The middle stocks sat at 0 the whole run (the readouts chart showed 0) | **Fixed** (`design/run-walk`): fill measures from zero (`levelFrac`, `web/src/canvas/types.ts`), so an empty stock draws empty and the canvas agrees with the chart |
| 2 | No way to set the input object's starting amount | A source has no store in the language; it emits a rate. The canvas still drew it as a tank, because the "source emits, never fills" rule read the author's word, and a drawn object has none (it is neutral; the kernel files it as a source only when it runs) | **Fixed**: the kernel now reports `source_thing_ids` (its own filing, read off the projection), and the canvas draws those as emitters |
| 3 | No place to set the rate of the flow | The rate is the flow's `amount`. The inputs listed only flows with a declared amount, and the element inspector's flow line ("1 at tick 13") looks like a slider but is a read-only readout | **Fixed for source flows**: an unset source flow is listed under Inputs with an empty "not set" field; typing a number declares the amount. Checked in the browser: typing 3 re-ran at 3 per tick. The inspector readout is still slider-like (open) |
| 4 | No knob for a component's starting level or drain | The inputs list declared engine fields only. An unset field runs on the engine's default, which the model does not carry | **Open.** Proposal: show every knob at the engine's default, marked as a default, and declare the value when it is moved. Needs the defaults exported from the kernel, since the face may not hold them |
| 5 | "run on" means nothing | The label names the mechanism (keep stepping past the run length, knobs land mid-run) rather than what it does for the user | **Open**, part of row 7 |
| 6 | Compiled the SL and still saw nothing to adjust | Same cause as 3 and 4, and the inputs sit behind the readouts expander | **Partly fixed** by 3; where inputs live is row 7 |
| 7 | The run controls are in three places | Run, step, run on, rewind and scrubber on the bottom bar; a run box top right (level, step size, run length, readouts); and the same transport again in the readouts header | **Open: design call.** One entry point to the run, and a run panel with one clear purpose |
| 8 | The empty readouts told a canvas user to write an SL line | The no-metrics hint was written for SL authors | **Fixed**: plain words, names the sink (by the kernel's source set when the object is unworded) and where the SL pane is. A canvas way to add a metric does not exist yet (open) |
| 9 | The chart has no units, and its legend read "T1 0" | A drawn stock has no unit declared | **Open** |
| 10 | After a knob edit, the SL pane still showed the old text with no amount | The pane keeps the author's text; its button then offered "Layout only". Not yet checked what the text becomes on its next sync | **Open**: found while checking row 3 |
| 11 | A knob typed while the run played with run on gave totals that matched neither rate (input object "1.8") | Run on applies a knob from the current tick, so the table's totals mix the two rates, with nothing saying so | **Open**, part of row 7 |
| 12 | Pasted SL in Write, compiled, went to Build: the components inside the system were missing, every time, until a second compile | The canvas went into the opaque view on arrival. A new model re-armed the "zoom out past the membrane" gesture, and Build's first frame, drawn at a provisional scale (0.25) before the fit, read as that zoom-out. Measured: 102 px extent in a 727 px view | **Fixed**: the gesture arms on arrival only inside a child, where #416 needed it (`armsOnArrival`, `web/src/canvas/frameRebase.ts`). Checked in the browser with the exact SL; zooming out on purpose still goes opaque |
| 13 | Inputs empty, levels flat at 0, for a model whose input flow is `informational` | A signal carries no quantity, so nothing material enters and the stocks stay empty; a signal with no declared amount is not listed. Right by the rules, but nothing tells the user why the run is empty | **Open.** The run should say plainly that no material enters the system |
| 14 | Run length read T = 1 in that model's readouts | Not yet traced | **Open** |
| 15 | A paste into Write does nothing until Compile; leaving for Build shows the previous model | Compile is explicit (button or ⌘⏎) | **Open**: design call, whether Write should compile on its own |

## How the fixes were checked

`just check` green on `design/run-walk`: Rust tests (one new, on the source filing), web tests (six new, on the fill and the drawn-model inputs), clippy, the wasm boundary checks. The contract and CLI goldens were re-blessed; their diffs add only `source_thing_ids`. In the browser, a drawn-shape model (neutral input, Buffering, neutral output, no amounts) now shows the input as an emitter, lists its rate under Inputs, and runs at a typed rate.
