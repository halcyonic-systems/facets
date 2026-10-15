//! The `bert` alias (#541 phase 4): the old name runs the same program.
//!
//! Scripts and goldens parse stdout and branch on the exit code, so the alias
//! may differ from `facets` in exactly one place: a single line on stderr,
//! first, naming the new program and the day the alias retires. Each case below
//! runs both binaries on the same input and compares all three streams.
//!
//! Separating instance: an alias that prints its note on stdout, changes an
//! exit code, or prints nothing goes red here, and so does a `facets` that
//! starts printing the note.

mod support;

use std::io::Write;
use std::process::{Command, Output, Stdio};

use support::{code, repo_root};

const NOTE: &str = "bert: renamed to facets; this alias retires 2027-01-11\n";
const MARKET: &str = "assets/examples/llm-market.sl";
const SIGMA3: &str = "assets/corpus/bunge/coupling-sigma3.sl";

fn run(exe: &str, args: &[&str], stdin: Option<&str>) -> Output {
    let mut child = Command::new(exe)
        .args(args)
        .current_dir(repo_root())
        .stdin(if stdin.is_some() { Stdio::piped() } else { Stdio::null() })
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap_or_else(|e| panic!("{exe} runs: {e}"));
    if let Some(text) = stdin {
        child
            .stdin
            .take()
            .expect("stdin is piped")
            .write_all(text.as_bytes())
            .expect("write to stdin");
    }
    child.wait_with_output().unwrap_or_else(|e| panic!("{exe} finishes: {e}"))
}

/// Run both names on the same input and hold them to the contract. Returns the
/// exit code so a case can say which kind of answer it meant to exercise.
fn same_answer(args: &[&str], stdin: Option<&str>) -> i32 {
    let new = run(env!("CARGO_BIN_EXE_facets"), args, stdin);
    let old = run(env!("CARGO_BIN_EXE_bert"), args, stdin);
    let what = args.join(" ");

    assert_eq!(code(&old), code(&new), "`{what}`: the alias changed the exit code");
    assert!(
        old.stdout == new.stdout,
        "`{what}`: the alias changed stdout\nfacets: {}\nbert:   {}",
        String::from_utf8_lossy(&new.stdout),
        String::from_utf8_lossy(&old.stdout)
    );

    let new_err = String::from_utf8_lossy(&new.stderr);
    let old_err = String::from_utf8_lossy(&old.stderr);
    assert!(!new_err.contains("renamed to facets"), "`{what}`: facets printed the alias note:\n{new_err}");
    assert_eq!(
        old_err.strip_prefix(NOTE),
        Some(new_err.as_ref()),
        "`{what}`: the alias's stderr must be the note, then exactly what facets said"
    );
    assert_eq!(old_err.matches("renamed to facets").count(), 1, "`{what}`: the note is one line");
    code(&new)
}

#[test]
fn the_alias_answers_like_facets() {
    assert_eq!(same_answer(&["compile", MARKET], None), 0);
    assert_eq!(same_answer(&["verdict", MARKET, "--lens", "mobus"], None), 0);
    assert_eq!(same_answer(&["describe", MARKET, "--lens", "klir"], None), 0);
    assert_eq!(same_answer(&["run", MARKET, "--t", "4"], None), 0);
    assert_eq!(same_answer(&["layout", MARKET], None), 0);
    assert_eq!(same_answer(&["--version"], None), 0);
    assert_eq!(same_answer(&["--help"], None), 0);
}

#[test]
fn the_alias_fails_like_facets() {
    assert_eq!(same_answer(&["verdict", SIGMA3, "--lens", "mobus"], None), 4);
    assert_eq!(same_answer(&["verdict", "assets/examples/no-such-file.sl"], None), 3);
    assert_eq!(same_answer(&["compile", "-"], Some("system S {\n  flwo\n}\n")), 3);
    assert_eq!(same_answer(&["verdict", MARKET, "--lens", "nope"], None), 2);
    assert_eq!(same_answer(&["nonesuch"], None), 2);
}

#[test]
fn the_alias_reads_stdin_like_facets() {
    let sl = std::fs::read_to_string(repo_root().join(MARKET)).expect("read the example");
    assert_eq!(same_answer(&["compile", "-"], Some(&sl)), 0);
}
