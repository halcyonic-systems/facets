//! The declared Klir epistemological level (#288).
//!
//! Klir, *Facets* §5.4: the epistemological categories are true categories,
//! and "the modeling relation can be defined only within each particular
//! epistemological category of systems." SL's `level` keyword lets a model
//! declare where on the §4.5 hierarchy it stands; the Klir face reports the
//! claim; and comparing two models across DECLARED levels is refused with
//! Klir's sentence as the reason.
//!
//! Two commitments hold throughout: the refusal gates a claim, never an
//! absence (a model with no `level` line behaves exactly as before the word
//! existed), and the check owes a separating instance — a comparison that
//! actually fails — because a check nothing can fail proves nothing (SSF #35).

use std::fs;
use std::path::PathBuf;

use bert_canvas::canvas::{KlirLevel, Lens};
use bert_canvas::lenses::{check_cross_level, describe, LensDescription, KLIR_MODELING_RELATION};
use bert_canvas::sl::{emit_sl, parse_sl};

#[test]
fn level_parses_into_the_model() {
    let m = parse_sl("level Structure\ncomponent A\n").unwrap();
    assert_eq!(m.klir_level, Some(KlirLevel::Structure));
    // Keyword-case-insensitive like everything else.
    let m = parse_sl("LEVEL generative\ncomponent A\n").unwrap();
    assert_eq!(m.klir_level, Some(KlirLevel::Generative));
}

#[test]
fn undeclared_stays_none() {
    let m = parse_sl("component A\n").unwrap();
    assert_eq!(m.klir_level, None);
}

/// Law: `level` is a singleton — a model stands at one level, so a second
/// declaration is a fault, not a silent overwrite.
#[test]
fn a_second_level_line_is_refused() {
    let err = parse_sl("level Source\nlevel Data\ncomponent A\n").unwrap_err();
    assert_eq!(err[0].line, 2);
    assert!(err[0].message.contains("already declared"), "{}", err[0].message);
}

/// Law: the value set is exactly Klir's five words, and the refusal names them.
#[test]
fn an_unknown_level_value_is_refused_naming_the_five() {
    let err = parse_sl("level Behavioral\ncomponent A\n").unwrap_err();
    let msg = &err[0].message;
    for value in ["Source", "Data", "Generative", "Structure", "Metasystem"] {
        assert!(msg.contains(value), "the refusal must name `{value}`; got: {msg}");
    }
}

#[test]
fn level_round_trips_through_canonical_form() {
    let m = parse_sl("system \"S\"\nlevel Metasystem\ncomponent A\n").unwrap();
    let text = emit_sl(&m).unwrap();
    assert!(text.contains("\nlevel Metasystem\n"), "{text}");
    assert_eq!(parse_sl(&text).unwrap().klir_level, Some(KlirLevel::Metasystem));

    let unleveled = parse_sl("component A\n").unwrap();
    let text = emit_sl(&unleveled).unwrap();
    assert!(!text.contains("level"), "{text}");
}

/// The Klir face reports the DECLARED level beside the derived ladder
/// position — the author's claim and the model's honest contents are two
/// different statements, and the face carries both.
#[test]
fn the_klir_face_reports_the_declared_level() {
    let m = parse_sl("level Structure\ncomponent A\ncomponent B\nflow A -> B\n").unwrap();
    let LensDescription::Klir { level, .. } = describe(&m, Lens::Klir) else {
        panic!("describe(Klir) must return the Klir variant");
    };
    assert_eq!(level, Some(KlirLevel::Structure));

    let m = parse_sl("component A\n").unwrap();
    let LensDescription::Klir { level, .. } = describe(&m, Lens::Klir) else {
        panic!("describe(Klir) must return the Klir variant");
    };
    assert_eq!(level, None);
}

