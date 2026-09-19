//! facets#406: a declared `sink` that sends (or `source` that receives) is a
//! contradiction between the author's declaration and the author's flow. The
//! run always refused it; the verdict passed it clean and reported the
//! symptoms instead — everything fed only by the sending sink came back
//! `unreachable`. The separating instance from the issue: the same text with
//! `environment` in place of `sink` loses every `unreachable` and keeps only
//! the genuine `dead_end`s. Now the verdict names the cause.
use bert_canvas::canvas::Lens;
use bert_canvas::lenses::analyze;
use bert_canvas::sl::parse_sl;
use bert_core::validate::Severity;

const SINK_THAT_SENDS: &str = "\
system \"Submarine\" : Concrete/Technical
component Crew interface
component Periscope
sink \"Naval Command\"
flow Crew -> \"Naval Command\" : informational \"status report\"
flow \"Naval Command\" -> Crew : informational \"mission orders\"
flow Crew -> Periscope : informational \"look\"
@lens mobus
";

fn codes(sl: &str) -> Vec<(String, Severity)> {
    let m = parse_sl(sl).unwrap();
    analyze(&m, Lens::Mobus)
        .validation
        .issues
        .into_iter()
        .map(|i| (i.code, i.severity))
        .collect()
}

#[test]
fn a_sink_that_sends_is_refused_and_named() {
    let issues = codes(SINK_THAT_SENDS);
    let refusal = issues.iter().find(|(c, _)| c == "sink_sends");
    assert!(refusal.is_some(), "the verdict must name the sending sink: {issues:?}");
    assert_eq!(refusal.unwrap().1, Severity::Error, "the run already refuses it; the verdict says so");
}

#[test]
fn the_same_text_declared_environment_is_clean_of_it() {
    let env = SINK_THAT_SENDS.replace("sink \"Naval Command\"", "environment \"Naval Command\"");
    let issues = codes(&env);
    assert!(!issues.iter().any(|(c, _)| c == "sink_sends" || c == "source_receives"), "{issues:?}");
    assert!(!issues.iter().any(|(c, _)| c == "unreachable"), "the symptoms go with the cause: {issues:?}");
}

#[test]
fn a_source_that_receives_is_the_mirror() {
    let sl = SINK_THAT_SENDS
        .replace("sink \"Naval Command\"", "source \"Naval Command\"");
    let issues = codes(&sl);
    assert!(issues.iter().any(|(c, s)| c == "source_receives" && *s == Severity::Error), "{issues:?}");
}

#[test]
fn a_source_fold_declared_on_two_lines_is_one_environment_and_clean() {
    // `source X` then `sink X` folds to one `environment X` (facets#377): the
    // parser already reads a both-ways neighbour, so the verdict has nothing
    // to refuse.
    let sl = SINK_THAT_SENDS.replace(
        "sink \"Naval Command\"",
        "source \"Naval Command\"\nsink \"Naval Command\"",
    );
    let issues = codes(&sl);
    assert!(!issues.iter().any(|(c, _)| c == "sink_sends" || c == "source_receives"), "{issues:?}");
}
