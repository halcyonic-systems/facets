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
  // #319, additive: the DEFECT KIND this issue is one instance of, named
  // kernel-side (`bert_core::validate`, a required argument at every issue
  // construction site). Two issues share a code iff the kernel says they are
  // the same defect, which is what lets a surface group repeats without
  // matching message text. Optional on the wire; absent = unnamed kind, which
  // a surface must degrade to a singleton rather than guess at.
  code?: string,
  location: string,
  message: string,
  suggestion: string | null,
  // #129, additive: stable doc anchor for the precondition the issue cites —
  // a repo-relative docs path + heading anchor chosen kernel-side
  // (bert_core::validate::doc; anchors pinned by the doc_anchors_resolve
  // test). Optional on the wire; absent/null = no doc link.
  doc?: string | null,
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
is not executable (call `validate_operational` for the reasons), and throws —
with the loop named in the author's node names — if the wiring contains a loop
with no stock and no level read on it: a loop of pure relays has no
deterministic step (#259; `run_forced` refuses identically). `dt` is read by
the dynamics: rates are per time unit, so equal horizons at different step
sizes agree to within O(Δt) drift (`dt_invariance.rs`). Runs the model
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
  levels: { name, unit, unit_derived: boolean,   // unit derived from inflow×Δt (#94)
            value, category: "product"|"resource"|"internal" }[],
  comparisons: {                        // simulated vs actual, BY DOMAIN NAME
    element, kind: "stock"|"flow", unit,
    simulated: number[], actual: number[],
    declared: number[]|null,            // the flat declared-mean baseline (flows)
    divergence_pct: number|null,
  }[],
  trajectories: { name, unit, unit_derived: boolean, series: number[] }[],
}
```
Everything is labeled by the model's own names + units — no engine columns leak.
`unit_derived` is true when an undeclared Buffering stock's `unit` was derived from
its inflow integrated over Δt (bert-lenses#94: `ML/mo` → `ML`, in the author's own
vocabulary, never SI-canonicalized), rather than read from a declared stock unit.
An intrinsic rate integrates using the model's declared time-unit symbol
(`WorldModel.time_unit` / SL `time unit h`): `kW` → `kW·h`, or the abstract
`kW·Δt` when the model declares none — the kernel never invents a symbol.

## Phase 2 surface (built — the canvas seam)

The canvas holds its own editing model and asks Rust for legality. Shapes:
```ts
type Lens = "Klir" | "Bunge" | "Mobus"            // → Core | Structural | Operational
type Role = "Component" | "Environment"
type Kind = "Unspecified" | "Energy" | "Matter" | "Field" | "Informational"
type Thing = { id: number, name: string, x: number, y: number, role?: Role, primitive?: string,
               stock_unit?: string,                   // declared stock unit (#76/#94)
               description?: string }                 // the author's prose (#326)
type Relation = { id: number, a: number, b: number, name?: string, is_bond?: boolean, kind?: Kind,
                  description?: string,               // the author's prose (#326)
                  usability?: "Resource" | "Disruption" | "Product" | "Waste" }  // #331; absent = undeclared
type CanvasModel = { lens: Lens, things: Thing[], relations: Relation[], time_unit?: string }
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

`CanvasModel` gains one serde-defaulted field (#51 slice 3, wire-compatible —
absent on old payloads deserializes to 0.0/0.0 = unauthored):
```ts
type CanvasModel = { ..., boundary: { porosity: number, perceptive_fuzziness: number } }
```
Authored B properties for the root membrane; `project` carries them onto the
root system's boundary (previously hardcoded 0.0) and `to_canvas` restores them.

