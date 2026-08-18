//! The live sandbox session: a `Circuit` held across calls and mutated while
//! it ticks — the desktop shell's "touch the system" loop (palette → wire →
//! run → tweak mid-run), re-expressed as an engine-side state machine any
//! face can drive. The wasm seam wraps this 1:1 and stays marshaling-only.
//!
//! Contrast with [`crate::run::RecordedRun`]: the recorder is a batch QUERY
//! at the Operational rung (reset, run to completion, hand back a trace keyed
//! to a spec). A session is an INSTRUMENT — no reset on edit, no spec hash;
//! its trace is an observer artifact of an ongoing performance, valid only
//! for the topology it was recorded under (topology edits clear it, see
//! `Circuit::add_node` and friends). Neither trace is the 8-tuple's `H`.
//!
//! Errors are `String` for the seam to wrap; indices are bounds-checked HERE
//! so an out-of-range index from the face is a named refusal, not a panic
//! that traps the wasm module.

use crate::circuit::{Circuit, DeclaredSubstance, FlowMode, Node, NodeKind, Wire, PALETTE};
use crate::{export, ladder};
use bert_core::{SubstanceType, WorldModel};
use serde::Serialize;

/// Recorded rows kept while a session ticks unattended. History is a trace,
/// not transition state, so truncating the front changes no behavior — it
/// only bounds memory on a sandbox left running.
pub const HISTORY_CAP: usize = 10_000;

/// Parse a palette kind name ("Source", "Sink", "Buffering", …). The names
/// are exactly `NodeKind::label()` of the 12 palette entries, so the palette
/// the face renders and the names it sends back cannot drift apart.
pub fn parse_kind(name: &str) -> Result<NodeKind, String> {
    PALETTE
        .iter()
        .copied()
        .find(|k| k.label() == name)
        .ok_or_else(|| format!("unknown node kind: {name}"))
}

fn parse_substance_base(name: &str) -> Result<SubstanceType, String> {
    match name {
        "Energy" => Ok(SubstanceType::Energy),
        "Material" => Ok(SubstanceType::Material),
        "Message" => Ok(SubstanceType::Message),
        other => Err(format!(
            "unknown substance base: {other} (expected Energy | Material | Message)"
        )),
    }
}

/// One live sandbox: the circuit plus the shell-side authoring counter the
/// desktop `App` kept (`next_n`), so node names stay unique after deletions.
pub struct Session {
    pub circuit: Circuit,
    next_n: usize,
}

impl Default for Session {
    fn default() -> Self {
        Self::new()
    }
}

impl Session {
    pub fn new() -> Self {
        Self {
            circuit: Circuit::default(),
            next_n: 1,
        }
    }

    /// A session opened ON a stamped Troncale process (ladder rung by name).
    pub fn from_stamp(name: &str) -> Result<Self, String> {
        let mut s = Self::new();
        s.stamp(name, 0.0, 0.0)?;
        Ok(s)
    }

    /// A session over a saved model — the sandbox document IS a `WorldModel`
    /// (`export::from_world_model` / `to_world_model` are lossless), so
    /// opening and graduating are the same seam.
    pub fn from_model(model: &WorldModel) -> Result<Self, String> {
        let circuit = export::from_world_model(model)?;
        let next_n = circuit.nodes.len() + 1;
        Ok(Self { circuit, next_n })
    }

    // ── authoring ──────────────────────────────────────────────────────────

    pub fn add_node(&mut self, kind: &str, x: f32, y: f32) -> Result<usize, String> {
        let kind = parse_kind(kind)?;
        let node = Node::new(kind, self.next_n, glam::vec2(x, y));
        self.next_n += 1;
        Ok(self.circuit.add_node(node))
    }

    pub fn remove_node(&mut self, i: usize) -> Result<(), String> {
        self.check_node(i)?;
        self.circuit.remove_node(i);
        Ok(())
    }

    pub fn add_wire(&mut self, from: usize, to: usize, mode: &str) -> Result<usize, String> {
        self.check_node(from)?;
        self.check_node(to)?;
        if from == to {
            return Err("a wire cannot loop a node onto itself".into());
        }
        let wire = match mode {
            "pushed" => Wire::new(from, to),
            "gradient" => Wire::gradient(from, to, 0.3),
            other => return Err(format!("unknown wire mode: {other} (expected pushed | gradient)")),
        };
        Ok(self.circuit.add_wire(wire))
    }

