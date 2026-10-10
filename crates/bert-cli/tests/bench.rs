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

#[test]
fn a_finite_source_runs_dry_from_the_terminal() {
    // #260 via the bench knob: the faucet holds 2 units in all; the inflow
    // is 1, 1, 0, 0 and the tub stops filling (the old engine filled on).
    let out = bert(&["bench", "fixtures/sl/bathtub.sl", "--t", "4", "--set", "Faucet.reservoir=2"]);
    assert_eq!(code(&out), 0, "{}", stderr(&out));
    let v = stdout_json(&out);
    let inflow = v["flows"].as_array().unwrap().iter().find(|f| f["name"] == "inflow").unwrap();
    assert_eq!(inflow["series"], serde_json::json!([1.0, 1.0, 0.0, 0.0]));
    assert_eq!(v["conserved"], true);
}

#[test]
fn a_knob_names_the_pass_way_the_author_wrote() {
    // Split form (#226): "flow Rain -> Gutter" lands on a pass-way the
    // projection fuses into "Rain Barrel". The author addresses the flow by
    // the name on the page, Gutter, and the edit still lands.
    let out = bert(&[
        "bench",
        "assets/examples/rain-barrel-garden.sl",
        "--t",
        "8",
        "--no-log",
        "--set",
        "rainfall|Rain|Gutter=0@5",
    ]);
    assert_eq!(code(&out), 0, "{}", stderr(&out));
    let v = stdout_json(&out);
    assert_eq!(v["conserved"], true);
    assert_eq!(v["edits"][0]["target"], "Rain -> Gutter : rainfall");
    let rain = v["flows"].as_array().unwrap().iter().find(|f| f["name"] == "rainfall").unwrap();
    assert_eq!(rain["series"], serde_json::json!([15.0, 15.0, 15.0, 15.0, 15.0, 0.0, 0.0, 0.0]));
    let barrel = v["trajectories"].as_array().unwrap().iter().find(|s| s["name"] == "Rain Barrel").unwrap();
    assert_eq!(barrel["series"][7], 39.0);
}

#[test]
fn the_sl_words_reach_the_engine() {
    // `limiting`: the oven is bounded by its scarcest input (heat 3) rather
    // than the sum (8); `reservoir 12`: flour gives 5, 5, 2 and runs dry, and
    // the oven then starves on flour. Both read straight off the SL line.
    let out = bert(&["bench", "fixtures/sl/bakery.sl", "--t", "5", "--no-log"]);
    assert_eq!(code(&out), 0, "{}", stderr(&out));
    let v = stdout_json(&out);
    assert_eq!(v["conserved"], true);
    let flour = v["flows"].as_array().unwrap().iter().find(|f| f["name"] == "flour" && f["from"] == "Flour").unwrap();
    assert_eq!(flour["series"], serde_json::json!([5.0, 5.0, 2.0, 0.0, 0.0]));
    let bread = v["flows"].as_array().unwrap().iter().find(|f| f["name"] == "bread").unwrap();
    let series: Vec<f64> = bread["series"].as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect();
    assert!(series[0] <= 3.0 + 1e-6, "limiting bounds the oven by heat 3, got {series:?}");
    assert!(series[4] < series[0], "the oven starves once the flour runs dry: {series:?}");
}

#[test]
fn a_pass_way_serving_two_residents_runs_as_an_identity_door() {
    // #493: an unfused pure pass-way (one inlet, two tanks; one outlet, two
    // drains) is lowered to an identity Impeding node, so the model runs and
    // conserves. Routing through the door follows the interior legs' declared
    // amounts (4 to A, 6 to B); the door itself alters nothing.
    let out = bert(&["bench", "fixtures/sl/shared-door.sl", "--t", "5", "--no-log"]);
    assert_eq!(code(&out), 0, "{}", stderr(&out));
    let v = stdout_json(&out);
    assert_eq!(v["conserved"], true);
    let flows = v["flows"].as_array().unwrap();
    let fill = |n: &str| flows.iter().find(|f| f["name"] == n).unwrap()["series"][0].as_f64().unwrap();
    assert_eq!((fill("fill a"), fill("fill b")), (4.0, 6.0));
    let traj = v["trajectories"].as_array().unwrap();
    let last = |n: &str| traj.iter().find(|s| s["name"] == n).unwrap()["series"][4].as_f64().unwrap();
    assert_eq!((last("Tank A"), last("Tank B")), (20.0, 25.0));
}

#[test]
fn the_thermostat_traced_two_ways_is_one_system() {
    // ADR 0008 D3: the agent form of the thermostat (one `agent` line) and the
    // probe-plus-comparator form hold the same room heat on every tick, and
    // the agent's goal turns from the terminal like any setpoint.
    let room = |file: &str| {
        let out = bert(&["bench", file, "--t", "12", "--no-log"]);
        assert_eq!(code(&out), 0, "{}", stderr(&out));
        let v = stdout_json(&out);
        assert_eq!(v["conserved"], true, "{file}");
        v["trajectories"]
            .as_array()
            .unwrap()
            .iter()
            .find(|t| t["name"] == "Room")
            .unwrap()["series"]
            .clone()
    };
    assert_eq!(
        room("assets/bench/thermostat-room.sl"),
        room("assets/bench/thermostat-agent.sl"),
        "the agent form and the comparator form diverge"
    );
    let out = bert(&["bench", "assets/bench/thermostat-agent.sl", "--t", "24", "--no-log", "--set", "Thermostat.target=3@12"]);
    assert_eq!(code(&out), 0, "{}", stderr(&out));
    let v = stdout_json(&out);
    assert_eq!(v["edits"][0]["field"], "target");
    let series = v["trajectories"].as_array().unwrap().iter().find(|t| t["name"] == "Room").unwrap()["series"].as_array().unwrap();
    let before = series[11].as_f64().unwrap();
    let after = series[23].as_f64().unwrap();
    assert!((before - 1.6667).abs() < 1e-3 && (after - 2.5).abs() < 1e-3, "{before} -> {after}");
}
