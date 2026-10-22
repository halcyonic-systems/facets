//! The LLM serving market's honesty gate: every number the `.sl` files
//! declare is load-bearing in a run, or this file fails.
//!
//! The model is two levels (2026-10-10). The shipped parent
//! (assets/examples/llm-market.sl) is drawn at pool grain: two output
//! interfaces take inference compute (Energy) in. The Router, a Splitting
//! interface, divides routed workload between frontier serving and
//! open-weight serving by declared relative weights (Mobus Eq. 4.5);
//! Self-hosting, a pass-way, carries self-hosted workload to open-weight
//! serving only, because closed weights cannot be self-hosted. Each serving
//! subsystem is an Amplifying process whose token output is bounded by its
//! allocated compute; with the weights signal ample, output tracks compute
//! exactly. Each subsystem `decomposes` into a child in
//! assets/walkthroughs/llm-market/ holding the per-model roster behind a
//! Splitting pool; the children's workload sources declare the parent's
//! realized flows, so each child on its own reproduces the per-model numbers
//! of the single-level model now in assets/archive/llm-market-flat.sl. A run
//! is per level, so the agreement between the levels is a declared fact
//! about the children's source amounts, checked here, not something the
//! engine carries.
//!
//! So the traces owe, at the parent:
//!
//! 1. each subsystem's served-token activity equals the two-interface
//!    allocation computed from the declared amounts (asserted IS honored);
//! 2. the ledger shows the thermodynamic truth of inference — all compute
//!    dissipates as heat, nothing physical reaches a sink, and the books
//!    still balance;
//! 3. a changed weight changes the trace (the anti "asserted-but-unhonored"
//!    mutation, the failure shape the 2026-07-27 sweep found six times);
//! 4. self-hosted compute reaches the open-weight subsystem and nothing
//!    else — the structural claim the header makes in words, checked on the
//!    wiring;
//!
//! and at each child, one more: its per-model shares are the flat model's,
//! and its roster total is the parent's realized flow. The flat model is the
//! archived single-run witness of the roster split; it stays at the digest's
//! level while the parent's amounts are minted from the routed sensor's
//! vintage (#534), so the levels are compared as shares, not as Gtok/day. The
//! seam contract itself is pinned by facets-kernel's llm_market_walkthrough.

use facets_canvas::canvas::project;
use facets_canvas::sl::parse_sl;
use facets_compose::{from_spec, run::RecordedRun, Circuit, NodeKind};
use facets_core::operational::validate_operational;
use facets_core::ProcessPrimitive;

const HORIZON: f64 = 60.0;

const PARENT: &str = "assets/examples/llm-market.sl";
const FRONTIER_CHILD: &str = "assets/walkthroughs/llm-market/frontier-serving.sl";
const OPEN_CHILD: &str = "assets/walkthroughs/llm-market/open-weight-serving.sl";
const FLAT: &str = "assets/archive/llm-market-flat.sl";

fn run_sl(text: &str) -> (Circuit, RecordedRun) {
    let canvas = parse_sl(text).unwrap_or_else(|e| panic!("llm-market does not parse: {e:?}"));
    let model = project(&canvas);
    let spec = validate_operational(&model)
        .unwrap_or_else(|e| panic!("llm-market is not operational: {e:?}"));
    let mut circuit = from_spec(&spec);
    let run = RecordedRun::record_over(&mut circuit, &spec, 1.0, HORIZON)
        .unwrap_or_else(|e| panic!("llm-market refuses to run: {e}"));
    (circuit, run)
}

fn source_text(rel: &str) -> String {
    let path = format!("{}/../../{rel}", env!("CARGO_MANIFEST_DIR"));
    std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path}: {e}"))
}

fn node_index(circuit: &Circuit, name: &str) -> usize {
    circuit
        .nodes
        .iter()
        .position(|n| n.name == name)
        .unwrap_or_else(|| panic!("no node named {name}"))
}

/// A node's activity at the final recorded tick. Row layout:
/// `[tick, n0.activity, n0.storage, n0.total, n1…]`.
fn final_activity(circuit: &Circuit, run: &RecordedRun, name: &str) -> f32 {
    let i = node_index(circuit, name);
    run.history.last().unwrap()[1 + 3 * i]
}

