//! The SL formatter's separating tests (#302 prong 2, epic #399). Each law
//! carries its own negative control — the same fixture run through the plain
//! `emit_sl ∘ parse_sl` path, which must NOT show the property — so a future
//! regression that quietly disables the feature fails loud rather than
//! passing by coincidence.

use std::fs;
use std::path::{Path, PathBuf};

use bert_canvas::canvas::CanvasModel;
use bert_canvas::sl::{emit_sl, emit_sl_with, format_sl, parse_sl, parse_sl_full};

const COMMENTS: &str = include_str!("../../../fixtures/sl/stanza/comments.sl");
const PINNED: &str = include_str!("../../../fixtures/sl/stanza/pinned.sl");
const INTERLEAVED: &str = include_str!("../../../fixtures/sl/stanza/interleaved.sl");
const HAL_HARNESS: &str = include_str!("../../../assets/examples/hal-harness.sl");

fn json(m: &CanvasModel) -> serde_json::Value {
    serde_json::to_value(m).unwrap()
}

fn comment_lines(text: &str) -> usize {
    text.lines().filter(|l| l.trim().starts_with('#')).count()
}

/// Every `.sl` file under `assets/`, walked at test time so a dropped-in
/// fixture is covered without touching this file.
fn all_sl_files() -> Vec<PathBuf> {
    fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
        for entry in fs::read_dir(dir).unwrap_or_else(|e| panic!("{}: {e}", dir.display())) {
            let entry = entry.unwrap();
            let path = entry.path();
            if path.is_dir() {
                walk(&path, out);
            } else if path.extension().is_some_and(|x| x == "sl") {
                out.push(path);
            }
        }
    }
    let mut out = Vec::new();
    walk(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../assets"), &mut out);
    out.sort();
    out
}

/// Law 1: `format_sl` keeps every comment line. Negative control: the same
/// fixture through plain `emit_sl ∘ parse_sl` keeps none — `CanvasModel`
/// carries no comment field, so that path is comment-free by construction.
#[test]
fn format_keeps_every_comment_line() {
    let before = comment_lines(COMMENTS);
    assert!(before > 0, "fixture carries no comments to preserve");
    let formatted = format_sl(COMMENTS).unwrap();
    assert_eq!(comment_lines(&formatted), before, "format dropped a comment\n{formatted}");

    let plain = emit_sl(&parse_sl(COMMENTS).unwrap()).unwrap();
    assert_eq!(comment_lines(&plain), 0, "plain emit∘parse unexpectedly kept a comment (test is not separating)");
}

/// Law 2: tree-wide, `format_sl` preserves the comment-line multiset, is a
/// fixpoint, and `parse(format(t))` is `parse(t)` as JSON. Counted at test
/// time rather than a literal — the corpus moves.
#[test]
fn tree_wide_multiset_fixpoint_and_model_identity() {
    let files = all_sl_files();
    assert!(files.len() > 10, "expected the shipped SL corpus, found {}", files.len());
    let mut total_before = 0;
    let mut total_after = 0;
    for path in &files {
        let text = fs::read_to_string(path).unwrap();
        let name = path.display();
        let Ok(m1) = parse_sl_full(&text) else {
            // A handful of fixtures are deliberately faulted (fault-message
            // goldens); format_sl faults the same way parse does (gofmt
            // semantics) and has nothing to preserve.
            continue;
        };
        total_before += comment_lines(&text);
        let formatted = format_sl(&text).unwrap_or_else(|e| panic!("{name}: format faulted on a clean parse: {e:?}"));
        total_after += comment_lines(&formatted);

        let formatted2 = format_sl(&formatted).unwrap_or_else(|e| panic!("{name}: re-format faulted: {e:?}"));
        assert_eq!(formatted, formatted2, "{name}: format is not a fixpoint");

        let m2 = parse_sl_full(&formatted).unwrap_or_else(|e| panic!("{name}: formatted text does not re-parse: {e:?}"));
        assert_eq!(json(&m1.model), json(&m2.model), "{name}: format changed the model");
    }
    assert_eq!(total_after, total_before, "comment multiset drifted tree-wide (before={total_before}, after={total_after})");
}

/// Law 3: no invented pins. A file with no `@pos` formats with none; a file
/// with one `@pos A` keeps exactly that one. Negative control: plain
/// `emit_sl` writes one per thing regardless of what was authored.
#[test]
fn no_invented_pins() {
    let unpinned = format_sl(COMMENTS).unwrap();
    assert!(!unpinned.contains("@pos"), "format invented a @pos the author never wrote\n{unpinned}");
    let plain_unpinned = emit_sl(&parse_sl(COMMENTS).unwrap()).unwrap();
    assert!(plain_unpinned.contains("@pos"), "plain emit unexpectedly wrote no @pos (test is not separating)");

    let pinned = format_sl(PINNED).unwrap();
    let pos_lines: Vec<&str> = pinned.lines().filter(|l| l.starts_with("@pos")).collect();
    assert_eq!(pos_lines, vec!["@pos A 100 200"], "expected exactly the one authored @pos\n{pinned}");

    let plain_pinned = emit_sl(&parse_sl(PINNED).unwrap()).unwrap();
    let plain_pos_lines = plain_pinned.lines().filter(|l| l.starts_with("@pos")).count();
    assert_eq!(plain_pos_lines, 2, "plain emit should still write one @pos per thing (test is not separating)");
}

