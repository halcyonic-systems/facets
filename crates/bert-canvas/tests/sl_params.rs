//! Declared parameters in SL (walkthrough #18) — a domain name over an
//! already-declared amount, so the run panel can speak the model's own
//! vocabulary ("Developer demand") instead of the kernel's mechanism taxonomy
//! ("drivers · absolute rates").
//!
//! Grammar under test:
//!
//! ```text
//! param "Name" : flow <a> -> <b> ["label"] [range <min>..<max>]
//! param shares "Name" : from <process>
//! ```
//!
//! Design rules inherited from the #112 register:
//! - a param stores no value — the value IS the anchored declared amount, so
//!   an anchor that resolves to nothing adjustable is a parse fault, never a
//!   bag;
//! - every constraint here owes a separating instance (SSF #35): each fault
//!   below is a fixture that fails its check;
//! - normalization is presentation — nothing in this file touches the engine.

use bert_canvas::canvas::{project, ParamAnchor};
use bert_canvas::sl::{emit_sl, parse_sl};
use bert_core::rust_decimal::Decimal;

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
param \"Demand level\" : flow Demand -> Clearing range 0..12000
param shares \"Market share\" : from Clearing
";

fn errs(text: &str) -> String {
    parse_sl(text)
        .expect_err("fixture must fail its check")
        .iter()
        .map(|e| e.message.clone())
        .collect::<Vec<_>>()
        .join(" | ")
}

/// Law: both forms parse onto the model — the flow param anchored to its
/// relation by id with the range kept, the shares param anchored to the
/// allocating process.
#[test]
fn params_parse_onto_the_model() {
    let m = parse_sl(MARKET).expect("authored params must parse");
    assert_eq!(m.params.len(), 2);
    let demand = &m.params[0];
    assert_eq!(demand.name, "Demand level");
    let ParamAnchor::Flow { relation } = demand.anchor else {
        panic!("flow param anchors a relation");
    };
    let rel = m.relations.iter().find(|r| r.id == relation).unwrap();
    assert_eq!(rel.amount, Some(Decimal::from(6000)));
    let range = demand.range.expect("range declared, range kept");
    assert_eq!((range.min, range.max), (Decimal::ZERO, Decimal::from(12000)));
    let shares = &m.params[1];
    let ParamAnchor::Shares { thing } = shares.anchor else {
        panic!("shares param anchors a thing");
    };
    assert_eq!(m.things.iter().find(|t| t.id == thing).unwrap().name, "Clearing");
}

/// Law: params are presentation semantics — projection is byte-for-byte the
/// projection of the same model without them. The engine never sees a param.
#[test]
fn params_never_project() {
    let with = parse_sl(MARKET).unwrap();
    let without = parse_sl(
        &MARKET
            .lines()
            .filter(|l| !l.starts_with("param"))
            .collect::<Vec<_>>()
            .join("\n"),
    )
    .unwrap();
    assert_eq!(
        serde_json::to_string(&project(&with)).unwrap(),
        serde_json::to_string(&project(&without)).unwrap()
    );
}

/// Law: emit is canonical and the round trip preserves both params —
/// emit(parse(emit(m))) == emit(m), with the anchored flow's label echoed.
#[test]
fn params_round_trip() {
    let m = parse_sl(MARKET).unwrap();
    let text = emit_sl(&m).expect("params must emit");
    assert!(text.contains("param \"Demand level\" : flow Demand -> Clearing \"workload\" range 0..12000"));
    assert!(text.contains("param shares \"Market share\" : from Clearing"));
    let again = parse_sl(&text).expect("emitted SL must re-parse");
    assert_eq!(m.params, again.params);
    assert_eq!(emit_sl(&again).unwrap(), text);
}

