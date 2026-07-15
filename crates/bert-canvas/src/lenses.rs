//! The two kernel primitives behind the faithful lens palettes, canvas-keyed.
//!
//! `docs/design/lens-palettes.md` grounds the lens toggle in two machine-checked
//! convergences (systems-science-foundations, Bridge.lean):
//!
//! 1. **The boundary identity (nodes):** boundary(Bunge 1992) = interfaces(Mobus,
//!    `Interface.lean:7` / `Boundary.lean:39`) = `{c ∈ C : coupled to E}` — the
//!    SAME set. The Bunge lens *marks* these nodes; the Mobus lens *reifies* them
//!    into a membrane + ports on the same nodes.
//! 2. **The edge ladder (edges):** flow (κ + substance) → bond-candidate
//!    (directed + action test) → relation (neutral). Mobus paints substance,
//!    Bunge connection-kind + bond-vs-mere + endo/exo (= N/G, computed), Klir
//!    arity ± direction.
//!
//! The semantic predicates live in `bert-core` (`boundary_components`,
//! `edge_locus`); this module projects the canvas editing model
//! (`project_with_map`) and translates the verdicts back to canvas ids so the
//! face can render them. Mere relations (`is_bond: false`) are Bunge's B̄ — a
//! predicate the 8-tuple does not carry (lens-palettes.md: "Bunge adds its own
//! semantic predicates"), so they never project; their locus is classified here,
//! still in Rust, from the same C/E role split. Zero systems logic in JS.

use serde::Serialize;
use std::collections::HashMap;

use bert_core::validate::{validate_mode, Severity};
use bert_core::{EdgeLocus, Id, Interaction, Mode};

use crate::canvas::{project_with_map, CanvasModel, Kind, Lens, Role};

/// One canvas relation, read through the edge ladder.
#[derive(Serialize, Clone, Debug)]
pub struct EdgeFact {
    pub id: u64,
    pub a: u64,
    pub b: u64,
    /// Bunge's bond-vs-mere-relation predicate (author-declared; `FlowInducesAction`
    /// is the Lean criterion — a flow that modifies history is a bond).
    pub bond: bool,
    pub kind: Kind,
    /// Endo (∈ N, endostructure) vs Exo (∈ G, exostructure) — kernel-computed.
    pub locus: EdgeLocus,
    pub self_loop: bool,
    /// `false` iff self-loop: a Bunge diagonal bond has NO Mobus preimage
    /// (`FlowNetwork.lean:68` `no_self_loops`, Mobus §4.3 `k ≠ o`). A real
    /// cross-lens incompatibility the tool states rather than hides.
    pub mobus_ok: bool,
}

/// Which way a Mobus interface gates (Fig. 4.9: receives / exports / hybrid).
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum PortDirection {
    Receives,
    Exports,
    Hybrid,
}

/// One Mobus interface `r = (S_{i,l+1}, φ)` — a port in the boundary, gating the
/// external flows between one boundary component and one environment object.
/// `component` is always a member of `boundary_thing_ids`: the node Bunge marks
/// IS the node Mobus equips (the boundary identity, per-port).
#[derive(Serialize, Clone, Debug)]
pub struct PortFact {
    pub component: u64,
    pub env: u64,
    /// The exo flows this port gates (canvas relation ids).
    pub relation_ids: Vec<u64>,
    pub direction: PortDirection,
    /// φ — joined non-empty flow names, else the kind's name.
    pub protocol: String,
}

/// Mobus boundary properties (B = ⟨P, I⟩'s P): porosity + perceptive fuzziness,
/// read from the projected root boundary (0.0 until the canvas authors them).
#[derive(Serialize, Clone, Copy, Debug)]
pub struct BoundaryProps {
    pub porosity: f32,
    pub perceptive_fuzziness: f32,
}

