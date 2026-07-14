//! bert-lenses — the authoring canvas. Built one rung at a time.
//! **The front door** (`src/main.rs`, `cargo run`). The Arc-1 list viewer is the
//! demoted reference bin at `src/bin/viewer.rs` (`cargo run --bin viewer`).
//!
//! Systemhood verdicts are not computed here: the canvas kernel projects into a
//! bert-core [`WorldModel`] (`to_world_model`) and every "is this a system?"
//! answer routes through `bert_core::validate::validate_mode` (and, for the
//! Operational rung, `bert_core::operational::validate_operational`), exactly as
//! the reference viewer does. The shell holds zero formalism logic.
//!
//! Major regions, top to bottom (grep the marker after the `//`):
//!   - `Lens` / `Role` / `Kind` / `Thing` / `Relation` / `Model` — the canvas kernel types.
//!   - `Mobus work-process vocabulary` — the mapping palette's `ProcessPrimitive` roster + presentation helpers.
//!   - `impl CanvasApp` (queries, save/export) — hit-testing, `save_model` vs `export_world_model`, model library, spec loading.
//!   - `L1: distill a GSR intermediate spec` — turn a generated spec into the bare kernel.
//!   - `The bert-core seam` — `to_world_model`: project the kernel into a `WorldModel`, stamping the active lens's `mode`.
//!   - `Arc 4.1: read-only consistency audit` — `audit`/`AuditReport`: render `validate_operational`'s verdict verbatim.
//!   - `Arc 4.3: the Run surface (Shape B)` — `RunResults`/`run_model`/`run_panel`: run the Operational projection and read its recorded trace (native-only).
//!   - `impl eframe::App` / `canvas` / `audit_panel` / `palette_panel` — the egui frame loop, gesture handling, lens rendering, and the on-demand side panels.
//!   - Math view + font helpers, then `main`.

use bert_core::operational::{validate_operational, OperationalError};
use bert_core::validate::validate_mode;
use bert_core::{
    AgentModel, Boundary, Complexity, Environment, ExternalEntity, ExternalEntityType,
    HcgsArchetype, Id, IdType, Info, Interaction, InteractionType, InteractionUsability, Mode,
    ProcessPrimitive, Substance, SubstanceType, System, Transform2d, WorldModel,
    CURRENT_FILE_VERSION,
};
use eframe::egui;

// The CSV tether (bert-lenses#7/#13): the carry layer + the mapping surface. Data
// attaches to the model here; it compiles for every target (the projection wiring
// and mapping are pure), while the run-comparison drill-down is cfg-gated with the
// Run surface below.
mod tether;
use tether::{Assignment, ImportedData, MappingDraft, ModelParams};

// The run manifest (bert-lenses#38): the declarative form of a run — model,
// data, mapping, Δt/T — so meaning is assigned by hand once and mechanics are
// machine work. Pure (no egui, no I/O); the headless runner in `main` and the
// wizard's manifest-save both compile through it onto the SAME MappingDraft.
mod manifest;

// The run ledger (bert-lenses#15): a lab notebook outside the model, for
// cross-run comparison. Pure data + file I/O, no egui — wired into the Run
// surface below (native-only, same as the Run surface it reports on).
#[cfg(not(target_arch = "wasm32"))]
mod ledger;

// The Run surface (Arc 4.3) links the executable dynamical face. Native-only:
// bert-compose is a desktop egui crate (see Cargo.toml), so the import and the
// whole feature are `cfg`-gated to keep the wasm build intact.
#[cfg(not(target_arch = "wasm32"))]
use bert_compose::{from_spec, run::RecordedRun, NodeKind};
#[cfg(not(target_arch = "wasm32"))]
use bert_core::operational::OperationalProcess;

mod theme {
    use eframe::egui::Color32;
    pub const BG: Color32 = Color32::from_rgb(247, 244, 238);
    pub const SURFACE: Color32 = Color32::from_rgb(255, 253, 249);
    pub const INK: Color32 = Color32::from_rgb(44, 39, 34);
    pub const INK_SOFT: Color32 = Color32::from_rgb(107, 98, 88);
    pub const INK_FAINT: Color32 = Color32::from_rgb(154, 144, 133);
    pub const LINE: Color32 = Color32::from_rgb(227, 220, 207);
    pub const LINE2: Color32 = Color32::from_rgb(214, 205, 188);
    pub const ACCENT: Color32 = Color32::from_rgb(196, 98, 45);
    pub const KLIR: Color32 = Color32::from_rgb(63, 111, 143);
    pub const BUNGE: Color32 = Color32::from_rgb(138, 90, 156);
    pub const MOBUS: Color32 = Color32::from_rgb(47, 132, 114);
    pub const OK: Color32 = Color32::from_rgb(79, 122, 63);
    pub const WARN: Color32 = Color32::from_rgb(176, 122, 22);
}

const RADIUS: f32 = 34.0;
const BODY: f32 = RADIUS - 2.0;
const CONNECT_REACH: f32 = RADIUS + 14.0;

#[derive(Clone, Copy, PartialEq, Debug, serde::Serialize, serde::Deserialize)]
enum Lens {
    Klir,
    Bunge,
    Mobus,
}

impl Lens {
    fn name(self) -> &'static str {
        match self {
            Lens::Klir => "Klir",
            Lens::Bunge => "Bunge",
            Lens::Mobus => "Mobus",
        }
    }

    fn epithet(self) -> &'static str {
        match self {
            Lens::Klir => "the epistemologist",
            Lens::Bunge => "the ontologist",
            Lens::Mobus => "the anatomist",
        }
    }

    fn color(self) -> egui::Color32 {
        match self {
            Lens::Klir => theme::KLIR,
            Lens::Bunge => theme::BUNGE,
            Lens::Mobus => theme::MOBUS,
        }
    }

    fn noun(self) -> &'static str {
        match self {
            Lens::Klir => "thing",
            Lens::Bunge => "component",
            Lens::Mobus => "component",
        }
    }

    fn blurb(self) -> &'static str {
        match self {
            Lens::Klir => "Things and the relations among them — the bare, neutral view.",
            Lens::Bunge => "Composition, environment, and the bonds that make a system, not a heap.",
            Lens::Mobus => "Components, boundary, ports, and the typed flows across them.",
        }
    }

    /// The bert-core mode whose precondition this lens commits to. The rung the
    /// export stamps, and the mode `validate_mode` gates against. (Mirrors the
    /// reference viewer's `Lens::mode`.)
    fn mode(self) -> Mode {
        match self {
            Lens::Klir => Mode::Core,
            Lens::Bunge => Mode::Structural,
            Lens::Mobus => Mode::Operational,
        }
    }
}

/// Bunge's C/E membership. Klir ignores it (everything is just a thing in T).
#[derive(Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
enum Role {
    Component,
    Environment,
}

/// Bunge §2.1: structure is "n directed graphs, one per kind of connection." The kind of a bond.
#[derive(Clone, Copy, PartialEq, Debug, Default, serde::Serialize, serde::Deserialize)]
enum Kind {
    #[default]
    Unspecified,
    Energy,
    Matter,
    Field,
    Informational,
}

impl Kind {
    // Bunge's connection-flow taxonomy (Treatise v.4, §1.3): dynamic connections are flows of
    // energy, matter, or fields; a flow carrying information is "informational" (and rides on an
    // energy flow). Maps 1:1 onto Mobus substance (Material→Matter, Energy→Energy, Message→
    // Informational). The *level* axis (physical/chemical/bio/social) is a thing-level overlay — later.
    const ALL: [Kind; 5] = [
        Kind::Unspecified,
        Kind::Energy,
        Kind::Matter,
        Kind::Field,
        Kind::Informational,
    ];
    fn label(self) -> &'static str {
        match self {
            Kind::Unspecified => "unspecified",
            Kind::Energy => "energy",
            Kind::Matter => "matter",
            Kind::Field => "field",
            Kind::Informational => "informational",
        }
    }
    fn next(self) -> Kind {
        let i = Kind::ALL.iter().position(|&k| k == self).unwrap_or(0);
        Kind::ALL[(i + 1) % Kind::ALL.len()]
    }
    fn color(self) -> egui::Color32 {
        match self {
            Kind::Unspecified => theme::INK_SOFT,
            Kind::Energy => egui::Color32::from_rgb(192, 138, 46),        // amber
            Kind::Matter => egui::Color32::from_rgb(79, 154, 85),         // green
            Kind::Field => egui::Color32::from_rgb(168, 95, 181),         // violet
            Kind::Informational => egui::Color32::from_rgb(79, 127, 192), // blue
        }
    }
}

// ── Mobus work-process vocabulary (the mapping palette) ──────────────────
//
// The 10 atomic process primitives are bert-core's `ProcessPrimitive`; the shell
// never invents kinds. These helpers are pure presentation: a compact badge code,
// a family colour, and a one-phrase gloss derived from each primitive's Mobus
// work-process meaning. The palette stamps one onto a component, writing the
// `AgentModel` the Operational rung needs (bert#108).

/// All ten primitives, in bert-core declaration order — the palette's roster.
const PRIMITIVES: [ProcessPrimitive; 10] = [
    ProcessPrimitive::Combining,
    ProcessPrimitive::Splitting,
    ProcessPrimitive::Buffering,
    ProcessPrimitive::Impeding,
    ProcessPrimitive::Propelling,
    ProcessPrimitive::Copying,
    ProcessPrimitive::Sensing,
    ProcessPrimitive::Modulating,
    ProcessPrimitive::Amplifying,
    ProcessPrimitive::Inverting,
];

/// The primitive's verbatim enum name — the vocabulary word, never paraphrased.
fn prim_name(p: ProcessPrimitive) -> &'static str {
    match p {
        ProcessPrimitive::Combining => "Combining",
        ProcessPrimitive::Splitting => "Splitting",
        ProcessPrimitive::Buffering => "Buffering",
        ProcessPrimitive::Impeding => "Impeding",
        ProcessPrimitive::Propelling => "Propelling",
        ProcessPrimitive::Copying => "Copying",
        ProcessPrimitive::Sensing => "Sensing",
        ProcessPrimitive::Modulating => "Modulating",
        ProcessPrimitive::Amplifying => "Amplifying",
        ProcessPrimitive::Inverting => "Inverting",
    }
}

/// The two-letter badge code stamped on the disc — legible where a full label
/// won't fit; the palette legend carries the code → name key on screen.
fn prim_code(p: ProcessPrimitive) -> &'static str {
    match p {
        ProcessPrimitive::Combining => "Cb",
        ProcessPrimitive::Splitting => "Sp",
        ProcessPrimitive::Buffering => "Bf",
        ProcessPrimitive::Impeding => "Im",
        ProcessPrimitive::Propelling => "Pr",
        ProcessPrimitive::Copying => "Cp",
        ProcessPrimitive::Sensing => "Se",
        ProcessPrimitive::Modulating => "Md",
        ProcessPrimitive::Amplifying => "Am",
        ProcessPrimitive::Inverting => "Iv",
    }
}

/// One short phrase from the primitive's Mobus work-process meaning — no invented
/// jargon, just what the process does to the flows crossing it.
fn prim_desc(p: ProcessPrimitive) -> &'static str {
    match p {
        ProcessPrimitive::Combining => "merges several inflows into one",
        ProcessPrimitive::Splitting => "divides one inflow into several",
        ProcessPrimitive::Buffering => "stores flow, releasing it over time",
        ProcessPrimitive::Impeding => "resists flow, reducing what passes",
        ProcessPrimitive::Propelling => "drives flow, adding motive force",
        ProcessPrimitive::Copying => "duplicates a flow onto another path",
        ProcessPrimitive::Sensing => "measures a flow, emitting information",
        ProcessPrimitive::Modulating => "adjusts a flow under a control signal",
        ProcessPrimitive::Amplifying => "increases a flow's magnitude",
        ProcessPrimitive::Inverting => "reverses a flow's sense",
    }
}

/// The badge/family colour, grouping the primitives by what they do to flow:
/// routing (green), storage/resistance (amber), motive (orange), and
/// signal/control (blue). Colour is a readability aid, not a semantic claim.
fn prim_color(p: ProcessPrimitive) -> egui::Color32 {
    use ProcessPrimitive::*;
    match p {
        Combining | Splitting | Copying => egui::Color32::from_rgb(79, 154, 85), // routing — green
        Buffering | Impeding => egui::Color32::from_rgb(192, 138, 46),            // hold — amber
        Propelling | Amplifying => theme::ACCENT,                                 // motive — orange
        Sensing | Modulating | Inverting => egui::Color32::from_rgb(79, 127, 192), // signal — blue
    }
}

/// The loaded stamp: a primitive to apply, or the eraser that clears one. Held in
/// `CanvasApp::stamp` only while the Mobus palette is open — never ambient.
#[derive(Clone, Copy, PartialEq)]
enum Stamp {
    Prim(ProcessPrimitive),
    Erase,
}

/// An element of T — a placed thing with identity, a name, and a user-owned position.
#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct Thing {
    id: u64,
    name: String,
    pos: egui::Pos2,
    role: Role,
    /// The Mobus work-process this component performs — the component → work-process
    /// mapping the Operational rung requires (bert#108). Stamped via the Mobus palette,
    /// projected into the component's `AgentModel` by `to_world_model`. Only meaningful
    /// for `Role::Component`; `None` until stamped. `#[serde(default)]` keeps older
    /// saved models (no field) loading.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    primitive: Option<ProcessPrimitive>,
}

/// A pair in R. `a` is the drag source, `b` the target — the latent direction Klir
/// forgets and Mobus will reveal. Rendered neutrally here.
#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct Relation {
    id: u64,
    a: u64,
    b: u64,
    /// The relation's interpretation/kind — named, faithful from Klir up. May be blank.
    name: String,
    /// Bunge's B vs B̄: a bond (an action, confers systemhood) vs a mere relation ("older than").
    /// Klir ignores this; Bunge honors it. Default true — a drawn connection is a bond.
    is_bond: bool,
    /// Bunge's connection kind (one directed graph per kind). Defaults to Unspecified.
    #[serde(default)]
    kind: Kind,
}

/// The serializable model — the kernel (things + relations) plus the view choice. Saved as JSON.
#[derive(serde::Serialize, serde::Deserialize)]
struct Model {
    lens: Lens,
    next_id: u64,
    things: Vec<Thing>,
    relations: Vec<Relation>,
    /// Provenance pass-through: the GSR spec this model was distilled from (via Import spec or the
    /// in-app generate). Preserved on save so the spec fields the canvas doesn't render — the Mobus-only
    /// interfaces/processors/usability — are not *silently* lost (see GSR `docs/spec-architecture.md` §3,
    /// §8: council-mandated pass-through). It records ORIGIN, not current state; it is NOT kept in sync
    /// with later edits to the kernel.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    source_spec: Option<serde_json::Value>,
    /// The CSV tether's carry layer (#13): imported quantitative data (empirical H),
    /// keyed to model elements and stamped with source + date. Persists with the
    /// model (contract §2). `#[serde(default)]` keeps older saved models (no field)
    /// loading, defaulting to no imported data.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    imported: Option<ImportedData>,
}

#[derive(Clone, Copy, PartialEq)]
enum Selected {
    None,
    Thing(u64),
    Rel(u64),
}

impl Default for Selected {
    fn default() -> Self {
        Selected::None
    }
}

#[derive(Default)]
struct CanvasApp {
    lens: Option<Lens>,
    things: Vec<Thing>,
    relations: Vec<Relation>,
    selection: Selected,
    editing: Option<u64>,
    editing_rel: Option<u64>,
    drag: Option<u64>,
    connecting: Option<u64>,
    /// #28: was Shift held at ANY point during the current rim-drag? The
    /// source-birth gesture used to sample Shift only at release — holding it
    /// through the drag but easing off a beat early silently birthed a Sink.
    connect_shift: bool,
    next_id: u64,
    focus_pending: bool,
    show_math: bool,
    // LLM-assisted generation: the canvas calls GSR /extract (local or cloud), distills the
    // returned spec into this bare Model in-process. GSR stays the single brain.
    gen_desc: String,
    gen_cloud: bool,
    gen_model: String, // "" = Anthropic Haiku; an Ollama id (e.g. "gemma4:12b") = truly local LLM
    gen_busy: bool,
    gen_error: Option<String>,
    gen_rx: Option<std::sync::mpsc::Receiver<Result<serde_json::Value, String>>>,
    /// Provenance of the current model when it came from a spec (Import or generate). Persisted on save.
    source_spec: Option<serde_json::Value>,
    /// The CSV tether's carry layer (#13): imported empirical H keyed to model
    /// elements. Persisted with the model; supplies the projection's quantitative
    /// parameters and the run-vs-actual comparison. `None` until a CSV is imported.
    imported: Option<ImportedData>,
    /// The in-flight import mapping (contract §1). `Some` while the mapping window
    /// is open — a parsed CSV plus per-column assignments. Transient, never saved.
    import_draft: Option<MappingDraft>,
    /// The post-import disclosure register: unmapped elements ("3 flows received no
    /// data") and any orphaned series (T5/T3). Shown until dismissed. Transient.
    import_notice: Option<String>,
    /// #26: a new import would REPLACE the model's single `imported` slot, so when
    /// one already exists the file dialog waits behind an explicit confirm that
    /// names what would be lost. `true` while that confirm window is up. Transient.
    import_replace_pending: bool,
    /// #26: a drag-dropped CSV waiting behind the replace-confirm — consumed on
    /// Replace (parsed instead of opening the dialog), dropped on Cancel.
    pending_drop: Option<std::path::PathBuf>,
    /// Env-birth cue (#2): message + the `ctx` time it was born, so drag-to-empty's
    /// silent Role::Environment birth gets a visible, self-dismissing toast instead
    /// of surfacing only at audit time. `None` once expired.
    env_birth_notice: Option<(String, f64)>,
    /// The model library: a canonical home dir (`~/Documents/bert-lenses/`) and its `*.json` contents,
    /// listed in the left panel for one-click loading. Lazy-initialised on first frame.
    models_dir: Option<std::path::PathBuf>,
    library: Vec<std::path::PathBuf>,
    /// Set by import/Tidy; the next frame lays out centered on the visible canvas rect (so content
    /// never lands off-screen). Deferred because the rect is only known during rendering.
    relayout: bool,
    /// Arc 4.1 audit mode: the read-only "Check consistency" panel is open. On demand only —
    /// the report is recomputed fresh from the canvas each frame it shows and dismisses to
    /// nothing (the God-tool guard: Operational data accessible, never ambient).
    show_audit: bool,
    /// Arc 4.2 mapping: the Mobus work-process palette is open. On demand only, and Mobus-only
    /// (the palette is Mobus vocabulary) — closed everywhere else, never ambient. Closing it
    /// unloads the stamp.
    show_palette: bool,
    /// The loaded stamp, live only while `show_palette`: click a component to apply it. `None`
    /// = no stamp loaded (clicks just select, as usual).
    stamp: Option<Stamp>,
    /// The full path the current import's CSV was read from (#38): the wizard's
    /// filename-only stamp can't rebuild a runnable manifest, this can.
    import_source_path: Option<std::path::PathBuf>,
    /// The finished mapping, re-serialized as a run manifest at commit (#38):
    /// the wizard's one deliberate ritual, kept so "Save run manifest…" can
    /// write it without re-asking. Replaced on each new import.
    last_mapping_manifest: Option<manifest::RunManifest>,
    // ── Arc 4.3: the Run surface (Shape B), native-only, transient ──
    /// The Δt/T parameter prompt is open (opened by the Run action, Mobus-only).
    #[cfg(not(target_arch = "wasm32"))]
    run_prompt: bool,
    /// The transient Results panel is open — its own room (Shape B), dismisses to nothing.
    #[cfg(not(target_arch = "wasm32"))]
    run_panel: bool,
    /// Last-used Δt / T, prefilled into the prompt. In memory only — never a persisted control (G1).
    #[cfg(not(target_arch = "wasm32"))]
    run_dt: String,
    #[cfg(not(target_arch = "wasm32"))]
    run_t: String,
    /// The latest recorded run, in memory only — never serialized into Save or Export (§4).
    #[cfg(not(target_arch = "wasm32"))]
    run_results: Option<RunResults>,
    /// The previous run's one-line summary, retained beside the current one (B4).
    #[cfg(not(target_arch = "wasm32"))]
    prev_run_line: Option<String>,
    /// Set when Run is invoked on a model that fails `validate_operational`: the routing
    /// message replaces any results and no partial run happens (R2).
    #[cfg(not(target_arch = "wasm32"))]
    run_gate_msg: Option<String>,
    /// The current model's library file stem — set on Save/Open/library-load, used
    /// only to label ledger entries (#15). `None` (renders "untitled") for a fresh
    /// or generated model never yet saved or loaded from a named file.
    current_model_name: Option<String>,
    /// The loaded model's full path (#32): Save writes back here silently; only
    /// Save As (or a fresh model) opens the name dialog. Set on Open/library-load/
    /// Save As, cleared by nothing short of loading another model.
    current_model_path: Option<std::path::PathBuf>,
    /// Feedback from the last explicit "Save report" gesture — the written path,
    /// or an error string. Transient, cleared on the next Run.
    #[cfg(not(target_arch = "wasm32"))]
    last_report_msg: Option<String>,
}

fn arrow_head(painter: &egui::Painter, tip: egui::Pos2, dir: egui::Vec2, color: egui::Color32) {
    let back = tip - dir * 11.0;
    let perp = egui::vec2(-dir.y, dir.x) * 5.0;
    painter.add(egui::Shape::convex_polygon(
        vec![tip, back + perp, back - perp],
        color,
        egui::Stroke::NONE,
    ));
}

/// Dashed ring around a point, used to mark environment placement at the Klir lens
/// without borrowing the Bunge/Mobus square (Klir's vocabulary has no C/E shape split —
/// the ring stays a circle and only interrupts the stroke).
fn dashed_ring(painter: &egui::Painter, center: egui::Pos2, radius: f32, color: egui::Color32) {
    let segments = 40;
    let pts: Vec<egui::Pos2> = (0..=segments)
        .map(|i| {
            let a = (i as f32 / segments as f32) * std::f32::consts::TAU;
            center + egui::vec2(a.cos(), a.sin()) * radius
        })
        .collect();
    painter.add(egui::Shape::dashed_line(&pts, egui::Stroke::new(1.5, color), 4.0, 4.0));
}

fn dist_to_seg(p: egui::Pos2, a: egui::Pos2, b: egui::Pos2) -> f32 {
    let ab = b - a;
    let len_sq = ab.length_sq();
    if len_sq == 0.0 {
        return p.distance(a);
    }
    let t = ((p - a).dot(ab) / len_sq).clamp(0.0, 1.0);
    p.distance(a + ab * t)
}

/// Collect every `*.json` under `dir`, recursing into subfolders (models filed by Bunge
/// kind live one level down). Sorted for a stable panel order.
fn scan_json(dir: &std::path::Path) -> Vec<std::path::PathBuf> {
    let mut out = Vec::new();
    let mut stack = vec![dir.to_path_buf()];
    while let Some(d) = stack.pop() {
        let Ok(entries) = std::fs::read_dir(&d) else { continue };
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                // `retired/` is the archive (#32): archived models stay on disk
                // but leave the panel. `runs/` and `data/` are not models at all.
                let skip = p
                    .file_name()
                    .and_then(|s| s.to_str())
                    .is_some_and(|n| matches!(n, "retired" | "runs" | "data"));
                if !skip {
                    stack.push(p);
                }
            } else if p.extension().is_some_and(|x| x == "json") {
                out.push(p);
            }
        }
    }
    out.sort();
    out
}

/// Group library paths by the immediate subfolder under `root`: `None` = files at the root,
/// then each subfolder alphabetically, except `retired` which is always pinned last (archive
/// noise, not something to browse before the live groups). Within a group the paths keep
/// their sorted order. This is what the panel renders as headers, so nothing filed in a
/// folder goes unseen.
fn group_by_folder(
    root: &std::path::Path,
    files: &[std::path::PathBuf],
) -> Vec<(Option<String>, Vec<std::path::PathBuf>)> {
    use std::collections::BTreeMap;
    let mut root_files: Vec<std::path::PathBuf> = Vec::new();
    let mut folders: BTreeMap<String, Vec<std::path::PathBuf>> = BTreeMap::new();
    for p in files {
        let rel = p.strip_prefix(root).unwrap_or(p);
        match rel.parent().and_then(|par| par.components().next()) {
            Some(c) => folders
                .entry(c.as_os_str().to_string_lossy().into_owned())
                .or_default()
                .push(p.clone()),
            None => root_files.push(p.clone()),
        }
    }
    let retired = folders.remove("retired");
    let mut groups: Vec<(Option<String>, Vec<std::path::PathBuf>)> = Vec::new();
    if !root_files.is_empty() {
        groups.push((None, root_files));
    }
    groups.extend(folders.into_iter().map(|(k, v)| (Some(k), v)));
    if let Some(v) = retired {
        groups.push((Some("retired".to_string()), v));
    }
    groups
}

impl CanvasApp {
    fn hit(&self, p: egui::Pos2) -> Option<u64> {
        self.things
            .iter()
            .rev()
            .find(|t| p.distance(t.pos) <= RADIUS)
            .map(|t| t.id)
    }

    fn nearest(&self, p: egui::Pos2) -> Option<(u64, f32)> {
        self.things
            .iter()
            .map(|t| (t.id, p.distance(t.pos)))
            .min_by(|x, y| x.1.total_cmp(&y.1))
    }

    fn pos_of(&self, id: u64) -> Option<egui::Pos2> {
        self.things.iter().find(|t| t.id == id).map(|t| t.pos)
    }

    fn name_of(&self, id: u64) -> String {
        self.things
            .iter()
            .find(|t| t.id == id)
            .map(|t| {
                if t.name.trim().is_empty() {
                    "·".to_string()
                } else {
                    t.name.clone()
                }
            })
            .unwrap_or_default()
    }

    fn is_comp(&self, id: u64) -> bool {
        self.things
            .iter()
            .find(|t| t.id == id)
            .map_or(false, |t| t.role == Role::Component)
    }

    /// Bunge: an external thing is in E only if it is bonded to a component (derived, not labelled).
    fn in_environment(&self, id: u64) -> bool {
        let external = self
            .things
            .iter()
            .find(|t| t.id == id)
            .map_or(false, |t| t.role == Role::Environment);
        external
            && self.relations.iter().any(|r| {
                r.is_bond && ((r.a == id && self.is_comp(r.b)) || (r.b == id && self.is_comp(r.a)))
            })
    }

    /// Is this model a heap rather than a system? The verdict is bert-core's, not
    /// the shell's: project the canvas kernel and ask `validate_mode(Structural)`,
    /// whose `check_bond` mirrors Bunge Def 1.1. Replaces the old hand-rolled
    /// `is_aggregate`/`has_internal_bond` pair — no systemhood logic lives here.
    fn is_heap(&self, lens: Lens) -> bool {
        let wm = to_world_model(&self.things, &self.relations, lens);
        validate_mode(&wm, Mode::Structural).has_errors()
    }

    fn has_relation(&self, a: u64, b: u64) -> bool {
        self.relations
            .iter()
            .any(|r| (r.a == a && r.b == b) || (r.a == b && r.b == a))
    }

    fn relation_at(&self, p: egui::Pos2) -> Option<u64> {
        self.relations
            .iter()
            .rev()
            .find(|r| match (self.pos_of(r.a), self.pos_of(r.b)) {
                (Some(a), Some(b)) => dist_to_seg(p, a, b) <= 6.0,
                _ => false,
            })
            .map(|r| r.id)
    }

    fn delete_thing(&mut self, id: u64) {
        self.things.retain(|t| t.id != id);
        self.relations.retain(|r| r.a != id && r.b != id);
    }

    /// Stamp (or with `None`, clear) a component's Mobus work-process primitive.
    /// No-op on an environment thing — only components carry a work process. The
    /// single apply path for both the palette click and the tests.
    fn set_primitive(&mut self, id: u64, primitive: Option<ProcessPrimitive>) {
        if let Some(t) = self.things.iter_mut().find(|t| t.id == id) {
            if t.role == Role::Component {
                t.primitive = primitive;
            }
        }
    }

    /// Apply the loaded `stamp` to the component at `id` (ignoring env things). A
    /// primitive stamps that work process; the eraser clears it. Selecting the
    /// stamped thing gives immediate feedback on what was hit.
    fn apply_stamp(&mut self, id: u64) {
        let Some(stamp) = self.stamp else { return };
        if self.things.iter().any(|t| t.id == id && t.role == Role::Component) {
            self.set_primitive(
                id,
                match stamp {
                    Stamp::Prim(p) => Some(p),
                    Stamp::Erase => None,
                },
            );
            self.selection = Selected::Thing(id);
        }
    }

    /// The canonical model library dir (`~/Documents/bert-lenses/`), created on first use.
    fn lib_dir(&mut self) -> std::path::PathBuf {
        if self.models_dir.is_none() {
            let home = std::env::var("HOME").unwrap_or_default();
            let dir = std::path::PathBuf::from(home).join("Documents").join("bert-lenses");
            let _ = std::fs::create_dir_all(&dir);
            self.models_dir = Some(dir);
        }
        self.models_dir.clone().unwrap_or_default()
    }

    /// Rescan the library dir for `*.json` (models and specs alike — `load_json` sniffs the kind).
    /// Recurses into subfolders so models filed by Bunge kind (`biological/`, `technical/`, …)
    /// stay visible; the panel groups them by folder.
    fn refresh_library(&mut self) {
        let dir = self.lib_dir();
        self.library = scan_json(&dir);
    }

    fn load_path(&mut self, path: &std::path::Path) {
        match std::fs::read_to_string(path) {
            Ok(txt) => {
                self.load_json(&txt);
                self.current_model_name = path.file_stem().and_then(|s| s.to_str()).map(str::to_string);
                self.current_model_path = Some(path.to_path_buf());
            }
            Err(e) => self.gen_error = Some(format!("could not read file: {e}")),
        }
    }