`Thing` gains one serde-defaulted field and `LensFacts` one additive list
(#51 slice 3, wire-compatible):
```ts
type Thing = { ..., interface?: boolean }  // authored member of I (I ⊆ C; flowless refuses at Operational)
type LensFacts = { ..., authored_interface_thing_ids: number[] }
```
A designated component projects as an `Interface` entry on the ROOT membrane,
attached via its own `boundary.parent_interface`; crossing flows at designated
components carry `source_interface`/`sink_interface`. Effective I =
`boundary_thing_ids ∪ authored_interface_thing_ids`; `describe`'s Mobus
`b_interfaces` reports authored-flowless members with a "(flowless)" suffix.
A flowless member is an Error at `Mode::Operational`/`Full`
(`interfaces_carry_flow`, SSF #31) — `validate_connection` never reports it, so
stamping before drawing the crossing flow does not block the gesture.

`CanvasAnalysis` gains one additive field (#51 slice 3, wire-compatible):
```ts
type CanvasAnalysis = {
  ...,
  issue_targets: {
    thing: number|null,
    relation: number|null,
    disregarded_relations: number,  // #320, additive
  }[],
}
```
Index-parallel with `validation.issues`: kernel-resolved canvas navigation
targets for the audit panel (from `ValidationIssue`'s in-process `subject`
handle — `serde(skip)`, so `ValidationIssue`'s own wire shape is unchanged —
mapped through the projection's id bridges). `thing`/`relation` are null when an
issue has no canvas subject (e.g. the mode-level aggregate verdict).

`disregarded_relations` (#320) counts the canvas relations touching `thing` that
the verdict did NOT consider, because the author drew them `mere` and mere
relations do not bond. It is zero for every other issue. It exists because a
refusal whose subject visibly carries lines reads as contradicted by the canvas:
the reader counts relations, the kernel counts bonds, and nothing on screen
separates them. Computed off the same `bond` predicate `EdgeFact` publishes, so
a surface states the count rather than deriving it. `DecompositionReport`'s
targets carry the same field, always zero: a seam refusal is about the child's
contract, not about which parent lines act.

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
  protocol: string,                       // φ — joined flow names, else the substance word (#100)
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

### `describe(canvas_json: string, lens: "Klir"|"Bunge"|"Mobus") → LensDescription`
The formal face: the model typeset as the active lens's own formal object.
Computed by the kernel from the same projection as `lens_facts`; the face only
renders it (KaTeX) — the math is never assembled in JS. Tagged union on `lens`:
Every variant leads with `question` (#100, additive, wire-compatible): the
tradition's guiding question — lens switching is question switching, so the
orientation copy the face docks at the lens picker is a kernel string, never
assembled in JS.
```ts
type LensDescription =
  | { lens: "Klir", question: string, things: number, relations: number,
      directed: number, neutral: number, note: string }
  | { lens: "Bunge", question: string, composition: string[], environment: string[],
      endostructure: number, exostructure: number,
      bondage: number, mere_relations: number,
      boundary_components: string[],            // the derived set (Bunge 1992)
      verdict: "system" | "aggregate",          // Def 1.1, from the kernel
      mechanism_note: string }                  // fixed: M formally UNbridged (CES, not CESM)
  | { lens: "Mobus", question: string, c: string[], n: number,
      e_objects: string[], milieu_note: string, g: number,
      b_interfaces: string[],                   // = boundary components, reified
      porosity: number, perceptive_fuzziness: number,
      t_note: string, h_note: string, dt_note: string,
      self_loop_conflicts: string[] }           // relations with no Mobus preimage
```
Throws on unparseable canvas JSON or an unknown lens string.

The Klir variant gains one additive field (#100 Klir register, wire-compatible):
```ts
type LensDescription = /* Klir arm */ { ..., ladder: KlirLadder }
type KlirLadder = {
  position: string,     // the Klir letter-string: "∅" | "E" | "SE" | "S²E"
  claim: string,        // what standing there asserts, in Klir's terms
  to_climb: string,     // what earns the next rung (honest: D/G need data — compose seam)
  decomposed: string[], // evidence for the S² step: decomposed elements, by name
}
```
The model's HONEST position on Klir's epistemological ladder (Fig. 4.13
semilattice), derived by the kernel from what the model actually contains
(things → E, couplings → SE, decomposition references → S²E; nothing → ∅).
D and G are never claimed from this surface — they need observed states over a
named support, which arrives with the compose seam. Kernel judgment; the face
only typesets the position.

## Phase 4 surface (built — the atomic author-view call)

### `analyze_canvas(canvas_json: string) → CanvasAnalysis`
The lens gate, the lens facts, and the formal object in ONE call — one
deserialization, one projection. The composite replacement for the
`validate_mode` → `lens_facts` → `describe` waterfall the canvas ran on every
model change (each of which re-serialized and re-projected the same model). The
lens is the canvas model's own `lens` field; the gate runs at that lens's mode
(Klir→Core, Bunge→Structural, Mobus→Operational). The composition lives in
`bert_canvas::lenses::analyze` (facts computed once, shared with `describe`);
this boundary only marshals. The three original calls REMAIN — this adds a
memoizable fast path, it does not replace them.
```ts
type CanvasAnalysis = {
  validation: ValidationResult,   // validate_mode at the lens's mode
  facts: LensFacts,
  description: LensDescription,
  residue: LensResidue,           // what this lens is NOT showing (#100)
}
```
Throws only on unparseable canvas JSON.

`CanvasAnalysis` gains one additive field (#100, wire-compatible): the
**residue register** — the read-side analog of `transition.rs`'s write-side
`LossWitness`, completing the render guarantee (totality + fidelity + loud
residue). Kernel judgment; the face only typesets `${count} ${label}`:
```ts
type ResidueEntry = { count: number, label: string }  // label arrives number-agreed
                                                      // count 0 = uncountable line: render the label alone
type LensResidue = {
  hidden: ResidueEntry[],       // model has it, this lens does not ask that question
  unspecified: ResidueEntry[],  // lens asks a question the model has not answered
}
```
Residue is per-lens, NOT nested (the mode poset is a tree): Bunge sees mere
relations Mobus never projects, while Mobus sees primitives Bunge has no
ontology for. Empty vectors mean no residue of that flavor — silence, never
zero-filled rows.

## SL surface (built — the textual authoring surface, #82)

### `compile_sl(text: string) → { ok: CanvasModel, lens_explicit: boolean } | { errors: SlError[] }`
Compile SL text (the line-oriented authoring notation) into a canvas editing
model. The parser (`bert_canvas::sl::parse_sl_full`) is deterministic — a
compiler, never an LLM — and judges NOTHING about systemhood: it resolves
names, applies the `@` annotation layer (`@pos`, `@lens`, `@directed`;
unknown annotations skipped), and auto-lays-out unpositioned things on a
deterministic ring. Legality stays with the kernel: callers run the result
through `analyze_canvas` exactly as they would a canvas edit. `lens_explicit`
reports whether the text pinned a lens via `@lens` — lens is view state, so
without a pin the caller should keep the author's current lens. Parse faults
come back line-anchored and complete (all faults in one pass):
```ts
type SlError = { line: number, message: string }
```
Never throws on bad SL — faults are the `{ errors }` arm; throws only on
non-string input at the wasm edge.

### `emit_sl(canvas_json: string) → string`
Serialize a canvas model to canonical SL text (the model→text direction):
things first (environment identity edge-derived from bonds, the same reading
`project()` uses), then flows, boundary, and the annotation block. Golden
round-trip contract (`crates/bert-canvas/tests/sl_roundtrip.rs`, corpus in
`fixtures/sl/`): SL-born models round-trip text → model → text digit for
digit; arbitrary canvas models canonicalize (`emit∘parse∘emit == emit`).
Throws (JsError) on the shapes SL v1 cannot express: a name/label containing
`"` or a newline, a genus asserted without a kingdom.

### `splice_positions(source: string, canvas_json: string) → string`
Rewrite only the `@pos` lines of an SL source, leaving every other byte alone.
Additive (#327); no existing signature changed.

The layout half of a round-trip, without the round-trip. `emit_sl` reproduces
the *model*, and a model carries no comments, blank lines, or authored ordering
— so saving a canvas drag through it trades a documented file for its position
numbers (that loss is #262). Positions are the one part of an SL text purely
derived from the model, so they alone can be replaced in place.

A line is a position line exactly when the parser's own `tokenize` reads it as
one, so a `#` inside a quoted name and a `@pos` inside a comment behave the way
the parser makes them behave. A line that will not tokenize is left ALONE, not
dropped — it is already a parse fault, and deleting it would turn a diagnosable
error into a silent edit. The new block lands where the first old position line
was; a source with none gets it appended. Things absent from the model lose
their line, things missing one gain it. Line endings normalize to `\n`; a
trailing newline is preserved if present and not invented if absent.

Throws (JsError) on the same name shapes `emit_sl` rejects.

**v1.4 (#326) — descriptions restored.** `Thing` and `Relation` each gained
`description?: string`, serde-skipped when empty so every stored model is
byte-identical on disk. SL grew a matching `description "<prose>"` clause on
thing lines (environment lines included) and at the tail of flow lines. No
signature changed.

This is a restoration, not an addition: the original BERT carried a description
on every entity — 161 non-empty ones survive in `assets/models/examples/*.json`
— and `bert_core::Info::description` has existed from the start, receiving
`String::new()` at every construction site. `project()` now writes the authored
prose into it and `to_canvas` reads it back, so a description round-trips like a
name does. It is prose and never semantics: no verdict reads it, and two models
differing only in descriptions receive identical verdicts.

**v1.1 (#84):** `CanvasModel` gained an optional `name` field — the author-given
SOI name. SL grew the matching form `system "Name" [: Kingdom[/Genus]]` (name
is a quoted string, before the colon-clause). No signature changed; old models
and old SL text parse unchanged. `project()` writes the name into the root
system's `info.name` (placeholder `"System"` when unnamed) and `to_canvas`
reads it back — a model genuinely named `"System"` reads back as unnamed, the
one deliberate asymmetry.

**#94 tail (units):** two additive, serde-skipped fields cross the seam. `Thing`
gained `stock_unit?: string` (the declared stock unit, #76; SL clause
`stock <unit>` on component lines; written by the run panel's accept-derived-unit
affordance) and `CanvasModel` gained `time_unit?: string` (the model's time-unit
symbol; SL line `time unit <symbol>`). `project()` carries them onto
`AgentModel.stock_unit` / `WorldModel.time_unit` and `to_canvas` reads them
back. With a declared time unit, an undeclared kW-fed stock's derived display
upgrades `kW·Δt` → `kW·h`; the symbol is display vocabulary only — Δt stays a
pure number, nothing rescales. Old models and old SL text parse unchanged.

## Decomposition surface (built — store-layer resolution, #89 step 5a)

### `model_identity(model_json: string) → string | null`
The model's stable self-identity in canonical base58, or `null` for a model
that never minted one. The store layer's decoder: saved records carry this id
so a `decomposes @id` reference resolves by identity (the name stays a display
label). Reading never mints — `WorldModel::mint_id` remains caller-invoked
tooling, so load/save cannot grow an id as a side effect. Throws (JsError) only
on unparseable model JSON.

### `check_decompositions(model_json: string, resolved_json: string) → ValidationResult`
Check every decomposition seam in the model against its store-resolved
referents. `resolved_json` is a JSON object mapping canonical base58 id → the
referent model's JSON text — the store layer resolves ids to text across its
backends and judges nothing. Runs the full boundary contract per seam
(`bert_core::decomposition`), including the cross-model `derived_env` identity
(child environment stand-ins ↔ parent interior neighbors, matched by name). A
reference missing from the map and a referent whose text does not parse are
each a defined `ValidationIssue` in the result — never a throw, never a silent
drop. Throws only on unparseable model JSON or a malformed map.

## Decomposition surface (built — the enter/exit walk, #89 step 5b)

**v1.1:** `CanvasModel` gained an optional `model_id` field (canonical base58) —
the model's stable self-identity carried through the canvas seam. `to_canvas`
copies it in and `project()` writes it back, so a walked child re-projects under
the SAME id its parent references; a model without one stays without one
(carried, never minted). No signature changed; old canvas JSON parses unchanged.

### `decompose_component(canvas_json: string, thing_id: number) → { ok: DecomposedChild } | { issues: ValidationIssue[] }`
The decomposition door: derive the newborn child of the canvas component
`thing_id`. The kernel (`bert_core::decomposition::derive_child`) derives G′
from flows(c) — each interior neighbor becomes a child environment stand-in
(Source/Sink per direction) carrying the neighbor's name exactly, each incident
flow becomes a child boundary flow with its substance/name/amount/unit carried
over — mints the child's identity, and inherits the parent's mode. The interior
is empty (no placeholder primitive); until the first component exists the
boundary flows terminate on the child's root, so the newborn passes
`check_decompositions` from birth. Refusals (`comp_mem`, the v1
interface-component narrowing, a non-component selection) come back as the
`{ issues }` arm — defined, never a throw. The caller saves `child_json` and
stamps the parent's `decomposes` reference; stamping is store-layer tooling.
```ts
type DecomposedChild = {
  child_json: string,   // the newborn WorldModel, pretty-printed — save as-is
  child_id: string,     // canonical base58 identity to stamp on the parent
  child_name: string,   // the child root's name — the default library label
}
```
Throws only on unparseable canvas JSON.

### `check_decompositions_canvas(canvas_json: string, resolved_json: string) → DecompositionReport`
The canvas-keyed sibling of `check_decompositions`: judge every seam in a
CANVAS model against its store-resolved referents, and resolve each issue's
kernel subject back to its canvas thing — the same `validation` +
`issue_targets` pairing `analyze_canvas` uses, so seam violations navigate on
the audit panel like any other issue.
```ts
type DecompositionReport = {
  issues: ValidationIssue[],
  issue_targets: IssueTarget[],  // index-parallel with issues
}
```
Throws only on unparseable canvas JSON or a malformed map.

## Contract fixtures (definition-of-done for boundary shapes)

Every serde type that crosses this wasm edge ships a committed JSON fixture in
`fixtures/contract/`, generated from REAL kernel output — never hand-typed:
- Rust writes/asserts them: `crates/bert-canvas/tests/contract.rs` (the
  canvas-family shapes: `CanvasModel`, `LensFacts` + `EdgeFact`/`PortFact`,
  `LensDescription` ×3, `ValidationResult`, `CanvasAnalysis`,
  `DecompositionReport`) and the
  `bert-lenses-kernel` api.rs test module (the run-family DTOs: `CsvParse`,
  `Targets`, `MappingStatus`, `RunResult`, `RunResultRich`). Drift fails the
  test; regenerate an intentional change with `BLESS_FIXTURES=1`.
- The web validates the SAME files against `web/src/kernel/types.ts`:
  `web/src/kernel/contract.test.ts` (vitest) parses every field and rejects any
  unexpected key, so a Rust field the TS mirror misses fails the build. Wired
  into `just check` and CI.

**When you add or change a boundary type, its fixture is part of the change** —
add the Rust `check_fixture` call, bless the fixture, and extend the vitest
parser. A boundary type with no fixture is an incomplete change.

## Error contract (append-only; issue #47)

This section documents the failure behavior of every function above. It adds no
signatures and changes none — it names a guarantee the existing functions
already have to keep, and tightens it. Two failure modes exist at this boundary,
and exactly one of them is allowed:

1. **`JsError` throw — allowed, contractual.** Each function returns its
   documented success shape, OR throws a `JsError` whose message states the
   fault. The already-documented "throws only on unparseable input" cases are
   the canonical instance; `run` / `run_forced` additionally throw when the
   model is not executable / the mapping is incomplete (as documented on those
   functions). A throw is a normal, recoverable outcome: the JS caller catches
   it (`web/src/kernel/index.ts` normalizes every throw into a typed
   `KernelError` carrying the kernel's message), and the React error boundary
   renders it as a verdict panel. No boundary call may leak `undefined` into the
   face in place of either a result or a throw.

2. **Panic — a bug, never allowed.** A Rust `panic!` (including `unwrap` /
   `expect` / out-of-bounds indexing / integer divide-by-zero / `unreachable!`)
   compiles, on the wasm target, to an `abort`: the module traps and the whole
   page is dead — strictly worse than a `JsError`, and unrecoverable. Therefore
   **no boundary function may panic on any input it can parse.** Malformed input
   is rejected by the parse step (mode 1); malformed-but-*parseable* input —
   empty models, self-loops, dangling relation endpoints, duplicate ids,
   non-finite / extreme coordinates, empty strings, all-environment models,
   degenerate CSV time columns — must flow through to a documented result or a
   `JsError`, never an abort.

**Where the guarantee is enforced.** The domain crates reachable from `api.rs`
(`bert-canvas`, `bert-tether`) are audited to contain no panic sites on
parseable input, and the property is locked by adversarial tests that push
weird-but-parseable models through *every* boundary function:
`crates/bert-canvas/tests/adversarial.rs` (the canvas family: `project`,
`to_canvas`, `validate_connection`, `lens_facts`, `describe`, `analyze_canvas`)
and `crates/bert-tether/tests/adversarial.rs` (the run family: `parse_csv`,
`mapping_status`, `force_and_run`, target enumeration, Δt inference). A panic in
any of them fails the test binary. These functions are total or `Result`-typed
already, so "returns a value or a structured error" is the whole contract — this
section adds no new enveloped variant; it forbids the abort path.

**Runaway loops count too.** A wasm module that never returns is as dead as one
that aborts. `run_forced` derives its tick count as `round(t / Δt)`, so a
degenerate `Δt` (0, negative, or non-finite) or a non-finite `t` — both of which
the wizard can produce from an empty field — would spin `usize::MAX` iterations
and freeze the tab. `bert_tether::forcing::force_and_run` now refuses those up
front with a `JsError` (a legible "Δt must be a positive, finite number"),
folding the runaway case into the same throw-don't-hang contract. (`run`'s
Phase-0 `ticks: usize` is a direct, caller-chosen count and is left as-is.)

## The archive seam (#140, ADR 0004 — additive)

An archive must not be a lens's projection. `project`'s output is a
`WorldModel` — Mobus's lens format — and it is lossy on exactly the non-Mobus
vocabulary (Bunge's `mere` and `field`, Klir's `@directed`, the authored system
type). It keeps its job: Mobus export, and the executable projection `run`
consumes. It is no longer what storage writes.

### `open_model(text: string) → CanvasModel`
The read side, total over both stored generations — the neutral archive and the
legacy `WorldModel`. Shape decides (`things` vs `systems`); the format marker
corroborates but never gates, so a hand-edited file that lost its marker still
opens. Prefer this for anything out of STORAGE. `to_canvas` remains the explicit
projection→canvas conversion for a model *known* to be a `WorldModel` (a bundled
demo, an imported executable model).

A legacy file returns exactly what `to_canvas` returns. What it lost was lost
when it was **written**; reading cannot restore it.

### `write_archive(canvas_json: string) → string`
The text to persist: the neutral model plus `"format": "bert-lenses/canvas@1"`.
The marker's job is not upgrade-in-place — migration is necessarily destructive
— but to let a future reader tell generations apart without guessing.

### `model_identity` — widened, not changed
Now answers for both generations. Every input that resolved before still
resolves, so a working folder holding both at once stays navigable. This
function must answer for a file read out of a bare directory, where there is no
record to denormalize metadata into — the constraint that decided the archive is
self-describing JSON rather than SL (ADR 0004, decision 2).

## The error contract, executed (#233 — additive; no signature changes)

Two things were true of the section above until #233: it was enforced by
inspection, and the boundary it describes was never executed by any gate.
`cargo test` runs the native build (nothing crosses the edge) and `vitest` runs
in node against the committed fixtures (Rust's serialization to disk, not what
JS receives). Three additions, none of which touch a signature:

1. **The panic message survives.** The module installs
   `console_error_panic_hook` from its own initializer
   (`#[wasm_bindgen(start)]`, no new export). Mode 2 remains forbidden; what
   changes is that a violation is now *diagnosable* — the panic's message and
   Rust source location reach `console.error` immediately before the trap,
   instead of being written to a hook that was never installed and discarded
   while JS saw only `RuntimeError: unreachable`.
2. **The face tells the two modes apart.** `web/src/kernel/index.ts` classifies
   a `WebAssembly.RuntimeError` as a `KernelTrap` rather than a `KernelError`,
   and the error boundary says different things about them. A trap is not a
   verdict about the user's model and is no longer described as one.
3. **The boundary is executed.** `scripts/wasm_exec.mjs`
   (`.github/workflows/wasm-exec.yml`, `just wasm-exec`) loads the shipped `pkg`
   under node as the browser loads it and drives real exports over the shipped
   corpus, including the four refusal paths — each of which must throw a named
   `JsError` and must NOT trap.

**Two marshaling divergences that gate found**, both invisible to every other
check, neither of which changes a documented shape:

- **`f32` widens.** A fixture written natively records `0.35`; the face receives
  `0.3499999940395355`. Same value, different text.
- **`Option::None` arrives as `undefined`, not `null`.** The fixtures say
  `"channel": null`; serde-wasm-bindgen hands the face `undefined`. The TS
  mirrors declare `| null`, so a `=== null` test on an optional kernel field
  would hold in the fixture suite and fail in the browser. No face code does
  that today. Prefer `== null` / `?? ` over `=== null` on any optional field
  from this boundary.

**`__trap_probe(canvas_json)` is not part of this surface.** It exists only
behind the off-by-default `panic-probe` feature, panics on purpose, and is built
into a separate `pkg-probe/` the gate throws away. No release build has the
symbol.

## The register matrices (#233 — additive; two new exports, no signature changes)

Until #233 the two register matrices decided their own cell semantics in
TypeScript: `web/src/canvas/klirNotation.ts` held Klir's symmetric-closure rule
(a neutral relation marks both orders of the incidence matrix), and
`web/src/canvas/bungeNotation.ts` held Bunge's en-bloc environment device (1979
§2.1), the bond-versus-mere directionality of a cell's occupants, and `M₀₀ = 0`.
Both files carried a "no verdict lives here" disclaimer, and the disclaimer was
the enforcement.

Those are readings of the traditions, and both registers are WRITE surfaces —
their empty cells author new relations — so a cell that silently could not be
authored was a refusal with no name, no reason, and no kernel behind it. The
rules moved to `bert_canvas::notation`; the face renders the returned structure
and posts back a cell identity.

### `klir_incidence_cells(canvas_json: string) → KlirIncidence`
Klir's |T|×|T| incidence matrix over the CANVAS model: row/column order, and
every cell's occupants, mark, and authorability. Delegates to
`bert_canvas::notation::klir_incidence_cells`.
```ts
type CellStatus =
  | { status: "occupied" }    // relations stand here — the cell edits
  | { status: "authorable" }  // empty and open to a new relation
  | { status: "forbidden", reason: string }  // closed by the tradition's own rule
type KlirMark =
  | { mark: "empty" } | { mark: "neutral" } | { mark: "directed" } | { mark: "self_loop" }
type KlirCell = {
  row: number, col: number,   // thing ids
  relations: number[],        // relation ids, model order
  mark: KlirMark,
  status: CellStatus,
}
type KlirIncidence = { things: number[], cells: KlirCell[] }
```
`cells` is |T|² — every pair owes a cell. Throws only if `canvas_json` is not
parseable as a `CanvasModel`.

### `bunge_coupling_cells(canvas_json: string, en_bloc: boolean) → BungeCoupling`
Bunge's coupling matrix M. `en_bloc` selects his own (m+1)×(m+1) reading, index 0
standing for the environment en bloc, so row 0 is the input block M₀ᵣ and column
0 the output block Mₛ₀; `false` selects the itemized alternative (one row per
named environment thing — ours, not his). Delegates to
`bert_canvas::notation::bunge_coupling_cells`.
```ts
type CouplingSlot = { kind: "env" } | { kind: "thing", id: number, env: boolean }
type BungeMark =
  | { mark: "empty" } | { mark: "self_loop" }
  | { mark: "bond", kind: Kind } | { mark: "mere" }
type BungeCell = {
  row: number, col: number,   // SLOT indices — index 0 carries no thing id
  relations: number[],        // relation ids, first-seen order, deduplicated
  mark: BungeMark,
  status: CellStatus,
}
type BungeCoupling = { slots: CouplingSlot[], cut_at: number, cells: BungeCell[] }
```
`cut_at` is the slot index the composition/environment rule is drawn before.
`cells` is `slots.length²`. Throws only on unparseable input.

**`forbidden` carries words, not a flag.** Two cells are closed under en bloc,
each with the precondition stated in the kernel's own refusal voice: `M₀₀`
("the environment's couplings to itself are not in 𝒮: neither relatum is a
component…"), and any other cell on index 0's row or column ("index 0 is the
environment en bloc, not a named thing — an action needs two relata to be an
action; itemize ℰ…"). Hovering a dead cell names its precondition, which is what
the tool exists to do. A `forbidden` status with an empty reason fails the
wasm-exec gate.

**Fixtures:** `fixtures/contract/klir_incidence.json`,
`bunge_coupling_en_bloc.json`, `bunge_coupling_itemized.json` — blessed against
the shared contract sample with its first relation oriented, so the `directed`
mark is real content. All three are recomputed through the real wasm package by
`scripts/wasm_exec.mjs` and validated field-by-field against the TS mirrors by
`web/src/kernel/contract.test.ts`.

## Notes
- The wasm is built with `wasm-pack build --target web` into `pkg/` (a build
  artifact, gitignored). `--release` for the shipped bundle; `--dev` while iterating.
- Typed boundary (tsify-generated `.d.ts`) is a Phase-1 refinement; today the
  results are `any` at the wasm edge and typed by the hand-written mirrors in
  `web/src/kernel/types.ts`. Kept this way so `bert-core` carries no wasm/tsify
  dependency and stays a pure kernel.
