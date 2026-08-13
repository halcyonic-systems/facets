//! The archive seam (bert-lenses#140, ADR 0004): what a saved model IS on disk.
//!
//! An archive must not be a lens's projection. The library used to persist
//! `project(canvas)` — a `WorldModel`, which is Mobus's lens format — and that
//! seam silently destroyed the non-Mobus vocabulary: Bunge's `mere` relations
//! and `field` kind, Klir's `@directed`, and the authored system type. The
//! archive is therefore the NEUTRAL model, `CanvasModel`, which carries the
//! union of all three traditions' words with each tagged to its own.
//!
//! `project` keeps its job — Mobus export, and the executable projection the
//! compose engine runs (the 8-tuple carries T and Δt, which is what running
//! requires). It simply stops being what the library writes.
//!
//! Reading is total over both formats: every file the app ever wrote must keep
//! opening. Format is decided by SHAPE, with the marker as corroboration rather
//! than the gate — a hand-written or hand-edited file that omits the marker is
//! still read correctly, because refusing it would strand real user data.
use serde::{Deserialize, Serialize};
use serde_json::Value;

use bert_core::{ModelId, WorldModel};

use bert_canvas::canvas::{to_canvas, CanvasModel};

/// The archive's format marker. Migration is necessarily destructive — what an
/// old `WorldModel` file already dropped cannot be recovered — so the marker's
/// job is not to enable upgrade-in-place; it is to let a future reader tell
/// generations apart without guessing from shape alone.
pub const FORMAT: &str = "bert-lenses/canvas@1";

/// A written archive: the neutral model, plus the marker that names it.
/// `flatten` keeps the model's own fields at the top level, so an archive is a
/// `CanvasModel` with one extra key — readable by anything that already reads
/// a canvas model, marker or not.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Archive {
    pub format: String,
    #[serde(flatten)]
    pub model: CanvasModel,
}

/// The text to persist for `model`.
pub fn write(model: &CanvasModel) -> Result<String, String> {
    let archive = Archive {
        format: FORMAT.to_string(),
        model: model.clone(),
    };
    serde_json::to_string_pretty(&archive).map_err(|e| format!("could not write archive: {e}"))
}

/// Which generation a stored text belongs to. Shape decides: the neutral model
/// keys its elements `things`, the Mobus projection keys them `systems`.
enum Shape {
    Canvas,
    Legacy,
}

fn shape_of(text: &str) -> Result<Shape, String> {
    let value: Value =
        serde_json::from_str(text).map_err(|e| format!("not a model file: invalid JSON: {e}"))?;
    let object = value
        .as_object()
        .ok_or_else(|| "not a model file: expected a JSON object".to_string())?;
    // The marker is corroboration, never the gate (see the module note).
    if object.contains_key("things") {
        Ok(Shape::Canvas)
    } else if object.contains_key("systems") {
        Ok(Shape::Legacy)
    } else {
        Err("not a model file: no `things` (archive) or `systems` (legacy) key".to_string())
    }
}

/// Open a stored model, whichever generation wrote it. A legacy `WorldModel`
/// comes back through `to_canvas` exactly as before — the content it lost was
/// lost when it was WRITTEN, and reading cannot restore it.
pub fn read(text: &str) -> Result<CanvasModel, String> {
    match shape_of(text)? {
        Shape::Canvas => serde_json::from_str::<CanvasModel>(text)
            .map_err(|e| format!("could not read archive: {e}")),
        Shape::Legacy => {
            let world: WorldModel = serde_json::from_str(text)
                .map_err(|e| format!("could not read legacy model: {e}"))?;
            Ok(to_canvas(&world))
        }
    }
}

