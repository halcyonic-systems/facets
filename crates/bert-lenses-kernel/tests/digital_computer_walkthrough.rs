//! The digital-computer walkthrough: two SL-authored levels joined by a
//! `decomposes` reference — Mobus's ch. 7 depth-first procedure (Figs. 7.2–7.4)
//! wired for the decomposition walk. The same three obligations the
//! steel-plant gate holds, on the shelf's second walkable hierarchy:
//!
//! 1. each level's `.sl` parses, and neither level carries an Error-severity
//!    verdict under its own lens;
//! 2. the shipped child archive IS the current projection of its `.sl`, wearing
//!    the pinned identity the level above references — an `.sl` edit that
//!    forgets to re-mint fails here;
//! 3. the seam is CLEAN: level 0's Hardware against the stored level-1 archive,
//!    checked through the same call the web app's seam effect makes, against
//!    the same bytes it will resolve.
//!
//! Re-mint after editing an `.sl`:
//! `BLESS_DIGITAL_COMPUTER=1 cargo test -p bert-lenses-kernel --test digital_computer_walkthrough`

use std::collections::HashMap;
use std::fs;

use bert_canvas::canvas::CanvasModel;
use bert_canvas::lenses::{analyze, check_decompositions_canvas};
use bert_canvas::sl::parse_sl;
use bert_core::validate::Severity;
use bert_core::ModelId;
use bert_lenses_kernel::archive;

/// The child's pinned identity — the id level 0 stamps in its `decomposes`
/// clause. Minted once; the base58 string is the reference key.
const LEVEL_1_ID: &str = "Vf4yUhPg55VodT1f4n666S";

const LEVEL_0_SL: &str = "assets/walkthroughs/digital-computer/level-0.sl";
const LEVEL_1_SL: &str = "assets/walkthroughs/digital-computer/level-1.sl";
const LEVEL_1_JSON: &str = "assets/walkthroughs/digital-computer/level-1.json";

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

/// A child level as shipped: its `.sl` compiled and wearing its pinned id.
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
fn walkthrough_levels_parse_and_validate() {
    assert_no_errors(LEVEL_0_SL, &compile(LEVEL_0_SL));
    assert_no_errors(LEVEL_1_SL, &child(LEVEL_1_SL, LEVEL_1_ID));
}

/// The staleness gate (and, under BLESS_DIGITAL_COMPUTER, the mint itself).
#[test]
fn walkthrough_archive_is_current() {
    let minted = archive::write(&child(LEVEL_1_SL, LEVEL_1_ID)).unwrap();
    let path = repo_path(LEVEL_1_JSON);
    if std::env::var("BLESS_DIGITAL_COMPUTER").is_ok() {
        fs::write(&path, &minted).unwrap();
    }
    let stored = fs::read_to_string(&path)
        .unwrap_or_else(|_| panic!("{LEVEL_1_JSON}: not minted — run once with BLESS_DIGITAL_COMPUTER=1"));
    assert_eq!(
        stored, minted,
        "{LEVEL_1_JSON} is not the projection of {LEVEL_1_SL} — re-mint with BLESS_DIGITAL_COMPUTER=1"
    );
    assert_eq!(
        archive::identity(&stored).map(|i| i.to_base58()).as_deref(),
        Some(LEVEL_1_ID),
        "{LEVEL_1_JSON}: stored identity must be the referenced id"
    );
}

/// The seam, checked against the SHIPPED bytes the web app resolves, through
/// the same canvas-keyed call its seam effect makes.
#[test]
fn walkthrough_seam_is_clean() {
    let stored_1 = fs::read_to_string(repo_path(LEVEL_1_JSON)).unwrap();

    let parent = compile(LEVEL_0_SL);
    let refs: Vec<String> = parent
        .things
        .iter()
        .filter_map(|t| t.child_model.as_ref().map(|c| c.id.as_uuid()))
        .map(|u| bert_core::model_id::encode_uuid(&u))
        .collect();
    assert_eq!(
        refs,
        vec![LEVEL_1_ID.to_string()],
        "level 0 references exactly the level-1 archive"
    );

    let resolved = HashMap::from([(LEVEL_1_ID.to_string(), stored_1.clone())]);
    let report = check_decompositions_canvas(&parent, &resolved);
    let messages: Vec<_> = report.issues.iter().map(|i| i.message.clone()).collect();
    assert!(messages.is_empty(), "level 0 → level 1 seam violations: {messages:?}");

    let bottom = archive::read(&stored_1).unwrap();
    assert!(
        bottom.things.iter().all(|t| t.child_model.is_none()),
        "level 1 is this walk's floor — it references nothing"
    );
}
