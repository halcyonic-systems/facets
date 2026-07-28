//! `amount` is a RATE (per unit time), and this gate holds the engine to it.
//!
//! # GREEN, and load-bearing — the standing record of Δt's semantics
//!
//! Flows carry units like `ML/mo` and `kW`; `ticks_over(dt, total_time)`
//! exposes the `(T, Δt)` form with the horizon as the invariant; #94 derives
//! a stock's display unit as inflow × Δt. Those claims make Δt a NUMERICAL
//! parameter: refining it while holding the horizon T fixed converges on the
//! same totals. The engine honors this via two commitments (#258, #259):
//! generated fluxes scale by Δt and forced series index by model time, and
//! wires transmit instantaneously — the one-STEP transport delay that made a
//! step size a semantic claim is gone (only stocks carry mass across a step
//! boundary, and a stock's integration is Δt-scaled like every other rate).
//!
//! Born red 2026-07-27 and greened the same day in three commits, each
//! closing the exact divergence this gate reported (flux scaling; series
//! indexing; the wire delay). Refutability is standing, not historical:
//! `scripts/mutation_check.py` (`flux-per-tick`, `loop-silently-delayed`)
//! re-proves this gate can fail. **Do not widen the tolerance and do not
//! compare per-Δt-normalized values** — normalizing away a factor of two is
//! exactly the concealment this test exists to prevent.
//!
//! ## Compare the right things — they are not all the same kind of quantity
//!
//! - `emitted`, `sunk`, `dissipated` are FLUXES. The ledger rows are pushed as
//!   snapshots of RUNNING TOTALS (`circuit.rs`: `[self.emitted, self.sunk,
//!   self.stored(), self.dissipated]`), so the engine has already integrated
//!   them: compare the FINAL row's values. Summing rows would triangular-weight
//!   the totals — a correct engine would look broken.
//! - `stored` is a STATE: compare the FINAL row's value. Summing a state over
//!   ticks is meaningless.
//!
//! Tolerance: 2% relative. Wide enough to absorb genuine forward-Euler
//! discretization drift between step sizes on the feedback paths (O(Δt)),
//! narrow enough that the per-tick hypothesis — a factor of ≈2 — can never
//! slip through. The discriminating gap is 2×, not ε.
//!
//! ## Scope caveat, pre-registered
//!
//! This is a DIMENSIONAL-COHERENCE check, not numerical convergence: under
//! Mobus §4.3.3.6, Δt is level-indexed, so if clock/quasi-clock structures
//! or an authored Delay Box (SSV Ex 4.2.8) ever land, a model carrying one
//! declares per-sample behavior and invariance under refinement stops being
//! required FOR THAT MODEL — scope the exclusion to the declared construct,
//! with the declaration as the license, never as a blanket exemption.

use bert_canvas::canvas::{project, to_canvas};
use bert_compose::{from_spec, run::RecordedRun};
use bert_core::operational::validate_operational;
use bert_core::WorldModel;

const HORIZON: f64 = 30.0;

/// Final ledger row `[emitted, sunk, stored, dissipated]` (cumulative fluxes +
/// current state) for a run of the model over `HORIZON` at step `dt`.
fn final_ledger(model: &WorldModel, dt: f64) -> [f32; 4] {
    let spec = validate_operational(model).expect("demo must be operational");
    let mut circuit = from_spec(&spec);
    let ticks = (HORIZON / dt).round() as usize;
    *RecordedRun::record(&mut circuit, &spec, dt, ticks)
        .ledger_history
        .last()
        .expect("a run over a positive horizon records at least one tick")
}

fn rel_diff(a: f32, b: f32) -> f32 {
    let scale = a.abs().max(b.abs());
    if scale == 0.0 {
        0.0
    } else {
        (a - b).abs() / scale
    }
}

/// Law: over a FIXED horizon, refining Δt leaves the totals invariant — the
/// rate reading of `amount`, which is what its unit strings assert.
#[test]
fn a_fixed_horizon_is_invariant_under_dt_refinement() {
    const TOL: f32 = 0.02;
    let mut diverged: Vec<String> = Vec::new();
    let mut survived: Vec<&str> = Vec::new();

    for demo in ["reservoir", "homeostat", "allocation"] {
        let path = format!(
            "{}/../../assets/models/demos/{demo}.json",
            env!("CARGO_MANIFEST_DIR")
        );
        let text = std::fs::read_to_string(&path).unwrap_or_else(|e| panic!("{path}: {e}"));
        let model: WorldModel = serde_json::from_str(&text).expect("demo parses");
        // The canvas must not change the answer: run the round-tripped model,
        // so this test also keeps guarding the seam it rides through.
        let model = project(&to_canvas(&model));

        let coarse = final_ledger(&model, 1.0); // 30 ticks
        let fine = final_ledger(&model, 0.5); // 60 ticks, same horizon

        let mut worst: Option<(&str, f32, f32, f32)> = None;
        for (name, i) in [("emitted", 0), ("sunk", 1), ("stored", 2), ("dissipated", 3)] {
            let d = rel_diff(coarse[i], fine[i]);
            if d > TOL && worst.is_none_or(|w| d > w.3) {
                worst = Some((name, coarse[i], fine[i], d));
            }
        }
        match worst {
            Some((name, c, f, d)) => diverged.push(format!(
                "  {demo}: {name} at Δt=1.0 is {c}, at Δt=0.5 is {f} \
                 ({:.0}% apart — a ratio near 2 is the per-tick signature)",
                d * 100.0
            )),
            None => survived.push(demo),
        }
    }

    assert!(
        diverged.is_empty(),
        "the same {HORIZON}-unit horizon produced different systems at different step \
         sizes for {} of 3 demos:\n{}\n  survived: {:?}\n\n  \
         Something reads the step size as semantics again. The three known ways \
         (all closed 2026-07-27, #258/#259): a flux generated without × dt, a \
         series indexed by tick instead of model time, a per-STEP delay or \
         cadence on a wire or control path. A ratio near 2 is the per-tick \
         signature; a few percent that shrinks at smaller Δt is honest Euler \
         drift (see refinement_converges_on_the_feedback_path). Find which \
         quantity varies and why; never widen this tolerance.",
        diverged.len(),
        diverged.join("\n"),
        survived
    );
}

/// Refinement CONVERGES: the gap between successive Δt-halvings shrinks.
/// This is what separates honest forward-Euler drift from semantic
/// Δt-dependence — discretization error is O(Δt) and halves as the step
/// halves; a semantics that reads the step size would not converge at all.
/// Run on the homeostat, the demo with the feedback path (the only place
/// drift can accumulate).
#[test]
fn refinement_converges_on_the_feedback_path() {
    let path = format!(
        "{}/../../assets/models/demos/homeostat.json",
        env!("CARGO_MANIFEST_DIR")
    );
    let text = std::fs::read_to_string(&path).expect("homeostat demo");
    let model: WorldModel = serde_json::from_str(&text).expect("demo parses");
    let model = project(&to_canvas(&model));

    let stored_at = |dt: f64| final_ledger(&model, dt)[2];
    let gaps: Vec<f32> = [1.0, 0.5, 0.25, 0.125]
        .windows(2)
        .map(|w| (stored_at(w[0]) - stored_at(w[1])).abs())
        .collect();
    for pair in gaps.windows(2) {
        // Euler halving should roughly halve the gap; 0.75 leaves headroom
        // for the piecewise-constant control law's kinks while still
        // refuting non-convergence (which holds the gap constant).
        assert!(
            pair[1] <= 0.75 * pair[0] + 1e-6,
            "refinement is not converging: successive gaps {gaps:?}"
        );
    }
}
