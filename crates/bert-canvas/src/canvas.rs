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

use bert_core::validate::{validate_mode, Severity, ValidationIssue};
use bert_core::{
    AgentModel, Boundary, Complexity, Environment, ExternalEntity, ExternalEntityType, HcgsArchetype,
    Id, IdType, Info, Interaction, InteractionType, InteractionUsability, Interface, InterfaceType,
    Mode, ModelRef, ProcessPrimitive, Substance, SubstanceType, System, Transform2d, Vec2, WorldModel,
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

/// What the author declared an environment thing to be (#216).
///
/// SL gives three words for a thing outside the boundary and they are three
/// different commitments: `source` says it originates, `sink` says it terminates,
/// and `environment` says neither — it mediates, and flows may run both ways.
///
/// Before this existed, all three parsed to `Role::Environment` and the distinction
/// was destroyed at parse time. Two places downstream then re-derived it from flow
/// direction, and a derivation cannot recover what the parse discarded: `emit_sl`
/// wrote `source y` back over an authored `sink y`, and `project` typed a neutral
/// mediator as a `Source`, after which every flow *into* it was refused. The rules
/// doing the refusing are correct — they were checking a guess.
///
/// `Neutral` is the serde default, so a `CanvasModel` deserialized from JSON written
/// before this field existed loses any authored directional constraint rather than
/// gaining a false one. That widens what validates; it never invents an error.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, Default)]
pub enum EnvKind {
    /// `source` — originates flow. A flow into it contradicts the author.
    Source,
    /// `sink` — terminates flow. A flow out of it contradicts the author.
    Sink,
    /// `environment` — neither, by the author's own word. Flows run both ways.
    #[default]
    Neutral,
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

/// Klir's measurement scale for a variable's state set (§4, Table 4.1): the
/// level at which the values are comparable. Authored metadata on the source
/// system, read only in the Klir register — the kernel carries no scale.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScaleType {
    Nominal,
    Ordinal,
    Interval,
    Ratio,
}

/// Klir's basic-vs-supporting partition of the source variables (§4, Table 4.1):
/// basic variables are the observed quantities; supporting variables encode the
/// support set (time, space, population) the basic states range over. This is a
/// SEMANTIC role the modeler declares, not a property readable off R — an
/// isolated variable is not thereby a support, and a coupled one is not thereby
/// basic. Authored Klir metadata, read only in the register; the kernel carries
/// none. `None` reads as `Basic` (the overwhelming default — a canvas variable
/// is normally an observed quantity), so an explicit `Support` is the rare
/// declared case and old models stay byte-identical.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum KlirVarKind {
    Basic,
    Support,
}

/// Klir's epistemological hierarchy (§4.5): the level at which a model claims
/// to stand — source (variables and observation channels), data (observed
/// states over a support), generative (a rule producing the data), structure
/// (coupled subsystems), metasystem (a rule for how the rule changes). The
/// modeling relation is defined only WITHIN a level (§5.4), which is what the
/// cross-level refusal in `lenses::check_cross_level` enforces (#288). A
/// declared claim, never derived — the ladder ([`crate::lenses::klir_ladder`])
/// reads the honest position off the model; this is what the author asserts.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum KlirLevel {
    Source,
    Data,
    Generative,
    Structure,
    Metasystem,
}

fn kind_to_substance(k: Kind) -> SubstanceType {
    match k {
        Kind::Matter => SubstanceType::Material,
        Kind::Informational => SubstanceType::Message,
        Kind::Energy | Kind::Field | Kind::Unspecified => SubstanceType::Energy,
    }
}

