//! Model self-identity serialization (bert-lenses#89 step 2.5): a model without
//! an id stays byte-identical on disk, and a minted id round-trips through the
//! canonical base58 encoding.

use bert_core::{ModelId, WorldModel};
use serde_json::json;

/// A minimal, id-less model — the shape every model authored before step 2.5 has.
fn id_less_model() -> serde_json::Value {
    json!({
        "version": 1,
        "environment": { "info": { "id": "E-1", "level": -1, "name": "", "description": "" }, "sources": [], "sinks": [] },
        "systems": [{
            "info": { "id": "S0", "level": 0, "name": "Root", "description": "" },
            "sources": [], "sinks": [], "parent": "E-1",
            "complexity": "Atomic",
            "boundary": { "info": { "id": "B0", "level": 0, "name": "", "description": "" }, "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": [] },
            "radius": 50.0, "equivalence": "", "history": "", "transformation": "",
            "member_autonomy": 1.0, "time_constant": ""
        }],
        "interactions": []
    })
}

#[test]
fn a_model_without_an_id_serializes_without_the_field() {
    // The load-bearing invariant: loading never injects an id, so save is
    // byte-identical to the id-less original.
    let value = id_less_model();
    let model: WorldModel = serde_json::from_value(value.clone()).unwrap();
    assert!(model.model_id.is_none());
    let reserialized = serde_json::to_value(&model).unwrap();
    assert!(
        reserialized.get("model_id").is_none(),
        "an id-less model must not grow a model_id key on save: {reserialized}"
    );
}

#[test]
fn a_minted_id_round_trips_as_base58() {
    let mut model: WorldModel = serde_json::from_value(id_less_model()).unwrap();
    let id = model.mint_id();

    let text = serde_json::to_string(&model).unwrap();
    // The id appears in its canonical base58 form, not the 36-char uuid.
    assert!(text.contains(&format!("\"model_id\":\"{}\"", id.to_base58())), "{text}");
    assert!(!text.contains(&id.as_uuid().hyphenated().to_string()));

    let back: WorldModel = serde_json::from_str(&text).unwrap();
    assert_eq!(back.model_id, Some(id));
}

#[test]
fn mint_id_is_idempotent() {
    let mut model: WorldModel = serde_json::from_value(id_less_model()).unwrap();
    let first = model.mint_id();
    let second = model.mint_id();
    assert_eq!(first, second, "mint_id must not re-mint an existing identity");
}

#[test]
fn an_explicit_base58_id_loads() {
    let id = ModelId::mint();
    let mut value = id_less_model();
    value["model_id"] = json!(id.to_base58());
    let model: WorldModel = serde_json::from_value(value).unwrap();
    assert_eq!(model.model_id, Some(id));
}
