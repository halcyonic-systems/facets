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

/// Every `.sl` under `assets/examples`, sorted — the set the goldens cover.
pub fn examples() -> Vec<PathBuf> {
    let dir = repo_root().join("assets/examples");
    let mut paths: Vec<PathBuf> = std::fs::read_dir(&dir)
        .unwrap_or_else(|e| panic!("{}: {e}", dir.display()))
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().and_then(|x| x.to_str()) == Some("sl"))
        .collect();
    paths.sort();
    assert!(!paths.is_empty(), "assets/examples holds .sl files");
    paths
}
