//! Shared model construction for the lens-entry binding tests (bert-lenses#24).
//!
//! Both the Rung 1 fixture test (`gates_truth_table.rs`) and the Rung 1.5 oracle
//! property test (`gates_oracle.rs`) turn an abstract `(n, dep)` kernel into a
//! `WorldModel` and ask `validate_mode` which lenses it may be entered as. They
//! MUST agree on that encoding, so it lives here once.

use bert_core::validate::validate_mode;
use bert_core::{Mode, WorldModel};
use serde_json::{json, Value};

/// Build a minimal, otherwise-clean `WorldModel` realizing a kernel: `n`
/// component subsystems under a root S0, one interaction per dependency pair.
/// Every field is at its witness baseline, so the only errors `validate_mode`
/// can raise are the mode gates themselves — the missing bond (Structural) and
/// self-loops (Operational/Full). The root S0 is BERT's required container; the
/// enumerated things are its children, and no edge touches S0, so it is inert to
/// the gates.
pub fn model_for(n: u64, dep: &[(u64, u64)]) -> WorldModel {
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
pub fn enterable(model: &WorldModel, mode: Mode) -> bool {
    !validate_mode(model, mode).has_errors()
}
