**Status: PROPOSED** — designed, reviewed and accepted 2026-08-15; not yet implemented.
Stage 0 (the `Node::spark` doc contradiction) applied same day. Stages 1-3
await a dedicated session — the acceptance criterion is byte-identical float
assertions before and after, and stage 3's test-file rewrites (including
re-founding `history_is_a_record_not_an_input_to_t`, whose pollute-the-buffer
strategy loses its buffer) deserve undivided attention rather than a slot in
a demo week. #112-family: makes the carrier-vs-trace split structural instead
of tested.

---

# State/trace separation for `Circuit` — design for bert-lenses #112 (§1.6)

Source measured: `docs/proposals/112-transition-functor.md` §1.6 (repo root
`~/Desktop/halcyonic-projects/active/bert-lenses`, read in full). All line
numbers below are against that worktree as of this read.

## 0. Recommendation up front

**Do the refactor, staged, ~4 small PRs.** Not because the current code is
unsound — it isn't, see §4 — but because the split is small, low-risk, and
buys a structural guarantee the codebase currently only has as a passing
test. `step_dt` already computes the tick's history row, wire row, and
ledger row from purely step-local data before it pushes them anywhere
(`circuit.rs:1420-1450`); returning that data instead of appending it is
change to one function's signature and its ~15 call sites, not a redesign.
**Cost estimate: 0.5–1 day**, most of it mechanical (mirrored below), and it
changes zero numbers in any test — see §3's acceptance criterion.

## 1. The complete reader inventory

Grepped across all 26 files in the repo touching `history`, `ledger_history`,
`wire_history`, or `.spark`:
`bert-canvas/{src/canvas.rs,src/lenses.rs,tests/{canvas_round_trip,dt_invariance,llm_market,projection_ledger,sl_demos,sl_roundtrip}.rs}`,
`bert-cli/{src/main.rs,tests/surface.rs}`,
`bert-compose/src/{circuit.rs,export.rs,markov.rs,run.rs,lens.rs,examples.rs}`,
`bert-core/{src/{decomposition.rs,lib.rs,operational.rs,transition.rs,validate.rs},tests/*}`,
`bert-lenses-kernel/src/api.rs`, `bert-tether/src/{forcing.rs,tether.rs}`.

**One important false positive, ruled out:** `bert-core/src/transition.rs:248-255`
and `validate.rs:434` touch `sys.history` — that's `System.history: String`,
the authored 8-tuple η slot on `WorldModel`, a completely different field
already correctly kept out of `bert-compose` per `run.rs:1-19`'s module doc
("this trace is not the system's 'memory' … the two must not be conflated").
Not part of this inventory.

### The writer

`Circuit::step_dt` (`circuit.rs:971`) is the **only** writer of
`history`/`ledger_history`/`wire_history`, at `circuit.rs:1420-1450`, and the
only writer of `Node::spark`, at `circuit.rs:1405-1410`. `Circuit::reset`
(`circuit.rs:522-535`) is the only place that clears any of the four.

### The one direct reader: `RecordedRun::record`

`RecordedRun::record` (`bert-compose/src/run.rs:71-84`) is the **only**
production call site that reads `circuit.history` / `.ledger_history` /
`.wire_history` directly off a live `Circuit`. It does so exactly once, after
its `for _ in 0..ticks { circuit.step_dt(dt) }` loop finishes, cloning all
three into a `RecordedRun`. It does not need per-tick access — it only reads
the finished buffers because that's where `step_dt` currently happens to
leave them.

**Nobody else reads a live `Circuit`'s trace fields mid-run.** Every other
production consumer reads a **finished** `RecordedRun`/`RunReport`:

- `bert-lenses-kernel/src/api.rs::run` (wasm export, `:76-84`) — stateless
  per-call: builds a fresh `Circuit`, calls `RecordedRun::record`, returns
  `.report()`. Holds no `Circuit` across calls.
- `bert-tether/src/forcing.rs::summarize` (`:326-448`) — takes `circuit: &Circuit`
  (for live-state reads: `nodes`, `wires`, `source_readout`, `level`) and
  `run: &RecordedRun` (for trace reads: `run.history`, `run.wire_history`,
  `run.ledger_history`) as **two separate parameters already** — the
  read-side split this proposal wants is already the calling convention here.
- `bert-cli/src/main.rs:360` calls `RecordedRun::record_over`, then (per
  `crates/bert-lenses-kernel/src/api.rs:112` doc reference) hands the report
  on; no direct `Circuit` buffer reads.
