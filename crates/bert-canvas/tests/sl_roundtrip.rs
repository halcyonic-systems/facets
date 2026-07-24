//! The SL round-trip goldens (Rung 2): the corpus in `fixtures/sl/` must
//! survive text → model → text → model with the models JSON-identical (digit
//! for digit) and the emitted text a fixpoint. For models NOT born from SL
//! text (canvas-born, gap ids), the guarantee is canonicalization:
//! `emit(parse(emit(m))) == emit(m)`.

use bert_canvas::canvas::{
    project, to_canvas, CanvasBoundaryProps, CanvasModel, ChildRef, Kind, KlirVarKind, Lens,
    Relation, Role, ScaleType, SystemType, Thing,
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
        stock_unit: String::new(),
        scale: None,
        states: None,
        variable_kind: None,
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
            weight: None,
        }],
        boundary: CanvasBoundaryProps { porosity: 0.33, perceptive_fuzziness: 0.0 },
        system_type: SystemType::default(),
        name: None,
        time_unit: None,
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

/// Law (bert-lenses#94 tail): the model's time-unit symbol and a declared stock
/// unit survive BOTH round trips — text → model → text AND canvas → world →
/// canvas — and an undeclared model stays undeclared (no invented symbol).
#[test]
fn time_unit_and_stock_unit_survive_both_round_trips() {
    let text = "time unit h\ncomponent Battery primitive Buffering stock \"kW·h\"\n";
    let m = parse_sl(text).unwrap();
    assert_eq!(m.time_unit.as_deref(), Some("h"));
    assert_eq!(m.things[0].stock_unit, "kW·h");

    // text → model → text: both clauses re-emit, and the emitted text is a fixpoint.
    let emitted = emit_sl(&m).unwrap();
    assert!(emitted.contains("time unit h\n"), "{emitted}");
    assert!(emitted.contains("stock \"kW·h\""), "{emitted}");
    let m2 = parse_sl(&emitted).unwrap();
    assert_eq!(json(&m), json(&m2), "declared units drifted across the text round trip\n{emitted}");

    // canvas → world → canvas: the symbol lands on WorldModel::time_unit, the
    // stock unit on the agent record, and both read back.
    let world = project(&m);
    assert_eq!(world.time_unit.as_deref(), Some("h"));
    assert_eq!(
        world.systems[1].agent.as_ref().unwrap().stock_unit,
        "kW·h",
        "the declared stock unit reaches the kernel model"
    );
    let back = to_canvas(&world);
    assert_eq!(back.time_unit.as_deref(), Some("h"));
    assert_eq!(back.things[0].stock_unit, "kW·h");

    // Undeclared stays undeclared — the kernel never invents a symbol.
    let bare = parse_sl("component Work\n").unwrap();
    assert_eq!(bare.time_unit, None);
    assert_eq!(project(&bare).time_unit, None);
    assert!(!emit_sl(&bare).unwrap().contains("time unit"));
}

/// Law: a stock unit declared WITHOUT a primitive still projects (an accept on a
/// primitive-less component must never be silently dropped by the seam).
#[test]
fn stock_unit_without_primitive_survives_the_seam() {
    let m = parse_sl("component Tank stock ML\n").unwrap();
    assert_eq!(m.things[0].primitive, None);
    let world = project(&m);
    assert_eq!(world.systems[1].agent.as_ref().unwrap().stock_unit, "ML");
    let back = to_canvas(&world);
    assert_eq!(back.things[0].stock_unit, "ML");
    // And it re-emits bare (an identifier-shaped unit needs no quotes).
    assert!(emit_sl(&back).unwrap().contains("component Tank stock ML"), "{}", emit_sl(&back).unwrap());
}

