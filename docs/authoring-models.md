# Authoring models that run

**Status: LIVE.** The author's path from a description to a running, gated,
gallery-visible model — and the five facts that bite everyone once. Written
after the first real SL-authoring session (Watershed and Supply Chain,
2026-07-27, #258/#259/#261); every trap below was hit that night, and every
mitigation named here now exists.

For *using* the app, start at [`quickstart.md`](quickstart.md). For the
language itself, [`language/spec.md`](language/spec.md) is normative. This doc
is the working loop between them.

## The short path (a structural model)

Write a `.sl` file. The grammar is small and the parser's error messages state
the exact clause syntax whenever you miss — lean on them; they are the
documentation. Crib from [`../assets/examples/`](../assets/examples/)
(`watershed.sl` is the smallest runnable one; `predator-prey.sl` shows
environment mediation). Drop the file in `assets/examples/` and it self-sorts
into the gallery by its `system "…" : Kingdom/Genus` line. That's it — it opens
as a diagram under all three lenses.

## The full path (a model that RUNS in the gallery)

A runnable gallery entry is three artifacts, and the model one is **never
hand-written**:

1. **The `.sl` file** in `assets/examples/` — the SOURCE. Declare a `time unit`,
   put `amount <n> unit <u>` on the source-originating flows, `primitive` on
   components, `interface` where flows cross the boundary.
2. **The minted model** in `assets/models/demos/<name>.json` — the machine
   projection of your `.sl`. Mint and re-mint with
   `BLESS_SL_DEMOS=1 cargo test -p bert-canvas --test sl_demos`
   after adding your name to the `DEMOS` list in
   [`../crates/bert-canvas/tests/sl_demos.rs`](../crates/bert-canvas/tests/sl_demos.rs).
   That gate then holds, forever: the `.sl` parses → projects → runs conserved
   and Δt-invariant, and the stored model equals the current projection (edit
   the `.sl` without re-minting and CI fails, so the diagram and the run can
   never drift apart).
3. **The bundle** in `assets/demos/<name>.json` — title, blurb, genus, horizon
   `t`, a forcing CSV, and a mapping. The same gate runs your actual bundle
   through `force_and_run`, exactly the call the Run button makes, so a bundle
   mistake fails in CI rather than at click time.

The web gallery picks all of this up by glob; no registration code.

## The five facts that bite

1. **A flow must land where its substance is read.** Each primitive consumes
   specific substances (Mobus Figs 3.18–3.19): a `Combining` ignores messages,
   a `Copying` ignores matter. A flow into a deaf receiver is delivered every
   step and *ignored* — the model validates, runs, conserves, and regulates
   nothing. `check_flows_are_consumed` (#261) now warns with a fix-shaped hint;
   take the warning seriously, it found a shipped demo's dead control loop.
2. **A sensor's coupling to a stock is `: matter`.** Sensing is the
   substance-crossing primitive — a physical quantity in, a signal out. Declare
   the level-read flow `matter` (it is a non-draining observation tap); the
   `informational` part is everything *downstream* of the sensor.
3. **`amount` is an absolute rate only on source-originating flows.** On flows
   out of processes it is a *relative weight* for the fanout split; the actual
   outflow of a stock is its `release`/time-constant behavior. Don't decorate
   downstream flows with amounts and expect them to act.
4. **Stocks start at zero.** SL's `stock <unit>` declares a unit, not a value —
   an initial stock value is typed parameter territory, gated on
   [#112](https://github.com/halcyonic-systems/bert-lenses/issues/112) (C2).
   Until then, author systems that fill from empty, or force them.
5. **Feedback loops need memory on the loop.** Wires transmit; stocks remember
   (#259). A loop is well-posed when it passes through a stock's level read; a
   loop of pure relays has no deterministic step and the run **refuses with the
   loop named**. Time is honest everywhere else too: rates are per `time unit`,
   and a run's totals don't depend on Δt (`dt_invariance.rs` holds this).

## Where the semantics live

Authority order when a question gets deep: the `circuit.rs` module header
(update rule, conservation ledger), [`language/spec.md`](language/spec.md) §8
(what SL declares vs what engines interpret), and the gates themselves —
`sl_demos.rs`, `dt_invariance.rs`, and `scripts/mutation_check.py`, which
proves the gates can fail.
