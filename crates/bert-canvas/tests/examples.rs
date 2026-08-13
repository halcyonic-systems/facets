//! The examples-by-genus gate (#148).
//!
//! `assets/examples/*.sl` is shipped structural content: a user clicks a genus
//! card and reads the model on the canvas. Unlike the source corpus these are
//! not advertised as an author's own drawing, so they carry no provenance
//! header and are held to no lens-mode gate — but they still open, so a file
//! that fails to compile or carries a Core error is a click-to-toast defect,
//! and one without a genus cannot be placed in the gallery. Read at runtime so
//! a dropped-in file is covered the moment it is committed.

use std::fs;
use std::path::Path;

use bert_canvas::sl::parse_sl_full;

#[test]
fn examples_open_clean_and_declare_genus() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../assets/examples");
    let mut files: Vec<_> = fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("{}: {e}", dir.display()))
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|x| x == "sl"))
        .collect();
    files.sort();
    assert!(!files.is_empty(), "no .sl files under {}", dir.display());

    for p in &files {
        let name = p.file_name().unwrap().to_string_lossy();
        let text = fs::read_to_string(p).unwrap();

        let parsed =
            parse_sl_full(&text).unwrap_or_else(|f| panic!("{name}: does not compile: {f:#?}"));

        assert!(
            parsed.model.system_type.genus.is_some(),
            "{name}: `system \"…\" : Kingdom/Genus` is required so the gallery can place it"
        );

        // Warnings are allowed — a structural example opens as a diagram, it
        // does not run. Only a Core Error blocks a clean open.
        let world = bert_canvas::canvas::project(&parsed.model);
        let core = bert_core::validate::validate_mode(&world, bert_core::Mode::Core);
        let errors: Vec<_> = core
            .issues
            .iter()
            .filter(|i| matches!(i.severity, bert_core::validate::Severity::Error))
            .collect();
        assert!(errors.is_empty(), "{name}: Core errors: {errors:?}");
    }
}

/// The drawn budget for a flow's label, in characters. MUST match
/// `EDGE_LABEL_MAX` in `web/src/canvas/style.ts`, which is where the canvas
/// elides; `style.elide.test.ts` pins the same number from the other side so a
/// change to either is caught rather than silently drifting.
const LABEL_BUDGET: usize = 28;

/// #335: a flow's label is a NAME, its sentence is a `description`.
///
/// Labels became sentences for a structural reason rather than carelessness —
/// until #326 there was nowhere else to put prose, so the label was the only
/// slot and every author used it. That pressure is gone; this keeps the habit
/// from coming back. The cost was measured on `federal-reserve.sl`: 23 labels,
/// 7 overlapping pairs, widest 224px against a 30px sibling fan. And label
/// crowding is zoom-invariant — every label sits inside one `scale()` group
/// and nothing counter-scales — so a crowded diagram cannot be rescued by
/// zooming in. Short labels are the only thing that works.
///
/// Scope is deliberately OUR shipped models. `assets/corpus/**` is exempt and
/// is not read here: those labels are transcribed from published figures and
/// are their authors' words, not ours. The parser is not involved either — a
/// long label is legal SL, the kernel reads nothing from it, and refusing one
/// would be the language enforcing taste (#335, "Not a hard refusal").
#[test]
fn example_flow_labels_are_names_not_sentences() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../assets/examples");
    let mut files: Vec<_> = fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("{}: {e}", dir.display()))
        .flatten()
        .map(|e| e.path())
        .filter(|p| p.extension().is_some_and(|x| x == "sl"))
        .collect();
    files.sort();
    assert!(!files.is_empty(), "no .sl files under {}", dir.display());

    let mut over: Vec<String> = Vec::new();
    let mut labels = 0usize;
    for p in &files {
        let name = p.file_name().unwrap().to_string_lossy();
        let text = fs::read_to_string(p).unwrap();
        let parsed = parse_sl_full(&text).unwrap_or_else(|f| panic!("{name}: {f:#?}"));
        for r in &parsed.model.relations {
            if r.name.is_empty() {
                continue;
            }
            labels += 1;
            // Count CHARACTERS, not bytes: a label carrying an en dash or an
            // accent is not longer to read for being longer to store.
            let n = r.name.chars().count();
            if n > LABEL_BUDGET {
                over.push(format!("  {name}: {n} chars — {:?}", r.name));
            }
        }
    }

    assert!(
        labels > 0,
        "no labelled flows found — the gate would pass vacuously"
    );
    assert!(
        over.is_empty(),
        "{} flow label(s) over the {LABEL_BUDGET}-char budget. A label is a NAME; \
move the sentence into `description \"…\"` (spec §4.4).\n{}",
        over.len(),
        over.join("\n")
    );
}
