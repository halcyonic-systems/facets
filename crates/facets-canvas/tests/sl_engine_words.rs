//! The #463 move-5 words (SL v1.9): `limiting` on a Combining component and
//! `reservoir <n>` on a source line. Each parses onto the bag the engine
//! reads, emits back as itself, and refuses off its one reader (#112
//! separating rule: a clause nothing consumes is a fault, never a bag).
use facets_canvas::canvas::{project, EnvKind, Role};
use facets_canvas::sl::{emit_sl, parse_sl};

const LIEBIG: &str = "\
system \"Bakery\" : Concrete/Technical
interface Door
interface Plug
interface Counter
component Oven primitive Combining limiting
source Flour reservoir 100
source Power
sink Shop
flow Flour -> Door : matter \"flour\" substance flour amount 5
flow Door -> Oven : matter \"flour\" substance flour
flow Power -> Plug : energy \"heat\" substance heat amount 3
flow Plug -> Oven : energy \"heat\" substance heat
flow Oven -> Counter : matter \"bread\" substance bread
flow Counter -> Shop : matter \"bread\" substance bread
";

fn errs(text: &str) -> String {
    parse_sl(text)
        .expect_err("fixture must fail its check")
        .iter()
        .map(|e| e.message.clone())
        .collect::<Vec<_>>()
        .join(" | ")
}

#[test]
fn limiting_and_reservoir_parse_project_and_emit_back() {
    let m = parse_sl(LIEBIG).unwrap();
    let oven = m.things.iter().find(|t| t.name == "Oven").unwrap();
    assert_eq!(oven.cognitive_params.get("limiting"), Some(&1.0));
    let flour = m.things.iter().find(|t| t.name == "Flour").unwrap();
    assert_eq!((flour.role, flour.env_kind), (Role::Environment, EnvKind::Source));
    assert_eq!(flour.cognitive_params.get("reservoir"), Some(&100.0));

    let world = project(&m);
    let src = world.environment.sources.iter().find(|s| s.info.name == "Flour").unwrap();
    assert_eq!(src.reservoir, Some(100.0));
    let power = world.environment.sources.iter().find(|s| s.info.name == "Power").unwrap();
    assert_eq!(power.reservoir, None);
    let spec = facets_core::operational::validate_operational(&world).unwrap();
    assert_eq!(spec.sources.iter().find(|s| s.name == "Flour").unwrap().reservoir, Some(100.0));
    assert_eq!(spec.processes.iter().find(|p| p.name == "Oven").unwrap().cognitive_params.get("limiting"), Some(&1.0));

    let text = emit_sl(&m).unwrap();
    assert!(text.contains("component Oven primitive Combining limiting"), "{text}");
    assert!(text.contains("source Flour reservoir 100"), "{text}");
    let again = parse_sl(&text).unwrap();
    let bags = |m: &facets_canvas::canvas::CanvasModel| {
        let mut v: Vec<(String, Vec<(String, f64)>)> = m
            .things
            .iter()
            .map(|t| {
                let mut b: Vec<(String, f64)> = t.cognitive_params.iter().map(|(k, v)| (k.clone(), *v)).collect();
                b.sort_by(|a, b| a.0.cmp(&b.0));
                (t.name.clone(), b)
            })
            .collect();
        v.sort_by(|a, b| a.0.cmp(&b.0));
        v
    };
    assert_eq!(bags(&again), bags(&m));
}

#[test]
fn each_word_refuses_off_its_reader() {
    let base = "system \"S\" : Concrete/Technical\nsource In\nsink Out\n";
    let f = |line: &str| errs(&format!("{base}{line}\nflow In -> X : matter \"a\"\nflow X -> Out : matter \"b\"\n"));
    assert!(f("component X primitive Buffering limiting interface").contains("Combining component only"));
    assert!(f("component X primitive Combining limiting limiting interface").contains("already given"));
    assert!(errs("system \"S\" : Concrete/Technical\nsink Out reservoir 5\n").contains("`source` line only"), "sink");
    assert!(errs("system \"S\" : Concrete/Technical\ncomponent X reservoir 5\n").contains("`source` line only"), "component");
    assert!(errs("system \"S\" : Concrete/Technical\nsource In reservoir -1\n").contains("reservoir syntax"), "negative");
    assert!(errs("system \"S\" : Concrete/Technical\nsource In reservoir 5 reservoir 6\n").contains("already given"), "twice");
}


