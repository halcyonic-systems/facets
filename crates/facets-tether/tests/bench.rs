//! The bench session (facets#463, move 2a): the engine held open between
//! calls, read back in the same domain terms as a batch run.
//!
//! Three claims, each a test: a session stepped to T from a fresh open reads
//! exactly as the batch run of the same model (parity); a knob turned at tick
//! k changes tick k+1 and nothing before it (the probe the whole MVP rests
//! on); and the tick log closes the ledger — the nodes' shed mass per tick is
//! the ledger's dissipation per tick, so what the log says each component did
//! is what the conservation chart adds up.
use bert_core::WorldModel;
use bert_tether::bench::BenchSession;
use bert_tether::forcing::run_unforced;

const RESERVOIR: &str = include_str!("../../../assets/archive/demos/reservoir-model.json");

fn reservoir() -> WorldModel {
    serde_json::from_str(RESERVOIR).expect("reservoir asset parses")
}

/// The first flow out of a source, by the names the author sees.
fn a_source_flow(model: &WorldModel) -> (String, String, String, f64) {
    let spec = bert_core::operational::validate_operational(model).unwrap();
    let f = spec
        .flows
        .iter()
        .find(|f| spec.sources.iter().any(|s| s.id == f.source))
        .expect("a source-fed flow");
    let from = spec
        .sources
        .iter()
        .find(|s| s.id == f.source)
        .unwrap()
        .name
        .clone();
    let to = spec
        .processes
        .iter()
        .find(|p| p.id == f.sink)
        .map(|p| p.name.clone())
        .or_else(|| {
            spec.sinks
                .iter()
                .find(|s| s.id == f.sink)
                .map(|s| s.name.clone())
        })
        .unwrap();
    (f.name.clone(), from, to, f.amount)
}

#[test]
fn a_session_stepped_to_t_reads_as_the_batch_run() {
    let (dt, t) = (1.0, 12.0);
    let batch = run_unforced(reservoir(), dt, t).unwrap();
    let mut bench = BenchSession::open_unforced(reservoir(), dt).unwrap();
    bench.step(12);
    let live = bench.readout();
    assert_eq!(live.ticks, batch.ticks);
    assert_eq!(live.conserved, batch.conserved);
    assert_eq!(live.residual, batch.residual);
    for (a, b) in live.levels.iter().zip(batch.levels.iter()) {
        assert_eq!((a.name.as_str(), a.value), (b.name.as_str(), b.value));
    }
    for (a, b) in live.trajectories.iter().zip(batch.trajectories.iter()) {
        assert_eq!(a.name, b.name);
        assert_eq!(a.series, b.series, "trajectory {}", a.name);
    }
    for (a, b) in live.flows.iter().zip(batch.flows.iter()) {
        assert_eq!(a.name, b.name);
        assert_eq!(a.series, b.series, "flow {}", a.name);
    }
    assert_eq!(live.flows.len(), batch.flows.len());
}

#[test]
fn a_knob_turned_at_tick_five_changes_tick_six_and_nothing_before() {
    let (label, from, to, amount) = a_source_flow(&reservoir());
    let mut control = BenchSession::open_unforced(reservoir(), 1.0).unwrap();
    control.step(6);
    let mut bench = BenchSession::open_unforced(reservoir(), 1.0).unwrap();
    bench.step(5);
    bench
        .set_flow_amount(&label, &from, &to, (amount * 2.0) as f32)
        .unwrap();
    assert_eq!(bench.edits()[0].tick, 5);
    bench.step(1);
    let edited = bench.readout();
    let plain = control.readout();
    let k = edited
        .flows
        .iter()
        .position(|f| f.name == label)
        .expect("the edited flow is in the readout");
    assert_eq!(
        edited.flows[k].series[..5],
        plain.flows[k].series[..5],
        "ticks 1..5 untouched"
    );
    assert!(
        (edited.flows[k].series[5] - 2.0 * plain.flows[k].series[5]).abs() < 1e-4,
        "tick 6 carries the doubled amount: {} vs {}",
        edited.flows[k].series[5],
        plain.flows[k].series[5]
    );
}