    pub fn remove_wire(&mut self, k: usize) -> Result<(), String> {
        self.check_wire(k)?;
        self.circuit.remove_wire(k);
        Ok(())
    }

    /// Stamp a Troncale process (ladder rung) into the live canvas at an
    /// offset — the desktop `stamp_macro`, minus viewport math (the face owns
    /// where; the engine owns what). Returns the first stamped node's index.
    pub fn stamp(&mut self, name: &str, x: f32, y: f32) -> Result<usize, String> {
        let rung = ladder::by_name(name).ok_or_else(|| format!("unknown process stamp: {name}"))?;
        let sub = (rung.build)();
        let min = sub.nodes.iter().fold(
            glam::vec2(f32::MAX, f32::MAX),
            |m, n| glam::vec2(m.x.min(n.pos.x), m.y.min(n.pos.y)),
        );
        let base = self
            .circuit
            .merge(sub, glam::vec2(x, y) - min, Some(rung.name));
        self.next_n = self.circuit.nodes.len() + 1;
        Ok(base)
    }

    // ── live tweaking (no reset — the running system responds next tick) ───

    pub fn set_node_param(&mut self, i: usize, field: &str, v: f32) -> Result<(), String> {
        self.check_node(i)?;
        let n = &mut self.circuit.nodes[i];
        match field {
            "param" => n.param = v,
            "release_rate" => n.release_rate = v,
            // The desktop inspector writes the live stock too, so the knob is
            // touchable mid-run; balance() documents the moved baseline.
            "initial_storage" => {
                n.initial_storage = v;
                n.storage = v;
            }
            "capacity" => n.capacity = v,
            "setpoint" => n.setpoint = v,
            "time_constant" => n.time_constant = v,
            "maintenance" => n.maintenance = v,
            "back_pressure" => n.back_pressure = v != 0.0,
            other => return Err(format!("unknown node field: {other}")),
        }
        Ok(())
    }

    pub fn set_node_pos(&mut self, i: usize, x: f32, y: f32) -> Result<(), String> {
        self.check_node(i)?;
        self.circuit.nodes[i].pos = glam::vec2(x, y);
        Ok(())
    }

    pub fn set_node_name(&mut self, i: usize, name: &str) -> Result<(), String> {
        self.check_node(i)?;
        self.circuit.nodes[i].name = name.to_string();
        Ok(())
    }

    /// Declare node `i`'s output substance. An empty `name`/`unit` is the
    /// bare base kind — abstract numbers with the right physics.
    pub fn set_substance(&mut self, i: usize, name: &str, base: &str, unit: &str) -> Result<(), String> {
        self.check_node(i)?;
        let base = parse_substance_base(base)?;
        self.circuit.nodes[i].out_substance = DeclaredSubstance {
            name: name.to_string(),
            base,
            unit: unit.to_string(),
        };
        Ok(())
    }

    pub fn set_wire_param(&mut self, k: usize, field: &str, v: f32) -> Result<(), String> {
        self.check_wire(k)?;
        let w = &mut self.circuit.wires[k];
        match field {
            "conductance" => w.conductance = v,
            // A declared per-wire rate (bert#111); negative clears back to
            // the shared-param fallback.
            "rate" => w.rate = (v >= 0.0).then_some(v),
            other => return Err(format!("unknown wire field: {other}")),
        }
        Ok(())
    }

    /// Declare the state invariant (axis D): conservation ledger on or off.
    /// Declining is opt-in, never silent — ADR-0003 / dynamics position §3.
    pub fn set_invariant(&mut self, conserved: bool) {
        use crate::circuit::Invariant;
        self.circuit.invariant = if conserved {
            Invariant::ConservedAdditive
        } else {
            Invariant::None
        };
    }

    // ── transport ──────────────────────────────────────────────────────────

