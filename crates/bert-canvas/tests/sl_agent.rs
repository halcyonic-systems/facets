//! The `agent` line (SL v1.10, facets#269, ADR 0008): a decision-maker as a
//! thing of its own kind. It parses onto `Thing.rule` with its numbers in the
//! bag, draws its tap and its command wire, projects to a policy-only system
//! the seam lists as an agent, emits back as itself, and refuses what the
//! design pass said it must: a non-stock to watch, a process that reads no
//! signal, an agent over an agent, a flow written against it, a zero gain,
//! and the agent fields named on a component.
use bert_canvas::canvas::{project, AgentRule, EngineField, Kind, ParamAnchor};
use bert_canvas::sl::{emit_sl, parse_sl};
use bert_core::Policy;

const ROOM: &str = "\
system \"Room\" : Concrete/Technical
interface Mains
interface Walls
component Room primitive Buffering stock kWh initial 0.5 time constant 5
component Switch primitive Modulating backpressure
agent Thermostat watches Room rule proportional target 2 gain 0.5 manages Switch
    description \"Reads the room, decides how far to open the switch.\"
source Grid
sink Outdoors
flow Grid -> Mains : energy \"electricity\" substance heat amount 2 unit \"kWh/h\"
flow Mains -> Switch : energy \"electricity\" substance heat
flow Switch -> Room : energy \"heat\" substance heat
flow Room -> Walls : energy \"loss\" substance heat
flow Walls -> Outdoors : energy \"loss\" substance heat
param \"setpoint\" : target of Thermostat range 0.4..4
param \"sensitivity\" : gain of Thermostat range 0.1..2
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
fn an_agent_line_parses_draws_its_wires_and_projects_as_an_agent() {
    let m = parse_sl(ROOM).unwrap();
    let th = m.things.iter().find(|t| t.name == "Thermostat").unwrap();
    assert_eq!(th.rule, Some(AgentRule::Proportional));
    assert_eq!(th.primitive, None);
    assert_eq!(th.cognitive_params.get("target"), Some(&2.0));
    assert_eq!(th.cognitive_params.get("gain"), Some(&0.5));
    assert_eq!(th.description, "Reads the room, decides how far to open the switch.");
    let room = m.things.iter().find(|t| t.name == "Room").unwrap();
    let switch = m.things.iter().find(|t| t.name == "Switch").unwrap();
    let tap = m.relations.iter().find(|r| r.a == room.id && r.b == th.id).expect("the tap is drawn");
    let cmd = m.relations.iter().find(|r| r.a == th.id && r.b == switch.id).expect("the command wire is drawn");
    assert_eq!((tap.kind, tap.name.as_str()), (Kind::Informational, "reading"));
    assert_eq!((cmd.kind, cmd.name.as_str()), (Kind::Informational, "command"));
    assert!(m.params.iter().any(|p| {
        p.name == "setpoint"
            && p.anchor == ParamAnchor::Field { thing: th.id, field: EngineField::Target }
    }));

    let world = project(&m);
    let sys = world.systems.iter().find(|s| s.info.name == "Thermostat").unwrap();
    let agent = sys.agent.as_ref().unwrap();
    assert_eq!(agent.primitive, None);
    assert_eq!(agent.policy, Some(Policy::Proportional { target: 2.0, gain: 0.5 }));
    let spec = bert_core::operational::validate_operational(&world).expect("projects");
    assert_eq!(spec.agents.len(), 1);
    assert_eq!(spec.agents[0].name, "Thermostat");
    assert!(spec.processes.iter().all(|p| p.name != "Thermostat"));
    assert!(spec.flows.iter().any(|f| f.name == "reading"));
    assert!(spec.flows.iter().any(|f| f.name == "command"));
}

