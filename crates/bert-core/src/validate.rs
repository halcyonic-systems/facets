//! BERT validator 2 of 3 — pre-render, structural (operates on a loaded `WorldModel`; errors block load).
//! Siblings: `general-systems-reasoner/core/src/constraints.rs` (generation-time, spec `Value`),
//! `bert/tools/bert-typedb/src/validate.rs` (pre-transpile). See the bert-dev skill "Validators".

use crate::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Severity {
    Error,
    Warning,
}

/// Stable doc anchors for surfaced refusals (bert-lenses#129). Each is a
/// repo-relative doc path plus a GitHub-style heading anchor — the kernel
/// decides which glossary/concordance/spec entry a refusal's precondition
/// cites (judgment stays kernel-side); the face only turns the string into a
/// link. Anchors are pinned by `doc_anchors_resolve` in this module's tests,
/// so a renamed heading fails the gate instead of shipping a dead link.
pub mod doc {
    /// Bunge's bond-vs-mere distinction — the `HasBond` precondition's concept.
    pub const BOND: &str = "docs/glossary.md#bond--mere";
    /// The named, machine-checked lens entry gates (`HasBond`, `Irreflexive`).
    pub const PRECONDITION: &str = "docs/glossary.md#precondition";
    /// Modes as parallel lenses (Core / Structural / Operational / Full).
    pub const MODE_LENS: &str = "docs/glossary.md#mode--lens";
    /// The mode-stamped file artifact and its structural conventions.
    pub const WORLD_MODEL: &str = "docs/glossary.md#worldmodel";
    /// Environment, sources, and sinks across the three traditions.
    pub const ENVIRONMENT: &str =
        "docs/language/terminology-concordance.md#3-a-thing-outside-the-system";
    /// Relations / bonds / flows — what an interaction is, per tradition.
    pub const CONNECTION: &str =
        "docs/language/terminology-concordance.md#4-a-connection-between-parts";
    /// Interfaces as boundary members, per tradition.
    pub const INTERFACE: &str = "docs/language/terminology-concordance.md#9-interface";
    /// The observed-warns / declared-refuses doctrine (#69) and the layered guarantee.
    pub const OBSERVED_DECLARED: &str =
        "docs/kernel-architecture.md#the-layered-guarantee--honestly-rated";
    /// The decomposition boundary contract (Lean `Decomposition`, all seam rows).
    pub const DECOMPOSITION: &str =
        "docs/design/decomposition-foundations.md#3-the-boundary-contract-stated-precisely";
    /// What each lens takes and drops — Mobus's openness commitment lives here.
    pub const OPENNESS: &str = "docs/theory-fidelity.md#per-tradition-take--drop--where--why";

    /// Every anchor above, for the existence gate in tests.
    pub const ALL: &[&str] = &[
        BOND,
        PRECONDITION,
        MODE_LENS,
        WORLD_MODEL,
        ENVIRONMENT,
        CONNECTION,
        INTERFACE,
        OBSERVED_DECLARED,
        DECOMPOSITION,
        OPENNESS,
    ];
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidationIssue {
    pub severity: Severity,
    pub location: String,
    pub message: String,
    pub suggestion: Option<String>,
    /// Stable doc anchor for the precondition this issue cites (one of
    /// [`doc`]'s constants) — the face renders it as a glossary/docs link
    /// (bert-lenses#129). Kernel judgment: which entry a refusal teaches is
    /// decided here, never by string-matching in JS.
    #[serde(default)]
    pub doc: Option<String>,
    /// The kernel entity this issue is about, when a check knows one — an
    /// IN-PROCESS handle for callers holding id maps (bert-canvas resolves it
    /// to canvas ids for click-to-navigate). `serde(skip)`: the wire shape is
    /// unchanged; `location` remains the serialized coordinate.
    #[serde(skip)]
    pub subject: Option<Id>,
}

impl ValidationIssue {
    fn with_subject(mut self, id: &Id) -> Self {
        self.subject = Some(id.clone());
        self
    }

    /// Attach the stable doc anchor this issue's precondition cites (#129).
    pub fn with_doc(mut self, doc: &str) -> Self {
        self.doc = Some(doc.to_string());
        self
    }

    fn error(
        location: impl Into<String>,
        message: impl Into<String>,
        suggestion: Option<&str>,
    ) -> Self {
        Self {
            severity: Severity::Error,
            location: location.into(),
            message: message.into(),
            suggestion: suggestion.map(|s| s.to_string()),
            doc: None,
            subject: None,
        }
    }

