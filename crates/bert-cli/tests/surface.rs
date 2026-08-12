//! The door's contract: what comes out of stdout, what goes to stderr, and what
//! the exit code means.
//!
//! These are the properties a shell one-liner is allowed to rely on. Each test
//! carries its separating instance — an input that makes it come out the OTHER
//! way — because a check every input passes is not checking anything (CLAUDE.md,
//! "the standard a new check has to meet").

mod support;

use support::{bert, code, stderr, stdout_json};

const CLEAN: &str = "assets/examples/watershed.sl";
/// σ₃ is the corpus's one documented divergence: legal Bunge structure, refused
/// Mobus structure. It is the separating instance for the whole `--lens` flag.
const SIGMA3: &str = "assets/corpus/bunge/coupling-sigma3.sl";

#[test]
fn every_subcommand_answers_in_json_on_stdout() {
    for args in [
        vec!["compile", CLEAN],
        vec!["verdict", CLEAN],
        vec!["describe", CLEAN],
        vec!["run", CLEAN, "--t", "4"],
        vec!["layout", CLEAN],
    ] {
        let out = bert(&args);
        assert_eq!(code(&out), 0, "`bert {}` succeeds", args.join(" "));
        stdout_json(&out);
        assert!(
            stderr(&out).is_empty(),
            "`bert {}` said something on stderr on a clean run; stderr is for \
             problems, so a quiet success is what lets a script treat any stderr \
             output as a signal. Got: {}",
            args.join(" "),
            stderr(&out)
        );
    }
}

/// Law: the exit code distinguishes a typo from a refusal.
///
/// This is the split the table exists for. A file that did not compile (3) and a
/// file that compiled into something the kernel refuses (4) are different
/// findings, and collapsing them would leave a CI check unable to tell "the
/// author mistyped a keyword" from "this is not a system".
#[test]
fn a_parse_fault_and_a_kernel_refusal_have_different_codes() {
    let dir = std::env::temp_dir().join("bert-cli-surface");
    std::fs::create_dir_all(&dir).expect("scratch dir");
    let bad = dir.join("typo.sl");
    std::fs::write(&bad, "component A\nflwo A -> B\n").expect("write scratch SL");

    let fault = bert(&["compile", bad.to_str().expect("utf-8 path")]);
    assert_eq!(
        code(&fault),
        3,
        "SL that does not compile exits 3 (the input's fault)"
    );
    let faults = stdout_json(&fault);
    assert_eq!(
        faults["errors"][0]["line"], 2,
        "the fault is anchored to the line that carries it; stdout: {}",
        String::from_utf8_lossy(&fault.stdout)
    );
    assert!(
        stderr(&fault).contains("typo.sl:2:"),
        "and stderr carries `path:line:` so an editor and a grep both find it. \
         Got: {}",
        stderr(&fault)
    );

    // The separating instance: this file compiles perfectly. Only the kernel
    // objects, and it objects at a different code.
    let refusal = bert(&["verdict", SIGMA3, "--lens", "mobus"]);
    assert_eq!(
        code(&refusal),
        4,
        "a model that COMPILES and is then refused exits 4, not 3"
    );
    assert!(
        !stdout_json(&refusal)["validation"]["issues"]
            .as_array()
            .expect("issues is an array")
            .is_empty(),
        "and the refusal is on stdout as the kernel's own issues, not as prose"
    );
}

/// Law: `--lens` reads the model under a lens it is not pinned to.
///
/// `lenses::analyze` takes the lens explicitly and ignores `model.lens`. That is
/// the CLI's most valuable single feature, and σ₃ is what proves it is wired:
/// the same bytes pass under Bunge and are refused under Mobus, so the flag
/// cannot be silently ignored without this going red.
#[test]
fn the_lens_flag_reaches_past_the_models_own_pin() {
    let pinned = bert(&["verdict", SIGMA3]);
    assert_eq!(
        code(&pinned),
        0,
        "σ₃ is legal under the lens it pins (Bunge); stderr: {}",
        stderr(&pinned)
    );

    let bunge = bert(&["verdict", SIGMA3, "--lens", "bunge"]);
    assert_eq!(code(&bunge), 0, "and asking for that lens explicitly agrees");

    let mobus = bert(&["verdict", SIGMA3, "--lens", "mobus"]);
    assert_eq!(
        code(&mobus),
        4,
        "the same bytes are refused under Mobus — if `--lens` were dropped on \
         the floor this would be 0 and the flag would be decorative"
    );
    assert!(
        stderr(&mobus).contains("§4.3"),
        "and the refusal still names the tradition's own rule, not our \
         preference. Got: {}",
        stderr(&mobus)
    );

    // The lens that produced the answer is on stdout too, so a pipeline never
    // has to remember which flag it passed.
    assert_eq!(stdout_json(&mobus)["description"]["lens"], "Mobus");
    assert_eq!(stdout_json(&bunge)["description"]["lens"], "Bunge");
}

/// Law: `describe` answers under the asked-for lens, whichever the model pins.
#[test]
fn describe_typesets_the_asked_for_tradition() {
    for (flag, tag, marker) in [
        ("klir", "Klir", "dependencies"),
        ("bunge", "Bunge", "endo_bonds"),
        ("mobus", "Mobus", "b_interfaces"),
    ] {
        let out = bert(&["describe", CLEAN, "--lens", flag]);
        assert_eq!(code(&out), 0);
        let d = stdout_json(&out);
        assert_eq!(d["lens"], tag);
        assert!(
            d.get(marker).is_some(),
            "the {tag} description carries {marker}, the field only that \
             tradition's formal object has"
        );
    }
}

