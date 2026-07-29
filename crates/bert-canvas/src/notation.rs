//! The register matrices' cell semantics — Klir's incidence matrix and Bunge's
//! coupling matrix M — decided HERE, in the kernel.
//!
//! Both registers are write surfaces: their empty cells author new relations
//! (`KlirRegister.tsx`, `BungeRegister.tsx`). So the rule that says which cell a
//! relation occupies, and which cell may be authored into at all, is a reading
//! of the tradition, not typesetting — and a cell that silently cannot be
//! authored is a refusal. A refusal owes a reason in the kernel's own voice,
//! which is what [`CellStatus::Forbidden`] carries.
//!
//! The tradition rules that live here and nowhere else:
//!
//! - **Klir, symmetric closure.** A relation the observer has *not* oriented is
//!   an unordered pair, so it marks both orders of the matrix (`R ⊆ T×T` read
//!   as its symmetric closure); an oriented one marks its own order only
//!   (Facets Ch. 4 — direction is an observer commitment).
//! - **Bunge, bond vs mere.** A bond is directed action, so it marks the order
//!   it acts in; a mere relation holds without acting, so it has no channel to
//!   orient it and marks both orders (F7).
//! - **Bunge, the environment en bloc.** For an open system he forms an
//!   (m+1)×(m+1) matrix "letting 0 stand for the environment en bloc" (1979
//!   §2.1, pp. 18–19), so row 0 is the input block M₀ᵣ and column 0 the output
//!   block Mₛ₀. The itemized alternative — one row per named environment thing
//!   — is ours, not his, and is the toggle's other half.
//! - **Bunge, M₀₀ = 0.** The environment's couplings to itself are not in 𝒮
//!   (neither relatum is a component), so index 0 has no self-cell to fill.
//!
//! The face receives a rendered structure and posts back a cell identity; it
//! chooses glyphs and colors, and decides nothing about what a cell means.

use serde::Serialize;

use crate::canvas::{CanvasModel, Kind, Relation, Role};

/// What an author may do with one cell of a register matrix.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum CellStatus {
    /// Relations already stand here — the cell edits, it does not create.
    Occupied,
    /// Empty and open: a new relation may be authored at this address (the
    /// kernel still judges the candidate itself, via `validate_connection`).
    Authorable,
    /// Closed by the tradition's own rule. `reason` names the precondition, so
    /// a dead cell can say why it is dead instead of merely not responding.
    Forbidden { reason: String },
}

/// How an occupied Klir incidence cell reads. The face maps these onto its
/// glyphs (● → ↺); which one a cell earns is this module's call.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(tag = "mark", rename_all = "snake_case")]
pub enum KlirMark {
    Empty,
    /// A neutral occupant — an unordered pair, marking both orders.
    Neutral,
    /// An oriented occupant, read row → col.
    Directed,
    /// The diagonal: a thing related to itself.
    SelfLoop,
}

/// One cell of the |T|×|T| incidence matrix, addressed by thing id.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
pub struct KlirCell {
    pub row: u64,
    pub col: u64,
    /// The relations standing in this cell, in model order.
    pub relations: Vec<u64>,
    pub mark: KlirMark,
    pub status: CellStatus,
}

/// The incidence matrix: the row/column order (model order — Klir has no
/// composition/environment cut) and every cell.
#[derive(Serialize, Clone, Debug)]
pub struct KlirIncidence {
    pub things: Vec<u64>,
    pub cells: Vec<KlirCell>,
}

/// Read the model as Klir's incidence matrix.
pub fn klir_incidence_cells(model: &CanvasModel) -> KlirIncidence {
    let things: Vec<u64> = model.things.iter().map(|t| t.id).collect();
    let mut cells = Vec::with_capacity(things.len() * things.len());
    for &row in &things {
        for &col in &things {
            let rels = klir_cell_relations(model, row, col);
            let mark = if rels.is_empty() {
                KlirMark::Empty
            } else if row == col {
                KlirMark::SelfLoop
            } else if rels.iter().any(|r| r.klir_directed && r.a == row) {
                KlirMark::Directed
            } else {
                KlirMark::Neutral
            };
            let status = if rels.is_empty() {
                CellStatus::Authorable
            } else {
                CellStatus::Occupied
            };
            cells.push(KlirCell {
                row,
                col,
                relations: rels.iter().map(|r| r.id).collect(),
                mark,
                status,
            });
        }
    }
    KlirIncidence { things, cells }
}

