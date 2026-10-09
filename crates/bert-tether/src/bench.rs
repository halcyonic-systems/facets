//! The bench session (facets#463, move 2): the Model bench on the engine's
//! stateful session, so a knob applies on the next tick, Step is one tick,
//! and the readout is the same domain-named `RunReadout` the batch run gives.
//!
//! What this module adds over `forcing::run_unforced` / `force_and_run` is
//! only *holding* the circuit between calls. The projection, the forcing
//! import, the stepping and the summary are the same functions; the readout
//! of a session stepped to T from a fresh open equals the batch run of the
//! same model float for float (`tests/bench.rs` pins this), and a knob turned
//! at tick k leaves ticks 1..k untouched.
//!
//! Knobs are addressed by the names the author sees — a flow by its label and
//! endpoints, a component by its name — never by circuit index. An amount is
//! routed exactly as `bert_compose::from_spec` routes it (a source's lone
//! pushed outflow or gradient flow sits on the node; everything else on the
//! wire), so a session that is later written back as a model agrees with the
//! canvas. A flow forced by data refuses a live edit: the column is the
//! author's word, as it is on the inputs card.

use std::collections::HashMap;

use bert_compose::circuit::{FlowMode, NodeFlux, NodeKind};
use bert_compose::session::Session;
use bert_compose::RecordedRun;
use bert_core::operational::OperationalSpec;
use bert_core::{Id, WorldModel};
use serde::Serialize;

use crate::forcing::{summarize, RunReadout};
use crate::tether::ImportedData;

/// One live knob edit, kept so the readout can say the trace was edited
/// mid-run (a recorded run is keyed to one spec; an edited one is not).
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct KnobEdit {
    /// The tick count when the edit applied; it governs ticks after this.
    pub tick: u64,
    pub target: String,
    pub field: String,
    pub value: f32,
}

/// One wire's delivery over one tick, named for the flow it carries.
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct WireFlux {
    pub name: String,
    pub from: String,
    pub to: String,
    pub delivered: f32,
}

/// The tick log: what every node and wire did on one tick, in the model's
/// own names.
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct TickLog {
    pub tick: u64,
    pub nodes: Vec<NodeFlux>,
    pub wires: Vec<WireFlux>,
}

pub struct BenchSession {
    model: WorldModel,
    spec: OperationalSpec,
    imported: ImportedData,
    session: Session,
    dt: f64,
    edits: Vec<KnobEdit>,
    names: HashMap<Id, String>,
}

impl BenchSession {
    /// Open a model from its declared amounts alone, stepped nowhere yet.
    pub fn open_unforced(model: WorldModel, dt: f64) -> Result<Self, String> {
        bert_compose::ticks_over(dt, dt)?;
        Self::open(model, ImportedData::default(), dt)
    }

    /// Open a model with a CSV bound through its manifest: the same import
    /// ritual as `force_and_run`, held open instead of run to T.
    pub fn open_forced(
        model: WorldModel,
        csv_text: &str,
        manifest: &crate::manifest::RunManifest,
        dt: f64,
        today: &str,
    ) -> Result<Self, String> {
        bert_compose::ticks_over(dt, dt)?;
        let (model, imported) = crate::forcing::prepare_forced(model, csv_text, manifest, today)?;
        Self::open(model, imported, dt)
    }

    fn open(model: WorldModel, imported: ImportedData, dt: f64) -> Result<Self, String> {
        let spec = bert_core::operational::validate_operational(&model)
            .map_err(|errors| format!("model is not executable ({} reason(s))", errors.len()))?;
        let mut circuit = bert_compose::from_spec(&spec);
        if let Some(cycle) = circuit.algebraic_cycle() {
            let names: Vec<&str> = cycle
                .iter()
                .map(|&i| circuit.nodes[i].name.as_str())
                .collect();
            return Err(format!(
                "run refused: the wiring contains a loop with no stock and no level \
                 read on it ({}). A loop of pure relays has no deterministic step — \
                 put a stock on the loop, or read a level instead of consuming a flow.",
                names.join(" → ")
            ));
        }
        circuit.reset();
        let mut names = HashMap::new();
        for t in spec.sources.iter().chain(spec.sinks.iter()) {
            names.insert(t.id.clone(), t.name.clone());
        }
        for p in &spec.processes {
            names.insert(p.id.clone(), p.name.clone());
        }
        let next_n = circuit.nodes.len() + 1;
        let session = Session::from_circuit(circuit, next_n);
        Ok(Self {
            model,
            spec,
            imported,
            session,
            dt,
            edits: Vec::new(),
            names,
        })
    }

    pub fn tick(&self) -> u64 {
        self.session.circuit.tick
    }

    pub fn dt(&self) -> f64 {
        self.dt
    }

    pub fn edits(&self) -> &[KnobEdit] {
        &self.edits
    }

    /// The engine as it stands, read-only: for the ledger and the probes.
    pub fn circuit(&self) -> &bert_compose::Circuit {
        &self.session.circuit
    }

    /// Advance `n` ticks of `dt`. A session never resets: Step is one tick.
    pub fn step(&mut self, n: u32) {
        self.session.step(n, self.dt as f32);
    }

