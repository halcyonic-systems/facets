//! The weak check, over every bundled model — it parses, and the door does not
//! crash on it. Shape only; no snapshot of content.
//!
//! The full golden covers the canonical few (`canonical_golden.rs`). This
//! covers the rest, and covers them in the one way that survives the library
//! consolidation (#318): a model here can be renamed, merged, repaired or
//! archived without re-blessing anything, because nothing here records what any
//! model *says*. What it records is that the binary answered — a code from the
//! documented table and JSON on stdout — rather than panicking, hanging on a
//! `None` exit status, or printing a banner into the machine channel.
//!
//! It still **surfaces** what it will not assert. A `bitcoin`-shaped finding —
//! a model refused under the lens it is pinned to (#316) — is printed as part
//! of the survey, so a human looking at the test output sees it. Printed, not
//! asserted: freezing "this model is refused" as expected behaviour is what
//! turned the old golden into a re-bless treadmill, and it would also make the
//! repair of a refusal look like a regression.

mod support;

use std::io::Write;

use support::{bert, library, repo_root, stdout_json};

/// Which exit codes each subcommand is allowed to answer with.
///
/// From the door's own table (`bert-cli/src/main.rs`, `mod exit`): `0` ok · `1`
/// internal · `2` usage · `3` the input did not compile · `4` the kernel
/// refused. A **bundled** model is one we ship, so `3` is out of contract for
/// every subcommand — it would mean a file in `assets/` no longer compiles. `4`
/// is a verdict, and only `verdict` and `run` can reach one.
fn allowed(command: &str) -> &'static [i32] {
    match command {
        "verdict" | "run" => &[0, 4],
        _ => &[0],
    }
}

/// The weak check itself, as a function of what the process actually did, so it
/// can be handed a crash without having to arrange one.
///
/// Deliberately says nothing about content. `stdout` is required to *parse*,
/// not to hold any particular value.
fn within_contract(command: &str, code: Option<i32>, stdout: &str) -> Result<(), String> {
    let Some(code) = code else {
        return Err(format!(
            "`bert {command}` was signalled rather than exiting; a door that \
             dies on a bundled model has no exit code to branch on"
        ));
    };
    let allowed = allowed(command);
    if !allowed.contains(&code) {
        return Err(format!(
            "`bert {command}` exited {code}; a bundled model may only produce \
             {allowed:?} (1 is internal, 2 is bad arguments, 3 means the file \
             stopped compiling)"
        ));
    }
    match serde_json::from_str::<serde_json::Value>(stdout) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!(
            "`bert {command}` did not put JSON on stdout ({e}); stdout carries \
             the machine answer and nothing else. Got:\n{stdout}"
        )),
    }
}

/// Run one subcommand against one model and check only its shape.
fn probe(command: &str, args: &[&str]) -> Result<(i32, serde_json::Value), String> {
    let out = bert(args);
    let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
    within_contract(command, out.status.code(), &stdout)?;
    let code = out.status.code().expect("checked above");
    let answer = serde_json::from_str(&stdout).expect("checked above");
    Ok((code, answer))
}

#[test]
fn every_bundled_model_parses_and_the_door_answers() {
    let models = library();
    let mut refused_under_own_lens: Vec<String> = Vec::new();
    let mut without_a_run: usize = 0;
    let mut failures: Vec<String> = Vec::new();

    for path in &models {
        let compiled = match probe("compile", &["compile", path]) {
            Ok((_, model)) => model,
            Err(e) => {
                failures.push(format!("{path}: {e}"));
                continue;
            }
        };
        let pin = compiled["lens"].as_str().unwrap_or("?").to_string();

        let mut record = |result: Result<(i32, serde_json::Value), String>| match result {
            Ok(pair) => Some(pair),
            Err(e) => {
                failures.push(format!("{path}: {e}"));
                None
            }
        };

        record(probe("describe", &["describe", path]));
        record(probe("layout", &["layout", path]));

        // Under the model's own pinned lens — the reading it claims for itself.
        // Recorded, never asserted.
        if let Some((code, _)) = record(probe("verdict", &["verdict", path])) {
            if code == 4 {
                refused_under_own_lens.push(format!("{path:<50} {pin}"));
            }
        }
        for lens in ["klir", "bunge", "mobus"] {
            record(probe("verdict", &["verdict", path, "--lens", lens]));
        }
        if let Some((code, _)) = record(probe("run", &["run", path, "--t", "4"])) {
            if code == 4 {
                without_a_run += 1;
            }
        }
    }

    survey_report(models.len(), &refused_under_own_lens, without_a_run);

    assert!(
        failures.is_empty(),
        "the door went out of contract on {} of {} bundled models:\n  {}",
        failures.len(),
        models.len(),
        failures.join("\n  ")
    );
}

