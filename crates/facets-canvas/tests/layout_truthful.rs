//! The auto-layout must not make the picture assert falsehoods (#216, E1/E2).
//!
//! Layout is view state — but a drawing still makes claims. Two were false
//! across the shipped library:
//!
//! **E1 — env things drawn ON the Mobus membrane (24 models).** The kernel pins
//! `ENV_RADIUS = 320` while the face derives the membrane independently from
//! the component extent (`geometry.ts::componentRing`: bbox × √2 + RING_PAD).
//! For any spread of components the two collide, and an environment node sitting
//! on the membrane is a picture of `C ∩ E ≠ ∅` — the negation of the disjointness
//! every lens asserts. Measured centre-to-ellipse ran as low as 10px against a
//! 34px node radius.
//!
//! **E2 — two-component models collapse to a vertical line (12 models).** `ring()`
//! puts n=2 at −π/2 and +π/2: both at x = CENTER.0, the edge running through
//! both labels. Seven of nineteen corpus entries exist to hold composition fixed
//! and vary only the edges; the collapse draws every edge on one shared line.
//!
//! These tests replicate the FACE's membrane math (mirrored constants named
//! below) rather than calling the kernel's own layout helpers — an independent
//! derivation, so a shared bug cannot vacuously agree with itself.

use bert_canvas::canvas::{CanvasModel, Role};
use bert_canvas::sl::parse_sl;

/// Mirrors `web/src/canvas/style.ts` `nodeR` (34) and
/// `web/src/canvas/geometry.ts` `RING_PAD = NODE_R + 36`.
const NODE_R: f32 = 34.0;
const RING_PAD: f32 = NODE_R + 36.0;

/// `geometry.ts::componentRing`, transliterated.
fn component_ring(model: &CanvasModel) -> Option<(f32, f32, f32, f32)> {
    let comps: Vec<_> = model
        .things
        .iter()
        .filter(|t| t.role == Role::Component)
        .collect();
    if comps.is_empty() {
        return None;
    }
    let (min_x, max_x) = comps
        .iter()
        .fold((f32::MAX, f32::MIN), |(lo, hi), t| (lo.min(t.x), hi.max(t.x)));
    let (min_y, max_y) = comps
        .iter()
        .fold((f32::MAX, f32::MIN), |(lo, hi), t| (lo.min(t.y), hi.max(t.y)));
    Some((
        (min_x + max_x) / 2.0,
        (min_y + max_y) / 2.0,
        ((max_x - min_x) / 2.0) * std::f32::consts::SQRT_2 + RING_PAD,
        ((max_y - min_y) / 2.0) * std::f32::consts::SQRT_2 + RING_PAD,
    ))
}

/// `geometry.ts::ringPoint` — where the face puts the env thing's port.
fn ring_point(ring: (f32, f32, f32, f32), toward: (f32, f32)) -> (f32, f32) {
    let (cx, cy, rx, ry) = ring;
    let theta = ((toward.1 - cy) / ry).atan2((toward.0 - cx) / rx);
    (cx + rx * theta.cos(), cy + ry * theta.sin())
}

fn corpus() -> Vec<(String, CanvasModel)> {
    let root = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets");
    let mut out = Vec::new();
    for dir in ["corpus/klir", "corpus/bunge", "corpus/mobus", "examples"] {
        let mut entries: Vec<_> = std::fs::read_dir(format!("{root}/{dir}"))
            .unwrap_or_else(|e| panic!("{dir}: {e}"))
            .filter_map(Result::ok)
            .map(|e| e.path())
            .filter(|p| p.extension().is_some_and(|x| x == "sl"))
            .collect();
        entries.sort();
        for p in entries {
            let text = std::fs::read_to_string(&p).unwrap();
            if let Ok(m) = parse_sl(&text) {
                out.push((p.file_stem().unwrap().to_string_lossy().into_owned(), m));
            }
        }
    }
    assert!(out.len() > 20, "corpus walk found only {} models", out.len());
    out
}

/// Law (E1): every environment thing's BODY clears the membrane the face will
/// draw — its centre sits at least `NODE_R` outside its own port point. An env
/// node overlapping the membrane is a drawing of `C ∩ E ≠ ∅`.
#[test]
fn env_things_clear_the_membrane() {
    let mut offenders = Vec::new();
    for (name, model) in corpus() {
        let Some(ring) = component_ring(&model) else { continue };
        for t in model.things.iter().filter(|t| t.role == Role::Environment) {
            let port = ring_point(ring, (t.x, t.y));
            let d = ((t.x - port.0).powi(2) + (t.y - port.1).powi(2)).sqrt();
            // Outside-ness: the env centre must be farther from the ring centre
            // than its port, not merely distant from it.
            let (cx, cy, ..) = ring;
            let out = ((t.x - cx).powi(2) + (t.y - cy).powi(2))
                > ((port.0 - cx).powi(2) + (port.1 - cy).powi(2));
            if !out || d < NODE_R {
                offenders.push(format!("  {name}: `{}` is {d:.0}px from the membrane", t.name));
            }
        }
    }
    assert!(
        offenders.is_empty(),
        "{} env node(s) sit on or inside the Mobus membrane — the picture asserts \
         C ∩ E ≠ ∅:\n{}",
        offenders.len(),
        offenders.join("\n")
    );
}

/// Law (E2): two components are never stacked on one vertical line — the
/// sibling sets exist to show edge structure, and a collapsed axis draws every
/// edge through both labels.
#[test]
fn two_component_models_spread_horizontally() {
    let mut offenders = Vec::new();
    for (name, model) in corpus() {
        let comps: Vec<_> = model
            .things
            .iter()
            .filter(|t| t.role == Role::Component)
            .collect();
        if comps.len() != 2 {
            continue;
        }
        if (comps[0].x - comps[1].x).abs() < NODE_R {
            offenders.push(format!(
                "  {name}: `{}` and `{}` share x ≈ {:.0}",
                comps[0].name, comps[1].name, comps[0].x
            ));
        }
    }
    assert!(
        offenders.is_empty(),
        "{} two-component model(s) collapse to a vertical line:\n{}",
        offenders.len(),
        offenders.join("\n")
    );
}
