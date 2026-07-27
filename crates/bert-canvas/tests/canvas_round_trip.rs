//! What a canvas round-trip costs a runnable model (#216).
//!
//! # EXPECTED TO FAIL until the canvas carries flow quantity (plan Wave 4)
//!
//! `canvas.rs`'s `to_canvas_loads_a_demo_faithfully` asserts that a reloaded demo
//! "should still project to an executable model". It passes. It has always passed.
//! It passed while the reservoir's trajectory changed by 22%, its initial stock fell
//! from 100 to 0, its release rate silently reverted to `Node::default()`'s 1.0, and
//! every unit went blank — because *executable* and *the same model* are different
//! predicates, and only the weaker one was ever checked. Both runs report
//! `conserved = true, residual = 0`, so conservation does not catch it either: a run
//! that conserves nothing at the wrong rate still conserves.
//!
//! The cause is not in this file and cannot be fixed from it. `CanvasModel::Relation`
//! carries no `amount`, no `unit`, and no substance name, though `Interaction` in the
//! kernel has carried `amount` and `unit` from the beginning, so `project()` hardcodes
//! `Decimal::ONE`. `AgentModel::initial_state` and `cognitive_params` are untyped maps
//! the canvas drops entirely. A demo's whole dynamical content is those fields.
//!
//! This test exists to make that loss **visible and standing** rather than latent. It
//! is the separating instance for the canvas's dropped fields, and it goes green when
//! the fields survive the round trip, not before.
//!
//! **Do not "fix" this by weakening the assertion.** Weakening it converts a
//! separating instance back into a decoration, which is the failure that let the
//! defect live this long. If it must be silenced before Wave 4, `#[ignore]` it with a
//! reason — never relax what it compares.

use bert_canvas::canvas::{project, to_canvas};
use bert_compose::{from_spec, run::RecordedRun};
use bert_core::operational::validate_operational;
use bert_core::WorldModel;

const TICKS: usize = 30;
const DT: f64 = 1.0;

/// Run a model and return its per-tick conservation ledger.
fn ledger(model: &WorldModel) -> Vec<[f32; 4]> {
    let spec = validate_operational(model).expect("demo must be operational");
    let mut circuit = from_spec(&spec);
    RecordedRun::record(&mut circuit, &spec, DT, TICKS).ledger_history
}

/// Law: a canvas round-trip preserves the RUN, not merely the runnability.
///
/// The ledger is the right comparison surface: `[emitted, sunk, stored, dissipated]`
/// per tick is exactly what a reader of the dynamical face sees, and it is sensitive
/// to every field the canvas drops (an amount change moves `emitted`, an initial-stock
/// change moves `stored` from tick zero). Comparing it is therefore neither too strict
/// (it ignores node ordering, ids, and positions) nor too loose.
/// Every demo is checked before anything is reported, so the failure names the full
/// scope of the loss rather than only the first model to hit it. Which demos survive
/// is itself information: a demo whose dynamics happen to sit in fields the canvas
/// does carry would pass, and knowing that bounds the defect.
#[test]
fn canvas_round_trip_preserves_the_run() {
    let mut diverged: Vec<String> = Vec::new();
    let mut survived: Vec<&str> = Vec::new();

    for demo in ["reservoir", "homeostat", "allocation"] {
        let path = format!(
            "{}/../../assets/models/demos/{demo}.json",
            env!("CARGO_MANIFEST_DIR")
        );
        let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path}: {e}"));
        let original: WorldModel = serde_json::from_str(&text).expect("demo parses");

        let before = ledger(&original);
        let after = ledger(&project(&to_canvas(&original)));

        match before
            .iter()
            .zip(after.iter())
            .enumerate()
            .find(|(_, (b, a))| b != a)
        {
            Some((tick, (b, a))) => diverged.push(format!(
                "  {demo}: diverges at tick {tick}\n    \
                 before [emitted, sunk, stored, dissipated] = {b:?}\n    \
                 after                                      = {a:?}"
            )),
            None if before.len() != after.len() => diverged.push(format!(
                "  {demo}: tick count changed, {} -> {}",
                before.len(),
                after.len()
            )),
            None => survived.push(demo),
        }
    }

    assert!(
        diverged.is_empty(),
        "a canvas round trip changed the run of {} of 3 demos.\n{}\n  survived: {:?}\n\n  \
         This is the #216 defect, not a flaky test. CanvasModel::Relation carries no \
         amount and no unit (project() hardcodes Decimal::ONE), and AgentModel's \
         initial_state / cognitive_params are discarded on load, so a demo's entire \
         dynamical content is dropped. Fix the canvas. Never weaken this assertion \
         — that is what let the defect ship green for a year.",
        diverged.len(),
        diverged.join("\n"),
        survived
    );
}
