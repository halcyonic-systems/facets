//! Flow magnitude, unit, and substance name in SL (#216, C1/C4).
//!
//! `Interaction` has carried `amount` and `unit` since the beginning, and
//! `substance.sub_type` beside them; §8.2 of the language spec records all three
//! as structural attributes of an edge — they do not vary during a run — owed to
//! the grammar today, not gated on #112. Their absence is what capped every
//! SL-authored model at emission rate 1.0.
//!
//! Grammar under test (extending the flow production):
//!
//! ```text
//! flow <a> -> <b> [: <kind>] ["label"] [substance <name>] [amount <decimal>]
//!      [unit <name>] [mere] [weight <n>]
//! ```
//!
//! The distinction between *declared 1* and *undeclared* survives the file:
//! an unauthored amount is `None` on the relation and only becomes the kernel's
//! `Decimal::ONE` at projection, a narrowing `project()`'s doc declares.

use bert_canvas::canvas::project;
use bert_canvas::sl::{emit_sl, parse_sl};
use bert_core::rust_decimal::Decimal;

const AUTHORED: &str = "\
system \"Waterworks\" : Concrete
component Reservoir primitive Buffering interface
source Watershed
sink Outlet
flow Watershed -> Reservoir : matter \"inflow\" substance water amount 2 unit ML/mo
flow Reservoir -> Outlet : matter \"release\" substance water amount 1.5 unit ML/mo
";

/// Law: the three clauses parse onto the relation exactly as written.
#[test]
fn flow_quantity_clauses_parse() {
    let m = parse_sl(AUTHORED).expect("authored quantities must parse");
    let r = &m.relations[1];
    assert_eq!(r.substance, "water");
    assert_eq!(r.amount, Some(Decimal::new(15, 1)), "1.5 declared, 1.5 kept");
    assert_eq!(r.unit, "ML/mo");
}

/// Law: what was written survives project() — the kernel interaction carries
/// the authored magnitude, unit, and substance name, not hardcoded defaults.
#[test]
fn flow_quantity_projects() {
    let m = parse_sl(AUTHORED).unwrap();
    let world = project(&m);
    let ix = &world.interactions[1];
    assert_eq!(ix.amount, Decimal::new(15, 1));
    assert_eq!(ix.unit, "ML/mo");
    assert_eq!(ix.substance.sub_type, "water");
}

/// Law: an unauthored amount stays unauthored in the file (None), and projects
/// as the kernel default ONE — "declared 1" and "undeclared" are different
/// statements and only projection may conflate them.
#[test]
fn unauthored_amount_is_none_and_projects_as_one() {
    let m = parse_sl(
        "component A primitive Combining\nsink B\nflow A -> B : matter \"out\"\n",
    )
    .unwrap();
    assert_eq!(m.relations[0].amount, None);
    assert_eq!(m.relations[0].unit, "");
    assert_eq!(m.relations[0].substance, "");
    let world = project(&m);
    assert_eq!(world.interactions[0].amount, Decimal::ONE);
}

/// Law: emit echoes the clauses, and parse ∘ emit is the identity on them.
#[test]
fn flow_quantity_round_trips_through_emit() {
    let m1 = parse_sl(AUTHORED).unwrap();
    let text = emit_sl(&m1).expect("emit");
    // Canonical form quotes a unit whose spelling needs it (`/` is not a bare
    // name character), exactly as `stock "kW·h"` already does.
    assert!(
        text.contains("substance water amount 1.5 unit \"ML/mo\""),
        "emit must echo the authored clauses in canonical order:\n{text}"
    );
    let m2 = parse_sl(&text).unwrap_or_else(|e| panic!("re-parse: {e:?}\n{text}"));
    assert_eq!(
        serde_json::to_value(&m1).unwrap(),
        serde_json::to_value(&m2).unwrap(),
        "quantities drifted across emit\n{text}"
    );
}