/// Everything the three lens renderings read, keyed by canvas ids.
#[derive(Serialize, Clone, Debug)]
pub struct LensFacts {
    /// The boundary identity set: components with an external flow.
    pub boundary_thing_ids: Vec<u64>,
    /// O — the environment objects (role = Environment things).
    pub environment_thing_ids: Vec<u64>,
    pub boundary_props: BoundaryProps,
    /// Bunge Def 1.1 verdict, surfaced verbatim from `validate_mode(Structural)`:
    /// `true` = no bond between distinct components = an aggregate/heap.
    pub aggregate: bool,
    /// Every canvas relation (bonds AND mere relations), through the ladder.
    pub edges: Vec<EdgeFact>,
    /// Mobus interfaces, one per (boundary component, environment object) pair.
    pub ports: Vec<PortFact>,
}

fn kind_name(k: Kind) -> &'static str {
    match k {
        Kind::Unspecified => "unspecified",
        Kind::Energy => "energy",
        Kind::Matter => "matter",
        Kind::Field => "field",
        Kind::Informational => "informational",
    }
}

/// What a (component, env) port pair accumulates while grouping exo bonds:
/// (gated relation ids, receives?, exports?, protocol labels).
type PortAccum = (Vec<u64>, bool, bool, Vec<String>);

/// Compute the lens facts for a canvas model: project, ask bert-core, translate
/// the verdicts back to canvas ids.
pub fn lens_facts(model: &CanvasModel) -> LensFacts {
    let p = project_with_map(model);

    let roles: HashMap<u64, Role> = model.things.iter().map(|t| (t.id, t.role)).collect();

    // Nodes: the boundary identity, mapped back to canvas ids.
    let canvas_of: HashMap<&bert_core::Id, u64> =
        p.thing_ids.iter().map(|(k, v)| (v, *k)).collect();
    let boundary_thing_ids: Vec<u64> = p
        .world
        .boundary_components()
        .iter()
        .filter_map(|id| canvas_of.get(id).copied())
        .collect();
    let environment_thing_ids: Vec<u64> = model
        .things
        .iter()
        .filter(|t| t.role == Role::Environment)
        .map(|t| t.id)
        .collect();

    // The root system's boundary carries P (porosity, fuzziness).
    let boundary_props = p
        .world
        .systems
        .first()
        .map(|s| BoundaryProps {
            porosity: s.boundary.porosity,
            perceptive_fuzziness: s.boundary.perceptive_fuzziness,
        })
        .unwrap_or(BoundaryProps {
            porosity: 0.0,
            perceptive_fuzziness: 0.0,
        });

    // Bunge Def 1.1, surfaced from the kernel's Structural gate — never re-derived.
    let aggregate = validate_mode(&p.world, Mode::Structural)
        .issues
        .iter()
        .any(|i| i.location == "mode/Structural" && i.severity == Severity::Error);

    // Edges: projected bonds classify via the kernel; mere relations (never
    // projected — B̄) classify from the same C/E role split, here in Rust.
    let interaction_by_id: HashMap<&Id, &Interaction> =
        p.world.interactions.iter().map(|i| (&i.info.id, i)).collect();
    let locus_from_roles = |a: u64, b: u64| {
        let is_comp = |id: u64| roles.get(&id).copied().unwrap_or_default() == Role::Component;
        if is_comp(a) && is_comp(b) {
            EdgeLocus::Endo
        } else {
            EdgeLocus::Exo
        }
    };
    let edges: Vec<EdgeFact> = model
        .relations
        .iter()
        .map(|r| {
            let locus = match p
                .interaction_of
                .get(&r.id)
                .and_then(|id| interaction_by_id.get(id))
            {
                Some(ix) => p.world.edge_locus(ix),
                None => locus_from_roles(r.a, r.b),
            };
            let self_loop = r.a == r.b;
            EdgeFact {
                id: r.id,
                a: r.a,
                b: r.b,
                bond: r.is_bond,
                kind: r.kind,
                locus,
                self_loop,
                mobus_ok: !self_loop,
            }
        })
        .collect();

    // Ports: group exo BONDS by (boundary component, environment object) pair —
    // one interface per coupling, gating all its flows. G is bipartite by
    // construction (env-object ↔ interface; Tuple.lean), which is exactly this
    // grouping: no port ever pairs two components or two env objects.
    let mut port_map: HashMap<(u64, u64), PortAccum> = HashMap::new();
    for r in &model.relations {
        if !r.is_bond || r.a == r.b {
            continue;
        }
        let role_of = |id: u64| roles.get(&id).copied().unwrap_or_default();
        let (comp, env, receives) = match (role_of(r.a), role_of(r.b)) {
            (Role::Environment, Role::Component) => (r.b, r.a, true), // env → comp
            (Role::Component, Role::Environment) => (r.a, r.b, false), // comp → env
            _ => continue,
        };
        let entry = port_map
            .entry((comp, env))
            .or_insert_with(|| (Vec::new(), false, false, Vec::new()));
        entry.0.push(r.id);
        if receives {
            entry.1 = true;
        } else {
            entry.2 = true;
        }
        let label = if r.name.trim().is_empty() {
            kind_name(r.kind).to_string()
        } else {
            r.name.trim().to_string()
        };
        if !entry.3.contains(&label) {
            entry.3.push(label);
        }
    }
    let mut ports: Vec<PortFact> = port_map
        .into_iter()
        .map(|((component, env), (relation_ids, receives, exports, labels))| PortFact {
            component,
            env,
            relation_ids,
            direction: match (receives, exports) {
                (true, true) => PortDirection::Hybrid,
                (true, false) => PortDirection::Receives,
                _ => PortDirection::Exports,
            },
            protocol: labels.join(" · "),
        })
        .collect();
    ports.sort_by_key(|p| (p.component, p.env));

    LensFacts {
        boundary_thing_ids,
        environment_thing_ids,
        boundary_props,
        aggregate,
        edges,
        ports,
    }
}

