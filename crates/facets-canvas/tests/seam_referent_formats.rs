//! The seam check must judge a referent from EITHER storage generation (#140,
//! ADR 0004): the library persists neutral archives (`things`-keyed), older
//! records and door-fresh exports are legacy WorldModels (`systems`-keyed),
//! and both sit behind the same `decomposes @id` reference. The core contract
//! parses a referent as a WorldModel, so an archive referent reaches it only
//! through `lenses::normalize_referents` — the projection this file holds in
//! place. Before it existed, every archive-format child came back "not a
//! loadable model" and no library seam could ever show ✓.

use std::collections::HashMap;

use bert_canvas::canvas::{project, CanvasModel};
use bert_canvas::lenses::check_decompositions_canvas;
use bert_canvas::sl::parse_sl;
use bert_core::ModelId;

fn parent(child_id: &ModelId) -> CanvasModel {
    let text = format!(
        "system \"Plant\" : Concrete/Technical\n\
         component Feeder\n\
         component Boiler decomposes \"Boiler\" @{}\n\
         component Drain\n\
         flow Feeder -> Boiler : matter \"feed\" substance water\n\
         flow Boiler -> Drain : matter \"out\" substance water\n\
         @lens mobus\n",
        child_id.to_base58()
    );
    parse_sl(&text).expect("parent fixture must parse")
}

fn child(child_id: &ModelId) -> CanvasModel {
    let text = "system \"Boiler\" : Concrete/Technical\n\
                source Feeder\n\
                sink Drain\n\
                component Chamber interface\n\
                flow Feeder -> Chamber : matter \"feed\" substance water\n\
                flow Chamber -> Drain : matter \"out\" substance water\n\
                @lens mobus\n";
    let mut cm = parse_sl(text).expect("child fixture must parse");
    cm.model_id = Some(*child_id);
    cm
}

fn assert_clean(resolved_text: String, id: &ModelId, generation: &str) {
    let resolved = HashMap::from([(id.to_base58(), resolved_text)]);
    let report = check_decompositions_canvas(&parent(id), &resolved);
    let messages: Vec<_> = report.issues.iter().map(|i| i.message.clone()).collect();
    assert!(
        messages.is_empty(),
        "a well-formed {generation} referent must judge clean: {messages:?}"
    );
}

#[test]
fn archive_format_referent_judges_clean() {
    let id = ModelId::mint();
    // The neutral archive shape: the canvas model's own serialization,
    // `things`-keyed (the format marker is corroboration, never the gate).
    let text = serde_json::to_string(&child(&id)).unwrap();
    assert_clean(text, &id, "archive-format");
}

#[test]
fn legacy_world_model_referent_judges_clean() {
    let id = ModelId::mint();
    let mut world = project(&child(&id));
    world.model_id = Some(id);
    assert_clean(serde_json::to_string(&world).unwrap(), &id, "legacy WorldModel");
}

#[test]
fn corrupt_referent_still_surfaces_the_defined_issue() {
    let id = ModelId::mint();
    let resolved = HashMap::from([(id.to_base58(), "{ not a model".to_string())]);
    let report = check_decompositions_canvas(&parent(&id), &resolved);
    assert_eq!(report.issues.len(), 1);
    assert!(
        report.issues[0].message.contains("not a loadable model"),
        "normalization must pass corrupt text through to the core's own refusal: {}",
        report.issues[0].message
    );
}
