# One surface: the sandbox folds into the model

**Status: ADOPTED (2026-10-27, owner's call).** Supersedes decision 1 of
[`sandbox-surface.md`](sandbox-surface.md) (the sandbox as its own Home door).
Decisions 2 and 3 there stand. Built on branch `design/makeover`.

## The call

Home offers two things: start a model, or open one. Drawing, describing and
wiring processes are three ways of working on the same model, chosen on the
blank canvas, not three doors. The sandbox's defining act (drop processes,
wire them, press Run, turn a knob and watch the flow answer) becomes something
the Model surface does on any model, not a separate place.

## What was already one

The gap was narrower than the two doors suggested. Before this change:

- The Build tool rail already carried the ten process primitives.
- Run already worked from declared amounts alone, no data needed (#463 move 1).
- The Model run already lived on a held engine session (`Bench`, #463 move 2)
  built on the same engine `Session` as the sandbox, with knobs addressed by
  the names the author sees.
- A kept baseline already existed on the Model surface (#463 move 4).
- A saved sandbox was already an ordinary WorldModel (`sandbox-surface.md` §1).

## What the sandbox had that the Model surface lacked

| Sandbox behaviour | On the Model surface after this change |
|---|---|
| The run keeps going until paused | **Run on** (below): play past the last recorded tick steps the engine live |
| A knob turned mid-run takes effect at that tick, stocks kept | While running on, a knob applies at the engine's current tick; no reset |
| A structural edit mid-run opens an epoch, trace kept | Not carried: a structural edit re-runs from the document, as before |
| Troncale stamps | Not carried yet |
| Declare-conservation toggle | Not carried; the ledger verdict chip stays |
| Live fork as baseline | The Model surface's frozen-readout baseline stands in |

The three not carried stay reachable at `?sandbox=1`, which still opens the
sandbox surface exactly as before. Nothing is removed; only its Home door goes.

## Run on

- **Scope.** A conservation run with no CSV bound (unforced). A forced run
  is driven by its data and ends where the data ends, so it plays once as
  before. A Markov run (Klir, behind its flag) is unchanged.
- **Behaviour.** Run steps the engine to the run length T and plays that
  trace; with Run on set, playback does not rest at the last tick: each
  further frame asks the engine for one more tick (`Bench.step(1)`) and the
  readout grows. Pause stops it; Play resumes from the last tick. The
  scrubber still only indexes; the parent steps the engine.
- **Knobs.** With Run on set and a run on screen, an amount or engine-field
  edit is applied to the held session at its current tick, and the run
  continues from there; `Bench.edits()` logs it at that tick. With Run on
  unset, the old grammar holds: reset, apply, re-step to T.
- **The switch.** A toggle on the transport, on by default. Off restores the
  play-once posture of the 2026-10-09 feel-test exactly.
- **Bounds.** Running on stops itself at 5,000 ticks with a notice, so a
  forgotten tab does not grow a trace without limit; the transport pauses
  while the tab is hidden, as the sandbox clock did.
- **Records.** The run record is written when running on stops (pause, the
  bound, a re-run), not every tick.

## Home and the blank canvas

- Home: one **New model** door (blank canvas) and **Open a model**. The
  Draw/Describe pair and the Sandbox door go.
- The blank canvas's start dialog names the three ways in: describe it (the
  co-author), draw it by hand, or wire processes and run. The last two open
  Build; describing opens Write, as before. Open an example stays.

## Follow-ups, not in this change

- Epochs on the Model surface: a structural edit while running on should open
  an epoch instead of re-running (engine support exists in `Session`; `Bench`
  does not expose structure edits yet).
- Troncale stamps on the Build rail.
- Retire the sandbox surface once the three rows above are carried.
