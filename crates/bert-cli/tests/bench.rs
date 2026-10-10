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

#[test]
fn the_relay_thermostat_switches_and_overshoots_from_the_terminal() {
    // ADR 0008 D3: the threshold rule's witness on the bench shelf — the
    // command is a square wave and the room swings across the level; the
    // level turns from the terminal like any setpoint.
    let out = bert(&["bench", "assets/bench/thermostat-relay.sl", "--t", "24", "--no-log"]);
    assert_eq!(code(&out), 0, "{}", stderr(&out));
    let v = stdout_json(&out);
    assert_eq!(v["conserved"], true);
    let series = |name: &str| -> Vec<f64> {
        v["trajectories"].as_array().unwrap().iter().find(|t| t["name"] == name).unwrap()["series"]
            .as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect()
    };
    let cmd = series("Thermostat");
    assert!(cmd.iter().all(|&x| x == 0.0 || x == 1.0), "{cmd:?}");
    assert!(cmd.windows(2).filter(|w| w[0] != w[1]).count() >= 4, "{cmd:?}");
    let room = series("Room");
    assert!(room.iter().any(|&r| r > 2.0) && room[1..].iter().any(|&r| r < 2.0), "{room:?}");
    let out = bert(&["bench", "assets/bench/thermostat-relay.sl", "--t", "24", "--no-log", "--set", "Thermostat.above=3@12"]);
    assert_eq!(code(&out), 0, "{}", stderr(&out));
    let v = stdout_json(&out);
    assert_eq!(v["edits"][0]["field"], "above");
    let room: Vec<f64> = v["trajectories"].as_array().unwrap().iter().find(|t| t["name"] == "Room").unwrap()["series"]
        .as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect();
    assert!(room[12..].iter().any(|&r| r > 3.0), "after raising the level the room never passed it: {room:?}");
}

/// ADR 0008 D3, the stress test: four bench models from the literature, each
/// with its aggregate form as the control, and the difference is the finding.
/// Each pair runs from the terminal; the numbers are the README's.
#[test]
fn the_agent_forms_differ_from_their_aggregate_controls_as_the_readme_says() {
    let run = |file: &str, t: &str, sets: &[&str]| {
        let mut args = vec!["bench", file, "--t", t, "--no-log"];
        for s in sets {
            args.push("--set");
            args.push(s);
        }
        let out = bert(&args);
        assert_eq!(code(&out), 0, "{}", stderr(&out));
        let v = stdout_json(&out);
        assert_eq!(v["conserved"], true, "{file}");
        v
    };
    let series = |v: &serde_json::Value, name: &str| -> Vec<f64> {
        v["trajectories"].as_array().unwrap().iter().find(|t| t["name"] == name).unwrap()["series"]
            .as_array().unwrap().iter().map(|x| x.as_f64().unwrap()).collect()
    };
    let level = |v: &serde_json::Value, name: &str| -> f64 {
        v["levels"].as_array().unwrap().iter().find(|l| l["name"] == name).unwrap()["value"].as_f64().unwrap()
    };
    // The ward: the control pins at its ceiling; the gatekeeper's never reaches it.
    let control = run("assets/bench/hospital-beds.sl", "24", &["Ward.time_constant=6"]);
    let agent = run("assets/bench/hospital-beds-agent.sl", "24", &["Ward.time_constant=6"]);
    assert!(series(&control, "Ward")[6..].iter().all(|&b| (b - 40.0).abs() < 1e-3));
    let ward = series(&agent, "Ward");
    assert!(ward.iter().all(|&b| b < 40.0) && ward[4..].iter().any(|&b| b < 32.0) && ward[4..].iter().any(|&b| b > 37.0), "{ward:?}");
    // The epidemic: a lower, earlier peak and a longer tail.
    let control = run("assets/bench/sir-epidemic.sl", "40", &[]);
    let agent = run("assets/bench/sir-epidemic-agent.sl", "40", &[]);
    let peak = |v: &serde_json::Value| series(v, "Infected").iter().cloned().fold(0.0, f64::max);
    assert!(peak(&control) > 0.25 && peak(&agent) < 0.18, "{} vs {}", peak(&control), peak(&agent));
    let above = |v: &serde_json::Value| series(v, "Infected").iter().filter(|&&x| x > 0.1).count();
    assert!(above(&agent) > above(&control) + 3, "{} vs {} days above a tenth", above(&agent), above(&control));
    // The fishery: closures keep the stock up and land several times more.
    let control = run("assets/bench/logistic-harvest.sl", "80", &["Fish.time_constant=2"]);
    let agent = run("assets/bench/logistic-harvest-agent.sl", "80", &[]);
    assert!(series(&control, "Fish").iter().cloned().fold(1.0, f64::min) < 0.05);
    assert!(series(&agent, "Fish").iter().cloned().fold(1.0, f64::min) > 0.25);
    assert!(level(&agent, "Market") > 3.0 * level(&control, "Market"), "{} vs {}", level(&agent, "Market"), level(&control, "Market"));
    // The bank: the switch crowd runs the bank in half the time.
    let empties = |v: &serde_json::Value| series(v, "Vault").iter().position(|&x| x < 0.01).map(|i| i + 1).unwrap_or(99);
    let control = run("assets/bench/bank-run.sl", "40", &[]);
    let agent = run("assets/bench/bank-run-agent.sl", "40", &[]);
    assert!(empties(&control) >= 28 && empties(&agent) <= 18, "{} vs {}", empties(&control), empties(&agent));
}