/// The relations that put a mark in incidence cell (row, col). A directed
/// relation marks its own order only; a neutral one marks both — the symmetric
/// closure of the undirected reading.
fn klir_cell_relations(model: &CanvasModel, row: u64, col: u64) -> Vec<&Relation> {
    model
        .relations
        .iter()
        .filter(|r| {
            if r.klir_directed {
                r.a == row && r.b == col
            } else {
                (r.a == row && r.b == col) || (r.a == col && r.b == row)
            }
        })
        .collect()
}

/// A row/column of M: one thing, or the environment taken en bloc as index 0.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum CouplingSlot {
    /// Bunge's index 0 — the environment as a single relatum.
    Env,
    /// One named thing. `env` marks the environment side under the itemized
    /// reading, where the cut is an ordering rather than a lumped index.
    Thing { id: u64, env: bool },
}

impl CouplingSlot {
    /// Whether this slot stands on the environment side of the cut.
    pub fn is_env(&self) -> bool {
        match self {
            CouplingSlot::Env => true,
            CouplingSlot::Thing { env, .. } => *env,
        }
    }
}

/// How an occupied coupling cell reads. The kind of action is what makes a bond
/// a bond (F7), so an acting cell carries its kind.
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
#[serde(tag = "mark", rename_all = "snake_case")]
pub enum BungeMark {
    Empty,
    /// The diagonal — one thing acting on itself.
    SelfLoop,
    /// An acting bond; `kind` is the substance of the action.
    Bond { kind: Kind },
    /// A mere relation: it holds, it does not act.
    Mere,
}

/// One cell of M, addressed by slot index (slots carry no id under en bloc).
#[derive(Serialize, Clone, Debug, PartialEq, Eq)]
pub struct BungeCell {
    pub row: usize,
    pub col: usize,
    /// The relations gathered into this cell, first-seen order, deduplicated:
    /// index 0 stands for every environment thing at once, so one relation can
    /// be reachable from two directions and must still be counted once.
    pub relations: Vec<u64>,
    pub mark: BungeMark,
    pub status: CellStatus,
}

/// The coupling matrix: its slot order, where the cut rule falls, and every
/// cell.
#[derive(Serialize, Clone, Debug)]
pub struct BungeCoupling {
    pub slots: Vec<CouplingSlot>,
    /// The slot index the composition/environment rule is drawn before.
    pub cut_at: usize,
    pub cells: Vec<BungeCell>,
}

/// Read the model as Bunge's coupling matrix, under either environment reading.
pub fn bunge_coupling_cells(model: &CanvasModel, en_bloc: bool) -> BungeCoupling {
    let slots = coupling_slots(model, en_bloc);
    let cut_at = if en_bloc {
        if slots.first() == Some(&CouplingSlot::Env) {
            1
        } else {
            slots.len()
        }
    } else {
        slots.iter().filter(|s| !s.is_env()).count()
    };
    let mut cells = Vec::with_capacity(slots.len() * slots.len());
    for (row, a) in slots.iter().enumerate() {
        for (col, b) in slots.iter().enumerate() {
            let rels = slot_cell_relations(model, a, b);
            let self_cell = match (a, b) {
                (CouplingSlot::Thing { id: x, .. }, CouplingSlot::Thing { id: y, .. }) => x == y,
                _ => false,
            };
            let mark = if rels.is_empty() {
                BungeMark::Empty
            } else if self_cell {
                BungeMark::SelfLoop
            } else if let Some(bond) = rels.iter().find(|r| r.is_bond) {
                BungeMark::Bond { kind: bond.kind }
            } else {
                BungeMark::Mere
            };
            let status = if !rels.is_empty() {
                CellStatus::Occupied
            } else if matches!(a, CouplingSlot::Env) && matches!(b, CouplingSlot::Env) {
                CellStatus::Forbidden {
                    reason: M00.to_string(),
                }
            } else if matches!(a, CouplingSlot::Env) || matches!(b, CouplingSlot::Env) {
                CellStatus::Forbidden {
                    reason: EN_BLOC_UNADDRESSABLE.to_string(),
                }
            } else {
                CellStatus::Authorable
            };
            cells.push(BungeCell {
                row,
                col,
                relations: rels.iter().map(|r| r.id).collect(),
                mark,
                status,
            });
        }
    }
    BungeCoupling {
        slots,
        cut_at,
        cells,
    }
}

/// M₀₀ = 0, in Bunge's own printed matrix.
const M00: &str = "M₀₀ = 0 — the environment's couplings to itself are not in 𝒮: \
                   neither relatum is a component, so index 0 has no self-cell to fill \
                   (Bunge 1979 §2.1)";

