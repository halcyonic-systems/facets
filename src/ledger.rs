//! The run ledger (bert-lenses#15) — a lab notebook outside the model, so runs
//! survive across sessions and across models for cross-run comparison. Two
//! writes, two gestures:
//!
//! 1. **Auto, on every completed run** — one line appended to a summary ledger
//!    (`ledger.jsonl`, one JSON object per line): timestamp, model, spec hash,
//!    Δt/T, residual, identity-default disclosure, and a per-element divergence
//!    summary. Cheap, so it never asks.
//! 2. **Explicit, one gesture** — a full report (`report.md` + `report.json`,
//!    trajectories included) written to its own timestamped folder. Mirrors the
//!    Run surface's explicit-gesture doctrine (contract §2/§4): a full trajectory
//!    dump is heavier, so it waits for a deliberate "Save report".
//!
//! Neither write ever touches Save or Export — the model file's payload is
//! untouched by anything here (contract §4). This module holds plain data and
//! file I/O only, no egui, so the schema and the report text are unit-testable
//! without a canvas.

use serde::{Deserialize, Serialize};
use std::io::Write as _;
use std::path::{Path, PathBuf};

/// One mapped element's divergence reading at the horizon (mirrors
/// [`crate::tether::Comparison::divergence_pct`]) — carried into the ledger so a
/// summary line discloses reality-fit without opening the full report.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct DivergenceEntry {
    pub element_name: String,
    pub kind: String,
    pub divergence_pct: Option<f32>,
}

/// The auto-appended summary line — one JSON object per completed run.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct LedgerLine {
    /// Wall-clock at run completion, `YYYY-MM-DDTHH:MM:SSZ` (UTC).
    pub timestamp: String,
    /// The model's name at run time — its library file stem, or "untitled" if
    /// never saved/loaded from a named file this session.
    pub model_name: String,
    /// `OperationalSpec::content_hash` at run time, as hex — the same staleness
    /// key the Run panel uses, carried here for cross-run identity.
    pub spec_hash: String,
    pub dt: f64,
    pub t: f64,
    pub ticks: usize,
    pub residual: f32,
    pub identity_default_n: usize,
    pub identity_default_m: usize,
    pub divergences: Vec<DivergenceEntry>,
}

/// The explicit full report: the summary line plus everything the drill-down
/// shows — final levels, per-thing trajectories, and simulated-vs-actual series.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct FullReport {
    pub summary: LedgerLine,
    pub levels: Vec<(String, f32)>,
    pub trajectories: Vec<(String, Vec<f32>)>,
    pub comparisons: Vec<ComparisonSeries>,
}

/// A comparison series with its trajectory, for the full report only (the
/// summary ledger line carries just [`DivergenceEntry`]).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ComparisonSeries {
    pub element_name: String,
    pub kind: String,
    pub simulated: Vec<f32>,
    pub actual: Vec<f32>,
    pub divergence_pct: Option<f32>,
}

/// The full wall-clock timestamp, `YYYY-MM-DDTHH:MM:SSZ` (UTC) — reuses
/// [`crate::tether::civil_from_days`] so the date math lives in one place.
/// Falls back to `"unknown"` if the clock is before the epoch (matches
/// [`crate::tether::today_stamp`]'s fallback).
pub fn full_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let Ok(dur) = SystemTime::now().duration_since(UNIX_EPOCH) else {
        return "unknown".to_string();
    };
    let secs = dur.as_secs();
    let days = (secs / 86_400) as i64;
    let sod = secs % 86_400;
    let (y, m, d) = crate::tether::civil_from_days(days);
    let (h, mi, s) = (sod / 3600, (sod % 3600) / 60, sod % 60);
    format!("{y:04}-{m:02}-{d:02}T{h:02}:{mi:02}:{s:02}Z")
}

/// A filesystem-safe stamp derived from an ISO timestamp (`full_timestamp`'s
/// output), for naming a report folder: `YYYY-MM-DD_HH-MM-SS`.
fn fs_stamp(iso_timestamp: &str) -> String {
    iso_timestamp.trim_end_matches('Z').replacen('T', "_", 1).replace(':', "-")
}

