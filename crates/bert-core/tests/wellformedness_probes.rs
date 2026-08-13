//! Executed probes for `docs/wellformedness-mapping.md`.
//!
//! The mapping doc claims, for each conjunct of the Lean `WellFormed` structure
//! (`systems-science-foundations/Systems/Mobus/Lifecycle.lean`), which kernel
//! check enforces it. Three of those claims are gaps, and a gap asserted in
//! prose is a gap nobody has to believe. Each test below CONSTRUCTS the model
//! the Lean forbids and asserts what the kernel says about it today — so the
//! doc's PARTIAL and UNENFORCED rows have a witness, and a future repair turns
//! these red instead of leaving the doc quietly wrong.
//!
//! These tests pin CURRENT behaviour, not desired behaviour. Every assertion of
//! silence carries the row it belongs to. Fixing a gap means editing the doc row
//! and this file together.

use bert_core::validate::{
    is_interface_declaration_refusal, is_interface_flow_refusal, validate_mode, Severity,
};
use bert_core::*;
use rust_decimal::Decimal;

fn info(id: Id, level: i32, name: &str) -> Info {
    Info {
        id,
        level,
        name: name.to_string(),
        description: String::new(),
    }
}

fn sys_id(indices: Vec<i64>) -> Id {
    Id {
        ty: if indices.len() == 1 {
            IdType::System
        } else {
            IdType::Subsystem
        },
        indices,
    }
}

/// A root S0 with an empty environment — the same baseline the in-crate tests
/// use, rebuilt here so the probes do not depend on a private helper.
fn root_model() -> WorldModel {
    WorldModel {
        version: CURRENT_FILE_VERSION,
        environment: Environment {
            info: info(
                Id {
                    ty: IdType::Environment,
                    indices: vec![-1],
                },
                -1,
                "",
            ),
            sources: vec![],
            sinks: vec![],
        },
        systems: vec![system(sys_id(vec![0]), 0, "Root", None)],
        interactions: vec![],
        reachability_requirements: vec![],
        model_id: None,
        mode: None,
        hidden_entities: vec![],
        time_unit: None,
    }
}

