//! The SL round-trip goldens (Rung 2): the corpus in `fixtures/sl/` must
//! survive text → model → text → model with the models JSON-identical (digit
//! for digit) and the emitted text a fixpoint. For models NOT born from SL
//! text (canvas-born, gap ids), the guarantee is canonicalization:
//! `emit(parse(emit(m))) == emit(m)`.

use bert_canvas::canvas::{
    project, to_canvas, CanvasBoundaryProps, CanvasModel, ChildRef, Kind, Lens, Relation, Role,
    SystemType, Thing,
};
use bert_canvas::sl::{emit_sl, parse_sl};
use bert_core::{ModelId, ModelRef};

const CORPUS: [(&str, &str); 4] = [
    ("process-m", include_str!("../../../fixtures/sl/process-m.sl")),
    ("bathtub", include_str!("../../../fixtures/sl/bathtub.sl")),
    ("hal-projection", include_str!("../../../fixtures/sl/hal-projection.sl")),
    ("decomposition", include_str!("../../../fixtures/sl/decomposition.sl")),
];

fn json(m: &CanvasModel) -> serde_json::Value {
    serde_json::to_value(m).unwrap()
}

/// Law: SL round-trip fidelity — for corpus text, parse ∘ emit ∘ parse is the
/// identity on the model (digit for digit) and emit is a fixpoint on its own output.
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

/// Law: every corpus model is a legal Core-mode system — the corpus doubles
/// as the edu-suite's first lessons, so it must ship with zero Core issues.
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

/// Law: for a model NOT born from SL text (gap ids, interleaved history), emit
/// is canonicalizing — emit(parse(emit(m))) is a fixpoint, and structure
/// (names, roles, flow shape, positions) survives the renumbering.
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
        child_model: None,
    };
    let m = CanvasModel {
        lens: Lens::Klir,
        model_id: None,
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

/// Law: the SOI name survives both round trips — text → model → text AND
/// canvas → world → canvas — and an unnamed model reads back unnamed (the
/// "System" placeholder never leaks in as an authored name).
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

/// Law: a name containing a quote is not expressible in SL v1 — emit refuses
/// it with an error rather than silently corrupting the text.
#[test]
fn unrepresentable_names_refused() {
    let mut m = parse_sl("component A\n").unwrap();
    m.things[0].name = "has \" quote".into();
    assert!(emit_sl(&m).unwrap_err().contains("not expressible"));
}

/// Law: `decomposes "name" @id` parses to a `ChildRef` carrying both halves —
/// the human label and the base58-decoded id — and emit puts it last (after
/// `primitive`), digit for digit.
#[test]
fn decomposes_clause_parses_and_emits_last() {
    let text =
        "component Furnace primitive Combining decomposes \"furnace-interior\" @Hrs6K91KnZZsiPcWzftv8U\n";
    let m = parse_sl(text).unwrap();
    let child = m.things[0].child_model.as_ref().expect("Furnace decomposes");
    assert_eq!(child.name, "furnace-interior");
    // The id decodes to the known uuid the fixture's base58 string names — no
    // uuid dev-dep needed, the kernel's own base58 codec is the bridge.
    let expected = ModelRef::new(bert_core::model_id::decode_uuid("Hrs6K91KnZZsiPcWzftv8U").unwrap());
    assert_eq!(child.id, expected);

    let emitted = emit_sl(&m).unwrap();
    assert!(
        emitted.contains(
            "component Furnace primitive Combining decomposes \"furnace-interior\" @Hrs6K91KnZZsiPcWzftv8U"
        ),
        "decomposes must emit last, after primitive:\n{emitted}"
    );
}

/// Law: the decomposition faults the store-free compiler must catch — a name
/// without an `@id` (unstamped), a malformed id, `decomposes` on an environment
/// thing, `decomposes` + `interface` co-occurring, and a duplicate clause.
#[test]
fn decomposes_faults_are_caught_one_pass() {
    let unstamped = parse_sl("component F decomposes \"child\"\n").unwrap_err();
    assert!(unstamped[0].message.contains("unstamped"), "{unstamped:?}");

    let malformed = parse_sl("component F decomposes \"child\" @not-base58-0\n").unwrap_err();
    assert!(malformed[0].message.contains("malformed decomposes id"), "{malformed:?}");

    let on_env =
        parse_sl("source S decomposes \"child\" @Hrs6K91KnZZsiPcWzftv8U\n").unwrap_err();
    assert!(on_env[0].message.contains("components only"), "{on_env:?}");

    let with_iface = parse_sl(
        "component F interface decomposes \"child\" @Hrs6K91KnZZsiPcWzftv8U\n",
    )
    .unwrap_err();
    assert!(
        with_iface[0].message.contains("interface components") && with_iface[0].message.contains("#89"),
        "{with_iface:?}");

    let dup = parse_sl(
        "component F decomposes \"a\" @Hrs6K91KnZZsiPcWzftv8U decomposes \"b\" @Hrs6K91KnZZsiPcWzftv8U\n",
    )
    .unwrap_err();
    assert!(dup.iter().any(|e| e.message.contains("already given")), "{dup:?}");
}

/// Law: a WorldModel carrying a `child_model` reference survives the full seam —
/// to_canvas → emit_sl → parse → project — with the id (the key) preserved end
/// to end. This is the path the lifted `assert_sl_expressible` guard used to
/// refuse; the human label drifts to the component's own name across the kernel
/// hop (the kernel stores only the id), which is the documented behavior.
#[test]
fn worldmodel_reference_survives_to_canvas_and_back() {
    let id = ModelRef::to(ModelId::mint());
    // A canvas model with a decomposed component projects to a real WorldModel
    // carrying System.child_model — a faithful "WorldModel with a reference".
    let src = parse_sl("component Furnace primitive Combining\n").unwrap();
    let mut src = src;
    src.things[0].child_model = Some(ChildRef { name: "furnace-interior".into(), id });

    let world = project(&src);
    let furnace = world.systems.iter().find(|s| s.info.name == "Furnace").unwrap();
    assert_eq!(furnace.child_model, Some(id), "project must carry the reference into the kernel");

    let cm = to_canvas(&world);
    let carried = cm.things.iter().find(|t| t.name == "Furnace").unwrap();
    let child = carried.child_model.as_ref().expect("to_canvas preserves the reference");
    assert_eq!(child.id, id, "to_canvas must preserve the id");
    assert_eq!(child.name, "Furnace", "label drifts to the component name (kernel has no label)");

    let text = emit_sl(&cm).unwrap();
    assert!(text.contains("decomposes"), "emit must write the clause:\n{text}");
    let reparsed = parse_sl(&text).unwrap();
    let world2 = project(&reparsed);
    let furnace2 = world2.systems.iter().find(|s| s.info.name == "Furnace").unwrap();
    assert_eq!(furnace2.child_model, Some(id), "the id must survive the whole round trip");
}