#[test]
fn gain_rides_a_sensor_and_refuses_elsewhere() {
    // #496: `gain <n>` is a Sensing component's own parameter (the engine's
    // `param`); it round-trips, and off a sensor it is a fault.
    let m = parse_sl(
        "system \"Room\" : Concrete/Technical\ninterface Vent\ncomponent Probe primitive Sensing gain 0.5\n\
         component Heat primitive Buffering stock J initial 5 release 1\nsource Sun\nsink Air\n\
         flow Sun -> Vent : energy \"sun\" substance heat amount 2\nflow Vent -> Heat : energy \"sun\" substance heat\n\
         flow Heat -> Probe : informational \"read\" substance reading\nflow Heat -> Vent : energy \"loss\" substance heat\n\
         flow Vent -> Air : energy \"loss\" substance heat\nflow Probe -> Vent : informational \"signal\" substance reading\n",
    )
    .unwrap();
    let probe = m.things.iter().find(|t| t.name == "Probe").unwrap();
    assert_eq!(probe.agency_capacity, Some(0.5));
    let world = project(&m);
    let sys = world.systems.iter().find(|s| s.info.name == "Probe").unwrap();
    assert_eq!(sys.agent.as_ref().unwrap().agency_capacity, 0.5);
    let text = emit_sl(&m).unwrap();
    assert!(text.contains("component Probe primitive Sensing gain 0.5"), "{text}");
    assert_eq!(parse_sl(&text).unwrap().things.iter().find(|t| t.name == "Probe").unwrap().agency_capacity, Some(0.5));

    // A sensor with no gain projects at 1.0 — it reports what it sees.
    let bare = parse_sl("system \"S\" : Concrete/Technical\ncomponent Eye primitive Sensing interface\nsource World\nflow World -> Eye : informational \"sight\"\n").unwrap();
    let w = project(&bare);
    assert_eq!(w.systems.iter().find(|s| s.info.name == "Eye").unwrap().agent.as_ref().unwrap().agency_capacity, 1.0);

    assert!(errs("system \"S\" : Concrete/Technical\ncomponent X primitive Buffering gain 2 interface\nsource In\nflow In -> X : matter \"a\"\n").contains("Sensing or Amplifying component only"));
    assert!(errs("system \"S\" : Concrete/Technical\ncomponent X primitive Sensing gain -1 interface\nsource In\nflow In -> X : matter \"a\"\n").contains("gain syntax"));
}

/// Walk row 18: a process's own parameter on Amplifying, Propelling and
/// Impeding ran in the engine and was dropped by `emit_sl`. Each now has its
/// word, lands on the engine's `param` through `OWN_PARAMS`, re-emits as
/// written, and refuses off its reader.
const OWN: &str = "\
system \"Line\" : Concrete/Technical
interface In
interface Out
component Horn primitive Amplifying gain 4
component Pump primitive Propelling efficiency 0.9
component Choke primitive Impeding impedance 0.3
source Grid
source Mic
sink Ear
flow Grid -> In : energy \"power\" substance power amount 50
flow In -> Horn : energy \"power\" substance power
flow Mic -> In : informational \"voice\" substance voice amount 2
flow In -> Horn : informational \"voice\" substance voice
flow Horn -> Pump : informational \"loud\" substance voice
flow Pump -> Choke : informational \"loud\" substance voice
flow Choke -> Out : informational \"loud\" substance voice
flow Out -> Ear : informational \"loud\" substance voice
";

#[test]
fn own_parameters_reach_the_engine_and_emit_back() {
    let m = parse_sl(OWN).unwrap();
    let ac = |n: &str| m.things.iter().find(|t| t.name == n).unwrap().agency_capacity;
    assert_eq!(ac("Horn"), Some(((4.0f64 - 1.0) / 9.0) as f32), "gain 4 is 1 + 9p");
    assert_eq!(ac("Pump"), Some(0.9));
    assert_eq!(ac("Choke"), Some(0.7), "impedance 0.3 passes 0.7");
    let circuit = facets_compose::export::from_world_model(&project(&m)).unwrap();
    let param = |n: &str| circuit.nodes.iter().find(|x| x.name == n).unwrap().param;
    assert_eq!(param("Pump"), 0.9);
    assert_eq!(param("Choke"), 0.7);
    assert!((1.0 + 9.0 * param("Horn") - 4.0).abs() < 1e-6, "the step's gain is the written one");
    let text = emit_sl(&m).unwrap();
    for line in [
        "component Horn primitive Amplifying gain 4",
        "component Pump primitive Propelling efficiency 0.9",
        "component Choke primitive Impeding impedance 0.3",
    ] {
        assert!(text.contains(line), "{line} missing from:\n{text}");
    }
    let again = parse_sl(&text).unwrap();
    assert_eq!(emit_sl(&again).unwrap(), text, "text fixpoint");
    for t in &m.things {
        let back = again.things.iter().find(|a| a.name == t.name).unwrap();
        assert_eq!(back.agency_capacity, t.agency_capacity, "{}", t.name);
    }
}

