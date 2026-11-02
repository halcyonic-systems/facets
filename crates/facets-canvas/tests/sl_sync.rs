//! Text and model agreement (2026-11-02 walk): the SL pane and the canvas are
//! two views of one model, and `sync_sl` is how a canvas edit reaches the
//! text. Three laws, held over every `.sl` file under `assets/` and a set of
//! canvas-style edits, so a new fixture is covered without touching this file:
//!
//! 1. After a sync the text means what the model means (`sl_agreement`).
//! 2. A sync never drops a comment line.
//! 3. A text that already agrees comes back byte for byte.

use std::fs;
use std::path::{Path, PathBuf};
use std::str::FromStr;

use facets_canvas::canvas::{CanvasModel, Role};
use facets_canvas::sl::{emit_sl, parse_sl, sl_agreement, sync_sl};
use facets_core::rust_decimal::Decimal;

fn all_sl_files() -> Vec<PathBuf> {
    fn walk(dir: &Path, out: &mut Vec<PathBuf>) {
        for entry in fs::read_dir(dir).unwrap_or_else(|e| panic!("{}: {e}", dir.display())) {
            let path = entry.unwrap().path();
            if path.is_dir() {
                walk(&path, out);
            } else if path.extension().is_some_and(|x| x == "sl") {
                out.push(path);
            }
        }
    }
    let mut out = Vec::new();
    walk(&Path::new(env!("CARGO_MANIFEST_DIR")).join("../../assets"), &mut out);
    out.sort();
    out
}

fn comments(text: &str) -> Vec<String> {
    let mut v: Vec<String> = text
        .lines()
        .filter_map(|l| l.find('#').map(|i| l[i..].trim_end().to_string()))
        .filter(|c| !c.is_empty())
        .collect();
    v.sort();
    v
}

/// Every comment in `before` is still in `after` (as a multiset).
fn keeps_comments(before: &str, after: &str) -> Result<(), String> {
    let mut have = comments(after);
    for c in comments(before) {
        match have.iter().position(|h| h.contains(c.as_str()) || c.contains(h.as_str())) {
            Some(i) => {
                have.remove(i);
            }
            None => return Err(format!("lost comment: {c}")),
        }
    }
    Ok(())
}

/// Canvas-style edits: what a drag, a knob, a stamp, a delete and a rename do
/// to the model. Ids for new things come from past the end, as the canvas
/// mints them, so the re-keying by name is exercised.
fn edits(m: &CanvasModel) -> Vec<(&'static str, CanvasModel)> {
    let mut out = Vec::new();
    if let Some(t) = m.things.first() {
        let mut e = m.clone();
        e.things[0].x += 37.0;
        e.things[0].y -= 11.0;
        out.push(("drag", e));
        let mut e = m.clone();
        let name = format!("{}_renamed", t.name.replace(' ', "_"));
        e.things[0].name = name;
        out.push(("rename", e));
        let mut e = m.clone();
        let next = m.things.iter().map(|t| t.id).max().unwrap_or(0) + 100;
        let mut added = t.clone();
        added.id = next;
        added.name = "Added_by_canvas".into();
        added.role = Role::Component;
        added.child_model = None;
        added.x += 50.0;
        e.things.push(added);
        out.push(("add a thing", e));
    }
    if let Some(i) = m.relations.iter().position(|r| r.is_bond && r.amount.is_none() && !r.ample) {
        let mut e = m.clone();
        e.relations[i].amount = Some(Decimal::from_str("3").unwrap());
        out.push(("set an amount", e));
    }
    if !m.relations.is_empty() {
        let mut e = m.clone();
        e.relations.pop();
        out.push(("delete a flow", e));
    }
    out
}