- `bert-canvas/tests/{canvas_round_trip,dt_invariance,llm_market,sl_demos}.rs`,
  `bert-cli/tests/surface.rs`, `bert-lenses-kernel/src/api.rs`'s own tests
  (`:950,989,1007,1035`) — all read `run.history` / `run.ledger_history` /
  `run.wire_history` off a `RecordedRun`, never off a live `Circuit`.

### The one exception: `Circuit::csv`/`csv_with`

`circuit.rs:1452-1470` (`pub fn csv`, `pub fn csv_with`) read `self.history`
directly on `Circuit`, bypassing `RecordedRun`. Used only by tests:
`lens.rs:289,300` (the lens-purity regression, which calls `c.step()` 200
times then `c.csv()`) and `circuit.rs:2394` (`csv_records_every_tick`). Not
called from `bert-cli` or the wasm boundary — CLI/wasm both go through
`RunReport`/JSON, not this CSV path. This is the one place production code
(well, test-exercised library code) genuinely wants "the trace, read off the
thing I've been stepping," and it needs a mechanical rewrite (§3).

### `Node::spark` — classified as trace, with a doc contradiction flagged

`spark: VecDeque<f32>` (`circuit.rs:327`) is a bounded (`SPARK_CAP`) per-node
ring holding the last N ticks of `storage` (Buffering nodes) or `activity`
(everything else) — `circuit.rs:1405-1410`. Two things about it:

1. **No reader exists outside `circuit.rs` today.** Grepped the whole repo
   for `spark` outside `circuit.rs`: zero hits, production or test. It is
   currently dead weight for every consumer inventoried above.
2. **The codebase's own docs disagree about what it is.** The field doc
   (`circuit.rs:325-327`) calls it "Engine state, not view state." But the
   two Rutten-law property tests (`circuit.rs:3286-3287`, `:3339-3340`)
   explicitly group it with `history`/`ledger_history` as part of **H**, and
   `history_is_a_record_not_an_input_to_t` (`:3343-3374`) pollutes it
   alongside the other two buffers as part of proving the transition doesn't
   read the record. The test-level doc is the one that matches what `spark`
   actually *is*: a derived, redundant, windowed view of a value already
   carried in the per-node live state (`storage` or `activity`) — computed
   the same way the history row's per-node columns are computed, just
   node-local and length-capped instead of circuit-wide and unbounded.

**Recommendation on spark: reclassify as trace in the doc comment now (one
line), defer the structural move.** Its value is trivially reconstructable
by any future recorder from the tick observation this design introduces
(§2) — `if Buffering { obs.row[node_col] } else { obs.row[node_col-1] }` — so
nothing is lost by moving it later. But moving it means bumping every
`Node::new`/`reset`/test that touches `n.spark` (a wider blast radius than
the three `Circuit`-level buffers, for a field with zero current readers) —
not worth bundling into the same PR as a live fix for a live problem. Fix
the contradictory doc comment in stage 1 (§3), move the field only if/when a
UI consumer actually wants it.

## 2. The target shape

### 2.1 `Circuit` shrinks by exactly three fields

Everything else in `Circuit` today (`circuit.rs:476-519`) already is minimal
state per the proposal's own §1.2 — including `emitted`/`sunk`/`dissipated`,
which the proposal explicitly names as "circuit-level: … the conservation
accumulators" (§1.2), not trace. Confirmed: `stored()` (`:625-627`),
`balance()` (`:636-639`), `source_readout()` (`:870`), `level()` (`:921`) —
every reader of those three accumulators — touches nothing else. `dyn_state`,
the property tests' own state-equality helper (`:3286-3298`), compares
`tick` + per-node `[activity, storage, total]`; it doesn't even assert
`emitted`/`sunk`/`dissipated` compose under the semigroup law, which is an
existing test gap, not evidence they're trace (they're monotone
accumulators of per-tick deltas, so they *do* satisfy the law — worth a
follow-up assertion, out of scope here).

```rust
pub struct Circuit {
    pub nodes: Vec<Node>,          // unchanged (spark stays, doc fixed — §1)
    pub wires: Vec<Wire>,
    pub porosity: f32,
    pub tick: u64,
    pub time: f32,
    pub invariant: Invariant,
    pub emitted: f32,
    pub sunk: f32,
    pub dissipated: f32,
    // history, ledger_history, wire_history — REMOVED
}
```

`Circuit::reset` (`:522-535`) drops its three `.clear()` calls on those
fields; everything else in `reset` is untouched.

### 2.2 `step_dt` returns the tick's observation instead of appending it

