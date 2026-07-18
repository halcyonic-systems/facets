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
    Id, IdType, Info, Interaction, InteractionType, InteractionUsability, Interface, InterfaceType,
    Mode, ProcessPrimitive, Substance, SubstanceType, System, Transform2d, Vec2, WorldModel,
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
    /// Authored interface designation — this component is a member of the root
    /// membrane's I (I ⊆ C; a flowless interface is well-formed, Boundary.lean /
    /// Tuple.lean: no coverage constraint from flows onto interfaces). Ignored
    /// on env things (their internals are opaque, §4.3.3.2.2).
    #[serde(default)]
    pub interface: bool,
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
    /// Klir's observer toggle: neutral ⇄ directed (Facets Ch. 4 — "directed
    /// systems" merely add an orientation the observer commits to). Pure view
    /// state, canvas-resident; never projects (the kernel `dep` is ordered
    /// regardless, so this changes what the Klir lens *shows*, not the model).
    #[serde(default)]
    pub klir_directed: bool,
}

fn default_true() -> bool {
    true
}

/// Authored boundary properties — B's P = ⟨porosity, perceptive_fuzziness⟩ for
/// the ROOT system's membrane (the canvas is single-root). 0.0 = unauthored,
/// matching bert-core's defaults; the palette's boundary inspector writes these
/// and `project` carries them into the root boundary instead of hardcoding 0.0.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, Default, PartialEq)]
pub struct CanvasBoundaryProps {
    #[serde(default)]
    pub porosity: f32,
    #[serde(default)]
    pub perceptive_fuzziness: f32,
}

/// Bunge's two kingdoms of systems (Treatise Vol. 4, Postulate 6.4): every
/// system is either Conceptual or Concrete. Aligns with Mobus's abstract vs
/// concrete split. See systems-science-foundations/docs/reference/
/// system-type-typologies.md for the author-grounded vocabulary.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kingdom {
    Conceptual,
    Concrete,
}

/// Bunge's five genera of concrete systems (Postulate 6.4). Meaningful only when
/// the kingdom is Concrete; Klir's §2.4 type-(a) axis lands on nearly the same
/// list (an independent K≅2 corroboration — see the reference doc).
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Genus {
    Physical,
    Chemical,
    Biological,
    Social,
    Technical,
}

/// The modeler's asserted ontological kind of the whole model — semantic
/// metadata, NOT a systemhood verdict (no validator gates it). Genus is
/// meaningful when kingdom = Concrete; no cross-field validation in v1. Domain
/// is the free-text subject area that frames the narration for the analyst.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq, Eq)]
pub struct SystemType {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub kingdom: Option<Kingdom>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub genus: Option<Genus>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
}

/// The canvas editing model — the JSON the React canvas holds and sends.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CanvasModel {
    pub lens: Lens,
    #[serde(default)]
    pub things: Vec<Thing>,
    #[serde(default)]
    pub relations: Vec<Relation>,
    #[serde(default)]
    pub boundary: CanvasBoundaryProps,
    /// Author-asserted system type (genus + optional domain). serde `default` so
    /// pre-existing models deserialize unchanged; not gated by any validator.
    #[serde(default)]
    pub system_type: SystemType,
    /// Author-given name of the system of interest (Mobus's "Process M",
    /// "Steel-Plant"). serde `default` so pre-existing models deserialize
    /// unchanged; `None` projects as the placeholder root name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
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

/// A projection plus the id bridges the canvas needs to read kernel verdicts
/// back onto its own nodes/edges. `project` built (and discarded) both maps
/// already; `lens_facts` needs them, so they are surfaced here.
pub struct Projection {
    pub world: WorldModel,
    /// canvas thing id → projected kernel `Id` (components and touched env things).
    pub thing_ids: std::collections::HashMap<u64, Id>,
    /// canvas relation id → the projected interaction's kernel `Id`. An explicit
    /// map, not positional parallelism with `world.interactions`: only bonds with
    /// both endpoints projected appear (skipped bonds have no entry).
    pub interaction_of: std::collections::HashMap<u64, Id>,
}

/// Project the canvas model into a bert-core `WorldModel`, mode-stamped by the
/// lens. Only bonds project to interactions; an environment thing projects only
/// if a bond touches it (originates one → Source, else Sink). Port of the old
/// `to_world_model_with` (structure only; CSV params are the tether's job).
pub fn project(model: &CanvasModel) -> WorldModel {
    project_with_map(model).world
}