/// Law: a negative or unreadable amount is a parse fault, never a silent
/// default — the same rule that makes an unknown parameter name a fault (C3):
/// the language refuses what it cannot mean. Zero is ADMISSIBLE since the
/// interactive-params work (2026-08-16): a declared 0 is arrested supply — a
/// dynamical statement a slider writes and a saved model must re-parse.
#[test]
fn bad_amounts_are_parse_faults() {
    for bad in ["amount -2", "amount much"] {
        let text = format!("component A primitive Combining\nsink B\nflow A -> B : matter {bad}\n");
        assert!(
            parse_sl(&text).is_err(),
            "`{bad}` must be refused, not defaulted"
        );
    }
    let zero = "component A primitive Combining\nsink B\nflow A -> B : matter amount 0\n";
    let m = parse_sl(zero).expect("a declared 0 is arrested supply, not an absent flow");
    assert_eq!(m.relations[0].amount.map(|d| d.to_string()), Some("0".to_string()));
}

/// Law: a quantity on a `mere` relation is a contradiction — a non-bond never
/// projects, so a magnitude on it could never mean anything. Refuse, don't drop.
#[test]
fn amount_on_mere_is_refused() {
    let text = "component A primitive Combining\ncomponent B primitive Combining\n\
                flow A -> B : matter \"akin\" amount 2 mere\n";
    assert!(parse_sl(text).is_err(), "amount on a mere relation must be refused");
}

/// Law: duplicate clauses are faults, matching `stock`'s precedent.
#[test]
fn duplicate_quantity_clauses_are_refused() {
    let text = "component A primitive Combining\nsink B\n\
                flow A -> B : matter amount 2 amount 3\n";
    assert!(parse_sl(text).is_err(), "duplicate amount must be refused");
}

/// Law (#262): a clause keyword sitting where a value belongs is a named
/// fault, never a garbage parse. Before this check, `unit mere` silently read
/// `mere` as the unit's NAME and the mere clause vanished from the relation.
#[test]
fn orphan_clause_keyword_is_a_named_fault() {
    for orphan in [
        "substance amount 2",
        "amount unit t",
        "unit mere",
        "weight mere",
    ] {
        let text =
            format!("component A primitive Combining\nsink B\nflow A -> B : matter {orphan}\n");
        let errs = parse_sl(&text).expect_err("an orphan clause keyword must be refused");
        assert!(
            errs.iter().any(|e| e.message.contains("missing its value")),
            "`{orphan}` should name the orphan, got: {errs:?}"
        );
    }
}

/// The separating instance for the orphan check: a value genuinely SPELLED
/// like a clause keyword arrives quoted (reserved words always emit quoted)
/// and passes untouched — the check refuses accidents, not names.
#[test]
fn quoted_keyword_lookalike_values_still_parse() {
    let text = "component A primitive Combining\nsink B\n\
                flow A -> B : matter substance \"amount\" amount 2 unit \"mere\"\n";
    let m = parse_sl(text).expect("quoted lookalikes are names, not orphans");
    assert_eq!(m.relations[0].substance, "amount");
    assert_eq!(m.relations[0].unit, "mere");
}

/// Law (#262): the kernel's projection default must not round-trip as if
/// authored — a WorldModel amount of ONE reads back unauthored (None), so a
/// reloaded model never emits `amount 1` the author didn't type. The trade:
/// a genuinely authored 1 also reads back None, and projection resupplies it.
#[test]
fn projected_default_one_reads_back_unauthored() {
    let m = parse_sl(
        "component A primitive Combining\nsink B\n\
         flow A -> B : matter \"out\"\nflow A -> B : matter \"more\" amount 2\n",
    )
    .unwrap();
    let back = bert_canvas::canvas::to_canvas(&project(&m));
    assert_eq!(back.relations[0].amount, None, "default ONE must read back unauthored");
    assert_eq!(
        back.relations[1].amount,
        Some(Decimal::from(2)),
        "an authored non-ONE amount survives the reload"
    );
    let text = emit_sl(&back).expect("emit");
    assert!(
        !text.contains("amount 1\n") && !text.ends_with("amount 1"),
        "reload must not emit an unauthored `amount 1`:\n{text}"
    );
}
