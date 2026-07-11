//! bert-lenses — Arc 2 authoring canvas. Built one rung at a time.
//! **The front door** (`src/main.rs`, `cargo run`). The Arc-1 list viewer is the
//! demoted reference bin at `src/bin/viewer.rs` (`cargo run --bin viewer`).
//! v0 step 4: select & delete — click to select a thing or relation, ⌫ to remove.
//!
//! Systemhood verdicts are not computed here: the canvas kernel projects into a
//! bert-core [`WorldModel`] (`to_world_model`) and every "is this a system?"
//! answer routes through `bert_core::validate::validate_mode`, exactly as the
//! reference viewer does. The shell holds zero formalism logic.

use bert_core::operational::{validate_operational, OperationalError};
use bert_core::validate::validate_mode;
use bert_core::{
    AgentKind, AgentModel, Boundary, Complexity, Environment, ExternalEntity, ExternalEntityType,
    HcgsArchetype, Id, IdType, Info, Interaction, InteractionType, InteractionUsability, Mode,
    ProcessPrimitive, Substance, SubstanceType, System, Transform2d, WorldModel,
    CURRENT_FILE_VERSION,
};
use eframe::egui;

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

/// An element of T — a placed thing with identity, a name, and a user-owned position.
#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct Thing {
    id: u64,
    name: String,
    pos: egui::Pos2,
    role: Role,
    /// Mobus work-process mapping (Arc 4.2): the atomic primitives this component
    /// performs. Authoring data, entered in the inspector alongside the component's
    /// other properties — it projects into the exported `AgentModel` and is what
    /// flips the component's "no agent model" audit row green. Empty on a fresh
    /// component; only Components carry it (an Environment thing has no work
    /// process). Round-trips through Save (canvas `Model`) via serde.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    primitives: Vec<ProcessPrimitive>,
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

