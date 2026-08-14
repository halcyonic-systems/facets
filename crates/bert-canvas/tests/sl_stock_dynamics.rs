//! #112 slice 1: the two typed engine-parameter productions.
//!
//! `stock <unit> initial <n>` fills `initial_state["storage"]` (the archived
//! reservoir's fact — a stock that starts full — now sayable; `initial` is
//! welded to the stock clause so a dimensionless starting level is
//! unwritable). `release <n>` fills `cognitive_params["release_rate"]` (the
//! archived homeostat's fact; Buffering-only, since no other primitive reads
//! it). The emit refusal NARROWS rather than disappears: any other key in
//! either bag still refuses, because emitting would silently drop it —
//! every narrowing below carries its separating instance (SSF #35).

use bert_canvas::canvas::project;
use bert_canvas::sl::{emit_sl, parse_sl};

const AUTHORED: &str = "\
system \"Waterworks\" : Concrete
component Reservoir primitive Buffering interface stock ML initial 4.5 release 1.4
source Watershed
sink Outlet
flow Watershed -> Reservoir : matter \"inflow\"
flow Reservoir -> Outlet : matter \"outflow\"
";

/// Law: both clauses parse onto the thing's typed bag slots, exactly.
#[test]
fn stock_initial_and_release_parse() {
    let m = parse_sl(AUTHORED).expect("authored dynamics must parse");
    let t = m.things.iter().find(|t| t.name == "Reservoir").unwrap();
    assert_eq!(t.stock_unit, "ML");
    assert_eq!(
        t.initial_state.get("storage").and_then(|v| v.as_f64()),
        Some(4.5),
        "initial 4.5 declared, 4.5 kept"
    );
    assert_eq!(t.cognitive_params.get("release_rate").copied(), Some(1.4));
}

/// Law: the clauses survive a round trip — emit writes them back and the
/// emitted text re-parses to the same declarations.
#[test]
fn stock_initial_and_release_round_trip() {
    let m = parse_sl(AUTHORED).expect("parses");
    let text = emit_sl(&m).expect("a model carrying only the typed keys emits");
    assert!(
        text.contains("stock ML initial 4.5"),
        "emit writes the welded clause, got:\n{text}"
    );
    assert!(text.contains("release 1.4"), "emit writes release, got:\n{text}");
    let again = parse_sl(&text).expect("emitted SL re-parses");
    let t = again.things.iter().find(|t| t.name == "Reservoir").unwrap();
    assert_eq!(t.initial_state.get("storage").and_then(|v| v.as_f64()), Some(4.5));
    assert_eq!(t.cognitive_params.get("release_rate").copied(), Some(1.4));
}

/// Law: projection carries both onto the agent the engine already reads
/// (`operational.rs:325` / `export.rs:405`) — no kernel change, by design.
#[test]
fn projection_carries_both_to_the_agent() {
    let m = parse_sl(AUTHORED).expect("parses");
    let world = project(&m);
    let sys = world
        .systems
        .iter()
        .find(|s| s.info.name == "Reservoir")
        .expect("Reservoir projects as a system");
    let agent = sys.agent.as_ref().expect("the typed bags ride the agent");
    assert_eq!(
        agent.initial_state.get("storage").and_then(|v| v.as_f64()),
        Some(4.5)
    );
    assert_eq!(agent.cognitive_params.get("release_rate").copied(), Some(1.4));
}

/// Separating instance (#112 proposal §3.2): a second key beside `storage`
/// must still refuse — the narrowed check is not a silent acceptance of
/// whatever the bag holds.
#[test]
fn a_mixed_initial_state_bag_still_refuses_to_emit() {
    let mut m = parse_sl(AUTHORED).expect("parses");
    let t = m.things.iter_mut().find(|t| t.name == "Reservoir").unwrap();
    t.initial_state
        .insert("phase".to_string(), serde_json::json!("warm"));
    let err = emit_sl(&m).expect_err("a key SL cannot express must refuse");
    assert!(err.contains("#112"), "the refusal names the boundary: {err}");
}

/// Separating instance (#112 proposal §3.3): `capacity` is a real, executing
/// engine field with no SL production — accepting the bag because
/// `release_rate` is present would silently drop it on export.
#[test]
fn a_mixed_cognitive_params_bag_still_refuses_to_emit() {
    let mut m = parse_sl(AUTHORED).expect("parses");
    let t = m.things.iter_mut().find(|t| t.name == "Reservoir").unwrap();
    t.cognitive_params.insert("capacity".to_string(), 50.0);
    let err = emit_sl(&m).expect_err("an untyped key must refuse");
    assert!(err.contains("#112"), "{err}");
}

/// Separating instance for the grammar: `release` on a non-Buffering
/// component is a parse fault — `release_rate` has no reader outside the
/// Buffering arm, so the clause would parse to a value nothing consumes.
#[test]
fn release_on_a_non_buffering_component_is_a_parse_fault() {
    let bad = AUTHORED.replace(
        "component Reservoir primitive Buffering interface stock ML initial 4.5 release 1.4",
        "component Reservoir primitive Propelling interface release 1.4",
    );
    let err = parse_sl(&bad).expect_err("release needs a Buffering reader");
    assert!(format!("{err:?}").contains("Buffering"), "{err:?}");
}

/// Law: the language refuses what it cannot mean (the `amount` rule, applied):
/// a negative initial level and a non-positive release are parse faults.
#[test]
fn nonsense_magnitudes_are_parse_faults() {
    let neg = AUTHORED.replace("initial 4.5", "initial -1");
    assert!(parse_sl(&neg).is_err(), "a stock cannot start below empty");
    let zero = AUTHORED.replace("release 1.4", "release 0");
    assert!(parse_sl(&zero).is_err(), "a non-positive release is refused");
}

/// Emitter half of the weld: an initial level with NO declared stock unit has
/// no dimension to ride, so a model in that state (reachable only via loaded
/// JSON) still refuses to emit rather than writing a unitless number.
#[test]
fn an_initial_without_a_stock_unit_still_refuses_to_emit() {
    let mut m = parse_sl(AUTHORED).expect("parses");
    let t = m.things.iter_mut().find(|t| t.name == "Reservoir").unwrap();
    t.stock_unit.clear();
    let err = emit_sl(&m).expect_err("a unitless initial must refuse");
    assert!(err.contains("#112"), "{err}");
}