/// A stored model's stable identity, whichever generation wrote it. The store
/// layer keys records and resolves `decomposes` references by this, and it must
/// answer for a file read out of a bare working folder — where there is no
/// record to denormalize into. That requirement is precisely why the archive is
/// self-describing JSON rather than SL (ADR 0004, decision 2).
pub fn identity(text: &str) -> Option<ModelId> {
    match shape_of(text).ok()? {
        Shape::Canvas => serde_json::from_str::<CanvasModel>(text).ok()?.model_id,
        Shape::Legacy => serde_json::from_str::<WorldModel>(text).ok()?.model_id,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bert_canvas::canvas::{project, Kind, Kingdom, Lens, Relation, Role, SystemType, Thing};

    /// A model wearing every word the old archive destroyed.
    fn lossy_model() -> CanvasModel {
        let mut m = CanvasModel {
            lens: Lens::Bunge,
            model_id: None,
            things: Vec::new(),
            relations: Vec::new(),
            boundary: Default::default(),
            system_type: SystemType {
                kingdom: Some(Kingdom::Concrete),
                genus: None,
                domain: Some("Social".to_string()),
            },
            name: Some("two-thing".to_string()),
            description: String::new(),
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        m.things.push(Thing {
            id: 1,
            name: "a".into(),
            description: String::new(),
            x: 0.0,
            y: 0.0,
            role: Role::Component,
            primitive: None,
            interface: false,
            child_model: None,
            stock_unit: String::new(),
            scale: None,
            states: None,
            variable_kind: None,
            cognitive_params: Default::default(),
            initial_state: Default::default(),
            agency_capacity: None,
            env_kind: Default::default(),
        });
        m.things.push(Thing {
            id: 2,
            name: "b".into(),
            description: String::new(),
            x: 10.0,
            y: 0.0,
            role: Role::Component,
            primitive: None,
            interface: false,
            child_model: None,
            stock_unit: String::new(),
            scale: None,
            states: None,
            variable_kind: None,
            cognitive_params: Default::default(),
            initial_state: Default::default(),
            agency_capacity: None,
            env_kind: Default::default(),
        });
        m.relations.push(Relation {
            id: 1,
            a: 1,
            b: 2,
            name: "acts".into(),
            description: String::new(),
            is_bond: true,
            kind: Kind::Field,
            klir_directed: true,
            weight: None,
            amount: None,
            unit: String::new(),
            substance: String::new(),
            ample: false,
        });
        m.relations.push(Relation {
            id: 2,
            a: 1,
            b: 2,
            name: "older than".into(),
            description: String::new(),
            is_bond: false,
            kind: Kind::Unspecified,
            klir_directed: false,
            weight: None,
            amount: None,
            unit: String::new(),
            substance: String::new(),
            ample: false,
        });
        m
    }

    /// The defect this seam exists to fix: everything the Mobus projection
    /// destroys survives a write/read round trip through the archive.
    #[test]
    fn archive_keeps_what_the_projection_destroys() {
        let before = lossy_model();
        let after = read(&write(&before).unwrap()).unwrap();

        assert_eq!(after.system_type, before.system_type, "Bunge's kingdom/genus");
        assert_eq!(after.relations.len(), 2, "the mere relation survives");
        assert!(
            after.relations.iter().any(|r| !r.is_bond),
            "Bunge's B̄ — a relation that holds without acting"
        );
        assert!(
            after.relations.iter().any(|r| r.kind == Kind::Field),
            "Bunge's field kind, uncollapsed"
        );
        assert!(
            after.relations.iter().any(|r| r.klir_directed),
            "Klir's observer declaration"
        );
        assert_eq!(after.lens, before.lens);
    }

    /// Klir's source-system metadata (#154) — the authored scale and state set —
    /// survives a write/read round trip; a thing that declares neither reads
    /// back with both absent (the skip-if-None contract).
    #[test]
    fn archive_keeps_klir_source_system_metadata() {
        use bert_canvas::canvas::ScaleType;
        let mut before = lossy_model();
        before.things[0].scale = Some(ScaleType::Nominal);
        before.things[0].states = Some(vec!["Green".into(), "Yellow".into(), "Red".into()]);

        let after = read(&write(&before).unwrap()).unwrap();
        assert_eq!(after.things[0].scale, Some(ScaleType::Nominal));
        assert_eq!(
            after.things[0].states.as_deref(),
            Some(["Green".to_string(), "Yellow".to_string(), "Red".to_string()].as_slice())
        );
        assert_eq!(after.things[1].scale, None, "undeclared stays absent");
        assert_eq!(after.things[1].states, None);
    }

    /// The skip-if-None contract at the byte level: a thing with neither field
    /// serializes without the keys, so models authored before #154 stay
    /// byte-identical on disk.
    #[test]
    fn undeclared_metadata_is_omitted_from_the_json() {
        let text = write(&lossy_model()).unwrap();
        assert!(!text.contains("\"scale\""), "no scale key when undeclared:\n{text}");
        assert!(!text.contains("\"states\""), "no states key when undeclared:\n{text}");
    }

    /// The same model through the OLD archive path, pinned as a regression
    /// witness: this is what was being lost on every save.
    #[test]
    fn the_legacy_path_still_loses_exactly_what_it_lost() {
        let before = lossy_model();
        let world = project(&before);
        let after = to_canvas(&world);

        assert!(
            after.relations.iter().all(|r| r.is_bond),
            "legacy: the mere relation is gone"
        );
        assert!(
            !after.relations.iter().any(|r| r.kind == Kind::Field),
            "legacy: field collapsed"
        );
        assert!(
            !after.relations.iter().any(|r| r.klir_directed),
            "legacy: the observer declaration is gone"
        );
        assert_eq!(
            after.system_type,
            SystemType::default(),
            "legacy: the authored system type is gone"
        );
    }

    #[test]
    fn reads_a_legacy_world_model_file() {
        let world = project(&lossy_model());
        let text = serde_json::to_string(&world).unwrap();
        let opened = read(&text).unwrap();
        assert_eq!(opened.things.len(), 2, "legacy files keep opening");
    }

    #[test]
    fn an_archive_carries_its_marker_and_reads_without_one() {
        let text = write(&lossy_model()).unwrap();
        assert!(text.contains(FORMAT), "the generation is named in the file");

        // Shape decides, so a marker-less canvas file still opens — real files
        // get hand-edited, and refusing them would strand user data.
        let mut value: Value = serde_json::from_str(&text).unwrap();
        value.as_object_mut().unwrap().remove("format");
        let opened = read(&serde_json::to_string(&value).unwrap()).unwrap();
        assert_eq!(opened.relations.len(), 2);
    }

    #[test]
    fn identity_answers_for_both_generations_and_refuses_neither_quietly() {
        let mut m = lossy_model();
        m.model_id = Some(ModelId::mint());

        assert_eq!(identity(&write(&m).unwrap()), m.model_id, "archive");
        let legacy = serde_json::to_string(&project(&m)).unwrap();
        assert_eq!(identity(&legacy), m.model_id, "legacy");
        assert_eq!(identity("{\"nope\":1}"), None, "not a model file");
        assert_eq!(identity("not json"), None);
    }
}

#[cfg(test)]
mod decomposition_seam {
    use super::*;
    use bert_canvas::canvas::{decompose_thing, CanvasModel, Kind, Lens, Relation, Role, Thing};

    fn thing(id: u64, name: &str, role: Role) -> Thing {
        Thing {
            id,
            name: name.into(),
            description: String::new(),
            x: id as f32 * 100.0,
            y: 0.0,
            role,
            primitive: None,
            interface: false,
            child_model: None,
            stock_unit: String::new(),
            scale: None,
            states: None,
            variable_kind: None,
            cognitive_params: Default::default(),
            initial_state: Default::default(),
            agency_capacity: None,
            env_kind: Default::default(),
        }
    }

    /// The decomposition door stamps the parent with the child's minted id and
    /// stores the child separately. The child now goes to storage through
    /// `read` → `write` (it is derived as a WorldModel), so if that path dropped
    /// the identity, every parent would reference a child the store cannot find.
    /// Pin it: the id the parent is stamped with is the id the stored child
    /// answers to.
    #[test]
    fn a_derived_child_keeps_the_identity_its_parent_is_stamped_with() {
        let mut m = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            // Intake and Output touch the environment, so they are interface
            // components; Furnace is INTERIOR — the only kind v1's boundary
            // contract will decompose.
            things: vec![
                thing(1, "Furnace", Role::Component),
                thing(2, "Supply", Role::Environment),
                thing(3, "Product", Role::Environment),
                thing(4, "Intake", Role::Component),
                thing(5, "Output", Role::Component),
            ],
            relations: vec![
                Relation { id: 1, a: 2, b: 4, name: "crude".into(), description: String::new(), is_bond: true, kind: Kind::Matter, klir_directed: false, weight: None, amount: None, unit: String::new(), substance: String::new(), ample: false },
                Relation { id: 2, a: 4, b: 1, name: "feed".into(), description: String::new(), is_bond: true, kind: Kind::Matter, klir_directed: false, weight: None, amount: None, unit: String::new(), substance: String::new(), ample: false },
                Relation { id: 3, a: 1, b: 5, name: "hot".into(), description: String::new(), is_bond: true, kind: Kind::Matter, klir_directed: false, weight: None, amount: None, unit: String::new(), substance: String::new(), ample: false },
                Relation { id: 4, a: 5, b: 3, name: "refined".into(), description: String::new(), is_bond: true, kind: Kind::Matter, klir_directed: false, weight: None, amount: None, unit: String::new(), substance: String::new(), ample: false },
            ],
            boundary: Default::default(),
            system_type: Default::default(),
            name: Some("Refinery".into()),
            description: String::new(),
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        m.things[0].primitive = Some(bert_core::ProcessPrimitive::Combining);

        let child = decompose_thing(&m, 1).expect("the door opens for an interior component");
        let stamped_id = child.model_id.expect("the kernel mints the newborn an identity");

        // Exactly what the face now does with `child_json`.
        let child_json = serde_json::to_string(&child).unwrap();
        let stored = write(&read(&child_json).unwrap()).unwrap();

        assert_eq!(
            identity(&stored),
            Some(stamped_id),
            "the stored child must answer to the id its parent was stamped with"
        );
    }
}
