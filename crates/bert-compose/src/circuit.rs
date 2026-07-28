//! The live circuit: process primitives wired into a flowing, stateful system.
//!
//! Transfer functions are ports of BERT's verified implementations
//! (python/agents.py PRIMITIVE_T, 39 tests) — Mobus's atomic work processes,
//! substance-aware: Energy/Material conserve, Message copies; Amplifying draws
//! its gain from a metered Energy input (gain never manufactures mass);
//! Sensing crosses substance (physical in → signal out); Buffering is a
//! conservative stock — the system's state/memory lives there.
//!
//! Update rule (#259): **wires transmit, stocks remember.** Each step,
//! activities are computed in same-step dependency order — a memoryless
//! primitive relays what it receives within the step; wires carry no state
//! and insert no delay. Memory lives only where it is declared: a stock's
//! level, read at the step's opening state. That opening-state read (an
//! observation tap or gradient) is the Moore anchor that makes feedback
//! loops well-posed (VSL; Spivak–Tan eq. 11; SSV Defs 4.2.4/4.2.7). A loop
//! with NO anchor — pure relays feeding each other — has no deterministic
//! semantics (SSV Ex 4.2.9) and is REFUSED: `algebraic_cycle()` names it
//! and `step_dt` is a no-op, rather than silently repairing it with a
//! per-step delay nothing authored. An authored delay is a future modeled
//! element (SSV's Delay Box D_ε), never a side effect of drawing a box.
//! (Divergence from the Python, noted: the buffer's release is a knob here
//! rather than demand-tracking — same conservative stock, simpler to touch.)
//!
//! # Conservation ledger
//!
//! Physical mass (Energy/Material) is fully accounted every tick:
//!
//! ```text
//! emitted + initial stocks == stored + sunk + dissipated
//! ```
//!
//! `dissipated` is not a fudge factor — it is Mobus's waste heat. Mobus 2022
//! Fig 3.17: every work process needs high-potential energy and, by the
//! Second Law, sheds some as waste — "material transformations involve some
//! material waste; energy transformations produce a greater proportion of
//! waste heat." That is exactly why the domain examples differ: Material/value
//! loses little, Energy loses most. `dissipated` is computed per node as
//! `physical in − physical out − Δstorage`, so the equation holds by
//! construction and any *unintended* leak shows up as a nonzero residual
//! (`balance()`), which the property tests assert over random circuits.
//! The intended dissipation channels, each a deliberate modeling decision:
//!
//! - **Propelling/Impeding friction** — the `(1 − agency)` share is lost in
//!   transport, the classic transport cost.
//! - **Amplifying power draw** — the amp consumes its entire metered Energy
//!   feed (signal out + heat); output is Message, which is never ledgered.
//! - **Modulating shed** — flow blocked by a throttled gate is shed at the
//!   valve (this push model has no backpressure).
//! - **Sensing consumption** — a pushed feed into a sensor is consumed by
//!   measurement. Observation taps (Buffer → Sensing) read the level and
//!   consume nothing.
//! - **Substance-mismatch shed** — flow a node can't use vanishes; surfaced
//!   by the amber ⚠ and counted here.
//! - **Dead ends** — activity with no pushed outwire is carried by nothing
//!   and dissipates the same step; surfaced by `dead_ends()` and counted.
//! - **Overflow** — a bounded buffer (capacity > 0) clamps its stock at the
//!   ceiling; the excess overflows and the ledger charges it (a tank running
//!   over). The clamp alone does the accounting — see the Buffering arm.
//! - **Maintenance** — a buffer's upkeep loss (`maintenance` per tick) leaves
//!   the stock without being delivered (Odum depreciation / Mobus Fig 3.17);
//!   the ledger charges it like overflow, by the same Δstorage accounting.
//!
//! Message is information: copied, gated, manufactured (Inverting) — never
//! conserved, never in the ledger.

use bert_core::{ProcessPrimitive, SubstanceType};
use std::collections::VecDeque;

/// Ticks of per-node history kept for the inline sparkline.
pub const SPARK_CAP: usize = 40;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum NodeKind {
    /// Environment input: emits `rate` per tick.
    Source,
    /// Environment output: accumulates what arrives.
    Sink,
    Process(ProcessPrimitive),
}

impl NodeKind {
    pub fn label(&self) -> String {
        match self {
            NodeKind::Source => "Source".into(),
            NodeKind::Sink => "Sink".into(),
            NodeKind::Process(p) => format!("{p:?}"),
        }
    }

    /// The tunable scalar coefficient of this work process, for the inspector:
    /// `(label, max)`. `None` means the primitive has no scalar knob — its
    /// behavior is structural (Buffering's knobs are stock + release; a
    /// Splitter just divides; a valve is driven by its control wire).
    ///
    /// NB: these are PROCESS PARAMETERS — a gain, an efficiency, a rate — NOT
    /// "agency". In Mobus, agency is a property of *agents* (Reactive/
    /// Anticipatory/Intentional), not of atomic work processes. The earlier
    /// "agency 0–1" label was a category error; a Sensing process has a gain,
    /// not agency.
    pub fn param_spec(&self) -> Option<(&'static str, f32)> {
        use ProcessPrimitive::*;
        match self {
            NodeKind::Source => Some(("rate / tick", 10.0)),
            NodeKind::Process(Sensing) => Some(("sensor gain  k", 1.0)),
            NodeKind::Process(Amplifying) => Some(("gain  (→ ×1–10)", 1.0)),
            NodeKind::Process(Propelling) => Some(("efficiency  η", 1.0)),
            NodeKind::Process(Impeding) => Some(("throughput  (1 − impedance)", 1.0)),
            _ => None,
        }
    }

    /// Does this primitive emit a SIGNAL (Message) by definition? Sensing
    /// transduces a physical flow to a signal; Inverting/Copying process
    /// signals; Amplifying outputs a stronger signal. Their output kind is
    /// fixed by the primitive (Mobus Figs 3.18–3.19) — not a free choice —
    /// so the inspector locks it instead of offering the trichotomy.
    pub fn emits_signal(&self) -> bool {
        use ProcessPrimitive::*;
        matches!(
            self,
            NodeKind::Process(Sensing | Inverting | Copying | Amplifying)
        )
    }

    /// Does this primitive simply pass its substance through? A buffer holds
    /// and re-emits what it received; a valve/transport/splitter carry their
    /// inflow onward. Their output substance is INHERITED from upstream, not
    /// chosen — you set it once at the Source. (Combining merges, possibly
    /// mixed substances, so it stays a chooser; transducers/signal processors
    /// are handled by `emits_signal`.)
    pub fn inherits_substance(&self) -> bool {
        use ProcessPrimitive::*;
        matches!(
            self,
            NodeKind::Process(Buffering | Modulating | Impeding | Propelling | Splitting)
        )
    }

    /// Default output substance — signal-class primitives emit Message.
    pub fn default_out(&self) -> SubstanceType {
        match self {
            NodeKind::Process(
                ProcessPrimitive::Sensing
                | ProcessPrimitive::Inverting
                | ProcessPrimitive::Copying
                | ProcessPrimitive::Amplifying,
            ) => SubstanceType::Message,
            _ => SubstanceType::Material,
        }
    }

    /// Can this primitive turn an incoming flow of `s` into output? Feeding it
    /// a substance it can't use is a silent no-op (Copying ignores Material,
    /// Amplifying ignores Material) — the UI surfaces the mismatch so no flow
    /// vanishes without explanation.
    pub fn consumes(&self, s: SubstanceType) -> bool {
        use ProcessPrimitive::*;
        let physical = s != SubstanceType::Message;
        match self {
            // Message-only signal processors: copying/inverting matter would
            // counterfeit it.
            NodeKind::Process(Copying | Inverting) => s == SubstanceType::Message,
            // Sensing reads physical flow (Energy/Material), crosses to Message.
            NodeKind::Process(Sensing) => physical,
            // Amplifying needs a Message signal and Energy power — Material is
            // dead weight to it.
            NodeKind::Process(Amplifying) => s != SubstanceType::Material,
            // You SPLIT matter (divide a conserved quantity) and COMBINE matter;
            // information isn't divided, it's copied — so these are physical-only.
            NodeKind::Process(Splitting | Combining) => physical,
            // Buffering (stock + optional Message gate), Modulating (physical
            // primary + Message control), Propelling/Impeding (move anything),
            // Source/Sink: take what they're given.
            _ => true,
        }
    }
}

/// A declared substance: a human name ("money", "water", "votes") that
/// factors through one of the three conserved kinds. Neutrality is the
/// trichotomy (Energy/Material/Message); reality is a refinement that maps
/// onto it — the dynamics only ever read `base`, so money conserves exactly
/// like Material and votes copy exactly like Message. The name and unit ride
/// along into the BERT JSON (`Substance.sub_type`, `Interaction.unit`).
#[derive(Clone, PartialEq, Debug)]
pub struct DeclaredSubstance {
    /// Plain name ("money"); empty = the bare base kind.
    pub name: String,
    /// The conserved kind whose physics this substance inherits.
    pub base: SubstanceType,
    /// Display unit ("$", "L", "votes"); empty = unitless.
    pub unit: String,
}

impl DeclaredSubstance {
    pub fn bare(base: SubstanceType) -> Self {
        Self {
            name: String::new(),
            base,
            unit: String::new(),
        }
    }
    pub fn named(name: &str, base: SubstanceType, unit: &str) -> Self {
        Self {
            name: name.to_string(),
            base,
            unit: unit.to_string(),
        }
    }
    /// "money (Material)" — or just "Material" when unnamed.
    pub fn label(&self) -> String {
        if self.name.is_empty() {
            format!("{:?}", self.base)
        } else {
            format!("{} ({:?})", self.name, self.base)
        }
    }
}

impl From<SubstanceType> for DeclaredSubstance {
    fn from(base: SubstanceType) -> Self {
        Self::bare(base)
    }
}

/// The curated substance palette — relatable names first (this tool is for
/// social scientists and systems theorists, not just engineers). Each maps
/// to the conserved kind whose physics it inherits; anything not here can be
/// free-declared in the inspector.
pub const SUBSTANCES: &[(&str, SubstanceType, &str)] = &[
    ("money", SubstanceType::Material, "$"),
    ("water", SubstanceType::Material, "L"),
    ("people", SubstanceType::Material, "people"),
    ("food", SubstanceType::Material, "kg"),
    ("goods", SubstanceType::Material, "units"),
    ("sunlight", SubstanceType::Energy, "W"),
    ("electricity", SubstanceType::Energy, "kWh"),
    ("fuel", SubstanceType::Energy, "J"),
    ("effort", SubstanceType::Energy, "hours"),
    ("votes", SubstanceType::Message, "votes"),
    ("news", SubstanceType::Message, "stories"),
    ("data", SubstanceType::Message, "bits"),
    ("orders", SubstanceType::Message, "orders"),
];

pub const PALETTE: &[NodeKind] = &[
    NodeKind::Source,
    NodeKind::Sink,
    NodeKind::Process(ProcessPrimitive::Buffering),
    NodeKind::Process(ProcessPrimitive::Combining),
    NodeKind::Process(ProcessPrimitive::Splitting),
    NodeKind::Process(ProcessPrimitive::Amplifying),
    NodeKind::Process(ProcessPrimitive::Modulating),
    NodeKind::Process(ProcessPrimitive::Sensing),
    NodeKind::Process(ProcessPrimitive::Inverting),
    NodeKind::Process(ProcessPrimitive::Copying),
    NodeKind::Process(ProcessPrimitive::Propelling),
    NodeKind::Process(ProcessPrimitive::Impeding),
];

pub struct Node {
    pub kind: NodeKind,
    pub name: String,
    pub pos: glam::Vec2,
    /// Output substance (wires created from this node inherit it). A
    /// declared name + unit over a conserved base kind; dynamics read
    /// `.base` only.
    pub out_substance: DeclaredSubstance,
    /// Source rate / agency capacity (gain, efficiency, k…) depending on kind.
    pub param: f32,
    /// Buffer release rate per tick.
    pub release_rate: f32,
    /// Buffer starting stock — the "this system HAS a quantity" assertion.
    /// Exported as AgentModel.initial_state{"storage"} (what Mesa seeds).
    pub initial_storage: f32,
    /// Buffer maximum capacity (Mobus 2022 Ch.4: "containers have capacity
    /// attributes, a variable"). `0.0` = unbounded (the default). When the
    /// stock would exceed it, the excess overflows — a tank running over —
    /// and is accounted as dissipated automatically by the conservation
    /// ledger (clamping `storage` makes the per-node rule charge the overflow).
    pub capacity: f32,
    /// Inverting's reference / setpoint (Mobus 2022 Ch.4 Fig 4.12: a
    /// comparator computes "reference − measured"). The controller outputs
    /// `(setpoint − signal).max(0)`, so raising it makes the regulated loop
    /// hold a higher level. Default `1.0` reproduces the bare `1 − signal`.
    /// Only Inverting reads it.
    pub setpoint: f32,
    /// Buffer drain time constant τ (Mobus 2022: Buffering "smooths flow
    /// volumes over time"). `0.0` = fixed-rate drain (`release_rate`, the
    /// zeroth-order default). `> 0` = FIRST-ORDER drain: each tick releases
    /// ≈ `stock / τ`, so the stock decays exponentially and the outflow is a
    /// smoothed (low-pass) version of the inflow. Big τ = slow and smooth.
    pub time_constant: f32,
    /// Maintenance respiration: a stock's continuous upkeep cost (Mobus 2022
    /// Fig 3.17 maintenance energy; Odum's depreciation outflow — every store
    /// has one). Each tick the stock loses `maintenance` to upkeep, DISSIPATED
    /// (waste heat) — never delivered downstream — whether or not the stock is
    /// used. Battery self-discharge, baseline death rate, spoilage, basal
    /// metabolism. `0.0` = none. The ledger charges it automatically.
    pub maintenance: f32,
    /// Back-pressure (Modulating): when `true`, a throttled valve does NOT
    /// shed the blocked flow — it throttles its UPSTREAM instead. A Source
    /// feeding it emits only what passes (flow not produced); a Buffer feeding
    /// it releases only what passes (the rest stays in the stock). Mobus 2022:
    /// Impeding "slows the rate of flow with a consequent back-pressure". The
    /// push-model default (`false`) sheds; this makes the valve back up.
    pub back_pressure: bool,
    /// A stock's declared unit (bert-lenses#76). A Buffering stock accumulates
    /// its inflow over Δt, so its dimension is not the feeding flow's unit
    /// (`out_substance.unit`) — a `kW` inflow accrues energy, not power. The
    /// run reads this when non-empty, falling back to the flow-copied unit
    /// otherwise. Empty for every non-stock node and every undeclared stock.
    pub stock_unit: String,
    /// Provenance: the Troncale process this node was stamped from (a
    /// `ladder::Rung` name), or `None` if hand-placed. Pure UI hint — lets the
    /// inspector show "this is part of a Feedback process" alongside the
    /// node's own primitive card. Not serialized.
    pub process: Option<&'static str>,
    // — live state —
    pub storage: f32,
    pub activity: f32,
    pub total: f32,
    /// The node's last `SPARK_CAP` ticks — storage for a buffer (the thing it
    /// holds), activity for everything else. Engine state, not view state:
    /// the inline sparkline just draws this buffer, so it ports to any shell.
    pub spark: VecDeque<f32>,
}

impl Node {
    pub fn new(kind: NodeKind, n: usize, pos: glam::Vec2) -> Self {
        Self {
            kind,
            name: format!("{} {}", kind.label(), n),
            pos,
            out_substance: kind.default_out().into(),
            param: if kind == NodeKind::Source { 1.0 } else { 0.5 },
            release_rate: 1.0,
            initial_storage: 0.0,
            capacity: 0.0,        // unbounded
            setpoint: 1.0,        // Inverting reference; 1.0 = bare (1 − signal)
            time_constant: 0.0,   // 0 = fixed-rate drain
            maintenance: 0.0,     // 0 = no upkeep loss
            back_pressure: false, // false = push model sheds; true = backs up
            stock_unit: String::new(),
            process: None,
            storage: 0.0,
            activity: 0.0,
            total: 0.0,
            spark: VecDeque::with_capacity(SPARK_CAP),
        }
    }
}

