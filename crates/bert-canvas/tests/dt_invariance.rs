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
         `amount` is being consumed per TICK while its units (ML/mo, kW, Mtok/mo) \
         declare a rate per TIME — Δt is semantically load-bearing, and dt in \
         RecordedRun is metadata the dynamics never read. Fix the engine to scale \
         flux by Δt (or withdraw the unit claims); never widen this tolerance.",
        diverged.len(),
        diverged.join("\n"),
        survived
    );
}
