//! facets#384: the newborn child used to lose its boundary flows on the way to
//! the canvas. `derive_child` carries every crossing of the decomposed
//! component into the child as a flow landing on the child's ROOT until an
//! interface takes it — that is what makes the newborn pass the seam contract
//! from birth. `to_canvas` had no thing for the root, so those flows were
//! dropped, the store saved the canvas form, and the saved newborn failed the
//! contract as soon as it was judged. `CanvasModel::crossings` now carries
//! them across; this file is the witness in both directions.

use bert_canvas::canvas::{decompose_thing, project, to_canvas};
use bert_canvas::sl::parse_sl;
use bert_core::decomposition::check_decomposition_contract;

const AQUARIUM: &str = "system \"Aquarium\" : Concrete/Physical\n\
component Water primitive Buffering interface\n\
component Aerator interface description \"pump, airline, stone\"\n\
source Atmosphere\n\
sink \"Room Air\"\n\
flow Atmosphere -> Aerator : matter \"air\"\n\
flow Aerator -> Water : matter \"bubbles\"\n\
flow Water -> \"Room Air\" : matter \"evaporation\"\n\
@lens mobus\n";

#[test]
fn the_worldmodel_newborn_passes_the_contract_from_birth() {
    let parent_canvas = parse_sl(AQUARIUM).unwrap();
    let aerator = parent_canvas.things.iter().find(|t| t.name == "Aerator").unwrap().id;
    let child = decompose_thing(&parent_canvas, aerator).unwrap();
    // two boundary flows: air in from Atmosphere, bubbles out to Water
    assert_eq!(child.interactions.len(), 2);
    let parent = project(&parent_canvas);
    let comp = parent
        .systems
        .iter()
        .find(|s| s.info.name == "Aerator")
        .map(|s| s.info.id.clone())
        .unwrap();
    let issues = check_decomposition_contract(&parent, &comp, &child);
    assert!(issues.is_empty(), "{issues:?}");
}

fn aerator_child() -> (bert_core::WorldModel, bert_core::Id, bert_canvas::canvas::CanvasModel) {
    let parent_canvas = parse_sl(AQUARIUM).unwrap();
    let aerator = parent_canvas.things.iter().find(|t| t.name == "Aerator").unwrap().id;
    let child = decompose_thing(&parent_canvas, aerator).unwrap();
    let parent = project(&parent_canvas);
    let comp = parent
        .systems
        .iter()
        .find(|s| s.info.name == "Aerator")
        .map(|s| s.info.id.clone())
        .unwrap();
    (parent, comp, to_canvas(&child))
}

#[test]
fn the_same_newborn_through_the_canvas_keeps_its_crossings_and_passes_the_contract() {
    let (parent, comp, saved) = aerator_child();
    assert_eq!(saved.relations.len(), 0, "nothing inside yet");
    assert_eq!(saved.crossings.len(), 2, "air in, bubbles out");
    let inbound: Vec<_> = saved.crossings.iter().filter(|c| c.inbound).collect();
    assert_eq!(inbound.len(), 1);
    assert_eq!(inbound[0].name, "air");
    let issues = check_decomposition_contract(&parent, &comp, &project(&saved));
    assert!(issues.is_empty(), "{issues:?}");
    // and the stored JSON round-trips them
    let json = serde_json::to_string(&saved).unwrap();
    let back: bert_canvas::canvas::CanvasModel = serde_json::from_str(&json).unwrap();
    assert_eq!(back.crossings, saved.crossings);
}

#[test]
fn a_model_saved_before_crossings_existed_still_loads() {
    let m: bert_canvas::canvas::CanvasModel =
        serde_json::from_str(r#"{"lens":"Mobus","things":[],"relations":[]}"#).unwrap();
    assert!(m.crossings.is_empty());
    // and a model with none writes no field, so pre-existing JSON stays byte-identical
    assert!(!serde_json::to_string(&m).unwrap().contains("crossings"));
}

#[test]
fn an_interface_that_takes_a_crossing_retires_it() {
    let (parent, comp, saved) = aerator_child();
    // The author places an intake and wires the air crossing through it (as
    // SL text, the way the pane or the drafter would), and the editor carries
    // the crossings over by stand-in name, as the client does.
    let mut edited = parse_sl(
        "system \"Aerator\"\n\
         component Intake interface\n\
         source Atmosphere\n\
         sink Water\n\
         flow Atmosphere -> Intake : matter \"air\"\n\
         @lens mobus\n",
    )
    .unwrap();
    let name_of = |m: &bert_canvas::canvas::CanvasModel, id: u64| m.things.iter().find(|t| t.id == id).unwrap().name.clone();
    edited.crossings = saved
        .crossings
        .iter()
        .map(|c| {
            let name = name_of(&saved, c.env);
            let env = edited.things.iter().find(|t| t.name == name).unwrap().id;
            bert_canvas::canvas::Crossing { env, ..c.clone() }
        })
        .collect();
    let world = project(&edited);
    let root = world.systems.iter().find(|s| s.info.level == 0).unwrap().info.id.clone();
    // the air crossing no longer lands on the root; the bubbles one still does
    let to_root: Vec<String> = world
        .interactions
        .iter()
        .filter(|ix| ix.sink == root || ix.source == root)
        .map(|ix| ix.info.name.clone())
        .collect();
    assert_eq!(to_root, vec!["bubbles".to_string()]);
    // and the seam still holds: one crossing refined, one still pending on the root
    let issues = check_decomposition_contract(&parent, &comp, &world);
    let errors: Vec<_> = issues.iter().filter(|i| i.severity == bert_core::validate::Severity::Error).collect();
    assert!(errors.is_empty(), "{errors:?}");
}

#[test]
fn emit_sl_names_the_pending_crossings_as_comments_and_parse_drops_them() {
    let (_, _, saved) = aerator_child();
    let text = bert_canvas::sl::emit_sl(&saved).unwrap();
    assert!(text.contains("# 2 boundary flows land on this system itself"), "{text}");
    assert!(text.contains("#   Atmosphere -> (this system) : matter \"air\""), "{text}");
    assert!(text.contains("#   (this system) -> Water : matter \"bubbles\""), "{text}");
    let back = parse_sl(&text).unwrap();
    assert!(back.crossings.is_empty(), "a crossing is derived, never authored");
}
