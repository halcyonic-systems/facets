//! The #216 cross-lens matrix, emitted as data.
//!
//! Every corpus entry and every structural example read under all three lenses.
//! Run with output shown:
//!
//! ```text
//! cargo test -p bert-canvas --test matrix_report -- --nocapture
//! ```
//!
//! This is a reporter, not a gate — the assertions that must hold live in
//! `cross_lens.rs`. Keeping them apart means a survey run can never be mistaken
//! for a passing gate, and the gate never has to be loosened to let a survey
//! print.

use std::fs;
use std::path::{Path, PathBuf};

use bert_canvas::canvas::Lens;
use bert_canvas::lenses::analyze;
use bert_canvas::sl::parse_sl_full;
use bert_core::validate::Severity;

fn sl_files(dir: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    let mut paths: Vec<_> = entries.filter_map(|e| e.ok()).map(|e| e.path()).collect();
    paths.sort();
    for p in paths {
        if p.is_dir() {
            sl_files(&p, out);
        } else if p.extension().and_then(|e| e.to_str()) == Some("sl") {
            out.push(p);
        }
    }
}

fn assets(rel: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../assets")
        .join(rel)
}

/// Errors and warnings a model raises when read under `lens`.
fn cell(model: &bert_canvas::canvas::CanvasModel, lens: Lens) -> (String, Vec<String>) {
    let v = analyze(model, lens).validation;
    let errs: Vec<_> = v
        .issues
        .iter()
        .filter(|i| i.severity == Severity::Error)
        .map(|i| i.message.clone())
        .collect();
    let warns = v
        .issues
        .iter()
        .filter(|i| i.severity == Severity::Warning)
        .count();
    if errs.is_empty() {
        let s = if warns > 0 {
            format!("clean(w{warns})")
        } else {
            "clean".to_string()
        };
        (s, Vec::new())
    } else {
        (format!("REFUSED({})", errs.len()), errs)
    }
}

#[test]
fn emit_cross_lens_matrix() {
    let mut files = Vec::new();
    sl_files(&assets("corpus"), &mut files);
    let corpus_count = files.len();
    sl_files(&assets("examples"), &mut files);

    println!("\nSET\tENTRY\tPINNED\tKLIR\tBUNGE\tMOBUS\tREASONS");

    // The demos first, because they were the models this report used to skip.
    // The matrix read `.sl` and the demos are JSON, so the only three models with
    // dynamics were the only three never cross-checked — which is how two Bunge
    // aggregate verdicts on the flagships stayed invisible (#216). Exemptions are
    // where embarrassment hides.
    for demo in ["reservoir", "homeostat", "allocation"] {
        let path = assets("models/demos").join(format!("{demo}.json"));
        let Ok(text) = fs::read_to_string(&path) else {
            println!("demo\t{demo}\tREAD-FAIL\t-\t-\t-\t{}", path.display());
            continue;
        };
        let world: bert_core::WorldModel = match serde_json::from_str(&text) {
            Ok(w) => w,
            Err(e) => {
                println!("demo\t{demo}\tPARSE-FAIL\t-\t-\t-\t{e}");
                continue;
            }
        };
        let cm = bert_canvas::canvas::to_canvas(&world);
        let pinned = format!("{:?}", cm.lens).to_lowercase();
        let mut cells = Vec::new();
        let mut reasons = Vec::new();
        for (label, lens) in [
            ("klir", Lens::Klir),
            ("bunge", Lens::Bunge),
            ("mobus", Lens::Mobus),
        ] {
            let (c, errs) = cell(&cm, lens);
            cells.push(c);
            reasons.extend(errs.into_iter().map(|e| format!("{label}: {e}")));
        }
        println!(
            "demo\t{demo}\t{pinned}\t{}\t{}\t{}\t{}",
            cells[0],
            cells[1],
            cells[2],
            reasons.join(" || ")
        );
    }
    for (i, path) in files.iter().enumerate() {
        let set = if i < corpus_count { "corpus" } else { "example" };
        let name = path
            .strip_prefix(assets(""))
            .unwrap_or(path)
            .display()
            .to_string();
        let text = match fs::read_to_string(path) {
            Ok(t) => t,
            Err(e) => {
                println!("{set}\t{name}\tREAD-FAIL\t-\t-\t-\t{e}");
                continue;
            }
        };
        let parsed = match parse_sl_full(&text) {
            Ok(p) => p,
            Err(e) => {
                println!("{set}\t{name}\tPARSE-FAIL\t-\t-\t-\t{e:?}");
                continue;
            }
        };
        let pinned = format!("{:?}", parsed.model.lens).to_lowercase();

        let mut cells = Vec::new();
        let mut reasons = Vec::new();
        for (label, lens) in [
            ("klir", Lens::Klir),
            ("bunge", Lens::Bunge),
            ("mobus", Lens::Mobus),
        ] {
            let v = analyze(&parsed.model, lens).validation;
            let errs: Vec<_> = v
                .issues
                .iter()
                .filter(|i| i.severity == Severity::Error)
                .map(|i| i.message.clone())
                .collect();
            let warns = v
                .issues
                .iter()
                .filter(|i| i.severity == Severity::Warning)
                .count();
            if errs.is_empty() {
                cells.push(if warns > 0 {
                    format!("clean(w{warns})")
                } else {
                    "clean".to_string()
                });
            } else {
                cells.push(format!("REFUSED({})", errs.len()));
                for e in &errs {
                    reasons.push(format!("{label}: {e}"));
                }
            }
        }
        println!(
            "{set}\t{name}\t{pinned}\t{}\t{}\t{}\t{}",
            cells[0],
            cells[1],
            cells[2],
            reasons.join(" || ")
        );
    }
    println!();
}
