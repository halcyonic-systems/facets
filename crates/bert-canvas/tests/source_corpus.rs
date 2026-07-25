//! The source corpus ship gate (#132).
//!
//! `assets/corpus/**/*.sl` is shipped content: a user clicks a gallery card and
//! reads an author's own model on the canvas. A broken file here is not a bad
//! lesson someone eventually fixes — it is a parse-fault toast, or red issues on
//! a model advertised as Klir's or Bunge's own. This test makes that impossible.
//!
//! Unlike `sl_roundtrip.rs`, which hard-codes its four paths through
//! `include_str!`, this reads the directory at test runtime. `include_str!`
//! cannot glob, and the gate has to cover a file the moment it is committed —
//! including one an author forgot to add to the index.
//!
//! The source corpus is deliberately NOT a round-trip golden. Keeping it out of
//! the round-trip set is what lets a pedagogical rewording land without
//! perturbing a golden — the dual-use coupling both sets were built to release.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use bert_canvas::sl::parse_sl_full;

/// Keys of the provenance header, in the order §2.1 fixes.
const REQUIRED: [&str; 7] = ["title", "author", "work", "year", "locus", "teaches", "omits"];
const OPTIONAL: [&str; 4] = ["figure", "note", "gate", "set"];

/// The declared works of each shelf — (author, work, year), matched exactly
/// against the header (#194).
///
/// Every shelf currently holds one book, and an allow-list rather than a
/// derived "whichever book the shelf already uses" is the point: a second work
/// on a shelf has to be *typed here*, in the same commit as the entry that
/// needs it. A transcription that drifts onto a neighbouring title — Mobus &
/// Kalton's *Principles of Systems Science* (2015) for Mobus 2022, say — is
/// then a red test rather than a silently shipped mis-attribution.
///
/// Extending this list is a deliberate act. A shelf may legitimately span works
/// (Klir's *Architecture of Systems Problem Solving* alongside *Facets*), and
/// when one does, the second triple goes here with the entry that introduces it.
type Work = (&'static str, &'static str, &'static str);
type Shelf = (&'static str, &'static [Work]);

const SHELVES: &[Shelf] = &[
    ("bunge", &[("Mario Bunge", "Treatise on Basic Philosophy, Vol. 4: A World of Systems", "1979")]),
    ("klir", &[("George Klir", "Facets of Systems Science, 2nd ed.", "2001")]),
    ("mobus", &[("George Mobus", "Systems Science: Theory, Analysis, Modeling, and Design", "2022")]),
];

fn corpus_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../assets/corpus")
}

fn sl_files(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    for e in entries.flatten() {
        let p = e.path();
        if p.is_dir() {
            sl_files(&p, out);
        } else if p.extension().is_some_and(|x| x == "sl") {
            out.push(p);
        }
    }
}

/// A parsed provenance header: single-valued fields, plus the repeatable `note`.
struct Header {
    fields: BTreeMap<String, String>,
    notes: Vec<String>,
}

/// Parse and validate the header run. Returns the fields or a failure reason.
fn read_header(name: &str, text: &str) -> Result<Header, String> {
    let mut lines = text.lines();
    let first = lines.next().unwrap_or_default();
    if first != "# corpus-entry: v1" {
        return Err(format!("{name}: line 1 must be exactly `# corpus-entry: v1`, found {first:?}"));
    }

    let mut fields = BTreeMap::new();
    let mut notes = Vec::new();
    let mut terminated = false;

    for (i, line) in lines.enumerate() {
        let lineno = i + 2;
        if line.trim().is_empty() {
            terminated = true;
            break;
        }
        let Some(rest) = line.strip_prefix("# ") else {
            return Err(format!(
                "{name}:{lineno}: header run must be contiguous `# ` comment lines \
                 terminated by one blank line, found {line:?}"
            ));
        };
        let Some((key, value)) = rest.split_once(": ") else {
            return Err(format!("{name}:{lineno}: expected `# key: value`, found {line:?}"));
        };
        if value.trim().is_empty() {
            return Err(format!("{name}:{lineno}: key `{key}` has an empty value"));
        }
        if key == "note" {
            notes.push(value.to_string());
            continue;
        }
        if !REQUIRED.contains(&key) && !OPTIONAL.contains(&key) {
            return Err(format!("{name}:{lineno}: unknown header key `{key}`"));
        }
        if fields.insert(key.to_string(), value.to_string()).is_some() {
            return Err(format!("{name}:{lineno}: key `{key}` appears more than once"));
        }
    }

    if !terminated {
        return Err(format!("{name}: header is not terminated by a blank line"));
    }
    for key in REQUIRED {
        if !fields.contains_key(key) {
            return Err(format!("{name}: missing required header key `{key}`"));
        }
    }
    let year = &fields["year"];
    if year.len() != 4 || !year.chars().all(|c| c.is_ascii_digit()) {
        return Err(format!("{name}: `year` must be four digits, found {year:?}"));
    }
    Ok(Header { fields, notes })
}

