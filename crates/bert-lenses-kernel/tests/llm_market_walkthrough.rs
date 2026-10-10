//! The LLM serving market's two levels: the pool-grain parent in
//! `assets/examples/llm-market.sl` and its two children in
//! `assets/walkthroughs/llm-market/`, joined by `decomposes` references.
//! This gate holds three things, the steel_walkthrough discipline:
//!
//! 1. each level's `.sl` parses, and neither the parent nor a child carries
//!    an Error-severity verdict under its own lens;
//! 2. each shipped child archive IS the current projection of its `.sl`,
//!    wearing the pinned identity the parent references. An `.sl` edit that
//!    forgets to re-mint fails here;
//! 3. both seams are CLEAN: the parent's two subsystems against the stored
//!    child archives, through the same canvas-keyed call the web app's seam
//!    effect makes, against the same bytes its bundled shelf resolves.
//!
//! Re-mint after editing a child `.sl`:
//! `BLESS_LLM_MARKET_WALKTHROUGH=1 cargo test -p bert-lenses-kernel --test llm_market_walkthrough`

use std::collections::HashMap;
use std::fs;

use bert_canvas::canvas::CanvasModel;
use bert_canvas::lenses::{analyze, check_decompositions_canvas};
use bert_canvas::sl::{format_sl, parse_sl};
use bert_core::validate::Severity;
use bert_core::ModelId;
use bert_lenses_kernel::archive;

const PARENT: &str = "assets/examples/llm-market.sl";

/// Each child's pinned identity: the id the parent stamps in its `decomposes`
/// clause, minted once. The base58 string is the reference key.
const CHILDREN: [(&str, &str, &str); 2] = [
    (
        "assets/walkthroughs/llm-market/frontier-serving.sl",
        "assets/walkthroughs/llm-market/frontier-serving.json",
        "5oJEAmzFReku6y9z8t5Ucu",
    ),
    (
        "assets/walkthroughs/llm-market/open-weight-serving.sl",
        "assets/walkthroughs/llm-market/open-weight-serving.json",
        "pWAnTptPXdKY3x38yXpLn",
    ),
];

fn repo_path(rel: &str) -> String {
    format!("{}/../../{rel}", env!("CARGO_MANIFEST_DIR"))
}

fn compile(rel: &str) -> CanvasModel {
    let text = fs::read_to_string(repo_path(rel)).unwrap_or_else(|e| panic!("{rel}: {e}"));
    parse_sl(&text).unwrap_or_else(|errs| {
        panic!(
            "{rel} does not parse: {}",
            errs.iter()
                .map(|e| format!("line {}: {}", e.line, e.message))
                .collect::<Vec<_>>()
                .join("; ")
        )
    })
}

fn child(rel_sl: &str, id: &str) -> CanvasModel {
    let mut cm = compile(rel_sl);
    cm.model_id = Some(id.parse::<ModelId>().unwrap());
    cm
}

fn assert_no_errors(rel: &str, cm: &CanvasModel) {
    let verdict = analyze(cm, cm.lens).validation;
    let errors: Vec<_> = verdict
        .issues
        .iter()
        .filter(|i| matches!(i.severity, Severity::Error))
        .map(|i| i.message.clone())
        .collect();
    assert!(errors.is_empty(), "{rel} carries Error verdicts: {errors:?}");
}

#[test]
fn levels_parse_and_validate() {
    assert_no_errors(PARENT, &compile(PARENT));
    for (sl, _, id) in CHILDREN {
        assert_no_errors(sl, &child(sl, id));
    }
}

/// The children ship in canonical form, as the examples shelf does
/// (`sl_format.rs`); they live outside that gate's directories, so the
/// obligation is restated here.
#[test]
fn children_are_already_formatted() {
    for (sl, _, _) in CHILDREN {
        let text = fs::read_to_string(repo_path(sl)).unwrap();
        let formatted = format_sl(&text).unwrap_or_else(|e| panic!("{sl}: does not parse: {e:?}"));
        assert_eq!(formatted, text, "{sl}: not in canonical form");
    }
}