/// The compute the `.sl` text declares arriving at one node, by arithmetic on
/// the declared amounts alone: a source's declared emission, or a Splitting
/// node's own inflow times this wire's share of its outwire weights, summed
/// over every physical inwire. Ample wires carry no quantity and are skipped,
/// so the weights signals never count as compute.
fn declared_inflow(circuit: &Circuit, node: usize) -> f32 {
    circuit
        .wires
        .iter()
        .filter(|w| w.to == node && !w.ample)
        .map(|w| {
            let sender = &circuit.nodes[w.from];
            match sender.kind {
                NodeKind::Source => w.rate.unwrap_or(sender.param),
                NodeKind::Process(ProcessPrimitive::Splitting) => {
                    let total: f32 = circuit
                        .wires
                        .iter()
                        .filter(|o| o.from == w.from && !o.ample)
                        .map(|o| o.rate.unwrap_or(0.0))
                        .sum();
                    declared_inflow(circuit, w.from) * w.rate.unwrap_or(0.0) / total
                }
                _ => panic!(
                    "{} feeds compute from a {:?}, which this gate's arithmetic does not model",
                    sender.name, sender.kind
                ),
            }
        })
        .sum()
}

/// Every node reachable from `start` along wires, the compute source's
/// downstream cone.
fn reachable(circuit: &Circuit, start: usize) -> Vec<usize> {
    let mut seen = vec![start];
    let mut frontier = vec![start];
    while let Some(n) = frontier.pop() {
        for w in circuit.wires.iter().filter(|w| w.from == n) {
            if !seen.contains(&w.to) {
                seen.push(w.to);
                frontier.push(w.to);
            }
        }
    }
    seen
}

fn amplifying_count(circuit: &Circuit) -> usize {
    circuit
        .nodes
        .iter()
        .filter(|n| matches!(n.kind, NodeKind::Process(ProcessPrimitive::Amplifying)))
        .count()
}

const SUBSYSTEMS: [&str; 2] = ["Frontier serving", "Open-weight serving"];
const FRONTIER: [&str; 4] = ["Opus", "Fable", "GPT", "Gemini"];
const OPEN: [&str; 5] = ["Gemma", "Llama", "Qwen", "DeepSeek", "Other open"];

/// Law 1: served tokens per subsystem == the declared two-interface
/// allocation. This is the engine path (Splitting weights → metered
/// Amplifying) agreeing with arithmetic done directly on the declared
/// amounts — if a layer dropped or guessed at a weight, these diverge.
/// Pinned by hand as the worked example, from vintage 2026-10-10's month
/// 2026-09 (#534): frontier 19197·254/1000 ≈ 4876.04 routed, open
/// 19197·746/1000 + 3000 ≈ 17320.96.
#[test]
fn serving_shares_track_declared_weights() {
    let (circuit, run) = run_sl(&source_text(PARENT));
    for subsystem in SUBSYSTEMS {
        let served = final_activity(&circuit, &run, subsystem);
        let declared = declared_inflow(&circuit, node_index(&circuit, subsystem));
        assert!(
            (served - declared).abs() / declared.max(1.0) < 1e-3,
            "{subsystem}: serves {served} Gtok/day but the .sl declares an allocation of {declared}"
        );
    }
    let frontier = final_activity(&circuit, &run, "Frontier serving");
    let open = final_activity(&circuit, &run, "Open-weight serving");
    assert!(
        (frontier - 4876.04).abs() < 0.1,
        "frontier serving serves {frontier}, not the 4876.04 Gtok/day the declared amounts work out to"
    );
    assert!(
        (open - 17320.96).abs() < 0.1,
        "open-weight serving serves {open}, not the 17320.96 Gtok/day the declared amounts work out to"
    );
}

/// Law 2: inference thermodynamics. Compute in, information out — the entire
/// physical feed dissipates as heat, nothing physical is sunk or stored, and
/// the conservation books balance to zero.
#[test]
fn all_compute_dissipates_as_heat() {
    let (circuit, run) = run_sl(&source_text(PARENT));
    assert!(
        run.final_balance.abs() < 1e-2,
        "llm-market leaks: residual {}",
        run.final_balance
    );
    let [emitted, sunk, stored, dissipated] = *run.ledger_history.last().unwrap();
    assert!(emitted > 0.0, "no compute entered the market");
    assert_eq!(sunk, 0.0, "token output is Message — nothing physical sinks");
    assert_eq!(stored, 0.0, "a serving market holds no stock");
    assert!(
        (dissipated - emitted).abs() / emitted < 1e-3,
        "compute in ({emitted}) must equal heat out ({dissipated})"
    );
    for subsystem in SUBSYSTEMS {
        assert!(
            final_activity(&circuit, &run, subsystem) > 0.0,
            "{subsystem} serves nothing"
        );
    }
    // The parent's Amplifying set is exactly the two subsystems — the roster
    // lives one level down, and a model added here must revisit this gate.
    assert_eq!(
        amplifying_count(&circuit),
        SUBSYSTEMS.len(),
        "the parent's Amplifying set drifted from this gate's SUBSYSTEMS list"
    );
}