#[test]
fn an_agent_emits_as_its_line_and_never_as_flows() {
    let m = parse_sl(ROOM).unwrap();
    let text = emit_sl(&m).unwrap();
    assert!(
        text.contains("agent Thermostat watches Room rule proportional target 2 gain 0.5 manages Switch"),
        "{text}"
    );
    assert!(!text.contains("flow Room -> Thermostat"), "{text}");
    assert!(!text.contains("flow Thermostat -> Switch"), "{text}");
    // The agent line comes after the things it names and before the flows.
    let at = |s: &str| text.find(s).unwrap_or_else(|| panic!("{s} missing in {text}"));
    assert!(at("component Switch") < at("agent Thermostat"));
    assert!(at("agent Thermostat") < at("flow Grid"));
    let again = parse_sl(&text).unwrap();
    assert_eq!(again.things.len(), m.things.len());
    assert_eq!(again.relations.len(), m.relations.len());
    let th = again.things.iter().find(|t| t.name == "Thermostat").unwrap();
    assert_eq!(th.cognitive_params, m.things.iter().find(|t| t.name == "Thermostat").unwrap().cognitive_params);
    assert_eq!(emit_sl(&again).unwrap(), text, "canonical form is a fixpoint");
}

#[test]
fn the_kernel_read_back_keeps_the_agent() {
    let m = parse_sl(ROOM).unwrap();
    let world = project(&m);
    let back = bert_canvas::canvas::to_canvas(&world);
    let th = back.things.iter().find(|t| t.name == "Thermostat").unwrap();
    assert_eq!(th.rule, Some(AgentRule::Proportional));
    assert_eq!(th.cognitive_params.get("target"), Some(&2.0));
    assert_eq!(th.cognitive_params.get("gain"), Some(&0.5));
    assert!(emit_sl(&back).unwrap().contains("agent Thermostat watches Room"));
}

#[test]
fn directed_marks_count_flow_lines_not_the_drawn_pair() {
    let text = format!("{ROOM}\n@directed 1\n");
    let m = parse_sl(&text).unwrap();
    let grid = m.things.iter().find(|t| t.name == "Grid").unwrap();
    let directed: Vec<&bert_canvas::canvas::Relation> = m.relations.iter().filter(|r| r.klir_directed).collect();
    assert_eq!(directed.len(), 1);
    assert_eq!(directed[0].a, grid.id, "@directed 1 is the first flow the author wrote");
    assert!(emit_sl(&m).unwrap().contains("@directed 1\n"));
}

#[test]
fn the_agent_faults_are_named() {
    let swap = |from: &str, to: &str| ROOM.replace(from, to);
    // watches a non-stock
    let e = errs(&swap("watches Room", "watches Switch"));
    assert!(e.contains("not a Buffering component"), "{e}");
    // manages a process that reads no signal
    let e = errs(&swap("component Switch primitive Modulating backpressure", "component Switch primitive Combining"));
    assert!(e.contains("reads no control signal"), "{e}");
    // an agent over an agent
    let e = errs(&swap(
        "source Grid",
        "agent Boss watches Room rule proportional target 1 gain 1 manages Thermostat\nsource Grid",
    ));
    assert!(e.contains("no agent manages an agent"), "{e}");
    // a flow written against the agent
    let e = errs(&swap("source Grid", "source Grid\nflow Room -> Thermostat : informational"));
    assert!(e.contains("drawn by the agent line"), "{e}");
    // a zero gain, a non-positive target
    let e = errs(&swap("gain 0.5", "gain 0"));
    assert!(e.contains("zero gain watches nothing"), "{e}");
    let e = errs(&swap("target 2", "target 0"));
    assert!(e.contains("`target` must be positive"), "{e}");
    // a rule the set does not have, a rule missing its numbers
    let e = errs(&swap("rule proportional target 2 gain 0.5", "rule markov states 3"));
    assert!(e.contains("unknown rule `markov`"), "{e}");
    let e = errs(&swap("rule proportional target 2 gain 0.5", "rule proportional target 2"));
    assert!(e.contains("`gain` is missing or out of place"), "{e}");
    // agent fields on a component, a component field on an agent
    let e = errs(&swap("target of Thermostat", "target of Switch"));
    assert!(e.contains("is not an agent"), "{e}");
    let e = errs(&swap("target of Thermostat", "setpoint of Thermostat"));
    assert!(e.contains("is an agent — its parameters are its rule's (target, gain)"), "{e}");
    // referents must be declared first
    let e = errs(&swap("watches Room", "watches Attic"));
    assert!(e.contains("`Attic` is not declared"), "{e}");
}

