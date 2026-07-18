//! The SL round-trip goldens (Rung 2): the corpus in `fixtures/sl/` must
//! survive text → model → text → model with the models JSON-identical (digit
//! for digit) and the emitted text a fixpoint. For models NOT born from SL
//! text (canvas-born, gap ids), the guarantee is canonicalization:
//! `emit(parse(emit(m))) == emit(m)`.

use bert_canvas::canvas::{CanvasBoundaryProps, CanvasModel, Kind, Lens, Relation, Role, SystemType, Thing};
use bert_canvas::sl::{emit_sl, parse_sl};

const CORPUS: [(&str, &str); 3] = [
    ("process-m", include_str!("../../../fixtures/sl/process-m.sl")),
    ("bathtub", include_str!("../../../fixtures/sl/bathtub.sl")),
    ("hal-projection", include_str!("../../../fixtures/sl/hal-projection.sl")),
];

fn json(m: &CanvasModel) -> serde_json::Value {
    serde_json::to_value(m).unwrap()
}

#[test]
fn corpus_round_trips_digit_for_digit() {
    for (name, text) in CORPUS {
        let m1 = parse_sl(text).unwrap_or_else(|e| panic!("{name} does not parse: {e:?}"));
        let emitted = emit_sl(&m1).unwrap_or_else(|e| panic!("{name} does not emit: {e}"));
        let m2 = parse_sl(&emitted)
            .unwrap_or_else(|e| panic!("{name} emitted text does not re-parse: {e:?}\n{emitted}"));
        assert_eq!(json(&m1), json(&m2), "{name}: model → text → model drifted\n{emitted}");
        let emitted2 = emit_sl(&m2).unwrap();
        assert_eq!(emitted, emitted2, "{name}: emit is not a fixpoint");
    }
}

#[test]
fn corpus_projects_clean_at_core() {
    // Every corpus model must be a legal Core-mode system — the corpus doubles
    // as the edu-suite's first lessons, so it must not ship with issues.
    for (name, text) in CORPUS {
        let m = parse_sl(text).unwrap();
        let world = bert_canvas::canvas::project(&m);
        let report = bert_core::validate::validate_mode(&world, bert_core::Mode::Core);
        assert!(report.issues.is_empty(), "{name} Core issues: {:?}", report.issues);
    }
}

#[test]
fn canvas_born_model_canonicalizes() {
    // Gap ids, interleaved declaration history, a directed mere relation, an
    // untouched environment thing: emit canonicalizes, and the canonical text
    // is stable from then on.
    let thing = |id, name: &str, role| Thing {
        id,
        name: name.into(),
        x: 10.5,
        y: -3.25,
        role,
        primitive: None,
        interface: false,
    };
    let m = CanvasModel {
        lens: Lens::Klir,
        things: vec![
            thing(7, "A", Role::Component),
            thing(3, "B", Role::Component),
            thing(12, "Milieu", Role::Environment),
        ],
        relations: vec![Relation {
            id: 40,
            a: 7,
            b: 3,
            name: String::new(),
            is_bond: false,
            kind: Kind::Field,
            klir_directed: true,
        }],
        boundary: CanvasBoundaryProps { porosity: 0.33, perceptive_fuzziness: 0.0 },
        system_type: SystemType::default(),
        name: None,
    };
    let t1 = emit_sl(&m).unwrap();
    let m2 = parse_sl(&t1).unwrap();
    let t2 = emit_sl(&m2).unwrap();
    assert_eq!(t1, t2, "emit is not canonicalizing");
    // Structure survives the renumber: same names, roles, flow shape.
    assert_eq!(m2.things.len(), 3);
    assert_eq!(m2.relations.len(), 1);
    let r = &m2.relations[0];
    assert!(!r.is_bond && r.klir_directed && r.kind == Kind::Field);
    assert_eq!(m2.things.iter().filter(|t| t.role == Role::Environment).count(), 1);
    // Positions survive as @pos annotations.
    assert_eq!((m2.things[0].x, m2.things[0].y), (10.5, -3.25));
    // The untouched env thing emits as `environment` (no bond touches it).
    assert!(t1.contains("environment Milieu"), "{t1}");
}

#[test]
fn soi_name_survives_both_round_trips() {
    // #84: the SOI name must survive text → model → text AND canvas → world →
    // canvas; an unnamed model must read back unnamed (the "System" placeholder
    // never leaks in as an authored name).
    let m = parse_sl("system \"Process M\" : Concrete\ncomponent Work\n").unwrap();
    assert_eq!(m.name.as_deref(), Some("Process M"));
    let emitted = emit_sl(&m).unwrap();
    assert!(emitted.starts_with("system \"Process M\" : Concrete\n"), "{emitted}");

    let world = bert_canvas::canvas::project(&m);
    assert_eq!(world.systems[0].info.name, "Process M");
    let back = bert_canvas::canvas::to_canvas(&world);
    assert_eq!(back.name.as_deref(), Some("Process M"));

    let unnamed = parse_sl("component Work\n").unwrap();
    let world = bert_canvas::canvas::project(&unnamed);
    assert_eq!(world.systems[0].info.name, "System");
    assert_eq!(bert_canvas::canvas::to_canvas(&world).name, None);
}

#[test]
fn unrepresentable_names_refused() {
    let mut m = parse_sl("component A\n").unwrap();
    m.things[0].name = "has \" quote".into();
    assert!(emit_sl(&m).unwrap_err().contains("not expressible"));
}
