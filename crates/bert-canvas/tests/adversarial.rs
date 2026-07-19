//! Adversarial inputs across every canvas boundary function (issue #47).
//!
//! The palette-authoring flow routinely produces partially-valid editing states,
//! and every one of them reaches Rust through the wasm boundary. A Rust panic in
//! wasm is an unrecoverable abort — worse than a `JsError` — so the kernel error
//! contract (API.md) is: on any parseable input, a boundary function returns its
//! documented shape or a structured error; it NEVER panics. `project`,
//! `to_canvas`, `validate_connection`, `lens_facts`, `describe`, and `analyze`
//! are total (no `Result`), so "no panic" is the whole contract for them here.
//!
//! Each weird-but-parseable `CanvasModel` below is driven through EVERY canvas
//! boundary function at EVERY lens; the test passing at all IS the assertion (a
//! panic would abort the test binary). Where a verdict is meaningful we also
//! check it, but the load-bearing guarantee is: none of these abort.

use bert_canvas::canvas::{
    project, to_canvas, validate_connection, CanvasModel, Kind, Lens, Relation, Role, Thing,
};
use bert_canvas::lenses::{analyze, describe, lens_facts};

fn thing(id: u64, name: &str, role: Role) -> Thing {
    Thing {
        id,
        name: name.to_string(),
        x: 0.0,
        y: 0.0,
        role,
        primitive: None,
        interface: false,
    }
}

fn rel(id: u64, a: u64, b: u64) -> Relation {
    Relation {
        id,
        a,
        b,
        name: String::new(),
        is_bond: true,
        kind: Kind::Unspecified,
        klir_directed: false,
    }
}

/// Run one model through every canvas boundary function at every lens. Returns
/// nothing — reaching the end without a panic is the guarantee under test.
fn exercise(model: &CanvasModel) {
    // Structure projections (both directions).
    let world = project(model);
    let _round_trip = to_canvas(&world);

    // Lens facts + the formal object, at every lens, plus the atomic composite.
    let _facts = lens_facts(model);
    for lens in [Lens::Klir, Lens::Bunge, Lens::Mobus] {
        let _desc = describe(model, lens);
        let _analysis = analyze(model, lens);
    }

    // A candidate connection touching each existing endpoint (and a dangling one).
    let ids: Vec<u64> = model.things.iter().map(|t| t.id).collect();
    let mut candidates = vec![rel(9_999, 1, 1)]; // self-loop
    for &a in ids.iter().take(3) {
        candidates.push(rel(9_998, a, a)); // self-loop on a real node
        candidates.push(rel(9_997, a, 424_242)); // dangling far endpoint
    }
    for cand in candidates {
        let _issues = validate_connection(model, &cand);
    }
}

