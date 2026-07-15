//! The canvas authoring seam — the lightweight editing model the canvas holds,
//! and its projection into a bert-core `WorldModel` for validation.
//!
//! Like the old egui app, the canvas keeps its OWN model (things/relations/lens)
//! and holds zero formalism: the lens is a *view*, mere-relations (B̄) and
//! kind-neutrality live only here. Every systemhood verdict routes through a
//! fresh projection into a `WorldModel` (`project`) that the kernel validates.
//! This is the port of the old `to_world_model_with` (main.rs:1822-2010) onto a
//! serializable `CanvasModel`, so the React canvas never constructs a WorldModel
//! itself — it sends its editing model, and Rust builds + judges.
//!
//! LOAD-BEARING: the canvas asks Rust for legality (`validate_connection`,
//! `validate_mode`). JS decides nothing about systemhood.

use serde::{Deserialize, Serialize};

use bert_core::validate::{validate_mode, ValidationIssue};
use bert_core::{
    AgentModel, Boundary, Complexity, Environment, ExternalEntity, ExternalEntityType, HcgsArchetype,
    Id, IdType, Info, Interaction, InteractionType, InteractionUsability, Mode, ProcessPrimitive,
    Substance, SubstanceType, System, Transform2d, Vec2, WorldModel,
};

const RADIUS: f32 = 34.0;

/// The lens an author is reading through — a view, mapped to a kernel `Mode`.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Lens {
    Klir,
    Bunge,
    Mobus,
}

impl Lens {
    pub fn mode(self) -> Mode {
        match self {
            Lens::Klir => Mode::Core,
            Lens::Bunge => Mode::Structural,
            Lens::Mobus => Mode::Operational,
        }
    }
}

/// Bunge's C/E membership. Klir ignores it (everything is just a thing in T).
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum Role {
    #[default]
    Component,
    Environment,
}

/// The kind of a bond (Bunge's connection-flow taxonomy). Maps 1:1 onto Mobus
/// substance; the flow-name axis, not the Mobus `InteractionType::Force`.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum Kind {
    #[default]
    Unspecified,
    Energy,
    Matter,
    Field,
    Informational,
}

fn kind_to_substance(k: Kind) -> SubstanceType {
    match k {
        Kind::Matter => SubstanceType::Material,
        Kind::Informational => SubstanceType::Message,
        Kind::Energy | Kind::Field | Kind::Unspecified => SubstanceType::Energy,
    }
}

/// A node on the canvas.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Thing {
    pub id: u64,
    pub name: String,
    pub x: f32,
    pub y: f32,
    #[serde(default)]
    pub role: Role,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub primitive: Option<ProcessPrimitive>,
}

/// A drawn connection: `a → b`, a bond (or a mere relation), optionally typed.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Relation {
    pub id: u64,
    pub a: u64,
    pub b: u64,
    #[serde(default)]
    pub name: String,
    #[serde(default = "default_true")]
    pub is_bond: bool,
    #[serde(default)]
    pub kind: Kind,
}

fn default_true() -> bool {
    true
}

/// The canvas editing model — the JSON the React canvas holds and sends.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CanvasModel {
    pub lens: Lens,
    #[serde(default)]
    pub things: Vec<Thing>,
    #[serde(default)]
    pub relations: Vec<Relation>,
}

fn info(id: Id, level: i32, name: &str) -> Info {
    Info {
        id,
        level,
        name: name.to_string(),
        description: String::new(),
    }
}

fn transform_of(x: f32, y: f32) -> Transform2d {
    Transform2d {
        translation: Vec2::new(x, y),
        rotation: 0.0,
    }
}

