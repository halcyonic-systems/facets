//! Headless typed-ops spike (bert-lenses#9) — test-only, additive, no production
//! code path touched. Stands in for the future resident co-author: it authors
//! models purely through a typed-operation vocabulary — no canvas, no gestures,
//! no positions — and asks whether that vocabulary is complete.
//!
//! The vocabulary below is the *de-facto* one the canvas already exposes, read
//! straight out of `src/main.rs`'s gesture handlers (place = double-click empty;
//! relate = drag ring→target; birth-env = drag comp→empty; stamp = palette click;
//! bond/kind/reverse = B/K/R on a selected relation; delete = Delete). Every
//! verdict comes from the REAL validators (`validate_mode`, `validate_operational`)
//! and the REAL run engine (`bert_compose`); none is invented here.

// The vocabulary enum names the full de-facto op surface; a few variants
// (Unstamp / SetKind / Delete / CheckMode) are documented for completeness
// without a dedicated test exercising them, and some verdict fields are carried
// for the record rather than matched. That is the point of a completeness spike.
#![allow(dead_code)]

use super::*;
use bert_core::validate::Severity;

// ── The typed authoring vocabulary ───────────────────────────────────────
//
// Name-addressed, not id-addressed: a resident agent says "relate Sensor to
// Heater", never "relate id 3 to id 7". That is already a departure from the
// canvas, which addresses by the id under the cursor — the agent needs a naming
// layer the gestures never had to provide (FINDING).

