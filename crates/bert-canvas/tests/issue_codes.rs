//! Defect KINDS are named by the kernel, not inferred from message text (#319).
//!
//! On 2026-08-12 a drafted ribosome model produced seven refusals. Six carried
//! the same sentence with a different flow name in it, and the reader could not
//! tell whether the panel was reporting correctly. Seven refusals were two
//! findings, and a surface can only say so if the kernel tells it which issues
//! are the same defect. `ValidationIssue::code` is that answer.
//!
//! Two claims are bound here, and both can fail:
//!
//! 1. Every issue carries a code, so nothing groups by regex for want of a key.
//! 2. The two halves of the interface gap — an interface with no flow, and
//!    flows with no interface — carry DIFFERENT codes, while the flows share
//!    ONE. Grouping is allowed to collapse repeats and forbidden to merge
//!    distinct defects; a single code covering both, or six codes covering the
//!    six flows, would break the panel's claim in opposite directions.
//!
//! The third claim is #320's: the refusal about `Large Subunit` is CORRECT and
//! looks contradicted, because the two lines drawn at it are `mere` and mere
//! relations do not bond. The kernel counts them so the surface can say so.

use bert_canvas::canvas::Lens;
use bert_canvas::lenses::analyze;
use bert_canvas::sl::parse_sl_full;
use bert_core::validate::{doc, Severity};
use std::collections::BTreeMap;

/// The shape of the 2026-08-12 draft, reduced to what produces the two
/// findings: an interface-designated component whose only relations are mere,
/// and several boundary crossings with no interface to pass through.
const RIBOSOME: &str = r#"
system "Ribosome"
level Structure

component "Large Subunit" interface
component "Peptidyl Transferase Center"
component "Small Subunit"

source "Cytosol"
source "tRNA Pool"
source "GTP Pool"
sink "Cytoplasm"

flow "Cytosol" -> "Large Subunit" : field "ionic and Mg2+ milieu" mere
flow "Large Subunit" -> "Peptidyl Transferase Center" : field "catalytic rRNA scaffold" mere
flow "tRNA Pool" -> "Small Subunit" : matter "charged tRNA sampled"
flow "GTP Pool" -> "Small Subunit" : energy "GTP binding and hydrolysis"
flow "Small Subunit" -> "Peptidyl Transferase Center" : matter "peptidyl handoff"
flow "Small Subunit" -> "Cytoplasm" : matter "nascent chain emerges"

@lens mobus
"#;

#[test]
fn every_issue_names_its_defect_kind() {
    let parsed = parse_sl_full(RIBOSOME).expect("the fixture compiles");
    for lens in [Lens::Klir, Lens::Bunge, Lens::Mobus] {
        for issue in analyze(&parsed.model, lens).validation.issues {
            assert!(
                !issue.code.is_empty(),
                "{lens:?}: an issue with no code cannot be grouped on anything \
                 but its text — {}",
                issue.message
            );
        }
    }
}

#[test]
fn repeated_crossings_are_one_kind_and_the_interface_half_is_another() {
    let parsed = parse_sl_full(RIBOSOME).expect("the fixture compiles");
    let issues = analyze(&parsed.model, Lens::Mobus).validation.issues;

    let mut by_code: BTreeMap<&str, usize> = BTreeMap::new();
    for issue in issues.iter().filter(|i| i.severity == Severity::Error) {
        *by_code.entry(issue.code.as_str()).or_default() += 1;
    }

    let crossings = by_code
        .get("crossing_flow_without_interface")
        .copied()
        .unwrap_or(0);
    assert!(
        crossings >= 3,
        "expected the repeated crossing refusal; got {by_code:?}"
    );
    assert_eq!(
        by_code.get("interface_carries_no_flow").copied(),
        Some(1),
        "expected the other half of the same authoring gap once; got {by_code:?}"
    );
    assert_ne!(
        "crossing_flow_without_interface", "interface_carries_no_flow",
        "the two halves must stay separately reachable"
    );

    // The pairing key: both halves cite the same doc anchor, which is what lets
    // a surface put them next to each other without knowing what they mean.
    for issue in issues.iter().filter(|i| {
        i.code == "crossing_flow_without_interface" || i.code == "interface_carries_no_flow"
    }) {
        assert_eq!(
            issue.doc.as_deref(),
            Some(doc::INTERFACE),
            "both halves teach the same entry"
        );
    }
}

#[test]
fn a_refusal_reports_the_mere_relations_its_judgement_left_out() {
    let parsed = parse_sl_full(RIBOSOME).expect("the fixture compiles");
    let analysis = analyze(&parsed.model, Lens::Mobus);
    let idx = analysis
        .validation
        .issues
        .iter()
        .position(|i| i.code == "interface_carries_no_flow")
        .expect("the interface refusal fires");
    assert_eq!(
        analysis.issue_targets[idx].disregarded_relations, 2,
        "Large Subunit is drawn with two lines and bonded by neither; the \
         refusal is right and the canvas looks like it disagrees"
    );
}

/// The premise the FACE's bondhood channel rests on (#320): this fixture really
/// does hold relations of both kinds, and the component the reader pointed at is
/// touched by nothing but mere ones. The rule the canvas now draws — an
/// arrowhead asserts a bond — separates only if a model can separate, and
/// `web/src/canvas/bondhood.test.tsx` renders this shape to show the marks
/// differ. Repairing the fixture by promoting those two relations to bonds would
/// leave that test passing over a model with nothing left to distinguish, so the
/// split is asserted here rather than assumed there.
#[test]
fn the_fixture_separates_bonds_from_mere_relations() {
    let parsed = parse_sl_full(RIBOSOME).expect("the fixture compiles");
    let model = &parsed.model;

    let mere: Vec<&str> = model
        .relations
        .iter()
        .filter(|r| !r.is_bond)
        .map(|r| r.name.as_str())
        .collect();
    assert_eq!(
        mere.len(),
        2,
        "the 2026-08-12 shape is two mere relations among bonds; got {mere:?}"
    );
    assert!(
        model.relations.iter().filter(|r| r.is_bond).count() >= 2,
        "a model with no bonds cannot separate the two markings"
    );

    let large = model
        .things
        .iter()
        .find(|t| t.name == "Large Subunit")
        .expect("the refused component is in the fixture");
    let touching = model
        .relations
        .iter()
        .filter(|r| r.a == large.id || r.b == large.id)
        .collect::<Vec<_>>();
    assert_eq!(touching.len(), 2, "two lines are drawn at it");
    assert!(
        touching.iter().all(|r| !r.is_bond),
        "and neither bonds it — which is why the correct refusal read as wrong"
    );
}
