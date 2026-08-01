//! Declared metrics in SL (#203) — a domain name over a computed OUTPUT of
//! the trace, the output twin of `param`. A param names an input knob; a
//! metric names what the author wants to watch come out, in the model's own
//! vocabulary ("DeepSeek dev share") instead of a trajectory read by eye.
//!
//! Grammar under test:
//!
//! ```text
//! metric "Name" : share of flow <a> -> <b> ["label"]
//! metric "Name" : sum into <thing>
//! ```
//!
//! Design rules inherited from the #112 register and ADR 0006:
//! - the verb set is CLOSED and grows one checkable verb at a time — never an
//!   open expression language nothing can refuse;
//! - every verb owes a separating instance (SSF #35): each fault below is a
//!   fixture that fails its check;
//! - a metric is a derived reading of kernel-executed values, never a new
//!   source of truth — nothing in this file touches the engine.

use bert_canvas::canvas::MetricExpr;
use bert_canvas::sl::{emit_sl, parse_sl};

const MARKET: &str = "\
system \"Toy Market\" : Concrete/Social
source Demand
component Clearing primitive Splitting interface
component North primitive Amplifying interface
component South primitive Amplifying interface
sink Served
flow Demand -> Clearing : energy \"workload\" substance compute amount 6000 unit Gtok/day
flow Clearing -> North : energy \"share\" amount 9 unit Gtok/day
flow Clearing -> South : energy \"share\" amount 16 unit Gtok/day
flow North -> Served : informational \"tokens\" unit Gtok/day
flow South -> Served : informational \"tokens\" unit Gtok/day
metric \"North share\" : share of flow Clearing -> North
metric \"Tokens served\" : sum into Served
";

fn errs(text: &str) -> String {
    parse_sl(text)
        .expect_err("fixture must fail its check")
        .iter()
        .map(|e| e.message.clone())
        .collect::<Vec<_>>()
        .join(" | ")
}

/// Law: both verbs parse onto the model — share anchored to its relation by
/// id, sum anchored to its thing by id.
#[test]
fn metrics_parse_onto_the_model() {
    let m = parse_sl(MARKET).expect("authored metrics must parse");
    assert_eq!(m.metrics.len(), 2);
    assert_eq!(m.metrics[0].name, "North share");
    let MetricExpr::ShareOfFlow { relation } = m.metrics[0].expr else {
        panic!("share metric anchors a relation");
    };
    let rel = m.relations.iter().find(|r| r.id == relation).unwrap();
    let a = m.things.iter().find(|t| t.id == rel.a).unwrap();
    let b = m.things.iter().find(|t| t.id == rel.b).unwrap();
    assert_eq!((a.name.as_str(), b.name.as_str()), ("Clearing", "North"));

    assert_eq!(m.metrics[1].name, "Tokens served");
    let MetricExpr::SumInto { thing } = m.metrics[1].expr else {
        panic!("sum metric anchors a thing");
    };
    let served = m.things.iter().find(|t| t.id == thing).unwrap();
    assert_eq!(served.name, "Served");
}

/// Law: metrics survive the SL round trip — emit re-states what was authored,
/// in the canonical form (flow label always present when the flow has one).
#[test]
fn metrics_round_trip_through_emit() {
    let m = parse_sl(MARKET).expect("parse");
    let text = emit_sl(&m).expect("emit");
    assert!(
        text.contains("metric \"North share\" : share of flow Clearing -> North \"share\""),
        "share metric emits with the flow's label:\n{text}"
    );
    assert!(
        text.contains("metric \"Tokens served\" : sum into Served"),
        "sum metric emits:\n{text}"
    );
    let again = parse_sl(&text).expect("emitted SL re-parses");
    assert_eq!(again.metrics, m.metrics, "round trip is identity on metrics");
}

/// Separating instance: a share over a source with ONE outflow is identically
/// 1 — a metric that cannot vary watches nothing, so the parse refuses it.
#[test]
fn share_over_single_outflow_is_refused() {
    let text = "\
system \"Pipe\" : Concrete/Technical
source A
component B primitive Amplifying interface
sink C
flow A -> B : energy \"in\" amount 5 unit u
flow B -> C : energy \"out\" unit u
metric \"A share\" : share of flow A -> B
";
    let e = errs(text);
    assert!(
        e.contains("identically 1"),
        "single-outflow share names its refusal: {e}"
    );
}

/// Separating instance: a sum into a thing nothing flows into names a value
/// the run never produces.
#[test]
fn sum_into_no_inflows_is_refused() {
    let text = "\
system \"Pipe\" : Concrete/Technical
source A
component B primitive Amplifying interface
sink C
flow A -> B : energy \"in\" amount 5 unit u
flow B -> C : energy \"out\" unit u
metric \"Origin intake\" : sum into A
";
    let e = errs(text);
    assert!(
        e.contains("nothing flows into"),
        "no-inflow sum names its refusal: {e}"
    );
}

/// Law: metric names are unique — they are the stable references scenario
/// comparisons (#202) will hold.
#[test]
fn duplicate_metric_name_is_refused() {
    let text = format!("{MARKET}metric \"North share\" : sum into Served\n");
    let e = errs(&text);
    assert!(e.contains("already declared"), "duplicate names refuse: {e}");
}

/// Law: a metric reads an existing referent — an undeclared thing or flow is
/// a fault at the metric line, not a silent zero series later.
#[test]
fn unknown_referents_are_refused() {
    let missing_flow = format!("{MARKET}metric \"Ghost\" : share of flow North -> Clearing\n");
    let e = errs(&missing_flow);
    assert!(e.contains("no flow"), "unknown flow refuses: {e}");

    let missing_thing = format!("{MARKET}metric \"Ghost\" : sum into Nowhere\n");
    let e = errs(&missing_thing);
    assert!(e.contains("not declared"), "unknown thing refuses: {e}");
}