    fn warning(
        location: impl Into<String>,
        message: impl Into<String>,
        suggestion: Option<&str>,
    ) -> Self {
        Self {
            severity: Severity::Warning,
            location: location.into(),
            message: message.into(),
            suggestion: suggestion.map(|s| s.to_string()),
            doc: None,
            subject: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ValidationResult {
    pub issues: Vec<ValidationIssue>,
}

impl ValidationResult {
    pub fn has_errors(&self) -> bool {
        self.issues.iter().any(|i| i.severity == Severity::Error)
    }

    pub fn has_warnings(&self) -> bool {
        self.issues.iter().any(|i| i.severity == Severity::Warning)
    }

    pub fn is_clean(&self) -> bool {
        self.issues.is_empty()
    }
}

pub fn validate(model: &WorldModel) -> ValidationResult {
    let mut issues = Vec::new();

    let known_ids = collect_known_ids(model);
    let interface_ids = collect_interface_ids(model);

    check_orphan_sources(model, &mut issues);
    check_orphan_sinks(model, &mut issues);
    check_interaction_references(model, &known_ids, &mut issues);
    check_interface_references(model, &interface_ids, &mut issues);
    check_parent_references(model, &known_ids, &mut issues);
    check_duplicate_ids(model, &mut issues);
    check_duplicate_edges(model, &mut issues);

    check_environment_id(model, &mut issues);
    check_source_sink_type_consistency(model, &mut issues);
    check_version(model, &mut issues);
    check_level_consistency(model, &mut issues);
    check_processor_flows(model, &mut issues);
    check_s0_interface_processors(model, &mut issues);
    check_stock_units(model, &mut issues);

    ValidationResult { issues }
}

/// Intrinsic-shape check for a declared stock unit (bert-lenses#76, upgraded to
/// real parsing by #94). A stock accumulates its inflow over Δt, so its dimension
/// is a QUANTITY, not a rate — a stock declaring a rate unit is suspect in
/// isolation, before any inflow is consulted. This warns (never errors) when the
/// declared stock unit parses as a rate.
///
/// This runs in every mode because it needs no context beyond the stock's own
/// unit — it is an observation about one declaration, not a proven contradiction
/// between two, so it stays a Warning (`docs/kernel-architecture.md`:
/// observed-warns). Where #76 could only catch a literal slash, the [`units`]
/// parser now also catches a slashless rate like `kW` (power is a rate), and
/// declines to fire on a token it cannot parse — no unit, no claim.
fn check_stock_units(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    for (i, system) in model.systems.iter().enumerate() {
        let Some(agent) = system.agent.as_ref() else {
            continue;
        };
        if agent.primitive != Some(ProcessPrimitive::Buffering) {
            continue;
        }
        let unit = agent.stock_unit.trim();
        let Some(parsed) = units::parse_unit(unit) else {
            continue;
        };
        if parsed.per_time {
            issues.push(ValidationIssue::warning(
                format!("systems[{i}].agent.stock_unit"),
                format!(
                    "stock \"{}\" declares a rate-like unit '{unit}' — a stock \
                     accumulates its inflow over Δt, so its dimension is a \
                     quantity (rate × time), not a rate",
                    system.info.name
                ),
                Some(
                    "Declare the accumulated quantity's unit (e.g. 'ML' for an \
                     'ML/mo' inflow, 'kWh' for a 'kW' inflow)",
                ),
            ).with_doc(doc::OBSERVED_DECLARED));
        }
    }
}

/// Derived-vs-declared dimensional consistency (bert-lenses#94). Where
/// [`check_stock_units`] judges a stock unit in isolation, this reconciles two
/// author-declared facts through the flow × Δt integration law: a Buffering
/// stock's declared unit against the dimension its inflow's unit accumulates to.
/// A `kW` inflow accrues energy, so a stock declaring `kW` (power) has stated an
/// inconsistency the kernel can prove.
///
/// **Severity: Error (a refusal).** Per the observed-warns / declared-refuses
/// doctrine (`docs/kernel-architecture.md`, #69), the kernel refuses stated
/// inconsistencies and only warns about observations it cannot pin to intent.
/// Both the flow unit and the stock unit are author-declared, and the derivation
/// is a kernel law, not a guess — so their disagreement is a *declared*
/// inconsistency, the same class as a violated reachability requirement. It
/// refuses only in Operational/Full, where units feed a run; in Core/Structural
/// a half-authored unit is not yet a claim. The refusal is gated on BOTH units
/// parsing: an unknown unit is not a stated fact, so it cannot contradict one.
///
/// Bare-quantity inflows are admitted leniently (see
/// [`units::Unit::stock_candidate_dimensions`]) — only a genuinely irreconcilable
/// pair refuses, never an honest `L`-flow / `L`-stock.
///
/// #220: unreachable from the canvas today — `bert_canvas::project` writes an
/// empty `unit` on every interaction and a canvas `Relation` has no unit field,
/// so the flow unit never parses and the gate never opens. It is live for
/// compose-emitted and loaded models. Closing that gap means giving the canvas a
/// flow-unit affordance, not weakening this check.
fn check_stock_dimensions(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    for (i, system) in model.systems.iter().enumerate() {
        let Some(agent) = system.agent.as_ref() else {
            continue;
        };
        if agent.primitive != Some(ProcessPrimitive::Buffering) {
            continue;
        }
        let Some(declared) = units::parse_unit(agent.stock_unit.trim()) else {
            continue;
        };
        let stock_id = serialize_id(&system.info.id);
        for ix in &model.interactions {
            if serialize_id(&ix.sink) != stock_id {
                continue;
            }
            let Some(flow) = units::parse_unit(ix.unit.trim()) else {
                continue;
            };
            let candidates = flow.stock_candidate_dimensions();
            if !candidates.contains(&declared.dimension) {
                issues.push(
                    ValidationIssue::error(
                        format!("systems[{i}].agent.stock_unit"),
                        format!(
                            "stock \"{}\" declares unit '{}', but its inflow '{}' \
                             ({}) accumulates over Δt to a different dimension — a \
                             stock holds the integral of its inflow, so a '{}' \
                             inflow fills a '{}'-dimensioned stock, not '{}'",
                            system.info.name,
                            agent.stock_unit.trim(),
                            ix.info.name,
                            ix.unit.trim(),
                            ix.unit.trim(),
                            integrated_unit_hint(&ix.unit),
                            agent.stock_unit.trim(),
                        ),
                        Some(
                            "Declare the stock's unit as the inflow's unit × time \
                             (e.g. 'kWh' for a 'kW' inflow, 'ML' for an 'ML/mo' \
                             inflow), or correct the inflow's unit",
                        ),
                    )
                    .with_doc(doc::OBSERVED_DECLARED)
                    .with_subject(&system.info.id),
                );
                break;
            }
        }
    }
}

/// A best-effort human label for the dimension a flow unit integrates to, used
/// only to make the mismatch message concrete (`kW` → `kWh`, `ML/mo` → `ML`).
/// Falls back to the flow unit itself when the shape is not one this small table
/// recognizes — the message stays honest either way.
fn integrated_unit_hint(flow_unit: &str) -> String {
    let trimmed = flow_unit.trim();
    match trimmed {
        "kW" => "kWh".to_string(),
        "W" => "Wh".to_string(),
        "MW" => "MWh".to_string(),
        _ => match trimmed.split_once('/') {
            Some((quantity, _rate)) => quantity.to_string(),
            None => trimmed.to_string(),
        },
    }
}

/// Gate *entry* into a target mode on the kernel lattice.
///
/// This never asks "is the model valid"; it asks "may this model be authored
/// *as* a [`Mode`]". Every model is a valid Core model — each mode adds its own
/// faithful-view hypothesis, proven in
/// `systems-science-foundations/Systems/Klir/ViewGeneration.lean`. The modes are
/// parallel lenses, not a tower: `Structural` needs a bond (Bunge) and
/// `Operational` needs irreflexivity (Mobus), but neither inherits the other —
/// they share only `Core`'s on-ness. `Full` extends `Operational` with a
/// dynamical-face check that, since `Full` is the default view, only warns.
///
/// Universal structural errors (dangling refs, orphans, duplicates) are caught
/// first by [`validate`] and surface in every mode — they are defects, not
/// mode mismatches. `validate_mode` borrows the model immutably: switching the
/// displayed mode never mutates it, so a lens-switching UI can ask this freely.
pub fn validate_mode(model: &WorldModel, target: Mode) -> ValidationResult {
    let mut result = validate(model);
    let issues = &mut result.issues;

    // Core's rule — every interaction endpoint resolves (on-ness) — is already
    // enforced by `validate`'s `check_interaction_references`.
    match target {
        Mode::Core => {}
        Mode::Structural => check_bond(model, issues),
        Mode::Operational => {
            check_self_loops(model, issues);
            check_dead_ends(model, issues);
            check_reachability(model, issues);
            check_reachability_requirements(model, issues);
            check_stock_dimensions(model, issues);
            check_interfaces_carry_flow(model, issues);
            check_interface_declarations_match_flows(model, issues);
        }
        Mode::Full => {
            check_self_loops(model, issues);
            check_dead_ends(model, issues);
            check_reachability(model, issues);
            check_reachability_requirements(model, issues);
            check_stock_dimensions(model, issues);
            check_interfaces_carry_flow(model, issues);
            check_interface_declarations_match_flows(model, issues);
            check_dynamical_face(model, issues);
        }
    }

    result
}

/// Structural precondition: at least one bond between two distinct system components.
///
/// **Stronger than the Lean, deliberately — do not describe this as mirroring it.**
/// `Kernel.HasBond` is `∃ p ∈ k.dep, p.1 ≠ p.2 ∧ Bonded p.1 p.2`, quantified over
/// relata with no type restriction, because the kernel has no composition/environment
/// split to restrict against. The `is_system_relatum` conjunct below adds one: it
/// admits only `System | Subsystem` endpoints, so a bond to a `Source` or `Sink`
/// does not count. That restriction is a canvas-layer notion with no Lean counterpart,
/// and nothing proved licenses it.
///
/// It is load-bearing rather than cosmetic. Under the Lean, `assets/corpus/mobus/
/// steel-plant.sl` satisfies `HasBond` and generates a Bunge CES view; under this
/// function it is refused as an aggregate. Two corpus entries turn on the difference
/// (also `klir/cellular-array-cell.sl`), and no fixture in `tests/common` ever places
/// a `Source` or `Sink` at an interaction endpoint, so the extra conjunct is invisible
/// to the Lean-to-Rust bridge that is supposed to police exactly this (#216).
fn check_bond(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let bonded = model.interactions.iter().any(|ix| {
        is_system_relatum(&ix.source) && is_system_relatum(&ix.sink) && ix.source != ix.sink
    });
    if !bonded {
        issues.push(ValidationIssue::error(
            "mode/Structural",
            "Bunge Def 1.1: a system requires at least one bond between distinct \
             components; an unbonded collection is an aggregate",
            Some("Add an interaction between two distinct systems, or author in Core mode"),
        ).with_doc(doc::BOND));
    }
}

/// Operational precondition: no interaction depends on itself. Mirrors Lean `Kernel.Irreflexive`.
fn check_self_loops(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    for (i, ix) in model.interactions.iter().enumerate() {
        if ix.source == ix.sink {
            issues.push(ValidationIssue::error(
                format!("interactions[{i}]"),
                format!(
                    "Mobus §4.3: flow edges require k ≠ o; '{}' has the same endpoint as \
                     source and sink, and self-dependency is not representable in the 8-tuple",
                    ix.info.name
                ),
                Some("Remove the self-loop; feedback as a first-class cycle is Cybernetic mode (not yet available)"),
            ).with_doc(doc::PRECONDITION).with_subject(&ix.info.id));
        }
    }
}

/// Full check: warn *once* when the model engages the dynamical face nowhere.
/// Full is the default view, so an empty face informs rather than blocks (the
/// slots stay stringly-typed in v2.0 — typing them is deferred). A model-level
/// check, not per-system: a single populated system means the model is using
/// Full, so a per-leaf warning would only add noise. Any non-empty slot counts.
fn check_dynamical_face(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    if model.systems.is_empty() {
        return;
    }
    let any_face = model.systems.iter().any(|s| {
        !s.transformation.trim().is_empty()
            || !s.history.trim().is_empty()
            || !s.time_constant.trim().is_empty()
    });
    if !any_face {
        issues.push(ValidationIssue::warning(
            "mode/Full",
            "Full mode shows the dynamical face, but no system has a transformation, \
             history, or time constant",
            Some("Populate the dynamical slots, or view this model in Operational mode"),
        ).with_doc(doc::MODE_LENS));
    }
}

/// Name a system relatum for a message, falling back to its id when unnamed.
fn system_name(model: &WorldModel, id_str: &str) -> String {
    model
        .systems
        .iter()
        .find(|s| serialize_id(&s.info.id) == id_str)
        .map(|s| s.info.name.clone())
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| id_str.to_string())
}

/// Universal Warning: two interactions with the same source, sink, type, and
/// substance are parallel duplicates. Distinct from `check_duplicate_ids`
/// (repeated *ids*) — a genuine second channel differs in substance or
/// usability, so identical edges are almost always an accidental double-draw.
/// Warned, never blocked.
fn check_duplicate_edges(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let mut seen: HashMap<(String, String, InteractionType, SubstanceType), String> = HashMap::new();
    for (i, ix) in model.interactions.iter().enumerate() {
        let key = (
            serialize_id(&ix.source),
            serialize_id(&ix.sink),
            ix.ty,
            ix.substance.ty,
        );
        let loc = format!("interactions[{i}]");
        match seen.get(&key) {
            Some(prior) => issues.push(
                ValidationIssue::warning(
                    &loc,
                    format!(
                        "duplicate edge {}→{} (same type and substance as {prior})",
                        key.0, key.1
                    ),
                    Some("Remove the duplicate, or distinguish it by substance or usability"),
                )
                .with_doc(doc::CONNECTION)
                .with_subject(&ix.info.id),
            ),
            None => {
                seen.insert(key, loc);
            }
        }
    }
}

/// Operational/Full observation: a node with incoming flows but none outgoing.
/// As often a legitimate terminal/absorbing state as a modeling gap, so it is a
/// Warning phrased as a question — the kernel names it and leaves intent to a
/// human (or an LLM critic); it never rejects an absorbing state.
fn check_dead_ends(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let mut has_out: HashSet<String> = HashSet::new();
    let mut has_in: HashSet<String> = HashSet::new();
    for ix in &model.interactions {
        if is_system_relatum(&ix.source) {
            has_out.insert(serialize_id(&ix.source));
        }
        if is_system_relatum(&ix.sink) {
            has_in.insert(serialize_id(&ix.sink));
        }
    }
    for (i, system) in model.systems.iter().enumerate() {
        let id_str = serialize_id(&system.info.id);
        if has_in.contains(&id_str) && !has_out.contains(&id_str) {
            issues.push(
                ValidationIssue::warning(
                    format!("systems[{i}]"),
                    format!(
                        "'{}' has no outgoing transitions — intended as a terminal/absorbing state?",
                        system_name(model, &id_str)
                    ),
                    Some("If it should continue, add an outgoing flow; if it is an endpoint, this is fine"),
                )
                .with_doc(doc::OBSERVED_DECLARED)
                .with_subject(&system.info.id),
            );
        }
    }
}

/// Operational/Full observation: nodes not reachable from any entry. An entry is
/// a graph node with no incoming flow (a natural start) or one fed by an external
/// Source; anything reachable only through a cycle with no entry is flagged. A
/// Warning — an unreachable island is usually a wiring gap, but the kernel
/// surfaces it for judgment rather than rejecting the model.
fn check_reachability(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let mut adj: HashMap<String, Vec<String>> = HashMap::new();
    let mut nodes: HashSet<String> = HashSet::new();
    let mut has_in: HashSet<String> = HashSet::new();
    let mut source_fed: HashSet<String> = HashSet::new();
    for ix in &model.interactions {
        let src = serialize_id(&ix.source);
        let snk = serialize_id(&ix.sink);
        let src_node = is_system_relatum(&ix.source);
        let snk_node = is_system_relatum(&ix.sink);
        if src_node {
            nodes.insert(src.clone());
        }
        if snk_node {
            nodes.insert(snk.clone());
            has_in.insert(snk.clone());
            if ix.source.ty == IdType::Source {
                source_fed.insert(snk.clone());
            }
        }
        if src_node && snk_node {
            adj.entry(src).or_default().push(snk);
        }
    }

    let mut stack: Vec<String> = nodes
        .iter()
        .filter(|n| !has_in.contains(*n) || source_fed.contains(*n))
        .cloned()
        .collect();
    let mut seen: HashSet<String> = stack.iter().cloned().collect();
    while let Some(n) = stack.pop() {
        if let Some(next) = adj.get(&n) {
            for m in next {
                if seen.insert(m.clone()) {
                    stack.push(m.clone());
                }
            }
        }
    }

    for (i, system) in model.systems.iter().enumerate() {
        let id_str = serialize_id(&system.info.id);
        if nodes.contains(&id_str) && !seen.contains(&id_str) {
            issues.push(
                ValidationIssue::warning(
                    format!("systems[{i}]"),
                    format!(
                        "'{}' is not reachable from any entry node",
                        system_name(model, &id_str)
                    ),
                    Some("Connect it to the flow graph, or check whether it sits in a disconnected cycle"),
                )
                .with_doc(doc::OBSERVED_DECLARED)
                .with_subject(&system.info.id),
            );
        }
    }
}

/// Operational/Full refusal: evaluate the author's declared reachability
/// requirements (#69) against the flow graph. Where #66's checks only *warn* —
/// a lone graph observation cannot know whether an absorbing state or a single
/// mandatory checkpoint is intended — a stated requirement encodes the intent, so
/// a violation is an Error, citing the specific elements. This is the deterministic
/// promotion of the "structurally-silent missing path" error class the LLM leg
/// could not catch (WP4, 2026-07-17): the kernel cannot invent the requirement,
/// but once the author states it, the kernel can prove or refuse it exactly.
///
/// The graph runs over *all* relata (systems, sources, sinks) so a requirement may
/// name an external entry or terminal, not only internal systems. A requirement
/// naming an id that resolves to no entity is itself a defect and errors.
fn check_reachability_requirements(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    if model.reachability_requirements.is_empty() {
        return;
    }

    let mut adj: HashMap<String, Vec<String>> = HashMap::new();
    for ix in &model.interactions {
        adj.entry(serialize_id(&ix.source))
            .or_default()
            .push(serialize_id(&ix.sink));
    }
    let known = collect_known_ids(model);

    for (i, req) in model.reachability_requirements.iter().enumerate() {
        let loc = format!("reachability_requirements[{i}]");
        match req {
            ReachabilityRequirement::MustReach { from, to } => {
                let (from_s, to_s) = (serialize_id(from), serialize_id(to));
                if let Some(id) = unresolved(&known, [&from_s, &to_s]) {
                    issues.push(unresolved_requirement(&loc, id));
                    continue;
                }
                if !path_exists(&adj, &from_s, &to_s, None) {
                    issues.push(
                        ValidationIssue::error(
                            &loc,
                            format!(
                                "required reachability violated: no flow path runs from \
                                 '{from_name}' to '{to_name}' — the model asserts '{to_name}' \
                                 is an outcome the process must be able to arrive at, and the \
                                 graph provides no route to it",
                                from_name = relatum_name(model, &from_s),
                                to_name = relatum_name(model, &to_s),
                            ),
                            Some(
                                "Add the missing transition(s) so the target is reachable, \
                                 or drop the requirement if it no longer holds",
                            ),
                        )
                        .with_doc(doc::OBSERVED_DECLARED)
                        .with_subject(to),
                    );
                }
            }
            ReachabilityRequirement::AlternativePath { from, to, avoiding } => {
                let (from_s, to_s, avoid_s) =
                    (serialize_id(from), serialize_id(to), serialize_id(avoiding));
                if let Some(id) = unresolved(&known, [&from_s, &to_s, &avoid_s]) {
                    issues.push(unresolved_requirement(&loc, id));
                    continue;
                }
                if !path_exists(&adj, &from_s, &to_s, Some(&avoid_s)) {
                    issues.push(
                        ValidationIssue::error(
                            &loc,
                            format!(
                                "required alternative path violated: every flow path from \
                                 '{from_name}' to '{to_name}' passes through '{avoid_name}' — \
                                 the model asserts a route avoiding '{avoid_name}' must exist, \
                                 and none does, so '{avoid_name}' is a forced detour",
                                from_name = relatum_name(model, &from_s),
                                to_name = relatum_name(model, &to_s),
                                avoid_name = relatum_name(model, &avoid_s),
                            ),
                            Some(
                                "Add the alternative transition that bypasses the forced \
                                 detour, or drop the requirement if the detour is intended",
                            ),
                        )
                        .with_doc(doc::OBSERVED_DECLARED)
                        .with_subject(avoiding),
                    );
                }
            }
        }
    }
}

/// First id in `ids` that is not a known entity, if any — a requirement that names
/// a non-existent element is malformed, not merely unsatisfied.
fn unresolved<'a>(
    known: &HashSet<String>,
    ids: impl IntoIterator<Item = &'a String>,
) -> Option<&'a String> {
    ids.into_iter().find(|id| !known.contains(*id))
}

fn unresolved_requirement(loc: &str, id: &str) -> ValidationIssue {
    ValidationIssue::error(
        loc,
        format!("reachability requirement references '{id}', which resolves to no known entity"),
        Some("Point the requirement at an existing system, source, or sink id"),
    )
    .with_doc(doc::OBSERVED_DECLARED)
}

/// Directed reachability over the flow graph: is `to` reachable from `from`,
/// optionally with `blocked` removed from the graph? Removing `blocked` (or
/// starting/ending on it) makes it unreachable *through* that node, which is
/// exactly the forced-detour question.
fn path_exists(
    adj: &HashMap<String, Vec<String>>,
    from: &str,
    to: &str,
    blocked: Option<&str>,
) -> bool {
    if Some(from) == blocked || Some(to) == blocked {
        return false;
    }
    let mut stack = vec![from.to_string()];
    let mut seen: HashSet<String> = stack.iter().cloned().collect();
    while let Some(n) = stack.pop() {
        if n == to {
            return true;
        }
        if let Some(next) = adj.get(&n) {
            for m in next {
                if Some(m.as_str()) == blocked {
                    continue;
                }
                if seen.insert(m.clone()) {
                    stack.push(m.clone());
                }
            }
        }
    }
    false
}

/// Name any relatum — system, external source, or sink — for a message, falling
/// back to its id when unnamed. Broader than [`system_name`], which sees only systems.
fn relatum_name(model: &WorldModel, id_str: &str) -> String {
    let externals = model
        .environment
        .sources
        .iter()
        .chain(&model.environment.sinks)
        .chain(model.systems.iter().flat_map(|s| s.sources.iter().chain(&s.sinks)));
    for ext in externals {
        if serialize_id(&ext.info.id) == id_str && !ext.info.name.is_empty() {
            return ext.info.name.clone();
        }
    }
    system_name(model, id_str)
}

/// Classify a model as open or closed *with respect to mass*, returning a short
/// human-readable note for the UI (shown as a non-blocking toast on load).
///
/// Closed = no Energy/Material flow crosses the boundary (every mass flow runs
/// system↔system); open = some mass flow has an external `Source` or `Sink` endpoint.
/// Message flows are ignored (information is not conserved). An empty environment is
/// the *signature* of a closed system, not a defect — so instead of staying silent on
/// such a model, the loader names the regime and its conservation invariant.
pub fn classify_openness(model: &WorldModel) -> String {
    use crate::{InteractionType, SubstanceType};

    let mut inflows: Vec<String> = Vec::new();
    let mut outflows: Vec<String> = Vec::new();
    for ix in &model.interactions {
        if matches!(ix.ty, InteractionType::Force) {
            continue;
        }
        if !matches!(
            ix.substance.ty,
            SubstanceType::Energy | SubstanceType::Material
        ) {
            continue;
        }
        if ix.source.ty == IdType::Source {
            inflows.push(ix.info.name.clone());
        }
        if ix.sink.ty == IdType::Sink {
            outflows.push(ix.info.name.clone());
        }
    }

    if inflows.is_empty() && outflows.is_empty() {
        "Closed system (mass): no Energy/Material flow crosses the boundary — total mass is conserved.".to_string()
    } else {
        format!(
            "Open system (mass): mass crosses the boundary (in: [{}], out: [{}]) — internal mass changes by net flux.",
            inflows.join(", "),
            outflows.join(", "),
        )
    }
}

fn serialize_id(id: &Id) -> String {
    serde_json::to_string(id)
        .ok()
        .and_then(|s| {
            s.strip_prefix('"')
                .and_then(|s| s.strip_suffix('"'))
                .map(|s| s.to_string())
        })
        .unwrap_or_default()
}

fn collect_known_ids(model: &WorldModel) -> HashSet<String> {
    let mut known = HashSet::new();
    known.insert(serialize_id(&model.environment.info.id));
    for system in &model.systems {
        known.insert(serialize_id(&system.info.id));
        for src in &system.sources {
            known.insert(serialize_id(&src.info.id));
        }
        for snk in &system.sinks {
            known.insert(serialize_id(&snk.info.id));
        }
        for iface in &system.boundary.interfaces {
            known.insert(serialize_id(&iface.info.id));
        }
    }
    for src in &model.environment.sources {
        known.insert(serialize_id(&src.info.id));
    }
    for snk in &model.environment.sinks {
        known.insert(serialize_id(&snk.info.id));
    }
    known
}

fn collect_interface_ids(model: &WorldModel) -> HashSet<String> {
    let mut ids = HashSet::new();
    for system in &model.systems {
        for iface in &system.boundary.interfaces {
            ids.insert(serialize_id(&iface.info.id));
        }
    }
    ids
}

fn check_orphan_sources(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let referenced_sources: HashSet<String> = model
        .interactions
        .iter()
        .filter(|ix| ix.source.ty == IdType::Source)
        .map(|ix| serialize_id(&ix.source))
        .collect();

    let mut check_sources = |sources: &[ExternalEntity], loc_prefix: &str| {
        for (i, src) in sources.iter().enumerate() {
            let id_str = serialize_id(&src.info.id);
            if !referenced_sources.contains(&id_str) {
                issues.push(ValidationIssue::error(
                    format!("{loc_prefix}.sources[{i}]"),
                    format!(
                        "orphan source '{id_str}' is not referenced by any interaction — \
                         the environment enters a model only through flows, so a source \
                         that couples to nothing lies outside the system's boundary"
                    ),
                    Some("Add an interaction with this source, or remove it"),
                ).with_doc(doc::ENVIRONMENT));
            }
        }
    };

    check_sources(&model.environment.sources, "environment");
    for (i, system) in model.systems.iter().enumerate() {
        check_sources(&system.sources, &format!("systems[{i}]"));
    }
}

fn check_orphan_sinks(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let referenced_sinks: HashSet<String> = model
        .interactions
        .iter()
        .filter(|ix| ix.sink.ty == IdType::Sink)
        .map(|ix| serialize_id(&ix.sink))
        .collect();

    let mut check_sinks = |sinks: &[ExternalEntity], loc_prefix: &str| {
        for (i, snk) in sinks.iter().enumerate() {
            let id_str = serialize_id(&snk.info.id);
            if !referenced_sinks.contains(&id_str) {
                issues.push(ValidationIssue::error(
                    format!("{loc_prefix}.sinks[{i}]"),
                    format!(
                        "orphan sink '{id_str}' is not referenced by any interaction — \
                         a sink is defined by what flows into it, so one that receives \
                         nothing is not part of the system's coupling to its environment"
                    ),
                    Some("Add an interaction with this sink, or remove it"),
                ).with_doc(doc::ENVIRONMENT));
            }
        }
    };

    check_sinks(&model.environment.sinks, "environment");
    for (i, system) in model.systems.iter().enumerate() {
        check_sinks(&system.sinks, &format!("systems[{i}]"));
    }
}

fn check_interaction_references(
    model: &WorldModel,
    known: &HashSet<String>,
    issues: &mut Vec<ValidationIssue>,
) {
    for (i, ix) in model.interactions.iter().enumerate() {
        let src = serialize_id(&ix.source);
        if !known.contains(&src) {
            issues.push(ValidationIssue::error(
                format!("interactions[{i}].source"),
                format!("source '{src}' does not resolve to any known entity"),
                Some("Check the source ID matches an existing system, source, or sink"),
            ).with_doc(doc::CONNECTION).with_subject(&ix.info.id));
        }
        let snk = serialize_id(&ix.sink);
        if !known.contains(&snk) {
            issues.push(ValidationIssue::error(
                format!("interactions[{i}].sink"),
                format!("sink '{snk}' does not resolve to any known entity"),
                Some("Check the sink ID matches an existing system, source, or sink"),
            ).with_doc(doc::CONNECTION).with_subject(&ix.info.id));
        }
    }
}

fn check_interface_references(
    model: &WorldModel,
    interfaces: &HashSet<String>,
    issues: &mut Vec<ValidationIssue>,
) {
    for (i, ix) in model.interactions.iter().enumerate() {
        if let Some(ref src_iface) = ix.source_interface {
            let id_str = serialize_id(src_iface);
            if !interfaces.contains(&id_str) {
                issues.push(ValidationIssue::error(
                    format!("interactions[{i}].source_interface"),
                    format!("source_interface '{id_str}' does not resolve to any known interface"),
                    Some("Check the interface ID exists on the source system's boundary"),
                ).with_doc(doc::INTERFACE));
            }
        }
        if let Some(ref snk_iface) = ix.sink_interface {
            let id_str = serialize_id(snk_iface);
            if !interfaces.contains(&id_str) {
                issues.push(ValidationIssue::error(
                    format!("interactions[{i}].sink_interface"),
                    format!("sink_interface '{id_str}' does not resolve to any known interface"),
                    Some("Check the interface ID exists on the sink system's boundary"),
                ).with_doc(doc::INTERFACE));
            }
        }
    }
}

// `check_orphan_interfaces` was removed in bert-lenses#220. It warned when an
// interface was neither routed by a flow nor claimed by a `parent_interface`.
// The second disjunct made it a tautology over every canvas-projected model —
// `bert_canvas::project` sets `parent_interface` on every designated component —
// so it read as coverage of the flowless case while never firing on one.
//
// Both repairs collapse into a check that already exists. Dropping the
// `parent_interface` disjunct leaves "no flow routes through this interface",
// which is a weaker restatement of [`check_interfaces_carry_flow`] (that one
// also honours the declared `receives_from`/`exports_to` and rates it Error at
// Operational/Full per SSF #31); running both double-reports one interface at
// two severities. Keeping the disjunct and rating the unattached half on its own
// is [`check_s0_interface_processors`], verbatim, for the only interfaces the
// canvas produces. Universal-mode coverage is a decided non-goal besides: #213
// and #219 settled that Klir and Bunge carry no interface concept and stay
// silent, so a universal Warning would fire under lenses that cannot express it.
//
// Not covered by either survivor, and left open: an interface declaring a
// `receives_from`/`exports_to` that no interaction records. That is a
// declaration-vs-graph inconsistency, a different defect from a flowless
// interface, and neither check names it.

/// Mobus's `I` is functional, not positional: an interface is a component that
/// *transports a flow across the boundary*. `Tuple.lean` used to encode only the
/// forward half (`bipartite`: every crossing flow lands on an interface) and
/// left the converse open, which is exactly what a flowless interface is. SSF
/// #31 adds `interfaces_carry_flow : ∀ i ∈ boundary.interfaces, ∃ e ∈
/// externalFlows, i ∈ e.endpoints`, and SSF #35 proves it non-redundant against
/// a separating instance carrying a live external flow — so it bites in a
/// working system, not only degenerately.
///
/// **Severity: Error (a refusal), Operational and Full only.** This is a
/// declared inconsistency, not an observation: the author stated `interface` on
/// a component and stated no crossing flow for it, and Mobus's own description
/// language cannot express the pair — Listing 4.2 gives every interface a
/// mandatory `recievesFrom`/`exportsTo`, so a flowless interface is not
/// *writable* there. Core and Structural stay silent: Klir and Bunge carry no
/// interface concept, so a stamp without its flow is not yet a claim either
/// lens can read (#213, #219; the universal Warning that used to sit here was
/// removed in #220 — see the note above).
///
/// The location is the interface's own path and carries no field suffix — see
/// [`is_interface_flow_refusal`], which `bert_canvas` uses to keep this refusal
/// out of the connection gesture (bert-lenses#213).
fn check_interfaces_carry_flow(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let routed: HashSet<String> = model
        .interactions
        .iter()
        .flat_map(|ix| [ix.source_interface.as_ref(), ix.sink_interface.as_ref()])
        .flatten()
        .map(serialize_id)
        .collect();

    for (i, system) in model.systems.iter().enumerate() {
        for (j, iface) in system.boundary.interfaces.iter().enumerate() {
            let id_str = serialize_id(&iface.info.id);
            let carries = !iface.receives_from.is_empty()
                || !iface.exports_to.is_empty()
                || routed.contains(&id_str);
            if carries {
                continue;
            }
            // The subject is the component that CLAIMED the interface, not the
            // interface record — the designation is what the author must undo or
            // complete, and it is what a surface can navigate to.
            let subject = model
                .systems
                .iter()
                .find(|s| s.boundary.parent_interface.as_ref().is_some_and(|p| serialize_id(p) == id_str))
                .map_or(&iface.info.id, |s| &s.info.id);
            issues.push(
                ValidationIssue::error(
                    format!("systems[{i}].boundary.interfaces[{j}]"),
                    format!(
                        "interface '{}' carries no boundary-crossing flow — Mobus defines \
                         an interface as a component that transports a flow across the \
                         boundary, so one that transports nothing is a mislabelled \
                         component (Lean `MobusSystem.interfaces_carry_flow`)",
                        iface.info.name
                    ),
                    Some(
                        "Draw the flow this interface gates between it and an \
                         environmental entity, or drop the interface designation",
                    ),
                )
                .with_doc(doc::INTERFACE)
                .with_subject(subject),
            );
        }
    }
}

/// Is this issue [`check_interfaces_carry_flow`]'s refusal? An Error addressed
/// to an interface's own path with no field suffix — the only check that writes
/// one, since [`check_s0_interface_processors`] shares the path but rates
/// Warning, and the duplicate-id check suffixes
/// `.info.id`. Public because `bert_canvas` has to recognize it: the stamp
/// precedes the flow, so refusing at gesture time would refuse a half-drawn
/// model (bert-lenses#212, #213).
pub fn is_interface_flow_refusal(issue: &ValidationIssue) -> bool {
    issue.severity == Severity::Error
        && issue.location.starts_with("systems[")
        && issue.location.contains("].boundary.interfaces[")
        && issue.location.ends_with(']')
}

/// The declaration-vs-graph half of the interface contract (bert-lenses#225),
/// left uncovered when `check_orphan_interfaces` was deleted in #220/#224.
///
/// [`check_interfaces_carry_flow`] asks a GRAPH question — does any external
/// flow touch this interface. This asks a CONSISTENCY question — does the
/// interface's own declared attachment agree with the interactions the model
/// records. A model satisfies the first and violates this one whenever an
/// interface with a real crossing flow declares an `exports_to` naming a
/// different sink than the flow goes to. Neither check subsumes the other, and
/// folding them would produce a message that could not say which defect it
/// found.
///
/// **Severity: Error (a refusal), Operational and Full only.** Not a partial
/// authoring state: `bert_canvas::project` DERIVES `receives_from`/`exports_to`
/// from the same bond list it turns into interactions, so declaration and graph
/// move together and no canvas model ever passes through this shape. The only
/// way to write one is to state both halves explicitly — a hand-authored or
/// generated file — and there a disagreement is two declarations that cannot
/// both be true, which is the strongest form of the declared-refuses doctrine
/// (`docs/kernel-architecture.md`). Core and Structural stay silent for the
/// same reason as the sibling: Klir and Bunge carry no interface concept
/// (#213, #219).
///
/// A flow counts as recording the declaration when its far endpoint is the
/// declared entity AND its near end reaches this interface — routed through it
/// (`source_interface`/`sink_interface`), or landing on the system whose
/// boundary carries it, or on the subsystem attached via `parent_interface`.
/// Mobus's Listing 4.2 tags name the ENTITY, not the edge, so a model that
/// records the flow without routing it is honouring the declaration.
///
/// Audit-time only, like its sibling — see [`is_interface_declaration_refusal`].
fn check_interface_declarations_match_flows(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    for (i, system) in model.systems.iter().enumerate() {
        for (j, iface) in system.boundary.interfaces.iter().enumerate() {
            if iface.receives_from.is_empty() && iface.exports_to.is_empty() {
                continue;
            }
            let iface_id = serialize_id(&iface.info.id);
            let mut near: HashSet<String> = HashSet::new();
            near.insert(serialize_id(&system.info.id));
            for s in &model.systems {
                if s.boundary
                    .parent_interface
                    .as_ref()
                    .is_some_and(|p| serialize_id(p) == iface_id)
                {
                    near.insert(serialize_id(&s.info.id));
                }
            }

            let recorded = |far: &Id, incoming: bool| {
                let far = serialize_id(far);
                model.interactions.iter().any(|ix| {
                    let (from, to, to_iface) = if incoming {
                        (&ix.source, &ix.sink, ix.sink_interface.as_ref())
                    } else {
                        (&ix.sink, &ix.source, ix.source_interface.as_ref())
                    };
                    serialize_id(from) == far
                        && (to_iface.map(serialize_id) == Some(iface_id.clone())
                            || near.contains(&serialize_id(to)))
                })
            };

            let declared = iface
                .receives_from
                .iter()
                .map(|e| (e, true))
                .chain(iface.exports_to.iter().map(|e| (e, false)));
            for (entity, incoming) in declared {
                if recorded(entity, incoming) {
                    continue;
                }
                let (field, verb, direction) = if incoming {
                    ("receives_from", "receives from", "into")
                } else {
                    ("exports_to", "exports to", "out of")
                };
                let entity_id = serialize_id(entity);
                issues.push(
                    ValidationIssue::error(
                        format!("systems[{i}].boundary.interfaces[{j}].{field}"),
                        format!(
                            "interface '{}' declares it {verb} '{entity_id}', but no \
                             interaction records a flow {direction} it from that entity — \
                             the declared attachment contradicts the interactions this \
                             model records (Mobus Listing 4.2 makes \
                             `recievesFrom`/`exportsTo` the interface's own statement of \
                             what it is attached to)",
                            iface.info.name
                        ),
                        Some(
                            "Draw the flow the declaration names, or drop the entity from \
                             the interface's declaration so the two agree",
                        ),
                    )
                    .with_doc(doc::INTERFACE)
                    .with_subject(&iface.info.id),
                );
            }
        }
    }
}

/// Is this issue [`check_interface_declarations_match_flows`]'s refusal? An
/// Error addressed to an interface's `receives_from`/`exports_to` field — no
/// other check writes that suffix. Public for the same reason as
/// [`is_interface_flow_refusal`]: `bert_canvas` keeps it out of the connection
/// gesture. The declaration can outrun the graph mid-authoring on any path that
/// writes it directly, and refusing a drag for it would be bert-lenses#212 a
/// fourth time.
pub fn is_interface_declaration_refusal(issue: &ValidationIssue) -> bool {
    issue.severity == Severity::Error
        && issue.location.starts_with("systems[")
        && issue.location.contains("].boundary.interfaces[")
        && (issue.location.ends_with(".receives_from") || issue.location.ends_with(".exports_to"))
}

fn check_parent_references(
    model: &WorldModel,
    known: &HashSet<String>,
    issues: &mut Vec<ValidationIssue>,
) {
    for (i, system) in model.systems.iter().enumerate() {
        let parent = serialize_id(&system.parent);
        if !known.contains(&parent) {
            issues.push(ValidationIssue::error(
                format!("systems[{i}].parent"),
                format!("parent '{parent}' does not resolve to any known entity"),
                Some("Parent must be 'E-1' (environment) or an existing system ID"),
            ).with_doc(doc::WORLD_MODEL));
        }
    }
}

fn check_duplicate_ids(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let mut seen: HashMap<String, String> = HashMap::new();

    let mut record = |id_str: String, location: String, issues: &mut Vec<ValidationIssue>| {
        if let Some(prior) = seen.insert(id_str.clone(), location.clone()) {
            issues.push(ValidationIssue::error(
                &location,
                format!("duplicate ID '{id_str}' (first seen at {prior})"),
                Some("Each entity must have a unique ID"),
            ).with_doc(doc::WORLD_MODEL));
        }
    };

    for (i, system) in model.systems.iter().enumerate() {
        record(
            serialize_id(&system.info.id),
            format!("systems[{i}].info.id"),
            issues,
        );
        for (j, src) in system.sources.iter().enumerate() {
            record(
                serialize_id(&src.info.id),
                format!("systems[{i}].sources[{j}].info.id"),
                issues,
            );
        }
        for (j, snk) in system.sinks.iter().enumerate() {
            record(
                serialize_id(&snk.info.id),
                format!("systems[{i}].sinks[{j}].info.id"),
                issues,
            );
        }
        for (j, iface) in system.boundary.interfaces.iter().enumerate() {
            record(
                serialize_id(&iface.info.id),
                format!("systems[{i}].boundary.interfaces[{j}].info.id"),
                issues,
            );
        }
    }
    for (i, src) in model.environment.sources.iter().enumerate() {
        record(
            serialize_id(&src.info.id),
            format!("environment.sources[{i}].info.id"),
            issues,
        );
    }
    for (i, snk) in model.environment.sinks.iter().enumerate() {
        record(
            serialize_id(&snk.info.id),
            format!("environment.sinks[{i}].info.id"),
            issues,
        );
    }
    for (i, ix) in model.interactions.iter().enumerate() {
        record(
            serialize_id(&ix.info.id),
            format!("interactions[{i}].info.id"),
            issues,
        );
    }
}

fn check_environment_id(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let env_id = serialize_id(&model.environment.info.id);
    if env_id != "E-1" {
        issues.push(ValidationIssue::warning(
            "environment.info.id",
            format!("environment ID is '{env_id}', expected 'E-1'"),
            Some("The environment entity should always have ID 'E-1'"),
        ).with_doc(doc::WORLD_MODEL));
    }
}

fn check_source_sink_type_consistency(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let check = |sources: &[ExternalEntity],
                 sinks: &[ExternalEntity],
                 loc_prefix: &str,
                 issues: &mut Vec<ValidationIssue>| {
        for (i, src) in sources.iter().enumerate() {
            if !matches!(src.ty, ExternalEntityType::Source) {
                issues.push(ValidationIssue::warning(
                    format!("{loc_prefix}.sources[{i}].type"),
                    "entity in sources array has type 'Sink'".to_string(),
                    Some("Entities in the sources array should have type 'Source'"),
                ).with_doc(doc::ENVIRONMENT));
            }
        }
        for (i, snk) in sinks.iter().enumerate() {
            if !matches!(snk.ty, ExternalEntityType::Sink) {
                issues.push(ValidationIssue::warning(
                    format!("{loc_prefix}.sinks[{i}].type"),
                    "entity in sinks array has type 'Source'".to_string(),
                    Some("Entities in the sinks array should have type 'Sink'"),
                ).with_doc(doc::ENVIRONMENT));
            }
        }
    };

    check(
        &model.environment.sources,
        &model.environment.sinks,
        "environment",
        issues,
    );
    for (i, system) in model.systems.iter().enumerate() {
        check(
            &system.sources,
            &system.sinks,
            &format!("systems[{i}]"),
            issues,
        );
    }
}

fn check_version(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    if model.version != CURRENT_FILE_VERSION {
        issues.push(ValidationIssue::warning(
            "version",
            format!(
                "model version is {}, current is {CURRENT_FILE_VERSION}",
                model.version
            ),
            Some("This model may have been created with a different version of BERT"),
        ).with_doc(doc::WORLD_MODEL));
    }
}

fn check_level_consistency(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    for (i, system) in model.systems.iter().enumerate() {
        let expected = (system.info.id.indices.len() as i32) - 1;
        if system.info.level != expected {
            issues.push(ValidationIssue::warning(
                format!("systems[{i}].info.level"),
                format!(
                    "level is {} but ID '{}' implies level {}",
                    system.info.level,
                    serialize_id(&system.info.id),
                    expected
                ),
                Some("Level should equal the number of ID indices minus one"),
            ).with_doc(doc::WORLD_MODEL));
        }
    }
}

// ── L3: Pre-parse structural validation ──────────────────────

const WORLD_MODEL_FIELDS: &[&str] = &["version", "environment", "systems", "interactions"];
const SYSTEM_FIELDS: &[&str] = &[
    "info",
    "sources",
    "sinks",
    "parent",
    "complexity",
    "boundary",
    "radius",
    "equivalence",
    "history",
    "transformation",
    "member_autonomy",
    "time_constant",
];
const INFO_FIELDS: &[&str] = &["id", "level", "name", "description"];
const BOUNDARY_FIELDS: &[&str] = &["info", "porosity", "perceptive_fuzziness", "interfaces"];
const ENVIRONMENT_FIELDS: &[&str] = &["info", "sources", "sinks"];
const INTERACTION_FIELDS: &[&str] = &[
    "info",
    "substance",
    "type",
    "usability",
    "source",
    "sink",
    "amount",
    "unit",
    "parameters",
];
const EXTERNAL_ENTITY_FIELDS: &[&str] = &["info", "type", "equivalence", "model"];
const INTERFACE_FIELDS: &[&str] = &["info", "protocol", "type", "exports_to", "receives_from"];

fn check_required_fields(
    obj: &serde_json::Value,
    required: &[&str],
    location: &str,
    issues: &mut Vec<ValidationIssue>,
) {
    if let Some(map) = obj.as_object() {
        for &field in required {
            if !map.contains_key(field) {
                issues.push(ValidationIssue::error(
                    location,
                    format!("Missing required field '{field}'"),
                    Some(&format!("Add the '{field}' field to {location}")),
                ).with_doc(doc::WORLD_MODEL));
            }
        }
    } else {
        issues.push(ValidationIssue::error(
            location,
            format!("Expected an object, found {}", json_type_name(obj)),
            Some(&format!(
                "Replace {location} with an object carrying its required fields \
                 ({}), or re-export the model from BERT",
                required.join(", ")
            )),
        ).with_doc(doc::WORLD_MODEL));
    }
}

fn json_type_name(v: &serde_json::Value) -> &'static str {
    match v {
        serde_json::Value::Null => "null",
        serde_json::Value::Bool(_) => "boolean",
        serde_json::Value::Number(_) => "number",
        serde_json::Value::String(_) => "string",
        serde_json::Value::Array(_) => "array",
        serde_json::Value::Object(_) => "object",
    }
}

