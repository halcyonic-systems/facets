//! The projection-seam ledger (#329).
//!
//! `project()` fills every kernel field, because Rust's struct literals are
//! exhaustive — so a field the authoring surface cannot reach does not arrive
//! as `None`, an error, or a TODO. It arrives as a legal value. The model then
//! validates, projects, runs and renders, and nothing is ever red. That is how
//! authored `description` sat dropped for five months (#326) and was found by
//! somebody noticing a source URL in a description field.
//!
//! This is a LEDGER, not a nag. It is GREEN on day one with today's debts
//! declared, because a permanently-red test is ignored inside a week. It goes
//! red the day someone adds a NEW field to a projected struct — which is the
//! day the next regression starts, rather than five months later.
//!
//! Same shape as `keyword_parity.rs`: read one source of truth off disk (there,
//! the spec's EBNF; here, the kernel's struct definitions), hold it equal to a
//! declared list in the test, and fail in BOTH directions so a stale entry is
//! caught as well as a missing one.
//!
//! If this fails:
//!
//!   - a field was ADDED — give it a standing below, and if it is `Debt`, file
//!     the issue first so the entry can link it.
//!   - a field was REMOVED — delete its row.
//!
//! Never loosen the extraction.

use std::collections::BTreeSet;
use std::fs;
use std::path::Path;