// ---- The formal face: describe(model, lens) ---------------------------------
//
// The same model read as its formal object in each lens's own notation — where
// "one kernel, three faithful views" (K≅2) becomes visible: the counts hold,
// the words change. Everything below is read off the SAME projection
// `lens_facts` uses; the face only typesets it (the math is never assembled in
// JS). The Mobus→Bunge→Klir arrows are the Lean's forgetful maps (Bridge.lean)
// run backward as enrichment.

/// The fixed M↔T caveat. Bunge's mature model is CESM (M = mechanism, Bunge
/// 2004), conceptually parallel to Mobus's T — but the Lean bridge is CES, not
/// CESM: `Bridge.lean`'s information-loss section lists T among what the
/// projection DISCARDS. Pinned as a constant (and by a test) so the panel can
/// never drift into claiming a formal bridge the Lean contradicts.
pub const MECHANISM_NOTE: &str = "M (mechanism — Bunge 2004, CESM) is documented but formally \
UNbridged: the Lean Mobus→Bunge projection is CES, not CESM (Bridge.lean discards T).";

/// One model, typeset in the active lens's own formal notation.
#[derive(Serialize, Clone, Debug)]
#[serde(tag = "lens")]
pub enum LensDescription {
    /// Klir `S = (T, R)` — thinghood + systemhood; observer-constituted.
    Klir {
        things: usize,
        relations: usize,
        directed: usize,
        neutral: usize,
        note: String,
    },
    /// Bunge `σ = ⟨C, E, S, M⟩` — the CESM model; systemhood is earned (Def 1.1).
    Bunge {
        composition: Vec<String>,
        environment: Vec<String>,
        endostructure: usize,
        exostructure: usize,
        bondage: usize,
        mere_relations: usize,
        boundary_components: Vec<String>,
        verdict: String,
        mechanism_note: String,
    },
    /// Mobus `S = ⟨C, N, E, G, B, T, H, Δt⟩` — the 8-tuple (post-2022 revision;
    /// Tuple.lean is the authority, NOT the book's 7-tuple).
    Mobus {
        c: Vec<String>,
        n: usize,
        e_objects: Vec<String>,
        milieu_note: String,
        g: usize,
        b_interfaces: Vec<String>,
        porosity: f32,
        perceptive_fuzziness: f32,
        t_note: String,
        h_note: String,
        dt_note: String,
        self_loop_conflicts: Vec<String>,
    },
}

