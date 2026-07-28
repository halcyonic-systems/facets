//! The LLM-market model's honesty gate: every number the `.sl` declares is
//! load-bearing in the run, or this file fails.
//!
//! The model's claim structure (assets/examples/llm-market.sl): two demand
//! channels push inference compute (Energy), two Splitting clearings divide
//! each channel across the model roster by declared relative weights (Mobus
//! Eq. 4.5), and each model is an Amplifying process whose token output is
//! bounded by its metered compute — with the weights signal ample, output
//! tracks compute exactly. So the trace owes three things:
//!
//! 1. each model's served-token activity equals the two-channel weighted
//!    allocation computed from the declared amounts (asserted IS honored);
//! 2. the ledger shows the thermodynamic truth of inference — all compute
//!    dissipates as heat, nothing physical reaches a sink, and the books
//!    still balance;
//! 3. a changed weight changes the trace (the anti "asserted-but-unhonored"
//!    mutation, the failure shape the 2026-07-27 sweep found six times).

use bert_canvas::canvas::project;
use bert_canvas::sl::parse_sl;
use bert_compose::{from_spec, run::RecordedRun, Circuit, NodeKind};
use bert_core::operational::validate_operational;

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

/// The allocation the `.sl` text declares for one model: each clearing's
/// source rate times the model's share of that clearing's outwire weights.
fn declared_allocation(circuit: &Circuit, model: &str) -> f32 {
    let target = node_index(circuit, model);
    ["Developer clearing", "Enterprise clearing"]
        .iter()
        .map(|clearing| {
            let c = node_index(circuit, clearing);
            let feed: f32 = circuit
                .wires
                .iter()
                .filter(|w| w.to == c)
                .map(|w| circuit.nodes[w.from].param)
                .sum();
            let weights: Vec<(usize, f32)> = circuit
                .wires
                .iter()
                .filter(|w| w.from == c)
                .map(|w| (w.to, w.rate.unwrap_or(0.0)))
                .collect();
            let total: f32 = weights.iter().map(|(_, r)| r).sum();
            let share: f32 = weights
                .iter()
                .filter(|(to, _)| *to == target)
                .map(|(_, r)| r)
                .sum();
            feed * share / total
        })
        .sum()
}

const MODELS: [&str; 9] = [
    "Opus", "Fable", "GPT", "Gemini", "Gemma", "Llama", "Qwen", "DeepSeek", "Other open",
];

/// Law 1: served tokens per model == the declared two-channel allocation.
/// This is the engine path (Splitting weights → metered Amplifying) agreeing
/// with arithmetic done directly on the declared amounts — if a layer dropped
/// or guessed at a weight, these diverge.
#[test]
fn serving_shares_track_declared_weights() {
    let (circuit, run) = run_sl(&source_text());
    for model in MODELS {
        let served = final_activity(&circuit, &run, model);
        let declared = declared_allocation(&circuit, model);
        assert!(
            (served - declared).abs() / declared.max(1.0) < 1e-3,
            "{model}: serves {served} Gtok/day but the .sl declares an allocation of {declared}"
        );
    }
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
    assert_eq!(stored, 0.0, "a clearing market holds no stock");
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
        .filter(|n| {
            matches!(
                n.kind,
                NodeKind::Process(bert_core::ProcessPrimitive::Amplifying)
            )
        })
        .count();
    assert_eq!(amps, MODELS.len(), "roster drifted from this gate's MODELS list");
}

/// Law 3 (mutation): a declared weight is load-bearing. Doubling DeepSeek's
/// developer-channel weight must raise DeepSeek's served tokens and lower
/// Opus's (its dev share shrinks as the weight pool grows) — a declared
/// value nothing responds to is the "asserted-but-unhonored" defect class.
#[test]
fn weights_are_load_bearing() {
    let text = source_text();
    let needle = "\"Developer clearing\" -> DeepSeek : energy \"dev serving share\" amount 16";
    assert!(text.contains(needle), "calibration moved — update this mutation");
    let mutated = text.replace(needle, &needle.replace("amount 16", "amount 32"));

    let (c0, r0) = run_sl(&text);
    let (c1, r1) = run_sl(&mutated);
    let deepseek = (
        final_activity(&c0, &r0, "DeepSeek"),
        final_activity(&c1, &r1, "DeepSeek"),
    );
    let opus = (
        final_activity(&c0, &r0, "Opus"),
        final_activity(&c1, &r1, "Opus"),
    );
    assert!(
        deepseek.1 > deepseek.0 * 1.2,
        "doubling DeepSeek's dev weight barely moved it: {} → {}",
        deepseek.0,
        deepseek.1
    );
    assert!(
        opus.1 < opus.0,
        "DeepSeek's gain must come from somewhere: Opus {} → {}",
        opus.0,
        opus.1
    );
}
