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
