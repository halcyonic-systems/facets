//! The run manifest (bert-lenses#38): a declarative record of everything that
//! determines a run — model, data, the column mapping, Δt/T. The wizard is where
//! meaning gets assigned, once; the manifest is that meaning serialized, so the
//! mechanics (re-import after a rebuild, re-runs, sweeps) never re-extract it
//! from a human.
//!
//! The manifest never bypasses the epistemic ritual — it compiles onto the SAME
//! [`MappingDraft`] the wizard drives, so T1 (every column spoken for), T2 (no
//! silent units), and T4 (no long-format panels) refuse a headless run exactly
//! as they refuse an interactive one. There is deliberately no second mapping
//! or projection logic here: resolution produces `Assignment`s, and everything
//! downstream (commit, projection, gates, ledger) is the one existing path.
//!
//! Elements are referenced by NAME (domain terms, not internal ids — manifests
//! are human-readable artifacts). Resolution against the live model is strict:
//! an unknown or ambiguous name is an error that lists the candidates, never a
//! silent misbind.

use crate::tether::{Assignment, MappingDraft};
use serde::{Deserialize, Serialize};

/// Everything that determines a run. `model` and `data` are paths — absolute,
/// or relative to the manifest's own directory, or relative to the model
/// library root (tried in that order by the runner).
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct RunManifest {
    /// Path to the model JSON.
    pub model: String,
    /// Path to the CSV.
    pub data: String,
    /// One entry per CSV column. T1 requires the manifest to speak for EVERY
    /// column — ignores are explicit, exactly as in the wizard.
    pub mapping: Vec<ColumnMapping>,
    /// Observation step. Omitted = inferred from the time column's spacing,
    /// the same inference the wizard offers.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dt: Option<f64>,
    /// Run horizon T (ticks = round(T / Δt)).
    pub t: f64,
}

/// One column's assigned systems meaning — the manifest form of [`Assignment`].
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ColumnMapping {
    /// The CSV column header.
    pub column: String,
    /// The role: what this column means to the model.
    #[serde(rename = "as")]
    pub role: Role,
    /// The model element the column attaches to, by display name (a flow's
    /// label for `flow`, a component's name for `stock`/`param`). Required for
    /// those roles; meaningless for `time`/`ignore`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub element: Option<String>,
    /// Declared unit. T2 requires one for every `flow` column.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub unit: Option<String>,
    /// Series forcing (bert-lenses#16): a `flow` column with `"force": true`
    /// EMITS its observed series tick by tick instead of being collapsed to a
    /// mean — the boundary answers to `o_Src(t)` (Mobus ch6 §6.6.2.3). Only
    /// meaningful on a `flow` role; ignored elsewhere. Omitted = false, so
    /// every existing manifest keeps its mean-collapse behavior unchanged.
    #[serde(default, skip_serializing_if = "std::ops::Not::not")]
    pub force: bool,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    Time,
    Ignore,
    Flow,
    Stock,
    Param,
}

/// The name→id tables resolution runs against, built by the caller from the
/// live model (flow labels for bond relations, component names for things).
/// Kept as plain pairs so this module stays free of canvas types, the same
/// decoupling the tether uses.
pub struct ResolveCtx<'a> {
    pub flows: &'a [(u64, String)],
    pub components: &'a [(u64, String)],
}

/// Find `name` in a table; `kind` names the element class in errors.
fn resolve_name(name: &str, table: &[(u64, String)], kind: &str) -> Result<u64, String> {
    let matches: Vec<u64> = table
        .iter()
        .filter(|(_, n)| n.trim() == name.trim())
        .map(|(id, _)| *id)
        .collect();
    match matches.len() {
        1 => Ok(matches[0]),
        0 => {
            let mut known: Vec<&str> = table.iter().map(|(_, n)| n.as_str()).collect();
            known.sort_unstable();
            Err(format!(
                "no {kind} named \"{name}\" in the model — known: {}",
                known.join(" · ")
            ))
        }
        n => Err(format!(
            "\"{name}\" names {n} different {kind}s — rename them apart before a manifest can bind"
        )),
    }
}