/// Law 3 (mutation): the router's split is load-bearing. Since #523 the split
/// is the routed buyers' command (one aggregate agent writing the `shares`
/// param at the end of every tick), so the number the run honors is the
/// share the buyers hold under their bound, and the declared weights are the
/// split of tick 0 only, before the agent's first write. Lowering the held
/// frontier share to what a doubled open-weight weight would give (254 of
/// 1746, 0.1455) must raise open-weight serving and lower frontier serving —
/// a held value nothing responds to is the "asserted-but-unhonored" defect
/// class. The self-hosted flow does not pass through the Router, so the open
/// subsystem's gain is bounded by the routed workload alone.
#[test]
fn the_split_the_buyers_hold_is_load_bearing() {
    let text = source_text(PARENT);
    let held = "rule threshold above 30000 emit 0.2 else 0.254 manages param";
    assert!(text.contains(held), "the buyers' line moved — update this mutation");
    let mutated = text.replace(held, &held.replace("else 0.254", "else 0.1455"));

    let (c0, r0) = run_sl(&text);
    let (c1, r1) = run_sl(&mutated);
    let open = (
        final_activity(&c0, &r0, "Open-weight serving"),
        final_activity(&c1, &r1, "Open-weight serving"),
    );
    let frontier = (
        final_activity(&c0, &r0, "Frontier serving"),
        final_activity(&c1, &r1, "Frontier serving"),
    );
    assert!(
        open.1 > open.0 * 1.1,
        "lowering the held frontier share barely moved open-weight serving: {} → {}",
        open.0,
        open.1
    );
    assert!(
        frontier.1 < frontier.0,
        "open-weight serving's gain must come from the same split: frontier {} → {}",
        frontier.0,
        frontier.1
    );
    let routed = final_activity(&c0, &r0, "Router");
    assert!(
        (open.1 - open.0) < routed,
        "the open subsystem gained more than the routed workload can supply: {} → {}",
        open.0,
        open.1
    );
}

/// The declared weights are tick 0's split and nothing after: doubling the
/// open-weight weight moves the first tick and leaves the final one where the
/// buyers hold it. Pinned so the change the agent made to what a declared
/// weight means is a test, not a surprise.
#[test]
fn the_declared_weights_split_tick_zero_only() {
    let text = source_text(PARENT);
    let needle = "Router -> \"Open-weight serving\" : energy \"routed open-weight workload\" substance compute amount 746";
    assert!(text.contains(needle), "calibration moved — update this mutation");
    let mutated = text.replace(needle, &needle.replace("amount 746", "amount 1492"));
    let (c0, r0) = run_sl(&text);
    let (c1, r1) = run_sl(&mutated);
    let i = node_index(&c0, "Open-weight serving");
    let first = |r: &RecordedRun| r.history[0][1 + 3 * i];
    assert!(first(&r1) > first(&r0) * 1.1, "tick 0 did not take the declared weight: {} → {}", first(&r0), first(&r1));
    assert_eq!(
        final_activity(&c0, &r0, "Open-weight serving"),
        final_activity(&c1, &r1, "Open-weight serving"),
        "after tick 0 the buyers' command, not the declared weight, sets the split"
    );
}

/// Law 4: closed weights cannot be self-hosted. The self-hosted demand
/// source reaches the open-weight subsystem and never the frontier one, and
/// both subsystems are downstream of the Router — which is the only reason
/// the self-hosted placeholder can change a frontier-against-open comparison
/// at all.
#[test]
fn self_hosting_reaches_the_open_subsystem_only() {
    let (circuit, _) = run_sl(&source_text(PARENT));
    let cone = reachable(&circuit, node_index(&circuit, "Self-hosted demand"));
    assert!(
        !cone.contains(&node_index(&circuit, "Frontier serving")),
        "frontier serving is reachable from the self-hosted interface, but closed weights cannot be self-hosted"
    );
    assert!(
        cone.contains(&node_index(&circuit, "Open-weight serving")),
        "open-weight serving receives no self-hosted compute"
    );
    let routed = reachable(&circuit, node_index(&circuit, "Routed demand"));
    for subsystem in SUBSYSTEMS {
        assert!(
            routed.contains(&node_index(&circuit, subsystem)),
            "{subsystem} is not served through the Router"
        );
    }
}