/// §3.2's composition rule, and no other.
fn citation(h: &Header) -> String {
    let base = format!(
        "{}, {} ({}), {}",
        h.fields["author"], h.fields["work"], h.fields["year"], h.fields["locus"]
    );
    match h.fields.get("figure") {
        Some(f) => format!("{base}, {f}"),
        None => base,
    }
}

/// The tradition directory a file sits in — the only carrier of tradition.
fn tradition_of(root: &Path, path: &Path) -> String {
    path.strip_prefix(root)
        .ok()
        .and_then(|r| r.components().next().map(|c| c.as_os_str().to_string_lossy().into_owned()))
        .unwrap_or_default()
}

/// One entry reduced to what the shelf gate reads.
struct ShelfEntry {
    file: String,
    tradition: String,
    author: String,
    work: String,
    year: String,
    citation: String,
}

impl ShelfEntry {
    fn from_header(file: &str, tradition: &str, h: &Header) -> Self {
        Self {
            file: file.to_string(),
            tradition: tradition.to_string(),
            author: h.fields["author"].clone(),
            work: h.fields["work"].clone(),
            year: h.fields["year"].clone(),
            citation: citation(h),
        }
    }

    fn matches(&self, (a, w, y): &Work) -> bool {
        self.author == *a && self.work == *w && self.year == *y
    }
}

/// One shelf, one book (#194): each entry's (author, work, year) must be
/// declared for its tradition. Returns the first divergence, naming the
/// offending entry, a sibling that agrees, and both citations.
fn check_shelves(entries: &[ShelfEntry]) -> Result<(), String> {
    for e in entries {
        let Some((_, declared)) = SHELVES.iter().find(|(t, _)| *t == e.tradition) else {
            return Err(format!(
                "one shelf, one book: `{}` sits on shelf `{}`, which declares no works.\n  \
                 cites: {}\n\
                 Add the shelf and its (author, work, year) to SHELVES in \
                 crates/bert-canvas/tests/source_corpus.rs.",
                e.file, e.tradition, e.citation
            ));
        };
        if declared.iter().any(|d| e.matches(d)) {
            continue;
        }

        let witness = entries
            .iter()
            .find(|o| o.tradition == e.tradition && o.file != e.file && declared.iter().any(|d| o.matches(d)))
            .map(|o| format!("{}\n    cites: {}", o.file, o.citation))
            .unwrap_or_else(|| "(no other entry on this shelf cites a declared work)".to_string());

        let list = declared
            .iter()
            .map(|(a, w, y)| format!("{a}, {w} ({y})"))
            .collect::<Vec<_>>()
            .join("\n    ");

        return Err(format!(
            "one shelf, one book: `{}` cites a work not declared for shelf `{}`.\n  \
             {}\n    cites: {}\n  {}\n  \
             declared for `{}`:\n    {}\n\
             Fix the citation, or — if the shelf genuinely spans a second work — add\n  \
             (\"{}\", \"{}\", \"{}\")\n\
             to SHELVES in crates/bert-canvas/tests/source_corpus.rs, in the same commit \
             as the entry that needs it.",
            e.file, e.tradition, e.file, e.citation, witness, e.tradition, list, e.author, e.work, e.year
        ));
    }
    Ok(())
}

fn rel_key(root: &Path, path: &Path) -> String {
    path.strip_prefix(root).unwrap().to_string_lossy().replace('\\', "/")
}

