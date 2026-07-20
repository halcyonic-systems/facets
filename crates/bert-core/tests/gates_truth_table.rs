//! Rung 1 of the lens-entry binding (bert-lenses#24): the Lean side enumerates
//! every small (T, R) kernel and records, in `fixtures/gates_truth_table.json`,
//! which lens each may be entered as — the verdicts of `Kernel.HasBond` and
//! `Kernel.Irreflexive` from `ViewGeneration.lean`. This test rebuilds each row
//! as a `WorldModel` and asserts `validate_mode`'s entry gates agree with the
//! Lean verdicts on every row, in both directions. A Rust gate refactor that
//! drifts from a Lean precondition turns this red.
//!
//! The fixture is generated offline (no Lean toolchain in Rust CI); regenerate
//! it with the command recorded in the fixture's `_generator.command`.

use bert_core::validate::validate_mode;
use bert_core::{Mode, WorldModel};
use serde_json::{json, Value};

/// The committed truth table, parsed once.
fn fixture() -> Value {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../fixtures/gates_truth_table.json"
    );
    let bytes = std::fs::read(path).unwrap_or_else(|e| panic!("read {path}: {e}"));
    serde_json::from_slice(&bytes).expect("fixture is valid JSON")
}

/// Build a minimal, otherwise-clean `WorldModel` realizing a fixture row: `n`
/// component subsystems under a root S0, one interaction per dependency pair.
/// Every field is at its witness baseline, so the only errors `validate_mode`
/// can raise are the mode gates themselves — the missing bond (Structural) and
/// self-loops (Operational/Full). The root S0 is BERT's required container; the
/// enumerated things are its children, and no edge touches S0, so it is inert to
/// the gates.
fn model_for(n: u64, dep: &[(u64, u64)]) -> WorldModel {
    let mut systems = vec![json!({
        "info": { "id": "S0", "level": 0, "name": "Root", "description": "" },
        "sources": [], "sinks": [],
        "parent": "E-1",
        "complexity": "Atomic",
        "boundary": {
            "info": { "id": "B0", "level": 0, "name": "", "description": "" },
            "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": []
        },
        "radius": 100.0,
        "equivalence": "", "history": "", "transformation": "",
        "member_autonomy": 1.0, "time_constant": ""
    })];
    for i in 0..n {
        systems.push(json!({
            "info": { "id": format!("C0.{i}"), "level": 1, "name": format!("c{i}"), "description": "" },
            "sources": [], "sinks": [],
            "parent": "S0",
            "complexity": "Atomic",
            "boundary": {
                "info": { "id": format!("B0.{i}"), "level": 1, "name": "", "description": "" },
                "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": []
            },
            "radius": 50.0,
            "equivalence": "", "history": "", "transformation": "",
            "member_autonomy": 1.0, "time_constant": ""
        }));
    }

    let interactions: Vec<Value> = dep
        .iter()
        .enumerate()
        .map(|(k, (i, j))| {
            json!({
                "info": { "id": format!("F{k}"), "level": 0, "name": format!("f{k}"), "description": "" },
                "substance": { "sub_type": "", "type": "Message" },
                "type": "Flow",
                "usability": "Product",
                "source": format!("C0.{i}"),
                "sink": format!("C0.{j}"),
                "amount": "0",
                "unit": "",
                "parameters": []
            })
        })
        .collect();

    let value = json!({
        "version": 1,
        "environment": {
            "info": { "id": "E-1", "level": -1, "name": "", "description": "" },
            "sources": [], "sinks": []
        },
        "systems": systems,
        "interactions": interactions
    });

    serde_json::from_value(value).expect("constructed model deserializes")
}

/// Whether `validate_mode` admits entry into `mode` — no error-severity issue.
fn enterable(model: &WorldModel, mode: Mode) -> bool {
    !validate_mode(model, mode).has_errors()
}

#[test]
fn rust_gates_agree_with_lean_verdicts_on_every_row() {
    let fx = fixture();
    let rows = fx["rows"].as_array().expect("rows is an array");
    assert!(!rows.is_empty(), "fixture has no rows");

    for row in rows {
        let n = row["n"].as_u64().expect("n");
        let dep: Vec<(u64, u64)> = row["dep"]
            .as_array()
            .expect("dep")
            .iter()
            .map(|p| {
                let pair = p.as_array().expect("pair");
                (
                    pair[0].as_u64().expect("i"),
                    pair[1].as_u64().expect("j"),
                )
            })
            .collect();

        let model = model_for(n, &dep);
        let modes = &row["modes"];

        for (mode, key) in [
            (Mode::Core, "core"),
            (Mode::Structural, "structural"),
            (Mode::Operational, "operational"),
            (Mode::Full, "full"),
        ] {
            let lean = modes[key].as_bool().unwrap_or_else(|| panic!("modes.{key}"));
            let rust = enterable(&model, mode);
            assert_eq!(
                rust, lean,
                "row n={n} dep={dep:?}: Rust admits {mode:?} = {rust}, \
                 Lean verdict = {lean} — a gate has drifted from its Lean precondition"
            );
        }
    }
}
