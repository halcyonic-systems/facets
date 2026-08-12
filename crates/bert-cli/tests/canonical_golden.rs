//! The full golden, over a named few models — every word the door says about
//! them, diffed on every run.
//!
//! The golden's worth is the **diff**: when a kernel change moves a verdict it
//! names which model changed and how. That paid for itself within a minute of
//! the CLI existing (#316, `bitcoin` refused under its own lens). What it does
//! not need is to cover the whole library. It needs to cover models whose
//! verdicts we are prepared to defend — everything else is churn, because the
//! library is being consolidated (#318) and each rename would otherwise force a
//! re-bless of rows nobody asserts anything about. See #317.
//!
//! Regenerate with `BLESS_CLI_GOLDEN=1 cargo test -p bert-cli`, and read the
//! diff before committing it: an unexplained change is the finding.
//!
//! Floats are rounded — positions to whole pixels, run values to six decimals.
//! Layout runs through `sin`/`cos`, whose last bits are not guaranteed to agree
//! across platforms, and a regression worth catching moves a node by hundreds
//! of pixels, not by one ULP.

mod support;

use std::collections::BTreeMap;

use serde_json::{json, Map, Value};
use support::{bert, code, repo_root, stdout_json};

const GOLDEN: &str = "fixtures/cli/canonical.json";

/// The three lenses, by the name the `--lens` flag takes.
const LENSES: [&str; 3] = ["klir", "bunge", "mobus"];

/// The canonical set: the models this golden speaks for.
///
/// Three from the keep set (#318) that run and carry claims:
///
/// - `llm-market` — "a practical, usable model I want to refine", and the only
///   canonical entry whose trajectory carries non-integer values, so it is the
///   one that would show an engine arithmetic change.
/// - `predator-prey` — "a good exemplar".
/// - `federal-reserve` — keep and work on.
///
/// And one corpus entry per tradition, so the cross-lens door stays covered —
/// `lenses::analyze` takes the lens explicitly and ignores the model's pin, and
/// `source_corpus.rs` gates each entry under its **own** lens only, so the
/// other two readings are unexecuted anywhere else:
///
/// - `klir/cellular-array-cell` — the only corpus entry refused under *both*
///   traditions it is not pinned to (1 error under Bunge, 8 under Mobus). Every
///   other Klir entry reads clean under Bunge, so this one carries the most
///   cross-lens signal of the eight.
/// - `bunge/coupling-sigma3` — the corpus's one documented divergence: legal
///   Bunge structure, refused Mobus structure (#216). Already the separating
///   instance for the `--lens` flag in `surface.rs`.
/// - `mobus/typical-neuron` — a clean Mobus exemplar. All five Mobus entries
///   read 0/0/0, so there is no divergence to pick between them; this one is
///   chosen because it is the one the consolidation does **not** rewrite.
///   `steel-plant` is the Mobus entry with run signal, and is deliberately
///   excluded: #318 folds the walkthrough's decomposition into it, so pinning
///   it here would reintroduce exactly the churn this narrowing removes.
///
/// Deliberately outside the set, all in the keep list: `bitcoin` (refused, and
/// #316 is about to repair it — its refusal is what the weak survey surfaces),
/// `hal-harness` (does not run by construction, pending a modelling decision),
/// `jung-functions` (runs, but the three above already cover runs-that-carry-
/// claims and it is slated for rework). Add one here when its verdict is
/// something we would defend, not merely something we observe.
const CANONICAL: [&str; 6] = [
    "assets/corpus/bunge/coupling-sigma3.sl",
    "assets/corpus/klir/cellular-array-cell.sl",
    "assets/corpus/mobus/typical-neuron.sl",
    "assets/examples/federal-reserve.sl",
    "assets/examples/llm-market.sl",
    "assets/examples/predator-prey.sl",
];

/// Round every float in `value` to `places` decimals, in place.
fn round_floats(value: &mut Value, places: i32) {
    match value {
        Value::Number(n) => {
            if let Some(f) = n.as_f64() {
                let scale = 10f64.powi(places);
                let rounded = (f * scale).round() / scale;
                if let Some(n2) = serde_json::Number::from_f64(rounded) {
                    *value = Value::Number(n2);
                }
            }
        }
        Value::Array(items) => items.iter_mut().for_each(|i| round_floats(i, places)),
        Value::Object(map) => map.values_mut().for_each(|v| round_floats(v, places)),
        _ => {}
    }
}

