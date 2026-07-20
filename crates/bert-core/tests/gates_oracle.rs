//! Rung 1.5 of the lens-entry binding (bert-lenses#24): the subprocess oracle.
//!
//! Rung 1 (`gates_truth_table.rs`) checks the `bert-core` mode gates against a
//! committed fixture — but only on the n ≤ 2 rows someone thought to enumerate.
//! This test removes that bound. It generates `(n, dep)` kernels PAST n = 2,
//! shells out to the Lean `gates-oracle` executable (which evaluates the SAME
//! `hasBondB` / `irreflexiveB` declarations the fixture enumerator uses), and
//! asserts `rust_gate(m) == lean_verdict(m)` for every mode on every model.
//!
//! Zero FFI: JSON over a pipe to a `lake exe` binary. The oracle contract is
//! documented at the head of `systems-science-foundations/Systems/Klir/
//! GatesOracle.lean`. Input is a JSON array of `{ "n", "dep": [[i,j],..] }`
//! models; output is an index-aligned array of `{ gates, modes }` verdicts.
//!
//! LEAN-OPTIONAL: if the oracle can't be located (no Lean toolchain, e.g. the
//! Rust-only CI job that runs Rung 1), the test prints how to enable it and
//! passes as a no-op. Point it at a binary with `GATES_ORACLE=/path/to/bin`, or
//! at the SSF repo with `SSF_DIR=/path/to/systems-science-foundations` (runs
//! `lake exe gates-oracle` there).

use bert_core::Mode;
use serde_json::{json, Value};
use std::path::PathBuf;
use std::process::{Command, Stdio};

mod common;
use common::{enterable, model_for};

/// A `Command` that runs the oracle, if one can be located. Resolution order:
/// `GATES_ORACLE` (a binary path) → `SSF_DIR` (`lake exe gates-oracle` there) →
/// the default sibling checkout's prebuilt binary. `None` ⇒ skip.
fn oracle_command() -> Option<Command> {
    if let Ok(bin) = std::env::var("GATES_ORACLE") {
        if PathBuf::from(&bin).exists() {
            return Some(Command::new(bin));
        }
    }
    if let Ok(dir) = std::env::var("SSF_DIR") {
        if PathBuf::from(&dir).is_dir() {
            let mut c = Command::new("lake");
            c.args(["exe", "gates-oracle"]).current_dir(dir);
            return Some(c);
        }
    }
    // Default: SSF checked out beside bert-lenses, oracle prebuilt by `lake build`.
    let sibling_bin = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../systems-science-foundations/.lake/build/bin/gates-oracle");
    if sibling_bin.exists() {
        return Some(Command::new(sibling_bin));
    }
    let sibling_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../../systems-science-foundations");
    if sibling_dir.is_dir() {
        let mut c = Command::new("lake");
        c.args(["exe", "gates-oracle"]).current_dir(sibling_dir);
        return Some(c);
    }
    None
}

/// A tiny deterministic LCG so the generated corpus is fixed across runs (a
/// failure reproduces) without pulling in a `rand` dependency.
struct Lcg(u64);
impl Lcg {
    fn next_u64(&mut self) -> u64 {
        self.0 = self
            .0
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        self.0
    }
    fn bool(&mut self) -> bool {
        self.next_u64() >> 33 & 1 == 1
    }
}

/// Generate a corpus of `(n, dep)` kernels reaching past the n ≤ 2 fixture
/// bound: every `dep` is a random subset of `n × n` pairs (so self-loops and
/// distinct edges both appear), for a spread of `n`.
fn corpus() -> Vec<(u64, Vec<(u64, u64)>)> {
    let mut rng = Lcg(0x5eed_1_5_5); // fixed seed
    let mut models = Vec::new();

    // A few pinned boundary cases at n = 3 (empty, self-loop only, one distinct
    // edge, full self-loop diagonal, a bonded-and-reflexive mix).
    models.push((3, vec![]));
    models.push((3, vec![(1, 1)]));
    models.push((3, vec![(0, 2)]));
    models.push((3, vec![(0, 0), (1, 1), (2, 2)]));
    models.push((3, vec![(0, 1), (2, 2)]));

    // Random subsets for n = 3, 4, 5.
    for &n in &[3u64, 4, 5] {
        for _ in 0..120 {
            let mut dep = Vec::new();
            for i in 0..n {
                for j in 0..n {
                    if rng.bool() {
                        dep.push((i, j));
                    }
                }
            }
            models.push((n, dep));
        }
    }
    models
}

