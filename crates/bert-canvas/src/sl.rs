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
//! time unit h                          # optional: the model's time-unit symbol (#94)
//! level Structure                      # optional: the declared Klir epistemological level (#288)
//! component Furnace primitive Combining interface
//! component Battery primitive Buffering stock "kW·h"   # declared stock unit (#76/#94)
//! component Light scale Nominal states {Green, Yellow, Red}  # Klir source-system (#154)
//! source "Iron Vendor" kind Support scale Ratio   # Klir source metadata rides
//!                                      #   env lines too — env vars are the
//!                                      #   input drivers Table 4.1 characterizes
//! sink Customers                       # source|sink|environment: env things;
//!                                      #   the author's word is kept (#216) —
//!                                      #   neutral `environment` gates nothing
//! flow "Iron Vendor" -> Furnace : matter "iron"
//! flow River -> Tank : matter "inflow" substance water amount 1.5 unit ML/mo
//!                                      # quantity clauses (#216, C1/C4); omitted
//!                                      #   amount ≠ 1 — unauthored is its own state
//! flow Furnace -> Customers : matter "steel" mere   # mere = not a bond
//! flow Even -> Odd : "flip" weight 3                 # weight = DTMC transition count (#67); default 1
//! param "Vendor supply" : flow "Iron Vendor" -> Furnace range 0..500
//!                                      # a domain name over a declared amount
//!                                      #   (walkthrough #18); stores no value
//! param shares "Furnace split" : from Furnace   # a fanout presented as % shares
//! boundary porosity 0.7 fuzziness 0.1
//!
//! @lens mobus                          # view layer, ignorable
//! @pos Furnace 480 320
//! ```

use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use bert_core::model_id::{decode_uuid, encode_uuid};
use bert_core::{InteractionUsability, ModelRef, ProcessPrimitive};

