//! Quint Connect trace-replay harness (bert-lenses#17).
//!
//! The mode machine — `validate_mode` (validate.rs), `validate_transition`
//! (transition.rs §A5), `validate_operational` (operational.rs) — is specified in
//! Quint as `mode_ladder.qnt` (quint-lab), Apalache-verified. This harness closes
//! the loop the other way: it replays the spec's own execution traces against the
//! REAL Rust functions and asserts, step by step, that the machine agrees with the
//! spec where the spec is right and REFUSES where the planted-bug sibling was
//! wrong.
//!
//! No Quint toolchain runs here. Traces are generated offline with `quint run
//! --out-itf` (commands in `fixtures/quint/README.md`) and committed as ITF JSON,
//! so CI replays them with nothing but serde. A missing fixture SKIPs loudly
//! rather than failing — the tooling is optional, the fixtures are the contract.
//!
//! ── Concretization (the intellectual core) ──
//! Each ITF state is four kernel knobs (`mode`, `has_bond`, `irreflexive`,
//! `executable`) plus run/record bookkeeping. `common::concrete_model` turns the
//! four knobs into a real `WorldModel` so that each knob moves exactly one gate
//! (see its doc table). The spec's `canExecute` predicate must then equal
//! `validate_operational(model).is_ok()` on every state — that equality is the
//! load-bearing check, and it is what the buggy sibling violates.

use bert_core::operational::validate_operational;
use bert_core::transition::{validate_transition, Transition};
use bert_core::Mode;
use serde_json::Value;
use std::path::PathBuf;

mod common;
use common::concrete_model;

// ── ITF parsing ─────────────────────────────────────────────────────────────

/// One replayed spec state: the mode-ladder variables we drive the machine with.
#[derive(Debug, Clone)]
struct SpecState {
    mode: i64,
    has_bond: bool,
    irreflexive: bool,
    executable: bool,
    running: bool,
    h_recorded: bool,
    h_valid: bool,
    downgraded_since_record: bool,
    edited_since_downgrade: bool,
    witness_intact: bool,
    edits: i64,
}

/// ITF encodes integers as `{"#bigint":"n"}` and booleans plainly.
fn itf_int(v: &Value) -> i64 {
    if let Some(b) = v.get("#bigint") {
        b.as_str().expect("bigint string").parse().expect("bigint parses")
    } else {
        v.as_i64().expect("plain int")
    }
}

fn itf_bool(state: &Value, key: &str) -> bool {
    state[key].as_bool().unwrap_or_else(|| panic!("bool var {key}"))
}

impl SpecState {
    fn from_itf(state: &Value) -> Self {
        SpecState {
            mode: itf_int(&state["mode"]),
            has_bond: itf_bool(state, "hasBond"),
            irreflexive: itf_bool(state, "irreflexive"),
            executable: itf_bool(state, "executable"),
            running: itf_bool(state, "running"),
            h_recorded: itf_bool(state, "hRecorded"),
            h_valid: itf_bool(state, "hValid"),
            downgraded_since_record: itf_bool(state, "downgradedSinceRecord"),
            edited_since_downgrade: itf_bool(state, "editedSinceDowngrade"),
            witness_intact: itf_bool(state, "witnessIntact"),
            edits: itf_int(&state["edits"]),
        }
    }

    fn mode(&self) -> Mode {
        match self.mode {
            0 => Mode::Core,
            1 => Mode::Structural,
            2 => Mode::Operational,
            3 => Mode::Full,
            other => panic!("unknown mode ordinal {other}"),
        }
    }

    fn model(&self) -> bert_core::WorldModel {
        concrete_model(self.mode(), self.has_bond, self.irreflexive, self.executable)
    }

    /// The spec's `canExecute` (mode_ladder.qnt): the mode gate AND irreflexivity
    /// AND the strict projection conjunct. This is exactly what the REAL
    /// `validate_operational` must decide.
    fn can_execute(&self) -> bool {
        (self.mode == 2 || self.mode == 3) && self.irreflexive && self.executable
    }
}

fn fixture_path(name: &str) -> PathBuf {
    let mut p = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    p.push("../../fixtures/quint");
    p.push(name);
    p
}

/// Load and parse a committed ITF trace, or `None` (with a loud SKIP) if absent.
fn load_trace(name: &str) -> Option<Vec<SpecState>> {
    let path = fixture_path(name);
    let Ok(bytes) = std::fs::read(&path) else {
        eprintln!(
            "SKIP quint_replay: fixture {} not found — regenerate with the commands \
             in fixtures/quint/README.md (needs the quint CLI). The committed \
             fixtures make this test run in CI without quint.",
            path.display()
        );
        return None;
    };
    let itf: Value = serde_json::from_slice(&bytes).expect("fixture is valid ITF JSON");
    let states = itf["states"]
        .as_array()
        .expect("ITF has a states array")
        .iter()
        .map(SpecState::from_itf)
        .collect();
    Some(states)
}

