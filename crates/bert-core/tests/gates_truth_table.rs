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

use bert_core::Mode;
use serde_json::Value;

mod common;
use common::{enterable, model_for};

/// The committed truth table, parsed once.
fn fixture() -> Value {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../fixtures/gates_truth_table.json"
    );
    let bytes = std::fs::read(path).unwrap_or_else(|e| panic!("read {path}: {e}"));
    serde_json::from_slice(&bytes).expect("fixture is valid JSON")
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