/// How a flow's rate is set. Pushed = a node emits at its own rate (the
/// default). Gradient = the flow is a *generalized flow* down a potential
/// difference (Mobus Ch.4: forces/fields/diffusion are flows with a gradient
/// rate-law) — `rate = conductance · (level_from − level_to)`. Gradient is how
/// Potential Fields enter bert-compose: a field is a flow MODE, not a node.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum FlowMode {
    #[default]
    Pushed,
    Gradient,
}

// Not `Copy`: a forced wire carries a `rate_series` Vec (#16). Every wire
// access reads individual fields by reference, so no whole-value copy is
// needed — `Clone` covers the one merge site (app.rs) that rebuilds wires.
#[derive(Clone, PartialEq, Debug)]
pub struct Wire {
    pub from: usize,
    pub to: usize,
    pub mode: FlowMode,
    /// Gradient-mode conductance (k in rate = k·Δlevel). Ignored when pushed.
    pub conductance: f32,
    /// Declared per-wire emission for a pushed Source outwire. Rate is an
    /// edge attribute in Mobus's formalism (Eq. 4.5's `(f, cap)` pairs) — a
    /// source with several outflows carries one rate PER FLOW, and collapsing
    /// them onto the node loses all but one (bert#111). `None` falls back to
    /// the source's `param` shared uniformly across the undeclared outwires,
    /// which is exactly the pre-#111 behavior when nothing is declared.
    pub rate: Option<f32>,
    /// Series forcing (bert-lenses#16): a forced source outwire emits an
    /// OBSERVED series tick by tick instead of a constant `rate` — Mobus's
    /// `o_Src(t) = f(q,t)` (ch6 §6.6.2.3), the 7-tuple's H entering the run
    /// instead of being averaged to a mean. Each sample spans one time unit
    /// (× `dt_stride`): at model time `t` the wire delivers
    /// `series[min(⌊t⌋, len-1)]`; past the series' end the last value is HELD
    /// (data-horizon: projection, not error — #34). `None` = unforced, the
    /// constant-`rate` path is byte-for-byte unchanged. Takes precedence over
    /// `rate` when present.
    pub rate_series: Option<Vec<f32>>,
    /// Multi-timescale (rung 3): this wire's `rate_series` is sampled once every
    /// `dt_stride` time units and ZERO-ORDER-HELD between — the channel's own
    /// Δt = `dt_stride ×` the model's time unit, Mobus's per-node `Δt_{i,l}` as
    /// an integer multiple (ch4 §4.3.3.6). A slow (e.g. annual) channel carries
    /// its real data stream at index `time / dt_stride` — anchored to model
    /// time, not to the numerical step (#258). `None`/`1` = one sample per time
    /// unit, the single-clock case — byte-for-byte the pre-rung-3 behavior at
    /// the default dt = 1.0.
    pub dt_stride: Option<u32>,
    /// Per-wire substance when a sender's flows differ (bert#111 sibling: a
    /// multi-outflow source declares substance per flow, not per node).
    /// `None` reads the sender's `out_substance` as before.
    pub substance_override: Option<SubstanceType>,
}

impl Wire {
    pub fn new(from: usize, to: usize) -> Self {
        Self {
            from,
            to,
            mode: FlowMode::Pushed,
            conductance: 0.3,
            rate: None,
            rate_series: None,
            dt_stride: None,
            substance_override: None,
        }
    }
    pub fn gradient(from: usize, to: usize, conductance: f32) -> Self {
        Self {
            from,
            to,
            mode: FlowMode::Gradient,
            conductance,
            rate: None,
            rate_series: None,
            dt_stride: None,
            substance_override: None,
        }
    }
}

/// Axis D of the dynamics taxonomy (`docs/design/dynamics-principled-position.md`
/// §2–§3): the invariant a model DECLARES over its state space. Conservation is
/// one declarable invariant, not the engine's premise — the position doc's move
/// is to "finish the inversion" so a non-conservation kind can decline the mass
/// ledger while the SAME transition family runs underneath ("Keep the ledger as
/// a declarable, checkable invariant; shed it as the stepping loop's structural
/// premise", §3). Default = conservation, so every model built today is
/// byte-for-byte unchanged; a Boolean-network / RBN single trajectory (§2 table,
/// "axis-D made optional") declares `None` and steps ledger-free over the same
/// `Id` functor.
#[derive(Clone, Copy, PartialEq, Eq, Debug, Default)]
pub enum Invariant {
    /// Additive conserved mass (Energy/Material): the ledger runs and
    /// `balance()` is meaningful. The one implemented cell, and the default —
    /// declining it is opt-in, never silent.
    #[default]
    ConservedAdditive,
    /// No declared invariant (axis D = none): the mass ledger is not computed
    /// and carries no meaning. Transitions are untouched — same functor, same
    /// trajectory — only the accounting is declined (RBN single trajectory).
    None,
}

impl Invariant {
    /// Whether the conservation ledger runs this step. Only `ConservedAdditive`
    /// declares the additive-mass invariant; every other kind steps ledger-free.
    pub fn tracks_ledger(self) -> bool {
        matches!(self, Invariant::ConservedAdditive)
    }
}

#[derive(Default)]
pub struct Circuit {
    pub nodes: Vec<Node>,
    pub wires: Vec<Wire>,
    /// Root-boundary porosity (B's P, bert-lenses#54). When authored NONZERO it
    /// scales boundary-crossing influx (a source-fed crossing flow delivers
    /// `porosity ×` its rate — the coefficient acts within the active transition
    /// φ, never a metasystem swap). `0.0` = the unauthored default = no effect
    /// (full influx), so every existing circuit runs byte-for-byte as before.
    /// Sourced from the seam (`OperationalSpec::porosity`); config, not state, so
    /// `reset` leaves it untouched.
    pub porosity: f32,
    pub tick: u64,
    /// Model time elapsed, in the model's declared time unit — the sum of the
    /// `dt`s stepped so far (equals `tick` while every step is the default
    /// 1.0). Forced-series indexing reads THIS, never `tick`, so a channel's
    /// data stays anchored to time under Δt refinement (#258).
    pub time: f32,
    /// Per-tick data rows: [tick, n0.activity, n0.storage, n0.total, n1…].
    /// Cleared on Reset or when the topology changes mid-recording.
    pub history: Vec<Vec<f32>>,
    /// The declared state invariant (axis D). Conservation by default, so
    /// existing models are unchanged; a non-conservation kind declares `None`
    /// to step without the mass ledger below. See `Invariant`.
    pub invariant: Invariant,
    // — conservation ledger (physical mass only; see module docs) —
    /// Cumulative physical mass delivered out of Sources.
    pub emitted: f32,
    /// Cumulative physical mass absorbed by Sinks.
    pub sunk: f32,
    /// Cumulative physical mass shed through the intended channels
    /// (friction, valve shed, amp power, sensing, mismatches, dead ends).
    pub dissipated: f32,
    /// Per-tick ledger snapshot `[emitted, delivered(sunk), stored, dissipated]`
    /// — what the conservation chart plots. Same length as `history` while the
    /// invariant is declared; empty when a model declines conservation (axis D
    /// = `None`), since there is then no mass ledger to plot.
    pub ledger_history: Vec<[f32; 4]>,
}

impl Circuit {
    pub fn reset(&mut self) {
        for n in &mut self.nodes {
            n.storage = n.initial_storage;
            n.activity = 0.0;
            n.total = 0.0;
            n.spark.clear();
        }
        self.tick = 0;
        self.time = 0.0;
        self.history.clear();
        self.ledger_history.clear();
        self.emitted = 0.0;
        self.sunk = 0.0;
        self.dissipated = 0.0;
    }

    /// The wire graph's algebraic cycle, if it has one: a loop every element
    /// of which computes its output from same-step input, with no
    /// state-determined (Moore) anchor — no stock level read, no gradient, no
    /// source — anywhere on it. Such a composite has no total deterministic
    /// semantics (SSV, *Dynamical Systems and Sheaves*, Ex 4.2.9), so the
    /// engine names it rather than silently inserting a delay to make it
    /// computable (#259). `None` = every loop is anchored and the circuit is
    /// well-posed.
    pub fn algebraic_cycle(&self) -> Option<Vec<usize>> {
        self.eval_order().err()
    }

    /// The same-step dependency order for the instantaneous-wire engine
    /// (#259): node `i` before node `j` whenever `j`'s activity reads `i`'s
    /// activity this step. Ok = a topological order; Err = the nodes of an
    /// algebraic cycle (plus anything waiting on it).
    ///
    /// A dependency edge exists for every pushed wire EXCEPT where the
    /// receiver reads state rather than input:
    /// - observation taps read a stock's start-of-step LEVEL — no edge;
    /// - gradient wires read start-of-step levels — no edge;
    /// - a Buffering receiver's release reads start-of-step storage, so a
    ///   physical inflow is no dependency (its Message gate still is);
    /// - a Source's emission ignores inflow — no edge.
    ///
    /// Plus the back-pressure edges: a producer feeding a back-pressured
    /// valve scales by that valve's demand gate, so it depends on the gate's
    /// control senders.
    fn eval_order(&self) -> Result<Vec<usize>, Vec<usize>> {
        let n = self.nodes.len();
        let mut out_edges: Vec<Vec<usize>> = vec![Vec::new(); n];
        let mut indegree = vec![0usize; n];
        let mut add = |from: usize, to: usize| {
            out_edges[from].push(to);
            indegree[to] += 1;
        };
        for w in &self.wires {
            if w.mode != FlowMode::Pushed || self.is_observation(w) {
                continue;
            }
            let receiver_reads_state = matches!(self.nodes[w.to].kind, NodeKind::Source)
                || (matches!(
                    self.nodes[w.to].kind,
                    NodeKind::Process(ProcessPrimitive::Buffering)
                ) && self.wire_substance(w) != SubstanceType::Message);
            if !receiver_reads_state {
                add(w.from, w.to);
            }
            // Back-pressure: the wire's SENDER scales by the receiving valve's
            // demand gate, so it depends on that valve's control senders.
            if self.wire_substance(w) != SubstanceType::Message
                && matches!(
                    self.nodes[w.to].kind,
                    NodeKind::Process(ProcessPrimitive::Modulating)
                )
                && self.nodes[w.to].back_pressure
            {
                for c in &self.wires {
                    if c.to == w.to
                        && c.mode == FlowMode::Pushed
                        && self.wire_substance(c) == SubstanceType::Message
                    {
                        add(c.from, w.from);
                    }
                }
            }
        }
        let mut order = Vec::with_capacity(n);
        let mut queue: VecDeque<usize> = (0..n).filter(|&i| indegree[i] == 0).collect();
        while let Some(i) = queue.pop_front() {
            order.push(i);
            for &j in &out_edges[i] {
                indegree[j] -= 1;
                if indegree[j] == 0 {
                    queue.push_back(j);
                }
            }
        }
        if order.len() == n {
            Ok(order)
        } else {
            Err((0..n).filter(|&i| indegree[i] > 0).collect())
        }
    }

    /// Σ stock across all nodes.
    pub fn stored(&self) -> f32 {
        self.nodes.iter().map(|n| n.storage).sum()
    }

    /// Conservation residual. ≈0 (float noise) means every unit of physical
    /// mass is accounted: emissions plus starting stocks equal what's stored,
    /// sunk, or dissipated through declared channels. Nothing rides "in
    /// flight" between steps — wires transmit within the step (#259); only
    /// stocks carry mass across a step boundary. Anything else is a leak —
    /// a bug by definition. (Editing a stock mid-run moves the baseline;
    /// Reset re-baselines.)
    pub fn balance(&self) -> f32 {
        let baseline: f32 = self.nodes.iter().map(|n| n.initial_storage).sum();
        self.emitted + baseline - (self.stored() + self.sunk + self.dissipated)
    }

    /// Conserved kind carried by a wire: the wire's own declared substance
    /// when it has one (a multi-outflow sender's flows may differ, bert#111),
    /// else the base of the sender's declared output substance.
    pub fn wire_substance(&self, w: &Wire) -> SubstanceType {
        w.substance_override
            .unwrap_or(self.nodes[w.from].out_substance.base)
    }

    /// A PUSHED wire Buffer → Sensing is an observation tap: the sensor reads
    /// the stock's LEVEL without draining it ("sensing is very low power").
    /// A gradient wire into a sensor is a real drain, not a tap.
    pub fn is_observation(&self, w: &Wire) -> bool {
        w.mode == FlowMode::Pushed
            && matches!(
                self.nodes[w.from].kind,
                NodeKind::Process(ProcessPrimitive::Buffering)
            )
            && matches!(
                self.nodes[w.to].kind,
                NodeKind::Process(ProcessPrimitive::Sensing)
            )
    }

    /// Amount delivered over wire `k` this tick — the per-wire truth the view
    /// draws (thickness, label, pulses): a gradient wire carries its rate law
    /// k·Δlevel, an observation tap reads the stock, a pushed physical flow
    /// splits across the fanout (a conserved split LOOKS conserved), Message
    /// replicates. `step()` delegates its pushed-wire arithmetic here; the
    /// gradient case omits only the buffer over-drain cap (step applies that
    /// to its own capped rates).
    /// The porosity coefficient applied to a boundary-crossing inbound flow
    /// (bert-lenses#54). A crossing flow is one a Source emits across the root
    /// boundary; its rate is scaled by the authored porosity so a semi-permeable
    /// membrane gates what enters the bounded system. The convention is
    /// deliberate and honest: porosity `0.0` is the kernel's UNAUTHORED default
    /// (`canvas.rs`), so it means "no effect" (factor `1.0`), NOT "sealed" — only
    /// a nonzero value attenuates. This is our modeling choice (Mobus leaves P's
    /// form open, §4.3; the Lean keeps P parametric), credited as such. Internal
    /// (process→process) flows never cross the boundary and are untouched.
    fn crossing_factor(&self, wire_from: usize) -> f32 {
        if self.porosity > 0.0 && matches!(self.nodes[wire_from].kind, NodeKind::Source) {
            self.porosity
        } else {
            1.0
        }
    }

    /// Display/inspection amount for wire `k`, from committed node state (the
    /// last completed step's activities). The engine itself uses
    /// `delivery_share` with the SAME-STEP activities (#259).
    pub fn wire_amount(&self, k: usize) -> f32 {
        let w = &self.wires[k];
        if w.mode == FlowMode::Gradient {
            return if self.has_potential(w.from) {
                self.crossing_factor(w.from)
                    * (w.conductance * (self.level(w.from) - self.level(w.to))).max(0.0)
            } else {
                0.0
            };
        }
        if self.is_observation(w) {
            return self.nodes[w.from].storage; // non-draining level read
        }
        self.delivery_share(k, self.nodes[self.wires[k].from].activity)
    }

