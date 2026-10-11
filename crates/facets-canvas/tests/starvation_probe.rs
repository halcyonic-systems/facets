//! Characterization: what the instrument HONESTLY does under substrate
//! starvation, measured 2026-08-16 (audit; session arc-continuation-and-
//! george-send). These pins are the truth the demo script must speak and the
//! separating instances the future stoichiometric-coupling work must flip
//! DELIBERATELY (Liebig limiting-factor semantics — "named but not faked",
//! translation-apparatus walkthrough; the engine gap measured here).
use bert_tether::forcing::force_and_run;
use bert_tether::manifest::RunManifest;

fn run_with_aa(aa_series: impl Fn(usize) -> i32) -> Vec<f32> {
    let sl = include_str!("../../../assets/examples/translation-apparatus.sl");
    let model = bert_canvas::sl::parse_sl(sl).expect("parses");
    let world = bert_canvas::canvas::project(&model);
    let mut csv = String::from("time,mRNA transcript,free amino acid,ATP,GTP\n");
    for t in 0..16 {
        csv.push_str(&format!("{t},20,{},20,40\n", aa_series(t)));
    }
    let manifest: RunManifest = serde_json::from_str(
        r#"{"model":"","data":"","t":15.0,"mapping":[
            {"column":"time","as":"time"},
            {"column":"mRNA transcript","as":"flow","element":"mRNA transcript","unit":"codon/s","force":true},
            {"column":"free amino acid","as":"flow","element":"free amino acid","unit":"aa/s","force":true},
            {"column":"ATP","as":"flow","element":"ATP","unit":"ATP/s","force":true},
            {"column":"GTP","as":"flow","element":"GTP","unit":"GTP/s","force":true}
        ]}"#,
    )
    .unwrap();
    let readout = force_and_run(world, &csv, &manifest, 1.0, 15.0, "2026-08-16").expect("runs");
    readout
        .flows
        .iter()
        .find(|f| f.name.contains("nascent"))
        .expect("chaperone inflow present")
        .series
        .clone()
}

/// MEASURED GRAIN FACT: a brief amino-acid starvation is fully absorbed — the
/// tRNA pool never depletes (it drifts upward, the known +10/tick grain fact),
/// and transforms have no limiting-factor coupling, so the output does NOT
/// stall. The demo script must not claim it does. When stoichiometric
/// semantics land, this assertion flips and that flip is the feature's proof.
#[test]
fn a_brief_amino_acid_starvation_is_absorbed_not_propagated() {
    let starved = run_with_aa(|t| if (8..=10).contains(&t) { 0 } else { 20 });
    let baseline = run_with_aa(|_| 20);
    assert_eq!(
        starved, baseline,
        "output was expected UNCHANGED under brief starvation at this grain; \
         if this fails, limiting-factor semantics arrived — update the \
         walkthrough and demo script to CLAIM the stall, and retire this pin"
    );
}

/// The slider-to-zero path (canvas edit, no grammar in between): what does the
/// kernel do with a declared amount of 0? Pinned so the RunInputs floor
/// decision rests on a measured fact, not a guess.
#[test]
fn a_zero_amount_from_the_canvas_path_reports_its_fate() {
    let sl = include_str!("../../../assets/examples/translation-apparatus.sl");
    let mut model = bert_canvas::sl::parse_sl(sl).expect("parses");
    for r in &mut model.relations {
        if r.name == "mRNA transcript" {
            r.amount = Some(bert_core::rust_decimal::Decimal::ZERO);
        }
    }
    let world = bert_canvas::canvas::project(&model);
    match bert_core::operational::validate_operational(&world) {
        Ok(spec) => {
            let mut c = bert_compose::from_spec(&spec);
            match bert_compose::RecordedRun::record_over(&mut c, &spec, 1.0, 15.0) {
                Ok(run) => println!("ZERO RUNS OK, ticks {}", run.history.len()),
                Err(e) => println!("ZERO RUN REFUSED: {e}"),
            }
        }
        Err(es) => println!(
            "ZERO OPERATIONAL REFUSED: {} issue(s), first: {:?}",
            es.len(),
            es.first().map(|e| &e.location)
        ),
    }
}
