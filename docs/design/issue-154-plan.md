# #154 plan — Klir source-system C table + phase-5 dynamics readouts

*2026-07-23 · plan of record. The honest continuation of #100 (per-lens registers, shipped/closed). Grounded in the code (`KlirRegister.tsx`, `RunPanel.tsx`, `BungeStateSpace.tsx`, `crates/bert-canvas/src/canvas.rs`) and the dynamics spine (`dynamics-coalgebra-halfa.md`, SSF `Transition.lean`).*

## The three pieces (distinct size and risk — do NOT lump them)

#154 is one issue holding three separable deliverables. Their sizes differ by an order of magnitude; planning them as one "finish the registers" push is the trap.

| # | Piece | Size | Risk | Gate |
|---|-------|------|------|------|
| **P1** | Live-tick marker | small | low (pure presentation) | none |
| **P2** | Klir C source-system table | medium | **schema touch** (Rust→wasm→persist→SL) | a modeling decision |
| **P3** | Klir behavior-function readout | large | compose seam + eval data | runnable Klir model |

**Recommended sequence: P1 → P2 → P3.** Risk-ascending; P1 also de-risks the exact tick-threading P3's live readout will reuse.

---

## P1 — Live-tick marker (the small one, ship first)

**What:** the SimScrubber's current `tick` drives a highlighted dot on the Bunge phase-portrait (and, later, the P3 Klir readout), so scrubbing the run moves a marker along the state-space path.

**The seam is already 90% there.** `App` owns `tick` (`App.tsx:207`, `const [tick, setTick] = useState(0)`); `SimScrubber` reads/sets it (`App.tsx:1769`). What's missing: `tick` never reaches the register. `BungeStateSpace({ result })` (`BungeStateSpace.tsx`) already builds `points` with `{x, y, t}` — it just doesn't know the current `t`.

**Touch (pure presentation, no kernel, no schema):**
1. Thread `tick` down the one path that doesn't have it: `App` → `InspectorDock` (`App.tsx:1809`) → `RunPanel` (`RunPanel.tsx:50`) → `BungeStateSpace` (`RunPanel.tsx:126`, currently `<BungeStateSpace result={result} />`). One optional `tick?: number` prop at each hop.
2. In `BungeStateSpace`, render a second `<Scatter>` of just `points[tick]`, accent-filled and larger — the live dot. Guard `tick` in range.

