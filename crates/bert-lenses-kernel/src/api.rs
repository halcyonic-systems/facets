//! The JS-facing wasm boundary — thin, marshaling-only.
//!
//! Every function here follows one shape: deserialize JS input → hand it to the
//! truth ([`bert_core`] / [`bert_compose`] / [`bert_canvas`] / [`bert_tether`])
//! → serialize the result back. There is NO systems logic in this module. It
//! parses JSON, calls the domain, and hands the answer to the face. If a verdict
//! were ever computed here instead of delegated, that would violate the
//! load-bearing invariant.
//!
//! The exact JSON shapes returned are documented in `API.md` (the frozen
//! surface). Result types are serialized structurally via serde; the web layer
//! mirrors them in `web/src/kernel/types.ts`.

use serde::Serialize;
use wasm_bindgen::prelude::*;

use bert_core::operational::{validate_operational as core_validate_operational, OperationalError};
use bert_core::WorldModel;

/// Serialize any kernel result to a JS value (the one marshaling primitive).
fn to_js<T: Serialize>(value: &T) -> Result<JsValue, JsError> {
    serde_wasm_bindgen::to_value(value).map_err(|e| JsError::new(&e.to_string()))
}

/// Parse a BERT `WorldModel` from its JSON text, or a JS error naming the fault.
fn parse_model(model_json: &str) -> Result<WorldModel, JsError> {
    serde_json::from_str(model_json).map_err(|e| JsError::new(&format!("invalid model JSON: {e}")))
}

/// The 4-layer systemhood report for a model. Delegates verbatim to
/// `bert_core::validate::validate` — the semantic authority.
#[wasm_bindgen]
pub fn validate(model_json: &str) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    to_js(&bert_core::validate::validate(&model))
}

/// The executable-projection gate: either the `OperationalSpec` a simulator
/// needs, or the complete list of reasons the model cannot be executed. The
/// tagged shape (`{ ok: spec }` | `{ errors: [...] }`) is documented in API.md.
#[wasm_bindgen]
pub fn validate_operational(model_json: &str) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    match core_validate_operational(&model) {
        Ok(spec) => to_js(&OperationalOutcome::Ok { ok: spec }),
        Err(errors) => to_js(&OperationalOutcome::Errors { errors }),
    }
}

/// Run an authored model: project it, build the circuit, and record `ticks`
/// steps of size `dt`. Refuses (with the projection errors) if the model is not
/// executable. Returns the trace + conservation ledger.
///
/// Phase 0 runs the model as authored. External CSV forcing (the tether's
/// forced-flow series) attaches in Phase 1 via the wizard surface — see API.md.
/// A loop of pure relays has no deterministic step (#259) — running it would
/// record an empty trace. Refuse before stepping, with the loop named in the
/// author's own node names. (The forced path gets the same refusal from
/// `RecordedRun::record_over`.)
fn refuse_algebraic_cycle(circuit: &bert_compose::Circuit) -> Result<(), JsError> {
    let Some(cycle) = circuit.algebraic_cycle() else {
        return Ok(());
    };
    let names: Vec<&str> = cycle
        .iter()
        .map(|&i| circuit.nodes[i].name.as_str())
        .collect();
    Err(JsError::new(&format!(
        "run refused: the wiring contains a loop with no stock and no level read \
         on it ({}). A loop of pure relays has no deterministic step — put a \
         stock on the loop, or read a level instead of consuming a flow.",
        names.join(" → ")
    )))
}

#[wasm_bindgen]
pub fn run(model_json: &str, dt: f64, ticks: usize) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    let spec = core_validate_operational(&model).map_err(|errors| {
        JsError::new(&format!(
            "model is not executable ({} projection error(s)); call validate_operational for details",
            errors.len()
        ))
    })?;
    let mut circuit = bert_compose::from_spec(&spec);
    refuse_algebraic_cycle(&circuit)?;
    let recorded = bert_compose::RecordedRun::record(&mut circuit, &spec, dt, ticks);
    to_js(&recorded.report())
}

/// Run a CANVAS model as a discrete-time Markov chain (#67) — the state-machine
/// run mode beside `run`. Reads the model's Klir `(T, R)` directly (things =
/// states, directed relations = transitions), builds the chain with uniform
/// edge weights, and evolves a distribution for `ticks` steps from a point mass
/// on the first state. Takes CANVAS json, not a `WorldModel`, and never calls
/// `validate_operational` — so the Mobus self-loop gate (`k ≠ o`) is bypassed and
/// a state that stays put is a legal transition.
///
/// Returns a [`MarkovRunResult`] — `kind`-tagged, carrying only the state labels
/// and the distribution trajectory. Deliberately NOT a `RunResult`: a Markov run
/// conserves probability, not substance, so it exposes no `residual`/`conserved`.
#[wasm_bindgen]
pub fn run_markov(canvas_json: &str, ticks: usize) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    let (states, edges) = bert_canvas::canvas::markov_edges(&model);
    let chain = bert_compose::markov::Chain::from_edges(states, &edges);
    let v0 = chain.point_mass(0);
    let run = chain.run(&v0, ticks);
    to_js(&MarkovRunResult {
        kind: "markov",
        states: run.states,
        history: run.history,
    })
}

