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
use std::collections::{HashMap, HashSet};

use bert_core::validate::{validate_mode, Severity, ValidationIssue, ValidationResult};
use bert_core::{EdgeLocus, Id, Interaction, Mode};

use crate::canvas::{project_with_map, CanvasModel, Kind, Lens, Role};

/// Bunge's three coupling channels — his own matrix notation's row/column
/// grammar (M₀ᵣ / Mₛ₀ / Mᵣₛ): the environment acting on a component is an
/// *input*, a component acting on the environment an *output*, and component
/// acting on component *internuncial*. Refines the endo/exo locus with the
/// action's direction (#100 phase 2, F6).
#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum BungeChannel {
    Input,
    Output,
    Internuncial,
}

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
    /// The action's place in Bunge's coupling matrix (input / output /
    /// internuncial). `None` for mere relations (they do not act, so they sit
    /// in no channel) and for env–env couplings (outside 𝒮 — M has no 0,0
    /// cell). Kernel-computed; the Bunge face only styles it.
    pub channel: Option<BungeChannel>,
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
    /// φ — joined non-empty flow names, else the substance word (Mobus
    /// register: material / energy / message).
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
    /// Environment things no bond touches — the set `project()` drops as orphan
    /// terminals (canvas.rs). Not yet in ℰ: Bunge Def 1.2(ii) admits only things
    /// that act on / are acted on by a component, and mere relations don't act.
    /// The face renders these as pending; it never re-derives the set.
    pub orphan_env_thing_ids: Vec<u64>,
    /// Authored members of I (interface-designated components). Effective I =
    /// boundary_thing_ids ∪ this set: the flow-crossing set stays kernel-derived;
    /// authored-flowless members are Mobus-visible and Bunge-blind (no exo
    /// coupling → outside derived ∂C — the documented enrichment fact).
    pub authored_interface_thing_ids: Vec<u64>,
    pub boundary_props: BoundaryProps,
    /// Bunge Def 1.1 verdict, surfaced verbatim from `validate_mode(Structural)`:
    /// `true` = no bond between distinct components = an aggregate/heap.
    pub aggregate: bool,
    /// Every canvas relation (bonds AND mere relations), through the ladder.
    pub edges: Vec<EdgeFact>,
    /// Mobus interfaces, one per (boundary component, environment object) pair.
    pub ports: Vec<PortFact>,
}

