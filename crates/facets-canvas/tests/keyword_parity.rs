//! The grammar/parser keyword-parity gate (#154's lesson).
//!
//! `scale`, `states`, and `kind` shipped in the parser on 2026-07-24 and the
//! normative spec learned about them a week later — a LIVE document quietly
//! describing a smaller language than the one implemented. Nothing broke,
//! which is exactly the failure: drift between §4's EBNF and `sl.rs` is
//! invisible until a reader trusts the wrong side.
//!
//! This test reads the spec's own EBNF block and holds its lowercase quoted
//! terminals equal to the parser's declared keyword set — `RESERVED_WORDS`
//! (the quoting set) plus `POSITIONAL_KEYWORDS` (the words `is_reserved`
//! deliberately omits because no name slot can reach them). A keyword added
//! to either side without the other is a red test, in both directions.
//!
//! If this fails: extend §3/§4 of the spec, or extend the two lists in
//! `sl.rs` — never loosen the extraction.

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;

use bert_canvas::sl::{POSITIONAL_KEYWORDS, RESERVED_WORDS};

fn spec_text() -> String {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../docs/language/spec.md");
    fs::read_to_string(&path).unwrap_or_else(|e| panic!("cannot read {}: {e}", path.display()))
}

/// The fenced ```ebnf block of §4 — the normative grammar.
fn ebnf_block(spec: &str) -> &str {
    let start = spec.find("```ebnf").expect("spec.md must carry the §4 ```ebnf block");
    let body = &spec[start + "```ebnf".len()..];
    let end = body.find("```").expect("the ```ebnf block must be closed");
    &body[..end]
}

/// Every all-lowercase alphabetic terminal the EBNF quotes. Value words
/// (`Nominal`, `Combining`, …) are capitalized and fall out; punctuation
/// terminals (`"->"`, `"{"`, `"@pos"`) are not alphabetic runs and fall out.
fn ebnf_keywords(block: &str) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    let bytes = block.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'"' {
            if let Some(len) = bytes[i + 1..].iter().position(|&b| b == b'"') {
                let inner = &block[i + 1..i + 1 + len];
                if !inner.is_empty() && inner.bytes().all(|b| b.is_ascii_lowercase()) {
                    out.insert(inner.to_string());
                }
                i += len + 2;
                continue;
            }
        }
        i += 1;
    }
    out
}

#[test]
fn the_spec_ebnf_and_the_parser_agree_on_the_keyword_set() {
    let spec = spec_text();
    let documented = ebnf_keywords(ebnf_block(&spec));
    let implemented: BTreeSet<String> = RESERVED_WORDS
        .iter()
        .chain(POSITIONAL_KEYWORDS)
        .map(|w| w.to_string())
        .collect();

    let undocumented: Vec<_> = implemented.difference(&documented).collect();
    let unimplemented: Vec<_> = documented.difference(&implemented).collect();
    assert!(
        undocumented.is_empty() && unimplemented.is_empty(),
        "grammar/parser keyword drift — in the parser's lists but not §4's EBNF: \
         {undocumented:?}; in §4's EBNF but in neither parser list: {unimplemented:?}"
    );
}

#[test]
fn every_reserved_word_appears_in_the_lexicon_section() {
    // §3 claims completeness ("There are no other words"), so at minimum every
    // word the serializer quotes against must be discussed there. The
    // position-bound words are exempt only because §3 does not yet carry rows
    // for the §4.5 param family — the EBNF gate above still covers them.
    let spec = spec_text();
    let start = spec.find("## 3. Lexicon").expect("spec.md must carry §3");
    let end = spec.find("## 4. Grammar").expect("spec.md must carry §4");
    let lexicon = &spec[start..end];
    let missing: Vec<_> = RESERVED_WORDS.iter().filter(|w| !lexicon.contains(**w)).collect();
    assert!(
        missing.is_empty(),
        "reserved words absent from the §3 lexicon section: {missing:?}"
    );
}