fn name_from_info(obj: &serde_json::Value) -> String {
    obj.get("info")
        .and_then(|i| i.get("name"))
        .and_then(|n| n.as_str())
        .unwrap_or("(unnamed)")
        .to_string()
}

pub fn validate_json_structure(json: &serde_json::Value) -> ValidationResult {
    let mut issues = Vec::new();

    check_required_fields(json, WORLD_MODEL_FIELDS, "root", &mut issues);

    if let Some(env) = json.get("environment") {
        check_required_fields(env, ENVIRONMENT_FIELDS, "environment", &mut issues);
        if let Some(info) = env.get("info") {
            check_required_fields(info, INFO_FIELDS, "environment.info", &mut issues);
        }
        for (label, key) in [("sources", "sources"), ("sinks", "sinks")] {
            if let Some(arr) = env.get(key).and_then(|v| v.as_array()) {
                for (i, ent) in arr.iter().enumerate() {
                    let loc = format!("environment.{label}[{i}] '{}'", name_from_info(ent));
                    check_required_fields(ent, EXTERNAL_ENTITY_FIELDS, &loc, &mut issues);
                }
            }
        }
    }

    if let Some(systems) = json.get("systems").and_then(|v| v.as_array()) {
        for (i, sys) in systems.iter().enumerate() {
            let name = name_from_info(sys);
            let loc = format!("systems[{i}] '{name}'");
            check_required_fields(sys, SYSTEM_FIELDS, &loc, &mut issues);

            if let Some(info) = sys.get("info") {
                check_required_fields(info, INFO_FIELDS, &format!("{loc}.info"), &mut issues);
            }
            if let Some(boundary) = sys.get("boundary") {
                check_required_fields(
                    boundary,
                    BOUNDARY_FIELDS,
                    &format!("{loc}.boundary"),
                    &mut issues,
                );
                if let Some(info) = boundary.get("info") {
                    check_required_fields(
                        info,
                        INFO_FIELDS,
                        &format!("{loc}.boundary.info"),
                        &mut issues,
                    );
                }
                if let Some(ifaces) = boundary.get("interfaces").and_then(|v| v.as_array()) {
                    for (j, iface) in ifaces.iter().enumerate() {
                        let iname = name_from_info(iface);
                        let iloc = format!("{loc}.boundary.interfaces[{j}] '{iname}'");
                        check_required_fields(iface, INTERFACE_FIELDS, &iloc, &mut issues);
                    }
                }
            }
            for (label, key) in [("sources", "sources"), ("sinks", "sinks")] {
                if let Some(arr) = sys.get(key).and_then(|v| v.as_array()) {
                    for (j, ent) in arr.iter().enumerate() {
                        let eloc = format!("{loc}.{label}[{j}] '{}'", name_from_info(ent));
                        check_required_fields(ent, EXTERNAL_ENTITY_FIELDS, &eloc, &mut issues);
                    }
                }
            }
        }
    }

    if let Some(interactions) = json.get("interactions").and_then(|v| v.as_array()) {
        for (i, flow) in interactions.iter().enumerate() {
            let name = name_from_info(flow);
            let loc = format!("interactions[{i}] '{name}'");
            check_required_fields(flow, INTERACTION_FIELDS, &loc, &mut issues);
        }
    }

    ValidationResult { issues }
}

