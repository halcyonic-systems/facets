//! Shared model construction for the lens-entry binding tests (bert-lenses#24).
//!
//! Both the Rung 1 fixture test (`gates_truth_table.rs`) and the Rung 1.5 oracle
//! property test (`gates_oracle.rs`) turn an abstract `(n, dep)` kernel into a
//! `WorldModel` and ask `validate_mode` which lenses it may be entered as. They
//! MUST agree on that encoding, so it lives here once.
//!
//! Shared by several test binaries (gates truth-table, gates oracle, quint
//! replay); not every binary uses every helper, so unused-in-one-binary is
//! expected here.
#![allow(dead_code)]

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

/// One executable component: a level-1 subsystem with a Mobus primitive on its
/// agent, wired between an environment source and sink. `id_suffix` distinguishes
/// components; `with_primitive` false leaves the agent primitive-less, which
/// `validate_operational` refuses ("no Mobus primitive") while `validate_mode`'s
/// kernel gates — which read only `(things, dep)` — stay clean. That gap is the
/// stamp-vs-executability distinction the mode-ladder spec turns on: the single
/// knob that flips the strict `executable` conjunct without touching HasBond or
/// Irreflexive.
fn component(idx: u64, with_primitive: bool) -> Value {
    let agent = if with_primitive {
        json!({ "kind": "Reactive", "primitive": "Buffering" })
    } else {
        json!({ "kind": "Reactive" })
    };
    json!({
        "info": { "id": format!("C0.{idx}"), "level": 1, "name": format!("c{idx}"), "description": "" },
        "sources": [], "sinks": [],
        "parent": "S0",
        "complexity": "Atomic",
        "boundary": {
            "info": { "id": format!("B0.{idx}"), "level": 1, "name": "", "description": "" },
            "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": []
        },
        "radius": 50.0,
        "equivalence": "", "history": "", "transformation": "",
        "member_autonomy": 1.0, "time_constant": "",
        "agent": agent
    })
}

fn typed_flow(idx: u64, source: &str, sink: &str) -> Value {
    json!({
        "info": { "id": format!("F{idx}"), "level": 0, "name": format!("f{idx}"), "description": "" },
        "substance": { "sub_type": "water", "type": "Material" },
        "type": "Flow",
        "usability": "Product",
        "source": source,
        "sink": sink,
        "amount": "1",
        "unit": "L",
        "parameters": []
    })
}

/// Concretize an abstract mode-ladder state (`mode_ladder.qnt`) into a real
/// `WorldModel` the bert-core mode machine consumes. The Quint spec's state is
/// four kernel-level knobs; each maps to one structural lever, chosen so that
/// exactly one of `validate_mode`/`validate_operational`'s gates flips per knob:
///
/// | spec knob     | lever in the built model                              | gate it moves                    |
/// |---------------|-------------------------------------------------------|----------------------------------|
/// | `mode`        | `WorldModel.mode` stamp                               | `validate_operational` mode gate |
/// | `has_bond`    | a second component + a component→component flow       | `Kernel.HasBond` (Structural)    |
/// | `irreflexive` | absence of a self-loop flow (false ⇒ add `C0.0→C0.0`) | `Kernel.Irreflexive` (Operational)|
/// | `executable`  | every component carries a primitive (false ⇒ strip one)| the strict projection conjunct  |
///
/// With `has_bond=false` the model is the canonical Mobus `source → buffer →
/// sink`; with `has_bond=true` it is `source → A → B → sink` where `A → B` is the
/// bond. The two faces meet at `validate_operational`, whose success must equal
/// the spec's `canExecute` — the harness asserts exactly that agreement.
pub fn concrete_model(mode: Mode, has_bond: bool, irreflexive: bool, executable: bool) -> WorldModel {
    let root = json!({
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
    });

    // C0.0 carries the primitive iff executable; when a bond is present C0.1 is
    // always kept whole, so the single stripped primitive is the only executable
    // defect.
    let mut systems = vec![root, component(0, executable)];
    let mut flows = vec![typed_flow(0, "Src-1.0", "C0.0")];
    if has_bond {
        systems.push(component(1, true));
        flows.push(typed_flow(1, "C0.0", "C0.1")); // the component→component bond
        flows.push(typed_flow(2, "C0.1", "Snk-1.0"));
    } else {
        flows.push(typed_flow(1, "C0.0", "Snk-1.0"));
    }
    if !irreflexive {
        let idx = flows.len() as u64;
        flows.push(typed_flow(idx, "C0.0", "C0.0")); // self-dependency: fails Irreflexive
    }

    let mode_str = match mode {
        Mode::Core => "Core",
        Mode::Structural => "Structural",
        Mode::Operational => "Operational",
        Mode::Full => "Full",
    };

    let value = json!({
        "version": 1,
        "mode": mode_str,
        "environment": {
            "info": { "id": "E-1", "level": -1, "name": "", "description": "" },
            "sources": [{
                "info": { "id": "Src-1.0", "level": -1, "name": "Well", "description": "" },
                "type": "Source", "equivalence": "", "model": ""
            }],
            "sinks": [{
                "info": { "id": "Snk-1.0", "level": -1, "name": "Drain", "description": "" },
                "type": "Sink", "equivalence": "", "model": ""
            }]
        },
        "systems": systems,
        "interactions": flows
    });

    serde_json::from_value(value).expect("concretized model deserializes")
}
