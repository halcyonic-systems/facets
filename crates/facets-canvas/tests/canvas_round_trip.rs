//! A canvas round-trip preserves the RUN, not merely the runnability (#216).
//!
//! GREEN since Wave 4 (2026-07-27) — and it was authored RED, deliberately. The
//! old `to_canvas_loads_a_demo_faithfully` asserted a reloaded demo "should
//! still project to an executable model", and passed while the reservoir's
//! trajectory changed 22%, its initial stock fell from 100 to 0, its release
//! rate reverted to 1.0, and every unit went blank — *executable* and *the same
//! model* are different predicates, and only the weaker one was checked. Both
//! runs reported `conserved = true`: a run that conserves nothing at the wrong
//! rate still conserves.
//!
//! What closed it: `CanvasModel::Relation` now carries `amount`/`unit`/
//! `substance`, and `Thing` carries `cognitive_params`/`initial_state`/
//! `agency_capacity` opaquely — everything the operational spec reads.
//! `scripts/mutation_check.py` holds this gate refutable: reintroducing any of
//! the three discards turns it red.
//!
//! **Never weaken this assertion.** Weakening it converts a separating instance
//! back into a decoration, which is the failure that let the defect live a
//! year. If the canvas ever drops a new run-relevant field, this test is
//! designed to go red again — that red is the finding, not a flake.

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
            "{}/../../assets/archive/demos/{demo}-model.json",
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