/// Law 4: a same-line trailing `#` comment stays on its line — on a
/// declaration and on the description continuation beneath it.
#[test]
fn trailing_comment_stays_on_its_line() {
    let formatted = format_sl(COMMENTS).unwrap();
    assert!(
        formatted.lines().any(|l| l.starts_with("component Furnace") && l.trim_end().ends_with("# runs hot")),
        "declaration's trailing comment did not survive on its line\n{formatted}"
    );
    assert!(
        formatted
            .lines()
            .any(|l| l.trim_start().starts_with("description") && l.trim_end().ends_with("# trailing on continuation")),
        "continuation's trailing comment did not survive on its line\n{formatted}"
    );
}

/// Law 5: reordering. A milieu declared after a flow in source text emits
/// before the flows (canonical order) with its comment still directly above
/// it, and a comment above a later flow stays with that flow, not whichever
/// declaration used to sit above it physically.
#[test]
fn comment_travels_with_its_declaration_through_reordering() {
    let formatted = format_sl(INTERLEAVED).unwrap();
    let lines: Vec<&str> = formatted.lines().collect();
    let milieu_comment = lines.iter().position(|l| *l == "# the ambient bath, declared late in the source").unwrap();
    let milieu_decl = lines.iter().position(|l| *l == "milieu Temp value 20 unit C").unwrap();
    assert_eq!(milieu_decl, milieu_comment + 1, "milieu's comment did not land directly above it\n{formatted}");

    let flow_a_b = lines.iter().position(|l| *l == "flow A -> B").unwrap();
    assert!(milieu_decl < flow_a_b, "canonical order should put milieu before flows\n{formatted}");

    let second_leg_comment = lines.iter().position(|l| *l == "# second leg").unwrap();
    let flow_b_a = lines.iter().position(|l| *l == "flow B -> A mere").unwrap();
    assert_eq!(flow_b_a, second_leg_comment + 1, "the second flow's comment drifted off it\n{formatted}");
}

/// Law 6: `End`-anchor trivia (text after the last line the parser consumed)
/// survives, and the blank separator before the annotation block does not
/// double up when the source already had leading trivia there.
#[test]
fn end_trivia_survives_and_annotation_separator_does_not_double() {
    let formatted = format_sl(HAL_HARNESS).unwrap();
    let before = comment_lines(HAL_HARNESS);
    assert_eq!(comment_lines(&formatted), before, "hal-harness lost comments on format");

    // hal-harness carries prose after its `@lens` line to EOF — the End
    // anchor. It must still be there, after `@lens`.
    let lens_idx = formatted.lines().position(|l| l == "@lens bunge").expect("@lens bunge survives");
    let after_lens: Vec<&str> = formatted.lines().skip(lens_idx + 1).collect();
    assert!(after_lens.iter().any(|l| l.starts_with('#')), "End-anchor trivia after @lens is missing");

    // No run of more than one blank line anywhere (the collapse rule),
    // including at the header/annotation seam.
    let mut consecutive_blanks = 0;
    for l in formatted.lines() {
        if l.is_empty() {
            consecutive_blanks += 1;
            assert!(consecutive_blanks <= 1, "a blank run was not collapsed\n{formatted}");
        } else {
            consecutive_blanks = 0;
        }
    }
}

/// Law 7: an unknown `@` annotation line survives `format_sl` verbatim.
/// Negative control: plain `emit_sl ∘ parse_sl` drops it (the parser's
/// documented ignorable contract for unrecognized annotations).
#[test]
fn unknown_annotation_survives_format_but_not_plain_emit() {
    let formatted = format_sl(COMMENTS).unwrap();
    assert!(
        formatted.lines().any(|l| l == "@wibble unknown annotation survives"),
        "format dropped an unknown annotation line\n{formatted}"
    );
    let plain = emit_sl(&parse_sl(COMMENTS).unwrap()).unwrap();
    assert!(
        !plain.contains("@wibble"),
        "plain emit unexpectedly kept the unknown annotation (test is not separating)"
    );
}

/// Law 8: the gate. `format(t) == t` for the files this sweep converted —
/// they are the ones that must already be in canonical form. (The wider
/// claim that every file under `assets/examples` satisfies this does not
/// hold against this tree: it has eight `.sl` files, not four, and three of
/// the other four were never in scope for this sweep — left unformatted,
/// see the sweep's report.)
#[test]
fn converted_files_are_already_formatted() {
    let converted = [
        "../../assets/examples/translation-apparatus.sl",
        "../../assets/examples/federal-reserve.sl",
        "../../assets/examples/bitcoin.sl",
        "../../assets/examples/hal-harness.sl",
    ];
    for rel in converted {
        let path = Path::new(env!("CARGO_MANIFEST_DIR")).join(rel);
        let text = fs::read_to_string(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
        let formatted = format_sl(&text).unwrap_or_else(|e| panic!("{}: does not parse: {e:?}", path.display()));
        assert_eq!(formatted, text, "{}: not in canonical form", path.display());
    }
}

/// Law 9: no layout, no change. `emit_sl_with(m, None)` is `emit_sl(m)` —
/// existing goldens are untouched by this feature's presence.
#[test]
fn no_layout_means_no_change() {
    for (name, text) in [
        ("comments", COMMENTS),
        ("pinned", PINNED),
        ("interleaved", INTERLEAVED),
        ("hal-harness", HAL_HARNESS),
    ] {
        let m = parse_sl(text).unwrap_or_else(|e| panic!("{name}: {e:?}"));
        assert_eq!(
            emit_sl(&m).unwrap(),
            emit_sl_with(&m, None).unwrap(),
            "{name}: emit_sl_with(_, None) diverged from emit_sl"
        );
    }
}