    /// Advance `n` steps of `dt` time units each. The face owns the clock
    /// (ticks/s accumulator); the engine owns the transition. An algebraic
    /// cycle makes `step_dt` a refused no-op — the snapshot names the loop,
    /// so the face reports it instead of spinning silently.
    pub fn step(&mut self, n: u32, dt: f32) {
        for _ in 0..n {
            self.circuit.step_dt(dt);
        }
        let len = self.circuit.history.len();
        if len > HISTORY_CAP {
            let cut = len - HISTORY_CAP;
            self.circuit.history.drain(..cut);
            let lcut = cut.min(self.circuit.ledger_history.len());
            self.circuit.ledger_history.drain(..lcut);
            let wcut = cut.min(self.circuit.wire_history.len());
            self.circuit.wire_history.drain(..wcut);
        }
    }

    pub fn reset(&mut self) {
        self.circuit.reset();
    }

    // ── reading ────────────────────────────────────────────────────────────

    pub fn snapshot(&self) -> Snapshot {
        let c = &self.circuit;
        Snapshot {
            tick: c.tick,
            time: c.time,
            invariant: match c.invariant {
                crate::circuit::Invariant::ConservedAdditive => "conserved",
                crate::circuit::Invariant::None => "none",
            },
            balance: c.invariant.tracks_ledger().then(|| c.balance()),
            emitted: c.emitted,
            sunk: c.sunk,
            dissipated: c.dissipated,
            stored: c.stored(),
            algebraic_cycle: c.algebraic_cycle(),
            nodes: c
                .nodes
                .iter()
                .map(|n| NodeSnap {
                    kind: n.kind.label(),
                    name: n.name.clone(),
                    x: n.pos.x,
                    y: n.pos.y,
                    param: n.param,
                    release_rate: n.release_rate,
                    initial_storage: n.initial_storage,
                    capacity: n.capacity,
                    setpoint: n.setpoint,
                    time_constant: n.time_constant,
                    maintenance: n.maintenance,
                    back_pressure: n.back_pressure,
                    substance: n.out_substance.label(),
                    substance_base: format!("{:?}", n.out_substance.base),
                    activity: n.activity,
                    storage: n.storage,
                    total: n.total,
                    spark: n.spark.iter().copied().collect(),
                    process: n.process,
                })
                .collect(),
            wires: c
                .wires
                .iter()
                .enumerate()
                .map(|(k, w)| WireSnap {
                    from: w.from,
                    to: w.to,
                    mode: match w.mode {
                        FlowMode::Pushed => "pushed",
                        FlowMode::Gradient => "gradient",
                    },
                    conductance: w.conductance,
                    rate: w.rate,
                    ample: w.ample,
                    last_amount: c.wire_amount(k),
                })
                .collect(),
        }
    }

    /// The recorded rows from tick `from_tick` on — a delta pull, so history
    /// never re-crosses the seam in full. Rows carry their tick in column 0
    /// (absolute even after the front is truncated at `HISTORY_CAP`), so the
    /// cut is by recorded tick, not by index.
    pub fn history_since(&self, from_tick: u64) -> HistoryDelta {
        let c = &self.circuit;
        let start = c
            .history
            .partition_point(|row| (row.first().copied().unwrap_or(0.0) as u64) < from_tick);
        HistoryDelta {
            rows: c.history[start..].to_vec(),
            ledger: c.ledger_history[start.min(c.ledger_history.len())..].to_vec(),
            wires: c.wire_history[start.min(c.wire_history.len())..].to_vec(),
        }
    }

    /// The sandbox document — a `WorldModel`, the same artifact the Model
    /// surface opens. Graduation is a save.
    pub fn to_model(&self, name: &str) -> WorldModel {
        export::to_world_model(&self.circuit, name)
    }

    fn check_node(&self, i: usize) -> Result<(), String> {
        if i < self.circuit.nodes.len() {
            Ok(())
        } else {
            Err(format!(
                "no node {i} (the circuit has {})",
                self.circuit.nodes.len()
            ))
        }
    }

    fn check_wire(&self, k: usize) -> Result<(), String> {
        if k < self.circuit.wires.len() {
            Ok(())
        } else {
            Err(format!(
                "no wire {k} (the circuit has {})",
                self.circuit.wires.len()
            ))
        }
    }
}

