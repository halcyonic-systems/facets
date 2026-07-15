//! The forcing seam — inject imported CSV data into an executable model, run it,
//! and read the run back in DOMAIN terms.
//!
//! This is the piece the old egui app did inline inside `to_world_model_with`
//! (main.rs:1874-1968) and `run_model` (main.rs:3311-3399). Here it operates on
//! an already-parsed executable `WorldModel`, since Phase 1 starts from a model
//! rather than authoring one. Still truth, not face: all of it runs in wasm.
//!
//! Element handles are the element's index in document order (interactions =
//! flows, level-1 systems = components). The wizard picks those indices via
//! [`flow_targets`]/[`component_targets`]; `ModelParams` keys by them; and
//! [`apply_params`] walks the same order — so the three always agree.
//!
//! LEGIBILITY (load-bearing): every value read back carries the model's own name
//! and declared unit. No engine columns ("node 3") ever reach the face.
//!
//! TWO SENSES OF "FORCE" — do not conflate:
//! - **Forcing-function** (this module, the `force`/`forced` fields, the #16
//!   feature): driving an edge with an *exogenous data series* `u(t)` instead of
//!   its computed/mean rate — a boundary condition, `F(t)` on the RHS. The
//!   human-facing word for this is **"drive"** (the wizard checkbox, the blurbs);
//!   the field stays `force` internally + in the manifest contract.
//! - **Mobus `InteractionType::Force`** (bert-core): an *ontological* flow type —
//!   a flow whose rate is a potential gradient (`rate = k·Δ`, needs a
//!   `conductance`). Nothing to do with the above. Never relabel this one.

use std::collections::HashMap;

use bert_core::rust_decimal::Decimal;
use bert_core::{Id, Parameter, System, WorldModel};
use bert_compose::circuit::NodeKind;
use bert_compose::{Circuit, RecordedRun};

use crate::tether::{Comparison, ModelParams};

/// The flows a CSV column can be mapped onto: `(handle, name, declared unit)`,
/// one per interaction in document order.
pub fn flow_targets(model: &WorldModel) -> Vec<(u64, String, String)> {
    model
        .interactions
        .iter()
        .enumerate()
        .map(|(i, ix)| (i as u64, ix.info.name.clone(), ix.unit.clone()))
        .collect()
}

/// The components a CSV column can supply a stock / parameter for: level-1
/// systems (the interior work processes), `(handle, name)` in document order.
/// Handles are offset past the flows so flow and component handles never collide
/// in the single `name_of` handle space the wizard/commit use.
pub fn component_targets(model: &WorldModel) -> Vec<(u64, String)> {
    let offset = model.interactions.len() as u64;
    model
        .systems
        .iter()
        .filter(|s| s.info.level == 1)
        .enumerate()
        .map(|(i, s)| (offset + i as u64, s.info.name.clone()))
        .collect()
}

/// Resolve a handle (from either target list) back to its display name — the
/// `name_of` the wizard `commit` and manifest resolution need.
pub fn name_of(model: &WorldModel, handle: u64) -> String {
    let offset = model.interactions.len() as u64;
    if handle < offset {
        model
            .interactions
            .get(handle as usize)
            .map(|ix| ix.info.name.clone())
            .unwrap_or_default()
    } else {
        model
            .systems
            .iter()
            .filter(|s| s.info.level == 1)
            .nth((handle - offset) as usize)
            .map(|s| s.info.name.clone())
            .unwrap_or_default()
    }
}

/// Inject the distilled import (`ModelParams`) onto an existing model: forced
/// flows gain a comma-joined `series` (+ optional `dt_stride`) parameter and an
/// `amount` fallback; components gain their initial storage and transfer param.
/// Ported from old `main.rs:1874-1968`, keyed by element index.
pub fn apply_params(model: &mut WorldModel, params: &ModelParams) {
    for (i, ix) in model.interactions.iter_mut().enumerate() {
        let id = i as u64;
        if let Some(amt) = params.flow_amount.get(&id) {
            if let Some(d) = Decimal::from_f64_retain(*amt) {
                ix.amount = d;
            }
        }
        // Re-derive the forcing params we own (idempotent if applied twice).
        ix.parameters
            .retain(|p| p.name != "series" && p.name != "dt_stride");
        if let Some(series) = params.flow_series.get(&id) {
            ix.parameters.push(Parameter {
                name: "series".to_string(),
                value: series
                    .iter()
                    .map(|v| v.to_string())
                    .collect::<Vec<_>>()
                    .join(","),
                ..Default::default()
            });
        }
        if let Some(&n) = params.flow_stride.get(&id) {
            ix.parameters.push(Parameter {
                name: "dt_stride".to_string(),
                value: n.to_string(),
                ..Default::default()
            });
        }
    }

    let offset = model.interactions.len() as u64;
    let mut ci: u64 = offset;
    for s in model.systems.iter_mut().filter(|s| s.info.level == 1) {
        let id = ci;
        ci += 1;
        if let Some(v) = params.stock_initial.get(&id) {
            s.agent
                .get_or_insert_with(Default::default)
                .initial_state
                .insert("storage".to_string(), serde_json::json!(v));
        }
        if let Some((name, v)) = params.component_param.get(&id) {
            s.agent
                .get_or_insert_with(Default::default)
                .cognitive_params
                .insert(name.clone(), *v);
        }
    }
}

