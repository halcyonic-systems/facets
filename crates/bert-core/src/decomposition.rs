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
//! | `derived_env` | `E′` = parent's interior neighborhood of `c` (nothing else) | every child env object carries a boundary flow | `Decomposition.derived_env` |
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
//! - **`derived_env` equality is only half-checkable in the kernel.** The full
//!   Lean equality `E′ = succ(c) ∪ pred(c)` matches child env objects to parent
//!   neighbors across TWO models with disjoint id spaces; the cross-model
//!   neighbor-identity map is the store layer's (step 5). The kernel checks the
//!   falsifiable half — `E′` contains nothing free-floating (every child env
//!   object is justified by a boundary flow) — which, together with the `β`
//!   bijections, pins `E′` to `c`'s incident-flow endpoints.

use crate::validate::{Severity, ValidationIssue};
use crate::{is_system_relatum, Id, Interaction, ModelRef, SubstanceType, WorldModel};
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
                child_ref.as_uuid()
            ),
            "Restore the referenced child model, or clear this component's child_model reference",
            Some(comp.clone()),
        )],
        Some(child) => check_decomposition_contract(parent, comp, child),
    }
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

    // Row `comp_mem`: `comp ∈ parent.components`. Everything downstream is defined
    // in terms of a genuine parent component, so a failure here short-circuits.
    let comp_is_component =
        is_system_relatum(comp) && parent.systems.iter().any(|s| &s.info.id == comp);
    if !comp_is_component {
        issues.push(refuse(
            loc,
            format!(
                "Decomposition.comp_mem: \"{}\" is not a component of the parent model — \
                 only a genuine system component may be decomposed",
                id_str(comp)
            ),
            "Reference a component that exists in the parent model's systems",
            Some(comp.clone()),
        ));
        return issues;
    }

    // v1 binding narrowing (gate comment, 2026-07-20): REFUSE to decompose a
    // component that is itself a parent interface. Flows crossing the parent
    // membrane THROUGH `comp` are not yet in the Lean contract (`inflows`/
    // `outflows` cover the internal network only) — refuse loudly rather than
    // check a seam the mathematics does not yet underwrite.
    if parent.boundary_components().contains(comp) {
        issues.push(refuse(
            loc,
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
        ));
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
    // appear in it that a boundary flow does not justify. The kernel checks the
    // falsifiable half (no free-floating env object); see the module note on why
    // the full cross-model equality is the store layer's.
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
    /// env holds exactly the two neighbor stand-ins. `kinds`/`extras` let a test
    /// perturb one fact to make a single property barely fail.
    fn child_model(in_kind: &str, out_kind: &str, extra_env_source: bool, land_src_on_env: bool) -> WorldModel {
        let mut sources = vec![ext("Src-1.0", "Source")];
        if extra_env_source {
            sources.push(ext("Src-1.1", "Source"));
        }
        // src flow target: normally the interface component K0.0; when
        // `land_src_on_env`, it lands on a sink (no interface component) instead.
        let src_target = if land_src_on_env { "Snk-1.0" } else { "C0.0" };
        let value = json!({
            "version": 1,
            "environment": {
                "info": { "id": "E-1", "level": -1, "name": "", "description": "" },
                "sources": sources,
                "sinks": [ ext("Snk-1.0", "Sink") ]
            },
            "systems": [
                sys("S0", 0, "FurnaceInterior", "E-1"),
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

    fn ext(id: &str, ty: &str) -> Value {
        json!({
            "info": { "id": id, "level": -1, "name": id, "description": "" },
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
            "sources": [], "sinks": [ ext("Snk-1.0", "Sink") ]
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
}