/// One frame's read of the live circuit — small by design (per-node scalars
/// and the SPARK_CAP sparkline, never full history; see `history_since`).
#[derive(Serialize, Debug)]
pub struct Snapshot {
    pub tick: u64,
    pub time: f32,
    /// "conserved" | "none" — the declared invariant (axis D).
    pub invariant: &'static str,
    /// The conservation residual, present only while the ledger is declared.
    pub balance: Option<f32>,
    pub emitted: f32,
    pub sunk: f32,
    pub dissipated: f32,
    pub stored: f32,
    /// The unanchored loop's node indices, when the wiring has one — the
    /// step is a refused no-op until it's broken (#259).
    pub algebraic_cycle: Option<Vec<usize>>,
    pub nodes: Vec<NodeSnap>,
    pub wires: Vec<WireSnap>,
}

#[derive(Serialize, Debug)]
pub struct NodeSnap {
    pub kind: String,
    pub name: String,
    pub x: f32,
    pub y: f32,
    pub param: f32,
    pub release_rate: f32,
    pub initial_storage: f32,
    pub capacity: f32,
    pub setpoint: f32,
    pub time_constant: f32,
    pub maintenance: f32,
    pub back_pressure: bool,
    /// Display label ("money (Material)" / "Material").
    pub substance: String,
    /// "Energy" | "Material" | "Message".
    pub substance_base: String,
    pub activity: f32,
    pub storage: f32,
    pub total: f32,
    /// The node's last `SPARK_CAP` ticks (trace, not transition state).
    pub spark: Vec<f32>,
    /// The Troncale process this node was stamped from, if any.
    pub process: Option<&'static str>,
}

#[derive(Serialize, Debug)]
pub struct WireSnap {
    pub from: usize,
    pub to: usize,
    /// "pushed" | "gradient".
    pub mode: &'static str,
    pub conductance: f32,
    pub rate: Option<f32>,
    pub ample: bool,
    /// What the wire delivered this tick — drives the flow animation.
    pub last_amount: f32,
}

#[derive(Serialize, Debug)]
pub struct HistoryDelta {
    /// `[tick, n0.activity, n0.storage, n0.total, n1…]` per row.
    pub rows: Vec<Vec<f32>>,
    /// `[emitted, delivered, stored, dissipated]` per row (empty when the
    /// invariant is declined).
    pub ledger: Vec<[f32; 4]>,
    /// Executed wire deliveries per row.
    pub wires: Vec<Vec<f32>>,
}

/// The primitive palette, as data — the face renders what the engine
/// declares, deciding nothing (kind names round-trip through `parse_kind`).
#[derive(Serialize, Debug)]
pub struct PaletteEntry {
    pub kind: String,
    /// The tunable scalar knob, when the primitive has one: `(label, max)`.
    pub param_spec: Option<(String, f32)>,
    pub emits_signal: bool,
    pub inherits_substance: bool,
    /// "Energy" | "Material" | "Message".
    pub default_out: String,
    /// The teaching card (plain / everyday / math / substance / theory / code).
    pub card: crate::docs::Doc,
}

pub fn palette() -> Vec<PaletteEntry> {
    PALETTE
        .iter()
        .map(|k| PaletteEntry {
            kind: k.label(),
            param_spec: k.param_spec().map(|(l, m)| (l.to_string(), m)),
            emits_signal: k.emits_signal(),
            inherits_substance: k.inherits_substance(),
            default_out: format!("{:?}", k.default_out()),
            card: crate::docs::doc(*k),
        })
        .collect()
}

/// The stampable Troncale processes, as data — name (the stamp key), the
/// honesty line (how it's wired from primitives), and provenance.
#[derive(Serialize, Debug)]
pub struct StampEntry {
    pub slug: &'static str,
    pub name: &'static str,
    pub blurb: &'static str,
    pub composition: &'static str,
    pub provenance: &'static str,
}

