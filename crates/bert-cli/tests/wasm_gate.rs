//! The wasm gate's exclusion, executed.
//!
//! `cargo build --workspace --target wasm32-unknown-unknown` is a hard invariant
//! (CLAUDE.md, and a CI step). This crate is a native binary — an argument
//! parser and a filesystem — so it is excluded from that build. The exclusion is
//! correct and it is also the exact thing that rots: the next crate that will
//! not compile to wasm is one word away from joining the list, and "the wasm
//! gate now skips things" would arrive as a diff nobody read.
//!
//! So the exclusion is not a comment, it is a check. Both places that run the
//! workspace wasm build must exclude `bert-cli` and NOTHING else, and every
//! other workspace member must still be inside the gate.
//!
//! Separating instance: add a second `--exclude`, or drop the one that is
//! there, and this goes red naming the crate.

mod support;

use std::collections::BTreeSet;

use support::repo_root;

/// The one package allowed out of the workspace wasm build, and why.
const EXCLUDED: &str = "bert-cli";

/// Every place the workspace-wide wasm build is invoked. If a third appears, it
/// belongs here — an unlisted invocation is an ungated one.
const INVOCATIONS: [&str; 2] = ["justfile", ".github/workflows/ci.yml"];

/// The `--exclude` arguments on the line that runs the workspace wasm build.
fn exclusions(file: &str) -> BTreeSet<String> {
    let text = std::fs::read_to_string(repo_root().join(file))
        .unwrap_or_else(|e| panic!("{file}: {e}"));
    let line = text
        .lines()
        .map(str::trim)
        .find(|l| {
            l.contains("cargo build")
                && l.contains("--workspace")
                && l.contains("--target wasm32-unknown-unknown")
        })
        .unwrap_or_else(|| {
            panic!(
                "{file} no longer runs `cargo build --workspace --target \
                 wasm32-unknown-unknown`. That build IS the gate; if it moved, \
                 move this check with it rather than deleting either."
            )
        });

    let mut found = BTreeSet::new();
    let mut words = line.split_whitespace();
    while let Some(word) = words.next() {
        if word == "--exclude" {
            found.insert(
                words
                    .next()
                    .unwrap_or_else(|| panic!("{file}: `--exclude` with no package after it"))
                    .to_string(),
            );
        } else if let Some(pkg) = word.strip_prefix("--exclude=") {
            found.insert(pkg.to_string());
        }
    }
    found
}

/// Law: exactly one package is outside the wasm gate, and it is this one.
#[test]
fn the_wasm_gate_excludes_this_crate_and_nothing_else() {
    for file in INVOCATIONS {
        let found = exclusions(file);
        let expected: BTreeSet<String> = [EXCLUDED.to_string()].into_iter().collect();
        assert_eq!(
            found, expected,
            "{file} excludes {found:?} from the workspace wasm build, but the \
             only package allowed out is {EXCLUDED:?} (a native binary: argv and \
             the filesystem). Adding a crate here removes it from the browser \
             build that is this repo's whole delivery target — if a kernel crate \
             genuinely cannot compile to wasm, that is a finding to fix, not a \
             word to add to this line."
        );
    }
}

/// Law: every other workspace member is still inside the gate.
///
/// The check above pins the exclusion list; this one pins what the list is
/// measured against. Without it, deleting a crate from `crates/` and adding a
/// wasm-hostile one under another path would leave both sides agreeing about
/// nothing.
#[test]
fn every_kernel_crate_is_still_covered() {
    let crates_dir = repo_root().join("crates");
    let members: BTreeSet<String> = std::fs::read_dir(&crates_dir)
        .unwrap_or_else(|e| panic!("{}: {e}", crates_dir.display()))
        .filter_map(|e| e.ok())
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|name| crates_dir.join(name).join("Cargo.toml").is_file())
        .collect();

    assert!(
        members.contains(EXCLUDED),
        "the excluded package must be a real workspace member; got {members:?}"
    );
    let covered: Vec<&String> = members.iter().filter(|m| *m != EXCLUDED).collect();
    assert!(
        covered.len() >= 5,
        "the wasm gate covers the five vendored kernel crates at minimum; it \
         currently covers {covered:?}. A drop here means a crate left the \
         workspace, which is a bigger change than this test can approve."
    );
}