/// A reference from a component to the child model that realizes it (SL's
/// `decomposes` clause; bert-lenses#89 step 4). Two halves: a human `name` label
/// (may drift harmlessly across renames) and the stamped `id` — the stable key,
/// the same `ModelRef` the kernel carries in [`bert_core::System::child_model`].
/// The kernel stores only the id; the name is the surface layer's readability
/// affordance, so a reference reconstructed from a kernel model (`to_canvas`)
/// carries the component's own name as its label.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct ChildRef {
    pub name: String,
    pub id: ModelRef,
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
    /// The author's own word for an environment thing (#216). Meaningless on a
    /// component, which is why it is a separate field rather than a `Role` variant:
    /// inside-or-outside the boundary and what-the-author-declared are different
    /// questions, and only the second one has a neutral answer.
    #[serde(default)]
    pub env_kind: EnvKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub primitive: Option<ProcessPrimitive>,
    /// Authored interface designation — this component is a member of the root
    /// membrane's I (I ⊆ C, Boundary.lean / Tuple.lean). A flowless designation
    /// is authorable, and refused at Operational: `Tuple.lean` gained the
    /// coverage constraint from interfaces onto flows in SSF #31. Ignored on env
    /// things (their internals are opaque, §4.3.3.2.2).
    #[serde(default)]
    pub interface: bool,
    /// The child model this component decomposes into, by reference (SL's
    /// `decomposes`; bert-lenses#89 step 4). `None` for atomic components and
    /// every model authored before step 4; `skip_serializing_if` so those stay
    /// byte-identical on disk. Projects to [`bert_core::System::child_model`]
    /// (the id only); ignored on env things (their internals are opaque).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub child_model: Option<ChildRef>,
    /// The stock's declared unit (bert-lenses#76/#94) — meaningful on a
    /// Buffering component, whose stock accumulates its inflow over Δt and so
    /// carries its own unit rather than inheriting the flow's. Set by the run
    /// panel's accept-derived-unit affordance (or SL's `stock` clause); empty =
    /// undeclared (the run derives a display unit and marks its provenance).
    /// `skip` when empty so existing models serialize unchanged.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub stock_unit: String,
    /// Klir's measurement scale for this variable (§4, Table 4.1) — nominal,
    /// ordinal, interval, or ratio. Authored source-system metadata read only
    /// in the Klir register; the kernel carries no scale, so this never
    /// projects. `None` for every model authored before this field;
    /// `skip_serializing_if` keeps those byte-identical on disk.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub scale: Option<ScaleType>,
    /// The variable's state set — the values it can take (Klir's source-system
    /// state set, §4). Enumerated labels, the FSA-native case (`{Green, Yellow,
    /// Red}`). Authored Klir metadata, never projected to the kernel. `None`
    /// (not `Some(vec![])`) when undeclared, `skip` so old models stay
    /// byte-identical.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub states: Option<Vec<String>>,
    /// Klir's basic-vs-supporting standing for this variable (§4, Table 4.1).
    /// AUTHORED, not derived: support-hood is a semantic role (does this variable
    /// index the support set, or is it an observed quantity?), which cannot be
    /// read off R. `None` reads as `Basic`; `skip` so undeclared/basic variables
    /// stay byte-identical on disk.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub variable_kind: Option<KlirVarKind>,
    /// [`AgentModel::cognitive_params`], carried OPAQUELY (#216). The canvas
    /// neither edits nor interprets these — they are an untyped bag because
    /// nothing has yet chosen the transition functor, and a functor's parameters
    /// cannot be typed before the functor is (#112, where their typed form is
    /// scoped). What the canvas must not do is *discard* them: dropping the bag
    /// on load is how a demo round-tripped into a different system while still
    /// reporting `conserved=true`. SL cannot express them, and `emit_sl` refuses
    /// rather than narrowing silently (§7.3). Empty = absent, `skip` on disk.
    #[serde(default, skip_serializing_if = "std::collections::HashMap::is_empty")]
    pub cognitive_params: std::collections::HashMap<String, f64>,
    /// [`AgentModel::initial_state`], carried OPAQUELY (#216) — same standing,
    /// same #112 boundary, same emit refusal as `cognitive_params` above.
    #[serde(default, skip_serializing_if = "std::collections::HashMap::is_empty")]
    pub initial_state: std::collections::HashMap<String, serde_json::Value>,
    /// [`AgentModel::agency_capacity`], carried opaquely with the bags (#216):
    /// the operational spec reads it as the process's engine parameter
    /// (`node.param` in bert-compose), so dropping it changed a Modulating
    /// valve's factor from an authored 0.2 to the 0.5 default and the run with
    /// it. `None` = unauthored; only projection supplies the kernel default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub agency_capacity: Option<f32>,
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
    /// Per-transition weight for the #67 DTMC read (`markov_edges`). A
    /// non-negative integer COUNT, matching SSF's `kindCodomain .markov =
    /// List (X × Nat)`: `Chain::from_edges` normalizes a state's out-edge counts
    /// into its row distribution, so a count and a probability reduce to the same
    /// `P`. `None` reads as the uniform default `1`; `skip` keeps every model
    /// authored before this field byte-identical on disk.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub weight: Option<u64>,
    /// The flow's magnitude — [`bert_core::Interaction::amount`], which the
    /// kernel has carried from the beginning and this struct dropped, capping
    /// every canvas-authored model at emission rate 1.0 (#216, C1). A structural
    /// attribute of the edge, not dynamics: it does not vary during a run.
    /// `None` = unauthored — a different statement from "declared 1", and the
    /// file keeps the difference; only [`project`] conflates them (declared
    /// there). `skip` keeps pre-#216 models byte-identical on disk.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub amount: Option<bert_core::rust_decimal::Decimal>,
    /// The magnitude's unit — [`bert_core::Interaction::unit`] (#216, C1).
    /// Empty = undeclared.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub unit: String,
    /// What flows, named separately from what the flow is *called* —
    /// [`bert_core::Substance::sub_type`] (#216, C4). "F-1.1 — iron-input" is a
    /// label; `iron` is a substance, and `check_stock_dimensions` reasons over
    /// the latter. Empty = undeclared.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub substance: String,
    /// `ample` (#9) — see [`bert_core::Interaction::ample`]: an availability
    /// assertion on an informational flow; no magnitude. The SL parser refuses
    /// it with `amount`/`unit`, on `mere`, and on non-informational kinds.
    /// `skip` keeps pre-existing models byte-identical on disk.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub ample: bool,
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

