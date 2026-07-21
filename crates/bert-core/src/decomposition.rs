//! Decomposition boundary contract — the pairwise seam check (bert-lenses#89, step 2).
//!
//! A decomposed component (`System.child_model = Some(ModelRef)`) points, by
//! reference, at a child `WorldModel` that expands its interior. This module is
//! the kernel half of that mechanism: given a parent model, the chosen
//! component, and the ALREADY-RESOLVED child model, it checks the boundary
//! contract and surfaces every violation as a [`ValidationIssue`]. It does NO
//! I/O — resolution (browser storage / files → the referent) is the store
//! layer's job (foundations doc §7.5); a missing referent is a defined issue
//! produced by [`check_decomposition`], never a silent drop and never a file read.
//!
//! The check is a LITERAL transcription of the merged Lean spec
//! `systems-science-foundations/Systems/Core/Decomposition.lean` (SSF PR #25,
//! the gate met 2026-07-20). Every `Decomposition` structure field is one row.
//!
//! ## Transcription table (Lean `Decomposition` field/property → Rust check)
//!
//! | Lean field | meaning | Rust check | refusal cites |
//! |---|---|---|---|
//! | `comp_mem` | `comp ∈ parent.components` | `comp` resolves to a parent system relatum | `Decomposition.comp_mem` |
//! | *(v1 narrowing)* | `comp` is not a parent interface (membrane-crossing flows through `c` are outside the Lean contract) | `parent.boundary_components()` membership | v1 interface-component refusal |
//! | `βsrc` | `childSources ≃ inflows(c)` (bijection) | equal cardinality of `child_sources` / `inflows` | `Decomposition.βsrc` |
//! | `src_preserves_kind` | `βsrc` preserves substance kind | equal substance-kind multisets | `Decomposition.src_preserves_kind` |
//! | `βsnk` | `childSinks ≃ outflows(c)` (bijection) | equal cardinality of `child_sinks` / `outflows` | `Decomposition.βsnk` |
//! | `snk_preserves_kind` | `βsnk` preserves substance kind | equal substance-kind multisets | `Decomposition.snk_preserves_kind` |
//! | `src_lands` | each child source lands on an interface member | `ix.sink ∈ child.boundary_components()` | `Decomposition.src_lands` |
//! | `snk_lands` | each child sink lands on an interface member | `ix.source ∈ child.boundary_components()` | `Decomposition.snk_lands` |
//! | `derived_env` | `E′` = parent's interior neighborhood of `c` (nothing else) | every child env object carries a boundary flow AND stands for (names) an interior neighbor; every neighbor has a stand-in | `Decomposition.derived_env` |
//! | *(caller-facing)* | referent must resolve | `check_decomposition` on `None` | unresolved-reference refusal |
//!
//! Direction-preservation (contract property (i)) is by construction, exactly as
//! in the Lean: `βsrc` handles the source/inflow half and `βsnk` the sink/outflow
//! half, so a source can never satisfy the contract against an outflow.
//!
//! ## Slots that did NOT transcribe cleanly (reported, not smoothed over)
//!
//! - **Substance kind (property (ii)).** The Lean `FlowEdge` has no substance
//!   slot, so `Decomposition` carries `kind` as an external labeling. The BERT
//!   kernel HAS substance kinds first-class (`Substance.ty`), so the check reads
//!   them directly (gate comment, third narrowing) — cleaner here than in Lean.
//! - **Interface-landing (property (iii)) is near-tautological in BERT.** Lean
//!   checks `e.target ∈ child.boundary.interfaces` against an INDEPENDENT
//!   `interfaces` field. BERT's `boundary_components()` is DERIVED from exactly
//!   the exo-edges that define `child_sources`/`child_sinks`, so a boundary flow
//!   whose far endpoint is a genuine component always lands. The check retains
//!   real teeth only for the degenerate case — a "boundary flow" whose non-env
//!   endpoint is itself an environment entity (env→env), landing on no component.
//! - **`derived_env` identity is nominal (step 5a).** The full Lean equality
//!   `E′ = succ(c) ∪ pred(c)` matches child env objects to parent neighbors
//!   across TWO models with disjoint id spaces, so it needs an identity
//!   criterion neither id space provides. The criterion is the NAME: a child
//!   env object stands for the parent interior neighbor whose name it carries
//!   ([`env_identity_map`]) — the one key both models share in v1. The check is
//!   three-part: nothing free-floating (every env object carries a boundary
//!   flow), nothing foreign (every env object names a neighbor), nothing
//!   missing (every neighbor is named by an env object). Labels drift — but an
//!   env stand-in whose label drifted from its neighbor's IS a stale model,
//!   and the refusal says exactly which name to fix.
//! - **Birth-name drift is a Warning, not a row (bert-lenses#116).** The door
//!   names the child's root after the component at door time; a later rename
//!   of either side never propagates. Child root name ≠ component name is
//!   outside the Lean contract (the seam holds by id), so it surfaces as a
//!   Warning-severity note, never a refusal.

use crate::model_id;
use crate::validate::{Severity, ValidationIssue};
use crate::{
    is_system_relatum, Boundary, Complexity, Environment, ExternalEntity, ExternalEntityType, Id,
    IdType, Info, Interaction, ModelRef, SubstanceType, System, Transform2d, Vec2, WorldModel,
};
use std::collections::{HashMap, HashSet};

/// Serialize an `Id` to its coordinate string (`"C0.1"`) for issue locations.
fn id_str(id: &Id) -> String {
    serde_json::to_value(id)
        .ok()
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_else(|| format!("{id:?}"))
}

fn refuse(location: String, message: String, suggestion: &str, subject: Option<Id>) -> ValidationIssue {
    ValidationIssue {
        severity: Severity::Error,
        location,
        message,
        suggestion: Some(suggestion.to_string()),
        // Every seam refusal cites the boundary contract's spec entry (#129):
        // all rows here transcribe the one Lean `Decomposition` structure.
        doc: Some(crate::validate::doc::DECOMPOSITION.to_string()),
        subject,
    }
}

fn warn(location: String, message: String, suggestion: String, subject: Option<Id>) -> ValidationIssue {
    ValidationIssue {
        severity: Severity::Warning,
        location,
        message,
        suggestion: Some(suggestion),
        doc: Some(crate::validate::doc::DECOMPOSITION.to_string()),
        subject,
    }
}

/// Ids of the model's top-level environment objects (`E`): its sources and sinks.
fn env_object_ids(model: &WorldModel) -> HashSet<Id> {
    model
        .environment
        .sources
        .iter()
        .chain(model.environment.sinks.iter())
        .map(|e| e.info.id.clone())
        .collect()
}

