//! The CSV tether (bert-lenses#7/#13) — the reality interface. A model authored
//! on the canvas gains *quantitative supply* from an imported CSV: per-flow
//! magnitudes, per-component initial stocks, per-component parameters, and the
//! empirical time series those scalars summarise. Two things live here:
//!
//! 1. The **carry layer** ([`ImportedData`]) — the imported observations, keyed
//!    to the model elements they were mapped onto. This is Mobus's *empirical H*
//!    (ch 6 §6.5.1.5): captured history instrumented from the real system.
//!    Unlike a recorded run trace it is knowledge and persists — it saves with the
//!    canvas model, stamped with source filename + import date (contract §2). It
//!    is not projected into the executable spec as a series; instead it *supplies*
//!    the scalars ([`ModelParams`]) the projection reads, and it is retained whole
//!    for the simulated-vs-actual comparison (contract §3).
//!
//! 2. The **mapping surface** ([`MappingDraft`]) — the epistemic ritual disguised
//!    as an import wizard (contract §1). Each column is assigned a systems meaning
//!    (time / flow magnitude / stock level / parameter / ignore) and the draft
//!    cannot be finished until every column has been spoken for (T1), no
//!    flow-magnitude column is left without declared units (T2), and importing
//!    only writes data — never structure (T5).
//!
//! Force-vs-Flow is out of scope for v1: a mapped magnitude supplies a Flow
//! interaction's `amount`; the gradient/`conductance` (Force) path is a known
//! gap, documented on [`ModelParams`].

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// One imported column, retained whole: its source header, declared unit, and the
/// parsed observations in row order. Non-numeric or blank cells parse to `None`
/// (gaps are disclosed, never filled — contract §6).
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct ColumnSeries {
    /// The CSV column header this came from.
    pub column: String,
    /// The name of the model element it was mapped onto, kept beside the id so an
    /// orphaned series (element later deleted) can still name itself (T3).
    pub element_name: String,
    /// Declared unit. Required for a flow magnitude (T2); may be empty for a stock
    /// or parameter.
    pub unit: String,
    /// The observations, in row order. `None` = a blank/non-numeric cell.
    pub values: Vec<Option<f64>>,
}

impl ColumnSeries {
    /// The observations that parsed, in order — gaps dropped (disclosed elsewhere,
    /// never imputed).
    pub fn present(&self) -> Vec<f64> {
        self.values.iter().flatten().copied().collect()
    }

    /// The mean of the present observations — the representative constant a
    /// flow-magnitude or parameter column supplies when the projection needs a
    /// single number. `None` if the column is entirely blank.
    pub fn mean(&self) -> Option<f64> {
        let present = self.present();
        if present.is_empty() {
            return None;
        }
        Some(present.iter().sum::<f64>() / present.len() as f64)
    }

    /// The first present observation — a stock level's *initial* value at t0.
    pub fn first(&self) -> Option<f64> {
        self.present().into_iter().next()
    }
}

/// The carry layer: everything a CSV brought, keyed to the model elements it was
/// mapped onto. Persisted with the canvas [`crate::Model`] (empirical H, contract
/// §2), and the sole quantitative supply path in v1 (#13, tether-as-supply).
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
pub struct ImportedData {
    /// The source filename, stamped at import (provenance, contract §2).
    pub source_file: String,
    /// The import date `YYYY-MM-DD`, stamped at import.
    pub imported_at: String,
    /// The observation step: the real duration one row spans, inferred from the
    /// time column's spacing (overridable at import). Every empirical series is
    /// read at this Δt when overlaid against a run.
    pub dt: f64,
    /// The time column's values, if one was mapped (row order). Kept for the axis.
    #[serde(default)]
    pub time: Vec<Option<f64>>,
    /// Flow magnitude series, keyed by the mapped `Relation` id.
    #[serde(default)]
    pub flow_series: HashMap<u64, ColumnSeries>,
    /// Stock level series, keyed by the mapped component `Thing` id.
    #[serde(default)]
    pub stock_series: HashMap<u64, ColumnSeries>,
    /// Parameter series, keyed by the mapped component `Thing` id. A parameter is
    /// a constant (contract §1) — the series is retained for comparison, but only
    /// its mean supplies the transfer characteristic.
    #[serde(default)]
    pub param_series: HashMap<u64, ColumnSeries>,
}

