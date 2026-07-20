//! Decomposition reference serialization + round-trip (bert-lenses#89 step 3).
//!
//! `System::child_model` now serializes as the referent's canonical base58 model
//! id. The golden below carries a `model_id` and one component with a
//! `child_model` reference; it must survive save -> load -> save byte-identical,
//! a reference to an unknown model must still load, and the SL gap must be loud.

use bert_core::{ModelId, ModelRef, WorldModel};
use serde_json::json;
use uuid::Uuid;

const GOLDEN: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../fixtures/decomposition/parent-with-child-ref.json"
);

fn load_golden() -> (String, WorldModel) {
    let text = std::fs::read_to_string(GOLDEN).expect("golden fixture exists");
    let model: WorldModel = serde_json::from_str(&text).expect("golden deserializes");
    (text, model)
}

#[test]
fn golden_with_a_reference_round_trips_byte_identical() {
    let (text, model) = load_golden();
    // save -> load -> save is a byte-for-byte fixpoint: the reference is just
    // one more attribute that must round-trip, and the pretty-printed golden is
    // exactly serde's canonical form.
    let reserialized = serde_json::to_string_pretty(&model).unwrap();
    assert_eq!(reserialized, text, "the decomposition golden drifted on re-save");
}

#[test]
fn the_reference_deserializes_as_the_expected_base58_id() {
    let (_, model) = load_golden();
    let expected_model = ModelId::from_uuid(Uuid::from_u128(0x11111111222233334444555566667777));
    let expected_child = ModelRef::to(ModelId::from_uuid(Uuid::from_u128(
        0x8888888899990000aaaabbbbccccdddd,
    )));
    assert_eq!(model.model_id, Some(expected_model));
    let furnace = model.systems.iter().find(|s| s.info.name == "Furnace").unwrap();
    assert_eq!(furnace.child_model, Some(expected_child));
    // Every non-decomposed component keeps its reference absent (skip-serialized).
    let sibling = model.systems.iter().find(|s| s.info.name == "Sibling").unwrap();
    assert!(sibling.child_model.is_none());
}

#[test]
fn a_flat_model_never_grows_a_child_model_key() {
    // The byte-identity guarantee for the existing goldens: a component without
    // a decomposition serializes no `child_model` field.
    let (_, model) = load_golden();
    let sibling_json = serde_json::to_value(
        model.systems.iter().find(|s| s.info.name == "Sibling").unwrap(),
    )
    .unwrap();
    assert!(sibling_json.get("child_model").is_none());
}

#[test]
fn a_reference_to_an_unknown_model_loads_fine() {
    // A `child_model` is just an id — resolution is the store layer's job (step
    // 5), so a reference to a model nobody has loaded must still deserialize.
    let dangling = ModelId::mint();
    let value = json!({
        "version": 1,
        "environment": { "info": { "id": "E-1", "level": -1, "name": "", "description": "" }, "sources": [], "sinks": [] },
        "systems": [{
            "info": { "id": "S0", "level": 0, "name": "Root", "description": "" },
            "sources": [], "sinks": [], "parent": "E-1", "complexity": "Atomic",
            "child_model": dangling.to_base58(),
            "boundary": { "info": { "id": "B0", "level": 0, "name": "", "description": "" }, "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": [] },
            "radius": 50.0, "equivalence": "", "history": "", "transformation": "", "member_autonomy": 1.0, "time_constant": ""
        }],
        "interactions": []
    });
    let model: WorldModel = serde_json::from_value(value).expect("unknown reference still loads");
    assert_eq!(model.systems[0].child_model, Some(ModelRef::to(dangling)));
}

#[test]
fn assert_sl_expressible_flags_a_decomposed_model() {
    // Step 4 lifted the seam guard (`to_canvas` now preserves `child_model` and
    // SL's `decomposes` clause expresses it), but the method survives as a cheap
    // flatness predicate: it still reports a decomposed component by name.
    let (_, model) = load_golden();
    let err = model.assert_sl_expressible().expect_err("a decomposed model is not flat");
    assert!(err.contains("not flat"), "the predicate must say the model is not flat: {err}");
    assert!(err.contains("Furnace"), "the predicate must name the decomposed component: {err}");
}

#[test]
fn a_flat_model_is_sl_expressible() {
    let value = json!({
        "version": 1,
        "environment": { "info": { "id": "E-1", "level": -1, "name": "", "description": "" }, "sources": [], "sinks": [] },
        "systems": [{
            "info": { "id": "S0", "level": 0, "name": "Root", "description": "" },
            "sources": [], "sinks": [], "parent": "E-1", "complexity": "Atomic",
            "boundary": { "info": { "id": "B0", "level": 0, "name": "", "description": "" }, "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": [] },
            "radius": 50.0, "equivalence": "", "history": "", "transformation": "", "member_autonomy": 1.0, "time_constant": ""
        }],
        "interactions": []
    });
    let model: WorldModel = serde_json::from_value(value).unwrap();
    assert!(model.assert_sl_expressible().is_ok());
}