/// What a declared parameter is anchored to. A param never stores a value —
/// the value IS the anchored declared amount; the param names it in the
/// model's own domain terms (walkthrough #18). Anchors are by id, so a rename
/// of a thing or flow label cannot orphan a param mid-session; SL resolves
/// names to ids at parse time and emits names back from ids.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum ParamAnchor {
    /// One declared flow amount (`Relation::amount`).
    Flow { relation: u64 },
    /// A process's whole out-fanout of declared amounts, presented as % shares.
    /// Normalization is presentation: the engine keeps raw weights (Mobus
    /// Eq. 4.5 is scale-free), and editing one share edits one raw weight.
    Shares { thing: u64 },
}

/// An author-declared adjustable quantity, named in the model's domain
/// vocabulary rather than the kernel's mechanism taxonomy. The #268 inputs
/// panel remains the floor for undeclared magnitudes; a param enriches how a
/// declared amount is presented, never what runs. Names are unique — they are
/// the stable references scenario overrides (#202) will hold.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct ParamDecl {
    pub name: String,
    pub anchor: ParamAnchor,
    /// Inclusive slider bounds for a `Flow` anchor. Declared, not enforced by
    /// the engine: the range is the author's statement of the sensible span,
    /// and a declared amount outside it is a parse-time contradiction.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub range: Option<ParamRange>,
}

/// Inclusive bounds, in the anchored flow's own unit.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq)]
pub struct ParamRange {
    pub min: bert_core::rust_decimal::Decimal,
    pub max: bert_core::rust_decimal::Decimal,
}

/// What a declared metric computes over the run's trace (#203). The verb set
/// is deliberately CLOSED and grows one checkable verb at a time — each new
/// verb owes a separating instance a model can actually fail (ADR 0006), which
/// is the repo's alternative to an open expression language nothing can
/// refuse. Anchors are by id, like [`ParamAnchor`], so renames cannot orphan a
/// metric mid-session; SL resolves names to ids at parse time and emits names
/// back from ids.
#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum MetricExpr {
    /// This flow's per-tick value as a fraction of everything leaving its
    /// source that tick. Composition, stated in the author's words — and
    /// written to survive #269: when the split becomes agent-chosen, the same
    /// declaration reads a PRODUCED share with no rewrite.
    ShareOfFlow { relation: u64 },
    /// Everything arriving at this thing, per tick, plus the run-end
    /// cumulative. Throughput, stated in the author's words.
    SumInto { thing: u64 },
}

/// An author-declared readout computed over a run — the OUTPUT twin of
/// [`ParamDecl`] (#203): a param names an input in the model's domain
/// vocabulary, a metric names what the author wants to watch come out. A
/// metric is a derived reading of kernel-executed values, never a new source
/// of truth: it carries the provenance of the trace it reads, and nothing
/// else. Names are unique — they are the stable references the scenario
/// comparison view (#202) will hold.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct MetricDecl {
    pub name: String,
    pub expr: MetricExpr,
}