fn new_system(
    id: Id,
    level: i32,
    name: &str,
    parent: Id,
    pos: Option<(f32, f32)>,
    primitive: Option<ProcessPrimitive>,
) -> System {
    let boundary_id = Id {
        ty: IdType::Boundary,
        indices: id.indices.clone(),
    };
    System {
        info: info(id, level, name),
        sources: vec![],
        sinks: vec![],
        parent,
        complexity: Complexity::Atomic,
        boundary: Boundary {
            info: info(boundary_id, level, ""),
            porosity: 0.0,
            perceptive_fuzziness: 0.0,
            interfaces: vec![],
            parent_interface: None,
        },
        radius: RADIUS,
        transform: pos.map(|(x, y)| transform_of(x, y)),
        equivalence: String::new(),
        history: String::new(),
        transformation: String::new(),
        member_autonomy: 1.0,
        time_constant: String::new(),
        archetype: primitive.map(|_| HcgsArchetype::Agent),
        agent: primitive.map(|p| AgentModel {
            primitive: Some(p),
            ..Default::default()
        }),
    }
}

/// Project the canvas model into a bert-core `WorldModel`, mode-stamped by the
/// lens. Only bonds project to interactions; an environment thing projects only
/// if a bond touches it (originates one → Source, else Sink). Port of the old
/// `to_world_model_with` (structure only; CSV params are the tether's job).
pub fn project(model: &CanvasModel) -> WorldModel {
    use std::collections::{HashMap, HashSet};

    let env_id = Id {
        ty: IdType::Environment,
        indices: vec![-1],
    };
    let root_id = Id {
        ty: IdType::System,
        indices: vec![0],
    };

    let bonds: Vec<&Relation> = model.relations.iter().filter(|r| r.is_bond).collect();
    let originates: HashSet<u64> = bonds.iter().map(|r| r.a).collect();
    let touched: HashSet<u64> = bonds.iter().flat_map(|r| [r.a, r.b]).collect();

    let mut id_map: HashMap<u64, Id> = HashMap::new();
    let mut systems: Vec<System> = Vec::new();
    let mut sources: Vec<ExternalEntity> = Vec::new();
    let mut sinks: Vec<ExternalEntity> = Vec::new();

    systems.push(new_system(root_id.clone(), 0, "System", env_id.clone(), None, None));

    let mut comp_idx: i64 = 0;
    let mut env_idx: i64 = 0;
    for t in &model.things {
        match t.role {
            Role::Component => {
                let id = Id {
                    ty: IdType::Subsystem,
                    indices: vec![0, comp_idx],
                };
                comp_idx += 1;
                systems.push(new_system(
                    id.clone(),
                    1,
                    &t.name,
                    root_id.clone(),
                    Some((t.x, t.y)),
                    t.primitive,
                ));
                id_map.insert(t.id, id);
            }
            Role::Environment => {
                if !touched.contains(&t.id) {
                    continue; // an untouched env dot would be an orphan terminal
                }
                let is_source = originates.contains(&t.id);
                let id = Id {
                    ty: if is_source { IdType::Source } else { IdType::Sink },
                    indices: vec![-1, env_idx],
                };
                env_idx += 1;
                let ext = ExternalEntity {
                    info: info(id.clone(), -1, &t.name),
                    ty: if is_source {
                        ExternalEntityType::Source
                    } else {
                        ExternalEntityType::Sink
                    },
                    transform: Some(transform_of(t.x, t.y)),
                    equivalence: String::new(),
                    model: String::new(),
                    is_same_as_id: None,
                };
                if is_source {
                    sources.push(ext);
                } else {
                    sinks.push(ext);
                }
                id_map.insert(t.id, id);
            }
        }
    }

    let mut interactions: Vec<Interaction> = Vec::new();
    for (k, r) in bonds.iter().enumerate() {
        let (Some(src), Some(snk)) = (id_map.get(&r.a), id_map.get(&r.b)) else {
            continue;
        };
        interactions.push(Interaction {
            info: info(
                Id {
                    ty: IdType::Flow,
                    indices: vec![k as i64],
                },
                0,
                &r.name,
            ),
            substance: Substance {
                sub_type: String::new(),
                ty: kind_to_substance(r.kind),
            },
            ty: InteractionType::Flow,
            usability: InteractionUsability::Resource,
            source: src.clone(),
            source_interface: None,
            sink: snk.clone(),
            sink_interface: None,
            amount: bert_core::rust_decimal::Decimal::ONE,
            unit: String::new(),
            parameters: vec![],
            smart_parameters: vec![],
            endpoint_offset: None,
        });
    }

    WorldModel {
        version: 1,
        mode: Some(model.lens.mode()),
        environment: Environment {
            info: info(env_id, -1, "Environment"),
            sources,
            sinks,
        },
        systems,
        interactions,
        hidden_entities: vec![],
    }
}

