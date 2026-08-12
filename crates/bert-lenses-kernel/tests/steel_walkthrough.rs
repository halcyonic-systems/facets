//! The Steel-Plant walkthrough hierarchy: three SL-authored levels joined by
//! `decomposes` references — Mobus's ch. 4 procedure (Figs. 4.14–4.17) wired
//! for the decomposition walk. This gate holds three things:
//!
//! 1. each level's `.sl` parses, and neither the parent nor either child
//!    carries an Error-severity verdict under its own lens;
//! 2. the shipped child archives in `assets/walkthroughs/steel-plant/` ARE
//!    the current projections of their `.sl` sources, each wearing its pinned
//!    identity — the id the level above references. An `.sl` edit that
//!    forgets to re-mint fails here, the `sl_demos.rs` discipline;
//! 3. both seams are CLEAN: level 0's Steel-Plant against the stored level-1
//!    archive, and level 1's Iron-Inventory against the stored level-2
//!    archive — checked through the same call the web app's seam effect
//!    makes, against the same bytes it will resolve, so the ✓ the breadcrumb
//!    shows is proven here rather than hoped for.
//!
//! Re-mint after editing an `.sl`:
//! `BLESS_STEEL_WALKTHROUGH=1 cargo test -p bert-lenses-kernel --test steel_walkthrough`

use std::collections::HashMap;
use std::fs;

use bert_canvas::canvas::CanvasModel;
use bert_canvas::lenses::{analyze, check_decompositions_canvas};
use bert_canvas::sl::parse_sl;
use bert_core::validate::Severity;
use bert_core::ModelId;
use bert_lenses_kernel::archive;

/// The children's pinned identities — the ids the level above stamps in its
/// `decomposes` clause. Minted once; the base58 string is the reference key.
const LEVEL_1_ID: &str = "WVv2pzPHybekS7U3ewwVxx";
const LEVEL_2_ID: &str = "VjCKBe5psWuHcmW2yE8nXM";

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
    assert_no_errors("assets/walkthroughs/steel-plant/level-0.sl", &compile("assets/walkthroughs/steel-plant/level-0.sl"));
    assert_no_errors(
        "assets/walkthroughs/steel-plant/level-1.sl",
        &child("assets/walkthroughs/steel-plant/level-1.sl", LEVEL_1_ID),
    );
    assert_no_errors(
        "assets/walkthroughs/steel-plant/level-2.sl",
        &child("assets/walkthroughs/steel-plant/level-2.sl", LEVEL_2_ID),
    );
}

/// The staleness gate (and, under BLESS_STEEL_WALKTHROUGH, the mint itself):
/// the stored archive is the projection of its `.sl` wearing its pinned id.
#[test]
fn walkthrough_archives_are_current() {
    for (sl, json, id) in [
        ("assets/walkthroughs/steel-plant/level-1.sl", "assets/walkthroughs/steel-plant/level-1.json", LEVEL_1_ID),
        ("assets/walkthroughs/steel-plant/level-2.sl", "assets/walkthroughs/steel-plant/level-2.json", LEVEL_2_ID),
    ] {
        let minted = archive::write(&child(sl, id)).unwrap();
        let path = repo_path(json);
        if std::env::var("BLESS_STEEL_WALKTHROUGH").is_ok() {
            fs::write(&path, &minted).unwrap();
        }
        let stored = fs::read_to_string(&path)
            .unwrap_or_else(|_| panic!("{json}: not minted — run once with BLESS_STEEL_WALKTHROUGH=1"));
        assert_eq!(
            stored, minted,
            "{json} is not the projection of {sl} — re-mint with BLESS_STEEL_WALKTHROUGH=1"
        );
        assert_eq!(
            archive::identity(&stored).map(|i| i.to_base58()).as_deref(),
            Some(id),
            "{json}: stored identity must be the referenced id"
        );
    }
}

/// Both seams, checked against the SHIPPED bytes — the same referent text the
/// web app's bundled shelf resolves — through the same canvas-keyed call its
/// seam effect makes. Clean means every breadcrumb glyph on the walk is ✓.
#[test]
fn walkthrough_seams_are_clean() {
    let stored_1 = fs::read_to_string(repo_path("assets/walkthroughs/steel-plant/level-1.json")).unwrap();
    let stored_2 = fs::read_to_string(repo_path("assets/walkthroughs/steel-plant/level-2.json")).unwrap();

    let parent = compile("assets/walkthroughs/steel-plant/level-0.sl");
    let refs: Vec<String> = parent
        .things
        .iter()
        .filter_map(|t| t.child_model.as_ref().map(|c| c.id.as_uuid()))
        .map(|u| bert_core::model_id::encode_uuid(&u))
        .collect();
    assert_eq!(refs, vec![LEVEL_1_ID.to_string()], "level 0 references exactly the level-1 archive");

    let resolved = HashMap::from([(LEVEL_1_ID.to_string(), stored_1.clone())]);
    let report = check_decompositions_canvas(&parent, &resolved);
    let messages: Vec<_> = report.issues.iter().map(|i| i.message.clone()).collect();
    assert!(messages.is_empty(), "level 0 → level 1 seam violations: {messages:?}");

    let middle = archive::read(&stored_1).unwrap();
    let resolved = HashMap::from([(LEVEL_2_ID.to_string(), stored_2.clone())]);
    let report = check_decompositions_canvas(&middle, &resolved);
    let messages: Vec<_> = report.issues.iter().map(|i| i.message.clone()).collect();
    assert!(messages.is_empty(), "level 1 → level 2 seam violations: {messages:?}");

    let bottom = archive::read(&stored_2).unwrap();
    assert!(
        bottom.things.iter().all(|t| t.child_model.is_none()),
        "level 2 is the walk's floor — it references nothing"
    );
}
