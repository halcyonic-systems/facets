//! A golden reading of every bundled example, taken through the binary.
//!
//! One row per `assets/examples/*.sl`: what it compiles to, what each of the
//! three lenses says about it, whether it runs, and where its nodes sit. The
//! point is not to freeze the numbers — it is that a change to the kernel which
//! moves any of them has to be *seen and accepted* rather than noticed later in
//! a browser. The 2026-08-12 source-left/sink-right layout bug and the drafter
//! mislabelling products as sinks (#313) are both visible in this file.
//!
//! Regenerate with `BLESS_CLI_GOLDEN=1 cargo test -p bert-cli`, and read the
//! diff before committing it: an unexplained row change is the finding.
//!
//! Positions are rounded to whole pixels. Layout runs through `sin`/`cos`,
//! whose last bits are not guaranteed to agree across platforms, and a layout
//! regression worth catching moves a node by hundreds of pixels, not by one ULP.

mod support;

use std::collections::BTreeMap;

use serde_json::{json, Map, Value};
use support::{bert, code, examples, repo_root, stdout_json};

const GOLDEN: &str = "fixtures/cli/examples.json";

/// The three lenses, by the name the `--lens` flag takes.
const LENSES: [&str; 3] = ["klir", "bunge", "mobus"];

/// How a run came out, as one word. The trajectory's numbers are not golden
/// material — `dt_invariance.rs` and the demo gates own those — but *whether a
/// bundled example runs at all* is exactly the fact that rots silently.
fn run_outcome(path: &str) -> &'static str {
    let out = bert(&["run", path, "--t", "4"]);
    match code(&out) {
        0 => "runs",
        4 => {
            let answer = stdout_json(&out);
            if answer.get("refused").is_some() {
                "refused"
            } else {
                "not-executable"
            }
        }
        other => panic!("`bert run {path}` exited {other}, which is neither a run nor a refusal"),
    }
}

fn reading(path: &str) -> Value {
    let compiled = bert(&["compile", path]);
    assert_eq!(code(&compiled), 0, "{path} compiles");
    let model = stdout_json(&compiled);

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

    // Error counts under each lens, INCLUDING the two the model does not pin.
    // `source_corpus.rs` gates each entry under its own lens only, which is
    // right for a ship gate and is why the other two go unexecuted; here the
    // cross-lens reading is the whole point of the column.
    let mut verdicts = Map::new();
    for lens in LENSES {
        let out = bert(&["verdict", path, "--lens", lens]);
        let errors = stdout_json(&out)["validation"]["issues"]
            .as_array()
            .expect("issues is an array")
            .iter()
            .filter(|i| i["severity"] == "Error")
            .count();
        assert_eq!(
            code(&out) == 4,
            errors > 0,
            "`bert verdict --lens {lens}` must exit 4 exactly when it reports an \
             error — the exit code IS the machine-readable verdict, and a code \
             that disagrees with the payload makes every shell check a lie"
        );
        verdicts.insert(lens.to_string(), json!(errors));
    }

    json!({
        "pins": model["lens"],
        "things": model["things"].as_array().expect("things").len(),
        "relations": model["relations"].as_array().expect("relations").len(),
        "errors_under": Value::Object(verdicts),
        "run": run_outcome(path),
        "layout": nodes,
    })
}

#[test]
fn every_bundled_example_reads_the_same_way_through_the_door() {
    let mut rows: BTreeMap<String, Value> = BTreeMap::new();
    for path in examples() {
        let name = path
            .file_name()
            .expect("a file name")
            .to_string_lossy()
            .into_owned();
        let rel = format!("assets/examples/{name}");
        rows.insert(name, reading(&rel));
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
    assert_eq!(
        actual,
        expected.trim_end_matches('\n'),
        "the CLI's reading of assets/examples changed. If that is intended, \
         regenerate with BLESS_CLI_GOLDEN=1 and say in the commit WHICH rows \
         moved and why — an unexplained row change is the finding, not the noise."
    );
}
