//! SL-authored runnable demos: `watershed` and `supply-chain` are authored in
//! SYSTEM LANGUAGE, and their gallery run bundles carry MACHINE PROJECTIONS
//! of the `.sl` — never hand-authored JSON. This gate holds three things:
//!
//! 1. each `.sl` parses, projects, validates operational, and RUNS with mass
//!    conserved and something actually reaching a sink;
//! 2. the run is Δt-invariant over a fixed horizon — the engine's rate
//!    reading (#258/#259) holds end-to-end from SL text to trace;
//! 3. the stored model in `assets/models/demos/` IS the current projection —
//!    an `.sl` edit that forgets to re-mint fails here, so the diagram the
//!    gallery opens and the model it runs can never drift apart.
//!
//! Re-mint after editing an `.sl`:
//! `BLESS_SL_DEMOS=1 cargo test -p bert-canvas --test sl_demos`

use bert_canvas::canvas::project;
use bert_canvas::sl::parse_sl;
use bert_compose::{from_spec, run::RecordedRun};
use bert_core::operational::validate_operational;

const DEMOS: &[&str] = &["watershed", "supply-chain"];
// Long enough that O(Δt) startup transients (each fresh stock's first step
// releases nothing — release reads the opening state) fall inside the 2%
// tolerance; the drift is honest Euler error and halves with Δt, which the
// homeostat convergence gate in dt_invariance.rs pins for the engine.
const HORIZON: f64 = 60.0;

/// The gallery run path, end to end: each demo's ACTUAL bundle (CSV + mapping
/// + horizon) forces its stored model through `force_and_run` — exactly the
/// call the web app's Run button makes. A wrong element name, unit string, or
/// unrunnable mapping fails here instead of at GUI runtime.
#[test]
fn sl_demo_bundles_force_and_run() {
    for name in DEMOS {
        let bundle_path = format!(
            "{}/../../assets/demos/{name}.json",
            env!("CARGO_MANIFEST_DIR")
        );
        let bundle: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(&bundle_path).unwrap())
                .unwrap_or_else(|e| panic!("{bundle_path}: {e}"));
        let model_json = std::fs::read_to_string(format!(
            "{}/../../assets/models/demos/{name}.json",
            env!("CARGO_MANIFEST_DIR")
        ))
        .unwrap();
        let model: bert_core::WorldModel = serde_json::from_str(&model_json).unwrap();
        let manifest: bert_tether::manifest::RunManifest =
            serde_json::from_value(bundle["mapping"].clone()).unwrap();
        let csv = bundle["csv"].as_str().unwrap();
        let t = bundle["t"].as_f64().unwrap();
        let readout =
            bert_tether::forcing::force_and_run(model, csv, &manifest, 1.0, t, "2026-07-27")
                .unwrap_or_else(|e| panic!("{name} bundle refuses to run: {e}"));
        assert!(
            readout.ticks > 0 && !readout.trajectories.is_empty(),
            "{name}: the forced run must actually record a trajectory"
        );
        assert!(
            readout.conserved,
            "{name} forced run leaks: residual {}",
            readout.residual
        );
    }
}

#[test]
fn sl_demos_run_conserve_and_are_dt_invariant() {
    for name in DEMOS {
        let sl_path = format!(
            "{}/../../assets/examples/{name}.sl",
            env!("CARGO_MANIFEST_DIR")
        );
        let text = std::fs::read_to_string(&sl_path).unwrap_or_else(|e| panic!("{sl_path}: {e}"));
        let canvas = parse_sl(&text).unwrap_or_else(|e| panic!("{name} does not parse: {e:?}"));
        let model = project(&canvas);
        let spec = validate_operational(&model)
            .unwrap_or_else(|e| panic!("{name} is not operational: {e:?}"));

        let mut coarse_c = from_spec(&spec);
        let coarse = RecordedRun::record_over(&mut coarse_c, &spec, 1.0, HORIZON).unwrap();
        assert!(
            coarse.final_balance.abs() < 1e-3,
            "{name} leaks: {}",
            coarse.final_balance
        );
        let last = coarse.ledger_history.last().unwrap();
        eprintln!("{name} over {HORIZON} days: [emitted, sunk, stored, dissipated] = {last:?}");
        assert!(
            last[1] > 0.0,
            "{name}: nothing reached a sink over {HORIZON} days — a runnable demo must move: {last:?}"
        );

        let mut fine_c = from_spec(&spec);
        let fine = RecordedRun::record_over(&mut fine_c, &spec, 0.5, HORIZON).unwrap();
        let flast = fine.ledger_history.last().unwrap();
        for (i, q) in ["emitted", "sunk", "stored", "dissipated"].iter().enumerate() {
            let (a, b) = (last[i], flast[i]);
            let scale = a.abs().max(b.abs());
            assert!(
                scale == 0.0 || (a - b).abs() / scale <= 0.02,
                "{name} {q} is Δt-dependent: {a} at Δt=1.0 vs {b} at Δt=0.5"
            );
        }

        // The staleness gate (and, under BLESS_SL_DEMOS, the mint itself).
        let json = serde_json::to_string_pretty(&model).unwrap();
        let model_path = format!(
            "{}/../../assets/models/demos/{name}.json",
            env!("CARGO_MANIFEST_DIR")
        );
        if std::env::var("BLESS_SL_DEMOS").is_ok() {
            std::fs::write(&model_path, &json).unwrap();
        }
        let stored = std::fs::read_to_string(&model_path).unwrap_or_else(|_| {
            panic!("{name}: model not minted — run once with BLESS_SL_DEMOS=1")
        });
        assert_eq!(
            stored, json,
            "{name}: the stored model is not the projection of its .sl — \
             re-mint with BLESS_SL_DEMOS=1"
        );
    }
}
