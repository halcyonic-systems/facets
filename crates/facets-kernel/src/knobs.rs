//! The engine knobs a model's components offer, each with the value the run
//! will use (2026-11-02 walk, Shingai's decision 2: show every knob at its
//! default and declare the value when it is moved).
//!
//! Two facts the face must not hold, so they are answered here:
//!
//! - **Which knobs a component has.** Only the fields SL can write on that
//!   component's line (§4.3 of the spec, the `emit_sl` expressibility gate in
//!   `facets-canvas/src/sl.rs`): a knob the text could not say would make the
//!   canvas and the SL disagree in a way no comparison of the text can see.
//! - **What an unset field runs at.** Read off the circuit the run itself
//!   builds (`project` then `from_world_model`), so a default is what runs,
//!   not a copy of a constant that can drift from it.

use facets_canvas::canvas::{CanvasModel, Role};
use facets_core::ProcessPrimitive;
use serde::Serialize;

/// One knob. `value` is what the run uses: the declared value when
/// `declared`, else the engine's default; `None` means the field is off by
/// default (no capacity limit, no upkeep loss) and has no number to show.
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct EngineKnob {
    pub thing: u64,
    /// The session key (`release_rate`, `capacity`, `time_constant`,
    /// `maintenance`, `setpoint`, `initial_storage`, `gain`).
    pub field: String,
    /// The SL word, for the label.
    pub word: String,
    pub value: Option<f64>,
    pub declared: bool,
    /// The starting level only: SL writes it welded to a stock unit, so it
    /// cannot be declared until the component has one (empty = none yet).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub needs_unit: Option<String>,
}

fn positive(v: f32) -> Option<f64> {
    (v.is_finite() && v > 0.0).then_some(v as f64)
}

/// The knobs of every component in `model`, in `things` order. Empty when the
/// model does not build a circuit (it has no run to set knobs on).
pub fn engine_knobs(model: &CanvasModel) -> Vec<EngineKnob> {
    let world = facets_canvas::canvas::project(model);
    let Ok(circuit) = facets_compose::export::from_world_model(&world) else {
        return Vec::new();
    };
    let mut out = Vec::new();
    for t in &model.things {
        if t.role != Role::Component || t.passway || t.rule.is_some() {
            continue;
        }
        let Some(primitive) = t.primitive else { continue };
        let Some(node) = circuit.nodes.iter().find(|n| n.name == t.name) else { continue };
        let declared = |k: &str| t.cognitive_params.contains_key(k);
        let knob = |field: &str, word: &str, value: Option<f64>, declared: bool| EngineKnob {
            thing: t.id,
            field: field.to_string(),
            word: word.to_string(),
            value,
            declared,
            needs_unit: None,
        };
        match primitive {
            ProcessPrimitive::Buffering => {
                let storage = t.initial_state.get("storage").and_then(|v| v.as_f64());
                out.push(EngineKnob {
                    thing: t.id,
                    field: "initial_storage".into(),
                    word: "starting level".into(),
                    value: Some(storage.unwrap_or(node.initial_storage as f64)),
                    declared: storage.is_some(),
                    needs_unit: Some(t.stock_unit.clone()),
                });
                // A fixed release and a time constant are two drain laws, and
                // SL refuses both on one line: offer the one in force.
                if declared("time_constant") {
                    out.push(knob("time_constant", "time constant", positive(node.time_constant), true));
                } else {
                    out.push(knob("release_rate", "release", positive(node.release_rate), declared("release_rate")));
                }
                out.push(knob("capacity", "capacity", positive(node.capacity), declared("capacity")));
                out.push(knob("maintenance", "maintenance", positive(node.maintenance), declared("maintenance")));
            }
            ProcessPrimitive::Inverting => {
                out.push(knob("setpoint", "setpoint", positive(node.setpoint), declared("setpoint")));
            }
            ProcessPrimitive::Sensing => {
                out.push(knob("gain", "gain", positive(node.param), t.agency_capacity.is_some()));
            }
            _ => {}
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use facets_canvas::sl::parse_sl;

    fn knobs(sl: &str) -> Vec<EngineKnob> {
        engine_knobs(&parse_sl(sl).unwrap())
    }

    /// The walk's model: a drawn buffer with nothing declared still offers its
    /// knobs, at what the run uses.
    #[test]
    fn an_undeclared_buffer_offers_its_knobs_at_their_defaults() {
        let k = knobs("component T1 primitive Buffering interface\nenvironment E5\nenvironment E6\nflow E5 -> T1 : matter\nflow T1 -> E6 : matter\n");
        let row = |f: &str| k.iter().find(|r| r.field == f).unwrap_or_else(|| panic!("no {f} knob: {k:?}"));
        assert_eq!(row("initial_storage").value, Some(0.0));
        assert_eq!(row("initial_storage").needs_unit, Some(String::new()), "no stock unit yet");
        assert_eq!(row("release_rate").value, Some(1.0));
        assert_eq!(row("capacity").value, None, "unbounded by default");
        assert_eq!(row("maintenance").value, None, "no upkeep by default");
        assert!(k.iter().all(|r| !r.declared));
        assert!(k.iter().all(|r| r.field != "time_constant"), "one drain law offered");
    }

    #[test]
    fn declared_values_are_read_back_as_declared() {
        let k = knobs("component Tank primitive Buffering interface stock L initial 60 release 12 capacity 200\nenvironment In\nenvironment Out\nflow In -> Tank : matter\nflow Tank -> Out : matter\n");
        let row = |f: &str| k.iter().find(|r| r.field == f).unwrap();
        assert_eq!((row("initial_storage").value, row("initial_storage").declared), (Some(60.0), true));
        assert_eq!(row("initial_storage").needs_unit.as_deref(), Some("L"));
        assert_eq!((row("release_rate").value, row("release_rate").declared), (Some(12.0), true));
        assert_eq!((row("capacity").value, row("capacity").declared), (Some(200.0), true));
    }

    #[test]
    fn a_declared_time_constant_replaces_the_release_knob() {
        let k = knobs("component Tank primitive Buffering interface stock L time constant 3\nenvironment In\nenvironment Out\nflow In -> Tank : matter\nflow Tank -> Out : matter\n");
        assert!(k.iter().any(|r| r.field == "time_constant" && r.value == Some(3.0) && r.declared));
        assert!(k.iter().all(|r| r.field != "release_rate"));
    }

    /// Only what SL can write: a Splitting process has no line-level knob, and
    /// an Amplifying one's parameter is not sayable (only Sensing's `gain` is).
    #[test]
    fn only_knobs_the_text_can_say_are_offered() {
        let k = knobs("component S primitive Splitting interface\ncomponent A primitive Amplifying\nenvironment In\nenvironment Out\nflow In -> S : matter\nflow S -> A : matter\nflow A -> Out : matter\n");
        assert!(k.is_empty(), "{k:?}");
    }
}