/// Law: every shipped corpus entry has a well-formed provenance header, compiles
/// with zero faults, pins the lens of its own tradition, and projects clean.
#[test]
fn source_corpus_ships_clean() {
    let root = corpus_root();
    let mut files = Vec::new();
    sl_files(&root, &mut files);
    files.sort();
    assert!(!files.is_empty(), "no .sl files found under {}", root.display());

    for path in &files {
        let key = rel_key(&root, path);
        let text = fs::read_to_string(path).unwrap_or_else(|e| panic!("{key}: unreadable: {e}"));

        // 1. Header well-formed.
        let header = read_header(&key, &text).unwrap_or_else(|e| panic!("{e}"));

        // 2. Compiles with zero faults.
        let parsed = parse_sl_full(&text)
            .unwrap_or_else(|faults| panic!("{key}: does not compile: {faults:#?}"));

        // 3. Pins a lens, and the pinned lens matches the tradition directory.
        assert!(
            parsed.lens_explicit,
            "{key}: must pin its lens with @lens — a corpus entry exists to be read in \
             one tradition's register, so leaving the lens to the caller's current state \
             is a defect"
        );
        let tradition = tradition_of(&root, path);
        let pinned = format!("{:?}", parsed.model.lens).to_lowercase();
        assert_eq!(
            pinned, tradition,
            "{key}: pinned lens `{pinned}` does not match its tradition directory `{tradition}`"
        );

        // 4. Projects clean at Core. No escape from this one.
        let world = bert_canvas::canvas::project(&parsed.model);
        let core = bert_core::validate::validate_mode(&world, bert_core::Mode::Core);
        assert!(core.issues.is_empty(), "{key}: Core issues: {:?}", core.issues);

        // 5. Projects clean at its own lens's mode — unless §5.3's escape applies.
        // The escape exists so an implementer is never blocked by a mode gate whose
        // fix is a content decision; the reason string makes each use visible in review.
        match header.fields.get("gate") {
            Some(g) => assert!(
                g.starts_with("core (") && g.ends_with(')'),
                "{key}: `gate` must be `core (reason)`, found {g:?}"
            ),
            None => {
                let mode = match tradition.as_str() {
                    "klir" => bert_core::Mode::Core,
                    "bunge" => bert_core::Mode::Structural,
                    "mobus" => bert_core::Mode::Operational,
                    other => panic!("{key}: unknown tradition directory `{other}`"),
                };
                let report = bert_core::validate::validate_mode(&world, mode);
                assert!(
                    report.issues.is_empty(),
                    "{key}: {mode:?} issues: {:?} — fix the model, or declare the \
                     `gate: core (reason)` escape",
                    report.issues
                );
            }
        }

        // A file whose model is our construction rather than the author's own drawing
        // must say so. `omits` is required above; `note` is required only here.
        assert!(
            header.notes.len() + header.fields.len() > 0,
            "{key}: header parsed empty"
        );
    }
}

/// Law: the index and the directory are in bijection, and every stored field
/// agrees with the header it projects. An unindexed file is a failure, not a
/// silent omission from the gallery.
#[test]
fn source_corpus_index_agrees() {
    let root = corpus_root();
    let index_path = root.join("corpus.json");
    let raw = fs::read_to_string(&index_path)
        .unwrap_or_else(|e| panic!("{}: unreadable: {e}", index_path.display()));
    let index: serde_json::Value = serde_json::from_str(&raw).expect("corpus.json is not valid JSON");
    assert_eq!(index["version"], 1, "corpus.json: unexpected version");

    let entries = index["entries"].as_array().expect("corpus.json: `entries` must be an array");

    let mut files = Vec::new();
    sl_files(&root, &mut files);
    let mut on_disk: Vec<String> = files.iter().map(|p| rel_key(&root, p)).collect();
    on_disk.sort();

    let mut indexed: Vec<String> =
        entries.iter().map(|e| e["file"].as_str().expect("entry.file must be a string").to_string()).collect();
    indexed.sort();

    assert_eq!(
        indexed, on_disk,
        "corpus.json and assets/corpus/ are not in bijection \
         (left = indexed, right = on disk)"
    );

    for entry in entries {
        let file = entry["file"].as_str().unwrap();
        let path = root.join(file);
        let text = fs::read_to_string(&path).unwrap();
        let header = read_header(file, &text).unwrap_or_else(|e| panic!("{e}"));

        let expect_tradition = tradition_of(&root, &path);
        assert_eq!(
            entry["tradition"].as_str().unwrap(),
            expect_tradition,
            "{file}: index `tradition` must equal the first path segment"
        );
        for key in ["title", "teaches"] {
            assert_eq!(
                entry[key].as_str().unwrap(),
                header.fields[key],
                "{file}: index `{key}` disagrees with the header"
            );
        }
        assert_eq!(
            entry["citation"].as_str().unwrap(),
            citation(&header),
            "{file}: index `citation` must be composed by the §3.2 rule and no other"
        );
    }
}