/// The whole forced-run pipeline as one testable unit (the wasm `run_forced`
/// just parses inputs, calls this, and serializes the result). Resolves the
/// mapping, runs the wizard's finish gates, commits, injects, projects,
/// simulates, and reads back in domain terms. Returns a legible error string on
/// any gate/projection failure.
pub fn force_and_run(
    mut model: WorldModel,
    csv_text: &str,
    manifest: &crate::manifest::RunManifest,
    dt: f64,
    t: f64,
    today: &str,
) -> Result<RunReadout, String> {
    let (headers, rows) = crate::tether::parse_csv(csv_text).map_err(|e| format!("{e:?}"))?;

    let flows: Vec<(u64, String)> = flow_targets(&model)
        .into_iter()
        .map(|(id, name, _)| (id, name))
        .collect();
    let components = component_targets(&model);
    let ctx = crate::manifest::ResolveCtx {
        flows: &flows,
        components: &components,
    };

    let mut draft = crate::tether::MappingDraft::new("import.csv".to_string(), headers, rows);
    manifest
        .apply_to_draft(&mut draft, &ctx)
        .map_err(|es| format!("mapping is invalid: {}", es.join("; ")))?;
    if !draft.is_total() {
        return Err("mapping incomplete: every column must be assigned or ignored".to_string());
    }
    draft
        .units_ok()
        .map_err(|m| format!("mapping incomplete: {m}"))?;
    draft
        .time_unique_ok()
        .map_err(|m| format!("mapping invalid: {m}"))?;

    let model_ref = &model;
    let name_of = |h: u64| name_of(model_ref, h);
    let imported = draft.commit(today.to_string(), &name_of);
    let params = imported.projection_params();
    apply_params(&mut model, &params);

    let spec = bert_core::operational::validate_operational(&model)
        .map_err(|errors| format!("model is not executable ({} reason(s))", errors.len()))?;
    let mut circuit = bert_compose::from_spec(&spec);
    let run = bert_compose::RecordedRun::record_over(&mut circuit, &spec, dt, t);
    Ok(summarize(&model, &imported, &circuit, &run, dt))
}

/// A final level, purpose-ordered and domain-named.
pub struct Level {
    pub name: String,
    pub unit: String,
    pub value: f32,
    /// "product" | "resource" | "internal" — purpose category.
    pub category: &'static str,
}

/// One element's recorded trajectory, domain-named.
pub struct Trajectory {
    pub name: String,
    pub unit: String,
    pub series: Vec<f32>,
}

/// The whole run, read back in domain terms.
pub struct RunReadout {
    pub levels: Vec<Level>,
    pub trajectories: Vec<Trajectory>,
    pub comparisons: Vec<Comparison>,
    pub residual: f32,
    pub conserved: bool,
    pub ticks: usize,
    pub dt: f64,
}

fn category_order(cat: &str) -> u8 {
    match cat {
        "product" => 0,
        "resource" => 1,
        _ => 2,
    }
}

