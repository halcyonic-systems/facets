//! SL — the textual authoring surface over the canvas editing model.
//!
//! A line-oriented, declarative concrete syntax that compiles into a
//! [`CanvasModel`] (the neutral spec: `CanvasModel` minus view state). The
//! lexicon is the kernel's existing vocabulary and nothing more — a word
//! appears here only because it names a distinction `CanvasModel` already
//! carries. The parser judges NOTHING about systemhood: it resolves names and
//! builds the editing model; legality stays with the kernel validators, same
//! as for canvas gestures (Mobus: "syntax is structural legality").
//!
//! Structure lines are semantic. `@`-prefixed lines are the view/annotation
//! layer (positions, lens) — semantically inert, so a diff of the structure
//! lines shows systems changing, never node drags. Unrecognized annotations
//! are skipped (the ignorable contract); malformed recognized ones fail loud.
//!
//! Grammar (v1 — structure only, no expressions, no decomposition):
//!
//! ```text
//! system "Steel-Plant" : Concrete/Technical   # optional SOI name + type assertion
//! domain "steel manufacturing"         # optional framing
//! component Furnace primitive Combining interface
//! source "Iron Vendor"                 # source|sink|environment: env things;
//! sink Customers                       #   actual role is edge-derived in project()
//! flow "Iron Vendor" -> Furnace : matter "iron"
//! flow Furnace -> Customers : matter "steel" mere   # mere = not a bond
//! boundary porosity 0.7 fuzziness 0.1
//!
//! @lens mobus                          # view layer, ignorable
//! @pos Furnace 480 320
//! ```

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use bert_core::model_id::{decode_uuid, encode_uuid};
use bert_core::{ModelRef, ProcessPrimitive};

use crate::canvas::{
    CanvasBoundaryProps, CanvasModel, ChildRef, Genus, Kind, Kingdom, Lens, Relation, Role,
    SystemType, Thing,
};

/// A parse fault, anchored to its 1-indexed source line. All faults are
/// collected in one pass so the author sees every problem at once.
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct SlError {
    pub line: usize,
    pub message: String,
}

/// Auto-layout geometry: components sit on an inner N-gon, environment things
/// on an outer ring, both in declaration order. Deterministic — same text,
/// same picture. Values sized to the SVG stage the canvas renders.
const CENTER: (f32, f32) = (480.0, 320.0);
const COMPONENT_RADIUS: f32 = 170.0;
const ENV_RADIUS: f32 = 320.0;

/// Compile SL text into a [`CanvasModel`], or every fault found.
pub fn parse_sl(text: &str) -> Result<CanvasModel, Vec<SlError>> {
    parse_sl_full(text).map(|p| p.model)
}

/// A successful parse plus surface facts the caller may need: whether the text
/// pinned a lens via `@lens` (lens is view state — absent an explicit pin, the
/// caller should keep the author's current lens rather than let the parser's
/// default clobber it).
pub struct SlParse {
    pub model: CanvasModel,
    pub lens_explicit: bool,
}

