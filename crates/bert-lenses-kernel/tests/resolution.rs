//! The reserved pass-way `interface unresolved` and the resolution check
//! (#308 part A): Mobus's stage 1 — the steel plant with its six flows found
//! and its membrane not yet read (Fig. 4.14) — compiles clean under Mobus with
//! every crossing on `unresolved`; stage 2 (Fig. 4.15, six named interfaces)
//! resolves it; and three wrong stage 2s are refused for three different
//! reasons: an extra crossing, a renamed counterparty, a re-kinded flow.
use bert_canvas::canvas::CanvasModel;
use bert_canvas::lenses::{analyze, check_resolution_canvas};
use bert_canvas::sl::parse_sl;
use bert_core::validate::Severity;

fn compile(sl: &str) -> CanvasModel {
    parse_sl(sl).unwrap_or_else(|errs| {
        panic!("{}", errs.iter().map(|e| format!("line {}: {}", e.line, e.message)).collect::<Vec<_>>().join("; "))
    })
}

const STAGE_1: &str = r#"system "Steel-Plant" : Concrete/Technical
domain "Steel manufacturing"
interface unresolved
component "Steel-Plant" primitive Combining
source Energy-Source
source Iron-Source
source Coke-Source
sink Steel-Sink
sink Garbage-Sink
sink ATMOSPHERE
flow Energy-Source -> unresolved : energy "F-1.0" substance electricity
flow unresolved -> "Steel-Plant" : energy "F-1.0" substance electricity
flow Iron-Source -> unresolved : matter "F-1.1" substance iron
flow unresolved -> "Steel-Plant" : matter "F-1.1" substance iron
flow Coke-Source -> unresolved : matter "F-1.2" substance coke
flow unresolved -> "Steel-Plant" : matter "F-1.2" substance coke
flow "Steel-Plant" -> unresolved : matter "F-1.3" substance steel
flow unresolved -> Steel-Sink : matter "F-1.3" substance steel
flow "Steel-Plant" -> unresolved : matter "F-1.4" substance garbage
flow unresolved -> Garbage-Sink : matter "F-1.4" substance garbage
flow "Steel-Plant" -> unresolved : energy "F-1.5" substance heat
flow unresolved -> ATMOSPHERE : energy "F-1.5" substance heat
@lens mobus
"#;

const STAGE_2: &str = r#"system "Steel-Plant" : Concrete/Technical
domain "Steel manufacturing"
component FuseBox interface
component Iron-LoadingDock interface
component Coke-LoadingDock interface
component Steel-ShippingDock interface
component Garbage-ShippingDock interface
component Ventilation interface
component "Steel-Plant" primitive Combining
source Energy-Source
source Iron-Source
source Coke-Source
sink Steel-Sink
sink Garbage-Sink
sink ATMOSPHERE
flow Energy-Source -> FuseBox : energy "F-1.0" substance electricity
flow FuseBox -> "Steel-Plant" : energy "F-1.0" substance electricity
flow Iron-Source -> Iron-LoadingDock : matter "F-1.1" substance iron
flow Iron-LoadingDock -> "Steel-Plant" : matter "F-1.1" substance iron
flow Coke-Source -> Coke-LoadingDock : matter "F-1.2" substance coke
flow Coke-LoadingDock -> "Steel-Plant" : matter "F-1.2" substance coke
flow "Steel-Plant" -> Steel-ShippingDock : matter "F-1.3" substance steel
flow Steel-ShippingDock -> Steel-Sink : matter "F-1.3" substance steel
flow "Steel-Plant" -> Garbage-ShippingDock : matter "F-1.4" substance garbage
flow Garbage-ShippingDock -> Garbage-Sink : matter "F-1.4" substance garbage
flow "Steel-Plant" -> Ventilation : energy "F-1.5" substance heat
flow Ventilation -> ATMOSPHERE : energy "F-1.5" substance heat
@lens mobus
"#;

fn codes(report: &bert_canvas::lenses::DecompositionReport) -> Vec<String> {
    report.issues.iter().map(|i| i.code.clone()).collect()
}

#[test]
fn stage_1_is_a_clean_mobus_model() {
    let m = compile(STAGE_1);
    let verdict = analyze(&m, m.lens).validation;
    let errors: Vec<_> = verdict.issues.iter().filter(|i| matches!(i.severity, Severity::Error)).map(|i| i.message.clone()).collect();
    assert!(errors.is_empty(), "stage 1 carries Error verdicts: {errors:?}");
    let facts = bert_canvas::lenses::lens_facts(&m);
    let u = m.things.iter().find(|t| t.name == "unresolved").unwrap();
    assert_eq!(facts.unresolved_thing_id, Some(u.id));
    // The wrapper warning stays silent: the plant is the sole non-interface
    // component but it decomposes into nothing.
    assert!(!verdict.issues.iter().any(|i| i.code == "sole_component_decomposes"));
}

#[test]
fn stage_2_resolves_stage_1() {
    let report = check_resolution_canvas(&compile(STAGE_1), &compile(STAGE_2));
    assert!(report.issues.is_empty(), "{:?}", codes(&report));
}

#[test]
fn a_stage_2_with_an_extra_crossing_is_refused_on_count() {
    let extra = STAGE_2.replace(
        "@lens mobus",
        "component Material-Purchasing interface\nflow \"Steel-Plant\" -> Material-Purchasing : informational \"orders\"\nflow Material-Purchasing -> Iron-Source : informational \"orders\"\n@lens mobus",
    );
    let report = check_resolution_canvas(&compile(STAGE_1), &compile(&extra));
    assert_eq!(codes(&report), vec!["resolution.count_outbound".to_string()]);
}

#[test]
fn a_stage_2_with_a_renamed_counterparty_is_refused() {
    let renamed = STAGE_2.replace("Coke-Source", "Coal-Source");
    let report = check_resolution_canvas(&compile(STAGE_1), &compile(&renamed));
    assert_eq!(codes(&report), vec!["resolution.counterparty_inbound".to_string()]);
}

#[test]
fn a_stage_2_with_a_rekinded_flow_is_refused() {
    let rekinded = STAGE_2.replace("flow Ventilation -> ATMOSPHERE : energy", "flow Ventilation -> ATMOSPHERE : matter");
    let report = check_resolution_canvas(&compile(STAGE_1), &compile(&rekinded));
    assert_eq!(codes(&report), vec!["resolution.kind_outbound".to_string()]);
}

#[test]
fn a_stage_2_that_still_lands_on_unresolved_is_refused() {
    let report = check_resolution_canvas(&compile(STAGE_1), &compile(STAGE_1));
    assert!(codes(&report).contains(&"resolution.unresolved_remains".to_string()), "{:?}", codes(&report));
}

#[test]
fn the_kernel_holds_the_name_past_the_parser() {
    // A canvas rename can put the name on a resident; the parser never could.
    let mut m = compile(STAGE_2);
    m.things.iter_mut().find(|t| t.name == "FuseBox").unwrap().name = "unresolved".into();
    let codes: Vec<String> = analyze(&m, m.lens).validation.issues.iter().map(|i| i.code.clone()).collect();
    assert!(codes.iter().any(|c| c == "unresolved_not_passway"), "{codes:?}");
}