/// The staleness gate (and, under BLESS_LLM_MARKET_WALKTHROUGH, the mint
/// itself): each stored archive is the projection of its `.sl` wearing its
/// pinned id.
#[test]
fn child_archives_are_current() {
    for (sl, json, id) in CHILDREN {
        let minted = archive::write(&child(sl, id)).unwrap();
        let path = repo_path(json);
        if std::env::var("BLESS_LLM_MARKET_WALKTHROUGH").is_ok() {
            fs::write(&path, &minted).unwrap();
        }
        let stored = fs::read_to_string(&path)
            .unwrap_or_else(|_| panic!("{json}: not minted — run once with BLESS_LLM_MARKET_WALKTHROUGH=1"));
        assert_eq!(
            stored, minted,
            "{json} is not the projection of {sl} — re-mint with BLESS_LLM_MARKET_WALKTHROUGH=1"
        );
        assert_eq!(
            archive::identity(&stored).map(|i| i.to_base58()).as_deref(),
            Some(id),
            "{json}: stored identity must be the referenced id"
        );
    }
}

/// Both seams, checked against the SHIPPED bytes the web app's bundled shelf
/// resolves, through the canvas-keyed call its seam effect makes. Clean means
/// each subsystem's child refines exactly the parent's flows into and out of
/// it, counterparty for counterparty.
#[test]
fn seams_are_clean() {
    let root = compile(PARENT);
    let mut refs: Vec<String> = root
        .things
        .iter()
        .filter_map(|t| t.child_model.as_ref().map(|c| c.id.as_uuid()))
        .map(|u| bert_core::model_id::encode_uuid(&u))
        .collect();
    refs.sort();
    let mut expected: Vec<String> = CHILDREN.iter().map(|(_, _, id)| id.to_string()).collect();
    expected.sort();
    assert_eq!(refs, expected, "the parent references exactly the two child archives");

    let resolved: HashMap<String, String> = CHILDREN
        .iter()
        .map(|(_, json, id)| (id.to_string(), fs::read_to_string(repo_path(json)).unwrap()))
        .collect();
    let report = check_decompositions_canvas(&root, &resolved);
    let messages: Vec<_> = report.issues.iter().map(|i| i.message.clone()).collect();
    assert!(messages.is_empty(), "parent → child seam violations: {messages:?}");

    for (_, json, _) in CHILDREN {
        let bottom = archive::read(&fs::read_to_string(repo_path(json)).unwrap()).unwrap();
        assert!(
            bottom.things.iter().all(|t| t.child_model.is_none()),
            "{json} is the floor — it references nothing"
        );
    }
}

/// The seam has teeth: a child whose stand-in no longer names the parent's
/// neighbour is refused, so a clean report above is a finding and not a
/// tautology.
#[test]
fn seam_refuses_a_renamed_stand_in() {
    let root = compile(PARENT);
    let (sl, _, id) = CHILDREN[0];
    let text = fs::read_to_string(repo_path(sl)).unwrap();
    assert!(text.contains("source Router\n"), "the frontier child's Router stand-in moved");
    let mut drifted = parse_sl(&text.replace("source Router\n", "source Gateway\n").replace("flow Router ->", "flow Gateway ->")).unwrap();
    drifted.model_id = Some(id.parse::<ModelId>().unwrap());
    let resolved = HashMap::from([(id.to_string(), archive::write(&drifted).unwrap())]);
    let report = check_decompositions_canvas(&root, &resolved);
    assert!(
        report.issues.iter().any(|i| i.code.starts_with("decomposition.")),
        "a stand-in that names no parent neighbour must be refused: {:?}",
        report.issues.iter().map(|i| &i.code).collect::<Vec<_>>()
    );
}