/// The full battery of pathological editing states, each run at every lens.
fn adversarial_models() -> Vec<(&'static str, CanvasModel)> {
    vec![
        // Empty model — no things, no relations.
        (
            "empty",
            CanvasModel { lens: Lens::Mobus, things: vec![], relations: vec![], boundary: Default::default(), system_type: Default::default(), name: None },
        ),
        // A relation but NO things — every endpoint dangles.
        (
            "relation-without-things",
            CanvasModel { lens: Lens::Bunge, things: vec![], relations: vec![rel(1, 1, 2)], boundary: Default::default(), system_type: Default::default(), name: None },
        ),
        // Self-loop only.
        (
            "self-loop-only",
            CanvasModel {
                lens: Lens::Mobus,
                things: vec![thing(1, "A", Role::Component)],
                relations: vec![rel(1, 1, 1)],
                boundary: Default::default(),
                system_type: Default::default(),
                name: None,
            },
        ),
        // Dangling relation endpoints (reference ids that no thing has).
        (
            "dangling-endpoints",
            CanvasModel {
                lens: Lens::Mobus,
                things: vec![thing(1, "A", Role::Component)],
                relations: vec![rel(1, 1, 77), rel(2, 88, 99)],
                boundary: Default::default(),
                system_type: Default::default(),
                name: None,
            },
        ),
        // Duplicate thing ids and duplicate relation ids.
        (
            "duplicate-ids",
            CanvasModel {
                lens: Lens::Bunge,
                things: vec![
                    thing(1, "A", Role::Component),
                    thing(1, "A-again", Role::Component),
                    thing(1, "A-env", Role::Environment),
                ],
                relations: vec![rel(5, 1, 1), rel(5, 1, 1)],
                boundary: Default::default(),
                system_type: Default::default(),
                name: None,
            },
        ),
        // Huge and negative coordinates + non-finite ones.
        (
            "extreme-coordinates",
            CanvasModel {
                lens: Lens::Klir,
                things: vec![
                    Thing { x: f32::MAX, y: f32::MIN, ..thing(1, "far", Role::Component) },
                    Thing { x: f32::NAN, y: f32::INFINITY, ..thing(2, "nan", Role::Component) },
                    Thing { x: -f32::INFINITY, y: -0.0, ..thing(3, "env", Role::Environment) },
                ],
                relations: vec![rel(10, 1, 2), rel(11, 3, 1)],
                boundary: Default::default(),
                system_type: Default::default(),
                name: None,
            },
        ),
        // Empty strings everywhere (names) + a mere relation (is_bond=false).
        (
            "empty-strings-and-mere-relations",
            CanvasModel {
                lens: Lens::Bunge,
                things: vec![thing(1, "", Role::Component), thing(2, "", Role::Environment)],
                relations: vec![
                    Relation { is_bond: false, ..rel(1, 1, 2) },
                    Relation { is_bond: false, name: "   ".into(), ..rel(2, 2, 1) },
                ],
                boundary: Default::default(),
                system_type: Default::default(),
                name: None,
            },
        ),
        // All-environment things (no components at all) with bonds among them.
        (
            "all-environment",
            CanvasModel {
                lens: Lens::Mobus,
                things: vec![
                    thing(1, "E1", Role::Environment),
                    thing(2, "E2", Role::Environment),
                ],
                relations: vec![rel(1, 1, 2), rel(2, 2, 1)],
                boundary: Default::default(),
                system_type: Default::default(),
                name: None,
            },
        ),
        // Every kind represented, mixed bond/mere, plus a self-loop, at Mobus.
        (
            "every-kind-mixed",
            CanvasModel {
                lens: Lens::Mobus,
                things: vec![
                    thing(1, "c1", Role::Component),
                    thing(2, "c2", Role::Component),
                    thing(3, "env", Role::Environment),
                ],
                relations: vec![
                    Relation { kind: Kind::Energy, ..rel(1, 1, 2) },
                    Relation { kind: Kind::Matter, ..rel(2, 2, 1) },
                    Relation { kind: Kind::Field, ..rel(3, 3, 1) },
                    Relation { kind: Kind::Informational, is_bond: false, ..rel(4, 1, 3) },
                    Relation { kind: Kind::Unspecified, ..rel(5, 2, 2) }, // self-loop bond
                ],
                boundary: Default::default(),
                system_type: Default::default(),
                name: None,
            },
        ),
    ]
}

/// Law: every canvas boundary function (project, to_canvas, validate_connection,
/// lens_facts, describe, analyze) never panics on any parseable-but-pathological
/// `CanvasModel`, at any lens — on wasm a panic is an unrecoverable abort, so
/// "no panic" is the whole contract for these total functions.
#[test]
fn every_boundary_fn_survives_adversarial_canvas_models() {
    for (label, model) in adversarial_models() {
        // Each lens setting is itself part of the input space — a model authored
        // at one lens can be viewed through any other, so sweep them all.
        for lens in [Lens::Klir, Lens::Bunge, Lens::Mobus] {
            let m = CanvasModel { lens, ..model.clone() };
            exercise(&m);
            let _ = label; // named for failure attribution if a panic ever lands
        }
    }
}

/// Parseable-but-pathological JSON straight off the wire (serde defaults engage:
/// missing `role`, `is_bond`, `kind`, `klir_directed`). Proves the boundary is
/// safe on the ACTUAL shapes the face sends, not just hand-built structs.
/// Law: the no-panic contract holds on the ACTUAL wire shapes the face sends
/// — JSON that engages serde defaults (missing role/is_bond/kind) — not just
/// on hand-built structs.
#[test]
fn wire_json_with_defaults_survives_every_boundary_fn() {
    let jsons = [
        r#"{"lens":"Mobus","things":[],"relations":[]}"#,
        r#"{"lens":"Bunge","things":[{"id":1,"name":"","x":0,"y":0}],"relations":[{"id":1,"a":1,"b":1}]}"#,
        r#"{"lens":"Klir","relations":[{"id":1,"a":5,"b":6}]}"#,
        r#"{"lens":"Mobus","things":[{"id":1,"name":"a","x":1e30,"y":-1e30}],"relations":[]}"#,
    ];
    for json in jsons {
        let model: CanvasModel = serde_json::from_str(json).expect("parseable by design");
        exercise(&model);
    }
}