/// [`project`], keeping the canvas↔kernel id maps. Behavior-identical.
pub fn project_with_map(model: &CanvasModel) -> Projection {
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

    let root_name = model.name.as_deref().unwrap_or("System");
    let mut root = new_system(root_id.clone(), 0, root_name, env_id.clone(), None, None);
    // Authored P lands on the root membrane — the projection stops erasing it.
    root.boundary.porosity = model.boundary.porosity;
    root.boundary.perceptive_fuzziness = model.boundary.perceptive_fuzziness;
    systems.push(root);

    let mut comp_idx: i64 = 0;
    let mut env_idx: i64 = 0;
    // (systems index, thing id, name) per interface-designated component.
    let mut designated: Vec<(usize, u64, &str)> = Vec::new();
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
                if t.interface {
                    designated.push((systems.len() - 1, t.id, &t.name));
                }
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

    // Authored interface designation (I ⊆ C): each designated component adds an
    // Interface entry to the ROOT membrane and attaches to it via its own
    // boundary.parent_interface (Mobus: an interface IS a subsystem r = (S, φ)).
    // Flowless entries are well-formed — Tuple.lean carries no coverage
    // constraint from flows onto interfaces; validate's orphan-interface check
    // stays a Warning ("nothing flows"), never an Error.
    let env_things: HashSet<u64> = model
        .things
        .iter()
        .filter(|t| t.role == Role::Environment)
        .map(|t| t.id)
        .collect();
    let mut iface_of: HashMap<u64, Id> = HashMap::new();
    for (seq, (sys_idx, thing_id, name)) in designated.into_iter().enumerate() {
        let iface_id = Id {
            ty: IdType::Interface,
            indices: vec![0, seq as i64],
        };
        let mut receives_from: Vec<Id> = Vec::new();
        let mut exports_to: Vec<Id> = Vec::new();
        let mut labels: Vec<String> = Vec::new();
        for r in &bonds {
            let (env, incoming) = if r.b == thing_id && env_things.contains(&r.a) {
                (r.a, true)
            } else if r.a == thing_id && env_things.contains(&r.b) {
                (r.b, false)
            } else {
                continue;
            };
            let Some(env_kernel) = id_map.get(&env) else { continue };
            if incoming {
                receives_from.push(env_kernel.clone());
            } else {
                exports_to.push(env_kernel.clone());
            }
            let label = if r.name.trim().is_empty() { None } else { Some(r.name.trim().to_string()) };
            if let Some(l) = label {
                if !labels.contains(&l) {
                    labels.push(l);
                }
            }
        }
        let ty = match (!receives_from.is_empty(), !exports_to.is_empty()) {
            (true, false) => InterfaceType::Import,
            (false, true) => InterfaceType::Export,
            _ => InterfaceType::Hybrid, // both, or flowless (direction unbound)
        };
        systems[0].boundary.interfaces.push(Interface {
            info: info(iface_id.clone(), 0, name),
            protocol: labels.join(" · "),
            ty,
            exports_to,
            receives_from,
            angle: None,
        });
        systems[sys_idx].boundary.parent_interface = Some(iface_id.clone());
        iface_of.insert(thing_id, iface_id);
    }

    let mut interactions: Vec<Interaction> = Vec::new();
    let mut interaction_of: HashMap<u64, Id> = HashMap::new();
    for (k, r) in bonds.iter().enumerate() {
        let (Some(src), Some(snk)) = (id_map.get(&r.a), id_map.get(&r.b)) else {
            continue;
        };
        let flow_id = Id {
            ty: IdType::Flow,
            indices: vec![k as i64],
        };
        interaction_of.insert(r.id, flow_id.clone());
        interactions.push(Interaction {
            info: info(flow_id, 0, &r.name),
            substance: Substance {
                sub_type: String::new(),
                ty: kind_to_substance(r.kind),
            },
            ty: InteractionType::Flow,
            usability: InteractionUsability::Resource,
            // Crossing flows route through the designated component's interface
            // (flow ⇒ interface — bipartite_implies_boundary_complete).
            source: src.clone(),
            source_interface: (env_things.contains(&r.b))
                .then(|| iface_of.get(&r.a).cloned())
                .flatten(),
            sink: snk.clone(),
            sink_interface: (env_things.contains(&r.a))
                .then(|| iface_of.get(&r.b).cloned())
                .flatten(),
            amount: bert_core::rust_decimal::Decimal::ONE,
            unit: String::new(),
            parameters: vec![],
            smart_parameters: vec![],
            endpoint_offset: None,
        });
    }

    let world = WorldModel {
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
    };

    Projection {
        world,
        thing_ids: id_map,
        interaction_of,
    }
}

fn substance_to_kind(s: SubstanceType) -> Kind {
    match s {
        SubstanceType::Material => Kind::Matter,
        SubstanceType::Message => Kind::Informational,
        SubstanceType::Energy => Kind::Energy,
    }
}