// ── L4: Processor boundary-tracing ───────────────────────────

fn check_processor_flows(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    for system in &model.systems {
        if system.boundary.parent_interface.is_none() {
            continue;
        }
        let sys_id = serialize_id(&system.info.id);
        let is_source = model
            .interactions
            .iter()
            .any(|f| serialize_id(&f.source) == sys_id);
        let is_sink = model
            .interactions
            .iter()
            .any(|f| serialize_id(&f.sink) == sys_id);
        if !is_source && !is_sink {
            issues.push(ValidationIssue::warning(
                format!("systems.{name}", name = system.info.name),
                format!(
                    "Processor '{}' has parent_interface but no connecting flows",
                    system.info.name
                ),
                Some("Import processors should be a source in at least one flow; export processors should be a sink"),
            ).with_doc(doc::INTERFACE));
        }
    }
}

/// #220: unfireable for canvas-projected models — `project` claims every
/// interface it mints with a `parent_interface`, the same masking that made
/// `check_orphan_interfaces` vacuous. The intent is real and survives: it is
/// about hierarchical models, where an S0 interface that no level-1 processor
/// claims leaves external flows untraceable inward. Fires on hand-authored and
/// legacy BERT models.
fn check_s0_interface_processors(model: &WorldModel, issues: &mut Vec<ValidationIssue>) {
    let s0_entry = model
        .systems
        .iter()
        .enumerate()
        .find(|(_, s)| s.info.level == 0);
    let (s0_idx, s0) = match s0_entry {
        Some(entry) => entry,
        None => return,
    };

    let claimed: HashSet<String> = model
        .systems
        .iter()
        .filter_map(|s| s.boundary.parent_interface.as_ref())
        .map(serialize_id)
        .collect();

    for (j, iface) in s0.boundary.interfaces.iter().enumerate() {
        let id_str = serialize_id(&iface.info.id);
        if !claimed.contains(&id_str) {
            issues.push(ValidationIssue::warning(
                format!("systems[{s0_idx}].boundary.interfaces[{j}]"),
                format!(
                    "Interface '{}' has no processor — external flows won't trace to internal subsystems",
                    iface.info.name
                ),
                Some("Add a level-1 subsystem with boundary.parent_interface pointing to this interface"),
            ).with_doc(doc::INTERFACE));
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn load_example_model(name: &str) -> WorldModel {
        let path = format!(
            "{}/../../assets/models/examples/{name}",
            env!("CARGO_MANIFEST_DIR")
        );
        let bytes = std::fs::read(&path).unwrap_or_else(|_| panic!("should read {path}"));
        serde_json::from_slice(&bytes).unwrap_or_else(|_| panic!("should parse {name}"))
    }

    #[test]
    fn all_example_models_validate_without_errors() {
        let dir = format!("{}/../../assets/models/examples", env!("CARGO_MANIFEST_DIR"));
        for entry in std::fs::read_dir(&dir).unwrap() {
            let path = entry.unwrap().path();
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            let name = path.file_name().unwrap().to_str().unwrap();
            let model = load_example_model(name);
            let result = validate(&model);
            assert!(
                !result.has_errors(),
                "{name} should have no errors; got: {:#?}",
                result
                    .issues
                    .iter()
                    .filter(|i| i.severity == Severity::Error)
                    .collect::<Vec<_>>()
            );
        }
    }

    fn minimal_model() -> WorldModel {
        let env_id = Id {
            ty: IdType::Environment,
            indices: vec![-1],
        };
        WorldModel {
            version: CURRENT_FILE_VERSION,
            model_id: None,
            mode: None,
            environment: Environment {
                info: Info {
                    id: env_id.clone(),
                    level: -1,
                    name: String::new(),
                    description: String::new(),
                },
                sources: vec![],
                sinks: vec![],
            },
            systems: vec![System {
                info: Info {
                    id: Id {
                        ty: IdType::System,
                        indices: vec![0],
                    },
                    level: 0,
                    name: "Test".to_string(),
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
                            indices: vec![0],
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
                radius: 100.0,
                transform: None,
                equivalence: String::new(),
                history: String::new(),
                transformation: String::new(),
                member_autonomy: 1.0,
                time_constant: "Second".to_string(),
                archetype: None,
                agent: None,
                child_model: None,
            }],
            interactions: vec![],
            hidden_entities: vec![],
            reachability_requirements: vec![],
            time_unit: None,
        }
    }

    #[test]
    fn minimal_model_validates_clean() {
        let model = minimal_model();
        let result = validate(&model);
        assert!(result.is_clean(), "got: {:#?}", result.issues);
    }

    /// bert-lenses#76: a stock that declares a RATE-like unit gets a
    /// dimensional-consistency WARNING (never an error) — a stock holds an
    /// accumulated quantity, not a rate. A quantity unit, or no unit, is clean.
    #[test]
    fn rate_like_stock_unit_warns_never_errors() {
        let buffering = |unit: &str| {
            let mut m = minimal_model();
            let agent = AgentModel {
                primitive: Some(ProcessPrimitive::Buffering),
                stock_unit: unit.to_string(),
                ..AgentModel::default()
            };
            m.systems[0].agent = Some(agent);
            validate(&m)
        };

        let warned = buffering("ML/mo");
        assert!(
            !warned.has_errors(),
            "a declared-unit smell is a warning, not an error: {:#?}",
            warned.issues
        );
        assert!(
            warned
                .issues
                .iter()
                .any(|i| i.severity == Severity::Warning
                    && i.location.contains("stock_unit")),
            "a rate-like stock unit warns: {:#?}",
            warned.issues
        );

        // A quantity unit and an undeclared unit raise no stock-unit warning.
        for clean_unit in ["ML", ""] {
            assert!(
                !buffering(clean_unit)
                    .issues
                    .iter()
                    .any(|i| i.location.contains("stock_unit")),
                "unit {clean_unit:?} should not trip the dimensional warning"
            );
        }
    }

    /// #94: the slashless-rate case #76 could not catch — `kW` is power, a rate,
    /// so a stock declaring it warns exactly as `ML/mo` does.
    #[test]
    fn slashless_rate_stock_unit_warns() {
        let mut m = minimal_model();
        m.systems[0].agent = Some(AgentModel {
            primitive: Some(ProcessPrimitive::Buffering),
            stock_unit: "kW".to_string(),
            ..AgentModel::default()
        });
        let r = validate(&m);
        assert!(!r.has_errors());
        assert!(
            r.issues
                .iter()
                .any(|i| i.severity == Severity::Warning && i.location.contains("stock_unit")),
            "a slashless rate stock unit warns: {:#?}",
            r.issues
        );
    }

    /// A Buffering stock declaring `unit`, fed by one inflow carrying
    /// `flow_unit`. Returns the stock-unit issues an Operational validation
    /// raises, isolated from unrelated operational checks.
    fn stock_fed_by(unit: &str, flow_unit: &str) -> Vec<ValidationIssue> {
        let mut m = minimal_model();
        let stock_id = m.systems[0].info.id.clone();
        m.systems[0].agent = Some(AgentModel {
            primitive: Some(ProcessPrimitive::Buffering),
            stock_unit: unit.to_string(),
            ..AgentModel::default()
        });
        let source_id = Id {
            ty: IdType::Source,
            indices: vec![0],
        };
        let mut inflow = flow(0, "inflow", source_id, stock_id);
        inflow.unit = flow_unit.to_string();
        m.interactions.push(inflow);
        validate_mode(&m, Mode::Operational)
            .issues
            .into_iter()
            .filter(|i| i.location.contains("stock_unit"))
            .collect()
    }

    /// #94 headline: a `kW`-fed stock accumulates energy over Δt, so declaring
    /// the stock in `kW` (power) is a REFUSAL — both units are author-declared and
    /// the flow × Δt derivation is a kernel law, making the disagreement a stated
    /// (declared) inconsistency, not a mere smell (observed-warns/declared-refuses,
    /// docs/kernel-architecture.md).
    #[test]
    fn kw_fed_stock_declaring_power_is_refused() {
        let issues = stock_fed_by("kW", "kW");
        assert!(
            issues.iter().any(|i| i.severity == Severity::Error),
            "a power stock fed by a power inflow refuses: {issues:#?}"
        );
    }

    /// The same stock declared in energy (`kWh`) reconciles — flow × Δt = kW·s =
    /// energy — so no error. Likewise `ML/mo` → `ML`.
    #[test]
    fn correctly_integrated_stock_unit_is_clean() {
        assert!(
            !stock_fed_by("kWh", "kW")
                .iter()
                .any(|i| i.severity == Severity::Error),
            "energy stock fed by power inflow is consistent"
        );
        assert!(
            !stock_fed_by("ML", "ML/mo")
                .iter()
                .any(|i| i.severity == Severity::Error),
            "volume stock fed by a volume-rate inflow is consistent"
        );
    }

    /// A bare-quantity inflow is admitted leniently: an `L`-flow may fill an `L`
    /// stock (the per-tick shorthand), so no refusal.
    #[test]
    fn bare_quantity_flow_and_matching_stock_is_clean() {
        assert!(
            !stock_fed_by("L", "L")
                .iter()
                .any(|i| i.severity == Severity::Error),
            "an L-flow filling an L-stock is not a contradiction"
        );
    }

    /// An unparseable unit on either side is not a stated fact, so it cannot
    /// contradict one — the kernel stays silent rather than refusing a unit it
    /// does not understand.
    #[test]
    fn unknown_units_never_refuse() {
        assert!(stock_fed_by("widgets", "kW").is_empty());
        assert!(stock_fed_by("kWh", "sprockets").is_empty());
    }

    /// The refusal only fires in a run-bearing mode; Core/Structural authoring
    /// tolerates a half-specified unit.
    #[test]
    fn dimension_mismatch_does_not_refuse_in_core() {
        let mut m = minimal_model();
        let stock_id = m.systems[0].info.id.clone();
        m.systems[0].agent = Some(AgentModel {
            primitive: Some(ProcessPrimitive::Buffering),
            stock_unit: "kW".to_string(),
            ..AgentModel::default()
        });
        let source_id = Id {
            ty: IdType::Source,
            indices: vec![0],
        };
        let mut inflow = flow(0, "inflow", source_id, stock_id);
        inflow.unit = "kW".to_string();
        m.interactions.push(inflow);
        assert!(
            !validate_mode(&m, Mode::Core)
                .issues
                .iter()
                .any(|i| i.severity == Severity::Error && i.location.contains("stock_unit")),
            "Core mode does not refuse a unit mismatch"
        );
    }

    /// Law: a source that couples to no interaction lies outside the system's boundary — an error, not a warning.
    #[test]
    fn orphan_source_is_error() {
        let mut model = minimal_model();
        model.environment.sources.push(ExternalEntity {
            info: Info {
                id: Id {
                    ty: IdType::Source,
                    indices: vec![-1, 0],
                },
                level: -1,
                name: "Orphan".to_string(),
                description: String::new(),
            },
            ty: ExternalEntityType::Source,
            transform: None,
            equivalence: String::new(),
            model: String::new(),
            is_same_as_id: None,
        });
        let result = validate(&model);
        assert!(result.has_errors());
        assert!(result
            .issues
            .iter()
            .any(|i| i.message.contains("orphan source")));
    }

    /// Law: a sink that receives no interaction plays no coupling role — an error, not a warning.
    #[test]
    fn orphan_sink_is_error() {
        let mut model = minimal_model();
        model.environment.sinks.push(ExternalEntity {
            info: Info {
                id: Id {
                    ty: IdType::Sink,
                    indices: vec![-1, 0],
                },
                level: -1,
                name: "Orphan".to_string(),
                description: String::new(),
            },
            ty: ExternalEntityType::Sink,
            transform: None,
            equivalence: String::new(),
            model: String::new(),
            is_same_as_id: None,
        });
        let result = validate(&model);
        assert!(result.has_errors());
        assert!(result
            .issues
            .iter()
            .any(|i| i.message.contains("orphan sink")));
    }

    /// Law: every interaction endpoint must resolve to a known entity (on-ness) — a dangling reference is an error.
    #[test]
    fn dangling_interaction_source_is_error() {
        let mut model = minimal_model();
        model.interactions.push(Interaction {
            info: Info {
                id: Id {
                    ty: IdType::Flow,
                    indices: vec![-1, 0],
                },
                level: -1,
                name: "Ghost".to_string(),
                description: String::new(),
            },
            substance: Substance {
                sub_type: String::new(),
                ty: SubstanceType::Message,
            },
            ty: InteractionType::Flow,
            usability: InteractionUsability::Product,
            source: Id {
                ty: IdType::Source,
                indices: vec![-1, 99],
            },
            source_interface: None,
            sink: Id {
                ty: IdType::System,
                indices: vec![0],
            },
            sink_interface: None,
            amount: rust_decimal::Decimal::ZERO,
            unit: String::new(),
            parameters: vec![],
            smart_parameters: vec![],
            endpoint_offset: None,
        });
        let result = validate(&model);
        assert!(result.has_errors());
        assert!(result
            .issues
            .iter()
            .any(|i| i.location.contains("source") && i.message.contains("does not resolve")));
    }

    /// The sink half of `check_interaction_references` — the source half has its
    /// own witness above, and a check with two independent branches owes one each.
    #[test]
    fn dangling_interaction_sink_is_error() {
        let mut model = minimal_model();
        model.interactions.push(flow(
            0,
            "Ghost",
            sys_id(vec![0]),
            Id {
                ty: IdType::Sink,
                indices: vec![-1, 99],
            },
        ));
        // The source is itself unknown here (minimal_model's root is `S0`, not
        // `C0`), so pin the assertion to the sink issue specifically.
        let result = validate(&model);
        assert!(result.issues.iter().any(|i| i.location
            == "interactions[0].sink"
            && i.message.contains("does not resolve")));
    }

    /// An interface id on an interaction that no boundary declares. Firing
    /// witness for `check_interface_references`, both branches — the canvas
    /// cannot produce one (it routes only ids it just minted), so this is a
    /// hand-authored/foreign-JSON net.
    #[test]
    fn dangling_flow_interface_is_error() {
        let phantom = Id {
            ty: IdType::Interface,
            indices: vec![0, 42],
        };
        for on_source in [true, false] {
            let mut model = minimal_model();
            let mut ix = flow(0, "Routed", sys_id(vec![0]), sys_id(vec![0]));
            if on_source {
                ix.source_interface = Some(phantom.clone());
            } else {
                ix.sink_interface = Some(phantom.clone());
            }
            model.interactions.push(ix);
            let field = if on_source {
                "source_interface"
            } else {
                "sink_interface"
            };
            let result = validate(&model);
            assert!(
                result.issues.iter().any(|i| i.location
                    == format!("interactions[0].{field}")
                    && i.message.contains("does not resolve to any known interface")),
                "{field} must not resolve: {:#?}",
                result.issues
            );
        }
    }

    /// Firing witness for `check_parent_references`. Unreachable from the canvas
    /// — `project` parents the root at `E-1` and every component at the root.
    #[test]
    fn unresolvable_parent_is_error() {
        let mut model = minimal_model();
        model.systems[0].parent = sys_id(vec![9, 9]);
        let result = validate(&model);
        assert!(
            result.issues.iter().any(|i| i.location == "systems[0].parent"
                && i.severity == Severity::Error),
            "got: {:#?}",
            result.issues
        );
    }

    /// Firing witness for `check_duplicate_ids`. The canvas mints ids by
    /// construction (per-type prefix plus a running index), so only a
    /// hand-authored or externally generated model can collide.
    #[test]
    fn repeated_id_is_error() {
        let mut model = minimal_model();
        let s0 = model.systems[0].info.id.clone();
        model.systems.push(component(vec![0, 0], "A", s0.clone()));
        model.systems.push(component(vec![0, 0], "A again", s0));
        let result = validate(&model);
        assert!(
            result.issues.iter().any(|i| i.location == "systems[2].info.id"
                && i.message.contains("duplicate ID")),
            "got: {:#?}",
            result.issues
        );
    }

    /// Firing witness for `check_source_sink_type_consistency`, both arrays. The
    /// canvas derives the array from the type in one step, so this too is a
    /// hand-authored net.
    #[test]
    fn misfiled_external_entity_is_warning() {
        let external = |ty: ExternalEntityType, idx: i64| ExternalEntity {
            info: Info {
                id: Id {
                    ty: if matches!(ty, ExternalEntityType::Source) {
                        IdType::Source
                    } else {
                        IdType::Sink
                    },
                    indices: vec![-1, idx],
                },
                level: -1,
                name: "Misfiled".to_string(),
                description: String::new(),
            },
            ty,
            transform: None,
            equivalence: String::new(),
            model: String::new(),
            is_same_as_id: None,
        };

        let mut model = minimal_model();
        model
            .environment
            .sources
            .push(external(ExternalEntityType::Sink, 0));
        model
            .environment
            .sinks
            .push(external(ExternalEntityType::Source, 1));
        let result = validate(&model);
        for (loc, msg) in [
            ("environment.sources[0].type", "type 'Sink'"),
            ("environment.sinks[0].type", "type 'Source'"),
        ] {
            assert!(
                result
                    .issues
                    .iter()
                    .any(|i| i.location == loc
                        && i.severity == Severity::Warning
                        && i.message.contains(msg)),
                "{loc} must warn: {:#?}",
                result.issues
            );
        }
    }

    #[test]
    fn wrong_version_is_warning() {
        let mut model = minimal_model();
        model.version = 999;
        let result = validate(&model);
        assert!(!result.has_errors());
        assert!(result.has_warnings());
        assert!(result.issues.iter().any(|i| i.location == "version"));
    }

    /// Law: a system's level must equal its ID's index depth minus one; a mismatch is a warning.
    #[test]
    fn level_mismatch_is_warning() {
        let mut model = minimal_model();
        model.systems[0].info.level = 5;
        let result = validate(&model);
        assert!(!result.has_errors());
        assert!(result.has_warnings());
        assert!(result.issues.iter().any(|i| i.location.contains("level")));
    }

    #[test]
    fn preparse_missing_radius_is_error() {
        let json: serde_json::Value = serde_json::json!({
            "version": 1,
            "environment": {
                "info": { "id": {"ty": "Environment", "indices": [-1]}, "level": -1, "name": "", "description": "" },
                "sources": [],
                "sinks": []
            },
            "systems": [{
                "info": { "id": {"ty": "System", "indices": [0]}, "level": 0, "name": "Test", "description": "" },
                "sources": [], "sinks": [],
                "parent": {"ty": "Environment", "indices": [-1]},
                "complexity": "Atomic",
                "boundary": {
                    "info": { "id": {"ty": "Boundary", "indices": [0]}, "level": 0, "name": "", "description": "" },
                    "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": []
                },
                "equivalence": "", "history": "", "transformation": "",
                "member_autonomy": 1.0, "time_constant": "Second"
            }],
            "interactions": []
        });
        let result = validate_json_structure(&json);
        assert!(result.has_errors(), "should catch missing radius");
        assert!(result.issues.iter().any(|i| i.message.contains("radius")));
    }

    #[test]
    fn preparse_complete_model_is_clean() {
        let path = format!(
            "{}/../../assets/models/examples/bitcoin.json",
            env!("CARGO_MANIFEST_DIR")
        );
        let bytes = std::fs::read(&path).expect("should read bitcoin.json");
        let json: serde_json::Value = serde_json::from_slice(&bytes).expect("should parse JSON");
        let result = validate_json_structure(&json);
        assert!(
            result.is_clean(),
            "coffee_shop should pre-parse clean; got: {:#?}",
            result.issues
        );
    }

    #[test]
    fn preparse_all_examples_clean() {
        let dir = format!("{}/../../assets/models/examples", env!("CARGO_MANIFEST_DIR"));
        for entry in std::fs::read_dir(&dir).unwrap() {
            let path = entry.unwrap().path();
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            let name = path.file_name().unwrap().to_str().unwrap();
            let bytes = std::fs::read(&path).unwrap_or_else(|_| panic!("should read {name}"));
            let json: serde_json::Value =
                serde_json::from_slice(&bytes).unwrap_or_else(|_| panic!("should parse {name}"));
            let result = validate_json_structure(&json);
            assert!(
                result.is_clean(),
                "{name} should pre-parse clean; got {} issues: {:#?}",
                result.issues.len(),
                result.issues
            );
        }
    }

    /// Law: a processor with a parent_interface but no connecting flow is a warning — an import/export processor must be a source or sink in some flow.
    #[test]
    fn processor_without_flows_is_warning() {
        let mut model = minimal_model();
        let proc_id = Id {
            ty: IdType::System,
            indices: vec![0, 0],
        };
        let parent_iface_id = Id {
            ty: IdType::Interface,
            indices: vec![0, 0],
        };
        model.systems[0].boundary.interfaces.push(Interface {
            info: Info {
                id: parent_iface_id.clone(),
                level: 1,
                name: "I0".to_string(),
                description: String::new(),
            },
            protocol: String::new(),
            ty: InterfaceType::Import,
            exports_to: vec![],
            receives_from: vec![],
            angle: Some(0.0),
        });
        model.systems.push(System {
            info: Info {
                id: proc_id,
                level: 1,
                name: "Orphan Processor".to_string(),
                description: String::new(),
            },
            sources: vec![],
            sinks: vec![],
            parent: model.systems[0].info.id.clone(),
            complexity: Complexity::Atomic,
            boundary: Boundary {
                info: Info {
                    id: Id {
                        ty: IdType::Boundary,
                        indices: vec![0, 0],
                    },
                    level: 1,
                    name: String::new(),
                    description: String::new(),
                },
                porosity: 0.0,
                perceptive_fuzziness: 0.0,
                interfaces: vec![],
                parent_interface: Some(parent_iface_id),
            },
            radius: 50.0,
            transform: None,
            equivalence: String::new(),
            history: String::new(),
            transformation: String::new(),
            member_autonomy: 1.0,
            time_constant: "Second".to_string(),
            archetype: None,
            agent: None,
            child_model: None,
        });
        let result = validate(&model);
        assert!(result.has_warnings());
        assert!(result
            .issues
            .iter()
            .any(|i| i.message.contains("Processor") && i.message.contains("no connecting flows")));
    }

    #[test]
    fn env_id_wrong_is_warning() {
        let mut model = minimal_model();
        model.environment.info.id = Id {
            ty: IdType::Environment,
            indices: vec![0],
        };
        let result = validate(&model);
        assert!(result.has_warnings());
        assert!(result
            .issues
            .iter()
            .any(|i| i.location == "environment.info.id"));
    }

    /// Law: every S0 boundary interface must be claimed by a level-1 processor so external flows trace to internal subsystems — an unclaimed interface warns.
    #[test]
    fn s0_interface_without_processor_is_warning() {
        let mut model = minimal_model();
        let iface_id = Id {
            ty: IdType::Interface,
            indices: vec![0, 0],
        };
        model.systems[0].boundary.interfaces.push(Interface {
            info: Info {
                id: iface_id.clone(),
                level: 1,
                name: "Uncovered".to_string(),
                description: String::new(),
            },
            protocol: String::new(),
            ty: InterfaceType::Import,
            exports_to: vec![],
            receives_from: vec![],
            angle: Some(0.0),
        });
        // A flow routes through the interface, so only the processor gap remains.
        model.environment.sources.push(ExternalEntity {
            info: Info {
                id: Id {
                    ty: IdType::Source,
                    indices: vec![-1, 0],
                },
                level: -1,
                name: "Src".to_string(),
                description: String::new(),
            },
            ty: ExternalEntityType::Source,
            transform: None,
            equivalence: String::new(),
            model: String::new(),
            is_same_as_id: None,
        });
        model.interactions.push(Interaction {
            info: Info {
                id: Id {
                    ty: IdType::Flow,
                    indices: vec![-1, 0],
                },
                level: -1,
                name: "Inflow".to_string(),
                description: String::new(),
            },
            substance: Substance {
                sub_type: String::new(),
                ty: SubstanceType::Message,
            },
            ty: InteractionType::Flow,
            usability: InteractionUsability::Product,
            source: Id {
                ty: IdType::Source,
                indices: vec![-1, 0],
            },
            source_interface: None,
            sink: Id {
                ty: IdType::System,
                indices: vec![0],
            },
            sink_interface: Some(iface_id),
            amount: rust_decimal::Decimal::ZERO,
            unit: String::new(),
            parameters: vec![],
            smart_parameters: vec![],
            endpoint_offset: None,
        });
        let result = validate(&model);
        assert!(!result.has_errors());
        assert!(result
            .issues
            .iter()
            .any(|i| i.message.contains("has no processor")));
    }

    /// Law: an S0 boundary interface claimed by a level-1 processor traces external flows to an internal subsystem — no warning fires.
    #[test]
    fn s0_interface_with_processor_no_warning() {
        let mut model = minimal_model();
        let iface_id = Id {
            ty: IdType::Interface,
            indices: vec![0, 0],
        };
        model.systems[0].boundary.interfaces.push(Interface {
            info: Info {
                id: iface_id.clone(),
                level: 1,
                name: "Covered".to_string(),
                description: String::new(),
            },
            protocol: String::new(),
            ty: InterfaceType::Import,
            exports_to: vec![],
            receives_from: vec![],
            angle: Some(0.0),
        });
        // Add a processor subsystem claiming this interface
        model.systems.push(System {
            info: Info {
                id: Id {
                    ty: IdType::System,
                    indices: vec![0, 0],
                },
                level: 1,
                name: "Processor".to_string(),
                description: String::new(),
            },
            sources: vec![],
            sinks: vec![],
            parent: model.systems[0].info.id.clone(),
            complexity: Complexity::Atomic,
            boundary: Boundary {
                info: Info {
                    id: Id {
                        ty: IdType::Boundary,
                        indices: vec![0, 0],
                    },
                    level: 1,
                    name: String::new(),
                    description: String::new(),
                },
                porosity: 0.0,
                perceptive_fuzziness: 0.0,
                interfaces: vec![],
                parent_interface: Some(iface_id.clone()),
            },
            radius: 12.0,
            transform: None,
            equivalence: String::new(),
            history: String::new(),
            transformation: String::new(),
            member_autonomy: 1.0,
            time_constant: "Second".to_string(),
            archetype: None,
            agent: None,
            child_model: None,
        });
        // Add a flow so the processor doesn't trigger check_processor_flows warning
        model.environment.sources.push(ExternalEntity {
            info: Info {
                id: Id {
                    ty: IdType::Source,
                    indices: vec![-1, 0],
                },
                level: -1,
                name: "Src".to_string(),
                description: String::new(),
            },
            ty: ExternalEntityType::Source,
            transform: None,
            equivalence: String::new(),
            model: String::new(),
            is_same_as_id: None,
        });
        model.interactions.push(Interaction {
            info: Info {
                id: Id {
                    ty: IdType::Flow,
                    indices: vec![-1, 0],
                },
                level: -1,
                name: "Inflow".to_string(),
                description: String::new(),
            },
            substance: Substance {
                sub_type: String::new(),
                ty: SubstanceType::Message,
            },
            ty: InteractionType::Flow,
            usability: InteractionUsability::Product,
            source: Id {
                ty: IdType::Source,
                indices: vec![-1, 0],
            },
            source_interface: None,
            sink: Id {
                ty: IdType::System,
                indices: vec![0, 0],
            },
            sink_interface: Some(iface_id),
            amount: rust_decimal::Decimal::ZERO,
            unit: String::new(),
            parameters: vec![],
            smart_parameters: vec![],
            endpoint_offset: None,
        });
        let result = validate(&model);
        assert!(
            !result
                .issues
                .iter()
                .any(|i| i.message.contains("has no processor")),
            "should not warn when processor exists; got: {:#?}",
            result.issues
        );
    }

    // ---- Mode lattice (bert#88) ------------------------------------------

    fn sys_id(indices: Vec<i64>) -> Id {
        Id {
            ty: IdType::Subsystem,
            indices,
        }
    }

    /// An atomic subsystem component with an empty boundary and no dynamical face.
    fn component(indices: Vec<i64>, name: &str, parent: Id) -> System {
        let level = indices.len() as i32 - 1;
        System {
            info: Info {
                id: sys_id(indices.clone()),
                level,
                name: name.to_string(),
                description: String::new(),
            },
            sources: vec![],
            sinks: vec![],
            parent,
            complexity: Complexity::Atomic,
            boundary: Boundary {
                info: Info {
                    id: Id {
                        ty: IdType::Boundary,
                        indices,
                    },
                    level,
                    name: String::new(),
                    description: String::new(),
                },
                porosity: 0.0,
                perceptive_fuzziness: 0.0,
                interfaces: vec![],
                parent_interface: None,
            },
            radius: 100.0,
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

    fn flow(idx: i64, name: &str, source: Id, sink: Id) -> Interaction {
        Interaction {
            info: Info {
                id: Id {
                    ty: IdType::Flow,
                    indices: vec![idx],
                },
                level: 0,
                name: name.to_string(),
                description: String::new(),
            },
            substance: Substance {
                sub_type: String::new(),
                ty: SubstanceType::Material,
            },
            ty: InteractionType::Flow,
            usability: InteractionUsability::Product,
            source,
            source_interface: None,
            sink,
            sink_interface: None,
            amount: rust_decimal::Decimal::ZERO,
            unit: String::new(),
            parameters: vec![],
            smart_parameters: vec![],
            endpoint_offset: None,
        }
    }

    /// Root S0 with two distinct atomic components and no interactions yet —
    /// a bare collection, valid as Core but an aggregate under Bunge.
    fn two_component_model() -> WorldModel {
        let mut m = minimal_model();
        let s0 = m.systems[0].info.id.clone();
        m.systems.push(component(vec![0, 0], "A", s0.clone()));
        m.systems.push(component(vec![0, 1], "B", s0));
        m
    }

    /// Law: Bunge Def 1.1 — an unbonded collection of components is a valid Core model but not a Structural system; entering Structural requires at least one bond.
    #[test]
    fn aggregate_enters_core_but_not_structural() {
        let m = two_component_model();
        assert!(
            !validate_mode(&m, Mode::Core).has_errors(),
            "two components on-things is a valid Core model: {:#?}",
            validate_mode(&m, Mode::Core).issues
        );
        let r = validate_mode(&m, Mode::Structural);
        assert!(
            r.has_errors(),
            "an unbonded collection cannot enter Structural"
        );
        assert!(
            r.issues.iter().any(|i| i.message.contains("Bunge Def 1.1")),
            "got: {:#?}",
            r.issues
        );
    }

    /// Law: Bunge Def 1.1 — a bonded pair of distinct components satisfies Structural entry.
    #[test]
    fn a_bond_enters_structural() {
        let mut m = two_component_model();
        m.interactions
            .push(flow(0, "bond", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        let r = validate_mode(&m, Mode::Structural);
        assert!(
            !r.has_errors(),
            "a bonded pair enters Structural: {:#?}",
            r.issues
        );
    }

    /// Law: check_bond reads bonds off system endpoints only — routing a bond through interfaces does not hide it from Bunge's HasBond check.
    #[test]
    fn interface_mediated_bond_enters_structural() {
        // Invariant guard: even when a bond runs through interfaces, the
        // canonical encoding puts the *systems* in source/sink and the
        // interfaces in source_interface/sink_interface (an Interface Id is
        // never a source/sink — confirmed across every example model). So
        // check_bond sees two distinct systems and the bond is recognized.
        let mut m = two_component_model();
        let iface_a = Id {
            ty: IdType::Interface,
            indices: vec![0, 0, 0],
        };
        let iface_b = Id {
            ty: IdType::Interface,
            indices: vec![0, 1, 0],
        };
        let mk_iface = |id: Id, ty: InterfaceType| Interface {
            info: Info {
                id,
                level: 2,
                name: String::new(),
                description: String::new(),
            },
            protocol: String::new(),
            ty,
            exports_to: vec![],
            receives_from: vec![],
            angle: Some(0.0),
        };
        m.systems[1]
            .boundary
            .interfaces
            .push(mk_iface(iface_a.clone(), InterfaceType::Export));
        m.systems[2]
            .boundary
            .interfaces
            .push(mk_iface(iface_b.clone(), InterfaceType::Import));
        let mut ix = flow(0, "bond", sys_id(vec![0, 0]), sys_id(vec![0, 1]));
        ix.source_interface = Some(iface_a);
        ix.sink_interface = Some(iface_b);
        m.interactions.push(ix);

        let r = validate_mode(&m, Mode::Structural);
        assert!(
            !r.has_errors(),
            "an interface-mediated bond enters Structural: {:#?}",
            r.issues
        );
    }

    /// Law: Mobus §4.3 (Irreflexive) — a self-loop is legal under Bunge's bond but illegal entering Operational.
    #[test]
    fn self_loop_enters_structural_but_not_operational() {
        let mut m = two_component_model();
        m.interactions
            .push(flow(0, "bond", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        m.interactions
            .push(flow(1, "loop", sys_id(vec![0, 0]), sys_id(vec![0, 0])));
        assert!(
            !validate_mode(&m, Mode::Structural).has_errors(),
            "a self-loop is legal under Bunge"
        );
        let r = validate_mode(&m, Mode::Operational);
        assert!(r.has_errors(), "a self-loop cannot enter Operational");
        assert!(
            r.issues.iter().any(|i| i.message.contains("Mobus §4.3")),
            "got: {:#?}",
            r.issues
        );
    }

    /// Law: Structural and Operational are independent lenses on the kernel lattice — satisfying one implies nothing about the other (modes don't inherit).
    #[test]
    fn structural_and_operational_are_independent_lenses() {
        // A single-component model with no bond is *not* Structural, yet it is
        // irreflexive and so *is* Operational — the lenses do not inherit.
        let m = minimal_model();
        assert!(validate_mode(&m, Mode::Structural).has_errors());
        assert!(!validate_mode(&m, Mode::Operational).has_errors());
    }

    /// Law: an absent `mode` stamp resolves to Full and must not serialize a `mode` key, so pre-mode-lattice files stay byte-stable.
    #[test]
    fn absent_mode_is_full_and_byte_stable() {
        let m = minimal_model();
        assert_eq!(m.mode(), Mode::Full, "absent mode resolves to Full");
        let json = serde_json::to_string(&m).unwrap();
        assert!(
            !json.contains("\"mode\""),
            "the default Full mode must not serialize a key (old files stay byte-stable): {json}"
        );

        let mut core = minimal_model();
        core.mode = Some(Mode::Core);
        let json = serde_json::to_string(&core).unwrap();
        assert!(
            json.contains("\"mode\":\"Core\""),
            "an explicit mode serializes: {json}"
        );
    }

    #[test]
    fn all_example_models_enter_full_mode() {
        let dir = format!("{}/../../assets/models/examples", env!("CARGO_MANIFEST_DIR"));
        for entry in std::fs::read_dir(&dir).expect("open examples dir") {
            let path = entry.unwrap().path();
            if path.extension().and_then(|s| s.to_str()) != Some("json") {
                continue;
            }
            let name = path.file_name().unwrap().to_str().unwrap();
            let model = load_example_model(name);
            let result = validate_mode(&model, Mode::Full);
            assert!(
                !result.has_errors(),
                "{name} should enter Full with no errors; got: {:#?}",
                result
                    .issues
                    .iter()
                    .filter(|i| i.severity == Severity::Error)
                    .collect::<Vec<_>>()
            );
        }
    }

    /// Law: Full mode warns, never errors, when no system populates the dynamical face (transformation/history/time_constant).
    #[test]
    fn empty_dynamical_face_warns_in_full_mode() {
        // Clear S0's default time_constant so no system carries a dynamical face.
        let mut m = two_component_model();
        m.systems[0].time_constant = String::new();
        let r = validate_mode(&m, Mode::Full);
        assert!(
            !r.has_errors(),
            "a missing dynamical face is a warning, not an error: {:#?}",
            r.issues
        );
        assert!(
            r.has_warnings(),
            "Full mode warns when no system has a dynamical face"
        );
        assert!(
            r.issues
                .iter()
                .any(|i| i.message.contains("dynamical face")),
            "got: {:#?}",
            r.issues
        );
        // And the warning is gone once any system has a face.
        m.systems[0].time_constant = "Second".to_string();
        assert!(!validate_mode(&m, Mode::Full).has_warnings());
    }

    // ---- Kernel projection round trip (bert#88 Part 3) -------------------

    /// Law: the kernel projection's `things` include every relatum (systems, environment) and `dep` mirrors the declared interactions exactly.
    #[test]
    fn kernel_projects_things_and_dependencies() {
        let mut m = two_component_model();
        m.interactions
            .push(flow(0, "bond", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        let k = m.kernel();
        // S0 + two components + the environment node; no external entities.
        assert_eq!(k.things.len(), 4);
        assert!(
            k.things.contains(&m.environment.info.id),
            "the environment node is a relatum (on-ness must match check_interaction_references)"
        );
        assert_eq!(k.dep, vec![(sys_id(vec![0, 0]), sys_id(vec![0, 1]))]);
    }

    /// Law: environment sources and sinks are relata in the kernel projection, same as systems.
    #[test]
    fn kernel_includes_environment_externals() {
        // Exercise the environment source/sink branch of kernel().
        let mut m = minimal_model();
        let src = ExternalEntity {
            info: Info {
                id: Id {
                    ty: IdType::Source,
                    indices: vec![-1, 0],
                },
                level: -1,
                name: "Src".to_string(),
                description: String::new(),
            },
            ty: ExternalEntityType::Source,
            transform: None,
            equivalence: String::new(),
            model: String::new(),
            is_same_as_id: None,
        };
        let snk = ExternalEntity {
            info: Info {
                id: Id {
                    ty: IdType::Sink,
                    indices: vec![-1, 1],
                },
                level: -1,
                name: "Snk".to_string(),
                description: String::new(),
            },
            ty: ExternalEntityType::Sink,
            transform: None,
            equivalence: String::new(),
            model: String::new(),
            is_same_as_id: None,
        };
        let src_id = src.info.id.clone();
        let snk_id = snk.info.id.clone();
        m.environment.sources.push(src);
        m.environment.sinks.push(snk);

        let things = m.kernel().things;
        assert!(things.contains(&src_id), "env source is a relatum");
        assert!(things.contains(&snk_id), "env sink is a relatum");
        // S0 + environment node + env source + env sink.
        assert_eq!(things.len(), 4);
    }

    /// Law: viewing a model through any mode must not mutate its kernel — mode views are read-only.
    #[test]
    fn mode_views_are_read_only_kernel_invariant() {
        // The Rust twin of the Lean round-trip theorems: viewing a model through
        // any mode is read-only. `validate_mode` takes `&WorldModel`, so the
        // compiler already guarantees it cannot mutate; this test pins the
        // resulting invariant — the projected kernel is identical before and after.
        let mut m = two_component_model();
        m.interactions
            .push(flow(0, "bond", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        let before = m.kernel();
        for mode in [Mode::Core, Mode::Structural, Mode::Operational, Mode::Full] {
            let _ = validate_mode(&m, mode);
        }
        let after = m.kernel();
        assert_eq!(before, after, "mode views must not mutate the kernel");
    }

    fn env_source_id(idx: i64) -> Id {
        Id {
            ty: IdType::Source,
            indices: vec![-1, idx],
        }
    }

    /// Law: Bunge 1992 — the boundary is exactly the components directly coupled to environmental items; interior components are shielded.
    #[test]
    fn boundary_components_marks_only_env_coupled() {
        // Bunge 1992: the boundary is the set of components directly coupled to
        // environmental items; interior components are "shielded". A is coupled
        // to an env source, B only to A — so boundary = {A}.
        let mut m = two_component_model();
        m.interactions
            .push(flow(0, "inflow", env_source_id(0), sys_id(vec![0, 0])));
        m.interactions
            .push(flow(1, "bond", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        assert_eq!(m.boundary_components(), vec![sys_id(vec![0, 0])]);
    }

    /// Law: endo/exo edge locus (N vs G) is computed strictly from the kernel graph, never from styling (K≅2).
    #[test]
    fn edge_locus_splits_n_from_g() {
        // Endo/exo = N/G: kernel-computed, never stylistic.
        let m = two_component_model();
        let endo = flow(0, "bond", sys_id(vec![0, 0]), sys_id(vec![0, 1]));
        let exo = flow(1, "inflow", env_source_id(0), sys_id(vec![0, 0]));
        assert_eq!(m.edge_locus(&endo), EdgeLocus::Endo);
        assert_eq!(m.edge_locus(&exo), EdgeLocus::Exo);
    }

    /// Law: a model with no environment-coupled component has an empty boundary set.
    #[test]
    fn boundary_empty_for_closed_model() {
        let mut m = two_component_model();
        m.interactions
            .push(flow(0, "bond", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        assert!(m.boundary_components().is_empty());
    }

    // ---- Graph checks: duplicate-edge, dead-end, reachability (#66) -------

    /// An FSA-shaped model: S0 root with one atomic subsystem C0.i per state and
    /// one directed flow per `(src, sink)` index pair. Mirrors the bill.json shape.
    fn fsa_model(states: &[&str], edges: &[(i64, i64)]) -> WorldModel {
        let mut m = minimal_model();
        let s0 = m.systems[0].info.id.clone();
        for (i, name) in states.iter().enumerate() {
            m.systems.push(component(vec![0, i as i64], name, s0.clone()));
        }
        for (k, &(src, sink)) in edges.iter().enumerate() {
            m.interactions
                .push(flow(k as i64, "", sys_id(vec![0, src]), sys_id(vec![0, sink])));
        }
        m
    }

    /// The corrected "how a bill becomes law" FSA (the graph of ~/Desktop/bill.json):
    /// 14 states, 17 transitions, 5 legitimate absorbing states (Law, died in
    /// committee, fail, dead, pocket-vetoed).
    fn bill_corrected() -> WorldModel {
        fsa_model(
            &[
                "Introduced",                    // 0
                "In Committee",                  // 1
                "Reported",                      // 2
                "On Floor",                      // 3
                "Passed origin chamber",         // 4
                "Passed second chamber",         // 5
                "Conference committee",          // 6
                "Enrolled/presented to President", // 7
                "Vetoed",                        // 8
                "Law",                           // 9
                "died in committee",             // 10
                "fail",                          // 11
                "dead",                          // 12
                "pocket-vetoed",                 // 13
            ],
            &[
                (0, 1),
                (1, 2),
                (1, 3),
                (2, 3),
                (3, 4),
                (4, 5),
                (5, 6),
                (6, 7),
                (7, 9),
                (7, 8),
                (3, 11),
                (1, 10),
                (7, 13),
                (6, 12),
                (8, 9),
                (8, 12),
                (5, 7),
            ],
        )
    }

    fn dead_end_msgs(r: &ValidationResult) -> Vec<&str> {
        r.issues
            .iter()
            .filter(|i| i.message.contains("terminal/absorbing"))
            .map(|i| i.message.as_str())
            .collect()
    }

    /// Law: a node with incoming flow but none outgoing is surfaced as a dead-end warning, never an error — legitimate terminal states are common.
    #[test]
    fn corrected_bill_surfaces_five_absorbing_states_as_warnings() {
        let m = bill_corrected();
        let r = validate_mode(&m, Mode::Operational);
        assert!(!r.has_errors(), "the corrected FSA is legal: {:#?}", r.issues);
        assert!(
            !r.issues.iter().any(|i| i.message.contains("duplicate edge")),
            "no parallel edges in the corrected FSA"
        );
        let dead = dead_end_msgs(&r);
        assert_eq!(dead.len(), 5, "five absorbing states are surfaced: {dead:#?}");
        for name in ["Law", "died in committee", "fail", "dead", "pocket-vetoed"] {
            assert!(
                dead.iter().any(|m| m.contains(name)),
                "'{name}' should surface as a dead-end question"
            );
        }
        // The container S0 (no incoming, no outgoing) is not a dead-end.
        assert!(
            !dead.iter().any(|m| m.contains("System")),
            "the root container is not an absorbing state"
        );
    }

    /// Law: parallel edges of the same type warn as duplicates, and removing a node's outgoing flow turns it into a dead-end warning.
    #[test]
    fn broken_bill_fires_duplicate_edge_and_vetoed_dead_end() {
        // Break the corrected FSA two ways: strip Vetoed's outgoing transitions
        // (8→9, 8→12) so it dead-ends, and double the referral edge (0→1).
        let mut m = bill_corrected();
        m.interactions
            .retain(|ix| ix.source != sys_id(vec![0, 8]));
        m.interactions
            .push(flow(99, "", sys_id(vec![0, 0]), sys_id(vec![0, 1])));

        let r = validate_mode(&m, Mode::Operational);
        assert!(
            r.issues.iter().any(|i| i.message.contains("duplicate edge")),
            "the doubled referral edge is flagged: {:#?}",
            r.issues
        );
        assert!(
            dead_end_msgs(&r).iter().any(|msg| msg.contains("Vetoed")),
            "Vetoed with no outgoing transitions is a dead-end: {:#?}",
            r.issues
        );
    }

    /// Law: two interactions with identical source, sink, and type are duplicate edges — flagged once, as a warning.
    #[test]
    fn duplicate_edge_is_universal_warning() {
        // Two identical Material flows A→B; a Force edge A→B is a distinct type.
        let mut m = two_component_model();
        m.interactions
            .push(flow(0, "a", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        m.interactions
            .push(flow(1, "b", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        let r = validate(&m);
        assert!(!r.has_errors());
        assert_eq!(
            r.issues
                .iter()
                .filter(|i| i.message.contains("duplicate edge"))
                .count(),
            1,
            "one duplicate reported for the second identical edge: {:#?}",
            r.issues
        );
    }

    /// Law: same endpoints but a different interaction type is not a duplicate edge — type is part of edge identity.
    #[test]
    fn distinct_edge_type_is_not_a_duplicate() {
        let mut m = two_component_model();
        m.interactions
            .push(flow(0, "a", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        let mut force = flow(1, "b", sys_id(vec![0, 0]), sys_id(vec![0, 1]));
        force.ty = InteractionType::Force;
        m.interactions.push(force);
        assert!(
            !validate(&m)
                .issues
                .iter()
                .any(|i| i.message.contains("duplicate edge")),
            "same endpoints but different type is not a duplicate edge"
        );
    }

    /// Law: a node reachable from no entry (no incoming flow, or fed only through a disconnected cycle) is a warning.
    #[test]
    fn distinct_substance_is_not_a_duplicate() {
        // Same endpoints and type (Flow), but one carries Material and one
        // Message — a genuine second channel, not an accidental double-draw.
        let mut m = two_component_model();
        m.interactions
            .push(flow(0, "a", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        let mut message = flow(1, "b", sys_id(vec![0, 0]), sys_id(vec![0, 1]));
        message.substance.ty = SubstanceType::Message;
        m.interactions.push(message);
        assert!(
            !validate(&m)
                .issues
                .iter()
                .any(|i| i.message.contains("duplicate edge")),
            "same endpoints and type but different substance is not a duplicate edge"
        );
    }

    #[test]
    fn unreachable_cycle_warns() {
        // Entry A→B, plus a disconnected 2-cycle C↔D reachable from no entry.
        let mut m = minimal_model();
        let s0 = m.systems[0].info.id.clone();
        for (i, name) in ["A", "B", "C", "D"].iter().enumerate() {
            m.systems.push(component(vec![0, i as i64], name, s0.clone()));
        }
        m.interactions
            .push(flow(0, "", sys_id(vec![0, 0]), sys_id(vec![0, 1])));
        m.interactions
            .push(flow(1, "", sys_id(vec![0, 2]), sys_id(vec![0, 3])));
        m.interactions
            .push(flow(2, "", sys_id(vec![0, 3]), sys_id(vec![0, 2])));

        let r = validate_mode(&m, Mode::Operational);
        let unreachable: Vec<&str> = r
            .issues
            .iter()
            .filter(|i| i.message.contains("not reachable"))
            .map(|i| i.message.as_str())
            .collect();
        assert!(
            unreachable.iter().any(|m| m.contains("'C'"))
                && unreachable.iter().any(|m| m.contains("'D'")),
            "the disconnected cycle is unreachable: {unreachable:#?}"
        );
        assert!(
            !unreachable.iter().any(|m| m.contains("'A'") || m.contains("'B'")),
            "the entry path stays reachable: {unreachable:#?}"
        );
    }

    /// Law: dead-end and reachability checks run only in Operational/Full modes — Core and Structural carry no flow semantics to check.
    #[test]
    fn dead_end_and_reachability_only_in_dynamic_modes() {
        // The container-plus-cycle model has both a dead-end and unreachable
        // nodes, but neither check runs below the Operational mode.
        let m = bill_corrected();
        for mode in [Mode::Core, Mode::Structural] {
            let r = validate_mode(&m, mode);
            assert!(
                !r.issues.iter().any(|i| i.message.contains("terminal/absorbing")
                    || i.message.contains("not reachable")),
                "graph-flow checks are Operational/Full only; fired in {mode:?}: {:#?}",
                r.issues
            );
        }
    }

    // ---- Declared reachability requirements (#69) -------------------------

    fn reachability_msgs(r: &ValidationResult) -> Vec<&str> {
        r.issues
            .iter()
            .filter(|i| i.severity == Severity::Error && i.message.contains("required"))
            .map(|i| i.message.as_str())
            .collect()
    }

    /// Law: a satisfied must-reach requirement raises nothing — the graph provides
    /// a route to the declared outcome.
    #[test]
    fn must_reach_satisfied_is_clean() {
        let mut m = bill_corrected();
        // Introduced (C0.0) can reach Law (C0.9): 0→1→2→3→4→5→6→7→9.
        m.reachability_requirements
            .push(ReachabilityRequirement::MustReach {
                from: sys_id(vec![0, 0]),
                to: sys_id(vec![0, 9]),
            });
        let r = validate_mode(&m, Mode::Operational);
        assert!(
            reachability_msgs(&r).is_empty(),
            "a reachable target must not error: {:#?}",
            r.issues
        );
    }

    /// Law: a must-reach requirement whose target the graph cannot route to is a
    /// refusal (Error), citing the unreachable outcome.
    #[test]
    fn must_reach_unreachable_target_refuses() {
        let mut m = bill_corrected();
        // Sever every route into Law (7→9, 8→9) so it is unreachable.
        m.interactions.retain(|ix| ix.sink != sys_id(vec![0, 9]));
        m.reachability_requirements
            .push(ReachabilityRequirement::MustReach {
                from: sys_id(vec![0, 0]),
                to: sys_id(vec![0, 9]),
            });
        let r = validate_mode(&m, Mode::Operational);
        assert!(r.has_errors(), "an unmet must-reach is an Error: {:#?}", r.issues);
        assert!(
            reachability_msgs(&r)
                .iter()
                .any(|msg| msg.contains("no flow path") && msg.contains("Law")),
            "the refusal cites the unreachable outcome: {:#?}",
            r.issues
        );
    }

    /// Law: an alternative-path requirement holds when a route that avoids the
    /// named node exists — the corrected bill's direct 5→7 edge bypasses Conference.
    #[test]
    fn alternative_path_present_is_clean() {
        let mut m = bill_corrected();
        // Passed-second-chamber (C0.5) reaches Enrolled (C0.7) either via Conference
        // (C0.6) or the direct "if identical" edge (5→7): an alternative exists.
        m.reachability_requirements
            .push(ReachabilityRequirement::AlternativePath {
                from: sys_id(vec![0, 5]),
                to: sys_id(vec![0, 7]),
                avoiding: sys_id(vec![0, 6]),
            });
        let r = validate_mode(&m, Mode::Operational);
        assert!(
            reachability_msgs(&r).is_empty(),
            "the direct 5→7 edge satisfies the alternative-path requirement: {:#?}",
            r.issues
        );
    }

    /// Law: the WP4 (2026-07-17) forced-detour case. Deleting the "if identical"
    /// edge (5→7) funnels every route to Enrolled through Conference committee — a
    /// structurally-silent omission no LLM caught. With the alternative-path
    /// requirement declared, the kernel refuses and names the forced detour.
    #[test]
    fn alternative_path_forced_detour_refuses() {
        let mut m = bill_corrected();
        // Delete F16, the direct 5→7 "if identical" edge: now 5→7 only via 6.
        m.interactions
            .retain(|ix| !(ix.source == sys_id(vec![0, 5]) && ix.sink == sys_id(vec![0, 7])));
        m.reachability_requirements
            .push(ReachabilityRequirement::AlternativePath {
                from: sys_id(vec![0, 5]),
                to: sys_id(vec![0, 7]),
                avoiding: sys_id(vec![0, 6]),
            });
        let r = validate_mode(&m, Mode::Operational);
        assert!(
            r.has_errors(),
            "a missing required alternative is an Error: {:#?}",
            r.issues
        );
        assert!(
            reachability_msgs(&r)
                .iter()
                .any(|msg| msg.contains("forced detour") && msg.contains("Conference committee")),
            "the refusal names the forced detour: {:#?}",
            r.issues
        );
        // The offending element is navigable (subject set to the forced-detour node).
        assert!(
            r.issues
                .iter()
                .any(|i| i.subject.as_ref() == Some(&sys_id(vec![0, 6]))),
            "the forced-detour node is the issue subject: {:#?}",
            r.issues
        );
    }

    /// Law: a requirement naming an element that resolves to no entity is itself a
    /// defect — an Error distinct from an unmet-but-well-formed requirement.
    #[test]
    fn requirement_with_unknown_element_errors() {
        let mut m = bill_corrected();
        m.reachability_requirements
            .push(ReachabilityRequirement::MustReach {
                from: sys_id(vec![0, 0]),
                to: sys_id(vec![0, 999]),
            });
        let r = validate_mode(&m, Mode::Operational);
        assert!(r.has_errors());
        assert!(
            r.issues
                .iter()
                .any(|i| i.message.contains("resolves to no known entity")),
            "an unresolvable requirement element errors: {:#?}",
            r.issues
        );
    }

    /// Law: declared reachability requirements are flow-graph properties — they are
    /// evaluated only in Operational/Full, never in Core or Structural.
    #[test]
    fn requirements_only_in_dynamic_modes() {
        let mut m = bill_corrected();
        m.interactions
            .retain(|ix| ix.sink != sys_id(vec![0, 9]));
        m.reachability_requirements
            .push(ReachabilityRequirement::MustReach {
                from: sys_id(vec![0, 0]),
                to: sys_id(vec![0, 9]),
            });
        for mode in [Mode::Core, Mode::Structural] {
            let r = validate_mode(&m, mode);
            assert!(
                reachability_msgs(&r).is_empty(),
                "requirements must not fire in {mode:?}: {:#?}",
                r.issues
            );
        }
    }

    /// The four committed fixtures under `fixtures/reachability/` (satisfying and
    /// violating, per check) are generated from these models, never hand-authored
    /// (per the never-hand-author-BERT-JSON discipline). Regenerate after an
    /// intentional shape change with `BLESS_FIXTURES=1`.
    #[test]
    fn reachability_requirement_fixtures() {
        let must_reach = |from, to| ReachabilityRequirement::MustReach { from, to };
        let alt = |from, to, avoiding| ReachabilityRequirement::AlternativePath {
            from,
            to,
            avoiding,
        };

        // must-reach: satisfied on the corrected bill; violated once Law is severed.
        let mut mr_ok = bill_corrected();
        mr_ok
            .reachability_requirements
            .push(must_reach(sys_id(vec![0, 0]), sys_id(vec![0, 9])));

        let mut mr_bad = bill_corrected();
        mr_bad.interactions.retain(|ix| ix.sink != sys_id(vec![0, 9]));
        mr_bad
            .reachability_requirements
            .push(must_reach(sys_id(vec![0, 0]), sys_id(vec![0, 9])));

        // alternative-path: satisfied via the direct 5→7 edge; violated once it is cut.
        let mut alt_ok = bill_corrected();
        alt_ok
            .reachability_requirements
            .push(alt(sys_id(vec![0, 5]), sys_id(vec![0, 7]), sys_id(vec![0, 6])));

        let mut alt_bad = bill_corrected();
        alt_bad
            .interactions
            .retain(|ix| !(ix.source == sys_id(vec![0, 5]) && ix.sink == sys_id(vec![0, 7])));
        alt_bad
            .reachability_requirements
            .push(alt(sys_id(vec![0, 5]), sys_id(vec![0, 7]), sys_id(vec![0, 6])));

        for (name, model, expect_error) in [
            ("must-reach-satisfied", &mr_ok, false),
            ("must-reach-violated", &mr_bad, true),
            ("alt-path-satisfied", &alt_ok, false),
            ("alt-path-violated", &alt_bad, true),
        ] {
            bless_or_check(name, model);
            let r = validate_mode(model, Mode::Operational);
            assert_eq!(
                !reachability_msgs(&r).is_empty(),
                expect_error,
                "fixture {name} error-expectation mismatch: {:#?}",
                r.issues
            );
        }
    }

    /// Write-or-assert a model fixture. `BLESS_FIXTURES=1` (re)writes; otherwise it
    /// asserts the committed file round-trips to the same model, so a shape change
    /// fails instead of silently diverging.
    fn bless_or_check(name: &str, model: &WorldModel) {
        let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/reachability");
        let path = format!("{dir}/{name}.json");
        let actual = serde_json::to_string_pretty(model).expect("serialize fixture");
        if std::env::var_os("BLESS_FIXTURES").is_some() {
            std::fs::create_dir_all(dir).expect("create fixture dir");
            std::fs::write(&path, format!("{actual}\n")).expect("write fixture");
            return;
        }
        let expected = std::fs::read_to_string(&path)
            .unwrap_or_else(|_| panic!("missing fixture {path}; run BLESS_FIXTURES=1 to create"));
        // Compare through a parse-and-reserialize so the fixture proves the model
        // both round-trips and matches its generator (WorldModel has no PartialEq).
        let reserialized = serde_json::to_string_pretty(
            &serde_json::from_str::<WorldModel>(&expected)
                .unwrap_or_else(|_| panic!("parse fixture {path}")),
        )
        .expect("reserialize fixture");
        assert_eq!(
            reserialized.trim_end_matches('\n'),
            actual,
            "fixture {name} drifted from its generator; regenerate with BLESS_FIXTURES=1"
        );
    }

    /// #129: every stable doc anchor resolves to a real heading in its file —
    /// a renamed heading or moved doc fails here instead of shipping a dead
    /// link from a refusal.
    #[test]
    fn doc_anchors_resolve() {
        /// GitHub-style heading slug: lowercase, spaces to hyphens, hyphens and
        /// underscores kept, all other punctuation dropped.
        fn slug(heading: &str) -> String {
            let mut s = String::new();
            for ch in heading.trim().chars() {
                if ch.is_alphanumeric() {
                    s.extend(ch.to_lowercase());
                } else if ch == ' ' {
                    s.push('-');
                } else if ch == '-' || ch == '_' {
                    s.push(ch);
                }
            }
            s
        }
        let repo = format!("{}/../..", env!("CARGO_MANIFEST_DIR"));
        for target in doc::ALL {
            let (path, anchor) = target
                .split_once('#')
                .unwrap_or_else(|| panic!("doc target '{target}' must carry an anchor"));
            let text = std::fs::read_to_string(format!("{repo}/{path}"))
                .unwrap_or_else(|_| panic!("doc target file missing: {path}"));
            let resolves = text
                .lines()
                .filter(|l| l.starts_with('#'))
                .any(|l| slug(l.trim_start_matches('#')) == anchor);
            assert!(resolves, "no heading in {path} slugifies to '#{anchor}'");
        }
    }

    /// #129 gap fill: the pre-parse type-mismatch refusal used to ship with no
    /// suggestion — the one no-suggestion path in the validator. It now carries
    /// a repair path and its doc anchor, like every other refusal.
    #[test]
    fn json_type_mismatch_carries_repair_path_and_doc() {
        let result = validate_json_structure(&serde_json::json!([1, 2]));
        let issue = result
            .issues
            .iter()
            .find(|i| i.message.contains("Expected an object"))
            .expect("a non-object root must refuse");
        assert!(issue.suggestion.is_some(), "the refusal must carry a repair path");
        assert_eq!(issue.doc.as_deref(), Some(doc::WORLD_MODEL));
    }

    /// #129: mode-gate refusals cite their precondition's doc entry.
    #[test]
    fn mode_gate_refusals_carry_doc_links() {
        let model = minimal_model();
        let structural = validate_mode(&model, Mode::Structural);
        let bond = structural
            .issues
            .iter()
            .find(|i| i.location == "mode/Structural")
            .expect("an unbonded singleton refuses Structural");
        assert_eq!(bond.doc.as_deref(), Some(doc::BOND));
    }

    /// Kernel-side firing witness for `check_interfaces_carry_flow`. The
    /// canvas-path witness lives in `bert_canvas` (`project` then
    /// `validate_mode`); this one proves the check on a hand-built model, so the
    /// kernel's own suite carries a witness for its own refusal.
    #[test]
    fn flowless_interface_is_refused_at_operational_in_kernel() {
        let mut model = minimal_model();
        model.systems[0].boundary.interfaces.push(Interface {
            info: Info {
                id: Id {
                    ty: IdType::Interface,
                    indices: vec![0, 0],
                },
                level: 1,
                name: "Flowless".to_string(),
                description: String::new(),
            },
            protocol: String::new(),
            ty: InterfaceType::Hybrid,
            exports_to: vec![],
            receives_from: vec![],
            angle: None,
        });
        let refused = validate_mode(&model, Mode::Operational);
        assert!(
            refused.issues.iter().any(is_interface_flow_refusal),
            "Operational refuses a flowless interface: {:#?}",
            refused.issues
        );
        for quiet in [Mode::Core, Mode::Structural] {
            assert!(
                !validate_mode(&model, quiet)
                    .issues
                    .iter()
                    .any(is_interface_flow_refusal),
                "{quiet:?} carries no interface concept"
            );
        }
    }

    /// Firing witness for `check_interface_declarations_match_flows` (#225), on
    /// the sharp case the issue names: an interface with a REAL crossing flow
    /// whose declared `exports_to` names a different sink than the flow goes to.
    /// `check_interfaces_carry_flow` is silent here — the interface carries a
    /// flow — which is why the two cannot be one check.
    #[test]
    fn divergent_interface_declaration_is_refused_at_operational() {
        let mut model = minimal_model();
        let drawn = Id { ty: IdType::Sink, indices: vec![-1, 0] };
        let declared = Id { ty: IdType::Sink, indices: vec![-1, 1] };
        let iface_id = Id { ty: IdType::Interface, indices: vec![0, 0] };
        for (id, name) in [(&drawn, "Drawn"), (&declared, "Declared")] {
            model.environment.sinks.push(ExternalEntity {
                info: Info { id: id.clone(), level: -1, name: name.to_string(), description: String::new() },
                ty: ExternalEntityType::Sink,
                transform: None,
                equivalence: String::new(),
                model: String::new(),
                is_same_as_id: None,
            });
        }
        model.systems[0].boundary.interfaces.push(Interface {
            info: Info { id: iface_id.clone(), level: 1, name: "Outflow".to_string(), description: String::new() },
            protocol: String::new(),
            ty: InterfaceType::Export,
            exports_to: vec![declared.clone()],
            receives_from: vec![],
            angle: None,
        });
        model.interactions.push(Interaction {
            info: Info {
                id: Id { ty: IdType::Flow, indices: vec![0] },
                level: 0,
                name: "Out".to_string(),
                description: String::new(),
            },
            substance: Substance { sub_type: String::new(), ty: SubstanceType::Energy },
            ty: InteractionType::Flow,
            usability: InteractionUsability::Product,
            source: model.systems[0].info.id.clone(),
            source_interface: Some(iface_id),
            sink: drawn,
            sink_interface: None,
            amount: rust_decimal::Decimal::ONE,
            unit: String::new(),
            parameters: vec![],
            smart_parameters: vec![],
            endpoint_offset: None,
        });

        let refused = validate_mode(&model, Mode::Operational);
        let issue = refused
            .issues
            .iter()
            .find(|i| is_interface_declaration_refusal(i))
            .unwrap_or_else(|| panic!("Operational refuses the divergent declaration: {:#?}", refused.issues));
        assert_eq!(issue.location, "systems[0].boundary.interfaces[0].exports_to");
        assert_eq!(issue.doc.as_deref(), Some(doc::INTERFACE));
        assert!(
            !refused.issues.iter().any(is_interface_flow_refusal),
            "the interface carries a flow, so the graph check must stay silent: {:#?}",
            refused.issues
        );
        for quiet in [Mode::Core, Mode::Structural] {
            assert!(
                !validate_mode(&model, quiet).issues.iter().any(is_interface_declaration_refusal),
                "{quiet:?} carries no interface concept"
            );
        }

        // Redirecting the declaration at the sink the flow actually reaches clears it.
        model.systems[0].boundary.interfaces[0].exports_to = vec![model.environment.sinks[0].info.id.clone()];
        assert!(
            !validate_mode(&model, Mode::Operational)
                .issues
                .iter()
                .any(is_interface_declaration_refusal),
            "a declaration the graph records is clean"
        );
    }

    /// A declaration the model records only by the flow's ENDPOINTS, with no
    /// interface routing, is honoured: Listing 4.2's tags name the entity, not
    /// the edge.
    #[test]
    fn unrouted_flow_still_records_the_declaration() {
        let mut model = minimal_model();
        let src = Id { ty: IdType::Source, indices: vec![-1, 0] };
        model.environment.sources.push(ExternalEntity {
            info: Info { id: src.clone(), level: -1, name: "In".to_string(), description: String::new() },
            ty: ExternalEntityType::Source,
            transform: None,
            equivalence: String::new(),
            model: String::new(),
            is_same_as_id: None,
        });
        model.systems[0].boundary.interfaces.push(Interface {
            info: Info {
                id: Id { ty: IdType::Interface, indices: vec![0, 0] },
                level: 1,
                name: "Intake".to_string(),
                description: String::new(),
            },
            protocol: String::new(),
            ty: InterfaceType::Import,
            exports_to: vec![],
            receives_from: vec![src.clone()],
            angle: None,
        });
        model.interactions.push(Interaction {
            info: Info {
                id: Id { ty: IdType::Flow, indices: vec![0] },
                level: 0,
                name: "In".to_string(),
                description: String::new(),
            },
            substance: Substance { sub_type: String::new(), ty: SubstanceType::Energy },
            ty: InteractionType::Flow,
            usability: InteractionUsability::Resource,
            source: src,
            source_interface: None,
            sink: model.systems[0].info.id.clone(),
            sink_interface: None,
            amount: rust_decimal::Decimal::ONE,
            unit: String::new(),
            parameters: vec![],
            smart_parameters: vec![],
            endpoint_offset: None,
        });
        assert!(
            !validate_mode(&model, Mode::Operational)
                .issues
                .iter()
                .any(is_interface_declaration_refusal),
            "an unrouted but recorded flow honours the declaration"
        );
    }

    // ---- The firing audit and its gate (bert-lenses#220) -----------------

    /// What proves a check can fire, or the recorded reason nothing can.
    struct CheckAudit {
        check: &'static str,
        /// Test that makes this check produce an issue. `None` means no model
        /// reaches it through the typed path, and `note` says why.
        witness: Option<&'static str>,
        /// Can a model `bert_canvas::project` can actually emit make it fire?
        /// Documentation, not mechanically enforced — the canvas lives in a
        /// sibling crate. `false` marks a check that is dead in practice for
        /// canvas-authored work, which is the class #220 was opened over.
        canvas: bool,
        note: &'static str,
    }

    /// The audit of #220, in the only form that survives the next contributor:
    /// every `check_*` in this module has a row, and the gate below fails when a
    /// check has none or names a witness that does not exist.
    const FIRING_AUDIT: &[CheckAudit] = &[
        CheckAudit {
            check: "check_stock_units",
            witness: Some("rate_like_stock_unit_warns_never_errors"),
            canvas: true,
            note: "a Buffering thing declaring 'ML/mo' projects its stock_unit verbatim",
        },
        CheckAudit {
            check: "check_stock_dimensions",
            witness: Some("kw_fed_stock_declaring_power_is_refused"),
            canvas: false,
            note: "project() writes `unit: \"\"` on every interaction and a canvas \
                   Relation carries no unit field, so the flow unit never parses; \
                   live for compose-emitted and loaded models",
        },
        CheckAudit {
            check: "check_bond",
            witness: Some("aggregate_enters_core_but_not_structural"),
            canvas: true,
            note: "two things and no bond, read through Bunge",
        },
        CheckAudit {
            check: "check_self_loops",
            witness: Some("self_loop_enters_structural_but_not_operational"),
            canvas: true,
            note: "a relation whose endpoints are the same thing",
        },
        CheckAudit {
            check: "check_dynamical_face",
            witness: Some("empty_dynamical_face_warns_in_full_mode"),
            canvas: false,
            note: "Lens maps only to Core/Structural/Operational, so Full never \
                   runs on a canvas projection — and project() leaves every \
                   dynamical slot empty, so it would always fire if it did",
        },
        CheckAudit {
            check: "check_duplicate_edges",
            witness: Some("duplicate_edge_is_universal_warning"),
            canvas: true,
            note: "two relations with the same endpoints and kind",
        },
        CheckAudit {
            check: "check_dead_ends",
            witness: Some("corrected_bill_surfaces_five_absorbing_states_as_warnings"),
            canvas: true,
            note: "a component with an inbound relation and none outbound",
        },
        CheckAudit {
            check: "check_reachability",
            witness: Some("unreachable_cycle_warns"),
            canvas: true,
            note: "a two-thing cycle with no entry",
        },
        CheckAudit {
            check: "check_reachability_requirements",
            witness: Some("must_reach_unreachable_target_refuses"),
            canvas: false,
            note: "project() writes `reachability_requirements: vec![]`; the \
                   canvas has no gesture for stating one",
        },
        CheckAudit {
            check: "check_orphan_sources",
            witness: Some("orphan_source_is_error"),
            canvas: false,
            note: "an env thing projects only when a bond touches it, and its \
                   Source/Sink type is derived from that same bond's direction",
        },
        CheckAudit {
            check: "check_orphan_sinks",
            witness: Some("orphan_sink_is_error"),
            canvas: false,
            note: "same derivation as check_orphan_sources",
        },
        CheckAudit {
            check: "check_interaction_references",
            witness: Some("dangling_interaction_source_is_error"),
            canvas: false,
            note: "every projected endpoint comes out of the id map that also \
                   produced the systems and externals",
        },
        CheckAudit {
            check: "check_interface_references",
            witness: Some("dangling_flow_interface_is_error"),
            canvas: false,
            note: "project() routes only interface ids it minted on the same pass",
        },
        CheckAudit {
            check: "check_interfaces_carry_flow",
            witness: Some("flowless_interface_is_refused_at_operational_in_kernel"),
            canvas: true,
            note: "stamp a component `interface` and draw no crossing flow; the \
                   canvas-path witness is bert_canvas's \
                   flowless_interface_is_refused_at_operational",
        },
        CheckAudit {
            check: "check_interface_declarations_match_flows",
            witness: Some("divergent_interface_declaration_is_refused_at_operational"),
            canvas: false,
            note: "project() derives receives_from/exports_to from the same bond \
                   list it turns into interactions, so a canvas model's \
                   declaration and graph cannot disagree; fires on hand-authored \
                   or generated files that state both halves (a Listing 4.2 \
                   transcription). The .sl surface carries only a boolean \
                   `interface` flag — no syntax names an attachment — so the \
                   source corpus cannot reach it either",
        },
        CheckAudit {
            check: "check_parent_references",
            witness: Some("unresolvable_parent_is_error"),
            canvas: false,
            note: "project() parents the root at E-1 and every component at the root",
        },
        CheckAudit {
            check: "check_duplicate_ids",
            witness: Some("repeated_id_is_error"),
            canvas: false,
            note: "ids are minted per type prefix with a running index",
        },
        CheckAudit {
            check: "check_environment_id",
            witness: Some("env_id_wrong_is_warning"),
            canvas: false,
            note: "project() always writes the environment as E-1",
        },
        CheckAudit {
            check: "check_source_sink_type_consistency",
            witness: Some("misfiled_external_entity_is_warning"),
            canvas: false,
            note: "the array and the type are set together from one branch",
        },
        CheckAudit {
            check: "check_version",
            witness: Some("wrong_version_is_warning"),
            canvas: false,
            note: "project() stamps CURRENT_FILE_VERSION; fires on a file written \
                   by another version of BERT",
        },
        CheckAudit {
            check: "check_level_consistency",
            witness: Some("level_mismatch_is_warning"),
            canvas: false,
            note: "project() derives level from the same index depth the id carries",
        },
        CheckAudit {
            check: "check_required_fields",
            witness: Some("preparse_missing_radius_is_error"),
            canvas: false,
            note: "pre-parse, on raw JSON — a typed WorldModel cannot be missing a \
                   field, so this fires only off the typed path",
        },
        CheckAudit {
            check: "check_processor_flows",
            witness: Some("processor_without_flows_is_warning"),
            canvas: true,
            note: "stamp a component `interface` and draw nothing at all; at \
                   Operational/Full check_interfaces_carry_flow also fires on \
                   every such model, so the two overlap there and only this one \
                   speaks in Core/Structural",
        },
        CheckAudit {
            check: "check_s0_interface_processors",
            witness: Some("s0_interface_without_processor_is_warning"),
            canvas: false,
            note: "project() sets boundary.parent_interface on every designated \
                   component, so no projected S0 interface is ever unclaimed; \
                   fires on hierarchical hand-authored models",
        },
    ];

    /// The standing gate #220 asked for: a check with no audit row, or a row
    /// naming a witness test that does not exist, fails here. Adding a
    /// `check_*` to this module now costs one row and one firing test.
    #[test]
    fn every_check_has_a_firing_verdict() {
        let src = include_str!("validate.rs");
        let declared: HashSet<String> = src
            .lines()
            .filter_map(|l| {
                let rest = l.strip_prefix("fn ").or_else(|| l.strip_prefix("pub fn "))?;
                let name = rest.split('(').next()?;
                name.starts_with("check_").then(|| name.to_string())
            })
            .collect();
        let audited: HashSet<String> = FIRING_AUDIT
            .iter()
            .map(|row| row.check.to_string())
            .collect();

        let unaudited: Vec<_> = declared.difference(&audited).collect();
        assert!(
            unaudited.is_empty(),
            "every check owes a firing verdict; missing rows for {unaudited:?}"
        );
        let stale: Vec<_> = audited.difference(&declared).collect();
        assert!(stale.is_empty(), "audit rows for checks that no longer exist: {stale:?}");

        for row in FIRING_AUDIT {
            assert!(!row.note.is_empty(), "{} owes a note", row.check);
            match row.witness {
                Some(witness) => assert!(
                    src.contains(&format!("fn {witness}(")),
                    "{}'s witness {witness} does not exist in this module",
                    row.check
                ),
                // Only an off-the-typed-path check may go without one.
                None => assert!(
                    !row.canvas,
                    "{} is claimed reachable from the canvas but has no witness",
                    row.check
                ),
            }
        }

        // The net #219 added for the flowless interface is the canvas's, and the
        // whole point of #220 is that it must not drift back out of reach.
        assert!(
            FIRING_AUDIT
                .iter()
                .any(|r| r.check == "check_interfaces_carry_flow" && r.canvas),
            "the flowless-interface refusal must stay reachable from the canvas"
        );
    }
}