/// The flat single-level model's per-model numbers, from its own run: the
/// witness the children's roster split is held to.
fn flat_numbers() -> Vec<(&'static str, f32)> {
    let (circuit, run) = run_sl(&source_text(FLAT));
    FRONTIER
        .iter()
        .chain(OPEN.iter())
        .map(|m| (*m, final_activity(&circuit, &run, m)))
        .collect()
}

/// A child, run on its own, gives each of its models the same share of its
/// roster total that the flat model gave it, and the roster total is the
/// parent's realized flow. Shares rather than Gtok/day because the flat
/// model is an archived record at the digest's level (6000 routed) while
/// the parent is minted from the vintage (#534); the per-model split is what
/// the two still have in common. The tolerance is 0.1%: the child's source
/// amount is the parent's realized flow declared to two decimals (4876.04
/// for 19197·254/1000), so the runs agree to the fourth significant digit
/// but not bit for bit.
fn child_reproduces_flat(child: &str, roster: &[&str], total: f32) {
    let flat = flat_numbers();
    let flat_total: f32 = roster
        .iter()
        .map(|model| {
            flat.iter()
                .find(|(m, _)| m == model)
                .unwrap_or_else(|| panic!("{model} is not in the flat model"))
                .1
        })
        .sum();
    let (circuit, run) = run_sl(&source_text(child));
    assert_eq!(
        amplifying_count(&circuit),
        roster.len(),
        "{child}: roster drifted from this gate's list"
    );
    let child_total: f32 = roster.iter().map(|m| final_activity(&circuit, &run, m)).sum();
    for model in roster {
        let served = final_activity(&circuit, &run, model);
        let (_, flat_served) = flat.iter().find(|(m, _)| m == model).unwrap();
        let (share, expected) = (served / child_total, flat_served / flat_total);
        assert!(
            (share - expected).abs() / expected < 1e-3,
            "{child}: {model} takes {share} of the roster, the flat model gave it {expected}"
        );
        let declared = declared_inflow(&circuit, node_index(&circuit, model));
        assert!(
            (served - declared).abs() / declared.max(1.0) < 1e-3,
            "{child}: {model} serves {served} but the .sl declares an allocation of {declared}"
        );
    }
    assert!(
        (child_total - total).abs() / total < 1e-3,
        "{child}: the roster serves {child_total} in all, the parent's subsystem {total}"
    );
    let [emitted, sunk, stored, dissipated] = *run.ledger_history.last().unwrap();
    assert!(
        run.final_balance.abs() / emitted < 1e-6,
        "{child} leaks: residual {} on {emitted}",
        run.final_balance
    );
    assert_eq!(sunk, 0.0, "{child}: token output is Message — nothing physical sinks");
    assert_eq!(stored, 0.0, "{child}: a serving subsystem holds no stock");
    assert!(
        (dissipated - emitted).abs() / emitted < 1e-3,
        "{child}: compute in ({emitted}) must equal heat out ({dissipated})"
    );
}

/// The frontier child: Opus, Fable, GPT, Gemini behind the frontier pool,
/// fed the parent's realized routed frontier flow. Opus, pinned by hand:
/// 4876.04·9/35 ≈ 1253.84.
#[test]
fn frontier_child_reproduces_the_flat_roster() {
    let (circuit, run) = run_sl(&source_text(PARENT));
    let total = final_activity(&circuit, &run, "Frontier serving");
    child_reproduces_flat(FRONTIER_CHILD, &FRONTIER, total);

    let (c, r) = run_sl(&source_text(FRONTIER_CHILD));
    let opus = final_activity(&c, &r, "Opus");
    assert!(
        (opus - 1253.84).abs() < 0.1,
        "Opus serves {opus}, not the 1253.84 Gtok/day the declared amounts work out to"
    );
    // Nothing self-hosted enters this child at all: the only compute source
    // is the Router stand-in.
    let sources: Vec<_> = c
        .nodes
        .iter()
        .filter(|n| matches!(n.kind, NodeKind::Source))
        .map(|n| n.name.as_str())
        .collect();
    assert!(
        !sources.iter().any(|s| s.contains("Self-hosted")),
        "the frontier child has a self-hosted source: {sources:?}"
    );
}