    /// Left panel: the model library — click any entry to load it (one-click, no native dialog).
    /// Files are grouped by their subfolder (Bunge kind), root-level models first, so nothing
    /// filed away goes unseen.
    fn library_panel(&mut self, ctx: &egui::Context) {
        let lib = self.library.clone();
        let root = self.lib_dir();
        let groups = group_by_folder(&root, &lib);
        // #26: the current import, named where it's always visible — source,
        // date, and every column→element mapping. `None` renders nothing.
        let import_block = self
            .imported
            .as_ref()
            .map(|d| (format!("{} · {}", d.source_file, d.imported_at), import_mapping_sentences(d)));
        let mut to_load: Option<std::path::PathBuf> = None;
        let mut to_retire: Option<std::path::PathBuf> = None;
        let mut do_refresh = false;
        egui::SidePanel::left("library")
            .resizable(true)
            .default_width(196.0)
            .frame(egui::Frame::default().fill(theme::SURFACE).inner_margin(egui::Margin::same(10)))
            .show(ctx, |ui| {
                ui.add_space(4.0);
                ui.horizontal(|ui| {
                    ui.label(egui::RichText::new("Library").strong().color(theme::INK));
                    if ui.small_button("⟳").on_hover_text("Rescan the folder").clicked() {
                        do_refresh = true;
                    }
                });
                ui.label(egui::RichText::new(format!("{} saved", lib.len())).small().color(theme::INK_FAINT));
                ui.label(
                    egui::RichText::new(format!("build {BUILD_SHA}"))
                        .small()
                        .color(theme::INK_FAINT),
                )
                .on_hover_text("The git sha this binary was built from (#30) — if it doesn't match what you just merged, you're running a stale deploy.");
                if let Some((src, mapped)) = &import_block {
                    ui.add_space(6.0);
                    ui.label(egui::RichText::new("Data").strong().color(theme::INK));
                    ui.label(egui::RichText::new(src).small().color(theme::INK_SOFT));
                    for m in mapped {
                        ui.label(egui::RichText::new(m.as_str()).small().color(theme::INK_FAINT));
                    }
                }
                ui.separator();
                egui::ScrollArea::vertical().show(ui, |ui| {
                    if lib.is_empty() {
                        ui.label(
                            egui::RichText::new("Empty.\nSave or Open a spec to fill it.")
                                .color(theme::INK_FAINT),
                        );
                    }
                    for (folder, paths) in &groups {
                        if let Some(name) = folder {
                            ui.add_space(6.0);
                            ui.label(egui::RichText::new(name).small().strong().color(theme::INK_FAINT));
                        }
                        for p in paths {
                            let name = p.file_stem().and_then(|s| s.to_str()).unwrap_or("?");
                            ui.horizontal(|ui| {
                                if ui
                                    .add(egui::Button::new(egui::RichText::new(name).color(theme::INK_SOFT)).frame(false))
                                    .clicked()
                                {
                                    to_load = Some(p.clone());
                                }
                                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                    if ui
                                        .add(egui::Button::new(egui::RichText::new("−").small().color(theme::INK_FAINT)).frame(false))
                                        .on_hover_text("Archive: move to retired/ (stays on disk, leaves this panel)")
                                        .clicked()
                                    {
                                        to_retire = Some(p.clone());
                                    }
                                });
                            });
                        }
                    }
                });
            });
        if do_refresh {
            self.refresh_library();
        }
        if let Some(p) = to_load {
            self.load_path(&p);
        }
        if let Some(p) = to_retire {
            self.retire_model(&p);
        }
    }

    /// Archive a library model (#32): move it into `retired/` — on disk but out
    /// of the panel. Never deletes; un-archiving is a Finder move (or Open).
    fn retire_model(&mut self, path: &std::path::Path) {
        let retired = self.lib_dir().join("retired");
        let _ = std::fs::create_dir_all(&retired);
        let Some(name) = path.file_name() else { return };
        match std::fs::rename(path, retired.join(name)) {
            Ok(()) => {
                // If the open model just left the library, Save must not silently
                // write to the old (now moved) path.
                if self.current_model_path.as_deref() == Some(path) {
                    self.current_model_path = Some(retired.join(name));
                }
                self.refresh_library();
            }
            Err(e) => self.gen_error = Some(format!("could not archive: {e}")),
        }
    }

    /// Save (#32): a loaded model writes back to its own file silently — no name
    /// prompt. A fresh model falls through to Save As (the only naming moment).
    fn save_model(&mut self, lens: Lens) {
        match self.current_model_path.clone() {
            Some(path) => self.write_model_to(lens, &path),
            None => self.save_model_as(lens),
        }
    }

    /// Save As: the explicit naming dialog — for a fresh model, or to fork a
    /// loaded one under a new name.
    fn save_model_as(&mut self, lens: Lens) {
        let dir = self.lib_dir();
        if let Some(path) = rfd::FileDialog::new()
            .add_filter("bert-lenses model", &["json"])
            .set_directory(&dir)
            .set_file_name("model.json")
            .save_file()
        {
            self.write_model_to(lens, &path);
        }
    }

    fn write_model_to(&mut self, lens: Lens, path: &std::path::Path) {
        let model = Model {
            lens,
            next_id: self.next_id,
            things: self.things.clone(),
            relations: self.relations.clone(),
            source_spec: self.source_spec.clone(),
            // Empirical H rides along in Save (contract §2), never in Export.
            imported: self.imported.clone(),
        };
        if let Ok(json) = serde_json::to_string_pretty(&model) {
            match std::fs::write(path, json) {
                Ok(()) => {
                    self.current_model_name =
                        path.file_stem().and_then(|s| s.to_str()).map(str::to_string);
                    self.current_model_path = Some(path.to_path_buf());
                }
                Err(e) => self.gen_error = Some(format!("could not save model: {e}")),
            }
        }
        self.refresh_library(); // the new file shows in the panel immediately
    }

    /// Export the current canvas kernel as a bert-core [`WorldModel`] JSON — the
    /// object BERT / GSR / compose consume. Stamped with the authored rung
    /// (`mode`), so `bert_core::operational::validate_operational` fires its
    /// representational refusal on a Core/Structural export and clears the mode
    /// gate on a Mobus one. Distinct from Save (which writes the canvas `Model`
    /// for the library round-trip); this is the seam out to bert-core.
    fn export_world_model(&mut self, lens: Lens) {
        let dir = self.lib_dir();
        if let Some(path) = rfd::FileDialog::new()
            .add_filter("BERT WorldModel", &["json"])
            .set_directory(&dir)
            .set_file_name("model.bert.json")
            .save_file()
        {
            // Export ships imported *scalars* (a flow's amount, a component's
            // stock/param) as ordinary WorldModel fields — tether-as-supply makes
            // every number traceable to real data (#13). The empirical *series*
            // and stamps never enter the WorldModel (it has no slot for them), so
            // empirical H does not ship in Export, exactly as contract §2 asks.
            let wm = self.world_model(lens);
            if let Ok(json) = serde_json::to_string_pretty(&wm) {
                let _ = std::fs::write(path, json);
            }
        }
    }

    /// Open ANY supported JSON, auto-detected: a saved canvas Model, or a GSR spec (a `/extract`
    /// response `{spec:…}` or a bare spec). One loader so the obvious button never silently fails on
    /// the "wrong" kind — the two-button confusion that bit a real import (2026-06-29).
    fn open_model(&mut self) {
        let dir = self.lib_dir();
        if let Some(path) = rfd::FileDialog::new()
            .add_filter("model or GSR spec", &["json"])
            .set_directory(&dir)
            .pick_file()
        {
            match std::fs::read_to_string(&path) {
                Ok(txt) => {
                    self.load_json(&txt);
                    self.current_model_name = path.file_stem().and_then(|s| s.to_str()).map(str::to_string);
                    self.current_model_path = Some(path.clone());
                }
                Err(e) => self.gen_error = Some(format!("could not read file: {e}")),
            }
        }
    }

    /// Sniff and load: a saved Model deserializes strictly (lens/things/relations/next_id); anything
    /// else is treated as a GSR spec (unwrap `.spec` if it's a `/extract` response, else use as-is).
    fn load_json(&mut self, txt: &str) {
        if let Ok(model) = serde_json::from_str::<Model>(txt) {
            self.lens = Some(model.lens);
            self.next_id = model.next_id;
            self.things = model.things;
            self.relations = model.relations;
            self.source_spec = model.source_spec;
            self.imported = model.imported;
            // Disclose any imported series whose element no longer exists (T3): a
            // loaded model may predate a deletion; the series is kept (orphaned),
            // never silently dropped.
            self.import_notice = self.orphan_notice();
            self.selection = Selected::None;
            self.editing = None;
            self.editing_rel = None;
            self.connecting = None;
            self.connect_shift = false;
            return;
        }
        match serde_json::from_str::<serde_json::Value>(txt) {
            Ok(v) => {
                let spec = v.get("spec").cloned().unwrap_or(v);
                if !self.apply_spec(spec) {
                    self.gen_error = Some("not a bert-lenses model or a non-empty GSR spec".to_string());
                }
            }
            Err(e) => self.gen_error = Some(format!("not valid JSON: {e}")),
        }
    }

    /// Distill a GSR spec into the live model and record it as provenance (the single apply path,
    /// shared by Open (spec branch) and the in-app generate — same `model_from_spec` as headless `convert`).
    /// Returns false if the spec had nothing to model. Lands in a lens so the result renders.
    fn apply_spec(&mut self, spec: serde_json::Value) -> bool {
        let (things, relations, next_id) = model_from_spec(&spec);
        if things.is_empty() {
            return false;
        }
        self.things = things;
        self.relations = relations;
        self.next_id = next_id;
        self.source_spec = Some(spec);
        if self.lens.is_none() {
            self.lens = Some(Lens::Bunge); // bonds + kinds + roles all render faithfully in Bunge
        }
        self.relayout = true; // lay out centered on the visible canvas next frame
        self.selection = Selected::None;
        self.editing = None;
        self.editing_rel = None;
        self.connecting = None;
        self.connect_shift = false;
        true
    }

    /// The imported quantitative supply (#13), or empty params when no CSV is
    /// attached — in which case the projection is byte-for-byte the old one.
    fn params(&self) -> ModelParams {
        self.imported
            .as_ref()
            .map(ImportedData::projection_params)
            .unwrap_or_default()
    }

    /// Project the live canvas with imported parameters folded in. The runtime
    /// paths (run, staleness key, audit, export) go through this so what runs is
    /// the model *plus its imported reality*; the pure `to_world_model` (empty
    /// params) stays for the structural tests.
    fn world_model(&self, lens: Lens) -> WorldModel {
        to_world_model_with(&self.things, &self.relations, lens, &self.params())
    }

    /// Disclosure of imported series whose mapped element no longer exists (T3):
    /// the data is orphaned and kept, never silently dropped. `None` when nothing
    /// is orphaned.
    fn orphan_notice(&self) -> Option<String> {
        let d = self.imported.as_ref()?;
        let mut orphans: Vec<String> = Vec::new();
        for rid in d.keyed_relation_ids() {
            if !self.relations.iter().any(|r| r.id == rid) {
                if let Some(s) = d.flow_series.get(&rid) {
                    orphans.push(format!("flow \"{}\"", s.element_name));
                }
            }
        }
        let mut seen_things: std::collections::HashSet<u64> = std::collections::HashSet::new();
        for tid in d.keyed_thing_ids() {
            if !seen_things.insert(tid) {
                continue;
            }
            if !self.things.iter().any(|t| t.id == tid) {
                let name = d
                    .stock_series
                    .get(&tid)
                    .or_else(|| d.param_series.get(&tid))
                    .map(|s| s.element_name.clone())
                    .unwrap_or_default();
                orphans.push(format!("component \"{name}\""));
            }
        }
        if orphans.is_empty() {
            None
        } else {
            Some(format!(
                "{} imported series orphaned by a deletion — {} — data kept, not dropped",
                orphans.len(),
                orphans.join(", ")
            ))
        }
    }

}

// ── The CSV tether: import + mapping surface (contract §1) ───────────────────
//
// "Import data (CSV)" opens a file, parses it, and starts a mapping: the epistemic
// ritual where each column is given a systems meaning before any number enters the
// model. The finish is gated on the laws — every column spoken for (T1), no
// magnitude without units (T2) — and it only ever writes an `ImportedData`, never
// structure (T5). Unmapped model elements are disclosed at the end.

impl CanvasApp {
    /// A flow's display label: its own name, else `source → sink`.
    fn flow_label(&self, r: &Relation) -> String {
        if r.name.trim().is_empty() {
            format!("{} → {}", self.name_of(r.a), self.name_of(r.b))
        } else {
            r.name.clone()
        }
    }

    /// Resolve an element id (a bond relation or a thing) to a display label for
    /// the translation sentences. Relations are checked first; on an interactively
    /// authored model ids are globally unique, so this is exact.
    fn tether_name_of(&self, id: u64) -> String {
        if let Some(r) = self.relations.iter().find(|r| r.id == id) {
            self.flow_label(r)
        } else {
            self.name_of(id)
        }
    }

    /// Open a CSV and start the mapping. A parse failure surfaces in the same
    /// error channel as other loads; it never touches the model.
    fn import_csv(&mut self) {
        // #26: the model holds ONE import; a new one replaces it. Never silently —
        // if data is already mapped, the file dialog waits behind a confirm that
        // names what would be lost.
        if self.imported.is_some() {
            self.import_replace_pending = true;
            return;
        }
        self.import_csv_dialog();
    }

    /// The actual file-dialog → parse → mapping-draft flow, reached directly when
    /// no import exists, or via the #26 replace-confirm when one does.
    fn import_csv_dialog(&mut self) {
        let dir = self.lib_dir();
        let Some(path) = rfd::FileDialog::new()
            .add_filter("CSV data", &["csv"])
            .set_directory(&dir)
            .pick_file()
        else {
            return;
        };
        self.import_csv_from_path(&path);
    }

    /// Read + parse a CSV path into the mapping draft — shared by the file
    /// dialog and window drag-drop (#26).
    fn import_csv_from_path(&mut self, path: &std::path::Path) {
        let text = match std::fs::read_to_string(path) {
            Ok(t) => t,
            Err(e) => {
                self.gen_error = Some(format!("could not read CSV: {e}"));
                return;
            }
        };
        let file = path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or("data.csv")
            .to_string();
        match tether::parse_csv(&text) {
            Ok((headers, rows)) => {
                self.import_draft = Some(MappingDraft::new(file, headers, rows));
                self.import_source_path = Some(path.to_path_buf());
                self.import_notice = None;
            }
            Err(_) => self.gen_error = Some("that CSV had no header row or columns".to_string()),
        }
    }

    /// Write the retained mapping manifest (#38) via a save dialog, defaulting
    /// beside the model in the library. T rides at its default; edit the saved
    /// file to change it — the manifest is the artifact, not a hidden setting.
    fn save_run_manifest(&mut self) {
        let Some(m) = self.last_mapping_manifest.clone() else {
            return;
        };
        let dir = self.lib_dir();
        let default_name = format!(
            "{}-run.json",
            self.current_model_name.as_deref().unwrap_or("model")
        );
        let Some(path) = rfd::FileDialog::new()
            .add_filter("run manifest", &["json"])
            .set_directory(&dir)
            .set_file_name(&default_name)
            .save_file()
        else {
            return;
        };
        match serde_json::to_string_pretty(&m) {
            Ok(json) => {
                if let Err(e) = std::fs::write(&path, json) {
                    self.gen_error = Some(format!("could not save manifest: {e}"));
                } else {
                    self.import_notice =
                        Some(format!("run manifest saved — bert-lenses run {}", path.display()));
                }
            }
            Err(e) => self.gen_error = Some(format!("could not serialize manifest: {e}")),
        }
    }

    /// A path for the manifest: library-relative when the file lives under the
    /// library (portable manifests), absolute otherwise.
    fn manifest_path_str(&mut self, path: &std::path::Path) -> String {
        let lib = self.lib_dir();
        path.strip_prefix(&lib)
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|_| path.to_string_lossy().into_owned())
    }

    /// Window drag-drop (#26): a dropped `.csv` enters the same import flow as
    /// the button — including the replace-confirm when data already exists.
    /// Non-CSV drops are ignored (models still load via Open/library).
    fn handle_dropped_files(&mut self, ctx: &egui::Context) {
        let dropped: Vec<std::path::PathBuf> = ctx.input(|i| {
            i.raw
                .dropped_files
                .iter()
                .filter_map(|f| f.path.clone())
                .collect()
        });
        let Some(csv) = dropped
            .into_iter()
            .find(|p| p.extension().is_some_and(|x| x.eq_ignore_ascii_case("csv")))
        else {
            return;
        };
        if self.imported.is_some() {
            self.pending_drop = Some(csv);
            self.import_replace_pending = true;
        } else {
            self.import_csv_from_path(&csv);
        }
    }

    /// The mapping window (contract §1). Shown while a draft is in flight. Renders
    /// a preview table, a per-column assignment surface with its live translation
    /// sentence, the observation Δt, and a Finish gated on T1+T2.
    fn import_mapping_window(&mut self, ctx: &egui::Context) {
        let Some(mut draft) = self.import_draft.take() else {
            return;
        };
        // Target lists + name resolver, built before rendering so the window body
        // borrows nothing of `self`.
        let components: Vec<(u64, String)> = self
            .things
            .iter()
            .filter(|t| t.role == Role::Component)
            .map(|t| (t.id, self.name_of(t.id)))
            .collect();
        let flows: Vec<(u64, String)> = self
            .relations
            .iter()
            .filter(|r| r.is_bond)
            .map(|r| (r.id, self.flow_label(r)))
            .collect();
        let name_of = |id: u64| self.tether_name_of(id);

        let mut open = true;
        let mut finish = false;
        let mut cancel = false;
        let mut prefill = false;
        egui::Window::new(egui::RichText::new("Map CSV columns — the tether").color(theme::INK))
            .open(&mut open)
            .resizable(true)
            .default_width(600.0)
            .default_pos(egui::pos2(200.0, 90.0))
            .show(ctx, |ui| {
                ui.label(
                    egui::RichText::new(format!("{} · {} columns, {} rows", draft.source_file, draft.headers.len(), draft.rows.len()))
                        .small()
                        .color(theme::INK_FAINT),
                );
                ui.label(
                    egui::RichText::new(
                        "Say what each column means before a single number enters the model.",
                    )
                    .small()
                    .italics()
                    .color(theme::MOBUS),
                );
                ui.add_space(6.0);

                // Preview: the first ~10 rows, the pandas-familiar look.
                egui::CollapsingHeader::new(egui::RichText::new("Preview").small().color(theme::INK_SOFT))
                    .default_open(true)
                    .show(ui, |ui| {
                        egui::ScrollArea::horizontal().id_salt("csv-preview").show(ui, |ui| {
                            egui::Grid::new("csv-grid").striped(true).spacing(egui::vec2(12.0, 2.0)).show(ui, |ui| {
                                for h in &draft.headers {
                                    ui.label(egui::RichText::new(h).strong().small().color(theme::INK));
                                }
                                ui.end_row();
                                for row in draft.preview(10) {
                                    for i in 0..draft.headers.len() {
                                        ui.label(egui::RichText::new(row.get(i).map(String::as_str).unwrap_or("")).small().color(theme::INK_SOFT));
                                    }
                                    ui.end_row();
                                }
                            });
                        });
                    });

                ui.add_space(6.0);
                ui.separator();
                ui.add_space(4.0);

                // Per-column assignment.
                let n = draft.headers.len();
                for i in 0..n {
                    ui.horizontal(|ui| {
                        ui.label(egui::RichText::new(&draft.headers[i]).strong().color(theme::INK));
                        // Role picker.
                        let role = draft.assignments[i].role_word();
                        egui::ComboBox::from_id_salt(("role", i))
                            .selected_text(egui::RichText::new(role).color(theme::INK_SOFT))
                            .show_ui(ui, |ui| {
                                use Assignment::*;
                                for opt in [Unassigned, Ignore, Time, FlowMagnitude(None), StockLevel(None), Parameter(None)] {
                                    let sel = std::mem::discriminant(&draft.assignments[i]) == std::mem::discriminant(&opt);
                                    if ui.selectable_label(sel, opt.role_word()).clicked() {
                                        draft.assignments[i] = opt;
                                    }
                                }
                            });
                        // Target picker for the role that needs one.
                        let targets: Option<&[(u64, String)]> = match draft.assignments[i] {
                            Assignment::FlowMagnitude(_) => Some(&flows),
                            Assignment::StockLevel(_) | Assignment::Parameter(_) => Some(&components),
                            _ => None,
                        };
                        if let Some(list) = targets {
                            let current = match draft.assignments[i] {
                                Assignment::FlowMagnitude(Some(id))
                                | Assignment::StockLevel(Some(id))
                                | Assignment::Parameter(Some(id)) => {
                                    list.iter().find(|(tid, _)| *tid == id).map(|(_, l)| l.clone())
                                }
                                _ => None,
                            };
                            egui::ComboBox::from_id_salt(("target", i))
                                .selected_text(egui::RichText::new(current.unwrap_or_else(|| "choose element…".into())).color(theme::INK_SOFT))
                                .show_ui(ui, |ui| {
                                    for (tid, label) in list {
                                        if ui.selectable_label(false, label).clicked() {
                                            draft.assignments[i] = match draft.assignments[i] {
                                                Assignment::FlowMagnitude(_) => Assignment::FlowMagnitude(Some(*tid)),
                                                Assignment::StockLevel(_) => Assignment::StockLevel(Some(*tid)),
                                                Assignment::Parameter(_) => Assignment::Parameter(Some(*tid)),
                                                ref other => other.clone(),
                                            };
                                        }
                                    }
                                });
                        }
                        // Units field for a flow magnitude (T2).
                        if matches!(draft.assignments[i], Assignment::FlowMagnitude(_)) {
                            ui.label(egui::RichText::new("units").small().color(theme::INK_FAINT));
                            ui.add(egui::TextEdit::singleline(&mut draft.units[i]).desired_width(70.0).hint_text("$/mo"));
                            // Force (#16): emit the series tick by tick instead of a
                            // mean — a source's observed output, or a splitter's
                            // per-tick allocation weight (rung 2).
                            ui.add(egui::Checkbox::new(&mut draft.forced[i], "force"))
                                .on_hover_text(
                                    "Emit this column's series tick by tick instead of its \
                                     average — a forced source rate, or a splitter's per-tick \
                                     allocation weight. Leave off to supply the mean.",
                                );
                        }
                    });
                    // The live translation sentence.
                    if let Some(sentence) = draft.translation(i, &name_of) {
                        ui.horizontal(|ui| {
                            ui.add_space(12.0);
                            ui.label(egui::RichText::new(sentence).small().italics().color(theme::INK_SOFT));
                        });
                    }
                    ui.add_space(3.0);
                }

                ui.add_space(4.0);
                ui.separator();
                ui.add_space(4.0);

                // Observation Δt: inferred from the time column, overridable.
                ui.horizontal(|ui| {
                    ui.label(egui::RichText::new("Observation Δt").color(theme::INK));
                    ui.add(egui::TextEdit::singleline(&mut draft.dt_text).desired_width(64.0));
                    if let Some(inferred) = draft.inferred_dt() {
                        ui.label(egui::RichText::new(format!("inferred {inferred}")).small().color(theme::INK_FAINT));
                        if ui.small_button("use").on_hover_text("Adopt the inferred spacing").clicked() {
                            draft.dt_text = format!("{inferred}");
                        }
                    } else {
                        ui.label(egui::RichText::new("(mark a time column to infer)").small().color(theme::INK_FAINT));
                    }
                });

                ui.add_space(6.0);

                // The finish gate, spelled out honestly (T2 units, T4 long-format).
                match (draft.units_ok(), draft.time_unique_ok()) {
                    (Err(msg), _) | (Ok(()), Err(msg)) => {
                        ui.label(egui::RichText::new(format!("⚠ {msg}")).small().color(theme::WARN));
                    }
                    (Ok(()), Ok(())) if !draft.is_total() => {
                        ui.label(egui::RichText::new("Every column must be assigned or ignored before finishing.").small().color(theme::INK_FAINT));
                    }
                    (Ok(()), Ok(())) => {}
                }

                ui.horizontal(|ui| {
                    if ui.add_enabled(draft.can_finish(), egui::Button::new(egui::RichText::new("Finish import").color(theme::INK))).clicked() {
                        finish = true;
                    }
                    if ui.button(egui::RichText::new("Cancel").color(theme::INK_FAINT)).clicked() {
                        cancel = true;
                    }
                    ui.separator();
                    if ui
                        .button(egui::RichText::new("Prefill from manifest…").color(theme::INK_SOFT))
                        .on_hover_text(
                            "Fill every column's role, unit, and force flag from a saved run \
                             manifest — the whole mapping in one step, instead of by hand.",
                        )
                        .clicked()
                    {
                        prefill = true;
                    }
                });
            });

        if cancel || !open {
            self.import_draft = None;
            return;
        }
        if prefill {
            // Apply a saved manifest's mapping (roles, units, force flags) onto the
            // in-flight draft — the same `apply_to_draft` the headless runner uses,
            // so the wizard and the CLI fill a draft identically (no hand-mapping).
            if let Some(path) = rfd::FileDialog::new()
                .add_filter("run manifest", &["json"])
                .pick_file()
            {
                match std::fs::read_to_string(&path)
                    .ok()
                    .and_then(|s| serde_json::from_str::<manifest::RunManifest>(&s).ok())
                {
                    Some(mf) => {
                        let rctx = manifest::ResolveCtx { flows: &flows, components: &components };
                        if let Err(errs) = mf.apply_to_draft(&mut draft, &rctx) {
                            self.gen_error =
                                Some(format!("manifest does not fit this model/CSV:\n{}", errs.join("\n")));
                        }
                    }
                    None => self.gen_error = Some("that file is not a run manifest".to_string()),
                }
            }
            self.import_draft = Some(draft);
            return;
        }
        if finish {
            self.commit_import(draft);
            return;
        }
        self.import_draft = Some(draft);
    }

    /// Commit a finished draft into the carry layer (T5: only data is written) and
    /// disclose the model elements that received no data (contract §1, "3 flows
    /// received no data" register).
    fn commit_import(&mut self, draft: MappingDraft) {
        let stamp = tether::today_stamp();
        let data = {
            let name_of = |id: u64| self.tether_name_of(id);
            draft.commit(stamp, &name_of)
        };

        // #38: the finished ritual, serialized. Model + data paths resolve
        // library-relative where possible so the manifest travels; T defaults
        // and is edited in the saved file, not re-asked here.
        let model_ref = self
            .current_model_path
            .clone()
            .map(|p| self.manifest_path_str(&p))
            .or_else(|| self.current_model_name.clone().map(|n| format!("{n}.json")));
        let data_ref = self
            .import_source_path
            .clone()
            .map(|p| self.manifest_path_str(&p))
            .unwrap_or_else(|| draft.source_file.clone());
        if let Some(model_ref) = model_ref {
            let t = DEFAULT_T.parse::<f64>().unwrap_or(30.0);
            let label_of = |id: u64| self.tether_name_of(id);
            self.last_mapping_manifest = Some(manifest::RunManifest::from_draft(
                &draft, model_ref, data_ref, t, &label_of,
            ));
        }

        // Unmapped disclosure: bond flows and components that got no series.
        let flows_total = self.relations.iter().filter(|r| r.is_bond).count();
        let flows_mapped = self
            .relations
            .iter()
            .filter(|r| r.is_bond && data.flow_series.contains_key(&r.id))
            .count();
        let comps_total = self.things.iter().filter(|t| t.role == Role::Component).count();
        let comps_mapped = self
            .things
            .iter()
            .filter(|t| {
                t.role == Role::Component
                    && (data.stock_series.contains_key(&t.id) || data.param_series.contains_key(&t.id))
            })
            .count();

        let mut parts: Vec<String> = Vec::new();
        let unmapped_flows = flows_total - flows_mapped;
        let unmapped_comps = comps_total - comps_mapped;
        if unmapped_flows > 0 {
            parts.push(format!("{unmapped_flows} flow{} received no data", if unmapped_flows == 1 { "" } else { "s" }));
        }
        if unmapped_comps > 0 {
            parts.push(format!("{unmapped_comps} component{} received no data", if unmapped_comps == 1 { "" } else { "s" }));
        }
        let disclosure = if parts.is_empty() {
            "every element received data".to_string()
        } else {
            parts.join("; ")
        };
        self.import_notice = Some(format!(
            "Imported {} — {}. Import attached data only; structure is untouched.",
            data.source_file, disclosure
        ));
        self.imported = Some(data);
        self.import_draft = None;
    }

    /// The dismissible post-import / orphan disclosure banner.
    fn import_notice_window(&mut self, ctx: &egui::Context) {
        let Some(msg) = self.import_notice.clone() else {
            return;
        };
        let mut open = true;
        egui::Window::new(egui::RichText::new("Import").color(theme::INK))
            .open(&mut open)
            .resizable(false)
            .default_pos(egui::pos2(240.0, 120.0))
            .show(ctx, |ui| {
                ui.label(egui::RichText::new(msg).color(theme::INK_SOFT));
                if let Some(d) = &self.imported {
                    ui.add_space(4.0);
                    ui.label(
                        egui::RichText::new(format!("source: {} · imported {}", d.source_file, d.imported_at))
                            .small()
                            .color(theme::INK_FAINT),
                    );
                }
            });
        if !open {
            self.import_notice = None;
        }
    }

    /// The #26 replace-confirm: shown when Import is invoked while the model
    /// already carries data. Names the current import (source, date, every
    /// column→element mapping) so what "replace" destroys is visible before the
    /// file dialog opens. Cancel keeps the existing import untouched.
    fn import_replace_confirm_window(&mut self, ctx: &egui::Context) {
        if !self.import_replace_pending {
            return;
        }
        let Some(d) = self.imported.clone() else {
            // Nothing to replace after all (e.g. import cleared meanwhile).
            self.import_replace_pending = false;
            return;
        };
        let mapped = import_mapping_sentences(&d);
        // A drag-dropped CSV is already chosen; a button-triggered replace still
        // needs the file dialog. The button label reflects which (#26).
        let dropped_name = self
            .pending_drop
            .as_ref()
            .and_then(|p| p.file_name())
            .and_then(|s| s.to_str())
            .map(str::to_string);
        let mut open = true;
        let mut proceed = false;
        let mut cancel = false;
        egui::Window::new(egui::RichText::new("Replace imported data?").color(theme::INK))
            .open(&mut open)
            .resizable(false)
            .default_pos(egui::pos2(240.0, 120.0))
            .show(ctx, |ui| {
                ui.label(
                    egui::RichText::new(format!(
                        "This model carries data from {} (imported {}).",
                        d.source_file, d.imported_at
                    ))
                    .color(theme::INK_SOFT),
                );
                for m in &mapped {
                    ui.label(egui::RichText::new(format!("  {m}")).small().color(theme::INK_FAINT));
                }
                ui.add_space(4.0);
                ui.label(
                    egui::RichText::new(match &dropped_name {
                        Some(n) => format!("Importing {n} replaces all of it — the model holds one import."),
                        None => "Importing another CSV replaces all of it — the model holds one import.".to_string(),
                    })
                    .small()
                    .color(theme::INK_SOFT),
                );
                ui.add_space(6.0);
                ui.horizontal(|ui| {
                    let label = match &dropped_name {
                        Some(n) => format!("Replace with {n}"),
                        None => "Replace…".to_string(),
                    };
                    if ui.button(egui::RichText::new(label).color(theme::INK)).clicked() {
                        proceed = true;
                    }
                    if ui.button("Cancel").clicked() {
                        cancel = true;
                    }
                });
            });
        if proceed {
            self.import_replace_pending = false;
            // A dropped file is parsed directly; a button-replace opens the dialog.
            match self.pending_drop.take() {
                Some(path) => self.import_csv_from_path(&path),
                None => self.import_csv_dialog(),
            }
        } else if cancel || !open {
            self.import_replace_pending = false;
            self.pending_drop = None;
        }
    }

    /// The env-birth cue (#2): a small self-dismissing toast, distinct from a missed
    /// double-click, so drag-to-empty's Role::Environment birth is visible at the
    /// moment it happens rather than only at audit time. Not modal — it never blocks
    /// the gesture, and the app keeps working underneath it.
    fn env_birth_toast(&mut self, ctx: &egui::Context) {
        const LIFETIME: f64 = 2.2;
        const FADE: f64 = 0.5;
        let Some((msg, born_at)) = self.env_birth_notice.clone() else {
            return;
        };
        let age = ctx.input(|i| i.time) - born_at;
        if age >= LIFETIME {
            self.env_birth_notice = None;
            return;
        }
        let alpha = (1.0 - (age - (LIFETIME - FADE)).max(0.0) / FADE).clamp(0.0, 1.0) as f32;
        egui::Area::new(egui::Id::new("env_birth_toast"))
            .anchor(egui::Align2::CENTER_BOTTOM, egui::vec2(0.0, -24.0))
            .interactable(false)
            .show(ctx, |ui| {
                egui::Frame::popup(ui.style())
                    .fill(theme::SURFACE.gamma_multiply(alpha))
                    .show(ui, |ui| {
                        ui.label(egui::RichText::new(msg).color(theme::INK_SOFT.gamma_multiply(alpha)));
                    });
            });
        ctx.request_repaint();
    }
}