/// Parse CSV text into headers + string rows (gaps disclosed, never filled).
/// The column-meaning assignment ritual (`MappingDraft`, gates T1/T2/T5) is the
/// Phase-1 wizard surface; this is its first step.
#[wasm_bindgen]
pub fn parse_csv(text: &str) -> Result<JsValue, JsError> {
    let (headers, rows) =
        bert_tether::tether::parse_csv(text).map_err(|e| JsError::new(&format!("{e:?}")))?;
    to_js(&CsvParse { headers, rows })
}

// ---- Phase 1: the tether wizard + forced run -------------------------------

/// The mapping targets a CSV column can attach to, read from the model: flows
/// (interactions) and components (level-1 systems). The wizard's dropdowns.
#[wasm_bindgen]
pub fn model_targets(model_json: &str) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    let flows: Vec<FlowTarget> = bert_tether::forcing::flow_targets(&model)
        .into_iter()
        .map(|(id, name, unit)| FlowTarget { id, name, unit })
        .collect();
    let components: Vec<ComponentTarget> = bert_tether::forcing::component_targets(&model)
        .into_iter()
        .map(|(id, name)| ComponentTarget { id, name })
        .collect();
    to_js(&Targets { flows, components })
}

/// Given the model, the CSV, and a manifest-shaped mapping, return the wizard's
/// live status: the T1/T2/T4 gates, the translation sentences, the inferred Δt.
/// Reconstructs the `MappingDraft` and reads the gates — no side effects.
/// Called on every wizard edit; all logic stays in the kernel.
#[wasm_bindgen]
pub fn mapping_status(
    model_json: &str,
    csv_text: &str,
    manifest_json: &str,
) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    let manifest: bert_tether::manifest::RunManifest = serde_json::from_str(manifest_json)
        .map_err(|e| JsError::new(&format!("invalid manifest: {e}")))?;
    let status = bert_tether::forcing::mapping_status(&model, csv_text, &manifest)
        .map_err(|e| JsError::new(&e))?;
    to_js(&status)
}

/// Run the model FORCED by the imported CSV, over `(dt, t)`, and read the run
/// back in domain terms. Pipeline: resolve mapping → gates → commit →
/// projection → inject → project → simulate → summarize. Throws (with a legible
/// reason) if the mapping is incomplete or the model is not executable.
#[wasm_bindgen]
pub fn run_forced(
    model_json: &str,
    csv_text: &str,
    manifest_json: &str,
    dt: f64,
    t: f64,
    today: &str,
) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    let manifest: bert_tether::manifest::RunManifest = serde_json::from_str(manifest_json)
        .map_err(|e| JsError::new(&format!("invalid manifest: {e}")))?;
    let readout = bert_tether::forcing::force_and_run(model, csv_text, &manifest, dt, t, today)
        .map_err(|e| JsError::new(&e))?;
    to_js(&RunResultRich::from(readout))
}

/// A model's stable self-identity (canonical base58), read from its JSON —
/// `null` for a model that never minted one. The store layer's decoder: records
/// carry this id so a `decomposes @id` reference resolves by identity, with the
/// name as display label only. Reading is not minting — this never assigns an
/// id (`WorldModel::mint_id` stays caller-invoked, never a load/save effect).
///
/// Answers for BOTH stored generations (#140): the neutral archive and the
/// legacy `WorldModel`. Widened, never narrowed — every input that resolved
/// before still resolves, so a working folder holding both generations at once
/// stays fully navigable.
#[wasm_bindgen]
pub fn model_identity(model_json: &str) -> Result<Option<String>, JsError> {
    Ok(crate::archive::identity(model_json).map(|id| id.to_base58()))
}

/// Open a stored model onto the canvas, whichever generation wrote it (#140,
/// ADR 0004) — the archive's read side. Prefer this over `to_canvas` for
/// anything coming out of STORAGE; `to_canvas` remains the explicit
/// WorldModel→canvas conversion for a model known to be a projection (a bundled
/// demo, an imported executable model).
///
/// A legacy file comes back exactly as `to_canvas` returns it. What it lost was
/// lost when it was WRITTEN — reading cannot restore it.
#[wasm_bindgen]
pub fn open_model(text: &str) -> Result<JsValue, JsError> {
    let model = crate::archive::read(text).map_err(|e| JsError::new(&e))?;
    to_js(&model)
}

/// The text to PERSIST for a canvas model (#140, ADR 0004) — the neutral model
/// plus its format marker. This is what every storage write sends; `project`
/// keeps its own job (Mobus export, and the executable projection `run`
/// consumes), and is no longer what the library writes.
#[wasm_bindgen]
pub fn write_archive(canvas_json: &str) -> Result<String, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    crate::archive::write(&model).map_err(|e| JsError::new(&e))
}

