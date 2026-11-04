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

use facets_canvas::canvas::{project, ParamAnchor};
use facets_canvas::sl::{emit_sl, parse_sl};
use facets_core::rust_decimal::Decimal;

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

// ---- field form (#343, #463 move 3) -------------------------------------

const BARREL: &str = "\
system \"Garden\" : Concrete/Technical
interface Gutter
component Barrel primitive Buffering stock L initial 60 release 12 capacity 200
component Valve primitive Inverting setpoint 3
source Rain
sink Bed
flow Rain -> Gutter : matter \"rainfall\" substance water amount 15
flow Gutter -> Barrel : matter \"run-off\" substance water
flow Barrel -> Valve : matter \"watering\" substance water
flow Valve -> Bed : matter \"drip\" substance water
param \"drain\" : release of Barrel range 0..40
param \"tank size\" : capacity of Barrel
param \"target\" : setpoint of Valve range 1..5
";

/// Law: a field param anchors to the component by id and the field by key,
/// keeps its range, and emits back as the line it was read from.
#[test]
fn a_field_param_names_a_component_lines_engine_parameter() {
    use facets_canvas::canvas::EngineField;
    let m = parse_sl(BARREL).unwrap();
    let barrel = m.things.iter().find(|t| t.name == "Barrel").unwrap().id;
    let valve = m.things.iter().find(|t| t.name == "Valve").unwrap().id;
    let by = |n: &str| m.params.iter().find(|p| p.name == n).unwrap();
    assert_eq!(by("drain").anchor, ParamAnchor::Field { thing: barrel, field: EngineField::Release });
    assert_eq!(by("drain").range.map(|r| (r.min, r.max)), Some((Decimal::ZERO, Decimal::from(40))));
    assert_eq!(by("tank size").anchor, ParamAnchor::Field { thing: barrel, field: EngineField::Capacity });
    assert_eq!(by("tank size").range, None);
    assert_eq!(by("target").anchor, ParamAnchor::Field { thing: valve, field: EngineField::Setpoint });
    // The value is the component line's: nothing is stored on the param.
    let b = m.things.iter().find(|t| t.id == barrel).unwrap();
    assert_eq!(b.cognitive_params.get("release_rate"), Some(&12.0));

    let text = emit_sl(&m).unwrap();
    assert!(text.contains("param \"drain\" : release of Barrel range 0..40"), "{text}");
    assert!(text.contains("param \"tank size\" : capacity of Barrel\n"), "{text}");
    assert!(text.contains("param \"target\" : setpoint of Valve range 1..5"), "{text}");
    let again = parse_sl(&text).unwrap();
    assert_eq!(again.params, m.params);
    // Projection is untouched by params (they add vocabulary, never dynamics).
    assert!(project(&m).systems.len() == project(&again).systems.len());
}

/// Each refusal owes a fixture that earns it (SSF #35).
#[test]
fn field_param_faults_are_named() {
    let base = BARREL.split("param ").next().unwrap().to_string();
    let f = |line: &str| errs(&format!("{base}{line}\n"));
    assert!(f("param \"x\" : release Barrel").contains("param syntax"), "no `of`");
    assert!(f("param \"x\" : release of Rain").contains("environment thing"), "env");
    assert!(f("param \"x\" : maintenance of Barrel").contains("declares no `maintenance`"), "missing field");
    assert!(f("param \"x\" : release of Barrel range 20..40").contains("outside the param's range"), "range");
    assert!(f("param \"x\" : time constant of Barrel").contains("declares no `time constant`"), "two-word field");
    assert!(f("param \"x\" : release of Nobody").contains("not declared"), "unknown thing");
}

// ---- own form (v1.16) ---------------------------------------------------

const STAGE: &str = "\
system \"Amp\" : Concrete/Technical
source Mic
source Rail
sink Speaker
component \"Supply Line\" primitive Impeding impedance 0.25
component Stage primitive Amplifying gain 5
component Van primitive Propelling efficiency 0.9
component Probe primitive Sensing gain 2
component Store primitive Buffering stock L release 1
component Switch primitive Modulating
agent Boss watches Store rule proportional target 2 gain 0.5 manages Switch
flow Mic -> Stage : informational \"audio in\" amount 0.2
flow Rail -> \"Supply Line\" : energy \"rail\" amount 4
flow \"Supply Line\" -> Stage : energy \"power\"
flow Stage -> Van : energy \"audio out\"
flow Van -> Store : energy \"pushed\"
flow Store -> Switch : energy \"held\"
flow Switch -> Speaker : energy \"out\"
flow Store -> Probe : informational \"level\"
flow Probe -> Speaker : informational \"reading\"
param \"stage gain\" : gain of Stage range 1.1..30
param \"line loss\" : impedance of \"Supply Line\" range 0..0.99
param \"van efficiency\" : efficiency of Van range 0.1..1
param \"probe gain\" : gain of Probe
param \"boss gain\" : gain of Boss range 0.1..2
";