// ── L1: distill a GSR intermediate spec into the bare, lens-neutral Model ──

/// Mobus substance.type → Bunge connection-flow Kind (Treatise v.4 §1.3). 1:1 by design.
fn substance_to_kind(s: &str) -> Kind {
    match s.trim().to_ascii_lowercase().as_str() {
        "energy" => Kind::Energy,
        "material" | "matter" => Kind::Matter,
        "message" | "information" | "informational" => Kind::Informational,
        "field" => Kind::Field,
        _ => Kind::Unspecified,
    }
}

fn intern(
    name: &str,
    role: Role,
    things: &mut Vec<Thing>,
    map: &mut std::collections::HashMap<String, u64>,
    next: &mut u64,
) -> u64 {
    if let Some(&id) = map.get(name) {
        return id;
    }
    let id = *next;
    *next += 1;
    things.push(Thing { id, name: name.to_string(), pos: egui::Pos2::ZERO, role, primitive: None });
    map.insert(name.to_string(), id);
    id
}

fn str_at<'a>(v: &'a serde_json::Value, key: &str) -> &'a str {
    v.get(key).and_then(|x| x.as_str()).unwrap_or("")
}
fn substance_type(flow: &serde_json::Value) -> Kind {
    substance_to_kind(flow.get("substance").and_then(|s| s.get("type")).and_then(|t| t.as_str()).unwrap_or(""))
}

/// Canonical layout origin for auto-arrange and Tidy.
const LAYOUT_CENTER: egui::Pos2 = egui::pos2(520.0, 360.0);

/// Place ids evenly on a circle of `radius` around `center` (id order = stable).
fn place_ring(ids: &[u64], center: egui::Pos2, radius: f32, things: &mut [Thing]) {
    let n = ids.len().max(1);
    for (i, id) in ids.iter().enumerate() {
        let a = std::f32::consts::TAU * (i as f32) / (n as f32) - std::f32::consts::FRAC_PI_2;
        if let Some(t) = things.iter_mut().find(|t| t.id == *id) {
            t.pos = center + radius * egui::vec2(a.cos(), a.sin());
        }
    }
}

/// Place ids in a centered row-major grid: cols = ceil(√n), cell size dx×dy.
fn place_grid(ids: &[u64], center: egui::Pos2, dx: f32, dy: f32, things: &mut [Thing]) {
    let n = ids.len().max(1);
    let cols = (n as f32).sqrt().ceil().max(1.0);
    let rows = (n as f32 / cols).ceil();
    for (i, id) in ids.iter().enumerate() {
        let col = (i % cols as usize) as f32;
        let row = (i / cols as usize) as f32;
        let off = egui::vec2((col - (cols - 1.0) / 2.0) * dx, (row - (rows - 1.0) / 2.0) * dy);
        if let Some(t) = things.iter_mut().find(|t| t.id == *id) {
            t.pos = center + off;
        }
    }
}

/// Arrange `things` in `lens`'s spatial idiom — the kernel is untouched, only positions move.
/// Klir: one set T as a tidy grid. Bunge: components clustered, environment pushed outside.
/// Mobus: components on an inner ring, environment on an outer ring. Deterministic (sorted by id).
fn layout(lens: Lens, things: &mut [Thing], center: egui::Pos2) {
    let mut all: Vec<u64> = things.iter().map(|t| t.id).collect();
    let mut comps: Vec<u64> = things.iter().filter(|t| t.role == Role::Component).map(|t| t.id).collect();
    let mut envs: Vec<u64> = things.iter().filter(|t| t.role == Role::Environment).map(|t| t.id).collect();
    all.sort_unstable();
    comps.sort_unstable();
    envs.sort_unstable();
    match lens {
        Lens::Klir => place_grid(&all, center, 120.0, 104.0, things),
        Lens::Bunge => {
            place_grid(&comps, center, 104.0, 100.0, things);
            let half = (comps.len().max(1) as f32).sqrt().ceil() * 104.0 / 2.0;
            place_ring(&envs, center, half + 150.0, things);
        }
        Lens::Mobus => {
            place_ring(&comps, center, 150.0, things);
            place_ring(&envs, center, 320.0, things);
        }
    }
}

/// Distill the spec: subsystems→Component, sources/sinks→Environment, internal/external flows→
/// directed bonds (Kind from substance). External flows are routed via the routing_table. Drops the
/// Mobus-only extras (interfaces, processors, usability) — neutrality lives in the kernel, not the spec.
fn model_from_spec(spec: &serde_json::Value) -> (Vec<Thing>, Vec<Relation>, u64) {
    use std::collections::HashMap;
    let mut things: Vec<Thing> = Vec::new();
    let mut map: HashMap<String, u64> = HashMap::new();
    let mut next: u64 = 1;
    let empty = vec![];

    // Components first (so a name shared with a source/sink interns as Component).
    // A subsystem may declare its Mobus `primitive` (e.g. "Splitting") — the
    // generator stamps it so a generated model can be RUN without a manual
    // palette pass (needed for any computed-dynamics model, e.g. rung-2
    // allocation). Absent = None, exactly as before.
    for ss in spec.get("subsystems").and_then(|x| x.as_array()).unwrap_or(&empty) {
        let n = str_at(ss, "name");
        if !n.is_empty() {
            let id = intern(n, Role::Component, &mut things, &mut map, &mut next);
            if let Some(prim) = ss
                .get("primitive")
                .and_then(|v| v.as_str())
                .and_then(|s| serde_json::from_value::<ProcessPrimitive>(serde_json::Value::String(s.to_string())).ok())
            {
                if let Some(t) = things.iter_mut().find(|t| t.id == id) {
                    t.primitive = Some(prim);
                }
            }
        }
    }
    for key in ["sources", "sinks"] {
        for e in spec.get(key).and_then(|x| x.as_array()).unwrap_or(&empty) {
            let n = str_at(e, "name");
            if !n.is_empty() { intern(n, Role::Environment, &mut things, &mut map, &mut next); }
        }
    }

    // routing_table: interface -> (connected_to env, target_subsystem, type)
    let mut routes: HashMap<String, (String, String, String)> = HashMap::new();
    for rt in spec.get("routing_table").and_then(|x| x.as_array()).unwrap_or(&empty) {
        routes.insert(
            str_at(rt, "interface").to_string(),
            (str_at(rt, "connected_to").to_string(), str_at(rt, "target_subsystem").to_string(), str_at(rt, "type").to_string()),
        );
    }

    let mut relations: Vec<Relation> = Vec::new();
    let mut rid: u64 = 1;
    // internal flows: subsystem -> subsystem
    for f in spec.get("internal_flows").and_then(|x| x.as_array()).unwrap_or(&empty) {
        let (Some(&a), Some(&b)) = (map.get(str_at(f, "source")), map.get(str_at(f, "sink"))) else { continue; };
        relations.push(Relation { id: rid, a, b, name: str_at(f, "name").to_string(), is_bond: true, kind: substance_type(f) });
        rid += 1;
    }
    // external flows: routed env <-> subsystem, directed by Import/Export
    for f in spec.get("external_flows").and_then(|x| x.as_array()).unwrap_or(&empty) {
        let Some((env, sub, ty)) = routes.get(str_at(f, "interface")) else { continue; };
        let (Some(&e), Some(&s)) = (map.get(env), map.get(sub)) else { continue; };
        let (a, b) = if ty.eq_ignore_ascii_case("export") { (s, e) } else { (e, s) };
        relations.push(Relation { id: rid, a, b, name: str_at(f, "name").to_string(), is_bond: true, kind: substance_type(f) });
        rid += 1;
    }

    // Neutral default layout; the GUI re-idioms to the active lens on import (apply_spec).
    layout(Lens::Bunge, &mut things, LAYOUT_CENTER);

    (things, relations, next)
}

// ── The bert-core seam: project the canvas kernel into a WorldModel ──

/// Canvas connection kind → Mobus substance. Field has no Mobus peer (Energy/
/// Material/Message), so it lands on Energy; Unspecified defaults the same way.
/// Substance never changes a systemhood verdict — it is carried for a faithful
/// export, not for `validate_mode`.
fn kind_to_substance(k: Kind) -> SubstanceType {
    match k {
        Kind::Matter => SubstanceType::Material,
        Kind::Informational => SubstanceType::Message,
        Kind::Energy | Kind::Field | Kind::Unspecified => SubstanceType::Energy,
    }
}

fn info(id: Id, level: i32, name: &str) -> Info {
    Info {
        id,
        level,
        name: name.to_string(),
        description: String::new(),
    }
}

/// Project the canvas kernel into a bert-core [`WorldModel`], stamping `mode`
/// with the authored rung so it is the same object the viewer reads and
/// `validate_mode` / `validate_operational` gate.
///
/// Mapping (per `docs/canvas-architecture.md` §convergence): each Component
/// thing is a level-1 `Subsystem` under one root `System` (its `pos` becomes the
/// `Transform2d`); each Environment thing referenced by a bond becomes an
/// environment `Source` (if it originates a bond) or `Sink`; each **bond**
/// relation becomes an `Interaction`.
///
/// Two canvas distinctions have no home in bert-core yet and are dropped here,
/// by design rather than re-implemented shell-side (TODO: file a bert-core issue
/// for a bond-vs-mere-aware model — the middle spec of `docs/canvas-architecture.md`):
/// - **B̄ (mere relations, `is_bond == false`)** carry a relation but not
///   systemhood; bert-core has only one edge type and counts every interaction
///   as a bond, so emitting them would falsely license Structural. They are
///   omitted — the Structural verdict stays faithful, at the cost of Core dep
///   completeness (invisible: no UI verdict reads it).
/// - **Connection kind graphs and Klir neutrality** are not encoded; the flow
///   carries a substance type only.
fn to_world_model(things: &[Thing], relations: &[Relation], lens: Lens) -> WorldModel {
    to_world_model_with(things, relations, lens, &ModelParams::default())
}

/// Endpoint order for a birthed environment bond: normally component→env (a
/// Sink — the default rim-drag-to-empty gesture); `source` reverses it to
/// env→component. Same origination convention `to_world_model` reads above
/// to classify an environment thing as Source vs Sink.
fn env_bond_endpoints(component: u64, env: u64, source: bool) -> (u64, u64) {
    if source { (env, component) } else { (component, env) }
}

/// The projection, supplied with imported quantitative parameters (the CSV tether,
/// #13). `params` injects a flow's imported amount, a component's imported initial
/// storage, and a component's imported transfer parameter; where a slot is absent
/// the projection falls back to its old default (amount = `ONE`, no storage, no
/// cognitive params) — so imported reality is a floor over the defaults, never a
/// separate code path. `to_world_model` is exactly this with empty params.
fn to_world_model_with(
    things: &[Thing],
    relations: &[Relation],
    lens: Lens,
    params: &ModelParams,
) -> WorldModel {
    use std::collections::HashMap;

    let env_id = Id { ty: IdType::Environment, indices: vec![-1] };
    let root_id = Id { ty: IdType::System, indices: vec![0] };

    // Only bonds project to interactions; mere relations (B̄) are not systemhood
    // edges and bert-core cannot represent them (see the doc comment).
    let bonds: Vec<&Relation> = relations.iter().filter(|r| r.is_bond).collect();

    // An Environment thing is included only if a bond touches it, and is a Source
    // when it originates one (appears as `a`), else a Sink. This guarantees every
    // projected external entity is referenced in the matching direction — no
    // orphan-source/sink errors, so the projection is always a clean Core model.
    let originates: std::collections::HashSet<u64> = bonds.iter().map(|r| r.a).collect();
    let touched: std::collections::HashSet<u64> =
        bonds.iter().flat_map(|r| [r.a, r.b]).collect();

    let mut id_map: HashMap<u64, Id> = HashMap::new();
    let mut systems: Vec<System> = Vec::new();
    let mut sources: Vec<ExternalEntity> = Vec::new();
    let mut sinks: Vec<ExternalEntity> = Vec::new();

    // Root system of interest: the container every authored component sits inside.
    systems.push(new_system(
        root_id.clone(),
        0,
        "System",
        env_id.clone(),
        None,
        None,
        None,
        None,
    ));

    let mut comp_idx: i64 = 0;
    let mut env_idx: i64 = 0;
    for t in things {
        match t.role {
            Role::Component => {
                let id = Id { ty: IdType::Subsystem, indices: vec![0, comp_idx] };
                comp_idx += 1;
                systems.push(new_system(
                    id.clone(),
                    1,
                    &t.name,
                    root_id.clone(),
                    Some(t.pos),
                    t.primitive,
                    params.stock_initial.get(&t.id).copied(),
                    params.component_param.get(&t.id).cloned(),
                ));
                id_map.insert(t.id, id);
            }
            Role::Environment => {
                if !touched.contains(&t.id) {
                    continue; // isolated env dot: nothing to say, and a source/sink
                              // with no flow would be an orphan error
                }
                let is_source = originates.contains(&t.id);
                let ty = if is_source { IdType::Source } else { IdType::Sink };
                let id = Id { ty, indices: vec![-1, env_idx] };
                env_idx += 1;
                let ext = ExternalEntity {
                    info: info(id.clone(), -1, &t.name),
                    ty: if is_source {
                        ExternalEntityType::Source
                    } else {
                        ExternalEntityType::Sink
                    },
                    transform: Some(transform_of(t.pos)),
                    equivalence: String::new(),
                    model: String::new(),
                    is_same_as_id: None,
                };
                if is_source {
                    sources.push(ext);
                } else {
                    sinks.push(ext);
                }
                id_map.insert(t.id, id);
            }
        }
    }

    let mut interactions: Vec<Interaction> = Vec::new();
    for (k, r) in bonds.iter().enumerate() {
        let (Some(src), Some(snk)) = (id_map.get(&r.a), id_map.get(&r.b)) else {
            continue;
        };
        interactions.push(Interaction {
            info: info(
                Id { ty: IdType::Flow, indices: vec![k as i64] },
                0,
                &r.name,
            ),
            substance: Substance {
                sub_type: String::new(),
                ty: kind_to_substance(r.kind),
            },
            ty: InteractionType::Flow,
            usability: InteractionUsability::Resource,
            source: src.clone(),
            source_interface: None,
            sink: snk.clone(),
            sink_interface: None,
            // The imported flow magnitude (#13, tether-as-supply); `ONE` is the
            // fallback when no CSV column was mapped to this flow, not a ceiling.
            amount: params
                .flow_amount
                .get(&r.id)
                .and_then(|v| bert_core::rust_decimal::Decimal::from_f64_retain(*v))
                .unwrap_or(bert_core::rust_decimal::Decimal::ONE),
            unit: String::new(),
            // Series forcing (#16): a forced flow carries its observed series as
            // a `series` parameter (comma-joined), read at the seam exactly as
            // `conductance` is. The scalar `amount` above stays as the horizon
            // fallback. Unforced flows carry no parameters — byte-for-byte the
            // old projection.
            parameters: {
                let mut ps = Vec::new();
                if let Some(series) = params.flow_series.get(&r.id) {
                    ps.push(bert_core::Parameter {
                        name: "series".to_string(),
                        value: series.iter().map(|v| v.to_string()).collect::<Vec<_>>().join(","),
                        ..Default::default()
                    });
                }
                // Multi-timescale (rung 3): a slow channel's Δt stride rides as a
                // `dt_stride` parameter, read at the seam like `series`.
                if let Some(&n) = params.flow_stride.get(&r.id) {
                    ps.push(bert_core::Parameter {
                        name: "dt_stride".to_string(),
                        value: n.to_string(),
                        ..Default::default()
                    });
                }
                ps
            },
            smart_parameters: vec![],
            endpoint_offset: None,
        });
    }

    WorldModel {
        version: CURRENT_FILE_VERSION,
        mode: Some(lens.mode()),
        environment: Environment {
            info: info(env_id, -1, "Environment"),
            sources,
            sinks,
        },
        systems,
        interactions,
        hidden_entities: vec![],
    }
}

fn transform_of(pos: egui::Pos2) -> Transform2d {
    Transform2d {
        translation: bert_core::Vec2::new(pos.x, pos.y),
        rotation: 0.0,
    }
}

/// A default-populated `System`; `pos` (when a component) seeds its `Transform2d`.
/// A stamped `primitive` becomes the component's `AgentModel` (one Mobus work
/// process) with the `Agent` archetype — the mapping the Operational rung reads
/// (bert#108). `None` leaves `agent`/`archetype` unset, exactly as before.
#[allow(clippy::too_many_arguments)]
fn new_system(
    id: Id,
    level: i32,
    name: &str,
    parent: Id,
    pos: Option<egui::Pos2>,
    primitive: Option<ProcessPrimitive>,
    initial_storage: Option<f64>,
    param: Option<(String, f64)>,
) -> System {
    let boundary_id = Id { ty: IdType::Boundary, indices: id.indices.clone() };
    System {
        info: info(id, level, name),
        sources: vec![],
        sinks: vec![],
        parent,
        complexity: Complexity::Atomic,
        boundary: Boundary {
            info: info(boundary_id, level, ""),
            porosity: 0.0,
            perceptive_fuzziness: 0.0,
            interfaces: vec![],
            parent_interface: None,
        },
        radius: RADIUS,
        transform: pos.map(transform_of),
        equivalence: String::new(),
        history: String::new(),
        transformation: String::new(),
        member_autonomy: 1.0,
        time_constant: String::new(),
        archetype: primitive.map(|_| HcgsArchetype::Agent),
        // A stamped primitive becomes the component's AgentModel. Imported
        // parameters (#13) are folded in: an initial stock seeds `initial_state`
        // (the storage the Operational projection reads), a transfer parameter
        // seeds a `cognitive_params` entry keyed by its source column. Both are
        // absent for a freshly authored component, leaving the identity default —
        // which is why the run's identity-default disclosure flips honestly the
        // moment a component carries imported data.
        agent: primitive.map(|p| {
            let mut agent = AgentModel { primitive: Some(p), ..Default::default() };
            if let Some(storage) = initial_storage {
                agent
                    .initial_state
                    .insert("storage".to_string(), serde_json::json!(storage));
            }
            if let Some((name, value)) = param {
                agent.cognitive_params.insert(name, value);
            }
            agent
        }),
    }
}

fn mode_label(mode: Mode) -> &'static str {
    match mode {
        Mode::Core => "Core (Klir)",
        Mode::Structural => "Structural (Bunge)",
        Mode::Operational => "Operational (Mobus)",
        Mode::Full => "Full",
    }
}

/// The small two-letter primitive badge, as an inline pill. `inverted` swaps to a
/// light fill (for a row already tinted the primitive's colour). Shared by the
/// palette legend; the canvas draws its own with the painter.
fn badge(ui: &mut egui::Ui, code: &str, color: egui::Color32, inverted: bool) {
    let (fill, text) = if inverted {
        (theme::SURFACE, color)
    } else {
        (color, theme::SURFACE)
    };
    egui::Frame::default()
        .fill(fill)
        .corner_radius(4)
        .inner_margin(egui::Margin::symmetric(5, 2))
        .show(ui, |ui| {
            ui.label(
                egui::RichText::new(code)
                    .small()
                    .strong()
                    .monospace()
                    .color(text),
            );
        });
}

/// A small rounded status chip — a semantic color on a faint tint of itself.
/// The run panel's at-a-glance conservation / behavior readout.
#[cfg(not(target_arch = "wasm32"))]
fn chip(ui: &mut egui::Ui, text: &str, color: egui::Color32) {
    let bg = egui::Color32::from_rgba_unmultiplied(color.r(), color.g(), color.b(), 28);
    egui::Frame::default()
        .fill(bg)
        .corner_radius(10)
        .inner_margin(egui::Margin::symmetric(9, 3))
        .show(ui, |ui| {
            ui.label(egui::RichText::new(text).small().color(color));
        });
}

/// One red row: a marker, the error's `reason`, and its `hint` beneath — all
/// verbatim from bert-core, no shell-authored copy.
fn audit_error_row(ui: &mut egui::Ui, mark: &str, color: egui::Color32, e: &OperationalError) {
    ui.horizontal(|ui| {
        ui.label(egui::RichText::new(mark).color(color));
        ui.label(egui::RichText::new(&e.reason).color(theme::INK));
    });
    if let Some(hint) = &e.hint {
        ui.horizontal(|ui| {
            ui.add_space(18.0);
            ui.label(egui::RichText::new(format!("↳ {hint}")).small().color(theme::INK_SOFT));
        });
    }
}

/// A component's error, indented under its red name row: reason then hint,
/// both quoted from bert-core.
fn audit_error_detail(ui: &mut egui::Ui, e: &OperationalError) {
    ui.horizontal(|ui| {
        ui.add_space(18.0);
        ui.label(egui::RichText::new(&e.reason).small().color(theme::INK_SOFT));
    });
    if let Some(hint) = &e.hint {
        ui.horizontal(|ui| {
            ui.add_space(30.0);
            ui.label(egui::RichText::new(format!("↳ {hint}")).small().color(theme::INK_FAINT));
        });
    }
}

/// If `e` is an "endpoint does not resolve" flow error whose failing endpoint is
/// a projected component, return that component's index in `comp_ids`. Used to
/// demote the error into the component's row (it derives from that component
/// having no agent model). Returns `None` for any other error, or when the
/// endpoint is a terminal / not a canvas component.
fn derivative_endpoint_component(
    e: &OperationalError,
    wm: &WorldModel,
    comp_ids: &[Id],
) -> Option<usize> {
    let k: usize = e
        .location
        .strip_prefix("interactions[")?
        .strip_suffix(']')?
        .parse()
        .ok()?;
    // The reason names the failing end verbatim ("source"/"sink does not resolve").
    let endpoint = if e.reason.contains("source does not resolve") {
        &wm.interactions.get(k)?.source
    } else if e.reason.contains("sink does not resolve") {
        &wm.interactions.get(k)?.sink
    } else {
        return None;
    };
    comp_ids.iter().position(|id| id == endpoint)
}

// ── Arc 4.1: read-only consistency audit ─────────────────────────────────
//
// The audit is bert-core's verdict, rendered — never the shell's. It projects
// the live canvas via `to_world_model` with the ACTIVE lens's mode stamp and
// asks `validate_operational` (the same predicate compose consumes). Every red
// row names the offending bond/flow/component and quotes bert-core's own reason
// and hint verbatim; the shell invents no copy.

/// One component's line in the audit: the projected work process (a level-1
/// system) and every operational error bert-core raised against it.
#[derive(Debug)]
struct ComponentAudit {
    name: String,
    errors: Vec<OperationalError>,
    /// Count of flow errors folded into this row: flows whose endpoint failed to
    /// resolve *because* this component carries no agent model. Derivative of the
    /// component's own row, so they are demoted here instead of standing alone.
    blocked_flows: usize,
}

/// An environment terminal the projection kept: a Source or Sink a flow crosses.
/// Informational, never an error — it exists so every bonded env node on the
/// canvas has exactly one panel line.
#[derive(Debug)]
struct TerminalLine {
    name: String,
    is_source: bool,
}

/// The rendered form of one `validate_operational` call: the mode-gate headline,
/// per-component rows, flow-level errors, and a clear/total tally. Purely derived
/// from the canvas — building one mutates nothing.
struct AuditReport {
    mode: Mode,
    /// The representational refusal (`location == "mode"`), if the authored rung
    /// is Core/Klir or Structural/Bunge. This is the headline for those lenses.
    mode_error: Option<OperationalError>,
    components: Vec<ComponentAudit>,
    flow_errors: Vec<OperationalError>,
    /// Anything not attributable to the mode gate, a component, or a flow.
    other_errors: Vec<OperationalError>,
    /// Environment Sources/Sinks the projection kept — one line each so bonded
    /// env nodes are represented, not silently absent. Informational.
    terminals: Vec<TerminalLine>,
    /// Canvas things the executable projection dropped: `(name, reason)`. Today
    /// this is unbonded environment things, which carry no flow. Disclosure, so
    /// no canvas node vanishes without a word.
    unprojected: Vec<(String, String)>,
    clear: usize,
    total: usize,
}

impl AuditReport {
    fn fully_green(&self) -> bool {
        self.mode_error.is_none()
            && self.components.iter().all(|c| c.errors.is_empty())
            && self.flow_errors.is_empty()
            && self.other_errors.is_empty()
    }
}

impl CanvasApp {
    /// Run the Arc 4.1 consistency audit against the live canvas, seen through
    /// `lens`. Read-only: it borrows `&self`, projects a fresh `WorldModel`, and
    /// routes the verdict through `bert_core::operational::validate_operational`.
    /// No canvas state is touched — the type signature is the guarantee.
    fn audit(&self, lens: Lens) -> AuditReport {
        let wm = self.world_model(lens);

        // The projected level-1 work processes, in projection order — the rows the
        // panel shows green/red. (Root sits at level 0 and is not a component.)
        let mut components: Vec<ComponentAudit> = wm
            .systems
            .iter()
            .filter(|s| s.info.level == 1)
            .map(|s| ComponentAudit {
                name: s.info.name.clone(),
                errors: vec![],
                blocked_flows: 0,
            })
            .collect();
        // The location string each component answers to (`systems[i]` and the
        // isolated-component form `process "name"`), kept parallel to `components`.
        let comp_locs: Vec<(String, String)> = wm
            .systems
            .iter()
            .enumerate()
            .filter(|(_, s)| s.info.level == 1)
            .map(|(i, s)| (format!("systems[{i}]"), format!("process \"{}\"", s.info.name)))
            .collect();
        // The projected id of each component, kept parallel to `components`, so a
        // flow's unresolved endpoint can be traced back to the row it derives from.
        let comp_ids: Vec<Id> = wm
            .systems
            .iter()
            .filter(|s| s.info.level == 1)
            .map(|s| s.info.id.clone())
            .collect();

        let mut mode_error = None;
        let mut flow_errors = Vec::new();
        let mut other_errors = Vec::new();

        if let Err(errors) = validate_operational(&wm) {
            for e in errors {
                if e.location == "mode" {
                    mode_error = Some(e);
                } else if let Some(idx) = comp_locs
                    .iter()
                    .position(|(sys, proc)| e.location == *sys || e.location == *proc)
                {
                    components[idx].errors.push(e);
                } else if e.location.starts_with("interactions[") {
                    flow_errors.push(e);
                } else {
                    other_errors.push(e);
                }
            }
        }

        // Cascade dedupe: an "endpoint does not resolve" flow error is derivative
        // when that endpoint is a component already carrying its own error row
        // (e.g. no agent model). Fold it into that component's row as a blocked-
        // flow tally instead of a standalone FLOWS entry, so each root cause is
        // counted once. Genuinely independent flow errors — endpoint not a canvas
        // component, or a direction/interface/conductance fault — stay as-is.
        flow_errors.retain(|e| {
            let Some(idx) = derivative_endpoint_component(e, &wm, &comp_ids) else {
                return true; // not an endpoint-resolution error, or endpoint isn't a component
            };
            if components[idx].errors.is_empty() {
                return true; // the component is clean — the flow fault is genuine
            }
            components[idx].blocked_flows += 1;
            false
        });

        // Environment terminals the projection kept: one line per bonded env node,
        // so it is represented rather than silently absent.
        let terminals: Vec<TerminalLine> = wm
            .environment
            .sources
            .iter()
            .map(|e| TerminalLine { name: e.info.name.clone(), is_source: true })
            .chain(
                wm.environment
                    .sinks
                    .iter()
                    .map(|e| TerminalLine { name: e.info.name.clone(), is_source: false }),
            )
            .collect();

        // Canvas things the projection dropped. Today: environment things no bond
        // touches (they carry no flow, so `to_world_model` skips them). Everything
        // else on the canvas is a component row or a terminal line above.
        let touched: std::collections::HashSet<u64> = self
            .relations
            .iter()
            .filter(|r| r.is_bond)
            .flat_map(|r| [r.a, r.b])
            .collect();
        let unprojected: Vec<(String, String)> = self
            .things
            .iter()
            .filter(|t| t.role == Role::Environment && !touched.contains(&t.id))
            .map(|t| {
                let name = if t.name.trim().is_empty() { "·" } else { &t.name };
                (
                    name.to_string(),
                    format!(
                        "{name} (environment, no bond) — carries no flow, dropped from \
                         the executable projection"
                    ),
                )
            })
            .collect();

        // Tally: one check for the mode gate, one per component, one per genuine
        // (non-derivative) flow error. Terminals and unprojected disclosures are
        // informational, not checks. Honest partial progress when green is
        // unreachable (until 4.2 lands the component → work-process mapping, #108).
        let total = 1 + components.len() + flow_errors.len();
        let clear = usize::from(mode_error.is_none())
            + components.iter().filter(|c| c.errors.is_empty()).count();

        AuditReport {
            mode: wm.mode(),
            mode_error,
            components,
            flow_errors,
            other_errors,
            terminals,
            unprojected,
            clear,
            total,
        }
    }