/// Typeset the model as the active lens's formal object. Counts are read off
/// the same kernel facts the canvas renders — never re-derived.
pub fn describe(model: &CanvasModel, lens: Lens) -> LensDescription {
    let facts = lens_facts(model);
    let name_of = |id: u64| -> String {
        model
            .things
            .iter()
            .find(|t| t.id == id)
            .map(|t| t.name.clone())
            .unwrap_or_else(|| format!("#{id}"))
    };

    match lens {
        Lens::Klir => {
            // (T, R): every thing is just a thing; every drawn relation counts
            // (Klir has no bond concept — that predicate is Bunge's).
            let directed = model.relations.iter().filter(|r| r.klir_directed).count();
            LensDescription::Klir {
                things: model.things.len(),
                relations: model.relations.len(),
                directed,
                neutral: model.relations.len() - directed,
                note: "a system is what is distinguished as a system by the investigator; \
                       the distinction frame is the observer's act, not a boundary"
                    .to_string(),
            }
        }
        Lens::Bunge => {
            let composition: Vec<String> = model
                .things
                .iter()
                .filter(|t| t.role == Role::Component)
                .map(|t| t.name.clone())
                .collect();
            let environment: Vec<String> = facts.environment_thing_ids.iter().map(|&id| name_of(id)).collect();
            let bondage = facts.edges.iter().filter(|e| e.bond).count();
            LensDescription::Bunge {
                composition,
                environment,
                endostructure: facts
                    .edges
                    .iter()
                    .filter(|e| e.bond && e.locus == EdgeLocus::Endo)
                    .count(),
                exostructure: facts
                    .edges
                    .iter()
                    .filter(|e| e.bond && e.locus == EdgeLocus::Exo)
                    .count(),
                bondage,
                mere_relations: facts.edges.len() - bondage,
                boundary_components: facts.boundary_thing_ids.iter().map(|&id| name_of(id)).collect(),
                verdict: if facts.aggregate { "aggregate" } else { "system" }.to_string(),
                mechanism_note: MECHANISM_NOTE.to_string(),
            }
        }
        Lens::Mobus => LensDescription::Mobus {
            c: model
                .things
                .iter()
                .filter(|t| t.role == Role::Component)
                .map(|t| t.name.clone())
                .collect(),
            n: facts
                .edges
                .iter()
                .filter(|e| e.bond && e.locus == EdgeLocus::Endo)
                .count(),
            e_objects: facts.environment_thing_ids.iter().map(|&id| name_of(id)).collect(),
            milieu_note: "μ (milieu) is parametric/opaque — the one element with no \
                          cross-lens preimage (milieuOnly_bunge_empty)"
                .to_string(),
            g: facts
                .edges
                .iter()
                .filter(|e| e.bond && e.locus == EdgeLocus::Exo)
                .count(),
            b_interfaces: facts.ports.iter().map(|p| name_of(p.component)).collect(),
            porosity: facts.boundary_props.porosity,
            perceptive_fuzziness: facts.boundary_props.perceptive_fuzziness,
            t_note: "T: transforms — parametric by intent; bert-compose fills the slot".to_string(),
            h_note: "H: history (accumulated state conditioning T) — NOT hierarchy".to_string(),
            dt_note: "Δt: time scale — a parametric field on the system".to_string(),
            self_loop_conflicts: facts
                .edges
                .iter()
                .filter(|e| !e.mobus_ok)
                .map(|e| {
                    let named = model
                        .relations
                        .iter()
                        .find(|r| r.id == e.id)
                        .map(|r| r.name.trim().to_string())
                        .unwrap_or_default();
                    if named.is_empty() {
                        format!("{} → {}", name_of(e.a), name_of(e.b))
                    } else {
                        named
                    }
                })
                .collect(),
        },
    }
}

