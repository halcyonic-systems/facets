//! Running the real binary. Every test in this crate goes through
//! `CARGO_BIN_EXE_bert` rather than calling the library directly — a door that
//! is only ever tested by opening the wall behind it is not tested.

#![allow(dead_code)]

use std::path::PathBuf;
use std::process::{Command, Output};

/// The repository root, from this crate's manifest.
pub fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .expect("the repo root resolves")
}

/// Run `bert` with `args`, from the repo root so relative paths in a failure
/// message read the way a person would type them.
pub fn bert(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_bert"))
        .args(args)
        .current_dir(repo_root())
        .output()
        .expect("the bert binary runs")
}

/// The exit code, refusing to guess when the process was signalled.
pub fn code(out: &Output) -> i32 {
    out.status.code().expect("bert exits rather than signalling")
}

/// stdout parsed as JSON. Fails loudly with the raw text, because "stdout is
/// JSON and only JSON" is the contract a pipeline depends on.
pub fn stdout_json(out: &Output) -> serde_json::Value {
    let text = String::from_utf8_lossy(&out.stdout);
    serde_json::from_str(&text).unwrap_or_else(|e| {
        panic!(
            "stdout is not JSON ({e}); stdout must carry the machine answer and \
             nothing else. Got:\n{text}"
        )
    })
}

pub fn stderr(out: &Output) -> String {
    String::from_utf8_lossy(&out.stderr).into_owned()
}

/// Every bundled `.sl` the CLI is pointed at — `assets/examples` plus the
/// author corpus — as repo-root-relative slash paths, sorted.
///
/// This is the *library*, not the golden set. The golden speaks for a named few
/// (`canonical_golden.rs`, `CANONICAL`); everything bundled gets the weak check
/// instead (`library_survey.rs`), so a rename or an edit under these
/// directories forces no re-bless. Discovered from disk rather than listed,
/// because a model added and never checked is the failure mode a list has.
pub fn library() -> Vec<String> {
    let root = repo_root();
    let mut paths: Vec<String> = ["assets/examples", "assets/corpus"]
        .iter()
        .flat_map(|dir| sl_under(dir))
        .map(|p| {
            p.strip_prefix(&root)
                .expect("a path under the repo root")
                .to_string_lossy()
                .replace('\\', "/")
        })
        .collect();
    paths.sort();
    assert!(
        paths.len() > 10,
        "the bundled library is more than a handful of files; found {}",
        paths.len()
    );
    paths
}

/// Every `.sl` at or below `rel`, sorted.
fn sl_under(rel: &str) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let mut stack = vec![repo_root().join(rel)];
    while let Some(dir) = stack.pop() {
        let entries = std::fs::read_dir(&dir).unwrap_or_else(|e| panic!("{}: {e}", dir.display()));
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.extension().and_then(|x| x.to_str()) == Some("sl") {
                paths.push(path);
            }
        }
    }
    paths.sort();
    paths
}