#[test]
fn rust_gates_agree_with_lean_oracle_beyond_the_fixture_bound() {
    let Some(mut cmd) = oracle_command() else {
        eprintln!(
            "SKIP gates_oracle: Lean oracle not found. Build it with \
             `lake build gates-oracle` in systems-science-foundations, or set \
             GATES_ORACLE=<binary> / SSF_DIR=<repo>."
        );
        return;
    };

    let models = corpus();
    assert!(
        models.iter().any(|(n, _)| *n > 2),
        "corpus must exercise models beyond the n<=2 fixture bound"
    );

    // One request: a JSON array of models, oracle returns an index-aligned array.
    let request: Vec<Value> = models
        .iter()
        .map(|(n, dep)| {
            let pairs: Vec<Value> = dep.iter().map(|(i, j)| json!([i, j])).collect();
            json!({ "n": n, "dep": pairs })
        })
        .collect();
    let input = Value::Array(request).to_string();

    // Feed stdin from a temp file so a large response can't deadlock a pipe we're
    // still writing to.
    let tmp = std::env::temp_dir().join(format!("gates_oracle_in_{}.json", std::process::id()));
    std::fs::write(&tmp, &input).expect("write oracle input");
    let stdin_file = std::fs::File::open(&tmp).expect("open oracle input");

    // A spawn failure means no runnable oracle (e.g. `lake` not installed on a
    // Rust-only CI box) — skip, don't fail. A *nonzero exit* is a real failure,
    // handled below.
    let out = match cmd
        .stdin(Stdio::from(stdin_file))
        .stderr(Stdio::piped())
        .output()
    {
        Ok(out) => out,
        Err(e) => {
            let _ = std::fs::remove_file(&tmp);
            eprintln!(
                "SKIP gates_oracle: could not run the oracle ({e}). Build it with \
                 `lake build gates-oracle` in systems-science-foundations, or set \
                 GATES_ORACLE=<binary>."
            );
            return;
        }
    };
    let _ = std::fs::remove_file(&tmp);

    assert!(
        out.status.success(),
        "gates-oracle exited {:?}: {}",
        out.status.code(),
        String::from_utf8_lossy(&out.stderr)
    );

    let verdicts: Value =
        serde_json::from_slice(&out.stdout).expect("oracle stdout is valid JSON");
    let verdicts = verdicts.as_array().expect("oracle returns an array");
    assert_eq!(
        verdicts.len(),
        models.len(),
        "oracle returned {} verdicts for {} models",
        verdicts.len(),
        models.len()
    );

    for ((n, dep), verdict) in models.iter().zip(verdicts) {
        let model = model_for(*n, dep);
        let modes = &verdict["modes"];

        for (mode, key) in [
            (Mode::Core, "core"),
            (Mode::Structural, "structural"),
            (Mode::Operational, "operational"),
            (Mode::Full, "full"),
        ] {
            let lean = modes[key]
                .as_bool()
                .unwrap_or_else(|| panic!("oracle verdict missing modes.{key}: {verdict}"));
            let rust = enterable(&model, mode);
            assert_eq!(
                rust, lean,
                "n={n} dep={dep:?}: Rust admits {mode:?} = {rust}, Lean oracle = {lean} \
                 — a gate has drifted from its Lean precondition past the fixture bound"
            );
        }
    }
}
