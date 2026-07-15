//! The JS-facing wasm boundary — thin, marshaling-only.
//!
//! Every function here follows one shape: deserialize JS input → hand it to
//! [`bert_core`] / [`bert_compose`] / [`crate::tether`] (the truth) → serialize
//! the result back. There is NO systems logic in this module. It parses JSON,
//! calls the kernel, and hands the answer to the face. If a verdict were ever
//! computed here instead of delegated, that would violate the load-bearing
//! invariant.
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
    let recorded = bert_compose::RecordedRun::record(&mut circuit, &spec, dt, ticks);
    to_js(&RunResult {
        dt: recorded.dt,
        history: recorded.history,
        ledger_history: recorded.ledger_history,
        final_balance: recorded.final_balance,
    })
}

/// Parse CSV text into headers + string rows (gaps disclosed, never filled).
/// The column-meaning assignment ritual (`MappingDraft`, gates T1/T2/T5) is the
/// Phase-1 wizard surface; this is its first step.
#[wasm_bindgen]
pub fn parse_csv(text: &str) -> Result<JsValue, JsError> {
    let (headers, rows) =
        crate::tether::parse_csv(text).map_err(|e| JsError::new(&format!("{e:?}")))?;
    to_js(&CsvParse { headers, rows })
}

// ---- Phase 1: the tether wizard + forced run -------------------------------

/// The mapping targets a CSV column can attach to, read from the model: flows
/// (interactions) and components (level-1 systems). The wizard's dropdowns.
#[wasm_bindgen]
pub fn model_targets(model_json: &str) -> Result<JsValue, JsError> {
    let model = parse_model(model_json)?;
    let flows: Vec<FlowTarget> = crate::forcing::flow_targets(&model)
        .into_iter()
        .map(|(id, name, unit)| FlowTarget { id, name, unit })
        .collect();
    let components: Vec<ComponentTarget> = crate::forcing::component_targets(&model)
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
    let (headers, rows) =
        crate::tether::parse_csv(csv_text).map_err(|e| JsError::new(&format!("{e:?}")))?;
    let manifest: crate::manifest::RunManifest = serde_json::from_str(manifest_json)
        .map_err(|e| JsError::new(&format!("invalid manifest: {e}")))?;

    let flows: Vec<(u64, String)> = crate::forcing::flow_targets(&model)
        .into_iter()
        .map(|(id, name, _)| (id, name))
        .collect();
    let components = crate::forcing::component_targets(&model);
    let ctx = crate::manifest::ResolveCtx {
        flows: &flows,
        components: &components,
    };

    let mut draft = crate::tether::MappingDraft::new("import.csv".to_string(), headers.clone(), rows);
    let apply_error = manifest.apply_to_draft(&mut draft, &ctx).err();

    let name_of = |h: u64| crate::forcing::name_of(&model, h);
    let translations: Vec<String> = (0..headers.len())
        .filter_map(|i| draft.translation(i, &name_of))
        .collect();
    let units = draft.units_ok();
    let time = draft.time_unique_ok();

    to_js(&MappingStatus {
        t1_ok: draft.is_total(),
        t2_ok: units.is_ok(),
        t2_msg: units.err(),
        t4_ok: time.is_ok(),
        t4_msg: time.err(),
        can_finish: draft.can_finish(),
        translations,
        inferred_dt: draft.inferred_dt(),
        apply_error: apply_error.map(|es| es.join("; ")),
    })
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
    let manifest: crate::manifest::RunManifest = serde_json::from_str(manifest_json)
        .map_err(|e| JsError::new(&format!("invalid manifest: {e}")))?;
    let readout = crate::forcing::force_and_run(model, csv_text, &manifest, dt, t, today)
        .map_err(|e| JsError::new(&e))?;
    to_js(&RunResultRich::from(readout))
}

// ---- Boundary DTOs (data-transfer shapes only, no logic) --------------------

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
struct MappingStatus {
    t1_ok: bool,
    t2_ok: bool,
    t2_msg: Option<String>,
    t4_ok: bool,
    t4_msg: Option<String>,
    can_finish: bool,
    translations: Vec<String>,
    inferred_dt: Option<f64>,
    apply_error: Option<String>,
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
}
#[derive(Serialize)]
struct LevelDto {
    name: String,
    unit: String,
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
    series: Vec<f32>,
}

impl From<crate::forcing::RunReadout> for RunResultRich {
    fn from(r: crate::forcing::RunReadout) -> Self {
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
                    series: t.series,
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

/// A recorded run, flattened to its public trace for the face to chart.
#[derive(Serialize)]
struct RunResult {
    dt: f64,
    history: Vec<Vec<f32>>,
    ledger_history: Vec<[f32; 4]>,
    final_balance: f32,
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