impl RunManifest {
    /// Compile the manifest's mapping onto a fresh draft for the manifest's CSV.
    /// On success the draft carries exactly the assignments/units the wizard
    /// would have produced; the caller then runs the SAME gates
    /// (`is_total`/`units_ok`/`time_unique_ok`) and the same `commit`. Errors
    /// accumulate — a bad manifest reports everything wrong at once.
    pub fn apply_to_draft(
        &self,
        draft: &mut MappingDraft,
        ctx: &ResolveCtx,
    ) -> Result<(), Vec<String>> {
        let mut errors: Vec<String> = Vec::new();

        // Every manifest entry must name a real CSV column, once.
        for m in &self.mapping {
            let count = draft.headers.iter().filter(|h| **h == m.column).count();
            match count {
                1 => {}
                0 => errors.push(format!(
                    "manifest maps column \"{}\" but the CSV has no such header",
                    m.column
                )),
                _ => errors.push(format!(
                    "the CSV header \"{}\" appears {count} times — ambiguous",
                    m.column
                )),
            }
            if self.mapping.iter().filter(|o| o.column == m.column).count() > 1
                && !errors
                    .iter()
                    .any(|e| e.contains("more than once") && e.contains(&m.column))
            {
                errors.push(format!(
                    "manifest maps column \"{}\" more than once",
                    m.column
                ));
            }
        }
        // T1, stated at manifest level: every CSV column must be spoken for.
        for h in &draft.headers {
            if !self.mapping.iter().any(|m| m.column == *h) {
                errors.push(format!(
                    "CSV column \"{h}\" is not in the manifest — every column must be spoken \
                     for (map it, or mark it \"ignore\" explicitly)"
                ));
            }
        }

        for m in &self.mapping {
            let Some(col) = draft.headers.iter().position(|h| *h == m.column) else {
                continue; // already reported above
            };
            let assignment = match m.role {
                Role::Time => Ok(Assignment::Time),
                Role::Ignore => Ok(Assignment::Ignore),
                Role::Flow => match &m.element {
                    Some(name) => resolve_name(name, ctx.flows, "flow")
                        .map(|id| Assignment::FlowMagnitude(Some(id))),
                    None => Err(format!(
                        "column \"{}\" is a flow but names no element",
                        m.column
                    )),
                },
                Role::Stock => match &m.element {
                    Some(name) => resolve_name(name, ctx.components, "component")
                        .map(|id| Assignment::StockLevel(Some(id))),
                    None => Err(format!(
                        "column \"{}\" is a stock but names no element",
                        m.column
                    )),
                },
                Role::Param => match &m.element {
                    Some(name) => resolve_name(name, ctx.components, "component")
                        .map(|id| Assignment::Parameter(Some(id))),
                    None => Err(format!(
                        "column \"{}\" is a param but names no element",
                        m.column
                    )),
                },
            };
            match assignment {
                Ok(a) => {
                    draft.assignments[col] = a;
                    if let Some(u) = &m.unit {
                        draft.units[col] = u.clone();
                    }
                    // Restore the force flag so commit() reproduces the forced set —
                    // one path for both the wizard and a loaded manifest (#16).
                    if col < draft.forced.len() {
                        draft.forced[col] = m.force && m.role == Role::Flow;
                    }
                }
                Err(e) => errors.push(e),
            }
        }

        // Δt: explicit wins; else the wizard's own inference from the time column.
        if let Some(dt) = self.dt {
            draft.dt_text = dt.to_string();
        } else if let Some(dt) = draft.inferred_dt() {
            draft.dt_text = dt.to_string();
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    /// The inverse: serialize a finished draft back into a manifest, so the
    /// wizard's one deliberate mapping ritual can be saved and replayed
    /// (the #37 "mapping rides with the model" half of #38). `label_of`
    /// resolves an element id to the display name resolution will look up.
    pub fn from_draft(
        draft: &MappingDraft,
        model: String,
        data: String,
        t: f64,
        label_of: &impl Fn(u64) -> String,
    ) -> RunManifest {
        let mapping = draft
            .headers
            .iter()
            .enumerate()
            .map(|(i, h)| {
                let (role, element) = match &draft.assignments[i] {
                    Assignment::Time => (Role::Time, None),
                    Assignment::FlowMagnitude(Some(id)) => (Role::Flow, Some(label_of(*id))),
                    Assignment::StockLevel(Some(id)) => (Role::Stock, Some(label_of(*id))),
                    Assignment::Parameter(Some(id)) => (Role::Param, Some(label_of(*id))),
                    // Unresolved/unassigned columns serialize as ignore — but a
                    // finished draft (the only kind saved) has none (T1).
                    _ => (Role::Ignore, None),
                };
                let unit = draft.units[i].trim();
                ColumnMapping {
                    column: h.clone(),
                    role,
                    element,
                    unit: (!unit.is_empty()).then(|| unit.to_string()),
                    // Carry the wizard's force choice, so a saved manifest re-runs
                    // exactly what was authored (#16, wizard force toggle).
                    force: matches!(role, Role::Flow) && draft.forced.get(i).copied().unwrap_or(false),
                }
            })
            .collect();
        RunManifest {
            model,
            data,
            mapping,
            dt: draft.dt_text.trim().parse::<f64>().ok(),
            t,
        }
    }
}

/// A stable fingerprint of the manifest file's exact bytes, stamped into the
/// run ledger's provenance — the key that makes a ledger line re-executable
/// (#38 invariant 3: `ledger line → manifest → rerun`).
pub fn manifest_hash(raw: &str) -> String {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    raw.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tether::parse_csv;

    const CSV: &str = "month,anthropic_tok,label\n1,100,a\n2,200,b\n3,300,c\n";

    /// (flows, components) name tables, the shape `ResolveCtx` borrows.
    type Tables = (Vec<(u64, String)>, Vec<(u64, String)>);

    fn ctx() -> Tables {
        (
            vec![
                (10, "Anthropic tokens routed".into()),
                (11, "OpenAI tokens routed".into()),
            ],
            vec![(6, "Developer channel".into())],
        )
    }

    fn manifest() -> RunManifest {
        RunManifest {
            model: "m.json".into(),
            data: "d.csv".into(),
            mapping: vec![
                ColumnMapping {
                    column: "month".into(),
                    role: Role::Time,
                    element: None,
                    unit: None,
                    force: false,
                },
                ColumnMapping {
                    column: "anthropic_tok".into(),
                    role: Role::Flow,
                    element: Some("Anthropic tokens routed".into()),
                    unit: Some("tok/mo".into()),
                    force: false,
                },
                ColumnMapping {
                    column: "label".into(),
                    role: Role::Ignore,
                    element: None,
                    unit: None,
                    force: false,
                },
            ],
            dt: None,
            t: 3.0,
        }
    }

    /// #38 invariant 1, the identity fixture: a manifest and the hand-driven
    /// wizard produce byte-identical ImportedData for the same CSV + meaning.
    /// One projection path — nothing to drift.
    #[test]
    fn manifest_and_wizard_produce_identical_imported_data() {
        let (flows, comps) = ctx();
        let name_of = |id: u64| {
            flows
                .iter()
                .chain(comps.iter())
                .find(|(i, _)| *i == id)
                .map(|(_, n)| n.clone())
                .unwrap_or_default()
        };

        // The wizard path: assignments set by hand.
        let (h, r) = parse_csv(CSV).unwrap();
        let mut wizard = MappingDraft::new("d.csv".into(), h, r);
        wizard.assignments[0] = Assignment::Time;
        wizard.assignments[1] = Assignment::FlowMagnitude(Some(10));
        wizard.units[1] = "tok/mo".into();
        wizard.assignments[2] = Assignment::Ignore;
        wizard.dt_text = "1".into();
        assert!(wizard.can_finish());
        let via_wizard = wizard.commit("2026-07-13".into(), &name_of);

        // The manifest path: the same meaning, declared.
        let (h, r) = parse_csv(CSV).unwrap();
        let mut headless = MappingDraft::new("d.csv".into(), h, r);
        manifest()
            .apply_to_draft(
                &mut headless,
                &ResolveCtx {
                    flows: &flows,
                    components: &comps,
                },
            )
            .expect("manifest applies");
        assert!(headless.can_finish(), "the same gates pass");
        let via_manifest = headless.commit("2026-07-13".into(), &name_of);

        assert_eq!(
            via_wizard, via_manifest,
            "one projection path (#38 invariant 1)"
        );
    }

    /// Gates are gates everywhere (#38 invariant 2): the manifest compiles onto
    /// the draft, and T2 refuses a unitless flow exactly as the wizard does.
    #[test]
    fn gates_refuse_headless_exactly_as_interactively() {
        let (flows, comps) = ctx();
        let mut m = manifest();
        m.mapping[1].unit = None; // strip the flow's unit
        let (h, r) = parse_csv(CSV).unwrap();
        let mut draft = MappingDraft::new("d.csv".into(), h, r);
        m.apply_to_draft(
            &mut draft,
            &ResolveCtx {
                flows: &flows,
                components: &comps,
            },
        )
        .expect("resolution itself succeeds");
        assert!(draft.is_total(), "T1 passes");
        assert!(
            draft.units_ok().is_err(),
            "T2 refuses — same gate, same message path"
        );
        assert!(!draft.can_finish());
    }

    #[test]
    fn unknown_element_is_a_loud_error_naming_candidates() {
        let (flows, comps) = ctx();
        let mut m = manifest();
        m.mapping[1].element = Some("Anthropic tokens route".into()); // typo
        let (h, r) = parse_csv(CSV).unwrap();
        let mut draft = MappingDraft::new("d.csv".into(), h, r);
        let errs = m
            .apply_to_draft(
                &mut draft,
                &ResolveCtx {
                    flows: &flows,
                    components: &comps,
                },
            )
            .unwrap_err();
        assert!(errs[0].contains("no flow named"), "{errs:?}");
        assert!(
            errs[0].contains("Anthropic tokens routed"),
            "candidates listed: {errs:?}"
        );
    }

    #[test]
    fn unmapped_csv_column_is_a_t1_error() {
        let (flows, comps) = ctx();
        let mut m = manifest();
        m.mapping.pop(); // drop the "label" entry
        let (h, r) = parse_csv(CSV).unwrap();
        let mut draft = MappingDraft::new("d.csv".into(), h, r);
        let errs = m
            .apply_to_draft(
                &mut draft,
                &ResolveCtx {
                    flows: &flows,
                    components: &comps,
                },
            )
            .unwrap_err();
        assert!(errs[0].contains("\"label\""), "{errs:?}");
        assert!(errs[0].contains("ignore"), "the fix is named: {errs:?}");
    }

    /// Round-trip: a finished draft serializes to a manifest that re-applies to
    /// an identical draft — the wizard-save half of #38 (subsumes #37).
    #[test]
    fn from_draft_round_trips() {
        let (flows, comps) = ctx();
        let label_of = |id: u64| {
            flows
                .iter()
                .chain(comps.iter())
                .find(|(i, _)| *i == id)
                .map(|(_, n)| n.clone())
                .unwrap_or_default()
        };
        let (h, r) = parse_csv(CSV).unwrap();
        let mut wizard = MappingDraft::new("d.csv".into(), h, r);
        wizard.assignments[0] = Assignment::Time;
        wizard.assignments[1] = Assignment::FlowMagnitude(Some(10));
        wizard.units[1] = "tok/mo".into();
        wizard.forced[1] = true; // the wizard's force toggle (#16)
        wizard.assignments[2] = Assignment::Ignore;
        let saved =
            RunManifest::from_draft(&wizard, "m.json".into(), "d.csv".into(), 3.0, &label_of);
        assert!(
            saved.mapping[1].force,
            "the wizard's force choice is saved into the manifest"
        );

        let (h, r) = parse_csv(CSV).unwrap();
        let mut replay = MappingDraft::new("d.csv".into(), h, r);
        saved
            .apply_to_draft(
                &mut replay,
                &ResolveCtx {
                    flows: &flows,
                    components: &comps,
                },
            )
            .expect("saved manifest re-applies");
        assert_eq!(replay.assignments, wizard.assignments);
        assert_eq!(replay.units, wizard.units);
        assert_eq!(replay.forced, wizard.forced, "force round-trips: wizard → manifest → draft");
    }

    #[test]
    fn manifest_json_shape_is_human_authorable() {
        let json = r#"{
            "model": "technical/llm-market-target4.json",
            "data": "data/target4_dev_wide.csv",
            "mapping": [
                {"column": "month_index", "as": "time"},
                {"column": "anthropic_tok", "as": "flow", "element": "Anthropic tokens routed", "unit": "tok/mo"}
            ],
            "t": 18
        }"#;
        let m: RunManifest = serde_json::from_str(json).expect("the documented shape parses");
        assert_eq!(m.mapping[0].role, Role::Time);
        assert_eq!(m.dt, None, "dt omitted = inferred");
        assert_eq!(m.t, 18.0);
    }
}