/// Why index 0 cannot be authored into: it names no thing.
const EN_BLOC_UNADDRESSABLE: &str = "index 0 is the environment en bloc, not a named thing — \
                                     an action needs two relata to be an action; itemize ℰ \
                                     (or draw it on the graph) to author one here";

/// Row/column order for M: composition first, then environment — one flat
/// ontology, with the cut visible as the matrix's own ordering. En bloc puts 0
/// FIRST, as Bunge prints it, and keeps only the components after it; it raises
/// no index 0 when the model has no environment at all.
fn coupling_slots(model: &CanvasModel, en_bloc: bool) -> Vec<CouplingSlot> {
    let side = |role: Role| {
        model
            .things
            .iter()
            .filter(move |t| t.role == role)
            .map(move |t| CouplingSlot::Thing {
                id: t.id,
                env: role == Role::Environment,
            })
    };
    if !en_bloc {
        return side(Role::Component).chain(side(Role::Environment)).collect();
    }
    let components: Vec<CouplingSlot> = side(Role::Component).collect();
    if model.things.iter().any(|t| t.role == Role::Environment) {
        std::iter::once(CouplingSlot::Env).chain(components).collect()
    } else {
        components
    }
}

/// The relations occupying cell (row slot, col slot). An env slot stands for
/// EVERY environment thing at once, so its cells collect what any of them acts
/// on (or is acted on by), gathered under Bunge's index 0 — and M₀₀ stays
/// empty.
fn slot_cell_relations<'a>(
    model: &'a CanvasModel,
    row: &CouplingSlot,
    col: &CouplingSlot,
) -> Vec<&'a Relation> {
    if matches!(row, CouplingSlot::Env) && matches!(col, CouplingSlot::Env) {
        return Vec::new();
    }
    let ids = |slot: &CouplingSlot| -> Vec<u64> {
        match slot {
            CouplingSlot::Thing { id, .. } => vec![*id],
            CouplingSlot::Env => model
                .things
                .iter()
                .filter(|t| t.role == Role::Environment)
                .map(|t| t.id)
                .collect(),
        }
    };
    let mut out: Vec<&Relation> = Vec::new();
    for r in ids(row) {
        for c in ids(col) {
            for rel in bunge_cell_relations(model, r, c) {
                if !out.iter().any(|seen| seen.id == rel.id) {
                    out.push(rel);
                }
            }
        }
    }
    out
}

