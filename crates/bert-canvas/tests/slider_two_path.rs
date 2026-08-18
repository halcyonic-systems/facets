//! Two-path equivalence pin (2026-08-16 audit): a slider edit (mRNA -> 10)
//! must deliver the SAME output through the plain path (run_unforced) and the
//! demo-bundle CSV path (force_and_run, unforced mapped columns) — the fix
//! that made this true is apply_params' declared-amount-wins rule.
use bert_tether::forcing::{force_and_run, run_unforced};
use bert_tether::manifest::RunManifest;

#[test]
fn a_slider_edit_runs_identically_through_both_paths() {
    let sl = include_str!("../../../assets/examples/translation-apparatus.sl");
    let mut model = bert_canvas::sl::parse_sl(sl).expect("parses");
    for r in &mut model.relations {
        if r.name == "mRNA transcript" && r.amount.is_some() {
            r.amount = Some(bert_core::rust_decimal::Decimal::from(10));
        }
    }
    let world = bert_canvas::canvas::project(&model);
    println!("subsystems: {}", world.systems.len() - 1);
    println!("interfaces: {}", world.systems[0].boundary.interfaces.len());

    let plain = run_unforced(world.clone(), 1.0, 15.0).expect("plain runs");
    let sum = |r: &bert_tether::forcing::RunReadout| {
        r.flows
            .iter()
            .find(|f| f.name.contains("nascent"))
            .map(|f| f.series.iter().sum::<f32>())
            .unwrap_or(-1.0)
    };
    println!("plain delivered: {}", sum(&plain));

    let bundle: serde_json::Value =
        serde_json::from_str(include_str!("../../../assets/demos/translation-apparatus.json")).unwrap();
    let csv = bundle["csv"].as_str().expect("bundle carries its csv inline").to_string();
    let manifest: RunManifest = serde_json::from_value(bundle["mapping"].clone()).unwrap();
    let forced = force_and_run(world, &csv, &manifest, 1.0, 15.0, "2026-08-16").expect("forced runs");
    let a = sum(&plain);
    let b = sum(&forced);
    println!("plain {a} vs csv-path {b}");
    assert!((a - b).abs() < 0.01, "the two run paths disagree: {a} vs {b}");
    assert!((a - 28.125).abs() < 0.01, "mRNA=10 delivery moved from its pinned value: {a}");
}