// ── Action inference ────────────────────────────────────────────────────────
// The ITF records states, not the action between them; we recover it from the
// delta so we can drive the matching real function (`validate_transition` for
// up/down moves) and track the recorded-run baseline across `record_H`.

#[derive(Debug, PartialEq)]
enum Action {
    Edit,
    Upgrade(Mode),
    Downgrade,
    Rebuild,
    RecordH,
    /// try_run, or any no-op step (a refused run leaves the state unchanged).
    TryRunOrNoop,
}

fn is_child(parent: i64, child: i64) -> bool {
    // Hasse edges of the tree-shaped meet-semilattice (transition.rs):
    // Core→{Structural,Operational}, Operational→Full.
    matches!((parent, child), (0, 1) | (0, 2) | (2, 3))
}

fn infer_action(p: &SpecState, c: &SpecState) -> Action {
    if c.edits > p.edits {
        Action::Edit
    } else if p.witness_intact
        && p.downgraded_since_record
        && c.mode == 2
        && !c.witness_intact
        && !c.downgraded_since_record
    {
        // Witness re-injection lands on Operational and clears the downgrade
        // provenance — it may or may not change the mode ordinal, so it is
        // matched before the plain mode-change cases.
        Action::Rebuild
    } else if c.mode != p.mode {
        if is_child(p.mode, c.mode) {
            Action::Upgrade(c.mode())
        } else {
            Action::Downgrade
        }
    } else if c.h_recorded && !p.h_recorded {
        Action::RecordH
    } else {
        Action::TryRunOrNoop
    }
}

// ── The three checks every green replay must pass ───────────────────────────

/// (1) Run-gate agreement: the machine's executability verdict equals the spec's
/// `canExecute` on every state. This is invariant (a) — "no silent partial
/// projection" — reduced to a per-state equality.
fn assert_run_gate_agrees(trace: &str, i: usize, s: &SpecState) {
    let real_ok = validate_operational(&s.model()).is_ok();
    assert_eq!(
        real_ok,
        s.can_execute(),
        "{trace}[{i}]: validate_operational says runnable={real_ok}, but the spec's \
         canExecute={} (mode={}, irreflexive={}, executable={}) — the machine and the \
         spec's run gate disagree",
        s.can_execute(),
        s.mode,
        s.irreflexive,
        s.executable,
    );
    // A live run in the spec must be one the machine would actually admit.
    if s.running {
        assert!(
            real_ok,
            "{trace}[{i}]: the spec is running, but validate_operational REFUSES this \
             model — a silent partial projection",
        );
    }
}

/// (2) Transition legality: a mode move the spec took is one `validate_transition`
/// allows from the pre-state. An upgrade the spec fired means the target edge's
/// hypothesis held, so the machine must return Ok; a downgrade never errs.
fn assert_transition_legal(trace: &str, i: usize, prev: &SpecState, action: &Action) {
    match action {
        Action::Upgrade(target) => {
            let res = validate_transition(&prev.model(), *target);
            assert!(
                matches!(res, Ok(Transition::Upgrade { .. }) | Ok(Transition::Identity)),
                "{trace}[{i}]: spec upgraded to {target:?}, but validate_transition \
                 refused from the pre-state (has_bond={}, irreflexive={}): {res:?}",
                prev.has_bond,
                prev.irreflexive,
            );
        }
        Action::Downgrade => {
            let target = if prev.mode == 3 { Mode::Operational } else { Mode::Core };
            let res = validate_transition(&prev.model(), target);
            assert!(
                res.is_ok(),
                "{trace}[{i}]: spec downgraded to {target:?}, but validate_transition \
                 erred — a downgrade must never fail: {res:?}",
            );
        }
        _ => {}
    }
}

/// (3) H freshness, soundness direction: every recording the spec still trusts
/// (`h_valid`) is one whose content hash the machine confirms is unchanged. The
/// baseline is captured at `record_H`; a structural edit moves the real hash, so
/// a trusted recording that survives an edit is the buggy sibling's tell.
fn real_h_valid(s: &SpecState, recorded: Option<u64>) -> bool {
    // No baseline (a recording the machine never actually took, because the model
    // did not project) is never valid — there is nothing to confirm.
    let Some(baseline) = recorded else { return false };
    s.h_recorded
        && validate_operational(&s.model())
            .ok()
            .map(|spec| spec.content_hash())
            == Some(baseline)
}

// ── Tests ───────────────────────────────────────────────────────────────────

