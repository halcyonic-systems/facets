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
    /// `maintenance`, `setpoint`, `initial_storage`), or for a process's own
    /// parameter its SL word (`gain`, `efficiency`, `impedance`).
    pub field: String,
    /// The SL word, for the label.
    pub word: String,
    pub value: Option<f64>,
    pub declared: bool,
    /// The starting level only: SL writes it welded to a stock unit, so it
    /// cannot be declared until the component has one (empty = none yet).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub needs_unit: Option<String>,
    /// A process's own parameter only (walk row 18): how the SL value maps
    /// onto the engine's `param` (`Thing.agency_capacity`), so the face
    /// writes the number without holding the map itself.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub own: Option<OwnKnob>,
}

/// The map from a knob's SL value `v` to the engine's `p`:
/// `v = offset + scale · p`, accepted when `p > 0` and `p ≤ max_param`
/// (when there is one). Read off `OWN_PARAMS` (`facets-core/src/own_param.rs`).
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct OwnKnob {
    pub offset: f64,
    pub scale: f64,
    pub max_param: Option<f64>,
    /// The accepted range in the word's own terms, for the face's hint.
    pub range: String,
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
            own: None,
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
                    own: None,
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
            // The rate law's constant k (#573), on a process that declares
            // it. One that does not passes what is pushed, and has no k.
            ProcessPrimitive::Combining | ProcessPrimitive::Copying if declared("mass_action") => {
                out.push(knob("mass_action", "mass action", positive(node.mass_action), true));
            }
            _ => {}
        }
        // A process's own parameter (walk row 18): Sensing's and Amplifying's
        // `gain`, Propelling's `efficiency`, Impeding's `impedance`, at the
        // value the circuit runs, in the word's own terms.
        if let Some(op) = facets_canvas::sl::own_param(primitive) {
            out.push(EngineKnob {
                own: Some(OwnKnob {
                    offset: op.offset,
                    scale: op.scale,
                    max_param: op.max_param,
                    range: op.range.to_string(),
                }),
                ..knob(op.word, op.word, node.param.is_finite().then(|| op.value_of(node.param)), t.agency_capacity.is_some())
            });
        }
    }
    out
}

/// A flow's amount as the run uses it (walk row 21): a source's rate, or a
/// process outflow's weight in its split. `value` is read off the projection
/// the run is built from, so an undeclared flow shows what it runs at (the
/// default, or the amount a fused crossing leg takes from its interior leg),
/// never "not set".
#[derive(Serialize, Clone, Debug, PartialEq)]
pub struct FlowKnob {
    pub relation: u64,
    pub value: f64,
    pub declared: bool,
}