fn system(id: Id, level: i32, name: &str, parent: Option<Id>) -> System {
    System {
        info: info(id.clone(), level, name),
        sources: vec![],
        sinks: vec![],
        parent: parent.unwrap_or(Id {
            ty: IdType::Environment,
            indices: vec![-1],
        }),
        complexity: Complexity::Atomic,
        boundary: Boundary {
            info: info(
                Id {
                    ty: IdType::Boundary,
                    indices: id.indices.clone(),
                },
                level,
                "",
            ),
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
        agent: None,
        child_model: None,
        archetype: None,
    }
}

fn sink(indices: Vec<i64>, name: &str) -> ExternalEntity {
    ExternalEntity {
        info: info(
            Id {
                ty: IdType::Sink,
                indices,
            },
            -1,
            name,
        ),
        ty: ExternalEntityType::Sink,
        transform: None,
        equivalence: String::new(),
        model: String::new(),
        is_same_as_id: None,
        authored_direction: true,
    }
}

fn iface(indices: Vec<i64>, name: &str, exports_to: Vec<Id>) -> Interface {
    Interface {
        info: info(
            Id {
                ty: IdType::Interface,
                indices,
            },
            1,
            name,
        ),
        protocol: String::new(),
        ty: InterfaceType::Export,
        exports_to,
        receives_from: vec![],
        angle: None,
    }
}

#[allow(clippy::too_many_arguments)]
fn flow(idx: i64, name: &str, source: Id, source_interface: Option<Id>, sink: Id) -> Interaction {
    Interaction {
        info: info(
            Id {
                ty: IdType::Flow,
                indices: vec![idx],
            },
            0,
            name,
        ),
        substance: Substance {
            sub_type: String::new(),
            ty: SubstanceType::Energy,
        },
        ty: InteractionType::Flow,
        usability: InteractionUsability::Product,
        source,
        source_interface,
        sink,
        sink_interface: None,
        amount: Decimal::ONE,
        unit: String::new(),
        ample: false,
        parameters: vec![],
        smart_parameters: vec![],
        endpoint_offset: None,
    }
}

fn errors(model: &WorldModel, mode: Mode) -> Vec<String> {
    validate_mode(model, mode)
        .issues
        .into_iter()
        .filter(|i| i.severity == Severity::Error)
        .map(|i| i.code)
        .collect()
}

/// Doc row `interfaces_carry_flow` — PARTIAL.
///
/// The Lean asks a GRAPH question: `InterfacesCarryEdges G.edges I` requires,
/// for each `i ∈ I`, an edge of the external flow network with `i` as an
/// endpoint. `check_interfaces_carry_flow` accepts a non-empty `exports_to` /
/// `receives_from` DECLARATION in place of such an edge, and
/// `check_interface_declarations_match_flows` is satisfied when the flow merely
/// lands on the system whose boundary carries the interface.
///
/// So an interface that no interaction touches — not routed through, not even
/// named as an endpoint — passes both checks while contributing no edge to G.
/// The model below has two interfaces on the root membrane; the single crossing
/// flow is routed through `Routed`, and `Declared` carries only a declaration.
#[test]
fn an_interface_with_no_edge_in_g_passes_both_interface_checks() {
    let mut model = root_model();
    let snk = Id {
        ty: IdType::Sink,
        indices: vec![-1, 0],
    };
    model.environment.sinks.push(sink(vec![-1, 0], "Outfall"));

    let routed = Id {
        ty: IdType::Interface,
        indices: vec![0, 0],
    };
    model.systems[0]
        .boundary
        .interfaces
        .push(iface(vec![0, 0], "Routed", vec![]));
    // `Declared` names the SAME sink the routed flow reaches, so the
    // declaration-vs-graph check finds a recording interaction.
    model.systems[0]
        .boundary
        .interfaces
        .push(iface(vec![0, 1], "Declared", vec![snk.clone()]));

    let s0 = model.systems[0].info.id.clone();
    model
        .interactions
        .push(flow(0, "Out", s0, Some(routed), snk));

    let issues = validate_mode(&model, Mode::Operational).issues;
    assert!(
        !issues.iter().any(is_interface_flow_refusal),
        "PROBE: `Declared` touches no external flow, yet the graph check is \
         silent — the declaration substitutes for the edge: {issues:#?}"
    );
    assert!(
        !issues.iter().any(is_interface_declaration_refusal),
        "PROBE: the declaration check is satisfied by a flow that lands on the \
         parent system rather than on this interface: {issues:#?}"
    );
    assert!(
        errors(&model, Mode::Operational).is_empty(),
        "PROBE: the whole model is clean at Operational: {issues:#?}"
    );
}

/// Doc row `interfaces_sub` (I ⊆ C) — UNENFORCED below level 0.
///
/// In the Lean, `I` and `C` are two subsets of one carrier and `interfaces_sub`
/// relates them. In the `WorldModel` they are different record types living in
/// different arrays, related only by `boundary.parent_interface`. The nearest
/// check, `check_s0_interface_processors`, looks ONLY at the level-0 system and
/// only warns. An interface on a level-1 subsystem that no system claims draws
/// nothing at all, in any mode.
#[test]
fn an_unclaimed_interface_below_level_zero_draws_nothing() {
    let mut model = root_model();
    let child_id = sys_id(vec![0, 0]);
    let mut child = system(child_id.clone(), 1, "Child", Some(sys_id(vec![0])));
    let snk = Id {
        ty: IdType::Sink,
        indices: vec![-1, 0],
    };
    model.environment.sinks.push(sink(vec![-1, 0], "Outfall"));
    let orphan = Id {
        ty: IdType::Interface,
        indices: vec![0, 0, 0],
    };
    child
        .boundary
        .interfaces
        .push(iface(vec![0, 0, 0], "Unclaimed", vec![]));
    model.systems.push(child);
    model
        .interactions
        .push(flow(0, "Out", child_id, Some(orphan), snk));

    for mode in [Mode::Core, Mode::Structural, Mode::Operational, Mode::Full] {
        let issues = validate_mode(&model, mode).issues;
        assert!(
            !issues.iter().any(|i| i.code == "interface_without_processor"),
            "PROBE: the S0-only claim check cannot see a level-1 interface \
             ({mode:?}): {issues:#?}"
        );
    }
}

/// Doc row `internal_lawful` / `externalFlows_nodes` — the interface-endpoint
/// hole, recorded as an OBSERVATION, not as a Lean violation.
///
/// `collect_known_ids` admits interface ids, so an interaction may name an
/// interface as its `source` or `sink` and resolve. Such an edge is then in
/// neither of the kernel's two derived edge classes: `is_system_relatum` is
/// false for `IdType::Interface`, so the internal-graph checks skip it, and
/// `external()` is false too, so the crossing check skips it. It contributes to
/// no verdict.
///
/// Whether this violates the Lean depends on how I is read into C, which the
/// kernel's representation does not settle — hence UNKNOWN in the doc rather
/// than a gap. What is certain is the silence, and that is what this pins.
#[test]
fn an_interaction_endpointed_on_an_interface_is_in_neither_edge_class() {
    let mut model = root_model();
    let a = Id {
        ty: IdType::Interface,
        indices: vec![0, 0],
    };
    let b = Id {
        ty: IdType::Interface,
        indices: vec![0, 1],
    };
    model.systems[0]
        .boundary
        .interfaces
        .push(iface(vec![0, 0], "A", vec![]));
    model.systems[0]
        .boundary
        .interfaces
        .push(iface(vec![0, 1], "B", vec![]));
    model.interactions.push(flow(0, "A to B", a, None, b));

    let codes = errors(&model, Mode::Operational);
    assert!(
        !codes.iter().any(|c| c == "interaction_endpoint_unresolved"),
        "PROBE: interface ids resolve as interaction endpoints: {codes:?}"
    );
    assert!(
        !codes
            .iter()
            .any(|c| c == "crossing_flow_without_interface" || c == "self_loop_flow"),
        "PROBE: an interface→interface edge is in neither derived edge class: {codes:?}"
    );
    // The one thing it does do: it satisfies the coverage check for both
    // interfaces, because `routed` is collected from source/sink_interface only
    // — so this edge does not even count there.
    assert!(
        validate_mode(&model, Mode::Operational)
            .issues
            .iter()
            .filter(|i| is_interface_flow_refusal(i))
            .count()
            == 2,
        "PROBE: both interfaces still read as flowless despite the edge"
    );
}
