//! Cross-lens reading of the source corpus (#216).
//!
//! `source_corpus.rs` gates every entry under its **own** pinned lens, which is
//! the right ship gate: a gallery card must open clean in the tradition it
//! advertises. But it means an entry is never read under the other two, and the
//! corpus's whole claim to being the empirical arm of K≅2 is that the lenses
//! have to *agree* — or disagree for a stated reason.
//!
//! The gap this closes: `bunge/coupling-sigma3.sl` exists to demonstrate a
//! refusal. Bunge admits the diagonal, Mobus forbids it (§4.3 requires k ≠ o),
//! so the file is legal Bunge structure and refused Mobus structure. That
//! divergence was asserted in two places that never met — the message in
//! `bert_core::validate::check_self_loops`, and an English `# note:` in the
//! `.sl` file. Under the ship gate the entry validates as Bunge/Structural,
//! where the self-loop check does not run, so nothing ever executed the lesson.
//! Renaming the message or narrowing its mode gate would have left the corpus
//! comment false and the suite green.
//!
//! A refusal that cannot fail a test is not evidence. This binds them.

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

use bert_canvas::canvas::Lens;
use bert_canvas::lenses::{analyze, describe};
use bert_canvas::sl::parse_sl_full;
use bert_core::validate::Severity;