/// Law: a param over a process's own parameter anchors to the thing by id,
/// reads its word off the primitive, keeps its range in the word's terms,
/// and round-trips (parse, emit, parse) as the line it was read from. On an
/// agent `gain` stays the rule's field.
#[test]
fn an_own_param_names_a_processs_own_parameter_in_its_word() {
    use facets_canvas::canvas::EngineField;
    let m = parse_sl(STAGE).unwrap();
    let id = |n: &str| m.things.iter().find(|t| t.name == n).unwrap().id;
    let by = |n: &str| m.params.iter().find(|p| p.name == n).unwrap();
    assert_eq!(by("stage gain").anchor, ParamAnchor::Own { thing: id("Stage") });
    assert_eq!(by("stage gain").range.map(|r| (r.min, r.max)), Some(("1.1".parse().unwrap(), Decimal::from(30))));
    assert_eq!(by("line loss").anchor, ParamAnchor::Own { thing: id("Supply Line") });
    assert_eq!(by("van efficiency").anchor, ParamAnchor::Own { thing: id("Van") });
    assert_eq!(by("probe gain").anchor, ParamAnchor::Own { thing: id("Probe") });
    assert_eq!(by("boss gain").anchor, ParamAnchor::Field { thing: id("Boss"), field: EngineField::Gain });

    let text = emit_sl(&m).unwrap();
    assert!(text.contains("param \"stage gain\" : gain of Stage range 1.1..30\n"), "{text}");
    assert!(text.contains("param \"line loss\" : impedance of \"Supply Line\" range 0..0.99\n"), "{text}");
    assert!(text.contains("param \"van efficiency\" : efficiency of Van range 0.1..1\n"), "{text}");
    assert!(text.contains("param \"probe gain\" : gain of Probe\n"), "{text}");
    let again = parse_sl(&text).unwrap();
    assert_eq!(again.params, m.params);
    assert_eq!(emit_sl(&again).unwrap(), text, "emit is a fixed point");
}

/// Each refusal owes a fixture that earns it: a word the primitive does not
/// read (naming the right one), a range reaching past what the word can say,
/// a declared value outside the range, an undeclared value, an environment
/// thing.
#[test]
fn own_param_faults_are_named() {
    let base = STAGE.split("param ").next().unwrap().to_string();
    let f = |line: &str| errs(&format!("{base}{line}\n"));
    let wrong = f("param \"x\" : impedance of Stage range 0..0.5");
    assert!(wrong.contains("Impeding component only") && wrong.contains("own parameter is `gain`"), "{wrong}");
    let store = f("param \"x\" : gain of Store");
    assert!(store.contains("Sensing or Amplifying") && store.contains("on an agent"), "{store}");
    assert!(f("param \"x\" : gain of Stage range 1..30").contains("cannot take"), "gain 1 is not an amplifier's");
    assert!(f("param \"x\" : impedance of \"Supply Line\" range 0..1").contains("less than 1"), "impedance 1");
    assert!(f("param \"x\" : efficiency of Van range 0.5..2").contains("at most 1"), "efficiency 2");
    assert!(f("param \"x\" : gain of Stage range 6..30").contains("outside the param's range"), "declared 5");
    assert!(f("param \"x\" : gain of Mic").contains("environment thing"), "env");
    let undeclared = STAGE.replace(" gain 5", "").split("param ").next().unwrap().to_string();
    let e = errs(&format!("{undeclared}param \"x\" : gain of Stage\n"));
    assert!(e.contains("declares no `gain`"), "{e}");
    assert!(f("param \"x\" : efficiency of Van range 0.1..1 extra").contains("unexpected"), "trailing");
}

/// A command-form agent cannot turn a process's own parameter: that is
/// coordination, the rung after (ADR 0008 D2), as for any field.
#[test]
fn a_command_form_agent_refuses_an_own_param() {
    let text = STAGE
        .replace("agent Boss watches Store rule proportional target 2 gain 0.5 manages Switch\n", "")
        .replace("param \"boss gain\" : gain of Boss range 0.1..2\n", "")
        + "agent Chief watches Store rule threshold above 5 emit 2 else 6 manages param \"stage gain\"\n";
    let e = errs(&text);
    assert!(e.contains("names `gain` of `Stage`") && e.contains("coordination"), "{e}");
}