/// The relations occupying cell (row, col), read as "row acts on col": a bond
/// marks its own order only; a mere relation marks both.
fn bunge_cell_relations(model: &CanvasModel, row: u64, col: u64) -> Vec<&Relation> {
    model
        .relations
        .iter()
        .filter(|r| {
            if r.is_bond {
                r.a == row && r.b == col
            } else {
                (r.a == row && r.b == col) || (r.a == col && r.b == row)
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::canvas::{CanvasModel, Lens, Thing};

    fn thing(id: u64, role: Role) -> Thing {
        Thing {
            id,
            name: format!("T{id}"),
            x: 0.0,
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

    fn rel(id: u64, a: u64, b: u64) -> Relation {
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

    fn model(lens: Lens, things: Vec<Thing>, relations: Vec<Relation>) -> CanvasModel {
        CanvasModel {
            lens,
            model_id: None,
            things,
            relations,
            boundary: Default::default(),
            system_type: Default::default(),
            name: None,
            time_unit: None,
            params: vec![],
        }
    }

    fn klir(m: &CanvasModel, row: u64, col: u64) -> KlirCell {
        klir_incidence_cells(m)
            .cells
            .into_iter()
            .find(|c| c.row == row && c.col == col)
            .expect("cell in range")
    }

    fn bunge(m: &CanvasModel, en_bloc: bool, row: usize, col: usize) -> BungeCell {
        bunge_coupling_cells(m, en_bloc)
            .cells
            .into_iter()
            .find(|c| c.row == row && c.col == col)
            .expect("cell in range")
    }

    // --- Klir: the assertions klirNotation.test.ts held before relocation ----

    #[test]
    fn neutral_relation_marks_both_orders() {
        let mut directed = rel(11, 2, 3);
        directed.klir_directed = true;
        let m = model(
            Lens::Klir,
            vec![
                thing(1, Role::Component),
                thing(2, Role::Component),
                thing(3, Role::Component),
            ],
            vec![rel(10, 1, 2), directed],
        );
        assert_eq!(klir(&m, 1, 2).relations, vec![10]);
        assert_eq!(klir(&m, 2, 1).relations, vec![10]);
    }

    #[test]
    fn directed_relation_marks_its_own_order_only() {
        let mut directed = rel(11, 2, 3);
        directed.klir_directed = true;
        let m = model(
            Lens::Klir,
            vec![
                thing(1, Role::Component),
                thing(2, Role::Component),
                thing(3, Role::Component),
            ],
            vec![rel(10, 1, 2), directed],
        );
        assert_eq!(klir(&m, 2, 3).relations, vec![11]);
        assert!(klir(&m, 3, 2).relations.is_empty());
        assert!(klir(&m, 1, 3).relations.is_empty());
    }

    #[test]
    fn klir_marks_read_neutral_directed_and_the_diagonal() {
        let mut directed = rel(11, 1, 2);
        directed.klir_directed = true;
        let m = model(
            Lens::Klir,
            vec![thing(1, Role::Component), thing(2, Role::Component)],
            vec![rel(10, 1, 2), directed, rel(12, 1, 1)],
        );
        assert_eq!(klir(&m, 1, 2).mark, KlirMark::Directed);
        // The mirrored cell of a directed relation never reads directed — but a
        // neutral companion still marks it.
        assert_eq!(klir(&m, 2, 1).mark, KlirMark::Neutral);
        assert_eq!(klir(&m, 1, 1).mark, KlirMark::SelfLoop);
    }

    #[test]
    fn an_empty_klir_cell_is_authorable_and_unmarked() {
        let m = model(
            Lens::Klir,
            vec![thing(1, Role::Component), thing(2, Role::Component)],
            vec![],
        );
        let cell = klir(&m, 1, 2);
        assert_eq!(cell.mark, KlirMark::Empty);
        assert_eq!(cell.status, CellStatus::Authorable);
        assert_eq!(klir(&m, 1, 1).status, CellStatus::Authorable);
    }

    #[test]
    fn klir_stacks_every_relation_standing_in_a_cell() {
        let m = model(
            Lens::Klir,
            vec![thing(1, Role::Component), thing(2, Role::Component)],
            vec![rel(10, 1, 2), rel(11, 1, 2)],
        );
        assert_eq!(klir(&m, 1, 2).relations, vec![10, 11]);
    }

    // --- Bunge: the assertions bungeNotation.test.ts held before relocation --

    fn four_thing_model() -> CanvasModel {
        model(
            Lens::Bunge,
            vec![
                thing(3, Role::Environment),
                thing(1, Role::Component),
                thing(4, Role::Environment),
                thing(2, Role::Component),
            ],
            vec![],
        )
    }

    #[test]
    fn itemized_orders_composition_then_environment() {
        let slots = bunge_coupling_cells(&four_thing_model(), false).slots;
        let ids: Vec<u64> = slots
            .iter()
            .map(|s| match s {
                CouplingSlot::Thing { id, .. } => *id,
                CouplingSlot::Env => 0,
            })
            .collect();
        assert_eq!(ids, vec![1, 2, 3, 4]);
    }

    #[test]
    fn en_bloc_puts_index_zero_first_and_keeps_only_components() {
        let slots = bunge_coupling_cells(&four_thing_model(), true).slots;
        let ids: Vec<u64> = slots
            .iter()
            .map(|s| match s {
                CouplingSlot::Thing { id, .. } => *id,
                CouplingSlot::Env => 0,
            })
            .collect();
        assert_eq!(ids, vec![0, 1, 2]);
    }

    #[test]
    fn en_bloc_raises_no_index_zero_without_an_environment() {
        let closed = model(
            Lens::Bunge,
            vec![thing(1, Role::Component), thing(2, Role::Component)],
            vec![],
        );
        let m = bunge_coupling_cells(&closed, true);
        assert!(m.slots.iter().all(|s| !matches!(s, CouplingSlot::Env)));
        assert_eq!(m.cut_at, m.slots.len());
    }

    fn gathered_model() -> CanvasModel {
        model(
            Lens::Bunge,
            vec![
                thing(1, Role::Component),
                thing(2, Role::Component),
                thing(3, Role::Environment),
                thing(4, Role::Environment),
            ],
            vec![
                rel(10, 3, 1),
                rel(11, 4, 1),
                rel(12, 2, 3),
                rel(13, 1, 2),
                rel(14, 3, 4),
            ],
        )
    }

    #[test]
    fn index_zero_gathers_every_environment_thing_at_once() {
        let m = gathered_model();
        // slots en bloc: [0, 1, 2]
        assert_eq!(bunge(&m, true, 0, 1).relations, vec![10, 11]);
        assert_eq!(bunge(&m, true, 2, 0).relations, vec![12]);
        assert_eq!(bunge(&m, true, 1, 2).relations, vec![13]);
    }

    #[test]
    fn a_relation_reachable_from_two_directions_is_counted_once() {
        let mut mere = rel(20, 1, 3);
        mere.is_bond = false;
        let m = model(
            Lens::Bunge,
            vec![thing(1, Role::Component), thing(3, Role::Environment)],
            vec![mere],
        );
        assert_eq!(bunge(&m, true, 0, 1).relations, vec![20]);
    }

    #[test]
    fn m00_is_empty_and_names_its_own_rule() {
        let cell = bunge(&gathered_model(), true, 0, 0);
        assert!(cell.relations.is_empty());
        assert_eq!(cell.mark, BungeMark::Empty);
        match cell.status {
            CellStatus::Forbidden { reason } => assert!(reason.contains("M₀₀ = 0")),
            other => panic!("M₀₀ must be forbidden, got {other:?}"),
        }
    }

    #[test]
    fn index_zero_never_reads_as_a_self_cell() {
        let m = gathered_model();
        assert_eq!(bunge(&m, true, 0, 0).mark, BungeMark::Empty);
        let selfy = model(
            Lens::Bunge,
            vec![thing(1, Role::Component), thing(3, Role::Environment)],
            vec![rel(10, 1, 1)],
        );
        assert_eq!(bunge(&selfy, true, 1, 1).mark, BungeMark::SelfLoop);
    }

    #[test]
    fn an_empty_index_zero_cell_is_forbidden_not_authorable() {
        let m = gathered_model();
        // (0, 2): env acts on nothing here — no relation, and no way to author.
        match bunge(&m, true, 0, 2).status {
            CellStatus::Forbidden { reason } => assert!(reason.contains("en bloc")),
            other => panic!("index 0 is unaddressable, got {other:?}"),
        }
        // An interior empty cell stays open.
        let empty_interior = model(
            Lens::Bunge,
            vec![thing(1, Role::Component), thing(2, Role::Component)],
            vec![],
        );
        assert_eq!(
            bunge(&empty_interior, true, 0, 1).status,
            CellStatus::Authorable
        );
    }

    #[test]
    fn a_bond_acts_in_its_own_order_a_mere_relation_in_both() {
        let mut mere = rel(12, 1, 2);
        mere.is_bond = false;
        let m = model(
            Lens::Bunge,
            vec![
                thing(1, Role::Component),
                thing(2, Role::Component),
                thing(3, Role::Environment),
            ],
            vec![rel(10, 1, 2), rel(11, 3, 1), mere],
        );
        // Itemized slots: [1, 2, 3].
        assert_eq!(bunge(&m, false, 0, 1).relations, vec![10, 12]);
        assert_eq!(bunge(&m, false, 1, 0).relations, vec![12]);
        assert_eq!(bunge(&m, false, 2, 0).relations, vec![11]);
        assert!(bunge(&m, false, 0, 2).relations.is_empty());
    }

    #[test]
    fn an_acting_bond_outranks_a_co_resident_mere_relation() {
        let mut mere = rel(10, 1, 2);
        mere.is_bond = false;
        let mut bond = rel(11, 1, 2);
        bond.kind = Kind::Matter;
        let m = model(
            Lens::Bunge,
            vec![thing(1, Role::Component), thing(2, Role::Component)],
            vec![mere, bond],
        );
        let cell = bunge(&m, false, 0, 1);
        assert_eq!(cell.mark, BungeMark::Bond { kind: Kind::Matter });
        assert_eq!(cell.relations.len(), 2);
    }

    #[test]
    fn a_mere_relation_alone_holds_without_acting() {
        let mut mere = rel(10, 1, 2);
        mere.is_bond = false;
        let m = model(
            Lens::Bunge,
            vec![thing(1, Role::Component), thing(2, Role::Component)],
            vec![mere],
        );
        assert_eq!(bunge(&m, false, 0, 1).mark, BungeMark::Mere);
    }

    #[test]
    fn the_cut_falls_after_index_zero_en_bloc_and_after_the_composition_itemized() {
        let m = four_thing_model();
        assert_eq!(bunge_coupling_cells(&m, true).cut_at, 1);
        assert_eq!(bunge_coupling_cells(&m, false).cut_at, 2);
    }
}
