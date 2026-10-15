//! The format tag's dual reader, held on real files (#541, phase 3).
//!
//! The writer now emits `facets/canvas@1`; every archive written before the
//! rename carries `bert-lenses/canvas@1`, and that includes the four
//! walkthrough archives this repository ships. Those are not re-minted until
//! phase 5, so for one release they are the proof that the old tag opens: each
//! is read through `archive::read` (what `open_model` and the CLI call) and
//! must come back whole. The old tag retires on 2027-01-11 (`FORMAT_RETIRING`).

use std::fs;
use std::path::{Path, PathBuf};

use facets_kernel::archive::{self, FORMAT, FORMAT_RETIRING};
use serde_json::Value;

/// Every shipped file carrying the old tag on 2026-10-11. Phase 5 re-mints
/// them under the new tag; this list then empties and the proof moves to a
/// kept copy.
const OLD_TAG_FILES: [&str; 4] = [
    "assets/walkthroughs/digital-computer/level-1.json",
    "assets/walkthroughs/llm-market/frontier-serving.json",
    "assets/walkthroughs/llm-market/open-weight-serving.json",
    "assets/walkthroughs/steel-plant/level-2.json",
];

fn repo() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../..")
}

fn json_files(dir: &Path, out: &mut Vec<PathBuf>) {
    for entry in fs::read_dir(dir).unwrap_or_else(|e| panic!("{}: {e}", dir.display())) {
        let path = entry.unwrap().path();
        if path.is_dir() {
            json_files(&path, out);
        } else if path.extension().is_some_and(|e| e == "json") {
            out.push(path);
        }
    }
}

fn tag_of(text: &str) -> Option<String> {
    let value: Value = serde_json::from_str(text).ok()?;
    value.get("format")?.as_str().map(str::to_string)
}

/// The list above is the whole set, so a file that carries the old tag cannot
/// ship without the reader being proved on it.
#[test]
fn the_old_tag_files_are_exactly_the_listed_four() {
    let root = repo();
    let mut files = Vec::new();
    for dir in ["assets", "fixtures"] {
        json_files(&root.join(dir), &mut files);
    }
    let mut found: Vec<String> = files
        .iter()
        .filter(|p| fs::read_to_string(p).ok().and_then(|t| tag_of(&t)).as_deref() == Some(FORMAT_RETIRING))
        .map(|p| p.strip_prefix(&root).unwrap().to_string_lossy().replace('\\', "/"))
        .collect();
    found.sort();
    assert_eq!(found, OLD_TAG_FILES.to_vec());
}

#[test]
fn every_shipped_old_tag_archive_opens() {
    for rel in OLD_TAG_FILES {
        let text = fs::read_to_string(repo().join(rel)).unwrap_or_else(|e| panic!("{rel}: {e}"));
        assert_eq!(tag_of(&text).as_deref(), Some(FORMAT_RETIRING), "{rel} still carries the old tag");

        let model = archive::read(&text).unwrap_or_else(|e| panic!("{rel} does not open: {e}"));
        assert!(!model.things.is_empty(), "{rel} opened empty");
        assert!(archive::identity(&text).is_some(), "{rel}: no identity");

        // The tag carries no content: the same file under the new tag reads to
        // the same model and the same identity.
        let retagged = text.replacen(FORMAT_RETIRING, FORMAT, 1);
        assert_eq!(
            serde_json::to_value(archive::read(&retagged).unwrap()).unwrap(),
            serde_json::to_value(&model).unwrap(),
            "{rel}: the tag changed what was read"
        );
        assert_eq!(archive::identity(&retagged), archive::identity(&text));
    }
}

/// Saving an opened old-tag file writes the new tag and changes nothing else:
/// the round trip is the stored bytes with the marker swapped.
#[test]
fn saving_an_old_tag_archive_writes_the_new_tag() {
    for rel in OLD_TAG_FILES {
        let text = fs::read_to_string(repo().join(rel)).unwrap();
        let written = archive::write(&archive::read(&text).unwrap()).unwrap();
        assert_eq!(tag_of(&written).as_deref(), Some(FORMAT), "{rel}");
        assert!(!written.contains(FORMAT_RETIRING), "{rel}: the old tag was written");
        assert_eq!(written, text.replacen(FORMAT_RETIRING, FORMAT, 1), "{rel}: more than the tag moved");
    }
}
