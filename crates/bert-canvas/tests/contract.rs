//! serde↔TS contract fixtures for the canvas-family boundary shapes.
//!
//! Every type that crosses the wasm edge ships a committed JSON fixture (in
//! `fixtures/contract/`). These tests serialize a REAL kernel result — built by
//! running `analyze` / `describe` on a fixed canvas model, never hand-typed — to
//! the committed fixture and FAIL on any drift. The web side (`web/src/kernel/
//! contract.test.ts`) loads the SAME files and validates them against the TS
//! mirrors in `web/src/kernel/types.ts`, so a Rust field rename that the TS
//! types miss cannot pass both gates.
//!
//! Regenerate after an intentional shape change:
//!   BLESS_FIXTURES=1 cargo test -p bert-canvas --test contract

use bert_canvas::canvas::{
    CanvasBoundaryProps, CanvasModel, ChildRef, Genus, Kind, Kingdom, Lens, Relation, Role,
    SystemType, Thing,
};
use bert_canvas::lenses::{analyze, describe, lens_facts};
use bert_core::{ModelId, ModelRef};

/// Write-or-assert a fixture. With `BLESS_FIXTURES=1` it (re)writes the file;
/// otherwise it asserts the serialization matches the committed fixture exactly,
/// so drift fails the test instead of silently rewriting the contract.
fn check_fixture<T: serde::Serialize>(name: &str, value: &T) {
    let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/contract");
    let path = format!("{dir}/{name}.json");
    let actual = serde_json::to_string_pretty(value).expect("serialize fixture");
    if std::env::var_os("BLESS_FIXTURES").is_some() {
        std::fs::create_dir_all(dir).expect("create fixture dir");
        std::fs::write(&path, format!("{actual}\n")).expect("write fixture");
        return;
    }
    let expected = std::fs::read_to_string(&path)
        .unwrap_or_else(|_| panic!("missing fixture {path}; run with BLESS_FIXTURES=1 to create"));
    assert_eq!(
        actual,
        expected.trim_end_matches('\n'),
        "serde↔fixture drift for {name}: the wasm boundary shape changed. If intended, \
         regenerate with BLESS_FIXTURES=1 and update web/src/kernel/types.ts to match."
    );
}

fn thing(id: u64, name: &str, role: Role) -> Thing {
    Thing {
        id,
        name: name.to_string(),
        x: id as f32 * 120.0,
        y: 40.0,
        role,
        primitive: None,
        interface: false,
        child_model: None,
    }
}

fn relation(id: u64, a: u64, b: u64, name: &str, is_bond: bool, kind: Kind) -> Relation {
    Relation {
        id,
        a,
        b,
        name: name.to_string(),
        is_bond,
        kind,
        klir_directed: false,
    }
}

/// One canvas model exercising every branch the fixtures must cover: two coupled
/// components (an endo bond), an environment object gating a boundary component
/// (an exo bond → a Mobus port), a self-loop (no Mobus preimage → a conflict),
/// and a mere relation (Bunge's B̄, never projected).
fn sample() -> CanvasModel {
    CanvasModel {
        lens: Lens::Mobus,
        // A fixed identity so the golden proves `model_id` crosses the edge
        // deterministically (the walk depends on it surviving the seam).
        model_id: Some("Hrs6K91KnZZsiPcWzftv8U".parse::<ModelId>().unwrap()),
        things: vec![
            // Pump carries a decomposition reference (#89): the golden proves
            // `child_model` crosses the edge as { name, base58 id }.
            Thing {
                child_model: Some(ChildRef {
                    name: "pump-interior".to_string(),
                    // The decomposition golden's fixed id, parsed from its
                    // canonical base58 form.
                    id: ModelRef::to("Hrs6K91KnZZsiPcWzftv8U".parse::<ModelId>().unwrap()),
                }),
                ..thing(1, "Pump", Role::Component)
            },
            // Tank is interface-DESIGNATED with no exo flow: the golden proves
            // the authored-flowless case (well-formed; Mobus-visible, Bunge-blind).
            Thing { interface: true, ..thing(2, "Tank", Role::Component) },
            thing(3, "Grid", Role::Environment),
        ],
        relations: vec![
            relation(10, 1, 2, "drive", true, Kind::Energy),
            relation(11, 3, 1, "supply", true, Kind::Energy),
            relation(12, 2, 2, "recycle", true, Kind::Matter),
            relation(13, 1, 2, "adjacent", false, Kind::Unspecified),
        ],
        // Non-zero so the golden PROVES authored P crosses the boundary.
        boundary: CanvasBoundaryProps {
            porosity: 0.35,
            perceptive_fuzziness: 0.2,
        },
        // Fully-asserted so the golden proves the present-system_type case.
        system_type: SystemType {
            kingdom: Some(Kingdom::Concrete),
            genus: Some(Genus::Social),
            domain: Some("U.S. legislative process".to_string()),
        },
        // Named so the golden proves the present-name case (#84): the SOI name
        // must survive canvas → world → canvas.
        name: Some("Pump Station".to_string()),
    }
}