/// Values that round badly through `f32` still re-emit as written.
#[test]
fn own_parameters_reemit_their_shortest_decimal() {
    for (prim, word, v) in [
        ("Impeding", "impedance", "0.1"),
        ("Impeding", "impedance", "0.95"),
        ("Impeding", "impedance", "0"),
        ("Amplifying", "gain", "1.3"),
        ("Amplifying", "gain", "10"),
        ("Amplifying", "gain", "250"),
        ("Propelling", "efficiency", "0.333"),
        ("Propelling", "efficiency", "1"),
    ] {
        let line = format!("component X primitive {prim} {word} {v}");
        let text = format!("system \"S\" : Concrete/Technical\n{line}\nsource In\nflow In -> X : matter \"a\"\n");
        let out = emit_sl(&parse_sl(&text).unwrap()).unwrap();
        assert!(out.contains(&line), "{line} re-emitted as:\n{out}");
    }
}

#[test]
fn own_parameters_refuse_off_their_reader_and_out_of_range() {
    let f = |line: &str| errs(&format!("system \"S\" : Concrete/Technical\n{line}\nsource In\nflow In -> X : matter \"a\"\n"));
    // the wrong primitive names the right one
    let e = f("component X primitive Propelling impedance 0.2");
    assert!(e.contains("Impeding component only") && e.contains("own parameter is `efficiency`"), "{e}");
    let e = f("component X primitive Impeding gain 2");
    assert!(e.contains("Sensing or Amplifying component only") && e.contains("`impedance`"), "{e}");
    assert!(f("component X primitive Buffering efficiency 0.5").contains("Propelling component only"));
    assert!(f("component X efficiency 0.5").contains("Propelling component only"), "no primitive");
    assert!(errs("system \"S\" : Concrete/Technical\nsource X efficiency 0.5\n").contains("components only"));
    assert!(f("component X primitive Propelling efficiency 0.5 efficiency 0.6").contains("already given"));
    // the ranges
    assert!(f("component X primitive Propelling efficiency 1.2").contains("at most 1"));
    assert!(f("component X primitive Propelling efficiency 0").contains("greater than 0"));
    assert!(f("component X primitive Impeding impedance 1").contains("less than 1"));
    assert!(f("component X primitive Impeding impedance -0.1").contains("at least 0"));
    assert!(f("component X primitive Amplifying gain 1").contains("greater than 1"));
    assert!(f("component X primitive Impeding impedance high").contains("impedance syntax"));
}

/// A model loaded from JSON can carry a value no word can say: emit refuses
/// and names the JSON export, never drops it.
#[test]
fn an_unsayable_own_parameter_refuses_to_emit() {
    for (prim, a) in [("Propelling", 1.5f32), ("Impeding", 0.0), ("Amplifying", -0.2), ("Sensing", 0.0)] {
        let text = format!("system \"S\" : Concrete/Technical\ncomponent X primitive {prim}\nsource In\nflow In -> X : matter \"a\"\n");
        let mut m = parse_sl(&text).unwrap();
        m.things.iter_mut().find(|t| t.name == "X").unwrap().agency_capacity = Some(a);
        let err = emit_sl(&m).expect_err(prim);
        assert!(err.contains("kernel JSON"), "{prim}: {err}");
    }
    // On a primitive the engine never reads it on, it changes no run and is
    // carried, not written.
    let mut m = parse_sl("system \"S\" : Concrete/Technical\ncomponent X primitive Splitting\nsource In\nflow In -> X : matter \"a\"\n").unwrap();
    m.things[0].agency_capacity = Some(0.5);
    assert!(!emit_sl(&m).unwrap().contains("0.5"));
}