pub fn stamps() -> Vec<StampEntry> {
    ladder::palette_macros()
        .map(|r| StampEntry {
            slug: r.slug,
            name: r.name,
            blurb: r.blurb,
            composition: r.composition,
            provenance: r.provenance,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn flows_session() -> Session {
        // Source → Buffering → Sink, built through the session's own authoring
        // calls (not a stamp), so the calls themselves are under test.
        let mut s = Session::new();
        let src = s.add_node("Source", 0.0, 0.0).unwrap();
        let buf = s.add_node("Buffering", 100.0, 0.0).unwrap();
        let sink = s.add_node("Sink", 200.0, 0.0).unwrap();
        s.add_wire(src, buf, "pushed").unwrap();
        s.add_wire(buf, sink, "pushed").unwrap();
        s
    }

    /// Law: a session-authored circuit flows and conserves — session
    /// authoring produces the same physics as any other construction path.
    #[test]
    fn session_authoring_flows_and_conserves() {
        let mut s = flows_session();
        s.set_node_param(0, "param", 2.0).unwrap();
        s.step(20, 1.0);
        let snap = s.snapshot();
        assert_eq!(snap.tick, 20);
        assert!(snap.sunk > 0.0, "throughput reached the sink");
        assert!(
            snap.balance.unwrap().abs() < 1e-3,
            "conserved: residual {}",
            snap.balance.unwrap()
        );
    }

    /// Law: a mid-run parameter tweak changes subsequent flow WITHOUT
    /// resetting the clock or the stocks — the sandbox's defining
    /// interaction, impossible through the batch recorder.
    #[test]
    fn midrun_tweak_keeps_state_and_changes_flow() {
        let mut s = flows_session();
        s.set_node_param(0, "param", 1.0).unwrap();
        s.step(10, 1.0);
        let before = s.snapshot();
        let stored_before = before.nodes[1].storage;
        s.set_node_param(0, "param", 5.0).unwrap();
        s.step(1, 1.0);
        let after = s.snapshot();
        assert_eq!(after.tick, 11, "clock kept running");
        assert!(
            after.nodes[1].storage >= stored_before,
            "stock survived the tweak (no reset)"
        );
        assert!(
            (after.nodes[0].activity - 5.0).abs() < 1e-6,
            "the source responds next tick"
        );
    }

    /// Law: stamping a ladder rung through the session reproduces the rung's
    /// own build — same node kinds, same wire count, translated only.
    #[test]
    fn stamp_matches_ladder_build() {
        let mut s = Session::new();
        s.stamp("Flows", 50.0, 50.0).unwrap();
        let reference = (ladder::by_name("Flows").unwrap().build)();
        assert_eq!(s.circuit.nodes.len(), reference.nodes.len());
        assert_eq!(s.circuit.wires.len(), reference.wires.len());
        for (a, b) in s.circuit.nodes.iter().zip(reference.nodes.iter()) {
            assert_eq!(a.kind, b.kind);
            assert_eq!(a.process, Some("Flows"), "provenance recorded");
        }
        // And it runs like the reference.
        let mut r = reference;
        s.step(10, 1.0);
        for _ in 0..10 {
            r.step();
        }
        assert!((s.circuit.sunk - r.sunk).abs() < 1e-6, "same trajectory");
    }

    /// Law: removing a node drops its wires and remaps the survivors —
    /// desktop delete semantics, verified against a hand-built circuit.
    #[test]
    fn remove_node_remaps_wires() {
        let mut s = flows_session();
        let extra = s.add_node("Sensing", 300.0, 0.0).unwrap();
        s.add_wire(1, extra, "pushed").unwrap();
        s.remove_node(1).unwrap(); // drop the buffer
        let snap = s.snapshot();
        assert_eq!(snap.nodes.len(), 3);
        // Every wire touching the buffer died; survivors' indices are dense.
        for w in &snap.wires {
            assert!(w.from < 3 && w.to < 3);
        }
        assert_eq!(
            snap.nodes[2].kind, "Sensing",
            "the node above the removed index slid down"
        );
    }

    /// Law: the sandbox document is a WorldModel — session → model → session
    /// preserves behavior (the export round-trip, driven from the session).
    #[test]
    fn model_round_trip_preserves_behavior() {
        let mut a = flows_session();
        a.set_node_param(0, "param", 2.0).unwrap();
        let model = a.to_model("round-trip");
        let mut b = Session::from_model(&model).unwrap();
        a.step(15, 1.0);
        b.step(15, 1.0);
        assert!(
            (a.snapshot().sunk - b.snapshot().sunk).abs() < 1e-4,
            "same trajectory after the round trip"
        );
    }

    /// Law: an unanchored relay loop is a named refusal, not a silent spin —
    /// the step holds state and the snapshot names the loop (#259).
    #[test]
    fn algebraic_cycle_named_and_step_held() {
        let mut s = Session::new();
        let a = s.add_node("Propelling", 0.0, 0.0).unwrap();
        let b = s.add_node("Impeding", 100.0, 0.0).unwrap();
        s.add_wire(a, b, "pushed").unwrap();
        s.add_wire(b, a, "pushed").unwrap();
        s.step(5, 1.0);
        let snap = s.snapshot();
        assert!(snap.algebraic_cycle.is_some(), "the loop is named");
        assert_eq!(snap.tick, 0, "the step refused rather than pretending");
    }

    /// Law: declining the invariant steps the identical transition family
    /// ledger-free — same trajectory, no balance, no ledger rows (axis D).
    #[test]
    fn declined_invariant_same_trajectory_no_ledger() {
        let mut with = flows_session();
        let mut without = flows_session();
        without.set_invariant(false);
        with.step(10, 1.0);
        without.step(10, 1.0);
        let ws = with.snapshot();
        let ns = without.snapshot();
        assert!((ws.nodes[1].storage - ns.nodes[1].storage).abs() < 1e-6);
        assert!(ns.balance.is_none(), "no residual claimed");
        assert!(without.circuit.ledger_history.is_empty());
    }

    /// Law: topology edits clear the recorded traces (rows would misalign
    /// against new indices) but keep the clock and live state running.
    #[test]
    fn topology_edit_clears_traces_keeps_state() {
        let mut s = flows_session();
        s.step(10, 1.0);
        assert_eq!(s.circuit.history.len(), 10);
        let stored = s.snapshot().nodes[1].storage;
        s.add_node("Sensing", 300.0, 0.0).unwrap();
        assert!(s.circuit.history.is_empty(), "trace cleared");
        let snap = s.snapshot();
        assert_eq!(snap.tick, 10, "clock kept");
        assert!((snap.nodes[1].storage - stored).abs() < 1e-6, "state kept");
    }

    /// Law: `history_since` is a correct delta — rows resume exactly where
    /// the last pull ended, keyed by recorded tick.
    #[test]
    fn history_since_is_a_correct_delta() {
        let mut s = flows_session();
        s.step(10, 1.0);
        let first = s.history_since(0);
        assert_eq!(first.rows.len(), 10);
        let last_tick = first.rows.last().unwrap()[0] as u64;
        s.step(5, 1.0);
        let delta = s.history_since(last_tick + 1);
        assert_eq!(delta.rows.len(), 5, "only the new rows");
        assert_eq!(delta.ledger.len(), 5);
    }

    /// Law: the history cap bounds memory without touching behavior — the
    /// clock, state, and subsequent rows are unaffected by truncation.
    #[test]
    fn history_cap_truncates_front_only() {
        let mut s = flows_session();
        s.step((HISTORY_CAP + 100) as u32, 1.0);
        assert_eq!(s.circuit.history.len(), HISTORY_CAP);
        // Rows record the post-increment tick (1-based), so cutting the first
        // 100 of ticks 1..=CAP+100 leaves tick 101 at the front.
        let first_kept = s.circuit.history.first().unwrap()[0] as usize;
        assert_eq!(first_kept, 101, "the front was cut, not the back");
        assert_eq!(s.snapshot().tick as usize, HISTORY_CAP + 100);
    }

    /// Law: bad input is a named refusal, never a panic — the seam's
    /// no-panic contract starts here.
    #[test]
    fn bad_input_refuses_by_name() {
        let mut s = Session::new();
        assert!(s.add_node("Teleporting", 0.0, 0.0).is_err());
        assert!(s.remove_node(7).is_err());
        assert!(s.set_node_param(0, "param", 1.0).is_err());
        let a = s.add_node("Source", 0.0, 0.0).unwrap();
        assert!(s.add_wire(a, a, "pushed").is_err(), "self-loop refused");
        assert!(s.set_node_param(a, "charisma", 1.0).is_err());
        assert!(s.stamp("Vibes", 0.0, 0.0).is_err());
    }

    /// Law: the palette and stamps are data the face can trust — every
    /// palette kind parses back, every stamp name resolves.
    #[test]
    fn palette_and_stamps_round_trip() {
        for entry in palette() {
            assert!(parse_kind(&entry.kind).is_ok(), "{} parses", entry.kind);
        }
        assert_eq!(palette().len(), 12);
        for stamp in stamps() {
            assert!(ladder::by_name(stamp.name).is_some(), "{} resolves", stamp.name);
        }
    }
}