    /// What pushed wire `k` delivers when its sender's activity this step is
    /// `sender_activity` — the fanout rule (Message replicates; physical
    /// splits, weighted or uniform; a source wire carries its declared rate's
    /// share). Pushed, non-observation wires only.
    fn delivery_share(&self, k: usize, sender_activity: f32) -> f32 {
        let w = &self.wires[k];
        let sender = &self.nodes[w.from];
        if matches!(sender.kind, NodeKind::Sink) {
            return 0.0; // a sink is terminal — absorbed mass never re-emits
        }
        // Pushed fanout splits the sender's activity across pushed,
        // non-observation outwires only (gradient/observation excluded).
        // Message replicates to every receiver (information copies);
        // Energy/Material split across the fanout (matter doesn't) —
        // which is also why Copying relabeled to a physical substance
        // splits rather than duplicating.
        if self.wire_substance(w) == SubstanceType::Message {
            return sender_activity;
        }
        if matches!(sender.kind, NodeKind::Source) {
            // Weighted fanout (bert#111): a source wire with a declared rate
            // delivers that rate; activity stays the TOTAL emission, so the
            // proportional form below scales every wire alike under
            // back-pressure and reduces to the uniform split when no rate
            // is declared anywhere.
            let emission = self.source_emission(w.from);
            return if emission > 0.0 {
                self.crossing_factor(w.from) * sender_activity * self.source_wire_rate(k) / emission
            } else {
                0.0
            };
        }
        // Weighted split (bert-lenses#16 → rung 2): a process divides its
        // activity across its pushed outwires in proportion to per-wire WEIGHTS
        // when any is declared — the computed-interior capability. A splitter
        // reads the same per-wire quantity a Source reads as a rate, but as a
        // RELATIVE weight (Mobus Eq. 4.5 edge attribute), and it may be a series
        // (rung-1 infra) so the allocation can vary per tick. Shares sum to the
        // activity, so mass is conserved. With NO weight declared this reduces
        // to the uniform split — byte-for-byte the old behavior.
        let outwires: Vec<usize> = (0..self.wires.len())
            .filter(|&j| {
                let x = &self.wires[j];
                x.from == w.from && x.mode == FlowMode::Pushed && !self.is_observation(x)
            })
            .collect();
        let total_weight: f32 = outwires
            .iter()
            .filter_map(|&j| self.wire_declared_rate(j))
            .sum();
        if total_weight > 0.0 {
            return sender_activity * self.wire_declared_rate(k).unwrap_or(0.0) / total_weight;
        }
        sender_activity / (outwires.len().max(1) as f32)
    }