**Cost:** ~1 sitting. **Verify:** any ≥2-stock runnable model (the `reservoir`/`homeostat` Mobus demos suffice for the *marker itself*; lens-fidelity of the readout is the P3/eval question, not P1's).

---

## P2 — Klir C: the Variable/Support State Table (the schema touch, do carefully)

**What:** Klir's Table 4.1, the source-system register — each variable's **basic-vs-supporting** status, **input/output** role, **scale type** (nominal/ordinal/interval/ratio), and **state set**. The ground floor of Klir's epistemological hierarchy; the complement to D (the ladder, already shipped in #100 via `KlirLadderPanel`).

**Why it's the careful one — two of the four columns are not in the model today.** A display-only table (names + derived roles + empty scale/state columns) was already considered and rejected on the issue: a table that is mostly "—" doesn't earn its place. The value is in *declaring* the source-system characteristics, so the fields must exist.

- **Derived (free):** input/output role from directed relations; basic-vs-supporting is a reading of the same. No schema.
- **Authored (the schema touch):** `scale` and `states` per variable/thing.

**The schema touch, following the proven optional-field pattern** (`Thing.primitive` / `.child_model` / `.stock_unit` all use `#[serde(default, skip_serializing_if = "Option::is_none")]` so pre-existing models stay byte-identical):
1. `crates/bert-canvas/src/canvas.rs` — add to `Thing`:
   - `scale: Option<ScaleType>` (new enum `Nominal | Ordinal | Interval | Ratio`).
   - `states: Option<...>` — **the state set; representation is the load-bearing decision (below).**
2. **wasm boundary** — `Thing` already crosses via `CanvasModel` serialization (`api.rs`); optional fields ride along for free, but confirm the TS `Thing` type (`web/src/kernel/types`) gains them.
3. **persistence** — `writeArchive`/`openModel` are serde-driven; `skip_serializing_if` keeps old files identical. Add a round-trip fixture.
4. **SL syntax** — a `scale` / `states` attribute on `component` lines (`crates/bert-canvas/src/sl.rs` parse + emit), with a `sl_roundtrip` golden. Design the surface (below).
5. **UI** — a third `KlirRegister` view `"table"` beside the existing `"sets" | "matrix"` toggle (`KlirRegister.tsx:69`): Table 4.1 (variable · basic/supporting · in/out · scale · state set) + an inline editor for the two authored columns, mirroring how the sets view edits names.

**⚠ The one decision that gates P2 (Shingai's call): the state-set representation.** Klir's state set is the set of values a variable can take. Options:
- **(a) enumerated labels** — `states: Option<Vec<String>>` (e.g. `{Green, Yellow, Red}`). Faithful for discrete/nominal variables (the FSA case); verbose for continuous.
- **(b) a type/range tag** — `states: Option<StateSpec>` where `StateSpec` = a small enum (`Finite(Vec<String>)` | `Interval{lo,hi}` | `Countable`). More expressive, more surface.
- **(c) a count + scale** — just cardinality; too thin (loses the actual values).
Recommendation: **(a) to start** (covers the FSA/Klir-native case cleanly and is the minimum that isn't "—"), with `StateSpec` (b) as a forward-compatible upgrade if continuous state sets bite. This choice also fixes the SL syntax.

**Cost:** medium — a full-stack vertical slice (Rust enum + field, wasm/TS, SL parse/emit + golden, persistence fixture, the table view + editor). Gate on the state-set decision first.

---

## P3 — Klir behavior-function / mask readout (the hard one, last)

**What:** Klir's Fig. 4.3 / Table 4.3, the `f : Ḡ → G` table, presented in the Klir register. Per `dynamics-coalgebra-halfa.md`: **this table IS the coalgebra structure map `T` read in Klir's register** — the same object the Bunge trajectory unfolds (H). Mask = which past/present variables determine the next; for a deterministic step, `Ḡ` = current state, `G` = next.

**Why it's the largest:**
1. **Needs the deeper compose seam** — the declared `support`/`Δt` and the dynamics descriptor (`Transition`, SSF #27) must reach the Klir register. The Bunge trajectory (#153) got by on the compose run's raw per-tick trajectories; the mask table needs the *declared* dynamics (which variables, what window), not just the numeric series. That wiring (support/Δt → register) does not exist yet.
2. **Needs runnable native data to evaluate** — see the cross-cutting gate below.

**Shape:** a table view in the Klir register (fourth view, or a dynamics sub-panel) rendering, per row, a mask instantiation `Ḡ` → its generated `G`, sourced from the run's per-tick trajectories keyed by the declared support window. Reuses P1's `tick` for a live "current mask row" highlight.

**Likely splits into:** (3a) wire the declared support/Δt through the compose seam to the register; (3b) render the `f : Ḡ → G` table from it. 3a is the real work.

---

## Cross-cutting gate — evaluation needs a runnable non-Mobus model

Both readouts' *lens-fidelity claim* (is this really Klir's mask on Klir-native data?) can't be judged today: the only runnable demos are Mobus-native, and the Klir/Bunge corpus entries are **structural** (they don't run — no trajectories). Logged on #14/#153.

**The connection to make:** the #14 frontier sweep (2026-07-23) produced **`fsm-traffic` (a Klir-lens FSM)** and **`two-sided-market` (Bunge)** as candidates — exactly the native models these registers want. They are structural today; making `fsm-traffic` **runnable** is the unblock, and that is precisely **#67** (CSV + simulating an FSA / Markov mode). So:

- **P1** and the *rendering* of P3 can be built and demoed against Mobus stocks now.
- The **Klir/Bunge fidelity evaluation** of the readouts is gated on a runnable Klir model → sequence #67 (or curate a runnable `fsm-traffic`) alongside P3, not before P1/P2.

---

## Open decisions for Shingai (before P2/P3 code)
1. **State-set representation (P2 gate):** enumerated labels (a) / typed `StateSpec` (b) / count (c). Recommendation: (a) now, (b)-ready.
2. **SL surface for `scale` + `states`** — falls out of (1).
3. **P3 evaluation:** ship the mask table display-only against Mobus first, or wait for a runnable Klir model (#67 / curated `fsm-traffic`)? Recommendation: build the seam + table, label it honestly, evaluate when the runnable Klir model lands.

## Recommended immediate step
**Start P1 (live-tick).** Small, self-contained, no decision required, and it lays the `tick`-threading that P3 reuses. P2 waits only on decision (1); P3 waits on the compose seam + the #67 runnable-Klir connection.