/// Check every decomposition seam in a model against its store-resolved
/// referents. `resolved_json` maps canonical base58 id → the referent model's
/// JSON text; the store layer resolves ids to text and judges nothing. Every
/// verdict — including the missing-referent and unparseable-referent refusals —
/// is a defined `ValidationIssue` from `bert_core::decomposition`, never a
/// throw, so an unresolvable reference can never crash the face.
#[wasm_bindgen]
pub fn check_decompositions(model_json: &str, resolved_json: &str) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    let resolved: std::collections::HashMap<String, String> = serde_json::from_str(resolved_json)
        .map_err(|e| JsError::new(&format!("invalid resolved-referents map: {e}")))?;
    // Referents may be archive-format (#140); the projection layer normalizes
    // them to the WorldModel text the core contract parses.
    let resolved = bert_canvas::lenses::normalize_referents(&resolved);
    to_js(&bert_core::validate::ValidationResult {
        issues: bert_core::decomposition::check_decompositions(&model, &resolved),
    })
}

/// The decomposition door (bert-lenses#89 step 5b): derive the newborn child of
/// the canvas component `thing_id` — G′ from flows(c), environment stand-ins
/// named after the parent's interior neighbors, a freshly minted identity — or
/// the kernel's refusal (`{ ok } | { issues }`). Delegates to
/// `bert_canvas::canvas::decompose_thing` → `bert_core::decomposition::
/// derive_child`. The caller (the store layer) saves `child_json` and stamps
/// the parent's reference; the kernel derives and judges, and writes nothing.
#[wasm_bindgen]
pub fn decompose_component(canvas_json: &str, thing_id: u32) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    match bert_canvas::canvas::decompose_thing(&model, u64::from(thing_id)) {
        Ok(child) => to_js(&DecomposeOutcome::Ok {
            ok: DecomposedChild {
                child_json: serde_json::to_string_pretty(&child)
                    .map_err(|e| JsError::new(&e.to_string()))?,
                child_id: child
                    .model_id
                    .map(|id| id.to_base58())
                    .unwrap_or_default(),
                child_name: child
                    .systems
                    .iter()
                    .find(|s| s.info.level == 0)
                    .map(|s| s.info.name.clone())
                    .unwrap_or_default(),
            },
        }),
        Err(issues) => to_js(&DecomposeOutcome::Issues { issues }),
    }
}

/// Judge every decomposition seam in a CANVAS model against its store-resolved
/// referents, with each issue's canvas navigation target resolved — the
/// canvas-keyed sibling of `check_decompositions`, shaped like
/// `analyze_canvas`'s `validation` + `issue_targets` pair so seam violations
/// navigate on the audit panel like any other issue. Projection, judgment, and
/// target resolution all happen in `bert_canvas::lenses`.
#[wasm_bindgen]
pub fn check_decompositions_canvas(
    canvas_json: &str,
    resolved_json: &str,
) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    let resolved: std::collections::HashMap<String, String> = serde_json::from_str(resolved_json)
        .map_err(|e| JsError::new(&format!("invalid resolved-referents map: {e}")))?;
    to_js(&bert_canvas::lenses::check_decompositions_canvas(
        &model, &resolved,
    ))
}

// ---- Phase 2: the canvas seam ----------------------------------------------

/// Validate a model at a given lens rung: "Core" | "Structural" | "Operational"
/// | "Full". The kernel-side hook for the canvas lens toggle. Delegates to
/// `bert_core::validate::validate_mode`.
#[wasm_bindgen]
pub fn validate_mode(model_json: &str, mode: &str) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    let m = match mode {
        "Core" => bert_core::Mode::Core,
        "Structural" => bert_core::Mode::Structural,
        "Operational" => bert_core::Mode::Operational,
        "Full" => bert_core::Mode::Full,
        other => return Err(JsError::new(&format!("unknown mode: {other}"))),
    };
    to_js(&bert_core::validate::validate_mode(&model, m))
}

/// Project the canvas editing model (lens/things/relations) into a bert-core
/// `WorldModel`. The canvas never builds a WorldModel itself — it sends its
/// editing model and the kernel constructs the projection.
#[wasm_bindgen]
pub fn project(canvas_json: &str) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    to_js(&bert_canvas::canvas::project(&model))
}

/// Load an existing `WorldModel` onto the canvas as an editing model — the
/// display-faithful inverse of `project`. Lets the canvas show an executable
/// demo as a diagram to drive + run.
#[wasm_bindgen]
pub fn to_canvas(model_json: &str) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    // Step 4 (bert-lenses#89) lifted the `assert_sl_expressible` guard that used
    // to refuse a decomposed model here: `to_canvas` now preserves `child_model`
    // as a `ChildRef`, and SL's `decomposes` clause expresses it, so the seam is
    // no longer lossy. The predicate survives in bert-core for callers that want
    // to test flatness.
    to_js(&bert_canvas::canvas::to_canvas(&model))
}

/// Compile SL text (the textual authoring surface) into a canvas editing
/// model, or the full list of parse faults (`{ ok }` | `{ errors }`). The
/// parser is deterministic and judges nothing about systemhood — the returned
/// `CanvasModel` goes through the same `analyze_canvas` path as any canvas
/// edit, so the kernel still issues every verdict.
#[wasm_bindgen]
pub fn compile_sl(text: &str) -> Result<JsValue, JsError> {
    match bert_canvas::sl::parse_sl_full(text) {
        Ok(parse) => to_js(&SlOutcome::Ok {
            ok: Box::new(parse.model),
            lens_explicit: parse.lens_explicit,
        }),
        Err(errors) => to_js(&SlOutcome::Errors { errors }),
    }
}