/// Mobus's substance words for the port-protocol fallback (concordance row 6:
/// material · energy · message; the same collapse as `kind_to_substance`,
/// canvas.rs). Ports are a Mobus-only surface, so φ must speak substance —
/// never Bunge's kind enum (§15.1 mismatch 1, #100 D batch). Unspecified stays
/// "unspecified": the residue register counts it, so the label never silently
/// answers a question the author has not.
fn substance_word(k: Kind) -> &'static str {
    match k {
        Kind::Unspecified => "unspecified",
        Kind::Energy | Kind::Field => "energy",
        Kind::Matter => "material",
        Kind::Informational => "message",
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

    // Same membership test as project()'s orphan-terminal drop: touched by a
    // bond or not in ℰ at all (Def 1.2 ii — mere relations don't act).
    let bond_touched: HashSet<u64> = model
        .relations
        .iter()
        .filter(|r| r.is_bond)
        .flat_map(|r| [r.a, r.b])
        .collect();
    let orphan_env_thing_ids: Vec<u64> = environment_thing_ids
        .iter()
        .copied()
        .filter(|id| !bond_touched.contains(id))
        .collect();

    let authored_interface_thing_ids: Vec<u64> = model
        .things
        .iter()
        .filter(|t| t.interface && t.role == Role::Component)
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
    let is_comp = |id: u64| roles.get(&id).copied().unwrap_or_default() == Role::Component;
    let locus_from_roles = |a: u64, b: u64| {
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
            // The coupling channel (M₀ᵣ / Mₛ₀ / Mᵣₛ): only bonds act, and only
            // couplings that touch 𝒞 sit in the matrix — the exo direction
            // says whether the action arrives (input) or departs (output).
            let channel = if !r.is_bond {
                None
            } else if locus == EdgeLocus::Endo {
                Some(BungeChannel::Internuncial)
            } else {
                match (is_comp(r.a), is_comp(r.b)) {
                    (false, true) => Some(BungeChannel::Input),
                    (true, false) => Some(BungeChannel::Output),
                    _ => None, // env–env: outside 𝒮 (M has no 0,0 cell)
                }
            };
            let self_loop = r.a == r.b;
            EdgeFact {
                id: r.id,
                a: r.a,
                b: r.b,
                bond: r.is_bond,
                kind: r.kind,
                locus,
                channel,
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
            substance_word(r.kind).to_string()
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
        orphan_env_thing_ids,
        authored_interface_thing_ids,
        boundary_props,
        aggregate,
        edges,
        ports,
    }
}

// ---- The residue register: what this lens is NOT showing --------------------
//
// The render guarantee's third clause (#100): totality and fidelity hold by
// construction; residue makes the read-side loss loud. `bert-core`'s
// `transition.rs` `LossWitness` is the write-side analog (what a mode descent
// shears off); this is the read-side enumeration (what a lens view leaves
// undrawn). Two flavors, rendered distinctly and never mixed:
//
// - **hidden** — the model has it, this lens cannot see it: *this lens does
//   not ask that question* (substances under Klir).
// - **unspecified** — the lens could show it, the model has not answered:
//   *this lens asks a question the model has not answered* (unspecified
//   substances under Mobus).
//
// Residue is PER-LENS, not nested — the mode poset is a tree (spec finding,
// #17): Bunge sees mere relations Mobus never projects, while Mobus sees
// primitives Bunge has no ontology for. A "levels above you" framing would be
// wrong, so no entry ever references another lens's position. Judgment lives
// here in the kernel; the face only typesets counts.

/// One residue line: a count plus its number-agreed noun phrase, so the face
/// renders `{count} {label}` verbatim and never re-pluralizes. `count == 0` is
/// the uncountable line — a single unanswered question that is not a tally of
/// anything (Bunge's ⊘M); the face renders the label alone.
#[derive(Serialize, Clone, Debug)]
pub struct ResidueEntry {
    pub count: usize,
    pub label: String,
}

/// What the active lens is not showing, per flavor. Empty vectors mean no
/// residue of that flavor — the face stays silent, not zero-filled.
#[derive(Serialize, Clone, Debug)]
pub struct LensResidue {
    pub hidden: Vec<ResidueEntry>,
    pub unspecified: Vec<ResidueEntry>,
}

/// An uncountable residue line — the question is asked once and unanswered, so
/// no tally precedes it. `None` when the lens has no reason to raise it.
fn residue_flag(raise: bool, label: &str) -> Option<ResidueEntry> {
    raise.then(|| ResidueEntry {
        count: 0,
        label: label.to_string(),
    })
}

/// A residue line, number-agreed; `None` when there is nothing to report.
fn residue_entry(count: usize, singular: &str, plural: &str) -> Option<ResidueEntry> {
    (count > 0).then(|| ResidueEntry {
        count,
        label: if count == 1 { singular } else { plural }.to_string(),
    })
}

/// Enumerate the residue for one lens over already-computed facts. Counts are
/// read off the same model + facts the canvas renders — never re-derived in JS.
fn lens_residue(model: &CanvasModel, lens: Lens, facts: &LensFacts) -> LensResidue {
    let mere = model.relations.iter().filter(|r| !r.is_bond).count();
    let typed = model
        .relations
        .iter()
        .filter(|r| r.kind != Kind::Unspecified)
        .count();
    let untyped = model.relations.len() - typed;
    let primitives = model.things.iter().filter(|t| t.primitive.is_some()).count();
    let components = model
        .things
        .iter()
        .filter(|t| t.role == Role::Component)
        .count();
    let bare_components = model
        .things
        .iter()
        .filter(|t| t.role == Role::Component && t.primitive.is_none())
        .count();
    let directed = model.relations.iter().filter(|r| r.klir_directed).count();
    // Effective I = flow-crossing ∪ authored — the same union b_interfaces reports.
    let interfaces = facts
        .boundary_thing_ids
        .iter()
        .chain(&facts.authored_interface_thing_ids)
        .collect::<HashSet<_>>()
        .len();
    let membrane_props = [
        facts.boundary_props.porosity,
        facts.boundary_props.perceptive_fuzziness,
    ]
    .iter()
    .filter(|v| **v != 0.0)
    .count();

    let (hidden, unspecified) = match lens {
        // Klir renders the flat (T, R): roles, the bond partition (the drawn
        // line stays; its mere-marking does not), kinds, primitives,
        // interfaces, and membrane properties are all thinghood he
        // deliberately excludes. Nothing is unspecified — neutral IS a Klir
        // answer, and (T, R) is always fully answered.
        Lens::Klir => (
            vec![
                residue_entry(
                    facts.environment_thing_ids.len(),
                    "environment role",
                    "environment roles",
                ),
                residue_entry(mere, "mere-relation marking", "mere-relation markings"),
                residue_entry(typed, "connection kind", "connection kinds"),
                residue_entry(primitives, "process primitive", "process primitives"),
                residue_entry(interfaces, "interface", "interfaces"),
                residue_entry(membrane_props, "membrane property", "membrane properties"),
            ],
            vec![],
        ),
        // Bunge has no process taxonomy (row 10), no reified membrane or
        // authored I (rows 8–9 are Mobus's B = ⟨P, I⟩), and no observer
        // direction toggle (row 7 is Klir's). He DOES ask each connection's
        // kind (row 6), so an unspecified kind is his unanswered question —
        // and he asks every system's mechanism (CESM's M), which this surface
        // can never answer (the slot arrives from compose's declared dynamics,
        // #97), so a nonempty composition always carries the ⊘M line: the
        // consequence made loud (F2-modified), a status and never a gate.
        Lens::Bunge => (
            vec![
                residue_entry(primitives, "process primitive", "process primitives"),
                residue_entry(
                    facts.authored_interface_thing_ids.len(),
                    "interface designation",
                    "interface designations",
                ),
                residue_entry(membrane_props, "membrane property", "membrane properties"),
                residue_entry(directed, "directed annotation", "directed annotations"),
            ],
            vec![
                residue_entry(untyped, "connection kind", "connection kinds"),
                // Uncountable by nature: a model has ONE mechanism question,
                // and it is unanswered here — so the line reads as the note
                // does ("no mechanism stated"), never as a tally ("1
                // mechanism", which read as though one were present).
                residue_flag(components > 0, "no mechanism stated (⊘M — reads as a black box)"),
            ],
        ),
        // Mobus never projects mere relations (B̄ is Bunge's alone, row 5) and
        // carries no observer toggle. He asks every flow's substance (row 6)
        // and every component's work process (row 10), so those unanswered
        // slots are his unspecified residue.
        Lens::Mobus => (
            vec![
                residue_entry(mere, "mere relation", "mere relations"),
                residue_entry(directed, "directed annotation", "directed annotations"),
            ],
            vec![
                residue_entry(untyped, "substance", "substances"),
                residue_entry(bare_components, "process primitive", "process primitives"),
            ],
        ),
    };
    LensResidue {
        hidden: hidden.into_iter().flatten().collect(),
        unspecified: unspecified.into_iter().flatten().collect(),
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
// NOT a Lean-projected coordinate — unbridged prose note only.
//
// The second sentence is the ⊘M consequence (#100 phase 2, F2-modified): with
// no mechanism stated the model reads as a black box at this lens — a status
// per Bunge's Mechanism Postulate (every system has one; naming it is what a
// mechanismic account adds), never an error and never a gate. The mechanism
// slot itself arrives from compose's declared dynamics (#97) — not built here.
pub const MECHANISM_NOTE: &str = "M (mechanism — Bunge 2004, CESM) is documented but formally \
UNbridged: the Lean Mobus→Bunge projection is CES, not CESM (Bridge.lean discards T). \
⊘M: with no mechanism stated, this model reads as a black box at this lens — every system \
has a mechanism (Mechanism Postulate); stating it is what remains. A status, not an error.";

/// Each tradition is an answer to a different guiding question (#100 D batch);
/// the switch moment is where the tool orients the user toward what the active
/// lens is looking for. Copy lives here, kernel-side, like every other lens
/// string `describe` typesets.
pub fn guiding_question(lens: Lens) -> &'static str {
    match lens {
        Lens::Klir => {
            "what does the data commit me to? — the behavior function answers, \
             and deliberately refuses to say what is behind it"
        }
        Lens::Bunge => {
            "what is the thing, and by what mechanism does it change? — a \
             behavior function without its M is not yet knowledge"
        }
        Lens::Mobus => "how is the mechanism built, and what happens when it runs?",
    }
}

// ---- Klir's epistemological ladder (#100, the Klir register) ----------------
//
// GSPS's deepest structure: a model is a CLAIM about data commitment, located
// on the E→D→G hierarchy under the S/M operators (Fig. 4.13 semilattice) and
// named by a letter-string (`SE`, `SD`, `S²D`, …). The canvas derives the
// model's HONEST position from what it actually contains — a diagnostic, never
// a decoration:
//
// - `∅`   — nothing distinguished: there is no system yet (the investigator's
//           distinction comes first).
// - `E`   — a source system: things distinguished as variables of interest, no
//           systemhood asserted. State sets and support are not yet nameable on
//           this surface, so E is the frame's claim, thin and said so.
// - `SE`  — a structure claim over source systems: couplings named among the
//           distinguished things, each r ⊆ T×T.
// - `S²E` — structure applied twice: a coupled element is itself a structured
//           system (a decomposition reference).
//
// D and G stay unreachable from this surface BY DESIGN: a data system needs
// observed states over a named support, a generative system a behavior function
// over that data — both arrive with the compose seam (Concept E), and the
// ladder says so instead of pretending. Judgment lives here in the kernel; the
// face only typesets the position.

/// The model's position on Klir's epistemological ladder, with the claim that
/// position makes and what would earn the next rung.
#[derive(Serialize, Clone, Debug)]
pub struct KlirLadder {
    /// The Klir letter-string: `∅` | `E` | `SE` | `S²E`.
    pub position: String,
    /// What standing here asserts, in Klir's terms.
    pub claim: String,
    /// What would earn the next rung — honest about what this surface cannot
    /// author (D/G need data; the compose seam).
    pub to_climb: String,
    /// Evidence for the S² step: elements that are themselves structured
    /// systems (carry a decomposition reference), by name.
    pub decomposed: Vec<String>,
}

/// Locate the model on the ladder. Read off the editing model directly (thing
/// and relation existence, decomposition references) — the same inputs
/// `lens_facts` reads, none re-derived in JS.
pub fn klir_ladder(model: &CanvasModel) -> KlirLadder {
    let decomposed: Vec<String> = model
        .things
        .iter()
        .filter(|t| t.child_model.is_some())
        .map(|t| t.name.clone())
        .collect();
    let (position, claim, to_climb) = if model.things.is_empty() {
        (
            "∅",
            "no distinction drawn — nothing is yet distinguished as a system; \
             the investigator's act comes first",
            "distinguish things: placing members of T is the first \
             epistemological commitment",
        )
    } else if model.relations.is_empty() {
        (
            "E",
            "a source system — things distinguished as variables of interest, \
             no systemhood asserted; state sets and support are not yet \
             nameable on this surface, so the frame is all E claims",
            "assert a coupling: a relation r ⊆ T×T between two things makes \
             the first structure claim (SE)",
        )
    } else if decomposed.is_empty() {
        (
            "SE",
            "a structure system over source systems — couplings named among \
             the distinguished things, each r ⊆ T×T",
            "sideways: decompose an element into its own (T, R) for S²E · \
             upward: D needs observed states over a named support — not \
             authorable here; arrives with the compose seam",
        )
    } else {
        (
            "S²E",
            "structure applied twice — coupled elements that are themselves \
             structured systems",
            "upward: D needs observed states over a named support, G a \
             behavior function over them — neither is authorable here; both \
             arrive with the compose seam",
        )
    };
    KlirLadder {
        position: position.to_string(),
        claim: claim.to_string(),
        to_climb: to_climb.to_string(),
        decomposed,
    }
}

/// One model, typeset in the active lens's own formal notation. Every variant
/// leads with `question` — the tradition's guiding question, the orientation
/// line the face shows at lens switch.
#[derive(Serialize, Clone, Debug)]
#[serde(tag = "lens")]
pub enum LensDescription {
    /// Klir `S = (T, R)` — thinghood + systemhood; observer-constituted. The
    /// `ladder` (#100 harvest): where this model stands on the epistemological
    /// hierarchy — a diagnostic the counts must earn, surfaced by the register
    /// as an opt-in complement (introduced first, never the anchor).
    Klir {
        question: String,
        things: usize,
        relations: usize,
        directed: usize,
        neutral: usize,
        note: String,
        ladder: KlirLadder,
    },
    /// Bunge `σ = ⟨C, E, S⟩` delivered (the Lean-bridged CES); M carried only as
    /// the untyped `mechanism_note` prose — see `MECHANISM_NOTE` and the
    /// concordance §14. Systemhood is earned (Def 1.1).
    Bunge {
        question: String,
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
        question: String,
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
    describe_from_facts(model, lens, &lens_facts(model))
}

/// The atomic canvas verdict: the lens gate, the lens facts, and the formal
/// object, computed from ONE projection. Everything the author view reads in a
/// single call — `validate_mode` at the lens's rung, `lens_facts`, and
/// `describe` — so the face makes one round trip, not a three-call waterfall
/// that re-projects the same model each time.
#[derive(Serialize, Clone, Debug)]
pub struct CanvasAnalysis {
    /// The lens gate at the active lens's mode (Klir→Core, Bunge→Structural,
    /// Mobus→Operational) — the same verdict `validate_mode` returns.
    pub validation: ValidationResult,
    /// Canvas targets for `validation.issues`, index-parallel: issue `i` is
    /// about `issue_targets[i]` (both fields None when the issue has no canvas
    /// subject — e.g. the mode-level aggregate verdict). Resolved here from the
    /// kernel's in-process `subject` via the projection's id maps, so the audit
    /// panel navigates on a kernel fact, never a parsed location string.
    pub issue_targets: Vec<IssueTarget>,
    pub facts: LensFacts,
    pub description: LensDescription,
    /// The residue register (#100): what this lens is NOT showing, per flavor.
    pub residue: LensResidue,
}

/// The canvas element a validation issue points at, if any.
#[derive(Serialize, Clone, Copy, Debug, Default)]
pub struct IssueTarget {
    pub thing: Option<u64>,
    pub relation: Option<u64>,
}

/// Compute the lens gate, facts, and formal object together. The facts are
/// computed once and shared between the aggregate verdict and the description,
/// so `analyze` never projects the model more than the individual calls would.
pub fn analyze(model: &CanvasModel, lens: Lens) -> CanvasAnalysis {
    let facts = lens_facts(model);
    let p = project_with_map(model);
    let mut validation = validate_mode(&p.world, lens.mode());

    // The Mobus lens carries the open-system commitment the neutral kernel does
    // not; assert it here, over the port directions only this face computes.
    if lens == Lens::Mobus {
        check_mobus_openness(&facts, &mut validation.issues);
    }

    // Kernel subject → canvas element, via the projection's id maps reversed.
    let thing_of: HashMap<&Id, u64> = p.thing_ids.iter().map(|(k, v)| (v, *k)).collect();
    let relation_of: HashMap<&Id, u64> = p.interaction_of.iter().map(|(k, v)| (v, *k)).collect();
    let issue_targets: Vec<IssueTarget> = validation
        .issues
        .iter()
        .map(|issue| match &issue.subject {
            Some(id) => IssueTarget {
                thing: thing_of.get(id).copied(),
                relation: relation_of.get(id).copied(),
            },
            None => IssueTarget::default(),
        })
        .collect();

    let description = describe_from_facts(model, lens, &facts);
    let residue = lens_residue(model, lens, &facts);
    CanvasAnalysis {
        validation,
        issue_targets,
        facts,
        description,
        residue,
    }
}

/// The decomposition seam verdict, canvas-keyed (bert-lenses#89 step 5b): the
/// same issues [`bert_core::decomposition::check_decompositions`] produces,
/// paired with canvas navigation targets resolved from the projection's id maps
/// — exactly the [`CanvasAnalysis`] pattern, so the audit panel can navigate a
/// seam violation to its decomposed component like any other issue.
#[derive(Serialize, Clone, Debug)]
pub struct DecompositionReport {
    pub issues: Vec<ValidationIssue>,
    /// Index-parallel with `issues`; both fields None when an issue carries no
    /// canvas subject.
    pub issue_targets: Vec<IssueTarget>,
}

/// Judge every decomposition seam in the canvas model against its store-resolved
/// referents (canonical base58 id → child model JSON), and resolve each issue's
/// kernel subject back to its canvas thing. Projection and judgment both happen
/// here in Rust; the store layer only resolved ids to text.
pub fn check_decompositions_canvas(
    model: &CanvasModel,
    resolved: &HashMap<String, String>,
) -> DecompositionReport {
    let p = project_with_map(model);
    let issues = bert_core::decomposition::check_decompositions(&p.world, resolved);
    let thing_of: HashMap<&Id, u64> = p.thing_ids.iter().map(|(k, v)| (v, *k)).collect();
    let issue_targets = issues
        .iter()
        .map(|issue| match &issue.subject {
            Some(id) => IssueTarget {
                thing: thing_of.get(id).copied(),
                relation: None,
            },
            None => IssueTarget::default(),
        })
        .collect();
    DecompositionReport {
        issues,
        issue_targets,
    }
}

/// Mobus openness: a system exchanges with its environment, and the boundary
/// gates that exchange in both directions (Fig. 4.9). A model whose boundary
/// gates only outward — every port `Exports`, none `Receives` or `Hybrid` —
/// emits without intake, which the open-system commitment flags. Warning, not
/// error: a closed boundary is a legitimate authoring intermediate (the boundary
/// accretes), and Klir/Bunge stay silent — openness is Mobus's commitment alone.
///
/// A boundary with no ports at all is silent: nothing is being emitted, so there
/// is no one-way exchange to flag — that is an earlier stage, before any crossing
/// is drawn. The warning fires only once the boundary emits.
fn check_mobus_openness(facts: &LensFacts, issues: &mut Vec<ValidationIssue>) {
    if facts.ports.is_empty() {
        return;
    }
    let gates_inward = facts
        .ports
        .iter()
        .any(|p| matches!(p.direction, PortDirection::Receives | PortDirection::Hybrid));
    if !gates_inward {
        issues.push(ValidationIssue {
            severity: Severity::Warning,
            location: "mode/Operational".to_string(),
            message: "Mobus: a system is open — it receives from its environment; this \
                      model's boundary gates only outward (exports-only), so it emits \
                      without intake"
                .to_string(),
            suggestion: Some(
                "Add a receiving interface (an inward-gating flow from an environment \
                 object), or keep this as a closed authoring intermediate"
                    .to_string(),
            ),
            doc: Some(bert_core::validate::doc::OPENNESS.to_string()),
            subject: None,
        });
    }
}

/// Typeset the model given already-computed lens facts — the shared body behind
/// [`describe`] and [`analyze`], so the facts are read once, never twice.
fn describe_from_facts(model: &CanvasModel, lens: Lens, facts: &LensFacts) -> LensDescription {
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
                question: guiding_question(lens).to_string(),
                things: model.things.len(),
                relations: model.relations.len(),
                directed,
                neutral: model.relations.len() - directed,
                note: "a system is what is distinguished as a system by the investigator; \
                       the distinction frame is the observer's act, not a boundary"
                    .to_string(),
                ladder: klir_ladder(model),
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
                question: guiding_question(lens).to_string(),
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
            question: guiding_question(lens).to_string(),
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
            // Effective I = flow-crossing ports ∪ authored designations
            // (authored-flowless members get "(flowless)" — a real state, not
            // an omission: no coverage constraint, Tuple.lean).
            b_interfaces: {
                let mut names: Vec<String> =
                    facts.ports.iter().map(|p| name_of(p.component)).collect();
                for id in &facts.authored_interface_thing_ids {
                    if !facts.ports.iter().any(|p| p.component == *id) {
                        names.push(format!("{} (flowless)", name_of(*id)));
                    }
                }
                names
            },
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
            interface: false,
            child_model: None,
            stock_unit: String::new(),
            scale: None,
            states: None,
        variable_kind: None,
            env_kind: Default::default(),
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
            weight: None,
            amount: None,
            unit: String::new(),
            substance: String::new(),
        }
    }
    fn model(things: Vec<Thing>, relations: Vec<Relation>) -> CanvasModel {
        CanvasModel {
            lens: Lens::Mobus,
            model_id: None,
            things,
            relations,
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
        }
    }

    /// Law: the boundary identity holds — a component is in boundary_thing_ids
    /// iff it is coupled to the environment; an uncoupled component is not.
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

    /// Law: the edge ladder reports every canvas relation — bonds AND mere
    /// relations alike — each classified endo/exo by the same C/E role split.
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

    /// Law: a Bunge diagonal bond (self-loop) has no Mobus preimage, so it is
    /// flagged not-Mobus and raises no port; it also touches no environment,
    /// so the boundary set is unchanged.
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

    /// Law: ports are bipartite (component ↔ environment, never comp-comp or
    /// env-env) and directional (Receives / Exports / Hybrid); the ported node
    /// IS a marked boundary node, and coupled pairs merge into one port.
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

    /// Law: K≅2 — the same model's thing/relation counts agree across the
    /// Klir, Bunge, and Mobus lenses (composition+environment=things,
    /// bondage+mere=relations, endo/exo=N/G); only the vocabulary changes.
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

    /// Law: describe's Bunge verdict and boundary_components are read off the
    /// same kernel facts as `analyze` — a bond between distinct components
    /// makes a system (Def 1.1); stripping all bonds makes an aggregate.
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

    /// Law: Mobus's b_interfaces are the boundary components reified as ports,
    /// and self_loop_conflicts lists exactly the bonds with no Mobus preimage.
    #[test]
    fn describe_mobus_lists_self_loop_conflicts() {
        let m = rich_model();
        let LensDescription::Mobus { self_loop_conflicts, b_interfaces, .. } = describe(&m, Lens::Mobus) else {
            panic!("expected Mobus");
        };
        assert_eq!(self_loop_conflicts, vec!["A → A"]);
        assert_eq!(b_interfaces, vec!["A"], "B's interfaces are the boundary components, reified");
    }

    /// Law: the mechanism note must always state M/T as formally UNbridged
    /// (Bridge.lean delivers CES, not CESM) — both the pinned constant and the
    /// source's own doc comments must tell this same story, never a delivered CESM.
    #[test]
    fn mechanism_note_never_claims_bridge() {
        // Pin the wording: M↔T is conceptually parallel but formally UNbridged
        // (Bridge.lean is CES, not CESM). The panel must never drift.
        let LensDescription::Bunge { mechanism_note, .. } = describe(&rich_model(), Lens::Bunge) else {
            panic!("expected Bunge");
        };
        assert!(mechanism_note.contains("formally UNbridged"));
        assert!(mechanism_note.contains("CES, not CESM"));
        // The ⊘M consequence (F2-modified) is a status, never an error/gate —
        // the copy must say what mechanism-absence MEANS, in Bunge's terms.
        assert!(mechanism_note.contains("reads as a black box"));
        assert!(mechanism_note.contains("A status, not an error"));
        // Doc/code contract (council outside-pass F2): the source's own doc
        // strings must tell the same story as the pinned note — CES delivered,
        // M as prose only. Guards the doc comments against re-inflating to a
        // delivered CESM while the Lean bridge stays CES.
        // Needles assembled at runtime so include_str! can't match this test's
        // own literals — only the actual doc comments satisfy them.
        let src = include_str!("lenses.rs");
        let bunge_doc = format!("`σ = ⟨C, E, S⟩` {}", "delivered (the Lean-bridged CES)");
        let m_doc = format!("{} — unbridged prose note only.", "NOT a Lean-projected coordinate");
        assert!(src.contains(&bunge_doc), "Bunge variant doc must present CES as delivered");
        assert!(src.contains(&m_doc), "MECHANISM_NOTE separator comment must stay");
    }

    /// Law: an unnamed flow's port protocol speaks Mobus's substance register
    /// (concordance row 6: material · energy · message), never Bunge's kind
    /// enum — and an unspecified kind stays "unspecified", never silently
    /// folded into energy.
    #[test]
    fn port_protocol_speaks_substance_not_kind() {
        let mut m = model(
            vec![thing(1, "A", Role::Component), thing(2, "Src", Role::Environment)],
            vec![relation(10, 2, 1, true)],
        );
        for (kind, word) in [
            (Kind::Informational, "message"),
            (Kind::Matter, "material"),
            (Kind::Field, "energy"),
            (Kind::Unspecified, "unspecified"),
        ] {
            m.relations[0].kind = kind;
            let f = lens_facts(&m);
            assert_eq!(f.ports[0].protocol, word, "φ fallback for {kind:?}");
        }
    }

    /// Law: the residue register is per-lens, not nested — Mobus hides the
    /// mere relation Bunge renders, Bunge holds unanswered the kind question
    /// Klir never asks, and Klir hides the roles both others show. Counted
    /// entries never appear at zero, and their labels arrive number-agreed;
    /// the one uncountable line (⊘M) carries count 0 by design.
    #[test]
    fn residue_is_per_lens_not_nested() {
        // rich_model: 2 components (no primitives), 1 env thing, endo + exo
        // bonds, 1 mere relation, 1 self-loop — every relation Unspecified.
        let m = rich_model();
        let count = |list: &[ResidueEntry], label: &str| {
            list.iter().find(|e| e.label == label).map(|e| e.count)
        };

        let klir = analyze(&m, Lens::Klir).residue;
        assert_eq!(count(&klir.hidden, "environment role"), Some(1));
        assert_eq!(count(&klir.hidden, "mere-relation marking"), Some(1));
        assert_eq!(count(&klir.hidden, "interface"), Some(1));
        assert!(
            klir.unspecified.is_empty(),
            "Klir asks nothing the model can leave unanswered — (T, R) is always full"
        );

        let bunge = analyze(&m, Lens::Bunge).residue;
        assert!(
            bunge.hidden.is_empty(),
            "no primitives, designations, membrane properties, or toggles authored"
        );
        assert_eq!(count(&bunge.unspecified, "connection kinds"), Some(4));
        // The ⊘M line is the uncountable one (count 0): the face renders it as
        // prose, so it can never read as "1 mechanism" — present — against the
        // note's "no mechanism stated".
        assert_eq!(
            count(&bunge.unspecified, "no mechanism stated (⊘M — reads as a black box)"),
            Some(0),
            "a nonempty composition always carries the ⊘M consequence (F2)"
        );

        let mobus = analyze(&m, Lens::Mobus).residue;
        assert_eq!(count(&mobus.hidden, "mere relation"), Some(1), "B̄ never projects");
        assert_eq!(count(&mobus.unspecified, "substances"), Some(4));
        assert_eq!(count(&mobus.unspecified, "process primitives"), Some(2));
    }

    /// Law: answering a lens's question empties its unspecified residue — and
    /// the SAME answers surface as another lens's hidden residue (primitives:
    /// unspecified under Mobus until authored, hidden under Bunge after).
    #[test]
    fn residue_moves_as_the_model_answers() {
        let mut m = rich_model();
        for r in &mut m.relations {
            r.kind = Kind::Energy;
        }
        for t in &mut m.things {
            if t.role == Role::Component {
                t.primitive = Some(bert_core::ProcessPrimitive::Buffering);
            }
        }
        let mobus = analyze(&m, Lens::Mobus).residue;
        assert!(mobus.unspecified.is_empty(), "every substance and primitive is answered");
        let bunge = analyze(&m, Lens::Bunge).residue;
        // Every connection kind is answered; only M remains — the one question
        // this surface can never answer (the mechanism slot is #97's, at the
        // compose seam), so the ⊘M line is the entire unspecified residue.
        assert_eq!(
            bunge.unspecified.iter().map(|e| e.label.as_str()).collect::<Vec<_>>(),
            vec!["no mechanism stated (⊘M — reads as a black box)"],
        );
        assert_eq!(
            bunge.hidden.iter().find(|e| e.label == "process primitives").map(|e| e.count),
            Some(2),
            "the answers Mobus renders are exactly what Bunge cannot see"
        );
    }

    /// Law: the ladder position is EARNED, rung by rung — nothing distinguished
    /// is ∅, things without couplings are E (a source frame), a coupling makes
    /// the structure claim SE, and a decomposed coupled element makes S²E.
    #[test]
    fn klir_ladder_climbs_with_the_model() {
        let mut m = model(vec![], vec![]);
        assert_eq!(klir_ladder(&m).position, "∅");

        m.things.push(thing(1, "A", Role::Component));
        m.things.push(thing(2, "B", Role::Component));
        assert_eq!(klir_ladder(&m).position, "E", "things alone are a source frame");

        m.relations.push(relation(10, 1, 2, true));
        assert_eq!(klir_ladder(&m).position, "SE", "a coupling is the structure claim");

        m.things[0].child_model = Some(crate::canvas::ChildRef {
            name: "A-inner".to_string(),
            id: bert_core::ModelRef::to(
                "Hrs6K91KnZZsiPcWzftv8U".parse::<bert_core::ModelId>().unwrap(),
            ),
        });
        let l = klir_ladder(&m);
        assert_eq!(l.position, "S²E", "a structured element applies S twice");
        assert_eq!(l.decomposed, vec!["A"], "the decomposed element is the evidence");
    }

    /// Law: the ladder is a diagnostic, not a decoration — removing what earned
    /// a rung drops the position back down, and D/G are never claimed from this
    /// surface (no observed data exists here; the to_climb copy says so).
    #[test]
    fn klir_ladder_is_diagnostic_not_decoration() {
        let m = rich_model();
        let l = klir_ladder(&m);
        assert_eq!(l.position, "SE");
        assert!(l.to_climb.contains("compose seam"), "the data axis is honestly gated");

        let mut stripped = m.clone();
        stripped.relations.clear();
        assert_eq!(klir_ladder(&stripped).position, "E", "no couplings, no structure claim");
        // No path on this surface ever claims a data or generative rung.
        for probe in [&m, &stripped] {
            let p = klir_ladder(probe).position;
            assert!(!p.contains('D') && !p.contains('G'), "D/G need observed data");
        }
    }

    /// Law: describe's Klir face carries the same ladder `klir_ladder` derives —
    /// one judgment, typeset once.
    #[test]
    fn describe_klir_carries_the_ladder() {
        let m = rich_model();
        let LensDescription::Klir { ladder, .. } = describe(&m, Lens::Klir) else {
            panic!("expected Klir");
        };
        assert_eq!(ladder.position, klir_ladder(&m).position);
        assert_eq!(ladder.claim, klir_ladder(&m).claim);
    }

    /// Law: every `describe` carries its lens's guiding question — three
    /// distinct questions, one per tradition (#100: lens switching is question
    /// switching, so the orientation copy is a kernel string, never assembled
    /// in JS).
    #[test]
    fn describe_carries_the_guiding_question() {
        let m = rich_model();
        let questions: Vec<String> = [Lens::Klir, Lens::Bunge, Lens::Mobus]
            .into_iter()
            .map(|lens| {
                let q = guiding_question(lens).to_string();
                match describe(&m, lens) {
                    LensDescription::Klir { question, .. }
                    | LensDescription::Bunge { question, .. }
                    | LensDescription::Mobus { question, .. } => assert_eq!(question, q),
                }
                q
            })
            .collect();
        assert!(questions[0].starts_with("what does the data commit me to?"));
        assert!(questions[1].starts_with("what is the thing, and by what mechanism"));
        assert!(questions[2].starts_with("how is the mechanism built"));
    }

    /// Law: the coupling channel is Bunge's matrix grammar — env→comp is an
    /// input (M₀ᵣ), comp→env an output (Mₛ₀), comp→comp internuncial (Mᵣₛ);
    /// mere relations do not act, so they sit in no channel.
    #[test]
    fn channel_refines_locus_with_direction() {
        let m = model(
            vec![
                thing(1, "A", Role::Component),
                thing(2, "B", Role::Component),
                thing(3, "Src", Role::Environment),
            ],
            vec![
                relation(10, 1, 2, true),  // comp → comp: internuncial
                relation(11, 3, 1, true),  // env → comp: input
                relation(12, 1, 3, true),  // comp → env: output
                relation(13, 1, 2, false), // mere: no channel — it does not act
                relation(14, 1, 1, true),  // self-loop: internuncial (endo)
            ],
        );
        let f = lens_facts(&m);
        let ch = |id: u64| f.edges.iter().find(|e| e.id == id).unwrap().channel;
        assert_eq!(ch(10), Some(BungeChannel::Internuncial));
        assert_eq!(ch(11), Some(BungeChannel::Input));
        assert_eq!(ch(12), Some(BungeChannel::Output));
        assert_eq!(ch(13), None, "a mere relation acts on nothing");
        assert_eq!(ch(14), Some(BungeChannel::Internuncial));
    }

    /// Law: the ⊘M residue line is gated on a nonempty composition — no
    /// component, no system, no mechanism to ask for.
    #[test]
    fn mechanism_residue_needs_a_composition() {
        let empty = model(vec![thing(3, "Src", Role::Environment)], vec![]);
        let r = analyze(&empty, Lens::Bunge).residue;
        assert!(
            !r.unspecified.iter().any(|e| e.label.contains("mechanism")),
            "no composition, no M question yet"
        );
    }

    /// Law: one bond flips the aggregate verdict — two components joined only
    /// by a mere relation are an aggregate (Def 1.1); adding a bond makes them
    /// a system.
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

    /// Detect the Mobus openness warning by its stable phrasing.
    fn has_openness_warning(a: &CanvasAnalysis) -> bool {
        a.validation
            .issues
            .iter()
            .any(|i| i.message.contains("exports-only"))
    }

    /// Law: Mobus alone carries the open-system commitment — a boundary that
    /// gates only outward (exports-only, no receiving port) draws a warning
    /// under Mobus but stays silent under Klir and Bunge.
    #[test]
    fn mobus_warns_on_exports_only_boundary() {
        // A→B (an endo bond, so Bunge already reads a system) plus A→Env (an
        // outward port with no inward twin): a boundary that emits without intake.
        let m = model(
            vec![
                thing(1, "A", Role::Component),
                thing(2, "B", Role::Component),
                thing(3, "Env", Role::Environment),
            ],
            vec![relation(10, 1, 2, true), relation(11, 1, 3, true)],
        );
        // The one port gates purely outward.
        let f = lens_facts(&m);
        assert_eq!(f.ports.len(), 1);
        assert_eq!(f.ports[0].direction, PortDirection::Exports);

        // Mobus carries the open-system commitment, so it flags the closed boundary.
        let mobus = analyze(&m, Lens::Mobus);
        assert!(has_openness_warning(&mobus), "Mobus flags the exports-only boundary");
        // Warning, never error: a closed boundary is a legitimate intermediate.
        assert!(!mobus.validation.has_errors());

        // Klir and Bunge do not commit to openness — they stay silent on it.
        assert!(!has_openness_warning(&analyze(&m, Lens::Klir)), "Klir silent on openness");
        assert!(!has_openness_warning(&analyze(&m, Lens::Bunge)), "Bunge silent on openness");
    }

    /// Law: an inward-gated boundary (any port Receives or Hybrid) never
    /// trips the openness warning, under any lens.
    #[test]
    fn mobus_silent_when_a_port_gates_inward() {
        // Env→A is a receiving port; the A↔B cycle keeps the graph otherwise
        // well-formed. An open boundary trips the warning under no lens.
        let m = model(
            vec![
                thing(1, "A", Role::Component),
                thing(2, "B", Role::Component),
                thing(3, "Env", Role::Environment),
            ],
            vec![
                relation(10, 1, 2, true),
                relation(11, 2, 1, true),
                relation(12, 3, 1, true),
            ],
        );
        let f = lens_facts(&m);
        assert!(
            f.ports
                .iter()
                .any(|p| matches!(p.direction, PortDirection::Receives | PortDirection::Hybrid)),
            "Env→A is an inward-gating port",
        );
        for lens in [Lens::Klir, Lens::Bunge, Lens::Mobus] {
            assert!(
                !has_openness_warning(&analyze(&m, lens)),
                "an inward-gated boundary never trips the openness warning",
            );
        }
    }

    /// Law (#180, tightened by #213): a component designated `interface` with
    /// no port (authored ∖ flow-crossing) is REFUSED under Mobus, navigable to
    /// the designated thing — and silent under Klir/Bunge, whose modes never run
    /// the check. The rating is the kernel's now, from SSF #31's
    /// `interfaces_carry_flow`; the lens no longer carries a parallel warning.
    #[test]
    fn mobus_refuses_a_flowless_interface() {
        let mut a = thing(1, "Thermostat", Role::Component);
        a.interface = true;
        let m = model(
            vec![a, thing(2, "Furnace", Role::Component)],
            vec![relation(10, 1, 2, true)], // an endo bond only; no exo port on 1
        );
        assert_eq!(
            lens_facts(&m).authored_interface_thing_ids,
            vec![1],
            "1 is authored into I"
        );
        assert!(
            lens_facts(&m).ports.iter().all(|p| p.component != 1),
            "1 has no flow-crossing port — it is flowless"
        );

        let mobus = analyze(&m, Lens::Mobus);
        let hit = mobus
            .validation
            .issues
            .iter()
            .position(|i| i.message.contains("Thermostat") && i.message.contains("no boundary-crossing flow"));
        assert!(hit.is_some(), "Mobus flags the flowless interface: {:?}", mobus.validation.issues);
        assert_eq!(
            mobus.validation.issues[hit.unwrap()].severity,
            Severity::Error,
            "a refusal, not an observation"
        );
        assert_eq!(
            mobus
                .validation
                .issues
                .iter()
                .filter(|i| i.message.contains("no boundary-crossing flow"))
                .count(),
            1,
            "one finding, reported once — the lens-level duplicate is gone"
        );
        assert_eq!(
            mobus.issue_targets[hit.unwrap()].thing,
            Some(1),
            "navigable to the designated thing"
        );

        for lens in [Lens::Klir, Lens::Bunge] {
            let a = analyze(&m, lens);
            assert!(
                !a.validation.issues.iter().any(|i| i.message.contains("no boundary-crossing flow")),
                "{lens:?} has no interface concept — stays silent"
            );
        }
    }
}
