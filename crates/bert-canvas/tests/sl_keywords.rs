//! The SL keyword classes as a two-sided contract fixture.
//!
//! `fixtures/contract/sl_keywords.json` is written from the kernel's own
//! consts (`RESERVED_WORDS`, `POSITIONAL_KEYWORDS`, the value-word consts) —
//! never hand-copied — and consumed by every tool that classifies SL tokens
//! outside the kernel: the CodeMirror mode's vitest and the TextMate grammar
//! checker both assert their vocabularies equal this file, both directions.
//! Same write-or-assert mechanism as `contract.rs`.
//!
//! Regenerate after an intentional vocabulary change:
//!   BLESS_FIXTURES=1 cargo test -p bert-canvas --test sl_keywords

use bert_canvas::sl::{
    KIND_WORDS, KINGDOM_WORDS, POSITIONAL_KEYWORDS, PRIMITIVE_WORDS, RESERVED_WORDS, SCALE_WORDS,
};

fn check_fixture<T: serde::Serialize>(name: &str, value: &T) {
    let dir = concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/contract");
    let path = format!("{dir}/{name}.json");
    let actual = serde_json::to_string_pretty(value).expect("serialize fixture");
    if std::env::var_os("BLESS_FIXTURES").is_some() {
        std::fs::create_dir_all(dir).expect("create fixture dir");
        std::fs::write(&path, format!("{actual}\n")).expect("write fixture");
        return;
    }
    let expected = std::fs::read_to_string(&path)
        .unwrap_or_else(|_| panic!("missing fixture {path}; run with BLESS_FIXTURES=1 to create"));
    assert_eq!(
        actual,
        expected.trim_end_matches('\n'),
        "keyword↔fixture drift for {name}: the SL vocabulary changed. If intended, \
         regenerate with BLESS_FIXTURES=1 and re-run the web and grammar checks."
    );
}

#[test]
fn sl_keywords_fixture() {
    let value = serde_json::json!({
        "reserved": RESERVED_WORDS,
        "positional": POSITIONAL_KEYWORDS,
        "value_words": {
            "kingdom": KINGDOM_WORDS,
            "primitive": PRIMITIVE_WORDS,
            "scale": SCALE_WORDS,
            "kind": KIND_WORDS,
        },
        "annotations": ["@lens", "@pos", "@directed"],
    });
    check_fixture("sl_keywords", &value);
}