    /// The dismissible Arc 4.1 audit panel. Shown only while `show_audit`; the
    /// window's own ✕ dismisses it to nothing (never ambient). Renders the report
    /// from `audit` — mode headline, per-component green/red, flows — quoting
    /// bert-core's reasons and hints verbatim.
    fn audit_panel(&mut self, ctx: &egui::Context, lens: Lens) {
        if !self.show_audit {
            return;
        }
        let report = self.audit(lens);
        let mut open = true;
        egui::Window::new(egui::RichText::new("Consistency check").color(theme::INK))
            .open(&mut open)
            .resizable(true)
            .default_width(380.0)
            .default_pos(egui::pos2(640.0, 96.0))
            .show(ctx, |ui| {
                let (summary, summary_color) = if report.fully_green() {
                    ("all checks clear".to_string(), theme::OK)
                } else {
                    (
                        format!("{} of {} checks clear", report.clear, report.total),
                        theme::WARN,
                    )
                };
                ui.horizontal(|ui| {
                    ui.label(
                        egui::RichText::new(format!("Authored as {}", lens.name()))
                            .small()
                            .color(lens.color()),
                    );
                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                        ui.label(egui::RichText::new(summary).strong().color(summary_color));
                    });
                });

                // Shell-side framing (not a verdict): the "no agent model" reds are
                // the known pre-4.2 state, not authoring mistakes. bert-core's reason
                // and hint copy stays verbatim below — this only sets expectations.
                let expected_reds = report
                    .components
                    .iter()
                    .any(|c| c.errors.iter().any(|e| e.reason.contains("no agent model")));
                if expected_reds {
                    ui.add_space(2.0);
                    ui.label(
                        egui::RichText::new(
                            "Red “no agent model” rows are the expected state until the \
                             component → work-process mapping lands (4.2).",
                        )
                        .small()
                        .italics()
                        .color(theme::INK_FAINT),
                    );
                }

                ui.add_space(4.0);
                ui.separator();
                ui.add_space(6.0);

                // Headline: the mode gate. A representational rung (Klir/Bunge) is
                // refused here — that refusal IS the result, not a defect to fix.
                if let Some(e) = &report.mode_error {
                    ui.label(egui::RichText::new("MODE GATE").small().color(theme::INK_FAINT));
                    audit_error_row(ui, "✕", theme::ACCENT, e);
                    ui.add_space(4.0);
                    ui.label(
                        egui::RichText::new(
                            "A representational rung commits to no flow semantics — there \
                             is nothing to run. Author as Mobus to reach the Operational gate.",
                        )
                        .small()
                        .italics()
                        .color(theme::INK_SOFT),
                    );
                } else {
                    ui.horizontal(|ui| {
                        ui.label(egui::RichText::new("✓").strong().color(theme::OK));
                        ui.label(
                            egui::RichText::new(format!(
                                "Mode gate clear — {} rung is executable in principle",
                                mode_label(report.mode)
                            ))
                            .color(theme::INK),
                        );
                    });
                }
                ui.add_space(10.0);

                // Per-component rows: green when no operational error names it, red
                // with bert-core's verbatim reason + hint otherwise.
                if !report.components.is_empty() {
                    ui.label(egui::RichText::new("COMPONENTS").small().color(theme::INK_FAINT));
                    ui.add_space(2.0);
                    for c in &report.components {
                        let name = if c.name.trim().is_empty() { "·" } else { &c.name };
                        if c.errors.is_empty() {
                            ui.horizontal(|ui| {
                                ui.label(egui::RichText::new("✓").color(theme::OK));
                                ui.label(egui::RichText::new(name).color(theme::INK));
                            });
                        } else {
                            ui.horizontal(|ui| {
                                ui.label(egui::RichText::new("✕").color(theme::ACCENT));
                                ui.label(egui::RichText::new(name).strong().color(theme::INK));
                            });
                            for e in &c.errors {
                                audit_error_detail(ui, e);
                            }
                            // Derivative flow faults folded in (see cascade dedupe):
                            // this component blocks the flows its unresolved endpoint
                            // sits on. Shown here, not as standalone FLOWS entries.
                            if c.blocked_flows > 0 {
                                ui.horizontal(|ui| {
                                    ui.add_space(18.0);
                                    ui.label(
                                        egui::RichText::new(format!(
                                            "↳ blocks {} flow{}",
                                            c.blocked_flows,
                                            if c.blocked_flows == 1 { "" } else { "s" }
                                        ))
                                        .small()
                                        .color(theme::INK_FAINT),
                                    );
                                });
                            }
                        }
                    }
                    ui.add_space(8.0);
                }

                // Environment terminals the projection kept — informational, neutral
                // (never red): each bonded env node gets its line so the panel
                // accounts for every canvas node exactly once.
                if !report.terminals.is_empty() {
                    ui.label(
                        egui::RichText::new("ENVIRONMENT TERMINALS")
                            .small()
                            .color(theme::INK_FAINT),
                    );
                    ui.add_space(2.0);
                    for t in &report.terminals {
                        let name = if t.name.trim().is_empty() { "·" } else { &t.name };
                        ui.horizontal(|ui| {
                            ui.label(egui::RichText::new("◇").color(theme::INK_SOFT));
                            ui.label(egui::RichText::new(name).color(theme::INK));
                            ui.label(
                                egui::RichText::new(if t.is_source { "source" } else { "sink" })
                                    .small()
                                    .color(theme::INK_FAINT),
                            );
                        });
                    }
                    ui.add_space(8.0);
                }

                // Flow-level refusals (bad boundary crossings, unresolved endpoints,
                // missing conductance), each already naming its flow in the reason.
                if !report.flow_errors.is_empty() {
                    ui.label(egui::RichText::new("FLOWS").small().color(theme::INK_FAINT));
                    ui.add_space(2.0);
                    for e in &report.flow_errors {
                        audit_error_row(ui, "✕", theme::ACCENT, e);
                    }
                    ui.add_space(8.0);
                }

                // Canvas nodes the executable projection dropped — a disclosure, not
                // an error: neutral marker, bert-lenses' own reason (bert-core never
                // saw these, so there is no verdict to quote).
                if !report.unprojected.is_empty() {
                    ui.label(
                        egui::RichText::new("NOT IN PROJECTION")
                            .small()
                            .color(theme::INK_FAINT),
                    );
                    ui.add_space(2.0);
                    for (_name, reason) in &report.unprojected {
                        ui.horizontal(|ui| {
                            ui.label(egui::RichText::new("–").color(theme::INK_FAINT));
                            ui.label(egui::RichText::new(reason).color(theme::INK_SOFT));
                        });
                    }
                    ui.add_space(8.0);
                }

                if !report.other_errors.is_empty() {
                    ui.label(egui::RichText::new("OTHER").small().color(theme::INK_FAINT));
                    ui.add_space(2.0);
                    for e in &report.other_errors {
                        audit_error_row(ui, "✕", theme::ACCENT, e);
                    }
                    ui.add_space(8.0);
                }

                ui.separator();
                ui.add_space(4.0);
                ui.label(
                    egui::RichText::new(
                        "Read-only — this panel runs bert-core's operational check and \
                         changes nothing on the canvas.",
                    )
                    .small()
                    .color(theme::INK_FAINT),
                );
            });
        // The window's ✕ flipped `open`; mirror it back so the panel dismisses.
        self.show_audit = open;
    }

    /// The Mobus work-process palette (Arc 4.2 mapping). A floating, dismissible
    /// panel — the vocabulary made a first-class surface on the canvas, on demand
    /// and Mobus-only (the God-tool guard: it stamps mappings, it is not a control
    /// surface). Pick a primitive to load the stamp; then click components to
    /// apply it. Erase clears. The loaded stamp is highlighted; each row carries
    /// its badge code, verbatim name, and one-phrase meaning so the code → name
    /// key stays on screen while stamping.
    fn palette_panel(&mut self, ctx: &egui::Context) {
        if !self.show_palette {
            self.stamp = None; // unloaded whenever the palette isn't showing
            return;
        }
        let mut open = true;
        egui::Window::new(egui::RichText::new("Work-process palette").color(theme::INK))
            .open(&mut open)
            .resizable(false)
            .default_width(266.0)
            .default_pos(egui::pos2(96.0, 132.0))
            .show(ctx, |ui| {
                ui.label(
                    egui::RichText::new("Mobus atomic work processes")
                        .small()
                        .color(theme::MOBUS),
                );
                ui.label(
                    egui::RichText::new(
                        "Pick one, then click a component to stamp what it does.",
                    )
                    .small()
                    .italics()
                    .color(theme::INK_FAINT),
                );
                ui.add_space(6.0);
                ui.separator();
                ui.add_space(4.0);

                for p in PRIMITIVES {
                    let loaded = self.stamp == Some(Stamp::Prim(p));
                    let (bg, fg) = if loaded {
                        (prim_color(p), theme::SURFACE)
                    } else {
                        (theme::SURFACE, theme::INK)
                    };
                    let row = egui::Frame::default()
                        .fill(bg)
                        .stroke(egui::Stroke::new(1.0, if loaded { prim_color(p) } else { theme::LINE }))
                        .inner_margin(egui::Margin::symmetric(7, 5))
                        .corner_radius(6);
                    let resp = row
                        .show(ui, |ui| {
                            ui.horizontal(|ui| {
                                badge(ui, prim_code(p), prim_color(p), loaded);
                                ui.add_space(4.0);
                                ui.vertical(|ui| {
                                    ui.label(egui::RichText::new(prim_name(p)).strong().color(fg));
                                    ui.label(
                                        egui::RichText::new(prim_desc(p))
                                            .small()
                                            .color(if loaded { theme::SURFACE } else { theme::INK_SOFT }),
                                    );
                                });
                            });
                        })
                        .response
                        .interact(egui::Sense::click());
                    if resp.clicked() {
                        // Toggle: clicking the loaded primitive unloads it.
                        self.stamp = if loaded { None } else { Some(Stamp::Prim(p)) };
                    }
                    ui.add_space(3.0);
                }

                ui.add_space(4.0);
                ui.separator();
                ui.add_space(4.0);
                let erasing = self.stamp == Some(Stamp::Erase);
                let erase_label = egui::RichText::new("⌫  Erase stamp")
                    .color(if erasing { theme::ACCENT } else { theme::INK_SOFT });
                if ui
                    .selectable_label(erasing, erase_label)
                    .on_hover_text("Load the eraser, then click a stamped component to clear it")
                    .clicked()
                {
                    self.stamp = if erasing { None } else { Some(Stamp::Erase) };
                }

                ui.add_space(6.0);
                let status = match self.stamp {
                    Some(Stamp::Prim(p)) => {
                        format!("Loaded: {} — click a component", prim_name(p))
                    }
                    Some(Stamp::Erase) => "Eraser loaded — click a stamped component".to_string(),
                    None => "No stamp loaded — clicks select as usual".to_string(),
                };
                ui.label(egui::RichText::new(status).small().color(theme::INK_FAINT));
            });
        self.show_palette = open;
        if !open {
            self.stamp = None; // dismissing the panel unloads the stamp
        }
    }

    /// L2: fire an async POST to GSR /extract (local or cloud). Callback parses the spec and sends
    /// it back over a channel; the UI polls it. GSR owns the prompt + model choice — the canvas only
    /// names the system.
    fn start_generate(&mut self, ctx: &egui::Context) {
        let desc = self.gen_desc.trim().to_string();
        if desc.is_empty() || self.gen_busy {
            return;
        }
        self.gen_busy = true;
        self.gen_error = None;
        let base = if self.gen_cloud {
            "https://reasoner.halcyonic.systems"
        } else {
            "http://localhost:5010"
        };
        let body = serde_json::to_vec(&serde_json::json!({ "description": desc, "model": self.gen_model })).unwrap_or_default();
        let mut req = ehttp::Request::post(format!("{base}/extract"), body);
        req.headers.insert("Content-Type", "application/json");
        let (tx, rx) = std::sync::mpsc::channel();
        self.gen_rx = Some(rx);
        let ctx2 = ctx.clone();
        ehttp::fetch(req, move |result| {
            let parsed: Result<serde_json::Value, String> = match result {
                Ok(resp) if resp.ok => match serde_json::from_slice::<serde_json::Value>(&resp.bytes) {
                    Ok(v) => {
                        if let Some(err) = v.get("error").and_then(|e| e.as_str()) {
                            Err(err.to_string())
                        } else if let Some(spec) = v.get("spec") {
                            Ok(spec.clone())
                        } else {
                            Err("response had no spec".to_string())
                        }
                    }
                    Err(e) => Err(format!("bad JSON from server: {e}")),
                },
                Ok(resp) => Err(format!("server {}", resp.status)),
                Err(e) => Err(e),
            };
            let _ = tx.send(parsed);
            ctx2.request_repaint();
        });
    }

    fn poll_generate(&mut self) {
        let Some(rx) = self.gen_rx.take() else { return; };
        match rx.try_recv() {
            Ok(result) => {
                self.gen_busy = false;
                match result {
                    Ok(spec) => {
                        if !self.apply_spec(spec) {
                            self.gen_error = Some("the spec had nothing to model".to_string());
                        }
                    }
                    Err(e) => self.gen_error = Some(e),
                }
            }
            Err(std::sync::mpsc::TryRecvError::Empty) => self.gen_rx = Some(rx),
            Err(std::sync::mpsc::TryRecvError::Disconnected) => {
                self.gen_busy = false;
                self.gen_error = Some("request was dropped".to_string());
            }
        }
    }
}

// ── Arc 4.3: the Run surface (Shape B) ───────────────────────────────────────
//
// Run is an on-demand executable reading of the authored model — a query at the
// Operational rung, not a mode change and not a new authoring state (contract
// §1). It requires `validate_operational` to pass; a model that fails routes to
// Check consistency (R2), never a partial run. The circuit-building and the
// recorder come from bert-compose, so this is native-only (see Cargo.toml) and
// the whole feature is `cfg`-gated to match.
//
// Shape B (contract §3, ratified B7): the results live in their OWN transient
// panel with the audit panel's semantics — read-only, snapshot (refreshed only
// by an explicit re-run), dismisses to zero footprint. The canvas is never
// mutated, animated, or recolored by a run (G3); authoring is never blocked (G4).
//
// The recorded artifact is a **trace** (the observer's downstream record), never
// "H" or "memory": the 8-tuple's H slot is the authored `System.history`, which
// stays in the model and is untouched by running (grounding B1/F1). The trace is
// held in memory only and is never serialized into Save or Export (§4).

/// Default step size / horizon, prefilled the first time the prompt opens. These
/// are a prefill the user confirms, not a silent default: no run records without
/// the explicit Run gesture in the prompt (R4).
#[cfg(not(target_arch = "wasm32"))]
/// The build receipt (#30): short git sha stamped by build.rs, `+` if the tree
/// was dirty. Shown in the library panel and carried on every ledger line.
const BUILD_SHA: &str = env!("LENSES_BUILD_SHA");

/// The import's column→element translation sentences (#26): built straight off
/// the stored series (each carries its CSV column and mapped element's name), so
/// no id lookups and it works on every target. Shared by the always-visible Data
/// block and the replace-confirm window.
fn import_mapping_sentences(d: &ImportedData) -> Vec<String> {
    let mut mapped: Vec<String> = d
        .flow_series
        .values()
        .map(|s| format!("{} → flow magnitude of {}", s.column, s.element_name))
        .chain(
            d.stock_series
                .values()
                .map(|s| format!("{} → stock level of {}", s.column, s.element_name)),
        )
        .chain(
            d.param_series
                .values()
                .map(|s| format!("{} → parameter of {}", s.column, s.element_name)),
        )
        .collect();
    mapped.sort();
    mapped
}

const DEFAULT_DT: &str = "1";
#[cfg(not(target_arch = "wasm32"))]
const DEFAULT_T: &str = "30";

/// Shown when Run is invoked on a model that fails `validate_operational`: the
/// kernel's verdict channel is Check consistency, so Run routes there rather than
/// half-running (R2).
#[cfg(not(target_arch = "wasm32"))]
const RUN_ROUTING_MSG: &str =
    "This model isn't runnable yet. Fix the issues in Check consistency, then Run.";

/// Where a thing sits in the purpose reading order (SL §3.1, grounding C3): a
/// system exists to produce its outputs, so Products/Waste read first, then the
/// Resources it draws, then its internal components.
#[cfg(not(target_arch = "wasm32"))]
#[derive(Clone, Copy, PartialEq, Debug)]
enum LevelCategory {
    Product,
    Resource,
    Internal,
}

#[cfg(not(target_arch = "wasm32"))]
impl LevelCategory {
    fn order(self) -> u8 {
        match self {
            LevelCategory::Product => 0,
            LevelCategory::Resource => 1,
            LevelCategory::Internal => 2,
        }
    }
    fn header(self) -> &'static str {
        match self {
            LevelCategory::Product => "Products / waste",
            LevelCategory::Resource => "Resources",
            LevelCategory::Internal => "Internal components",
        }
    }
}

/// One thing's final-state reading: its name, its purpose category, and the level
/// it settled at (a sink's accumulated total; otherwise the circuit's level —
/// a buffer's stock, a source's rate, a process's last-tick activity).
#[cfg(not(target_arch = "wasm32"))]
#[derive(Clone)]
struct LevelRow {
    name: String,
    category: LevelCategory,
    value: f32,
}

/// The processed synthesis of one run — the terminal legibility layer (B3). The
/// summary IS the product; the raw per-thing trajectories are drill-down only.
/// Snapshot: every field is computed once at run time and never mutated after, so
/// the panel's numbers only change on an explicit re-run. `key` is the spec's
/// content hash at run time; a later structural edit moves the model's hash and
/// the panel goes stale (R3).
#[cfg(not(target_arch = "wasm32"))]
#[derive(Clone)]
struct RunResults {
    dt: f64,
    t: f64,
    ticks: usize,
    /// The conservation ledger residual at the horizon — shown, not asserted
    /// (R5; realizes the conservation SHOULD of SL spec §3.2).
    residual: f32,
    /// Components running the bare primitive with no chosen transfer characteristic
    /// (grounding C2): identity gain, no cognitive params, no seeded stock. `n of m`.
    identity_default_n: usize,
    identity_default_m: usize,
    /// Final levels in purpose order (Products/waste → Resources → internals).
    levels: Vec<LevelRow>,
    /// Per-thing trajectory for the drill-down: `(name, series over ticks)`.
    trajectories: Vec<(String, Vec<f32>)>,
    /// Per-thing EXECUTED emission per tick (the circuit's activity column), for
    /// every node regardless of kind. Distinct from `trajectories`, whose column
    /// choice varies by node kind (a buffer's trajectory is its stock) — a flow
    /// comparison needs the upstream node's emission specifically (#25).
    activities: Vec<(String, Vec<f32>)>,
    /// `OperationalSpec::content_hash` at run time — the staleness key (R3;
    /// h-element §1.4: "history is the capture of an instance of structure", so a
    /// structural edit is a new instance and this recording no longer matches).
    key: u64,
    /// The one-line summary retained as the "previous run" line on the next run (B4).
    summary_line: String,
    /// Wall-clock at run completion (#31): the receipt that THIS run fired, shown
    /// on the header so a fresh run is unmistakable from a retained snapshot.
    recorded_at: String,
}

impl RunResults {
    /// Total accumulated mass — the scale the residual is only meaningful
    /// against. A residual is alarming only relative to what flowed: at
    /// 10¹⁴-token magnitudes an absolute 6.7e7 is f32 rounding, not a leak.
    fn throughput(&self) -> f32 {
        self.levels.iter().map(|l| l.value.abs()).sum::<f32>().max(1.0)
    }

    /// The residual as a fraction of throughput — the honest, scale-free figure.
    fn residual_relative(&self) -> f32 {
        self.residual.abs() / self.throughput()
    }

    /// Conserves when the relative residual is at floating-point-noise level —
    /// a scale-free test, so a big model doesn't read as "leaking" over rounding.
    fn conserves(&self) -> bool {
        self.residual_relative() < 1e-4
    }
}

/// True when a projected component carries no author-chosen transfer characteristic
/// beyond the bare primitive (grounding C2): no cognitive params and no seeded
/// stock. Such a component is a valid minimal work process, but one whose behavior
/// the modeler did not shape — so the disclosure stays honest about how much of the
/// run is uninformative-by-construction. (The lenses authoring surface stamps only
/// the primitive KIND today, so a freshly authored model reads as fully default;
/// chosen params arrive via import/compose. `agency_capacity` is deliberately not a
/// discriminant here — it is never author-set on this surface, only the default.)
#[cfg(not(target_arch = "wasm32"))]
fn is_identity_default(p: &OperationalProcess) -> bool {
    p.cognitive_params.is_empty() && p.initial_storage.is_none()
}

