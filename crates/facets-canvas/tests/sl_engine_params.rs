//! #112 slice 2: the remaining five typed engine-parameter productions.
//!
//! `capacity`, `time constant`, and `maintenance` join `release` on
//! Buffering; `setpoint` types Inverting's comparator reference; `backpressure`
//! types Modulating's throttle flag. Each fills the matching
//! `cognitive_params` key the engine already reads (`circuit.rs`) and is
//! gated to the one primitive whose arm reads it — a declaration on any
//! other primitive would parse to a value nothing consumes, so it is a parse
//! fault rather than a silently inert clause. `release` and `time constant`
//! are additionally mutually exclusive on one component: the engine's
//! first-order drain prefers `time_constant` whenever both are set, so a
//! co-declared `release` would never be honored.

use bert_canvas::canvas::project;
use bert_canvas::sl::{emit_sl, parse_sl};

const BUFFERING: &str = "\
system \"Waterworks\" : Concrete
component Reservoir primitive Buffering interface stock ML initial 4.5 capacity 10 maintenance 0.2
source Watershed
sink Outlet
flow Watershed -> Reservoir : matter \"inflow\"
flow Reservoir -> Outlet : matter \"outflow\"
";

const TIME_CONSTANT: &str = "\
system \"Waterworks\" : Concrete
component Reservoir primitive Buffering interface stock ML initial 4.5 time constant 3
source Watershed
sink Outlet
flow Watershed -> Reservoir : matter \"inflow\"
flow Reservoir -> Outlet : matter \"outflow\"
";

const INVERTING: &str = "\
system \"Thermostat\" : Concrete
component Comparator primitive Inverting interface setpoint 0.8
source Sensor
sink Actuator
flow Sensor -> Comparator : informational \"reading\"
flow Comparator -> Actuator : informational \"error\"
";

const MODULATING: &str = "\
system \"Throttle\" : Concrete
component Valve primitive Modulating interface backpressure
source Upstream
sink Downstream
flow Upstream -> Valve : matter \"inflow\"
flow Valve -> Downstream : matter \"outflow\"
";

// ---------------------------------------------------------------------
// capacity / maintenance (Buffering)
// ---------------------------------------------------------------------

#[test]
fn capacity_and_maintenance_parse_roundtrip_and_project() {
    let m = parse_sl(BUFFERING).expect("authored dynamics must parse");
    let t = m.things.iter().find(|t| t.name == "Reservoir").unwrap();
    assert_eq!(t.cognitive_params.get("capacity").copied(), Some(10.0));
    assert_eq!(t.cognitive_params.get("maintenance").copied(), Some(0.2));

    let text = emit_sl(&m).expect("a model carrying only typed keys emits");
    assert!(text.contains("capacity 10"), "got:\n{text}");
    assert!(text.contains("maintenance 0.2"), "got:\n{text}");
    let again = parse_sl(&text).expect("emitted SL re-parses");
    let t2 = again.things.iter().find(|t| t.name == "Reservoir").unwrap();
    assert_eq!(t2.cognitive_params.get("capacity").copied(), Some(10.0));
    assert_eq!(t2.cognitive_params.get("maintenance").copied(), Some(0.2));

    let world = project(&m);
    let sys = world
        .systems
        .iter()
        .find(|s| s.info.name == "Reservoir")
        .expect("Reservoir projects as a system");
    let agent = sys.agent.as_ref().expect("the typed bag rides the agent");
    assert_eq!(agent.cognitive_params.get("capacity").copied(), Some(10.0));
    assert_eq!(agent.cognitive_params.get("maintenance").copied(), Some(0.2));
}

#[test]
fn capacity_on_a_non_buffering_component_is_a_parse_fault() {
    let bad = BUFFERING.replace(
        "component Reservoir primitive Buffering interface stock ML initial 4.5 capacity 10 maintenance 0.2",
        "component Reservoir primitive Propelling interface capacity 10",
    );
    let err = parse_sl(&bad).expect_err("capacity needs a Buffering reader");
    assert!(format!("{err:?}").contains("Buffering"), "{err:?}");
}

