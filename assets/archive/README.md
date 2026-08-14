# The archive — models retired from the shipped library (#318)

These are not deleted and they are not broken. They are the record of how the
language was learned: nearly every one was written to find out whether SL could
say something, and the answer it gave is the reason the file still exists.

They are here rather than in `../examples/` because the shipped library was
curated down to a keep set in August 2026 — the admission rule is stated in
`../examples/README.md` (a model ships iff it is the smallest witness of a
distinction the kernel can make). Being here means three things:

- **out of the gallery** — the web app globs `assets/examples/*.sl`, so nothing
  in this directory appears as a library card;
- **out of the CLI survey** — `crates/bert-cli/tests/support/mod.rs::library()`
  discovers `assets/examples` and `assets/corpus` only, so a file here is not
  held to the door's contract;
- **still in the repo, still compiling, still runnable from the CLI.**
  `bert run assets/archive/watershed.sl --t 12` works exactly as it did.

Four of these files are still read by gates, by path, because they carry a fact
no shipped model carries — `bank-run` and `respiring-cell` (`bert-canvas/tests/environment_kind.rs`), `fsm-traffic`
(`bert-cli/tests/surface.rs`) and `lake-observation` (`bert-canvas/tests/sl_level.rs`). Those are marked **HELD** below; moving or editing one
of them turns a test red, which is the intended arrangement.

## What is here, and what each one settled