    /// Step from the current tick to the horizon `t` by the same count the
    /// batch run takes (`ticks_over`), so a bench opened and stepped over T
    /// reads as the batch run over T. A horizon already reached steps nothing.
    pub fn step_over(&mut self, total_time: f64) -> Result<(), String> {
        let ticks = bert_compose::ticks_over(self.dt, total_time)?;
        let done = self.session.circuit.tick as usize;
        if ticks > done {
            self.session.step((ticks - done) as u32, self.dt as f32);
        }
        Ok(())
    }

    /// Back to tick 0 with the knobs as they stand (not the model's declared
    /// amounts: an edit is a decision, and reset re-runs it from the top).
    pub fn reset(&mut self) {
        self.session.reset();
    }

    fn name_of(&self, id: &Id) -> String {
        self.names.get(id).cloned().unwrap_or_default()
    }

    /// The wire index of the flow named `label` from `from` to `to`.
    fn flow_index(&self, label: &str, from: &str, to: &str) -> Result<usize, String> {
        let hits: Vec<usize> = self
            .spec
            .flows
            .iter()
            .enumerate()
            .filter(|(_, f)| {
                f.name == label && self.name_of(&f.source) == from && self.name_of(&f.sink) == to
            })
            .map(|(k, _)| k)
            .collect();
        match hits.as_slice() {
            [k] => Ok(*k),
            [] => Err(format!("no flow \"{label}\" from \"{from}\" to \"{to}\"")),
            _ => Err(format!(
                "several flows \"{label}\" from \"{from}\" to \"{to}\"; the edit is ambiguous"
            )),
        }
    }

    /// Set a flow's amount by name, live. Routed as `from_spec` routes it.
    pub fn set_flow_amount(
        &mut self,
        label: &str,
        from: &str,
        to: &str,
        v: f32,
    ) -> Result<(), String> {
        if !(v.is_finite() && v >= 0.0) {
            return Err(format!(
                "an amount is a non-negative finite number, not {v}"
            ));
        }
        let k = self.flow_index(label, from, to)?;
        let circuit = &mut self.session.circuit;
        let wire = &circuit.wires[k];
        if wire.rate_series.is_some() {
            return Err(format!(
                "\"{label}\" is forced by a bound column; unbind it in Data mode to turn this knob"
            ));
        }
        let from_i = wire.from;
        match (circuit.nodes[from_i].kind, wire.mode) {
            (NodeKind::Source, FlowMode::Gradient) => circuit.nodes[from_i].param = v,
            (NodeKind::Source, FlowMode::Pushed) => {
                if circuit.wires[k].rate.is_some() {
                    circuit.wires[k].rate = Some(v);
                } else {
                    circuit.nodes[from_i].param = v;
                }
            }
            (NodeKind::Process(_), FlowMode::Pushed) => circuit.wires[k].rate = Some(v),
            _ => {
                return Err(format!(
                    "\"{label}\" carries no amount the engine reads (a gradient flow's rate is its conductance)"
                ))
            }
        }
        self.edits.push(KnobEdit {
            tick: self.session.circuit.tick,
            target: format!("{from} -> {to} : {label}"),
            field: "amount".into(),
            value: v,
        });
        Ok(())
    }

    /// Set a component's engine parameter by name, live: `release_rate`,
    /// `capacity`, `setpoint`, `time_constant`, `maintenance`,
    /// `back_pressure`, `initial_storage`, or the agency scalar `param`.
    pub fn set_component_param(&mut self, thing: &str, field: &str, v: f32) -> Result<(), String> {
        let i = self
            .session
            .circuit
            .nodes
            .iter()
            .position(|n| n.name == thing && matches!(n.kind, NodeKind::Process(_)))
            .ok_or_else(|| format!("no component named \"{thing}\""))?;
        self.session.set_node_param(i, field, v)?;
        self.edits.push(KnobEdit {
            tick: self.session.circuit.tick,
            target: thing.to_string(),
            field: field.to_string(),
            value: v,
        });
        Ok(())
    }

    /// The run as it stands, in domain terms: the same summary a batch run
    /// gives, over the live history.
    pub fn readout(&self) -> RunReadout {
        let circuit = &self.session.circuit;
        let run = RecordedRun::from_live(circuit, &self.spec, self.dt);
        summarize(
            &self.model,
            &self.imported,
            &self.spec,
            circuit,
            &run,
            self.dt,
        )
    }

    /// Every node's and wire's flux for the ticks at or after `from_tick`.
    pub fn tick_log_since(&self, from_tick: u64) -> Vec<TickLog> {
        let circuit = &self.session.circuit;
        let wire_names: Vec<(String, String, String)> = self
            .spec
            .flows
            .iter()
            .map(|f| {
                (
                    f.name.clone(),
                    self.name_of(&f.source),
                    self.name_of(&f.sink),
                )
            })
            .collect();
        let wires_at: HashMap<u64, &Vec<f32>> = circuit
            .history
            .iter()
            .zip(circuit.wire_history.iter())
            .map(|(h, w)| (h[0] as u64, w))
            .collect();
        circuit
            .flux_since(from_tick)
            .into_iter()
            .map(|(tick, nodes)| {
                let wires = wires_at
                    .get(&tick)
                    .map(|row| {
                        row.iter()
                            .enumerate()
                            .filter_map(|(k, &delivered)| {
                                wire_names.get(k).map(|(name, from, to)| WireFlux {
                                    name: name.clone(),
                                    from: from.clone(),
                                    to: to.clone(),
                                    delivered,
                                })
                            })
                            .collect()
                    })
                    .unwrap_or_default();
                TickLog { tick, nodes, wires }
            })
            .collect()
    }
}
