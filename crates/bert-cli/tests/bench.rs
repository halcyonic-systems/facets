//! `bert bench` (#463): the terminal's seat at the bench. The same engine and
//! the same knobs by the same names the app shows, with the readout, the
//! knob log and the tick log on stdout — so a run can be driven and read
//! without a browser in the loop.
mod support;

use support::{bert, code, stderr, stdout_json};

#[test]
fn a_knob_at_a_tick_turns_the_flow_from_the_next_tick_on() {
    let out = bert(&["bench", "fixtures/sl/bathtub.sl", "--t", "6", "--set", "inflow|Faucet|Tub=4@3"]);
    assert_eq!(code(&out), 0, "{}", stderr(&out));
    let v = stdout_json(&out);
    assert_eq!(v["ticks"], 6);
    assert_eq!(v["conserved"], true);
    let inflow = v["flows"].as_array().unwrap().iter().find(|f| f["name"] == "inflow").unwrap();
    assert_eq!(inflow["series"], serde_json::json!([1.0, 1.0, 1.0, 4.0, 4.0, 4.0]));
    assert_eq!(v["edits"][0]["tick"], 3);
    assert_eq!(v["edits"][0]["target"], "Faucet -> Tub : inflow");
    let log = v["log"].as_array().unwrap();
    assert_eq!(log.len(), 6);
    let tub = log[3]["nodes"].as_array().unwrap().iter().find(|n| n["name"] == "Tub").unwrap();
    assert_eq!(tub["delivered"], 4.0);
}

#[test]
fn no_log_leaves_the_log_out_and_a_bad_knob_is_a_usage_error() {
    let out = bert(&["bench", "fixtures/sl/bathtub.sl", "--t", "3", "--no-log"]);
    assert_eq!(code(&out), 0, "{}", stderr(&out));
    assert!(stdout_json(&out).get("log").is_none());
    let out = bert(&["bench", "fixtures/sl/bathtub.sl", "--set", "nonsense"]);
    assert_eq!(code(&out), 2, "{}", stderr(&out));
    assert!(stderr(&out).contains("target=value"), "{}", stderr(&out));
    let out = bert(&["bench", "fixtures/sl/bathtub.sl", "--t", "3", "--set", "nope|Faucet|Tub=2"]);
    assert_eq!(code(&out), 4, "{}", stderr(&out));
    assert!(stderr(&out).contains("no flow"), "{}", stderr(&out));
}