#[test]
fn a_synced_text_means_the_model_and_keeps_every_comment() {
    let mut checked = 0;
    for path in all_sl_files() {
        let text = fs::read_to_string(&path).unwrap();
        let Ok(model) = parse_sl(&text) else { continue };
        if emit_sl(&model).is_err() {
            continue;
        }
        for (what, edited) in edits(&model) {
            // An edit SL cannot write down is out of scope: one whose emit
            // refuses, or whose canonical text does not parse back (deleting
            // an agent's command wire leaves an agent line with nothing to
            // manage, a model no text can say).
            match emit_sl(&edited) {
                Ok(t) if parse_sl(&t).is_ok() => {}
                _ => continue,
            }
            let synced = sync_sl(&text, &edited)
                .unwrap_or_else(|e| panic!("{} / {what}: sync failed: {e}", path.display()));
            let agreement = sl_agreement(&synced, &edited).unwrap();
            assert!(
                agreement.agrees,
                "{} / {what}: the synced text does not mean the model\nonly in text: {:?}\nonly in model: {:?}\n{synced}",
                path.display(),
                agreement.only_in_text,
                agreement.only_in_model
            );
            if let Err(e) = keeps_comments(&text, &synced) {
                panic!("{} / {what}: {e}\n{synced}", path.display());
            }
            checked += 1;
        }
    }
    assert!(checked > 20, "too few corpus edits checked ({checked}): is assets/ empty?");
}

#[test]
fn a_text_that_already_agrees_comes_back_unchanged() {
    for path in all_sl_files() {
        let text = fs::read_to_string(&path).unwrap();
        let Ok(model) = parse_sl(&text) else { continue };
        if emit_sl(&model).is_err() {
            continue;
        }
        assert_eq!(sync_sl(&text, &model).unwrap(), text, "{}: an agreeing text was rewritten", path.display());
    }
}

const SMALL: &str = "# the walk's model\ncomponent T1 primitive Buffering interface\n# where it comes from\nenvironment E5\nenvironment E6\nflow E5 -> T1 : matter  # the inflow\nflow T1 -> E6 : matter\n";

#[test]
fn agreement_ignores_layout_and_lens_but_not_meaning() {
    let m = parse_sl(SMALL).unwrap();
    let mut moved = m.clone();
    moved.things[0].x += 100.0;
    moved.system_pos = Some([4.0, 2.0]);
    moved.lens = facets_canvas::canvas::Lens::Bunge;
    assert!(sl_agreement(SMALL, &moved).unwrap().agrees, "layout and lens are not meaning");

    let mut rate = m.clone();
    rate.relations[0].amount = Some(Decimal::from_str("3").unwrap());
    let a = sl_agreement(SMALL, &rate).unwrap();
    assert!(!a.agrees);
    assert_eq!(a.only_in_model, vec!["flow E5 -> T1 : matter amount 3".to_string()], "{a:?}");
    assert_eq!(a.only_in_text, vec!["flow E5 -> T1 : matter".to_string()], "{a:?}");
}

/// The walk's case: a knob sets a rate, and the text says so, with the
/// author's comments where they were.
#[test]
fn a_rate_set_on_the_canvas_reaches_the_text() {
    let mut m = parse_sl(SMALL).unwrap();
    m.relations[0].amount = Some(Decimal::from_str("3").unwrap());
    let synced = sync_sl(SMALL, &m).unwrap();
    assert!(synced.contains("flow E5 -> T1 : matter amount 3  # the inflow"), "{synced}");
    assert!(synced.contains("# where it comes from\nenvironment E5"), "{synced}");
    assert!(synced.starts_with("# the walk's model\n"), "{synced}");
}

#[test]
fn a_faulted_text_is_never_rewritten() {
    let m = parse_sl(SMALL).unwrap();
    assert!(sync_sl("component T1 primitive Nonsense\nflow", &m).is_err());
}

#[test]
fn positions_follow_only_where_the_text_pins_them() {
    // Unpinned text: a drag leaves it alone.
    let mut m = parse_sl(SMALL).unwrap();
    m.things[0].x += 40.0;
    assert_eq!(sync_sl(SMALL, &m).unwrap(), SMALL);
    // Pinned text: the drag is written, and nothing else moves.
    let pinned = format!("{SMALL}\n@pos T1 0 0\n");
    let mut m = parse_sl(&pinned).unwrap();
    m.things[0].x = 40.0;
    let synced = sync_sl(&pinned, &m).unwrap();
    assert!(synced.contains("@pos T1 40 0"), "{synced}");
    assert!(synced.starts_with(SMALL), "{synced}");
}

#[test]
fn an_empty_text_takes_the_canonical_form() {
    let m = parse_sl(SMALL).unwrap();
    assert_eq!(sync_sl("  \n", &m).unwrap(), emit_sl(&m).unwrap());
}