/// The separating instance (SSF #35): a cross-level comparison FAILS, a
/// same-level one passes, and an undeclared one is untouched. All three halves
/// are asserted, because a refusal that fires on everything would prove the
/// check broken rather than the levels distinct, and one that fires on nothing
/// would prove nothing at all.
#[test]
fn the_modeling_relation_is_refused_across_levels_and_defined_within_one() {
    let generative = parse_sl("level Generative\ncomponent A\ncomponent B\nflow A -> B\n").unwrap();
    let structure = parse_sl("level Structure\ncomponent A\ncomponent B\nflow A -> B\n").unwrap();
    let undeclared = parse_sl("component A\ncomponent B\nflow A -> B\n").unwrap();

    // Across levels: refused, and the printed reason is Klir's §5.4 sentence.
    let reason = check_cross_level(&generative, &structure)
        .expect_err("a Generative/Structure comparison is undefined in Klir's framework");
    assert!(
        reason.contains(KLIR_MODELING_RELATION),
        "the refusal must print Klir's own sentence, since the citation is what \
         makes it his rule rather than our preference; got: {reason}"
    );
    assert!(reason.contains("Generative") && reason.contains("Structure"), "{reason}");

    // Within one level: defined.
    let structure2 = parse_sl("level Structure\ncomponent C\n").unwrap();
    assert_eq!(check_cross_level(&structure, &structure2), Ok(()));

    // Faithfulness, not strictness: an entry with NO declared level behaves
    // exactly as today, whichever side of the comparison it sits on.
    assert_eq!(check_cross_level(&undeclared, &structure), Ok(()));
    assert_eq!(check_cross_level(&generative, &undeclared), Ok(()));
    assert_eq!(check_cross_level(&undeclared, &undeclared), Ok(()));
}

/// The three corpus entries whose prose names a level now declare it in-file —
/// the first declarations ratified (#288). Since the 2026-08-08 census
/// ratification, every shipped entry declares one.
#[test]
fn the_three_prose_named_corpus_entries_declare_structure() {
    for rel in [
        "klir/criminal-court.sl",
        "klir/cellular-array-cell.sl",
        "klir/serial-binary-adder.sl",
    ] {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("../../assets/corpus")
            .join(rel);
        let text = fs::read_to_string(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
        let model = parse_sl(&text).unwrap_or_else(|e| panic!("{rel} did not compile: {e:?}"));
        assert_eq!(
            model.klir_level,
            Some(KlirLevel::Structure),
            "{rel} names its level in prose and must declare it"
        );
    }
}

/// The refusal, live on SHIPPED entries — not only on synthetic models. The
/// ratified census (2026-08-08) put the corpus steel-plant at Source and the
/// criminal court at Structure, so the library itself now carries a pair the
/// modeling relation is undefined between; and it carries a same-level pair
/// reached from two traditions (Mobus's opaque box, Klir's lake observation)
/// that compares fine. Both halves asserted, on real files.
#[test]
fn the_shipped_corpus_carries_a_live_cross_level_refusal() {
    let read = |rel: &str| {
        let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../assets").join(rel);
        let text = fs::read_to_string(&path).unwrap_or_else(|e| panic!("{}: {e}", path.display()));
        parse_sl(&text).unwrap_or_else(|e| panic!("{rel} did not compile: {e:?}"))
    };
    let steel_plant = read("corpus/mobus/steel-plant.sl");
    let criminal_court = read("corpus/klir/criminal-court.sl");
    // Archived out of the shipped gallery in the #318 consolidation, kept in the
    // repo, and still read here: it is the library's only other Source-level
    // model, so without it the §5.4 refusal has no same-level pair to contrast
    // against and stops being a distinction. The path moved; the witness did not.
    let lake = read("archive/lake-observation.sl");

    assert_eq!(steel_plant.klir_level, Some(KlirLevel::Source));
    let reason = check_cross_level(&steel_plant, &criminal_court)
        .expect_err("a Source/Structure comparison is undefined in Klir's framework");
    assert!(reason.contains(KLIR_MODELING_RELATION), "{reason}");

    // The cross-tradition rhyme: Mobus's stage-one pass and Klir's lowest
    // level are the same object, so these two compare within one level.
    assert_eq!(lake.klir_level, Some(KlirLevel::Source));
    assert_eq!(check_cross_level(&steel_plant, &lake), Ok(()));
}