/// What the authoring surface can do with a field. The distinction that matters
/// is `Authored`/`Debt`: everything else is scaffolding the projection owns and
/// no author was ever meant to reach.
#[derive(Debug, Clone, Copy, PartialEq)]
enum Standing {
    /// Carries a value the author supplied through SL or the canvas.
    Authored,
    /// The projection's own graph scaffolding — ids, levels, parent links, the
    /// vectors it fills as it walks. Not a place an author's words can go.
    Structural,
    /// Layout the canvas owns (radius, angles, offsets). Presentation.
    Presentation,
    /// Mobus ontology that MUST exist somewhere, filled with a plausible
    /// default today. The str is the tracking issue.
    Debt(&'static str),
    /// Declared irrelevant by the author, not a debt.
    Excluded(&'static str),
    /// Filled with a constant, no issue open, and nobody has yet ruled whether
    /// it should be authorable. Surfaced BY this gate — see the module note.
    Unruled(&'static str),
}
use Standing::*;

/// Every field of every struct `project()` constructs, with its standing.
///
/// The five in #329's audit are here (`complexity`, `archetype`, `protocol`,
/// `parameters`, `usability`) — and so are seven more the audit never listed,
/// found by reading what `project()` actually writes rather than what the audit
/// had already looked for. They are `Unruled`: filled with a constant, no issue
/// open, no ruling from the author. `history` is the pointed one — H in Mobus's
/// 8-tuple, projected as `String::new()`.
const LEDGER: &[(&str, &str, Standing, &str)] = &[
    // ---- WorldModel ----
    ("WorldModel", "version", Structural, "schema version of the projection"),
    ("WorldModel", "model_id", Structural, "carried from the canvas model"),
    ("WorldModel", "mode", Authored, "the lens the author committed (`@lens`)"),
    ("WorldModel", "environment", Structural, "the env container the walk fills"),
    ("WorldModel", "systems", Structural, "the projected system list"),
    ("WorldModel", "interactions", Structural, "the projected flow list"),
    ("WorldModel", "hidden_entities", Unruled("vec![] — never populated, never authored"), ""),
    ("WorldModel", "reachability_requirements", Unruled("vec![] — never populated"), ""),
    ("WorldModel", "time_unit", Authored, "`time unit` (spec §4)"),
    // ---- Environment ----
    ("Environment", "info", Structural, "synthesized container info"),
    ("Environment", "sources", Structural, "filled from env-role things"),
    ("Environment", "sinks", Structural, "filled from env-role things"),
    // ---- Info ----
    ("Info", "id", Structural, "projection-assigned Id"),
    ("Info", "level", Structural, "depth in the decomposition walk"),
    ("Info", "name", Authored, "the thing's or flow's name"),
    ("Info", "description", Authored, "restored by #326 — the regression that started this"),
    // ---- System ----
    ("System", "info", Authored, "name + description via `described()`"),
    ("System", "sources", Structural, "graph edges into this system"),
    ("System", "sinks", Structural, "graph edges out of this system"),
    ("System", "parent", Structural, "decomposition link"),
    ("System", "complexity", Debt("#334"), "Complexity::Atomic — a subjective assessment; waits on the life-cycle shape"),
    ("System", "boundary", Structural, "the Boundary struct, itemized below"),
    ("System", "radius", Presentation, "RADIUS constant — canvas geometry"),
    ("System", "transform", Authored, "the authored position"),
    ("System", "equivalence", Unruled("String::new() — no SL clause, no issue"), ""),
    ("System", "history", Unruled("String::new() — H in Mobus's 8-tuple, projected empty"), ""),
    ("System", "transformation", Unruled("String::new() — no SL clause, no issue"), ""),
    ("System", "member_autonomy", Unruled("1.0 — no SL clause, no issue"), ""),
    ("System", "time_constant", Unruled("String::new() — no SL clause, no issue"), ""),
    ("System", "archetype", Debt("#332"), "Agent-if-primitive else Unspecified; needs an obligation designed, not a field restored"),
    ("System", "agent", Structural, "derived from the authored `primitive`"),
    ("System", "child_model", Structural, "decomposition link"),
    // ---- Boundary ----
    ("Boundary", "info", Structural, "synthesized"),
    ("Boundary", "porosity", Unruled("0.0 — the authoring control is designed but pinned"), ""),
    ("Boundary", "perceptive_fuzziness", Unruled("0.0 — same"), ""),
    ("Boundary", "interfaces", Structural, "filled from crossing flows"),
    ("Boundary", "parent_interface", Structural, "decomposition link"),
    // ---- Interface ----
    ("Interface", "info", Structural, "synthesized name"),
    ("Interface", "protocol", Debt("#333"), "labels.join(\" · \") — COMPUTED, not authored; blocked on #226"),
    ("Interface", "ty", Structural, "interface kind"),
    ("Interface", "exports_to", Structural, "graph link"),
    ("Interface", "receives_from", Structural, "graph link"),
    ("Interface", "angle", Presentation, "None — canvas places it on the ring"),
    // ---- Interaction ----
    ("Interaction", "info", Authored, "name + description"),
    ("Interaction", "substance", Authored, "`substance` + kind clause"),
    ("Interaction", "ty", Structural, "InteractionType::Flow — SL builds only flows"),
    ("Interaction", "usability", Authored, "made authorable by #331; undeclared is not Resource"),
    ("Interaction", "source", Structural, "graph endpoint"),
    ("Interaction", "source_interface", Structural, "graph endpoint"),
    ("Interaction", "sink", Structural, "graph endpoint"),
    ("Interaction", "sink_interface", Structural, "graph endpoint"),
    ("Interaction", "amount", Authored, "`amount`; omitted is not 1 in the model"),
    ("Interaction", "unit", Authored, "`unit`"),
    ("Interaction", "ample", Authored, "`ample` (#9)"),
    ("Interaction", "parameters", Debt("#330"), "vec![] — #330 closed the old shape; the need stands, to be designed fresh"),
    ("Interaction", "smart_parameters", Excluded("outdated feature, ruled off the list by the author"), ""),
    ("Interaction", "endpoint_offset", Presentation, "None — canvas layout"),
];

/// The structs `project()` constructs. Adding one here without declaring its
/// fields is itself a red test.
const PROJECTED_STRUCTS: &[&str] = &[
    "WorldModel",
    "Environment",
    "Info",
    "System",
    "Boundary",
    "Interface",
    "Interaction",
];

/// `pub` field names of a struct, read out of the kernel's own source. The
/// source is the authority for the same reason `keyword_parity` reads the spec:
/// a list maintained by hand beside it would drift silently.
fn struct_fields(src: &str, name: &str) -> BTreeSet<String> {
    let head = format!("pub struct {name} ");
    let start = src
        .find(&head)
        .unwrap_or_else(|| panic!("`{head}{{` not found in bert-core — did the struct move or get renamed?"));
    let body_start = src[start..]
        .find('{')
        .map(|i| start + i + 1)
        .expect("struct body");
    let mut depth = 1usize;
    let mut i = body_start;
    let bytes = src.as_bytes();
    while i < bytes.len() && depth > 0 {
        match bytes[i] {
            b'{' => depth += 1,
            b'}' => depth -= 1,
            _ => {}
        }
        i += 1;
    }
    src[body_start..i - 1]
        .lines()
        .filter_map(|l| {
            let l = l.trim();
            let rest = l.strip_prefix("pub ")?;
            let colon = rest.find(':')?;
            let ident = &rest[..colon];
            ident
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '_')
                .then(|| ident.to_string())
        })
        .collect()
}

fn kernel_src() -> String {
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join("../bert-core/src/lib.rs");
    fs::read_to_string(&path).unwrap_or_else(|e| panic!("cannot read {}: {e}", path.display()))
}

#[test]
fn every_projected_field_has_a_declared_standing() {
    let src = kernel_src();
    let declared: BTreeSet<(String, String)> = LEDGER
        .iter()
        .map(|(s, f, _, _)| ((*s).to_string(), (*f).to_string()))
        .collect();

    let mut actual: BTreeSet<(String, String)> = BTreeSet::new();
    for s in PROJECTED_STRUCTS {
        for f in struct_fields(&src, s) {
            actual.insert(((*s).to_string(), f));
        }
    }

    let undeclared: Vec<_> = actual.difference(&declared).collect();
    let stale: Vec<_> = declared.difference(&actual).collect();

    assert!(
        undeclared.is_empty(),
        "{} kernel field(s) that project() must fill have NO declared standing.\n\
         This is the #329 mechanism starting again: the compiler will make project() \
         supply a value, and a plausible default is invisible forever.\n\
         Give each a standing in LEDGER (and file the issue first if it is a Debt):\n{}",
        undeclared.len(),
        undeclared
            .iter()
            .map(|(s, f)| format!("  {s}.{f}"))
            .collect::<Vec<_>>()
            .join("\n"),
    );
    assert!(
        stale.is_empty(),
        "{} ledger row(s) name a field the kernel no longer has — delete them:\n{}",
        stale.len(),
        stale
            .iter()
            .map(|(s, f)| format!("  {s}.{f}"))
            .collect::<Vec<_>>()
            .join("\n"),
    );
}

#[test]
fn every_debt_names_its_issue() {
    // A debt without a tracking issue is just a default with better manners.
    for (s, f, standing, _) in LEDGER {
        if let Debt(issue) = standing {
            assert!(
                issue.starts_with('#') && issue[1..].chars().all(|c| c.is_ascii_digit()),
                "{s}.{f}: Debt must name an issue like \"#332\", got {issue:?}"
            );
        }
    }
}

#[test]
fn the_ledger_has_no_duplicate_rows() {
    // A field declared twice could carry two standings, and the assertion above
    // would still pass on set equality.
    let mut seen = BTreeSet::new();
    for (s, f, _, _) in LEDGER {
        assert!(seen.insert((*s, *f)), "{s}.{f} is declared twice in LEDGER");
    }
}

#[test]
fn the_regression_that_started_this_stays_authored() {
    // #326: `Info.description` was projected as String::new() for five months.
    // If it ever reverts to a default, this says so by name rather than leaving
    // it to the next person who happens to notice a URL in a description.
    let (_, _, standing, _) = LEDGER
        .iter()
        .find(|(s, f, _, _)| *s == "Info" && *f == "description")
        .expect("Info.description must stay in the ledger");
    assert_eq!(*standing, Authored, "Info.description regressed out of Authored (#326)");
}