**Answer to the observation-function question: yes, `step_dt` returns the
tick's row.** Verified at `circuit.rs:1420-1450`: `row` (the history row),
`wire_row`, and the ledger row `[emitted, sunk, stored, dissipated]` are
already built there from data that is either (a) purely local to this call
(`act`, `next_storage`, computed at `:1103-1104` and filled through the
function body) or (b) `self` fields that are staying in the minimal state
(`self.tick`, post-increment; `self.stored()`; `self.emitted/sunk/dissipated`,
post-accumulation). `wire_row` specifically needs `self.wire_amount(k)`
(`:1433`), which reads each node's `activity`/`storage` — but those are
already committed to `self.nodes` earlier in the same function
(`:1402-1404`), so nothing about returning `wire_row` instead of pushing it
requires computing anything outside `step_dt`, or recomputing anything
`step_dt` doesn't already compute today.

```rust
/// One tick's recorded observation — the row `step_dt` would have appended
/// to `history`/`wire_history`/`ledger_history`. A caller that wants a
/// trace accumulates these; `step_dt` itself no longer does.
pub struct TickObservation {
    pub row: Vec<f32>,               // history row: [tick, n0.act, n0.stor, n0.tot, …]
    pub wire_row: Vec<f32>,          // wire_history row: wire_amount(k) per wire
    pub ledger_row: Option<[f32; 4]>, // None when Invariant::None (axis D declined)
}

impl Circuit {
    pub fn step_dt(&mut self, dt: f32) -> TickObservation {
        // ...unchanged body up to the point it currently pushes...
        TickObservation { row, wire_row, ledger_row }
    }
}
```

This is the Rutten-honest shape: `step_dt : S → (S, O)`, a Moore-style
structure map that both transitions and emits, rather than `S → S` with a
side-channel append. (Stated as a structural analogy, not a claim about
`Systems/Dynamics/Transition.lean` — that file is not touched by this
design and nothing here asserts an instantiation of it.)

**One wrinkle: the width/topology-change guard.** `step_dt` currently
self-invalidates its buffers when the node count changes mid-recording
(`circuit.rs:1427-1431`, `"Cleared on Reset or when the topology changes
mid-recording"` at `:495`). Once `step_dt` owns no buffer, it can't run this
check. Traced whether anything actually exercises it: the only production
recorder, `RecordedRun::record`, holds `circuit: &mut Circuit` for the
whole loop with nothing else able to mutate node count concurrently
(single-threaded, no re-entrancy) — so for every recorder that exists today,
this guard is provably unreachable. It's defensive code for a scenario
(a persistent `Circuit` recorded across multiple external calls with
topology edits interleaved) that no current caller creates — the wasm `run`
export is stateless per call (`api.rs:76-84`). **This design drops the guard
from `step_dt` and does not relocate it**; if a future interactive
recorder needs it, it owns the accumulating `Vec`s and can re-derive
"width changed since last row" itself from `obs.row.len()`, same as today's
check, just on the other side of the call.

### 2.3 The recorder moves to the caller — and already exists

`RecordedRun::record` (`run.rs:71-84`) is that caller, and it already loops.
The change is inside the loop body, not to its shape:

```rust
pub fn record(circuit: &mut Circuit, spec: &OperationalSpec, dt: f64, ticks: usize) -> Self {
    circuit.reset();
    let mut history = Vec::with_capacity(ticks);
    let mut ledger_history = Vec::new();
    let mut wire_history = Vec::with_capacity(ticks);
    for _ in 0..ticks {
        let obs = circuit.step_dt(dt as f32);
        history.push(obs.row);
        wire_history.push(obs.wire_row);
        if let Some(row) = obs.ledger_row {
            ledger_history.push(row);
        }
    }
    Self {
        key: spec.content_hash(),
        dt,
        history,
        ledger_history,
        wire_history,
        final_balance: circuit.balance(),
    }
}
```

`RecordedRun`'s own public shape (`run.rs:46-65`) is **unchanged** — it
already holds exactly `history`/`ledger_history`/`wire_history` plus `dt`,
`key`, `final_balance`. This design doesn't invent a new "trace" type; it
relocates the accumulation of an existing one from inside `Circuit` to the
struct that was already named for holding it. That's the sense in which
"nothing here needs to move for #112's purposes" (the proposal's own
§1.6 hedge) undersells the cost — the move is this small because the right
home already exists and already loops.

## 3. Staged migration plan

Every stage compiles and keeps all 49 suites green. Acceptance criterion,
stated once: **every existing assertion on `history`/`ledger_history`/
`wire_history`/`final_balance`/`.csv()` output must produce byte-identical
values before and after** — this refactor relocates data, computes nothing
differently. `dt_invariance`, `sl_demos`'s golden bundles, `canvas_round_trip`,
and `forcing.rs`'s summarize path are the ones with the most float
assertions riding on these fields; they're the explicit gate for stage 2.