/// A filesystem-safe model name for a report folder: anything outside
/// alphanumerics/`-`/`_` becomes `_`, so an odd model name never breaks the path.
fn fs_safe(name: &str) -> String {
    let safe: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect();
    if safe.is_empty() {
        "untitled".to_string()
    } else {
        safe
    }
}

/// The default ledger root, `~/Documents/bert-lenses/runs/` — sibling to the
/// model library dir, but a distinct tree (a run report is not a model).
pub fn default_runs_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_default();
    PathBuf::from(home).join("Documents").join("bert-lenses").join("runs")
}

fn io_err(e: impl std::fmt::Display) -> std::io::Error {
    std::io::Error::other(e.to_string())
}

/// Append one summary line to `<dir>/ledger.jsonl`, creating `dir` on first
/// write. Failure here must never block or crash a run — callers log and
/// otherwise ignore the `Err`.
pub fn append_summary(dir: &Path, line: &LedgerLine) -> std::io::Result<()> {
    std::fs::create_dir_all(dir)?;
    let json = serde_json::to_string(line).map_err(io_err)?;
    let mut f = std::fs::OpenOptions::new().create(true).append(true).open(dir.join("ledger.jsonl"))?;
    writeln!(f, "{json}")
}

/// Write the full report (`report.md` + `report.json`) into
/// `<dir>/<timestamp>-<model>/`, creating both dirs as needed. Returns the
/// report folder's path on success.
pub fn write_full_report(dir: &Path, report: &FullReport) -> std::io::Result<PathBuf> {
    let run_dir = dir.join(format!(
        "{}-{}",
        fs_stamp(&report.summary.timestamp),
        fs_safe(&report.summary.model_name)
    ));
    std::fs::create_dir_all(&run_dir)?;
    let json = serde_json::to_string_pretty(report).map_err(io_err)?;
    std::fs::write(run_dir.join("report.json"), json)?;
    std::fs::write(run_dir.join("report.md"), render_markdown(report))?;
    Ok(run_dir)
}

