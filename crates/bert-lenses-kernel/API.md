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

## Phase 1 extension (reserved — the wizard surface)

These attach in Phase 1 (CSV mapping wizard + run panel), building on the same
pure `tether`/`manifest` modules already vendored here. Reserved so Phase 1
extends the surface without churning Phase 0:

- `mapping_gates(draft_json) → { can_finish, units_ok, time_unique_ok }` — the
  T1/T2/T5 gates over a `MappingDraft`.
- `resolve_manifest(manifest_json, csv_text) → MappingDraft` — the declarative
  manifest path onto the same mapping the wizard drives.
- `run` gains an optional `mapping_json` arg so imported series force flows
  (the rung-1/2/3 forced-boundary path), and `to_world_model` / `from_world_model`
  are exposed for the round-trip.

## Notes
- The wasm is built with `wasm-pack build --target web` into `pkg/` (a build
  artifact, gitignored). `--release` for the shipped bundle; `--dev` while iterating.
- Typed boundary (tsify-generated `.d.ts`) is a Phase-1 refinement; today the
  results are `any` at the wasm edge and typed by the hand-written mirrors in
  `web/src/kernel/types.ts`. Kept this way so `bert-core` carries no wasm/tsify
  dependency and stays a pure kernel.
