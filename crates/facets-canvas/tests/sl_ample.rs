//! `ample` in SL (walkthrough #9) — an availability assertion in place of a
//! magnitude: the signal is present and never the binding constraint.
//!
//! Discovered by llm-market: the only way to say "weights availability never
//! binds" was `amount 100000 unit avail/day`, which leaks a meaningless magic
//! number into the diagram. `ample` says it as a word.
//!
//! Grammar under test (the flow production's amount slot):
//!
//! ```text
//! flow <a> -> <b> : informational ["label"] [substance <s>] [amount <n> | ample]
//! ```
//!
//! Ample is NOT a quantity, so everything quantity-shaped beside it is a
//! contradiction — each refusal below is a separating instance (SSF #35). It
//! projects to `Interaction::ample` and stops there structurally; what the
//! ENGINE does with it (the min's signal limb never binds) is held by the
//! equivalence test in bert-compose.

use bert_canvas::canvas::project;
use bert_canvas::sl::{emit_sl, parse_sl};

const AMPLE: &str = "\
system \"Amp Rig\" : Concrete/Technical
source Lab
source Grid
component Model primitive Amplifying interface
sink Served
flow Lab -> Model : informational \"released weights\" ample
flow Grid -> Model : energy \"compute\" amount 100 unit kW
flow Model -> Served : informational \"tokens\"
";

fn errs(text: &str) -> String {
    parse_sl(text)
        .expect_err("fixture must fail its check")
        .iter()
        .map(|e| e.message.clone())
        .collect::<Vec<_>>()
        .join(" | ")
}

/// Law: `ample` parses onto the relation as the flag, with no amount and no
/// unit — availability is not a magnitude.
#[test]
fn ample_parses_as_the_flag() {
    let m = parse_sl(AMPLE).expect("ample must parse");
    let r = &m.relations[0];
    assert!(r.ample);
    assert_eq!(r.amount, None);
    assert!(r.unit.is_empty());
    assert!(!m.relations[1].ample, "the metered flow stays metered");
}

/// Law: ample crosses the projection seam onto the kernel interaction.
#[test]
fn ample_projects_onto_the_interaction() {
    let m = parse_sl(AMPLE).unwrap();
    let world = project(&m);
    let ix = world.interactions.iter().find(|i| i.info.name == "released weights").unwrap();
    assert!(ix.ample);
    assert!(!world.interactions.iter().find(|i| i.info.name == "compute").unwrap().ample);
}

/// Law: emit is canonical and the round trip preserves the flag —
/// emit(parse(emit(m))) == emit(m).
#[test]
fn ample_round_trips() {
    let m = parse_sl(AMPLE).unwrap();
    let text = emit_sl(&m).expect("ample must emit");
    assert!(text.contains("flow Lab -> Model : informational \"released weights\" ample"));
    let again = parse_sl(&text).expect("emitted SL must re-parse");
    assert!(again.relations[0].ample);
    assert_eq!(emit_sl(&again).unwrap(), text);
}

/// Separating instance: `ample` beside `amount` is a contradiction, refused.
#[test]
fn ample_with_amount_is_a_fault() {
    let msg = errs(&AMPLE.replace("\"released weights\" ample", "\"released weights\" amount 5 ample"));
    assert!(msg.contains("not both"), "got: {msg}");
}

/// Separating instance: a unit on an ample flow measures nothing, refused.
#[test]
fn ample_with_unit_is_a_fault() {
    let msg = errs(&AMPLE.replace("\"released weights\" ample", "\"released weights\" ample unit avail/day"));
    assert!(msg.contains("no magnitude"), "got: {msg}");
}

/// Separating instance: matter and energy are metered — `ample` is legal only
/// on an informational flow, because only information copies freely enough
/// for "never binding" to be a coherent claim.
#[test]
fn ample_on_metered_substance_is_a_fault() {
    let msg = errs(&AMPLE.replace(
        "flow Grid -> Model : energy \"compute\" amount 100 unit kW",
        "flow Grid -> Model : energy \"compute\" ample",
    ));
    assert!(msg.contains("metered"), "got: {msg}");
}

/// Separating instance: ample on a `mere` relation — a non-bond never
/// projects, so an availability assertion on it cannot mean anything.
#[test]
fn ample_on_mere_is_a_fault() {
    let msg = errs(&AMPLE.replace("\"released weights\" ample", "\"released weights\" ample mere"));
    assert!(msg.contains("mere"), "got: {msg}");
}

/// A param cannot name an ample flow — there is no magnitude to adjust. The
/// existing amountless-anchor fault covers it; this pins that it stays true.
#[test]
fn param_cannot_anchor_an_ample_flow() {
    let msg = errs(&format!("{AMPLE}param \"Weights\" : flow Lab -> Model\n"));
    assert!(msg.contains("declares no amount"), "got: {msg}");
}