fn corpus_entry(rel: &str) -> String {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../assets/corpus")
        .join(rel);
    fs::read_to_string(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
}

/// Errors raised when `entry` is read under `lens`, message text only.
fn errors_under(rel: &str, lens: Lens) -> Vec<String> {
    let text = corpus_entry(rel);
    let parsed = parse_sl_full(&text).unwrap_or_else(|e| panic!("{rel} did not compile: {e:?}"));
    analyze(&parsed.model, lens)
        .validation
        .issues
        .into_iter()
        .filter(|i| i.severity == Severity::Error)
        .map(|i| i.message)
        .collect()
}

/// Law: σ₃ is legal Bunge and refused Mobus, and the refusal names its reason.
///
/// This is the corpus's one documented divergence between two traditions over
/// the same kernel object. Both halves are asserted: the refusal must fire
/// under Mobus, and it must NOT fire under the lens the entry is pinned to —
/// a check that only ever went red would prove the model broken, not the
/// traditions different.
#[test]
fn sigma3_is_legal_bunge_and_refused_mobus() {
    const ENTRY: &str = "bunge/coupling-sigma3.sl";

    let bunge = errors_under(ENTRY, Lens::Bunge);
    assert!(
        bunge.is_empty(),
        "{ENTRY} must be legal under its own lens; got errors: {bunge:#?}"
    );

    let mobus = errors_under(ENTRY, Lens::Mobus);
    assert!(
        !mobus.is_empty(),
        "{ENTRY} must be REFUSED under Mobus — its `# note:` says so, and the \
         refusal is the lesson. An empty verdict here means either the self-loop \
         check stopped running under Operational, or the entry lost its self-actions."
    );
    assert!(
        mobus.iter().any(|m| m.contains("self-dependency")
            && m.contains("k ≠ o")
            && m.contains("§4.3")),
        "the Mobus refusal must still name Mobus §4.3 and the k ≠ o precondition, \
         since that citation is what makes it a tradition's rule rather than our \
         preference; got: {mobus:#?}"
    );
}

/// Law: the σ₃ refusal is caused by the self-action, not by the shape it sits in.
///
/// σ₁ and σ₂ are the same author, the same figure family, and the same three
/// components; σ₃ differs by admitting the diagonal. If the siblings also
/// refused under Mobus, the first test would be measuring the coupling-graph
/// form rather than self-action, and the entry would teach nothing specific.
/// This is the separating instance for that reading.
#[test]
fn sigma3_siblings_travel_to_mobus() {
    for sibling in ["bunge/coupling-sigma1.sl", "bunge/coupling-sigma2.sl"] {
        let mobus = errors_under(sibling, Lens::Mobus);
        assert!(
            mobus.is_empty(),
            "{sibling} carries no self-action, so it must travel to Mobus. \
             Errors here mean the σ₃ refusal is not isolating self-dependency: {mobus:#?}"
        );
    }
}

// ── The `set:` gate ────────────────────────────────────────────────────────────
//
// # EXPECTED TO FAIL until the goal-oriented entries assert `@directed` (plan Wave 5)

/// Every `.sl` under `assets/corpus`, recursively.
fn corpus_files(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    let mut paths: Vec<_> = entries.filter_map(|e| e.ok()).map(|e| e.path()).collect();
    paths.sort();
    for p in paths {
        if p.is_dir() {
            corpus_files(&p, out);
        } else if p.extension().and_then(|e| e.to_str()) == Some("sl") {
            out.push(p);
        }
    }
}

/// The `# set:` value from a provenance header, if the entry declares one.
fn declared_set(text: &str) -> Option<String> {
    text.lines()
        .take_while(|l| l.starts_with('#') || l.trim().is_empty())
        .find_map(|l| l.strip_prefix("# set:").map(|v| v.trim().to_string()))
}

/// Law: entries sharing a `set:` must be distinguishable under their pinned lens.
///
/// The corpus README states the purpose of a set: "a reader should be able to open
/// them side by side and see that the *only* thing that changed is the structure"
/// (one composition, several structures). If two members return the same
/// `describe()`, then under the lens the entry advertises they are the same object,
/// and the second file is volume rather than evidence — the exact failure the README
/// names when it says the corpus can stop probing and start confirming the tool to
/// itself.
///
/// It fails today on **two** sets, both for the same reason, and the second was found
/// by this gate rather than by the audit that motivated it:
///
/// - Klir's **goal-oriented paradigms**: `feedback` and `feedforward` differ only in
///   the direction of one relation. Fig. 10.1 is an arrowed block diagram about who
///   may read what, so the direction is Klir's commitment.
/// - Bunge's **two-thing structures**: `two-thing-ab` and `two-thing-ba` are "1 acts
///   on 2" and "2 acts on 1". Bunge's Def 1.2 example gives *three* conceivable
///   internal structures; undirected, our encoding collapses them to two, so the set
///   silently teaches a weaker claim than the one it cites.
///
/// In both cases neither entry asserts `@directed`, and undirected the graphs are
/// isomorphic. The defect is a missing observer commitment, not a bad lesson. Fix by
/// asserting `@directed`, which makes the members distinct and this gate green. Do NOT
/// fix by deleting a member or by comparing something weaker — the second finding here
/// is exactly what a weaker comparison would have hidden.
#[test]
fn entries_sharing_a_set_are_distinguishable() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../assets/corpus");
    let mut files = Vec::new();
    corpus_files(&root, &mut files);

    // set name -> (rendered description under the pinned lens) -> [entry names]
    let mut sets: BTreeMap<String, BTreeMap<String, Vec<String>>> = BTreeMap::new();

    for path in &files {
        let text = match fs::read_to_string(path) {
            Ok(t) => t,
            Err(e) => panic!("{}: {e}", path.display()),
        };
        let Some(set) = declared_set(&text) else { continue };
        let parsed = parse_sl_full(&text)
            .unwrap_or_else(|e| panic!("{} did not compile: {e:?}", path.display()));
        let rendered = serde_json::to_string(&describe(&parsed.model, parsed.model.lens))
            .expect("LensDescription serializes");
        let name = path
            .strip_prefix(&root)
            .unwrap_or(path)
            .display()
            .to_string();
        sets.entry(set)
            .or_default()
            .entry(rendered)
            .or_default()
            .push(name);
    }

    let collisions: Vec<String> = sets
        .iter()
        .flat_map(|(set, by_desc)| {
            by_desc
                .values()
                .filter(|members| members.len() > 1)
                .map(move |members| format!("  set {set:?}: {members:?} are indistinguishable"))
        })
        .collect();

    assert!(
        collisions.is_empty(),
        "entries sharing a `set:` returned identical describe() output under their \
         pinned lens:\n{}\n\n  A set exists so a reader can see that the ONLY thing \
         that changed is the structure (corpus README). Members the instrument cannot \
         tell apart are volume, not evidence. Fix the encoding — for the goal-oriented \
         paradigms that means asserting `@directed`, since Klir's Fig. 10.1 is an \
         arrowed diagram and the direction is his commitment, not ours. Do not fix \
         this by deleting a member or by comparing something weaker.",
        collisions.join("\n")
    );
}