fn dist_to_seg(p: egui::Pos2, a: egui::Pos2, b: egui::Pos2) -> f32 {
    let ab = b - a;
    let len_sq = ab.length_sq();
    if len_sq == 0.0 {
        return p.distance(a);
    }
    let t = ((p - a).dot(ab) / len_sq).clamp(0.0, 1.0);
    p.distance(a + ab * t)
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
    fn refresh_library(&mut self) {
        let dir = self.lib_dir();
        let mut files: Vec<std::path::PathBuf> = std::fs::read_dir(&dir)
            .into_iter()
            .flatten()
            .flatten()
            .map(|e| e.path())
            .filter(|p| p.extension().map_or(false, |x| x == "json"))
            .collect();
        files.sort();
        self.library = files;
    }

    fn load_path(&mut self, path: &std::path::Path) {
        match std::fs::read_to_string(path) {
            Ok(txt) => self.load_json(&txt),
            Err(e) => self.gen_error = Some(format!("could not read file: {e}")),
        }
    }

    /// Left panel: the model library — click any entry to load it (one-click, no native dialog).
    fn library_panel(&mut self, ctx: &egui::Context) {
        let lib = self.library.clone();
        let mut to_load: Option<std::path::PathBuf> = None;
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
                ui.separator();
                egui::ScrollArea::vertical().show(ui, |ui| {
                    if lib.is_empty() {
                        ui.label(
                            egui::RichText::new("Empty.\nSave or Open a spec to fill it.")
                                .color(theme::INK_FAINT),
                        );
                    }
                    for p in &lib {
                        let name = p.file_stem().and_then(|s| s.to_str()).unwrap_or("?");
                        if ui
                            .add(egui::Button::new(egui::RichText::new(name).color(theme::INK_SOFT)).frame(false))
                            .clicked()
                        {
                            to_load = Some(p.clone());
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
    }

    fn save_model(&mut self, lens: Lens) {
        let dir = self.lib_dir();
        if let Some(path) = rfd::FileDialog::new()
            .add_filter("bert-lenses model", &["json"])
            .set_directory(&dir)
            .set_file_name("model.json")
            .save_file()
        {
            let model = Model {
                lens,
                next_id: self.next_id,
                things: self.things.clone(),
                relations: self.relations.clone(),
                source_spec: self.source_spec.clone(),
            };
            if let Ok(json) = serde_json::to_string_pretty(&model) {
                let _ = std::fs::write(path, json);
            }
            self.refresh_library(); // the new file shows in the panel immediately
        }
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
            let wm = to_world_model(&self.things, &self.relations, lens);
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
                Ok(txt) => self.load_json(&txt),
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
            self.selection = Selected::None;
            self.editing = None;
            self.editing_rel = None;
            self.connecting = None;
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
        true
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
    things.push(Thing { id, name: name.to_string(), pos: egui::Pos2::ZERO, role, primitives: vec![] });
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
    for ss in spec.get("subsystems").and_then(|x| x.as_array()).unwrap_or(&empty) {
        let n = str_at(ss, "name");
        if !n.is_empty() { intern(n, Role::Component, &mut things, &mut map, &mut next); }
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

// ── Mobus work-process primitives: the 10-way mapping vocabulary ──

/// The ten Mobus atomic work processes, in enum order — the fixed menu the
/// inspector offers and the audit expects.
const ALL_PRIMITIVES: [ProcessPrimitive; 10] = [
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

/// The primitive's name, verbatim from the `ProcessPrimitive` enum — the label
/// the inspector and audit share.
fn primitive_label(p: ProcessPrimitive) -> &'static str {
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

/// One short phrase for each primitive, derived from its Mobus work-process
/// meaning (an atomic transformation on a flow) — no invented jargon.
fn primitive_desc(p: ProcessPrimitive) -> &'static str {
    match p {
        ProcessPrimitive::Combining => "merges several input flows into one",
        ProcessPrimitive::Splitting => "divides one flow into several",
        ProcessPrimitive::Buffering => "stores a flow, releasing it later",
        ProcessPrimitive::Impeding => "resists or throttles a flow",
        ProcessPrimitive::Propelling => "drives a flow forward (motive force)",
        ProcessPrimitive::Copying => "duplicates a flow onto multiple outputs",
        ProcessPrimitive::Sensing => "reads a flow's state without consuming it",
        ProcessPrimitive::Modulating => "varies a flow under a control signal",
        ProcessPrimitive::Amplifying => "increases a flow's magnitude",
        ProcessPrimitive::Inverting => "reverses a flow's sign or direction",
    }
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
    systems.push(new_system(root_id.clone(), 0, "System", env_id.clone(), None));

    let mut comp_idx: i64 = 0;
    let mut env_idx: i64 = 0;
    for t in things {
        match t.role {
            Role::Component => {
                let id = Id { ty: IdType::Subsystem, indices: vec![0, comp_idx] };
                comp_idx += 1;
                let mut sys = new_system(id.clone(), 1, &t.name, root_id.clone(), Some(t.pos));
                // The component → work-process mapping (Arc 4.2): the inspector-
                // authored primitives become this subsystem's AgentModel. With one
                // present, `validate_operational` can instantiate the process and
                // the component's "no agent model" row flips green. An Agent-kind
                // archetype rides along per the bert-core contract (agent present ⇒
                // archetype Agent). Empty ⇒ left as None, so the audit still reds it.
                if !t.primitives.is_empty() {
                    sys.archetype = Some(HcgsArchetype::Agent);
                    sys.agent = Some(AgentModel {
                        kind: AgentKind::Reactive,
                        primitives: t.primitives.clone(),
                        ..AgentModel::default()
                    });
                }
                systems.push(sys);
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
            amount: bert_core::rust_decimal::Decimal::ONE,
            unit: String::new(),
            parameters: vec![],
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
fn new_system(id: Id, level: i32, name: &str, parent: Id, pos: Option<egui::Pos2>) -> System {
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
        archetype: None,
        agent: None,
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
        let wm = to_world_model(&self.things, &self.relations, lens);

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

    /// The component inspector (Arc 4.2, inspector-centric brief). A right panel
    /// that appears whenever a **Component** thing is selected, surfacing that
    /// component's authoring properties — its name and, under a "Work process"
    /// section, the Mobus primitive(s) it performs. Selecting the primitives here
    /// writes an `AgentModel` onto the component (via `to_world_model`), which is
    /// what flips its "no agent model" audit row green. Mapping is authoring data,
    /// entered where authoring data is entered — never a simulation control (the
    /// God-tool guard: this panel selects work-process kinds, it never runs them).
    fn inspector_panel(&mut self, ctx: &egui::Context, lens: Lens) {
        let Selected::Thing(sel_id) = self.selection else {
            return;
        };
        let Some(idx) = self.things.iter().position(|t| t.id == sel_id) else {
            return;
        };
        // Work processes belong to components; an Environment thing has none, so it
        // gets no inspector (its properties surface is the canvas rim gesture).
        if self.things[idx].role != Role::Component {
            return;
        }

        egui::SidePanel::right("inspector")
            .resizable(false)
            .exact_width(300.0)
            .show(ctx, |ui| {
                ui.add_space(12.0);
                ui.label(egui::RichText::new("INSPECTOR").small().color(theme::INK_FAINT));
                ui.add_space(8.0);

                // Identity: the component's name, editable in place — a real
                // properties surface, not just a label.
                ui.horizontal(|ui| {
                    ui.label(egui::RichText::new("●").color(lens.color()));
                    ui.add(
                        egui::TextEdit::singleline(&mut self.things[idx].name)
                            .hint_text("unnamed component")
                            .desired_width(f32::INFINITY),
                    );
                });
                ui.label(egui::RichText::new(lens.noun()).small().color(theme::INK_FAINT));

                ui.add_space(12.0);
                soft_divider(ui);

                // ── Work process (the component → Mobus-primitive mapping) ──
                ui.label(egui::RichText::new("Work process").strong().color(theme::INK));
                ui.label(
                    egui::RichText::new(
                        "Which Mobus primitive(s) this component performs — the mapping the \
                         operational rung runs.",
                    )
                    .small()
                    .color(theme::INK_SOFT),
                );
                ui.add_space(8.0);

                // Attached primitives, each a removable row (editing/removing is as
                // easy as adding). Iterate a snapshot so we can mutate on click.
                let mut remove: Option<usize> = None;
                if self.things[idx].primitives.is_empty() {
                    ui.label(
                        egui::RichText::new(
                            "None yet — this component reads red in Check consistency.",
                        )
                        .small()
                        .color(theme::WARN),
                    );
                } else {
                    for (i, p) in self.things[idx].primitives.clone().into_iter().enumerate() {
                        ui.horizontal(|ui| {
                            if ui
                                .small_button(egui::RichText::new("✕").color(theme::ACCENT))
                                .on_hover_text("Remove this work process")
                                .clicked()
                            {
                                remove = Some(i);
                            }
                            ui.label(egui::RichText::new(primitive_label(p)).color(theme::INK))
                                .on_hover_text(primitive_desc(p));
                            ui.label(
                                egui::RichText::new(primitive_desc(p))
                                    .small()
                                    .color(theme::INK_FAINT),
                            );
                        });
                    }
                }
                if let Some(i) = remove {
                    self.things[idx].primitives.remove(i);
                }

                ui.add_space(8.0);

                // Add: a menu of the primitives not already attached. Each entry
                // carries its Mobus meaning on hover.
                let present: Vec<ProcessPrimitive> = self.things[idx].primitives.clone();
                let remaining = ALL_PRIMITIVES.len() - present.len();
                egui::ComboBox::from_id_salt("add_primitive")
                    .selected_text(
                        egui::RichText::new(if remaining == 0 {
                            "All ten attached"
                        } else {
                            "＋ Add work process"
                        })
                        .color(if remaining == 0 { theme::INK_FAINT } else { theme::ACCENT }),
                    )
                    .show_ui(ui, |ui| {
                        for p in ALL_PRIMITIVES {
                            if present.contains(&p) {
                                continue;
                            }
                            let entry = ui
                                .selectable_label(
                                    false,
                                    egui::RichText::new(format!(
                                        "{}  —  {}",
                                        primitive_label(p),
                                        primitive_desc(p)
                                    ))
                                    .color(theme::INK),
                                )
                                .on_hover_text(primitive_desc(p));
                            if entry.clicked() {
                                self.things[idx].primitives.push(p);
                                ui.close_menu();
                            }
                        }
                    });

                // Lens hint: the mapping is Operational data — it only flips the
                // audit green at the Mobus rung. Non-blocking, so authoring the
                // primitive from any lens still works (it is just data).
                if lens != Lens::Mobus {
                    ui.add_space(10.0);
                    ui.label(
                        egui::RichText::new(
                            "Read at the Mobus rung — switch to Mobus, then Check consistency.",
                        )
                        .small()
                        .color(theme::INK_FAINT),
                    );
                }
            });
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
                if ui
                    .button(egui::RichText::new("⊕  New model").color(theme::INK_SOFT))
                    .on_hover_text("Start over — pick a lens for a fresh, empty model.")
                    .clicked()
                {
                    self.lens = None;
                    self.things.clear();
                    self.relations.clear();
                    self.selection = Selected::None;
                    self.editing = None;
                    self.editing_rel = None;
                }
                if ui
                    .button(egui::RichText::new("Open").color(theme::INK_SOFT))
                    .on_hover_text("Open a saved model OR a GSR spec (from Facets \"model this\" / /extract) — auto-detected")
                    .clicked()
                {
                    self.open_model();
                }
                if ui
                    .button(egui::RichText::new("Save").color(theme::INK_SOFT))
                    .on_hover_text("Save this model to a .json file")
                    .clicked()
                {
                    self.save_model(lens);
                }
                if ui
                    .button(egui::RichText::new("Export BERT").color(theme::INK_SOFT))
                    .on_hover_text(
                        "Export as a bert-core WorldModel (.json), stamped with this lens's mode — the seam out to BERT / GSR / compose",
                    )
                    .clicked()
                {
                    self.export_world_model(lens);
                }
                if ui
                    .button(egui::RichText::new("Check consistency").color(theme::INK_SOFT))
                    .on_hover_text(
                        "Project this canvas with the current lens's mode and run bert-core's operational check — read-only, on demand",
                    )
                    .clicked()
                {
                    self.show_audit = true;
                }
                if ui
                    .button(egui::RichText::new("Tidy").color(theme::INK_SOFT))
                    .on_hover_text("Auto-arrange the layout to suit the current lens, centered in view")
                    .clicked()
                {
                    self.relayout = true;
                }
                ui.add_space(14.0);
                ui.separator();
                ui.add_space(8.0);
                // LLM-assisted generation: name a system, the canvas asks GSR and models it here.
                ui.label(egui::RichText::new("Generate").small().color(theme::INK_FAINT));
                let te = ui.add(
                    egui::TextEdit::singleline(&mut self.gen_desc)
                        .hint_text("describe a system…")
                        .desired_width(150.0),
                );
                // Engine: which GSR endpoint + which LLM. Cloud Haiku is fast; the local Ollama
                // models are sovereign (slower). Non-Claude models route to Ollama server-side.
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
                    .selected_text(egui::RichText::new(current).small().color(theme::INK_SOFT))
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
                    .add_enabled(!self.gen_busy, egui::Button::new(egui::RichText::new(label).color(theme::INK_SOFT)))
                    .on_hover_text("Call GSR to model the described system, in this canvas")
                    .clicked();
                let entered = te.lost_focus() && ui.input(|i| i.key_pressed(egui::Key::Enter));
                if clicked || entered {
                    self.start_generate(ctx);
                }
                if let Some(err) = self.gen_error.clone() {
                    ui.colored_label(egui::Color32::from_rgb(176, 64, 64), "⚠").on_hover_text(err);
                }
                ui.add_space(14.0);
                ui.separator();
                ui.add_space(8.0);
                ui.label(egui::RichText::new("Lens").small().color(theme::INK_FAINT));
                for l in [Lens::Klir, Lens::Bunge, Lens::Mobus] {
                    let selected = lens == l;
                    let color = if selected { l.color() } else { theme::INK_FAINT };
                    let label = egui::RichText::new(l.name()).strong().color(color);
                    if ui
                        .selectable_label(selected, label)
                        .on_hover_text("Same model, seen through another lens — lossless.")
                        .clicked()
                    {
                        self.lens = Some(l);
                    }
                }

                ui.add_space(14.0);
                ui.separator();
                ui.add_space(8.0);
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

        self.inspector_panel(ctx, lens); // Arc 4.2: component properties + work-process mapping
        self.audit_panel(ctx, lens); // Arc 4.1: floats on demand, dismisses to nothing

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
                                // dropped on empty in Bunge/Mobus → birth an environment entity, bonded
                                let env_id = self.next_id;
                                self.next_id += 1;
                                self.things.push(Thing {
                                    id: env_id,
                                    name: String::new(),
                                    pos: p,
                                    role: Role::Environment,
                                    primitives: vec![],
                                });
                                let rid = self.next_id;
                                self.next_id += 1;
                                self.relations.push(Relation {
                                    id: rid,
                                    a: src,
                                    b: env_id,
                                    name: String::new(),
                                    is_bond: true,
                                    kind: Kind::Unspecified,
                                });
                                self.editing = Some(env_id);
                                self.focus_pending = true;
                                self.selection = Selected::Thing(env_id);
                            }
                        }
                    }
                    self.drag = None;
                    self.connecting = None;
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
                                primitives: vec![],
                            });
                            self.editing = Some(id);
                            self.focus_pending = true;
                            self.selection = Selected::Thing(id);
                        }
                    }
                } else if resp.clicked() {
                    if let Some(p) = resp.interact_pointer_pos() {
                        self.selection = if let Some(id) = self.hit(p) {
                            Selected::Thing(id)
                        } else if let Some(rid) = self.relation_at(p) {
                            Selected::Rel(rid)
                        } else {
                            Selected::None
                        };
                    }
                }

                // delete the selection (not while naming)
                if self.editing.is_none() && self.editing_rel.is_none() {
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
                    if let Some((_, dist)) = hover.and_then(|h| self.nearest(h)) {
                        if dist <= BODY {
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
                    // composition = circle; environment = square (Bunge/Mobus only — Klir has no C/E)
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
                let hint: Option<&str> = match self.selection {
                    Selected::Rel(_) => Some("2×click: name  ·  B: bond ⇄ relation  ·  K: kind  ·  ⌫ delete"),
                    Selected::Thing(_) => Some("double-click to rename  ·  ⌫ delete"),
                    Selected::None => {
                        if nr == 0 && nt >= 2 {
                            Some("Drag from a thing's edge to another to relate them.")
                        } else {
                            None
                        }
                    }
                };
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

fn main() -> eframe::Result<()> {
    // Headless convert mode: `canvas convert <spec.json> <out.json>` runs the SAME model_from_spec
    // the GUI uses — one source of truth for the spec→Model distillation, no parallel reimplementation.
    let args: Vec<String> = std::env::args().collect();
    if args.len() >= 4 && args[1] == "convert" {
        let raw = std::fs::read_to_string(&args[2]).expect("read spec");
        let v: serde_json::Value = serde_json::from_str(&raw).expect("parse spec");
        let spec = v.get("spec").cloned().unwrap_or(v); // accept a /extract response or a bare spec
        let (things, relations, next_id) = model_from_spec(&spec);
        let model = Model { lens: Lens::Bunge, next_id, things, relations, source_spec: Some(spec) };
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

#[cfg(test)]
mod tests {
    use super::*;

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
            things: vec![Thing { id: 1, name: "T".into(), pos: egui::Pos2::ZERO, role: Role::Component, primitives: vec![] }],
            relations: vec![], source_spec: None,
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
        Thing { id, name: format!("t{id}"), pos: egui::Pos2::ZERO, role, primitives: vec![] }
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
        Thing { id, name: name.to_string(), pos: egui::pos2(0.0, 0.0), role: Role::Component, primitives: vec![] }
    }
    fn env(id: u64, name: &str) -> Thing {
        Thing { id, name: name.to_string(), pos: egui::pos2(0.0, 0.0), role: Role::Environment, primitives: vec![] }
    }
    fn rel(id: u64, a: u64, b: u64, is_bond: bool, kind: Kind) -> Relation {
        Relation { id, a, b, name: String::new(), is_bond, kind }
    }

    fn has_representational_refusal(errs: &[bert_core::operational::OperationalError]) -> bool {
        errs.iter().any(|e| e.location == "mode" && e.reason.contains("representational rung"))
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

    // ── Arc 4.2: the component → work-process mapping ────────────────────

    fn comp_with(id: u64, name: &str, primitives: Vec<ProcessPrimitive>) -> Thing {
        Thing { id, name: name.to_string(), pos: egui::pos2(0.0, 0.0), role: Role::Component, primitives }
    }

    /// The mapping round-trips through the seam: a component carrying inspector-
    /// authored primitives projects into a `WorldModel` whose matching subsystem
    /// holds an `AgentModel` with exactly those primitives (and an Agent archetype).
    /// A component with none stays `agent: None`, so the audit still reds it.
    #[test]
    fn primitives_project_into_the_agent_model() {
        let things = vec![
            env(1, "Well"),
            comp_with(2, "Tank", vec![ProcessPrimitive::Buffering]),
            comp(3, "Bare"),
            env(4, "Drain"),
        ];
        let rels = vec![
            rel(1, 1, 2, true, Kind::Matter),
            rel(2, 2, 3, true, Kind::Matter),
            rel(3, 3, 4, true, Kind::Matter),
        ];
        let wm = to_world_model(&things, &rels, Lens::Mobus);

        let tank = wm
            .systems
            .iter()
            .find(|s| s.info.name == "Tank")
            .expect("Tank projects as a subsystem");
        let agent = tank.agent.as_ref().expect("Tank carries an AgentModel");
        assert_eq!(agent.primitives, vec![ProcessPrimitive::Buffering]);
        assert_eq!(tank.archetype, Some(HcgsArchetype::Agent));

        let bare = wm.systems.iter().find(|s| s.info.name == "Bare").unwrap();
        assert!(bare.agent.is_none(), "a component with no primitive stays agent-less");
    }

    /// The canvas `Model` (Save state) carries the primitives across a serde
    /// round-trip — reopening a saved model preserves the work-process mapping.
    #[test]
    fn canvas_model_round_trips_primitives() {
        let model = Model {
            lens: Lens::Mobus,
            next_id: 3,
            things: vec![comp_with(
                1,
                "Pump",
                vec![ProcessPrimitive::Propelling, ProcessPrimitive::Modulating],
            )],
            relations: vec![],
            source_spec: None,
        };
        let json = serde_json::to_string(&model).unwrap();
        let back: Model = serde_json::from_str(&json).unwrap();
        assert_eq!(
            back.things[0].primitives,
            vec![ProcessPrimitive::Propelling, ProcessPrimitive::Modulating]
        );
    }

    /// The end-to-end contract: attaching a Mobus primitive to each red component
    /// flips the audit's per-component rows green with no other behavior change.
    /// Same canvas as `audit_surfaces_operational_gaps_for_mobus`, now with the
    /// mapping supplied — the report goes fully green.
    #[test]
    fn attaching_primitives_flips_the_audit_green() {
        let mut app = audit_app();
        // Baseline: both components red for "no agent model".
        let before = app.audit(Lens::Mobus);
        assert!(before
            .components
            .iter()
            .all(|c| c.errors.iter().any(|e| e.reason.contains("no agent model"))));
        assert!(!before.fully_green());

        // Supply the mapping every red component was missing — the inspector's job.
        for t in app.things.iter_mut().filter(|t| t.role == Role::Component) {
            t.primitives = vec![ProcessPrimitive::Buffering];
        }

        let after = app.audit(Lens::Mobus);
        assert!(after.mode_error.is_none(), "still an Operational rung");
        assert!(
            after.components.iter().all(|c| c.errors.is_empty()),
            "every component row is green once mapped: {:#?}",
            after.components
        );
        assert!(after.flow_errors.is_empty(), "no standalone flow faults remain");
        assert!(after.fully_green(), "the whole audit is green: {:#?}", after.components);
        assert_eq!(after.clear, after.total, "the tally is fully cleared");
    }
}