const RELAY: &str = "\
system \"Room\" : Concrete/Technical
interface Mains
interface Walls
component Room primitive Buffering stock kWh initial 0.5 time constant 5
component Switch primitive Modulating backpressure
agent Thermostat watches Room rule threshold above 2 emit 0 else 1 manages Switch
source Grid
sink Outdoors
flow Grid -> Mains : energy \"electricity\" substance heat amount 2 unit \"kWh/h\"
flow Mains -> Switch : energy \"electricity\" substance heat
flow Switch -> Room : energy \"heat\" substance heat
flow Room -> Walls : energy \"loss\" substance heat
flow Walls -> Outdoors : energy \"loss\" substance heat
param \"level\" : above of Thermostat range 0.4..4
";

#[test]
fn a_threshold_rule_parses_projects_and_emits_back() {
    let m = parse_sl(RELAY).unwrap();
    let th = m.things.iter().find(|t| t.name == "Thermostat").unwrap();
    assert_eq!(th.rule, Some(AgentRule::Threshold));
    assert_eq!(th.cognitive_params.get("above"), Some(&2.0));
    assert_eq!(th.cognitive_params.get("emit"), Some(&0.0));
    assert_eq!(th.cognitive_params.get("else"), Some(&1.0));
    assert!(m.params.iter().any(|p| p.anchor == ParamAnchor::Field { thing: th.id, field: EngineField::Above }));
    let world = project(&m);
    let agent = world.systems.iter().find(|s| s.info.name == "Thermostat").unwrap().agent.as_ref().unwrap();
    assert_eq!(agent.policy, Some(Policy::Threshold { above: 2.0, below: None, emit: 0.0, otherwise: 1.0 }));
    let text = emit_sl(&m).unwrap();
    assert!(text.contains("agent Thermostat watches Room rule threshold above 2 emit 0 else 1 manages Switch"), "{text}");
    assert_eq!(emit_sl(&parse_sl(&text).unwrap()).unwrap(), text);
    let back = bert_canvas::canvas::to_canvas(&world);
    assert_eq!(back.things.iter().find(|t| t.name == "Thermostat").unwrap().rule, Some(AgentRule::Threshold));
}

#[test]
fn the_threshold_faults_are_named() {
    let swap = |from: &str, to: &str| RELAY.replace(from, to);
    // past a gate's reach: requisite variety as a parse fault
    let e = errs(&swap("emit 0 else 1", "emit 0 else 2"));
    assert!(e.contains("requisite variety") && e.contains("0..1"), "{e}");
    // the same command on both sides decides nothing
    let e = errs(&swap("emit 0 else 1", "emit 1 else 1"));
    assert!(e.contains("decides nothing"), "{e}");
    // a number missing or out of order
    let e = errs(&swap("above 2 emit 0 else 1", "above 2 else 1 emit 0"));
    assert!(e.contains("`emit` is missing or out of place"), "{e}");
    let e = errs(&swap("above 2 emit 0 else 1", "above 2 emit 0"));
    assert!(e.contains("`else` is missing or out of place"), "{e}");
    // a param naming another rule's field
    let e = errs(&swap("above of Thermostat", "target of Thermostat"));
    assert!(e.contains("runs a threshold rule — its parameters are its rule's (above, emit, else)"), "{e}");
    // a non-positive level, a negative command
    let e = errs(&swap("above 2", "above 0"));
    assert!(e.contains("`above` must be positive"), "{e}");
    let e = errs(&swap("emit 0 else 1", "emit -1 else 1"));
    assert!(e.contains("cannot be negative"), "{e}");
}

