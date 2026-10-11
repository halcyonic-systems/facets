//! The auto-layout reads the flows (#399).
//!
//! Declaration order is the order an author (or a drafter) happened to type
//! things in. Placing the ring by it alone drew a ten-component model as a
//! tangle: labels overprinting at a fixed radius, and crossings that were an
//! artifact of typing order rather than of the system. These tests hold the
//! replacement to what it claims — and measure "before" independently, by
//! re-seating the components in declaration order on the ring the layout
//! chose, rather than by asking the layout what it would have done.

use bert_canvas::canvas::{CanvasModel, Role, Thing};
use bert_canvas::sl::parse_sl;

const CENTER: (f32, f32) = (480.0, 320.0);
/// Mirrors `web/src/canvas/style.ts` `nodeR`.
const NODE_R: f32 = 34.0;
/// The chord the component ring promises its neighbours (`sl.rs` MIN_CHORD).
const LABEL_SAFE_CHORD: f32 = 140.0;

fn data_center() -> String {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/layout/data-center.sl");
    std::fs::read_to_string(path).unwrap()
}

fn at(model: &CanvasModel, id: u64) -> (f32, f32) {
    let t = model.things.iter().find(|t| t.id == id).unwrap();
    (t.x, t.y)
}

/// Proper crossings between drawn flows, centre to centre — the straight wire
/// `geometry.ts::edgeGeometry` draws. Wires sharing an endpoint never count.
fn crossings(model: &CanvasModel) -> usize {
    let orient = |p: (f32, f32), q: (f32, f32), r: (f32, f32)| {
        (q.0 - p.0) * (r.1 - p.1) - (q.1 - p.1) * (r.0 - p.0)
    };
    let wires: Vec<(u64, u64)> = model
        .relations
        .iter()
        .filter(|r| r.a != r.b)
        .map(|r| (r.a, r.b))
        .collect();
    let mut n = 0;
    for (i, s) in wires.iter().enumerate() {
        for t in &wires[i + 1..] {
            if s.0 == t.0 || s.0 == t.1 || s.1 == t.0 || s.1 == t.1 {
                continue;
            }
            let (p1, p2, p3, p4) = (at(model, s.0), at(model, s.1), at(model, t.0), at(model, t.1));
            if orient(p3, p4, p1) * orient(p3, p4, p2) < 0.0
                && orient(p1, p2, p3) * orient(p1, p2, p4) < 0.0
            {
                n += 1;
            }
        }
    }
    n
}

/// The same picture with the components re-seated in declaration order: the
/// ring's own slots, read clockwise from the top, handed out by thing index.
fn in_declaration_order(model: &CanvasModel) -> CanvasModel {
    let mut slots: Vec<(f32, f32)> = model
        .things
        .iter()
        .filter(|t| t.role == Role::Component)
        .map(|t| (t.x, t.y))
        .collect();
    let clockwise_from_top = |p: &(f32, f32)| {
        let a = (p.1 - CENTER.1).atan2(p.0 - CENTER.0) + std::f32::consts::FRAC_PI_2 + 1e-3;
        a.rem_euclid(std::f32::consts::TAU)
    };
    slots.sort_by(|p, q| clockwise_from_top(p).total_cmp(&clockwise_from_top(q)));
    let mut out = model.clone();
    let mut next = slots.into_iter();
    for t in out.things.iter_mut().filter(|t| t.role == Role::Component) {
        let (x, y) = next.next().unwrap();
        t.x = x;
        t.y = y;
    }
    out
}

fn components(model: &CanvasModel) -> Vec<&Thing> {
    model.things.iter().filter(|t| t.role == Role::Component).collect()
}

/// Law: same text, same picture — to the bit, tangled model included.
#[test]
fn the_search_is_deterministic() {
    let text = data_center();
    let (a, b) = (parse_sl(&text).unwrap(), parse_sl(&text).unwrap());
    for (p, q) in a.things.iter().zip(&b.things) {
        assert_eq!((p.x.to_bits(), p.y.to_bits()), (q.x.to_bits(), q.y.to_bits()), "{}", p.name);
    }
}

/// Law: however many components, ring neighbours keep a label-wide chord, the
/// floor radius still holds for the small rings, and every environment thing
/// sits clear outside the ring.
#[test]
fn the_ring_grows_with_its_count() {
    for n in 3..=16 {
        let mut text = String::new();
        for i in 0..n {
            text.push_str(&format!("component C{i}\n"));
        }
        text.push_str("source In\nsink Out\nflow In -> C0\nflow C1 -> Out\n");
        let m = parse_sl(&text).unwrap();
        let comps = components(&m);
        let mut nearest = f32::MAX;
        for (i, p) in comps.iter().enumerate() {
            for q in &comps[i + 1..] {
                nearest = nearest.min((p.x - q.x).hypot(p.y - q.y));
            }
        }
        assert!(
            nearest >= LABEL_SAFE_CHORD - 0.5,
            "{n} components: nearest pair is {nearest:.1}px apart, under {LABEL_SAFE_CHORD}"
        );
        let ring = comps
            .iter()
            .map(|t| (t.x - CENTER.0).hypot(t.y - CENTER.1))
            .fold(0.0, f32::max);
        assert!(ring >= 170.0 - 0.5, "{n} components: ring {ring:.1} is under the 170 floor");
        for e in m.things.iter().filter(|t| t.role == Role::Environment) {
            let d = (e.x - CENTER.0).hypot(e.y - CENTER.1);
            assert!(
                d > ring + 2.0 * NODE_R,
                "{n} components: `{}` at {d:.1} does not clear the ring at {ring:.1}",
                e.name
            );
        }
    }
}