/// Read a finished run (circuit left at its final state + the recorded history)
/// back into domain-named levels, trajectories, and simulated-vs-actual
/// comparisons. Mirrors old `run_model` + `comparisons`.
pub fn summarize(
    model: &WorldModel,
    imported: &crate::tether::ImportedData,
    circuit: &Circuit,
    run: &RecordedRun,
    dt: f64,
) -> RunReadout {
    let ticks = run.history.len();

    // Final levels, one row per node, ordered by purpose.
    let mut levels: Vec<Level> = circuit
        .nodes
        .iter()
        .enumerate()
        .map(|(i, node)| {
            let (category, value) = match node.kind {
                NodeKind::Sink => ("product", node.total),
                NodeKind::Source => ("resource", circuit.level(i)),
                NodeKind::Process(_) => ("internal", circuit.level(i)),
            };
            Level {
                name: node.name.clone(),
                unit: node.out_substance.unit.clone(),
                value,
                category,
            }
        })
        .collect();
    levels.sort_by_key(|r| category_order(r.category));

    // Per-node trajectory: a sink's accumulated total, a buffer's stock, else
    // last-tick activity — the column of the recorded rows that reads as level.
    let col_of = |kind: &NodeKind| -> usize {
        match kind {
            NodeKind::Sink => 2,
            NodeKind::Process(bert_core::ProcessPrimitive::Buffering) => 1,
            _ => 0,
        }
    };
    let trajectories: Vec<Trajectory> = circuit
        .nodes
        .iter()
        .enumerate()
        .map(|(i, node)| {
            let col = col_of(&node.kind);
            let series = run.history.iter().map(|row| row[1 + i * 3 + col]).collect();
            Trajectory {
                name: node.name.clone(),
                unit: node.out_substance.unit.clone(),
                series,
            }
        })
        .collect();

    // Executed emission per tick (activity, col 0) for every node — the series a
    // flow comparison reads for its upstream endpoint (#25).
    let activities: HashMap<String, Vec<f32>> = circuit
        .nodes
        .iter()
        .enumerate()
        .map(|(i, node)| {
            let s = run.history.iter().map(|row| row[1 + i * 3]).collect();
            (node.name.clone(), s)
        })
        .collect();

    let comparisons = build_comparisons(model, imported, &trajectories, &activities, ticks);

    // Conservation: scale-free — residual as a fraction of total emitted.
    let throughput: f32 = run.ledger_history.iter().map(|l| l[0]).sum();
    let residual = run.final_balance;
    let conserved = residual.abs() <= 1e-4 * throughput.max(1e-6);

    RunReadout {
        levels,
        trajectories,
        comparisons,
        residual,
        conserved,
        ticks,
        dt,
    }
}

/// Pair each mapped stock / forced flow's simulated trace with its actual
/// empirical series and declared baseline. Ported from old `main.rs:3105-3170`,
/// resolving element handles + upstream endpoints off the WorldModel.
fn build_comparisons(
    model: &WorldModel,
    imported: &crate::tether::ImportedData,
    trajectories: &[Trajectory],
    activities: &HashMap<String, Vec<f32>>,
    ticks: usize,
) -> Vec<Comparison> {
    let components = component_targets(model); // (handle, name)
    let id_name = id_name_map(model);
    let traj_by_name: HashMap<&str, &Vec<f32>> = trajectories
        .iter()
        .map(|t| (t.name.as_str(), &t.series))
        .collect();

    let mut out: Vec<Comparison> = Vec::new();

    // Stocks: the mapped component's recorded trajectory vs the imported series.
    for (tid, s) in &imported.stock_series {
        let Some((_, name)) = components.iter().find(|(h, _)| h == tid) else {
            continue;
        };
        let Some(sim) = traj_by_name.get(name.as_str()) else {
            continue;
        };
        let actual: Vec<f32> = s.present().iter().map(|v| *v as f32).collect();
        if actual.is_empty() {
            continue;
        }
        out.push(Comparison {
            element_name: name.clone(),
            kind: "stock",
            simulated: (*sim).clone(),
            actual,
            baseline: None,
            unit: s.unit.clone(),
        });
    }

    // Flows: the upstream endpoint's executed emission vs the imported series.
    for (rid, s) in &imported.flow_series {
        // A weight (rung 2) is a control input, not an observable — skip.
        if s.unit.eq_ignore_ascii_case("weight") {
            continue;
        }
        let idx = *rid as usize;
        let Some(ix) = model.interactions.get(idx) else {
            continue;
        };
        let actual: Vec<f32> = s.present().iter().map(|v| *v as f32).collect();
        if actual.is_empty() {
            continue;
        }
        let amount = s.mean().unwrap_or(0.0) as f32;
        let flat = vec![amount; ticks.max(actual.len()).max(2)];
        let upstream_name = id_name.get(&ix.source).cloned();
        let executed = upstream_name
            .as_deref()
            .and_then(|n| activities.get(n))
            .cloned();
        let (sim, baseline) = match executed {
            Some(series) => (series, Some(flat)),
            None => (flat, None),
        };
        out.push(Comparison {
            element_name: ix.info.name.clone(),
            kind: "flow",
            simulated: sim,
            actual,
            baseline,
            unit: s.unit.clone(),
        });
    }

    out.sort_by(|a, b| a.element_name.cmp(&b.element_name));
    out
}