/// Human-readable magnitude: `70866993938432.0 → "70.9T"`, `27.55 → "27.55"`,
/// `0.05 → "0.05"`. K/M/B/T scaling with one decimal; small values keep enough
/// precision to read. So the run panel speaks "70.9T", not a wall of digits.
fn humanize(v: f64) -> String {
    let a = v.abs();
    if a == 0.0 {
        return "0".to_string();
    }
    let sign = if v < 0.0 { "-" } else { "" };
    for (t, s) in [(1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")] {
        if a >= t {
            return format!("{sign}{:.1}{s}", a / t);
        }
    }
    if a >= 100.0 {
        format!("{sign}{a:.0}")
    } else if a >= 0.01 {
        format!("{sign}{a:.2}")
    } else {
        format!("{sign}{a:.3}")
    }
}

/// A magnitude with its declared unit appended, when one exists: `"70.9T tokens/month"`.
fn humanize_unit(v: f64, unit: &str) -> String {
    let n = humanize(v);
    if unit.trim().is_empty() {
        n
    } else {
        format!("{n} {}", unit.trim())
    }
}

/// A minimal inline sparkline for a per-thing trajectory — the drill-down's
/// "historical" view (h-element knowledge levels), drawn in the Mobus hue.
#[cfg(not(target_arch = "wasm32"))]
fn run_sparkline(ui: &mut egui::Ui, series: &[f32]) {
    let (rect, _) = ui.allocate_exact_size(egui::vec2(180.0, 28.0), egui::Sense::hover());
    if series.len() < 2 {
        return;
    }
    let (mut lo, mut hi) = (f32::INFINITY, f32::NEG_INFINITY);
    for &v in series {
        lo = lo.min(v);
        hi = hi.max(v);
    }
    let span = (hi - lo).max(1e-6);
    let n = series.len();
    let pts: Vec<egui::Pos2> = series
        .iter()
        .enumerate()
        .map(|(i, &v)| {
            let x = rect.left() + rect.width() * (i as f32 / (n - 1) as f32);
            let y = rect.bottom() - rect.height() * ((v - lo) / span);
            egui::pos2(x, y)
        })
        .collect();
    ui.painter()
        .add(egui::Shape::line(pts, egui::Stroke::new(1.4, theme::MOBUS)));
}

/// A two-series sparkline for the tether comparison (contract §3, T4): the
/// simulated trace in the Mobus hue and the actual empirical series in the accent
/// hue, on shared axes so divergence reads at a glance. Always visually distinct.
#[cfg(not(target_arch = "wasm32"))]
fn comparison_sparkline(
    ui: &mut egui::Ui,
    simulated: &[f32],
    actual: &[f32],
    baseline: Option<&[f32]>,
    size: egui::Vec2,
) {
    let (rect, _) = ui.allocate_exact_size(size, egui::Sense::hover());
    let (mut lo, mut hi) = (f32::INFINITY, f32::NEG_INFINITY);
    for &v in simulated
        .iter()
        .chain(actual.iter())
        .chain(baseline.unwrap_or(&[]).iter())
    {
        lo = lo.min(v);
        hi = hi.max(v);
    }
    if !lo.is_finite() || !hi.is_finite() {
        return;
    }
    let span = (hi - lo).max(1e-6);
    let at = |series: &[f32], i: usize| -> egui::Pos2 {
        let n = series.len().max(2);
        let x = rect.left() + rect.width() * (i as f32 / (n - 1) as f32);
        let y = rect.bottom() - rect.height() * ((series[i] - lo) / span);
        egui::pos2(x, y)
    };
    let painter = ui.painter().clone();
    // faint baseline so a flat series still reads as sitting on the floor
    painter.line_segment(
        [rect.left_bottom(), rect.right_bottom()],
        egui::Stroke::new(1.0, theme::LINE),
    );
    let plot = |series: &[f32], color: egui::Color32, dot: bool| {
        if series.len() < 2 {
            return;
        }
        let pts: Vec<egui::Pos2> = (0..series.len()).map(|i| at(series, i)).collect();
        painter.add(egui::Shape::line(pts, egui::Stroke::new(1.7, color)));
        if dot {
            painter.circle_filled(at(series, series.len() - 1), 2.3, color); // emphasized endpoint
        }
    };
    if let Some(b) = baseline {
        plot(b, theme::INK_FAINT, false); // declared assumption, drawn under, no dot
    }
    plot(simulated, theme::MOBUS, true); // executed
    plot(actual, theme::ACCENT, true); // actual
}

/// Build the ledger's summary line for a completed run — the shared shape between
/// the auto-append and the explicit full report's `summary` field (#15). The #27
/// additions (final levels, declared params, import provenance) ride along so a
/// summary line reconstructs outcome + configuration without the panel;
/// trajectories stay behind the explicit report gesture.
#[cfg(not(target_arch = "wasm32"))]
fn ledger_line(
    res: &RunResults,
    comparisons: &[tether::Comparison],
    model_name: &str,
    declared_params: Option<ledger::DeclaredParams>,
    provenance: Option<ledger::ImportProvenance>,
) -> ledger::LedgerLine {
    ledger::LedgerLine {
        timestamp: ledger::full_timestamp(),
        model_name: model_name.to_string(),
        spec_hash: format!("{:016x}", res.key),
        dt: res.dt,
        t: res.t,
        ticks: res.ticks,
        residual: res.residual,
        identity_default_n: res.identity_default_n,
        identity_default_m: res.identity_default_m,
        divergences: comparisons
            .iter()
            .map(|c| ledger::DivergenceEntry {
                element_name: c.element_name.clone(),
                kind: c.kind.to_string(),
                divergence_pct: c.divergence_pct(),
            })
            .collect(),
        levels: Some(
            res.levels
                .iter()
                .map(|r| ledger::LevelEntry {
                    name: r.name.clone(),
                    category: r.category.header().to_string(),
                    value: r.value,
                })
                .collect(),
        ),
        declared_params,
        provenance,
        build: Some(BUILD_SHA.to_string()),
    }
}

/// AUTO ledger write for every completed run (#15): appends one summary line.
/// Never blocks or crashes a run on failure — logged to stderr and ignored,
/// exactly as the issue asks.
#[cfg(not(target_arch = "wasm32"))]
fn append_run_ledger(
    res: &RunResults,
    comparisons: &[tether::Comparison],
    model_name: &str,
    declared_params: Option<ledger::DeclaredParams>,
    provenance: Option<ledger::ImportProvenance>,
) {
    // Tests drive `execute_run` too, and they must never write the user's real
    // ledger (#29: every line in a real ledger.jsonl turned out to be test
    // effluent — t=30/t=20 pairs matching the execute_run tests).
    if cfg!(test) {
        return;
    }
    let line = ledger_line(res, comparisons, model_name, declared_params, provenance);
    if let Err(e) = ledger::append_summary(&ledger::default_runs_dir(), &line) {
        eprintln!("run ledger: could not append summary line: {e}");
    }
}

impl CanvasApp {
    /// Build the run-vs-actual comparisons for the mapped elements that carry
    /// empirical H (contract §3). A stock level overlays the component's recorded
    /// trajectory against the actual stock. A flow magnitude overlays what the run
    /// EXECUTED — the upstream node's per-tick emission — against the actual
    /// observed magnitude (#25: the declared amount must never be reported as the
    /// run's behavior; a hoarding Buffering process was invisible to this panel
    /// when the sim trace was `vec![amount; ticks]`). The declared mean survives
    /// as the `baseline` trace: flat-vs-reality is still the "you assumed this was
    /// constant" teaching moment, now labeled as an assumption rather than drawn
    /// as the simulation.
    ///
    /// v1 caveat: a node's activity is its TOTAL emission per tick, so for an
    /// upstream with several outgoing flows the executed series over-reads this
    /// one flow's share. Single-outgoing (the common authored case) is exact.
    #[cfg(not(target_arch = "wasm32"))]
    fn comparisons(&self, res: &RunResults) -> Vec<tether::Comparison> {
        let Some(d) = &self.imported else {
            return vec![];
        };
        let mut out = Vec::new();
        for (tid, s) in &d.stock_series {
            let Some(thing) = self.things.iter().find(|t| t.id == *tid) else {
                continue;
            };
            let Some((_, sim)) = res.trajectories.iter().find(|(name, _)| *name == thing.name) else {
                continue;
            };
            let actual: Vec<f32> = s.present().iter().map(|v| *v as f32).collect();
            if actual.is_empty() {
                continue;
            }
            out.push(tether::Comparison {
                element_name: thing.name.clone(),
                kind: "stock",
                simulated: sim.clone(),
                actual,
                baseline: None,
                unit: s.unit.clone(),
            });
        }
        for (rid, s) in &d.flow_series {
            // A series carried as a WEIGHT (rung 2) is a control input that drives
            // a computed split — not an observable to score against reality. Its
            // units are incommensurate with the flow it governs, so comparing them
            // is meaningless; skip it (the split still runs, and conservation
            // remains the honest check).
            if s.unit.eq_ignore_ascii_case("weight") {
                continue;
            }
            let Some(r) = self.relations.iter().find(|r| r.id == *rid) else {
                continue;
            };
            let actual: Vec<f32> = s.present().iter().map(|v| *v as f32).collect();
            if actual.is_empty() {
                continue;
            }
            let amount = s.mean().unwrap_or(0.0) as f32;
            let flat = vec![amount; res.ticks.max(actual.len()).max(2)];
            // The executed series: the flow's upstream endpoint (stored a→b) read
            // from the run's activity columns by node name. Falls back to the
            // declared flat line (with no baseline, so nothing is double-drawn)
            // only if the upstream can't be resolved.
            let executed = self
                .things
                .iter()
                .find(|t| t.id == r.a)
                .and_then(|up| res.activities.iter().find(|(name, _)| *name == up.name))
                .map(|(_, series)| series.clone());
            let (sim, baseline) = match executed {
                Some(series) => (series, Some(flat)),
                None => (flat, None),
            };
            out.push(tether::Comparison {
                element_name: self.flow_label(r),
                kind: "flow",
                simulated: sim,
                actual,
                baseline,
                unit: s.unit.clone(),
            });
        }
        out.sort_by(|a, b| a.element_name.cmp(&b.element_name));
        out
    }

    /// The #27 ledger extras, read from the live import: the declared scalar
    /// supply the projection runs at (names, not ids) and the import's provenance
    /// (source file, date, column→element sentences). Both `None` with no import.
    #[cfg(not(target_arch = "wasm32"))]
    fn ledger_extras(&self) -> (Option<ledger::DeclaredParams>, Option<ledger::ImportProvenance>) {
        let Some(d) = &self.imported else {
            return (None, None);
        };
        let mut params = ledger::DeclaredParams::default();
        let mut mapped = Vec::new();
        for (rid, s) in &d.flow_series {
            let label = self
                .relations
                .iter()
                .find(|r| r.id == *rid)
                .map(|r| self.flow_label(r))
                .unwrap_or_else(|| s.element_name.clone());
            if let Some(m) = s.mean() {
                params.flow_amounts.push((label.clone(), m));
            }
            mapped.push(format!("{} → flow magnitude of {}", s.column, label));
        }
        for (tid, s) in &d.stock_series {
            let name = self
                .things
                .iter()
                .find(|t| t.id == *tid)
                .map(|t| t.name.clone())
                .unwrap_or_else(|| s.element_name.clone());
            if let Some(v) = s.first() {
                params.stock_initials.push((name.clone(), v));
            }
            mapped.push(format!("{} → stock level of {}", s.column, name));
        }
        for (tid, s) in &d.param_series {
            let name = self
                .things
                .iter()
                .find(|t| t.id == *tid)
                .map(|t| t.name.clone())
                .unwrap_or_else(|| s.element_name.clone());
            if let Some(m) = s.mean() {
                params.component_params.push((name.clone(), s.column.clone(), m));
            }
            mapped.push(format!("{} → parameter of {}", s.column, name));
        }
        mapped.sort();
        params.flow_amounts.sort_by(|a, b| a.0.cmp(&b.0));
        params.stock_initials.sort_by(|a, b| a.0.cmp(&b.0));
        params.component_params.sort_by(|a, b| a.0.cmp(&b.0));
        let prov = ledger::ImportProvenance {
            source_file: d.source_file.clone(),
            imported_at: d.imported_at.clone(),
            mapped,
            manifest_hash: None,
        };
        (Some(params), Some(prov))
    }

    /// The staleness key: the current canvas's Operational content hash, or `None`
    /// if it no longer projects. A run is stale unless this equals its recorded key.
    #[cfg(not(target_arch = "wasm32"))]
    fn current_spec_key(&self, lens: Lens) -> Option<u64> {
        let wm = self.world_model(lens);
        validate_operational(&wm).ok().map(|s| s.content_hash())
    }

    /// Invoke Run (Mobus-only). Gate first (R2): if the model fails
    /// `validate_operational`, show the routing message and clear any results —
    /// never a partial run. Otherwise open the Δt/T prompt; the run itself only
    /// fires on the prompt's explicit Run (R4).
    #[cfg(not(target_arch = "wasm32"))]
    fn begin_run(&mut self, lens: Lens) {
        let wm = self.world_model(lens);
        if validate_operational(&wm).is_err() {
            self.run_gate_msg = Some(RUN_ROUTING_MSG.to_string());
            self.run_results = None;
            self.run_prompt = false;
            self.run_panel = true;
            return;
        }
        self.run_gate_msg = None;
        if self.run_dt.is_empty() {
            self.run_dt = DEFAULT_DT.to_string();
        }
        if self.run_t.is_empty() {
            self.run_t = DEFAULT_T.to_string();
        }
        self.run_prompt = true;
    }

    /// Confirm the prompt: parse the supplied Δt/T, record a run, and surface the
    /// summary. The previous run's one line is retained beside the new one (B4).
    #[cfg(not(target_arch = "wasm32"))]
    fn execute_run(&mut self, lens: Lens) {
        let (Ok(dt), Ok(t)) = (self.run_dt.parse::<f64>(), self.run_t.parse::<f64>()) else {
            return;
        };
        if dt <= 0.0 || t <= 0.0 {
            return;
        }
        match self.run_model(lens, dt, t) {
            Some(res) => {
                // Ledger (#15): AUTO summary line on every completed run — the
                // lab notebook, distinct from Save/Export (contract §4).
                let comparisons = self.comparisons(&res);
                let model_name = self.current_model_name.clone().unwrap_or_else(|| "untitled".to_string());
                let (declared, prov) = self.ledger_extras();
                append_run_ledger(&res, &comparisons, &model_name, declared, prov);
                self.last_report_msg = None;

                if let Some(prev) = &self.run_results {
                    self.prev_run_line = Some(prev.summary_line.clone());
                }
                self.run_results = Some(res);
                self.run_gate_msg = None;
                self.run_prompt = false;
                self.run_panel = true;
            }
            // The canvas was edited to an unrunnable state between opening the
            // prompt and confirming (authoring is never blocked, G4). Route, don't
            // half-run.
            None => {
                self.run_gate_msg = Some(RUN_ROUTING_MSG.to_string());
                self.run_results = None;
                self.run_prompt = false;
                self.run_panel = true;
            }
        }
    }

    /// Build the circuit from the Operational projection, record `(T, Δt)`, and
    /// synthesize the summary. Pure: borrows `&self`, mutates nothing on the
    /// canvas (R1 — the signature is the guarantee). `None` if the model no longer
    /// projects (the caller routes to Check consistency).
    #[cfg(not(target_arch = "wasm32"))]
    fn run_model(&self, lens: Lens, dt: f64, t: f64) -> Option<RunResults> {
        let wm = self.world_model(lens);
        let spec = validate_operational(&wm).ok()?;
        let mut circuit = from_spec(&spec);
        if circuit.nodes.is_empty() {
            return None;
        }
        let run = RecordedRun::record_over(&mut circuit, &spec, dt, t);
        let ticks = run.history.len();
        let residual = run.final_balance;

        let identity_default_m = spec.processes.len();
        let identity_default_n = spec.processes.iter().filter(|p| is_identity_default(p)).count();

        // Final levels, one row per node, then ordered by purpose (stable within
        // category so declaration order is preserved).
        let mut levels: Vec<LevelRow> = (0..circuit.nodes.len())
            .map(|i| {
                let node = &circuit.nodes[i];
                let (category, value) = match node.kind {
                    NodeKind::Sink => (LevelCategory::Product, node.total),
                    NodeKind::Source => (LevelCategory::Resource, circuit.level(i)),
                    NodeKind::Process(_) => (LevelCategory::Internal, circuit.level(i)),
                };
                LevelRow { name: node.name.clone(), category, value }
            })
            .collect();
        levels.sort_by_key(|r| r.category.order());

        // Per-thing trajectory: a sink's accumulated total, a buffer's stock, else
        // last-tick activity — the column of the recorded rows that reads as its level.
        let trajectories: Vec<(String, Vec<f32>)> = circuit
            .nodes
            .iter()
            .enumerate()
            .map(|(i, node)| {
                let col = match node.kind {
                    NodeKind::Sink => 2,
                    NodeKind::Process(ProcessPrimitive::Buffering) => 1,
                    _ => 0,
                };
                let series = run
                    .history
                    .iter()
                    .map(|row| row[1 + i * 3 + col])
                    .collect();
                (node.name.clone(), series)
            })
            .collect();

        // Executed emission per tick for EVERY node (activity column, col 0) —
        // the series a flow comparison reads for its upstream endpoint (#25).
        let activities: Vec<(String, Vec<f32>)> = circuit
            .nodes
            .iter()
            .enumerate()
            .map(|(i, node)| {
                let series = run.history.iter().map(|row| row[1 + i * 3]).collect();
                (node.name.clone(), series)
            })
            .collect();

        let summary_line = format!("Δt {dt}, T {t} ({ticks} ticks) · residual {residual:.3}");
        let recorded_at = ledger::full_timestamp();

        Some(RunResults {
            dt,
            t,
            ticks,
            residual,
            identity_default_n,
            identity_default_m,
            levels,
            trajectories,
            activities,
            key: spec.content_hash(),
            summary_line,
            recorded_at,
        })
    }

    /// Write the explicit full report (#15, contract: explicit gesture for the
    /// full trajectory dump) for the given run, and record feedback for the panel.
    /// Reuses the run's own structures — trajectories, levels, comparisons — and
    /// serializes what already exists rather than computing anything new.
    #[cfg(not(target_arch = "wasm32"))]
    fn save_run_report(&mut self, res: &RunResults, comparisons: &[tether::Comparison]) {
        let model_name = self.current_model_name.clone().unwrap_or_else(|| "untitled".to_string());
        let (declared, prov) = self.ledger_extras();
        let summary = ledger_line(res, comparisons, &model_name, declared, prov);
        let report = ledger::FullReport {
            summary,
            levels: res.levels.iter().map(|r| (r.name.clone(), r.value)).collect(),
            trajectories: res.trajectories.clone(),
            comparisons: comparisons
                .iter()
                .map(|c| ledger::ComparisonSeries {
                    element_name: c.element_name.clone(),
                    kind: c.kind.to_string(),
                    simulated: c.simulated.clone(),
                    actual: c.actual.clone(),
                    divergence_pct: c.divergence_pct(),
                    baseline: c.baseline.clone(),
                })
                .collect(),
        };
        self.last_report_msg = Some(match ledger::write_full_report(&ledger::default_runs_dir(), &report) {
            Ok(path) => format!("saved to {}", path.display()),
            Err(e) => format!("could not write report: {e}"),
        });
    }

    /// The Δt/T prompt (contract §2): both explicit, last-used prefilled, ticks =
    /// round(T/Δt) shown. No other controls, nothing persisted (G1). Confirming
    /// runs; the window's ✕ dismisses without running.
    #[cfg(not(target_arch = "wasm32"))]
    fn run_prompt_window(&mut self, ctx: &egui::Context, lens: Lens) {
        if !self.run_prompt {
            return;
        }
        let mut open = true;
        let mut do_run = false;
        egui::Window::new(egui::RichText::new("Run parameters").color(theme::INK))
            .open(&mut open)
            .resizable(false)
            .default_pos(egui::pos2(660.0, 120.0))
            .show(ctx, |ui| {
                ui.label(
                    egui::RichText::new("Δt is the step size, T the horizon. Ticks = round(T / Δt).")
                        .small()
                        .color(theme::INK_SOFT),
                );
                ui.add_space(6.0);
                ui.horizontal(|ui| {
                    ui.label(egui::RichText::new("Δt").color(theme::INK));
                    ui.add(egui::TextEdit::singleline(&mut self.run_dt).desired_width(64.0));
                });
                ui.horizontal(|ui| {
                    ui.label(egui::RichText::new("T ").color(theme::INK));
                    ui.add(egui::TextEdit::singleline(&mut self.run_t).desired_width(64.0));
                });
                let dt = self.run_dt.parse::<f64>().ok().filter(|&d| d > 0.0);
                let t = self.run_t.parse::<f64>().ok().filter(|&v| v > 0.0);
                ui.add_space(4.0);
                match (dt, t) {
                    (Some(d), Some(v)) => ui.label(
                        egui::RichText::new(format!("{} ticks", (v / d).round() as i64))
                            .small()
                            .color(theme::INK_SOFT),
                    ),
                    _ => ui.label(
                        egui::RichText::new("enter a positive Δt and T")
                            .small()
                            .color(theme::ACCENT),
                    ),
                };
                ui.add_space(8.0);
                let valid = dt.is_some() && t.is_some();
                if ui
                    .add_enabled(valid, egui::Button::new(egui::RichText::new("Run").color(theme::INK_SOFT)))
                    .clicked()
                {
                    do_run = true;
                }
            });
        self.run_prompt = open;
        if do_run {
            self.execute_run(lens);
        }
    }

    /// The transient Results panel (Shape B). Read-only, snapshot; the window's ✕
    /// dismisses it to nothing. Renders the run summary as the terminal layer (B3):
    /// residual headline, identity-default disclosure, purpose-ordered final levels
    /// ("instantaneous"), then per-thing trajectories on demand ("historical"). A
    /// structural edit since the run greys the summary and withholds the drill-down
    /// (R3) — a stale run never renders as current.
    #[cfg(not(target_arch = "wasm32"))]
    fn run_panel(&mut self, ctx: &egui::Context, lens: Lens) {
        if !self.run_panel {
            return;
        }
        let current_key = self.current_spec_key(lens);
        let mut open = true;
        let mut do_save_report = false;
        egui::Window::new(egui::RichText::new("Run results").color(theme::INK))
            .open(&mut open)
            .resizable(true)
            .default_width(360.0)
            .default_pos(egui::pos2(680.0, 120.0))
            .show(ctx, |ui| {
                // R2: the gate message stands alone — no results, no partial run.
                if let Some(msg) = &self.run_gate_msg {
                    ui.label(egui::RichText::new("Not runnable yet").strong().color(theme::ACCENT));
                    ui.add_space(4.0);
                    ui.label(egui::RichText::new(msg).color(theme::INK_SOFT));
                    return;
                }
                let Some(res) = &self.run_results else {
                    ui.label(egui::RichText::new("No run yet.").color(theme::INK_FAINT));
                    return;
                };
                let stale = current_key != Some(res.key);
                // The run-vs-actual comparisons (contract §3), built from the
                // mapped elements that carry empirical H. Empty when nothing is
                // imported; withheld from the UI while stale, exactly as the trace.
                let comparisons = self.comparisons(res);

                // ── Compact header: model · Δt/T · build receipt (#31 kept) ──
                let model_name = self
                    .current_model_name
                    .clone()
                    .unwrap_or_else(|| "untitled".to_string());
                ui.label(
                    egui::RichText::new(format!(
                        "{model_name} · Δt {}, T {} · {} ticks",
                        res.dt, res.t, res.ticks
                    ))
                    .small()
                    .color(theme::INK_FAINT),
                );
                ui.label(
                    egui::RichText::new(format!("recorded {} · build {}", res.recorded_at, BUILD_SHA))
                        .small()
                        .color(theme::INK_SOFT),
                );
                if let Some(prev) = &self.prev_run_line {
                    ui.label(
                        egui::RichText::new(format!("previous · {prev}"))
                            .small()
                            .color(theme::INK_FAINT),
                    );
                }
                if stale {
                    ui.add_space(4.0);
                    ui.label(
                        egui::RichText::new("⚠ model changed since this run — re-run to refresh")
                            .strong()
                            .color(theme::WARN),
                    );
                }
                ui.add_space(10.0);

                let conserves = res.conserves();
                let chosen = res.identity_default_m.saturating_sub(res.identity_default_n);

                // The lead comparison (sharpest divergence) drives the verdict.
                let lead = if stale {
                    None
                } else {
                    comparisons
                        .iter()
                        .filter_map(|c| c.divergence_pct().map(|p| (c, p)))
                        .max_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal))
                };

                // ── VERDICT: lead with the result ──
                match lead {
                    Some((c, pct)) => {
                        ui.label(
                            egui::RichText::new(format!("{pct:.0}% off reality"))
                                .size(28.0)
                                .strong()
                                .color(theme::ACCENT),
                        )
                        .on_hover_text(
                            "How far the executed flow lands from your imported data at the last \
                             step both cover. Only the overlapping (in-sample) window is compared; \
                             ticks past your data are projection, not error.",
                        );
                        ui.label(
                            egui::RichText::new(format!("{} · at horizon", c.element_name))
                                .small()
                                .color(theme::INK_SOFT),
                        );
                        let sim_l = c.simulated.last().copied().unwrap_or(0.0) as f64;
                        let act_l = c.actual.last().copied().unwrap_or(0.0) as f64;
                        ui.add_space(3.0);
                        ui.label(
                            egui::RichText::new(format!(
                                "actual {} · executed {}",
                                humanize_unit(act_l, &c.unit),
                                humanize(sim_l),
                            ))
                            .color(theme::INK),
                        );
                    }
                    None => {
                        let color = if conserves { theme::MOBUS } else { theme::WARN };
                        ui.label(
                            egui::RichText::new(if conserves {
                                format!("Ran clean · {} ticks", res.ticks)
                            } else {
                                "Ran — conservation leak".to_string()
                            })
                            .size(24.0)
                            .strong()
                            .color(color),
                        );
                        if comparisons.is_empty() && !stale {
                            ui.label(
                                egui::RichText::new(
                                    "no imported data to compare against — import a CSV to check the model against reality",
                                )
                                .small()
                                .color(theme::INK_FAINT),
                            );
                        }
                    }
                }

                ui.add_space(9.0);

                // ── Chips: conservation + behavior, at a glance ──
                ui.horizontal_wrapped(|ui| {
                    chip(
                        ui,
                        if conserves { "✓ conserved" } else { "⚠ leak" },
                        if conserves { theme::OK } else { theme::WARN },
                    );
                    let (btxt, bcol) = if res.identity_default_m == 0 {
                        ("no components".to_string(), theme::INK_FAINT)
                    } else if res.identity_default_n == 0 {
                        ("✓ behavior set".to_string(), theme::OK)
                    } else if chosen == 0 {
                        ("behavior not set".to_string(), theme::WARN)
                    } else {
                        (
                            format!("{chosen} of {} behavior set", res.identity_default_m),
                            theme::WARN,
                        )
                    };
                    chip(ui, &btxt, bcol);
                });

                // ── Hero chart: executed vs actual for the lead element ──
                if let Some((c, _)) = lead {
                    ui.add_space(10.0);
                    let w = ui.available_width().min(340.0);
                    comparison_sparkline(
                        ui,
                        &c.simulated,
                        &c.actual,
                        c.baseline.as_deref(),
                        egui::vec2(w, 72.0),
                    );
                    ui.horizontal(|ui| {
                        ui.label(egui::RichText::new("— executed").small().color(theme::MOBUS))
                            .on_hover_text("What the run actually produced for this flow, tick by tick.");
                        ui.add_space(8.0);
                        ui.label(egui::RichText::new("— actual").small().color(theme::ACCENT))
                            .on_hover_text("Your imported data — the real observed series it's checked against.");
                        if c.baseline.is_some() {
                            ui.add_space(8.0);
                            ui.label(
                                egui::RichText::new("— declared (mean)")
                                    .small()
                                    .color(theme::INK_FAINT),
                            )
                            .on_hover_text(
                                "The flat average the model ran at: the tether reads the CSV column's mean \
                                 as a constant. Distance from 'actual' is the assume-it's-constant error.",
                            );
                        }
                    });
                }

                ui.add_space(10.0);
                ui.separator();
                ui.add_space(6.0);

                // ── Final state (collapsible, open) — instantaneous levels ──
                egui::CollapsingHeader::new(egui::RichText::new("Final state").color(theme::INK_SOFT))
                    .id_salt("run-final")
                    .default_open(true)
                    .show(ui, |ui| {
                        let mut last_cat: Option<LevelCategory> = None;
                        for row in &res.levels {
                            if last_cat != Some(row.category) {
                                ui.label(
                                    egui::RichText::new(row.category.header())
                                        .small()
                                        .color(theme::INK_FAINT),
                                );
                                last_cat = Some(row.category);
                            }
                            let name = if row.name.trim().is_empty() { "·" } else { &row.name };
                            ui.horizontal(|ui| {
                                ui.add_space(8.0);
                                ui.label(egui::RichText::new(name).color(theme::INK));
                                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                    ui.label(
                                        egui::RichText::new(humanize(row.value as f64)).color(theme::INK),
                                    );
                                });
                            });
                        }
                        ui.horizontal(|ui| {
                            ui.add_space(8.0);
                            ui.label(
                                egui::RichText::new("conservation residual")
                                    .small()
                                    .color(theme::INK_FAINT),
                            )
                            .on_hover_text(
                                "How much substance the run created or destroyed, as a fraction \
                                 of everything that flowed. ~0 means nothing leaked — the model \
                                 balances; a large fraction means flow is appearing or vanishing \
                                 where it shouldn't. (Shown relative so a big model doesn't read \
                                 as leaking over floating-point rounding.)",
                            );
                            ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                let rel = res.residual_relative();
                                let text = if rel < 1e-9 {
                                    "0 — balanced".to_string()
                                } else {
                                    format!("{rel:.1e} of throughput")
                                };
                                ui.label(
                                    egui::RichText::new(text)
                                        .small()
                                        .color(if conserves { theme::OK } else { theme::WARN }),
                                )
                                .on_hover_text(format!("absolute residual {:.0}", res.residual));
                            });
                        });
                    });

                // ── Trajectories (collapsible, closed) — the historical shape ──
                if !stale {
                    let lead_name = lead.map(|(c, _)| c.element_name.clone());
                    egui::CollapsingHeader::new(
                        egui::RichText::new("Trajectories").color(theme::INK_SOFT),
                    )
                    .id_salt("run-traj")
                    .default_open(false)
                    .show(ui, |ui| {
                        for (name, series) in &res.trajectories {
                            let label = if name.trim().is_empty() { "·" } else { name };
                            ui.label(egui::RichText::new(label).small().color(theme::INK));
                            run_sparkline(ui, series);
                            if let Some(last) = series.last() {
                                ui.label(
                                    egui::RichText::new(format!("final {}", humanize(*last as f64)))
                                        .small()
                                        .color(theme::INK_FAINT),
                                );
                            }
                            ui.add_space(4.0);
                        }
                        // Any further mapped comparisons beyond the hero lead.
                        for c in comparisons
                            .iter()
                            .filter(|c| Some(&c.element_name) != lead_name.as_ref())
                        {
                            ui.add_space(2.0);
                            ui.label(
                                egui::RichText::new(format!("{} · executed vs actual", c.element_name))
                                    .small()
                                    .color(theme::INK),
                            );
                            let w = ui.available_width().min(300.0);
                            comparison_sparkline(
                                ui,
                                &c.simulated,
                                &c.actual,
                                c.baseline.as_deref(),
                                egui::vec2(w, 40.0),
                            );
                            if let Some(p) = c.divergence_pct() {
                                ui.label(
                                    egui::RichText::new(format!("{p:.1}% off"))
                                        .small()
                                        .color(theme::INK_FAINT),
                                );
                            }
                        }
                    });
                }

                ui.add_space(6.0);
                ui.separator();
                ui.add_space(4.0);

                // (6) Explicit "Save report" gesture (unchanged).
                ui.horizontal(|ui| {
                    if ui
                        .add_enabled(!stale, egui::Button::new("Save report"))
                        .clicked()
                    {
                        do_save_report = true;
                    }
                    ui.label(
                        egui::RichText::new("full trajectories → ~/Documents/bert-lenses/runs/")
                            .small()
                            .color(theme::INK_FAINT),
                    );
                });
                if let Some(msg) = &self.last_report_msg {
                    ui.label(egui::RichText::new(msg).small().color(theme::INK_FAINT));
                }
                ui.add_space(6.0);

                ui.label(
                    egui::RichText::new(
                        "Snapshot — read-only; refreshed only by an explicit re-run, and never \
                         written into Save or Export.",
                    )
                    .small()
                    .color(theme::INK_FAINT),
                );
            });
        if do_save_report {
            // Borrow released by the closure above; clone the run's own data
            // rather than holding `res` across the `&mut self` call below.
            if let Some(res) = self.run_results.clone() {
                let comparisons = self.comparisons(&res);
                self.save_run_report(&res, &comparisons);
            }
        }
        self.run_panel = open;
    }
}

impl eframe::App for CanvasApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        apply_theme(ctx);
        self.poll_generate();
        if self.models_dir.is_none() {
            self.refresh_library(); // lazy init: resolve the home dir + scan once on first frame
        }
        self.library_panel(ctx); // persistent left panel, in both the lens-picker and canvas views
        match self.lens {
            None => self.choose_lens(ctx),
            Some(lens) => self.canvas(ctx, lens),
        }
    }
}

impl CanvasApp {
    fn choose_lens(&mut self, ctx: &egui::Context) {
        let mut chosen = None;
        let mut do_open = false;
        egui::CentralPanel::default()
            .frame(egui::Frame::default().fill(theme::BG))
            .show(ctx, |ui| {
                ui.vertical_centered(|ui| {
                    ui.add_space(108.0);
                    ui.label(egui::RichText::new("●  bert-lenses").strong().color(theme::INK));
                    ui.add_space(30.0);
                    ui.label(egui::RichText::new("Author as…").size(26.0).color(theme::INK));
                    ui.add_space(6.0);
                    ui.label(
                        egui::RichText::new(
                            "One system underneath; each lens is a way of seeing it — switch any time.",
                        )
                        .color(theme::INK_FAINT),
                    );
                    ui.add_space(36.0);

                    ui.allocate_ui_with_layout(
                        egui::vec2(810.0, 230.0),
                        egui::Layout::left_to_right(egui::Align::TOP),
                        |ui| {
                            ui.columns(3, |cols| {
                                for (i, lens) in
                                    [Lens::Klir, Lens::Bunge, Lens::Mobus].into_iter().enumerate()
                                {
                                    cols[i].vertical_centered(|ui| {
                                        let btn = egui::Button::new(
                                            egui::RichText::new(lens.name())
                                                .size(21.0)
                                                .strong()
                                                .color(lens.color()),
                                        )
                                        .min_size(egui::vec2(220.0, 60.0))
                                        .fill(theme::SURFACE)
                                        .stroke(egui::Stroke::new(1.0, theme::LINE2));
                                        if ui.add(btn).clicked() {
                                            chosen = Some(lens);
                                        }
                                        ui.add_space(9.0);
                                        ui.label(
                                            egui::RichText::new(lens.epithet())
                                                .italics()
                                                .color(theme::INK_FAINT),
                                        );
                                        ui.add_space(5.0);
                                        ui.label(
                                            egui::RichText::new(lens.blurb()).color(theme::INK_SOFT),
                                        );
                                    });
                                }
                            });
                        },
                    );
                    ui.add_space(30.0);
                    if ui
                        .button(
                            egui::RichText::new("Open a saved model…").color(theme::INK_FAINT),
                        )
                        .clicked()
                    {
                        do_open = true;
                    }
                });
            });
        if chosen.is_some() {
            self.lens = chosen;
        }
        if do_open {
            self.open_model();
        }
    }