    /// The outwires bert#111 quantifies: pushed, non-observation, physical
    /// (mass-carrying) wires out of node `i` — the set a source's emission
    /// distributes over.
    fn source_outwires(&self, i: usize) -> impl Iterator<Item = usize> + '_ {
        (0..self.wires.len()).filter(move |&k| {
            let w = &self.wires[k];
            w.from == i
                && w.mode == FlowMode::Pushed
                && !self.is_observation(w)
                && self.wire_substance(w) != SubstanceType::Message
        })
    }

    /// A wire's declared emission for the CURRENT tick. A forced wire (#16)
    /// reads its observed series at the current MODEL TIME, holding the last
    /// value once time passes the series' end (data horizon — projection, not
    /// error, #34); an empty series is treated as no series. Otherwise the
    /// constant `rate`. `None` = undeclared (the caller falls back to the
    /// param split).
    fn wire_declared_rate(&self, k: usize) -> Option<f32> {
        let w = &self.wires[k];
        if let Some(series) = &w.rate_series {
            if !series.is_empty() {
                // Zero-order hold at the channel's own Δt (rung 3): each sample
                // spans `dt_stride` time units, so a slow channel holds each
                // real value between its (e.g. annual) updates. Indexed by
                // model time, never tick count — the series is data over time,
                // and refining Δt must not consume it faster (#258). At the
                // default dt = 1.0 this is `tick / stride`, unchanged.
                let stride = w.dt_stride.unwrap_or(1).max(1) as f32;
                let idx = ((self.time / stride) as usize).min(series.len() - 1);
                return Some(series[idx]);
            }
        }
        w.rate
    }

    /// Declared emission for source outwire `k`: the wire's own rate for this
    /// tick (Mobus Eq. 4.5 — rate is an edge attribute; forced wires vary it
    /// per tick, #16), else an equal share of the node's `param` among the
    /// undeclared outwires — exactly the pre-#111 uniform split when nothing
    /// is declared.
    fn source_wire_rate(&self, k: usize) -> f32 {
        if let Some(r) = self.wire_declared_rate(k) {
            return r;
        }
        let from = self.wires[k].from;
        let undeclared = self
            .source_outwires(from)
            .filter(|&j| self.wire_declared_rate(j).is_none())
            .count()
            .max(1) as f32;
        self.nodes[from].param / undeclared
    }

    /// A source's total emission per tick: the sum of its per-wire declared
    /// rates, with the undeclared outwires collectively carrying `param`.
    /// With no declared rates (every hand-authored circuit) this is exactly
    /// `param`, byte-for-byte the old behavior — including for an
    /// outwire-less source, whose activity stays its param.
    pub fn source_emission(&self, i: usize) -> f32 {
        if self.source_outwires(i).next().is_none() {
            return self.nodes[i].param;
        }
        let declared: f32 = self
            .source_outwires(i)
            .filter_map(|k| self.wire_declared_rate(k))
            .sum();
        let any_undeclared = self
            .source_outwires(i)
            .any(|k| self.wire_declared_rate(k).is_none());
        declared
            + if any_undeclared {
                self.nodes[i].param
            } else {
                0.0
            }
    }

    /// Flow the Source-chosen substance forward: a pass-through node
    /// (`inherits_substance`) takes the substance of its physical inflow, so
    /// you declare "water" once at the Source and the tank/valve/splitter
    /// downstream inherit it — no per-node copies. Iterates until stable
    /// (physical edges form a DAG from sources). Cheap; call on edits.
    pub fn propagate_substances(&mut self) {
        for _ in 0..self.nodes.len() {
            let mut changed = false;
            for i in 0..self.nodes.len() {
                if !self.nodes[i].kind.inherits_substance() {
                    continue;
                }
                let inflow = self.wires.iter().find_map(|w| {
                    (w.to == i && self.nodes[w.from].out_substance.base != SubstanceType::Message)
                        .then(|| self.nodes[w.from].out_substance.clone())
                });
                if let Some(sub) = inflow {
                    if self.nodes[i].out_substance != sub {
                        self.nodes[i].out_substance = sub;
                        changed = true;
                    }
                }
            }
            if !changed {
                break;
            }
        }
    }

    /// A node's "level" (potential) for gradient-flow rate laws (Mobus Ch.4):
    /// a buffer's stock, a source's fixed potential (its rate), a sink's ground
    /// (0), else the node's last completed step's activity — levels are STATE,
    /// read at the step's opening, which is what lets gradient edges anchor
    /// loops (#259).
    pub fn level(&self, i: usize) -> f32 {
        match self.nodes[i].kind {
            NodeKind::Source => self.nodes[i].param,
            NodeKind::Sink => 0.0,
            NodeKind::Process(ProcessPrimitive::Buffering) => self.nodes[i].storage,
            _ => self.nodes[i].activity,
        }
    }

    /// A node has a potential — something a gradient flow can fall from —
    /// only if it's a Source (fixed potential) or a Buffering stock. A
    /// gradient wire from anything else would read mass off a transient
    /// activity that nothing drains (creating matter), so those wires are
    /// inert; `inert_gradient_wires()` surfaces them.
    pub fn has_potential(&self, i: usize) -> bool {
        matches!(
            self.nodes[i].kind,
            NodeKind::Source | NodeKind::Process(ProcessPrimitive::Buffering)
        )
    }

    /// One step at the model's own Δt (`dt = 1.0`, one time unit per step).
    ///
    /// Kept so the 60-odd call sites that mean "advance one tick of this level"
    /// stay unchanged. Mobus §4.3.3.6: Δt is a property of the LEVEL — "a time
    /// interval relevant to the level of the system of interest", generally an
    /// integer multiple of the level's lowest relevant time constant — so
    /// `dt = 1.0` is the ordinary case, not a default standing in for a missing
    /// value.
    pub fn step(&mut self) {
        self.step_dt(1.0);
    }

    /// One step advancing `dt` of the model's declared time unit (#258).
    ///
    /// Rates are per time unit, not per tick, so a flux GENERATED from a rate
    /// scales by `dt`. Transport does not: a process passes on what it received,
    /// and a level read reports a state. Scaling both would double-count. The
    /// three generators are Source emission, Buffer release, and the gradient
    /// term; everything downstream inherits their scaling.
    ///
    /// At `dt = 1.0` this is arithmetically identical to the previous behaviour,
    /// so every existing trajectory is unchanged — the fix only shows where the
    /// old code was wrong, which is any `dt != 1.0`.
    ///
    /// NB Δt is NOT a numerical refinement knob. Under Mobus it is level-indexed
    /// (the same index `l` as C/N/G/B/T), so halving it asserts a different
    /// level rather than integrating the same model more finely. `dt_invariance`
    /// checks DIMENSIONAL COHERENCE — that a rate means per-time — and should
    /// not be read as requiring numerical convergence.
    pub fn step_dt(&mut self, dt: f32) {
        // Instantaneous wires (#259): activities are computed in same-step
        // dependency order — wires transmit, stocks remember. A circuit with
        // an anchorless loop has no deterministic step (SSV Ex 4.2.9), so the
        // step is REFUSED — a no-op, surfaced via `algebraic_cycle()` — rather
        // than silently repaired with a delay nothing authored.
        let Ok(order) = self.eval_order() else {
            return;
        };
        let n = self.nodes.len();
        let nw = self.wires.len();

        // Axis D: run the mass ledger only when the model declares conservation
        // (the default). A declined invariant steps the identical transition
        // family with no accounting — see `Invariant`.
        let ledger = self.invariant.tracks_ledger();

        // Ledger deltas for this tick, committed at the end.
        let mut emitted_now = 0.0f32;
        let mut sunk_now = 0.0f32;
        let mut dissipated_now = 0.0f32;

        // (Dead ends need no pre-pass under instantaneous wires: an activity
        // no pushed outwire carries is charged as dissipated by the per-node
        // ledger rule below, same step.)

        // ── Gradient flows (Potential Fields): rate = conductance·(Δlevel),
        // forward-only, read from pre-tick levels (synchronous). Capped so a
        // buffer source can't drain below zero in one tick. ──
        let mut grad: Vec<f32> = self
            .wires
            .iter()
            .map(|w| {
                if w.mode == FlowMode::Gradient && self.has_potential(w.from) {
                    // Boundary porosity scales a source-fed crossing gradient
                    // (bert-lenses#54), mirroring `wire_amount`'s gradient path
                    // so display and run agree.
                    // × dt: conductance × Δlevel is a rate (#258)
                    dt * self.crossing_factor(w.from)
                        * (w.conductance * (self.level(w.from) - self.level(w.to))).max(0.0)
                } else {
                    0.0
                }
            })
            .collect();
        for i in 0..n {
            if !matches!(
                self.nodes[i].kind,
                NodeKind::Process(ProcessPrimitive::Buffering)
            ) {
                continue; // only buffers can over-drain; sources are fixed potentials
            }
            let idxs: Vec<usize> = (0..nw)
                .filter(|&k| self.wires[k].from == i && self.wires[k].mode == FlowMode::Gradient)
                .collect();
            let total: f32 = idxs.iter().map(|&k| grad[k]).sum();
            if total > self.nodes[i].storage && total > 0.0 {
                let scale = self.nodes[i].storage / total;
                for k in idxs {
                    grad[k] *= scale;
                }
            }
        }
        // Gradient outflow leaving each node (drains buffers).
        let gradient_out: Vec<f32> = (0..n)
            .map(|i| {
                (0..nw)
                    .filter(|&k| self.wires[k].from == i)
                    .map(|k| grad[k])
                    .sum()
            })
            .collect();

        // Amount delivered over wire index k THIS step, given the same-step
        // activities computed so far: pushed wires use the shared per-wire
        // delivery rule (`delivery_share` — fanout split, observation taps,
        // terminal sinks); gradient wires use this tick's CAPPED rates.
        let amount_on = |k: usize, act: &[f32]| -> f32 {
            let w = &self.wires[k];
            if w.mode == FlowMode::Gradient {
                grad[k]
            } else if self.is_observation(w) {
                self.nodes[w.from].storage // non-draining level read (state)
            } else {
                self.delivery_share(k, act[w.from])
            }
        };

        // Back-pressure: a throttled valve with `back_pressure` throttles its
        // UPSTREAM instead of shedding. Each such valve has a demand gate
        // (same-step control — the control chain hangs off a level read, so
        // it is already computed when the producer evaluates; `eval_order`
        // guarantees it); a Source/Buffer feeding it scales its output by
        // that gate, so the blocked flow is never produced/released (it stays
        // upstream) — nothing is shed, conservation holds by not creating it.
        let valve_gate = |v: usize, act: &[f32]| -> f32 {
            let ctrl: Vec<usize> = (0..nw)
                .filter(|&k| {
                    self.wires[k].to == v
                        && self.wires[k].mode == FlowMode::Pushed
                        && self.wire_substance(&self.wires[k]) == SubstanceType::Message
                })
                .collect();
            if ctrl.is_empty() {
                return 1.0; // no control = open
            }
            ctrl.iter()
                .map(|&k| act[self.wires[k].from])
                .sum::<f32>()
                .clamp(0.0, 1.0)
        };
        let bp_factor_of = |i: usize, act: &[f32]| -> f32 {
            (0..nw)
                .find_map(|k| {
                    let w = &self.wires[k];
                    let to_bp_valve = w.from == i
                        && w.mode == FlowMode::Pushed
                        && self.wire_substance(w) != SubstanceType::Message
                        && matches!(
                            self.nodes[w.to].kind,
                            NodeKind::Process(ProcessPrimitive::Modulating)
                        )
                        && self.nodes[w.to].back_pressure;
                    to_bp_valve.then(|| valve_gate(w.to, act))
                })
                .unwrap_or(1.0)
        };

        let mut act = vec![0.0f32; n];
        let mut next_storage: Vec<f32> = self.nodes.iter().map(|x| x.storage).collect();
        let mut sink_add = vec![0.0f32; n];

        for &i in &order {
            let node = &self.nodes[i];
            let incoming: Vec<(SubstanceType, f32, bool)> = (0..nw)
                .filter(|&k| self.wires[k].to == i)
                .map(|k| {
                    (
                        self.wire_substance(&self.wires[k]),
                        amount_on(k, &act),
                        self.is_observation(&self.wires[k]),
                    )
                })
                .collect();
            // What the transfer function sees (observation level-reads count:
            // a sensor reads the stock).
            let physical: f32 = incoming
                .iter()
                .filter(|(s, _, _)| *s != SubstanceType::Message)
                .map(|(_, a, _)| a)
                .sum();
            let message: f32 = incoming
                .iter()
                .filter(|(s, _, _)| *s == SubstanceType::Message)
                .map(|(_, a, _)| a)
                .sum();
            let a = node.param; // agency capacity 0..1

            act[i] = match node.kind {
                // Emits its total rate — the sum of per-wire declared rates
                // (bert#111), param when none are declared — throttled to what
                // a downstream back-pressured valve will accept (the rest is
                // simply not produced).
                // × dt: a Source's param is a RATE per time unit (#258)
                NodeKind::Source => dt * self.source_emission(i) * bp_factor_of(i, &act),
                NodeKind::Sink => {
                    sink_add[i] = physical + message;
                    physical + message
                }
                NodeKind::Process(p) => match p {
                    // storage += inflow (incl. gradient in); −release (pushed
                    // out) −gradient_out (field-driven out). The gradient drain
                    // already left via its wires; subtract it from the stock.
                    ProcessPrimitive::Buffering => {
                        // Moore anchor (#259): release is computed from the
                        // START-OF-STEP stock — the state that cuts every loop
                        // through a buffer — and this step's inflow lands
                        // after. Forward Euler of Q̇ = in − release(Q), both
                        // sides evaluated at the step's opening state.
                        let gate = if self.wires.iter().any(|w| {
                            w.to == i
                                && w.mode == FlowMode::Pushed
                                && self.wire_substance(w) == SubstanceType::Message
                        }) {
                            message.clamp(0.0, 1.0)
                        } else {
                            1.0
                        };
                        // Release is the PUSHED outflow. It can only leave through
                        // a pushed, mass-carrying outwire — you can't pour out of a
                        // tank with no spout. Without one, the release would drain
                        // the stock into nowhere (mass destroyed). Gradient outwires
                        // are NOT spouts for release; they carry gradient_out above.
                        let has_pushed_outlet = (0..nw).any(|k| {
                            self.wires[k].from == i
                                && self.wires[k].mode == FlowMode::Pushed
                                && !self.is_observation(&self.wires[k])
                        });
                        if has_pushed_outlet {
                            // First-order drain (τ > 0): release ≈ stock/τ, an
                            // exponential decay / low-pass smoother. Else the
                            // fixed amount per tick. Either way capped by stock.
                            let base = if node.time_constant > 0.0 {
                                node.storage.max(0.0) / node.time_constant
                            } else {
                                node.release_rate
                            };
                            // Back-pressure: a downstream throttled valve holds
                            // the release back — the unspent part stays in the
                            // stock rather than draining and shedding.
                            //
                            // × dt (#258): `base` is a RATE either way — stock/τ
                            // is a first-order drain per time unit, and
                            // `release_rate` is per time unit by declaration. The
                            // cap stays OUTSIDE the scaling: you cannot release
                            // more than the opening stock holds (net of this
                            // step's gradient drain), however long the step.
                            (dt * base * gate * bp_factor_of(i, &act))
                                .min((node.storage - gradient_out[i]).max(0.0))
                        } else {
                            0.0
                        }
                        // Storage itself updates in the post-pass below: this
                        // step's inflow may come from a node evaluated later
                        // (inflow is no activity dependency — that is what
                        // makes the stock the loop's anchor).
                    }
                    ProcessPrimitive::Combining => physical,
                    ProcessPrimitive::Splitting => physical, // fanout divides on wires
                    ProcessPrimitive::Propelling => (physical + message) * a,
                    ProcessPrimitive::Impeding => (physical + message) * a,
                    // signal · gain, bounded by metered Energy — no free mass
                    ProcessPrimitive::Amplifying => {
                        let power: f32 = incoming
                            .iter()
                            .filter(|(s, _, _)| *s == SubstanceType::Energy)
                            .map(|(_, x, _)| x)
                            .sum();
                        let gain = 1.0 + 9.0 * a;
                        (message * gain).min(power)
                    }
                    // physical → signal (crosses substance, never drains)
                    ProcessPrimitive::Sensing => physical * a,
                    // primary gated by control in [0,1]; with no control wire
                    // the valve sits OPEN (gate 1) — same convention as the
                    // buffer's gate. A closed-by-default valve silently
                    // destroyed every physical inflow.
                    ProcessPrimitive::Modulating => {
                        if node.back_pressure {
                            // The throttling happened upstream (bp_factor), so
                            // the valve passes everything it received — no shed.
                            physical
                        } else {
                            let has_control = self.wires.iter().any(|w| {
                                w.to == i
                                    && w.mode == FlowMode::Pushed
                                    && self.wire_substance(w) == SubstanceType::Message
                            });
                            let gate = if has_control {
                                message.clamp(0.0, 1.0)
                            } else {
                                1.0
                            };
                            physical * gate
                        }
                    }
                    // Comparator: reference − measured (Mobus Fig 4.12). The
                    // setpoint defaults to 1.0, so this is the bare 1 − signal.
                    ProcessPrimitive::Inverting => (node.setpoint - message).max(0.0),
                    ProcessPrimitive::Copying => message,
                },
            };

        }

        // Deliveries against the FINISHED activity vector: a buffer's (or
        // source's) physical inflow may come from a node evaluated after it —
        // inflow is no activity dependency, that is what makes the stock the
        // loop's anchor — so all accounting reads the final amounts, never
        // the mid-loop ones. Observation reads excluded: a level read
        // delivers nothing.
        let delivered: Vec<f32> = (0..n)
            .map(|i| {
                (0..nw)
                    .filter(|&k| {
                        let w = &self.wires[k];
                        w.to == i
                            && self.wire_substance(w) != SubstanceType::Message
                            && !self.is_observation(w)
                    })
                    .map(|k| amount_on(k, &act))
                    .sum()
            })
            .collect();

        // Stocks integrate: opening stock + this step's inflow − release −
        // gradient drain − maintenance, clamped to capacity. The only place
        // physical mass crosses a step boundary.
        for i in 0..n {
            let node = &self.nodes[i];
            if !matches!(
                node.kind,
                NodeKind::Process(ProcessPrimitive::Buffering)
            ) {
                continue;
            }
            let mut storage = node.storage + delivered[i] - gradient_out[i] - act[i];
            // Maintenance respiration: a constant upkeep loss from the stock,
            // dissipated (never delivered). The ledger charges it
            // automatically — the stock falls but no outflow carries it.
            // Odum depreciation / Mobus Fig 3.17.
            if node.maintenance > 0.0 {
                storage -= node.maintenance.min(storage.max(0.0));
            }
            // Capacity: a bounded tank overflows. Clamping the stock makes
            // the conservation ledger's per-node rule charge the overflow as
            // dissipated by itself (dissipated = in − out − Δstorage, and
            // Δstorage is now the clamped change). 0.0 = unbounded.
            if node.capacity > 0.0 && storage > node.capacity {
                storage = node.capacity;
            }
            next_storage[i] = storage;
        }

        // The ledger rule (one rule, every node): whatever physical mass a
        // node was delivered and neither re-emits, passes down a gradient,
        // nor stores, it dissipated. Exact by construction — see module
        // docs for why each channel is intended. Skipped wholesale when the
        // model declines conservation (axis D) — the transition above stands
        // on its own; only the accounting is optional.
        if ledger {
            for i in 0..n {
                let node = &self.nodes[i];
                match node.kind {
                    // Inflow to a source has nowhere to go (the UI refuses these
                    // wires; ledgered defensively).
                    NodeKind::Source => dissipated_now += delivered[i],
                    NodeKind::Sink => sunk_now += delivered[i],
                    NodeKind::Process(_) => {
                        // Physical out only counts if a pushed, non-observation
                        // outwire actually carries it — an activity nothing
                        // reads is a dead end and dissipates this same step.
                        let has_outlet = (0..nw).any(|k| {
                            self.wires[k].from == i
                                && self.wires[k].mode == FlowMode::Pushed
                                && !self.is_observation(&self.wires[k])
                        });
                        let out_phys =
                            if node.out_substance.base == SubstanceType::Message || !has_outlet {
                                0.0
                            } else {
                                act[i]
                            };
                        dissipated_now += delivered[i]
                            - out_phys
                            - gradient_out[i]
                            - (next_storage[i] - node.storage);
                    }
                }
            }
        }

        // Emissions: physical mass actually delivered out of Sources this
        // step, over pushed and gradient wires alike — same-step amounts.
        if ledger {
            for k in 0..nw {
                let w = &self.wires[k];
                if matches!(self.nodes[w.from].kind, NodeKind::Source)
                    && self.wire_substance(w) != SubstanceType::Message
                {
                    emitted_now += amount_on(k, &act);
                }
            }
        }

        for (i, node) in self.nodes.iter_mut().enumerate() {
            node.activity = act[i];
            node.storage = next_storage[i];
            node.total += sink_add[i];
            let signal = if matches!(node.kind, NodeKind::Process(ProcessPrimitive::Buffering)) {
                node.storage
            } else {
                node.activity
            };
            node.spark.push_back(signal);
            if node.spark.len() > SPARK_CAP {
                node.spark.pop_front();
            }
        }
        if ledger {
            self.emitted += emitted_now;
            self.sunk += sunk_now;
            self.dissipated += dissipated_now;
        }
        self.tick += 1;
        self.time += dt;

        // Record the tick. A topology change invalidates prior columns.
        let width = 1 + self.nodes.len() * 3;
        if self.history.last().map(|r| r.len()) != Some(width) {
            self.history.clear();
            self.ledger_history.clear();
        }
        let mut row = Vec::with_capacity(width);
        row.push(self.tick as f32);
        for node in &self.nodes {
            row.push(node.activity);
            row.push(node.storage);
            row.push(node.total);
        }
        self.history.push(row);
        if ledger {
            self.ledger_history
                .push([self.emitted, self.sunk, self.stored(), self.dissipated]);
        }
    }

    /// The recorded run as CSV with raw node names. (The app exports via
    /// `csv_with` to carry lens names; this is the raw form used by tests and
    /// the sweep emitter.)
    #[allow(dead_code)]
    pub fn csv(&self) -> String {
        self.csv_with(|i| self.nodes[i].name.clone())
    }

    /// The recorded run as CSV: tick, then activity/storage/total per node.
    /// `label(i)` names column-group `i` — the app passes the lens reading so
    /// a domain run exports as "Quorum gate", "Treasury", not "Modulating 2".
    pub fn csv_with(&self, label: impl Fn(usize) -> String) -> String {
        let mut out = String::from("tick");
        for i in 0..self.nodes.len() {
            let name = label(i).replace(',', " ");
            out.push_str(&format!(",{name}.activity,{name}.storage,{name}.total"));
        }
        out.push('\n');
        for row in &self.history {
            let cells: Vec<String> = row.iter().map(|v| format!("{v}")).collect();
            out.push_str(&cells.join(","));
            out.push('\n');
        }
        out
    }

    /// Nodes wired to receive a substance they can't consume — the flow is
    /// silently ignored. Returns (node index, what it wants, what it's fed —
    /// as declared, so warnings can say "fed money (Material)").
    pub fn substance_mismatches(&self) -> Vec<(usize, SubstanceType, DeclaredSubstance)> {
        let mut out = Vec::new();
        for (i, node) in self.nodes.iter().enumerate() {
            for w in self.wires.iter().filter(|w| w.to == i) {
                let got = self.nodes[w.from].out_substance.clone();
                if !node.kind.consumes(got.base) {
                    // Report what it wants: the first substance it does consume.
                    let wants = [
                        SubstanceType::Message,
                        SubstanceType::Energy,
                        SubstanceType::Material,
                    ]
                    .into_iter()
                    .find(|s| node.kind.consumes(*s))
                    .unwrap_or(SubstanceType::Message);
                    out.push((i, wants, got));
                    break;
                }
            }
        }
        out
    }

    /// Amplifying with a signal but no Energy power: output is bounded to 0.
    /// A second, softer advisory (the node IS wired right, just underpowered).
    pub fn underpowered_amplifiers(&self) -> Vec<usize> {
        self.nodes
            .iter()
            .enumerate()
            .filter(|(i, n)| {
                matches!(n.kind, NodeKind::Process(ProcessPrimitive::Amplifying))
                    && self
                        .wires
                        .iter()
                        .any(|w| w.to == *i && self.wire_substance(w) == SubstanceType::Message)
                    && !self
                        .wires
                        .iter()
                        .any(|w| w.to == *i && self.wire_substance(w) == SubstanceType::Energy)
            })
            .map(|(i, _)| i)
            .collect()
    }

    /// Gradient wires drawn from a node with no potential (not a Source or a
    /// stock): a field needs a level to fall from, so these carry nothing.
    /// Surfaced so the wire doesn't read as mysteriously dead.
    pub fn inert_gradient_wires(&self) -> Vec<usize> {
        (0..self.wires.len())
            .filter(|&k| {
                self.wires[k].mode == FlowMode::Gradient && !self.has_potential(self.wires[k].from)
            })
            .collect()
    }

    /// Process nodes that receive flow but send it nowhere (no pushed
    /// outwire): their output evaporates each tick (ledgered as dissipated).
    /// Usually the model wants a Sink there. Buffers are exempt — a terminal
    /// stock legitimately accumulates.
    pub fn dead_ends(&self) -> Vec<usize> {
        self.nodes
            .iter()
            .enumerate()
            .filter(|(i, n)| {
                matches!(
                    n.kind,
                    NodeKind::Process(p) if p != ProcessPrimitive::Buffering
                ) && self.wires.iter().any(|w| w.to == *i)
                    && !self
                        .wires
                        .iter()
                        .any(|w| w.from == *i && w.mode == FlowMode::Pushed)
            })
            .map(|(i, _)| i)
            .collect()
    }

    /// SameKind (Systems/Core/Complexity.lean): two components are the same
    /// kind iff they act on exactly the same things and exactly the same
    /// things act on them. Returns the number of equivalence classes —
    /// component-kind diversity, derived from wiring alone.
    pub fn diversity(&self) -> usize {
        let profile = |i: usize| {
            let mut outs: Vec<usize> = self
                .wires
                .iter()
                .filter(|w| w.from == i)
                .map(|w| w.to)
                .collect();
            let mut ins: Vec<usize> = self
                .wires
                .iter()
                .filter(|w| w.to == i)
                .map(|w| w.from)
                .collect();
            outs.sort_unstable();
            ins.sort_unstable();
            (outs, ins)
        };
        let mut classes: Vec<(Vec<usize>, Vec<usize>)> = Vec::new();
        for i in 0..self.nodes.len() {
            let p = profile(i);
            if !classes.contains(&p) {
                classes.push(p);
            }
        }
        classes.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use glam::vec2 as pos2;

    fn node(kind: NodeKind) -> Node {
        Node::new(kind, 0, pos2(0.0, 0.0))
    }

    /// Law: mass is conserved end-to-end across source, buffer, and sink
    /// regardless of stock accumulation.
    /// Source → Buffer → Sink: the stock fills faster than it drains, state
    /// accumulates, and mass is conserved end to end.
    #[test]
    fn buffer_stores_state_and_conserves() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // rate 1.0
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].param = 2.0; // inflow 2/tick
        c.nodes[1].release_rate = 1.0; // outflow 1/tick
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::new(1, 2));
        for _ in 0..10 {
            c.step();
        }
        assert!(
            c.nodes[1].storage > 5.0,
            "stock accumulates: {}",
            c.nodes[1].storage
        );
        // Conservation: everything emitted is in the stock or the sink —
        // wires carry no state, so nothing is "in transit" between steps
        // (#259). Step 1 releases nothing (the stock opens empty; release
        // reads the opening state), steps 2–10 release 1 each: stock
        // 2 + 9·(2−1) = 11, sunk 9, and 11 + 9 = 20 = 10 steps × 2. Exact.
        assert!(
            (c.nodes[1].storage - 11.0).abs() < 1e-4,
            "stock integrates in − out from its opening state: {}",
            c.nodes[1].storage
        );
        assert!(
            (c.nodes[2].total - 9.0).abs() < 1e-4,
            "sink holds the released mass: {}",
            c.nodes[2].total
        );
        assert!(c.balance().abs() < 1e-4, "conserved: {}", c.balance());
    }

    /// Law: an undeclared wire's fallback rate never alters a sibling wire's
    /// declared rate, and total emission stays conserved.
    /// bert#111 fixture: a source with two outflows, one carrying a declared
    /// per-wire rate, emits each wire at its own rate — the undeclared
    /// sibling must not alter the declared one, and mass stays conserved.
    #[test]
    fn source_with_two_outflows_emits_per_wire_rates() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].param = 1.0; // the undeclared wire's fallback rate
        let mut declared = Wire::new(0, 1);
        declared.rate = Some(12.0);
        c.wires.push(declared);
        c.wires.push(Wire::new(0, 2)); // undeclared sibling
        c.step();
        assert!(
            (c.nodes[0].activity - 13.0).abs() < f32::EPSILON,
            "activity is TOTAL emission: {}",
            c.nodes[0].activity
        );
        assert!(
            (c.wire_amount(0) - 12.0).abs() < 1e-4,
            "declared wire delivers its own rate: {}",
            c.wire_amount(0)
        );
        assert!(
            (c.wire_amount(1) - 1.0).abs() < 1e-4,
            "undeclared wire falls back to param: {}",
            c.wire_amount(1)
        );
        for _ in 0..9 {
            c.step();
        }
        assert!(c.balance().abs() < 1e-3, "conserved: {}", c.balance());
        assert!(
            c.nodes[1].total > 10.0 * c.nodes[2].total,
            "deliveries reflect the 12:1 rates: {} vs {}",
            c.nodes[1].total,
            c.nodes[2].total
        );
    }

    /// Law: a forced wire delivers its rate series value-for-value each tick
    /// (never collapsing to a mean), holding the last value past the
    /// series' end, while mass stays conserved.
    /// bert-lenses#16: a forced source wire emits an OBSERVED series tick by
    /// tick — the green line must BEND through the series, not sit at a mean.
    /// Fixture is deliberately non-monotonic (spike then crash, the xAI shape)
    /// so a bug that froze on `series[0]` or collapsed to a mean would fail:
    /// a flat delivery cannot match [4, 8, 0.5]. Past the series' end the last
    /// value is held (data horizon, #34), and mass stays conserved throughout.
    #[test]
    fn forced_wire_delivers_series_tick_by_tick() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].param = 99.0; // must be IGNORED — the series governs, not param
        let mut forced = Wire::new(0, 1);
        forced.rate_series = Some(vec![4.0, 8.0, 0.5]); // spike then crash
        c.wires.push(forced);

        let expected = [4.0f32, 8.0, 0.5, 0.5]; // tick 3 holds the last value
        for (t, want) in expected.iter().enumerate() {
            c.step();
            assert!(
                (c.wire_amount(0) - want).abs() < 1e-4,
                "tick {t}: forced wire delivers series value {want}, got {}",
                c.wire_amount(0)
            );
            assert!(
                (c.nodes[0].activity - want).abs() < 1e-4,
                "tick {t}: source total emission tracks the series ({want}), got {}",
                c.nodes[0].activity
            );
        }
        // The delivery genuinely bent: three distinct levels, not one mean.
        assert!(c.balance().abs() < 1e-3, "conserved: {}", c.balance());
    }

    /// Law: a wire's own Δt (dt_stride) governs how often it samples its
    /// series — it holds each value for `stride` time units, independent of
    /// the numerical step.
    /// Rung 3 (multi-timescale): a forced wire with `dt_stride = s` samples its
    /// series once every `s` time units and holds the value between — the
    /// channel's own Δt = s × the model's time unit (Mobus's per-node Δt_{i,l},
    /// an integer multiple). A slow (stride-3) series [10,20,30] holds each
    /// value for 3 time units, then held-last past the end; conservation holds
    /// throughout.
    #[test]
    fn forced_wire_holds_series_at_its_own_dt() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // 0
        c.nodes.push(node(NodeKind::Sink)); // 1
        let mut slow = Wire::new(0, 1);
        slow.rate_series = Some(vec![10.0, 20.0, 30.0]);
        slow.dt_stride = Some(3); // one sample every 3 fast ticks
        c.wires.push(slow);

        // tick → expected held value: 0,1,2→10 ; 3,4,5→20 ; 6,7,8→30 ; 9→30 (held)
        let expected = [10.0f32, 10.0, 10.0, 20.0, 20.0, 20.0, 30.0, 30.0, 30.0, 30.0];
        for (t, want) in expected.iter().enumerate() {
            c.step();
            assert!(
                (c.wire_amount(0) - want).abs() < 1e-4,
                "tick {t}: slow channel holds {want}, got {}",
                c.wire_amount(0)
            );
        }
        assert!(c.balance().abs() < 1e-3, "slow channel conserves: {}", c.balance());
    }

    /// Law (#259): a wire transmits instantaneously — a memoryless process
    /// relays within the step, so a source → splitter → sink chain delivers
    /// end-to-end on the FIRST step and the pipeline stores no phantom mass.
    /// Wires carry no state; only stocks remember (VSL; Spivak–Tan eq. 11).
    /// The node indices deliberately REVERSE the flow direction: delivery
    /// follows dependency order, never authoring order, so an engine that
    /// merely evaluates by index (a hidden per-hop register) fails here.
    #[test]
    fn relay_is_instantaneous_within_a_step() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Sink)); // 0
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Splitting))); // 1
        c.nodes.push(node(NodeKind::Source)); // 2
        c.nodes[2].param = 6.0;
        c.wires.push(Wire::new(2, 1));
        c.wires.push(Wire::new(1, 0));
        c.step();
        assert!(
            (c.sunk - 6.0).abs() < 1e-4,
            "the first step delivers end-to-end, got sunk = {}",
            c.sunk
        );
        for _ in 1..30 {
            c.step();
        }
        assert!(
            (c.sunk - 180.0).abs() < 1e-3,
            "a 2-hop pipeline stores no phantom mass over 30 steps: {}",
            c.sunk
        );
        assert!(c.balance().abs() < 1e-3, "conserved: {}", c.balance());
    }

    /// Law (#261): the validate-side consumes table (bert-core) and the
    /// engine's are ONE table — a warning about what a primitive ignores is
    /// only true if the engine actually ignores it. Full cartesian check, so
    /// the two cannot drift.
    #[test]
    fn validate_consumes_table_matches_engine() {
        use bert_core::validate::primitive_consumes;
        use ProcessPrimitive::*;
        for p in [
            Buffering, Combining, Splitting, Amplifying, Modulating, Sensing, Inverting, Copying,
            Propelling, Impeding,
        ] {
            for s in [
                SubstanceType::Energy,
                SubstanceType::Material,
                SubstanceType::Message,
            ] {
                assert_eq!(
                    primitive_consumes(p, s),
                    NodeKind::Process(p).consumes(s),
                    "consumes tables drifted at {p:?} × {s:?}"
                );
            }
        }
    }

    /// Law (#259, Spivak–Tan Prop 4.4): zooming in is description, not
    /// dynamics — refining one relay into two chained relays leaves the
    /// run identical, tick for tick. Under the old per-hop-register engine
    /// this was FALSE (each drawn box added a step of delay), which is why
    /// it is asserted exactly, not within a tolerance.
    #[test]
    fn refining_a_relay_does_not_change_the_run() {
        let build = |hops: usize| {
            let mut c = Circuit::default();
            c.nodes.push(node(NodeKind::Source)); // 0
            c.nodes[0].param = 4.0;
            for _ in 0..hops {
                c.nodes
                    .push(node(NodeKind::Process(ProcessPrimitive::Splitting)));
            }
            c.nodes.push(node(NodeKind::Sink));
            for i in 0..=hops {
                c.wires.push(Wire::new(i, i + 1));
            }
            for _ in 0..15 {
                c.step();
            }
            c
        };
        let coarse = build(1);
        let fine = build(2);
        assert_eq!(
            coarse.ledger_history, fine.ledger_history,
            "one relay vs two chained relays: same ledger, every tick"
        );
        assert!((coarse.sunk - 60.0).abs() < 1e-3, "15 × 4 delivered exactly");
    }

    /// Law (#259): behavior is a property of the WIRING, not the authoring
    /// order — relabeling the nodes of a feedback circuit leaves the run
    /// identical. Guards the dependency-ordered evaluator against any
    /// index-order residue.
    #[test]
    fn node_numbering_is_not_dynamics() {
        // A regulated tank, authored in two different node orders.
        // perm maps role → index: [source, valve, stock, sensor, comparator]
        let build = |perm: [usize; 5]| {
            let [src, valve, stock, sensor, cmp] = perm;
            let mut nodes: Vec<(usize, NodeKind)> = vec![
                (src, NodeKind::Source),
                (valve, NodeKind::Process(ProcessPrimitive::Modulating)),
                (stock, NodeKind::Process(ProcessPrimitive::Buffering)),
                (sensor, NodeKind::Process(ProcessPrimitive::Sensing)),
                (cmp, NodeKind::Process(ProcessPrimitive::Inverting)),
            ];
            nodes.sort_by_key(|(i, _)| *i);
            let mut c = Circuit::default();
            for (_, kind) in nodes {
                c.nodes.push(node(kind));
            }
            c.nodes[src].param = 2.0;
            c.nodes[stock].release_rate = 0.5;
            c.nodes[sensor].param = 1.0;
            c.wires.push(Wire::new(src, valve));
            c.wires.push(Wire::new(valve, stock));
            c.wires.push(Wire::new(stock, sensor)); // observation tap
            c.wires.push(Wire::new(sensor, cmp));
            c.wires.push(Wire::new(cmp, valve)); // control closes the loop
            for _ in 0..20 {
                c.step();
            }
            (
                c.nodes[stock].storage,
                c.emitted,
                c.sunk,
                c.dissipated,
                c.balance(),
            )
        };
        let forward = build([0, 1, 2, 3, 4]);
        let reversed = build([4, 3, 2, 1, 0]);
        let shuffled = build([2, 4, 0, 3, 1]);
        assert_eq!(forward, reversed, "reversed labels, same physics");
        assert_eq!(forward, shuffled, "shuffled labels, same physics");
        assert!(forward.4.abs() < 1e-3, "conserved: {}", forward.4);
    }

    /// Law (#259): a loop with no state-determined element has no
    /// deterministic semantics (SSV Ex 4.2.9) — the engine NAMES it instead
    /// of silently inserting a per-step delay. An anchored loop (through a
    /// stock's level read, as in every real regulator) is well-posed.
    /// This refusal is the separating instance the per-hop-delay reading
    /// owes under the #258 design rule.
    #[test]
    fn all_memoryless_cycle_is_refused_anchored_loop_is_not() {
        // Two Copying processes feeding each other: pure relays, no state.
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Process(ProcessPrimitive::Copying))); // 0
        c.nodes.push(node(NodeKind::Process(ProcessPrimitive::Copying))); // 1
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::new(1, 0));
        assert!(
            c.algebraic_cycle().is_some(),
            "a loop of pure relays must be refused, not silently delayed"
        );

        // The homeostat's loop: source → valve → stock ⌐obs→ sensor →
        // comparator → valve control. Anchored at the stock's level read.
        let mut h = Circuit::default();
        h.nodes.push(node(NodeKind::Source)); // 0
        h.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Modulating))); // 1
        h.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 2
        h.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Sensing))); // 3
        h.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Inverting))); // 4
        h.wires.push(Wire::new(0, 1)); // supply → valve
        h.wires.push(Wire::new(1, 2)); // valve → stock
        h.wires.push(Wire::new(2, 3)); // stock → sensor (observation tap)
        h.wires.push(Wire::new(3, 4)); // sensor → comparator
        h.wires.push(Wire::new(4, 1)); // comparator closes the loop (gate)
        assert!(
            h.algebraic_cycle().is_none(),
            "a loop anchored at a level read is well-posed"
        );
    }

    /// Law: a forced series is data over MODEL TIME, not over ticks —
    /// refining Δt must not make a channel consume its data faster (#258).
    /// Each sample spans one time unit (× dt_stride), so at dt = 0.5 a
    /// sample is held for two half-steps and the mass emitted over a fixed
    /// horizon matches the dt = 1.0 run exactly.
    #[test]
    fn forced_series_is_anchored_to_model_time() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // 0
        c.nodes.push(node(NodeKind::Sink)); // 1
        let mut w = Wire::new(0, 1);
        w.rate_series = Some(vec![10.0, 20.0, 30.0]);
        c.wires.push(w);
        // Six half-steps cover the same 3-unit horizon as three whole steps.
        // The law is the GENERATION sequence — the per-step flux each sample
        // produces. Ledger totals over the same horizon are deliberately NOT
        // asserted here: the wire's one-STEP transport delay is Δt-sized, so
        // end-of-run in-transit mass differs by step size — that is #259's
        // wire-semantics question, not this indexing law.
        let expected = [5.0f32, 5.0, 10.0, 10.0, 15.0, 15.0];
        for (t, want) in expected.iter().enumerate() {
            c.step_dt(0.5);
            assert!(
                (c.nodes[0].activity - want).abs() < 1e-4,
                "half-step {t}: sample held per time unit gives {want}, got {}",
                c.nodes[0].activity
            );
        }
        assert!(c.balance().abs() < 1e-3, "conserved: {}", c.balance());
    }

    /// Law: an unset (or 1) dt_stride is the single-clock case — the series
    /// advances every tick, identical to unstrided forcing.
    /// Rung 3 back-compat: `dt_stride` unset (or 1) is the single-clock case —
    /// the series advances every tick, identical to rung-1 forcing.
    #[test]
    fn unset_stride_advances_every_tick() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes.push(node(NodeKind::Sink));
        let mut w = Wire::new(0, 1);
        w.rate_series = Some(vec![4.0, 8.0, 0.5]); // no dt_stride
        c.wires.push(w);
        let expected = [4.0f32, 8.0, 0.5, 0.5];
        for want in expected {
            c.step();
            assert!((c.wire_amount(0) - want).abs() < 1e-4, "every-tick: {want}, got {}", c.wire_amount(0));
        }
    }

    /// Law: a Splitting process divides inflow across outwires in exact
    /// proportion to their declared weights, conserving total mass.
    /// Rung 2 (computed interior): a Splitting process divides its inflow
    /// across outwires in proportion to per-wire WEIGHTS — the legible
    /// allocation capability. Weights [3,1] → a 75/25 split; mass conserved.
    #[test]
    fn splitter_divides_by_static_weights() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // 0
        c.nodes.push(node(NodeKind::Process(ProcessPrimitive::Splitting))); // 1
        c.nodes.push(node(NodeKind::Sink)); // 2
        c.nodes.push(node(NodeKind::Sink)); // 3
        c.nodes[0].param = 4.0; // 4 units/tick into the splitter
        c.wires.push(Wire::new(0, 1)); // wire 0
        let mut w_big = Wire::new(1, 2);
        w_big.rate = Some(3.0); // weight 3
        c.wires.push(w_big); // wire 1
        let mut w_small = Wire::new(1, 3);
        w_small.rate = Some(1.0); // weight 1
        c.wires.push(w_small); // wire 2
        for _ in 0..6 {
            c.step();
        }
        assert!(
            (c.wire_amount(1) - 3.0).abs() < 1e-3,
            "weight 3 of 4 → 3.0 delivered, got {}",
            c.wire_amount(1)
        );
        assert!(
            (c.wire_amount(2) - 1.0).abs() < 1e-3,
            "weight 1 of 4 → 1.0 delivered, got {}",
            c.wire_amount(2)
        );
        assert!(c.balance().abs() < 1e-3, "split conserves: {}", c.balance());
    }

    /// Law: a time-varying weight series shifts the split proportionally
    /// tick by tick, and the split still conserves mass.
    /// Rung 2: the allocation can VARY per tick — a weight series shifts the
    /// split legibly over time (the computed interior answers to a signal),
    /// reusing rung-1's per-wire series. Wire a's weight falls from 9 to 1
    /// while wire b holds at 1, so a's delivered share must shrink toward b's.
    #[test]
    fn splitter_weights_can_vary_per_tick() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // 0
        c.nodes.push(node(NodeKind::Process(ProcessPrimitive::Splitting))); // 1
        c.nodes.push(node(NodeKind::Sink)); // 2
        c.nodes.push(node(NodeKind::Sink)); // 3
        c.nodes[0].param = 4.0;
        c.wires.push(Wire::new(0, 1)); // wire 0
        let mut a = Wire::new(1, 2);
        a.rate_series = Some(vec![9.0, 9.0, 9.0, 1.0, 1.0, 1.0]); // weight falls 9 → 1
        c.wires.push(a); // wire 1
        let mut b = Wire::new(1, 3);
        b.rate = Some(1.0); // steady weight 1
        c.wires.push(b); // wire 2

        c.step();
        c.step(); // splitter warm; a's weight still high
        let early = c.wire_amount(1);
        for _ in 0..4 {
            c.step(); // advance past the weight drop
        }
        let late = c.wire_amount(1);
        assert!(
            early > late + 0.5,
            "the split follows the weight series: a's share falls {early} → {late} as its weight drops"
        );
        assert!(c.balance().abs() < 1e-3, "shifting split conserves: {}", c.balance());
    }

    /// Law: with no declared rates anywhere, a multi-outflow source splits
    /// its param uniformly across all wires.
    /// bert#111 back-compat: with no declared rates anywhere, a two-outflow
    /// source splits `param` uniformly — the pre-#111 behavior, unchanged.
    #[test]
    fn undeclared_fanout_still_splits_param_uniformly() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].param = 2.0;
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::new(0, 2));
        c.step();
        assert!(
            (c.nodes[0].activity - 2.0).abs() < f32::EPSILON,
            "activity stays param: {}",
            c.nodes[0].activity
        );
        assert!(
            (c.wire_amount(0) - 1.0).abs() < 1e-4 && (c.wire_amount(1) - 1.0).abs() < 1e-4,
            "uniform split preserved: {} / {}",
            c.wire_amount(0),
            c.wire_amount(1)
        );
    }

    /// Law: a closed sense-invert-modulate loop around a buffer keeps the
    /// stock bounded — negative feedback regulates rather than running away.
    /// Sensing + Inverting + Modulating around a Buffer = a homeostat: the
    /// control loop throttles inflow as the sensed level rises. The loop must
    /// regulate (bounded storage), not run away.
    #[test]
    fn negative_feedback_regulates() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // 0: supply
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Modulating))); // 1: valve
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 2: stock
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Sensing))); // 3: sensor
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Inverting))); // 4: controller
        c.nodes.push(node(NodeKind::Sink)); // 5
        c.nodes[0].param = 3.0;
        c.nodes[2].release_rate = 1.0;
        c.nodes[3].param = 0.2; // sensor gain k
        c.wires.push(Wire::new(0, 1)); // supply → valve
        c.wires.push(Wire::new(1, 2)); // valve → stock
        c.wires.push(Wire::new(2, 3)); // stock outflow sensed
        c.wires.push(Wire::new(3, 4)); // sensor → inverter
        c.wires.push(Wire::new(4, 1)); // control closes the loop (gate)
        c.wires.push(Wire::new(2, 5)); // stock → sink
        let mut peak: f32 = 0.0;
        for _ in 0..200 {
            c.step();
            peak = peak.max(c.nodes[2].storage);
        }
        assert!(
            c.nodes[2].storage < 100.0,
            "feedback keeps the stock bounded, got {}",
            c.nodes[2].storage
        );
        assert!(c.nodes[5].total > 0.0, "flow still reaches the sink");
    }

    /// Law: an amplifier cannot manufacture mass — its output is capped by
    /// the metered power actually available, not by the desired gain.
    /// Amplifying cannot manufacture mass: output is capped by metered power.
    #[test]
    fn amplifier_bounded_by_power() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // 0: signal source
        c.nodes.push(node(NodeKind::Source)); // 1: power source
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Amplifying))); // 2
        c.nodes.push(node(NodeKind::Sink)); // 3
        c.nodes[0].param = 1.0;
        c.nodes[0].out_substance = SubstanceType::Message.into();
        c.nodes[1].param = 2.5;
        c.nodes[1].out_substance = SubstanceType::Energy.into();
        c.nodes[2].param = 1.0; // gain 10
        c.wires.push(Wire::new(0, 2));
        c.wires.push(Wire::new(1, 2));
        c.wires.push(Wire::new(2, 3));
        for _ in 0..5 {
            c.step();
        }
        // desired = 1.0 * 10 = 10, but only 2.5 energy available
        assert!((c.nodes[2].activity - 2.5).abs() < f32::EPSILON);
    }

    /// Law: a substance/primitive mismatch (Material into a Message-only
    /// primitive, or vice versa) is always flagged as an advisory, never
    /// silently altered or swallowed.
    #[test]
    fn copying_material_is_flagged_not_swallowed() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // emits Material by default
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Copying)));
        c.wires.push(Wire::new(0, 1));
        let m = c.substance_mismatches();
        assert_eq!(m.len(), 1);
        assert_eq!(
            (m[0].0, m[0].1, m[0].2.base),
            (1, SubstanceType::Message, SubstanceType::Material)
        );
        // Amplifying fed Material is also flagged now (was silently zeroing).
        let mut amp = Circuit::default();
        amp.nodes.push(node(NodeKind::Source)); // Material
        amp.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Amplifying)));
        amp.wires.push(Wire::new(0, 1));
        assert_eq!(
            amp.substance_mismatches().len(),
            1,
            "Material -> Amplifying flagged"
        );
        // Splitting fed Message is flagged (you split matter, you copy info).
        let mut sp = Circuit::default();
        sp.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Copying)));
        sp.nodes[0].out_substance = SubstanceType::Message.into();
        sp.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Splitting)));
        sp.wires.push(Wire::new(0, 1));
        assert_eq!(
            sp.substance_mismatches().len(),
            1,
            "Message -> Splitting flagged"
        );
        // Setting the source to emit Message clears it.
        c.nodes[0].out_substance = SubstanceType::Message.into();
        assert!(c.substance_mismatches().is_empty());
    }

    /// Law: per-wire delivery obeys the substance's physics — a physical
    /// split divides the flow per wire, a Message replicates in full to
    /// every receiver, and an observation tap reads the source's level.
    /// wire_amount — the view's per-wire delivery: a physical split halves
    /// per wire (a conserved split LOOKS conserved), Message replicates to
    /// every receiver, an observation tap reads the stock.
    #[test]
    fn wire_amount_reports_per_wire_delivery() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Splitting)));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].param = 2.0;
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::new(1, 2));
        c.wires.push(Wire::new(1, 3));
        for _ in 0..5 {
            c.step();
        }
        assert!(
            (c.wire_amount(0) - 2.0).abs() < 1e-6,
            "source emits its rate"
        );
        assert!(
            (c.wire_amount(1) - 1.0).abs() < 1e-6 && (c.wire_amount(2) - 1.0).abs() < 1e-6,
            "physical split halves per wire: {} / {}",
            c.wire_amount(1),
            c.wire_amount(2)
        );

        let mut m = Circuit::default();
        m.nodes.push(node(NodeKind::Source));
        m.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Copying)));
        m.nodes.push(node(NodeKind::Sink));
        m.nodes.push(node(NodeKind::Sink));
        m.nodes[0].out_substance = SubstanceType::Message.into();
        m.wires.push(Wire::new(0, 1));
        m.wires.push(Wire::new(1, 2));
        m.wires.push(Wire::new(1, 3));
        for _ in 0..5 {
            m.step();
        }
        assert!(
            (m.wire_amount(1) - m.nodes[1].activity).abs() < 1e-6
                && (m.wire_amount(2) - m.nodes[1].activity).abs() < 1e-6,
            "Message replicates, never splits"
        );

        let mut o = Circuit::default();
        o.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        o.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Sensing)));
        o.nodes[0].initial_storage = 7.0;
        o.nodes[0].storage = 7.0;
        o.wires.push(Wire::new(0, 1));
        o.step();
        assert!(
            (o.wire_amount(0) - 7.0).abs() < 1e-3,
            "observation tap reads the level: {}",
            o.wire_amount(0)
        );
    }

    /// Law: each node's sparkline tracks its live signal — storage for a
    /// buffer, activity for everything else — capped at SPARK_CAP and
    /// cleared on reset.
    /// The sparkline ring: caps at SPARK_CAP, tracks the live signal (a
    /// buffer's storage, everything else's activity), clears on reset.
    #[test]
    fn spark_ring_caps_and_tracks_live_signal() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].param = 2.0;
        c.nodes[1].release_rate = 1.0;
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::new(1, 2));
        for _ in 0..100 {
            c.step();
        }
        for n in &c.nodes {
            assert_eq!(n.spark.len(), SPARK_CAP, "{}: ring caps", n.name);
        }
        assert_eq!(
            *c.nodes[1].spark.back().unwrap(),
            c.nodes[1].storage,
            "buffer's spark is its stock"
        );
        assert_eq!(
            *c.nodes[0].spark.back().unwrap(),
            c.nodes[0].activity,
            "source's spark is its activity"
        );
        c.reset();
        assert!(c.nodes[1].spark.is_empty(), "reset clears the ring");
    }

    #[test]
    fn csv_records_every_tick() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].param = 2.0;
        c.wires.push(Wire::new(0, 1));
        for _ in 0..3 {
            c.step();
        }
        let csv = c.csv();
        let lines: Vec<&str> = csv.lines().collect();
        assert_eq!(lines.len(), 4, "header + 3 ticks");
        assert!(lines[0].starts_with("tick,"));
        assert!(lines[0].contains(".activity"));
        c.reset();
        assert!(c.history.is_empty(), "reset clears the recording");
    }

    /// Law: a gradient (potential-field) wire between two buffers passively
    /// equalizes their stocks with no controller, conserving total mass.
    /// Gradient flow = Potential Fields. A full buffer wired by a gradient flow
    /// to an empty buffer equalizes (a battery discharging / two tanks), and
    /// total stock is conserved — no controller needed (passive homeostasis).
    #[test]
    fn gradient_flow_equalizes_and_conserves() {
        let mut c = Circuit::default();
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 0 full
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 1 empty
        c.nodes[0].initial_storage = 10.0;
        c.nodes[0].storage = 10.0;
        c.nodes[0].release_rate = 0.0; // no pushed release — gradient only
        c.nodes[1].release_rate = 0.0;
        c.wires.push(Wire::gradient(0, 1, 0.3));
        let total0 = c.nodes[0].storage + c.nodes[1].storage;
        for _ in 0..200 {
            c.step();
        }
        let (a, b) = (c.nodes[0].storage, c.nodes[1].storage);
        assert!((a - b).abs() < 0.1, "two tanks equalize: {a} vs {b}");
        assert!(
            (a + b - total0).abs() < 1e-3,
            "stock conserved: {} vs {total0}",
            a + b
        );
    }

    /// Law: a buffer's release rate cannot leak mass through a gradient-only
    /// outwire — without a pushed outlet, nothing is destroyed.
    /// A buffer with release but NO pushed outlet must not destroy mass —
    /// you can't pour out of a tank with no spout (a gradient outwire is a
    /// field, not a spout). Regression for the conservation bug Shingai found
    /// by raising release on a gradient-only buffer mid-run.
    #[test]
    fn release_without_pushed_outlet_conserves() {
        let mut c = Circuit::default();
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 0
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 1
        c.nodes[0].initial_storage = 20.0;
        c.nodes[0].storage = 20.0;
        c.nodes[0].release_rate = 1.4; // cranked, but its only outwire is gradient
        c.nodes[1].release_rate = 0.0;
        c.wires.push(Wire::gradient(0, 1, 0.25));
        let total0 = 20.0;
        for _ in 0..100 {
            c.step();
        }
        let total = c.nodes[0].storage + c.nodes[1].storage;
        assert!(
            (total - total0).abs() < 1e-3,
            "mass conserved despite release: {total}"
        );
        assert!(
            (c.nodes[0].storage - c.nodes[1].storage).abs() < 0.1,
            "still equalizes"
        );
    }

    /// Law: a buffer wired by a gradient to a fixed-potential source charges
    /// toward that potential, gradient shrinking as it fills.
    /// A source at fixed potential charges a buffer toward that potential
    /// (a capacitor charging), gradient shrinking as it fills.
    #[test]
    fn gradient_charges_toward_source_potential() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // fixed potential = param
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        c.nodes[0].param = 5.0;
        c.nodes[1].release_rate = 0.0;
        c.wires.push(Wire::gradient(0, 1, 0.3));
        for _ in 0..300 {
            c.step();
        }
        assert!(
            (c.nodes[1].storage - 5.0).abs() < 0.2,
            "charges to source potential"
        );
    }

    // ── Conservation invariant: the whole bug class at once ──────────────
    //
    // The class is "an outflow computed but not delivered, or an inflow
    // accepted but not stored" (splitter, copy, amplifier, buffer-release —
    // each found one at a time). The systematic catch: random circuits +
    // the ledger equation asserted every tick.

    /// xorshift64 — deterministic, dependency-free.
    struct Rng(u64);
    impl Rng {
        fn next(&mut self) -> u64 {
            let mut x = self.0;
            x ^= x << 13;
            x ^= x >> 7;
            x ^= x << 17;
            self.0 = x;
            x
        }
        fn f(&mut self) -> f32 {
            (self.next() % 1000) as f32 / 1000.0
        }
        fn pick(&mut self, n: usize) -> usize {
            (self.next() % n as u64) as usize
        }
    }

    fn assert_balanced(c: &Circuit, ctx: &str) {
        let scale = (c.emitted + c.nodes.iter().map(|n| n.initial_storage).sum::<f32>()).max(1.0);
        assert!(
            c.balance().abs() <= 1e-3 * scale,
            "{ctx}: tick {} leaks {} (emitted {}, stored {}, sunk {}, dissipated {})",
            c.tick,
            c.balance(),
            c.emitted,
            c.stored(),
            c.sunk,
            c.dissipated,
        );
    }

    /// Random circuit over the CONSERVATIVE node set (everything Material;
    /// no signal processors, no friction). `guarantee_outlets` retries until
    /// every non-sink node has an outwire (no dead ends).
    fn random_conservative(seed: u64, guarantee_outlets: bool) -> Circuit {
        use ProcessPrimitive::*;
        let mut r = Rng(seed | 1);
        let mut c = Circuit::default();
        for _ in 0..1 + r.pick(2) {
            let mut nd = node(NodeKind::Source);
            nd.param = 0.5 + 2.5 * r.f();
            c.nodes.push(nd);
        }
        let kinds = [Buffering, Splitting, Combining, Modulating];
        for _ in 0..2 + r.pick(5) {
            let k = kinds[r.pick(kinds.len())];
            let mut nd = node(NodeKind::Process(k));
            if k == Buffering {
                nd.release_rate = 2.0 * r.f();
                nd.initial_storage = 10.0 * r.f();
                nd.storage = nd.initial_storage;
            }
            c.nodes.push(nd);
        }
        for _ in 0..1 + r.pick(2) {
            c.nodes.push(node(NodeKind::Sink));
        }
        // Wires obey what the UI enforces: none into a Source, none out of a
        // Sink. Cycles, fanouts, and gradient wires (from potentials) allowed.
        let total = c.nodes.len();
        let targets: Vec<usize> = (0..total)
            .filter(|&i| !matches!(c.nodes[i].kind, NodeKind::Source))
            .collect();
        for i in 0..total {
            if matches!(c.nodes[i].kind, NodeKind::Sink) {
                continue;
            }
            for attempt in 0..1 + r.pick(2) {
                let t = targets[r.pick(targets.len())];
                if t == i {
                    if guarantee_outlets && attempt == 0 {
                        let t2 = *targets.iter().find(|&&x| x != i).unwrap();
                        c.wires.push(Wire::new(i, t2));
                    }
                    continue; // self-wires forbidden (sometimes leaves a dead end)
                }
                if r.f() < 0.25 && c.has_potential(i) {
                    c.wires.push(Wire::gradient(i, t, 0.1 + 0.4 * r.f()));
                    if guarantee_outlets
                        && !c
                            .wires
                            .iter()
                            .any(|w| w.from == i && w.mode == FlowMode::Pushed)
                    {
                        c.wires.push(Wire::new(i, t));
                    }
                } else {
                    c.wires.push(Wire::new(i, t));
                }
            }
        }
        c
    }

    /// Law: over the fully conservative primitive set with no dead ends, the
    /// ledger balances every tick and nothing dissipates.
    /// Property: over the conservative set with every node given an outlet,
    /// the ledger balances every tick AND nothing dissipates — there is no
    /// intended loss channel in this set, so any dissipation is a leak.
    #[test]
    fn conservation_property_strict() {
        for seed in 1..=300u64 {
            let mut c = random_conservative(seed.wrapping_mul(0x9E3779B97F4A7C15), true);
            for _ in 0..50 {
                c.step();
                assert_balanced(&c, &format!("strict seed {seed}"));
                assert!(
                    c.dissipated.abs() <= 1e-3 * c.emitted.max(1.0),
                    "strict seed {seed}: conservative circuit dissipated {} at tick {}",
                    c.dissipated,
                    c.tick
                );
            }
        }
    }

    /// Law: even with dead-end outputs allowed, the ledger stays exact every
    /// tick — dissipation is accounted for, not lost.
    /// Property: same set but dead ends allowed — mass may dissipate (it
    /// evaporates at the dangling node) but the ledger must still be exact.
    #[test]
    fn conservation_property_with_dead_ends() {
        for seed in 1..=300u64 {
            let mut c = random_conservative(seed.wrapping_mul(0xD1B54A32D192ED03), false);
            for _ in 0..50 {
                c.step();
                assert_balanced(&c, &format!("dead-end seed {seed}"));
            }
        }
    }

    /// Law: across the full primitive palette (friction, sensors, amplifiers,
    /// valves, signal sources), the ledger accounts every unit exactly, even
    /// though dissipation is expected.
    /// Property: the FULL palette — friction, sensors, amps, valves, signal
    /// sources, observation taps. Dissipation is expected; the ledger must
    /// still account every unit (any delivery double-count or undercount
    /// breaks the equation).
    #[test]
    fn conservation_property_full_palette() {
        for seed in 1..=300u64 {
            let mut r = Rng(seed.wrapping_mul(0xA0761D6478BD642F) | 1);
            let mut c = Circuit::default();
            for _ in 0..1 + r.pick(2) {
                let mut nd = node(NodeKind::Source);
                nd.param = 0.5 + 2.5 * r.f();
                if r.f() < 0.3 {
                    nd.out_substance = SubstanceType::Message.into();
                } else if r.f() < 0.3 {
                    nd.out_substance = SubstanceType::Energy.into();
                }
                c.nodes.push(nd);
            }
            for _ in 0..2 + r.pick(6) {
                let k = PALETTE[2 + r.pick(PALETTE.len() - 2)]; // any primitive
                let mut nd = node(k);
                if k == NodeKind::Process(ProcessPrimitive::Buffering) {
                    nd.release_rate = 2.0 * r.f();
                    nd.initial_storage = 10.0 * r.f();
                    nd.storage = nd.initial_storage;
                }
                c.nodes.push(nd);
            }
            for _ in 0..1 + r.pick(2) {
                c.nodes.push(node(NodeKind::Sink));
            }
            let total = c.nodes.len();
            let targets: Vec<usize> = (0..total)
                .filter(|&i| !matches!(c.nodes[i].kind, NodeKind::Source))
                .collect();
            for i in 0..total {
                if matches!(c.nodes[i].kind, NodeKind::Sink) {
                    continue;
                }
                for _ in 0..1 + r.pick(2) {
                    let t = targets[r.pick(targets.len())];
                    if t == i {
                        continue;
                    }
                    // Gradient wires from ANY node — anything a user can do,
                    // the engine must keep balanced (non-potentials → inert).
                    if r.f() < 0.2 {
                        c.wires.push(Wire::gradient(i, t, 0.1 + 0.4 * r.f()));
                    } else {
                        c.wires.push(Wire::new(i, t));
                    }
                }
            }
            for _ in 0..60 {
                c.step();
                assert_balanced(&c, &format!("full-palette seed {seed}"));
            }
        }
    }

    // ── Targeted probes: the checkpoint's known suspects ─────────────────

    /// Law: a sink is terminal — flow wired onward from it must never be
    /// re-emitted.
    /// A sink is terminal: wiring onward from it must re-emit nothing.
    #[test]
    fn sink_never_reemits() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        c.nodes[0].param = 2.0;
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::new(1, 2)); // illegal in UI; engine must not duplicate
        for _ in 0..20 {
            c.step();
            assert_balanced(&c, "sink re-emission");
        }
        assert!(
            c.nodes[2].storage.abs() < f32::EPSILON,
            "sink re-emitted into the buffer"
        );
    }

    /// Law: flow illegally wired into a Source is shed to the dissipation
    /// ledger, never silently destroyed.
    /// Flow wired into a Source (UI refuses; engine defends): the mass is
    /// shed to the ledger, not silently destroyed.
    #[test]
    fn inflow_to_source_is_ledgered() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes.push(node(NodeKind::Source));
        c.nodes[0].param = 2.0;
        c.wires.push(Wire::new(0, 1));
        for _ in 0..10 {
            c.step();
            assert_balanced(&c, "inflow to source");
        }
        assert!(c.dissipated > 0.0, "shed inflow must appear in the ledger");
    }

    /// Law: a gradient wire from a node with no potential is inert — it must
    /// never mint mass out of the sender's activity.
    /// A gradient wire from a node with no potential is inert — before this
    /// fix it minted mass off the sender's activity without draining anything.
    #[test]
    fn gradient_from_process_node_is_inert() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Splitting)));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        c.nodes.push(node(NodeKind::Sink)); // legit outlet for the splitter
        c.nodes[0].param = 3.0;
        c.nodes[2].release_rate = 0.0;
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::gradient(1, 2, 0.5)); // field from a non-potential
        c.wires.push(Wire::new(1, 3));
        assert_eq!(
            c.inert_gradient_wires(),
            vec![1],
            "advisory lists the inert wire"
        );
        for _ in 0..30 {
            c.step();
            assert_balanced(&c, "inert gradient");
        }
        assert!(
            c.nodes[2].storage.abs() < f32::EPSILON,
            "gradient from a non-potential minted {} mass",
            c.nodes[2].storage
        );
    }

    /// Law: an uncontrolled valve defaults open (passes flow through); once
    /// gated, the blocked portion is shed to the ledger, not destroyed.
    /// A valve with no control wire sits open (was: closed by default,
    /// destroying every inflow). With control it sheds — to the ledger.
    #[test]
    fn valve_open_without_control_sheds_with() {
        let mut open = Circuit::default();
        open.nodes.push(node(NodeKind::Source));
        open.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Modulating)));
        open.nodes.push(node(NodeKind::Sink));
        open.nodes[0].param = 2.0;
        open.wires.push(Wire::new(0, 1));
        open.wires.push(Wire::new(1, 2));
        for _ in 0..20 {
            open.step();
            assert_balanced(&open, "open valve");
        }
        assert!(
            open.nodes[2].total > 30.0,
            "uncontrolled valve passes flow through"
        );
        assert!(open.dissipated.abs() < 1e-3, "open valve sheds nothing");

        let mut gated = Circuit::default();
        gated.nodes.push(node(NodeKind::Source)); // 0 supply
        gated.nodes.push(node(NodeKind::Source)); // 1 control = 0.5
        gated
            .nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Modulating)));
        gated.nodes.push(node(NodeKind::Sink));
        gated.nodes[0].param = 2.0;
        gated.nodes[1].param = 0.5;
        gated.nodes[1].out_substance = SubstanceType::Message.into();
        gated.wires.push(Wire::new(0, 2));
        gated.wires.push(Wire::new(1, 2));
        gated.wires.push(Wire::new(2, 3));
        for _ in 0..20 {
            gated.step();
            assert_balanced(&gated, "gated valve");
        }
        assert!(
            gated.dissipated > 0.0,
            "the blocked half is ledgered, not lost"
        );
    }

    /// Law: output wired to nowhere evaporates onto the dissipation ledger
    /// and is surfaced as an advisory, never silently lost.
    /// Output wired to nowhere evaporates — but onto the ledger, with the
    /// dead end surfaced as an advisory.
    #[test]
    fn dead_end_is_ledgered_and_surfaced() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Combining)));
        c.nodes[0].param = 2.0;
        c.wires.push(Wire::new(0, 1)); // combiner output goes nowhere
        assert_eq!(c.dead_ends(), vec![1]);
        for _ in 0..20 {
            c.step();
            assert_balanced(&c, "dead end");
        }
        assert!(
            c.dissipated > 0.0,
            "evaporated output appears in the ledger"
        );
    }

    /// Law: the model's intended dissipations — friction loss and amplifier
    /// power draw — are always tracked in the ledger, never unaccounted.
    /// Friction (Propelling at η<1) and amplifier power draw are the model's
    /// intended dissipations — decided + documented in the module docs —
    /// and both are tracked.
    #[test]
    fn friction_and_amp_power_are_ledgered() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Propelling)));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].param = 2.0;
        c.nodes[1].param = 0.5; // η = 0.5: half arrives, half is friction
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::new(1, 2));
        for _ in 0..20 {
            c.step();
            assert_balanced(&c, "friction");
        }
        assert!(
            c.dissipated > 0.0 && (c.sunk - c.dissipated).abs() < 1.1,
            "η=0.5 splits evenly"
        );

        let mut amp = Circuit::default();
        amp.nodes.push(node(NodeKind::Source)); // 0 signal
        amp.nodes.push(node(NodeKind::Source)); // 1 power
        amp.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Amplifying)));
        amp.nodes.push(node(NodeKind::Sink));
        amp.nodes[0].param = 1.0;
        amp.nodes[0].out_substance = SubstanceType::Message.into();
        amp.nodes[1].param = 2.5;
        amp.nodes[1].out_substance = SubstanceType::Energy.into();
        amp.wires.push(Wire::new(0, 2));
        amp.wires.push(Wire::new(1, 2));
        amp.wires.push(Wire::new(2, 3));
        for _ in 0..20 {
            amp.step();
            assert_balanced(&amp, "amp power");
        }
        assert!(amp.dissipated > 0.0, "the metered power draw is ledgered");
    }

    /// Law: a Copying node relabeled to a physical substance splits its
    /// fanout instead of duplicating — matter cannot be copied.
    /// Matter doesn't copy: a Copying node relabeled to a physical substance
    /// splits across its fanout instead of duplicating to every receiver.
    #[test]
    fn matter_does_not_copy() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Copying)));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].param = 1.0;
        c.nodes[0].out_substance = SubstanceType::Message.into();
        c.nodes[1].out_substance = SubstanceType::Material.into(); // user relabel
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::new(1, 2));
        c.wires.push(Wire::new(1, 3));
        for _ in 0..10 {
            c.step();
        }
        assert!(
            (c.nodes[2].total - c.nodes[3].total).abs() < f32::EPSILON
                && c.nodes[2].total < c.tick as f32 * 0.51,
            "relabeled copy must split, not duplicate: {} + {}",
            c.nodes[2].total,
            c.nodes[3].total
        );
    }

    /// Law: a buffer with both pushed and gradient outflows conserves mass
    /// exactly, regardless of the mix.
    /// Mixed pushed + gradient outflow from one buffer — the checkpoint's
    /// remaining suspect — conserves exactly.
    #[test]
    fn mixed_pushed_and_gradient_buffer_conserves() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 1
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 2 gradient target
        c.nodes.push(node(NodeKind::Sink)); // 3 pushed target
        c.nodes[0].param = 1.5;
        c.nodes[1].initial_storage = 12.0;
        c.nodes[1].storage = 12.0;
        c.nodes[1].release_rate = 0.8;
        c.nodes[2].release_rate = 0.0;
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::gradient(1, 2, 0.3));
        c.wires.push(Wire::new(1, 3));
        for _ in 0..100 {
            c.step();
            assert_balanced(&c, "mixed buffer");
        }
        assert!(
            c.dissipated.abs() < 1e-2,
            "nothing dissipates in this circuit"
        );
    }

    /// Law: a named substance inherits its declared base type's physics
    /// exactly — it splits/conserves like Material or replicates like
    /// Message, with mismatch warnings carrying the human name.
    /// A named substance inherits its base physics exactly: money splits and
    /// conserves like Material; votes copy like Message; a mismatch warning
    /// carries the human name.
    #[test]
    fn named_substance_inherits_base_physics() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Splitting)));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes.push(node(NodeKind::Sink));
        let money = DeclaredSubstance::named("money", SubstanceType::Material, "$");
        c.nodes[0].out_substance = money.clone();
        c.nodes[1].out_substance = money;
        c.nodes[0].param = 4.0;
        c.wires.push(Wire::new(0, 1));
        c.wires.push(Wire::new(1, 2));
        c.wires.push(Wire::new(1, 3));
        for _ in 0..20 {
            c.step();
            assert_balanced(&c, "money splits");
        }
        assert!(
            (c.nodes[2].total - c.nodes[3].total).abs() < 1e-3,
            "equal shares"
        );
        assert!(c.dissipated.abs() < 1e-3, "money is conserved");

        let mut v = Circuit::default();
        v.nodes.push(node(NodeKind::Source));
        v.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Splitting)));
        v.nodes[0].out_substance =
            DeclaredSubstance::named("votes", SubstanceType::Message, "votes");
        v.wires.push(Wire::new(0, 1));
        let m = v.substance_mismatches();
        assert_eq!(m.len(), 1, "votes (Message) into a Splitter is flagged");
        assert_eq!(m[0].2.name, "votes", "the warning speaks the human name");
    }

    /// Law: a bounded buffer's stock clamps at capacity and the overflow is
    /// dissipated, with conservation holding every tick; capacity 0 means
    /// unbounded.
    /// Capacity: a bounded buffer fed faster than it releases fills to the
    /// ceiling and then overflows — the stock clamps at capacity and the
    /// excess is dissipated, conservation holding every tick. (Mobus Ch.4
    /// container capacity; overflow = Fig 3.17 waste.)
    #[test]
    fn capacity_clamps_and_overflow_is_dissipated() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        c.nodes[0].param = 3.0; // inflow 3/tick
        c.nodes[1].capacity = 5.0; // ceiling
        c.nodes[1].release_rate = 0.0; // no outlet — it just fills
        c.wires.push(Wire::new(0, 1));
        for _ in 0..20 {
            c.step();
            assert_balanced(&c, "capacity overflow");
        }
        assert!(
            (c.nodes[1].storage - 5.0).abs() < 1e-4,
            "stock clamps at capacity, got {}",
            c.nodes[1].storage
        );
        assert!(c.dissipated > 0.0, "the overflow is charged as dissipated");
        // Unbounded (capacity 0) keeps filling past 5 — the default is ∞.
        let mut u = Circuit::default();
        u.nodes.push(node(NodeKind::Source));
        u.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        u.nodes[0].param = 3.0;
        u.nodes[1].release_rate = 0.0;
        u.wires.push(Wire::new(0, 1));
        for _ in 0..20 {
            u.step();
        }
        assert!(
            u.nodes[1].storage > 5.0,
            "capacity 0 is unbounded: {}",
            u.nodes[1].storage
        );
    }

    /// Law: raising a controller's setpoint raises the homeostat's regulated
    /// level; the default setpoint reproduces the bare 1−signal control law.
    /// Setpoint: the controller's explicit reference. Raising it makes the
    /// homeostat hold a higher regulated stock; the default (1.0) reproduces
    /// the bare `1 − signal`. (Mobus Fig 4.12 comparator.)
    #[test]
    fn setpoint_raises_the_regulated_level() {
        use ProcessPrimitive::*;
        fn homeo(setpoint: f32) -> Circuit {
            let mut c = Circuit::default();
            c.nodes.push(node(NodeKind::Source)); // 0
            c.nodes.push(node(NodeKind::Process(Modulating))); // 1
            c.nodes.push(node(NodeKind::Process(Buffering))); // 2
            c.nodes.push(node(NodeKind::Sink)); // 3
            c.nodes.push(node(NodeKind::Process(Sensing))); // 4
            c.nodes.push(node(NodeKind::Process(Inverting))); // 5
            c.nodes[0].param = 3.0;
            c.nodes[2].release_rate = 1.0;
            c.nodes[4].param = 0.2;
            c.nodes[5].setpoint = setpoint;
            for (f, t) in [(0, 1), (1, 2), (2, 3), (2, 4), (4, 5), (5, 1)] {
                c.wires.push(Wire::new(f, t));
            }
            c
        }
        let tail_mean = |c: &mut Circuit| {
            let (mut sum, mut n) = (0.0f32, 0);
            for t in 0..300 {
                c.step();
                if t >= 150 {
                    sum += c.nodes[2].storage;
                    n += 1;
                }
            }
            sum / n as f32
        };
        let lo = tail_mean(&mut homeo(1.0));
        let hi = tail_mean(&mut homeo(2.0));
        assert!(
            hi > lo + 2.0,
            "higher setpoint → higher held level: {lo:.1} vs {hi:.1}"
        );
        assert!(
            (lo - 3.3).abs() < 1.5,
            "setpoint 1.0 = bare 1−signal behavior, got {lo:.1}"
        );
    }

    /// Law: a buffer with a time constant drains exponentially (first-order
    /// decay, shrinking steps) rather than at a fixed rate, and conserves
    /// mass either way.
    /// Time constant: a first-order buffer drains exponentially (release ≈
    /// stock/τ) — the step sizes SHRINK — versus the fixed-rate buffer's
    /// constant steps. Both conserve. (Mobus: Buffering smooths over time;
    /// first-order decay closes #85.)
    #[test]
    fn time_constant_drains_first_order() {
        fn drain(tc: f32, rate: f32) -> (Vec<f32>, f32) {
            let mut c = Circuit::default();
            c.nodes
                .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
            c.nodes.push(node(NodeKind::Sink));
            c.nodes[0].initial_storage = 30.0;
            c.nodes[0].storage = 30.0;
            c.nodes[0].time_constant = tc;
            c.nodes[0].release_rate = rate;
            c.wires.push(Wire::new(0, 1));
            let mut s = Vec::new();
            for _ in 0..15 {
                c.step();
                s.push(c.nodes[0].storage);
            }
            (s, c.balance())
        }
        // First-order: the drop per tick shrinks as the stock falls.
        let (fo, fo_bal) = drain(5.0, 0.0);
        let early = 30.0 - fo[0];
        let late = fo[8] - fo[9];
        assert!(
            late < early * 0.7,
            "first-order step shrinks: {early:.2} → {late:.2}"
        );
        assert!(fo_bal.abs() < 1e-3, "first-order drain conserves");
        // Fixed rate: constant drop per tick.
        let (lin, lin_bal) = drain(0.0, 6.0);
        let a = 30.0 - lin[0];
        let b = lin[2] - lin[3];
        assert!(
            (a - b).abs() < 0.5,
            "fixed-rate step is constant: {a:.2} vs {b:.2}"
        );
        assert!(lin_bal.abs() < 1e-3, "fixed-rate drain conserves");
    }

    /// Law: a stock's maintenance upkeep is always lost to dissipation,
    /// never delivered downstream, whether or not the stock is used.
    /// Maintenance respiration: a stock loses its upkeep every tick to
    /// dissipation — never delivered downstream — whether or not it's used.
    /// (Odum depreciation / Mobus Fig 3.17 maintenance energy.)
    #[test]
    fn maintenance_drains_to_waste_not_delivery() {
        let mut c = Circuit::default();
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        c.nodes[0].initial_storage = 10.0;
        c.nodes[0].storage = 10.0;
        c.nodes[0].maintenance = 1.0; // 1/tick upkeep
        c.nodes[0].release_rate = 0.0; // no delivery — pure upkeep loss
        for _ in 0..5 {
            c.step();
            assert_balanced(&c, "maintenance");
        }
        assert!(
            (c.nodes[0].storage - 5.0).abs() < 1e-4,
            "lost 1/tick to upkeep: {}",
            c.nodes[0].storage
        );
        assert!(
            (c.dissipated - 5.0).abs() < 1e-3,
            "the loss is dissipated, not delivered"
        );
        // With a sink wired, maintenance still goes to waste, NOT the sink:
        // less reaches the sink than would without upkeep.
        let drain_to_sink = |maint: f32| {
            let mut c = Circuit::default();
            c.nodes
                .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
            c.nodes.push(node(NodeKind::Sink));
            c.nodes[0].initial_storage = 10.0;
            c.nodes[0].storage = 10.0;
            c.nodes[0].release_rate = 1.0;
            c.nodes[0].maintenance = maint;
            c.wires.push(Wire::new(0, 1));
            for _ in 0..20 {
                c.step();
            }
            c.nodes[1].total
        };
        assert!(
            drain_to_sink(0.5) < drain_to_sink(0.0),
            "upkeep skims from what reaches the sink"
        );
    }

    /// Law: substance identity propagates downstream from its declared
    /// source through pass-through nodes; the source itself is never
    /// overwritten.
    /// Substance inheritance: declare it once at the Source and the
    /// pass-through nodes (buffer, splitter, …) take it from their inflow —
    /// no per-node copies. A signal node is never overwritten.
    #[test]
    fn substance_inherits_from_source() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Splitting)));
        c.nodes.push(node(NodeKind::Sink));
        c.nodes[0].out_substance = DeclaredSubstance::named("money", SubstanceType::Material, "$");
        // buffer + splitter start at their default (unnamed Material)
        for (f, t) in [(0, 1), (1, 2), (2, 3)] {
            c.wires.push(Wire::new(f, t));
        }
        c.propagate_substances();
        assert_eq!(
            c.nodes[1].out_substance.name, "money",
            "buffer inherits from source"
        );
        assert_eq!(
            c.nodes[2].out_substance.name, "money",
            "splitter inherits down the chain"
        );
        assert_eq!(
            c.nodes[0].out_substance.name, "money",
            "the source is never overwritten"
        );
    }

    /// Law: back-pressure throttles the upstream source to produce only what
    /// can pass, wasting nothing; without it, the blocked flow is shed —
    /// both conserve.
    /// Back-pressure: a throttled valve backs its flow up the chain instead
    /// of shedding it. With back-pressure the upstream Source emits only what
    /// passes (little waste); without it the valve sheds the blocked half.
    /// Both conserve every tick. (Mobus: Impeding has back-pressure.)
    #[test]
    fn back_pressure_throttles_upstream_not_sheds() {
        use ProcessPrimitive::*;
        fn run(bp: bool) -> (f32, f32) {
            let mut c = Circuit::default();
            c.nodes.push(node(NodeKind::Source)); // 0 water supply
            c.nodes.push(node(NodeKind::Source)); // 1 control signal
            c.nodes.push(node(NodeKind::Process(Modulating))); // 2 valve
            c.nodes.push(node(NodeKind::Sink)); // 3
            c.nodes[0].param = 2.0;
            c.nodes[1].param = 0.5; // gate to 50%
            c.nodes[1].out_substance = SubstanceType::Message.into();
            c.nodes[2].back_pressure = bp;
            for (f, t) in [(0, 2), (1, 2), (2, 3)] {
                c.wires.push(Wire::new(f, t));
            }
            for _ in 0..30 {
                c.step();
                assert_balanced(&c, if bp { "back-pressure" } else { "shed" });
            }
            (c.emitted, c.dissipated)
        }
        let (e_bp, d_bp) = run(true);
        let (e_shed, d_shed) = run(false);
        assert!(
            d_bp < 1.0,
            "back-pressure wastes ~nothing: dissipated {d_bp:.1}"
        );
        assert!(
            d_shed > d_bp + 10.0,
            "shed mode dumps the blocked half: {d_shed:.1} vs {d_bp:.1}"
        );
        assert!(
            e_bp < e_shed - 10.0,
            "back-pressure produces only what passes: emitted {e_bp:.1} vs {e_shed:.1}"
        );
    }

    /// Law: nodes with identical wiring profiles (same inputs, same outputs)
    /// count as one diversity class, not as separate individuals.
    #[test]
    fn diversity_from_wiring_alone() {
        let mut c = Circuit::default();
        c.nodes.push(node(NodeKind::Source)); // 0
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 1
        c.nodes
            .push(node(NodeKind::Process(ProcessPrimitive::Buffering))); // 2
        c.nodes.push(node(NodeKind::Sink)); // 3
                                            // both buffers fed by 0, both feed 3 → SameKind (identical profiles)
        for (f, t) in [(0, 1), (0, 2), (1, 3), (2, 3)] {
            c.wires.push(Wire::new(f, t));
        }
        assert_eq!(c.diversity(), 3, "source, {{buffer,buffer}}, sink");
    }

    // ── The dynamics contract (docs/design/dynamics-principled-position.md §4)
    // ─────────────────────────────────────────────────────────────────────
    //
    // Two laws bind every stepper the tool ships. Pinned here for the one
    // deterministic kind that exists today; a future `Dist(X)` kind inherits
    // the obligation with Chapman–Kolmogorov in place of the double-step law
    // (position §4 / §8). The opt-in ledger (axis D) rides the same seam.

    /// The live dynamical state T acts on: activity, storage, total per node,
    /// plus the support index (the tick). The recorded run — `history`,
    /// `ledger_history`, each node's `spark` ring — is H and is deliberately
    /// excluded, so the H-record law below can pollute it without touching what
    /// the transition sees.
    fn dyn_state(c: &Circuit) -> (u64, Vec<[f32; 3]>) {
        (
            c.tick,
            c.nodes
                .iter()
                .map(|n| [n.activity, n.storage, n.total])
                .collect(),
        )
    }

    /// **Semigroup axiom** — the kernel's dynamics contract (Mesarovic–Takahara
    /// Def 2.7 β; position §4 rule 1): "for every mode bert-lenses ships,
    /// φ_{t′t″} ∘ φ_{tt′} = φ_{tt″} (property test: step twice = step once with
    /// doubled span, for deterministic kinds)." On discrete unit support the
    /// family is generated by `step`, so composing `a` steps then `b` more must
    /// land bit-for-bit on the state reached by `a + b` steps from the same
    /// start. A stepper that read a wall-clock, an unseeded RNG, or the recorded
    /// history (see the next test) would break the composition.
    #[test]
    fn semigroup_double_step_law() {
        for seed in 1..=200u64 {
            let s = seed.wrapping_mul(0x2545F4914F6CDD1D);
            let a = 1 + (seed % 5) as usize;
            let b = 1 + (seed % 7) as usize;

            // `random_conservative` is deterministic in its seed, so these two
            // start identical — no `Clone` needed.
            let mut whole = random_conservative(s, true);
            for _ in 0..a + b {
                whole.step();
            }
            let mut parts = random_conservative(s, true);
            for _ in 0..a {
                parts.step();
            }
            for _ in 0..b {
                parts.step();
            }
            assert_eq!(
                dyn_state(&whole),
                dyn_state(&parts),
                "semigroup: seed {seed}, φ_{{{a}+{b}}} ≠ φ_{b} ∘ φ_{a}"
            );
        }
    }

    /// **H is a record, never an input to T** (position §4 rule 2): "if T reads
    /// H the semigroup axiom fails... any history-dependence must be folded into
    /// the carrier. If T needs the past, the state was misidentified." So we
    /// warm two identical circuits to the same live state, scribble on one's H —
    /// the `history` and `ledger_history` rows and every node's `spark` ring —
    /// leave the other's clean, step both, and demand the identical transition.
    #[test]
    fn history_is_a_record_not_an_input_to_t() {
        for seed in 1..=200u64 {
            let s = seed.wrapping_mul(0x9E3779B97F4A7C15);
            let warm = 3 + (seed % 6) as usize;

            let mut clean = random_conservative(s, true);
            let mut polluted = random_conservative(s, true);
            for _ in 0..warm {
                clean.step();
                polluted.step();
            }

            // Same carrier, divergent record: garbage into H only.
            let width = 1 + polluted.nodes.len() * 3;
            polluted.history.push(vec![9.9; width]);
            polluted.ledger_history.push([1e9, -1e9, 42.0, 7.0]);
            for nd in &mut polluted.nodes {
                nd.spark.push_back(123.456);
            }
            assert_eq!(
                dyn_state(&clean),
                dyn_state(&polluted),
                "warm carriers must match before the step (seed {seed})"
            );

            clean.step();
            polluted.step();
            assert_eq!(
                dyn_state(&clean),
                dyn_state(&polluted),
                "H-record: seed {seed}, a polluted history steered the transition"
            );
        }
    }

    /// Opt-in conservation ledger (position §3; the RBN unlock, §2 table
    /// "axis-D made optional"). Declining the invariant must leave the
    /// transition family bit-for-bit identical — same `Id` functor, same
    /// trajectory — and only switch the mass ledger off; the default stays
    /// conservation, so no existing model loses its accounting silently.
    #[test]
    fn declining_conservation_leaves_transitions_identical() {
        // The default is conservation, ledger live.
        assert!(Invariant::default().tracks_ledger());
        assert_eq!(Circuit::default().invariant, Invariant::ConservedAdditive);
        assert!(!Invariant::None.tracks_ledger());

        for seed in 1..=200u64 {
            let s = seed.wrapping_mul(0xD6E8FEB86659FD93);
            let mut conserved = random_conservative(s, true);
            let mut declined = random_conservative(s, true);
            declined.invariant = Invariant::None;
            for _ in 0..40 {
                conserved.step();
                declined.step();
            }
            assert_eq!(
                dyn_state(&conserved),
                dyn_state(&declined),
                "declining conservation changed the trajectory (seed {seed})"
            );
            // Declined: no mass ledger at all.
            assert!(
                declined.ledger_history.is_empty(),
                "declined run keeps no ledger history"
            );
            assert_eq!(
                [declined.emitted, declined.sunk, declined.dissipated],
                [0.0, 0.0, 0.0],
                "declined run accrues no ledger totals"
            );
            // Conserved (the default): ledgers every tick and still balances.
            assert_eq!(
                conserved.ledger_history.len(),
                conserved.history.len(),
                "conserved run ledgers every recorded tick"
            );
            assert_balanced(&conserved, &format!("opt-in default seed {seed}"));
        }
    }

    /// bert-lenses#54: an authored NONZERO porosity scales a boundary-crossing
    /// (source-fed) flow's magnitude and the mass that enters — the coefficient
    /// acts inside the run — and the ledger still conserves at the reduced
    /// influx.
    #[test]
    fn porosity_scales_source_crossing_and_conserves() {
        let build = |porosity: f32| {
            let mut c = Circuit {
                porosity,
                ..Default::default()
            };
            c.nodes.push(node(NodeKind::Source));
            c.nodes
                .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
            c.nodes.push(node(NodeKind::Sink));
            c.nodes[0].param = 10.0;
            c.wires.push(Wire::new(0, 1)); // Source → Buffer: crossing
            c.wires.push(Wire::new(1, 2)); // Buffer → Sink
            c
        };

        let mut open = build(0.0); // unauthored
        let mut half = build(0.5);
        for _ in 0..30 {
            open.step();
            half.step();
        }

        assert!(
            (open.wire_amount(0) - 10.0).abs() < 1e-4,
            "unauthored porosity delivers the full crossing rate: {}",
            open.wire_amount(0)
        );
        assert!(
            (half.wire_amount(0) - 5.0).abs() < 1e-4,
            "porosity 0.5 halves the crossing flow: {}",
            half.wire_amount(0)
        );
        assert!(
            (half.emitted - 0.5 * open.emitted).abs() < 1e-3,
            "only the porous fraction enters over the run: {} vs full {}",
            half.emitted,
            open.emitted
        );
        assert!(
            half.balance().abs() < 1e-3,
            "the run conserves at the attenuated influx: residual {}",
            half.balance()
        );
    }

    /// The convention, made explicit (bert-lenses#54): porosity `0.0` is the
    /// UNAUTHORED default (no effect), so it runs IDENTICALLY to a fully-porous
    /// `1.0` — only a value strictly between attenuates. Guards against reading
    /// `0.0` as "sealed".
    #[test]
    fn porosity_zero_equals_fully_porous_one() {
        let build = |porosity: f32| {
            let mut c = Circuit {
                porosity,
                ..Default::default()
            };
            c.nodes.push(node(NodeKind::Source));
            c.nodes
                .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
            c.nodes.push(node(NodeKind::Sink));
            c.nodes[0].param = 4.0;
            c.wires.push(Wire::new(0, 1));
            c.wires.push(Wire::new(1, 2));
            for _ in 0..20 {
                c.step();
            }
            c
        };
        assert_eq!(
            build(0.0).history,
            build(1.0).history,
            "unauthored (0.0) and fully-porous (1.0) produce the same run"
        );
    }

    /// Porosity touches ONLY source-fed boundary crossings: a circuit with no
    /// Source (an internal drain from a stock) runs byte-for-byte the same
    /// whatever the porosity, so internal flows are never scaled.
    #[test]
    fn porosity_leaves_internal_flows_untouched() {
        let build = |porosity: f32| {
            let mut c = Circuit {
                porosity,
                ..Default::default()
            };
            c.nodes
                .push(node(NodeKind::Process(ProcessPrimitive::Buffering)));
            c.nodes
                .push(node(NodeKind::Process(ProcessPrimitive::Propelling)));
            c.nodes.push(node(NodeKind::Sink));
            c.nodes[0].initial_storage = 12.0;
            c.nodes[0].storage = 12.0;
            c.nodes[0].release_rate = 2.0;
            c.nodes[1].param = 1.0;
            c.wires.push(Wire::new(0, 1)); // Buffer → Propel: internal
            c.wires.push(Wire::new(1, 2)); // Propel → Sink
            for _ in 0..15 {
                c.step();
            }
            c
        };
        assert_eq!(
            build(0.0).history,
            build(0.5).history,
            "no source to gate — porosity leaves an internal run identical"
        );
    }
}