/// The hysteresis band (facets#517): `below` between the level and the
/// commands is optional, parses into the bag and the policy, emits back in
/// place, and a `param` may name it; without it the line means what it
/// meant before and the policy carries no band.
#[test]
fn a_banded_threshold_parses_projects_and_emits_back() {
    let banded = RELAY
        .replace("above 2 emit 0 else 1", "above 2.2 below 1.8 emit 0 else 1")
        .replace("param \"level\" : above of Thermostat range 0.4..4", "param \"floor\" : below of Thermostat range 0.4..2");
    let m = parse_sl(&banded).unwrap();
    let th = m.things.iter().find(|t| t.name == "Thermostat").unwrap();
    assert_eq!(th.cognitive_params.get("below"), Some(&1.8));
    assert!(m.params.iter().any(|p| p.anchor == ParamAnchor::Field { thing: th.id, field: EngineField::Below }));
    let world = project(&m);
    let agent = world.systems.iter().find(|s| s.info.name == "Thermostat").unwrap().agent.as_ref().unwrap();
    assert_eq!(agent.policy, Some(Policy::Threshold { above: 2.2, below: Some(1.8), emit: 0.0, otherwise: 1.0 }));
    let text = emit_sl(&m).unwrap();
    assert!(text.contains("rule threshold above 2.2 below 1.8 emit 0 else 1 manages Switch"), "{text}");
    assert_eq!(emit_sl(&parse_sl(&text).unwrap()).unwrap(), text);
    let back = bert_canvas::canvas::to_canvas(&world);
    assert_eq!(back.things.iter().find(|t| t.name == "Thermostat").unwrap().cognitive_params.get("below"), Some(&1.8));
    // The bandless line projects to a policy with no band, so a model that
    // never says `below` runs exactly as it did before the word existed.
    let bare = project(&parse_sl(RELAY).unwrap());
    let policy = bare.systems.iter().find(|s| s.info.name == "Thermostat").unwrap().agent.as_ref().unwrap().policy.clone();
    assert!(matches!(policy, Some(Policy::Threshold { below: None, .. })));
}

#[test]
fn the_band_faults_are_named() {
    let swap = |from: &str, to: &str| RELAY.replace(from, to);
    // the floor at or over the ceiling is no band
    let e = errs(&swap("above 2 emit 0 else 1", "above 2 below 2 emit 0 else 1"));
    assert!(e.contains("`below` 2 is not under `above` 2"), "{e}");
    let e = errs(&swap("above 2 emit 0 else 1", "above 2 below 2.5 emit 0 else 1"));
    assert!(e.contains("is not under `above`") && e.contains("drop `below`"), "{e}");
    // a non-positive floor
    let e = errs(&swap("above 2 emit 0 else 1", "above 2 below 0 emit 0 else 1"));
    assert!(e.contains("`below` must be positive"), "{e}");
    // out of place: the band sits between the level and the commands
    let e = errs(&swap("above 2 emit 0 else 1", "above 2 emit 0 else 1 below 1"));
    assert!(e.contains("`threshold above <n> [below <n>] emit <n> else <n>`"), "{e}");
    // a param on a band the line never declared
    let e = errs(&swap("param \"level\" : above of Thermostat range 0.4..4", "param \"floor\" : below of Thermostat range 0.4..2"));
    assert!(e.contains("`Thermostat` declares no `below`"), "{e}");
    // `below` is the threshold rule's word, not the proportional rule's
    let e = errs(&ROOM.replace("param \"sensitivity\" : gain of Thermostat range 0.1..2", "param \"floor\" : below of Thermostat range 0.1..2"));
    assert!(e.contains("runs a proportional rule — its parameters are its rule's (target, gain)"), "{e}");
}

const WARD: &str = "\
system \"Ward\" : Concrete/Technical
interface Admissions
interface Discharge
component Triage primitive Modulating backpressure
component Ward primitive Buffering stock beds initial 24 capacity 40 time constant 4
agent Gatekeeper watches Ward rule table under 20 emit 1 under 36 emit 0.5 else 0 manages Triage
source Referrals
sink Home
flow Referrals -> Admissions : matter \"arrivals\" substance patients amount 8 unit \"patients/day\"
flow Admissions -> Triage : matter \"arrivals\" substance patients
flow Triage -> Ward : matter \"admitted\" substance patients
flow Ward -> Discharge : matter \"discharged\" substance patients
flow Discharge -> Home : matter \"discharged\" substance patients
";