    fn canvas(&mut self, ctx: &egui::Context, lens: Lens) {
        egui::TopBottomPanel::top("bar").show(ctx, |ui| {
            ui.add_space(6.0);
            ui.horizontal(|ui| {
                ui.label(egui::RichText::new("●  bert-lenses").strong().color(theme::INK));
                ui.separator();

                // File ▾ — model lifecycle (New / Open / Save / Save As)
                ui.menu_button(egui::RichText::new("File").color(theme::INK_SOFT), |ui| {
                    if ui.button("⊕  New model").clicked() {
                        self.lens = None;
                        self.things.clear();
                        self.relations.clear();
                        self.selection = Selected::None;
                        self.editing = None;
                        self.editing_rel = None;
                        self.show_palette = false;
                        self.stamp = None;
                        ui.close_menu();
                    }
                    if ui
                        .button("Open…")
                        .on_hover_text("Open a saved model OR a GSR spec (from Facets \"model this\" / /extract) — auto-detected")
                        .clicked()
                    {
                        self.open_model();
                        ui.close_menu();
                    }
                    let save_label = match &self.current_model_path {
                        Some(p) => format!(
                            "Save  ({})",
                            p.file_name().and_then(|s| s.to_str()).unwrap_or("file")
                        ),
                        None => "Save…".to_string(),
                    };
                    if ui.button(save_label).clicked() {
                        self.save_model(lens);
                        ui.close_menu();
                    }
                    if self.current_model_path.is_some() && ui.button("Save As…").clicked() {
                        self.save_model_as(lens);
                        ui.close_menu();
                    }
                });

                // Data ▾ — the reality / interop seam (Import CSV / Export BERT)
                ui.menu_button(egui::RichText::new("Data").color(theme::INK_SOFT), |ui| {
                    if ui
                        .button("Import data (CSV)…")
                        .on_hover_text("Attach a CSV of real observations — map columns onto flows, stocks, and parameters (the tether)")
                        .clicked()
                    {
                        self.import_csv();
                        ui.close_menu();
                    }
                    if ui
                        .button(format!("Export BERT · {}", mode_label(lens.mode())))
                        .on_hover_text("Export a bert-core WorldModel (.json) stamped with this lens's mode — the seam out to BERT / GSR / compose")
                        .clicked()
                    {
                        self.export_world_model(lens);
                        ui.close_menu();
                    }
                    // #38: the mapping ritual, saved. Meaning was assigned by
                    // hand once in the wizard; the manifest replays it headless
                    // (`bert-lenses run <manifest>`), no re-clicking.
                    if ui
                        .add_enabled(
                            self.last_mapping_manifest.is_some(),
                            egui::Button::new("Save run manifest…"),
                        )
                        .on_hover_text(
                            "Save this import's column mapping + run config as a manifest — \
                             replay it headless with `bert-lenses run <manifest.json>`",
                        )
                        .clicked()
                    {
                        self.save_run_manifest();
                        ui.close_menu();
                    }
                });

                ui.add_space(10.0);
                ui.separator();
                ui.add_space(4.0);

                // Run — the primary verb (Mobus vocabulary, Mobus-only, native-only).
                #[cfg(not(target_arch = "wasm32"))]
                if lens == Lens::Mobus
                    && ui
                        .button(egui::RichText::new("▶ Run").strong().color(theme::MOBUS))
                        .on_hover_text("Run the authored model over a horizon (Δt, T) and read its recorded trace — Mobus only, on demand")
                        .clicked()
                {
                    self.begin_run(lens);
                }
                if ui
                    .button(egui::RichText::new("Check consistency").color(theme::INK_SOFT))
                    .on_hover_text("Project this canvas with the current lens's mode and run bert-core's operational check — read-only, on demand")
                    .clicked()
                {
                    self.show_audit = true;
                }
                if lens == Lens::Mobus {
                    let on = self.show_palette;
                    if ui
                        .selectable_label(
                            on,
                            egui::RichText::new("⚒ Work processes")
                                .color(if on { theme::MOBUS } else { theme::INK_SOFT }),
                        )
                        .on_hover_text("Open the Mobus work-process palette and stamp what each component does")
                        .clicked()
                    {
                        self.show_palette = !on;
                    }
                }
                if ui
                    .button(egui::RichText::new("Tidy").color(theme::INK_SOFT))
                    .on_hover_text("Auto-arrange the layout to suit the current lens, centered in view")
                    .clicked()
                {
                    self.relayout = true;
                }

                ui.add_space(10.0);
                ui.separator();
                ui.add_space(4.0);

                // Generate ▾ — LLM-assisted modeling, collapsed into a popover (the widest cluster).
                ui.menu_button(
                    egui::RichText::new("✦ Generate").color(theme::ACCENT),
                    |ui| {
                        ui.set_min_width(232.0);
                        ui.label(
                            egui::RichText::new("Describe a system; GSR models it here.")
                                .small()
                                .color(theme::INK_FAINT),
                        );
                        let te = ui.add(
                            egui::TextEdit::singleline(&mut self.gen_desc)
                                .hint_text("describe a system…")
                                .desired_width(212.0),
                        );
                        let presets: [(&str, bool, &str); 5] = [
                            ("Haiku · local", false, ""),
                            ("Haiku · cloud", true, ""),
                            ("Gemma4 12B · local", false, "gemma4:12b"),
                            ("Gemma4 12B-QAT · local", false, "gemma4:12b-it-qat"),
                            ("Mistral Small · local", false, "mistral-small:latest"),
                        ];
                        let current = presets
                            .iter()
                            .find(|(_, c, m)| *c == self.gen_cloud && *m == self.gen_model.as_str())
                            .map(|(l, _, _)| *l)
                            .unwrap_or("custom");
                        egui::ComboBox::from_id_salt("engine")
                            .selected_text(
                                egui::RichText::new(current).small().color(theme::INK_SOFT),
                            )
                            .show_ui(ui, |ui| {
                                for (label, cloud, model) in presets {
                                    if ui.selectable_label(current == label, label).clicked() {
                                        self.gen_cloud = cloud;
                                        self.gen_model = model.to_string();
                                    }
                                }
                            });
                        let label = if self.gen_busy { "…" } else { "✦ Generate" };
                        let clicked = ui
                            .add_enabled(
                                !self.gen_busy,
                                egui::Button::new(egui::RichText::new(label).color(theme::ACCENT)),
                            )
                            .clicked();
                        let entered =
                            te.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));
                        if clicked || entered {
                            self.start_generate(ctx);
                            ui.close_menu();
                        }
                        if let Some(err) = self.gen_error.clone() {
                            ui.colored_label(theme::WARN, format!("⚠ {err}"));
                        }
                    },
                );

                // Lens + Math — pinned right so they never clip off the edge.
                ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                    let on = self.show_math;
                    let math_tip = match lens {
                        Lens::Klir => "S = (T, R)",
                        Lens::Bunge => "σ = ⟨C, E, S⟩",
                        Lens::Mobus => "σ = ⟨C, …, Δt⟩",
                    };
                    if ui
                        .selectable_label(
                            on,
                            egui::RichText::new("{ }  Math")
                                .strong()
                                .color(if on { theme::ACCENT } else { theme::INK_FAINT }),
                        )
                        .on_hover_text(format!("Show the object as sets and relations — {}", math_tip))
                        .clicked()
                    {
                        self.show_math = !on;
                    }
                    ui.separator();
                    // right_to_left: add Mobus, Bunge, Klir so they read Klir · Bunge · Mobus L→R.
                    for l in [Lens::Mobus, Lens::Bunge, Lens::Klir] {
                        let selected = lens == l;
                        let color = if selected { l.color() } else { theme::INK_FAINT };
                        if ui
                            .selectable_label(selected, egui::RichText::new(l.name()).strong().color(color))
                            .on_hover_text("Same model, seen through another lens — lossless.")
                            .clicked()
                        {
                            self.lens = Some(l);
                        }
                    }
                    ui.label(egui::RichText::new("Lens").small().color(theme::INK_FAINT));
                });
            });
            ui.add_space(6.0);
        });

        if self.show_math {
            egui::SidePanel::right("math")
                .resizable(false)
                .exact_width(330.0)
                .show(ctx, |ui| {
                    ui.add_space(12.0);
                    ui.label(
                        egui::RichText::new("MATHEMATICAL VIEW")
                            .small()
                            .color(theme::INK_FAINT),
                    );
                    let framing = match lens {
                        Lens::Klir => "a set of things and a relation on it",
                        Lens::Bunge => "composition, environment, structure",
                        Lens::Mobus => "the operational anatomy",
                    };
                    ui.label(egui::RichText::new(framing).color(lens.color()));
                    ui.add_space(18.0);

                    let dn = |t: &Thing| {
                        if t.name.trim().is_empty() {
                            "·".to_string()
                        } else {
                            t.name.clone()
                        }
                    };
                    let all: Vec<String> = self.things.iter().map(dn).collect();
                    let comp: Vec<String> = self
                        .things
                        .iter()
                        .filter(|t| t.role == Role::Component)
                        .map(dn)
                        .collect();
                    let env: Vec<String> = self
                        .things
                        .iter()
                        .filter(|t| self.in_environment(t.id))
                        .map(dn)
                        .collect();
                    // pairs grouped into a *family of named relations*: R/S/F is the set of those
                    // relations, each itself a set of ordered pairs. Klir/Mobus group by interpretation
                    // (name). Bunge groups by Bunge's own structure: endostructure (bonds among
                    // components) vs exostructure (bonds linking components to the environment) vs mere
                    // relations — NOT by matter/energy/info, which is a Mobus flow-typing, not a bond
                    // distinction. Endpoints kept as raw names so the renderer can typeset them.
                    let mut groups: Vec<(String, Vec<(String, String)>)> = Vec::new();
                    for r in &self.relations {
                        let key = match lens {
                            Lens::Bunge => {
                                if !r.is_bond {
                                    "mere relations".to_string()
                                } else if self.in_environment(r.a) || self.in_environment(r.b) {
                                    "exostructure".to_string()
                                } else {
                                    "endostructure".to_string()
                                }
                            }
                            _ => r.name.trim().to_string(),
                        };
                        // ordered pairs kept; a neutral rendering leaves direction undeclared.
                        let pair = (self.name_of(r.a), self.name_of(r.b));
                        if let Some(g) = groups.iter_mut().find(|(n, _)| *n == key) {
                            g.1.push(pair);
                        } else {
                            groups.push((key, vec![pair]));
                        }
                    }
                    // canonical reading order for Bunge's structure: endo, exo, then mere relations.
                    if matches!(lens, Lens::Bunge) {
                        groups.sort_by_key(|(n, _)| match n.as_str() {
                            "endostructure" => 0,
                            "exostructure" => 1,
                            _ => 2,
                        });
                    }
                    let gathered_labels: Vec<String> = groups
                        .iter()
                        .filter(|(n, _)| !n.is_empty())
                        .map(|(n, _)| n.clone())
                        .collect();
                    let unnamed_pairs: Vec<(String, String)> = groups
                        .iter()
                        .filter(|(n, _)| n.is_empty())
                        .flat_map(|(_, v)| v.clone())
                        .collect();

                    egui::ScrollArea::vertical().show(ui, |ui| {
                        match lens {
                            Lens::Klir => {
                                math_hero(
                                    ui,
                                    &[("S", true), (" = ", false), ("(", false), ("T", true), (", ", false), ("R", true), (")", false)],
                                );
                                soft_divider(ui);
                                math_set(ui, "T", &all, false);
                                for (n, p) in groups.iter().filter(|(n, _)| !n.is_empty()) {
                                    math_rel(ui, n, p);
                                }
                                math_gathered(ui, "R", &gathered_labels, &unnamed_pairs);
                                math_note(ui, "R ⊆ T × T (simplest case) — a relation, or set of relations, on T. Ordered pairs; a neutral system just leaves direction undeclared. The binary fragment of Klir's general n-ary R.");
                            }
                            Lens::Bunge => {
                                math_hero(
                                    ui,
                                    &[("σ", true), (" = ", false), ("⟨", false), ("C", true), (", ", false), ("E", true), (", ", false), ("S", true), ("⟩", false)],
                                );
                                soft_divider(ui);
                                math_set(ui, "C", &comp, false);
                                math_set(ui, "E", &env, false);
                                for (n, p) in groups.iter().filter(|(n, _)| !n.is_empty()) {
                                    math_rel(ui, n, p);
                                }
                                math_gathered(ui, "S", &gathered_labels, &unnamed_pairs);
                                math_note(ui, "S = the bonding relation, split into endostructure (bonds among components) and exostructure (bonds linking components to the environment), ∪ mere relations (B̄). Only bonds confer systemhood.  C ∩ E = ∅.");
                                // "aggregate, not system" is bert-core's verdict (validate_mode
                                // Structural via is_heap); ≥2 components is the presentation
                                // trigger for the "heap" wording (Def 1.1 needs ≥2 things).
                                let comp_count = self.things.iter().filter(|t| t.role == Role::Component).count();
                                if comp_count >= 2 && self.is_heap(lens) {
                                    ui.add_space(10.0);
                                    ui.label(
                                        egui::RichText::new(
                                            "⚠ components not bonded ⇒ an aggregate (§1.1), not a system — Def 1.1 needs ≥2 different connected things",
                                        )
                                        .small()
                                        .color(theme::WARN),
                                    );
                                }
                            }
                            Lens::Mobus => {
                                math_hero(
                                    ui,
                                    &[("σ", true), (" = ", false), ("⟨ ", false), ("C", true), (", … , ", false), ("Δt", true), (" ⟩", false)],
                                );
                                soft_divider(ui);
                                math_set(ui, "C", &comp, false);
                                for (n, p) in groups.iter().filter(|(n, _)| !n.is_empty()) {
                                    math_rel(ui, n, p);
                                }
                                math_gathered(ui, "F", &gathered_labels, &unnamed_pairs);
                                math_note(ui, "the operational 8-tuple — boundary, ports, transforms, history, timescale arrive with the Mobus layer");
                            }
                        }
                    });
                });
        }

        self.audit_panel(ctx, lens); // Arc 4.1: floats on demand, dismisses to nothing
        // Arc 4.2 palette: Mobus-only. Leaving the lens closes it (and unloads the stamp),
        // so the mapping surface never lingers where its vocabulary doesn't apply.
        if lens != Lens::Mobus {
            self.show_palette = false;
        }
        self.palette_panel(ctx);

        // The CSV tether (contract §1): the mapping window and the post-import /
        // orphan disclosure. Model-level, not lens-gated — data attaches to the
        // model; only its *reading* (the run comparison) is Mobus-only.
        self.import_mapping_window(ctx);
        self.import_notice_window(ctx);
        self.import_replace_confirm_window(ctx);
        self.env_birth_toast(ctx);
        self.handle_dropped_files(ctx); // #26: a dropped .csv enters the import flow

        // Arc 4.3 Run surface (Shape B): Mobus-only, transient. Leaving Mobus closes
        // both the prompt and the Results panel, so the run surface never lingers
        // where its vocabulary doesn't apply (G1/G2).
        #[cfg(not(target_arch = "wasm32"))]
        {
            if lens != Lens::Mobus {
                self.run_prompt = false;
                self.run_panel = false;
            }
            self.run_prompt_window(ctx, lens);
            self.run_panel(ctx, lens);
        }

        egui::CentralPanel::default()
            .frame(egui::Frame::default().fill(theme::SURFACE))
            .show(ctx, |ui| {
                let rect = ui.max_rect();
                let painter = ui.painter().clone();
                let resp =
                    ui.interact(rect, ui.id().with("canvas_bg"), egui::Sense::click_and_drag());
                let hover = ui.input(|i| i.pointer.hover_pos());

                // deferred relayout (import / Tidy) — center on the visible canvas so nothing drifts off-screen
                if self.relayout {
                    layout(lens, &mut self.things, rect.center());
                    self.relayout = false;
                }

                // faint reference grid
                let step = 30.0;
                let mut y = rect.top() + step;
                while y < rect.bottom() {
                    let mut x = rect.left() + step;
                    while x < rect.right() {
                        painter.circle_filled(egui::pos2(x, y), 1.0, theme::LINE);
                        x += step;
                    }
                    y += step;
                }

                // lens container, drawn behind relations + nodes: Klir = the set T; Bunge = composition.
                let tint = |c: egui::Color32, a: u8| egui::Color32::from_rgba_unmultiplied(c.r(), c.g(), c.b(), a);
                match lens {
                    Lens::Klir => {
                        let pts: Vec<egui::Pos2> = self.things.iter().map(|t| t.pos).collect();
                        if !pts.is_empty() {
                            let r = egui::Rect::from_points(&pts).expand(RADIUS + 26.0);
                            let cr = egui::CornerRadius::same((r.height().min(r.width()) / 2.0).min(120.0) as u8);
                            painter.rect_filled(r, cr, tint(theme::KLIR, 14));
                            painter.rect_stroke(r, cr, egui::Stroke::new(1.0, theme::LINE2), egui::StrokeKind::Inside);
                            painter.text(r.left_top() + egui::vec2(11.0, 7.0), egui::Align2::LEFT_TOP, "T", egui::FontId::proportional(13.0), theme::KLIR);
                        }
                    }
                    Lens::Bunge => {
                        let pts: Vec<egui::Pos2> = self.things.iter().filter(|t| t.role == Role::Component).map(|t| t.pos).collect();
                        if !pts.is_empty() {
                            let r = egui::Rect::from_points(&pts).expand(RADIUS + 24.0);
                            let cr = egui::CornerRadius::same(28);
                            painter.rect_filled(r, cr, tint(theme::BUNGE, 12));
                            painter.rect_stroke(r, cr, egui::Stroke::new(1.0, tint(theme::BUNGE, 70)), egui::StrokeKind::Inside);
                        }
                    }
                    Lens::Mobus => {}
                }

                // press on body moves; press near rim starts a relation
                if resp.drag_started() {
                    if let Some(p) = resp.interact_pointer_pos() {
                        if let Some((id, dist)) = self.nearest(p) {
                            if dist <= BODY {
                                self.drag = Some(id);
                            } else if dist <= CONNECT_REACH {
                                self.connecting = Some(id);
                            }
                        }
                    }
                }
                if resp.dragged() {
                    let d = resp.drag_delta();
                    if let Some(id) = self.drag {
                        if let Some(t) = self.things.iter_mut().find(|t| t.id == id) {
                            t.pos += d;
                        }
                    } else if self.connecting.is_none() {
                        // drag on empty background → pan the whole canvas (move everything together)
                        for t in &mut self.things {
                            t.pos += d;
                        }
                    }
                }
                // #28: latch Shift across the whole drag, not just the release frame.
                if self.connecting.is_some() && ui.input(|i| i.modifiers.shift) {
                    self.connect_shift = true;
                }
                if resp.drag_stopped() {
                    if let Some(src) = self.connecting {
                        if let Some(p) = resp.interact_pointer_pos() {
                            if let Some(tgt) = self.hit(p) {
                                if tgt != src && !self.has_relation(src, tgt) {
                                    let id = self.next_id;
                                    self.next_id += 1;
                                    self.relations.push(Relation {
                                        id,
                                        a: src,
                                        b: tgt,
                                        name: String::new(),
                                        is_bond: true,
                                        kind: Kind::Unspecified,
                                    });
                                }
                            } else if lens != Lens::Klir
                                && self.pos_of(src).map_or(false, |sp| sp.distance(p) > RADIUS * 2.0)
                            {
                                // dropped on empty in Bunge/Mobus → birth an environment entity, bonded.
                                // Shift held reverses the bond to env→component, birthing a Source in
                                // one motion instead of a Sink; the arrowhead (drawn from stored a→b,
                                // same as any bond) is the only cue needed — no separate legibility system.
                                let env_id = self.next_id;
                                self.next_id += 1;
                                self.things.push(Thing {
                                    id: env_id,
                                    name: String::new(),
                                    pos: p,
                                    role: Role::Environment,
                                    primitive: None,
                                });
                                let rid = self.next_id;
                                self.next_id += 1;
                                let source = self.connect_shift || ui.input(|i| i.modifiers.shift);
                                let (a, b) = env_bond_endpoints(src, env_id, source);
                                self.relations.push(Relation {
                                    id: rid,
                                    a,
                                    b,
                                    name: String::new(),
                                    is_bond: true,
                                    kind: Kind::Unspecified,
                                });
                                self.editing = Some(env_id);
                                self.focus_pending = true;
                                self.selection = Selected::Thing(env_id);
                                self.env_birth_notice = Some((
                                    if source {
                                        format!("SOURCE born → feeds {}", self.name_of(src))
                                    } else {
                                        format!("SINK born ← receives from {} (hold Shift while dragging for a Source)", self.name_of(src))
                                    },
                                    ctx.input(|i| i.time),
                                ));
                            }
                        }
                    }
                    self.drag = None;
                    self.connecting = None;
                    self.connect_shift = false;
                }

                // single click selects; double-click renames a thing or places a new one
                if resp.double_clicked() {
                    if let Some(p) = resp.interact_pointer_pos() {
                        if let Some(id) = self.hit(p) {
                            self.editing = Some(id);
                            self.editing_rel = None;
                            self.focus_pending = true;
                            self.selection = Selected::Thing(id);
                        } else if let Some(rid) = self.relation_at(p) {
                            self.editing_rel = Some(rid);
                            self.editing = None;
                            self.focus_pending = true;
                            self.selection = Selected::Rel(rid);
                        } else if self.editing.is_none()
                            && self.editing_rel.is_none()
                            && self.nearest(p).map_or(true, |(_, d)| d > CONNECT_REACH)
                        {
                            let id = self.next_id;
                            self.next_id += 1;
                            self.things.push(Thing {
                                id,
                                name: String::new(),
                                pos: p,
                                role: Role::Component,
                                primitive: None,
                            });
                            self.editing = Some(id);
                            self.focus_pending = true;
                            self.selection = Selected::Thing(id);
                        }
                    }
                } else if resp.clicked() {
                    if let Some(p) = resp.interact_pointer_pos() {
                        // Stamp mode: a loaded palette stamp turns a click on a component
                        // into a mapping application (apply_stamp ignores env things and
                        // selects the hit). Nothing else in the gesture set changes —
                        // drag still moves/connects, double-click still renames.
                        match (self.stamp, self.hit(p)) {
                            (Some(_), Some(id))
                                if self.things.iter().any(|t| t.id == id && t.role == Role::Component) =>
                            {
                                self.apply_stamp(id);
                            }
                            _ => {
                                self.selection = if let Some(id) = self.hit(p) {
                                    Selected::Thing(id)
                                } else if let Some(rid) = self.relation_at(p) {
                                    Selected::Rel(rid)
                                } else {
                                    Selected::None
                                };
                            }
                        }
                    }
                }

                // delete the selection (not while naming)
                if self.editing.is_none() && self.editing_rel.is_none() {
                    // Esc unloads a loaded stamp (leaving the palette open to reload).
                    if self.stamp.is_some() && ui.input(|i| i.key_pressed(egui::Key::Escape)) {
                        self.stamp = None;
                    }
                    let del = ui.input(|i| {
                        i.key_pressed(egui::Key::Delete) || i.key_pressed(egui::Key::Backspace)
                    });
                    if del {
                        match self.selection {
                            Selected::Thing(id) => self.delete_thing(id),
                            Selected::Rel(id) => self.relations.retain(|r| r.id != id),
                            Selected::None => {}
                        }
                        self.selection = Selected::None;
                        // T3: deleting a mapped element orphans its imported series
                        // (kept, never dropped) — surface the disclosure if so.
                        if self.imported.is_some() {
                            self.import_notice = self.orphan_notice();
                        }
                    }
                    // B toggles a selected relation between a bond and a mere relation
                    if let Selected::Rel(rid) = self.selection {
                        if ui.input(|i| i.key_pressed(egui::Key::B)) {
                            if let Some(r) = self.relations.iter_mut().find(|r| r.id == rid) {
                                r.is_bond = !r.is_bond;
                            }
                        }
                        if ui.input(|i| i.key_pressed(egui::Key::K)) {
                            if let Some(r) = self.relations.iter_mut().find(|r| r.id == rid) {
                                r.kind = r.kind.next();
                            }
                        }
                        // R reverses direction — flip a seed-mislabeled flow without redrawing
                        if ui.input(|i| i.key_pressed(egui::Key::R)) {
                            if let Some(r) = self.relations.iter_mut().find(|r| r.id == rid) {
                                std::mem::swap(&mut r.a, &mut r.b);
                            }
                        }
                    }
                }

                // cursor hint
                if self.drag.is_none() && self.connecting.is_none() {
                    if let Some((id, dist)) = hover.and_then(|h| self.nearest(h)) {
                        let over_comp = self.things.iter().any(|t| t.id == id && t.role == Role::Component);
                        if self.stamp.is_some() && dist <= BODY && over_comp {
                            // stamp mode: a click here applies the mapping
                            ui.ctx().set_cursor_icon(egui::CursorIcon::PointingHand);
                        } else if dist <= BODY {
                            ui.ctx().set_cursor_icon(egui::CursorIcon::Grab);
                        } else if dist <= CONNECT_REACH {
                            ui.ctx().set_cursor_icon(egui::CursorIcon::Crosshair);
                        }
                    }
                }

                // relations under the discs. Offset parallel/antiparallel edges (same node pair) so
                // they don't stack directly on top of each other — e.g. A→B and B→A.
                let mut edge_groups: std::collections::HashMap<(u64, u64), Vec<u64>> =
                    std::collections::HashMap::new();
                for r in &self.relations {
                    edge_groups.entry((r.a.min(r.b), r.a.max(r.b))).or_default().push(r.id);
                }
                for r in &self.relations {
                    if let (Some(pa0), Some(pb0)) = (self.pos_of(r.a), self.pos_of(r.b)) {
                        let dir = (pb0 - pa0).normalized();
                        let grp = &edge_groups[&(r.a.min(r.b), r.a.max(r.b))];
                        let idx = grp.iter().position(|&id| id == r.id).unwrap_or(0) as f32;
                        let spread = if grp.len() > 1 {
                            (idx - (grp.len() as f32 - 1.0) / 2.0) * 16.0
                        } else {
                            0.0
                        };
                        let off = egui::vec2(-dir.y, dir.x) * spread;
                        let pa = pa0 + off;
                        let pb = pb0 + off;
                        let a = pa + dir * RADIUS;
                        let b = pb - dir * RADIUS;
                        let sel = matches!(self.selection, Selected::Rel(s) if s == r.id);
                        // Bunge/Mobus color a bond by its kind (one graph per kind); Klir stays neutral
                        let base = if lens != Lens::Klir && r.is_bond {
                            r.kind.color()
                        } else {
                            theme::INK_SOFT
                        };
                        let stroke = if sel {
                            egui::Stroke::new(2.5, theme::ACCENT)
                        } else {
                            egui::Stroke::new(1.5, base)
                        };
                        // Klir draws every relation the same; Bunge/Mobus dash a *mere* relation
                        // (B̄) — it's structure, but it doesn't confer systemhood.
                        if lens == Lens::Klir || r.is_bond {
                            painter.line_segment([a, b], stroke);
                        } else {
                            painter.extend(egui::Shape::dashed_line(&[a, b], stroke, 7.0, 5.0));
                        }
                        // direction recovered at Bunge (and Mobus): the same stored a→b gains an arrowhead
                        if lens != Lens::Klir {
                            arrow_head(&painter, b, dir, stroke.color);
                        }
                        // Labels are revealed on hover or selection only. Always-on midpoint labels
                        // pile up illegibly on a dense graph; the canvas shows structure (things +
                        // lines) and the names live in the math view's R. Kind is already carried by
                        // edge colour in Bunge/Mobus.
                        let hot = sel || hover.map_or(false, |h| dist_to_seg(h, a, b) <= 8.0);
                        if self.editing_rel != Some(r.id) && hot {
                            let perp = egui::vec2(-dir.y, dir.x) * 11.0;
                            let mid = pa + (pb - pa) * 0.5 + perp;
                            if !r.name.is_empty() {
                                painter.text(
                                    mid,
                                    egui::Align2::CENTER_CENTER,
                                    r.name.as_str(),
                                    egui::FontId::proportional(12.0),
                                    theme::INK_SOFT,
                                );
                            } else if sel {
                                painter.text(
                                    mid,
                                    egui::Align2::CENTER_CENTER,
                                    "name…",
                                    egui::FontId::proportional(11.5),
                                    theme::INK_FAINT,
                                );
                            }
                            if lens != Lens::Klir && r.is_bond && r.kind != Kind::Unspecified {
                                painter.text(
                                    pa + (pb - pa) * 0.5 + egui::vec2(-dir.y, dir.x) * -13.0,
                                    egui::Align2::CENTER_CENTER,
                                    r.kind.label(),
                                    egui::FontId::proportional(11.0),
                                    r.kind.color(),
                                );
                            }
                        }
                    }
                }

                // discs
                let editing = self.editing;
                for t in &self.things {
                    let d = hover.map(|h| h.distance(t.pos));
                    let body_hover = self.drag.is_none()
                        && self.connecting.is_none()
                        && d.map_or(false, |d| d <= BODY);
                    let connect_hover = self.drag.is_none()
                        && self.connecting.is_none()
                        && d.map_or(false, |d| d > BODY && d <= CONNECT_REACH);
                    let active = editing == Some(t.id)
                        || self.drag == Some(t.id)
                        || self.connecting == Some(t.id)
                        || body_hover;
                    let selected = matches!(self.selection, Selected::Thing(s) if s == t.id);
                    let stroke = if selected {
                        egui::Stroke::new(2.5, theme::ACCENT)
                    } else if active {
                        egui::Stroke::new(2.0, lens.color())
                    } else {
                        egui::Stroke::new(1.5, theme::LINE2)
                    };
                    // composition = circle; environment = square (Bunge/Mobus only — Klir has
                    // no C/E shape split, its things are undifferentiated set elements). Klir
                    // still needs placement-role legibility, so environment gets a dashed halo
                    // around the same circle instead of the richer lenses' square.
                    if t.role == Role::Environment && lens != Lens::Klir {
                        let s = RADIUS * 0.82;
                        let sq = vec![
                            egui::pos2(t.pos.x - s, t.pos.y - s),
                            egui::pos2(t.pos.x + s, t.pos.y - s),
                            egui::pos2(t.pos.x + s, t.pos.y + s),
                            egui::pos2(t.pos.x - s, t.pos.y + s),
                        ];
                        painter.add(egui::Shape::convex_polygon(sq, theme::SURFACE, stroke));
                    } else {
                        painter.circle_filled(t.pos, RADIUS, theme::SURFACE);
                        painter.circle_stroke(t.pos, RADIUS, stroke);
                        if t.role == Role::Environment && lens == Lens::Klir {
                            dashed_ring(&painter, t.pos, RADIUS + 5.0, theme::INK_SOFT);
                        }
                    }
                    if connect_hover {
                        painter.circle_stroke(
                            t.pos,
                            RADIUS + 5.0,
                            egui::Stroke::new(1.5, theme::ACCENT),
                        );
                    }
                    if editing != Some(t.id) {
                        painter.text(
                            t.pos,
                            egui::Align2::CENTER_CENTER,
                            t.name.as_str(),
                            egui::FontId::proportional(13.5),
                            theme::INK,
                        );
                    }
                    // Persistent work-process badge (Mobus vocabulary → Mobus lens only):
                    // a small coloured pill on the disc's upper-right rim carrying the
                    // primitive's 2-letter code, so the mapping is readable at a glance
                    // without opening the palette. The full name shows on hover/selection.
                    if lens == Lens::Mobus && t.role == Role::Component {
                        if let Some(p) = t.primitive {
                            let center = t.pos + egui::vec2(RADIUS * 0.66, -RADIUS * 0.66);
                            let pill = egui::Rect::from_center_size(center, egui::vec2(26.0, 17.0));
                            painter.rect_filled(pill, egui::CornerRadius::same(5), prim_color(p));
                            painter.rect_stroke(
                                pill,
                                egui::CornerRadius::same(5),
                                egui::Stroke::new(1.0, theme::SURFACE),
                                egui::StrokeKind::Outside,
                            );
                            painter.text(
                                center,
                                egui::Align2::CENTER_CENTER,
                                prim_code(p),
                                egui::FontId::monospace(11.0),
                                theme::SURFACE,
                            );
                            if selected || body_hover {
                                painter.text(
                                    t.pos + egui::vec2(0.0, RADIUS + 11.0),
                                    egui::Align2::CENTER_CENTER,
                                    prim_name(p),
                                    egui::FontId::proportional(11.5),
                                    prim_color(p),
                                );
                            }
                        }
                    }
                }

                // rubber-band while pulling a relation
                if let Some(src) = self.connecting {
                    if let (Some(ps), Some(h)) = (self.pos_of(src), hover) {
                        let dir = (h - ps).normalized();
                        let a = ps + dir * RADIUS;
                        painter.line_segment([a, h], egui::Stroke::new(1.8, theme::ACCENT));
                        if let Some(tgt) = self.hit(h) {
                            if tgt != src {
                                if let Some(pt) = self.pos_of(tgt) {
                                    painter.circle_stroke(
                                        pt,
                                        RADIUS + 3.0,
                                        egui::Stroke::new(2.0, theme::ACCENT),
                                    );
                                }
                            }
                        } else if lens != Lens::Klir && ps.distance(h) > RADIUS * 2.0 {
                            // preview: dropping here births an environment square
                            let s = RADIUS * 0.82;
                            let sq = vec![
                                egui::pos2(h.x - s, h.y - s),
                                egui::pos2(h.x + s, h.y - s),
                                egui::pos2(h.x + s, h.y + s),
                                egui::pos2(h.x - s, h.y + s),
                            ];
                            painter.add(egui::Shape::convex_polygon(
                                sq,
                                egui::Color32::TRANSPARENT,
                                egui::Stroke::new(1.5, theme::ACCENT),
                            ));
                        }
                    }
                }

                // inline name editor
                let mut commit = false;
                if let Some(id) = editing {
                    if let Some(t) = self.things.iter_mut().find(|t| t.id == id) {
                        let er = egui::Rect::from_center_size(t.pos, egui::vec2(RADIUS * 1.7, 24.0));
                        let te = egui::TextEdit::singleline(&mut t.name)
                            .font(egui::FontId::proportional(13.5))
                            .horizontal_align(egui::Align::Center)
                            .frame(false)
                            .hint_text("name…");
                        let r = ui.put(er, te);
                        if self.focus_pending {
                            r.request_focus();
                            self.focus_pending = false;
                        }
                        if r.lost_focus() {
                            commit = true;
                        }
                    }
                }
                if commit {
                    if let Some(id) = self.editing {
                        let empty = self
                            .things
                            .iter()
                            .find(|t| t.id == id)
                            .map_or(false, |t| t.name.trim().is_empty());
                        if empty {
                            self.delete_thing(id);
                            self.selection = Selected::None;
                        }
                    }
                    self.editing = None;
                }

                // inline name editor for a relation (faithful from Klir — R is a *named* relation)
                let mut rel_commit = false;
                if let Some(rid) = self.editing_rel {
                    let mid = self.relations.iter().find(|r| r.id == rid).and_then(|r| {
                        match (self.pos_of(r.a), self.pos_of(r.b)) {
                            (Some(a), Some(b)) => Some(a + (b - a) * 0.5),
                            _ => None,
                        }
                    });
                    if let Some(mid) = mid {
                        if let Some(r) = self.relations.iter_mut().find(|r| r.id == rid) {
                            let er = egui::Rect::from_center_size(mid, egui::vec2(150.0, 24.0));
                            let te = egui::TextEdit::singleline(&mut r.name)
                                .font(egui::FontId::proportional(13.0))
                                .horizontal_align(egui::Align::Center)
                                .hint_text("name this relation…");
                            let r2 = ui.put(er, te);
                            if self.focus_pending {
                                r2.request_focus();
                                self.focus_pending = false;
                            }
                            if r2.lost_focus() {
                                rel_commit = true;
                            }
                        }
                    } else {
                        rel_commit = true;
                    }
                }
                if rel_commit {
                    self.editing_rel = None;
                }

                // lens-reading headline (top-left) — the same kernel, re-read in this lens's
                // vocabulary; the counts (the invariant) hold while the words change.
                let nt = self.things.len();
                let nr = self.relations.len();
                let (tn, rn) = match lens {
                    Lens::Klir => (
                        if nt == 1 { "thing" } else { "things" },
                        if nr == 1 { "relation" } else { "relations" },
                    ),
                    Lens::Bunge => (
                        if nt == 1 { "component" } else { "components" },
                        if nr == 1 { "bond" } else { "bonds" },
                    ),
                    Lens::Mobus => (
                        if nt == 1 { "component" } else { "components" },
                        if nr == 1 { "flow" } else { "flows" },
                    ),
                };
                let ox = rect.left() + 24.0;
                let oy = rect.top() + 20.0;
                painter.circle_filled(egui::pos2(ox + 5.0, oy + 13.0), 5.0, lens.color());
                painter.text(
                    egui::pos2(ox + 17.0, oy),
                    egui::Align2::LEFT_TOP,
                    format!("Reading as {}", lens.name()),
                    egui::FontId::proportional(19.0),
                    lens.color(),
                );
                painter.text(
                    egui::pos2(ox, oy + 32.0),
                    egui::Align2::LEFT_TOP,
                    format!("{} {} · {} {}", nt, tn, nr, rn),
                    egui::FontId::proportional(16.0),
                    theme::INK,
                );
                let mut cy = oy + 56.0;
                // Heap verdict from bert-core (validate_mode Structural via is_heap);
                // ≥2 components is the presentation trigger, preserving prior UX.
                let comp_count = self.things.iter().filter(|t| t.role == Role::Component).count();
                if lens == Lens::Bunge && comp_count >= 2 && self.is_heap(lens) {
                    painter.text(
                        egui::pos2(ox, cy),
                        egui::Align2::LEFT_TOP,
                        "⚠ a heap — components aren't bonded (a system needs ≥2 different connected things — Def 1.1)",
                        egui::FontId::proportional(12.0),
                        theme::WARN,
                    );
                    cy += 21.0;
                }
                if nt > 0 {
                    painter.text(
                        egui::pos2(ox, cy),
                        egui::Align2::LEFT_TOP,
                        "✓ one kernel — switch lenses: the counts hold, the words change",
                        egui::FontId::proportional(11.5),
                        theme::OK,
                    );
                }

                // center & bottom hints
                if self.things.is_empty() {
                    let c = rect.center();
                    painter.text(
                        c - egui::vec2(0.0, 16.0),
                        egui::Align2::CENTER_CENTER,
                        "An empty system",
                        egui::FontId::proportional(23.0),
                        theme::INK_SOFT,
                    );
                    painter.text(
                        c + egui::vec2(0.0, 14.0),
                        egui::Align2::CENTER_CENTER,
                        format!("Double-click anywhere to place your first {}.", lens.noun()),
                        egui::FontId::proportional(13.5),
                        theme::INK_FAINT,
                    );
                }
                // A loaded stamp takes over the hint line — the mapping gesture is the
                // active mode. Otherwise the usual selection hints.
                let stamp_hint: Option<String> = match self.stamp {
                    Some(Stamp::Prim(p)) => Some(format!(
                        "Stamp: {} — click a component to map it  ·  Esc / palette to unload",
                        prim_name(p)
                    )),
                    Some(Stamp::Erase) => {
                        Some("Erase: click a stamped component to clear its work process".to_string())
                    }
                    None => None,
                };
                let hint: Option<String> = stamp_hint.or_else(|| {
                    match self.selection {
                        Selected::Rel(_) => Some("2×click: name  ·  B: bond ⇄ relation  ·  K: kind  ·  ⌫ delete".to_string()),
                        Selected::Thing(_) => Some("double-click to rename  ·  ⌫ delete".to_string()),
                        Selected::None => {
                            if nr == 0 && nt >= 2 {
                                Some("Drag from a thing's edge to another to relate them.".to_string())
                            } else {
                                None
                            }
                        }
                    }
                });
                if let Some(h) = hint {
                    painter.text(
                        egui::pos2(rect.center().x, rect.bottom() - 24.0),
                        egui::Align2::CENTER_CENTER,
                        h,
                        egui::FontId::proportional(12.5),
                        theme::INK_FAINT,
                    );
                }
            });
    }
}