/// Serialize a canvas editing model to canonical SL text — the model→text
/// direction. Round-trip is golden-tested kernel-side (`sl_roundtrip.rs`):
/// emit∘parse is the identity on SL-born models and canonicalizing otherwise.
#[wasm_bindgen]
pub fn emit_sl(canvas_json: &str) -> Result<String, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    bert_canvas::sl::emit_sl(&model).map_err(|e| JsError::new(&e))
}

/// Rewrite only the `@pos` lines of an SL source, leaving every other byte
/// alone — how a canvas drag is saved back into a file the author wrote.
///
/// `emit_sl` above is the wrong call for that: it reproduces the model, and a
/// model carries no comments, so saving a moved node through it would trade a
/// documented file for its four position numbers (#262). Positions are the one
/// part of the text purely derived from the model, so they alone can be
/// replaced in place.
#[wasm_bindgen]
pub fn splice_positions(source: &str, canvas_json: &str) -> Result<String, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    bert_canvas::sl::splice_positions(source, &model).map_err(|e| JsError::new(&e))
}

/// Validate a proposed connection at the model's current lens. Returns the issues
/// the candidate edge INTRODUCED (empty = legal). The per-drag "React asks Rust"
/// call — the canvas rejects an edge iff the kernel says so.
#[wasm_bindgen]
pub fn validate_connection(canvas_json: &str, candidate_json: &str) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    let candidate: bert_canvas::canvas::Relation = serde_json::from_str(candidate_json)
        .map_err(|e| JsError::new(&format!("invalid candidate relation: {e}")))?;
    to_js(&ConnectionVerdict {
        issues: bert_canvas::canvas::validate_connection(&model, &candidate),
    })
}

// ---- Phase 3: faithful lens palettes ----------------------------------------

/// The two lens primitives, canvas-keyed: the boundary identity set
/// (boundary(Bunge) = interfaces(Mobus)) and the edge ladder (endo/exo, bond vs
/// mere, self-loop/Mobus-preimage), plus Mobus ports and the Bunge aggregate
/// verdict. Takes CANVAS json (mere relations exist only in the editing model);
/// internally projects, so every fact is still a kernel verdict.
#[wasm_bindgen]
pub fn lens_facts(canvas_json: &str) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    to_js(&bert_canvas::lenses::lens_facts(&model))
}

/// The formal face: the model typeset as the active lens's own formal object
/// (Klir `(T,R)` / Bunge `⟨C,E,S,M⟩` + verdict / Mobus 8-tuple). Computed by
/// the kernel from the same projection as `lens_facts` — the face only renders
/// it; the math is never assembled in JS. `lens` = "Klir" | "Bunge" | "Mobus".
#[wasm_bindgen]
pub fn describe(canvas_json: &str, lens: &str) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    let l = match lens {
        "Klir" => bert_canvas::canvas::Lens::Klir,
        "Bunge" => bert_canvas::canvas::Lens::Bunge,
        "Mobus" => bert_canvas::canvas::Lens::Mobus,
        other => return Err(JsError::new(&format!("unknown lens: {other}"))),
    };
    to_js(&bert_canvas::lenses::describe(&model, l))
}

/// The atomic author-view verdict: the lens gate, the lens facts, and the
/// formal object, from ONE deserialization of the canvas. The lens is the
/// canvas model's own `lens` field (Klir→Core, Bunge→Structural,
/// Mobus→Operational for the gate). Composes `validate_mode` + `lens_facts` +
/// `describe` in `bert_canvas`; this boundary only marshals. Replaces the face's
/// three-call waterfall (each of which re-serialized and re-projected the model).
#[wasm_bindgen]
pub fn analyze_canvas(canvas_json: &str) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    let lens = model.lens;
    to_js(&bert_canvas::lenses::analyze(&model, lens))
}

// ---- The register matrices: cell semantics, kernel-side (#233) ---------------

/// Klir's |T|×|T| incidence matrix, read by the kernel: the row/column order and
/// every cell's occupants, mark, and authorability. The register is a WRITE
/// surface — its empty cells author relations — so the symmetric-closure rule
/// that decides which cell a neutral relation marks is a reading of Klir, and it
/// belongs here rather than in the face. The face maps marks onto glyphs.
#[wasm_bindgen]
pub fn klir_incidence_cells(canvas_json: &str) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    to_js(&bert_canvas::notation::klir_incidence_cells(&model))
}

/// Bunge's coupling matrix M, read by the kernel: the slot order under either
/// environment reading (`en_bloc` = his own (m+1)×(m+1) with 0 for the
/// environment en bloc, 1979 §2.1), where the composition/environment cut falls,
/// and every cell. Cells the tradition closes come back `forbidden` with the
/// precondition in words — M₀₀ = 0, and index 0's unaddressability — so a dead
/// cell can say why instead of merely not responding.
#[wasm_bindgen]
pub fn bunge_coupling_cells(canvas_json: &str, en_bloc: bool) -> Result<JsValue, JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| JsError::new(&format!("invalid canvas model: {e}")))?;
    to_js(&bert_canvas::notation::bunge_coupling_cells(&model, en_bloc))
}

// ---- Boundary DTOs (data-transfer shapes only, no logic) --------------------

#[derive(Serialize)]
struct ConnectionVerdict {
    issues: Vec<bert_core::validate::ValidationIssue>,
}

