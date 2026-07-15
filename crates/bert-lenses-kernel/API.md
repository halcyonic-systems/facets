# bert-lenses-kernel — frozen wasm API

**Status: FROZEN (Phase 0).** This is the JS↔wasm boundary the web face calls.
The kernel is the brain; the face only marshals input in and renders the result.
No systemhood verdict, validation, or simulation is ever computed in JS — every
answer below is delegated to `bert-core` (semantic authority) or `bert-compose`
(the engine). Changing a signature here is an API break; add, don't mutate.

All functions are synchronous (the wasm runs in the page). Model input is BERT
`WorldModel` JSON text. Results are plain JS objects (serde-serialized); the TS
mirrors live in `web/src/kernel/types.ts`.

## Phase 0 surface (implemented + proven)

### `validate(model_json: string) → ValidationResult`
The 4-layer systemhood report. Delegates to `bert_core::validate::validate`.
```ts
type ValidationResult = { issues: ValidationIssue[] }
type ValidationIssue = {
  severity: "Error" | "Warning",
  location: string,
  message: string,
  suggestion: string | null,
}
```
Throws only if `model_json` is not parseable as a `WorldModel`.

### `validate_operational(model_json: string) → OperationalOutcome`
The executable-projection gate. Either the spec a simulator needs, or the
complete list of reasons the model cannot run. Delegates to
`bert_core::operational::validate_operational`.
```ts
type OperationalOutcome =
  | { ok: OperationalSpec }        // executable — the projection
  | { errors: OperationalError[] } // refused — why, with seam locations
```
`OperationalSpec` / `OperationalError` are bert-core's serde shapes (see the
crate). Throws only on unparseable input.

### `run(model_json: string, dt: number, ticks: number) → RunResult`
Project → build circuit → record `ticks` steps of size `dt`. Throws if the model
is not executable (call `validate_operational` for the reasons). Runs the model
**as authored**; external CSV forcing is the Phase-1 extension below.
```ts
type RunResult = {
  dt: number,
  history: number[][],        // per-tick [tick, n0.activity, n0.storage, n0.total, n1...]
  ledger_history: [number, number, number, number][], // [emitted, sunk, stored, dissipated]
  final_balance: number,      // conservation residual (≈0 = mass conserved)
}
```

### `parse_csv(text: string) → CsvParse`
First step of the tether: headers + string rows (gaps disclosed, never filled).
```ts
type CsvParse = { headers: string[], rows: string[][] }
```

## Phase 1 surface (built — the tether wizard + forced run)

The wizard holds manifest-shaped UI state (`{ model:"", data:"", t, dt?, mapping:
[{column, as, element, unit, force, every?}] }` — the pipeline's `RunManifest`
shape; `model`/`data` paths are unused in the browser). All gates, commit,
forcing, and comparison maths stay in Rust.

### `model_targets(model_json) → { flows, components }`
The mapping-target menus, read from the model.
```ts
type Targets = {
  flows: { id: number, name: string, unit: string }[],       // interactions
  components: { id: number, name: string }[],                // level-1 systems
}
```
`id` is an opaque handle (flows first, components offset past them) the manifest's
`element` names resolve to; the wizard shows `name`.

### `mapping_status(model_json, csv_text, manifest_json) → MappingStatus`
Live wizard status — reconstructs the `MappingDraft`, runs the gates, no effects.
```ts
type MappingStatus = {
  t1_ok: boolean,                       // every column spoken for
  t2_ok: boolean, t2_msg: string|null,  // flow magnitudes declare units
  t4_ok: boolean, t4_msg: string|null,  // time column is unique (no long panel)
  can_finish: boolean,
  translations: string[],               // one per assigned column, plain-language
  inferred_dt: number|null,             // median gap of the time column
  apply_error: string|null,             // manifest resolution problem, if any
}
```

### `run_forced(model_json, csv_text, manifest_json, dt, t, today) → RunResultRich`
Force the model with the imported CSV over `(dt, t)`, read back in domain terms.
Throws (with a legible reason) if the mapping is incomplete or the model is not
executable. `today` = `YYYY-MM-DD` from JS (the wasm path never reads system time).
```ts
type RunResultRich = {
  ticks: number, dt: number,
  residual: number, conserved: boolean,
  levels: { name, unit, value, category: "product"|"resource"|"internal" }[],
  comparisons: {                        // simulated vs actual, BY DOMAIN NAME
    element, kind: "stock"|"flow", unit,
    simulated: number[], actual: number[],
    declared: number[]|null,            // the flat declared-mean baseline (flows)
    divergence_pct: number|null,
  }[],
  trajectories: { name, unit, series: number[] }[],
}
```
Everything is labeled by the model's own names + units — no engine columns leak.

## Notes
- The wasm is built with `wasm-pack build --target web` into `pkg/` (a build
  artifact, gitignored). `--release` for the shipped bundle; `--dev` while iterating.
- Typed boundary (tsify-generated `.d.ts`) is a Phase-1 refinement; today the
  results are `any` at the wasm edge and typed by the hand-written mirrors in
  `web/src/kernel/types.ts`. Kept this way so `bert-core` carries no wasm/tsify
  dependency and stays a pure kernel.