/// `in(c)`: parent internal-network (endo) edges flowing INTO `comp`.
fn inflows<'a>(parent: &'a WorldModel, comp: &Id) -> Vec<&'a Interaction> {
    parent
        .interactions
        .iter()
        .filter(|ix| is_system_relatum(&ix.source) && is_system_relatum(&ix.sink) && &ix.sink == comp)
        .collect()
}

/// `out(c)`: parent internal-network (endo) edges flowing OUT of `comp`.
fn outflows<'a>(parent: &'a WorldModel, comp: &Id) -> Vec<&'a Interaction> {
    parent
        .interactions
        .iter()
        .filter(|ix| is_system_relatum(&ix.source) && is_system_relatum(&ix.sink) && &ix.source == comp)
        .collect()
}

/// `Src′`: child boundary flows inbound from the child's environment (source ∈ E′).
fn child_sources<'a>(child: &'a WorldModel, env: &HashSet<Id>) -> Vec<&'a Interaction> {
    child
        .interactions
        .iter()
        .filter(|ix| env.contains(&ix.source))
        .collect()
}

/// `Snk′`: child boundary flows outbound to the child's environment (target ∈ E′).
fn child_sinks<'a>(child: &'a WorldModel, env: &HashSet<Id>) -> Vec<&'a Interaction> {
    child
        .interactions
        .iter()
        .filter(|ix| env.contains(&ix.sink))
        .collect()
}

/// The substance-kind multiset of a set of flows — the carrier of the
/// "a kind-preserving bijection exists" test (equal multisets ⇔ such a bijection).
fn kind_multiset(edges: &[&Interaction]) -> HashMap<SubstanceType, usize> {
    let mut counts = HashMap::new();
    for ix in edges {
        *counts.entry(ix.substance.ty).or_insert(0) += 1;
    }
    counts
}

/// Caller-facing entry: check the decomposition of `comp` against its child
/// reference, given the child the store layer ALREADY resolved (`None` if the
/// referent is missing/unresolvable). This is the only place a missing referent
/// becomes an issue; the kernel reads no files.
pub fn check_decomposition(
    parent: &WorldModel,
    comp: &Id,
    child_ref: &ModelRef,
    resolved: Option<&WorldModel>,
) -> Vec<ValidationIssue> {
    match resolved {
        None => vec![refuse(
            id_str(comp),
            format!(
                "component \"{}\" declares child_model {} but the referent could not \
                 be resolved — a decomposition reference must point at a loadable \
                 model (Decomposition: the child 8-tuple is required for the seam)",
                comp_name(parent, comp),
                model_id::encode_uuid(&child_ref.as_uuid())
            ),
            "Restore the referenced child model, or clear this component's child_model reference",
            Some(comp.clone()),
        )],
        Some(child) => check_decomposition_contract(parent, comp, child),
    }
}

/// Every decomposition reference the model carries: (component id, child ref),
/// in model order. The store layer resolves the refs to model text; the kernel
/// walks them ([`check_decompositions`]).
pub fn decomposition_refs(model: &WorldModel) -> Vec<(Id, ModelRef)> {
    model
        .systems
        .iter()
        .filter_map(|s| s.child_model.map(|r| (s.info.id.clone(), r)))
        .collect()
}

/// Resolution-time entry over a WHOLE model: check every decomposition seam in
/// `parent` against its store-resolved referents. `resolved` maps the canonical
/// base58 id to the child model's JSON text — the shape a store layer can hand
/// over without knowing any systems semantics. A missing key is the unresolved-
/// referent refusal; a present-but-unparseable value is its own defined issue
/// (a referent that resolves to non-model text is louder than a missing one,
/// never quieter). Still no I/O: the store did the reading.
pub fn check_decompositions(
    parent: &WorldModel,
    resolved: &HashMap<String, String>,
) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    for (comp, child_ref) in decomposition_refs(parent) {
        let key = model_id::encode_uuid(&child_ref.as_uuid());
        match resolved.get(&key).map(|json| serde_json::from_str::<WorldModel>(json)) {
            None => issues.extend(check_decomposition(parent, &comp, &child_ref, None)),
            Some(Ok(child)) => {
                issues.extend(check_decomposition(parent, &comp, &child_ref, Some(&child)));
            }
            Some(Err(e)) => issues.push(refuse(
                id_str(&comp),
                format!(
                    "component \"{}\" declares child_model {key} and the store resolved \
                     it, but the resolved text is not a loadable model: {e}",
                    comp_name(parent, &comp),
                ),
                "Re-save the referenced child model, or clear this component's child_model reference",
                Some(comp.clone()),
            )),
        }
    }
    issues
}

/// Human name of `comp` in `parent`, falling back to its id coordinate.
fn comp_name(parent: &WorldModel, comp: &Id) -> String {
    parent
        .systems
        .iter()
        .find(|s| &s.info.id == comp)
        .map(|s| s.info.name.clone())
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| id_str(comp))
}

/// The cross-model identity map the full `derived_env` equality needs: child
/// environment object → the parent interior neighbor of `comp` it stands for.
/// Identity is nominal — matched by name, the one key both models share across
/// their disjoint id spaces (module note). Empty names identify nothing; when
/// two neighbors share a name the map picks the first in model order (the
/// contract check compares name SETS, so a shared name never misreports).
pub fn env_identity_map(parent: &WorldModel, comp: &Id, child: &WorldModel) -> HashMap<Id, Id> {
    let mut neighbor_by_name: HashMap<String, Id> = HashMap::new();
    for n in interior_neighbors(parent, comp) {
        // Raw name, not comp_name: the fallback id coordinate is a display
        // affordance, never an identity.
        let name = parent
            .systems
            .iter()
            .find(|s| s.info.id == n)
            .map(|s| s.info.name.clone())
            .unwrap_or_default();
        if !name.is_empty() {
            neighbor_by_name.entry(name).or_insert(n);
        }
    }
    let mut map = HashMap::new();
    for e in child
        .environment
        .sources
        .iter()
        .chain(child.environment.sinks.iter())
    {
        if let Some(n) = neighbor_by_name.get(&e.info.name) {
            map.insert(e.info.id.clone(), n.clone());
        }
    }
    map
}