/// The canvas editing model — the JSON the React canvas holds and sends.
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CanvasModel {
    pub lens: Lens,
    /// The model's stable self-identity, carried through the canvas seam so a
    /// walked child re-projects under the SAME id its parent references
    /// (bert-lenses#89 step 5b) — without this, every edit-and-save of a child
    /// would break the parent's `decomposes` stamp. Carried, never minted:
    /// `to_canvas` copies it in, `project` writes it back, and a model without
    /// one stays without one (`skip_serializing_if` keeps old files identical).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_id: Option<bert_core::ModelId>,
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
    /// The model's time-unit symbol (bert-lenses#94) — what one unit of model
    /// time is called (`"h"`, `"mo"`). Projects to [`WorldModel::time_unit`],
    /// where the run's derived-stock-unit display reads it (`kW` inflow →
    /// `kW·h` instead of the abstract `kW·Δt`). `None` = undeclared; `skip` so
    /// pre-existing models serialize unchanged.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time_unit: Option<String>,
    /// Declared parameters (walkthrough #18) — domain names over declared
    /// amounts. Presentation-layer semantics: `project` ignores them, the run
    /// panel reads them. `skip` when empty so pre-existing models stay
    /// byte-identical on disk (the #163 pattern).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub params: Vec<ParamDecl>,
    /// Declared metrics (#203) — domain names over computed OUTPUTS of the
    /// trace, the output twin of `params`. Presentation-layer semantics:
    /// `project` ignores them, the run deck evaluates them over the recorder.
    /// `skip` when empty so pre-existing models stay byte-identical on disk
    /// (the #163 pattern).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub metrics: Vec<MetricDecl>,
    /// The model's declared Klir epistemological level (#288) — the author's
    /// claim about where on the §4.5 hierarchy this model stands. Authored
    /// metadata read in the Klir register only; `project` never reads it, so
    /// no systemhood verdict depends on it (C2). `None` = undeclared, which
    /// gates nothing; `skip` so pre-existing models serialize unchanged.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub klir_level: Option<KlirLevel>,
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
        child_model: None,
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
                // The `decomposes` reference carries its id into the kernel; the
                // human label stays surface-side (the kernel keys on the id).
                if let Some(child) = &t.child_model {
                    systems.last_mut().unwrap().child_model = Some(child.id);
                }
                // A declared stock unit rides the agent record (bert-lenses#76/#94).
                // The agent normally exists iff a primitive was authored; a unit
                // declared without one still projects (a default AgentModel is
                // additive — serde skips its every unset field), so the accept
                // affordance can never silently drop an author's declaration.
                if !t.stock_unit.is_empty() {
                    let sys = systems.last_mut().unwrap();
                    sys.agent
                        .get_or_insert_with(AgentModel::default)
                        .stock_unit = t.stock_unit.clone();
                }
                // The opaque engine-parameter bags ride the same agent record
                // (#216): the canvas carries them without interpreting them,
                // so a loaded model's dynamical content survives projection.
                if !t.cognitive_params.is_empty()
                    || !t.initial_state.is_empty()
                    || t.agency_capacity.is_some()
                {
                    let agent = systems
                        .last_mut()
                        .unwrap()
                        .agent
                        .get_or_insert_with(AgentModel::default);
                    agent.cognitive_params = t.cognitive_params.clone();
                    agent.initial_state = t.initial_state.clone();
                    if let Some(ac) = t.agency_capacity {
                        agent.agency_capacity = ac;
                    }
                }
                if t.interface {
                    designated.push((systems.len() - 1, t.id, &t.name));
                }
                id_map.insert(t.id, id);
            }
            Role::Environment => {
                if !touched.contains(&t.id) {
                    continue; // an untouched env dot would be an orphan terminal
                }
                // The author's word decides, with the derivation only as a fallback
                // for a neutral thing (#216). A `WorldModel` has no neutral external
                // — sources and sinks are separate arrays — so a mediator must still
                // be filed on one side. Filing it is harmless; what was harmful was
                // treating the filing as an authored claim and refusing flows that
                // contradicted it. `check_flow_direction` in bert-core now gates on
                // `authored_direction`, so a Neutral thing accepts both.
                let is_source = match t.env_kind {
                    EnvKind::Source => true,
                    EnvKind::Sink => false,
                    EnvKind::Neutral => originates.contains(&t.id),
                };
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
                    // Only a `source`/`sink` declaration is the author's claim; a
                    // neutral `environment` thing is merely filed on one side
                    // because a WorldModel has no neutral external (#216).
                    authored_direction: t.env_kind != EnvKind::Neutral,
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
    // A flowless entry projects, but no longer validates: SSF #31 added the
    // converse coverage constraint (every interface carries a boundary-crossing
    // flow), so `check_interfaces_carry_flow` refuses it at Operational. The
    // projection stays faithful to what was authored and lets the kernel judge.
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
                sub_type: r.substance.clone(),
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
            // A declared narrowing: the kernel has no "unauthored" amount, so
            // None becomes the kernel default ONE here — and a model read back
            // by `to_canvas` therefore returns Some(1), not None (#216).
            amount: r.amount.unwrap_or(bert_core::rust_decimal::Decimal::ONE),
            unit: r.unit.clone(),
            ample: r.ample,
            parameters: vec![],
            smart_parameters: vec![],
            endpoint_offset: None,
        });
    }

    let world = WorldModel {
        version: 1,
        model_id: model.model_id,
        mode: Some(model.lens.mode()),
        environment: Environment {
            info: info(env_id, -1, "Environment"),
            sources,
            sinks,
        },
        systems,
        interactions,
        hidden_entities: vec![],
        reachability_requirements: vec![],
        // The declared time-unit symbol crosses the seam verbatim (an empty or
        // whitespace-only declaration reads as undeclared).
        time_unit: model
            .time_unit
            .as_deref()
            .map(str::trim)
            .filter(|t| !t.is_empty())
            .map(str::to_string),
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
///
/// Decomposition (`System::child_model`) is now PRESERVED (bert-lenses#89 step
/// 4): a level-1 system carrying a `child_model` reference reconstructs a
/// [`ChildRef`] on its component thing, so the reference survives into SL's
/// `decomposes` clause instead of being silently dropped. The kernel stores only
/// the id, so the reconstructed label is the component's own name (the label may
/// drift; the id is the key). This is what lifted the `assert_sl_expressible`
/// guard the shipping `to_canvas` wasm entry used to enforce.
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
            // Meaningless on a component; the field only speaks for env things.
            env_kind: EnvKind::default(),
            primitive: s.agent.as_ref().and_then(|a| a.primitive),
            // parent_interface is the designation's inverse: a level-1 system
            // attached to a root-membrane interface IS a designated member of I.
            interface: s.boundary.parent_interface.is_some(),
            // The kernel keys decomposition on the id alone; label the
            // reconstructed reference with the component's own name.
            child_model: s.child_model.map(|id| ChildRef {
                name: if s.info.name.is_empty() {
                    bert_core::model_id::encode_uuid(&id.as_uuid())
                } else {
                    s.info.name.clone()
                },
                id,
            }),
            stock_unit: s
                .agent
                .as_ref()
                .map(|a| a.stock_unit.clone())
                .unwrap_or_default(),
            // Klir source-system metadata lives only canvas-side; the kernel
            // carries none, so a reconstructed thing has neither.
            scale: None,
            states: None,
            variable_kind: None,
            // The engine-parameter bags cross the seam opaquely in both
            // directions (#216). What this load still narrows, declared:
            // `process_configs` and `network_config` are NOT carried — no
            // shipped model uses them, and #112 owns their typed future.
            cognitive_params: s
                .agent
                .as_ref()
                .map(|a| a.cognitive_params.clone())
                .unwrap_or_default(),
            initial_state: s
                .agent
                .as_ref()
                .map(|a| a.initial_state.clone())
                .unwrap_or_default(),
            agency_capacity: s.agent.as_ref().map(|a| a.agency_capacity),
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
            // Loading a WorldModel back: the kernel keeps sources and sinks in
            // separate arrays, so a declared direction is recoverable here even
            // though neutrality is not — a WorldModel cannot represent it (#216).
            env_kind: match e.ty {
                ExternalEntityType::Source => EnvKind::Source,
                ExternalEntityType::Sink => EnvKind::Sink,
            },
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
            weight: None,
            // The kernel cannot say "unauthored", so a reloaded model reads
            // every quantity as declared — Some even where the author wrote
            // nothing. The inverse narrowing to project()'s, equally declared.
            amount: Some(ix.amount),
            unit: ix.unit.clone(),
            substance: ix.substance.sub_type.clone(),
            ample: ix.ample,
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
        model_id: model.model_id,
        things,
        relations,
        boundary,
        system_type: SystemType::default(),
        name,
        time_unit: model.time_unit.clone(),
        // Params and metrics are canvas-resident presentation semantics; a
        // WorldModel never carried them, so a model born from kernel JSON
        // starts bare.
        params: vec![],
        metrics: vec![],
        klir_level: None,
    }
}