fn apply_theme(ctx: &egui::Context) {
    let mut v = egui::Visuals::light();
    v.override_text_color = Some(theme::INK);
    v.panel_fill = theme::BG;
    v.window_fill = theme::BG;
    v.extreme_bg_color = theme::SURFACE;
    ctx.set_visuals(v);
}

// STIX gives the Mathematical View real typeset glyphs. Two named families: "math" (upright) and
// "math-it" (italic) — egui's `.italics()` only shears the upright face, so a true italic needs its
// own font file. STIX Two Text covers letters; its operators/brackets (⟨ ⟩ ⊆ × ∅ ∩ ∪) live in STIX
// Two Math, chained as a glyph fallback. Math is also appended to the default fonts so the prose
// notes resolve the same symbols.
fn install_fonts(ctx: &egui::Context) {
    use egui::{FontData, FontDefinitions, FontFamily};
    let mut fonts = FontDefinitions::default();
    let fallback = fonts
        .families
        .get(&FontFamily::Proportional)
        .cloned()
        .unwrap_or_default();
    fonts.font_data.insert(
        "stix".to_owned(),
        std::sync::Arc::new(FontData::from_static(include_bytes!(
            "../assets/STIXTwoText-Regular.ttf"
        ))),
    );
    fonts.font_data.insert(
        "stix-it".to_owned(),
        std::sync::Arc::new(FontData::from_static(include_bytes!(
            "../assets/STIXTwoText-Italic.ttf"
        ))),
    );
    fonts.font_data.insert(
        "stix-math".to_owned(),
        std::sync::Arc::new(FontData::from_static(include_bytes!(
            "../assets/STIXTwoMath.ttf"
        ))),
    );
    let chain = |head: &str| {
        let mut v = vec![head.to_owned(), "stix-math".to_owned()];
        v.extend(fallback.iter().cloned());
        v
    };
    fonts
        .families
        .insert(FontFamily::Name("math".into()), chain("stix"));
    fonts
        .families
        .insert(FontFamily::Name("math-it".into()), chain("stix-it"));
    // give the default proportional/monospace fonts the same math fallback (notes, warnings).
    for family in [FontFamily::Proportional, FontFamily::Monospace] {
        fonts
            .families
            .entry(family)
            .or_default()
            .push("stix-math".to_owned());
    }
    ctx.set_fonts(fonts);
}

// Typeset helpers for the Mathematical View. Three registers: variable (italic serif, ink),
// content name (upright serif, ink), scaffolding — braces/operators/pairs (upright serif, faint).
const MATH_BODY: f32 = 15.0;

fn mfont(size: f32) -> egui::FontId {
    egui::FontId::new(size, egui::FontFamily::Name("math".into()))
}
fn ifont(size: f32) -> egui::FontId {
    egui::FontId::new(size, egui::FontFamily::Name("math-it".into()))
}
fn mrun(job: &mut egui::text::LayoutJob, text: &str, font: egui::FontId, color: egui::Color32) {
    job.append(
        text,
        0.0,
        egui::TextFormat {
            font_id: font,
            color,
            ..Default::default()
        },
    );
}
fn math_label(ui: &mut egui::Ui, mut job: egui::text::LayoutJob) {
    job.wrap.max_width = ui.available_width();
    ui.label(job);
}

fn soft_divider(ui: &mut egui::Ui) {
    ui.add_space(5.0);
    ui.separator();
    ui.add_space(9.0);
}

fn math_hero(ui: &mut egui::Ui, segs: &[(&str, bool)]) {
    let mut job = egui::text::LayoutJob::default();
    for (t, is_var) in segs {
        if *is_var {
            mrun(&mut job, t, ifont(24.0), theme::INK);
        } else {
            mrun(&mut job, t, mfont(24.0), theme::INK_FAINT);
        }
    }
    ui.add_space(2.0);
    math_label(ui, job);
}

fn math_set(ui: &mut egui::Ui, var: &str, members: &[String], member_var: bool) {
    let mut job = egui::text::LayoutJob::default();
    mrun(&mut job, var, ifont(MATH_BODY), theme::INK);
    mrun(&mut job, " = ", mfont(MATH_BODY), theme::INK_FAINT);
    if members.is_empty() {
        mrun(&mut job, "∅", mfont(MATH_BODY), theme::INK_FAINT);
    } else {
        mrun(&mut job, "{ ", mfont(MATH_BODY), theme::INK_FAINT);
        for (i, m) in members.iter().enumerate() {
            if i > 0 {
                mrun(&mut job, ", ", mfont(MATH_BODY), theme::INK_FAINT);
            }
            let f = if member_var { ifont(MATH_BODY) } else { mfont(MATH_BODY) };
            mrun(&mut job, m, f, theme::INK);
        }
        mrun(&mut job, " }", mfont(MATH_BODY), theme::INK_FAINT);
    }
    math_label(ui, job);
    ui.add_space(7.0);
}

fn math_pair(job: &mut egui::text::LayoutJob, a: &str, b: &str) {
    mrun(job, "(", mfont(MATH_BODY), theme::INK_FAINT);
    mrun(job, a, mfont(MATH_BODY), theme::INK);
    mrun(job, ", ", mfont(MATH_BODY), theme::INK_FAINT);
    mrun(job, b, mfont(MATH_BODY), theme::INK);
    mrun(job, ")", mfont(MATH_BODY), theme::INK_FAINT);
}

fn math_rel(ui: &mut egui::Ui, name: &str, pairs: &[(String, String)]) {
    let mut job = egui::text::LayoutJob::default();
    mrun(&mut job, name, ifont(MATH_BODY), theme::INK);
    mrun(&mut job, " = ", mfont(MATH_BODY), theme::INK_FAINT);
    mrun(&mut job, "{ ", mfont(MATH_BODY), theme::INK_FAINT);
    for (i, (a, b)) in pairs.iter().enumerate() {
        if i > 0 {
            mrun(&mut job, ", ", mfont(MATH_BODY), theme::INK_FAINT);
        }
        math_pair(&mut job, a, b);
    }
    mrun(&mut job, " }", mfont(MATH_BODY), theme::INK_FAINT);
    math_label(ui, job);
    ui.add_space(7.0);
}

fn math_gathered(ui: &mut egui::Ui, var: &str, labels: &[String], pairs: &[(String, String)]) {
    let mut job = egui::text::LayoutJob::default();
    mrun(&mut job, var, ifont(MATH_BODY), theme::INK);
    mrun(&mut job, " = ", mfont(MATH_BODY), theme::INK_FAINT);
    if labels.is_empty() && pairs.is_empty() {
        mrun(&mut job, "∅", mfont(MATH_BODY), theme::INK_FAINT);
        math_label(ui, job);
        ui.add_space(7.0);
        return;
    }
    mrun(&mut job, "{ ", mfont(MATH_BODY), theme::INK_FAINT);
    let mut first = true;
    for l in labels {
        if !first {
            mrun(&mut job, ", ", mfont(MATH_BODY), theme::INK_FAINT);
        }
        first = false;
        mrun(&mut job, l, ifont(MATH_BODY), theme::INK);
    }
    for (a, b) in pairs {
        if !first {
            mrun(&mut job, ", ", mfont(MATH_BODY), theme::INK_FAINT);
        }
        first = false;
        math_pair(&mut job, a, b);
    }
    mrun(&mut job, " }", mfont(MATH_BODY), theme::INK_FAINT);
    math_label(ui, job);
    ui.add_space(7.0);
}

fn math_note(ui: &mut egui::Ui, s: &str) {
    ui.add_space(10.0);
    ui.label(egui::RichText::new(s).small().color(theme::INK_FAINT));
}

/// Headless run mode (bert-lenses#38): `bert-lenses run <manifest.json>` executes
/// a declared run with no GUI — the SAME load path, the SAME mapping gates
/// (T1/T2/T4 refuse with the wizard's own messages), the SAME projection and
/// ledger. The manifest is the wizard's one deliberate mapping ritual,
/// serialized; nothing here is a second path that could drift. The appended
/// ledger line carries the manifest's file hash, so `ledger line → manifest →
/// rerun` closes the reproducibility loop.
#[cfg(not(target_arch = "wasm32"))]
fn headless_run(manifest_path: &std::path::Path) -> Result<String, String> {
    let raw = std::fs::read_to_string(manifest_path)
        .map_err(|e| format!("could not read manifest {}: {e}", manifest_path.display()))?;
    let mf: manifest::RunManifest =
        serde_json::from_str(&raw).map_err(|e| format!("not a run manifest: {e}"))?;
    let mf_hash = manifest::manifest_hash(&raw);

    let mut app = CanvasApp::default();
    let base = manifest_path.parent().map(|p| p.to_path_buf()).unwrap_or_default();
    let lib = app.lib_dir();
    // Paths resolve absolute → manifest-relative → library-relative, loudly.
    let resolve = |rel: &str| -> Result<std::path::PathBuf, String> {
        let p = std::path::Path::new(rel);
        if p.is_absolute() {
            return if p.exists() {
                Ok(p.to_path_buf())
            } else {
                Err(format!("\"{rel}\" does not exist"))
            };
        }
        for cand in [base.join(rel), lib.join(rel)] {
            if cand.exists() {
                return Ok(cand);
            }
        }
        Err(format!(
            "\"{rel}\" not found beside the manifest ({}) or in the library ({})",
            base.display(),
            lib.display()
        ))
    };

    let model_path = resolve(&mf.model)?;
    app.load_path(&model_path);
    if let Some(e) = app.gen_error.take() {
        return Err(format!("model did not load: {e}"));
    }
    if app.things.is_empty() {
        return Err(format!("{} loaded but holds no model elements", model_path.display()));
    }

    let data_path = resolve(&mf.data)?;
    let csv = std::fs::read_to_string(&data_path)
        .map_err(|e| format!("could not read CSV {}: {e}", data_path.display()))?;
    let (headers, rows) =
        tether::parse_csv(&csv).map_err(|e| format!("CSV did not parse: {e:?}"))?;
    let file_name = data_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("data.csv")
        .to_string();
    let mut draft = MappingDraft::new(file_name, headers, rows);

    // Name→id tables from the live model, using the SAME labels the app shows —
    // manifests speak domain names, resolution is strict (no silent misbind).
    let flows: Vec<(u64, String)> = app
        .relations
        .iter()
        .filter(|r| r.is_bond)
        .map(|r| (r.id, app.flow_label(r)))
        .collect();
    let comps: Vec<(u64, String)> = app
        .things
        .iter()
        .filter(|t| t.role == Role::Component)
        .map(|t| (t.id, t.name.clone()))
        .collect();
    mf.apply_to_draft(&mut draft, &manifest::ResolveCtx { flows: &flows, components: &comps })
        .map_err(|errs| format!("manifest does not bind to the model:\n  {}", errs.join("\n  ")))?;

    // The gates — exactly the three the wizard's Finish button is disabled by.
    let mut refusals: Vec<String> = Vec::new();
    if !draft.is_total() {
        for (i, a) in draft.assignments.iter().enumerate() {
            if !a.resolved() {
                refusals.push(format!(
                    "column \"{}\" is {} — every column must be spoken for",
                    draft.headers[i],
                    a.role_word()
                ));
            }
        }
    }
    if let Err(e) = draft.units_ok() {
        refusals.push(e);
    }
    if let Err(e) = draft.time_unique_ok() {
        refusals.push(e);
    }
    // Series forcing (#16) binds only to flow columns — a force on a stock/param
    // would silently find no flow id, so refuse it loudly (no silent misbind).
    for m in &mf.mapping {
        if m.force && m.role != manifest::Role::Flow {
            refusals.push(format!(
                "column \"{}\" is marked force but is not a flow — only a flow's \
                 series can be emitted tick by tick",
                m.column
            ));
        }
    }
    if !refusals.is_empty() {
        return Err(format!("import refused:\n  {}", refusals.join("\n  ")));
    }

    let stamp = tether::today_stamp();
    // `apply_to_draft` set the draft's force flags from the manifest, so commit
    // populates `data.forced` — one path shared with the wizard (#16).
    let data = {
        let name_of = |id: u64| app.tether_name_of(id);
        draft.commit(stamp, &name_of)
    };
    // Longest forced series = the data horizon; ticks past it are projection (#34).
    let data_horizon = data
        .forced
        .iter()
        .filter_map(|rid| data.flow_series.get(rid))
        .map(|s| s.present().len())
        .max()
        .unwrap_or(0);
    app.imported = Some(data);

    let dt = draft.dt_text.trim().parse::<f64>().unwrap_or(1.0);
    if dt <= 0.0 || mf.t <= 0.0 {
        return Err(format!("Δt ({dt}) and T ({}) must be positive", mf.t));
    }

    // Surface projection refusals with their reasons (run_model swallows them).
    let wm = app.world_model(Lens::Mobus);
    if let Err(errs) = validate_operational(&wm) {
        return Err(format!(
            "model does not project to a runnable spec:\n  {}",
            errs.iter()
                .map(|e| format!("{}: {}", e.location, e.reason))
                .collect::<Vec<_>>()
                .join("\n  ")
        ));
    }

    let res = app
        .run_model(Lens::Mobus, dt, mf.t)
        .ok_or_else(|| "the run failed to record".to_string())?;
    let comparisons = app.comparisons(&res);
    let model_name = app
        .current_model_name
        .clone()
        .unwrap_or_else(|| "untitled".to_string());
    let (declared, mut prov) = app.ledger_extras();
    if let Some(p) = prov.as_mut() {
        p.manifest_hash = Some(mf_hash.clone());
    }
    let line = ledger_line(&res, &comparisons, &model_name, declared, prov);
    ledger::append_summary(&ledger::default_runs_dir(), &line)
        .map_err(|e| format!("the run completed but the ledger append failed: {e}"))?;

    // The verdict, in the run panel's own voice.
    let residual_note = if res.residual_relative() < 1e-9 {
        "residual 0 (balanced)".to_string()
    } else {
        format!("residual {:.1e} of throughput", res.residual_relative())
    };
    let mut out = format!(
        "{model_name} · Δt {dt}, T {} ({} ticks) · {residual_note} · behavior set {} of {}\n",
        mf.t,
        res.ticks,
        res.identity_default_m - res.identity_default_n,
        res.identity_default_m,
    );
    let mut divs: Vec<(f32, String, String)> = comparisons
        .iter()
        .filter_map(|c| c.divergence_pct().map(|p| (p, c.element_name.clone(), c.unit.clone())))
        .collect();
    divs.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap_or(std::cmp::Ordering::Equal));
    if divs.is_empty() {
        out.push_str("no tethered elements to compare — ran clean, nothing measured\n");
    } else {
        for (pct, name, _unit) in &divs {
            out.push_str(&format!("  {:>8.1}% off reality at horizon · {name}\n", pct));
        }
    }
    // Data-horizon marker (#34): once the run outlasts the forced series, the
    // last observation is held — that tail is projection, not error.
    if data_horizon > 0 && (res.ticks as usize) > data_horizon {
        out.push_str(&format!(
            "  ⓘ ticks {}–{} are past the data horizon ({} observed) — projection, last value held\n",
            data_horizon + 1,
            res.ticks,
            data_horizon,
        ));
    }
    out.push_str(&format!(
        "ledger: {} (manifest {mf_hash})",
        ledger::default_runs_dir().join("ledger.jsonl").display()
    ));
    Ok(out)
}

fn main() -> eframe::Result<()> {
    // Headless convert mode: `canvas convert <spec.json> <out.json>` runs the SAME model_from_spec
    // the GUI uses — one source of truth for the spec→Model distillation, no parallel reimplementation.
    let args: Vec<String> = std::env::args().collect();
    // Headless run mode (bert-lenses#38): `bert-lenses run <manifest.json>` — see `headless_run`.
    #[cfg(not(target_arch = "wasm32"))]
    if args.len() >= 3 && args[1] == "run" {
        match headless_run(std::path::Path::new(&args[2])) {
            Ok(summary) => {
                println!("{summary}");
                std::process::exit(0);
            }
            Err(e) => {
                eprintln!("run refused: {e}");
                std::process::exit(1);
            }
        }
    }
    if args.len() >= 4 && args[1] == "convert" {
        let raw = std::fs::read_to_string(&args[2]).expect("read spec");
        let v: serde_json::Value = serde_json::from_str(&raw).expect("parse spec");
        let spec = v.get("spec").cloned().unwrap_or(v); // accept a /extract response or a bare spec
        let (things, relations, next_id) = model_from_spec(&spec);
        let model = Model { lens: Lens::Bunge, next_id, things, relations, source_spec: Some(spec), imported: None };
        std::fs::write(&args[3], serde_json::to_string_pretty(&model).expect("serialize"))
            .expect("write model");
        eprintln!("wrote {} ({} things, {} relations)", args[3], model.things.len(), model.relations.len());
        std::process::exit(0);
    }

    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1100.0, 720.0])
            .with_title("bert-lenses — author"),
        ..Default::default()
    };
    eframe::run_native(
        "bert-lenses — author",
        options,
        Box::new(|cc| {
            install_fonts(&cc.egui_ctx);
            Ok(Box::new(CanvasApp {
                show_math: true,
                ..Default::default()
            }))
        }),
    )
}

