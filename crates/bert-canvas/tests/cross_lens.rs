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

use std::fs;
use std::path::PathBuf;

use bert_canvas::canvas::Lens;
use bert_canvas::lenses::analyze;
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