/// The tagged result of [`decompose_component`]: the newborn child, or the
/// kernel's refusal issues.
#[derive(Serialize)]
#[serde(untagged)]
enum DecomposeOutcome {
    Ok { ok: DecomposedChild },
    Issues { issues: Vec<bert_core::validate::ValidationIssue> },
}

/// The newborn child as the store layer needs it: the model text to save, the
/// canonical base58 identity to stamp, and the root name as the default label.
#[derive(Serialize)]
struct DecomposedChild {
    child_json: String,
    child_id: String,
    child_name: String,
}

#[derive(Serialize)]
struct Targets {
    flows: Vec<FlowTarget>,
    components: Vec<ComponentTarget>,
}
#[derive(Serialize)]
struct FlowTarget {
    id: u64,
    name: String,
    unit: String,
}
#[derive(Serialize)]
struct ComponentTarget {
    id: u64,
    name: String,
}

#[derive(Serialize)]
struct RunResultRich {
    ticks: usize,
    dt: f64,
    residual: f32,
    conserved: bool,
    levels: Vec<LevelDto>,
    comparisons: Vec<ComparisonDto>,
    trajectories: Vec<TrajDto>,
    flows: Vec<FlowDto>,
}
/// One flow's executed per-tick delivery (#203) — the circuit's own recording
/// (`wire_history`), domain-named. Declared metrics evaluate over these.
#[derive(Serialize)]
struct FlowDto {
    name: String,
    from: String,
    to: String,
    unit: String,
    series: Vec<f32>,
}
#[derive(Serialize)]
struct LevelDto {
    name: String,
    unit: String,
    /// bert-lenses#94: `unit` was derived from the inflow (inflow × Δt) rather than
    /// author-declared — the face marks its provenance. Additive; defaults false.
    unit_derived: bool,
    value: f32,
    category: String,
}
#[derive(Serialize)]
struct ComparisonDto {
    element: String,
    kind: String,
    unit: String,
    simulated: Vec<f32>,
    actual: Vec<f32>,
    declared: Option<Vec<f32>>,
    divergence_pct: Option<f32>,
}
#[derive(Serialize)]
struct TrajDto {
    name: String,
    unit: String,
    /// See [`LevelDto::unit_derived`].
    unit_derived: bool,
    series: Vec<f32>,
}

impl From<bert_tether::forcing::RunReadout> for RunResultRich {
    fn from(r: bert_tether::forcing::RunReadout) -> Self {
        RunResultRich {
            ticks: r.ticks,
            dt: r.dt,
            residual: r.residual,
            conserved: r.conserved,
            levels: r
                .levels
                .into_iter()
                .map(|l| LevelDto {
                    name: l.name,
                    unit: l.unit,
                    unit_derived: l.unit_derived,
                    value: l.value,
                    category: l.category.to_string(),
                })
                .collect(),
            comparisons: r
                .comparisons
                .iter()
                .map(|c| ComparisonDto {
                    element: c.element_name.clone(),
                    kind: c.kind.to_string(),
                    unit: c.unit.clone(),
                    simulated: c.simulated.clone(),
                    actual: c.actual.clone(),
                    declared: c.baseline.clone(),
                    divergence_pct: c.divergence_pct(),
                })
                .collect(),
            trajectories: r
                .trajectories
                .into_iter()
                .map(|t| TrajDto {
                    name: t.name,
                    unit: t.unit,
                    unit_derived: t.unit_derived,
                    series: t.series,
                })
                .collect(),
            flows: r
                .flows
                .into_iter()
                .map(|f| FlowDto {
                    name: f.name,
                    from: f.from,
                    to: f.to,
                    unit: f.unit,
                    series: f.series,
                })
                .collect(),
        }
    }
}

// ---- Phase 0 DTOs -----------------------------------------------------------

/// The tagged result of [`validate_operational`]: an executable spec, or errors.
#[derive(Serialize)]
#[serde(untagged)]
enum OperationalOutcome {
    Ok { ok: bert_core::operational::OperationalSpec },
    Errors { errors: Vec<OperationalError> },
}

/// The tagged result of [`compile_sl`]: a canvas model, or the parse faults.
#[derive(Serialize)]
#[serde(untagged)]
enum SlOutcome {
    Ok {
        // Boxed only to keep the variants a similar size (clippy's
        // large_enum_variant): a `CanvasModel` dwarfs a fault list. `Box<T>`
        // serializes exactly as `T`, so the shape crossing to JS is unchanged.
        ok: Box<bert_canvas::canvas::CanvasModel>,
        lens_explicit: bool,
    },
    Errors {
        errors: Vec<bert_canvas::sl::SlError>,
    },
}

/// The conservation run's shape is [`bert_compose::RunReport`] — owned by the
/// engine that records it, not re-declared here. `API.md` documents it as
/// `RunResult`; the field names are unchanged, only the owner is.
///
/// A Markov run (#67), flattened for the face. The `kind` tag discriminates it
/// from a conservation `RunReport` so the face never reaches for a
/// `residual`/`conserved` field that a distribution run does not have. `history`
/// is the shared H shape: row `t` = the state distribution after `t` steps,
/// one column per `states` entry.
#[derive(Serialize)]
struct MarkovRunResult {
    kind: &'static str,
    states: Vec<String>,
    history: Vec<Vec<f32>>,
}