impl ImportedData {
    /// Derive the scalar supply the executable projection reads. A flow magnitude
    /// supplies its Flow interaction's `amount` (mean of the column); a stock level
    /// supplies a component's initial storage (its first observation, the value at
    /// t0); a parameter supplies a cognitive param keyed by the source column name
    /// (mean). Absent data leaves a slot empty, and the projection falls back to
    /// its old default — so the `amount = ONE` default becomes a floor, not a
    /// ceiling.
    pub fn projection_params(&self) -> ModelParams {
        let mut params = ModelParams::default();
        for (rid, s) in &self.flow_series {
            if let Some(m) = s.mean() {
                params.flow_amount.insert(*rid, m);
            }
        }
        for (tid, s) in &self.stock_series {
            if let Some(v) = s.first() {
                params.stock_initial.insert(*tid, v);
            }
        }
        for (tid, s) in &self.param_series {
            if let Some(m) = s.mean() {
                params.component_param.insert(*tid, (s.column.clone(), m));
            }
        }
        params
    }

    /// Model element ids that carry imported data (for orphan detection on load /
    /// delete, T3): the union of every keyed relation and thing id.
    pub fn keyed_relation_ids(&self) -> Vec<u64> {
        self.flow_series.keys().copied().collect()
    }
    pub fn keyed_thing_ids(&self) -> Vec<u64> {
        self.stock_series
            .keys()
            .chain(self.param_series.keys())
            .copied()
            .collect()
    }
}

/// The scalar supply the projection injects: per-flow amount, per-component initial
/// storage, per-component `(param name, value)`. Empty by default, so a model with
/// no import projects exactly as before.
///
/// Known gap (Force-vs-Flow, v1): a magnitude only supplies a `Flow` interaction's
/// `amount`. The gradient path — a `Force` interaction's `conductance` — has no
/// mapping target yet; supplying it is deferred.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct ModelParams {
    /// Relation id → flow amount (per Δt).
    pub flow_amount: HashMap<u64, f64>,
    /// Component thing id → initial storage.
    pub stock_initial: HashMap<u64, f64>,
    /// Component thing id → (parameter name, value).
    pub component_param: HashMap<u64, (String, f64)>,
}

// ── The mapping surface (contract §1) ────────────────────────────────────────

/// What a column is assigned to mean. The target ids are resolved against the live
/// model (a `Relation` id for a flow, a `Thing` id for a component) so the draft
/// can render its translation sentence and, on finish, key the series.
#[derive(Clone, Debug, PartialEq)]
pub enum Assignment {
    /// Not yet spoken for — blocks finishing (T1).
    Unassigned,
    /// Explicitly dropped (shown, not silent — contract §1).
    Ignore,
    /// Supplies the observation Δt.
    Time,
    /// Supplies a flow's magnitude. `Some(relation_id)` once a target is chosen.
    FlowMagnitude(Option<u64>),
    /// Supplies a component's initial stock. `Some(thing_id)` once chosen.
    StockLevel(Option<u64>),
    /// Supplies a component's transfer parameter. `Some(thing_id)` once chosen.
    Parameter(Option<u64>),
}

impl Assignment {
    /// A column is *resolved* when it will not block the finish: ignored, time, or
    /// a role whose target has been chosen.
    pub fn resolved(&self) -> bool {
        match self {
            Assignment::Unassigned => false,
            Assignment::Ignore | Assignment::Time => true,
            Assignment::FlowMagnitude(t) | Assignment::StockLevel(t) | Assignment::Parameter(t) => {
                t.is_some()
            }
        }
    }

    /// The short role word for menus and disclosure.
    pub fn role_word(&self) -> &'static str {
        match self {
            Assignment::Unassigned => "unassigned",
            Assignment::Ignore => "ignore",
            Assignment::Time => "time",
            Assignment::FlowMagnitude(_) => "flow magnitude",
            Assignment::StockLevel(_) => "stock level",
            Assignment::Parameter(_) => "parameter",
        }
    }
}