/// Derive the newborn child of the canvas component `thing_id` — the door's
/// canvas half (bert-lenses#89 step 5b). Projects the editing model and hands
/// the projected component to [`bert_core::decomposition::derive_child`], which
/// derives G′, mints the child's identity, and judges eligibility (interface
/// components refuse under the v1 narrowing). The caller saves the returned
/// model and stamps the parent's `child_model` reference — stamping is tooling,
/// never done here.
pub fn decompose_thing(
    model: &CanvasModel,
    thing_id: u64,
) -> Result<WorldModel, Vec<ValidationIssue>> {
    let p = project_with_map(model);
    match p.thing_ids.get(&thing_id) {
        Some(comp) => bert_core::decomposition::derive_child(&p.world, comp),
        None => Err(vec![ValidationIssue {
            severity: bert_core::validate::Severity::Error,
            location: format!("thing {thing_id}"),
            message: "nothing to decompose here: the selected element does not project as a \
                      model relatum"
                .to_string(),
            suggestion: Some("Select a component of the model".to_string()),
            doc: Some(bert_core::validate::doc::DECOMPOSITION.to_string()),
            subject: None,
        }]),
    }
}

/// Does this issue belong at the connection gesture?
///
/// Two things keep an issue here. A refusal always does — a `Severity::Error`
/// is the kernel declaring the edge illegal, and no refusal is ever deferred.
/// Otherwise the `location` decides: node-scoped checks address `systems[i]…`
/// (dead ends, reachability), while relation- and mode-scoped ones address
/// `interactions[i]` or `mode/…` (self-loops, duplicate edges, the Bunge
/// bond). Nothing is re-tagged; this only reads the coordinate and the rating
/// the check already wrote.
///
/// One refusal is exempt, and the exemption is the point of #213: the
/// flowless-interface Error (`interfaces_carry_flow`, SSF #31) is a claim about
/// a designation, not about an edge. The stamp is made BEFORE the crossing flow
/// is drawn, so every model passes through the refused state on the way to a
/// legal one — carrying it to the gesture would refuse a half-drawn model for
/// being half-drawn, the #212 defect again with a different check. It is
/// audit-time only. Nothing is lost: `analyze` runs the full set, so Review
/// still shows it.
///
/// Its #225 sibling — a declared `receives_from`/`exports_to` no interaction
/// records — is exempt for the same reason. The projection derives the
/// declaration from the bonds, so it cannot fire on a canvas model at all; on
/// any path that writes the declaration directly the declaration precedes the
/// flow, and refusing the drag would be #212 a fourth time.
fn belongs_at_the_gesture(issue: &ValidationIssue) -> bool {
    if bert_core::validate::is_interface_flow_refusal(issue)
        || bert_core::validate::is_interface_declaration_refusal(issue)
    {
        return false;
    }
    issue.severity == Severity::Error || !issue.location.starts_with("systems")
}

/// Validate a proposed connection against the current lens: project the model
/// WITH the candidate, run `validate_mode(lens.mode())`, and return the issues
/// the candidate INTRODUCED (a self-loop at Mobus, an unbonded aggregate at
/// Bunge, …). Empty = the connection is legal at this lens. React calls this per
/// drag; it decides nothing itself.
///
/// The question here is "is this edge legal", not "is this model finished".
/// Node-scoped OBSERVATIONS are dropped: the first edge into a node
/// structurally always makes it a dead end, and that clears itself once the
/// node's outflow is drawn. Refusals are never dropped, wherever they sit. No
/// verdict changes and no check is removed — `analyze` still runs the whole
/// set, so every deferred observation stays visible in the audit.
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
        .filter(belongs_at_the_gesture)
        .collect()
}

