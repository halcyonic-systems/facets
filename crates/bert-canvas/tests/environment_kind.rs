//! The author's environment word must survive (#216). **GREEN — fixed 2026-07-27.**
//!
//! Kept as the standing record of a defect that had two symptoms filed as unrelated
//! tickets, because the shape recurs: a distinction the author stated, discarded by
//! one layer, then guessed at by the next.
//!
//! SL gives the author three words for a thing outside the boundary — `source`,
//! `sink`, and `environment` — and they mean different things. The parser used to map
//! all three onto the single `Role::Environment`, destroying the distinction at parse
//! time. Everything downstream then tried to *recover* it by looking at which way the
//! flows run:
//!
//! - `sl.rs:878-880` re-derives the keyword for `emit_sl` (`originates → "source"`,
//!   else `touched → "sink"`, else `"environment"`)
//! - `canvas.rs:435` re-derives an `ExternalEntityType` the same way, and
//!   `operational.rs:331/343` then refuse any flow that contradicts the derivation
//!
//! A derivation cannot recover information the parse threw away, so both guesses are
//! wrong in the cases that matter, and they are wrong in two different ways that were
//! reported as unrelated defects:
//!
//! 1. **`environment` is not neutral any more.** `examples/predator-prey.sl` declares
//!    `environment Grass` and says why in a comment: "Grass is neither pure source nor
//!    pure sink". Grass originates the grazing flow, so it is typed `Source`, so the
//!    photosynthesis flow *into* it is refused. Five other examples fail identically.
//! 2. **A declared word is silently replaced.** `corpus/klir/goal-oriented-feedback.sl`
//!    declares `sink y`; `y` has an outgoing flow, so `emit_sl` writes back `source y`.
//!    The entry's header claims one fixed composition across the set, and the encoding
//!    contradicts it.
//!
//! The fix was not a wider `ExternalEntityType`. It was to stop discarding what the
//! author said: `Thing::env_kind` carries the declaration, `emit_sl` echoes it, and
//! `ExternalEntity::authored_direction` tells the operational rules whether `ty` is a
//! claim or merely a filing (a `WorldModel` has no neutral external, so a mediator
//! must still be filed on one side). **Those rules became true again**: a flow into a
//! thing the author declared a `source` is a real error and is still refused, where a
//! flow into a neutral `environment` never was.

use std::fs;
use std::path::PathBuf;

use bert_canvas::canvas::project;
use bert_canvas::sl::{emit_sl, parse_sl_full};
use bert_core::operational::validate_operational;

fn read(rel: &str) -> String {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../assets")
        .join(rel);
    fs::read_to_string(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()))
}

/// Law: a thing declared `environment` is neutral, so flows may run both ways.
///
/// This is the minimal case: `predator-prey.sl` has exactly one offending flow, and
/// the model's own comment states the intent, so a failure here is unambiguous.
#[test]
fn a_neutral_environment_thing_accepts_flow_in_both_directions() {
    let text = read("examples/predator-prey.sl");
    let parsed = parse_sl_full(&text).expect("predator-prey compiles");
    let world = project(&parsed.model);

    let verdict = validate_operational(&world);
    assert!(
        verdict.is_ok(),
        "`environment Grass` is declared neutral and the file says why: it receives \
         photosynthesis from Sunlight AND gives grazing to Rabbits. Refusing one of \
         those means the projection replaced the author's word with a guess derived \
         from flow direction (canvas.rs:435). Errors: {:#?}",
        verdict.err()
    );
}

/// Law: `emit_sl` echoes the word the author wrote, it does not re-derive one.
///
/// Round-tripping must not silently relabel a thing. `goal-oriented-feedback.sl`
/// declares `sink y` and gets `source y` back, which falsifies its own header claim
/// that the set holds one composition fixed.
#[test]
fn emit_sl_preserves_the_declared_environment_word() {
    for (entry, declared) in [
        ("corpus/klir/goal-oriented-feedback.sl", "sink y"),
        ("examples/predator-prey.sl", "environment Grass"),
    ] {
        let text = read(entry);
        let parsed = parse_sl_full(&text).unwrap_or_else(|e| panic!("{entry}: {e:?}"));
        let emitted = emit_sl(&parsed.model).unwrap_or_else(|e| panic!("{entry}: emit failed: {e}"));
        assert!(
            emitted.lines().any(|l| l.trim() == declared),
            "{entry} declares `{declared}`, but a round trip through emit_sl did not \
             write it back. The word was re-derived from flow direction \
             (sl.rs:878-880) rather than remembered. Emitted:\n{emitted}"
        );
    }
}

/// Law: the four examples blocked *solely* by the derived-direction defect now run.
///
/// Named individually rather than counted, so a regression says which model broke.
/// Each declares an `environment` thing that both receives and gives — the shape the
/// projection used to refuse. `hal-harness` and `two-sided-market` are deliberately
/// absent: they carry the same defect *plus* a Bunge lens-mode gate, so they stay
/// structural for a reason that has nothing to do with this fix.
#[test]
fn the_examples_blocked_by_derived_direction_now_validate() {
    let mut broken = Vec::new();
    for name in [
        "predator-prey",
        "cell-metabolism",
        "jung-functions",
        "bank-run",
    ] {
        let text = read(&format!("examples/{name}.sl"));
        let parsed = parse_sl_full(&text).unwrap_or_else(|e| panic!("{name}: {e:?}"));
        if let Err(errs) = validate_operational(&project(&parsed.model)) {
            broken.push(format!("  {name}: {errs:#?}"));
        }
    }
    assert!(
        broken.is_empty(),
        "these examples are blocked by nothing but the derived-direction defect, so \
         they must validate once the author's word is kept:\n{}",
        broken.join("\n")
    );
}