/// The open-weight child: Gemma, Llama, Qwen, DeepSeek, Other open behind
/// the open-weight pool and the self-hosted interface, fed the parent's
/// realized routed open flow and the self-hosted placeholder. Qwen, pinned by
/// hand as the worked example: 14320.96·13/54 + 3000·13/54 ≈ 4169.86.
#[test]
fn open_child_reproduces_the_flat_roster() {
    let (circuit, run) = run_sl(&source_text(PARENT));
    let total = final_activity(&circuit, &run, "Open-weight serving");
    child_reproduces_flat(OPEN_CHILD, &OPEN, total);

    let (c, r) = run_sl(&source_text(OPEN_CHILD));
    let qwen = final_activity(&c, &r, "Qwen");
    assert!(
        (qwen - 4169.86).abs() < 0.1,
        "Qwen serves {qwen}, not the 4169.86 Gtok/day the declared amounts work out to"
    );
    // Every open model is downstream of both interfaces.
    let self_hosted = reachable(&c, node_index(&c, "Self-hosted demand"));
    let routed = reachable(&c, node_index(&c, "Router"));
    for model in OPEN {
        assert!(
            self_hosted.contains(&node_index(&c, model)),
            "{model} is open-weight yet receives no self-hosted compute"
        );
        assert!(
            routed.contains(&node_index(&c, model)),
            "{model} is not served through the Router"
        );
    }
}

/// The children's source amounts ARE the parent's realized flows, to the two
/// decimals they are declared at. A parent knob turned without carrying the
/// new realized flow down fails here, which is the only place the two
/// levels are held together until single-run substitution exists.
#[test]
fn child_sources_are_the_parents_realized_flows() {
    let (circuit, run) = run_sl(&source_text(PARENT));
    for (child, subsystem, source) in [
        (FRONTIER_CHILD, "Frontier serving", "Router"),
        (OPEN_CHILD, "Open-weight serving", "Router"),
    ] {
        let realized = final_activity(&circuit, &run, subsystem)
            - if subsystem == "Open-weight serving" {
                final_activity(&circuit, &run, "Self-hosted demand")
            } else {
                0.0
            };
        let (c, _) = run_sl(&source_text(child));
        let idx = node_index(&c, source);
        let declared: f32 = c
            .wires
            .iter()
            .filter(|w| w.from == idx && !w.ample)
            .map(|w| w.rate.unwrap_or(c.nodes[idx].param))
            .sum();
        assert!(
            (declared - realized).abs() < 0.01,
            "{child}: its {source} source declares {declared}, the parent realizes {realized}"
        );
    }
}

/// The routed buyers (#523): one aggregate agent that watches the routed
/// workload and writes the Router's split. Under its bound it holds the
/// vintage's split, so every tick of the shipped model is the tick of the
/// same model without the agent; with the workload above the bound the
/// split moves to the placeholder share, frontier 0.2 of the routed
/// workload, two ticks after the workload does (one to read it, one for the
/// command to land).
#[test]
fn the_routed_buyers_hold_the_observed_split_under_their_bound() {
    let text = source_text(PARENT);
    let start = text.find("agent \"Routed buyers\"").expect("the buyers' line");
    let end = text[start..].find("\n\n").map(|n| start + n).expect("the buyers' block ends");
    let without = format!("{}{}", &text[..start], &text[end..]);

    let (c0, r0) = run_sl(&without);
    let (c1, r1) = run_sl(&text);
    let cols = |c: &Circuit, name: &str| 1 + 3 * node_index(c, name);
    for name in ["Router", "Frontier serving", "Open-weight serving"] {
        let (i0, i1) = (cols(&c0, name), cols(&c1, name));
        let a: Vec<f32> = r0.history.iter().map(|row| row[i0]).collect();
        let b: Vec<f32> = r1.history.iter().map(|row| row[i1]).collect();
        assert_eq!(a, b, "{name}: the buyers moved the run under their bound");
    }

    let above = text.replace("substance compute amount 19197", "substance compute amount 35000");
    assert_ne!(above, text, "the routed level moved — update this mutation");
    let (c2, r2) = run_sl(&above);
    let frontier = final_activity(&c2, &r2, "Frontier serving");
    assert!((frontier - 7000.0).abs() < 0.01, "frontier {frontier}, expected 0.2 of 35000");
}