/// Everything the door says about one model.
fn reading(path: &str) -> Value {
    let compiled = bert(&["compile", path]);
    assert_eq!(code(&compiled), 0, "{path} compiles");
    let model = stdout_json(&compiled);

    let mut verdicts = Map::new();
    for lens in LENSES {
        let out = bert(&["verdict", path, "--lens", lens]);
        let analysis = stdout_json(&out);
        let errors = analysis["validation"]["issues"]
            .as_array()
            .expect("issues is an array")
            .iter()
            .filter(|i| i["severity"] == "Error")
            .count();
        assert_eq!(
            code(&out) == 4,
            errors > 0,
            "`bert verdict {path} --lens {lens}` must exit 4 exactly when it \
             reports an error — the exit code IS the machine-readable verdict, \
             and a code that disagrees with the payload makes every shell check \
             a lie"
        );

        // `describe` is in the golden by identity rather than by copy: the
        // analysis carries the same formal object the `describe` subcommand
        // prints, so asserting they agree covers `describe` exactly and keeps
        // the file from holding the tradition's text twice.
        let described = bert(&["describe", path, "--lens", lens]);
        assert_eq!(code(&described), 0, "`bert describe {path} --lens {lens}`");
        assert_eq!(
            stdout_json(&described),
            analysis["description"],
            "`bert describe {path} --lens {lens}` and the `description` inside \
             `bert verdict` are the same formal object, read through two doors. \
             If they diverge, one of the two doors is lying about the tradition."
        );

        verdicts.insert(lens.to_string(), analysis);
    }

    let layout = bert(&["layout", path]);
    assert_eq!(code(&layout), 0);
    let nodes: Vec<Value> = stdout_json(&layout)["nodes"]
        .as_array()
        .expect("nodes is an array")
        .iter()
        .map(|n| {
            json!({
                "name": n["name"],
                "role": n["role"],
                "env_kind": n["env_kind"],
                "x": n["x"].as_f64().expect("x is a number").round(),
                "y": n["y"].as_f64().expect("y is a number").round(),
            })
        })
        .collect();

    // The whole trajectory, not just whether one happened. `dt_invariance.rs`
    // owns the physics; what this catches is the engine quietly answering a
    // different number for a model we speak for.
    let run = bert(&["run", path, "--t", "4"]);
    let mut answer = stdout_json(&run);
    round_floats(&mut answer, 6);
    let outcome = match code(&run) {
        0 => "runs",
        4 => {
            if answer.get("refused").is_some() {
                "refused"
            } else {
                "not-executable"
            }
        }
        other => panic!("`bert run {path}` exited {other}, which is neither a run nor a refusal"),
    };

    json!({
        "pins": model["lens"],
        "things": model["things"].as_array().expect("things").len(),
        "relations": model["relations"].as_array().expect("relations").len(),
        "verdict_under": Value::Object(verdicts),
        "layout": nodes,
        "run": { "outcome": outcome, "answer": answer },
    })
}

#[test]
fn the_canonical_set_reads_the_same_way_through_the_door() {
    let mut rows: BTreeMap<String, Value> = BTreeMap::new();
    for path in CANONICAL {
        assert!(
            repo_root().join(path).is_file(),
            "{path} is in the canonical set but is not on disk. A canonical \
             model may be renamed — update this list and re-bless deliberately; \
             the point of the set is that its members are never moved silently."
        );
        rows.insert(path.to_string(), reading(path));
    }

    let actual = serde_json::to_string_pretty(&rows).expect("serialize the golden");
    let path = repo_root().join(GOLDEN);
    if std::env::var_os("BLESS_CLI_GOLDEN").is_some() {
        std::fs::create_dir_all(path.parent().expect("a parent")).expect("create the golden dir");
        std::fs::write(&path, format!("{actual}\n")).expect("write the golden");
        return;
    }
    let expected = std::fs::read_to_string(&path).unwrap_or_else(|_| {
        panic!(
            "missing {GOLDEN}; run with BLESS_CLI_GOLDEN=1 to create it, then read \
             the file before committing"
        )
    });
    let expected = expected.trim_end_matches('\n');
    if actual == expected {
        return;
    }

    // Report the *difference*, not both documents. The golden holds every word
    // the door says about six models, so `assert_eq!` on it would print a third
    // of a megabyte and bury the one line that moved — and the diff is the whole
    // reason this file exists.
    let spilled = repo_root().join("target/canonical.actual.json");
    let _ = std::fs::create_dir_all(spilled.parent().expect("a parent"));
    let _ = std::fs::write(&spilled, format!("{actual}\n"));
    panic!(
        "the CLI's reading of the canonical set changed:\n{}\n\nIf that is \
         intended, regenerate with BLESS_CLI_GOLDEN=1 and say in the commit \
         WHICH model moved and why — an unexplained change is the finding, not \
         the noise. The full new reading is at {} if you want to diff it \
         yourself.",
        first_differences(expected, &actual, 12),
        spilled.display()
    );
}

/// Up to `limit` differing lines, each with its line number and both sides.
fn first_differences(expected: &str, actual: &str, limit: usize) -> String {
    let mut lines = Vec::new();
    let mut total = 0usize;
    let expected: Vec<&str> = expected.lines().collect();
    let actual: Vec<&str> = actual.lines().collect();
    for i in 0..expected.len().max(actual.len()) {
        let (was, now) = (expected.get(i), actual.get(i));
        if was == now {
            continue;
        }
        total += 1;
        if lines.len() < limit {
            lines.push(format!(
                "  line {}:\n    was: {}\n    now: {}",
                i + 1,
                was.unwrap_or(&"<end of file>").trim(),
                now.unwrap_or(&"<end of file>").trim()
            ));
        }
    }
    if total > lines.len() {
        lines.push(format!("  … and {} more differing lines", total - lines.len()));
    }
    lines.join("\n")
}