/// Parsed CSV: the header row and the string cells beneath it.
#[derive(Serialize)]
struct CsvParse {
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
}

// The wasm-bindgen exports return JsValue and can't run off-wasm, so these
// native tests exercise the same underlying kernel path (parse → validate →
// project → run) the boundary marshals — proving the spine on the RECENT,
// canonical assets (thermostat, mobus-generic), not the mixed-version examples.
#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;

    // Mint the domain-legible demo models by building compose circuits, renaming
    // their nodes/substances to domain terms (so exported flows/components read
    // like a sim, not "Buffering 2"), and exporting to executable WorldModel JSON.
    // Regenerate with:
    //   cargo test -p bert-lenses-kernel mint_demos -- --ignored --nocapture
    #[test]
    #[ignore]
    fn mint_demos() {
        use bert_compose::circuit::Circuit;

        fn substance(c: &mut Circuit, name: &str, unit: &str) {
            for node in &mut c.nodes {
                node.out_substance.name = name.to_string();
                node.out_substance.unit = unit.to_string();
            }
        }
        fn rename(c: &mut Circuit, names: &[&str]) {
            for (i, nm) in names.iter().enumerate() {
                c.nodes[i].name = nm.to_string();
            }
        }
        fn mint(c: &Circuit, title: &str, file: &str) {
            let model = bert_compose::to_world_model(c, title);
            core_validate_operational(&model)
                .unwrap_or_else(|e| panic!("{file}: not executable ({} reasons)", e.len()));
            let path = format!(
                "{}/../../assets/models/demos/{file}.json",
                env!("CARGO_MANIFEST_DIR")
            );
            std::fs::create_dir_all(std::path::Path::new(&path).parent().unwrap()).unwrap();
            std::fs::write(&path, serde_json::to_string_pretty(&model).unwrap()).unwrap();
            println!("minted {file}");
        }

        // Reservoir: watershed inflow → reservoir level → release. Force inflow.
        let mut reservoir = bert_compose::ladder::flows();
        reservoir.nodes[1].initial_storage = 100.0;
        reservoir.nodes[1].storage = 100.0;
        rename(&mut reservoir, &["Watershed", "Reservoir", "Release"]);
        substance(&mut reservoir, "water", "ML/mo");
        mint(&reservoir, "Reservoir", "reservoir");

        // Allocation: total demand → allocator → three model providers. Force the
        // total + per-provider weights (the rung-2 allocation demo).
        let mut alloc = bert_compose::ladder::networks();
        rename(
            &mut alloc,
            &["Total demand", "Allocator", "Anthropic", "OpenAI", "Google"],
        );
        substance(&mut alloc, "tokens", "Mtok/mo");
        mint(&alloc, "Allocation", "allocation");

        // Homeostat: furnace → valve → room temperature → heat loss, regulated by
        // a thermostat + controller. Force the furnace supply.
        let mut homeo = bert_compose::ladder::feedback_regulation();
        rename(
            &mut homeo,
            &["Furnace", "Valve", "Room", "Heat loss", "Thermostat", "Controller"],
        );
        substance(&mut homeo, "heat", "kW");
        mint(&homeo, "Homeostat", "homeostat");
    }

    /// Law: every systemhood verdict is computed in the kernel — the wasm edge
    /// carries reports out, never judgment in (JS decides nothing).
    ///
    /// The `validate()` path: recent canonical models produce a report without
    /// panicking (they are structural, so they carry issues — that's fine; the
    /// point is the verdict is computed in the kernel, which the smoke slice shows).
    #[test]
    fn validate_reports_on_recent_models() {
        for (label, json) in [
            ("thermostat", include_str!("../../../assets/thermostat.json")),
            ("mobus-generic", include_str!("../../../assets/mobus-generic.json")),
        ] {
            let model: WorldModel =
                serde_json::from_str(json).unwrap_or_else(|e| panic!("{label}: parse: {e}"));
            let _report = bert_core::validate::validate(&model);
        }
    }

    // ---- serde↔TS contract fixtures (run-family boundary DTOs) --------------
    //
    // The canvas-family shapes are fixtured from bert-canvas (tests/contract.rs).
    // These cover the DTOs that live HERE — the ones api.rs assembles as it
    // marshals a run back to JS. Each is built from a REAL kernel path (a forced
    // reservoir run, the runnable sample, a CSV parse), serialized to the
    // committed fixture, and asserted equal so any drift fails. The web side
    // (web/src/kernel/contract.test.ts) validates the SAME files against types.ts.
    //
    // Regenerate after an intentional shape change:
    //   BLESS_FIXTURES=1 cargo test -p bert-lenses-kernel --lib

    /// Write-or-assert a committed contract fixture (shared with bert-canvas's
    /// tests/contract.rs). `BLESS_FIXTURES=1` rewrites; otherwise drift fails.
    fn check_fixture<T: Serialize>(name: &str, value: &T) {
        let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/contract");
        let path = format!("{dir}/{name}.json");
        let actual = serde_json::to_string_pretty(value).expect("serialize fixture");
        if std::env::var_os("BLESS_FIXTURES").is_some() {
            std::fs::create_dir_all(dir).expect("create fixture dir");
            std::fs::write(&path, format!("{actual}\n")).expect("write fixture");
            return;
        }
        let expected = std::fs::read_to_string(&path).unwrap_or_else(|_| {
            panic!("missing fixture {path}; run with BLESS_FIXTURES=1 to create")
        });
        assert_eq!(
            actual,
            expected.trim_end_matches('\n'),
            "serde↔fixture drift for {name}: the wasm boundary DTO changed. If intended, \
             regenerate with BLESS_FIXTURES=1 and update web/src/kernel/types.ts to match."
        );
    }

    /// The reservoir demo, reconstructed in Rust (model + CSV + manifest) so the
    /// forced-run DTOs are fixtured from a real `force_and_run`, not hand-typed.
    fn reservoir_manifest() -> bert_tether::manifest::RunManifest {
        use bert_tether::manifest::{ColumnMapping, Role, RunManifest};
        RunManifest {
            model: String::new(),
            data: String::new(),
            dt: None,
            t: 12.0,
            mapping: vec![
                ColumnMapping {
                    column: "month".into(),
                    role: Role::Time,
                    element: None,
                    unit: None,
                    force: false,
                    every: None,
                },
                ColumnMapping {
                    column: "inflow".into(),
                    role: Role::Flow,
                    element: Some("Watershed → Reservoir".into()),
                    unit: Some("ML/mo".into()),
                    force: true,
                    every: None,
                },
            ],
        }
    }

    const RESERVOIR_CSV: &str =
        "month,inflow\n1,20\n2,35\n3,60\n4,45\n5,25\n6,15\n7,10\n8,12\n9,22\n10,40\n11,55\n12,30\n";

    #[test]
    fn csv_parse_fixture() {
        let (headers, rows) = bert_tether::tether::parse_csv(RESERVOIR_CSV).expect("csv parses");
        check_fixture("csv_parse", &CsvParse { headers, rows });
    }

    #[test]
    fn targets_fixture() {
        let json = include_str!("../../../assets/models/demos/reservoir.json");
        let model: WorldModel = serde_json::from_str(json).expect("reservoir parses");
        let flows: Vec<FlowTarget> = bert_tether::forcing::flow_targets(&model)
            .into_iter()
            .map(|(id, name, unit)| FlowTarget { id, name, unit })
            .collect();
        let components: Vec<ComponentTarget> = bert_tether::forcing::component_targets(&model)
            .into_iter()
            .map(|(id, name)| ComponentTarget { id, name })
            .collect();
        assert!(!flows.is_empty(), "reservoir must expose flow targets");
        check_fixture("targets", &Targets { flows, components });
    }

    #[test]
    fn mapping_status_fixture() {
        let json = include_str!("../../../assets/models/demos/reservoir.json");
        let model: WorldModel = serde_json::from_str(json).expect("reservoir parses");
        let status =
            bert_tether::forcing::mapping_status(&model, RESERVOIR_CSV, &reservoir_manifest())
                .expect("mapping status");
        check_fixture("mapping_status", &status);
    }

    #[test]
    fn run_result_fixture() {
        let json = include_str!("../../../assets/models/runnable-sample.json");
        let model: WorldModel = serde_json::from_str(json).expect("sample parses");
        let spec = core_validate_operational(&model).expect("sample is executable");
        let mut circuit = bert_compose::from_spec(&spec);
        let recorded = bert_compose::RecordedRun::record(&mut circuit, &spec, 1.0, 4);
        check_fixture("run_result", &recorded.report());
    }

    #[test]
    fn run_result_rich_fixture() {
        let json = include_str!("../../../assets/models/demos/reservoir.json");
        let model: WorldModel = serde_json::from_str(json).expect("reservoir parses");
        let readout = bert_tether::forcing::force_and_run(
            model,
            RESERVOIR_CSV,
            &reservoir_manifest(),
            1.0,
            12.0,
            "2026-01-01",
        )
        .expect("forced run succeeds");
        check_fixture("run_result_rich", &RunResultRich::from(readout));
    }

    /// The parity automaton as a Klir CANVAS model: two states, a self-loop and a
    /// cross-edge out of each. The #67 flagship fixture — self-loops make it, and
    /// they are refused entering Operational mode, so the Markov path must read
    /// Klir directly.
    fn parity_canvas() -> bert_canvas::canvas::CanvasModel {
        use bert_canvas::canvas::{CanvasModel, Kind, Lens, Relation, Role, Thing};
        fn thing(id: u64, name: &str) -> Thing {
            Thing {
                id,
                name: name.to_string(),
                description: String::new(),
                x: 0.0,
                y: 0.0,
                role: Role::Component,
                primitive: None,
                interface: false,
                child_model: None,
                stock_unit: String::new(),
                scale: None,
                states: None,
                variable_kind: None,
                cognitive_params: Default::default(),
                initial_state: Default::default(),
                agency_capacity: None,
                env_kind: Default::default(),
            }
        }
        fn edge(id: u64, a: u64, b: u64) -> Relation {
            Relation {
                id,
                a,
                b,
                name: String::new(),
                description: String::new(),
                is_bond: true,
                kind: Kind::Unspecified,
                klir_directed: false,
                weight: None,
                amount: None,
                unit: String::new(),
                substance: String::new(),
                ample: false,
            }
        }
        CanvasModel {
            lens: Lens::Klir,
            model_id: None,
            things: vec![thing(1, "Even"), thing(2, "Odd")],
            relations: vec![edge(10, 1, 2), edge(11, 1, 1), edge(12, 2, 1), edge(13, 2, 2)],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            description: String::new(),
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        }
    }

    /// Law: the full #67 Markov spine — a Klir parity automaton (self-loops and
    /// all) reads through `markov_edges`, builds a chain with uniform weights,
    /// and runs to the uniform stationary distribution. End to end, the path the
    /// `run_markov` wasm export marshals, with no projection and no Operational
    /// gate anywhere in it.
    #[test]
    fn markov_parity_runs_and_converges() {
        let model = parity_canvas();
        let (states, edges) = bert_canvas::canvas::markov_edges(&model);
        assert_eq!(states.len(), 2, "two states");
        let chain = bert_compose::markov::Chain::from_edges(states, &edges);
        // Uniform weights on the parity automaton give P = [[½,½],[½,½]]: from a
        // point mass on Even, one step already lands on the uniform distribution.
        let run = chain.run(&chain.point_mass(0), 20);
        let last = run.history.last().unwrap();
        assert!(
            (last[0] - 0.5).abs() < 1e-6 && (last[1] - 0.5).abs() < 1e-6,
            "uniform parity did not converge to [½,½]: {last:?}"
        );
        assert_eq!(run.states, vec!["Even".to_string(), "Odd".to_string()]);
    }

    /// Law: authored per-edge weights bias the run. Even's two out-edges —
    /// `weight 3` to Odd (flip) and `weight 1` to Even (stay) — normalize to a
    /// [0.25 stay, 0.75 flip] first row, the biased `P` the counts specify.
    #[test]
    fn markov_authored_weights_bias_the_row() {
        let mut model = parity_canvas();
        for r in &mut model.relations {
            // Even --flip--> Odd (10) gets weight 3; Even --stay--> Even (11) gets 1.
            r.weight = match r.id {
                10 => Some(3),
                11 => Some(1),
                _ => None,
            };
        }
        let (states, edges) = bert_canvas::canvas::markov_edges(&model);
        let chain = bert_compose::markov::Chain::from_edges(states, &edges);
        let row = &chain.p()[0];
        assert!(
            (row[0] - 0.25).abs() < 1e-9 && (row[1] - 0.75).abs() < 1e-9,
            "3:1 weighting did not bias Even's row to [0.25 stay, 0.75 flip]: {row:?}"
        );
    }

    #[test]
    fn markov_run_result_fixture() {
        let model = parity_canvas();
        let (states, edges) = bert_canvas::canvas::markov_edges(&model);
        let chain = bert_compose::markov::Chain::from_edges(states, &edges);
        let run = chain.run(&chain.point_mass(0), 4);
        check_fixture(
            "markov_run_result",
            &MarkovRunResult { kind: "markov", states: run.states, history: run.history },
        );
    }

    /// Law: under the declared conservation invariant, the full run() spine
    /// balances its ledger every tick — the declared invariant is checked at
    /// the boundary the user actually calls, not only in engine unit tests.
    ///
    /// The full `run()` spine on the bundled executable sample: parse → project →
    /// build circuit → record → conserve. Regenerate the sample with
    /// `mint_runnable_sample` if the engine's serialization changes.
    #[test]
    fn runnable_sample_projects_runs_and_conserves() {
        let json = include_str!("../../../assets/models/runnable-sample.json");
        let model: WorldModel = serde_json::from_str(json).expect("sample parses");
        let spec = core_validate_operational(&model).expect("sample is executable");
        let mut circuit = bert_compose::from_spec(&spec);
        let run = bert_compose::RecordedRun::record(&mut circuit, &spec, 1.0, 12);
        assert!(!run.history.is_empty(), "empty trace");
        assert!(
            run.final_balance.abs() < 1e-3,
            "not conserving (residual {})",
            run.final_balance
        );
    }

    // Mint a bundled EXECUTABLE sample model for the web smoke slice's run()
    // demo, by round-tripping a bert-compose ladder circuit (built runnable) out
    // to a WorldModel. Run with:
    //   cargo test -p bert-lenses-kernel mint_runnable_sample -- --ignored --nocapture
    #[test]
    #[ignore]
    fn mint_runnable_sample() {
        let circuit = bert_compose::ladder::flows();
        let model = bert_compose::to_world_model(&circuit, "flows-runnable-sample");
        // prove it projects + runs before we bundle it
        let spec = core_validate_operational(&model).expect("ladder::flows must be executable");
        let mut c = bert_compose::from_spec(&spec);
        let r = bert_compose::RecordedRun::record(&mut c, &spec, 1.0, 12);
        assert!(r.final_balance.abs() < 1e-3, "sample must conserve");
        let json = serde_json::to_string_pretty(&model).unwrap();
        std::fs::write(
            concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/models/runnable-sample.json"),
            json,
        )
        .unwrap();
        println!("wrote runnable-sample.json ({} ticks, residual {:.2e})", r.history.len(), r.final_balance);
    }

}
