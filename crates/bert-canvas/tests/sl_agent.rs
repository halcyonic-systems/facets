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
    let e = errs(&swap("rule proportional target 2 gain 0.5", "rule table bins 3"));
    assert!(e.contains("unknown rule `table`"), "{e}");
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
    assert_eq!(agent.policy, Some(Policy::Threshold { above: 2.0, emit: 0.0, otherwise: 1.0 }));
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