#[test]
fn maintenance_on_a_non_buffering_component_is_a_parse_fault() {
    let bad = BUFFERING.replace(
        "component Reservoir primitive Buffering interface stock ML initial 4.5 capacity 10 maintenance 0.2",
        "component Reservoir primitive Propelling interface maintenance 0.2",
    );
    let err = parse_sl(&bad).expect_err("maintenance needs a Buffering reader");
    assert!(format!("{err:?}").contains("Buffering"), "{err:?}");
}

#[test]
fn nonpositive_capacity_and_maintenance_are_parse_faults() {
    let zero_cap = BUFFERING.replace("capacity 10", "capacity 0");
    assert!(parse_sl(&zero_cap).is_err(), "a non-positive capacity is refused");
    let neg_maint = BUFFERING.replace("maintenance 0.2", "maintenance -1");
    assert!(parse_sl(&neg_maint).is_err(), "a negative maintenance is refused");
}

// ---------------------------------------------------------------------
// time constant (Buffering)
// ---------------------------------------------------------------------

#[test]
fn time_constant_parses_roundtrips_and_projects() {
    let m = parse_sl(TIME_CONSTANT).expect("authored dynamics must parse");
    let t = m.things.iter().find(|t| t.name == "Reservoir").unwrap();
    assert_eq!(t.cognitive_params.get("time_constant").copied(), Some(3.0));

    let text = emit_sl(&m).expect("a model carrying only typed keys emits");
    assert!(text.contains("time constant 3"), "got:\n{text}");
    let again = parse_sl(&text).expect("emitted SL re-parses");
    let t2 = again.things.iter().find(|t| t.name == "Reservoir").unwrap();
    assert_eq!(t2.cognitive_params.get("time_constant").copied(), Some(3.0));

    let world = project(&m);
    let sys = world.systems.iter().find(|s| s.info.name == "Reservoir").unwrap();
    let agent = sys.agent.as_ref().expect("the typed bag rides the agent");
    assert_eq!(agent.cognitive_params.get("time_constant").copied(), Some(3.0));
}

#[test]
fn time_constant_on_a_non_buffering_component_is_a_parse_fault() {
    let bad = TIME_CONSTANT.replace(
        "component Reservoir primitive Buffering interface stock ML initial 4.5 time constant 3",
        "component Reservoir primitive Propelling interface time constant 3",
    );
    let err = parse_sl(&bad).expect_err("time constant needs a Buffering reader");
    assert!(format!("{err:?}").contains("Buffering"), "{err:?}");
}

#[test]
fn nonpositive_time_constant_is_a_parse_fault() {
    let zero = TIME_CONSTANT.replace("time constant 3", "time constant 0");
    assert!(parse_sl(&zero).is_err(), "a non-positive time constant is refused");
}

#[test]
fn release_and_time_constant_together_is_a_parse_fault() {
    let both = TIME_CONSTANT.replace(
        "stock ML initial 4.5 time constant 3",
        "stock ML initial 4.5 release 1.4 time constant 3",
    );
    let err = parse_sl(&both).expect_err("release and time constant together is refused");
    assert!(
        format!("{err:?}").contains("time constant"),
        "the fault names the conflict: {err:?}"
    );
}

// ---------------------------------------------------------------------
// setpoint (Inverting)
// ---------------------------------------------------------------------

#[test]
fn setpoint_parses_roundtrips_and_projects() {
    let m = parse_sl(INVERTING).expect("authored dynamics must parse");
    let t = m.things.iter().find(|t| t.name == "Comparator").unwrap();
    assert_eq!(t.cognitive_params.get("setpoint").copied(), Some(0.8));

    let text = emit_sl(&m).expect("a model carrying only typed keys emits");
    assert!(text.contains("setpoint 0.8"), "got:\n{text}");
    let again = parse_sl(&text).expect("emitted SL re-parses");
    let t2 = again.things.iter().find(|t| t.name == "Comparator").unwrap();
    assert_eq!(t2.cognitive_params.get("setpoint").copied(), Some(0.8));

    let world = project(&m);
    let sys = world.systems.iter().find(|s| s.info.name == "Comparator").unwrap();
    let agent = sys.agent.as_ref().expect("the typed bag rides the agent");
    assert_eq!(agent.cognitive_params.get("setpoint").copied(), Some(0.8));
}

