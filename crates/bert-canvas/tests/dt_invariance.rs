//! Is `amount` a RATE (per unit time) or a PER-TICK QUANTITY? (#216-adjacent)
//!
//! # EXPECTED TO FAIL — Δt is currently semantic, and this is the record of it
//!
//! The claim everything else makes is "rate": flows carry units like `ML/mo`
//! and `kW`; `ticks_over(dt, total_time)` exposes the `(T, Δt)` form and its
//! doc says "halving Δt doubles [the tick count]" as though the horizon were
//! the invariant; #94 derives a stock's display unit as inflow × Δt. If those
//! claims are true, Δt is a NUMERICAL parameter: refining it while holding the
//! horizon T fixed converges on the same totals.
//!
//! The engine says "per-tick": `RecordedRun::record` stores `dt` as metadata
//! and calls `Circuit::step()` — which takes no Δt, and no code path scales a
//! flux by it. Halving Δt at fixed T just runs the same tick twice as often,
//! so every cumulative flux doubles and the same file means a DIFFERENT system
//! at each step size. The unit strings assert a dimension the engine ignores.
//!
//! This test asserts the RATE reading — the one the units and the `(T, Δt)`
//! form already promise — and stands red until the engine honors it. Same
//! family as `check_bond` and the demo round-trip: an invariance believed,
//! relied on, and never asserted. **Do not "fix" this by widening the
//! tolerance or by comparing per-Δt-normalized values** — normalizing away the
//! factor of two is exactly the concealment this test exists to prevent. If it
//! must be silenced temporarily, `#[ignore]` it with a reason.
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
//! ## Status after the #258 fixes (2026-07-27)
//!
//! Generated fluxes now scale by Δt and forced series index by model time,
//! and `reservoir` is green. The remaining reds (homeostat, allocation) are
//! ONE defect, and it is not flux scaling: the synchronous update gives every
//! node a one-STEP transport delay, and a step is Δt-sized (allocation's
//! receipts: sunk = 6×28 = 168 at Δt=1.0 vs 3×58 = 174 at Δt=0.5 — a 2-hop
//! pipeline delay measured in steps). #259 settled the semantics against
//! VSL, Spivak–Tan eq. (11), and SSV (Defs 4.2.4/4.2.7, Exs 4.2.8/4.2.9):
//! wires are instantaneous; feedback is anchored by state-determined (Moore)
//! outputs; a delay is a MODELED element with a declared duration, never a
//! per-hop artifact. This test greens when memoryless primitives relay
//! within the step (topological order, level-read edges as the cut) — see
//! #259's spec. Still: never widen the tolerance.

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
