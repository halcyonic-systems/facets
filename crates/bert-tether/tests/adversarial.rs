//! Adversarial inputs across the bert-tether boundary paths (issue #47).
//!
//! `parse_csv`, `mapping_status`, and `force_and_run` are reachable from the
//! wasm boundary (`api.rs`), and the tether wizard feeds them partially-valid,
//! user-typed CSV + manifest state on every keystroke. The error contract
//! (API.md): each returns its documented shape or a structured error (`Result`);
//! it NEVER panics, because a wasm panic is an unrecoverable abort. Every case
//! below reaches the end (or an `Err`) without aborting the test binary — a
//! panic anywhere would fail it.

use bert_tether::forcing::{component_targets, flow_targets, force_and_run, mapping_status};
use bert_tether::manifest::{ColumnMapping, Role, RunManifest};
use bert_tether::tether::{parse_csv, MappingDraft};

const RESERVOIR: &str = include_str!("../../../assets/models/demos/reservoir.json");

fn reservoir() -> bert_core::WorldModel {
    serde_json::from_str(RESERVOIR).expect("reservoir asset parses")
}

/// Law: `parse_csv` and Δt inference must return Ok/Err (or a well-defined value) for any input, never panic — a wasm panic is an unrecoverable abort.
/// Pathological CSVs must parse-or-error, never panic; the inferred-Δt path over
/// a time column (which sorts gaps) must survive non-finite and degenerate values.
#[test]
fn parse_csv_and_inferred_dt_survive_weird_input() {
    let weird = [
        "",                                    // empty
        "\n\n\n",                              // only newlines
        "a,b,c",                               // header only, no rows
        "a,b\n1",                              // ragged: short row
        "a,b\n1,2,3,4,5",                      // ragged: long row
        "time,x\nNaN,1\ninf,2\n-inf,3\n0,4",   // non-finite time cells
        "time,x\n1,1\n1,2\n1,3",               // all-equal time (zero gaps)
        "time\n1e308\n-1e308\n5",              // overflow-scale magnitudes
        "🌊,héllo\n1,2\n3,4",                  // unicode headers + cells
        ",,,\n,,,\n",                          // all-empty cells
    ];
    for csv in weird {
        // parse_csv itself: Ok or a structured CsvError, never a panic.
        let Ok((headers, rows)) = parse_csv(csv) else {
            continue;
        };
        // Drive the Δt inference (the `f64::total_cmp` sort) with the first
        // column marked Time — this is the path a NaN/inf cell would have
        // panicked through under `partial_cmp().unwrap()`.
        if headers.is_empty() {
            continue;
        }
        let mut draft = MappingDraft::new("adversarial.csv".into(), headers, rows);
        draft.assignments[0] = bert_tether::tether::Assignment::Time;
        let _ = draft.inferred_dt();
        let _ = draft.column_values(0);
    }
}

/// Law: `mapping_status` must yield Ok/Err for any manifest + CSV combination, however malformed, never abort.
/// `mapping_status` reconstructs the draft, runs the gates, and infers Δt — all
/// from user-typed manifest state. Weird manifests must yield Ok/Err, not abort.
#[test]
fn mapping_status_survives_weird_manifests() {
    let model = reservoir();
    let csv = "month,inflow\n1,20\n2,35\n3,60\n";

    let manifests = vec![
        // Empty mapping (nothing assigned — T1 fails, no panic).
        RunManifest { model: String::new(), data: String::new(), dt: None, t: 12.0, mapping: vec![] },
        // Element name that resolves to nothing (typo'd flow target).
        RunManifest {
            model: String::new(),
            data: String::new(),
            dt: None,
            t: 0.0,
            mapping: vec![ColumnMapping {
                column: "inflow".into(),
                role: Role::Flow,
                element: Some("Does Not Exist".into()),
                unit: Some("ML/mo".into()),
                force: true,
                every: None,
            }],
        },
        // Mapping references a column the CSV does not contain.
        RunManifest {
            model: String::new(),
            data: String::new(),
            dt: None,
            t: -5.0, // negative horizon
            mapping: vec![ColumnMapping {
                column: "ghost_column".into(),
                role: Role::Flow,
                element: None, // required-but-missing
                unit: None,
                force: false,
                every: Some(0), // zero stride
            }],
        },
        // Duplicate time columns (T4 must fire, not panic).
        RunManifest {
            model: String::new(),
            data: String::new(),
            dt: Some(f64::NAN), // non-finite declared Δt
            t: f64::INFINITY,
            mapping: vec![
                ColumnMapping { column: "month".into(), role: Role::Time, element: None, unit: None, force: false, every: None },
                ColumnMapping { column: "inflow".into(), role: Role::Time, element: None, unit: None, force: false, every: None },
            ],
        },
    ];

    for m in manifests {
        // Contract: Ok(status) or Err(reason) — never a panic.
        let _ = mapping_status(&model, csv, &m);
        // Also against an empty and a header-only CSV.
        let _ = mapping_status(&model, "", &m);
        let _ = mapping_status(&model, "month,inflow", &m);
    }
}

