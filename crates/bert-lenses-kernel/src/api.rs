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
            ok: parse.model,
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

// ---- Boundary DTOs (data-transfer shapes only, no logic) --------------------

#[derive(Serialize)]
struct ConnectionVerdict {
    issues: Vec<bert_core::validate::ValidationIssue>,
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

/// The tagged result of [`compile_sl`]: a canvas model, or the parse faults.
#[derive(Serialize)]
#[serde(untagged)]
enum SlOutcome {
    Ok {
        ok: bert_canvas::canvas::CanvasModel,
        lens_explicit: bool,
    },
    Errors {
        errors: Vec<bert_canvas::sl::SlError>,
    },
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
        check_fixture(
            "run_result",
            &RunResult {
                dt: recorded.dt,
                history: recorded.history,
                ledger_history: recorded.ledger_history,
                final_balance: recorded.final_balance,
            },
        );
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