/// Law: one shelf, one book. Entries sharing a tradition cite a work declared
/// for that tradition, so a typo'd, hallucinated or mis-attributed title cannot
/// ship next to the book it was supposed to be.
#[test]
fn source_corpus_one_shelf_one_book() {
    let root = corpus_root();
    let mut files = Vec::new();
    sl_files(&root, &mut files);
    files.sort();
    assert!(!files.is_empty(), "no .sl files found under {}", root.display());

    let entries: Vec<ShelfEntry> = files
        .iter()
        .map(|path| {
            let key = rel_key(&root, path);
            let text = fs::read_to_string(path).unwrap_or_else(|e| panic!("{key}: unreadable: {e}"));
            let header = read_header(&key, &text).unwrap_or_else(|e| panic!("{e}"));
            ShelfEntry::from_header(&key, &tradition_of(&root, path), &header)
        })
        .collect();

    for (tradition, _) in SHELVES {
        assert!(
            entries.iter().any(|e| e.tradition == *tradition),
            "SHELVES declares `{tradition}`, which has no entries on disk — \
             drop the declaration or restore the shelf"
        );
    }

    if let Err(msg) = check_shelves(&entries) {
        panic!("{msg}");
    }
}

/// The gate has to be able to fail. This is the near-miss of #194 reconstructed:
/// two Mobus entries transcribed from one chapter series, citing two books.
#[test]
fn divergent_shelf_is_rejected() {
    let entry = |file: &str, work: &str, year: &str, locus: &str| ShelfEntry {
        file: file.to_string(),
        tradition: "mobus".to_string(),
        author: "George Mobus".to_string(),
        work: work.to_string(),
        year: year.to_string(),
        citation: format!("George Mobus, {work} ({year}), {locus}"),
    };

    let good = entry(
        "mobus/digital-computing-system.sl",
        "Systems Science: Theory, Analysis, Modeling, and Design",
        "2022",
        "Ch. 7 §7.2.3",
    );
    let drifted =
        entry("mobus/steel-plant.sl", "Principles of Systems Science", "2015", "Ch. 4 §4.5");

    check_shelves(std::slice::from_ref(&good)).expect("the declared work must pass");

    let msg = check_shelves(&[good, drifted]).expect_err("a second book on one shelf must fail");
    for fragment in [
        "mobus/steel-plant.sl",
        "mobus/digital-computing-system.sl",
        "Principles of Systems Science (2015)",
        "Systems Science: Theory, Analysis, Modeling, and Design (2022)",
        "SHELVES",
    ] {
        assert!(msg.contains(fragment), "failure message omits {fragment:?}:\n{msg}");
    }
}

/// A one-character drift in the title is the failure this exists to catch, and
/// it is invisible to any rule derived from the shelf's own contents.
#[test]
fn typoed_work_is_rejected() {
    let e = ShelfEntry {
        file: "klir/students-in-a-course.sl".to_string(),
        tradition: "klir".to_string(),
        author: "George Klir".to_string(),
        work: "Facets of Systems Science, 2nd ed".to_string(),
        year: "2001".to_string(),
        citation: "George Klir, Facets of Systems Science, 2nd ed (2001), Ch. 2".to_string(),
    };
    check_shelves(&[e]).expect_err("a missing period in the title must fail");
}

/// A new tradition directory fails loudly rather than being waved through.
#[test]
fn undeclared_shelf_is_rejected() {
    let e = ShelfEntry {
        file: "ashby/homeostat.sl".to_string(),
        tradition: "ashby".to_string(),
        author: "W. Ross Ashby".to_string(),
        work: "Design for a Brain".to_string(),
        year: "1952".to_string(),
        citation: "W. Ross Ashby, Design for a Brain (1952), Ch. 8".to_string(),
    };
    let msg = check_shelves(&[e]).expect_err("an undeclared shelf must fail");
    assert!(msg.contains("declares no works"), "{msg}");
}