/// #573 and #575 (walk row 48, SL v1.17): `mass action <k>` on a Combining
/// or Copying line. SIR without the sensor-and-valve: infection draws
/// `k · S · I` from the susceptibles, the infected read, not used up.
const SIR_LAW: &str = "\
system \"Town\" : Concrete/Biological
time unit day
interface Border
component Susceptible primitive Buffering stock share initial 0.9
component Infected primitive Buffering stock share initial 0.1 time constant 4
component Removed primitive Buffering stock share
component Infection primitive Combining mass action 0.5
source Imports
flow Imports -> Border : matter \"imported\" substance people amount 0.005
flow Border -> Infected : matter \"arrivals\" substance people
flow Susceptible -> Infection : matter \"exposure\" substance people
flow Infected -> Infection : informational \"contacts\" substance people
flow Infection -> Infected : matter \"new cases\" substance people
flow Infected -> Removed : matter \"recovery\" substance people
";

#[test]
fn mass_action_parses_runs_and_emits_back() {
    let m = parse_sl(SIR_LAW).unwrap();
    let inf = m.things.iter().find(|t| t.name == "Infection").unwrap();
    assert_eq!(inf.cognitive_params.get("mass_action"), Some(&0.5));
    let text = emit_sl(&m).unwrap();
    assert!(text.contains("component Infection primitive Combining mass action 0.5"), "{text}");
    assert_eq!(
        parse_sl(&text).unwrap().things.iter().find(|t| t.name == "Infection").unwrap().cognitive_params,
        inf.cognitive_params
    );

    // The read is consumed: no `flow_not_consumed` on the contacts flow.
    let world = project(&m);
    let issues = facets_core::validate::validate_mode(&world, facets_core::Mode::Operational);
    let flagged: Vec<_> = issues
        .issues
        .iter()
        .filter(|i| i.code == "flow_not_consumed" || i.code == "law_input_not_a_stock")
        .map(|i| i.message.clone())
        .collect();
    assert!(flagged.is_empty(), "{flagged:?}");

    // And it runs as Euler SIR plus the imported trickle, one tick a day.
    let spec = facets_core::operational::validate_operational(&world).unwrap();
    let mut c = facets_compose::from_spec(&spec);
    let ix = |n: &str| c.nodes.iter().position(|x| x.name == n).unwrap();
    let (s, i, r) = (ix("Susceptible"), ix("Infected"), ix("Removed"));
    let (mut es, mut ei, mut er) = (0.9f64, 0.1f64, 0.0f64);
    for _ in 0..30 {
        c.step();
        let new = 0.5 * es * ei;
        let rec = ei / 4.0;
        es -= new;
        ei += new - rec + 0.005;
        er += rec;
        assert!((c.nodes[s].storage as f64 - es).abs() < 1e-4, "S");
        assert!((c.nodes[i].storage as f64 - ei).abs() < 1e-4, "I {} vs {ei}", c.nodes[i].storage);
        assert!((c.nodes[r].storage as f64 - er).abs() < 1e-4, "R");
    }
    assert!(c.dissipated.abs() < 1e-4, "nothing shed: {}", c.dissipated);
}

#[test]
fn mass_action_refuses_off_its_readers() {
    let base = "system \"S\" : Concrete/Technical\nsource In\nsink Out\n";
    let f = |line: &str| errs(&format!("{base}{line}\nflow In -> X : matter \"a\"\nflow X -> Out : matter \"b\"\n"));
    assert!(f("component X primitive Buffering mass action 1 interface").contains("Combining or Copying component only"));
    assert!(f("component X primitive Splitting mass action 1 interface").contains("Combining or Copying component only"));
    assert!(f("component X primitive Combining mass action 0 interface").contains("mass action syntax"));
    assert!(f("component X primitive Combining mass 1 interface").contains("mass action syntax"));
    assert!(f("component X primitive Combining mass action 1 mass action 2 interface").contains("already given"));
    assert!(errs(&format!("{base}environment E mass action 1\n")).contains("components only"));
    // Copying takes it too.
    parse_sl(&format!("{base}component X primitive Copying mass action 1 interface\nflow In -> X : informational \"a\"\nflow X -> Out : informational \"b\"\n")).unwrap();
}