/// The table rule (ADR 0008 D4): one `under … emit …` pair per bin, then
/// `else`; the bag numbers the pairs, the policy carries them as two lists,
/// the line emits back with the numbers stripped, and the round trip is a
/// fixpoint at any arity.
#[test]
fn a_table_rule_parses_projects_and_emits_back() {
    let m = parse_sl(WARD).unwrap();
    let g = m.things.iter().find(|t| t.name == "Gatekeeper").unwrap();
    assert_eq!(g.rule, Some(AgentRule::Table));
    assert_eq!(g.cognitive_params.get("under1"), Some(&20.0));
    assert_eq!(g.cognitive_params.get("emit1"), Some(&1.0));
    assert_eq!(g.cognitive_params.get("under2"), Some(&36.0));
    assert_eq!(g.cognitive_params.get("emit2"), Some(&0.5));
    assert_eq!(g.cognitive_params.get("else"), Some(&0.0));
    assert_eq!(g.cognitive_params.len(), 5);
    let world = project(&m);
    let agent = world.systems.iter().find(|s| s.info.name == "Gatekeeper").unwrap().agent.as_ref().unwrap();
    assert_eq!(
        agent.policy,
        Some(Policy::Table { bounds: vec![20.0, 36.0], outputs: vec![1.0, 0.5], otherwise: 0.0 })
    );
    let text = emit_sl(&m).unwrap();
    assert!(text.contains("rule table under 20 emit 1 under 36 emit 0.5 else 0 manages Triage"), "{text}");
    assert_eq!(emit_sl(&parse_sl(&text).unwrap()).unwrap(), text);
    let back = bert_canvas::canvas::to_canvas(&world);
    let g = back.things.iter().find(|t| t.name == "Gatekeeper").unwrap();
    assert_eq!(g.rule, Some(AgentRule::Table));
    assert_eq!(g.cognitive_params.get("under2"), Some(&36.0));
    assert!(emit_sl(&back).unwrap().contains("rule table under 20 emit 1 under 36 emit 0.5 else 0"));
    // Three bins round-trip the same way: the arity is the line's, not the rule's.
    let three = WARD.replace("under 20 emit 1 under 36 emit 0.5 else 0", "under 10 emit 1 under 20 emit 0.75 under 36 emit 0.5 else 0");
    let text = emit_sl(&parse_sl(&three).unwrap()).unwrap();
    assert!(text.contains("under 10 emit 1 under 20 emit 0.75 under 36 emit 0.5 else 0"), "{text}");
    assert_eq!(emit_sl(&parse_sl(&text).unwrap()).unwrap(), text);
}

#[test]
fn the_table_faults_are_named() {
    let swap = |from: &str, to: &str| WARD.replace(from, to);
    let bins = "under 20 emit 1 under 36 emit 0.5 else 0";
    // one bin is a threshold, and the hint spells it
    let e = errs(&swap(bins, "under 36 emit 1 else 0"));
    assert!(e.contains("a table with one bin is a threshold"), "{e}");
    assert!(e.contains("`rule threshold above 36 emit 0 else 1`"), "{e}");
    // bounds that do not rise: ADR 0008 D4's overlapping or gapped bins
    let e = errs(&swap(bins, "under 36 emit 1 under 20 emit 0.5 else 0"));
    assert!(e.contains("`under` bounds must strictly increase") && e.contains("overlaps or gaps"), "{e}");
    let e = errs(&swap(bins, "under 20 emit 1 under 20 emit 0.5 else 0"));
    assert!(e.contains("strictly increase"), "{e}");
    // a non-positive bound, a negative output
    let e = errs(&swap(bins, "under 0 emit 1 under 36 emit 0.5 else 0"));
    assert!(e.contains("`under` bound must be positive"), "{e}");
    let e = errs(&swap(bins, "under 20 emit 1 under 36 emit -0.5 else 0"));
    assert!(e.contains("cannot be negative"), "{e}");
    // requisite variety: a gate reads 0..1
    let e = errs(&swap(bins, "under 20 emit 2 under 36 emit 0.5 else 0"));
    assert!(e.contains("requisite variety") && e.contains("a table emitting 2 / 0.5 / 0"), "{e}");
    // no bin at all, a pair out of order, a missing else
    let e = errs(&swap(bins, "else 0"));
    assert!(e.contains("at least one bin"), "{e}");
    let e = errs(&swap(bins, "emit 1 under 20 under 36 emit 0.5 else 0"));
    assert!(e.contains("the first `under … emit …` pair is missing or out of place"), "{e}");
    let e = errs(&swap(bins, "under 20 emit 1 under 36 emit 0.5"));
    assert!(e.contains("`under … emit …` or `else` is missing or out of place"), "{e}");
    // a param names no table bin: the bins are the line's and the session's
    let e = errs(&format!("{WARD}param \"closes at\" : above of Gatekeeper range 10..40\n"));
    assert!(e.contains("runs a table rule — its parameters are its rule's (under, emit, else), not `above`"), "{e}");
}