/// `succ(c) ∪ pred(c)`: the parent components `comp`'s internal-network flows
/// touch — what the Lean equality says `E′` must be. Deduplicated, model order.
fn interior_neighbors(parent: &WorldModel, comp: &Id) -> Vec<Id> {
    let mut seen = HashSet::new();
    let mut neighbors = Vec::new();
    for id in inflows(parent, comp)
        .iter()
        .map(|ix| &ix.source)
        .chain(outflows(parent, comp).iter().map(|ix| &ix.sink))
    {
        if seen.insert(id.clone()) {
            neighbors.push(id.clone());
        }
    }
    neighbors
}

/// The eligibility gate the door and the seam check share. Row `comp_mem`
/// (`comp ∈ parent.components` — everything downstream is defined in terms of a
/// genuine parent component, so a failure short-circuits) plus the v1 binding
/// narrowing (gate comment, 2026-07-20): REFUSE to decompose a component that is
/// itself a parent interface. Flows crossing the parent membrane THROUGH `comp`
/// are not yet in the Lean contract (`inflows`/`outflows` cover the internal
/// network only) — refuse loudly rather than check a seam the mathematics does
/// not yet underwrite.
fn decomposability(parent: &WorldModel, comp: &Id) -> Result<(), Box<ValidationIssue>> {
    let comp_is_component =
        is_system_relatum(comp) && parent.systems.iter().any(|s| &s.info.id == comp);
    if !comp_is_component {
        return Err(Box::new(refuse(
            id_str(comp),
            format!(
                "Decomposition.comp_mem: \"{}\" is not a component of the parent model — \
                 only a genuine system component may be decomposed",
                id_str(comp)
            ),
            "Reference a component that exists in the parent model's systems",
            Some(comp.clone()),
        )));
    }
    if parent.boundary_components().contains(comp) {
        return Err(Box::new(refuse(
            id_str(comp),
            format!(
                "v1 refuses to decompose \"{}\": it is an interface component of the \
                 parent (it couples to the environment). The boundary contract in \
                 SSF Decomposition.lean covers the parent's INTERNAL network only; \
                 membrane-crossing flows through an interface component are not yet \
                 formalized, so decomposing one has no checked seam",
                comp_name(parent, comp)
            ),
            "Decompose an interior component, or wait for the external-flow case to land in the Lean contract",
            Some(comp.clone()),
        )));
    }
    Ok(())
}

/// Raw name of a system, by id — the identity key `env_identity_map` matches on
/// (empty stays empty; the `comp_name` fallback coordinate is display-only).
fn raw_name(parent: &WorldModel, id: &Id) -> String {
    parent
        .systems
        .iter()
        .find(|s| &s.info.id == id)
        .map(|s| s.info.name.clone())
        .unwrap_or_default()
}

/// A bare child system shell: default membrane, no primitive, no transform
/// unless placed. The newborn's only system is its root (the SOI itself).
fn child_root(root_id: &Id, env_id: &Id, name: &str) -> System {
    System {
        info: Info {
            id: root_id.clone(),
            level: 0,
            name: name.to_string(),
            description: String::new(),
        },
        sources: vec![],
        sinks: vec![],
        parent: env_id.clone(),
        complexity: Complexity::Atomic,
        boundary: Boundary {
            info: Info {
                id: Id {
                    ty: IdType::Boundary,
                    indices: root_id.indices.clone(),
                },
                level: 0,
                name: String::new(),
                description: String::new(),
            },
            porosity: 0.0,
            perceptive_fuzziness: 0.0,
            interfaces: vec![],
            parent_interface: None,
        },
        radius: 50.0,
        transform: None,
        equivalence: String::new(),
        history: String::new(),
        transformation: String::new(),
        member_autonomy: 1.0,
        time_constant: String::new(),
        archetype: None,
        agent: None,
        child_model: None,
    }
}

/// Derive the newborn child of `comp` — the kernel half of the decomposition
/// door (bert-lenses#89 step 5b). G′ comes from `flows(c)`: each interior
/// neighbor of `comp` becomes a child environment stand-in (Source per inflow
/// direction, Sink per outflow direction — a neighbor coupled both ways gets
/// both), carrying the neighbor's name EXACTLY (the identity key
/// [`env_identity_map`] matches on), and each incident flow becomes a child
/// boundary flow with its substance, name, amount, and unit carried over.
///
/// The interior is EMPTY by design — no placeholder primitive is authored for
/// the modeler. Until the first component exists, the boundary flows terminate
/// on the child's ROOT (the SOI as its own black box): the root is then the one
/// interface member `boundary_components()` derives, so the newborn passes
/// [`check_decomposition_contract`] from birth. Placing real components and
/// re-routing the flows refines that scaffolding without ever passing through a
/// state the contract cannot name.
///
/// Mints the child's identity via [`WorldModel::mint_id`] — this is precisely
/// the "an operation needs the model to be nameable" moment the minting policy
/// reserves (the parent is about to reference it). Inherits the parent's mode,
/// so the child opens under the same lens. Pure otherwise: no I/O; the store
/// layer saves the result and stamps the parent's reference.
pub fn derive_child(parent: &WorldModel, comp: &Id) -> Result<WorldModel, Vec<ValidationIssue>> {
    decomposability(parent, comp).map_err(|issue| vec![*issue])?;

    let env_id = Id {
        ty: IdType::Environment,
        indices: vec![-1],
    };
    let root_id = Id {
        ty: IdType::System,
        indices: vec![0],
    };
    let root_name = comp_name(parent, comp);

    let in_c = inflows(parent, comp);
    let out_c = outflows(parent, comp);

    // One Source stand-in per inflow neighbor, one Sink per outflow neighbor,
    // first-appearance order; the shared env index space mirrors the canvas
    // projection's. Positions are a readable two-column layout for the canvas.
    let mut env_idx: i64 = 0;
    let mut sources: Vec<ExternalEntity> = Vec::new();
    let mut sinks: Vec<ExternalEntity> = Vec::new();
    let mut source_of: HashMap<Id, Id> = HashMap::new();
    let mut sink_of: HashMap<Id, Id> = HashMap::new();
    let stand_in = |neighbor: &Id,
                        inbound: bool,
                        idx: &mut i64,
                        entities: &mut Vec<ExternalEntity>,
                        of: &mut HashMap<Id, Id>| {
        if of.contains_key(neighbor) {
            return;
        }
        let id = Id {
            ty: if inbound { IdType::Source } else { IdType::Sink },
            indices: vec![-1, *idx],
        };
        *idx += 1;
        let column = if inbound { -260.0 } else { 260.0 };
        entities.push(ExternalEntity {
            info: Info {
                id: id.clone(),
                level: -1,
                name: raw_name(parent, neighbor),
                description: String::new(),
            },
            ty: if inbound {
                ExternalEntityType::Source
            } else {
                ExternalEntityType::Sink
            },
            transform: Some(Transform2d {
                translation: Vec2::new(column, entities.len() as f32 * 130.0),
                rotation: 0.0,
            }),
            equivalence: String::new(),
            model: String::new(),
            is_same_as_id: None,
        });
        of.insert(neighbor.clone(), id);
    };
    for ix in &in_c {
        stand_in(&ix.source, true, &mut env_idx, &mut sources, &mut source_of);
    }
    for ix in &out_c {
        stand_in(&ix.sink, false, &mut env_idx, &mut sinks, &mut sink_of);
    }

    let mut interactions: Vec<Interaction> = Vec::new();
    let flow = |k: usize, from: Id, to: Id, ix: &Interaction| Interaction {
        info: Info {
            id: Id {
                ty: IdType::Flow,
                indices: vec![k as i64],
            },
            level: 0,
            name: ix.info.name.clone(),
            description: String::new(),
        },
        substance: ix.substance.clone(),
        ty: ix.ty,
        usability: ix.usability,
        source: from,
        source_interface: None,
        sink: to,
        sink_interface: None,
        amount: ix.amount,
        unit: ix.unit.clone(),
        parameters: vec![],
        smart_parameters: vec![],
        endpoint_offset: None,
    };
    for ix in &in_c {
        let from = source_of[&ix.source].clone();
        interactions.push(flow(interactions.len(), from, root_id.clone(), ix));
    }
    for ix in &out_c {
        let to = sink_of[&ix.sink].clone();
        interactions.push(flow(interactions.len(), root_id.clone(), to, ix));
    }

    let mut child = WorldModel {
        version: crate::CURRENT_FILE_VERSION,
        model_id: None,
        mode: parent.mode,
        environment: Environment {
            info: Info {
                id: env_id.clone(),
                level: -1,
                name: "Environment".to_string(),
                description: String::new(),
            },
            sources,
            sinks,
        },
        systems: vec![child_root(&root_id, &env_id, &root_name)],
        interactions,
        hidden_entities: vec![],
        reachability_requirements: vec![],
        time_unit: None,
    };
    child.mint_id();
    Ok(child)
}