/// Render the human-readable report — the same numbers as `report.json`, laid
/// out for reading rather than parsing.
fn render_markdown(report: &FullReport) -> String {
    let s = &report.summary;
    let mut out = String::new();
    out.push_str(&format!("# Run report — {}\n\n", s.model_name));
    out.push_str(&format!("- timestamp: {}\n", s.timestamp));
    out.push_str(&format!("- spec hash: {}\n", s.spec_hash));
    out.push_str(&format!("- Δt {}, T {} ({} ticks)\n", s.dt, s.t, s.ticks));
    out.push_str(&format!("- conservation residual: {:.4}\n", s.residual));
    out.push_str(&format!(
        "- identity-default: {} of {} components\n",
        s.identity_default_n, s.identity_default_m
    ));

    if !s.divergences.is_empty() {
        out.push_str("\n## Model vs reality\n\n");
        for d in &s.divergences {
            match d.divergence_pct {
                Some(pct) => out.push_str(&format!("- {} ({}): {pct:.1}% at horizon\n", d.element_name, d.kind)),
                None => out.push_str(&format!("- {} ({}): no overlapping horizon\n", d.element_name, d.kind)),
            }
        }
    }

    out.push_str("\n## Final levels\n\n");
    for (name, value) in &report.levels {
        out.push_str(&format!("- {name}: {value:.3}\n"));
    }

    out.push_str("\n## Trajectories\n\n");
    for (name, series) in &report.trajectories {
        let last = series.last().copied().unwrap_or(0.0);
        out.push_str(&format!("- {name}: {} points, final {last:.3}\n", series.len()));
    }

    if !report.comparisons.is_empty() {
        out.push_str("\n## Simulated vs actual\n\n");
        for c in &report.comparisons {
            match c.divergence_pct {
                Some(pct) => out.push_str(&format!("- {} ({}): {pct:.1}% divergence at horizon\n", c.element_name, c.kind)),
                None => out.push_str(&format!("- {} ({}): no overlapping horizon\n", c.element_name, c.kind)),
            }
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_line() -> LedgerLine {
        LedgerLine {
            timestamp: "2026-07-11T14:03:22Z".to_string(),
            model_name: "Water Tank".to_string(),
            spec_hash: "deadbeef".to_string(),
            dt: 0.1,
            t: 5.0,
            ticks: 50,
            residual: 0.0004,
            identity_default_n: 1,
            identity_default_m: 2,
            divergences: vec![DivergenceEntry {
                element_name: "Tank".to_string(),
                kind: "stock".to_string(),
                divergence_pct: Some(12.5),
            }],
        }
    }

    #[test]
    fn full_timestamp_is_iso_shaped() {
        let ts = full_timestamp();
        assert_ne!(ts, "unknown");
        assert_eq!(ts.len(), 20, "YYYY-MM-DDTHH:MM:SSZ is 20 chars: {ts}");
        assert!(ts.starts_with("20"), "sanity: current runs are in the 2000s: {ts}");
        assert!(ts.ends_with('Z'));
    }

    #[test]
    fn fs_stamp_strips_colons_and_z() {
        assert_eq!(fs_stamp("2026-07-11T14:03:22Z"), "2026-07-11_14-03-22");
    }

    #[test]
    fn fs_safe_sanitizes_odd_names() {
        assert_eq!(fs_safe("Water Tank / v2"), "Water_Tank___v2");
        assert_eq!(fs_safe(""), "untitled");
    }

    #[test]
    fn append_summary_writes_one_json_line_per_call() {
        let dir = std::env::temp_dir().join(format!("bert-lenses-ledger-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);

        append_summary(&dir, &sample_line()).expect("first append succeeds");
        append_summary(&dir, &sample_line()).expect("second append succeeds");

        let contents = std::fs::read_to_string(dir.join("ledger.jsonl")).unwrap();
        let lines: Vec<&str> = contents.lines().collect();
        assert_eq!(lines.len(), 2, "one JSON object per run: {contents}");
        let parsed: LedgerLine = serde_json::from_str(lines[0]).expect("each line is valid JSON");
        assert_eq!(parsed, sample_line());

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn write_full_report_creates_named_folder_with_both_files() {
        let dir = std::env::temp_dir().join(format!("bert-lenses-report-test-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);

        let report = FullReport {
            summary: sample_line(),
            levels: vec![("Tank".to_string(), 3.5)],
            trajectories: vec![("Tank".to_string(), vec![0.0, 1.0, 3.5])],
            comparisons: vec![ComparisonSeries {
                element_name: "Tank".to_string(),
                kind: "stock".to_string(),
                simulated: vec![0.0, 1.0, 3.5],
                actual: vec![0.0, 1.2, 4.0],
                divergence_pct: Some(12.5),
            }],
        };

        let run_dir = write_full_report(&dir, &report).expect("report writes");
        assert_eq!(run_dir, dir.join("2026-07-11_14-03-22-Water_Tank"));
        assert!(run_dir.join("report.json").is_file());
        assert!(run_dir.join("report.md").is_file());

        let json_txt = std::fs::read_to_string(run_dir.join("report.json")).unwrap();
        let round_tripped: FullReport = serde_json::from_str(&json_txt).unwrap();
        assert_eq!(round_tripped, report);

        let md_txt = std::fs::read_to_string(run_dir.join("report.md")).unwrap();
        assert!(md_txt.contains("Water Tank"));
        assert!(md_txt.contains("12.5% at horizon"));

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn append_summary_does_not_error_on_repeat_calls_to_same_dir() {
        // Sanity: append_dir creation is idempotent (create_dir_all on an
        // existing dir is not an error) — a second run's write never fails
        // merely because a first run already made the folder.
        let dir = std::env::temp_dir().join(format!("bert-lenses-ledger-idempotent-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        assert!(append_summary(&dir, &sample_line()).is_ok());
        let _ = std::fs::remove_dir_all(&dir);
    }
}