/// Read a model AS A KLIR STATE MACHINE for the #67 DTMC run: its things are the
/// states `T`, its directed relations are the transitions `R`. Returns the state
/// labels and the weighted edges (`from_index`, `to_index`, `weight`) a
/// [`bert_compose::markov::Chain`] consumes.
///
/// This reads the Klir `(T, R)` structure DIRECTLY — it never projects to a
/// `WorldModel` or calls `validate_operational`, so the Mobus irreflexivity gate
/// (`k ≠ o`, which refuses self-loops entering Operational mode) is bypassed
/// entirely. A self-loop `a → a` is a legal, ordinary transition here (a state
/// that stays put), as it is at Klir/Core. Feedback-as-a-first-class-cycle is
/// Cybernetic mode's future seat; Klir carries it for now.
///
/// Each edge carries its authored [`Relation::weight`] count; an unweighted
/// transition reads as the uniform default `1`. `Chain::from_edges` normalizes a
/// state's out-edge counts into its row distribution, so authoring `weight 3`
/// vs `weight 1` on a state's two successors biases its split 3:1.
pub fn markov_edges(model: &CanvasModel) -> (Vec<String>, Vec<(usize, usize, u64)>) {
    use std::collections::HashMap;
    let states: Vec<String> = model.things.iter().map(|t| t.name.clone()).collect();
    let index: HashMap<u64, usize> = model
        .things
        .iter()
        .enumerate()
        .map(|(i, t)| (t.id, i))
        .collect();
    let edges = model
        .relations
        .iter()
        .filter_map(|r| {
            let &i = index.get(&r.a)?;
            let &j = index.get(&r.b)?;
            Some((i, j, r.weight.unwrap_or(1)))
        })
        .collect();
    (states, edges)
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
    fn bond(id: u64, a: u64, b: u64) -> Relation {
        Relation {
            id,
            a,
            b,
            name: String::new(),
            is_bond: true,
            kind: Kind::Unspecified,
            klir_directed: false,
            weight: None,
            amount: None,
            unit: String::new(),
            substance: String::new(),
            ample: false,
        }
    }

    /// Law: `markov_edges` reads a Klir state machine's things as states and its
    /// directed relations as transitions — self-loops included, with no
    /// projection and no Operational gate. The parity automaton (each state with
    /// a self-loop `0` and a cross-edge `1`) reads back as the four expected
    /// edges over two states.
    #[test]
    fn markov_edges_reads_klir_state_machine_with_self_loops() {
        let model = CanvasModel {
            lens: Lens::Klir,
            model_id: None,
            things: vec![
                thing(1, "Even", Role::Component),
                thing(2, "Odd", Role::Component),
            ],
            // Self-loops (1→1, 2→2) are legal Klir transitions; they would be
            // refused entering Operational mode, which this path never touches.
            relations: vec![
                bond(10, 1, 2), // Even --1--> Odd
                bond(11, 1, 1), // Even --0--> Even (self-loop)
                bond(12, 2, 1), // Odd  --1--> Even
                bond(13, 2, 2), // Odd  --0--> Odd  (self-loop)
            ],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        let (states, edges) = markov_edges(&model);
        assert_eq!(states, vec!["Even".to_string(), "Odd".to_string()]);
        assert_eq!(
            edges,
            vec![(0, 1, 1), (0, 0, 1), (1, 0, 1), (1, 1, 1)],
            "uniform-weighted edges, self-loops kept"
        );
    }

    /// Law: two components joined by a bond project to a legal (error-free)
    /// world at every lens — Klir, Bunge, and Mobus alike.
    #[test]
    fn projects_a_bonded_pair_cleanly_at_every_lens() {
        for lens in [Lens::Klir, Lens::Bunge, Lens::Mobus] {
            let model = CanvasModel {
                lens,
                model_id: None,
                things: vec![
                    thing(1, "A", Role::Component),
                    thing(2, "B", Role::Component),
                ],
                relations: vec![bond(10, 1, 2)],
                boundary: Default::default(),
                system_type: Default::default(),
                name: None,
                time_unit: None,
                params: vec![],
                metrics: vec![],
                klir_level: None,
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

    /// Law: a self-loop (k = o) is illegal at Mobus's irreflexivity gate but
    /// legal at Klir — Core has no such gate.
    #[test]
    fn self_loop_is_rejected_at_mobus_but_not_klir() {
        let model = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![thing(1, "A", Role::Component), thing(2, "B", Role::Component)],
            relations: vec![bond(10, 1, 2)],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
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

    /// Law: the FIRST edge between two fresh components is legal at Mobus. It
    /// necessarily makes the sink a dead end, but that is a whole-model
    /// observation about an unfinished model, not a statement about the edge.
    #[test]
    fn first_edge_carries_no_gesture_time_issue_at_mobus() {
        let model = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![thing(1, "S", Role::Component), thing(2, "H", Role::Component)],
            relations: vec![],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        let issues = validate_connection(&model, &bond(10, 1, 2));
        assert!(issues.is_empty(), "S → H must connect: {issues:?}");
    }

    /// Law: the dead-end observation the gesture defers is not lost — `analyze`
    /// still reports it, as a Warning, on the model the edge produced.
    #[test]
    fn deferred_dead_end_still_reaches_the_audit() {
        let model = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![thing(1, "S", Role::Component), thing(2, "H", Role::Component)],
            relations: vec![bond(10, 1, 2)],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        let audit = crate::lenses::analyze(&model, Lens::Mobus);
        let hit = audit
            .validation
            .issues
            .iter()
            .find(|i| i.message.contains("no outgoing transitions"))
            .expect("the audit keeps the dead-end observation");
        assert_eq!(hit.severity, Severity::Warning);
        assert!(hit.location.starts_with("systems"), "node-scoped: {hit:?}");
    }

    /// Law: relation-scoped observations stay at gesture time. A second
    /// identical edge is a duplicate — a Warning the drawer should see as the
    /// edge lands, not an observation deferred to the audit.
    #[test]
    fn duplicate_edge_stays_a_gesture_time_warning() {
        let model = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![
                thing(1, "S", Role::Component),
                thing(2, "H", Role::Component),
                thing(3, "T", Role::Component),
            ],
            relations: vec![bond(10, 1, 2), bond(11, 2, 3)],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        let issues = validate_connection(&model, &bond(12, 1, 2));
        let dup = issues
            .iter()
            .find(|i| i.message.contains("duplicate edge"))
            .expect("the duplicate is named at gesture time");
        assert_eq!(dup.severity, Severity::Warning);
        assert!(dup.location.starts_with("interactions"), "relation-scoped: {dup:?}");
    }

    /// Law: only OBSERVATIONS defer. A node-located refusal (the stock/inflow
    /// dimension Error is the one the kernel can raise at `systems[i].…`) still
    /// belongs at the gesture — location defers a Warning, never an Error.
    #[test]
    fn a_node_located_error_still_belongs_at_the_gesture() {
        let at = |severity, location: &str| ValidationIssue {
            severity,
            location: location.to_string(),
            message: String::new(),
            suggestion: None,
            doc: None,
            subject: None,
        };
        assert!(belongs_at_the_gesture(&at(
            Severity::Error,
            "systems[0].agent.stock_unit"
        )));
        assert!(!belongs_at_the_gesture(&at(Severity::Warning, "systems[0]")));
        assert!(belongs_at_the_gesture(&at(
            Severity::Warning,
            "interactions[0]"
        )));
        assert!(belongs_at_the_gesture(&at(Severity::Error, "mode/Structural")));
    }

    /// Law (#213 / SSF #31): a component stamped `interface` with no crossing
    /// flow is REFUSED at Operational. The refusal is the kernel's, addressed to
    /// the interface's own path, and it names the designated component.
    #[test]
    fn flowless_interface_is_refused_at_operational() {
        let mut a = thing(1, "Gate", Role::Component);
        a.interface = true;
        let model = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![a, thing(2, "Core", Role::Component)],
            relations: vec![bond(10, 1, 2)],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        let world = project(&model);
        let report = validate_mode(&world, bert_core::Mode::Operational);
        let hit = report
            .issues
            .iter()
            .find(|i| bert_core::validate::is_interface_flow_refusal(i))
            .expect("Operational refuses the flowless interface");
        assert_eq!(hit.severity, Severity::Error);
        assert_eq!(hit.location, "systems[0].boundary.interfaces[0]");
        assert!(hit.message.contains("Gate"), "names the designation: {hit:?}");

        // Structural is Bunge's mode and Core is Klir's; neither runs the check.
        for quiet in [bert_core::Mode::Core, bert_core::Mode::Structural] {
            assert!(
                !validate_mode(&world, quiet)
                    .issues
                    .iter()
                    .any(bert_core::validate::is_interface_flow_refusal),
                "{quiet:?} must be unaffected"
            );
        }
    }

    /// Law (#213, the load-bearing half): that refusal never reaches the
    /// connection gesture. The stamp precedes the flow, so every model passes
    /// through the refused state on the way to a legal one — blocking here would
    /// refuse a half-drawn model for being half-drawn (#212). The edge lands;
    /// the audit still carries the refusal.
    #[test]
    fn flowless_interface_refusal_never_blocks_a_connection() {
        let mut a = thing(1, "Gate", Role::Component);
        a.interface = true;
        let model = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![a, thing(2, "Core", Role::Component)],
            relations: vec![],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        let issues = validate_connection(&model, &bond(10, 1, 2));
        assert!(
            issues.is_empty(),
            "stamping then connecting must still connect: {issues:?}"
        );

        let mut drawn = model.clone();
        drawn.relations.push(bond(10, 1, 2));
        assert!(
            crate::lenses::analyze(&drawn, Lens::Mobus)
                .validation
                .issues
                .iter()
                .any(bert_core::validate::is_interface_flow_refusal),
            "the audit keeps the refusal the gesture deferred"
        );
    }

    /// Law (#213 step 3): Shingai's reported workflow, end to end. Place a
    /// component, stamp it `interface`, then drag a flow in from an environment
    /// object — which is now a drop on the PORT, resolved to its component. The
    /// edge must land. This is the shape the canvas actually produces (exo, not
    /// the endo bond the sibling law uses), so the deferral is proven on the
    /// gesture the user performs, not only on a nearby one.
    #[test]
    fn the_env_to_stamped_interface_flow_connects() {
        let mut gate = thing(1, "Gate", Role::Component);
        gate.interface = true;
        let model = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![gate, thing(2, "Core", Role::Component), thing(3, "Supply", Role::Environment)],
            relations: vec![bond(10, 1, 2)],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        let issues = validate_connection(&model, &bond(11, 3, 1));
        assert!(
            issues.is_empty(),
            "the crossing flow onto the stamped interface must land: {issues:?}"
        );

        // And once it lands the designation is satisfied — the audit goes quiet.
        let mut drawn = model.clone();
        drawn.relations.push(bond(11, 3, 1));
        assert!(
            !crate::lenses::analyze(&drawn, Lens::Mobus)
                .validation
                .issues
                .iter()
                .any(bert_core::validate::is_interface_flow_refusal),
            "a flow now crosses at Gate; the refusal must clear"
        );
    }

    /// Law: the deferral is a property of the check, not of the dedup that
    /// happens to hide it — `belongs_at_the_gesture` drops the refusal outright,
    /// while every other node-located Error stays.
    #[test]
    fn the_interface_refusal_is_dropped_at_the_gesture_by_rule() {
        let at = |location: &str| ValidationIssue {
            severity: Severity::Error,
            location: location.to_string(),
            message: String::new(),
            suggestion: None,
            doc: None,
            subject: None,
        };
        assert!(!belongs_at_the_gesture(&at("systems[0].boundary.interfaces[0]")));
        assert!(!belongs_at_the_gesture(&at(
            "systems[0].boundary.interfaces[0].exports_to"
        )));
        assert!(!belongs_at_the_gesture(&at(
            "systems[0].boundary.interfaces[0].receives_from"
        )));
        assert!(belongs_at_the_gesture(&at("systems[0].agent.stock_unit")));
        assert!(belongs_at_the_gesture(&at(
            "systems[0].boundary.interfaces[0].info.id"
        )));
    }

    /// Law: `to_canvas` reads a real WorldModel back faithfully (roles,
    /// primitives, positions, named relations survive), and re-projecting the
    /// result still validates as an executable Operational model.
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

    /// Law: an environment thing's Source/Sink identity is derived from bond
    /// direction (originates → Source, receives → Sink), never a stored type.
    #[test]
    fn environment_projects_by_bond_direction() {
        // env originates a bond → Source; env receives → Sink.
        let model = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![
                thing(1, "Env", Role::Environment),
                thing(2, "Comp", Role::Component),
            ],
            relations: vec![bond(10, 1, 2)], // Env → Comp
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        let wm = project(&model);
        assert_eq!(wm.environment.sources.len(), 1);
        assert_eq!(wm.environment.sinks.len(), 0);
    }

    /// Law: a model's stable identity survives the canvas round trip — carried,
    /// never minted (a model without one stays without one). Without this, every
    /// edit-and-save of a walked child would orphan its parent's reference.
    #[test]
    fn model_id_survives_the_canvas_round_trip() {
        let mut world = project(&CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![thing(1, "A", Role::Component), thing(2, "B", Role::Component)],
            relations: vec![bond(10, 1, 2)],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        });
        assert!(world.model_id.is_none(), "the canvas never mints");
        let id = world.mint_id();
        let cm = to_canvas(&world);
        assert_eq!(cm.model_id, Some(id), "to_canvas carries the identity in");
        assert_eq!(project(&cm).model_id, Some(id), "project writes it back");
    }

    /// Law: the door refuses through the kernel — an interior component derives
    /// a child that is born passing its own seam; an environment thing refuses
    /// with a defined issue, never a panic.
    #[test]
    fn decompose_thing_derives_a_passing_child() {
        // Src(env) → A → B → Snk(env): A and B are boundary components (v1
        // refuses), so add interior C between them: A → C → B.
        let model = CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things: vec![
                thing(1, "Src", Role::Environment),
                thing(2, "A", Role::Component),
                thing(3, "C", Role::Component),
                thing(4, "B", Role::Component),
                thing(5, "Snk", Role::Environment),
            ],
            relations: vec![bond(10, 1, 2), bond(11, 2, 3), bond(12, 3, 4), bond(13, 4, 5)],
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
            metrics: vec![],
            klir_level: None,
        };
        let child = decompose_thing(&model, 3).expect("interior component derives");
        assert!(child.model_id.is_some(), "the child is born nameable");
        assert_eq!(child.systems[0].info.name, "C");
        let p = project_with_map(&model);
        let issues = bert_core::decomposition::check_decomposition_contract(
            &p.world,
            &p.thing_ids[&3],
            &child,
        );
        assert!(issues.is_empty(), "newborn seam must hold: {issues:?}");

        let refused = decompose_thing(&model, 1).err().expect("env thing refuses");
        assert!(refused[0].message.contains("not a component"), "{refused:?}");
        let missing = decompose_thing(&model, 99).err().expect("unknown id refuses");
        assert!(missing[0].message.contains("nothing to decompose"), "{missing:?}");
    }
}