use crate::canvas::{
    CanvasBoundaryProps, CanvasModel, ChildRef, EnvKind, Genus, Kind, Kingdom, KlirLevel,
    KlirVarKind, Lens, Relation, Role, ScaleType, SystemType, Thing,
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
    let mut params: Vec<crate::canvas::ParamDecl> = Vec::new();
    let mut metrics: Vec<crate::canvas::MetricDecl> = Vec::new();
    let mut boundary: Option<CanvasBoundaryProps> = None;
    let mut system_type = SystemType::default();
    let mut system_name: Option<String> = None;
    let mut system_seen = false;
    let mut domain_seen = false;
    let mut description = String::new();
    let mut time_unit: Option<String> = None;
    let mut klir_level: Option<KlirLevel> = None;
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
                fail(
                    "line must start with a keyword — fix: begin it with one of system, \
                     domain, time, level, component, source, sink, environment, flow, \
                     boundary, or with `#` to make it a comment"
                        .into(),
                    &mut errors,
                );
                continue;
            }
        };
        let rest = &tokens[1..];
        match keyword.as_str() {
            "system" => {
                if system_seen {
                    fail(
                        "`system` already declared — fix: a model names its system once; \
                         merge this line into the earlier `system` line or delete it"
                            .into(),
                        &mut errors,
                    );
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
                    fail(
                        "`domain` already declared — fix: a model has one domain; merge \
                         this line into the earlier `domain` line or delete it"
                            .into(),
                        &mut errors,
                    );
                    continue;
                }
                domain_seen = true;
                match rest {
                    [Tok::Str(s)] => system_type.domain = Some(s.clone()),
                    _ => fail("domain syntax: `domain \"<subject area>\"`".into(), &mut errors),
                }
            }
            // `description "<prose>"` — what the SOI is (#326). A top-level
            // singleton beside `domain`, because `name` on the model IS the
            // root system's name: this is that system's description, not a
            // second thing standing beside the model.
            "description" => {
                if !description.is_empty() {
                    fail(
                        "`description` already declared — fix: a model has one; merge \
                         this line into the earlier `description` line or delete it"
                            .into(),
                        &mut errors,
                    );
                    continue;
                }
                match rest {
                    [Tok::Str(s)] => description = s.clone(),
                    _ => fail(
                        "description syntax: `description \"<what this system is>\"`".into(),
                        &mut errors,
                    ),
                }
            }
            // `time unit <symbol>` — the model's time-unit symbol (#94): what
            // one unit of model time is called, so the run can integrate an
            // intrinsic rate in the author's vocabulary (`kW` → `kW·h`).
            "time" => {
                if time_unit.is_some() {
                    fail(
                        "`time unit` already declared — fix: a model has one time unit; \
                         delete this line or the earlier `time unit` line"
                            .into(),
                        &mut errors,
                    );
                    continue;
                }
                match rest {
                    [Tok::Word(u), sym] if u.eq_ignore_ascii_case("unit") && sym.is_name() => {
                        let sym = sym.name();
                        if sym.trim().is_empty() {
                            fail("time unit cannot be empty".into(), &mut errors);
                        } else {
                            time_unit = Some(sym.trim().to_string());
                        }
                    }
                    _ => fail(
                        "time syntax: `time unit <symbol>` (e.g. `time unit h`)".into(),
                        &mut errors,
                    ),
                }
            }
            // `level <Source|Data|Generative|Structure|Metasystem>` — the
            // model's declared Klir epistemological level (#288): the author's
            // claim about where on the §4.5 hierarchy the model stands. The
            // modeling relation holds only within a level (Klir §5.4), so the
            // claim is what the cross-level refusal reads. Undeclared gates
            // nothing.
            "level" => {
                if klir_level.is_some() {
                    fail(
                        "`level` already declared — fix: a model stands at one \
                         epistemological level; delete this line or the earlier \
                         `level` line"
                            .into(),
                        &mut errors,
                    );
                    continue;
                }
                match rest {
                    [Tok::Word(l)] => match parse_level(l) {
                        Ok(lv) => klir_level = Some(lv),
                        Err(msg) => fail(msg, &mut errors),
                    },
                    _ => fail(
                        "level syntax: `level <Source|Data|Generative|Structure|Metasystem>`"
                            .into(),
                        &mut errors,
                    ),
                }
            }
            "component" | "source" | "sink" | "environment" => {
                let role = if keyword == "component" {
                    Role::Component
                } else {
                    Role::Environment
                };
                // Keep the author's word (#216). All four keywords used to collapse
                // into `role` alone, and everything downstream re-derived the lost
                // distinction from flow direction — which cannot recover it, and
                // guessed wrong on exactly the models where it mattered.
                let env_kind = match keyword.as_str() {
                    "source" => EnvKind::Source,
                    "sink" => EnvKind::Sink,
                    _ => EnvKind::Neutral,
                };
                let Some((name, attrs)) = rest.split_first() else {
                    fail(
                        format!(
                            "{keyword} needs a name — fix: write `{keyword} <Name>`, \
                             quoting the name if it contains spaces"
                        ),
                        &mut errors,
                    );
                    continue;
                };
                if !name.is_name() {
                    fail(
                        format!(
                            "{keyword} needs a name — fix: write `{keyword} <Name>`, \
                             quoting the name if it contains spaces"
                        ),
                        &mut errors,
                    );
                    continue;
                }
                let name = name.name();
                if by_name.contains_key(&name) {
                    fail(
                        format!(
                            "`{name}` is already declared — fix: give this one a different \
                             name, or delete this line if it repeats the earlier declaration"
                        ),
                        &mut errors,
                    );
                    continue;
                }
                let mut primitive: Option<ProcessPrimitive> = None;
                let mut interface = false;
                let mut child_model: Option<ChildRef> = None;
                let mut stock_unit = String::new();
                let mut initial_stock: Option<f64> = None;
                let mut release: Option<f64> = None;
                let mut capacity: Option<f64> = None;
                let mut time_constant: Option<f64> = None;
                let mut setpoint: Option<f64> = None;
                let mut maintenance: Option<f64> = None;
                let mut back_pressure = false;
                let mut description = String::new();
                let mut scale: Option<ScaleType> = None;
                let mut states: Option<Vec<String>> = None;
                let mut variable_kind: Option<KlirVarKind> = None;
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
                        // `description "<prose>"` — what this thing IS, in the
                        // author's words (#326). Unlike every other attribute it
                        // rides ENVIRONMENT lines too: old-bert's descriptions are
                        // mostly ON environment entities ("Distributed economic
                        // environment for decentralized monetary system"), and the
                        // opacity rule (§4.3.3.2.2) is about an env thing's
                        // INTERNALS, not about naming what it is.
                        Tok::Word(w) if w.eq_ignore_ascii_case("description") => {
                            if !description.is_empty() {
                                fail("`description` already given on this line".into(), &mut errors);
                                ok = false;
                            }
                            match attrs.get(i + 1) {
                                Some(Tok::Str(d)) => description = d.clone(),
                                _ => {
                                    fail(
                                        "description syntax: `description \"<prose>\"` \
                                         (quoted, one per line)"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                }
                            }
                            i += 2;
                        }
                        // `stock <unit>` — the stock's declared unit (#76/#94),
                        // bare or quoted (`stock ML`, `stock "kW·h"`).
                        Tok::Word(w) if w.eq_ignore_ascii_case("stock") => {
                            if role == Role::Environment {
                                fail(
                                    "`stock` applies to components only (environment \
                                     internals are opaque)"
                                        .into(),
                                    &mut errors,
                                );
                                ok = false;
                            }
                            if !stock_unit.is_empty() {
                                fail("`stock` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            match attrs.get(i + 1) {
                                Some(u) if u.is_name() && !u.name().trim().is_empty() => {
                                    stock_unit = u.name().trim().to_string();
                                }
                                _ => {
                                    fail(
                                        "stock syntax: `stock <unit>` (e.g. `stock ML`, \
                                         `stock \"kW·h\"`)"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                }
                            }
                            i += 2;
                            // `initial <n>` extends the stock clause (#112): the
                            // starting level, welded to the unit just declared so
                            // a dimensionless initial is unwritable. ≥ 0 — a
                            // stock cannot start below empty.
                            if let Some(Tok::Word(w2)) = attrs.get(i) {
                                if w2.eq_ignore_ascii_case("initial") {
                                    match attrs.get(i + 1) {
                                        Some(Tok::Word(n)) if n.parse::<f64>().is_ok() => {
                                            let v = n.parse::<f64>().unwrap();
                                            if v.is_finite() && v >= 0.0 {
                                                initial_stock = Some(v);
                                            } else {
                                                fail(
                                                    "a stock's initial level is a finite \
                                                     value ≥ 0 (a stock cannot start below \
                                                     empty)"
                                                        .into(),
                                                    &mut errors,
                                                );
                                                ok = false;
                                            }
                                        }
                                        _ => {
                                            fail(
                                                "initial syntax: `stock <unit> initial <n>` \
                                                 (e.g. `stock ML initial 4.5`)"
                                                    .into(),
                                                &mut errors,
                                            );
                                            ok = false;
                                        }
                                    }
                                    i += 2;
                                }
                            }
                        }
                        // `release <n>` — a Buffering stock's drain per time
                        // unit (#112): the kernel's cognitive_params
                        // ["release_rate"], the positive half of the pair the
                        // archived homeostat.json witnesses. Buffering-only,
                        // checked after the line completes (the primitive may
                        // be declared on either side of this clause).
                        Tok::Word(w) if w.eq_ignore_ascii_case("release") => {
                            if role == Role::Environment {
                                fail(
                                    "`release` applies to components only (environment \
                                     internals are opaque)"
                                        .into(),
                                    &mut errors,
                                );
                                ok = false;
                            }
                            if release.is_some() {
                                fail("`release` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            match attrs.get(i + 1) {
                                Some(Tok::Word(n))
                                    if n.parse::<f64>().is_ok_and(|v| v.is_finite() && v > 0.0) =>
                                {
                                    release = Some(n.parse::<f64>().unwrap());
                                }
                                _ => {
                                    fail(
                                        "release syntax: `release <positive number>` — the \
                                         stock's drain per time unit (e.g. `release 1.4`)"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                }
                            }
                            i += 2;
                        }
                        // `capacity <n>` — a Buffering stock's overflow ceiling
                        // (#112): the kernel's cognitive_params["capacity"],
                        // read by the storage clamp (circuit.rs:1342-1343 — the
                        // overflow is dissipated). Buffering-only, > 0.
                        Tok::Word(w) if w.eq_ignore_ascii_case("capacity") => {
                            if role == Role::Environment {
                                fail(
                                    "`capacity` applies to components only \
                                     (environment internals are opaque)"
                                        .into(),
                                    &mut errors,
                                );
                                ok = false;
                            }
                            if capacity.is_some() {
                                fail("`capacity` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            match attrs.get(i + 1) {
                                Some(Tok::Word(n))
                                    if n.parse::<f64>().is_ok_and(|v| v.is_finite() && v > 0.0) =>
                                {
                                    capacity = Some(n.parse::<f64>().unwrap());
                                }
                                _ => {
                                    fail(
                                        "capacity syntax: `capacity <positive number>` \
                                         — the stock's overflow ceiling \
                                         (e.g. `capacity 10`)"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                }
                            }
                            i += 2;
                        }
                        // `time constant <n>` — a Buffering stock's first-order
                        // drain coefficient τ (#112): the kernel's
                        // cognitive_params["time_constant"], read by the
                        // first-order drain (circuit.rs:1211-1212). `constant`
                        // sits behind the `time` clause head so it joins
                        // POSITIONAL_KEYWORDS rather than RESERVED_WORDS — no
                        // name slot can ever reach it (see the doctrine above
                        // POSITIONAL_KEYWORDS). Buffering-only, > 0, and
                        // MUTUALLY EXCLUSIVE with `release` on one component:
                        // the engine silently prefers time_constant whenever
                        // both are set (`base = if tc>0 {..} else
                        // {release_rate}`), so a `release` beside it would be a
                        // declaration the run never honors — refused after the
                        // line completes, the same `amount`-rule discipline
                        // `release` already follows against the wrong
                        // primitive.
                        Tok::Word(w) if w.eq_ignore_ascii_case("time") => {
                            if role == Role::Environment {
                                fail(
                                    "`time constant` applies to components only \
                                     (environment internals are opaque)"
                                        .into(),
                                    &mut errors,
                                );
                                ok = false;
                            }
                            if time_constant.is_some() {
                                fail("`time constant` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            match attrs.get(i + 1) {
                                Some(Tok::Word(c)) if c.eq_ignore_ascii_case("constant") => {
                                    match attrs.get(i + 2) {
                                        Some(Tok::Word(n))
                                            if n.parse::<f64>()
                                                .is_ok_and(|v| v.is_finite() && v > 0.0) =>
                                        {
                                            time_constant = Some(n.parse::<f64>().unwrap());
                                        }
                                        _ => {
                                            fail(
                                                "time constant syntax: `time constant \
                                                 <positive number>` — the stock's drain \
                                                 time constant τ (e.g. `time constant 3`)"
                                                    .into(),
                                                &mut errors,
                                            );
                                            ok = false;
                                        }
                                    }
                                    i += 3;
                                }
                                _ => {
                                    fail(
                                        "time constant syntax: `time constant \
                                         <positive number>`"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                    i += 1;
                                }
                            }
                        }
                        // `setpoint <n>` — an Inverting comparator's reference
                        // (#112): the kernel's cognitive_params["setpoint"],
                        // read by the comparator (circuit.rs:1292,
                        // `(node.setpoint - message).max(0.0)`). Inverting-only,
                        // > 0 — the engine's own default is 1.0 (the bare
                        // `1 − signal`), so a non-positive declared reference
                        // could never be what the author meant.
                        Tok::Word(w) if w.eq_ignore_ascii_case("setpoint") => {
                            if role == Role::Environment {
                                fail(
                                    "`setpoint` applies to components only \
                                     (environment internals are opaque)"
                                        .into(),
                                    &mut errors,
                                );
                                ok = false;
                            }
                            if setpoint.is_some() {
                                fail("`setpoint` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            match attrs.get(i + 1) {
                                Some(Tok::Word(n))
                                    if n.parse::<f64>().is_ok_and(|v| v.is_finite() && v > 0.0) =>
                                {
                                    setpoint = Some(n.parse::<f64>().unwrap());
                                }
                                _ => {
                                    fail(
                                        "setpoint syntax: `setpoint <positive number>` \
                                         — the comparator's reference value \
                                         (e.g. `setpoint 0.8`)"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                }
                            }
                            i += 2;
                        }
                        // `maintenance <n>` — a Buffering stock's per-tick
                        // upkeep loss (#112): the kernel's
                        // cognitive_params["maintenance"], read as per-tick
                        // upkeep (circuit.rs:1335-1336 — Odum depreciation,
                        // Mobus Fig 3.17). Buffering-only, > 0.
                        Tok::Word(w) if w.eq_ignore_ascii_case("maintenance") => {
                            if role == Role::Environment {
                                fail(
                                    "`maintenance` applies to components only \
                                     (environment internals are opaque)"
                                        .into(),
                                    &mut errors,
                                );
                                ok = false;
                            }
                            if maintenance.is_some() {
                                fail("`maintenance` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            match attrs.get(i + 1) {
                                Some(Tok::Word(n))
                                    if n.parse::<f64>().is_ok_and(|v| v.is_finite() && v > 0.0) =>
                                {
                                    maintenance = Some(n.parse::<f64>().unwrap());
                                }
                                _ => {
                                    fail(
                                        "maintenance syntax: `maintenance \
                                         <positive number>` — upkeep loss \
                                         charged from the stock each tick \
                                         (e.g. `maintenance 0.2`)"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                }
                            }
                            i += 2;
                        }
                        // `backpressure` — a Modulating valve's throttle flag
                        // (#112): the kernel's
                        // cognitive_params["back_pressure"], read as the
                        // throttle bool (circuit.rs:1270). Bare — there is no
                        // magnitude to decline, only the flag itself.
                        // Modulating-only.
                        Tok::Word(w) if w.eq_ignore_ascii_case("backpressure") => {
                            if role == Role::Environment {
                                fail(
                                    "`backpressure` applies to components only \
                                     (environment internals are opaque)"
                                        .into(),
                                    &mut errors,
                                );
                                ok = false;
                            }
                            if back_pressure {
                                fail("`backpressure` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            back_pressure = true;
                            i += 1;
                        }
                        // `scale <Nominal|Ordinal|Interval|Ratio>` — Klir's
                        // measurement scale for the source variable (#154). Rides
                        // env lines too (#154 revision): Table 4.1 most wants the
                        // INPUT variables characterized, and those are frequently
                        // the environmental drivers (source/sink).
                        Tok::Word(w) if w.eq_ignore_ascii_case("scale") => {
                            if scale.is_some() {
                                fail("`scale` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            match attrs.get(i + 1) {
                                Some(Tok::Word(s)) => match parse_scale(s) {
                                    Ok(sc) => scale = Some(sc),
                                    Err(msg) => {
                                        fail(msg, &mut errors);
                                        ok = false;
                                    }
                                },
                                _ => {
                                    fail(
                                        "scale syntax: `scale <Nominal|Ordinal|Interval|Ratio>`"
                                            .into(),
                                        &mut errors,
                                    );
                                    ok = false;
                                }
                            }
                            i += 2;
                        }
                        // `states {A, B, C}` — the variable's state set in Klir
                        // set notation (#154). A brace-enclosed, comma-separated
                        // list of value labels; `{}` is an explicit empty set.
                        // Rides env lines too (#154 revision), same rationale as
                        // `scale`.
                        Tok::Word(w) if w.eq_ignore_ascii_case("states") => {
                            if states.is_some() {
                                fail("`states` already given on this component".into(), &mut errors);
                                ok = false;
                            }
                            match parse_state_set(attrs, i + 1) {
                                Ok((set, next)) => {
                                    if ok {
                                        states = Some(set);
                                    }
                                    i = next;
                                }
                                Err(msg) => {
                                    fail(msg, &mut errors);
                                    ok = false;
                                    i += 1;
                                }
                            }
                        }
                        // `kind <Basic|Support>` — Klir's basic-vs-supporting
                        // standing (#154). Authored, not derived from R; `Basic`
                        // is the default (omit), so this declares the rare support
                        // variable. Rides env lines like `scale`/`states`.
                        Tok::Word(w) if w.eq_ignore_ascii_case("kind") => {
                            if variable_kind.is_some() {
                                fail("`kind` already given on this variable".into(), &mut errors);
                                ok = false;
                            }
                            match attrs.get(i + 1) {
                                Some(Tok::Word(k)) => match parse_var_kind(k) {
                                    Ok(vk) => variable_kind = Some(vk),
                                    Err(msg) => {
                                        fail(msg, &mut errors);
                                        ok = false;
                                    }
                                },
                                _ => {
                                    fail("kind syntax: `kind <Basic|Support>`".into(), &mut errors);
                                    ok = false;
                                }
                            }
                            i += 2;
                        }
                        Tok::Word(w) if w.eq_ignore_ascii_case("interface") => {
                            if role == Role::Environment {
                                fail(
                                    format!(
                                        "`interface` applies to components only (environment \
                                         internals are opaque) — fix: drop `interface` from \
                                         this line, or declare it as `component` instead of \
                                         `{keyword}` if it is inside the boundary"
                                    ),
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
                                                format!(
                                                    "`primitive` applies to components only — \
                                                     fix: drop `primitive {p}` from this line, \
                                                     or declare it as `component` instead of \
                                                     `{keyword}` if it is inside the boundary"
                                                ),
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
                                format!(
                                    "unexpected `{}` after {keyword} name — fix: quote it if it \
                                     is part of the name, or remove it; after the name only \
                                     `primitive <Name>`, `interface`, `stock \"<unit>\"`, \
                                     `release <n>`, `capacity <n>`, `time constant <n>`, \
                                     `setpoint <n>`, `maintenance <n>`, `backpressure`, \
                                     `scale <Scale>`, `states {{…}}`, `kind <Basic|Support>` \
                                     and `decomposes …` may follow",
                                    other.display()
                                ),
                                &mut errors,
                            );
                            ok = false;
                            i += 1;
                        }
                    }
                }
                // The v1 interface-decomposition refusal that lived here was
                // LIFTED 2026-08-09: SSF #43 (InterfaceDecomposition.lean,
                // merged) covers membrane-crossing flows through the
                // decomposed component, and the seam check carries the
                // crossing half (γsrc/γsnk + counterparty preservation) in
                // bert-core::decomposition. `interface` + `decomposes` on one
                // component is now a legal, checked authoring move.
                // `release` names the Buffering arm's drain and nothing else
                // reads it (#112 separating rule): on any other primitive the
                // clause would parse to a value the engine never consumes.
                if release.is_some() && primitive != Some(ProcessPrimitive::Buffering) {
                    fail(
                        "`release` applies to a Buffering component only — it is the \
                         stock's drain per time unit, and no other primitive reads it"
                            .into(),
                        &mut errors,
                    );
                    ok = false;
                }
                // The remaining five typed engine parameters (#112 slice 2),
                // each gated to the one primitive whose arm reads it —
                // otherwise the clause would parse to a value nothing
                // consumes, same rule as `release` above.
                if capacity.is_some() && primitive != Some(ProcessPrimitive::Buffering) {
                    fail(
                        "`capacity` applies to a Buffering component only — it is the \
                         stock's overflow ceiling, and no other primitive reads it"
                            .into(),
                        &mut errors,
                    );
                    ok = false;
                }
                if time_constant.is_some() && primitive != Some(ProcessPrimitive::Buffering) {
                    fail(
                        "`time constant` applies to a Buffering component only — it is \
                         the stock's first-order drain coefficient, and no other \
                         primitive reads it"
                            .into(),
                        &mut errors,
                    );
                    ok = false;
                }
                if maintenance.is_some() && primitive != Some(ProcessPrimitive::Buffering) {
                    fail(
                        "`maintenance` applies to a Buffering component only — it is \
                         the stock's per-tick upkeep loss, and no other primitive \
                         reads it"
                            .into(),
                        &mut errors,
                    );
                    ok = false;
                }
                if setpoint.is_some() && primitive != Some(ProcessPrimitive::Inverting) {
                    fail(
                        "`setpoint` applies to an Inverting component only — it is the \
                         comparator's reference value, and no other primitive reads it"
                            .into(),
                        &mut errors,
                    );
                    ok = false;
                }
                if back_pressure && primitive != Some(ProcessPrimitive::Modulating) {
                    fail(
                        "`backpressure` applies to a Modulating component only — it is \
                         the valve's throttle flag, and no other primitive reads it"
                            .into(),
                        &mut errors,
                    );
                    ok = false;
                }
                // `release` and `time constant` on one component is a
                // declaration the run will not honor, not a declaration to
                // silently pick a winner from: the engine's first-order drain
                // (circuit.rs:1211) prefers time_constant whenever it is set,
                // so an author who also wrote `release` would watch it go
                // unread. Refused, the same `amount`-rule discipline as
                // everything else in this file that would parse to a value
                // nothing consumes.
                if release.is_some() && time_constant.is_some() {
                    fail(
                        "`release` and `time constant` on the same component — the \
                         engine prefers time_constant whenever it is set, so the \
                         declared `release` would never be honored; declare one or \
                         the other"
                            .into(),
                        &mut errors,
                    );
                    ok = false;
                }
                if !ok {
                    continue;
                }
                by_name.insert(name.clone(), things.len());
                // The typed engine-parameter productions (#112): `stock …
                // initial <n>` fills initial_state["storage"]; `release`,
                // `capacity`, `time constant`, `setpoint`, `maintenance`, and
                // `backpressure` fill the matching cognitive_params key.
                // Everything else in those bags remains inexpressible and
                // keeps the emit refusal.
                let mut cognitive_params = std::collections::HashMap::new();
                if let Some(r) = release {
                    cognitive_params.insert("release_rate".to_string(), r);
                }
                if let Some(c) = capacity {
                    cognitive_params.insert("capacity".to_string(), c);
                }
                if let Some(tc) = time_constant {
                    cognitive_params.insert("time_constant".to_string(), tc);
                }
                if let Some(sp) = setpoint {
                    cognitive_params.insert("setpoint".to_string(), sp);
                }
                if let Some(m) = maintenance {
                    cognitive_params.insert("maintenance".to_string(), m);
                }
                if back_pressure {
                    cognitive_params.insert("back_pressure".to_string(), 1.0);
                }
                let mut initial_state = std::collections::HashMap::new();
                if let Some(v) = initial_stock {
                    initial_state.insert("storage".to_string(), serde_json::json!(v));
                }
                things.push(Thing {
                    id: next_id,
                    name,
                    description,
                    x: 0.0,
                    y: 0.0,
                    role,
                    env_kind,
                    primitive,
                    interface,
                    child_model,
                    stock_unit,
                    scale,
                    states,
                    variable_kind,
                    cognitive_params,
                    initial_state,
                    agency_capacity: None,
                });
                next_id += 1;
            }
            "flow" => {
                // flow A -> B [: kind] ["label"] [mere] [weight <n>]
                let (a, b, mut tail) = match rest {
                    [a, Tok::Arrow, b, tail @ ..] if a.is_name() && b.is_name() => {
                        (a.name(), b.name(), tail)
                    }
                    _ => {
                        fail(
                            "flow syntax: `flow <a> -> <b> [: <kind>] [\"label\"] \
                             [substance <s>] [amount <n>] [unit <u>] [mere] [weight <n>]`"
                                .into(),
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
                // `substance <name>` — what flows, named apart from what the
                // flow is *called* (#216, C4): "F-1.1 — iron-input" is a label,
                // `iron` is a substance.
                let mut substance = String::new();
                if let [Tok::Word(w), s, rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("substance") {
                        if let Tok::Word(v) = s {
                            if clause_head(v) {
                                fail(
                                    format!(
                                        "`substance` is missing its value — `{v}` starts the \
                                         next clause; name the substance or remove the orphan \
                                         keyword"
                                    ),
                                    &mut errors,
                                );
                                continue;
                            }
                        }
                        if !s.is_name() {
                            fail(
                                "substance syntax: `substance <name>` (bare or quoted)".into(),
                                &mut errors,
                            );
                            continue;
                        }
                        substance = s.name().trim().to_string();
                        tail = rest_tail;
                    }
                }
                // `amount <positive decimal>` — the flow's magnitude (#216, C1),
                // the kernel's `Interaction::amount`. Omitted ≠ 1: an unauthored
                // amount stays None and only projection supplies the default.
                let mut amount = None;
                if let [Tok::Word(w), rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("amount") {
                        match rest_tail {
                            [Tok::Word(n), after @ ..] => {
                                match n.parse::<bert_core::rust_decimal::Decimal>() {
                                    Ok(v) if v > bert_core::rust_decimal::Decimal::ZERO => {
                                        amount = Some(v);
                                        tail = after;
                                    }
                                    Ok(_) => {
                                        fail(
                                            "a flow's amount is a positive magnitude — to \
                                             model an absent flow, remove the line"
                                                .into(),
                                            &mut errors,
                                        );
                                        continue;
                                    }
                                    Err(_) => {
                                        fail(
                                            if clause_head(n) {
                                                format!(
                                                    "`amount` is missing its value — `{n}` \
                                                     starts the next clause; give a magnitude \
                                                     (`amount 1.5`) or remove the orphan keyword"
                                                )
                                            } else {
                                                "amount syntax: `amount <positive decimal>` \
                                                 (e.g. `amount 1.5`)"
                                                    .into()
                                            },
                                            &mut errors,
                                        );
                                        continue;
                                    }
                                }
                            }
                            _ => {
                                fail(
                                    "amount syntax: `amount <positive decimal>` \
                                     (e.g. `amount 1.5`)"
                                        .into(),
                                    &mut errors,
                                );
                                continue;
                            }
                        }
                    }
                }
                // `ample` (#9) — an availability assertion in place of a
                // magnitude: the signal is present and never the binding
                // constraint. Discovered by llm-market, where "amount 100000"
                // was the only way to say "never binding" and leaked a magic
                // number into the diagram. Refusals below, each with a
                // separating instance: ample is not a quantity, so everything
                // quantity-shaped beside it is a contradiction.
                let mut ample = false;
                if let [Tok::Word(w), rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("ample") {
                        ample = true;
                        tail = rest_tail;
                    }
                }
                if ample && amount.is_some() {
                    fail(
                        "a flow declares `amount <n>` or `ample`, not both — ample \
                         asserts availability without a magnitude; remove one"
                            .into(),
                        &mut errors,
                    );
                    continue;
                }
                if ample && kind != Kind::Informational {
                    fail(
                        "`ample` asserts signal availability — only an `: informational` \
                         flow can be ample; matter and energy are metered"
                            .into(),
                        &mut errors,
                    );
                    continue;
                }
                // `unit <name>` — the magnitude's unit (#216, C1), bare or
                // quoted (`unit ML/mo`, `unit "kW·h"`).
                let mut unit = String::new();
                if let [Tok::Word(w), u, rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("unit") {
                        if let Tok::Word(v) = u {
                            if clause_head(v) {
                                fail(
                                    format!(
                                        "`unit` is missing its value — `{v}` starts the next \
                                         clause; name the unit or remove the orphan keyword"
                                    ),
                                    &mut errors,
                                );
                                continue;
                            }
                        }
                        if !u.is_name() {
                            fail(
                                "unit syntax: `unit <name>` (e.g. `unit ML/mo`, \
                                 `unit \"kW·h\"`)"
                                    .into(),
                                &mut errors,
                            );
                            continue;
                        }
                        unit = u.name().trim().to_string();
                        tail = rest_tail;
                    }
                }
                if ample && !unit.is_empty() {
                    fail(
                        "`unit` on an `ample` flow — ample has no magnitude to \
                         measure; remove one"
                            .into(),
                        &mut errors,
                    );
                    continue;
                }
                let mut is_bond = true;
                if let [Tok::Word(w), rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("mere") {
                        is_bond = false;
                        tail = rest_tail;
                    }
                }
                // A quantity on a `mere` relation is a contradiction, not an
                // option to drop: a non-bond never projects, so a magnitude on
                // it could never mean anything. Refuse rather than default.
                if !is_bond && (amount.is_some() || !unit.is_empty() || !substance.is_empty() || ample) {
                    fail(
                        "`substance`/`amount`/`unit`/`ample` on a `mere` relation — a \
                         mere relation never projects, so a quantity (or availability) \
                         on it cannot mean anything; remove the clause or the `mere`"
                            .into(),
                        &mut errors,
                    );
                    continue;
                }
                // `weight <n>` — per-transition count for the #67 DTMC read
                // (`markov_edges`); omit for the uniform default 1.
                let mut weight = None;
                let mut description = String::new();
                let mut usability: Option<InteractionUsability> = None;
                if let [Tok::Word(w), rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("weight") {
                        match rest_tail {
                            [Tok::Word(n), after @ ..] => match n.parse::<u64>() {
                                Ok(v) => {
                                    weight = Some(v);
                                    tail = after;
                                }
                                Err(_) => {
                                    fail(
                                        if clause_head(n) {
                                            format!(
                                                "`weight` is missing its value — `{n}` starts \
                                                 the next clause; give a count or remove the \
                                                 orphan keyword"
                                            )
                                        } else {
                                            "weight syntax: `weight <non-negative integer>`".into()
                                        },
                                        &mut errors,
                                    );
                                    continue;
                                }
                            },
                            _ => {
                                fail(
                                    "weight syntax: `weight <non-negative integer>`".into(),
                                    &mut errors,
                                );
                                continue;
                            }
                        }
                    }
                }
                // `usability <Resource|Disruption|Product|Waste>` — Mobus's
                // reading of what this crossing IS to the system (#331): a 2x2
                // of direction against value. Undeclared says nothing; only
                // projection supplies a default.
                if let [Tok::Word(w), rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("usability") {
                        match rest_tail {
                            [Tok::Word(v), after @ ..] => {
                                usability = match v.to_ascii_lowercase().as_str() {
                                    "resource" => Some(InteractionUsability::Resource),
                                    "disruption" => Some(InteractionUsability::Disruption),
                                    "product" => Some(InteractionUsability::Product),
                                    "waste" => Some(InteractionUsability::Waste),
                                    other => {
                                        fail(
                                            format!(
                                                "unknown usability `{other}` \
                                                 (Resource | Disruption | Product | Waste)"
                                            ),
                                            &mut errors,
                                        );
                                        continue;
                                    }
                                };
                                tail = after;
                            }
                            _ => {
                                fail(
                                    "usability syntax: `usability \
                                     <Resource|Disruption|Product|Waste>`"
                                        .into(),
                                    &mut errors,
                                );
                                continue;
                            }
                        }
                    }
                }
                // `description "<prose>"` — what this flow IS, in the author's
                // words (#326). Trails the clause chain, because it is the one
                // clause whose value is a sentence and putting it last keeps
                // the machine-readable clauses adjacent and scannable.
                if let [Tok::Word(w), rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("description") {
                        match rest_tail {
                            [Tok::Str(d), after @ ..] => {
                                description = d.clone();
                                tail = after;
                            }
                            _ => {
                                fail(
                                    "description syntax: `description \"<prose>\"` (quoted)".into(),
                                    &mut errors,
                                );
                                continue;
                            }
                        }
                    }
                }
                if !tail.is_empty() {
                    fail(
                        format!(
                            "unexpected `{}` at end of flow — fix: quote it if it is the flow's \
                             label, or remove it; a flow reads \
                             `flow <a> -> <b> [: <kind>] [\"label\"] [substance <s>] \
                             [amount <n>] [unit <u>] [mere] [weight <n>] \
                             [usability <Resource|Disruption|Product|Waste>] \
                             [description \"<prose>\"]`",
                            tail[0].display()
                        ),
                        &mut errors,
                    );
                    continue;
                }
                let (Some(&ai), Some(&bi)) = (by_name.get(&a), by_name.get(&b)) else {
                    // Which END is missing decides the repair: an undeclared TARGET is a
                    // sink, an undeclared ORIGIN is a source. The rule alone leaves the
                    // author to guess the line to write; naming it is what makes this a
                    // modeling aid rather than a critic (#230).
                    let (missing, keyword) = if by_name.contains_key(&a) {
                        (&b, "sink")
                    } else {
                        (&a, "source")
                    };
                    let decl = as_name(missing);
                    fail(
                        format!(
                            "`{missing}` is not declared (declare things before flows) — \
                             fix: add `{keyword} {decl}` above this line, or \
                             `component {decl}` if it sits inside the boundary"
                        ),
                        &mut errors,
                    );
                    continue;
                };
                relations.push(Relation {
                    id: next_id,
                    a: things[ai].id,
                    b: things[bi].id,
                    name,
                    description,
                    usability,
                    is_bond,
                    kind,
                    klir_directed: false,
                    weight,
                    amount,
                    unit,
                    substance,
                    ample,
                });
                next_id += 1;
            }
            "param" => {
                // param "Name" : flow <a> -> <b> ["label"] [range <min>..<max>]
                // param shares "Name" : from <process>
                //
                // A declared parameter (walkthrough #18): a domain name over an
                // already-declared amount. It stores no value — the value IS the
                // anchored amount — so an anchor that resolves to nothing
                // adjustable is a fault, never a bag (#112 register, rule 1).
                let syntax = "param syntax: `param \"Name\" : flow <a> -> <b> \
                              [\"label\"] [range <min>..<max>]` or `param shares \
                              \"Name\" : from <process>`";
                let is_shares = matches!(rest, [Tok::Word(w), ..] if w.eq_ignore_ascii_case("shares"));
                let body = if is_shares { &rest[1..] } else { rest };
                let (name_tok, after_colon) = match body {
                    [n, Tok::Colon, tail @ ..] if n.is_name() => (n, tail),
                    _ => {
                        fail(syntax.into(), &mut errors);
                        continue;
                    }
                };
                let pname = name_tok.name().trim().to_string();
                if pname.is_empty() {
                    fail("a param needs a non-empty name".into(), &mut errors);
                    continue;
                }
                if params.iter().any(|p: &crate::canvas::ParamDecl| p.name == pname) {
                    fail(
                        format!(
                            "param `{pname}` already declared — param names are unique \
                             (they are what scenarios will reference)"
                        ),
                        &mut errors,
                    );
                    continue;
                }
                if is_shares {
                    // shares form: `: from <process>`
                    let process = match after_colon {
                        [Tok::Word(f), p] if f.eq_ignore_ascii_case("from") && p.is_name() => {
                            p.name()
                        }
                        _ => {
                            fail(syntax.into(), &mut errors);
                            continue;
                        }
                    };
                    let Some(&pi) = by_name.get(&process) else {
                        fail(
                            format!("`{process}` is not declared (declare things and flows before params)"),
                            &mut errors,
                        );
                        continue;
                    };
                    let thing = &things[pi];
                    if thing.role != Role::Component {
                        fail(
                            format!(
                                "`{process}` is an environment thing — shares present a \
                                 process's out-fanout, so `from` must name a component"
                            ),
                            &mut errors,
                        );
                        continue;
                    }
                    let fanout = relations
                        .iter()
                        .filter(|r| r.a == thing.id && r.is_bond && r.amount.is_some())
                        .count();
                    if fanout < 2 {
                        fail(
                            format!(
                                "`{process}` has {fanout} outgoing declared amount(s) — \
                                 shares need a fanout of at least 2 to present as a split"
                            ),
                            &mut errors,
                        );
                        continue;
                    }
                    params.push(crate::canvas::ParamDecl {
                        name: pname,
                        anchor: crate::canvas::ParamAnchor::Shares { thing: thing.id },
                        range: None,
                    });
                    continue;
                }
                // flow form: `: flow <a> -> <b> ["label"] [range <min>..<max>]`
                let (a, b, mut tail) = match after_colon {
                    [Tok::Word(f), a, Tok::Arrow, b, tail @ ..]
                        if f.eq_ignore_ascii_case("flow") && a.is_name() && b.is_name() =>
                    {
                        (a.name(), b.name(), tail)
                    }
                    _ => {
                        fail(syntax.into(), &mut errors);
                        continue;
                    }
                };
                let mut label: Option<String> = None;
                if let [Tok::Str(l), rest_tail @ ..] = tail {
                    label = Some(l.clone());
                    tail = rest_tail;
                }
                let mut range = None;
                if let [Tok::Word(w), rest_tail @ ..] = tail {
                    if w.eq_ignore_ascii_case("range") {
                        let bounds = match rest_tail {
                            [Tok::Word(spec), after @ ..] => {
                                let parsed = spec.split_once("..").and_then(|(lo, hi)| {
                                    let lo = lo.parse::<bert_core::rust_decimal::Decimal>().ok()?;
                                    let hi = hi.parse::<bert_core::rust_decimal::Decimal>().ok()?;
                                    Some((lo, hi, after))
                                });
                                match parsed {
                                    Some(p) => p,
                                    None => {
                                        fail(
                                            "range syntax: `range <min>..<max>` (e.g. `range 0..12000`)"
                                                .into(),
                                            &mut errors,
                                        );
                                        continue;
                                    }
                                }
                            }
                            _ => {
                                fail(
                                    "range syntax: `range <min>..<max>` (e.g. `range 0..12000`)"
                                        .into(),
                                    &mut errors,
                                );
                                continue;
                            }
                        };
                        let (lo, hi, after) = bounds;
                        if lo < bert_core::rust_decimal::Decimal::ZERO || lo >= hi {
                            fail(
                                "a range needs `0 <= min < max` — it bounds a positive magnitude"
                                    .into(),
                                &mut errors,
                            );
                            continue;
                        }
                        range = Some(crate::canvas::ParamRange { min: lo, max: hi });
                        tail = after;
                    }
                }
                if !tail.is_empty() {
                    fail(format!("unexpected `{}` at end of param — {syntax}", tail[0].display()), &mut errors);
                    continue;
                }
                let (Some(&ai), Some(&bi)) = (by_name.get(&a), by_name.get(&b)) else {
                    let missing = if by_name.contains_key(&a) { &b } else { &a };
                    fail(
                        format!("`{missing}` is not declared (declare things and flows before params)"),
                        &mut errors,
                    );
                    continue;
                };
                let (aid, bid) = (things[ai].id, things[bi].id);
                let candidates: Vec<&Relation> = relations
                    .iter()
                    .filter(|r| r.a == aid && r.b == bid && r.is_bond)
                    .filter(|r| label.as_deref().is_none_or(|l| r.name == l))
                    .collect();
                let rel = match candidates.as_slice() {
                    [] => {
                        let with = label
                            .as_deref()
                            .map(|l| format!(" labeled \"{l}\""))
                            .unwrap_or_default();
                        fail(
                            format!(
                                "no flow `{a} -> {b}`{with} is declared above this line — \
                                 a param names an existing declared amount"
                            ),
                            &mut errors,
                        );
                        continue;
                    }
                    [one] => *one,
                    many => {
                        let labels = many
                            .iter()
                            .map(|r| format!("\"{}\"", r.name))
                            .collect::<Vec<_>>()
                            .join(", ");
                        fail(
                            format!(
                                "{} flows run `{a} -> {b}` — disambiguate with the flow's \
                                 label: {labels}",
                                many.len()
                            ),
                            &mut errors,
                        );
                        continue;
                    }
                };
                let Some(amount) = rel.amount else {
                    fail(
                        format!(
                            "flow `{a} -> {b}` declares no amount — a param names an \
                             adjustable declared magnitude; add `amount <n>` to the flow"
                        ),
                        &mut errors,
                    );
                    continue;
                };
                if let Some(r) = &range {
                    if amount < r.min || amount > r.max {
                        fail(
                            format!(
                                "the flow's declared amount {amount} lies outside the param's \
                                 range {}..{} — the range contradicts the model",
                                r.min, r.max
                            ),
                            &mut errors,
                        );
                        continue;
                    }
                }
                params.push(crate::canvas::ParamDecl {
                    name: pname,
                    anchor: crate::canvas::ParamAnchor::Flow { relation: rel.id },
                    range,
                });
            }
            "metric" => {
                // metric "Name" : share of flow <a> -> <b> ["label"]
                // metric "Name" : sum into <thing>
                //
                // A declared metric (#203): a domain name over a computed
                // OUTPUT of the trace — the output twin of `param`. The verb
                // set is closed and grows one checkable verb at a time (ADR
                // 0006); each verb owes a refusal a model can actually earn,
                // so a metric that can only ever read one value is a fault,
                // never a bag.
                let syntax = "metric syntax: `metric \"Name\" : share of flow \
                              <a> -> <b> [\"label\"]` or `metric \"Name\" : \
                              sum into <thing>`";
                let (name_tok, after_colon) = match rest {
                    [n, Tok::Colon, tail @ ..] if n.is_name() => (n, tail),
                    _ => {
                        fail(syntax.into(), &mut errors);
                        continue;
                    }
                };
                let mname = name_tok.name().trim().to_string();
                if mname.is_empty() {
                    fail("a metric needs a non-empty name".into(), &mut errors);
                    continue;
                }
                if metrics.iter().any(|m: &crate::canvas::MetricDecl| m.name == mname) {
                    fail(
                        format!(
                            "metric `{mname}` already declared — metric names are unique \
                             (they are what scenario comparisons will reference)"
                        ),
                        &mut errors,
                    );
                    continue;
                }
                match after_colon {
                    // share of flow <a> -> <b> ["label"]
                    [Tok::Word(s), Tok::Word(o), Tok::Word(f), a, Tok::Arrow, b, tail @ ..]
                        if s.eq_ignore_ascii_case("share")
                            && o.eq_ignore_ascii_case("of")
                            && f.eq_ignore_ascii_case("flow")
                            && a.is_name()
                            && b.is_name() =>
                    {
                        let (a, b) = (a.name(), b.name());
                        let label: Option<String> = match tail {
                            [] => None,
                            [Tok::Str(l)] => Some(l.clone()),
                            [t, ..] => {
                                fail(
                                    format!("unexpected `{}` at end of metric — {syntax}", t.display()),
                                    &mut errors,
                                );
                                continue;
                            }
                        };
                        let (Some(&ai), Some(&bi)) = (by_name.get(&a), by_name.get(&b)) else {
                            let missing = if by_name.contains_key(&a) { &b } else { &a };
                            fail(
                                format!("`{missing}` is not declared (declare things and flows before metrics)"),
                                &mut errors,
                            );
                            continue;
                        };
                        let (aid, bid) = (things[ai].id, things[bi].id);
                        let candidates: Vec<&Relation> = relations
                            .iter()
                            .filter(|r| r.a == aid && r.b == bid && r.is_bond)
                            .filter(|r| label.as_deref().is_none_or(|l| r.name == l))
                            .collect();
                        let rel = match candidates.as_slice() {
                            [] => {
                                let with = label
                                    .as_deref()
                                    .map(|l| format!(" labeled \"{l}\""))
                                    .unwrap_or_default();
                                fail(
                                    format!(
                                        "no flow `{a} -> {b}`{with} is declared above this line — \
                                         a metric reads an existing flow"
                                    ),
                                    &mut errors,
                                );
                                continue;
                            }
                            [one] => *one,
                            many => {
                                let labels = many
                                    .iter()
                                    .map(|r| format!("\"{}\"", r.name))
                                    .collect::<Vec<_>>()
                                    .join(", ");
                                fail(
                                    format!(
                                        "{} flows run `{a} -> {b}` — disambiguate with the flow's \
                                         label: {labels}",
                                        many.len()
                                    ),
                                    &mut errors,
                                );
                                continue;
                            }
                        };
                        // The separating instance (SSF #35): a share over a
                        // source with one outflow is identically 1 — a metric
                        // that cannot vary watches nothing, so it is refused,
                        // not rendered.
                        let fanout = relations.iter().filter(|r| r.a == aid && r.is_bond).count();
                        if fanout < 2 {
                            fail(
                                format!(
                                    "`{a}` has {fanout} outgoing flow(s) — a share over a single \
                                     outflow is identically 1, nothing to watch"
                                ),
                                &mut errors,
                            );
                            continue;
                        }
                        metrics.push(crate::canvas::MetricDecl {
                            name: mname,
                            expr: crate::canvas::MetricExpr::ShareOfFlow { relation: rel.id },
                        });
                    }
                    // sum into <thing>
                    [Tok::Word(s), Tok::Word(i), t]
                        if s.eq_ignore_ascii_case("sum")
                            && i.eq_ignore_ascii_case("into")
                            && t.is_name() =>
                    {
                        let target = t.name();
                        let Some(&ti) = by_name.get(&target) else {
                            fail(
                                format!("`{target}` is not declared (declare things and flows before metrics)"),
                                &mut errors,
                            );
                            continue;
                        };
                        let tid = things[ti].id;
                        // The separating instance: a thing nothing flows into
                        // names a value the recorder never writes.
                        let inflows = relations.iter().filter(|r| r.b == tid && r.is_bond).count();
                        if inflows == 0 {
                            fail(
                                format!(
                                    "nothing flows into `{target}` — a sum over no inflows \
                                     names a value the run never produces"
                                ),
                                &mut errors,
                            );
                            continue;
                        }
                        metrics.push(crate::canvas::MetricDecl {
                            name: mname,
                            expr: crate::canvas::MetricExpr::SumInto { thing: tid },
                        });
                    }
                    _ => {
                        fail(syntax.into(), &mut errors);
                    }
                }
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
                    "unknown keyword `{other}` (system, domain, time, level, component, source, \
                     sink, environment, flow, boundary) — fix: replace `{other}` with one of \
                     those, or prefix the line with `#` to make it a comment"
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
        description,
        time_unit,
        params,
        metrics,
        klir_level,
    };
    auto_layout(&mut model, &positions);
    Ok(SlParse {
        model,
        lens_explicit,
    })
}

/// Place things deterministically: explicit `@pos` wins; otherwise components
/// take the inner N-gon in declaration order, and environment things the outer
/// ring **by role, not by declaration index** — sources on the left arc, sinks
/// on the right arc, so the picture reads left to right the way the flows run
/// (bert-lenses#309). Declaration order is the tie-break *within* a role, top to
/// bottom. A lone component sits at the center.
fn auto_layout(model: &mut CanvasModel, positions: &HashMap<String, (f32, f32)>) {
    use std::f32::consts::{FRAC_PI_2, PI, SQRT_2, TAU};
    let ring = |i: usize, n: usize, radius: f32, start: f32| -> (f32, f32) {
        let angle = start + (i as f32) * TAU / (n.max(1) as f32);
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
        let (x, y) = match components.len() {
            1 => CENTER,
            // Two components spread HORIZONTALLY (#216, E2). The generic ring
            // starts at −π/2, which for n = 2 stacks both on one vertical line
            // — every edge through both labels, destroying exactly what the
            // sibling sets exist to show. First declared sits left.
            2 => ring(slot, 2, COMPONENT_RADIUS, PI),
            n => ring(slot, n, COMPONENT_RADIUS, -FRAC_PI_2),
        };
        model.things[i].x = x;
        model.things[i].y = y;
    }
    // The env ring must CLEAR the Mobus membrane the face will draw (#216, E1).
    // The face derives the membrane from the component extent (geometry.ts::
    // componentRing: bbox halves × √2 + RING_PAD), while ENV_RADIUS was pinned —
    // for any real spread the two collided, and an env node on the membrane is a
    // picture of C ∩ E ≠ ∅. Mirror the face's math here (NODE_R = style.ts
    // nodeR = canvas.rs RADIUS = 34; RING_PAD = NODE_R + 36) and push the ring
    // outside it. Pinned components count: the membrane wraps them too.
    const NODE_R: f32 = 34.0;
    const RING_PAD: f32 = NODE_R + 36.0;
    const CLEARANCE: f32 = 24.0;
    let comp_pts: Vec<(f32, f32)> = model
        .things
        .iter()
        .filter(|t| t.role == Role::Component)
        .map(|t| positions.get(&t.name).copied().unwrap_or((t.x, t.y)))
        .collect();
    let env_radius = if comp_pts.is_empty() {
        ENV_RADIUS
    } else {
        let (min_x, max_x) = comp_pts
            .iter()
            .fold((f32::MAX, f32::MIN), |(lo, hi), p| (lo.min(p.0), hi.max(p.0)));
        let (min_y, max_y) = comp_pts
            .iter()
            .fold((f32::MAX, f32::MIN), |(lo, hi), p| (lo.min(p.1), hi.max(p.1)));
        let membrane_max = (((max_x - min_x) / 2.0) * SQRT_2 + RING_PAD)
            .max(((max_y - min_y) / 2.0) * SQRT_2 + RING_PAD);
        let center_offset = (((min_x + max_x) / 2.0 - CENTER.0).powi(2)
            + ((min_y + max_y) / 2.0 - CENTER.1).powi(2))
        .sqrt();
        ENV_RADIUS.max(center_offset + membrane_max + NODE_R + CLEARANCE)
    };
    // Placement by ROLE, not by declaration index (#309). The ring used to be
    // indexed by declaration order alone, so whether an input landed left or
    // right was an accident of the order the author typed things in — a model
    // could render with its sources right of its sinks and read backwards.
    // Sources take the left arc (centered on π), sinks the right arc (centered
    // on 0), so flow runs left to right. Untouched neutrals — things the author
    // declared `environment` and never wired — are ambient, not a stage of the
    // flow, so they take the top gap. A neutral that IS wired resolves the same
    // way `project()` resolves it: originates a bond → source side, else sink.
    //
    // The arcs are capped at ±SIDE_SPAN/2 so a side can never wrap into the
    // other side's territory, and the ring radius grows if a crowded side would
    // otherwise pack its nodes closer than MIN_SEP. One source and six sinks
    // therefore still reads as one-in / six-out rather than as a scatter, and a
    // model with only sources (or only sinks) fans out along its own arc instead
    // of collapsing onto one point.
    const SIDE_SPAN: f32 = TAU / 3.0; // 120°: left arc 120°–240°, right −60°–60°
    const AMBIENT_SPAN: f32 = PI / 4.0; // 45° in the 60° gap above the two sides
    const MIN_SEP: f32 = 2.0 * NODE_R + 32.0;
    let bonds: Vec<&crate::canvas::Relation> =
        model.relations.iter().filter(|r| r.is_bond).collect();
    let originates: std::collections::HashSet<u64> = bonds.iter().map(|r| r.a).collect();
    let touched: std::collections::HashSet<u64> =
        bonds.iter().flat_map(|r| [r.a, r.b]).collect();
    // (center angle, direction of increasing declaration index, span cap)
    // `dir` is chosen so the first-declared member of a group sits topmost
    // (y grows downward, so sin > 0 is below the centre).
    let mut sources: Vec<usize> = Vec::new();
    let mut sinks: Vec<usize> = Vec::new();
    let mut ambient: Vec<usize> = Vec::new();
    for &i in &env {
        let t = &model.things[i];
        match t.env_kind {
            EnvKind::Source => sources.push(i),
            EnvKind::Sink => sinks.push(i),
            EnvKind::Neutral => {
                if !touched.contains(&t.id) {
                    ambient.push(i);
                } else if originates.contains(&t.id) {
                    sources.push(i);
                } else {
                    sinks.push(i);
                }
            }
        }
    }
    let groups: [(&Vec<usize>, f32, f32, f32); 3] = [
        (&sources, PI, -1.0, SIDE_SPAN),
        (&sinks, 0.0, 1.0, SIDE_SPAN),
        (&ambient, -FRAC_PI_2, 1.0, AMBIENT_SPAN),
    ];
    // One radius for the whole ring: the largest any group needs to hold MIN_SEP.
    let mut radius = env_radius;
    for (members, _, _, span) in &groups {
        if members.len() >= 2 {
            let step = span / (members.len() - 1) as f32;
            radius = radius.max(MIN_SEP / (2.0 * (step / 2.0).sin()));
        }
    }
    for (members, center, dir, span) in groups {
        let k = members.len();
        let step = if k >= 2 { span / (k - 1) as f32 } else { 0.0 };
        for (slot, &i) in members.iter().enumerate() {
            let angle = center + dir * (slot as f32 - (k - 1) as f32 / 2.0) * step;
            model.things[i].x = CENTER.0 + radius * angle.cos();
            model.things[i].y = CENTER.1 + radius * angle.sin();
        }
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
    if !model.description.is_empty() {
        writeln!(out, "description {}", quote(&model.description)?).unwrap();
    }
    // The model's time-unit symbol (#94) — header block, with system/domain.
    if let Some(tu) = model.time_unit.as_deref().map(str::trim).filter(|t| !t.is_empty()) {
        writeln!(out, "time unit {}", name_token(tu)?).unwrap();
    }
    // The declared Klir epistemological level (#288) — header block, last.
    if let Some(lv) = model.klir_level {
        writeln!(out, "level {lv:?}").unwrap();
    }

    // things — env identity edge-derived from bonds, mirroring project()
    // Both retained: `emit_sl` no longer derives the env keyword (#216), but the
    // helpers still serve the flow section below.
    let _originates = |id: u64| model.relations.iter().any(|r| r.is_bond && r.a == id);
    let _touched = |id: u64| model.relations.iter().any(|r| r.is_bond && (r.a == id || r.b == id));
    for t in &model.things {
        // Echo the author's word, do not re-derive it (#216). This used to read the
        // flow direction — `originates → "source"`, else `touched → "sink"` — which
        // silently rewrote a declared `sink y` as `source y` whenever `y` happened to
        // have an outgoing flow, falsifying corpus headers that claim a fixed
        // composition. A round trip must return what was written.
        // §7.3: refuse loudly rather than lose information silently. The canvas
        // carries a loaded model's engine-parameter bags opaquely (#216). #112
        // types `initial_state["storage"]` (needs a declared stock unit to
        // carry its dimension) and six `cognitive_params` keys, each gated to
        // the one primitive whose engine arm reads it — and the refusal
        // NARROWS to everything else: an untyped key, or a typed key on the
        // wrong primitive, would be silently dropped (or silently wrong) on
        // emit, which is the exact loss this check exists to make impossible.
        // `cognitive_params` still owes this refusal after #112 lands in
        // full: a loaded JSON can carry arbitrary keys the parser has no
        // production for (compose's exporter writes the bag directly, §8.2
        // of the spec), so "unknown key arrives" stays a live path and the
        // check stays load-bearing rather than dead.
        let initial_expressible = t.initial_state.is_empty()
            || (t.role == Role::Component
                && !t.stock_unit.is_empty()
                && t.initial_state.len() == 1
                && t.initial_state
                    .get("storage")
                    .and_then(|v| v.as_f64())
                    .is_some_and(f64::is_finite));
        // `release_rate` and `time_constant` together is the same
        // never-honored declaration the parser refuses (§ above): the engine
        // prefers time_constant whenever both are set, so emitting both would
        // write text that cannot re-parse to what it started as.
        let release_tc_conflict = t.cognitive_params.contains_key("release_rate")
            && t.cognitive_params.contains_key("time_constant");
        let cognitive_expressible = t.cognitive_params.is_empty()
            || (t.role == Role::Component
                && !release_tc_conflict
                && t.cognitive_params.iter().all(|(k, v)| match k.as_str() {
                    "release_rate" | "capacity" | "time_constant" | "maintenance" => {
                        t.primitive == Some(ProcessPrimitive::Buffering)
                            && v.is_finite()
                            && *v > 0.0
                    }
                    "setpoint" => {
                        t.primitive == Some(ProcessPrimitive::Inverting)
                            && v.is_finite()
                            && *v > 0.0
                    }
                    "back_pressure" => t.primitive == Some(ProcessPrimitive::Modulating),
                    _ => false,
                }));
        if !(initial_expressible && cognitive_expressible) {
            return Err(format!(
                "`{}` carries engine parameters SL cannot express (#112 covers \
                 `stock <unit> initial <n>` and, gated to their reading \
                 primitive, `release <n>` / `capacity <n>` / `time constant <n>` \
                 / `maintenance <n>` on Buffering, `setpoint <n>` on Inverting, \
                 and `backpressure` on Modulating) — export the model as kernel \
                 JSON instead of SL",
                t.name
            ));
        }
        let keyword = match (t.role, t.env_kind) {
            (Role::Component, _) => "component",
            (Role::Environment, EnvKind::Source) => "source",
            (Role::Environment, EnvKind::Sink) => "sink",
            (Role::Environment, EnvKind::Neutral) => "environment",
        };
        write!(out, "{keyword} {}", name_token(&t.name)?).unwrap();
        if t.role == Role::Component {
            if let Some(p) = t.primitive {
                write!(out, " primitive {p:?}").unwrap();
            }
            if t.interface {
                write!(out, " interface").unwrap();
            }
            // Declared stock unit (#76/#94) — before `decomposes` (which stays last).
            if !t.stock_unit.is_empty() {
                write!(out, " stock {}", name_token(&t.stock_unit)?).unwrap();
                // The starting level rides its unit (#112) — expressibility was
                // gated above, so the read here cannot miss.
                if let Some(v) = t.initial_state.get("storage").and_then(|v| v.as_f64()) {
                    write!(out, " initial {v}").unwrap();
                }
            }
            // The six typed cognitive_params keys emit in this fixed order
            // (#112): `release`, then the four remaining Buffering/Inverting/
            // Modulating clauses, matching the order they are documented in
            // spec.md §4.3.
            if let Some(r) = t.cognitive_params.get("release_rate") {
                write!(out, " release {r}").unwrap();
            }
            if let Some(c) = t.cognitive_params.get("capacity") {
                write!(out, " capacity {c}").unwrap();
            }
            if let Some(tc) = t.cognitive_params.get("time_constant") {
                write!(out, " time constant {tc}").unwrap();
            }
            if let Some(sp) = t.cognitive_params.get("setpoint") {
                write!(out, " setpoint {sp}").unwrap();
            }
            if let Some(m) = t.cognitive_params.get("maintenance") {
                write!(out, " maintenance {m}").unwrap();
            }
            if t.cognitive_params.contains_key("back_pressure") {
                write!(out, " backpressure").unwrap();
            }
        }
        // Klir source-system metadata (#154): kind, then scale, then state set.
        // Emitted on env things too (#154 revision) — Table 4.1 characterizes the
        // input variables, which are frequently the environmental drivers.
        if let Some(vk) = t.variable_kind {
            write!(out, " kind {vk:?}").unwrap();
        }
        if let Some(sc) = t.scale {
            write!(out, " scale {sc:?}").unwrap();
        }
        if let Some(set) = &t.states {
            let labels = set
                .iter()
                .map(|s| name_token(s))
                .collect::<Result<Vec<_>, _>>()?
                .join(", ");
            write!(out, " states {{{labels}}}").unwrap();
        }
        // Prose last but one, before `decomposes` (#326). It is the only
        // clause whose value is a sentence, so keeping it at the end leaves
        // the machine-readable clauses adjacent and scannable.
        if !t.description.is_empty() {
            write!(out, " description {}", quote(&t.description)?).unwrap();
        }
        if t.role == Role::Component {
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
        // Quantity clauses (#216, C1/C4), echoed in parse order: substance,
        // amount, unit — before `mere`/`weight`. Omitted where unauthored, so
        // the declared-1 / undeclared distinction survives the round trip.
        if !r.substance.is_empty() {
            write!(out, " substance {}", name_token(&r.substance)?).unwrap();
        }
        if r.ample {
            // Ample replaces the quantity clauses; a model carrying both (out
            // of contract) canonicalizes to ample, matching the engine, where
            // an ample wire's amount can never act.
            write!(out, " ample").unwrap();
        }
        if let Some(a) = r.amount.filter(|_| !r.ample) {
            write!(out, " amount {a}").unwrap();
        }
        if !r.unit.is_empty() {
            write!(out, " unit {}", name_token(&r.unit)?).unwrap();
        }
        if !r.is_bond {
            write!(out, " mere").unwrap();
        }
        if let Some(w) = r.weight {
            write!(out, " weight {w}").unwrap();
        }
        if let Some(u) = r.usability {
            write!(out, " usability {u:?}").unwrap();
        }
        if !r.description.is_empty() {
            write!(out, " description {}", quote(&r.description)?).unwrap();
        }
        out.push('\n');
    }

    // params (walkthrough #18) — after flows (they reference them), before
    // boundary. The flow's label is always emitted when present, so the
    // canonical form never depends on whether the pair happens to be
    // ambiguous today.
    for p in &model.params {
        match p.anchor {
            crate::canvas::ParamAnchor::Flow { relation } => {
                let r = model
                    .relations
                    .iter()
                    .find(|r| r.id == relation)
                    .ok_or_else(|| format!("param `{}` anchors relation {relation}, which names no flow", p.name))?;
                write!(
                    out,
                    "param {} : flow {} -> {}",
                    quote(&p.name)?,
                    name_token(&name_of(r.a)?)?,
                    name_token(&name_of(r.b)?)?
                )
                .unwrap();
                if !r.name.is_empty() {
                    write!(out, " {}", quote(&r.name)?).unwrap();
                }
                if let Some(range) = &p.range {
                    write!(out, " range {}..{}", range.min, range.max).unwrap();
                }
            }
            crate::canvas::ParamAnchor::Shares { thing } => {
                write!(
                    out,
                    "param shares {} : from {}",
                    quote(&p.name)?,
                    name_token(&name_of(thing)?)?
                )
                .unwrap();
            }
        }
        out.push('\n');
    }

    // metrics (#203) — after params (the input/output twins read together).
    // Same canonical-form rule as params: the flow's label is always emitted
    // when present, never only when the pair happens to be ambiguous today.
    for m in &model.metrics {
        match m.expr {
            crate::canvas::MetricExpr::ShareOfFlow { relation } => {
                let r = model
                    .relations
                    .iter()
                    .find(|r| r.id == relation)
                    .ok_or_else(|| {
                        format!("metric `{}` anchors relation {relation}, which names no flow", m.name)
                    })?;
                write!(
                    out,
                    "metric {} : share of flow {} -> {}",
                    quote(&m.name)?,
                    name_token(&name_of(r.a)?)?,
                    name_token(&name_of(r.b)?)?
                )
                .unwrap();
                if !r.name.is_empty() {
                    write!(out, " {}", quote(&r.name)?).unwrap();
                }
            }
            crate::canvas::MetricExpr::SumInto { thing } => {
                write!(
                    out,
                    "metric {} : sum into {}",
                    quote(&m.name)?,
                    name_token(&name_of(thing)?)?
                )
                .unwrap();
            }
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

/// Rewrite only the `@pos` lines of an SL source, leaving every other byte of
/// it alone — the layout half of a round-trip, without the round-trip.
///
/// [`emit_sl`] is canonicalizing, which is the right behaviour for producing
/// text from a model and the wrong one for *updating* text an author wrote.
/// Emit reproduces the model, and a model does not carry comments, blank lines,
/// or the order the author chose to explain things in; re-emitting a documented
/// file to save a drag therefore trades every word of its prose for four
/// numbers. That loss is #262's subject. This function exists so that moving a
/// node does not have to wait for it: positions are the one part of the text
/// that is *purely* derived from the model, so they can be replaced in place
/// while nothing else is touched.
///
/// A line counts as a position line exactly when the parser would read it as
/// one — `tokenize` decides, so a `#` inside a quoted name and a `@pos` inside
/// a comment are both handled the way the parser handles them, rather than by
/// a second guess at its rules. A line that fails to tokenize is left ALONE
/// rather than dropped: it is already a parse fault, and deleting text on the
/// way past would turn a diagnosable error into a silent edit.
///
/// The new block lands where the first old position line was, so a file that
/// grouped them at the end keeps them at the end. A source with no `@pos` at
/// all gets the block appended. Things absent from `model` lose their line;
/// things missing one gain it.
///
/// Line endings normalize to `\n` (SL sources in this repo are LF); a trailing
/// newline is preserved if the source had one and not invented if it did not.
pub fn splice_positions(source: &str, model: &CanvasModel) -> Result<String, String> {
    let mut block = Vec::with_capacity(model.things.len());
    for t in &model.things {
        block.push(format!("@pos {} {} {}", name_token(&t.name)?, t.x, t.y));
    }

    let is_pos_line = |line: &str| match tokenize(line) {
        Ok(toks) => matches!(toks.first(), Some(Tok::Word(w)) if w.strip_prefix('@') == Some("pos")),
        Err(_) => false,
    };

    let mut out: Vec<String> = Vec::new();
    let mut placed = false;
    for line in source.lines() {
        if is_pos_line(line) {
            if !placed {
                out.extend(block.iter().cloned());
                placed = true;
            }
            continue;
        }
        out.push(line.to_string());
    }
    if !placed && !block.is_empty() {
        if out.last().is_some_and(|l| !l.trim().is_empty()) {
            out.push(String::new());
        }
        out.extend(block);
    }

    let mut text = out.join("\n");
    if source.ends_with('\n') {
        text.push('\n');
    }
    Ok(text)
}

/// Words the tokenizer or line parsers claim — a thing name matching one must
/// be quoted to stay a name.
pub const RESERVED_WORDS: &[&str] = &[
    "system",
    "domain",
    "component",
    "source",
    "sink",
    "environment",
    "flow",
    "boundary",
    "interface",
    "primitive",
    "decomposes",
    "stock",
    "scale",
    "states",
    "kind",
    "time",
    "unit",
    "level",
    "mere",
    "weight",
    "substance",
    "amount",
    "initial",
    "release",
    "capacity",
    "setpoint",
    "maintenance",
    "backpressure",
    "description",
    "usability",
    "porosity",
    "fuzziness",
    "energy",
    "matter",
    "field",
    "informational",
];

/// The flow-tail clause heads, for orphan detection: one of these sitting
/// where a value belongs means the author deleted the value mid-edit, not
/// named something after a keyword. All five are [`RESERVED_WORDS`], so a
/// bare occurrence in a value slot can never be an authored name — a name
/// spelled like one arrives quoted (`Tok::Str`) and passes untouched.
/// `ample` stays out: it is positional, and a bare thing or substance named
/// `ample` must keep re-parsing as itself.
fn clause_head(w: &str) -> bool {
    ["substance", "amount", "unit", "mere", "weight", "description", "usability"]
        .iter()
        .any(|k| w.eq_ignore_ascii_case(k))
}

/// Grammar keywords deliberately absent from [`RESERVED_WORDS`]: each occupies
/// a slot no name can reach. `param` and `metric` open their own lines, and no
/// emitted line ever begins with a bare name; `ample`, `range`, `shares`,
/// `from`, and the metric verb words (`share`, `of`, `sum`, `into`) sit
/// behind clause heads or fixed positions the parser matches structurally;
/// the lens words are `@lens` values on an annotation line; `constant` sits
/// behind the `time` clause head (`time constant <n>`, #112) exactly as those
/// verb words sit behind theirs — `time` is already reserved, so a bare
/// `constant` in a name slot can never be mistaken for the clause. A thing
/// named `ample` therefore emits bare and re-parses as itself — quoting it
/// would be noise, not safety. Spec §7.1 records the same split;
/// `keyword_parity.rs` holds the union of the two lists equal to §4's
/// terminals.
pub const POSITIONAL_KEYWORDS: &[&str] = &[
    "param", "metric", "ample", "range", "shares", "from", "share", "of", "sum", "into", "klir",
    "bunge", "mobus", "constant",
];

fn is_reserved(word: &str) -> bool {
    RESERVED_WORDS.contains(&word.to_ascii_lowercase().as_str())
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

/// Render a name the way a repair line must be typed: bare when it is a single
/// word, quoted when it is not. A suggested fix the author cannot paste back is
/// not a fix.
fn as_name(name: &str) -> String {
    if name.is_empty() || name.chars().any(|c| c.is_whitespace()) {
        format!("\"{name}\"")
    } else {
        name.to_string()
    }
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

fn parse_scale(word: &str) -> Result<ScaleType, String> {
    match word.to_ascii_lowercase().as_str() {
        "nominal" => Ok(ScaleType::Nominal),
        "ordinal" => Ok(ScaleType::Ordinal),
        "interval" => Ok(ScaleType::Interval),
        "ratio" => Ok(ScaleType::Ratio),
        other => Err(format!(
            "unknown scale `{other}` (Nominal, Ordinal, Interval, Ratio)"
        )),
    }
}

fn parse_level(word: &str) -> Result<KlirLevel, String> {
    match word.to_ascii_lowercase().as_str() {
        "source" => Ok(KlirLevel::Source),
        "data" => Ok(KlirLevel::Data),
        "generative" => Ok(KlirLevel::Generative),
        "structure" => Ok(KlirLevel::Structure),
        "metasystem" => Ok(KlirLevel::Metasystem),
        other => Err(format!(
            "unknown level `{other}` (Source, Data, Generative, Structure, Metasystem)"
        )),
    }
}

fn parse_var_kind(word: &str) -> Result<KlirVarKind, String> {
    match word.to_ascii_lowercase().as_str() {
        "basic" => Ok(KlirVarKind::Basic),
        "support" => Ok(KlirVarKind::Support),
        other => Err(format!("unknown kind `{other}` (Basic, Support)")),
    }
}

/// Read a `{A, B, C}` set literal starting at token `start` (the expected
/// `{`), returning the value labels and the index just past the `}`. `{}` is a
/// legal empty set; a trailing comma or a missing brace is a fault.
fn parse_state_set(attrs: &[Tok], start: usize) -> Result<(Vec<String>, usize), String> {
    let syntax = "states syntax: `states {A, B, C}` (brace-enclosed, comma-separated)";
    if attrs.get(start) != Some(&Tok::LBrace) {
        return Err(syntax.into());
    }
    let mut set: Vec<String> = Vec::new();
    let mut i = start + 1;
    // empty set: `{}`
    if attrs.get(i) == Some(&Tok::RBrace) {
        return Ok((set, i + 1));
    }
    loop {
        match attrs.get(i) {
            Some(t) if t.is_name() => {
                let label = t.name();
                if label.trim().is_empty() {
                    return Err("state label cannot be empty".into());
                }
                set.push(label);
                i += 1;
            }
            _ => return Err(syntax.into()),
        }
        match attrs.get(i) {
            Some(Tok::Comma) => i += 1,
            Some(Tok::RBrace) => return Ok((set, i + 1)),
            _ => return Err(syntax.into()),
        }
    }
}

/// Line tokens: bare words, quoted strings, `->`, `:`, and the set-literal
/// punctuation `{ } ,` (Klir state sets, #154).
#[derive(Clone, Debug, PartialEq)]
enum Tok {
    Word(String),
    Str(String),
    Arrow,
    Colon,
    LBrace,
    RBrace,
    Comma,
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
            Tok::LBrace => "{".into(),
            Tok::RBrace => "}".into(),
            Tok::Comma => ",".into(),
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
        } else if c == '{' {
            chars.next();
            tokens.push(Tok::LBrace);
        } else if c == '}' {
            chars.next();
            tokens.push(Tok::RBrace);
        } else if c == ',' {
            chars.next();
            tokens.push(Tok::Comma);
        } else if c == '#' {
            break; // trailing comment
        } else {
            let mut w = String::new();
            while let Some(&ch) = chars.peek() {
                if ch.is_whitespace()
                    || ch == '"'
                    || ch == ':'
                    || ch == '#'
                    || ch == '{'
                    || ch == '}'
                    || ch == ','
                {
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

    /// Law: a refusal names the repair, not only the rule (#230). A message
    /// that says what is wrong but not what to write leaves the author stuck,
    /// which makes the parser a critic rather than a modeling aid.
    ///
    /// The separating instance is the second half: the SUGGESTED LINE MUST
    /// ACTUALLY COMPILE. A test that only grepped for the word "fix" would pass
    /// on advice that does not work, so this applies the repair verbatim and
    /// re-parses.
    #[test]
    fn the_undeclared_endpoint_refusal_names_a_line_that_compiles() {
        let broken = "component Tub primitive Buffering interface\n\
                      source Faucet\n\
                      flow Faucet -> Tub : matter \"inflow\"\n\
                      flow Tub -> Drain : matter \"outflow\"\n";
        let err = parse_sl(broken).unwrap_err();
        assert_eq!(err.len(), 1);
        assert_eq!(err[0].line, 4);
        // The rule, then the repair — and the repair is the SINK line, because
        // `Drain` is the flow's target rather than its origin.
        assert!(err[0].message.contains("is not declared"));
        assert!(
            err[0].message.contains("fix: add `sink Drain`"),
            "the refusal must name the line to add, got: {}",
            err[0].message
        );

        let repaired = broken.replace("flow Faucet", "sink Drain\nflow Faucet");
        let model = parse_sl(&repaired).expect("the suggested repair must compile");
        assert_eq!(model.relations.len(), 2);
    }

    /// The mirror case: an undeclared ORIGIN is a source, not a sink. The
    /// repair is direction-sensitive, so both directions are pinned.
    #[test]
    fn an_undeclared_origin_is_repaired_with_source() {
        let err = parse_sl("component Tub\nflow Spring -> Tub\n").unwrap_err();
        assert!(
            err[0].message.contains("fix: add `source Spring`"),
            "got: {}",
            err[0].message
        );
    }

    /// A name with spaces has to come back quoted, or the suggested line is one
    /// the author cannot paste.
    #[test]
    fn a_repair_quotes_a_multi_word_name() {
        let err = parse_sl("component Tub\nflow Tub -> \"Storm Drain\"\n").unwrap_err();
        assert!(
            err[0].message.contains("fix: add `sink \"Storm Drain\"`"),
            "got: {}",
            err[0].message
        );
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
        // The invariant, not the coordinate (#216, E1): the env ring is no
        // longer pinned at ENV_RADIUS — it is pushed outside the membrane the
        // face derives from the component extent. What must hold: the env
        // thing sits strictly beyond the component ring with real separation
        // (the membrane's √2 · extent + RING_PAD lower bound), and never
        // closer than the old pinned floor.
        assert!(dist(s) >= ENV_RADIUS - 0.5, "env ring under the old floor");
        assert!(
            dist(s) > COMPONENT_RADIUS * std::f32::consts::SQRT_2 + 70.0,
            "env ring does not clear the membrane bound: {}",
            dist(s)
        );
        // E2: two components spread horizontally, never a shared vertical.
        let b = m1.things.iter().find(|t| t.name == "B").unwrap();
        assert!((a.y - b.y).abs() < 0.001);
        assert!((a.x - b.x).abs() > COMPONENT_RADIUS);
    }

    /// Law (#309): the picture reads left to right — every source sits left of
    /// every sink, whatever order the author declared them in. The regression
    /// this pins is real: under declaration-order placement this model put both
    /// sources right of its sink and the factory ran backwards.
    #[test]
    fn sources_sit_left_of_sinks() {
        let text = "system \"Car Factory\"\n\
                    source \"Raw Materials\"\n\
                    component \"Parts Buffer\"\n\
                    source Electricity\n\
                    component \"Robotic Arm\"\n\
                    component \"Assembly Line\"\n\
                    sink \"Finished Car\"\n\
                    flow \"Raw Materials\" -> \"Parts Buffer\"\n\
                    flow \"Parts Buffer\" -> \"Assembly Line\"\n\
                    flow Electricity -> \"Robotic Arm\"\n\
                    flow \"Assembly Line\" -> \"Finished Car\"\n";
        let m = parse_sl(text).unwrap();
        let x = |name: &str| m.things.iter().find(|t| t.name == name).unwrap().x;
        let right_of_every_source = [x("Raw Materials"), x("Electricity")]
            .iter()
            .cloned()
            .fold(f32::MIN, f32::max);
        assert!(
            x("Finished Car") > right_of_every_source,
            "sink at {} is not right of every source (max {})",
            x("Finished Car"),
            right_of_every_source
        );
        // The sink is also right of the whole component ring, and the sources
        // left of it — the ring is not merely ordered, it is a left-to-right read.
        let comps: Vec<f32> = m
            .things
            .iter()
            .filter(|t| t.role == Role::Component)
            .map(|t| t.x)
            .collect();
        assert!(comps.iter().all(|&c| c > right_of_every_source));
        assert!(comps.iter().all(|&c| c < x("Finished Car")));
        // Two sources on one arc stay apart, in declaration order, top first.
        let a = m.things.iter().find(|t| t.name == "Raw Materials").unwrap();
        let b = m.things.iter().find(|t| t.name == "Electricity").unwrap();
        assert!(a.y < b.y, "declaration order is the tie-break, top down");
        assert!((a.x - b.x).hypot(a.y - b.y) > 2.0 * 34.0);
    }

    /// A model of only sinks must fan out along its own arc, not collapse.
    #[test]
    fn a_one_sided_model_still_spreads() {
        let text = "component A\nsink S1\nsink S2\nsink S3\n\
                    flow A -> S1\nflow A -> S2\nflow A -> S3\n";
        let m = parse_sl(text).unwrap();
        let sinks: Vec<&Thing> = m
            .things
            .iter()
            .filter(|t| t.role == Role::Environment)
            .collect();
        for (i, p) in sinks.iter().enumerate() {
            for q in &sinks[i + 1..] {
                assert!(
                    (p.x - q.x).hypot(p.y - q.y) > 2.0 * 34.0,
                    "{} and {} overlap",
                    p.name,
                    q.name
                );
            }
            assert!(p.x > CENTER.0, "a sink belongs right of centre");
        }
    }

    /// Explicit `@pos` still wins over the role-based ring (#309 must not
    /// disturb the annotation layer, which is applied after layout).
    #[test]
    fn explicit_positions_survive_role_layout() {
        let text = "component A\nsource S\nsink K\nflow S -> A\nflow A -> K\n\
                    @pos S 900 40\n";
        let m = parse_sl(text).unwrap();
        let s = m.things.iter().find(|t| t.name == "S").unwrap();
        assert_eq!((s.x, s.y), (900.0, 40.0));
        // …and the unpinned sink is still placed by role.
        assert!(m.things.iter().find(|t| t.name == "K").unwrap().x > CENTER.0);
    }

    /// The container label's rename round trip (bert-lenses#116): the canvas
    /// writes `CanvasModel.name`, `emit_sl` serializes it as the system
    /// declaration, and compiling that text reproduces the same self-name.
    /// An unnamed model emits no system line and reads back unnamed.
    #[test]
    fn self_name_round_trips_through_the_system_declaration() {
        let mut model = parse_sl("component A\n").unwrap();
        model.name = Some("living room".into());
        let text = emit_sl(&model).unwrap();
        assert!(text.starts_with("system \"living room\"\n"), "{text}");
        assert_eq!(parse_sl(&text).unwrap().name.as_deref(), Some("living room"));

        model.name = None;
        let text = emit_sl(&model).unwrap();
        assert!(!text.contains("system"), "{text}");
        assert_eq!(parse_sl(&text).unwrap().name, None);
    }

    #[test]
    fn trailing_comments_and_blank_lines_ignored() {
        let model = parse_sl("\ncomponent A  # the core\n\n# whole-line comment\n").unwrap();
        assert_eq!(model.things.len(), 1);
    }

    // ── splice_positions: the layout half of a round-trip (#327) ─────────

    /// The property the whole function exists for. `emit_sl` on this source
    /// would return four lines; the splice must return all of it but the
    /// positions.
    #[test]
    fn splice_keeps_every_line_that_is_not_a_position() {
        let src = "\
# ── A documented model ───────────────────────────────────────
# The comment block is the reason this function exists: it is not
# in the model, so an emit cannot give it back.
#   https://example.org/a-source-worth-keeping

system \"Doc\" : Concrete/Social

# why this component is here
component A primitive Combining interface

source S

flow S -> A : matter \"in\"

@lens mobus
@pos A 10 20
@pos S 30 40
";
        let mut m = parse_sl(src).unwrap();
        m.things[0].x = 111.0;
        m.things[0].y = 222.0;
        let out = splice_positions(src, &m).unwrap();

        assert!(out.contains("https://example.org/a-source-worth-keeping"));
        assert!(out.contains("# why this component is here"));
        assert!(out.contains("@lens mobus"));
        assert!(out.contains("@pos A 111 222"));
        assert!(!out.contains("@pos A 10 20"));
        // every non-position line of the original survives, in order
        let kept: Vec<&str> = src.lines().filter(|l| !l.trim_start().starts_with("@pos")).collect();
        let got: Vec<&str> = out.lines().filter(|l| !l.trim_start().starts_with("@pos")).collect();
        assert_eq!(kept, got);
    }

    /// Re-parsing the spliced text must yield the moved model — the splice is
    /// only worth anything if the kernel reads the new positions back.
    #[test]
    fn splice_round_trips_through_the_parser() {
        let src = "component A\nsource S\nflow S -> A : matter \"in\"\n@pos A 1 2\n@pos S 3 4\n";
        let mut m = parse_sl(src).unwrap();
        m.things[0].x = 900.5;
        m.things[0].y = -12.25;
        let back = parse_sl(&splice_positions(src, &m).unwrap()).unwrap();
        assert_eq!((back.things[0].x, back.things[0].y), (900.5, -12.25));
        assert_eq!((back.things[1].x, back.things[1].y), (m.things[1].x, m.things[1].y));
    }

    /// A source that never pinned a position gains the block rather than
    /// silently keeping auto-layout.
    #[test]
    fn splice_appends_when_the_source_pinned_nothing() {
        let src = "component A\n";
        let mut m = parse_sl(src).unwrap();
        m.things[0].x = 7.0;
        m.things[0].y = 8.0;
        let out = splice_positions(src, &m).unwrap();
        assert!(out.starts_with("component A\n"));
        assert!(out.contains("@pos A 7 8"));
        assert_eq!(parse_sl(&out).unwrap().things[0].x, 7.0);
    }

    /// The block lands where the old one was, so a file that put positions in
    /// the middle keeps its shape.
    #[test]
    fn splice_places_the_block_at_the_first_old_position_line() {
        let src = "component A\n@pos A 1 2\nsource S\nflow S -> A : matter \"in\"\n";
        let m = parse_sl(src).unwrap();
        let out = splice_positions(src, &m).unwrap();
        let lines: Vec<&str> = out.lines().collect();
        assert_eq!(lines[0], "component A");
        assert!(lines[1].starts_with("@pos "));
        assert!(lines.contains(&"source S"));
    }

    /// `#` inside a quoted name must not be read as a comment, and `@pos`
    /// inside a comment must not be read as a position — both fall out of
    /// using the parser's own tokenizer rather than a second guess at it.
    #[test]
    fn splice_classifies_lines_the_way_the_parser_does() {
        let src = "component \"A#B\"\n# @pos A 1 2 -- this is prose, not a position\n@pos \"A#B\" 5 6\n";
        let mut m = parse_sl(src).unwrap();
        m.things[0].x = 50.0;
        let out = splice_positions(src, &m).unwrap();
        assert!(out.contains("# @pos A 1 2 -- this is prose, not a position"));
        assert!(out.contains("@pos \"A#B\" 50 6"));
        assert_eq!(out.matches("@pos \"A#B\"").count(), 1);
    }

    /// A line that will not tokenize is a parse fault the author needs to see.
    /// Passing over it must not delete it.
    #[test]
    fn splice_leaves_an_untokenizable_line_alone() {
        // The model comes from text that parses; the SOURCE being spliced is
        // the broken one, which is the situation a mid-edit buffer is in.
        let m = parse_sl("component A\n@pos A 3 4\n").unwrap();
        let broken = "component A\n@pos \"unterminated\n@pos A 1 2\n";
        let out = splice_positions(broken, &m).unwrap();
        assert!(out.contains("@pos \"unterminated"));
        assert!(out.contains("@pos A 3 4"));
    }

    /// Trailing newline is preserved, not invented and not dropped.
    #[test]
    fn splice_preserves_the_trailing_newline_either_way() {
        let m = parse_sl("component A\n@pos A 1 2\n").unwrap();
        assert!(splice_positions("component A\n@pos A 1 2\n", &m).unwrap().ends_with('\n'));
        assert!(!splice_positions("component A\n@pos A 1 2", &m).unwrap().ends_with('\n'));
    }


    // ── descriptions: restoring what old-bert had (#326) ────────────────

    #[test]
    fn description_parses_on_components_and_environment_things() {
        let m = parse_sl(
            "component A primitive Combining interface description \"the work process\"\n\
             source S description \"where it comes from\"\n\
             flow S -> A : matter \"in\"\n",
        )
        .unwrap();
        assert_eq!(m.things[0].description, "the work process");
        assert_eq!(m.things[1].description, "where it comes from");
    }

    /// Environment lines take it too, and that is deliberate: old-bert's
    /// descriptions are mostly ON environment entities. The opacity rule is
    /// about an env thing's INTERNALS, not about naming what it is.
    #[test]
    fn description_is_not_refused_on_an_environment_line() {
        assert!(parse_sl("sink Snk description \"where it ends up\"\n").is_ok());
    }

    #[test]
    fn description_parses_on_a_flow_after_every_other_clause() {
        let m = parse_sl(
            "component A\ncomponent B\n\
             flow A -> B : matter \"label\" substance water amount 2 unit ML weight 3 \
             description \"what actually moves\"\n",
        )
        .unwrap();
        assert_eq!(m.relations[0].description, "what actually moves");
        assert_eq!(m.relations[0].substance, "water");
        assert_eq!(m.relations[0].weight, Some(3));
    }

    /// The property that makes descriptions worth having as DATA rather than
    /// comments: they survive text -> model -> text, which a comment cannot.
    #[test]
    fn description_round_trips_through_emit() {
        let src = "component A primitive Combining interface description \"the work process\"\n\
                   source S description \"where it comes from\"\n\
                   flow S -> A : matter \"in\" description \"what moves\"\n";
        let once = emit_sl(&parse_sl(src).unwrap()).unwrap();
        assert!(once.contains("description \"the work process\""));
        assert!(once.contains("description \"where it comes from\""));
        assert!(once.contains("description \"what moves\""));
        assert_eq!(emit_sl(&parse_sl(&once).unwrap()).unwrap(), once);
    }

    /// Absent stays absent — a model with no prose must serialize exactly as
    /// it did before this field existed, or every stored model changes on disk.
    #[test]
    fn no_description_emits_no_clause() {
        let src = "component A\nsource S\nflow S -> A : matter \"in\"\n";
        let out = emit_sl(&parse_sl(src).unwrap()).unwrap();
        assert!(!out.contains("description"));
    }

    #[test]
    fn a_second_description_on_one_line_is_a_fault() {
        assert!(parse_sl("component A description \"one\" description \"two\"\n").is_err());
    }

    #[test]
    fn an_unquoted_description_is_a_fault() {
        assert!(parse_sl("component A description bare\n").is_err());
    }


    // ── usability: what a crossing IS to the system (#331) ──────────────

    #[test]
    fn usability_parses_all_four_and_is_case_insensitive() {
        let m = parse_sl(
            "component A\nsource S\nsink K\n\
             flow S -> A : matter \"in\" usability Resource\n\
             flow S -> A : matter \"bad\" usability disruption\n\
             flow A -> K : matter \"out\" usability PRODUCT\n\
             flow A -> K : matter \"heat\" usability Waste\n",
        )
        .unwrap();
        let got: Vec<_> = m.relations.iter().map(|r| r.usability).collect();
        assert_eq!(
            got,
            vec![
                Some(InteractionUsability::Resource),
                Some(InteractionUsability::Disruption),
                Some(InteractionUsability::Product),
                Some(InteractionUsability::Waste),
            ]
        );
    }

    /// Undeclared says NOTHING. It must not read back as `Resource`, or the
    /// model would claim an assertion the author never made — the same trap
    /// `amount` documents (omitted is not 1).
    #[test]
    fn undeclared_usability_is_none_not_resource() {
        let m = parse_sl("component A\nsource S\nflow S -> A : matter \"in\"\n").unwrap();
        assert_eq!(m.relations[0].usability, None);
    }

    #[test]
    fn usability_round_trips_and_absent_emits_nothing() {
        let src = "component A\nsink K\nflow A -> K : matter \"heat\" usability Waste\n";
        let once = emit_sl(&parse_sl(src).unwrap()).unwrap();
        assert!(once.contains("usability Waste"));
        assert_eq!(emit_sl(&parse_sl(&once).unwrap()).unwrap(), once);

        let bare = emit_sl(&parse_sl("component A\nsource S\nflow S -> A : matter \"in\"\n").unwrap()).unwrap();
        assert!(!bare.contains("usability"));
    }

    #[test]
    fn an_unknown_usability_is_a_fault() {
        assert!(parse_sl("component A\nsource S\nflow S -> A usability Helpful\n").is_err());
    }

    #[test]
    fn usability_sits_before_the_prose_and_after_the_quantities() {
        let m = parse_sl(
            "component A\nsink K\n\
             flow A -> K : matter \"x\" amount 2 unit ML usability Waste description \"the tailings\"\n",
        )
        .unwrap();
        let r = &m.relations[0];
        assert_eq!(r.usability, Some(InteractionUsability::Waste));
        assert_eq!(r.description, "the tailings");
        assert_eq!(r.unit, "ML");
    }

}