/// Separating instance: an anchor naming no declared flow is a fault, not a
/// silently-ignored name — a param names an existing declared amount.
#[test]
fn unknown_anchor_is_a_fault() {
    let msg = errs(&MARKET.replace(
        "param \"Demand level\" : flow Demand -> Clearing range 0..12000",
        "param \"Demand level\" : flow Demand -> Nowhere",
    ));
    assert!(msg.contains("not declared"), "got: {msg}");
}

/// Separating instance: an anchored flow with no declared amount has nothing
/// to adjust — fault, with the repair named.
#[test]
fn amountless_anchor_is_a_fault() {
    let msg = errs(&MARKET.replace(
        "param \"Demand level\" : flow Demand -> Clearing range 0..12000",
        "param \"Tokens out\" : flow North -> Served",
    ));
    assert!(msg.contains("declares no amount"), "got: {msg}");
}

/// Separating instance: two flows between the same pair need the label to
/// disambiguate; without it the param is ambiguous and refused.
#[test]
fn ambiguous_anchor_is_a_fault() {
    let text = MARKET.replace(
        "flow Demand -> Clearing : energy \"workload\" substance compute amount 6000 unit Gtok/day",
        "flow Demand -> Clearing : energy \"workload\" substance compute amount 6000 unit Gtok/day\n\
         flow Demand -> Clearing : informational \"forecast\" amount 3 unit signal/day",
    );
    let msg = errs(&text.replace(
        "param \"Demand level\" : flow Demand -> Clearing range 0..12000",
        "param \"Demand level\" : flow Demand -> Clearing",
    ));
    assert!(msg.contains("disambiguate"), "got: {msg}");
    // …and the label repairs it.
    let repaired = text.replace(
        "param \"Demand level\" : flow Demand -> Clearing range 0..12000",
        "param \"Demand level\" : flow Demand -> Clearing \"workload\" range 0..12000",
    );
    parse_sl(&repaired).expect("label must disambiguate");
}

/// Separating instance: a range the declared amount lies outside of
/// contradicts the model — refused at parse.
#[test]
fn out_of_range_amount_is_a_fault() {
    let msg = errs(&MARKET.replace("range 0..12000", "range 0..100"));
    assert!(msg.contains("outside"), "got: {msg}");
}

/// Separating instance: min >= max (or a negative min) is not a range.
#[test]
fn degenerate_range_is_a_fault() {
    let msg = errs(&MARKET.replace("range 0..12000", "range 12000..0"));
    assert!(msg.contains("min < max"), "got: {msg}");
}

/// Separating instance: shares need a fanout — a process with fewer than two
/// outgoing declared amounts has no split to present.
#[test]
fn shares_without_fanout_is_a_fault() {
    let msg = errs(&MARKET.replace(
        "param shares \"Market share\" : from Clearing",
        "param shares \"North's split\" : from North",
    ));
    assert!(msg.contains("fanout"), "got: {msg}");
}

/// Separating instance: shares present a component's out-fanout; an
/// environment thing is refused by role, not by accident of having flows.
#[test]
fn shares_from_env_thing_is_a_fault() {
    let msg = errs(&MARKET.replace(
        "param shares \"Market share\" : from Clearing",
        "param shares \"Demand split\" : from Demand",
    ));
    assert!(msg.contains("environment thing"), "got: {msg}");
}

/// Separating instance: param names are unique — they are what scenarios
/// (#202) will reference, so a duplicate is a fault, not a shadow.
#[test]
fn duplicate_param_name_is_a_fault() {
    let msg = errs(&format!("{MARKET}param \"Demand level\" : flow Clearing -> North \"share\"\n"));
    assert!(msg.contains("already declared"), "got: {msg}");
}

/// A model with no params serializes without the field — pre-existing canvas
/// JSON stays byte-identical (the #163 pattern).
#[test]
fn paramless_model_serializes_without_the_field() {
    let m = parse_sl(
        "component A primitive Combining interface\n\
         sink Out\n\
         flow A -> Out : matter \"x\"\n",
    )
    .unwrap();
    assert!(!serde_json::to_string(&m).unwrap().contains("params"));
}