**Stage 0 (prerequisite, no code change):** fix the `Node::spark` field doc
comment (`circuit.rs:325-327`) to say what the property tests already prove
— it's part of the recorded trace, not the live carrier — resolving the
self-contradiction flagged in §1. Trivial, unblocks nothing else, but
should land first so the doc and the code it's about don't disagree while
the rest of this migration is mid-flight.

**Stage 1 — add `TickObservation`, make `step_dt` return it, keep pushing
internally too (transitional).** `step_dt` builds `TickObservation` and
returns it, AND still pushes to `self.history` etc. (fields stay on
`Circuit` for this stage). Every existing call site compiles unchanged
because nothing reads the new return value yet — `step_dt`'s return type
changes from `()` to `TickObservation`, so callers that discard it
(`c.step_dt(dt);`, `c.step();` — `step` calls `step_dt` internally at
`:943`, unaffected) need `let _ = ` or nothing at all (Rust doesn't require
consuming a returned value). **Mechanical touch:** none — this is
purely additive. Full suite green by construction (no field removed, no
behavior changed, `TickObservation` unused outside `step_dt`'s own body
except its construction).

**Stage 2 — switch `RecordedRun::record` to accumulate from the returned
`TickObservation` instead of cloning `circuit.history` after the loop.**
Exactly the rewrite in §2.3. `RecordedRun::record_over` (`run.rs:96-119`)
is untouched — it only calls `record` after its own precondition checks.
**Mechanical touch:** one function body (`run.rs:71-84`). **Gate:** run
`dt_invariance.rs`, `sl_demos.rs` (`sl_demos_run_conserve_and_are_dt_invariant`),
`canvas_round_trip.rs`, `bert-cli/tests/surface.rs`,
`bert-tether/src/forcing.rs`'s tests, and `api.rs`'s
`runnable_sample_projects_runs_and_conserves` — every one of these asserts
either exact floats off `run.history`/`run.ledger_history`/`run.wire_history`
or a tolerance band derived from them, so this stage is the one where a
subtly wrong observation extraction would show up immediately as a
numeric mismatch, not a type error.