| file | lens | runs? | why it was written, and what it settled |
|---|---|---|---|
| `bank-run.sl` | mobus | **runs** | Reserve level read as information, information becoming panic, panic draining the reserve — a social system whose feedback is entirely informational except at the sensing tap. Second witness (with `predator-prey`) for the derived-direction fix in `environment_kind.rs`. **HELD** by that test. |
| `respiring-cell.sl` | mobus | **runs** | Formerly `cell-metabolism.sl`; renamed here (see below). The smallest runnable model in the repo, and the proof that *running needs no quantities at all*: no `time unit`, no `amount`, no `stock`, no parameter of any kind. It runs because its flow graph is acyclic. **HELD** by `environment_kind.rs`. |
| `fsm-traffic.sl` | klir | no | A finite-state machine authored under the Klir lens. Settled that a Klir-pinned model cannot reach `run` at all — Core mode has no flow semantics — which is a statement about the mode, not a defect in the file. **HELD** by `crates/bert-cli/tests/surface.rs` as the CLI's refusal instance. |
| `lake-observation.sl` | klir | no | Klir's source system reached from Klir's own side: variables and observation channels, no generating rule. One of only two `level Source` models, and the Klir half of the cross-tradition rhyme with `corpus/mobus/steel-plant.sl` (#288 decision 2). **HELD** by `crates/bert-canvas/tests/sl_level.rs` — it is the same-level comparison that must succeed for the §5.4 refusal to be a real distinction rather than a blanket one. |
| `ribosome-subunits.sl` | mobus | **runs** | The ribosome at the grain of its two physical subunits, and the variant that carries George Mobus's own correction of 2026-08-12: the magnesium and ionic milieu is an **input to the large subunit**, which is a component only in a model drawn at this grain. Sibling of `../examples/ribosome-centers.sl`; the pair settles that the same system under the same boundary admits two faithful decompositions, and that a domain expert's correction can be a statement about *grain* rather than about content. |
| `parity-automaton.sl` | klir | no | The library's **only** `level Generative` model: its four labelled flows are the complete transition table, so the generating rule is authored in full. Also carries a self-loop that Mobus refuses under §4.3, for the same reason Bunge's σ₃ is refused — cited from `assets/corpus/README.md`. |
| `supply-chain.sl` | mobus | **runs** | With `watershed.sl`, one of the first two SL-authored runnable demos (2026-07-27). Its original feedback loop was the *discovery* of the deaf-receiver defect (#261): an informational flow into a component that does not consume messages, delivered every step and ignored. That finding is now permanent in `bert-core` (`check_flows_are_consumed`) and in `crates/bert-core/tests/flows_consumed.rs`, which quotes this model's original wiring. Its run bundle is in `demos/`. |
| `thermostat.sl` | mobus | refused | The textbook control loop, and the model that *cannot run* — `Furnace → Sensor → Thermostat → Furnace` is a loop of pure relays, refused by #259. The repair is not a parameter: it is a **missing thing**. The room is the regulated variable and it is not in the model, so the loop has nowhere to remember. `demos/homeostat.json` (in this archive since the pre-SL demos retired) is the same system with the room present, and it runs. Keep the pair; the diff is the lesson. |
| `transformer-block.sl` | mobus | refused | The second algebraic-cycle refusal, on a residual stream. Shows the refusal is not a quirk of small control loops — a five-node computational loop fails the same way and for the same reason. |
| `translation-apparatus.sl` | mobus | **promoted** | Was here 2026-08-13 → 2026-08-14, then promoted to `../examples/` for the ribosome dynamics arc (the 8/19 deliverable): `ribosome-centers.sl` with the **boundary widened** to bring the aminoacyl-tRNA synthetase inside, so tRNA becomes a carrier that circulates, and the loop passes gate 3 because `tRNA Pool` is a `Buffering` whose return leg is **matter**. The first *biological* witness for the rule `thermostat.sl` states negatively — and under the slot rule, the smallest witness of a biological loop that runs because it was drawn. |
| `two-sided-market.sl` | bunge | no | Bunge-native: bonds and `mere` relations, no typed flows. Second-worst Klir residue in the cross-lens sweep (25 declared facts Klir cannot see, `docs/216-cross-lens-findings.md`). |
| `watershed.sl` | mobus | **runs** | The first SL-authored runnable model, and the one that separates the conservation ledger into all four channels at once — emitted, stored, sunk, dissipated. Was the doc's crib for "smallest runnable source"; that role passes to `respiring-cell.sl` here (smaller) and `predator-prey.sl` in the shipped set (still there). Its run bundle is in `demos/`. |
| `workshop-crew.sl` | bunge | no | Bunge's CES triple written out as content, `mere` relations included — the B̄ half that Mobus is structurally blind to (7 facts). |

## `demos/` — five retired run bundles

Two SL-authored, three pre-SL. In each case `<name>.json` is the gallery
bundle (title, blurb, genus, horizon, forcing CSV, mapping) and
`<name>-model.json` is the machine model beside it.

`supply-chain.json` and `watershed.json` are projections of the `.sl` files in
this archive. They were minted by `BLESS_SL_DEMOS=1` and are **frozen at the
moment of archiving** — nothing re-mints them now, because
`crates/bert-canvas/tests/sl_demos.rs` no longer lists these two. Editing
either `.sl` will silently make its projection stale. If one of these ever
comes back to the shipped library, put its name back in `DEMOS`, move the four
files back, and re-bless.

`allocation`, `homeostat` and `reservoir` are the **pre-SL demos** — hand-
authored JSON from before the language existed, retired from the gallery in
the August 2026 curation. They cannot be ported: `reservoir` carries
`initial_state.storage` and `homeostat` carries `release_rate`, and SL can say
neither (`docs/authoring-models.md`, "The three pre-SL demos"). Each still
carries a fact no shipped model does, which is why the gates followed them
here rather than letting them go:

| file | why it was kept, and what holds it |
|---|---|
| `reservoir` | The only model in the repo that **starts with a stock already full** (`initial_state.storage`) — the drain-down instance every empty-start model cannot be. **HELD** by `bert-tether/tests/adversarial.rs`, `bert-canvas/src/canvas.rs`, `bert-lenses-kernel/src/api.rs`, and the loops below. |
| `homeostat` | The closed loop that **converges** — the positive half of the `thermostat.sl` pair above (same system, room present, and it runs), and the only feedback path where Δt-refinement drift can accumulate. **HELD** by `bert-canvas/tests/dt_invariance.rs` (the convergence gate names it alone). |
| `allocation` | A source split across competing consumers. Its structural fact already lives richer in `../examples/llm-market.sl`; it stays for its **hand-authored run bundle** (see below). |

All three are also **HELD** as a set by `bert-tether/src/forcing.rs`
(`every_bundled_demo_runs_forced_and_conserves` — they are the only
hand-authored bundles; llm-market's is minted from SL), and by the demo loops
in `bert-canvas/tests/dt_invariance.rs` and `canvas_round_trip.rs`. Moving or
editing any of the six files turns a test red, which is the intended
arrangement.

## The rename

`cell-metabolism.sl` → `respiring-cell.sl`, `system "Cell Energy Metabolism"` →
`system "Respiring Cell"`. "Cell metabolism" is a **process**; a system is a
**thing**. The file's own contents were always about the thing — two residents
(mitochondria, ATP pool) inside a boundary, with a bloodstream outside it — so
the name was the only part that was wrong. This is #313's source/process/system
confusion appearing in our own library rather than in someone's draft, which is
the reason it is worth recording rather than quietly fixing.

The name claims nothing the file does not contain. It does not say *what kind*
of cell, because the model does not say: the only evidence is a bloodstream in
the environment, which narrows it to an animal cell and no further.
