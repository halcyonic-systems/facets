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

// ---- Boundary DTOs (data-transfer shapes only, no logic) --------------------

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
