# The transition functor as shipped — #112

**Status:** ACCEPTED with slice 1 implemented (2026-08-15 review). The
functor reading in §1 is adopted: F = Id over the whole-circuit product state,
Δt a family index (not an input port), the shipped forcing read as the closed
instance. §1.7's finding 1 was fixed as #337 (`4cb56b1` — the tap rule now
checks the declared kind) and finding 2 filed as #340 with Fig 3.17 as the
ruling authority; the §1.7 trace documents pre-fix behavior and stays as the
record. §3's two productions landed as `stock <unit> initial <n>` and
`release <n>` (grammar words ruled 2026-08-15; separating instances in
`crates/bert-canvas/tests/sl_stock_dynamics.rs`). §4's Lean instantiation and
§5's openness frontier remain open under #112.

**Original status:** proposal. This document measures the shipping `bert-compose` stepper
against the coalgebraic dynamics-semantics adopted for #112 (Rutten 2000,
load-bearing per the 2026-07-21 call) and the typed transition already landed
in `systems-science-foundations` (`Systems/Dynamics/Transition.lean`, #112
Half A step 1). It does not design a new semantics. Sections 1–2 measure code
that already exists; section 3 is a proposal (spec text and separating
instances only, no parser/emitter changes); section 4 names a Lean target
without claiming it proven; section 5 restates the openness caveat the issue
already carries.

## 1. The functor as shipped

### 1.1 The pipeline, end to end

A run is `WorldModel → OperationalSpec → Circuit → RecordedRun`:

- `validate_operational` projects a `WorldModel` into an `OperationalSpec`
  (`crates/bert-core/src/operational.rs:206`), reading each level-1 system's
  `AgentModel.initial_state.get("storage")` into
  `OperationalProcess.initial_storage: Option<f64>` and cloning
  `AgentModel.cognitive_params` verbatim into
  `OperationalProcess.cognitive_params: HashMap<String, f64>`
  (`operational.rs:319-327`).
- `bert_compose::export::from_spec` builds a `Circuit` from the spec
  (`crates/bert-compose/src/export.rs:370`), setting
  `node.initial_storage = s as f32; node.storage = s as f32;` from
  `p.initial_storage` (`export.rs:401-404`) and
  `node.release_rate = r as f32;` from
  `p.cognitive_params.get("release_rate")` (`export.rs:405-406`).
- `bert-cli`'s `run` subcommand calls `validate_operational`, then
  `bert_compose::from_spec`, then
  `bert_compose::RecordedRun::record_over(&mut circuit, &spec, dt, t)`
  (`crates/bert-cli/src/main.rs:345-360`), which derives a tick count from
  `(Δt, T)` via `ticks_over` (`crates/bert-compose/src/run.rs:163-187`) and
  calls `circuit.step_dt(dt as f32)` in a loop after `circuit.reset()`
  (`crates/bert-compose/src/run.rs:71-84`).
- `bert-tether`'s forcing path writes the same two fields by a second route:
  `apply_params` (`crates/bert-tether/src/forcing.rs:151-197`) sets
  `s.agent.initial_state["storage"]` from `params.stock_initial` (a column's
  first present observation, "the value at t0" — `crates/bert-tether/src/
  tether.rs:64`, `:144-148`) and `s.agent.cognitive_params[name]` from
  `params.component_param` (`forcing.rs:184-195`) — landing on exactly the
  fields `validate_operational` reads. Authoring and CSV-tether forcing are
  two writers of one field, not two mechanisms.

### 1.2 The state space X

`X` is the mutable field set of `Circuit`
(`crates/bert-compose/src/circuit.rs:477-519`):

- per node (`Node`, `circuit.rs:262-328`): `storage: f32`, `activity: f32`,
  `total: f32`, `spark: VecDeque<f32>` (a bounded sparkline buffer, also
  mutated every step, `circuit.rs:1377-1380`);
- circuit-level: `tick: u64`, `time: f32`, and the conservation accumulators
  `emitted`, `sunk`, `dissipated: f32`;
- circuit-level trace buffers: `history`, `ledger_history`, `wire_history`
  (all `Vec<...>`, appended to every step — see §1.5 for why this is flagged,
  not just noted).