/// A parsed CSV plus per-column assignments — the in-flight mapping. Pure data:
/// building and interrogating one never touches the canvas (T5).
#[derive(Clone, Debug)]
pub struct MappingDraft {
    pub source_file: String,
    pub headers: Vec<String>,
    /// Every data row (used to extract series on finish), as raw strings.
    pub rows: Vec<Vec<String>>,
    /// Per-column assignment, parallel to `headers`.
    pub assignments: Vec<Assignment>,
    /// Per-column declared unit, parallel to `headers` (only meaningful for a flow
    /// magnitude; T2 refuses an empty one).
    pub units: Vec<String>,
    /// The observation Δt: inferred from the time column, editable as text.
    pub dt_text: String,
}

/// A CSV parse error, named for the import failure message.
#[derive(Debug, PartialEq)]
pub enum CsvError {
    Empty,
    NoColumns,
}

/// Parse CSV text into headers + rows. Minimal by design (contract §6: csv only,
/// no heavyweight deps): comma-separated, optional double-quoted fields with `""`
/// escaping, trailing blank lines ignored. Rows are kept as raw strings; numeric
/// coercion happens per-column at series-extraction time so a non-numeric cell in
/// a text column never fails the whole import.
pub fn parse_csv(text: &str) -> Result<(Vec<String>, Vec<Vec<String>>), CsvError> {
    let mut lines = text.lines().filter(|l| !l.trim().is_empty());
    let header_line = lines.next().ok_or(CsvError::Empty)?;
    let headers = split_csv_line(header_line);
    if headers.is_empty() {
        return Err(CsvError::NoColumns);
    }
    let rows: Vec<Vec<String>> = lines.map(split_csv_line).collect();
    Ok((headers, rows))
}

/// Split one CSV line, honouring double-quoted fields (`"a,b"` is one field, `""`
/// is a literal quote).
fn split_csv_line(line: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut field = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '"' => {
                if in_quotes && chars.peek() == Some(&'"') {
                    field.push('"');
                    chars.next();
                } else {
                    in_quotes = !in_quotes;
                }
            }
            ',' if !in_quotes => {
                out.push(std::mem::take(&mut field).trim().to_string());
            }
            _ => field.push(c),
        }
    }
    out.push(field.trim().to_string());
    out
}

impl MappingDraft {
    /// Build a fresh draft from parsed CSV: every column starts `Unassigned`, and
    /// the Δt is inferred later from whichever column is marked `Time`.
    pub fn new(source_file: String, headers: Vec<String>, rows: Vec<Vec<String>>) -> Self {
        let n = headers.len();
        MappingDraft {
            source_file,
            headers,
            rows,
            assignments: vec![Assignment::Unassigned; n],
            units: vec![String::new(); n],
            dt_text: "1".to_string(),
        }
    }

    /// The first `n` rows, for the preview table.
    pub fn preview(&self, n: usize) -> &[Vec<String>] {
        &self.rows[..self.rows.len().min(n)]
    }

    /// The numeric values of column `col`, in row order (blank/non-numeric → None).
    pub fn column_values(&self, col: usize) -> Vec<Option<f64>> {
        self.rows
            .iter()
            .map(|r| r.get(col).and_then(|c| c.trim().parse::<f64>().ok()))
            .collect()
    }

    /// The index of the column marked `Time`, if any.
    pub fn time_col(&self) -> Option<usize> {
        self.assignments.iter().position(|a| *a == Assignment::Time)
    }

    /// Infer the observation Δt from the time column's spacing: the median gap
    /// between consecutive present timestamps. `None` if no time column, or fewer
    /// than two timestamps.
    pub fn inferred_dt(&self) -> Option<f64> {
        let col = self.time_col()?;
        let times: Vec<f64> = self.column_values(col).into_iter().flatten().collect();
        if times.len() < 2 {
            return None;
        }
        let mut gaps: Vec<f64> = times.windows(2).map(|w| (w[1] - w[0]).abs()).collect();
        gaps.retain(|g| *g > 0.0);
        if gaps.is_empty() {
            return None;
        }
        gaps.sort_by(|a, b| a.partial_cmp(b).unwrap());
        Some(gaps[gaps.len() / 2])
    }

    // ── T1: mapping-total ────────────────────────────────────────────────────

