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
//!
//! #216 asks for three outcomes, not two: clean, refused, and **travels but
//! reads differently**. Validation alone can only answer the first two, which
//! is why the third column stayed empty while the report looked complete. The
//! third outcome is a claim about meaning, and the measure of it already exists
//! per lens — `residue`, the count of authored content a lens cannot see. A
//! model legal under two lenses that hides eleven declared facts from one of
//! them travels, and reads differently. The spread across the lenses it passes
//! is that difference, as a number.

use std::fs;
use std::path::{Path, PathBuf};

use bert_canvas::canvas::Lens;
use bert_canvas::lenses::{analyze, ResidueEntry};
use bert_canvas::sl::parse_sl_full;
use bert_core::validate::Severity;

const LENS_NAMES: [&str; 3] = ["klir", "bunge", "mobus"];

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

/// One cell: the verdict, the refusal reasons, and how much authored content
/// this lens cannot see. `blind` is `None` for a refusal — residue describes
/// what a legal reading omits, and there is no reading to describe.
struct Cell {
    verdict: String,
    reasons: Vec<String>,
    blind: Option<usize>,
    /// The residue lines behind `blind`, kept so a divergent row can say WHICH
    /// facts differ, not just how many (#285). Empty for a refusal.
    residue: Vec<ResidueEntry>,
    /// The hidden subset of `residue` alone. The extremes diff misses the
    /// middle lens entirely, and hidden is the load-bearing signal — authored
    /// meaning a lens cannot render, not a question it left unanswered (#284).
    hidden: Vec<ResidueEntry>,
}

fn cell(model: &bert_canvas::canvas::CanvasModel, lens: Lens) -> Cell {
    let a = analyze(model, lens);
    let errs: Vec<_> = a
        .validation
        .issues
        .iter()
        .filter(|i| i.severity == Severity::Error)
        .map(|i| i.message.clone())
        .collect();
    let warns = a
        .validation
        .issues
        .iter()
        .filter(|i| i.severity == Severity::Warning)
        .count();
    if !errs.is_empty() {
        return Cell {
            verdict: format!("REFUSED({})", errs.len()),
            reasons: errs,
            blind: None,
            residue: Vec::new(),
            hidden: Vec::new(),
        };
    }
    let residue: Vec<ResidueEntry> = a
        .residue
        .hidden
        .iter()
        .chain(&a.residue.unspecified)
        .cloned()
        .collect();
    let blind: usize = residue.iter().map(|e| e.count).sum();
    Cell {
        verdict: if warns > 0 {
            format!("clean(w{warns})")
        } else {
            "clean".to_string()
        },
        reasons: Vec::new(),
        blind: Some(blind),
        residue,
        hidden: a.residue.hidden.clone(),
    }
}

/// The third outcome, as a number. Among the lenses that accept the model, the
/// gap between the most and least blind. Zero means every accepting lens sees
/// the same amount of what the author wrote; large means the model is legal in
/// places that cannot read most of it.
/// Among the accepting lenses, the least- and most-blind, as indices into the
/// klir/bunge/mobus cell order. `None` unless at least two lenses accept.
fn extremes(cells: &[Cell]) -> Option<(usize, usize)> {
    let mut seen: Vec<(usize, usize)> = cells
        .iter()
        .enumerate()
        .filter_map(|(i, c)| c.blind.map(|b| (b, i)))
        .collect();
    if seen.len() < 2 {
        return None;
    }
    seen.sort();
    Some((seen[0].1, seen[seen.len() - 1].1))
}

fn divergence(cells: &[Cell]) -> String {
    let Some((lo_i, hi_i)) = extremes(cells) else {
        return "-".to_string();
    };
    let (lo, hi) = (cells[lo_i].blind.unwrap(), cells[hi_i].blind.unwrap());
    if hi == lo {
        return "aligned(0)".to_string();
    }
    format!(
        "DIVERGENT({}) {}>{}",
        hi - lo,
        LENS_NAMES[hi_i],
        LENS_NAMES[lo_i]
    )
}

/// Residue labels are number-agreed noun phrases, so the same category can
/// surface as singular in one lens and plural in another. Two labels name the
/// same category if they are equal or differ by a trailing `s`.
fn same_category(a: &str, b: &str) -> bool {
    a == b || a.strip_suffix('s') == Some(b) || b.strip_suffix('s') == Some(a)
}