/// The pairwise boundary contract (Lean `Decomposition` + `substitution_sound`),
/// checked per pair — parent-side needs only `flows(comp)`, child-side only its
/// `G′`/`I′` — with no global tree pass (foundations doc §3). Pure: no I/O, no
/// mutation. Returns every violation; an empty result is a well-formed seam.
pub fn check_decomposition_contract(
    parent: &WorldModel,
    comp: &Id,
    child: &WorldModel,
) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    let loc = id_str(comp);

    if let Err(issue) = decomposability(parent, comp) {
        issues.push(*issue);
        return issues;
    }

    let env = env_object_ids(child);
    let in_c = inflows(parent, comp);
    let out_c = outflows(parent, comp);
    let src = child_sources(child, &env);
    let snk = child_sinks(child, &env);
    let child_boundary = child.boundary_components();

    // Row `βsrc`: child sources biject `comp`'s inflows (source half of β).
    if src.len() != in_c.len() {
        issues.push(refuse(
            loc.clone(),
            format!(
                "Decomposition.βsrc: the child exposes {} inbound boundary flow(s) but \
                 \"{}\" has {} inflow(s); the boundary contract requires a bijection \
                 β : Src′ ≅ in(c), so the counts must match",
                src.len(),
                comp_name(parent, comp),
                in_c.len()
            ),
            "Give the child exactly one inbound boundary flow per inflow of the decomposed component",
            Some(comp.clone()),
        ));
    } else if kind_multiset(&src) != kind_multiset(&in_c) {
        // Row `src_preserves_kind`: equal cardinality, but no kind-preserving
        // bijection exists (the substance-kind multisets differ).
        issues.push(refuse(
            loc.clone(),
            format!(
                "Decomposition.src_preserves_kind: the child's inbound boundary flows \
                 and \"{}\"'s inflows have the same count but different substance kinds \
                 — β must preserve matter/energy/message, so no kind-preserving \
                 bijection exists",
                comp_name(parent, comp)
            ),
            "Match each inbound boundary flow's substance kind to the inflow it stands for",
            Some(comp.clone()),
        ));
    }

    // Row `βsnk`: child sinks biject `comp`'s outflows (sink half of β).
    if snk.len() != out_c.len() {
        issues.push(refuse(
            loc.clone(),
            format!(
                "Decomposition.βsnk: the child exposes {} outbound boundary flow(s) but \
                 \"{}\" has {} outflow(s); the boundary contract requires a bijection \
                 β : Snk′ ≅ out(c), so the counts must match",
                snk.len(),
                comp_name(parent, comp),
                out_c.len()
            ),
            "Give the child exactly one outbound boundary flow per outflow of the decomposed component",
            Some(comp.clone()),
        ));
    } else if kind_multiset(&snk) != kind_multiset(&out_c) {
        // Row `snk_preserves_kind`.
        issues.push(refuse(
            loc.clone(),
            format!(
                "Decomposition.snk_preserves_kind: the child's outbound boundary flows \
                 and \"{}\"'s outflows have the same count but different substance kinds \
                 — β must preserve matter/energy/message, so no kind-preserving \
                 bijection exists",
                comp_name(parent, comp)
            ),
            "Match each outbound boundary flow's substance kind to the outflow it stands for",
            Some(comp.clone()),
        ));
    }

    // Row `src_lands`: each child source lands on a child interface member
    // (its non-env terminal is a component in `child.boundary_components()`).
    for ix in &src {
        if !child_boundary.contains(&ix.sink) {
            issues.push(refuse(
                format!("{loc}/child_sources"),
                format!(
                    "Decomposition.src_lands: inbound boundary flow \"{}\" does not land \
                     on any interface component of the child — a contract flow must \
                     terminate on an interface member I′ ⊆ C′, not on the environment",
                    ix.info.name
                ),
                "Route the inbound boundary flow to a child component that carries the interface",
                Some(comp.clone()),
            ));
        }
    }

    // Row `snk_lands`: each child sink's non-env terminal is an interface member.
    for ix in &snk {
        if !child_boundary.contains(&ix.source) {
            issues.push(refuse(
                format!("{loc}/child_sinks"),
                format!(
                    "Decomposition.snk_lands: outbound boundary flow \"{}\" does not \
                     originate at any interface component of the child — a contract flow \
                     must leave from an interface member I′ ⊆ C′, not the environment",
                    ix.info.name
                ),
                "Route the outbound boundary flow from a child component that carries the interface",
                Some(comp.clone()),
            ));
        }
    }

    // Row `derived_env`: `E′` is DERIVED from `comp`'s neighborhood — nothing may
    // appear in it that a boundary flow does not justify. The falsifiable
    // within-child half: no free-floating env object.
    for e in &env {
        let used = child
            .interactions
            .iter()
            .any(|ix| &ix.source == e || &ix.sink == e);
        if !used {
            issues.push(refuse(
                format!("{loc}/derived_env"),
                format!(
                    "Decomposition.derived_env: child environment object \"{}\" carries no \
                     boundary flow — E′ is the parent's interior neighborhood of the \
                     decomposed component, so nothing may be authored into it that a \
                     contract flow does not justify",
                    id_str(e)
                ),
                "Remove the free-floating environment object, or connect it via a boundary flow that maps to an incident flow of the decomposed component",
                Some(comp.clone()),
            ));
        }
    }

    // Row `derived_env`, cross-model half (the equality proper, step 5a): under
    // nominal identity ([`env_identity_map`]), `E′ = succ(c) ∪ pred(c)` becomes
    // two set inclusions on names — no env object foreign to the neighborhood,
    // no neighbor missing a stand-in.
    let neighbors = interior_neighbors(parent, comp);
    let neighbor_names: HashSet<&str> = neighbors
        .iter()
        .filter_map(|n| {
            parent
                .systems
                .iter()
                .find(|s| &s.info.id == n)
                .map(|s| s.info.name.as_str())
        })
        .filter(|n| !n.is_empty())
        .collect();
    let env_names: HashSet<&str> = child
        .environment
        .sources
        .iter()
        .chain(child.environment.sinks.iter())
        .map(|e| e.info.name.as_str())
        .filter(|n| !n.is_empty())
        .collect();
    for e in child
        .environment
        .sources
        .iter()
        .chain(child.environment.sinks.iter())
    {
        if !neighbor_names.contains(e.info.name.as_str()) {
            let label = if e.info.name.is_empty() {
                id_str(&e.info.id)
            } else {
                e.info.name.clone()
            };
            issues.push(refuse(
                format!("{loc}/derived_env"),
                format!(
                    "Decomposition.derived_env: child environment object \"{label}\" does \
                     not stand for any interior neighbor of \"{}\" — E′ is exactly the \
                     parent's interior neighborhood of the decomposed component, and a \
                     stand-in carries its neighbor's name",
                    comp_name(parent, comp)
                ),
                "Name the environment object after the parent neighbor it stands for, or remove it",
                Some(comp.clone()),
            ));
        }
    }
    for n in &neighbors {
        let name = parent
            .systems
            .iter()
            .find(|s| &s.info.id == n)
            .map(|s| s.info.name.as_str())
            .unwrap_or("");
        if name.is_empty() || !env_names.contains(name) {
            issues.push(refuse(
                format!("{loc}/derived_env"),
                format!(
                    "Decomposition.derived_env: parent interior neighbor \"{}\" of \"{}\" \
                     has no stand-in in the child's environment — E′ must contain the \
                     parent's whole interior neighborhood of the decomposed component",
                    comp_name(parent, n),
                    comp_name(parent, comp)
                ),
                "Add an environment object named after the neighbor, carrying its boundary flow(s)",
                Some(comp.clone()),
            ));
        }
    }

    // Birth-name drift (bert-lenses#116): the door names the child's root after
    // the component AT door time, and a later rename of either side never
    // propagates — the reference stays intact (the stamp resolves by id), so a
    // diverged pair is drift, not breakage. Warning, symmetric in spirit with
    // the env stand-in name check above: both are the nominal-identity seam
    // fraying. Empty names identify nothing (env_identity_map's rule), so
    // either side being unnamed stays silent.
    let comp_raw = raw_name(parent, comp);
    let root_raw = child
        .systems
        .iter()
        .find(|s| s.info.level == 0)
        .map(|s| s.info.name.as_str())
        .unwrap_or("");
    if !comp_raw.is_empty() && !root_raw.is_empty() && comp_raw != root_raw {
        issues.push(warn(
            format!("{loc}/child_root"),
            format!(
                "component \"{comp_raw}\" decomposes into a model that calls itself \
                 \"{root_raw}\" — rename one to match"
            ),
            format!(
                "Rename the component to \"{root_raw}\", or edit the child model's \
                 system declaration (`system \"...\"`) to \"{comp_raw}\""
            ),
            Some(comp.clone()),
        ));
    }

    issues
}