#[test]
fn setpoint_on_a_non_inverting_component_is_a_parse_fault() {
    let bad = INVERTING.replace(
        "component Comparator primitive Inverting interface setpoint 0.8",
        "component Comparator primitive Propelling interface setpoint 0.8",
    );
    let err = parse_sl(&bad).expect_err("setpoint needs an Inverting reader");
    assert!(format!("{err:?}").contains("Inverting"), "{err:?}");
}

#[test]
fn nonpositive_setpoint_is_a_parse_fault() {
    let zero = INVERTING.replace("setpoint 0.8", "setpoint 0");
    assert!(parse_sl(&zero).is_err(), "a non-positive setpoint is refused");
}

// ---------------------------------------------------------------------
// backpressure (Modulating)
// ---------------------------------------------------------------------

#[test]
fn backpressure_parses_roundtrips_and_projects() {
    let m = parse_sl(MODULATING).expect("authored dynamics must parse");
    let t = m.things.iter().find(|t| t.name == "Valve").unwrap();
    assert_eq!(t.cognitive_params.get("back_pressure").copied(), Some(1.0));

    let text = emit_sl(&m).expect("a model carrying only typed keys emits");
    assert!(text.contains("backpressure"), "got:\n{text}");
    let again = parse_sl(&text).expect("emitted SL re-parses");
    let t2 = again.things.iter().find(|t| t.name == "Valve").unwrap();
    assert_eq!(t2.cognitive_params.get("back_pressure").copied(), Some(1.0));

    let world = project(&m);
    let sys = world.systems.iter().find(|s| s.info.name == "Valve").unwrap();
    let agent = sys.agent.as_ref().expect("the typed bag rides the agent");
    assert_eq!(agent.cognitive_params.get("back_pressure").copied(), Some(1.0));
}

#[test]
fn backpressure_on_a_non_modulating_component_is_a_parse_fault() {
    let bad = MODULATING.replace(
        "component Valve primitive Modulating interface backpressure",
        "component Valve primitive Propelling interface backpressure",
    );
    let err = parse_sl(&bad).expect_err("backpressure needs a Modulating reader");
    assert!(format!("{err:?}").contains("Modulating"), "{err:?}");
}

// ---------------------------------------------------------------------
// emit-refusal separating instances — reachable only via loaded JSON, since
// the parser's own restriction checks make these states unauthorable in SL.
// ---------------------------------------------------------------------

#[test]
fn setpoint_on_a_buffering_component_still_refuses_to_emit() {
    let mut m = parse_sl(BUFFERING).expect("parses");
    let t = m.things.iter_mut().find(|t| t.name == "Reservoir").unwrap();
    t.cognitive_params.insert("setpoint".to_string(), 0.8);
    let err = emit_sl(&m).expect_err("setpoint on a Buffering component must refuse");
    assert!(err.contains("#112"), "{err}");
}

#[test]
fn backpressure_on_an_inverting_component_still_refuses_to_emit() {
    let mut m = parse_sl(INVERTING).expect("parses");
    let t = m.things.iter_mut().find(|t| t.name == "Comparator").unwrap();
    t.cognitive_params.insert("back_pressure".to_string(), 1.0);
    let err = emit_sl(&m).expect_err("backpressure on an Inverting component must refuse");
    assert!(err.contains("#112"), "{err}");
}

#[test]
fn release_rate_and_time_constant_together_still_refuses_to_emit() {
    let mut m = parse_sl(BUFFERING).expect("parses");
    let t = m.things.iter_mut().find(|t| t.name == "Reservoir").unwrap();
    t.cognitive_params.insert("release_rate".to_string(), 1.4);
    t.cognitive_params.insert("time_constant".to_string(), 3.0);
    let err = emit_sl(&m).expect_err(
        "release_rate and time_constant together must refuse — the engine reads only one",
    );
    assert!(err.contains("#112"), "{err}");
}

#[test]
fn a_nonpositive_typed_value_still_refuses_to_emit() {
    let mut m = parse_sl(BUFFERING).expect("parses");
    let t = m.things.iter_mut().find(|t| t.name == "Reservoir").unwrap();
    t.cognitive_params.insert("capacity".to_string(), -5.0);
    let err = emit_sl(&m).expect_err("a non-positive value in a typed slot must refuse");
    assert!(err.contains("#112"), "{err}");
}