/// Every projected, non-ample bond's amount, in `relations` order. Ample flows
/// have no number (availability never binds), so they are left out.
pub fn flow_knobs(model: &CanvasModel) -> Vec<FlowKnob> {
    let p = facets_canvas::canvas::project_with_map(model);
    model
        .relations
        .iter()
        .filter(|r| r.is_bond && !r.ample)
        .filter_map(|r| {
            let id = p.interaction_of.get(&r.id)?;
            let ix = p.world.interactions.iter().find(|i| &i.info.id == id)?;
            Some(FlowKnob {
                relation: r.id,
                value: ix.amount.to_string().parse().ok()?,
                declared: r.amount.is_some(),
            })
        })
        .collect()
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

    /// Only what SL can write: a Splitting process has no line-level knob.
    #[test]
    fn a_declared_rate_law_offers_its_constant() {
        // #573: `mass action <k>` is a knob; a Combining without it has none.
        let k = knobs("component A primitive Buffering stock n initial 5\ncomponent B primitive Buffering stock n\ncomponent Rx primitive Combining mass action 0.4\ncomponent Push primitive Combining\nflow A -> Rx : matter\nflow Rx -> Push : matter\nflow Push -> B : matter\n");
        assert!(k.iter().any(|r| r.field == "mass_action" && r.word == "mass action" && r.value == Some(0.4f32 as f64) && r.declared), "{k:?}");
        assert_eq!(k.iter().filter(|r| r.field == "mass_action").count(), 1, "{k:?}");
    }

    #[test]
    fn only_knobs_the_text_can_say_are_offered() {
        let k = knobs("component S primitive Splitting interface\ncomponent C primitive Copying interface\nenvironment In\nenvironment Out\nflow In -> S : matter\nflow S -> C : informational\nflow C -> Out : informational\n");
        assert!(k.is_empty(), "{k:?}");
    }

    /// Walk row 18: a process's own parameter is a knob on the four
    /// primitives that read it, in its SL word, at what the circuit runs.
    #[test]
    fn a_process_offers_its_own_parameter_in_its_word() {
        // An amplifier needs a signal and power in and a signal out to build.
        let src = |decl: &str| {
            if decl.contains("Amplifying") {
                format!("component P {decl} interface\nenvironment In\nenvironment Grid\nenvironment Out\nflow In -> P : informational\nflow Grid -> P : energy\nflow P -> Out : informational\n")
            } else {
                format!("component P {decl} interface\nenvironment In\nenvironment Out\nflow In -> P : matter\nflow P -> Out : matter\n")
            }
        };
        let one = |decl: &str| {
            let k = knobs(&src(decl));
            assert_eq!(k.len(), 1, "{decl}: {k:?}");
            k.into_iter().next().unwrap()
        };
        // Undeclared: the projection's 0.5 in each word's terms.
        let a = one("primitive Amplifying");
        assert_eq!((a.field.as_str(), a.value, a.declared), ("gain", Some(5.5), false));
        assert_eq!(a.own.as_ref().map(|o| (o.offset, o.scale)), Some((1.0, 9.0)));
        let p = one("primitive Propelling");
        assert_eq!((p.field.as_str(), p.value, p.declared), ("efficiency", Some(0.5), false));
        let i = one("primitive Impeding");
        assert_eq!((i.field.as_str(), i.value, i.declared), ("impedance", Some(0.5), false));
        assert_eq!(i.own.as_ref().and_then(|o| o.max_param), Some(1.0));
        // A sensor reports what it sees.
        let s = one("primitive Sensing");
        assert_eq!((s.field.as_str(), s.value, s.declared), ("gain", Some(1.0), false));
        // Declared values read back as written.
        assert_eq!(one("primitive Impeding impedance 0.3").value, Some(0.3));
        assert!(one("primitive Impeding impedance 0.3").declared);
        assert_eq!(one("primitive Amplifying gain 4").value, Some(4.0));
        assert_eq!(one("primitive Propelling efficiency 0.9").value, Some(0.9));
    }

    /// Walk row 21: the drawn source's flow had no amount, the inputs said
    /// "not set", and the run sent 1 per tick. The knob now says what runs.
    #[test]
    fn an_undeclared_flow_reports_the_amount_it_runs_at() {
        let m = parse_sl("component T1 primitive Buffering interface\nenvironment E5\nenvironment E6\nflow E5 -> T1 : matter\nflow T1 -> E6 : matter amount 3\n").unwrap();
        let k = flow_knobs(&m);
        let of = |a: &str| {
            let id = m.things.iter().find(|t| t.name == a).unwrap().id;
            let r = m.relations.iter().find(|r| r.a == id).unwrap().id;
            k.iter().find(|x| x.relation == r).cloned().unwrap_or_else(|| panic!("no knob from {a}: {k:?}"))
        };
        assert_eq!((of("E5").value, of("E5").declared), (1.0, false));
        assert_eq!((of("T1").value, of("T1").declared), (3.0, true));
        let one: f64 = facets_canvas::canvas::DEFAULT_FLOW_AMOUNT.to_string().parse().unwrap();
        assert_eq!(of("E5").value, one, "the default is the projection's constant");
    }

    #[test]
    fn ample_flows_offer_no_amount() {
        let m = parse_sl("component T1 primitive Buffering interface\nenvironment E5\nenvironment E6\nflow E5 -> T1 : informational ample\nflow T1 -> E6 : matter\n").unwrap();
        let e5 = m.things.iter().find(|t| t.name == "E5").unwrap().id;
        let r = m.relations.iter().find(|r| r.a == e5).unwrap().id;
        assert!(flow_knobs(&m).iter().all(|k| k.relation != r));
    }
}