#[derive(Clone, Debug)]
enum AuthorOp {
    /// Choose the active lens — this fixes the bert-core `Mode` the export stamps
    /// and the validators gate (Klir→Core, Bunge→Structural, Mobus→Operational).
    Lens(Lens),
    /// Place a component (canvas: double-click empty background). Name supplied
    /// up front — on the canvas naming is a *separate* keyboard-focus gesture.
    Place(&'static str),
    /// Draw a directed bond `from → to` (canvas: drag from a node's ring onto
    /// another node). Both endpoints must already exist.
    Relate { from: &'static str, to: &'static str },
    /// Birth an environment entity bonded to a component (canvas: drag a
    /// component onto empty space in Bunge/Mobus). Produces the bond `from → env`,
    /// i.e. the env lands on the *sink* side. There is no "birth a bare env" and
    /// no "birth a source" — see `Reverse`.
    BirthEnv { from: &'static str, env: &'static str },
    /// Stamp a Mobus work-process primitive onto a component (canvas: palette
    /// click). Writes the component's `AgentModel` — what the Operational rung reads.
    Stamp { target: &'static str, prim: ProcessPrimitive },
    /// Clear a component's primitive (canvas: eraser stamp).
    Unstamp { target: &'static str },
    /// Toggle a bond ⇄ mere relation (canvas: B on a selected relation).
    SetBond { from: &'static str, to: &'static str, bond: bool },
    /// Cycle a relation's connection kind toward `kind` (canvas: K).
    SetKind { from: &'static str, to: &'static str, kind: Kind },
    /// Reverse a relation's direction (canvas: R). The ONLY way to turn a
    /// birthed env from a sink into a source.
    Reverse { from: &'static str, to: &'static str },
    /// Delete a thing and its incident relations (canvas: Delete on selection).
    Delete(&'static str),

    // ── query / gate ops: verdicts sourced verbatim from the real validators ──
    /// Ask `validate_mode` at `target` — the systemhood verdict for that rung.
    CheckMode(Mode),
    /// Ask `validate_operational` — the executable-readiness verdict.
    CheckOperational,
    /// Build the circuit and record a run (native engine). Gated by
    /// `validate_operational` exactly as `CanvasApp::begin_run` gates it.
    Run { dt: f64, t: f64 },
}

/// A cited validator error — location / reason / hint carried through verbatim so
/// the refusal-loop can be judged on whether the citation is enough to repair from.
#[derive(Clone, Debug)]
struct Cited {
    location: String,
    reason: String,
    hint: Option<String>,
}

#[derive(Clone, Debug)]
enum Verdict {
    Placed,
    Related,
    /// An env was born; `source` records how `to_world_model` will read its
    /// orientation given the current bonds (the derived, not authored, identity).
    EnvBorn { source: bool },
    Stamped,
    Edited,
    Deleted,
    /// `validate_mode(target)` passed.
    ModeClean(Mode),
    /// `validate_operational` passed; the projected process/flow counts.
    OperationalClean { processes: usize, flows: usize },
    /// A recorded run: ticks and the conservation residual.
    RunOk { ticks: usize, residual: f32 },
}

#[derive(Clone, Debug)]
enum Refusal {
    /// Sourced from the real validators — the citations to repair from.
    Validator(Vec<Cited>),
    /// NOT a systemhood claim: the op vocabulary could not address the intent
    /// (a name did not resolve). An honest structural fact about the vocabulary,
    /// recorded, never dressed up as a validator verdict.
    Unaddressable(String),
}

// ── name resolution ──────────────────────────────────────────────────────

fn id_of(app: &CanvasApp, name: &str) -> Option<u64> {
    app.things.iter().find(|t| t.name == name).map(|t| t.id)
}

/// A relation between two named things, in either direction.
fn rel_between(app: &CanvasApp, from: &str, to: &str) -> Option<u64> {
    let a = id_of(app, from)?;
    let b = id_of(app, to)?;
    app.relations
        .iter()
        .find(|r| (r.a == a && r.b == b) || (r.a == b && r.b == a))
        .map(|r| r.id)
}

fn cite_operational(errs: Vec<OperationalError>) -> Refusal {
    Refusal::Validator(
        errs.into_iter()
            .map(|e| Cited { location: e.location, reason: e.reason, hint: e.hint })
            .collect(),
    )
}

// ── the single apply path ────────────────────────────────────────────────

/// Apply one typed op. Authoring ops mutate the kernel and return a structural
/// `Verdict`; gate ops route through the real validators/engine and return either
/// a `Verdict` or a `Refusal` carrying the validator's own citation.
fn apply(app: &mut CanvasApp, op: AuthorOp) -> Result<Verdict, Refusal> {
    let lens = || app.lens.expect("set a lens before authoring/checking");
    match op {
        AuthorOp::Lens(l) => {
            app.lens = Some(l);
            Ok(Verdict::Edited)
        }
        AuthorOp::Place(name) => {
            if id_of(app, name).is_some() {
                return Err(Refusal::Unaddressable(format!("name '{name}' already placed")));
            }
            let id = app.next_id;
            app.next_id += 1;
            app.things.push(Thing {
                id,
                name: name.to_string(),
                pos: egui::Pos2::ZERO, // canvas-only; irrelevant to every verdict
                role: Role::Component,
                primitive: None,
            });
            Ok(Verdict::Placed)
        }
        AuthorOp::Relate { from, to } => {
            let (Some(a), Some(b)) = (id_of(app, from), id_of(app, to)) else {
                return Err(Refusal::Unaddressable(format!("relate {from}->{to}: unknown endpoint")));
            };
            let id = app.next_id;
            app.next_id += 1;
            app.relations.push(Relation { id, a, b, name: String::new(), is_bond: true, kind: Kind::Unspecified });
            Ok(Verdict::Related)
        }
        AuthorOp::BirthEnv { from, env } => {
            let Some(a) = id_of(app, from) else {
                return Err(Refusal::Unaddressable(format!("birth-env from unknown component '{from}'")));
            };
            let env_id = app.next_id;
            app.next_id += 1;
            app.things.push(Thing {
                id: env_id,
                name: env.to_string(),
                pos: egui::Pos2::ZERO,
                role: Role::Environment,
                primitive: None,
            });
            let rid = app.next_id;
            app.next_id += 1;
            // Canvas gesture: bond originates at the component, so env is `b` — the
            // SINK side. A source cannot be birthed directly (the #1 gap).
            app.relations.push(Relation { id: rid, a, b: env_id, name: String::new(), is_bond: true, kind: Kind::Unspecified });
            Ok(Verdict::EnvBorn { source: false })
        }
        AuthorOp::Stamp { target, prim } => {
            let Some(id) = id_of(app, target) else {
                return Err(Refusal::Unaddressable(format!("stamp unknown '{target}'")));
            };
            app.set_primitive(id, Some(prim));
            Ok(Verdict::Stamped)
        }
        AuthorOp::Unstamp { target } => {
            let Some(id) = id_of(app, target) else {
                return Err(Refusal::Unaddressable(format!("unstamp unknown '{target}'")));
            };
            app.set_primitive(id, None);
            Ok(Verdict::Stamped)
        }
        AuthorOp::SetBond { from, to, bond } => {
            let Some(rid) = rel_between(app, from, to) else {
                return Err(Refusal::Unaddressable(format!("no relation {from}~{to}")));
            };
            app.relations.iter_mut().find(|r| r.id == rid).unwrap().is_bond = bond;
            Ok(Verdict::Edited)
        }
        AuthorOp::SetKind { from, to, kind } => {
            let Some(rid) = rel_between(app, from, to) else {
                return Err(Refusal::Unaddressable(format!("no relation {from}~{to}")));
            };
            // The canvas only cycles (K); a headless op can set directly.
            app.relations.iter_mut().find(|r| r.id == rid).unwrap().kind = kind;
            Ok(Verdict::Edited)
        }
        AuthorOp::Reverse { from, to } => {
            let Some(rid) = rel_between(app, from, to) else {
                return Err(Refusal::Unaddressable(format!("no relation {from}~{to}")));
            };
            let r = app.relations.iter_mut().find(|r| r.id == rid).unwrap();
            std::mem::swap(&mut r.a, &mut r.b);
            Ok(Verdict::Edited)
        }
        AuthorOp::Delete(name) => {
            let Some(id) = id_of(app, name) else {
                return Err(Refusal::Unaddressable(format!("delete unknown '{name}'")));
            };
            app.delete_thing(id);
            Ok(Verdict::Deleted)
        }
        AuthorOp::CheckMode(target) => {
            let wm = to_world_model(&app.things, &app.relations, lens());
            let result = validate_mode(&wm, target);
            if result.has_errors() {
                Err(Refusal::Validator(
                    result
                        .issues
                        .into_iter()
                        .filter(|i| i.severity == Severity::Error)
                        .map(|i| Cited { location: i.location, reason: i.message, hint: None })
                        .collect(),
                ))
            } else {
                Ok(Verdict::ModeClean(target))
            }
        }
        AuthorOp::CheckOperational => {
            let wm = to_world_model(&app.things, &app.relations, lens());
            match validate_operational(&wm) {
                Ok(spec) => Ok(Verdict::OperationalClean {
                    processes: spec.processes.len(),
                    flows: spec.flows.len(),
                }),
                Err(errs) => Err(cite_operational(errs)),
            }
        }
        AuthorOp::Run { dt, t } => {
            let wm = to_world_model(&app.things, &app.relations, lens());
            let spec = match validate_operational(&wm) {
                Ok(s) => s,
                Err(errs) => return Err(cite_operational(errs)),
            };
            let mut circuit = bert_compose::from_spec(&spec);
            if circuit.nodes.is_empty() {
                return Err(Refusal::Unaddressable("empty circuit".into()));
            }
            let run = bert_compose::run::RecordedRun::record_over(&mut circuit, &spec, dt, t);
            Ok(Verdict::RunOk { ticks: run.history.len(), residual: run.final_balance })
        }
    }
}

/// Run a script, asserting every op yields the expected shape of verdict. Panics
/// with the op and the refusal on any unexpected result — so a broken script
/// reads as a test failure at the exact op.
fn expect_ok(app: &mut CanvasApp, ops: Vec<AuthorOp>) {
    for op in ops {
        if let Err(r) = apply(app, op.clone()) {
            panic!("op {op:?} refused unexpectedly: {r:?}");
        }
    }
}

fn fresh() -> CanvasApp {
    let mut app = CanvasApp::default();
    app.next_id = 1;
    app
}

// ── Model A: a thermostat authored ONLY through apply(), audited, and run ──
//
// A conservation-faithful regulation loop: Heat Demand (source) → Thermostat
// (Buffering: hysteresis) → Radiator (Buffering: thermal mass) → Room Heat
// (sink). Buffering is the conserving primitive (bert-compose's own
// `conserving_model`); a stamp of Amplifying/Propelling would run but inject
// flow and leave a residual — the conservation constraint the run imposes on
// which primitives keep the ledger balanced (documented in its own test below).

/// Author the thermostat topology + types via ops. Returns nothing to repair —
/// this is the clean script (the refusal tests below start from broken variants).
fn author_thermostat(app: &mut CanvasApp) {
    expect_ok(
        app,
        vec![
            AuthorOp::Lens(Lens::Mobus), // commit to the Operational rung
            AuthorOp::Place("Thermostat"),
            AuthorOp::Place("Radiator"),
            // Source is born as a sink, then reversed (the #1 gap, in the open):
            AuthorOp::BirthEnv { from: "Thermostat", env: "Heat Demand" },
            AuthorOp::Reverse { from: "Thermostat", to: "Heat Demand" }, // now Heat Demand → Thermostat
            // Internal bond:
            AuthorOp::Relate { from: "Thermostat", to: "Radiator" },
            // Sink is born correctly oriented, no reverse needed:
            AuthorOp::BirthEnv { from: "Radiator", env: "Room Heat" },
            // Work-process mappings:
            AuthorOp::Stamp { target: "Thermostat", prim: ProcessPrimitive::Buffering },
            AuthorOp::Stamp { target: "Radiator", prim: ProcessPrimitive::Buffering },
        ],
    );
}

#[test]
fn thermostat_authored_by_ops_passes_audit_and_runs_balanced() {
    let mut app = fresh();
    author_thermostat(&mut app);

    // Passes the executable-readiness audit.
    match apply(&mut app, AuthorOp::CheckOperational).unwrap() {
        Verdict::OperationalClean { processes, flows } => {
            assert_eq!(processes, 2, "two stamped work processes project");
            assert_eq!(flows, 3, "source→P1→P2→sink = three flows");
        }
        v => panic!("expected clean operational, got {v:?}"),
    }

    // Runs 30 ticks, conserving (residual < 1e-3), authored entirely by ops.
    match apply(&mut app, AuthorOp::Run { dt: 1.0, t: 30.0 }).unwrap() {
        Verdict::RunOk { ticks, residual } => {
            assert_eq!(ticks, 30, "30 ticks recorded");
            assert!(residual.abs() < 1e-3, "conserves over 30 ticks: residual {residual}");
        }
        v => panic!("expected a run, got {v:?}"),
    }
}

// ── Model B: a 3-node market sketch (producer → market → consumer) ─────────
//
// Producer (source) → Market (the mediating component) → Consumer (sink). The
// same source-birth-then-reverse dance; Market stamped Buffering (a market
// clears by holding inventory, releasing over time).

#[test]
fn market_sketch_authored_by_ops_audits_clean() {
    let mut app = fresh();
    expect_ok(
        &mut app,
        vec![
            AuthorOp::Lens(Lens::Mobus),
            AuthorOp::Place("Market"),
            AuthorOp::BirthEnv { from: "Market", env: "Producer" },
            AuthorOp::Reverse { from: "Market", to: "Producer" }, // Producer → Market (a source)
            AuthorOp::BirthEnv { from: "Market", env: "Consumer" }, // Market → Consumer (a sink)
            AuthorOp::Stamp { target: "Market", prim: ProcessPrimitive::Buffering },
        ],
    );
    match apply(&mut app, AuthorOp::CheckOperational).unwrap() {
        Verdict::OperationalClean { processes, flows } => {
            assert_eq!((processes, flows), (1, 2), "one process, two flows (in/out)");
        }
        v => panic!("expected clean operational, got {v:?}"),
    }
    // And it runs, conserving.
    match apply(&mut app, AuthorOp::Run { dt: 1.0, t: 30.0 }).unwrap() {
        Verdict::RunOk { residual, .. } => assert!(residual.abs() < 1e-3, "market conserves: {residual}"),
        v => panic!("expected a run, got {v:?}"),
    }
}

// ── The #1 source-authoring gap, isolated and asserted ────────────────────

#[test]
fn a_source_is_born_as_a_sink_and_must_be_reversed() {
    let mut app = fresh();
    expect_ok(
        &mut app,
        vec![
            AuthorOp::Lens(Lens::Mobus),
            AuthorOp::Place("Pump"),
            AuthorOp::BirthEnv { from: "Pump", env: "Reservoir" },
        ],
    );
    // As born, "Reservoir" is a SINK (bond Pump→Reservoir), even though the
    // intent was a source feeding the pump. The op vocabulary has no way to say
    // "this is a source" — the only recourse is Reverse.
    let wm = to_world_model(&app.things, &app.relations, Lens::Mobus);
    assert_eq!(wm.environment.sinks.len(), 1, "born on the sink side");
    assert_eq!(wm.environment.sources.len(), 0, "no source authorable directly");

    apply(&mut app, AuthorOp::Reverse { from: "Pump", to: "Reservoir" }).unwrap();
    let wm = to_world_model(&app.things, &app.relations, Lens::Mobus);
    assert_eq!(wm.environment.sources.len(), 1, "reversed → now a source");
    assert_eq!(wm.environment.sinks.len(), 0);
}

// ── Refusal loop 1: missing primitive → repaired via the validator's hint ──

#[test]
fn refusal_loop_missing_primitive_repairs_via_citation() {
    let mut app = fresh();
    // Everything but the Radiator stamp:
    expect_ok(
        &mut app,
        vec![
            AuthorOp::Lens(Lens::Mobus),
            AuthorOp::Place("Thermostat"),
            AuthorOp::Place("Radiator"),
            AuthorOp::BirthEnv { from: "Thermostat", env: "Heat Demand" },
            AuthorOp::Reverse { from: "Thermostat", to: "Heat Demand" },
            AuthorOp::Relate { from: "Thermostat", to: "Radiator" },
            AuthorOp::BirthEnv { from: "Radiator", env: "Room Heat" },
            AuthorOp::Stamp { target: "Thermostat", prim: ProcessPrimitive::Buffering },
        ],
    );
    // Refuses, citing the unstamped component and how to fix it.
    let Err(Refusal::Validator(cites)) = apply(&mut app, AuthorOp::CheckOperational) else {
        panic!("expected a refusal for the unstamped Radiator");
    };
    let radiator = cites.iter().find(|c| c.reason.contains("no agent model")).expect("cites the missing agent model");
    assert!(radiator.location.contains("Radiator") || radiator.location.contains("systems["));
    assert_eq!(
        radiator.hint.as_deref(),
        Some("Attach an AgentModel carrying a Mobus primitive"),
        "the citation names the repair"
    );
    // The citation is sufficient to repair from IF the agent knows the vocabulary
    // mapping AgentModel-primitive == the Stamp op. Apply it and re-check green.
    apply(&mut app, AuthorOp::Stamp { target: "Radiator", prim: ProcessPrimitive::Buffering }).unwrap();
    assert!(matches!(apply(&mut app, AuthorOp::CheckOperational), Ok(Verdict::OperationalClean { .. })));
}

// ── Refusal loop 2: a flow entering a source → repaired via Reverse ────────
//
// FINDING (terminal type is derived, not authored): `to_world_model` reads an
// env's Source/Sink identity from its bond directions — it is a source iff it
// originates ANY bond. So the "flow leaves a sink" branch of validate_operational
// is UNREACHABLE from canvas ops (a sink never appears as a bond's `a`, so no
// flow can take it as a source). The "flow enters a source" branch IS reachable:
// bond one env in BOTH directions — `originates` makes it a source, yet the
// inbound bond has a flow entering it.

#[test]
fn refusal_loop_flow_enters_source_repairs_via_reverse() {
    let mut app = fresh();
    expect_ok(
        &mut app,
        vec![
            AuthorOp::Lens(Lens::Mobus),
            AuthorOp::Place("Furnace"),
            AuthorOp::Place("Boiler"),
            AuthorOp::BirthEnv { from: "Furnace", env: "Gas" }, // Furnace → Gas (Gas inbound)
            AuthorOp::Relate { from: "Gas", to: "Boiler" },     // Gas → Boiler (Gas now originates → a source)
            AuthorOp::BirthEnv { from: "Boiler", env: "Flue" }, // Boiler → Flue (sink)
            AuthorOp::Stamp { target: "Furnace", prim: ProcessPrimitive::Buffering },
            AuthorOp::Stamp { target: "Boiler", prim: ProcessPrimitive::Buffering },
        ],
    );
    let Err(Refusal::Validator(cites)) = apply(&mut app, AuthorOp::CheckOperational) else {
        panic!("expected a direction refusal for the flow entering the source");
    };
    let enters = cites.iter().find(|c| c.reason.contains("enters a source")).expect("cites the source-crossing");
    assert_eq!(
        enters.hint.as_deref(),
        Some("A source originates flow; swap the endpoints or the entity type"),
    );
    // "Swap the endpoints" == Reverse the inbound Furnace→Gas bond. Repair.
    apply(&mut app, AuthorOp::Reverse { from: "Furnace", to: "Gas" }).unwrap(); // now Gas → Furnace
    assert!(matches!(apply(&mut app, AuthorOp::CheckOperational), Ok(Verdict::OperationalClean { .. })));
}

// ── Refusal loop 3: an isolated component → repaired by wiring a flow ──────

#[test]
fn refusal_loop_isolated_component_repairs_by_wiring() {
    let mut app = fresh();
    expect_ok(
        &mut app,
        vec![
            AuthorOp::Lens(Lens::Mobus),
            AuthorOp::Place("Pump"),
            AuthorOp::Place("Bystander"), // stamped but wired to nothing
            AuthorOp::BirthEnv { from: "Pump", env: "Reservoir" },
            AuthorOp::Reverse { from: "Pump", to: "Reservoir" },
            AuthorOp::BirthEnv { from: "Pump", env: "Drain" },
            AuthorOp::Stamp { target: "Pump", prim: ProcessPrimitive::Buffering },
            AuthorOp::Stamp { target: "Bystander", prim: ProcessPrimitive::Buffering },
        ],
    );
    let Err(Refusal::Validator(cites)) = apply(&mut app, AuthorOp::CheckOperational) else {
        panic!("expected an isolated-component refusal");
    };
    let isolated = cites.iter().find(|c| c.reason.contains("no flow touches this component")).expect("cites the isolation");
    assert_eq!(isolated.hint.as_deref(), Some("Wire it into the flow graph or remove it"));
    // Repair: wire Bystander into the graph (Pump → Bystander → Drain path).
    apply(&mut app, AuthorOp::Relate { from: "Pump", to: "Bystander" }).unwrap();
    apply(&mut app, AuthorOp::Relate { from: "Bystander", to: "Drain" }).unwrap();
    assert!(matches!(apply(&mut app, AuthorOp::CheckOperational), Ok(Verdict::OperationalClean { .. })));
}

// ── Refusal loop 4: the mode gate → repaired by choosing the Operational lens ─

#[test]
fn refusal_loop_mode_gate_repairs_via_lens() {
    let mut app = fresh();
    author_thermostat(&mut app);
    // Drop back to the Structural lens: the model is unchanged, but the rung it
    // commits to has no flow semantics to execute.
    app.lens = Some(Lens::Bunge);
    let Err(Refusal::Validator(cites)) = apply(&mut app, AuthorOp::CheckOperational) else {
        panic!("expected a mode-gate refusal at the Structural lens");
    };
    let mode = cites.iter().find(|c| c.location == "mode").expect("cites the mode gate");
    assert!(mode.reason.contains("Structural"));
    assert_eq!(mode.hint.as_deref(), Some("Author the model at the Operational rung, or export from compose"));
    // "Author at the Operational rung" == choose the Mobus lens. Repair.
    apply(&mut app, AuthorOp::Lens(Lens::Mobus)).unwrap();
    assert!(matches!(apply(&mut app, AuthorOp::CheckOperational), Ok(Verdict::OperationalClean { .. })));
}

// ── A gap with no refusal: a mere relation is expressible but invisible ────
//
// `SetBond{bond:false}` is in the vocabulary, but `to_world_model` drops mere
// relations (bert-core has one edge type). So the op "succeeds" and yet no
// verdict can observe it — the authoring surface accepts an intent the semantic
// layer cannot represent. Silent, not a refusal.

#[test]
fn a_mere_relation_is_expressible_but_invisible_to_every_verdict() {
    let mut app = fresh();
    expect_ok(
        &mut app,
        vec![
            AuthorOp::Lens(Lens::Bunge),
            AuthorOp::Place("A"),
            AuthorOp::Place("B"),
            AuthorOp::Relate { from: "A", to: "B" },
            AuthorOp::SetBond { from: "A", to: "B", bond: false }, // demote to a mere relation
        ],
    );
    let wm = to_world_model(&app.things, &app.relations, Lens::Bunge);
    assert_eq!(wm.interactions.len(), 0, "the mere relation projects to nothing");
    // Structurally the model is now a heap (no bond), and the verdict says so —
    // but nothing distinguishes "A ~mere~ B was authored" from "A and B are
    // unrelated". The mere-relation authoring intent is lost with no signal.
    assert!(app.is_heap(Lens::Bunge), "no bond → a heap, as Bunge demands");
}