    /// Every column is spoken for (T1) — none left `Unassigned`, every role
    /// column has a chosen target.
    pub fn is_total(&self) -> bool {
        self.assignments.iter().all(Assignment::resolved)
    }

    // ── T2: no silent units ──────────────────────────────────────────────────

    /// A flow-magnitude column with no declared unit refuses, naming the column
    /// (T2). `Ok(())` when every magnitude has a unit.
    pub fn units_ok(&self) -> Result<(), String> {
        for (i, a) in self.assignments.iter().enumerate() {
            if matches!(a, Assignment::FlowMagnitude(_)) && self.units[i].trim().is_empty() {
                return Err(format!(
                    "column \"{}\" is a flow magnitude but declares no units — a magnitude \
                     without units can't be simulated",
                    self.headers[i]
                ));
            }
        }
        Ok(())
    }

    /// The finish is permitted iff the mapping is total (T1) and every magnitude
    /// has units (T2).
    pub fn can_finish(&self) -> bool {
        self.is_total() && self.units_ok().is_ok()
    }

    /// The live translation sentence for column `col`, in the contract's style, or
    /// `None` for an unassigned/ignored column with nothing to say. `name_of`
    /// resolves an element id to its display name.
    pub fn translation(&self, col: usize, name_of: &impl Fn(u64) -> String) -> Option<String> {
        let unit = self.units[col].trim();
        let unit_phrase = if unit.is_empty() {
            "unitless".to_string()
        } else {
            unit.to_string()
        };
        match &self.assignments[col] {
            Assignment::Unassigned => None,
            Assignment::Ignore => Some(format!("column \"{}\" will be ignored", self.headers[col])),
            Assignment::Time => Some(format!(
                "column \"{}\" supplies time — Δt = {} per row",
                self.headers[col], self.dt_text
            )),
            Assignment::FlowMagnitude(Some(id)) => Some(format!(
                "column \"{}\" will supply the flow magnitude for {} in {} per Δt={}",
                self.headers[col],
                name_of(*id),
                unit_phrase,
                self.dt_text
            )),
            Assignment::StockLevel(Some(id)) => Some(format!(
                "column \"{}\" will supply the initial stock for {}",
                self.headers[col],
                name_of(*id)
            )),
            Assignment::Parameter(Some(id)) => Some(format!(
                "column \"{}\" will parameterise {}",
                self.headers[col],
                name_of(*id)
            )),
            Assignment::FlowMagnitude(None)
            | Assignment::StockLevel(None)
            | Assignment::Parameter(None) => Some(format!(
                "column \"{}\" is a {} — choose which element it attaches to",
                self.headers[col],
                self.assignments[col].role_word()
            )),
        }
    }

    /// Commit the draft into an [`ImportedData`] (T5: reads only the draft, returns
    /// data — never a structural mutation). `name_of` resolves element ids to names
    /// for the orphan-safe stamp. Assumes [`can_finish`] (the caller gates on it).
    pub fn commit(&self, imported_at: String, name_of: &impl Fn(u64) -> String) -> ImportedData {
        let dt = self
            .dt_text
            .trim()
            .parse::<f64>()
            .unwrap_or(1.0)
            .max(f64::MIN_POSITIVE);
        let mut data = ImportedData {
            source_file: self.source_file.clone(),
            imported_at,
            dt,
            ..Default::default()
        };
        for (col, a) in self.assignments.iter().enumerate() {
            let series = |data_id: u64| ColumnSeries {
                column: self.headers[col].clone(),
                element_name: name_of(data_id),
                unit: self.units[col].trim().to_string(),
                values: self.column_values(col),
            };
            match a {
                Assignment::Time => data.time = self.column_values(col),
                Assignment::FlowMagnitude(Some(id)) => {
                    data.flow_series.insert(*id, series(*id));
                }
                Assignment::StockLevel(Some(id)) => {
                    data.stock_series.insert(*id, series(*id));
                }
                Assignment::Parameter(Some(id)) => {
                    data.param_series.insert(*id, series(*id));
                }
                _ => {}
            }
        }
        data
    }
}