/// The trace rule (ADR 0008 D4, the first use of H): `window`, `target`,
/// `gain` parse into the bag and the policy, emit back, and `window` may be
/// named by a `param`.
#[test]
fn a_trace_rule_parses_projects_and_emits_back() {
    let traced = ROOM
        .replace("rule proportional target 2 gain 0.5", "rule trace window 3 target 2 gain 0.5")
        .replace("param \"setpoint\" : target of Thermostat range 0.4..4", "param \"memory\" : window of Thermostat range 1..12");
    let m = parse_sl(&traced).unwrap();
    let th = m.things.iter().find(|t| t.name == "Thermostat").unwrap();
    assert_eq!(th.rule, Some(AgentRule::Trace));
    assert_eq!(th.cognitive_params.get("window"), Some(&3.0));
    assert!(m.params.iter().any(|p| p.anchor == ParamAnchor::Field { thing: th.id, field: EngineField::Window }));
    let world = project(&m);
    let agent = world.systems.iter().find(|s| s.info.name == "Thermostat").unwrap().agent.as_ref().unwrap();
    assert_eq!(agent.policy, Some(Policy::Trace { window: 3, target: 2.0, gain: 0.5 }));
    let text = emit_sl(&m).unwrap();
    assert!(text.contains("rule trace window 3 target 2 gain 0.5 manages Switch"), "{text}");
    assert_eq!(emit_sl(&parse_sl(&text).unwrap()).unwrap(), text);
    let back = bert_canvas::canvas::to_canvas(&world);
    assert_eq!(back.things.iter().find(|t| t.name == "Thermostat").unwrap().cognitive_params.get("window"), Some(&3.0));
}

#[test]
fn the_trace_faults_are_named() {
    let traced = ROOM.replace("rule proportional target 2 gain 0.5", "rule trace window 3 target 2 gain 0.5");
    let swap = |from: &str, to: &str| traced.replace(from, to);
    // a zero window remembers nothing; a fractional one is no tick count
    let e = errs(&swap("window 3", "window 0"));
    assert!(e.contains("`window` must be a positive whole number") && e.contains("remembers nothing"), "{e}");
    let e = errs(&swap("window 3", "window 1.5"));
    assert!(e.contains("`window` must be a positive whole number"), "{e}");
    // the proportional refusals carry over
    let e = errs(&swap("gain 0.5", "gain 0"));
    assert!(e.contains("zero gain watches nothing"), "{e}");
    let e = errs(&swap("target 2", "target 0"));
    assert!(e.contains("`target` must be positive"), "{e}");
    // the clauses in order
    let e = errs(&swap("window 3 target 2 gain 0.5", "target 2 gain 0.5 window 3"));
    assert!(e.contains("`window` is missing or out of place"), "{e}");
    // `window` is the trace rule's word, not the proportional rule's
    let e = errs(&ROOM.replace("param \"sensitivity\" : gain of Thermostat range 0.1..2", "param \"memory\" : window of Thermostat range 1..12"));
    assert!(e.contains("runs a proportional rule — its parameters are its rule's (target, gain)"), "{e}");
}