/// Law: `force_and_run` must return `Err` for incomplete or nonsensical inputs (bad mapping, non-finite/zero/negative Δt or horizon) rather than abort.
/// `force_and_run` is the heaviest path (resolve → gates → commit → project →
/// simulate). Incomplete or nonsensical inputs must return `Err`, never abort.
#[test]
fn force_and_run_refuses_without_panicking() {
    let csv = "month,inflow\n1,20\n2,35\n3,60\n";
    let manifest = RunManifest {
        model: String::new(),
        data: String::new(),
        dt: None,
        t: 12.0,
        mapping: vec![], // incomplete — must be refused
    };

    // Incomplete mapping → Err.
    assert!(force_and_run(reservoir(), csv, &manifest, 1.0, 12.0, "2026-01-01").is_err());

    // Degenerate dt / horizon values on an otherwise-shaped call: whatever the
    // gates decide, the call must return a Result rather than abort.
    let flow_name = flow_targets(&reservoir())
        .first()
        .map(|(_, n, _)| n.clone())
        .unwrap_or_default();
    let shaped = RunManifest {
        model: String::new(),
        data: String::new(),
        dt: None,
        t: 12.0,
        mapping: vec![
            ColumnMapping { column: "month".into(), role: Role::Time, element: None, unit: None, force: false, every: None },
            ColumnMapping {
                column: "inflow".into(),
                role: Role::Flow,
                element: Some(flow_name),
                unit: Some("ML/mo".into()),
                force: true,
                every: None,
            },
        ],
    };
    for (dt, t, today) in [
        (0.0, 12.0, "2026-01-01"), // zero Δt
        (-1.0, 12.0, "2026-01-01"), // negative Δt
        (1.0, 0.0, "2026-01-01"),  // zero horizon
        (f64::NAN, 12.0, "2026-01-01"),
        (1.0, 12.0, "not-a-date"), // malformed today
        (1.0, 12.0, ""),           // empty today
    ] {
        let _ = force_and_run(reservoir(), csv, &shaped, dt, t, today);
    }
}

/// Law: flow/component target enumeration must complete (never panic) for any model, including one with no interactions or systems at all.
/// The target enumerations off a well-formed model must not panic even when the
/// model is odd (this exercises the handle arithmetic in `name_of`).
#[test]
fn target_enumeration_is_total() {
    let model = reservoir();
    let _flows = flow_targets(&model);
    let _components = component_targets(&model);
    // An empty model has no targets — and must not panic producing that answer.
    let empty = bert_core::WorldModel {
        version: 1,
        mode: None,
        environment: bert_core::Environment {
            info: bert_core::Info { id: bert_core::Id { ty: bert_core::IdType::Environment, indices: vec![-1] }, level: -1, name: String::new(), description: String::new() },
            sources: vec![],
            sinks: vec![],
        },
        systems: vec![],
        interactions: vec![],
        hidden_entities: vec![],
        reachability_requirements: vec![],
    };
    assert!(flow_targets(&empty).is_empty());
    assert!(component_targets(&empty).is_empty());
}