/// Validate a proposed connection against the current lens: project the model
/// WITH the candidate, run `validate_mode(lens.mode())`, and return the issues
/// the candidate INTRODUCED (a self-loop at Mobus, an unbonded aggregate at
/// Bunge, …). Empty = the connection is legal at this lens. React calls this per
/// drag; it decides nothing itself.
pub fn validate_connection(model: &CanvasModel, candidate: &Relation) -> Vec<ValidationIssue> {
    use std::collections::HashSet;
    let mode = model.lens.mode();
    let before = validate_mode(&project(model), mode);
    let mut with = model.clone();
    with.relations.push(candidate.clone());
    let after = validate_mode(&project(&with), mode);

    let seen: HashSet<(String, String)> = before
        .issues
        .iter()
        .map(|i| (i.location.clone(), i.message.clone()))
        .collect();
    after
        .issues
        .into_iter()
        .filter(|i| !seen.contains(&(i.location.clone(), i.message.clone())))
        .collect()
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;

    fn thing(id: u64, name: &str, role: Role) -> Thing {
        Thing {
            id,
            name: name.to_string(),
            x: id as f32 * 100.0,
            y: 0.0,
            role,
            primitive: None,
        }
    }
    fn bond(id: u64, a: u64, b: u64) -> Relation {
        Relation {
            id,
            a,
            b,
            name: String::new(),
            is_bond: true,
            kind: Kind::Unspecified,
        }
    }

    #[test]
    fn projects_a_bonded_pair_cleanly_at_every_lens() {
        for lens in [Lens::Klir, Lens::Bunge, Lens::Mobus] {
            let model = CanvasModel {
                lens,
                things: vec![
                    thing(1, "A", Role::Component),
                    thing(2, "B", Role::Component),
                ],
                relations: vec![bond(10, 1, 2)],
            };
            let wm = project(&model);
            assert_eq!(wm.mode, Some(lens.mode()));
            assert_eq!(wm.interactions.len(), 1);
            // two components + root
            assert_eq!(wm.systems.len(), 3);
            let issues = validate_mode(&wm, lens.mode());
            assert!(
                !issues.has_errors(),
                "{lens:?}: {:?}",
                issues.issues
            );
        }
    }

    #[test]
    fn self_loop_is_rejected_at_mobus_but_not_klir() {
        let model = CanvasModel {
            lens: Lens::Mobus,
            things: vec![thing(1, "A", Role::Component), thing(2, "B", Role::Component)],
            relations: vec![bond(10, 1, 2)],
        };
        let loop_edge = bond(11, 1, 1); // A → A
        let issues = validate_connection(&model, &loop_edge);
        assert!(
            issues.iter().any(|i| i.message.contains("k ≠ o") || i.message.contains("same endpoint")),
            "Mobus should reject a self-loop: {issues:?}"
        );
        // The same edge is legal at Klir (Core has no irreflexivity gate).
        let klir = CanvasModel { lens: Lens::Klir, ..model.clone() };
        assert!(validate_connection(&klir, &loop_edge).is_empty());
    }

    #[test]
    fn environment_projects_by_bond_direction() {
        // env originates a bond → Source; env receives → Sink.
        let model = CanvasModel {
            lens: Lens::Mobus,
            things: vec![
                thing(1, "Env", Role::Environment),
                thing(2, "Comp", Role::Component),
            ],
            relations: vec![bond(10, 1, 2)], // Env → Comp
        };
        let wm = project(&model);
        assert_eq!(wm.environment.sources.len(), 1);
        assert_eq!(wm.environment.sinks.len(), 0);
    }
}