/// The law draws on stocks; a pushed flow from anything else is named.
#[test]
fn a_law_fed_by_a_non_stock_is_warned() {
    let m = parse_sl(
        "system \"S\" : Concrete/Technical\ninterface Door\ncomponent Rx primitive Combining mass action 1\n\
         component Out primitive Buffering stock kg\nsource Feed\n\
         flow Feed -> Door : matter \"feed\" amount 1\nflow Door -> Rx : matter \"feed\"\nflow Rx -> Out : matter \"made\"\n",
    )
    .unwrap();
    let issues = facets_core::validate::validate_mode(&project(&m), facets_core::Mode::Operational);
    assert!(issues.issues.iter().any(|i| i.code == "law_input_not_a_stock"), "{:?}", issues.issues);
}

/// #578 (walk row 48): `spill` on a flow out of a bounded stock carries its
/// overflow on, the same tick. The toy pond at a 20-day outlet time, which
/// lost what it could not hold.
const POND_SPILL: &str = "\
system \"Pond\" : Concrete/Biological
time unit day
source Stream
sink Downstream
interface Inlet
component Pond primitive Buffering stock m3 initial 100 time constant 20 capacity 400 maintenance 2
interface Outlet
flow Stream -> Inlet : matter \"brook\" substance water amount 30 unit \"m3/day\"
flow Inlet -> Pond : matter \"inflow\" substance water
flow Pond -> Outlet : matter \"outflow\" substance water
flow Pond -> Outlet : matter \"spillway\" substance water spill
flow Outlet -> Downstream : matter \"outflow\" substance water
flow Outlet -> Downstream : matter \"spillway\" substance water
";

#[test]
fn spill_parses_runs_and_emits_back() {
    let m = parse_sl(POND_SPILL).unwrap();
    assert!(m.relations.iter().any(|r| r.name == "spillway" && r.spill));
    assert!(m.relations.iter().filter(|r| r.spill).count() == 1);
    let text = emit_sl(&m).unwrap();
    assert!(text.contains("flow Pond -> Outlet : matter \"spillway\" substance water spill"), "{text}");
    assert!(parse_sl(&text).unwrap().relations.iter().any(|r| r.name == "spillway" && r.spill));

    let world = project(&m);
    let issues = facets_core::validate::validate_mode(&world, facets_core::Mode::Operational);
    let errors: Vec<_> = issues.issues.iter().filter(|i| i.severity == facets_core::validate::Severity::Error).collect();
    assert!(errors.is_empty(), "{errors:?}");

    let spec = facets_core::operational::validate_operational(&world).unwrap();
    let mut c = facets_compose::from_spec(&spec);
    let ix = |n: &str| c.nodes.iter().position(|x| x.name == n).unwrap();
    let (pond, down) = (ix("Pond"), ix("Downstream"));
    for _ in 0..200 {
        c.step();
    }
    // At rest the pond is full and everything it cannot hold goes on: the
    // brook's 30, less the 2 of upkeep, reaches the stream below each day.
    assert!((c.nodes[pond].storage - 400.0).abs() < 1e-3, "{}", c.nodes[pond].storage);
    let before = c.nodes[down].total;
    c.step();
    assert!((c.nodes[down].total - before - 28.0).abs() < 1e-3, "{}", c.nodes[down].total - before);
    assert!(c.balance().abs() < 0.05, "balance {}", c.balance());
}

#[test]
fn spill_refuses_off_a_bounded_stock() {
    let head = "system \"S\" : Concrete/Technical\nsource In\nsink Out\n";
    let tail = "flow In -> T : matter \"in\" amount 1\n";
    let refuse = |thing: &str, flow: &str| errs(&format!("{head}{thing}\n{tail}{flow}\n"));
    assert!(refuse("component T primitive Buffering stock kg", "flow T -> Out : matter \"over\" spill").contains("with a `capacity`"));
    assert!(refuse("component T primitive Combining interface", "flow T -> Out : matter \"over\" spill").contains("with a `capacity`"));
    assert!(refuse("component T primitive Buffering stock kg capacity 5", "flow T -> Out : matter \"over\" amount 2 spill").contains("no magnitude"));
    assert!(refuse("component T primitive Buffering stock kg capacity 5", "flow T -> Out : informational \"over\" spill").contains("cannot spill"));
}

