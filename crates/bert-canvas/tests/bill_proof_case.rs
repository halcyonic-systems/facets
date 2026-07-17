//! WP4 proof case — the deterministic (zero-LLM) acceptance gate.
//!
//! Loads the Tauri-era v1 `bill.json` through the real load path
//! (`WorldModel` deserialize -> `to_canvas` -> `analyze(Mobus)`) and asserts the
//! kernel's flow-graph verdicts. Also dumps the broken model's canvas + analysis
//! JSON for the TS `renderContextForPrompt` harness (the LLM leg's real input).

use bert_canvas::canvas::{to_canvas, Lens};
use bert_canvas::lenses::{analyze, CanvasAnalysis, LensDescription};
use bert_core::validate::Severity;
use bert_core::WorldModel;

const CORRECTED: &str = include_str!("../../../web/fixtures/bill.json");
const BROKEN: &str = include_str!("../../../web/fixtures/bill-broken.json");

fn load(json: &str) -> CanvasAnalysis {
    // Step 0: does the v1 Tauri format parse? A serde failure here is the finding.
    let world: WorldModel = serde_json::from_str(json).expect("v1 bill.json must deserialize");
    let canvas = to_canvas(&world);
    analyze(&canvas, Lens::Mobus)
}

fn dead_end_names(a: &CanvasAnalysis) -> Vec<String> {
    a.validation
        .issues
        .iter()
        .filter(|i| i.message.contains("terminal/absorbing"))
        .map(|i| i.message.clone())
        .collect()
}

fn duplicate_issue_idxs(a: &CanvasAnalysis) -> Vec<usize> {
    a.validation
        .issues
        .iter()
        .enumerate()
        .filter(|(_, i)| i.message.contains("duplicate edge"))
        .map(|(i, _)| i)
        .collect()
}

#[test]
fn step0_v1_bill_parses_and_analyzes() {
    // If this test compiles-and-runs, the canvas load path accepts v1 JSON
    // (`version:1`, `transform.translation`, `hidden_entities`) end to end.
    let a = load(CORRECTED);
    assert!(
        !a.validation.issues.is_empty() || a.facts.edges.is_empty(),
        "analyze produced a verdict over the parsed v1 model"
    );
    assert!(
        matches!(a.description, LensDescription::Mobus { .. }),
        "Operational mode drives the Mobus lens description"
    );
}

#[test]
fn corrected_bill_five_terminals_no_errors() {
    let a = load(CORRECTED);

    // No Errors anywhere: a correct FSA with absorbing states must load clean.
    let errors: Vec<_> = a
        .validation
        .issues
        .iter()
        .filter(|i| i.severity == Severity::Error)
        .collect();
    assert!(errors.is_empty(), "corrected bill must have no Errors: {errors:#?}");

    // Exactly the 5 legitimate absorbing states, no more (Vetoed still emits).
    let dead = dead_end_names(&a);
    assert_eq!(dead.len(), 5, "5 terminal-state warnings expected: {dead:#?}");
    for name in ["Law", "died in committee", "fail", "dead", "pocket-vetoed"] {
        assert!(
            dead.iter().any(|m| m.contains(name)),
            "'{name}' should surface as a terminal-state warning: {dead:#?}"
        );
    }
    assert!(
        !dead.iter().any(|m| m.contains("Vetoed")),
        "corrected Vetoed still emits (override/override-fails), not a dead-end"
    );

    // No duplicate-edge warning in the corrected model.
    assert!(
        duplicate_issue_idxs(&a).is_empty(),
        "corrected bill has no parallel edges"
    );

    // No unreachable-node warnings.
    assert!(
        !a.validation
            .issues
            .iter()
            .any(|i| i.message.contains("not reachable")),
        "every node is reachable from the entry (C0.0)"
    );
}

#[test]
fn broken_bill_dead_end_and_duplicate_with_targets_no_errors() {
    let a = load(BROKEN);

    // Zero Errors — every one of the 4 injected defects is Warning-severity by
    // design (structurally legal, domain-questionable). The gate must not block.
    let errors: Vec<_> = a
        .validation
        .issues
        .iter()
        .filter(|i| i.severity == Severity::Error)
        .collect();
    assert!(errors.is_empty(), "broken bill has no Errors (all Warnings): {errors:#?}");

    // Dead-ends: the injected Vetoed dead-end PLUS the 5 legitimate terminals = 6.
    let dead = dead_end_names(&a);
    assert_eq!(dead.len(), 6, "Vetoed + 5 terminals expected: {dead:#?}");
    assert!(
        dead.iter().any(|m| m.contains("Vetoed")),
        "deleting override/override-fails makes Vetoed a dead-end: {dead:#?}"
    );
    for name in ["Law", "died in committee", "fail", "dead", "pocket-vetoed"] {
        assert!(
            dead.iter().any(|m| m.contains(name)),
            "'{name}' terminal warning still present: {dead:#?}"
        );
    }

    // The Vetoed dead-end issue resolves to a canvas THING (non-null target).
    let vetoed_idx = a
        .validation
        .issues
        .iter()
        .position(|i| i.message.contains("terminal/absorbing") && i.message.contains("Vetoed"))
        .expect("Vetoed dead-end issue present");
    assert!(
        a.issue_targets[vetoed_idx].thing.is_some(),
        "Vetoed dead-end must resolve to a canvas thing id"
    );

    // Duplicate edge: exactly one warning, resolving to a canvas RELATION.
    let dups = duplicate_issue_idxs(&a);
    assert_eq!(dups.len(), 1, "one duplicate-edge warning (F17 clones F3): {dups:#?}");
    assert!(
        a.issue_targets[dups[0]].relation.is_some(),
        "duplicate-edge issue must resolve to a canvas relation id"
    );

    // Total: 6 dead-ends + 1 duplicate = 7 mechanical warnings.
    assert_eq!(
        a.validation.issues.len(),
        7,
        "expected 7 kernel warnings (6 dead-end + 1 duplicate): {:#?}",
        a.validation.issues
    );

    // Dump the real canvas + analysis for the TS renderContextForPrompt harness.
    let canvas = to_canvas(&serde_json::from_str::<WorldModel>(BROKEN).unwrap());
    let out_dir = concat!(env!("CARGO_MANIFEST_DIR"), "/../../web/fixtures");
    std::fs::write(
        format!("{out_dir}/bill-broken.canvas.json"),
        serde_json::to_string_pretty(&canvas).unwrap(),
    )
    .unwrap();
    std::fs::write(
        format!("{out_dir}/bill-broken.analysis.json"),
        serde_json::to_string_pretty(&a).unwrap(),
    )
    .unwrap();
}