/// Law: a ring whose declaration order crosses is re-ordered to cross less.
/// A–C and B–D are the two diagonals of a four-ring typed A, B, C, D; seating
/// the wired pairs side by side removes the crossing.
#[test]
fn a_crossing_declaration_order_is_untangled() {
    let text = "component A\ncomponent B\ncomponent C\ncomponent D\n\
                flow A -> C\nflow B -> D\n";
    let m = parse_sl(text).unwrap();
    assert_eq!(crossings(&in_declaration_order(&m)), 1);
    assert_eq!(crossings(&m), 0);
}

/// Law: on a drafted-model-sized tangle (10 components, 9 environment things,
/// 35 flows) the chosen order crosses far less than the typed one, and the
/// picture still reads left to right (#309).
#[test]
fn the_data_center_untangles() {
    let m = parse_sl(&data_center()).unwrap();
    let (before, after) = (crossings(&in_declaration_order(&m)), crossings(&m));
    println!("data-center crossings: declaration order {before}, chosen order {after}");
    assert!(
        after * 3 < before,
        "chosen order draws {after} crossings against {before} in declaration order"
    );
    let xs = |role_is_source: bool| -> Vec<f32> {
        m.things
            .iter()
            .filter(|t| t.role == Role::Environment)
            .filter(|t| m.relations.iter().any(|r| r.a == t.id) == role_is_source)
            .map(|t| t.x)
            .collect()
    };
    let rightmost_source = xs(true).into_iter().fold(f32::MIN, f32::max);
    let leftmost_sink = xs(false).into_iter().fold(f32::MAX, f32::min);
    assert!(rightmost_source < leftmost_sink, "a source sits right of a sink");
}

/// Law: a model that already draws clean is left exactly where declaration
/// order puts it — the search moves nothing it does not have to.
#[test]
fn a_clean_declaration_order_is_kept() {
    let text = "component A\ncomponent B\ncomponent C\ncomponent D\n\
                source S\nsink K\n\
                flow S -> D\nflow D -> A\nflow A -> B\nflow B -> C\nflow C -> K\n";
    let m = parse_sl(text).unwrap();
    assert_eq!(crossings(&m), 0);
    let same = in_declaration_order(&m);
    for (p, q) in m.things.iter().zip(&same.things) {
        assert_eq!((p.x, p.y), (q.x, q.y), "{} moved off its declared slot", p.name);
    }
}

/// Law: a second flow on a pair that is already wired is not a new line to
/// untangle — adding it moves nothing. (Editing stability: the pane re-runs
/// layout on every compile.)
#[test]
fn a_parallel_flow_moves_nothing() {
    let text = data_center();
    let base = parse_sl(&text).unwrap();
    let more = format!("{text}flow \"Power Distribution\" -> \"Compute Racks\" : informational \"telemetry\"\n");
    let edited = parse_sl(&more).unwrap();
    for (p, q) in base.things.iter().zip(&edited.things) {
        assert_eq!((p.x, p.y), (q.x, q.y), "{} moved", p.name);
    }
}

/// Law: `@pos` still wins, on a component and on an environment thing, in a
/// model the search does re-order — and the pinned component gives up its
/// slot rather than leaving a hole in the ring.
#[test]
fn explicit_positions_survive_the_search() {
    let text = format!("{}@pos \"Compute Racks\" 40 40\n@pos Grid 900 600\n", data_center());
    let m = parse_sl(&text).unwrap();
    let find = |name: &str| m.things.iter().find(|t| t.name == name).unwrap();
    assert_eq!((find("Compute Racks").x, find("Compute Racks").y), (40.0, 40.0));
    assert_eq!((find("Grid").x, find("Grid").y), (900.0, 600.0));
    let free: Vec<&Thing> = components(&m).into_iter().filter(|t| t.name != "Compute Racks").collect();
    assert_eq!(free.len(), 9);
    let radius = |t: &Thing| (t.x - CENTER.0).hypot(t.y - CENTER.1);
    for t in &free {
        assert!((radius(t) - radius(free[0])).abs() < 0.5, "{} is off the ring", t.name);
    }
}