#[cfg(test)]
mod tests {
    //! Boundary-fixture discipline (bert-lenses#24): for EACH contract property, a
    //! barely-PASSING and a barely-FAILING fixture, differing in exactly the one
    //! fact the property governs. The failing fixture asserts the refusal names
    //! the violated property.

    use super::*;
    use serde_json::{json, Value};

    /// A parent model: root S0 with two interior components C0.0 (to be
    /// decomposed) and C0.1, an inflow C0.1→C0.0 (Energy) and an outflow
    /// C0.0→C0.1 (Material). C0.0 touches the environment nowhere, so it is a
    /// pure interior component (decomposable under v1).
    fn parent_model() -> WorldModel {
        let value = json!({
            "version": 1,
            "environment": {
                "info": { "id": "E-1", "level": -1, "name": "", "description": "" },
                "sources": [], "sinks": []
            },
            "systems": [
                sys("S0", 0, "Root", "E-1"),
                sys("C0.0", 1, "Furnace", "S0"),
                sys("C0.1", 1, "Sibling", "S0"),
            ],
            "interactions": [
                endo_flow("F0", "in", "C0.1", "C0.0", "Energy"),
                endo_flow("F1", "out", "C0.0", "C0.1", "Material"),
            ]
        });
        serde_json::from_value(value).expect("parent deserializes")
    }

