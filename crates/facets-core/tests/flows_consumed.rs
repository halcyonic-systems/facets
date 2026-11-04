//! `check_flows_are_consumed` (#261): a flow delivered to a primitive that
//! ignores its substance is Asserted-but-unhonored — parsed, projected, wired,
//! delivered every step, and consumed by nothing. The separating instance is
//! the supply-chain demo's ORIGINAL feedback loop: an informational
//! "replenishment order" into a Combining factory, which validated green,
//! ran green, and did nothing (2026-07-27).

use facets_core::validate::{validate_mode, Severity};
use facets_core::{Mode, WorldModel};
use serde_json::json;

/// Root + two components with chosen primitives, one flow between them with a
/// chosen substance. Everything else at its witness baseline.
fn model(sender: &str, receiver: &str, substance: &str) -> WorldModel {
    let comp = |idx: u64, primitive: &str| {
        json!({
            "info": { "id": format!("C0.{idx}"), "level": 1, "name": format!("c{idx}"), "description": "" },
            "sources": [], "sinks": [],
            "parent": "S0",
            "complexity": "Atomic",
            "boundary": {
                "info": { "id": format!("B0.{idx}"), "level": 1, "name": "", "description": "" },
                "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": []
            },
            "radius": 50.0,
            "equivalence": "", "history": "", "transformation": "",
            "member_autonomy": 1.0, "time_constant": "",
            "agent": { "kind": "Reactive", "primitive": primitive }
        })
    };
    let value = json!({
        "version": 1,
        "environment": {
            "info": { "id": "E-1", "level": -1, "name": "", "description": "" },
            "sources": [], "sinks": []
        },
        "systems": [
            {
                "info": { "id": "S0", "level": 0, "name": "Root", "description": "" },
                "sources": [], "sinks": [],
                "parent": "E-1",
                "complexity": "Atomic",
                "boundary": {
                    "info": { "id": "B0", "level": 0, "name": "", "description": "" },
                    "porosity": 0.0, "perceptive_fuzziness": 0.0, "interfaces": []
                },
                "radius": 100.0,
                "equivalence": "", "history": "", "transformation": "",
                "member_autonomy": 1.0, "time_constant": ""
            },
            comp(0, sender),
            comp(1, receiver),
        ],
        "interactions": [{
            "info": { "id": "F0", "level": 0, "name": "the flow", "description": "" },
            "substance": { "sub_type": "", "type": substance },
            "type": "Flow",
            "usability": "Product",
            "source": "C0.0",
            "sink": "C0.1",
            "amount": "1",
            "unit": "",
            "parameters": []
        }]
    });
    serde_json::from_value(value).expect("constructed model deserializes")
}

fn unconsumed_warnings(m: &WorldModel, mode: Mode) -> Vec<String> {
    validate_mode(m, mode)
        .issues
        .iter()
        .filter(|i| i.severity == Severity::Warning && i.message.contains("does not consume"))
        .map(|i| i.message.clone())
        .collect()
}

/// The separating instance, as it actually shipped: an informational order
/// into a Combining factory. Delivered every step, read by nothing.
#[test]
fn message_into_combining_warns() {
    let m = model("Inverting", "Combining", "Message");
    let w = unconsumed_warnings(&m, Mode::Operational);
    assert_eq!(w.len(), 1, "expected exactly one unconsumed-flow warning: {w:?}");
    assert!(w[0].contains("Combining"), "names the deaf receiver: {}", w[0]);
}

/// The fix the warning should point to: a Modulating gate READS messages.
#[test]
fn message_into_modulating_does_not_warn() {
    let m = model("Inverting", "Modulating", "Message");
    assert!(
        unconsumed_warnings(&m, Mode::Operational).is_empty(),
        "a valve's control port consumes messages"
    );
}

/// The other direction: matter into a signal processor.
#[test]
fn material_into_copying_warns() {
    let m = model("Buffering", "Copying", "Material");
    assert_eq!(unconsumed_warnings(&m, Mode::Operational).len(), 1);
}

/// A level read is informational (toy-model walk, 2026-11-03). Since
/// 4cb56b1 (2026-08-14) the engine's observation tap is a Message flow from a
/// stock into a sensor: it reads the level and takes nothing. This test used
/// to require the opposite hint, `: matter`, written before that fix.
#[test]
fn an_informational_level_read_into_a_sensor_does_not_warn() {
    let m = model("Buffering", "Sensing", "Message");
    let r = validate_mode(&m, Mode::Operational);
    assert!(
        r.issues.iter().all(|i| i.code != "flow_not_consumed" && i.code != "sensor_drains_stock"),
        "{:?}",
        r.issues
    );
}

/// The trap the old hint set: a matter flow from a stock into a sensor is a
/// real outflow, and the sensor dissipates its share, so reading drains.
#[test]
fn a_matter_flow_from_a_stock_into_a_sensor_warns_that_it_drains() {
    let m = model("Buffering", "Sensing", "Material");
    let r = validate_mode(&m, Mode::Operational);
    let issue = r
        .issues
        .iter()
        .find(|i| i.code == "sensor_drains_stock")
        .expect("the draining read warns");
    let hint = issue.suggestion.as_deref().unwrap_or("");
    assert!(hint.contains("informational"), "the hint teaches the level read, got: {hint}");
}

/// A signal from something other than a stock is not a level read, and a
/// sensor does not read it.
#[test]
fn a_signal_into_a_sensor_from_a_non_stock_still_warns() {
    let m = model("Inverting", "Sensing", "Message");
    assert_eq!(unconsumed_warnings(&m, Mode::Operational).len(), 1);
}

/// A structural view has no run to be inert in — the check is Operational/Full.
#[test]
fn structural_mode_does_not_carry_the_warning() {
    let m = model("Inverting", "Combining", "Message");
    assert!(unconsumed_warnings(&m, Mode::Structural).is_empty());
}