Everything else on `Node` and `Wire` — `kind`, `param`, `release_rate`,
`capacity`, `setpoint`, `time_constant`, `maintenance`, `back_pressure`,
`stock_unit`, and the wire topology itself (`from`, `to`, `mode`,
`conductance`, `rate`, `rate_series`, `dt_stride`, `substance_override`) — is
never written by `step_dt`. It is fixed for the life of a `Circuit` (set once
by `from_spec`, `circuit.rs:1024, 1132-1172` in `export.rs`'s test fixtures
show the same fields set once and never touched again). These are not state;
they select *which* transition map the circuit runs — the Rust-side
counterpart of choosing a specific `Dynamics d` and a specific
`f : S → S` under it in `Transition.lean:63-65`.

### 1.3 The one-tick map and where F is

`Circuit::step_dt(dt: f32)` (`circuit.rs:964`) is a genuinely one-shot
function: it reads `self` (current `X`, plus the fixed parameters above),
computes two local vectors `act: Vec<f32>` (this tick's per-node activity)
and `next_storage: Vec<f32>` (this tick's per-node stock) purely from that
input (`circuit.rs:1098-1266, 1288-1315`), and commits both plus the ledger
deltas in one place at the end (`circuit.rs:1368-1393`). Nothing is mutated
mid-computation and re-read; the read phase and the write phase are cleanly
separated. Given a fixed `dt` (an argument, not a field — see §1.4) and a
fixed circuit (topology + parameters), `step_dt` is a deterministic self-map
`X → X`.

Reading the Lean side back onto this: `Transition.deterministicClosed`
(`Transition.lean:63-65`) types exactly this shape — `f : S → S` for a
closed, deterministic `Dynamics`, with `kindCodomain .deterministic X = X`
(`Transition.lean:47`), i.e. `F = Id`. **The endofunctor the shipped stepper
implements is the identity functor over the whole-circuit state `X`
described in §1.2.** `Circuit::step_dt(dt)` for fixed `dt` and fixed
parameters *is* an instance of `Transition (Dynamics.conservationExample X)`
in the `deterministicClosed` sense: `T : X → X`. `step` (`circuit.rs:943`)
is the `dt = 1.0` member of this family, kept because "the 60-odd call sites
that mean 'advance one tick of this level' stay unchanged"
(`circuit.rs:935-942`).

This is the honest place to flag a choice for review rather than assert one
reading silently: **`X` here is the whole circuit's product state, not a
per-node state.** `step_dt` computes activities in a same-step topological
dependency order (`eval_order`, `circuit.rs:567-622`) where one node's
activity can read another node's *same-tick* activity — the coalgebra is
over the full product, and the per-node transfer functions
(`circuit.rs:1139-1263`) are not independently-composable local coalgebras.
This matches the issue's own citation of Spivak's "the parallel product of
two state systems is still a state system" (comment 2026-07-24 on #112) —
but it means F is stated over the whole model's state, and any future
per-component coalgebra reading would need its own composition law, not a
projection of this one.

### 1.4 Where Δt enters

`dt: f32` is an **argument** to `step_dt`, never a field of `X`. Rates are
declared per time unit, so a flux *generated* from a rate scales by `dt`
(Source emission `circuit.rs:1145`, buffer release `circuit.rs:1200`,
gradient flow `circuit.rs:1002`); a level read or a pass-through relay does
not (`circuit.rs:949-953`). `self.time` (part of `X`) accumulates the `dt`s
stepped so far (`circuit.rs:1393`) and is what forced-series lookups index
by (`wire_declared_rate`, `circuit.rs:795-811`) — so Δt-refinement keeps a
forced channel anchored to model time rather than tick count (the module
doc's #258 citation). Structurally this means the shipped map is not a
single `T : X → X` but a **family indexed by Δt**, `T_· : ℝ⁺ → (X → X)`,
with `T_1 = step`. This is consistent with the module doc's own framing —
"Δt is NOT a numerical refinement knob... it is level-indexed"
(`circuit.rs:958-963`) — and with the Lean side, where a `Dynamics`
descriptor is chosen once per model rather than carrying Δt as a functor
parameter. The reading proposed here is that **Δt selects a member of the
family, the same way choosing `f` in `deterministicClosed f` does** — it is
not a second coordinate of `F`. Flagged for review: an equally defensible
reading types Δt as a component of `d.inputType` (an environment-supplied
scalar), which the current Lean `Transition` shape would already accommodate
without change; this proposal does not choose between them, since nothing in
the shipped code forces the choice either way.

### 1.5 Where forcing enters — X → F(X), not Mealy

The `Dynamics.step` shape in Lean is Mealy over the descriptor's ports:
`d.inputType × S → kindCodomain d.kind (d.outputType × S)`
(`Transition.lean:56`), deliberately typed for openness-readiness even
though the shipped kernel exercises only the closed case
(`d.inputType = d.outputType = Unit`, `Transition.lean:52-53`).

**Measured finding: the shipped `Circuit` has no live input port at all.**
`Wire` (`circuit.rs:371-414`) carries `rate: Option<f32>` and
`rate_series: Option<Vec<f32>>` — both fixed configuration set once by
`from_spec`/`apply_params`, read every tick via `wire_declared_rate`
(`circuit.rs:795-811`) by indexing into `self.time` (part of `X`, not an
argument to `step_dt`). There is no channel through which an external value
is *supplied at call time* the way `Transition.step`'s `d.inputType × S`
argument is supplied. The observed series a tether forces onto a wire is
baked into the model's static parameters before the run starts
(`forcing.rs:162-171` writes it as an `Interaction.parameter`, which
`operational.rs:415-425` reads once per flow at projection time, not per
tick).

Given the identity `d.inputType = Unit` degenerates
`Unit × S → kindCodomain kind (Unit × S)` to `S → F(S)`
(`Transition.lean:52-53`), this reading is **consistent, not conflicting**:
the shipped stepper is the closed instance of the general Mealy-shaped
`Transition`, with the would-be "forcing input" folded into the fixed
parameters that select which member of the transition family runs, rather
than an environment value read live each tick. This is a choice about how
to describe existing code, not a design decision, and it is flagged for
review because the alternative reading — treating the forced series as an
`inputType` port that happens to be pre-recorded rather than live — is
equally defensible and would change nothing about the Rust today, only the
Lean-side gloss.

### 1.6 Non-coalgebraic findings, reported honestly

- **`step_dt` is not total on the intended reading.** When
  `self.eval_order()` fails — an "algebraic cycle" with no Moore anchor
  (no stock, no source, no gradient read) anywhere on a wiring loop
  (`circuit.rs:539-549, 567-622`) — `step_dt` returns immediately, a no-op
  (`circuit.rs:970-972`). As a Rust function `X → X` this is technically
  total (it always returns, unmodified `X`), but semantically "no transition
  occurred" is standing in for the identity map. `RecordedRun::record_over`
  treats this as a refusal at the caller level, not silently: it checks
  `circuit.algebraic_cycle()` before recording and returns `Err` naming the
  loop rather than recording a run of identity steps
  (`crates/bert-compose/src/run.rs:106-117`). The refusal is principled and
  documented (SSV Ex 4.2.9, cited in both files), but the coalgebra
  structure map itself is only genuinely `X → F(X)` on the sub-domain of
  circuits with no anchorless cycle; outside that domain it degenerates to
  the identity rather than being undefined.
- **The step is a global pass over the whole product state, not a per-node
  local map.** Already noted in §1.3 — worth restating here as the honest
  answer to "does every structural claim fit a clean coalgebraic reading":
  the topological same-step evaluation order means a node's transfer
  function can read another node's same-tick output, so `F` cannot be
  factored per-node without redoing the composition theorem the issue
  already parked as Half B / the openness frontier.
- **The mutable state conflates S with the accumulated trace H.**
  `Circuit::history`, `ledger_history`, and `wire_history` are `Vec`s that
  grow by one row every `step_dt` call (`circuit.rs:1395-1420ish`,
  `1387-1391`) and live *inside* `Circuit`'s own struct, i.e. inside `X` as
  defined in §1.2, not outside it. The clean Rutten reading keeps `S`
  minimal (the coalgebra's carrier) and derives `H` externally as the
  coinductive unfolding of `T` from a starting state — `RecordedRun::record`
  (`run.rs:71-84`) does snapshot the vectors out into an owned struct after
  the run, and the module doc for `run.rs` is explicit that the recorded
  trace is "kept OUTSIDE the `WorldModel`" and is "a session artifact,
  discarded when the app closes" (`run.rs:1-19`) — but that separation is
  about the *model* (the 8-tuple's `η`/history slot), not about the
  *coalgebra's own state*. Inside `Circuit`, `X` already contains an
  ever-growing observation buffer, so `X` today is `(minimal state) ×
  (partial trace)`, not the minimal state alone. This does not break
  anything the tests check — the trace is read-only from `T`'s own
  perspective, never fed back into a transition — but it means a literal
  reading of "the shipped `X`" is larger than the coalgebra's carrier ought
  to be. Flagged for review: the honest fix, if one is wanted, is textual
  (state `S` as the fields in §1.2 minus the three trace buffers) rather
  than a code change — nothing here needs to move for #112's purposes.
- **`eval_order` is recomputed every tick from data that never changes
  within a run** (topology and node kinds are fixed parameters, §1.2) —
  harmless (a fixed point, cheap to recompute), not a semantics defect, but
  worth naming since it means the "same-step order" is really a static fact
  about the chosen `f`, recomputed defensively rather than cached.

### 1.7 A measured pathology: the tRNA recycle loop mints mass

Repro, in this worktree: `cargo build -p bert-cli && target/debug/bert run
assets/examples/translation-apparatus.sl --t 15`. By `t=15` `stored` has
grown from 45 to 4935.9 while `emitted` has grown only from 101 to 1515;
`dissipated` crosses from positive to negative at tick 6 and reaches
`-4658.6` by tick 15; `final_balance` stays `≈0` throughout (`-0.00049` at
the end). The loop in question is `"tRNA Pool" → "Decoding Site" →
"Aminoacyl-tRNA Synthetase" → "tRNA Pool"` (`assets/examples/
translation-apparatus.sl:39-41`). This is not a defect in the ledger's
arithmetic — `final_balance` is a tautology by construction (§ below) — it
is a defect in what the one-tick map computes, so it belongs in this
document's §1.6 as the sharpest instance of "does something non-coalgebraic
happen."

**The mechanism, traced exactly, with a closed-form check.** Two separate
code paths compound:

1. **The Pool → Decoding wire is silently reclassified as a non-draining
   sensor read, despite being declared a real depleting transfer.**
   `is_observation` fires whenever a pushed wire runs `Buffering → Sensing`
   (`circuit.rs:652-662`), independent of what substance or amount the
   author declared on it — and `"tRNA Pool"` (`Buffering`) → `"Decoding
   Site"` (`Sensing`) matches, even though the SL line declares it
   `matter "charged tRNA"` (`translation-apparatus.sl:39`), a real transfer
   in the author's stated model. Once classified as an observation tap, the
   wire (a) still contributes to `Decoding Site`'s `physical` input sum —
   "observation level-reads count: a sensor reads the stock"
   (`circuit.rs:1114-1120`) — but (b) is excluded from `has_pushed_outlet`
   for `"tRNA Pool"` (`circuit.rs:1176-1180`, which filters
   `!self.is_observation(...)`), so Pool's Buffering arm takes the `else {
   0.0 }` branch every tick (`circuit.rs:1202-1204`): **Pool's own
   `release_rate` (unauthored, defaulting to `1.0`) never fires, because
   Pool is read to have no real outlet at all.** Measured: `tRNA Pool`'s
   `activity` column is `0.0` at every tick in the run (row 1 and row 2
   both show it — the storage-side columns 45.0 → 101.25 → 171.5625 move,
   the activity column does not). Pool can accumulate; it can never drain.
2. **`Decoding Site`'s own ledger classification is wrong because `Circuit
   ::from_spec` takes a node's `out_substance` from its FIRST authored
   outgoing flow, not from the primitive's own signal-crossing default.**
   `Sensing`'s primitive default output is `Message`
   (`circuit.rs:141-148`), which is what the ledger's `out_phys` check
   tests for (`node.out_substance.base == SubstanceType::Message`,
   `circuit.rs:1340-1345`) to decide whether a node's output counts as
   physical mass or is exempt (crossed to signal, "Sensing consumption" per
   the module doc, `circuit.rs:50-52`). But `export::from_spec` overwrites
   `node.out_substance` from the FIRST flow it encounters with that node as
   sender, keyed only by insertion order (`export.rs:467-472`,
   `if substance_named.insert(from) { c.nodes[from].out_substance = ... }`)
   — and `"Decoding Site"`'s first authored outflow in file order is line
   40, `"Decoding Site" -> "Aminoacyl-tRNA Synthetase" : matter "deacylated
   tRNA"`, which the author explicitly typed `matter`, not the Sensing
   default. So `Decoding Site.out_substance.base` becomes `Material`, and
   the ledger's `out_phys` check reads `has_outlet = true` and charges
   `out_phys = act[Decoding Site]` — the node's FULL activity, level-read
   component included — as legitimately-delivered physical output, even
   though its ledgered `delivered` (inflow) excludes the same level-read
   component by construction (`delivered` filters `!is_observation`,
   `circuit.rs:1274-1286`). The gap between what is charged as delivered-in
   and what is charged as delivered-out at this one node is exactly the
   phantom mass, injected once per tick.

**The exact per-tick injection, and a closed-form check against the run.**
At tick `t`, `Decoding Site`'s physical inflow is `mRNA(20) +
Pool.storage_t` (the observation read, uncapped — `circuit.rs:1116-1120`),
scaled by its agency `a = 0.5` (`Node::new`'s process default,
`circuit.rs:337`, unauthored in this model): `Decoding_t = 0.5 × (20 +
Pool_t) = 10 + 0.5·Pool_t`. Its two outwires split this evenly (no declared
per-wire rate, `delivery_share`'s uniform-split fallback,
`circuit.rs:760-773`): `Synth_t = 0.5·Decoding_t + 20(aa) + 20(ATP) = 45 +
0.25·Pool_t` (the `+40` external is Combining's unconditional
Energy-plus-Material sum — see the secondary finding below). Since Pool
never drains (finding 1), `Pool_{t+1} = Pool_t + Synth_t = 1.25·Pool_t +
45`. Checked against the actual run (`Pool_1 = 45.0`): predicted `Pool_2 =
1.25 × 45 + 45 = 101.25`, predicted `Pool_3 = 1.25 × 101.25 + 45 =
171.5625` — both match the recorded trace exactly (`101.25` and
`171.5625` are the literal values in `ledger_history`/`history`'s `tRNA
Pool` storage column at ticks 2 and 3). The loop's gain is `1.25`,
structurally, from `0.5 (Decoding's agency) × 0.5 (uniform two-way split) ×
1 (Combining's pass-through)` — not from any declared quantity in the file.

**A secondary, independent finding: `Combining` sums Energy and Material as
one undifferentiated scalar, unconditionally.** `physical` sums every
inflow whose substance is not `Message` — Energy and Material together
(`circuit.rs:1116-1120`) — and `Combining`'s activity is exactly that sum,
with no per-substance gating or stoichiometric limit
(`ProcessPrimitive::Combining => physical`, `circuit.rs:1210`; `Propelling`/
`Impeding` do the same after scaling by agency, `circuit.rs:1212-1213`).
Isolated repro (built and run against this worktree, no engine changes): a
`Combining` node fed 5 units of declared `matter` and 7 units of declared
`energy` reports activity `12.0` — the raw sum — every tick, with
`final_balance = 0.0` throughout. In the ribosome model this is what turns
the Synthetase's `aa(20) + ATP(20)` constant external inflow into `+40`
units of `"recharged tRNA"` (a `matter`-typed output) every tick, with
no accounting for the fact that 20 of those 40 units arrived as `energy`.
This finding is independent of finding 1 — it would mint mass on its own
even if the Pool → Decoding wire drained normally — but in this model the
two compound: finding 1 supplies the `1.25×Pool_t` growth term, finding 2
supplies the `+45` constant term in the recurrence above (`45 = 0.5×20
[decoding's half-share of mRNA] + 20[aa] + 20[ATP]`, restated).

**Ledger column semantics, precisely** (`ledger_history` row =
`[emitted, sunk, stored, dissipated]`, pushed at `circuit.rs:1411-1414`):
`emitted` is the running sum of physical (non-`Message`) mass delivered out
of every `Source` node, accumulated tick over tick
(`circuit.rs:1357-1366, 1383`). `sunk` is the running sum of physical mass
delivered into every `Sink` node (`circuit.rs:1330, 1384`). `stored` is
**not cumulative** — it is `Circuit::stored()`, the current-tick snapshot
of `Σ node.storage` across every node, recomputed fresh each time the row
is pushed (`circuit.rs:625-627, 1413`). `dissipated` is the running sum of
a **signed, per-node, per-tick residual** — `delivered[i] − out_phys −
gradient_out[i] − Δstorage[i]`, applied once per process node
(`circuit.rs:1331-1352`), with `Source`/`Sink` nodes handled by the
`emitted`/`sunk` paths instead. Nothing clamps this residual at zero. As
finding 2 above shows for `Decoding Site` specifically, `out_phys` can
legitimately exceed `delivered` when a node's ledgered inflow excludes an
observation-tap component that its ledgered outflow does not — at tick 2
this residual for `Decoding Site` alone is `20 − 32.5 = -12.5`
(`delivered = 20`, the mRNA only; `out_phys = act = 32.5`, the full
activity including the free Pool-level read) — so a negative cumulative
`dissipated` is the direct bookkeeping trace of the mechanism above, not an
arithmetic bug in the summation. `final_balance = emitted + baseline −
(stored + sunk + dissipated)` (`circuit.rs:636-639`) holds `≈0` at every
tick **because `dissipated` is defined, per node, as exactly the term that
forces this equation to close** (`circuit.rs:1349-1351` subtracts
`Δstorage` from the same residual that gets summed into `dissipated`) — so
`final_balance ≈ 0` certifies the ledger's own arithmetic is
self-consistent, and nothing more; it is not independent evidence that
mass was conserved, and reading it as such is the trap this pathology sets.

**Is this a defect, or documented default-semantics — and can an authored
model make the loop honest within the current language?** It is a genuine
defect in the one-tick map, not merely an artifact of unquantified
defaults: the run above uses the FULLY QUANTIFIED file
(`assets/examples/translation-apparatus.sl`, amounts declared on every
external flow), and the mechanism fires regardless. Neither of the two
productions this proposal adds (§2, §3) can repair it, because neither
touches the two code paths responsible: **finding 1** is a fixed
`(sender-kind, receiver-kind)` pattern match (`circuit.rs:652-662`) with no
clause in SL that can mark a specific `Buffering → Sensing` wire as a real
transfer rather than a tap — authoring `stock <unit> initial <n>` or `rate
<n>` on `"tRNA Pool"` changes its starting level or its own release cap,
never whether its *outgoing* wire is read as a tap. And even if it did
drain, a Buffering node's INFLOW is never rate-limited by anything —
`storage += delivered[i]` unconditionally (`circuit.rs:1299`) — so no
`rate` clause on the *receiving* end of a loop can cap absorption either.
**Finding 2** is likewise a structural property of `Combining`'s transfer
function, not a magnitude: declaring smaller or larger `amount`s on the
`aa`/`ATP` flows only rescales the mint rate, it does not stop the minting.
**Within the current language, the author cannot make this loop
conservation-honest by declaring quantities.** The only lever available
today is topological: route the recycle flow through a component whose
kind pair does not match `Buffering → Sensing` (so `is_observation` does
not fire), which is a modeling workaround around an engine heuristic, not
an expression of intent SL has a word for. This is a direct input to
scoping any demo built on this file: **declared amounts cannot fix it**;
fixing it needs either an SL production that overrides the tap
classification per-wire, or a change to `is_observation`'s matching rule,
or a change to how `out_substance` is assigned in `from_spec` — none of
which are in this proposal's scope (§2/§3 add typed productions for
`initial_state`/`cognitive_params` only) and all of which are prior to,
not downstream of, the transition-functor question this document answers.

## 2. The two missing SL productions, restated in F's terms

### 2.a Initial stock is a pointed coalgebra, not a change to F

`validate_operational` reads `agent.initial_state.get("storage")`
(`operational.rs:325`) into `OperationalProcess.initial_storage`; `from_spec`
writes it into both `node.initial_storage` and `node.storage`
(`export.rs:401-404`); `Circuit::reset` re-seeds `n.storage = n.initial_storage`
before every recorded run (`circuit.rs:522-528`). None of this touches
`step_dt`, `kindCodomain`, or any type in `Transition.lean`. It picks *which*
element of `X` the trajectory starts from — a choice of basepoint, i.e. a
**pointed coalgebra** `(X, T, x₀)` rather than a different `F`. The tether
path confirms the same reading from a second angle: `apply_params` writes
`stock_initial` — "a stock level's *initial* value at t0" (`tether.rs:64`) —
into the identical `initial_state["storage"]` slot (`forcing.rs:184-188`),
so an authored initial stock and an observed t0 value are the same kind of
fact by construction, not two mechanisms that happen to agree.

### 2.b Release rate is a parameter of the transition map, not a change to F

`cognitive_params.get("release_rate")` (`operational.rs:324`, cloned
wholesale) becomes `node.release_rate` (`export.rs:405-406`), read inside
`step_dt`'s Buffering arm as the base drain rate when no first-order time
constant is declared: `let base = ... else { node.release_rate };`
(`circuit.rs:1185-1189`), scaled by `dt` and capped by the opening stock
(`circuit.rs:1200-1201`). This is exactly a **parameter of `f`** in the sense
of `Transition.deterministicClosed f` (`Transition.lean:63-65`): changing
`release_rate` selects a different member of the deterministic-transition
family, the same way changing `dt` does (§1.4) — it never changes which
`kindCodomain` applies, so it is orthogonal to the endofunctor choice.

## 3. Draft SL spec slice (PROPOSAL — grammar and separating instances only)

No parser or emitter code is implemented here. This section states the
grammar shape, the emitter behavior it replaces, and one separating instance
per new rule, per the #216-register requirement that "a new constraint owes
a separating instance" (SSF #35, cited in the issue's 2026-07-27 comment).

### 3.1 The refusal being closed

`emit_sl` currently refuses any thing carrying either bag, verbatim
(`crates/bert-canvas/src/sl.rs:1735-1741`):

> ``"`{}` carries engine parameters (cognitive_params / initial_state) SL
> cannot yet express (#112) — export the model as kernel JSON instead of
> SL"``

This proposal's acceptance condition (from the issue's 2026-07-27 scope
comment) is that this check becomes unreachable for the two typed families
below — not deleted defensively, but dead because nothing untyped remains to
trip it.

### 3.2 Stock initial value — extend the existing `stock` clause

Today: `stock <unit>` (`sl.rs:486-514`), e.g. `stock ML`. Proposed:

```
stock <unit> initial <number>
```

e.g. `stock ML initial 4.5`. Rationale for extending rather than adding a
sibling clause: `initial` is meaningless without a declared unit (a bare
"4.5" has no dimension), so coupling it to `stock` prevents the
"what unit is this number in" question SL would otherwise have no answer
for. Boundary rule carried from the issue register: an initial value is an
input *to* dynamics, authored in the model — the tether supplies
`stock_initial` as a candidate value the wizard writes into the same field
(`forcing.rs:184-188`), it does not gain a separate SL production of its
own.

**Emitter behavior**: `emit_sl` writes `stock <unit> initial <n>` whenever
`t.initial_state` contains exactly `{"storage": n}` with `n` a finite
`f64`; any other key in `initial_state`, or a non-numeric/non-finite
`storage` value, still trips the existing refusal (narrowed, not widened —
the bag is typed only for the one key SL now expresses).

**Separating instance**: a fixture whose `initial_state` carries a second
key alongside `storage` (e.g. `{"storage": 4.5, "phase": "warm"}`) must
still refuse via the existing `sl.rs:1735` message — this is the instance
that fails the narrowed check and proves it is not silently accepting
whatever is in the bag.

### 3.3 Release rate — a `rate` clause parallel to `stock`

Proposed, on a Buffering component only (mirrors the `stock` clause's
`role == Role::Environment` refusal at `sl.rs:487-494`):

```
rate <number>
```

e.g. `rate 1.4`. Per the #216 register's non-negotiable rule 1 ("an unknown
parameter name is a parse fault, never a free-form bag"), `rate` names
exactly one family — `cognitive_params["release_rate"]` — and any other key
present in `cognitive_params` (`capacity`, `setpoint`, `time_constant`,
`maintenance`, `back_pressure` — all live fields per `export.rs:408-422`,
none of them in #112's scope) keeps the bag untyped and keeps the refusal
firing.

**Emitter behavior**: `emit_sl` writes `rate <n>` whenever
`t.cognitive_params` contains exactly `{"release_rate": n}`; any additional
key still refuses.

**Separating instance**: a Buffering component whose `cognitive_params`
carries `{"release_rate": 1.4, "capacity": 50.0}` must still refuse —
`capacity` is a real, executing field (`circuit.rs:1311-1313`) with no SL
production yet, so accepting the bag because one recognized key is present
would silently drop `capacity` on export. This is the instance that
distinguishes "narrow the check" from "delete the check."

**Separating instance for the grammar itself**: `rate` applied to a
non-Buffering component (e.g. a Propelling node) must be a parse fault —
mirroring the existing `stock`-on-environment refusal — since
`release_rate` has no reader outside the Buffering arm of `step_dt`
(`circuit.rs:1154-1209`); a `rate` clause elsewhere would parse to a value
nothing in the engine consumes.

### 3.4 Projection path

Both clauses round-trip through the same seam already exercised for
`stock <unit>` (`sl.rs:1758-1759` on the writer side): parse into the
canvas thing's `initial_state`/`cognitive_params` bag (typed narrowly to the
one key each clause owns), `apply_params`-style writers already target that
exact bag (§1.1, §2), and `validate_operational`/`from_spec` need no change
at all — they already read `initial_state["storage"]` and
`cognitive_params["release_rate"]` today. The bypass the issue's 2026-07-27
comment names — "the compose-exporter route as a bypass, not a path"
(spec §8.2) — closes exactly when SL can author both fields directly instead
of only carrying them opaquely from a loaded JSON.

## 4. The SSF Lean target, named (not proven here)

The issue's adoption point 2 — "H = final-coalgebra image of S under T" — has
a Lean home already partly built, not invented by this document:

- `Systems.kindCodomain` (`Transition.lean:45-49`) names `F` per kind, with
  `.deterministic ↝ Id`, matching §1.3's finding that the shipped stepper
  instantiates the `Id` case.
- `Systems.Transition` (`Transition.lean:55-56`) is the Mealy-shaped
  structure map already discussed in §1.5; its closed degenerate case is
  what the shipped `Circuit` realizes.
- Per the issue's 2026-07-25 comment ("SETTLED: the final coalgebra exists
  for all three kinds"), `F_k(X) = (kindCodomain k (outputType × X))^inputType`
  is a polynomial (container) functor for every kind, so a final coalgebra
  (an M-type) exists unconditionally — cited there to Abbott–Altenkirch–Ghani
  (*Containers*, TCS 342(1) 2005) and Gambino–Kock (*Polynomial functors and
  polynomial monads*).

**What a coinductive statement for the shipped `Circuit` would say, without
claiming it proven:** given the closed deterministic instance identified in
§1.3 (`F = Id`, `S` = the product state of §1.2 restricted to the minimal
fields), the final `Id`-coalgebra is a single point — the degenerate case the
2026-07-25 comment already worked out ("`.deterministic` closed: `Id` →
final coalgebra `1`; every state bisimilar; `H` is a point"). That comment
also records the fix that avoids the degeneracy: `H` is meaningful exactly
when `outputType` "separates the trajectories claimed as mechanisms," and
the identity observer `outputType := Carrier` always does. For `Circuit`,
the natural candidate carrier is the minimal state of §1.2 (storage,
activity, tick, time, ledger totals, *without* the trace buffers per the
§1.6 finding); the coinductive statement this would import is exactly
`Transition.deterministicClosed` instantiated at that carrier, with `H`
defined as the final-coalgebra unfolding of `step_dt(dt)` for fixed `dt`.
**None of this is proven for `Circuit` specifically** — the Lean file proves
existence and constructiveness for the general `kindCodomain` family at
arbitrary port types, axiom-free (`#print axioms`, 2026-07-25 comment); it
does not (and this document does not) construct or check the
`deterministicClosed` instance for the actual `Circuit` state type or prove
`RecordedRun`'s `history` equals that unfolding. That gap — instantiating
the general existence result at BERT's concrete state type — is future work,
not claimed here.

## 5. The openness caveat

Carried verbatim in substance from the issue body: Rutten's coalgebras are
closed — no boundary, no typed I/O flows, no environment. The functor
derived in §1 covers the dynamics rung only, for the state space of a single
already-wired `Circuit`. It says nothing about C (things), N (network/bonds),
B (boundary), G (interface glue), or E (environment) — composition of open
systems, boundary crossings as typed ports, and the wiring-diagram operad
that closes composition under coupling are the separate, already-parked
frontier (Poly / structured cospans / Mealy openness research, VSL,
Spivak–Tan, SSV — see the issue's 2026-07-23 through 2026-07-27 comments).
`porosity` (`circuit.rs:480-487`) and interface routing
(`operational.rs:94-107`) are boundary-adjacent knobs already present in the
shipped code, but they are folded into the closed transition's fixed
parameters (§1.2) exactly like `release_rate` — they are not a typed
open-systems interface in the Poly/Mealy sense, and this document does not
claim they are.