    /// A child model whose boundary flows match `parent_model`'s C0.0 seam: one
    /// Energy inbound (Src0 → K0.0) and one Material outbound (K0.0 → Snk0). Its
    /// env holds exactly the two neighbor stand-ins, both named "Sibling" — the
    /// nominal identity `derived_env` requires (C0.1 is both the inflow's source
    /// and the outflow's sink). The root calls itself "Furnace" — the component's
    /// name, as the door mints it — so birth-name drift stays silent at baseline.
    /// `kinds`/`extras` let a test perturb one fact to make a single property
    /// barely fail.
    fn child_model(in_kind: &str, out_kind: &str, extra_env_source: bool, land_src_on_env: bool) -> WorldModel {
        let mut sources = vec![ext("Src-1.0", "Sibling", "Source")];
        if extra_env_source {
            sources.push(ext("Src-1.1", "Sibling", "Source"));
        }
        // src flow target: normally the interface component K0.0; when
        // `land_src_on_env`, it lands on a sink (no interface component) instead.
        let src_target = if land_src_on_env { "Snk-1.0" } else { "C0.0" };
        let value = json!({
            "version": 1,
            "environment": {
                "info": { "id": "E-1", "level": -1, "name": "", "description": "" },
                "sources": sources,
                "sinks": [ ext("Snk-1.0", "Sibling", "Sink") ]
            },
            "systems": [
                sys("S0", 0, "Furnace", "E-1"),
                sys("C0.0", 1, "Burner", "S0"),
            ],
            "interactions": [
                exo_flow("F0", "child-in", "Src-1.0", src_target, in_kind),
                exo_flow("F1", "child-out", "C0.0", "Snk-1.0", out_kind),
            ]
        });
        serde_json::from_value(value).expect("child deserializes")
    }

    fn comp() -> Id {
        serde_json::from_value(json!("C0.0")).unwrap()
    }

    fn sys(id: &str, level: i32, name: &str, parent: &str) -> Value {
        json!({
            "info": { "id": id, "level": level, "name": name, "description": "" },
            "sources": [], "sinks": [],
            "parent": parent,
            "complexity": "Atomic",
            "boundary": {
                "info": { "id": format!("B{}", &id[1..]), "level": level, "name": "", "description": "" },
                "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": []
            },
            "radius": 50.0,
            "equivalence": "", "history": "", "transformation": "",
            "member_autonomy": 1.0, "time_constant": ""
        })
    }

    fn ext(id: &str, name: &str, ty: &str) -> Value {
        json!({
            "info": { "id": id, "level": -1, "name": name, "description": "" },
            "type": ty,
            "equivalence": "", "model": ""
        })
    }

    fn endo_flow(id: &str, name: &str, source: &str, sink: &str, kind: &str) -> Value {
        json!({
            "info": { "id": id, "level": 0, "name": name, "description": "" },
            "substance": { "sub_type": "", "type": kind },
            "type": "Flow", "usability": "Product",
            "source": source, "sink": sink,
            "amount": "0", "unit": "", "parameters": []
        })
    }

    fn exo_flow(id: &str, name: &str, source: &str, sink: &str, kind: &str) -> Value {
        endo_flow(id, name, source, sink, kind)
    }

    fn messages(issues: &[ValidationIssue]) -> String {
        issues.iter().map(|i| i.message.clone()).collect::<Vec<_>>().join("\n")
    }

    // ── the whole contract holds: barely-passing baseline ──

    #[test]
    fn well_formed_seam_produces_no_issues() {
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(issues.is_empty(), "a matching seam must be clean: {}", messages(&issues));
    }

    // ── comp_mem ──