/// Law (bert-lenses#154): a component's Klir source-system metadata — the
/// measurement `scale` and the `states` set — survives text → model → text
/// digit for digit, and the `{A, B, C}` set literal is a fixpoint. A state
/// label needing quotes (a space) rides through the braces intact.
#[test]
fn klir_scale_and_states_round_trip_through_sl() {
    let text = "component Light scale Nominal states {Green, Yellow, \"Solid Red\"}\n";
    let m = parse_sl(text).unwrap();
    assert_eq!(m.things[0].scale, Some(ScaleType::Nominal));
    assert_eq!(
        m.things[0].states.as_deref(),
        Some(["Green".to_string(), "Yellow".to_string(), "Solid Red".to_string()].as_slice())
    );

    let emitted = emit_sl(&m).unwrap();
    assert!(emitted.contains("scale Nominal"), "{emitted}");
    assert!(emitted.contains("states {Green, Yellow, \"Solid Red\"}"), "{emitted}");
    let m2 = parse_sl(&emitted).unwrap();
    assert_eq!(json(&m), json(&m2), "Klir metadata drifted across the round trip\n{emitted}");
    assert_eq!(emit_sl(&m2).unwrap(), emitted, "emit is not a fixpoint");

    // An empty set is legal Klir notation and re-emits as `{}`.
    let empty = parse_sl("component V scale Ordinal states {}\n").unwrap();
    assert_eq!(empty.things[0].states.as_deref(), Some([].as_slice()));
    assert!(emit_sl(&empty).unwrap().contains("states {}"));

    // Undeclared stays undeclared — no invented scale, set, or kind.
    let bare = parse_sl("component W\n").unwrap();
    assert_eq!(bare.things[0].scale, None);
    assert_eq!(bare.things[0].states, None);
    assert_eq!(bare.things[0].variable_kind, None);
    let bare_text = emit_sl(&bare).unwrap();
    assert!(!bare_text.contains("scale"));
    assert!(!bare_text.contains("states"));
    assert!(!bare_text.contains("kind"));
}

/// Law (bert-lenses#154 revision): the source-system metadata rides ENVIRONMENT
/// lines too — Klir's Table 4.1 characterizes the input variables, which are
/// frequently the environmental drivers. An env `source` carrying `kind` /
/// `scale` / `states` survives text → model → text digit for digit.
#[test]
fn klir_source_metadata_rides_env_lines() {
    let text = "source Feed kind Support scale Ratio states {Low, High}\n";
    let m = parse_sl(text).unwrap();
    assert_eq!(m.things[0].role, Role::Environment);
    assert_eq!(m.things[0].variable_kind, Some(KlirVarKind::Support));
    assert_eq!(m.things[0].scale, Some(ScaleType::Ratio));
    assert_eq!(
        m.things[0].states.as_deref(),
        Some(["Low".to_string(), "High".to_string()].as_slice())
    );

    // The env keyword is edge-derived (no bond touches Feed → `environment`);
    // what matters is the Klir metadata rides the line and survives.
    let emitted = emit_sl(&m).unwrap();
    assert!(emitted.contains("Feed kind Support scale Ratio states {Low, High}"), "{emitted}");
    let m2 = parse_sl(&emitted).unwrap();
    assert_eq!(json(&m), json(&m2), "env Klir metadata drifted\n{emitted}");
    assert_eq!(emit_sl(&m2).unwrap(), emitted, "emit is not a fixpoint");
}

/// Law (bert-lenses#154): `kind Basic|Support` round-trips, and the default
/// (`Basic` / omitted) never emits, so old models stay byte-identical.
#[test]
fn klir_variable_kind_round_trips() {
    let support = parse_sl("component Time kind Support\n").unwrap();
    assert_eq!(support.things[0].variable_kind, Some(KlirVarKind::Support));
    assert!(emit_sl(&support).unwrap().contains("kind Support"));

    // Explicit Basic round-trips as authored.
    let basic = parse_sl("component X kind Basic\n").unwrap();
    assert_eq!(basic.things[0].variable_kind, Some(KlirVarKind::Basic));
    let basic_text = emit_sl(&basic).unwrap();
    assert!(basic_text.contains("kind Basic"), "{basic_text}");
    assert_eq!(json(&basic), json(&parse_sl(&basic_text).unwrap()));
}

/// Law (#67 J6): `weight <n>` on a transition round-trips as a `u64` count, and
/// an unweighted flow never emits `weight`, so old models stay byte-identical.
#[test]
fn transition_weight_round_trips() {
    let text = "component Even\ncomponent Odd\nflow Even -> Odd : matter \"flip\" weight 3\n";
    let m = parse_sl(text).unwrap();
    assert_eq!(m.relations[0].weight, Some(3));

    let emitted = emit_sl(&m).unwrap();
    assert!(emitted.contains("weight 3"), "{emitted}");
    let m2 = parse_sl(&emitted).unwrap();
    assert_eq!(json(&m), json(&m2), "weight drifted across the round trip\n{emitted}");
    assert_eq!(emit_sl(&m2).unwrap(), emitted, "emit is not a fixpoint");

    // Unweighted stays unweighted — no invented count, and `weight` never emits.
    let bare = parse_sl("component A\ncomponent B\nflow A -> B\n").unwrap();
    assert_eq!(bare.relations[0].weight, None);
    assert!(!emit_sl(&bare).unwrap().contains("weight"));
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
