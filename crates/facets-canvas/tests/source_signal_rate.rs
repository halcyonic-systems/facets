//! A signal source with several outflows carries one declared emission PER
//! WIRE (bert#111, the Message sibling of the physical rule). Replication
//! means each receiver gets its own wire's full declared rate, nothing
//! divides, and nothing falls back to the sender's activity.
//!
//! This gate exists for `scripts/mutation_check.py`'s `signal-rate-ignored`
//! entry. The llm-market model used to be named there, but every signal it
//! declares is `ample`, which delivers no quantity at all, so no trace of
//! that model can see a declared signal rate being ignored (found 2026-10-10
//! when the serving-market rewrite landed; the entry had been blind against
//! the two-channel model too). The rig below is the smallest witness: one
//! lab, two declared signal rates in a 1:4 ratio, two Amplifying models with
//! identical power. Their outputs must stand in the declared ratio; if the
//! engine replicates the source's activity instead, they come out equal.

use bert_canvas::canvas::project;
use bert_canvas::sl::parse_sl;
use bert_compose::{from_spec, run::RecordedRun};
use bert_core::operational::validate_operational;

const RIG: &str = "\
system \"Signal Rig\" : Concrete/Technical
time unit day
source Lab
source Grid
component Small primitive Amplifying interface
component Large primitive Amplifying interface
sink Served
flow Lab -> Small : informational \"small release\" substance weights amount 2 unit MB/day
flow Lab -> Large : informational \"large release\" substance weights amount 8 unit MB/day
flow Grid -> Small : energy \"compute\" substance compute amount 100 unit kW
flow Grid -> Large : energy \"compute\" substance compute amount 100 unit kW
flow Small -> Served : informational \"tokens\" substance tokens unit MB/day
flow Large -> Served : informational \"tokens\" substance tokens unit MB/day
@lens mobus
";

/// Law: two declared signal rates from one source reach their receivers as
/// declared, so equally powered Amplifying models serve in the declared
/// ratio, not equally.
#[test]
fn declared_signal_rates_reach_each_receiver() {
    let canvas = parse_sl(RIG).unwrap_or_else(|e| panic!("rig does not parse: {e:?}"));
    let model = project(&canvas);
    let spec = validate_operational(&model).unwrap_or_else(|e| panic!("rig is not operational: {e:?}"));
    let mut circuit = from_spec(&spec);
    let run = RecordedRun::record_over(&mut circuit, &spec, 1.0, 10.0)
        .unwrap_or_else(|e| panic!("rig refuses to run: {e}"));
    let activity = |name: &str| {
        let i = circuit.nodes.iter().position(|n| n.name == name).unwrap();
        run.history.last().unwrap()[1 + 3 * i]
    };
    let (small, large) = (activity("Small"), activity("Large"));
    assert!(small > 0.0 && large > 0.0, "both models must serve: {small}, {large}");
    assert!(
        (large / small - 4.0).abs() < 1e-3,
        "declared signal rates 2 and 8 should serve in a 1:4 ratio, got {small} : {large}"
    );
}