/// Print the survey where a person will see it.
///
/// Written straight to the process's stderr rather than through `eprintln!`,
/// because libtest captures the macros and a report only visible on failure is
/// not a report — the whole point is that a refusal is visible on a **green**
/// run, the way `bitcoin`'s was found.
fn survey_report(total: usize, refused: &[String], without_a_run: usize) {
    let mut out = std::io::stderr().lock();
    let _ = writeln!(
        out,
        "\n[cli survey] {total} bundled models · {} refused under their own lens \
         · {without_a_run} with no run",
        refused.len()
    );
    for line in refused {
        let _ = writeln!(out, "  refused: {line}");
    }
    let _ = writeln!(
        out,
        "  (observed, not asserted — see #317. A refusal here is a finding to \
         look at, not expected behaviour.)\n"
    );
}

/// The separating instances. A check every input passes is not checking
/// anything (CLAUDE.md, "the standard a new check has to meet"), and the weak
/// check is the one most at risk of being vacuous, so it gets four ways to come
/// out the other way — two synthetic, two through the real binary.
#[test]
fn the_weak_check_catches_a_crash_and_a_broken_answer() {
    assert!(
        within_contract("verdict", Some(1), "{}").is_err(),
        "an internal error (1) is out of contract"
    );
    assert!(
        within_contract("verdict", Some(101), "").is_err(),
        "a Rust panic (101) is out of contract — this is the crash the check exists for"
    );
    assert!(
        within_contract("verdict", None, "{}").is_err(),
        "a signalled process has no exit code and must not pass"
    );
    assert!(
        within_contract("compile", Some(0), "compiled 4 things\n{}").is_err(),
        "a banner ahead of the JSON breaks the stdout contract"
    );
    assert!(
        within_contract("run", Some(4), "{\"refused\":\"no step\"}").is_ok(),
        "a refusal IS an answer; the weak check must not read one as a fault"
    );

    // Through the real binary, so the contract is checked against the process
    // and not only against my idea of it.
    let bad_args = bert(&[
        "verdict",
        "assets/examples/watershed.sl",
        "--lens",
        "phlogiston",
    ]);
    assert_eq!(
        bad_args.status.code(),
        Some(2),
        "clap rejects an unknown lens with the usage code"
    );
    assert!(
        within_contract(
            "verdict",
            bad_args.status.code(),
            &String::from_utf8_lossy(&bad_args.stdout)
        )
        .is_err(),
        "the survey would fail if it ever asked the door a question it cannot answer"
    );

    let dir = std::env::temp_dir().join("bert-cli-survey");
    std::fs::create_dir_all(&dir).expect("scratch dir");
    let broken = dir.join("not-a-model.sl");
    std::fs::write(&broken, "component A\nflwo A -> B\n").expect("write scratch SL");
    let path = broken.to_str().expect("utf-8 path");
    let out = bert(&["compile", path]);
    assert_eq!(
        out.status.code(),
        Some(3),
        "SL that does not compile exits 3"
    );
    assert!(
        within_contract(
            "compile",
            out.status.code(),
            &String::from_utf8_lossy(&out.stdout)
        )
        .is_err(),
        "a bundled model that stopped compiling is exactly what the survey is \
         watching for — this is the failing half of `it parses`"
    );

    // And the passing half, so the two halves are the same check.
    let clean = bert(&["compile", "assets/examples/watershed.sl"]);
    assert!(
        within_contract(
            "compile",
            clean.status.code(),
            &String::from_utf8_lossy(&clean.stdout)
        )
        .is_ok(),
        "a bundled model passes the same check the broken one fails"
    );
    assert!(repo_root().join("assets/examples").is_dir());
    stdout_json(&clean);
}
