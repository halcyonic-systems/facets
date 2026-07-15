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

## Phase 2 surface (built — the canvas seam)

The canvas holds its own editing model and asks Rust for legality. Shapes:
```ts
type Lens = "Klir" | "Bunge" | "Mobus"            // → Core | Structural | Operational
type Role = "Component" | "Environment"
type Kind = "Unspecified" | "Energy" | "Matter" | "Field" | "Informational"
type Thing = { id: number, name: string, x: number, y: number, role?: Role, primitive?: string }
type Relation = { id: number, a: number, b: number, name?: string, is_bond?: boolean, kind?: Kind }
type CanvasModel = { lens: Lens, things: Thing[], relations: Relation[] }
```

### `validate_mode(model_json, mode) → ValidationResult`
`mode` = "Core" | "Structural" | "Operational" | "Full". The kernel-side lens
gate (the Structural bond rule / Operational irreflexivity come for free). Same
`ValidationResult` shape as `validate`.

### `project(canvas_json) → WorldModel`
Project the canvas editing model into a bert-core `WorldModel` (mode-stamped by
the lens; only bonds project; touched environment things → Source/Sink by
direction). The canvas never builds a WorldModel itself.

### `to_canvas(model_json) → CanvasModel`
The display-faithful inverse of `project`: load an existing `WorldModel` onto the
canvas as an editing model (level-1 systems → component things with primitive +
position; env source/sink → environment things; interactions → relations typed by
substance; lens from mode). For Phase 2b (load a demo → drive → run), the canvas is
a VIEW + drive-target picker and the run uses the original model, so dynamics
params are not round-tripped here.

### `validate_connection(canvas_json, candidate_json) → { issues: ValidationIssue[] }`
Validate a proposed `Relation` at the model's current lens; returns the issues
the candidate INTRODUCED (empty = legal). E.g. a self-loop is rejected at Mobus
(irreflexivity) but legal at Klir. The per-drag "React asks Rust" call.

## Phase 3 surface (built — faithful lens palettes)

Both functions take **canvas JSON**, not model JSON — a deliberate deviation:
mere relations (Bunge's B̄) exist only in the editing model, never in a
`WorldModel`. Internally each projects (`project_with_map`) and reads bert-core
verdicts (`boundary_components`, `edge_locus`, the Structural gate), so the
math is still the kernel's; the canvas keys are translated at the seam.

`Relation` gains one optional field (serde-defaulted, wire-compatible):
```ts
type Relation = { ..., klir_directed?: boolean }  // Klir's neutral ⇄ directed view toggle
```

### `lens_facts(canvas_json: string) → LensFacts`
The two lens primitives, canvas-keyed — everything the three lens renderings
read. Delegates to `bert_core` via `lenses::lens_facts`.
```ts
type EdgeLocus = "Endo" | "Exo"          // Bunge endo/exostructure = Mobus N/G, computed
type PortDirection = "Receives" | "Exports" | "Hybrid"
type EdgeFact = {
  id: number, a: number, b: number,      // canvas relation + endpoint ids
  bond: boolean,                          // Bunge bond vs mere relation
  kind: Kind,
  locus: EdgeLocus,
  self_loop: boolean,
  mobus_ok: boolean,                      // false iff self-loop (no_self_loops: no Mobus preimage)
}
type PortFact = {                         // one Mobus interface r=(S,φ) per (component, env) pair
  component: number,                      // ALWAYS ∈ boundary_thing_ids (the boundary identity)
  env: number,
  relation_ids: number[],                 // the exo flows this port gates
  direction: PortDirection,
  protocol: string,                       // φ — joined flow names, else the kind
}
type LensFacts = {
  boundary_thing_ids: number[],           // {c ∈ C : coupled to E} — Bunge marks, Mobus reifies
  environment_thing_ids: number[],        // O — the environment objects
  boundary_props: { porosity: number, perceptive_fuzziness: number },
  aggregate: boolean,                     // Bunge Def 1.1 verdict from validate_mode(Structural)
  edges: EdgeFact[],                      // EVERY canvas relation, incl. mere relations
  ports: PortFact[],
}
```
Throws only on unparseable canvas JSON.

## Notes
- The wasm is built with `wasm-pack build --target web` into `pkg/` (a build
  artifact, gitignored). `--release` for the shipped bundle; `--dev` while iterating.
- Typed boundary (tsify-generated `.d.ts`) is a Phase-1 refinement; today the
  results are `any` at the wasm edge and typed by the hand-written mirrors in
  `web/src/kernel/types.ts`. Kept this way so `bert-core` carries no wasm/tsify
  dependency and stays a pure kernel.