/// Headless typed-ops spike (bert-lenses#9): authors models through a typed-op
/// vocabulary with no canvas, to report whether that vocabulary is complete.
/// Test-only — compiled solely under `cfg(test)`, no production path touched.
#[cfg(test)]
mod typed_ops_spike;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn humanize_scales_and_keeps_precision() {
        assert_eq!(humanize(70_866_993_938_432.0), "70.9T");
        assert_eq!(humanize(1_500_000_000.0), "1.5B");
        assert_eq!(humanize(2_230_133.0), "2.2M");
        assert_eq!(humanize(27.55), "27.55");
        assert_eq!(humanize(1.0), "1.00");
        assert_eq!(humanize(0.05), "0.05");
        assert_eq!(humanize(0.0), "0");
        assert_eq!(humanize(-3400.0), "-3.4K");
        assert_eq!(humanize_unit(70_866_993_938_432.0, "tokens/month"), "70.9T tokens/month");
        assert_eq!(humanize_unit(0.05, ""), "0.05");
    }

    #[test]
    fn spec_distills_to_kernel() {
        let spec = serde_json::json!({
            "subsystems": [{"name": "Pump"}, {"name": "Tank"}],
            "sources": [{"name": "Reservoir"}],
            "sinks": [{"name": "Drain"}],
            "routing_table": [
                {"interface": "Intake", "type": "Import", "connected_to": "Reservoir", "target_subsystem": "Pump"},
                {"interface": "Outlet", "type": "Export", "connected_to": "Drain", "target_subsystem": "Tank"}
            ],
            "internal_flows": [
                {"name": "Pressurized Water", "source": "Pump", "sink": "Tank", "substance": {"type": "Material"}}
            ],
            "external_flows": [
                {"name": "Raw Water", "interface": "Intake", "substance": {"type": "Material"}},
                {"name": "Overflow", "interface": "Outlet", "substance": {"type": "Material"}}
            ]
        });
        let (things, relations, next_id) = model_from_spec(&spec);
        // 2 components + 2 environment things
        assert_eq!(things.len(), 4);
        assert_eq!(things.iter().filter(|t| t.role == Role::Component).count(), 2);
        assert_eq!(things.iter().filter(|t| t.role == Role::Environment).count(), 2);
        assert_eq!(next_id, 5);
        // 1 internal + 2 external = 3 directed bonds, all Matter
        assert_eq!(relations.len(), 3);
        assert!(relations.iter().all(|r| r.is_bond && r.kind == Kind::Matter));
        // Import is env->component; Export is component->env
        let pump = things.iter().find(|t| t.name == "Pump").unwrap().id;
        let reservoir = things.iter().find(|t| t.name == "Reservoir").unwrap().id;
        let raw = relations.iter().find(|r| r.name == "Raw Water").unwrap();
        assert_eq!((raw.a, raw.b), (reservoir, pump), "Import should flow env->component");
        // positions assigned (not at origin)
        assert!(things.iter().all(|t| t.pos != egui::Pos2::ZERO));
    }

    #[test]
    fn apply_spec_populates_kernel_and_preserves_provenance() {
        let spec = serde_json::json!({
            "system": {"name": "Widget"},
            "subsystems": [{"name": "A"}, {"name": "B"}],
            "sources": [{"name": "Env"}],
            "sinks": [],
            "routing_table": [{"interface": "In", "type": "Import", "connected_to": "Env", "target_subsystem": "A", "has_processor": true}],
            "internal_flows": [{"name": "Link", "source": "A", "sink": "B", "substance": {"type": "Message"}}],
            "external_flows": [{"name": "Feed", "interface": "In", "substance": {"type": "Material"}, "usability": "Resource"}]
        });
        let mut app = CanvasApp::default();
        assert!(app.apply_spec(spec.clone()));
        // kernel populated
        assert_eq!(app.things.len(), 3); // A, B, Env
        assert_eq!(app.relations.len(), 2); // 1 internal + 1 external
        assert!(matches!(app.lens, Some(Lens::Bunge))); // landed in a renderable lens
        // provenance pass-through: the Mobus-only fields the canvas doesn't render are retained verbatim
        let ss = app.source_spec.as_ref().expect("source_spec recorded");
        assert_eq!(ss["external_flows"][0]["usability"], "Resource");
        assert_eq!(ss["routing_table"][0]["has_processor"], true);
        assert_eq!(ss["system"]["name"], "Widget");
    }

    #[test]
    fn load_json_sniffs_model_vs_extract_response() {
        // A /extract response ({spec, repairs, warnings}) loads via the spec branch.
        let response = r#"{"repairs":[],"warnings":[],"spec":{
            "system":{"name":"X"},"subsystems":[{"name":"A"},{"name":"B"}],"sources":[{"name":"Env"}],"sinks":[],
            "routing_table":[{"interface":"In","type":"Import","connected_to":"Env","target_subsystem":"A"}],
            "internal_flows":[{"name":"L","source":"A","sink":"B","substance":{"type":"Energy"}}],
            "external_flows":[{"name":"F","interface":"In","substance":{"type":"Material"}}]}}"#;
        let mut app = CanvasApp::default();
        app.load_json(response);
        assert_eq!(app.things.len(), 3);
        assert!(app.gen_error.is_none());
        assert!(app.source_spec.is_some());
        // A saved canvas Model round-trips via the Model branch (and keeps its lens).
        let model_json = serde_json::to_string(&Model {
            lens: Lens::Mobus, next_id: 3,
            things: vec![Thing { id: 1, name: "T".into(), pos: egui::Pos2::ZERO, role: Role::Component, primitive: None }],
            relations: vec![], source_spec: None, imported: None,
        }).unwrap();
        let mut app2 = CanvasApp::default();
        app2.load_json(&model_json);
        assert!(matches!(app2.lens, Some(Lens::Mobus)));
        assert_eq!(app2.things.len(), 1);
    }

    #[test]
    fn apply_spec_rejects_empty() {
        let mut app = CanvasApp::default();
        assert!(!app.apply_spec(serde_json::json!({"subsystems": [], "sources": [], "sinks": []})));
    }

    #[test]
    fn substance_maps_to_bunge_flow_kinds() {
        assert_eq!(substance_to_kind("Material"), Kind::Matter);
        assert_eq!(substance_to_kind("Energy"), Kind::Energy);
        assert_eq!(substance_to_kind("Message"), Kind::Informational);
        assert_eq!(substance_to_kind("whatever"), Kind::Unspecified);
    }

    fn thing(id: u64, role: Role) -> Thing {
        Thing { id, name: format!("t{id}"), pos: egui::Pos2::ZERO, role, primitive: None }
    }

    #[test]
    fn klir_layout_is_a_tidy_distinct_grid() {
        let mut ts = vec![thing(1, Role::Component), thing(2, Role::Environment), thing(3, Role::Component), thing(4, Role::Environment)];
        layout(Lens::Klir, &mut ts, egui::pos2(500.0, 350.0));
        // every position distinct (no sprawl/overlap) and non-origin
        for i in 0..ts.len() {
            assert!(ts[i].pos != egui::Pos2::ZERO);
            for j in (i + 1)..ts.len() {
                assert!(ts[i].pos.distance(ts[j].pos) > RADIUS, "grid cells must not overlap");
            }
        }
    }

    #[test]
    fn bunge_and_mobus_put_components_inside_environment() {
        let center = egui::pos2(500.0, 350.0);
        for lens in [Lens::Bunge, Lens::Mobus] {
            let mut ts = vec![thing(1, Role::Component), thing(2, Role::Component), thing(3, Role::Environment)];
            layout(lens, &mut ts, center);
            let comp_max = ts.iter().filter(|t| t.role == Role::Component).map(|t| t.pos.distance(center)).fold(0.0_f32, f32::max);
            let env_min = ts.iter().filter(|t| t.role == Role::Environment).map(|t| t.pos.distance(center)).fold(f32::MAX, f32::min);
            assert!(comp_max < env_min, "components must sit inside the environment");
        }
    }

    // ── The bert-core seam (Gate 1) ──────────────────────────────────────

    fn comp(id: u64, name: &str) -> Thing {
        Thing { id, name: name.to_string(), pos: egui::pos2(0.0, 0.0), role: Role::Component, primitive: None }
    }
    fn env(id: u64, name: &str) -> Thing {
        Thing { id, name: name.to_string(), pos: egui::pos2(0.0, 0.0), role: Role::Environment, primitive: None }
    }
    fn rel(id: u64, a: u64, b: u64, is_bond: bool, kind: Kind) -> Relation {
        Relation { id, a, b, name: String::new(), is_bond, kind }
    }

    fn has_representational_refusal(errs: &[bert_core::operational::OperationalError]) -> bool {
        errs.iter().any(|e| e.location == "mode" && e.reason.contains("representational rung"))
    }

    /// The source-authoring gesture (Shift held on rim-drag-to-empty): the born
    /// bond's endpoints reverse, env→component, matching the origination
    /// convention `to_world_model` reads to classify a Source.
    #[test]
    fn env_bond_endpoints_shift_births_a_source() {
        assert_eq!(env_bond_endpoints(1, 2, false), (1, 2)); // default: Sink
        assert_eq!(env_bond_endpoints(1, 2, true), (2, 1)); // Shift: Source
    }

    /// The projection is always a clean, on- Core model — no matter the lens —
    /// so switching lenses never manufactures a validation defect.
    #[test]
    fn projection_is_always_a_clean_core_model() {
        // env(1) originates a bond into component(2): classified Source, referenced.
        let things = vec![env(1, "Well"), comp(2, "Tank"), env(3, "Drain")];
        let rels = vec![rel(1, 1, 2, true, Kind::Matter), rel(2, 2, 3, true, Kind::Matter)];
        for lens in [Lens::Klir, Lens::Bunge, Lens::Mobus] {
            let wm = to_world_model(&things, &rels, lens);
            assert!(
                !bert_core::validate::validate(&wm).has_errors(),
                "{lens:?} projection must validate clean: {:#?}",
                bert_core::validate::validate(&wm).issues
            );
        }
        // Directionally classified: Well originates → Source; Drain only receives → Sink.
        let wm = to_world_model(&things, &rels, Lens::Mobus);
        assert_eq!(wm.environment.sources.len(), 1);
        assert_eq!(wm.environment.sinks.len(), 1);
        assert_eq!(wm.environment.sources[0].info.name, "Well");
        assert_eq!(wm.environment.sinks[0].info.name, "Drain");
    }

    /// The Structural verdict is bert-core's `check_bond`, and it tracks bonds
    /// only: a bond between two components enters Structural; nothing, or a mere
    /// relation (B̄), reads as a heap.
    #[test]
    fn structural_verdict_tracks_bonds_not_mere_relations() {
        let things = vec![comp(1, "A"), comp(2, "B")];

        let none = to_world_model(&things, &[], Lens::Bunge);
        assert!(validate_mode(&none, Mode::Structural).has_errors(), "no bond ⇒ heap");

        let bonded = to_world_model(&things, &[rel(1, 1, 2, true, Kind::Unspecified)], Lens::Bunge);
        assert!(!validate_mode(&bonded, Mode::Structural).has_errors(), "a bond ⇒ system");

        // B̄ carries a relation but not systemhood; it must not license Structural.
        let mere = to_world_model(&things, &[rel(1, 1, 2, false, Kind::Unspecified)], Lens::Bunge);
        assert!(validate_mode(&mere, Mode::Structural).has_errors(), "a mere relation stays a heap");
        assert!(mere.interactions.is_empty(), "B̄ is not projected as an interaction");
    }

    /// The mode stamp makes `validate_operational`'s representational refusal fire
    /// on a Core/Structural export — a canvas Klir/Bunge model is not executable.
    #[test]
    fn core_and_structural_exports_are_refused_at_the_representational_gate() {
        let things = vec![comp(1, "A"), comp(2, "B")];
        let rels = vec![rel(1, 1, 2, true, Kind::Unspecified)];
        for lens in [Lens::Klir, Lens::Bunge] {
            let wm = to_world_model(&things, &rels, lens);
            assert_eq!(wm.mode(), lens.mode(), "export stamps the authored rung");
            let errs = bert_core::operational::validate_operational(&wm)
                .expect_err("a representational rung must be refused");
            assert!(
                has_representational_refusal(&errs),
                "{lens:?} export must be refused at the representational mode gate: {errs:#?}"
            );
        }
    }

    /// A Mobus-authored model (source → component → sink, direct process-endpoint
    /// flows, no B̄, no self-loop) *clears* the representational gate — the mode
    /// stamp is Operational, so the Core/Structural refusal does not fire.
    ///
    /// It does not yet *fully* project: the component carries no Mobus work-process
    /// primitive, so `validate_operational` still reports that gap. Attaching a
    /// primitive is the component → work-process mapping deferred to a later arc
    /// (bert#108) — the gate here is the representational refusal, which is absent.
    #[test]
    fn mobus_export_clears_the_representational_gate() {
        let things = vec![env(1, "Well"), comp(2, "Tank"), env(3, "Drain")];
        let rels = vec![rel(1, 1, 2, true, Kind::Matter), rel(2, 2, 3, true, Kind::Matter)];
        let wm = to_world_model(&things, &rels, Lens::Mobus);
        assert_eq!(wm.mode(), Mode::Operational);
        // It clears the representational gate whether or not other operational
        // requirements (agent primitives, bert#108) are met.
        let refused_representationally = match bert_core::operational::validate_operational(&wm) {
            Ok(_) => false,
            Err(errs) => has_representational_refusal(&errs),
        };
        assert!(
            !refused_representationally,
            "a Mobus-authored model must clear the representational gate"
        );
        // The Operational rung's own structural precondition (irreflexivity, on-ness)
        // is satisfied — the flows are direct and acyclic.
        assert!(!validate_mode(&wm, Mode::Operational).has_errors());
    }

    /// The carry-layer projection (tether #13): an imported flow amount, initial
    /// stock, and parameter reach the `OperationalSpec` — proving `amount = ONE`
    /// is now a fallback, not a ceiling. With empty params the same model projects
    /// the old defaults, so imported reality is a floor over them.
    #[test]
    fn imported_parameters_reach_the_operational_spec() {
        use tether::ModelParams;
        // Well(1) → Tank(2, Buffering) → Drain(3): the smallest runnable Mobus model.
        let mut tank = comp(2, "Tank");
        tank.primitive = Some(ProcessPrimitive::Buffering);
        let things = vec![env(1, "Well"), tank, env(3, "Drain")];
        let rels = vec![rel(1, 1, 2, true, Kind::Matter), rel(2, 2, 3, true, Kind::Matter)];

        // Default projection: the flow rides at amount = 1, the component is bare.
        let plain = bert_core::operational::validate_operational(&to_world_model(
            &things,
            &rels,
            Lens::Mobus,
        ))
        .expect("projects clean");
        assert_eq!(plain.flows[0].amount, 1.0, "the default amount is ONE");
        assert!(plain.processes[0].initial_storage.is_none());
        assert!(plain.processes[0].cognitive_params.is_empty());

        // Supplied projection: relation 1's amount, thing 2's stock + parameter.
        let mut params = ModelParams::default();
        params.flow_amount.insert(1, 42.0);
        params.stock_initial.insert(2, 500.0);
        params.component_param.insert(2, ("k".to_string(), 0.3));
        let supplied = bert_core::operational::validate_operational(&to_world_model_with(
            &things,
            &rels,
            Lens::Mobus,
            &params,
        ))
        .expect("projects clean");
        assert_eq!(supplied.flows[0].amount, 42.0, "the imported amount reaches the spec");
        assert_eq!(supplied.processes[0].initial_storage, Some(500.0));
        assert_eq!(supplied.processes[0].cognitive_params.get("k"), Some(&0.3));
        // And the identity-default disclosure flips honestly: this component is no
        // longer bare (it carries an imported stock + param).
        assert!(
            !supplied.processes[0].cognitive_params.is_empty()
                || supplied.processes[0].initial_storage.is_some(),
            "an imported component is not at identity default"
        );
    }

    /// #25 + #27 end-to-end: a hoarding run's flow comparison reads the EXECUTED
    /// emission (not the declared mean — the 2026-07-13 session receipt: a
    /// Buffering market hoarded 95% of throughput and the divergence figure did
    /// not move), the declared mean survives as the labeled baseline, and the
    /// auto ledger line reproduces the panel's final-state numbers plus the
    /// declared params and import provenance — so an external reader needs no
    /// screen-scrape.
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn run_comparison_and_ledger_read_the_executed_run() {
        use std::collections::HashMap;
        let mut tank = comp(2, "Tank");
        tank.primitive = Some(ProcessPrimitive::Buffering);
        let mut app = CanvasApp::default();
        app.things = vec![env(1, "Well"), tank, env(3, "Drain")];
        app.relations = vec![rel(1, 1, 2, true, Kind::Matter), rel(2, 2, 3, true, Kind::Matter)];

        // Empirical H on the Tank→Drain flow (declared mean 20) plus a small
        // release_rate, so the run holds stock instead of clearing: the executed
        // emission must sit far below the declared amount.
        let mut flow_series = HashMap::new();
        flow_series.insert(
            2u64,
            tether::ColumnSeries {
                column: "tokens".to_string(),
                element_name: "Tank → Drain".to_string(),
                unit: "tokens/mo".to_string(),
                values: vec![Some(10.0), Some(20.0), Some(30.0)],
            },
        );
        let mut param_series = HashMap::new();
        param_series.insert(
            2u64,
            tether::ColumnSeries {
                column: "release_rate".to_string(),
                element_name: "Tank".to_string(),
                unit: String::new(),
                values: vec![Some(0.05)],
            },
        );
        app.imported = Some(tether::ImportedData {
            source_file: "market.csv".to_string(),
            imported_at: "2026-07-13".to_string(),
            dt: 1.0,
            time: vec![Some(1.0), Some(2.0), Some(3.0)],
            flow_series,
            stock_series: HashMap::new(),
            param_series,
            forced: Default::default(),
            stride: Default::default(),
        });

        let res = app.run_model(Lens::Mobus, 1.0, 10.0).expect("the model runs");
        let comparisons = app.comparisons(&res);
        let flow = comparisons.iter().find(|c| c.kind == "flow").expect("a flow comparison");

        let declared_mean = 20.0_f32;
        assert_eq!(
            flow.baseline.as_ref().map(|b| b[0]),
            Some(declared_mean),
            "the declared mean survives as the baseline trace"
        );
        let executed_at_horizon = *flow.simulated.last().expect("executed series is non-empty");
        assert!(
            executed_at_horizon < declared_mean * 0.5,
            "the sim trace is the executed (hoarding) flow, not the declared amount: \
             got {executed_at_horizon} against declared {declared_mean}"
        );

        // The auto ledger line reproduces the panel's numbers and names its own data.
        let (declared, prov) = app.ledger_extras();
        let line = ledger_line(&res, &comparisons, "test", declared, prov);
        let levels = line.levels.expect("the line carries final levels");
        assert_eq!(levels.len(), res.levels.len());
        for (le, lr) in levels.iter().zip(res.levels.iter()) {
            assert_eq!(le.name, lr.name);
            assert_eq!(le.value, lr.value, "ledger level for {} matches the panel", le.name);
            assert_eq!(le.category, lr.category.header());
        }
        let dp = line.declared_params.expect("declared params ride the line");
        assert_eq!(dp.flow_amounts[0].1, 20.0, "the declared flow amount is recorded");
        assert_eq!(
            dp.component_params[0],
            ("Tank".to_string(), "release_rate".to_string(), 0.05)
        );
        let p = line.provenance.expect("provenance rides the line");
        assert_eq!(p.source_file, "market.csv");
        assert!(
            p.mapped.iter().any(|m| m.contains("tokens → flow magnitude")),
            "the mapping sentences name the columns: {:?}",
            p.mapped
        );
    }

    // ── Arc 4.1: the read-only consistency audit ─────────────────────────

    /// A canvas holding a source → component → sink chain, reusable across the
    /// audit tests. Two components bonded to environment terminals.
    fn audit_app() -> CanvasApp {
        CanvasApp {
            things: vec![env(1, "Well"), comp(2, "Tank"), comp(3, "Pump"), env(4, "Drain")],
            relations: vec![
                rel(1, 1, 2, true, Kind::Matter), // Well → Tank
                rel(2, 2, 3, true, Kind::Matter), // Tank → Pump
                rel(3, 3, 4, true, Kind::Matter), // Pump → Drain
            ],
            ..Default::default()
        }
    }

    /// Klir and Bunge are representational rungs: the audit's headline is the mode
    /// refusal, quoting bert-core's reason — not a per-component defect.
    #[test]
    fn audit_surfaces_representational_refusal_for_core_and_structural() {
        let app = audit_app();
        for lens in [Lens::Klir, Lens::Bunge] {
            let report = app.audit(lens);
            let mode_err = report
                .mode_error
                .as_ref()
                .unwrap_or_else(|| panic!("{lens:?} must be refused at the mode gate"));
            assert_eq!(mode_err.location, "mode");
            assert!(
                mode_err.reason.contains("representational rung"),
                "{lens:?} headline must be the representational refusal: {mode_err:?}"
            );
            assert!(!report.fully_green(), "a refused rung is never fully green");
        }
    }

    /// Mobus clears the mode gate but still shows operational gaps: each projected
    /// component carries no work-process primitive (bert#108), so it reads red with
    /// bert-core's verbatim reason. The audit stays honest about partial progress.
    #[test]
    fn audit_surfaces_operational_gaps_for_mobus() {
        let report = audit_app().audit(Lens::Mobus);
        assert!(report.mode_error.is_none(), "Mobus clears the representational gate");
        assert_eq!(report.mode, Mode::Operational);
        assert_eq!(report.components.len(), 2, "Tank and Pump project as components");
        assert!(
            report.components.iter().all(|c| c
                .errors
                .iter()
                .any(|e| e.reason.contains("no agent model"))),
            "each component lacks a work-process primitive: {:#?}",
            report.components
        );
        assert!(!report.fully_green(), "operational gaps remain until 4.2");
        assert!(report.clear < report.total, "the tally reflects partial progress");
    }

    /// The audit is read-only: running it leaves the canvas things and relations
    /// byte-for-byte unchanged. (The `&self` signature is the compile-time proof;
    /// this is the behavioral witness.)
    #[test]
    fn audit_never_mutates_canvas_state() {
        let app = audit_app();
        let things_before = serde_json::to_string(&app.things).unwrap();
        let rels_before = serde_json::to_string(&app.relations).unwrap();
        for lens in [Lens::Klir, Lens::Bunge, Lens::Mobus] {
            let _ = app.audit(lens);
        }
        assert_eq!(things_before, serde_json::to_string(&app.things).unwrap());
        assert_eq!(rels_before, serde_json::to_string(&app.relations).unwrap());
    }

    /// The step-4 guard (Gate 2 diagnosis): every canvas node must land on exactly
    /// one panel line, and a flow error that derives from a component's own row is
    /// folded into it, not left standing alone.
    ///
    /// Canvas: two bonded components (Tank, Pump), one bonded env thing (Well → a
    /// Source terminal), one unbonded env thing (Ghost → dropped), one unbonded
    /// component (Orphan → still a projected row).
    #[test]
    fn audit_accounts_for_every_canvas_node_and_folds_derivative_flows() {
        let app = CanvasApp {
            things: vec![
                env(1, "Well"),
                comp(2, "Tank"),
                comp(3, "Pump"),
                env(5, "Ghost"),
                comp(6, "Orphan"),
            ],
            relations: vec![
                rel(1, 1, 2, true, Kind::Matter), // Well → Tank
                rel(2, 2, 3, true, Kind::Matter), // Tank → Pump
            ],
            ..Default::default()
        };
        let report = app.audit(Lens::Mobus);

        // Invariant: every canvas thing maps to exactly one panel line, across the
        // three node-bearing sections (component rows, terminal lines, unprojected).
        assert_eq!(
            report.components.len() + report.terminals.len() + report.unprojected.len(),
            app.things.len(),
            "every canvas node must be accounted for exactly once"
        );
        let mut accounted: Vec<String> = report
            .components
            .iter()
            .map(|c| c.name.clone())
            .chain(report.terminals.iter().map(|t| t.name.clone()))
            .chain(report.unprojected.iter().map(|(n, _)| n.clone()))
            .collect();
        accounted.sort();
        let mut expected: Vec<String> =
            app.things.iter().map(|t| t.name.clone()).collect();
        expected.sort();
        assert_eq!(accounted, expected, "the panel's nodes are exactly the canvas nodes");

        // The unbonded env thing is disclosed with its reason, not silently dropped.
        assert!(
            report
                .unprojected
                .iter()
                .any(|(n, reason)| n == "Ghost" && reason.contains("no bond")),
            "the unbonded env thing must surface in the unprojected disclosure: {:#?}",
            report.unprojected
        );
        // The bonded env thing became a terminal, not an error.
        assert!(
            report.terminals.iter().any(|t| t.name == "Well" && t.is_source),
            "the bonded env thing must be an environment terminal: {:#?}",
            report.terminals
        );

        // Cascade dedupe: no standalone flow error remains whose endpoint is a
        // component already carrying its own row. Here every flow endpoint is a
        // no-agent component (or a terminal), so FLOWS is empty and the faults are
        // folded onto Tank and Pump instead.
        let comp_ids: Vec<Id> = to_world_model(&app.things, &app.relations, Lens::Mobus)
            .systems
            .iter()
            .filter(|s| s.info.level == 1)
            .map(|s| s.info.id.clone())
            .collect();
        let wm = to_world_model(&app.things, &app.relations, Lens::Mobus);
        assert!(
            !report.flow_errors.iter().any(|e| {
                derivative_endpoint_component(e, &wm, &comp_ids)
                    .is_some_and(|idx| !report.components[idx].errors.is_empty())
            }),
            "derivative flow errors must be folded, not standalone: {:#?}",
            report.flow_errors
        );
        assert!(
            report.components.iter().any(|c| c.name == "Tank" && c.blocked_flows > 0),
            "Tank should carry folded blocked-flow counts: {:#?}",
            report.components
        );
    }

    // ── Arc 4.2: the component → work-process mapping (stamp palette) ─────

    /// A stamped component projects into a `WorldModel` carrying its Mobus primitive
    /// as an `AgentModel` under the `Agent` archetype — the mapping bert-core reads.
    /// Unstamped components carry no agent model (the projection is unchanged for them).
    #[test]
    fn stamp_round_trips_canvas_to_world_model_carrying_primitive() {
        let mut things = vec![env(1, "Well"), comp(2, "Tank"), comp(3, "Pump"), env(4, "Drain")];
        things[1].primitive = Some(ProcessPrimitive::Buffering); // Tank buffers
        things[2].primitive = Some(ProcessPrimitive::Propelling); // Pump propels
        let rels = vec![
            rel(1, 1, 2, true, Kind::Matter),
            rel(2, 2, 3, true, Kind::Matter),
            rel(3, 3, 4, true, Kind::Matter),
        ];
        let wm = to_world_model(&things, &rels, Lens::Mobus);

        let sys = |name: &str| wm.systems.iter().find(|s| s.info.name == name).unwrap();
        let tank = sys("Tank");
        assert_eq!(tank.archetype, Some(HcgsArchetype::Agent), "a stamped component is an Agent");
        assert_eq!(
            tank.agent.as_ref().and_then(|a| a.primitive),
            Some(ProcessPrimitive::Buffering),
            "the projected agent carries exactly the stamped primitive"
        );
        assert_eq!(
            sys("Pump").agent.as_ref().unwrap().primitive,
            Some(ProcessPrimitive::Propelling)
        );

        // The seam survives a WorldModel JSON round-trip (Export BERT → re-read).
        let json = serde_json::to_string(&wm).unwrap();
        let back: WorldModel = serde_json::from_str(&json).unwrap();
        assert_eq!(
            back.systems.iter().find(|s| s.info.name == "Tank").unwrap().agent,
            tank.agent,
            "the AgentModel survives WorldModel serialization"
        );
    }

    /// The saved canvas `Model` preserves stamps, and a pre-mapping model (no
    /// `primitive` field) still loads — the `#[serde(default)]` backward-compat path.
    #[test]
    fn stamp_survives_model_save_load_and_old_models_still_load() {
        let mut app = CanvasApp {
            things: vec![comp(1, "A"), comp(2, "B")],
            relations: vec![rel(1, 1, 2, true, Kind::Unspecified)],
            next_id: 3,
            ..Default::default()
        };
        app.set_primitive(1, Some(ProcessPrimitive::Sensing));
        let saved = serde_json::to_string(&Model {
            lens: Lens::Mobus,
            next_id: app.next_id,
            things: app.things.clone(),
            relations: app.relations.clone(),
            source_spec: None,
            imported: None,
        })
        .unwrap();
        let mut app2 = CanvasApp::default();
        app2.load_json(&saved);
        assert_eq!(
            app2.things.iter().find(|t| t.name == "A").unwrap().primitive,
            Some(ProcessPrimitive::Sensing),
            "a stamped primitive round-trips through save/load"
        );

        // A model authored before the mapping feature has no `primitive` key at all.
        let legacy = r#"{"lens":"Mobus","next_id":3,
            "things":[{"id":1,"name":"A","pos":[0.0,0.0],"role":"Component"}],
            "relations":[]}"#;
        let mut app3 = CanvasApp::default();
        app3.load_json(legacy);
        assert_eq!(app3.things.len(), 1, "a pre-mapping model still loads");
        assert_eq!(app3.things[0].primitive, None, "and defaults to no stamp");
    }

    /// Stamping every component flips the audit's "no agent model" reds to green:
    /// the mapping is exactly what the Operational rung was missing. The full
    /// source → Buffering → Propelling → sink chain then clears every check.
    #[test]
    fn stamping_flips_the_audit_from_red_to_green() {
        let mut app = audit_app(); // Well → Tank → Pump → Drain, both components unstamped

        // Before: Mobus clears the mode gate, but each component is red (no agent model).
        let before = app.audit(Lens::Mobus);
        assert!(before.mode_error.is_none());
        assert!(
            before.components.iter().all(|c| c
                .errors
                .iter()
                .any(|e| e.reason.contains("no agent model"))),
            "unstamped components read red: {:#?}",
            before.components
        );
        assert!(!before.fully_green());

        // Stamp both components with a Mobus work process (the palette gesture).
        let tank = app.things.iter().find(|t| t.name == "Tank").unwrap().id;
        let pump = app.things.iter().find(|t| t.name == "Pump").unwrap().id;
        app.set_primitive(tank, Some(ProcessPrimitive::Buffering));
        app.set_primitive(pump, Some(ProcessPrimitive::Propelling));

        // After: no component carries the "no agent model" error, and — the chain
        // being a well-formed circuit — the whole audit is green.
        let after = app.audit(Lens::Mobus);
        assert!(
            after.components.iter().all(|c| c.errors.is_empty()),
            "every stamped component clears its operational error: {:#?}",
            after.components
        );
        assert!(
            after.fully_green(),
            "a fully-mapped, well-formed Mobus model passes the whole audit"
        );
        assert_eq!(after.clear, after.total);
    }

    /// `apply_stamp` honors the loaded stamp and refuses environment things: only
    /// components carry a work process, and the eraser clears one.
    #[test]
    fn apply_stamp_targets_components_and_erases() {
        let mut app = CanvasApp {
            things: vec![comp(1, "A"), env(2, "Env")],
            stamp: Some(Stamp::Prim(ProcessPrimitive::Amplifying)),
            ..Default::default()
        };
        app.apply_stamp(2); // env thing — ignored
        assert_eq!(app.things.iter().find(|t| t.name == "Env").unwrap().primitive, None);
        app.apply_stamp(1); // component — stamped
        assert_eq!(
            app.things[0].primitive,
            Some(ProcessPrimitive::Amplifying)
        );
        assert!(matches!(app.selection, Selected::Thing(1)), "stamping selects the hit component");

        app.stamp = Some(Stamp::Erase);
        app.apply_stamp(1);
        assert_eq!(app.things[0].primitive, None, "the eraser clears the stamp");
    }

    /// Every primitive has a distinct badge code and a non-empty name/description —
    /// the palette legend and canvas badges never collide or blank out.
    #[test]
    fn primitive_metadata_is_total_and_distinct() {
        let mut codes: Vec<&str> = PRIMITIVES.iter().map(|&p| prim_code(p)).collect();
        assert_eq!(codes.len(), 10);
        codes.sort_unstable();
        codes.dedup();
        assert_eq!(codes.len(), 10, "badge codes must be unique");
        for p in PRIMITIVES {
            assert!(!prim_name(p).is_empty());
            assert!(!prim_desc(p).is_empty());
            assert_eq!(prim_code(p).chars().count(), 2, "badge codes are two chars");
        }
    }

    // ── Arc 4.3: the Run surface (Shape B) law-tests (R1–R5) ──────────────
    // Native-only, matching the feature (bert-compose is a desktop crate).

    /// A stamped, runnable Mobus chain: Well → Tank(Buffering) → Pump(Propelling)
    /// → Drain. Every component carries a work process, so `validate_operational`
    /// clears and the projection runs.
    #[cfg(not(target_arch = "wasm32"))]
    fn runnable_app() -> CanvasApp {
        let mut app = audit_app(); // Well → Tank → Pump → Drain, unstamped
        let tank = app.things.iter().find(|t| t.name == "Tank").unwrap().id;
        let pump = app.things.iter().find(|t| t.name == "Pump").unwrap().id;
        app.set_primitive(tank, Some(ProcessPrimitive::Buffering));
        app.set_primitive(pump, Some(ProcessPrimitive::Propelling));
        app
    }

    /// R1 run-is-pure: recording a run mutates no canvas state — the model
    /// serializes byte-identically before and after. (`run_model` borrows `&self`;
    /// this is the behavioral witness of that guarantee.)
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn run_is_pure_r1() {
        let app = runnable_app();
        let before = serde_json::to_string(&(&app.things, &app.relations)).unwrap();
        let res = app.run_model(Lens::Mobus, 1.0, 30.0);
        assert!(res.is_some(), "a stamped conserving chain runs");
        let after = serde_json::to_string(&(&app.things, &app.relations)).unwrap();
        assert_eq!(before, after, "a run leaves the canvas byte-for-byte unchanged");
    }

    /// R2 gate: Run on a model that fails `validate_operational` shows the routing
    /// message and records nothing — never a partial run.
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn run_gate_refuses_unrunnable_r2() {
        let mut app = audit_app(); // components unstamped → operational check fails
        app.begin_run(Lens::Mobus);
        assert!(app.run_gate_msg.is_some(), "an unrunnable model shows the routing message");
        assert!(app.run_results.is_none(), "and never a partial run");
        assert!(!app.run_prompt, "no parameter prompt opens for an unrunnable model");
        assert!(
            app.run_model(Lens::Mobus, 1.0, 30.0).is_none(),
            "run_model itself refuses to project an unrunnable model"
        );
    }

    /// R3 staleness: a structural edit after a run moves the model's content hash,
    /// so the recorded run no longer matches — the panel's staleness key diverges.
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn run_goes_stale_on_structural_edit_r3() {
        let mut app = runnable_app();
        let res = app.run_model(Lens::Mobus, 1.0, 30.0).expect("the chain runs");
        assert_eq!(
            app.current_spec_key(Lens::Mobus),
            Some(res.key),
            "a fresh run matches the model it ran on"
        );
        // Structural edit: change a component's work process.
        let pump = app.things.iter().find(|t| t.name == "Pump").unwrap().id;
        app.set_primitive(pump, Some(ProcessPrimitive::Amplifying));
        assert_ne!(
            app.current_spec_key(Lens::Mobus),
            Some(res.key),
            "a structural edit moves the key — the run is now stale"
        );
    }

    /// R3's twin invariant: cosmetic edits never stale a recorded trace. Position
    /// is where a disc sits, not what the system is — it never reaches the
    /// OperationalSpec (2026-07-11 manual pass: the script promised drag→stale;
    /// the spec-keyed design was right and the script wrong).
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn run_survives_cosmetic_edit() {
        let mut app = runnable_app();
        let res = app.run_model(Lens::Mobus, 1.0, 30.0).expect("the chain runs");
        for t in &mut app.things {
            t.pos += egui::vec2(37.0, -19.0);
        }
        assert_eq!(
            app.current_spec_key(Lens::Mobus),
            Some(res.key),
            "moving discs is not a structural edit — the run stays current"
        );
    }

    /// R4 explicit params: invoking Run opens the prompt but records nothing; only
    /// the explicit confirm (over the prefilled Δt/T) records a run.
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn no_run_without_explicit_params_r4() {
        let mut app = runnable_app();
        assert!(app.run_results.is_none(), "a fresh app has recorded nothing");
        app.begin_run(Lens::Mobus);
        assert!(app.run_prompt, "Run opens the parameter prompt");
        assert!(
            app.run_results.is_none(),
            "opening the prompt records nothing — the run needs the explicit Run gesture"
        );
        app.execute_run(Lens::Mobus); // confirm over the prefilled (supplied) params
        assert!(app.run_results.is_some(), "the explicit confirm records the run");
    }

    /// R5 conservation surfaced: the ledger residual is computed and rendered in
    /// the summary state (headline + one-line), not silently asserted.
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn residual_surfaced_in_summary_r5() {
        let app = runnable_app();
        let res = app.run_model(Lens::Mobus, 1.0, 30.0).expect("the chain runs");
        assert!(res.residual.is_finite(), "the conservation residual is computed");
        assert!(
            res.summary_line.contains("residual"),
            "the summary line surfaces the residual: {}",
            res.summary_line
        );
        assert!(
            res.residual.abs() < 1e-3,
            "a source → buffer → propel → sink chain conserves: residual {}",
            res.residual
        );
    }

    /// B4 run-comparison-lite: a second run retains the first run's one-line summary
    /// as the "previous run" line, in memory, same session.
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn previous_run_line_retained_b4() {
        let mut app = runnable_app();
        app.run_dt = "1".into();
        app.run_t = "30".into();
        app.execute_run(Lens::Mobus);
        let first = app.run_results.as_ref().unwrap().summary_line.clone();
        assert!(app.prev_run_line.is_none(), "no previous line after the first run");
        app.run_t = "20".into();
        app.execute_run(Lens::Mobus);
        assert_eq!(
            app.prev_run_line.as_deref(),
            Some(first.as_str()),
            "the second run retains the first run's summary beside it"
        );
    }

    /// B3 disclosure: an unparameterized stamped chain reads as fully identity-default
    /// (every component runs the bare primitive), and the levels are purpose-ordered
    /// (Products/waste first).
    #[cfg(not(target_arch = "wasm32"))]
    #[test]
    fn summary_discloses_identity_defaults_and_orders_by_purpose_b3() {
        let app = runnable_app();
        let res = app.run_model(Lens::Mobus, 1.0, 30.0).expect("the chain runs");
        assert_eq!(res.identity_default_m, 2, "two components (Tank, Pump)");
        assert_eq!(
            res.identity_default_n, 2,
            "both run the bare primitive — nothing was parameterized"
        );
        // Purpose order: the first level row is a Product/waste (the sink Drain).
        assert_eq!(
            res.levels.first().map(|r| r.category),
            Some(LevelCategory::Product),
            "products/waste read first (SL §3.1)"
        );
        assert!(
            res.levels.iter().any(|r| r.name == "Drain" && r.category == LevelCategory::Product),
            "the sink is a product-category row"
        );
    }

    /// Build a fixture mirroring the real library dir: root-level models plus Bunge-kind
    /// subfolders plus a retired/ folder. Returns the unique temp root.
    fn library_fixture() -> std::path::PathBuf {
        let root = std::env::temp_dir().join(format!(
            "bert-lenses-libtest-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let write = |rel: &str| {
            let p = root.join(rel);
            std::fs::create_dir_all(p.parent().unwrap()).unwrap();
            std::fs::write(&p, "{}").unwrap();
        };
        write("mobus3.json"); // owner's live model, stays at root
        write("biological/cell.json");
        write("biological/human-cell.json");
        write("technical/thermostat.json");
        write("social/coffee-shop-haiku.json");
        write("teaching/klir.json");
        write("retired/scratch.json");
        write("not-a-model.txt"); // must be ignored
        root
    }

    #[test]
    fn scan_json_recurses_subfolders_and_ignores_non_json() {
        let root = library_fixture();
        let found = scan_json(&root);
        let names: Vec<String> = found
            .iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().into_owned())
            .collect();
        assert!(names.contains(&"mobus3.json".to_string()), "root model visible");
        assert!(names.contains(&"cell.json".to_string()), "subfolder model visible");
        // #32: retired/ is the archive — on disk, out of the panel.
        assert!(!names.contains(&"scratch.json".to_string()), "retired model hidden from the scan");
        assert!(!names.iter().any(|n| n.ends_with(".txt")), "non-json ignored");
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn group_by_folder_puts_root_first_then_folders_alphabetically() {
        let root = library_fixture();
        let found = scan_json(&root);
        let groups = group_by_folder(&root, &found);
        // root group first (holds mobus3.json), then folders alphabetically, retired pinned last.
        assert_eq!(groups[0].0, None, "root-level files lead");
        assert!(
            groups[0].1.iter().any(|p| p.ends_with("mobus3.json")),
            "owner's live model sits in the root group"
        );
        let folder_names: Vec<Option<String>> = groups.iter().skip(1).map(|(f, _)| f.clone()).collect();
        assert_eq!(
            folder_names,
            vec![
                Some("biological".to_string()),
                Some("social".to_string()),
                Some("teaching".to_string()),
                Some("technical".to_string()),
            ],
            "subfolders alphabetical; retired/ absent entirely (#32 — archived means out of the panel)"
        );
        // every scanned file lands in exactly one group (nothing hidden).
        let grouped: usize = groups.iter().map(|(_, v)| v.len()).sum();
        assert_eq!(grouped, found.len(), "no file dropped from the grouped listing");
        std::fs::remove_dir_all(&root).ok();
    }

    #[test]
    fn group_by_folder_pins_retired_last_even_without_root_files() {
        // Guards against a fix that only works when a root group happens to exist first.
        let root = std::env::temp_dir().join(format!(
            "bert-lenses-libtest-noroot-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let write = |rel: &str| {
            let p = root.join(rel);
            std::fs::create_dir_all(p.parent().unwrap()).unwrap();
            std::fs::write(&p, "{}").unwrap();
        };
        write("retired/scratch.json");
        write("zzz-not-retired/late.json");
        let found = scan_json(&root);
        let groups = group_by_folder(&root, &found);
        let folder_names: Vec<Option<String>> = groups.iter().map(|(f, _)| f.clone()).collect();
        assert_eq!(
            folder_names,
            vec![Some("zzz-not-retired".to_string())],
            "#32 supersedes retired-pinned-last: archived models never reach the grouping at all"
        );
        std::fs::remove_dir_all(&root).ok();
    }
}