#[cfg(all(test, not(target_arch = "wasm32")))]
mod tests {
    use super::*;
    use crate::canvas::{Lens, Relation, Thing};

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
    fn relation(id: u64, a: u64, b: u64, is_bond: bool) -> Relation {
        Relation {
            id,
            a,
            b,
            name: String::new(),
            is_bond,
            kind: Kind::Unspecified,
            klir_directed: false,
        }
    }
    fn model(things: Vec<Thing>, relations: Vec<Relation>) -> CanvasModel {
        CanvasModel {
            lens: Lens::Mobus,
            things,
            relations,
        }
    }

    #[test]
    fn boundary_facts_are_canvas_keyed() {
        // 3(Env) → 1(Comp) → 2(Comp): only 1 couples to the environment.
        let m = model(
            vec![
                thing(1, "A", Role::Component),
                thing(2, "B", Role::Component),
                thing(3, "Src", Role::Environment),
            ],
            vec![relation(10, 1, 2, true), relation(11, 3, 1, true)],
        );
        let f = lens_facts(&m);
        assert_eq!(f.boundary_thing_ids, vec![1], "A is coupled to E; B is shielded");
        assert_eq!(f.environment_thing_ids, vec![3]);
    }

    #[test]
    fn edges_ladder_reports_every_relation() {
        let m = model(
            vec![
                thing(1, "A", Role::Component),
                thing(2, "B", Role::Component),
                thing(3, "Src", Role::Environment),
            ],
            vec![
                relation(10, 1, 2, true),  // endo bond
                relation(11, 3, 1, true),  // exo bond
                relation(12, 1, 2, false), // mere relation — B̄, never projects
            ],
        );
        let f = lens_facts(&m);
        assert_eq!(f.edges.len(), 3, "every canvas relation appears");
        let by_id = |id: u64| f.edges.iter().find(|e| e.id == id).unwrap();
        assert!(by_id(10).bond);
        assert_eq!(by_id(10).locus, EdgeLocus::Endo);
        assert_eq!(by_id(11).locus, EdgeLocus::Exo);
        assert!(!by_id(12).bond);
        assert_eq!(by_id(12).locus, EdgeLocus::Endo);
    }

    #[test]
    fn self_loop_flagged_not_mobus() {
        let m = model(
            vec![thing(1, "A", Role::Component), thing(2, "B", Role::Component)],
            vec![relation(10, 1, 2, true), relation(11, 1, 1, true)],
        );
        let f = lens_facts(&m);
        let lp = f.edges.iter().find(|e| e.id == 11).unwrap();
        assert!(lp.self_loop);
        assert!(!lp.mobus_ok, "a Bunge diagonal bond has no Mobus preimage");
        // The loop couples nothing to E: the boundary set is unchanged by it.
        assert!(f.boundary_thing_ids.is_empty());
        // And no port arises from a self-loop.
        assert!(f.ports.is_empty());
    }

    #[test]
    fn ports_are_bipartite_and_directional() {
        let mut m = model(
            vec![
                thing(1, "A", Role::Component),
                thing(2, "B", Role::Component),
                thing(3, "Src", Role::Environment),
            ],
            vec![relation(10, 1, 2, true), relation(11, 3, 1, true)],
        );
        let f = lens_facts(&m);
        assert_eq!(f.ports.len(), 1);
        assert_eq!(f.ports[0].component, 1);
        assert_eq!(f.ports[0].env, 3);
        assert_eq!(f.ports[0].direction, PortDirection::Receives);
        // The boundary identity, per-port: the ported node IS a marked boundary node.
        assert!(f.boundary_thing_ids.contains(&f.ports[0].component));

        // Add the reverse coupling on the same pair → one merged Hybrid port.
        m.relations.push(relation(12, 1, 3, true));
        let f = lens_facts(&m);
        assert_eq!(f.ports.len(), 1);
        assert_eq!(f.ports[0].direction, PortDirection::Hybrid);
        assert_eq!(f.ports[0].relation_ids, vec![11, 12]);
    }