**Stage 3 — remove `history`/`ledger_history`/`wire_history` from
`Circuit`, drop the internal pushes in `step_dt`, drop the three `.clear()`
calls in `reset`, drop the width-guard (§2.2's wrinkle).** This is the
stage that actually shrinks `Circuit` and makes the state/trace split real
rather than merely available. **Mechanical touch — every direct reader of
`circuit.history`/`.ledger_history`/`.wire_history` on a live `Circuit`
that isn't already going through `RecordedRun`:**
  - `circuit.rs:1837` (`coarse.ledger_history, fine.ledger_history` in a
    dt-invariance-style internal test) — check whether `coarse`/`fine` are
    `Circuit`s or `RecordedRun`s; if `Circuit`s, rewrite to accumulate via
    the stage-1 return value the same way `RecordedRun::record` does.
  - `circuit.rs:2400` (`assert!(c.history.is_empty(), "reset clears the
    recording")`) — this assertion is no longer expressible once `history`
    isn't a `Circuit` field; replace with an assertion that `reset` zeroes
    the fields that remain (`tick == 0`, `emitted/sunk/dissipated == 0.0`,
    every node's `storage == initial_storage`), which is the same claim
    restated for the shrunk `X`.
  - `circuit.rs:2394` (`csv_records_every_tick`) and `lens.rs:289,300`
    (`c.csv()`) — `csv`/`csv_with` (`:1452-1470`) must move. Cleanest home:
    make them methods on `RecordedRun` (they already take exactly
    `history: &[Vec<f32>]` shape data plus a node-name labeling closure —
    `RecordedRun` has `history` and the caller has the `Circuit` for
    names). Rewrite both call sites to build a `RecordedRun` (via
    `RecordedRun::record`, using a trivial 1-tick-per-`step()` spec-free
    path, or by exposing a tiny internal accumulate-and-wrap helper for
    test-only use) instead of stepping a bare `Circuit` and reading
    `.history` off it.
  - `circuit.rs:3417` (`conserved.ledger_history.len(), conserved.history.len()`)
    and `:3357-3358,3360` (`history_is_a_record_not_an_input_to_t`'s
    pollution) and `:3499-3500,3532-3533` (`build(0.0).history,
    build(1.0).history`) and `:3406-3407` (`declined.ledger_history.is_empty()`)
    — **these are the property tests this design is explicitly trying to
    keep true**, so they need the most care, not just mechanical rewriting.
    `history_is_a_record_not_an_input_to_t` in particular currently proves
    its point *by* mutating `Circuit`'s own buffers and showing the next
    transition is unaffected. After stage 3, `Circuit` has no buffer to
    mutate — so this test's proof strategy changes shape: it becomes
    **structurally true by construction** (there is no field on `Circuit`
    for a polluted-history bug to live in) rather than an empirically
    checked invariant. Recommend **keeping a version of this test**, not
    deleting it, but changing what it demonstrates: assert that
    `TickObservation` is `#[derive(Clone)]`-copyable/discardable without
    affecting a subsequent `step_dt` call — i.e., call `step_dt` twice,
    discard the first `TickObservation`, and confirm the second matches a
    baseline that never discarded anything. Weaker than today's test in
    one sense (today's actively corrupts data and checks recovery; the new
    one can't corrupt data that doesn't exist) but stronger in the sense
    the proposal wants (the H-independence is now a compile-time structural
    fact, and the test documents that it used to be a runtime one).
  - `markov.rs:240,265,267` — this is `MarkovRun::history`, a **separate**
    struct (`Chain::run`'s own record type, module-doc'd at `markov.rs:1-19`
    as sharing "the same `Vec<Vec<f32>>` shape" as `Circuit`'s, not the same
    field). Confirmed by reading `markov.rs:1-40`: `Chain`/`MarkovRun` are
    a wholly separate stepper with no `Circuit` involvement. **Out of
    scope** — flagged so nobody mistakes the grep hit for a `Circuit` site.
  - `bert-lenses-kernel/src/api.rs:989` (`MarkovRunResult { …, history:
    run.history }`) — same: `run` here is a `MarkovRun`, not a `Circuit`.
    Out of scope, same reason.

**Stage 4 (optional, deferred per §1) — move `Node::spark` out of `Node`.**
Not scheduled with the above three; no current reader depends on it, and
its blast radius (every `Node::new`, every test touching `n.spark`) is
wider than its payoff today. Revisit if/when a UI actually wants live
sparklines and needs to decide whether they're recorder-fed (matching this
design) or something else.

## 4. Risks and the do-nothing case

**The proposal's own hedge is stronger than it reads at first pass.** §1.6
says "nothing here needs to move for #112's purposes" and offers a textual
fix (redefine `S` in a doc comment as the fields minus the three buffers).
Having now read the test suite, that textual fix is **already partly done**
— not in a doc comment, but as an executable property. `dyn_state`
(`circuit.rs:3286-3298`) already defines "the live dynamical state" as
`tick` + per-node `[activity, storage, total]`, explicitly excluding
`history`/`ledger_history`/`spark` by construction of the helper, and two
tests (`semigroup_double_step_law`, `history_is_a_record_not_an_input_to_t`)
already run 200-seed property checks against that definition on every test
run. **The theoretical claim — T doesn't read H — is not merely asserted in
this codebase, it's continuously checked.** That is a materially stronger
starting position than "textual only, unverified," and it changes the
risk calculus for both options:

- **Do-nothing risk:** low and already caught by machinery, not by
  vigilance. If a future change made `step_dt` read `self.history`, the
  existing `history_is_a_record_not_an_input_to_t` test would fail on the
  next CI run, for the same reason it already exists — it's not a one-time
  audit, it's a standing regression gate. The cost of doing nothing is a
  `Circuit` whose type signature promises more than it needs to (a reader
  of `circuit.rs`'s struct definition sees three growing `Vec`s and must
  read `step_dt` to learn they're inert), not an unguarded correctness gap.
- **Refactor risk:** low and mostly mechanical, per §3's inventory — one
  writer, one direct production reader, one dead-code exception (`csv`),
  three lines in one test file needing a genuine (not just mechanical)
  rewrite to keep proving what they prove today. The main hazard is
  stage 3's `history_is_a_record_not_an_input_to_t` rewrite landing as a
  weaker test that quietly stops checking anything (§3 flags this
  explicitly so it isn't waved through as "just delete the now-invalid
  lines").

**Recommendation and cost, restated:** do the refactor — stages 0–3, in
order, each its own commit/PR, full suite green at every stage. Estimated
at **0.5–1 day** total, concentrated almost entirely in stage 3's handful
of test-file rewrites (§3's bulleted list is the complete work order); the
production code change (stages 1–2) is under an hour once `step_dt`'s
existing tick-local computation is read closely, which this document has
already done. The payoff is that `Circuit`'s struct definition becomes a
literal, honest reading of "the whole circuit's product state" as §1.2
already describes it in prose — the code stops needing the prose to say
what the types don't.