/// [`parse_sl`], with the surface facts. The parser stays judgment-free.
pub fn parse_sl_full(text: &str) -> Result<SlParse, Vec<SlError>> {
    let mut errors: Vec<SlError> = Vec::new();
    let mut things: Vec<Thing> = Vec::new();
    let mut relations: Vec<Relation> = Vec::new();
    let mut boundary: Option<CanvasBoundaryProps> = None;
    let mut system_type = SystemType::default();
    let mut system_name: Option<String> = None;
    let mut system_seen = false;
    let mut domain_seen = false;
    let mut lens = Lens::Mobus;
    let mut lens_explicit = false;
    // name → thing index; names are the text surface's identifiers.
    let mut by_name: HashMap<String, usize> = HashMap::new();
    // explicit positions from the annotation layer, applied after layout.
    let mut positions: HashMap<String, (f32, f32)> = HashMap::new();
    // `@directed <n>` marks (1-based flow index, source line) to apply at the end.
    let mut directed_marks: Vec<(usize, usize)> = Vec::new();
    let mut next_id: u64 = 1;

    for (idx, raw) in text.lines().enumerate() {
        let line_no = idx + 1;
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let fail = |msg: String, errors: &mut Vec<SlError>| {
            errors.push(SlError {
                line: line_no,
                message: msg,
            })
        };
        let tokens = match tokenize(line) {
            Ok(t) => t,
            Err(msg) => {
                fail(msg, &mut errors);
                continue;
            }
        };
        if tokens.is_empty() {
            continue;
        }

        // ---- annotation layer (view state; never systemhood) ----
        if let Tok::Word(w) = &tokens[0] {
            if let Some(ann) = w.strip_prefix('@') {
                match ann {
                    "pos" => match tokens.as_slice() {
                        [_, name, Tok::Word(xs), Tok::Word(ys)] if name.is_name() => {
                            match (xs.parse::<f32>(), ys.parse::<f32>()) {
                                (Ok(x), Ok(y)) => {
                                    positions.insert(name.name(), (x, y));
                                }
                                _ => fail(
                                    "@pos needs numeric x y (e.g. `@pos Furnace 480 320`)".into(),
                                    &mut errors,
                                ),
                            }
                        }
                        _ => fail("@pos syntax: `@pos <name> <x> <y>`".into(), &mut errors),
                    },
                    "lens" => match tokens.as_slice() {
                        [_, Tok::Word(l)] => match l.to_ascii_lowercase().as_str() {
                            "klir" => (lens, lens_explicit) = (Lens::Klir, true),
                            "bunge" => (lens, lens_explicit) = (Lens::Bunge, true),
                            "mobus" => (lens, lens_explicit) = (Lens::Mobus, true),
                            other => fail(
                                format!("unknown lens `{other}` (klir | bunge | mobus)"),
                                &mut errors,
                            ),
                        },
                        _ => fail("@lens syntax: `@lens <klir|bunge|mobus>`".into(), &mut errors),
                    },
                    "directed" => match tokens.as_slice() {
                        [_, Tok::Word(n)] if n.parse::<usize>().is_ok() => {
                            directed_marks.push((n.parse().unwrap(), line_no));
                        }
                        _ => fail(
                            "@directed syntax: `@directed <flow number>` (1-based, in \
                             declaration order)"
                                .into(),
                            &mut errors,
                        ),
                    },
                    // Unknown annotations are skipped by contract: the view
                    // layer is ignorable, so future annotations degrade softly.
                    _ => {}
                }
                continue;
            }
        }

        // ---- structure lines (the neutral spec) ----
        let keyword = match &tokens[0] {
            Tok::Word(w) => w.to_ascii_lowercase(),
            _ => {
                fail("line must start with a keyword".into(), &mut errors);
                continue;
            }
        };
        let rest = &tokens[1..];
        match keyword.as_str() {
            "system" => {
                if system_seen {
                    fail("`system` already declared".into(), &mut errors);
                    continue;
                }
                system_seen = true;
                let (name_tok, type_rest) = match rest {
                    [Tok::Str(n), tail @ ..] => (Some(n), tail),
                    tail => (None, tail),
                };
                if let Some(n) = name_tok {
                    if n.is_empty() {
                        fail("system name cannot be empty".into(), &mut errors);
                    } else {
                        system_name = Some(n.clone());
                    }
                }
                match type_rest {
                    [] => {}
                    [Tok::Colon, Tok::Word(ty)] => match parse_system_type(ty) {
                        Ok((kingdom, genus)) => {
                            system_type.kingdom = Some(kingdom);
                            system_type.genus = genus;
                        }
                        Err(msg) => fail(msg, &mut errors),
                    },
                    _ => fail(
                        "system syntax: `system [\"Name\"] [: <Kingdom>[/<Genus>]]`".into(),
                        &mut errors,
                    ),
                }
            }
            "domain" => {
                if domain_seen {
                    fail("`domain` already declared".into(), &mut errors);
                    continue;
                }
                domain_seen = true;
                match rest {
                    [Tok::Str(s)] => system_type.domain = Some(s.clone()),
                    _ => fail("domain syntax: `domain \"<subject area>\"`".into(), &mut errors),
                }
            }
            "component" | "source" | "sink" | "environment" => {
                let role = if keyword == "component" {
                    Role::Component
                } else {
                    Role::Environment
                };
                let Some((name, attrs)) = rest.split_first() else {
                    fail(format!("{keyword} needs a name"), &mut errors);
                    continue;
                };
                if !name.is_name() {
                    fail(format!("{keyword} needs a name"), &mut errors);
                    continue;
                }
                let name = name.name();
                if by_name.contains_key(&name) {
                    fail(format!("`{name}` is already declared"), &mut errors);
                    continue;
                }
                let mut primitive: Option<ProcessPrimitive> = None;
                let mut interface = false;
                let mut child_model: Option<ChildRef> = None;
                let mut i = 0;
                let mut ok = true;
                while i < attrs.len() {
                    match &attrs[i] {
                        Tok::Word(w) if w.eq_ignore_ascii_case("decomposes") => {
                            if role == Role::Environment {
                                fail(
                                    "`decomposes` applies to components only (environment \
                                     internals are opaque)"
                                        .into(),
                                    &mut errors,
                                );
                                ok = false;
                            }
                            if child_model.is_some() {
                                fail("`decomposes` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            // `decomposes "child-name" @<base58-id>` — both halves
                            // mandatory: the name is a human label, the stamped id
                            // is the key (resolution is later tooling, not the
                            // compiler; #89 step 4).
                            match (attrs.get(i + 1), attrs.get(i + 2)) {
                                (Some(Tok::Str(cname)), Some(Tok::Word(idtok)))
                                    if idtok.starts_with('@') =>
                                {
                                    if cname.is_empty() {
                                        fail("decomposes child name cannot be empty".into(), &mut errors);
                                        ok = false;
                                    }
                                    match decode_uuid(&idtok[1..]) {
                                        Ok(uuid) => {
                                            if ok {
                                                child_model = Some(ChildRef {
                                                    name: cname.clone(),
                                                    id: ModelRef::new(uuid),
                                                });
                                            }
                                        }
                                        Err(e) => {
                                            fail(
                                                format!("malformed decomposes id `{}`: {e}", &idtok[1..]),
                                                &mut errors,
                                            );
                                            ok = false;
                                        }
                                    }
                                    i += 3;
                                }
                                (Some(Tok::Str(_)), _) => {
                                    fail(
                                        "unstamped reference — resolve via the library: \
                                         `decomposes \"name\" @<id>`"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                    i += 2;
                                }
                                _ => {
                                    fail(
                                        "decomposes syntax: `decomposes \"<child name>\" @<id>`"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                    i += 1;
                                }
                            }
                        }
                        Tok::Word(w) if w.eq_ignore_ascii_case("interface") => {
                            if role == Role::Environment {
                                fail(
                                    "`interface` applies to components only (environment \
                                     internals are opaque)"
                                        .into(),
                                    &mut errors,
                                );
                                ok = false;
                            }
                            interface = true;
                            i += 1;
                        }
                        Tok::Word(w) if w.eq_ignore_ascii_case("primitive") => {
                            match attrs.get(i + 1) {
                                Some(Tok::Word(p)) => match parse_primitive(p) {
                                    Ok(prim) => {
                                        if role == Role::Environment {
                                            fail(
                                                "`primitive` applies to components only".into(),
                                                &mut errors,
                                            );
                                            ok = false;
                                        }
                                        primitive = Some(prim);
                                    }
                                    Err(msg) => {
                                        fail(msg, &mut errors);
                                        ok = false;
                                    }
                                },
                                _ => {
                                    fail(
                                        "primitive syntax: `primitive <Name>` (e.g. Buffering)"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                }
                            }
                            i += 2;
                        }
                        other => {
                            fail(
                                format!("unexpected `{}` after {keyword} name", other.display()),
                                &mut errors,
                            );
                            ok = false;
                            i += 1;
                        }
                    }
                }
                // Parent-side-only knowledge the store-free compiler can and must
                // reject early: v1's Lean contract covers a component's internal
                // network only, not flows crossing the parent membrane through an
                // interface component (issue #89 gate-open narrowing).
                if interface && child_model.is_some() {
                    fail(
                        "v1 refuses to decompose interface components — membrane-crossing \
                         flows not yet in the Lean contract; see #89"
                            .into(),
                        &mut errors,
                    );
                    ok = false;
                }
                if !ok {
                    continue;
                }
                by_name.insert(name.clone(), things.len());
                things.push(Thing {
                    id: next_id,
                    name,
                    x: 0.0,
                    y: 0.0,
                    role,
                    primitive,
                    interface,
                    child_model,
                });
                next_id += 1;
            }
            "flow" => {
                // flow A -> B [: kind] ["label"] [mere]
                let (a, b, mut tail) = match rest {
                    [a, Tok::Arrow, b, tail @ ..] if a.is_name() && b.is_name() => {
                        (a.name(), b.name(), tail)
                    }
                    _ => {
                        fail(
                            "flow syntax: `flow <a> -> <b> [: <kind>] [\"label\"] [mere]`".into(),
                            &mut errors,
                        );
                        continue;
                    }
                };
                let mut kind = Kind::Unspecified;
                if let [Tok::Colon, Tok::Word(k), rest_tail @ ..] = tail {
                    match parse_kind(k) {
                        Ok(parsed) => kind = parsed,
                        Err(msg) => {
                            fail(msg, &mut errors);
                            continue;
                        }
                    }
                    tail = rest_tail;
                }
                let mut name = String::new();
                if let [Tok::Str(label), rest_tail @ ..] = tail {
                    name = label.clone();
                    tail = rest_tail;
                }
                let mut is_bond = true;
                if let [Tok::Word(w), rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("mere") {
                        is_bond = false;
                        tail = rest_tail;
                    }
                }
                if !tail.is_empty() {
                    fail(
                        format!("unexpected `{}` at end of flow", tail[0].display()),
                        &mut errors,
                    );
                    continue;
                }
                let (Some(&ai), Some(&bi)) = (by_name.get(&a), by_name.get(&b)) else {
                    let missing = if by_name.contains_key(&a) { &b } else { &a };
                    fail(
                        format!("`{missing}` is not declared (declare things before flows)"),
                        &mut errors,
                    );
                    continue;
                };
                relations.push(Relation {
                    id: next_id,
                    a: things[ai].id,
                    b: things[bi].id,
                    name,
                    is_bond,
                    kind,
                    klir_directed: false,
                });
                next_id += 1;
            }
            "boundary" => {
                if boundary.is_some() {
                    fail("`boundary` already declared".into(), &mut errors);
                    continue;
                }
                let mut props = CanvasBoundaryProps::default();
                let mut i = 0;
                let mut ok = true;
                while i < rest.len() {
                    let field = match &rest[i] {
                        Tok::Word(w) => w.to_ascii_lowercase(),
                        other => {
                            fail(format!("unexpected `{}` in boundary", other.display()), &mut errors);
                            ok = false;
                            break;
                        }
                    };
                    let value = rest.get(i + 1).and_then(|t| match t {
                        Tok::Word(w) => w.parse::<f32>().ok(),
                        _ => None,
                    });
                    match (field.as_str(), value) {
                        ("porosity", Some(v)) => props.porosity = v,
                        ("fuzziness", Some(v)) => props.perceptive_fuzziness = v,
                        _ => {
                            fail(
                                "boundary syntax: `boundary [porosity <0..1>] [fuzziness <0..1>]`"
                                    .into(),
                                &mut errors,
                            );
                            ok = false;
                            break;
                        }
                    }
                    i += 2;
                }
                if ok {
                    boundary = Some(props);
                }
            }
            other => fail(
                format!(
                    "unknown keyword `{other}` (system, domain, component, source, sink, \
                     environment, flow, boundary)"
                ),
                &mut errors,
            ),
        }
    }

    for (n, line_no) in &directed_marks {
        match relations.get_mut(n.wrapping_sub(1)) {
            Some(r) if *n >= 1 => r.klir_directed = true,
            _ => errors.push(SlError {
                line: *line_no,
                message: format!("@directed {n}: only {} flow(s) declared", relations.len()),
            }),
        }
    }

    if !errors.is_empty() {
        return Err(errors);
    }

    let mut model = CanvasModel {
        lens,
        model_id: None,
        things,
        relations,
        boundary: boundary.unwrap_or_default(),
        system_type,
        name: system_name,
    };
    auto_layout(&mut model, &positions);
    Ok(SlParse {
        model,
        lens_explicit,
    })
}

/// Place things deterministically: explicit `@pos` wins; otherwise components
/// take the inner N-gon and environment things the outer ring, in declaration
/// order. A lone component sits at the center.
fn auto_layout(model: &mut CanvasModel, positions: &HashMap<String, (f32, f32)>) {
    let ring = |i: usize, n: usize, radius: f32| -> (f32, f32) {
        let angle = -std::f32::consts::FRAC_PI_2
            + (i as f32) * std::f32::consts::TAU / (n.max(1) as f32);
        (
            CENTER.0 + radius * angle.cos(),
            CENTER.1 + radius * angle.sin(),
        )
    };
    let components: Vec<usize> = (0..model.things.len())
        .filter(|&i| model.things[i].role == Role::Component && !positions.contains_key(&model.things[i].name))
        .collect();
    let env: Vec<usize> = (0..model.things.len())
        .filter(|&i| model.things[i].role == Role::Environment && !positions.contains_key(&model.things[i].name))
        .collect();
    for (slot, &i) in components.iter().enumerate() {
        let (x, y) = if components.len() == 1 {
            CENTER
        } else {
            ring(slot, components.len(), COMPONENT_RADIUS)
        };
        model.things[i].x = x;
        model.things[i].y = y;
    }
    for (slot, &i) in env.iter().enumerate() {
        let (x, y) = ring(slot, env.len(), ENV_RADIUS);
        model.things[i].x = x;
        model.things[i].y = y;
    }
    for thing in &mut model.things {
        if let Some(&(x, y)) = positions.get(&thing.name) {
            thing.x = x;
            thing.y = y;
        }
    }
}

/// Serialize a [`CanvasModel`] to canonical SL text — the model→text direction.
///
/// Canonical form: things first (declaration order), then flows, then boundary,
/// then the annotation block (`@lens`, `@pos` per thing, `@directed` per
/// klir-directed flow). Environment things emit as `source` (originates a
/// bond), `sink` (touched by a bond), or `environment` (untouched) — the same
/// edge-derived reading `project()` uses, so the emitted word is the kernel's
/// identity, not a stored type. `emit_sl` is canonicalizing: for any model,
/// `emit(parse(emit(m))) == emit(m)`; for models born from things-first SL
/// text, `parse(emit(m))` reproduces `m` digit for digit (ids included).
///
/// Errs on the two shapes SL v1 cannot express: a name containing `"` or a
/// newline, and a genus asserted without a kingdom. `primitive`/`interface` on
/// environment things (semantically inert — the kernel ignores them) are
/// dropped rather than emitted.
pub fn emit_sl(model: &CanvasModel) -> Result<String, String> {
    use std::fmt::Write as _;
    let mut out = String::new();

    // system / domain — the SOI name (quoted) before the type clause
    let sys_name = match &model.name {
        Some(n) => Some(quote(n)?),
        None => None,
    };
    let sys_type = match (&model.system_type.kingdom, &model.system_type.genus) {
        (Some(k), Some(g)) => Some(format!("{k:?}/{g:?}")),
        (Some(k), None) => Some(format!("{k:?}")),
        (None, Some(_)) => {
            return Err("system_type has a genus but no kingdom — not expressible in SL v1".into())
        }
        (None, None) => None,
    };
    match (&sys_name, &sys_type) {
        (Some(n), Some(t)) => writeln!(out, "system {n} : {t}").unwrap(),
        (Some(n), None) => writeln!(out, "system {n}").unwrap(),
        (None, Some(t)) => writeln!(out, "system : {t}").unwrap(),
        (None, None) => {}
    }
    if let Some(domain) = &model.system_type.domain {
        writeln!(out, "domain {}", quote(domain)?).unwrap();
    }

    // things — env identity edge-derived from bonds, mirroring project()
    let originates = |id: u64| model.relations.iter().any(|r| r.is_bond && r.a == id);
    let touched = |id: u64| model.relations.iter().any(|r| r.is_bond && (r.a == id || r.b == id));
    for t in &model.things {
        let keyword = match t.role {
            Role::Component => "component",
            Role::Environment if originates(t.id) => "source",
            Role::Environment if touched(t.id) => "sink",
            Role::Environment => "environment",
        };
        write!(out, "{keyword} {}", name_token(&t.name)?).unwrap();
        if t.role == Role::Component {
            if let Some(p) = t.primitive {
                write!(out, " primitive {p:?}").unwrap();
            }
            if t.interface {
                write!(out, " interface").unwrap();
            }
            // `decomposes` emits last (§7.1 canonical order): name quoted, id in
            // the canonical base58 form, both mandatory.
            if let Some(child) = &t.child_model {
                write!(out, " decomposes {} @{}", quote(&child.name)?, encode_uuid(&child.id.as_uuid()))
                    .unwrap();
            }
        }
        out.push('\n');
    }

    // flows
    let name_of = |id: u64| {
        model
            .things
            .iter()
            .find(|t| t.id == id)
            .map(|t| t.name.clone())
            .ok_or_else(|| format!("relation endpoint {id} names no thing"))
    };
    for r in &model.relations {
        write!(out, "flow {} -> {}", name_token(&name_of(r.a)?)?, name_token(&name_of(r.b)?)?)
            .unwrap();
        if r.kind != Kind::Unspecified {
            write!(out, " : {}", format!("{:?}", r.kind).to_ascii_lowercase()).unwrap();
        }
        if !r.name.is_empty() {
            write!(out, " {}", quote(&r.name)?).unwrap();
        }
        if !r.is_bond {
            write!(out, " mere").unwrap();
        }
        out.push('\n');
    }

    // boundary (only when authored)
    if model.boundary != CanvasBoundaryProps::default() {
        writeln!(
            out,
            "boundary porosity {} fuzziness {}",
            model.boundary.porosity, model.boundary.perceptive_fuzziness
        )
        .unwrap();
    }

    // annotation block — view state, ignorable
    out.push('\n');
    writeln!(out, "@lens {}", format!("{:?}", model.lens).to_ascii_lowercase()).unwrap();
    for t in &model.things {
        writeln!(out, "@pos {} {} {}", name_token(&t.name)?, t.x, t.y).unwrap();
    }
    for (i, r) in model.relations.iter().enumerate() {
        if r.klir_directed {
            writeln!(out, "@directed {}", i + 1).unwrap();
        }
    }
    Ok(out)
}

/// Words the tokenizer or line parsers claim — a thing name matching one must
/// be quoted to stay a name.
fn is_reserved(word: &str) -> bool {
    matches!(
        word.to_ascii_lowercase().as_str(),
        "system"
            | "domain"
            | "component"
            | "source"
            | "sink"
            | "environment"
            | "flow"
            | "boundary"
            | "interface"
            | "primitive"
            | "decomposes"
            | "mere"
            | "porosity"
            | "fuzziness"
            | "energy"
            | "matter"
            | "field"
            | "informational"
    )
}

/// A name as a token: bare when it reads as an identifier and shadows nothing,
/// quoted otherwise.
fn name_token(name: &str) -> Result<String, String> {
    let bare = !name.is_empty()
        && !is_reserved(name)
        && name.chars().next().is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
        && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
        && name != "->";
    if bare {
        Ok(name.to_string())
    } else {
        quote(name)
    }
}

fn quote(s: &str) -> Result<String, String> {
    if s.contains('"') || s.contains('\n') {
        return Err(format!("name/label {s:?} contains a quote or newline — not expressible in SL v1"));
    }
    Ok(format!("\"{s}\""))
}

fn parse_system_type(word: &str) -> Result<(Kingdom, Option<Genus>), String> {
    let (kingdom_str, genus_str) = match word.split_once('/') {
        Some((k, g)) => (k, Some(g)),
        None => (word, None),
    };
    let kingdom = match kingdom_str.to_ascii_lowercase().as_str() {
        "conceptual" => Kingdom::Conceptual,
        "concrete" => Kingdom::Concrete,
        other => return Err(format!("unknown kingdom `{other}` (Conceptual | Concrete)")),
    };
    let genus = match genus_str {
        None => None,
        Some(g) => Some(match g.to_ascii_lowercase().as_str() {
            "physical" => Genus::Physical,
            "chemical" => Genus::Chemical,
            "biological" => Genus::Biological,
            "social" => Genus::Social,
            "technical" => Genus::Technical,
            other => {
                return Err(format!(
                    "unknown genus `{other}` (Physical | Chemical | Biological | Social | Technical)"
                ))
            }
        }),
    };
    Ok((kingdom, genus))
}

fn parse_kind(word: &str) -> Result<Kind, String> {
    match word.to_ascii_lowercase().as_str() {
        "energy" => Ok(Kind::Energy),
        "matter" => Ok(Kind::Matter),
        "field" => Ok(Kind::Field),
        "informational" => Ok(Kind::Informational),
        other => Err(format!(
            "unknown kind `{other}` (energy | matter | field | informational)"
        )),
    }
}

fn parse_primitive(word: &str) -> Result<ProcessPrimitive, String> {
    use ProcessPrimitive::*;
    match word.to_ascii_lowercase().as_str() {
        "combining" => Ok(Combining),
        "splitting" => Ok(Splitting),
        "buffering" => Ok(Buffering),
        "impeding" => Ok(Impeding),
        "propelling" => Ok(Propelling),
        "copying" => Ok(Copying),
        "sensing" => Ok(Sensing),
        "modulating" => Ok(Modulating),
        "amplifying" => Ok(Amplifying),
        "inverting" => Ok(Inverting),
        other => Err(format!(
            "unknown primitive `{other}` (Combining, Splitting, Buffering, Impeding, Propelling, \
             Copying, Sensing, Modulating, Amplifying, Inverting)"
        )),
    }
}

/// Line tokens: bare words, quoted strings, `->`, `:`.
#[derive(Clone, Debug, PartialEq)]
enum Tok {
    Word(String),
    Str(String),
    Arrow,
    Colon,
}

impl Tok {
    /// Words and quoted strings both name things; punctuation does not.
    fn is_name(&self) -> bool {
        matches!(self, Tok::Word(_) | Tok::Str(_))
    }
    fn name(&self) -> String {
        match self {
            Tok::Word(w) => w.clone(),
            Tok::Str(s) => s.clone(),
            _ => String::new(),
        }
    }
    fn display(&self) -> String {
        match self {
            Tok::Word(w) => w.clone(),
            Tok::Str(s) => format!("\"{s}\""),
            Tok::Arrow => "->".into(),
            Tok::Colon => ":".into(),
        }
    }
}

fn tokenize(line: &str) -> Result<Vec<Tok>, String> {
    let mut tokens = Vec::new();
    let mut chars = line.chars().peekable();
    while let Some(&c) = chars.peek() {
        if c.is_whitespace() {
            chars.next();
        } else if c == '"' {
            chars.next();
            let mut s = String::new();
            loop {
                match chars.next() {
                    Some('"') => break,
                    Some(ch) => s.push(ch),
                    None => return Err("unterminated quote".into()),
                }
            }
            tokens.push(Tok::Str(s));
        } else if c == ':' {
            chars.next();
            tokens.push(Tok::Colon);
        } else if c == '#' {
            break; // trailing comment
        } else {
            let mut w = String::new();
            while let Some(&ch) = chars.peek() {
                if ch.is_whitespace() || ch == '"' || ch == ':' || ch == '#' {
                    break;
                }
                w.push(ch);
                chars.next();
            }
            if w == "->" {
                tokens.push(Tok::Arrow);
            } else {
                tokens.push(Tok::Word(w));
            }
        }
    }
    Ok(tokens)
}

#[cfg(test)]
mod tests {
    use super::*;

    const STEEL: &str = r#"
# Mobus's steel plant, as a system paragraph in SL
system : Concrete/Technical
domain "steel manufacturing"
component "Steel Plant" primitive Combining interface
source "Iron Vendor"
source "Power Utility"
sink Customers
sink "Waste Disposal"
flow "Iron Vendor" -> "Steel Plant" : matter "iron"
flow "Power Utility" -> "Steel Plant" : energy "electricity"
flow "Steel Plant" -> Customers : matter "steel"
flow "Steel Plant" -> "Waste Disposal" : matter "scrap"
boundary porosity 0.7 fuzziness 0.1

@lens mobus
@pos "Steel Plant" 480 320
"#;

    #[test]
    fn steel_plant_compiles() {
        let model = parse_sl(STEEL).expect("steel plant parses");
        assert_eq!(model.things.len(), 5);
        assert_eq!(model.relations.len(), 4);
        assert_eq!(model.lens, Lens::Mobus);
        assert_eq!(model.boundary.porosity, 0.7);
        assert_eq!(model.system_type.kingdom, Some(Kingdom::Concrete));
        assert_eq!(model.system_type.genus, Some(Genus::Technical));
        assert_eq!(model.system_type.domain.as_deref(), Some("steel manufacturing"));
        let plant = model.things.iter().find(|t| t.name == "Steel Plant").unwrap();
        assert_eq!(plant.role, Role::Component);
        assert!(plant.interface);
        assert_eq!(plant.primitive, Some(ProcessPrimitive::Combining));
        assert_eq!((plant.x, plant.y), (480.0, 320.0)); // @pos wins over layout
        let iron = model.things.iter().find(|t| t.name == "Iron Vendor").unwrap();
        assert_eq!(iron.role, Role::Environment);
        let flow = &model.relations[0];
        assert_eq!(flow.kind, Kind::Matter);
        assert!(flow.is_bond);
        assert_eq!(flow.name, "iron");
    }

    /// Law: SL parses to a `CanvasModel` and never itself judges legality —
    /// the parsed model must flow through the SAME compile path the canvas
    /// uses (`project()` then the kernel's mode validator) to earn a verdict.
    #[test]
    fn steel_plant_projects_and_validates() {
        // The parsed model must flow through the SAME compile path the canvas
        // uses — project() then the kernel's mode validator.
        let model = parse_sl(STEEL).unwrap();
        let world = crate::canvas::project(&model);
        // 1 component + 4 env things touched by bonds → 2 sources, 2 sinks.
        assert_eq!(world.environment.sources.len(), 2);
        assert_eq!(world.environment.sinks.len(), 2);
        // Structure is legal for the Core reading; the parser never checked
        // any of this itself.
        let core = bert_core::validate::validate_mode(&world, crate::canvas::Lens::Klir.mode());
        assert!(core.issues.is_empty(), "core-mode issues: {:?}", core.issues);
    }

    #[test]
    fn mere_relation_and_unspecified_kind() {
        let model = parse_sl(
            "component A\ncomponent B\nflow A -> B mere\n",
        )
        .unwrap();
        assert!(!model.relations[0].is_bond);
        assert_eq!(model.relations[0].kind, Kind::Unspecified);
        assert_eq!(model.relations[0].name, "");
    }

    /// Law: the parser accumulates every fault in one pass rather than
    /// stopping at the first, and anchors each to its correct 1-indexed line.
    #[test]
    fn errors_carry_line_numbers_and_accumulate() {
        let err = parse_sl(
            "component A\nflow A -> Ghost\nwidget B\nsource S interface\n",
        )
        .unwrap_err();
        assert_eq!(err.len(), 3);
        assert_eq!(err[0].line, 2);
        assert!(err[0].message.contains("Ghost"));
        assert_eq!(err[1].line, 3);
        assert!(err[1].message.contains("widget"));
        assert_eq!(err[2].line, 4);
        assert!(err[2].message.contains("components only"));
    }

    /// Law: the grammar forbids two declarations sharing one name — a repeat
    /// is a fault, not a silent overwrite or an implicit alias.
    #[test]
    fn duplicate_names_rejected() {
        let err = parse_sl("component A\nsource A\n").unwrap_err();
        assert_eq!(err[0].line, 2);
        assert!(err[0].message.contains("already declared"));
    }

    /// Law: the ignorable contract — an unrecognized `@`-annotation is
    /// skipped, not a fault; the view layer degrades softly.
    #[test]
    fn unknown_annotations_are_skipped() {
        // The ignorable contract: the view layer degrades softly.
        let model = parse_sl("component A\n@future-thing whatever 1 2\n").unwrap();
        assert_eq!(model.things.len(), 1);
    }

    /// Law: auto-layout is deterministic (same text, same picture) and
    /// separates roles into rings — components on the inner N-gon, environment
    /// things on the outer ring.
    #[test]
    fn layout_is_deterministic_and_separates_rings() {
        let text = "component A\ncomponent B\nsource S\n";
        let m1 = parse_sl(text).unwrap();
        let m2 = parse_sl(text).unwrap();
        for (t1, t2) in m1.things.iter().zip(&m2.things) {
            assert_eq!((t1.x, t1.y), (t2.x, t2.y));
        }
        let dist = |t: &Thing| ((t.x - CENTER.0).powi(2) + (t.y - CENTER.1).powi(2)).sqrt();
        let a = m1.things.iter().find(|t| t.name == "A").unwrap();
        let s = m1.things.iter().find(|t| t.name == "S").unwrap();
        assert!((dist(a) - COMPONENT_RADIUS).abs() < 0.5);
        assert!((dist(s) - ENV_RADIUS).abs() < 0.5);
    }

    #[test]
    fn trailing_comments_and_blank_lines_ignored() {
        let model = parse_sl("\ncomponent A  # the core\n\n# whole-line comment\n").unwrap();
        assert_eq!(model.things.len(), 1);
    }
}