/// Law: `CanvasModel`'s wasm-boundary shape is a frozen contract — any Rust
/// field change must re-bless the fixture deliberately, never drift silently
/// past the TS mirror.
#[test]
fn canvas_model_fixture() {
    // The editing model itself crosses the edge (project / to_canvas / analyze).
    check_fixture("canvas_model", &sample());
}

/// Law: `LensFacts`/`EdgeFact`/`PortFact` freeze their wasm-boundary shape
/// against a model that actually populates edges AND ports, so the contract
/// covers real data, not an empty degenerate case.
#[test]
fn lens_facts_fixture() {
    let facts = lens_facts(&sample());
    // Sanity: the model must actually populate the shapes the fixture proves.
    assert!(!facts.edges.is_empty(), "need an EdgeFact to fixture");
    assert!(!facts.ports.is_empty(), "need a PortFact to fixture");
    check_fixture("lens_facts", &facts);
    // EdgeFact / PortFact also get standalone fixtures — the web side validates
    // the element shapes directly, not only nested inside LensFacts.
    check_fixture("edge_fact", &facts.edges[0]);
    check_fixture("port_fact", &facts.ports[0]);
}

/// Law: each `LensDescription` variant (Klir/Bunge/Mobus) freezes its
/// wasm-boundary shape against the SAME model, so the fixtures stay
/// comparable across lenses (K≅2's counts, applied to the contract).
#[test]
fn lens_description_fixtures() {
    let m = sample();
    check_fixture("lens_description_klir", &describe(&m, Lens::Klir));
    check_fixture("lens_description_bunge", &describe(&m, Lens::Bunge));
    check_fixture("lens_description_mobus", &describe(&m, Lens::Mobus));
}

/// Law: `DecompositionReport` freezes its wasm-boundary shape against a real
/// seam check — the sample's pump reference deliberately unresolved (an empty
/// store), so the fixture exercises a defined issue with its canvas target
/// resolved to the decomposed component. Deterministic: nothing is minted.
#[test]
fn decomposition_report_fixture() {
    let report = bert_canvas::lenses::check_decompositions_canvas(
        &sample(),
        &std::collections::HashMap::new(),
    );
    assert_eq!(report.issues.len(), 1, "the pump's referent must be unresolved");
    assert_eq!(report.issue_targets[0].thing, Some(1), "the issue targets the Pump");
    check_fixture("decomposition_report", &report);
}

/// Law: `SlError`'s wasm-boundary shape is frozen against a real multi-fault
/// parse, so the contract covers an accumulated fault list, not a single fault.
#[test]
fn sl_error_fixture() {
    // The SL parse-fault list crosses the edge inside compile_sl's `{ errors }`
    // arm; the element shape gets its own fixture, like EdgeFact/PortFact.
    let errors = bert_canvas::sl::parse_sl("flow Ghost -> Nowhere\nwidget X\n")
        .expect_err("sample must not parse");
    assert!(errors.len() >= 2, "need multiple SlErrors to fixture");
    check_fixture("sl_errors", &errors);
}

/// Law: `CanvasAnalysis`/`ValidationResult` freeze their wasm-boundary shape
/// against a model whose self-loop actually trips an Operational issue, so
/// severity/location/subject are exercised, not left at their defaults.
#[test]
fn canvas_analysis_and_validation_fixtures() {
    let a = analyze(&sample(), Lens::Mobus);
    // The Mobus (Operational) gate rejects the self-loop, so the validation is
    // non-empty — the fixture exercises ValidationIssue's severity/location.
    assert!(
        !a.validation.issues.is_empty(),
        "expected the self-loop to raise an Operational issue"
    );
    check_fixture("validation_result", &a.validation);
    check_fixture("canvas_analysis", &a);
}