/// Today as `YYYY-MM-DD` (UTC), computed from the wall clock with no date
/// dependency (Howard Hinnant's days-from-civil, inverted). Falls back to
/// `"unknown"` if the clock is before the epoch.
pub fn today_stamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let Ok(dur) = SystemTime::now().duration_since(UNIX_EPOCH) else {
        return "unknown".to_string();
    };
    let days = (dur.as_secs() / 86_400) as i64;
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

/// Days since 1970-01-01 → (year, month, day). Hinnant's algorithm. `pub(crate)`
/// so the run ledger (#15) can stamp full wall-clock timestamps without a second
/// copy of the date math.
pub(crate) fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = (if mp < 10 { mp + 3 } else { mp - 9 }) as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// A per-element comparison of a recorded run against imported empirical H
/// (contract §3): the simulated trace and the actual series on one axis, plus a
/// single divergence figure at the horizon. Built native-side from a run; kept
/// here so its shape and the divergence maths are unit-testable without egui.
#[derive(Clone, Debug, PartialEq)]
pub struct Comparison {
    pub element_name: String,
    /// "stock" / "flow" — what kind of element this reads.
    pub kind: &'static str,
    /// The simulated series (recorded trace, or a constant for a flow amount).
    pub simulated: Vec<f32>,
    /// The actual series (empirical H), gaps dropped.
    pub actual: Vec<f32>,
}