/// #574 (walk row 48): `: field ... conductance G [one way]`, `capacitance`
/// on a stock, `potential` on a source. Two connected tanks of different
/// widths even out by height (level / capacitance), not by volume.
fn field_run(text: &str, ticks: usize) -> facets_compose::Circuit {
    let m = parse_sl(text).unwrap();
    let again = parse_sl(&emit_sl(&m).unwrap()).unwrap();
    assert_eq!(
        again.relations.iter().map(|r| (r.conductance, r.one_way)).collect::<Vec<_>>(),
        m.relations.iter().map(|r| (r.conductance, r.one_way)).collect::<Vec<_>>()
    );
    let spec = facets_core::operational::validate_operational(&project(&m)).unwrap();
    let mut c = facets_compose::from_spec(&spec);
    for _ in 0..ticks {
        c.step();
    }
    c
}

#[test]
fn field_flows_even_out_potential_both_ways() {
    let tanks = |a: f64, b: f64, way: &str| {
        format!(
            "system \"Tanks\" : Concrete/Physical\n\
             component Narrow primitive Buffering stock m3 initial {a}\n\
             component Wide primitive Buffering stock m3 initial {b} capacitance 4\n\
             flow Narrow -> Wide : field \"pipe\" substance water conductance 0.3{way}\n"
        )
    };
    let ix = |c: &facets_compose::Circuit, n: &str| c.nodes.iter().position(|x| x.name == n).unwrap();
    // Forward: 10 m3 in the narrow tank settle at height 2 in both: 2 and 8.
    let c = field_run(&tanks(10.0, 0.0, ""), 200);
    assert!((c.nodes[ix(&c, "Narrow")].storage - 2.0).abs() < 1e-3, "{}", c.nodes[ix(&c, "Narrow")].storage);
    assert!((c.nodes[ix(&c, "Wide")].storage - 8.0).abs() < 1e-3);
    // Backward: the wide tank full, the same pipe runs the other way.
    let c = field_run(&tanks(0.0, 10.0, ""), 200);
    assert!((c.nodes[ix(&c, "Narrow")].storage - 2.0).abs() < 1e-3, "{}", c.nodes[ix(&c, "Narrow")].storage);
    // `one way`: a check valve holds the backward flow.
    let c = field_run(&tanks(0.0, 10.0, " one way"), 200);
    assert_eq!(c.nodes[ix(&c, "Narrow")].storage, 0.0);
    // Never past level, however large G · Δt: one step at G = 100 evens out.
    let c = field_run(&tanks(10.0, 0.0, "").replace("conductance 0.3", "conductance 100"), 1);
    assert!((c.nodes[ix(&c, "Narrow")].storage - 2.0).abs() < 1e-4, "{}", c.nodes[ix(&c, "Narrow")].storage);
    assert!(c.balance().abs() < 1e-4);
}

#[test]
fn a_capacitor_charges_to_its_sources_potential() {
    let c = field_run(
        "system \"RC\" : Concrete/Physical\n\
         source Battery potential 12\n\
         interface Lead\n\
         component Cap primitive Buffering stock C capacitance 2\n\
         flow Battery -> Lead : field \"current\" substance charge conductance 0.25\n\
         flow Lead -> Cap : field \"current\" substance charge conductance 0.25\n",
        300,
    );
    let cap = c.nodes.iter().position(|x| x.name == "Cap").unwrap();
    // Charge = C · V = 24 at rest, approached from below.
    assert!((c.nodes[cap].storage - 24.0).abs() < 1e-2, "{}", c.nodes[cap].storage);
    assert!(c.nodes[cap].storage <= 24.0 + 1e-4);
}

#[test]
fn field_words_refuse_off_their_readers() {
    let base = "system \"S\" : Concrete/Physical\ncomponent A primitive Buffering stock m\ncomponent B primitive Buffering stock m\n";
    let f = |line: &str| errs(&format!("{base}{line}\n"));
    assert!(f("flow A -> B : matter \"x\" conductance 1").contains("write the flow `: field`"));
    assert!(f("flow A -> B : field \"x\" conductance -1").contains("conductance syntax"));
    assert!(f("flow A -> B : field \"x\" amount 2 conductance 1").contains("not a declared amount"));
    assert!(errs("system \"S\" : Concrete/Physical\nsink Out potential 3\n").contains("`source` line only"));
    assert!(errs("system \"S\" : Concrete/Physical\ncomponent X primitive Combining capacitance 2 interface\n").contains("Buffering component only"));
}
