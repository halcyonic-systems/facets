//! Headless SL legality check: read SL on stdin, print OK + a structural
//! summary, or the parse faults. The out-of-browser counterpart to
//! `compile_sl`, for scripting the local-model SL-authoring readiness eval
//! (`docs/design/llm-sl-authoring-plan.md`, the coverage dial).
use std::io::Read;

fn main() {
    let mut text = String::new();
    std::io::stdin().read_to_string(&mut text).unwrap();
    match bert_canvas::sl::parse_sl_full(&text) {
        Ok(p) => {
            let things = p.model.things.len();
            let rels = p.model.relations.len();
            println!("OK things={things} relations={rels} lens_explicit={}", p.lens_explicit);
        }
        Err(errs) => {
            println!("ERRORS n={}", errs.len());
            for e in errs {
                println!("  line {}: {}", e.line, e.message);
            }
            std::process::exit(1);
        }
    }
}