impl Comparison {
    /// Percent divergence at the horizon: `|sim − actual| / |actual|` at the last
    /// commonly-defined point, as a percentage. `None` if either series is empty;
    /// falls back to the absolute residual (as a percent of 1) when the actual
    /// endpoint is ~0, so a zero denominator never yields infinity.
    pub fn divergence_pct(&self) -> Option<f32> {
        let s = *self.simulated.last()?;
        let a = *self.actual.last()?;
        if a.abs() < 1e-9 {
            return Some((s - a).abs() * 100.0);
        }
        Some((s - a).abs() / a.abs() * 100.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn draft() -> MappingDraft {
        let (h, r) = parse_csv(
            "month,gpt_price,inventory,churn\n1,10,100,0.1\n2,8,120,0.12\n3,6,150,0.15\n",
        )
        .unwrap();
        MappingDraft::new("market.csv".into(), h, r)
    }

    #[test]
    fn parse_handles_quotes_and_blank_lines() {
        let (h, r) = parse_csv("a,b\n1,\"x,y\"\n\n2,z\n").unwrap();
        assert_eq!(h, vec!["a", "b"]);
        assert_eq!(r.len(), 2, "the blank line is dropped");
        assert_eq!(r[0], vec!["1", "x,y"], "the quoted comma stays one field");
    }

    #[test]
    fn parse_empty_refuses() {
        assert_eq!(parse_csv("   \n"), Err(CsvError::Empty));
    }

    // T1 — mapping-total.
    #[test]
    fn t1_finish_blocked_until_every_column_is_spoken_for() {
        let mut d = draft();
        assert!(!d.is_total(), "fresh draft has unassigned columns");
        d.assignments[0] = Assignment::Time;
        d.assignments[1] = Assignment::FlowMagnitude(Some(7));
        d.units[1] = "$/mo".into();
        d.assignments[2] = Assignment::StockLevel(Some(3));
        // churn still Unassigned → not total.
        assert!(!d.is_total());
        d.assignments[3] = Assignment::Ignore;
        assert!(d.is_total(), "every column now assigned or ignored");
        // A role column with no chosen target still blocks.
        d.assignments[2] = Assignment::StockLevel(None);
        assert!(!d.is_total(), "an unresolved target blocks the finish");
    }

    // T2 — no silent units.
    #[test]
    fn t2_flow_magnitude_without_units_refuses_and_names_the_column() {
        let mut d = draft();
        d.assignments[1] = Assignment::FlowMagnitude(Some(7));
        let err = d.units_ok().unwrap_err();
        assert!(
            err.contains("gpt_price"),
            "the refusal names the flow column"
        );
        assert!(!d.can_finish(), "no units ⇒ cannot finish even if total");
        d.units[1] = "$/mo".into();
        assert!(d.units_ok().is_ok(), "declaring units clears T2");
    }

    // T5 — import is pure: commit only reads the draft and yields data.
    #[test]
    fn t5_commit_yields_only_data_keyed_to_targets() {
        let mut d = draft();
        d.assignments[0] = Assignment::Time;
        d.assignments[1] = Assignment::FlowMagnitude(Some(7));
        d.units[1] = "$/mo".into();
        d.assignments[2] = Assignment::StockLevel(Some(3));
        d.assignments[3] = Assignment::Ignore;
        assert!(d.can_finish());
        let name_of = |id: u64| format!("elem-{id}");
        let data = d.commit("2026-07-11".into(), &name_of);
        assert_eq!(data.source_file, "market.csv");
        assert_eq!(data.imported_at, "2026-07-11");
        assert_eq!(data.flow_series.len(), 1);
        assert_eq!(data.stock_series.len(), 1);
        assert!(
            data.param_series.is_empty(),
            "ignored column carries nothing"
        );
        assert_eq!(data.flow_series[&7].unit, "$/mo");
        assert_eq!(data.flow_series[&7].element_name, "elem-7");
        assert_eq!(data.time.len(), 3, "the time column is retained");
    }

    #[test]
    fn projection_params_supply_mean_amount_and_initial_stock() {
        let mut d = draft();
        d.assignments[1] = Assignment::FlowMagnitude(Some(7));
        d.units[1] = "$/mo".into();
        d.assignments[2] = Assignment::StockLevel(Some(3));
        d.assignments[0] = Assignment::Ignore;
        d.assignments[3] = Assignment::Ignore;
        let data = d.commit("2026-07-11".into(), &|id| format!("e{id}"));
        let params = data.projection_params();
        // gpt_price mean = (10+8+6)/3 = 8.
        assert!((params.flow_amount[&7] - 8.0).abs() < 1e-9);
        // inventory first = 100 (initial stock at t0).
        assert!((params.stock_initial[&3] - 100.0).abs() < 1e-9);
    }

    #[test]
    fn inferred_dt_is_the_median_spacing() {
        let mut d = draft();
        d.assignments[0] = Assignment::Time;
        assert_eq!(d.inferred_dt(), Some(1.0), "months spaced by 1");
    }

    #[test]
    fn demo_csv_maps_and_supplies_the_acceptance_path() {
        // The shipped acceptance file parses, maps total, and supplies the numbers
        // the projection reads — end to end, minus the GUI gestures.
        let (headers, rows) = parse_csv(include_str!("../examples/llm-market-demo.csv")).unwrap();
        assert_eq!(
            headers,
            [
                "month",
                "frontier_output",
                "open_output",
                "market_inventory",
                "adoption_rate"
            ]
        );
        assert_eq!(rows.len(), 8, "eight months of demo observations");
        let mut d = MappingDraft::new("llm-market-demo.csv".into(), headers, rows);
        d.assignments[0] = Assignment::Time;
        d.assignments[1] = Assignment::FlowMagnitude(Some(11)); // frontier flow
        d.units[1] = "Mtok/mo".into();
        d.assignments[2] = Assignment::FlowMagnitude(Some(12)); // open flow
        d.units[2] = "Mtok/mo".into();
        d.assignments[3] = Assignment::StockLevel(Some(3)); // market component
        d.assignments[4] = Assignment::Parameter(Some(3)); // market parameter
        assert!(d.can_finish(), "every column spoken for, units declared");
        assert_eq!(d.inferred_dt(), Some(1.0), "months spaced by 1");
        let data = d.commit("2026-07-11".into(), &|id| format!("e{id}"));
        let params = data.projection_params();
        assert_eq!(params.flow_amount.len(), 2, "two flows supplied");
        assert_eq!(params.stock_initial[&3], 200.0, "initial inventory at t0");
        assert!(
            params.component_param.contains_key(&3),
            "the market is parameterised"
        );
    }

    #[test]
    fn divergence_pct_at_horizon() {
        let c = Comparison {
            element_name: "Market".into(),
            kind: "stock",
            simulated: vec![100.0, 100.0, 100.0],
            actual: vec![100.0, 120.0, 150.0],
        };
        // |100 - 150| / 150 = 33.3%.
        assert!((c.divergence_pct().unwrap() - 33.333).abs() < 0.01);
    }
}