    /// A: component, B: component, Src: env; endo bond A→B, exo bond Src→A,
    /// mere relation A–B, self-loop A→A.
    fn rich_model() -> CanvasModel {
        model(
            vec![
                thing(1, "A", Role::Component),
                thing(2, "B", Role::Component),
                thing(3, "Src", Role::Environment),
            ],
            vec![
                relation(10, 1, 2, true),
                relation(11, 3, 1, true),
                relation(12, 1, 2, false),
                relation(13, 1, 1, true),
            ],
        )
    }

    #[test]
    fn describe_counts_hold_across_lenses() {
        // K≅2 made visible: the counts agree, only the vocabulary changes.
        let m = rich_model();
        let (LensDescription::Klir { things, relations, .. },
             LensDescription::Bunge { composition, environment, bondage, mere_relations, endostructure, exostructure, .. },
             LensDescription::Mobus { c, e_objects, n, g, .. }) =
            (describe(&m, Lens::Klir), describe(&m, Lens::Bunge), describe(&m, Lens::Mobus))
        else {
            panic!("lens tags must match the lens asked for");
        };
        assert_eq!(things, composition.len() + environment.len());
        assert_eq!(things, c.len() + e_objects.len());
        assert_eq!(relations, bondage + mere_relations);
        // The endo/exo split partitions the bondage; N and G are the same
        // counts read in Mobus vocabulary (endo/exo = N/G).
        assert_eq!(bondage, endostructure + exostructure);
        assert_eq!(n, endostructure);
        assert_eq!(g, exostructure);
    }

    #[test]
    fn describe_bunge_verdict_matches_kernel() {
        let m = rich_model();
        let LensDescription::Bunge { verdict, boundary_components, .. } = describe(&m, Lens::Bunge) else {
            panic!("expected Bunge");
        };
        assert_eq!(verdict, "system", "A→B is a bond between distinct components");
        assert_eq!(boundary_components, vec!["A"]);
        let mut heap = m.clone();
        heap.relations.retain(|r| !r.is_bond);
        let LensDescription::Bunge { verdict, .. } = describe(&heap, Lens::Bunge) else {
            panic!("expected Bunge");
        };
        assert_eq!(verdict, "aggregate");
    }

    #[test]
    fn describe_mobus_lists_self_loop_conflicts() {
        let m = rich_model();
        let LensDescription::Mobus { self_loop_conflicts, b_interfaces, .. } = describe(&m, Lens::Mobus) else {
            panic!("expected Mobus");
        };
        assert_eq!(self_loop_conflicts, vec!["A → A"]);
        assert_eq!(b_interfaces, vec!["A"], "B's interfaces are the boundary components, reified");
    }

    #[test]
    fn mechanism_note_never_claims_bridge() {
        // Pin the wording: M↔T is conceptually parallel but formally UNbridged
        // (Bridge.lean is CES, not CESM). The panel must never drift.
        let LensDescription::Bunge { mechanism_note, .. } = describe(&rich_model(), Lens::Bunge) else {
            panic!("expected Bunge");
        };
        assert!(mechanism_note.contains("formally UNbridged"));
        assert!(mechanism_note.contains("CES, not CESM"));
    }

    #[test]
    fn aggregate_flips_with_the_bond() {
        // Two components joined only by a mere relation: an aggregate (Def 1.1).
        let mut m = model(
            vec![thing(1, "A", Role::Component), thing(2, "B", Role::Component)],
            vec![relation(10, 1, 2, false)],
        );
        assert!(lens_facts(&m).aggregate, "mere relations do not bond");
        m.relations.push(relation(11, 1, 2, true));
        assert!(!lens_facts(&m).aggregate, "one bond makes it a system");
    }
}