/// Load an existing `WorldModel` back onto the canvas as an editing model — the
/// display-faithful inverse of [`project`]. Level-1 systems become component
/// things (carrying their primitive + position), environment source/sink
/// entities become environment things, interactions become relations (typed by
/// substance), and the lens is read from the model's mode. Fidelity of dynamics
/// params (storage, cognitive params) is NOT round-tripped here: in Phase 2b the
/// canvas is a VIEW + drive-target picker, and the run uses the original model —
/// so this only needs to draw the structure faithfully.
pub fn to_canvas(model: &WorldModel) -> CanvasModel {
    use std::collections::HashMap;

    let lens = match model.mode() {
        Mode::Core => Lens::Klir,
        Mode::Structural => Lens::Bunge,
        Mode::Operational | Mode::Full => Lens::Mobus,
    };

    let mut things: Vec<Thing> = Vec::new();
    let mut id_of: HashMap<Id, u64> = HashMap::new();
    let mut next: u64 = 1;

    for s in model.systems.iter().filter(|s| s.info.level == 1) {
        let (x, y) = s
            .transform
            .as_ref()
            .map(|t| (t.translation.x, t.translation.y))
            .unwrap_or((0.0, 0.0));
        let id = next;
        next += 1;
        id_of.insert(s.info.id.clone(), id);
        things.push(Thing {
            id,
            name: s.info.name.clone(),
            x,
            y,
            role: Role::Component,
            primitive: s.agent.as_ref().and_then(|a| a.primitive),
            // parent_interface is the designation's inverse: a level-1 system
            // attached to a root-membrane interface IS a designated member of I.
            interface: s.boundary.parent_interface.is_some(),
        });
    }

    for e in model
        .environment
        .sources
        .iter()
        .chain(model.environment.sinks.iter())
    {
        let (x, y) = e
            .transform
            .as_ref()
            .map(|t| (t.translation.x, t.translation.y))
            .unwrap_or((0.0, 0.0));
        let id = next;
        next += 1;
        id_of.insert(e.info.id.clone(), id);
        things.push(Thing {
            id,
            name: e.info.name.clone(),
            x,
            y,
            role: Role::Environment,
            primitive: None,
            interface: false,
        });
    }

    let mut relations: Vec<Relation> = Vec::new();
    for ix in &model.interactions {
        let (Some(&a), Some(&b)) = (id_of.get(&ix.source), id_of.get(&ix.sink)) else {
            continue;
        };
        let id = next;
        next += 1;
        relations.push(Relation {
            id,
            a,
            b,
            name: ix.info.name.clone(),
            is_bond: true,
            kind: substance_to_kind(ix.substance.ty),
            klir_directed: false,
        });
    }

    let root = model.systems.iter().find(|s| s.info.level == 0);
    let boundary = root
        .map(|s| CanvasBoundaryProps {
            porosity: s.boundary.porosity,
            perceptive_fuzziness: s.boundary.perceptive_fuzziness,
        })
        .unwrap_or_default();
    // The projection's placeholder root name reads back as unnamed — a model
    // genuinely named "System" is indistinguishable and also reads back None.
    let name = root
        .map(|s| s.info.name.as_str())
        .filter(|n| !n.is_empty() && *n != "System")
        .map(str::to_string);

    CanvasModel {
        lens,
        things,
        relations,
        boundary,
        system_type: SystemType::default(),
        name,
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
            interface: false,
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
            klir_directed: false,
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
                boundary: Default::default(),
                system_type: Default::default(),
                name: None,
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
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
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
    fn to_canvas_loads_a_demo_faithfully() {
        // The reservoir demo: Watershed(Source) → Reservoir(Buffering) → Release(Sink).
        let json = include_str!("../../../assets/models/demos/reservoir.json");
        let model: WorldModel = serde_json::from_str(json).unwrap();
        let cm = to_canvas(&model);

        assert_eq!(cm.lens, Lens::Mobus); // demos are Operational
        // one component (Reservoir) + two environment things (Watershed, Release)
        let reservoir = cm
            .things
            .iter()
            .find(|t| t.name == "Reservoir")
            .expect("Reservoir component");
        assert_eq!(reservoir.role, Role::Component);
        assert_eq!(reservoir.primitive, Some(ProcessPrimitive::Buffering));
        assert!(cm.things.iter().any(|t| t.name == "Watershed" && t.role == Role::Environment));
        assert!(cm.things.iter().any(|t| t.name == "Release" && t.role == Role::Environment));
        // positions came through (not all at origin)
        assert!(cm.things.iter().any(|t| t.x != 0.0 || t.y != 0.0));
        // two relations, named, connecting real things
        assert_eq!(cm.relations.len(), 2);
        assert!(cm.relations.iter().all(|r| !r.name.is_empty()));

        // And it re-projects to a still-executable model (display-faithful round-trip).
        let back = project(&cm);
        assert!(
            bert_core::operational::validate_operational(&back).is_ok(),
            "reloaded demo should still project to an executable model"
        );
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
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
        };
        let wm = project(&model);
        assert_eq!(wm.environment.sources.len(), 1);
        assert_eq!(wm.environment.sinks.len(), 0);
    }
}