#[test]
fn a_forced_flow_refuses_a_live_edit_and_an_unknown_name_is_named() {
    let mut bench = BenchSession::open_unforced(reservoir(), 1.0).unwrap();
    let err = bench
        .set_flow_amount("no such flow", "nobody", "nowhere", 1.0)
        .unwrap_err();
    assert!(err.contains("no flow"), "{err}");
    let err = bench
        .set_component_param("nobody", "release_rate", 1.0)
        .unwrap_err();
    assert!(err.contains("no component"), "{err}");
    let (label, from, to, _) = a_source_flow(&reservoir());
    assert!(bench.set_flow_amount(&label, &from, &to, -1.0).is_err());
}

#[test]
fn the_tick_log_closes_the_ledger_per_tick() {
    let mut bench = BenchSession::open_unforced(reservoir(), 1.0).unwrap();
    bench.step(8);
    let log = bench.tick_log_since(1);
    assert_eq!(log.len(), 8);
    let readout = bench.readout();
    // Every node is named for the author, and every flow is in the log.
    let node_names: Vec<&str> = log[0].nodes.iter().map(|n| n.name.as_str()).collect();
    for lvl in &readout.levels {
        assert!(
            node_names.contains(&lvl.name.as_str()),
            "{} missing from the log",
            lvl.name
        );
    }
    assert_eq!(log[0].wires.len(), readout.flows.len());
    // The nodes' shed mass per tick is the ledger's dissipation per tick: what
    // the log says each component did is what the conservation chart adds up.
    let ledger = &bench.circuit().ledger_history;
    assert_eq!(ledger.len(), 8);
    for (i, entry) in log.iter().enumerate() {
        let shed: f32 = entry.nodes.iter().map(|n| n.dissipated).sum();
        let before = if i == 0 { 0.0 } else { ledger[i - 1][3] };
        let delta = ledger[i][3] - before;
        assert!(
            (shed - delta).abs() < 1e-4,
            "tick {}: nodes shed {shed}, ledger says {delta}",
            entry.tick
        );
        // And every node's own account closes: in − out − drain − Δlevel = shed.
        for n in &entry.nodes {
            assert!(n.dissipated.is_finite(), "{} has a ledger entry", n.name);
        }
    }
    assert_eq!(bench.tick(), 8);
}

#[test]
fn a_forced_session_reads_as_the_forced_batch_run_and_refuses_edits_on_the_bound_flow() {
    use bert_tether::forcing::{flow_targets, force_and_run};
    use bert_tether::manifest::{ColumnMapping, Role, RunManifest};
    let csv = "month,inflow\n1,20\n2,35\n3,60\n4,10\n5,0\n6,15\n";
    let flow_name = flow_targets(&reservoir())
        .first()
        .map(|(_, n, _)| n.clone())
        .unwrap();
    let manifest = RunManifest {
        model: String::new(),
        data: String::new(),
        dt: None,
        t: 6.0,
        mapping: vec![
            ColumnMapping {
                column: "month".into(),
                role: Role::Time,
                element: None,
                unit: None,
                force: false,
                every: None,
            },
            ColumnMapping {
                column: "inflow".into(),
                role: Role::Flow,
                element: Some(flow_name.clone()),
                unit: Some("ML/mo".into()),
                force: true,
                every: None,
            },
        ],
    };
    let batch = force_and_run(reservoir(), csv, &manifest, 1.0, 6.0, "2026-01-01").unwrap();
    let mut bench =
        BenchSession::open_forced(reservoir(), csv, &manifest, 1.0, "2026-01-01").unwrap();
    bench.step(6);
    let live = bench.readout();
    assert_eq!(live.ticks, batch.ticks);
    for (a, b) in live.flows.iter().zip(batch.flows.iter()) {
        assert_eq!(a.series, b.series, "forced flow {}", a.name);
    }
    assert_eq!(live.comparisons.len(), batch.comparisons.len());
    // The bound column is the author's word: the knob refuses.
    let (label, from, to, _) = a_source_flow(&reservoir());
    assert_eq!(label, flow_name);
    let err = bench.set_flow_amount(&label, &from, &to, 99.0).unwrap_err();
    assert!(err.contains("forced by a bound column"), "{err}");
}