fn entry_text(e: &ResidueEntry) -> String {
    // count == 0 is the uncountable line (e.g. Bunge's ⊘M) — label alone.
    if e.count == 0 {
        e.label.clone()
    } else {
        format!("{} {}", e.count, e.label)
    }
}

/// The #285 detail: for a divergent row, which residue categories differ
/// between the most- and least-blind accepting lenses, and by how much. Empty
/// when the row is not divergent or the extremes carry identical residue.
fn residue_diff(cells: &[Cell]) -> Vec<String> {
    let Some((lo_i, hi_i)) = extremes(cells) else {
        return Vec::new();
    };
    if cells[lo_i].blind == cells[hi_i].blind {
        return Vec::new();
    }
    let (lo_name, hi_name) = (LENS_NAMES[lo_i], LENS_NAMES[hi_i]);
    let (lo, hi) = (&cells[lo_i].residue, &cells[hi_i].residue);
    let mut lines = Vec::new();
    for h in hi {
        match lo.iter().find(|l| same_category(&l.label, &h.label)) {
            None => lines.push(format!("only {hi_name}: {}", entry_text(h))),
            Some(l) if l.count != h.count => lines.push(format!(
                "{}: {hi_name} {} vs {lo_name} {}",
                h.label, h.count, l.count
            )),
            Some(_) => {}
        }
    }
    for l in lo {
        if !hi.iter().any(|h| same_category(&h.label, &l.label)) {
            lines.push(format!("only {lo_name}: {}", entry_text(l)));
        }
    }
    lines
}

/// The middle lens's hidden entries. The extremes diff compares only the
/// most- and least-blind lenses, so when three lenses accept, the middle
/// lens's losses are computed but never shown — which broke the #284 rule
/// that residue labels must name what a lens loses in the report itself.
/// Only hidden prints: unspecified is a declined question, not a loss.
fn middle_hidden(cells: &[Cell]) -> Vec<String> {
    let Some((lo_i, hi_i)) = extremes(cells) else {
        return Vec::new();
    };
    cells
        .iter()
        .enumerate()
        .filter(|(i, c)| *i != lo_i && *i != hi_i && c.blind.is_some())
        .flat_map(|(i, c)| {
            c.hidden
                .iter()
                .map(move |e| format!("also hidden from {}: {}", LENS_NAMES[i], entry_text(e)))
        })
        .collect()
}

#[test]
fn emit_cross_lens_matrix() {
    let mut files = Vec::new();
    sl_files(&assets("corpus"), &mut files);
    let corpus_count = files.len();
    sl_files(&assets("examples"), &mut files);

    println!("\nSET\tENTRY\tPINNED\tKLIR\tBUNGE\tMOBUS\tBLIND(k/b/m)\tTHIRD_OUTCOME\tREASONS");

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
        let cells = read_all_lenses(&cm);
        println!("demo\t{demo}\t{pinned}\t{}", row(&cells));
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
        let cells = read_all_lenses(&parsed.model);
        println!("{set}\t{name}\t{pinned}\t{}", row(&cells));
    }
    println!();
}

fn read_all_lenses(model: &bert_canvas::canvas::CanvasModel) -> Vec<Cell> {
    [Lens::Klir, Lens::Bunge, Lens::Mobus]
        .into_iter()
        .map(|lens| cell(model, lens))
        .collect()
}

fn row(cells: &[Cell]) -> String {
    let blind = cells
        .iter()
        .map(|c| match c.blind {
            Some(b) => b.to_string(),
            None => "-".to_string(),
        })
        .collect::<Vec<_>>()
        .join("/");
    let reasons = cells
        .iter()
        .zip(LENS_NAMES)
        .flat_map(|(c, name)| c.reasons.iter().map(move |r| format!("{name}: {r}")))
        .collect::<Vec<_>>()
        .join(" || ");
    let mut out = format!(
        "{}\t{}\t{}\t{blind}\t{}\t{reasons}",
        cells[0].verdict,
        cells[1].verdict,
        cells[2].verdict,
        divergence(cells)
    );
    // Divergent rows continue onto indented detail lines: the categories that
    // make up the spread, so the reader goes from the row to the reason
    // without opening the model (#285).
    for line in residue_diff(cells).into_iter().chain(middle_hidden(cells)) {
        out.push_str("\n    · ");
        out.push_str(&line);
    }
    out
}