/// The done-when: a full ladder walk that reaches a live run replays green — the
/// machine agrees with the spec's run gate and every transition, and the run the
/// spec admits is one validate_operational actually admits.
#[test]
fn ladder_walk_replays_green() {
    let Some(trace) = load_trace("ladder_walk_run.itf.json") else { return };
    assert!(trace.len() > 2, "trace is non-trivial");

    for (i, s) in trace.iter().enumerate() {
        assert_run_gate_agrees("ladder_walk_run", i, s);
    }
    for i in 1..trace.len() {
        let action = infer_action(&trace[i - 1], &trace[i]);
        assert_transition_legal("ladder_walk_run", i, &trace[i - 1], &action);
    }

    assert!(
        trace.iter().any(|s| s.running),
        "the ladder walk must actually reach a live run for the replay to be meaningful",
    );
}

/// The H machinery replays green: the spec records a run, downgrades past it, and
/// edits — and every state the spec still trusts, the machine's content hash
/// confirms. Also exercises the run gate and transitions across a longer walk.
#[test]
fn h_machinery_replays_green() {
    let Some(trace) = load_trace("h_hazard.itf.json") else { return };

    let mut recorded: Option<u64> = None;
    for i in 0..trace.len() {
        let s = &trace[i];
        assert_run_gate_agrees("h_hazard", i, s);

        if i > 0 {
            let action = infer_action(&trace[i - 1], &trace[i]);
            assert_transition_legal("h_hazard", i, &trace[i - 1], &action);
            if action == Action::RecordH {
                // The recording's baseline is the running spec's content hash.
                recorded = validate_operational(&s.model()).ok().map(|sp| sp.content_hash());
                assert!(recorded.is_some(), "h_hazard[{i}]: record_H over a non-projecting model");
            }
        }

        if s.h_valid {
            assert!(
                real_h_valid(s, recorded),
                "h_hazard[{i}]: the spec trusts this recording (h_valid), but the \
                 machine's content hash no longer matches the recorded baseline",
            );
        }
    }

    assert!(
        trace.iter().any(|s| s.h_recorded),
        "the H trace must record a run",
    );
    assert!(
        trace.iter().any(|s| s.h_recorded && !s.h_valid),
        "the H trace must invalidate a recording so the green replay is non-vacuous",
    );
}

/// Payoff 1 — the buggy sibling drops the strict `executable` conjunct and runs a
/// non-projectable model. Replayed against the real machine, that run is REFUSED:
/// somewhere the buggy spec is running with `canExecute` false, and there
/// validate_operational returns Err.
#[test]
fn buggy_silent_projection_is_refused() {
    let Some(trace) = load_trace("buggy_silent_projection.itf.json") else { return };

    let bug = trace
        .iter()
        .enumerate()
        .find(|(_, s)| s.running && !s.can_execute());
    let (i, s) = bug.expect(
        "the buggy trace must contain a silent partial projection (running with \
         canExecute false) — that is the planted bug",
    );

    assert!(
        validate_operational(&s.model()).is_err(),
        "buggy_silent_projection[{i}]: the buggy spec runs a non-projectable model \
         (executable={}), but the REAL validate_operational must refuse it",
        s.executable,
    );
}

/// Payoff 2 — the buggy sibling forgets to move the content hash on downgrade, so
/// a stale recording poses as valid. Replayed, the real machine's content hash HAS
/// moved: at the state the buggy spec still trusts (h_valid after downgrade+edit),
/// the machine says the recording is stale.
#[test]
fn buggy_stale_h_is_caught() {
    let Some(trace) = load_trace("buggy_stale_h.itf.json") else { return };

    let mut recorded: Option<u64> = None;
    let mut caught = false;
    for i in 0..trace.len() {
        let s = &trace[i];
        if i > 0 && infer_action(&trace[i - 1], &trace[i]) == Action::RecordH {
            recorded = validate_operational(&s.model()).ok().map(|sp| sp.content_hash());
        }
        // The bug state: the spec trusts a recording that has been downgraded past
        // and structurally edited.
        if s.h_recorded && s.downgraded_since_record && s.edited_since_downgrade && s.h_valid {
            assert!(
                recorded.is_some(),
                "buggy_stale_h[{i}]: a genuine recording must have been taken over an \
                 executable model for this to demonstrate the stale-hash bug",
            );
            assert!(
                !real_h_valid(s, recorded),
                "buggy_stale_h[{i}]: the buggy spec trusts a downgraded-and-edited \
                 recording, but the real content hash has moved — the machine must \
                 NOT confirm it",
            );
            caught = true;
        }
    }

    assert!(
        caught,
        "the buggy stale-H trace must reach a state where a stale recording poses as \
         valid — that is the planted bug the machine catches",
    );
}
