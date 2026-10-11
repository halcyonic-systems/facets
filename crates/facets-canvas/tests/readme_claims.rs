//! The README's opening makes a factual claim about what this tool does: a
//! two-component model with no interaction is *accepted* as Klir and *refused*
//! as Bunge, with a named definition, a repair, and something to read.
//!
//! A claim on the front page is a claim like any other. This project's whole
//! position is that it refuses assertions nothing checks — so the example a
//! stranger meets first is pinned here, and the build fails if the tool stops
//! behaving the way the README says it does (#252).
//!
//! If this fails: fix the README, or fix the kernel. Do not delete the test.

use bert_canvas::canvas::{project, Lens};
use bert_canvas::lenses::describe;
use bert_canvas::sl::parse_sl;
use bert_core::validate::validate_mode;
use bert_core::Mode;

/// Verbatim from README.md — the four lines a reader meets first. The relation
/// is declared `mere`: it holds, but it does not act. Klir counts it; Bunge does
/// not, because Bunge's system is defined by bondage.
///
/// The `mere` matters. Without it the example would rest on an EMPTY relation
/// set, and "Klir accepts a set with no relations" is the most contestable form
/// of the Klir claim — `S = (T, R)` invites the reading that R must be
/// inhabited. With it, both coordinates are populated and the disagreement is
/// about bondage, which is Bunge's own contribution rather than a technicality.
const README_TOOLBOX: &str = "\
system \"Toolbox\" : Concrete/Technical
component Hammer
component Wrench
flow Hammer -> Wrench : matter \"contact\" mere
";

#[test]
fn the_readme_opening_example_behaves_as_the_readme_says() {
    let model = parse_sl(README_TOOLBOX).expect("the README's opening example must compile");
    let world = project(&model);

    // "Read through Klir, that is a system: two things, one relation."
    let klir = validate_mode(&world, Mode::Core);
    assert!(
        klir.issues.is_empty(),
        "the README says Klir accepts this model; it reported: {:#?}",
        klir.issues
    );

    // And Klir must actually SEE the relation — that is the whole point of
    // declaring it `mere` rather than omitting it. A mere relation does not
    // project into the WorldModel the Bunge gate reads, so this reads the lens
    // description, which is computed from the canvas model.
    let facts = describe(&model, Lens::Klir);
    let rendered = format!("{facts:?}");
    assert!(
        rendered.contains("relations: 1"),
        "Klir must count the mere relation — S = (T, R) with R inhabited; got: {rendered}"
    );

    // "Switch to the Bunge lens and the kernel refuses it."
    let bunge = validate_mode(&world, Mode::Structural);
    let refusal = bunge
        .issues
        .first()
        .expect("the README says Bunge refuses this model; nothing was reported");

    // The four fields the README claims every refusal carries: where, what rule,
    // what repair, what to read.
    assert_eq!(refusal.location, "mode/Structural", "where");
    assert!(
        refusal
            .message
            .contains("a system requires at least one bond between distinct components"),
        "what rule — the README quotes this message verbatim; got: {}",
        refusal.message
    );
    assert!(
        refusal
            .suggestion
            .as_deref()
            .is_some_and(|s| s.contains("Add an interaction between two distinct systems")),
        "what repair — the README quotes this; got: {:?}",
        refusal.suggestion
    );
    assert!(
        refusal.doc.as_deref().is_some_and(|d| d.contains("glossary")),
        "what to read — the README shows a doc link; got: {:?}",
        refusal.doc
    );
}

/// The separating instance: the refusal must be *about bondage*, not a blanket
/// "Structural is stricter". Drop the word `mere` — the only difference — and
/// the same four lines pass both lenses, exactly as the README says.
#[test]
fn dropping_mere_clears_the_refusal_the_readme_shows() {
    let bonded = README_TOOLBOX.replace(" mere", "");
    assert_ne!(bonded, README_TOOLBOX, "the fixture must actually contain `mere`");
    let model = parse_sl(&bonded).expect("the repaired model must compile");
    let world = project(&model);

    let bunge = validate_mode(&world, Mode::Structural);
    assert!(
        !bunge
            .issues
            .iter()
            .any(|i| i.message.contains("at least one bond between distinct components")),
        "the bond refusal must clear once a bond exists; got: {:#?}",
        bunge.issues
    );
}
