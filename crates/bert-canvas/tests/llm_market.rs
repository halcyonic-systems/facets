//! The LLM serving market's honesty gate: every number the `.sl` declares is
//! load-bearing in the run, or this file fails.
//!
//! The model's claim structure (assets/examples/llm-market.sl): two output
//! interfaces take inference compute (Energy) in. The Router, a Splitting
//! interface, divides routed workload between a Frontier pool and an
//! Open-weight pool, and each pool divides its workload across its models by
//! declared relative weights (Mobus Eq. 4.5). Self-hosting, the other
//! Splitting interface, divides self-hosted workload across the five open
//! models only, because closed weights cannot be self-hosted. Each model is an
//! Amplifying process whose token output is bounded by its allocated compute;
//! with the weights signal ample, output tracks compute exactly. So the trace
//! owes four things:
//!
//! 1. each model's served-token activity equals the two-interface allocation
//!    computed from the declared amounts (asserted IS honored);
//! 2. the ledger shows the thermodynamic truth of inference — all compute
//!    dissipates as heat, nothing physical reaches a sink, and the books
//!    still balance;
//! 3. a changed weight changes the trace (the anti "asserted-but-unhonored"
//!    mutation, the failure shape the 2026-07-27 sweep found six times);
//! 4. no frontier model receives any self-hosted compute — the structural
//!    claim the model's header makes in words, checked on the wiring.

use bert_canvas::canvas::project;
use bert_canvas::sl::parse_sl;
use bert_compose::{from_spec, run::RecordedRun, Circuit, NodeKind};
use bert_core::operational::validate_operational;
use bert_core::ProcessPrimitive;

const HORIZON: f64 = 60.0;

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

fn source_text() -> String {
    let path = format!(
        "{}/../../assets/examples/llm-market.sl",
        env!("CARGO_MANIFEST_DIR")
    );
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

const FRONTIER: [&str; 4] = ["Opus", "Fable", "GPT", "Gemini"];
const OPEN: [&str; 5] = ["Gemma", "Llama", "Qwen", "DeepSeek", "Other open"];
const MODELS: [&str; 9] = [
    "Opus", "Fable", "GPT", "Gemini", "Gemma", "Llama", "Qwen", "DeepSeek", "Other open",
];

/// Law 1: served tokens per model == the declared two-interface allocation.
/// This is the engine path (Splitting weights → metered Amplifying) agreeing
/// with arithmetic done directly on the declared amounts — if a layer dropped
/// or guessed at a weight, these diverge. Qwen, pinned by hand as the worked
/// example: 6000·54/89·13/54 + 3000·13/54 ≈ 1598.6.
#[test]
fn serving_shares_track_declared_weights() {
    let (circuit, run) = run_sl(&source_text());
    for model in MODELS {
        let served = final_activity(&circuit, &run, model);
        let declared = declared_inflow(&circuit, node_index(&circuit, model));
        assert!(
            (served - declared).abs() / declared.max(1.0) < 1e-3,
            "{model}: serves {served} Gtok/day but the .sl declares an allocation of {declared}"
        );
    }
    let qwen = final_activity(&circuit, &run, "Qwen");
    assert!(
        (qwen - 1598.6).abs() < 0.1,
        "Qwen serves {qwen}, not the 1598.6 Gtok/day the declared amounts work out to"
    );
}

/// Law 2: inference thermodynamics. Compute in, information out — the entire
/// physical feed dissipates as heat, nothing physical is sunk or stored, and
/// the conservation books balance to zero.
#[test]
fn all_compute_dissipates_as_heat() {
    let (circuit, run) = run_sl(&source_text());
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
    // And the information DID move: every model node emits a live signal.
    for model in MODELS {
        assert!(
            final_activity(&circuit, &run, model) > 0.0,
            "{model} serves nothing"
        );
    }
    // Sanity on the roster: the model names above are the model's Amplifying
    // set, exactly — a roster edit must revisit this gate.
    let amps = circuit
        .nodes
        .iter()
        .filter(|n| matches!(n.kind, NodeKind::Process(ProcessPrimitive::Amplifying)))
        .count();
    assert_eq!(amps, MODELS.len(), "roster drifted from this gate's MODELS list");
}

/// Law 3 (mutation): a declared weight is load-bearing. Doubling DeepSeek's
/// routed open-weight share must raise DeepSeek's served tokens and lower
/// Qwen's (its share of the same pool shrinks as the weight pool grows) — a
/// declared value nothing responds to is the "asserted-but-unhonored" defect
/// class. Opus, in the other pool, must not move: the pools are separate.
#[test]
fn weights_are_load_bearing() {
    let text = source_text();
    let needle = "\"Open-weight pool\" -> DeepSeek : energy \"routed serving share\" substance compute amount 16";
    assert!(text.contains(needle), "calibration moved — update this mutation");
    let mutated = text.replace(needle, &needle.replace("amount 16", "amount 32"));

    let (c0, r0) = run_sl(&text);
    let (c1, r1) = run_sl(&mutated);
    let deepseek = (
        final_activity(&c0, &r0, "DeepSeek"),
        final_activity(&c1, &r1, "DeepSeek"),
    );
    let qwen = (
        final_activity(&c0, &r0, "Qwen"),
        final_activity(&c1, &r1, "Qwen"),
    );
    let opus = (
        final_activity(&c0, &r0, "Opus"),
        final_activity(&c1, &r1, "Opus"),
    );
    assert!(
        deepseek.1 > deepseek.0 * 1.2,
        "doubling DeepSeek's routed weight barely moved it: {} → {}",
        deepseek.0,
        deepseek.1
    );
    assert!(
        qwen.1 < qwen.0,
        "DeepSeek's gain must come from its own pool: Qwen {} → {}",
        qwen.0,
        qwen.1
    );
    assert!(
        (opus.1 - opus.0).abs() < 1e-3,
        "a change inside the open-weight pool reached the frontier pool: Opus {} → {}",
        opus.0,
        opus.1
    );
}

/// Law 4: closed weights cannot be self-hosted. Nothing downstream of the
/// self-hosted demand source is a frontier model, so every Gtok/day a frontier
/// model serves came through the Router; and every open model is downstream of
/// both sources, which is the only reason the self-hosted placeholder can
/// change a frontier-against-open comparison at all.
#[test]
fn self_hosting_reaches_no_frontier_model() {
    let (circuit, _) = run_sl(&source_text());
    let cone = reachable(&circuit, node_index(&circuit, "Self-hosted demand"));
    for model in FRONTIER {
        assert!(
            !cone.contains(&node_index(&circuit, model)),
            "{model} is reachable from the self-hosted interface, but closed weights cannot be self-hosted"
        );
    }
    for model in OPEN {
        assert!(
            cone.contains(&node_index(&circuit, model)),
            "{model} is open-weight yet receives no self-hosted compute"
        );
    }
    let routed = reachable(&circuit, node_index(&circuit, "Routed demand"));
    for model in MODELS {
        assert!(
            routed.contains(&node_index(&circuit, model)),
            "{model} is not served through the Router"
        );
    }
}