/// Law: a run either produces a trajectory or names the reason there is none,
/// and the two are told apart by the exit code rather than by reading prose.
#[test]
fn a_run_is_a_trajectory_or_a_stated_refusal() {
    let ran = bert(&["run", CLEAN, "--t", "6", "--dt", "1"]);
    assert_eq!(code(&ran), 0, "stderr: {}", stderr(&ran));
    let trace = stdout_json(&ran);
    assert_eq!(
        trace["history"].as_array().expect("history is rows").len(),
        6,
        "T = 6 at Δt = 1 is six recorded ticks"
    );
    assert!(trace["ledger_history"].is_array() && trace["dt"] == 1.0);

    // Separating instance: a model that compiles and validates but does not
    // project to anything executable. Same subcommand, different code.
    let refused = bert(&["run", "assets/examples/fsm-traffic.sl"]);
    assert_eq!(
        code(&refused),
        4,
        "a model with no executable projection is refused, not run"
    );
    assert!(
        !stdout_json(&refused)["errors"]
            .as_array()
            .expect("the projection errors are an array")
            .is_empty(),
        "and the reasons are the kernel's own projection errors, on stdout"
    );

    // A Δt that is not a step names no run — the engine's own precondition,
    // reached through the door.
    let no_step = bert(&["run", CLEAN, "--dt", "0"]);
    assert_eq!(code(&no_step), 4);
    assert!(
        stdout_json(&no_step)["refused"]
            .as_str()
            .expect("the refusal is a string")
            .contains("Δt"),
        "the refusal names Δt"
    );
}

/// Law: bad arguments exit 2, distinct from every input or kernel failure.
#[test]
fn a_usage_error_is_its_own_code() {
    assert_eq!(code(&bert(&["verdict", CLEAN, "--lens", "nope"])), 2);
    assert_eq!(code(&bert(&["verdict"])), 2);
    assert_eq!(code(&bert(&["nonesuch", CLEAN])), 2);
    // Separating instance: a well-formed invocation of a file that is not there
    // is NOT a usage error — the arguments were fine, the file was not.
    assert_eq!(code(&bert(&["verdict", "assets/examples/no-such-file.sl"])), 3);
}

/// Law: `layout` reports where the nodes are, and reports it for every node.
///
/// Positions only — whether they are *right* is the caller's question. The
/// source-left/sink-right regression fixed on 2026-08-12 was found by measuring
/// rendered x-positions through browser JavaScript; this is the same
/// measurement, without the browser.
#[test]
fn layout_reports_every_node_with_its_role() {
    let out = bert(&["layout", CLEAN]);
    assert_eq!(code(&out), 0);
    let nodes = stdout_json(&out);
    let nodes = nodes["nodes"].as_array().expect("nodes is an array");

    let compiled = bert(&["compile", CLEAN]);
    let things = stdout_json(&compiled);
    let things = things["things"].as_array().expect("things is an array");
    assert_eq!(
        nodes.len(),
        things.len(),
        "layout covers every node the model has, in declaration order"
    );

    for (node, thing) in nodes.iter().zip(things) {
        assert_eq!(node["name"], thing["name"]);
        assert_eq!(node["x"], thing["x"]);
        assert_eq!(node["y"], thing["y"]);
        assert_eq!(node["role"], thing["role"]);
    }

    // The shape a layout check actually wants: sources left of sinks. Asserted
    // HERE (in the caller), never in the binary — deciding it there would be
    // systems logic in the door.
    let x_of = |kind: &str| -> Vec<f64> {
        nodes
            .iter()
            .filter(|n| n["env_kind"] == kind)
            .map(|n| n["x"].as_f64().expect("x is a number"))
            .collect()
    };
    let (sources, sinks) = (x_of("Source"), x_of("Sink"));
    assert!(!sources.is_empty() && !sinks.is_empty(), "{CLEAN} has both");
    let rightmost_source = sources.iter().cloned().fold(f64::MIN, f64::max);
    let leftmost_sink = sinks.iter().cloned().fold(f64::MAX, f64::min);
    assert!(
        rightmost_source < leftmost_sink,
        "sources sit left of sinks (the 2026-08-12 auto-layout fix); \
         rightmost source x={rightmost_source}, leftmost sink x={leftmost_sink}"
    );
}

/// Law: `-` reads the model from stdin, and decides its format from the text
/// rather than from an extension it does not have.
#[test]
fn stdin_carries_both_surfaces() {
    use std::io::Write;
    use std::process::{Command, Stdio};

    let root = support::repo_root();
    let feed = |text: String, args: &[&str]| {
        let mut child = Command::new(env!("CARGO_BIN_EXE_bert"))
            .args(args)
            .current_dir(&root)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .expect("bert runs");
        child
            .stdin
            .as_mut()
            .expect("stdin is piped")
            .write_all(text.as_bytes())
            .expect("write to stdin");
        child.wait_with_output().expect("bert finishes")
    };

    let sl = std::fs::read_to_string(root.join(CLEAN)).expect("read the example");
    let from_sl = feed(sl, &["describe", "-", "--lens", "klir"]);
    assert_eq!(code(&from_sl), 0, "stderr: {}", stderr(&from_sl));

    // The same model as stored JSON, through the same door.
    let json = String::from_utf8_lossy(&bert(&["compile", CLEAN]).stdout).into_owned();
    let from_json = feed(json, &["describe", "-", "--lens", "klir"]);
    assert_eq!(code(&from_json), 0, "stderr: {}", stderr(&from_json));
    assert_eq!(
        stdout_json(&from_sl),
        stdout_json(&from_json),
        "the text surface and the stored surface reach the same object"
    );
}