    #[test]
    fn comp_mem_passes_for_a_real_component() {
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("comp_mem"));
    }

    #[test]
    fn comp_mem_fails_when_component_is_absent() {
        let ghost: Id = serde_json::from_value(json!("C0.9")).unwrap();
        let issues =
            check_decomposition_contract(&parent_model(), &ghost, &child_model("Energy", "Material", false, false));
        assert!(messages(&issues).contains("comp_mem"), "must name the property: {}", messages(&issues));
    }

    // ── v1 interface-component refusal ──

    #[test]
    fn interior_component_is_not_refused_as_interface() {
        // C0.0 touches no environment object in parent_model → interior → allowed.
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("interface component"));
    }

    #[test]
    fn interface_component_is_refused() {
        // Add an exo edge coupling C0.0 to an environment sink → C0.0 becomes a
        // parent interface component → v1 must refuse to decompose it.
        let mut parent = parent_model();
        let value = json!({
            "info": { "id": "E-1", "level": -1, "name": "", "description": "" },
            "sources": [], "sinks": [ ext("Snk-1.0", "Snk-1.0", "Sink") ]
        });
        parent.environment = serde_json::from_value(value).unwrap();
        parent.interactions.push(
            serde_json::from_value(exo_flow("F2", "leak", "C0.0", "Snk-1.0", "Material")).unwrap(),
        );
        let issues =
            check_decomposition_contract(&parent, &comp(), &child_model("Energy", "Material", false, false));
        assert!(
            messages(&issues).contains("v1 refuses") && messages(&issues).contains("interface component"),
            "interface refusal must be loud and say why: {}",
            messages(&issues)
        );
    }

    // ── βsrc (cardinality bijection, source half) ──

    #[test]
    fn beta_src_passes_at_matching_cardinality() {
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("βsrc"));
    }

    #[test]
    fn beta_src_fails_on_extra_inbound_flow() {
        // Child gets a second inbound boundary flow (from the extra env source),
        // so |Src′| = 2 ≠ 1 = |in(c)|.
        let mut child = child_model("Energy", "Material", true, false);
        child.interactions.push(
            serde_json::from_value(exo_flow("F2", "extra-in", "Src-1.1", "C0.0", "Energy")).unwrap(),
        );
        let issues = check_decomposition_contract(&parent_model(), &comp(), &child);
        assert!(messages(&issues).contains("βsrc"), "must name the property: {}", messages(&issues));
    }

    // ── src_preserves_kind ──

    #[test]
    fn src_preserves_kind_passes_when_kinds_match() {
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("src_preserves_kind"));
    }

    #[test]
    fn src_preserves_kind_fails_on_kind_mismatch() {
        // Same count (1 inbound), wrong kind: parent inflow is Energy, child
        // inbound is Material — cardinality matches, kind multiset does not.
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Material", "Material", false, false));
        assert!(
            messages(&issues).contains("src_preserves_kind"),
            "must name the property: {}",
            messages(&issues)
        );
    }

    // ── βsnk (cardinality bijection, sink half) ──

    #[test]
    fn beta_snk_passes_at_matching_cardinality() {
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("βsnk"));
    }

    #[test]
    fn beta_snk_fails_on_missing_outbound_flow() {
        // Drop the child's outbound boundary flow → |Snk′| = 0 ≠ 1 = |out(c)|.
        let mut child = child_model("Energy", "Material", false, false);
        child.interactions.retain(|ix| ix.info.name != "child-out");
        let issues = check_decomposition_contract(&parent_model(), &comp(), &child);
        assert!(messages(&issues).contains("βsnk"), "must name the property: {}", messages(&issues));
    }

    // ── snk_preserves_kind ──

    #[test]
    fn snk_preserves_kind_passes_when_kinds_match() {
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("snk_preserves_kind"));
    }

    #[test]
    fn snk_preserves_kind_fails_on_kind_mismatch() {
        // Same count (1 outbound), wrong kind: parent outflow is Material, child
        // outbound is Energy.
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Energy", false, false));
        assert!(
            messages(&issues).contains("snk_preserves_kind"),
            "must name the property: {}",
            messages(&issues)
        );
    }

    // ── src_lands (interface-landing, source half) ──

    #[test]
    fn src_lands_passes_when_flow_terminates_on_a_component() {
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("src_lands"));
    }

    #[test]
    fn src_lands_fails_when_flow_lands_on_the_environment() {
        // The inbound boundary flow targets an env sink instead of a component,
        // so it lands on no interface member of the child.
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, true));
        assert!(messages(&issues).contains("src_lands"), "must name the property: {}", messages(&issues));
    }

    // ── snk_lands (interface-landing, sink half) ──

    #[test]
    fn snk_lands_passes_when_flow_originates_at_a_component() {
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("snk_lands"));
    }

    #[test]
    fn snk_lands_fails_when_flow_originates_at_the_environment() {
        // Rewire the outbound boundary flow to leave from an env source instead
        // of the interface component, so it originates at no interface member.
        // Its target stays the env sink, keeping it a child sink; source and sink
        // both env means it lands on no component (the degenerate env→env case).
        let mut child = child_model("Energy", "Material", false, false);
        for ix in &mut child.interactions {
            if ix.info.name == "child-out" {
                ix.source = serde_json::from_value(json!("Src-1.0")).unwrap();
            }
        }
        let issues = check_decomposition_contract(&parent_model(), &comp(), &child);
        assert!(messages(&issues).contains("snk_lands"), "must name the property: {}", messages(&issues));
    }

    // ── derived_env ──

    #[test]
    fn derived_env_passes_when_every_env_object_is_used() {
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("derived_env"));
    }

    #[test]
    fn derived_env_fails_on_a_free_floating_env_object() {
        // Extra env source with no boundary flow attached → authored into E′
        // without a justifying incident flow of the decomposed component.
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", true, false));
        assert!(messages(&issues).contains("derived_env"), "must name the property: {}", messages(&issues));
    }

    // ── derived_env, cross-model nominal identity (step 5a) ──

    #[test]
    fn derived_env_identity_passes_when_stand_ins_name_the_neighbor() {
        // Both env objects carry "Sibling" — the name of C0.0's one interior
        // neighbor — so the nominal equality holds in both directions.
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(!messages(&issues).contains("derived_env"), "{}", messages(&issues));
    }

    #[test]
    fn derived_env_fails_when_an_env_object_names_no_neighbor() {
        // Same structure, one fact changed: the inbound stand-in's name drifts
        // to "Stranger", which is no interior neighbor of C0.0.
        let mut child = child_model("Energy", "Material", false, false);
        child.environment.sources[0].info.name = "Stranger".into();
        let issues = check_decomposition_contract(&parent_model(), &comp(), &child);
        assert!(
            messages(&issues).contains("derived_env")
                && messages(&issues).contains("does not stand for any interior neighbor"),
            "must name the property and the direction: {}",
            messages(&issues)
        );
    }

    #[test]
    fn derived_env_fails_when_a_neighbor_has_no_stand_in() {
        // Grow the parent neighborhood by one: a new component "Feeder" with an
        // Energy inflow into C0.0. The child balances the flow counts and kinds
        // (a second Energy inbound from a second "Sibling" stand-in), so every β
        // row passes — but "Feeder" has no stand-in, so E′ ⊉ succ(c) ∪ pred(c).
        let mut parent = parent_model();
        parent
            .systems
            .push(serde_json::from_value(sys("C0.2", 1, "Feeder", "S0")).unwrap());
        parent.interactions.push(
            serde_json::from_value(endo_flow("F2", "feed", "C0.2", "C0.0", "Energy")).unwrap(),
        );
        let mut child = child_model("Energy", "Material", true, false);
        child.interactions.push(
            serde_json::from_value(exo_flow("F2", "extra-in", "Src-1.1", "C0.0", "Energy")).unwrap(),
        );
        let issues = check_decomposition_contract(&parent, &comp(), &child);
        assert!(
            messages(&issues).contains("derived_env")
                && messages(&issues).contains("\"Feeder\"")
                && messages(&issues).contains("has no stand-in"),
            "must name the property and the missing neighbor: {}",
            messages(&issues)
        );
        assert!(!messages(&issues).contains("βsrc"), "the β rows must still pass: {}", messages(&issues));
    }

    // ── birth-name drift (bert-lenses#116) ──

    #[test]
    fn birth_name_drift_is_silent_when_names_match() {
        // Baseline: the child root calls itself "Furnace", the component's name.
        let issues =
            check_decomposition_contract(&parent_model(), &comp(), &child_model("Energy", "Material", false, false));
        assert!(issues.is_empty(), "matching names must stay silent: {}", messages(&issues));
    }

    #[test]
    fn birth_name_drift_warns_when_names_diverge() {
        // One fact changed: the component was renamed after the door minted the
        // child, so the root still announces the birth name.
        let mut parent = parent_model();
        parent.systems[1].info.name = "living room".into();
        let mut child = child_model("Energy", "Material", false, false);
        child.systems[0].info.name = "home".into();
        let issues = check_decomposition_contract(&parent, &comp(), &child);
        let drift: Vec<_> = issues.iter().filter(|i| i.location.contains("child_root")).collect();
        assert_eq!(drift.len(), 1, "exactly one drift note: {}", messages(&issues));
        assert_eq!(drift[0].severity, Severity::Warning, "drift is a Warning, never an Error");
        assert_eq!(
            drift[0].message,
            "component \"living room\" decomposes into a model that calls itself \"home\" — rename one to match"
        );
        let suggestion = drift[0].suggestion.as_deref().unwrap_or("");
        assert!(
            suggestion.contains("Rename the component") && suggestion.contains("system declaration"),
            "suggestion must offer both repair paths: {suggestion}"
        );
    }

    #[test]
    fn birth_name_drift_is_silent_when_either_side_is_unnamed() {
        // Empty names identify nothing (env_identity_map's rule) — an unnamed
        // root has no self-name to drift.
        let mut child = child_model("Energy", "Material", false, false);
        child.systems[0].info.name = String::new();
        let issues = check_decomposition_contract(&parent_model(), &comp(), &child);
        assert!(
            !issues.iter().any(|i| i.location.contains("child_root")),
            "an unnamed root must not warn: {}",
            messages(&issues)
        );
    }

    #[test]
    fn birth_name_drift_is_silent_on_an_unresolved_referent() {
        // A missing referent is its own refusal; there is no root to compare.
        let issues = check_decomposition(&parent_model(), &comp(), &ModelRef::new(uuid::Uuid::nil()), None);
        assert!(
            !issues.iter().any(|i| i.location.contains("child_root")),
            "unresolved must not warn about drift: {}",
            messages(&issues)
        );
    }

    #[test]
    fn env_identity_map_pairs_stand_ins_with_their_neighbors() {
        let parent = parent_model();
        let child = child_model("Energy", "Material", false, false);
        let map = env_identity_map(&parent, &comp(), &child);
        let sibling: Id = serde_json::from_value(json!("C0.1")).unwrap();
        assert_eq!(map.len(), 2, "both stand-ins identify");
        assert!(map.values().all(|n| n == &sibling), "both stand for Sibling");
    }

    // ── caller-facing: missing referent ──

    #[test]
    fn missing_referent_is_a_defined_issue_not_a_panic() {
        let issues = check_decomposition(&parent_model(), &comp(), &ModelRef::new(uuid::Uuid::nil()), None);
        assert_eq!(issues.len(), 1);
        assert!(
            issues[0].message.contains("could not be resolved"),
            "missing referent must surface as an issue: {}",
            messages(&issues)
        );
    }

    #[test]
    fn resolved_referent_delegates_to_the_contract() {
        let child = child_model("Energy", "Material", false, false);
        let issues =
            check_decomposition(&parent_model(), &comp(), &ModelRef::new(uuid::Uuid::nil()), Some(&child));
        assert!(issues.is_empty(), "a resolved, well-formed seam is clean: {}", messages(&issues));
    }

    // ── check_decompositions: the whole-model resolution-time walk ──

    /// `parent_model` with C0.0 stamped as decomposed, plus the child's JSON and
    /// the canonical key the store would resolve it under.
    fn decomposed_parent() -> (WorldModel, String, String) {
        let mut parent = parent_model();
        let child_ref = ModelRef::to(crate::ModelId::mint());
        parent.systems[1].child_model = Some(child_ref);
        let key = crate::model_id::encode_uuid(&child_ref.as_uuid());
        let child_json =
            serde_json::to_string(&child_model("Energy", "Material", false, false)).unwrap();
        (parent, key, child_json)
    }

    #[test]
    fn check_decompositions_is_clean_when_every_referent_resolves() {
        let (parent, key, child_json) = decomposed_parent();
        let resolved = HashMap::from([(key, child_json)]);
        let issues = check_decompositions(&parent, &resolved);
        assert!(issues.is_empty(), "a resolved, well-formed model is clean: {}", messages(&issues));
    }

    #[test]
    fn check_decompositions_surfaces_a_missing_referent() {
        let (parent, _, _) = decomposed_parent();
        let issues = check_decompositions(&parent, &HashMap::new());
        assert_eq!(issues.len(), 1);
        assert!(messages(&issues).contains("could not be resolved"), "{}", messages(&issues));
    }

    #[test]
    fn check_decompositions_surfaces_an_unparseable_referent() {
        let (parent, key, _) = decomposed_parent();
        let resolved = HashMap::from([(key, "{ not a model".to_string())]);
        let issues = check_decompositions(&parent, &resolved);
        assert_eq!(issues.len(), 1);
        assert!(
            messages(&issues).contains("not a loadable model"),
            "corrupt referent text must be its own defined issue: {}",
            messages(&issues)
        );
    }

    #[test]
    fn decomposition_refs_lists_every_stamped_component() {
        let (parent, _, _) = decomposed_parent();
        let refs = decomposition_refs(&parent);
        assert_eq!(refs.len(), 1);
        assert_eq!(refs[0].0, comp());
        assert!(decomposition_refs(&parent_model()).is_empty(), "a flat model has no refs");
    }

    // ── derive_child: the newborn the door mints (step 5b) ──

    #[test]
    fn derived_child_is_born_passing_the_contract() {
        let parent = parent_model();
        let child = derive_child(&parent, &comp()).expect("interior component derives");
        let issues = check_decomposition_contract(&parent, &comp(), &child);
        assert!(issues.is_empty(), "the newborn must pass its own seam: {}", messages(&issues));
    }

    #[test]
    fn derived_child_carries_seam_facts_exactly() {
        let parent = parent_model();
        let child = derive_child(&parent, &comp()).expect("derives");
        // Identity minted, mode inherited, interior empty (root only).
        assert!(child.model_id.is_some(), "the door mints the child's identity");
        assert_eq!(child.mode, parent.mode);
        assert_eq!(child.systems.len(), 1, "no placeholder primitive is authored");
        assert_eq!(child.systems[0].info.name, "Furnace");
        // One stand-in per direction, both named after the neighbor exactly.
        assert_eq!(child.environment.sources.len(), 1);
        assert_eq!(child.environment.sinks.len(), 1);
        assert_eq!(child.environment.sources[0].info.name, "Sibling");
        assert_eq!(child.environment.sinks[0].info.name, "Sibling");
        // One boundary flow per incident flow, substance kinds carried over.
        assert_eq!(child.interactions.len(), 2);
        assert_eq!(child.interactions[0].substance.ty, SubstanceType::Energy);
        assert_eq!(child.interactions[1].substance.ty, SubstanceType::Material);
        assert_eq!(child.interactions[0].info.name, "in");
        assert_eq!(child.interactions[1].info.name, "out");
    }

    #[test]
    fn derive_child_refuses_a_ghost_component() {
        let ghost: Id = serde_json::from_value(json!("C0.9")).unwrap();
        let issues = derive_child(&parent_model(), &ghost).err().expect("ghost must refuse");
        assert!(messages(&issues).contains("comp_mem"), "{}", messages(&issues));
    }

    #[test]
    fn derive_child_refuses_an_interface_component() {
        let mut parent = parent_model();
        let value = json!({
            "info": { "id": "E-1", "level": -1, "name": "", "description": "" },
            "sources": [], "sinks": [ ext("Snk-1.0", "Snk-1.0", "Sink") ]
        });
        parent.environment = serde_json::from_value(value).unwrap();
        parent.interactions.push(
            serde_json::from_value(exo_flow("F2", "leak", "C0.0", "Snk-1.0", "Material")).unwrap(),
        );
        let issues = derive_child(&parent, &comp()).err().expect("interface must refuse");
        assert!(messages(&issues).contains("v1 refuses"), "{}", messages(&issues));
    }
}
