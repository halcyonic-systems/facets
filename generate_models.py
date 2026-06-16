"""Generate the three bert#77 Deliverable-A generic framework models.

Authors the intermediate SPECS here (sanctioned: hand-author the spec, never the
final JSON), runs them through the offline bert_generator (generate(), never
validate_repair_generate() — it drops L2 flows), and writes the BERT JSON to
bert-lenses/assets/. Each model is shaped so its lens-entry teaches:

  Klir  — S=(T,R): two uncoupled things + boundary relations; NO internal bond
          -> enters Core/Operational, FAILS Structural (aggregate, Bunge Def 1.1)
  Bunge — C/E/S: two bonded components (the bond = a system<->system flow)
          -> enters Core/Structural/Operational
  Mobus — the 8-tuple: a 3-component network + interfaces + typed flows
          -> enters Core/Structural/Operational
"""
import json
import os
import bert_generator

OUT = os.path.join(os.path.dirname(__file__), "assets")

MSG = {"type": "Message", "sub_type": "signal"}

KLIR = {
    "name": "Klir — S = (T, R)",
    "description": "What Klir says a system is: a set of things T and a relation R on them. "
                   "General and minimal. Its two components are uncoupled, so by Bunge's "
                   "stricter criterion it is an aggregate, not yet a system.",
    "environment_name": "Environment",
    "sources": [{"name": "Input", "description": "a thing in the environment"}],
    "sinks": [{"name": "Output", "description": "a thing in the environment"}],
    "routing_table": [
        {"interface": "In", "type": "Import", "connected_to": "Input", "description": "receives Input"},
        {"interface": "Out", "type": "Export", "connected_to": "Output", "description": "emits Output"},
    ],
    "subsystems": [
        {"name": "Thing A", "description": "an element of T"},
        {"name": "Thing B", "description": "an element of T (uncoupled from A)"},
    ],
    "external_flows": [
        {"name": "Relation in", "description": "a relation on T", "interface": "In",
         "substance": MSG, "usability": "Resource"},
        {"name": "Relation out", "description": "a relation on T", "interface": "Out",
         "substance": MSG, "usability": "Product"},
    ],
    # No internal_flows -> Thing A and Thing B are uncoupled -> no bond -> aggregate.
}

BUNGE = {
    "name": "Bunge — Composition / Environment / Structure",
    "description": "What Bunge says a system is (Def 1.1): at least two different connected "
                   "things. The bond between the components is the structure that separates a "
                   "system from an aggregate.",
    "environment_name": "Environment",
    "sources": [{"name": "Input", "description": "environment"}],
    "sinks": [{"name": "Output", "description": "environment"}],
    "routing_table": [
        {"interface": "In", "type": "Import", "connected_to": "Input", "description": "receives Input"},
        {"interface": "Out", "type": "Export", "connected_to": "Output", "description": "emits Output"},
    ],
    "subsystems": [
        {"name": "Component A", "description": "a connected thing"},
        {"name": "Component B", "description": "a connected thing"},
    ],
    "external_flows": [
        {"name": "Relation in", "description": "input from environment", "interface": "In",
         "substance": MSG, "usability": "Resource"},
        {"name": "Relation out", "description": "output to environment", "interface": "Out",
         "substance": MSG, "usability": "Product"},
    ],
    "internal_flows": [
        {"name": "Bond", "description": "the coupling that makes A and B cohere into a system",
         "source": "Component A", "sink": "Component B", "substance": MSG, "usability": "Resource"},
    ],
}

MOBUS = {
    "name": "Mobus — the 8-tuple ⟨C, N, E, G, B, T, H, Δt⟩",
    "description": "What Mobus says a system is: components (C) in a network (N), within an "
                   "environment (E), across a boundary (B) with interfaces, carrying typed "
                   "flows (T). Genealogy, history and time-constant are the dynamical face "
                   "(Full mode), out of the three lenses.",
    "environment_name": "Environment",
    "sources": [{"name": "Input", "description": "environment"}],
    "sinks": [{"name": "Output", "description": "environment"}],
    "routing_table": [
        {"interface": "Sensing", "type": "Import", "connected_to": "Input", "description": "intake"},
        {"interface": "Acting", "type": "Export", "connected_to": "Output", "description": "output"},
    ],
    "subsystems": [
        {"name": "Sensor", "description": "component C1"},
        {"name": "Controller", "description": "component C2"},
        {"name": "Actuator", "description": "component C3"},
    ],
    "external_flows": [
        {"name": "Stimulus", "description": "input from environment", "interface": "Sensing",
         "substance": MSG, "usability": "Resource"},
        {"name": "Response", "description": "output to environment", "interface": "Acting",
         "substance": MSG, "usability": "Product"},
    ],
    "internal_flows": [
        {"name": "Measurement", "description": "sensor to controller (network edge)",
         "source": "Sensor", "sink": "Controller", "substance": MSG, "usability": "Resource"},
        {"name": "Command", "description": "controller to actuator (network edge)",
         "source": "Controller", "sink": "Actuator", "substance": MSG, "usability": "Resource"},
    ],
}

for fname, spec in [("klir-generic", KLIR), ("bunge-generic", BUNGE), ("mobus-generic", MOBUS)]:
    spec_json = json.dumps(spec)
    errors = bert_generator.validate(spec_json)
    print(f"\n=== {fname} === validate -> {errors if errors else 'OK'}")
    out = bert_generator.generate(spec_json)
    path = os.path.normpath(os.path.join(OUT, f"{fname}.json"))
    with open(path, "w") as f:
        f.write(out)
    parsed = json.loads(out)
    print(f"  wrote {path}: {len(parsed.get('systems', []))} systems, "
          f"{len(parsed.get('interactions', []))} interactions")