/// Every entity's `Id -> display name`, so a flow's `source`/`sink` endpoint can
/// be named (systems + environment terminals + nested terminals).
fn id_name_map(model: &WorldModel) -> HashMap<Id, String> {
    let mut m = HashMap::new();
    let add = |m: &mut HashMap<Id, String>, s: &System| {
        m.insert(s.info.id.clone(), s.info.name.clone());
        for e in s.sources.iter().chain(s.sinks.iter()) {
            m.insert(e.info.id.clone(), e.info.name.clone());
        }
    };
    for s in &model.systems {
        add(&mut m, s);
    }
    for e in model
        .environment
        .sources
        .iter()
        .chain(model.environment.sinks.iter())
    {
        m.insert(e.info.id.clone(), e.info.name.clone());
    }
    m
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;
    use crate::manifest::RunManifest;

    // The runnable sample is Source → Buffering → Sink; interaction 0 is the
    // inflow. Force it with a constant CSV series and confirm the whole pipeline
    // runs, conserves, and reads back domain-named.
    #[test]
    fn forcing_a_flow_runs_conserves_and_reads_back_by_name() {
        let json = include_str!("../../../assets/models/runnable-sample.json");
        let model: WorldModel = serde_json::from_str(json).unwrap();
        let inflow_name = flow_targets(&model)[0].1.clone();

        // A wide panel: a time column + the inflow forced to a constant 10.
        let csv = "t,inflow\n0,10\n1,10\n2,10\n3,10\n";
        let manifest_json = format!(
            r#"{{"model":"","data":"","t":4.0,"mapping":[
                {{"column":"t","as":"time"}},
                {{"column":"inflow","as":"flow","element":{inflow_name:?},"unit":"units/mo","force":true}}
            ]}}"#
        );
        let manifest: RunManifest = serde_json::from_str(&manifest_json).unwrap();

        let readout = force_and_run(model, csv, &manifest, 1.0, 4.0, "2026-07-14")
            .expect("forced run should succeed");

        assert!(readout.conserved, "residual {}", readout.residual);
        assert!(!readout.trajectories.is_empty());
        // Levels + trajectories carry the model's own names, not engine columns.
        assert!(readout.trajectories.iter().all(|t| !t.name.is_empty()));
        assert!(readout.levels.iter().all(|l| !l.name.is_empty()));
        // A comparison was built for the forced flow, keyed by its domain name.
        let cmp = readout
            .comparisons
            .iter()
            .find(|c| c.element_name == inflow_name)
            .expect("forced flow should have a comparison");
        assert_eq!(cmp.kind, "flow");
        assert_eq!(cmp.actual, vec![10.0, 10.0, 10.0, 10.0]);
        assert_eq!(cmp.unit, "units/mo");
    }

    // Each bundled demo (model + CSV + mapping) must run forced, conserve, and
    // read back domain-named — proving the exact element-name match (incl. the
    // "→" char) and the whole one-click path.
    #[test]
    fn every_bundled_demo_runs_forced_and_conserves() {
        #[derive(serde::Deserialize)]
        struct Bundle {
            model: String,
            csv: String,
            t: f64,
            mapping: RunManifest,
        }
        let demos = [
            (
                include_str!("../../../assets/demos/reservoir.json"),
                include_str!("../../../assets/models/demos/reservoir.json"),
            ),
            (
                include_str!("../../../assets/demos/allocation.json"),
                include_str!("../../../assets/models/demos/allocation.json"),
            ),
            (
                include_str!("../../../assets/demos/homeostat.json"),
                include_str!("../../../assets/models/demos/homeostat.json"),
            ),
        ];
        for (bundle_json, model_json) in demos {
            let b: Bundle = serde_json::from_str(bundle_json).unwrap();
            let model: WorldModel = serde_json::from_str(model_json).unwrap();
            let readout = force_and_run(model, &b.csv, &b.mapping, 1.0, b.t, "2026-07-14")
                .unwrap_or_else(|e| panic!("{}: {e}", b.model));
            assert!(readout.conserved, "{}: residual {}", b.model, readout.residual);
            assert!(!readout.trajectories.is_empty(), "{}: empty run", b.model);
            assert!(
                readout.levels.iter().all(|l| !l.name.is_empty()),
                "{}: unnamed level",
                b.model
            );
        }
    }

    #[test]
    fn incomplete_mapping_is_refused_with_a_reason() {
        let json = include_str!("../../../assets/models/runnable-sample.json");
        let model: WorldModel = serde_json::from_str(json).unwrap();
        // A column left unspoken-for → T1 fails via apply_to_draft.
        let csv = "t,inflow\n0,10\n1,10\n";
        let manifest: RunManifest =
            serde_json::from_str(r#"{"model":"","data":"","t":2.0,"mapping":[{"column":"t","as":"time"}]}"#)
                .unwrap();
        match force_and_run(model, csv, &manifest, 1.0, 2.0, "2026-07-14") {
            Ok(_) => panic!("incomplete mapping should be refused"),
            Err(e) => assert!(!e.is_empty()),
        }
    }
}
