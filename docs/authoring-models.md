# Authoring models that run

**Status: LIVE.** The author's path from a description to a running, gated,
gallery-visible model — and the five facts that bite everyone once. Written
after the first real SL-authoring session (Watershed and Supply Chain,
2026-07-27, #258/#259/#261); every trap below was hit that night, and every
mitigation named here now exists.

For *using* the app, start at [`quickstart.md`](quickstart.md). For the
language itself, [`language/spec.md`](language/spec.md) is normative. This doc
is the working loop between them.

## What actually makes a model run

Excavated in the #318 library consolidation by putting every bundled model
through `bert run` and sorting the answers. Eighteen examples, eight of which
ran; the ten that did not stopped at one of exactly **three** gates, in this
order. Nothing else stops a model, and one thing widely assumed to stop one does
not.

**Gate 1 — the lens, before anything about the contents is read.** `@lens`
selects the representational mode (`Lens::mode()`): Klir → Core, Bunge →
Structural, Mobus → Operational. Only Operational carries flow semantics, so
**only a Mobus-pinned model can reach `run` at all.** Six of the ten stopped
here, and all six were every non-Mobus model in the library — three Klir, three
Bunge, no exceptions either way. This is not a defect in those files. It is a
statement about which tradition they are written in, and the fix is a modelling
decision, not a repair. (The one door around it is `run_markov`, which reads a
Klir canvas as a DTMC. Different call, different meaning: it conserves
probability, not substance.)

**Gate 2 — the operational projection.** Under Mobus, `validate_operational`
must yield a spec: every component needs a `primitive`, every boundary-crossing
flow needs an `interface`, and endpoints must be typed in the *declared*
direction. The steel-plant walk stopped here on one line — its purchase-order
flows run **into** `source Iron-Source`, and a source originates flow.

**Gate 3 — no algebraic cycle** (#259). `Circuit::eval_order` topologically
sorts same-step dependencies, and a pushed wire adds a dependency edge *unless
the receiver reads state instead of input*: an observation tap, a gradient wire,
a `Source`'s emission, or a **non-Message inflow into a `Buffering` receiver**.
So a loop is well-posed exactly when it passes through a stock read as a level.
Three stopped here.

The last clause of gate 3 is the sharp part, and it is easy to get wrong:

> **The substance on the loop's return leg decides it, not the presence of a
> stock.** A `Buffering` component fed `informational` around the loop is still
> an algebraic cycle. Only a *physical* inflow (matter or energy) lets the
> receiver read start-of-step storage instead of this step's input.

Verified with a separating pair — identical topology, identical stock, one word
different: `flow Valve -> Store : matter "return"` runs; `flow Valve -> Store :
informational "return"` is refused, naming `Store → Valve`.

**And what is NOT a gate: quantities.** `archive/respiring-cell.sl` declares no
`time unit`, no `amount`, no `stock`, and no parameter of any kind, and it runs
— because its flow graph is acyclic, so gate 3 has nothing to fail on.
Parameterization decides whether a run is *meaningful*; it has never decided
whether one *happens* (#216, already withdrawn once).

Which leaves two shapes, and among the eight that ran there were only these two:

- **acyclic** — the component flow graph is a DAG. Nothing further is needed.
- **cyclic with a `Buffering` on every cycle**, taking its loop inflow as
  matter or energy.

The clearest way to see gate 3 is the pair the archive keeps deliberately:
`archive/thermostat.sl` is the textbook control loop and it is **refused**,
because `Furnace → Sensor → Thermostat → Furnace` is a loop of pure relays. The
repair is not a parameter — it is a **missing thing**. The room is the regulated
variable and it is not in the model, so the loop has nowhere to remember.
`assets/archive/demos/homeostat.json` is the same system with the room present as a
`Buffering` component between the valve and the thermostat, and it runs and
converges. If a loop refuses, the first question is not "which stock do I add"
but **"what is the regulated variable, and did I forget to draw it?"**

## The short path (a structural model)

Write a `.sl` file. The grammar is small and the parser's error messages state
the exact clause syntax whenever you miss — lean on them; they are the
documentation. Crib from [`../assets/examples/`](../assets/examples/)
(`predator-prey.sl` shows environment mediation; `archive/respiring-cell.sl` is
the smallest thing in the repo that runs, and `archive/watershed.sl` is the one
that separates the conservation ledger into all four channels at once). Drop the
file in `assets/examples/` and it self-sorts
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

## Name the knobs and the readouts (`param`, `metric` — spec §4.5–4.6)

Without params, the run tab's Inputs card speaks the kernel's taxonomy
("drivers · absolute rates", "relative weights"). A `param` line names an
adjustable quantity in **your model's own vocabulary**, and the panel renders
it first — a bounded slider for a single amount, % shares for a fanout:

```
param "Developer demand" : flow "Developer workload" -> "Developer clearing" range 0..12000
param shares "Developer market share" : from "Developer clearing"
```

The boundary to keep straight: **a param is presentation over a declared
amount, never dynamics.** It stores no value (the flow's `amount` IS the
value), it never projects (the engine cannot see it), and the % display of a
shares group is derived — the model keeps raw weights, and a share edit edits
exactly one of them. Declaring params is enrichment: undeclared magnitudes
keep the taxonomy fallback, so nothing requires them. The gallery's
"reset to declared" restores what your `.sl` declares — your declared amounts
are the defaults, which is one more reason to calibrate them honestly and cite
sources in comments.

A `metric` line is the same move on the way OUT (#203): where a param names
an input knob, a metric names a readout you want every run to answer, in your
words — and the run deck renders declared metrics **first**, above the
kernel-fidelity furniture:

```
metric "DeepSeek dev share" : share of flow "Developer clearing" -> DeepSeek
metric "Opus tokens served" : sum into Opus
```

`share of flow` reads one flow as a fraction of everything leaving its source
(composition — refuse yourself the temptation to declare it on a
single-outflow source; the parser will anyway, because that share is
identically 1). `sum into` reads everything arriving at a thing (throughput),
as a per-tick series and a run-end total. Declare several of one verb and the
deck sorts them by endpoint — your leaderboard. A metric is a **derived
reading of what the run executed**, never a number of its own: it computes
from the recorder's per-flow series and can state nothing the trace does not
carry. When your model wants a question these two verbs cannot ask, that is a
new verb for the language, not a formula — see ADR 0006 for the growth rule.

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
   downstream flows with amounts and expect them to act. And when a signal's
   availability is simply *never the constraint* — released weights feeding an
   Amplifying model, an always-on control line — say `ample` instead of
   inventing a huge number (spec §4.4): informational flows only, no unit, the
   gate reads held open and the diagram shows the word.
4. **Stocks start at zero.** SL's `stock <unit>` declares a unit, not a value —
   an initial stock value is typed parameter territory, gated on
   [#112](https://github.com/halcyonic-systems/bert-lenses/issues/112) (C2).
   Until then, author systems that fill from empty, or force them.
5. **Feedback loops need memory on the loop.** Wires transmit; stocks remember
   (#259). A loop is well-posed when it passes through a stock's level read; a
   loop of pure relays has no deterministic step and the run **refuses with the
   loop named**. Time is honest everywhere else too: rates are per `time unit`,
   and a run's totals don't depend on Δt (`dt_invariance.rs` holds this).

## The three pre-SL demos, and why they cannot be ported

`allocation`, `homeostat` and `reservoir` (now in `assets/archive/demos/`,
retired from the gallery in the August 2026 curation) predate System Language.
They are bundled JSON with no `.sl` source, and the #318 pass asked whether to
port them. The answer for two
of them is that **the language cannot say what they say**, and that is worth
knowing before anyone tries again:

| demo | carries | portable? |
|---|---|---|
| `reservoir` | `initial_state.storage = 100` and `cognitive_params.release_rate = 1.5` on its Buffering component. The only model in the repo that **starts with a stock already full** — everywhere else stocks start at zero. | **no** |
| `homeostat` | `release_rate` on the Room. A closed regulatory loop that actually runs and converges — see the thermostat pair above. | **no** |
| `allocation` | nothing but structure: one `Splitting` component fanning a forced total across three weighted sinks, all four columns driven from CSV. | yes, but its fact already lives in `llm-market.sl`, richer, with `param shares` |

The blocker is not effort. `emit_sl` **refuses** a thing carrying
`cognitive_params` or `initial_state` and names the JSON export as the lossless
path, because SL has no production for either until
[#112](https://github.com/halcyonic-systems/bert-lenses/issues/112) chooses the
transition functor. `language/spec.md` §8.2 already names the exporter's
direct-to-JSON write as a **defect rather than a second authoring path**, and
these three demos are the artifacts that cross it. So they stay in the archive,
held by their gates: they are the live evidence that #112 is open, and deleting
them would delete the evidence while gaining nothing.

The two things to take from them into SL when #112 lands: a nonzero opening
stock, and a stock's release rate.

## Where the semantics live

Authority order when a question gets deep: the `circuit.rs` module header
(update rule, conservation ledger), [`language/spec.md`](language/spec.md) §8
(what SL declares vs what engines interpret), and the gates themselves —
`sl_demos.rs`, `dt_invariance.rs`, and `scripts/mutation_check.py`, which
proves the gates can fail.
