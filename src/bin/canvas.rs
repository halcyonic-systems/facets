//! bert-lenses — Arc 2 authoring canvas. Built one rung at a time.
//! v0 step 4: select & delete — click to select a thing or relation, ⌫ to remove.

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

#[derive(Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
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

    fn has_internal_bond(&self) -> bool {
        self.relations
            .iter()
            .any(|r| r.is_bond && r.a != r.b && self.is_comp(r.a) && self.is_comp(r.b))
    }

    /// Bunge Def 1.1: ≥2 components but no bond between any two of them = an aggregate (a heap).
    fn is_aggregate(&self) -> bool {
        let comps = self.things.iter().filter(|t| t.role == Role::Component).count();
        comps >= 2 && !self.has_internal_bond()
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

    fn save_model(&self, lens: Lens) {
        if let Some(path) = rfd::FileDialog::new()
            .add_filter("bert-lenses model", &["json"])
            .set_file_name("model.json")
            .save_file()
        {
            let model = Model {
                lens,
                next_id: self.next_id,
                things: self.things.clone(),
                relations: self.relations.clone(),
            };
            if let Ok(json) = serde_json::to_string_pretty(&model) {
                let _ = std::fs::write(path, json);
            }
        }
    }

    fn open_model(&mut self) {
        if let Some(path) = rfd::FileDialog::new()
            .add_filter("bert-lenses model", &["json"])
            .pick_file()
        {
            if let Ok(txt) = std::fs::read_to_string(&path) {
                if let Ok(model) = serde_json::from_str::<Model>(&txt) {
                    self.lens = Some(model.lens);
                    self.next_id = model.next_id;
                    self.things = model.things;
                    self.relations = model.relations;
                    self.editing = None;
                    self.editing_rel = None;
                    self.drag = None;
                    self.connecting = None;
                    self.selection = Selected::None;
                }
            }
        }
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
    things.push(Thing { id, name: name.to_string(), pos: egui::Pos2::ZERO, role });
    map.insert(name.to_string(), id);
    id
}

fn str_at<'a>(v: &'a serde_json::Value, key: &str) -> &'a str {
    v.get(key).and_then(|x| x.as_str()).unwrap_or("")
}
fn substance_type(flow: &serde_json::Value) -> Kind {
    substance_to_kind(flow.get("substance").and_then(|s| s.get("type")).and_then(|t| t.as_str()).unwrap_or(""))
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

    // Auto-layout: components on an inner ring, environment on an outer ring.
    let center = egui::pos2(480.0, 340.0);
    let comps: Vec<u64> = things.iter().filter(|t| t.role == Role::Component).map(|t| t.id).collect();
    let envs: Vec<u64> = things.iter().filter(|t| t.role == Role::Environment).map(|t| t.id).collect();
    let place = |ids: &[u64], radius: f32, things: &mut Vec<Thing>| {
        let n = ids.len().max(1);
        for (i, id) in ids.iter().enumerate() {
            let a = std::f32::consts::TAU * (i as f32) / (n as f32) - std::f32::consts::FRAC_PI_2;
            if let Some(t) = things.iter_mut().find(|t| t.id == *id) {
                t.pos = center + radius * egui::vec2(a.cos(), a.sin());
            }
        }
    };
    place(&comps, 150.0, &mut things);
    place(&envs, 320.0, &mut things);

    (things, relations, next)
}

impl CanvasApp {
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
                        let (things, relations, next_id) = model_from_spec(&spec);
                        if things.is_empty() {
                            self.gen_error = Some("the spec had nothing to model".to_string());
                        } else {
                            self.things = things;
                            self.relations = relations;
                            self.next_id = next_id;
                            self.selection = Selected::None;
                            self.editing = None;
                            self.editing_rel = None;
                            self.connecting = None;
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
                    .on_hover_text("Open a saved model (.json)")
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
                .exact_width(300.0)
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
                    let set_of = |v: &[String]| {
                        if v.is_empty() {
                            "∅".to_string()
                        } else {
                            format!("{{ {} }}", v.join(", "))
                        }
                    };
                    let set_t = set_of(&all);
                    let set_c = set_of(&comp);
                    let set_e = set_of(&env);
                    // group pairs by relation-name → a *family of named relations*: Klir's "set of
                    // relations", Bunge's one-graph-per-kind. Each name defines its own set of pairs;
                    // R (or S) is the set of those relations. Standard notation, not "name: pair".
                    let mut groups: Vec<(String, Vec<String>)> = Vec::new();
                    for r in &self.relations {
                        // Klir groups its "set of relations" by *interpretation* (name); Bunge groups
                        // structure by *kind of connection* — one directed graph per kind.
                        let key = match lens {
                            Lens::Bunge => {
                                if !r.is_bond {
                                    "mere relations".to_string()
                                } else if r.kind == Kind::Unspecified {
                                    "bonds".to_string()
                                } else {
                                    r.kind.label().to_string()
                                }
                            }
                            _ => r.name.trim().to_string(),
                        };
                        // Klir's relations are ordered tuples too — symmetry is a *property*, not the
                        // primitive. The neutral *rendering* forgets direction; the math keeps (a, b).
                        let pair = format!("({}, {})", self.name_of(r.a), self.name_of(r.b));
                        if let Some(g) = groups.iter_mut().find(|(n, _)| *n == key) {
                            g.1.push(pair);
                        } else {
                            groups.push((key, vec![pair]));
                        }
                    }
                    let defs: Vec<String> = groups
                        .iter()
                        .filter(|(n, _)| !n.is_empty())
                        .map(|(n, v)| format!("{} = {{ {} }}", n, v.join(", ")))
                        .collect();
                    let unnamed: Vec<String> = groups
                        .iter()
                        .filter(|(n, _)| n.is_empty())
                        .flat_map(|(_, v)| v.clone())
                        .collect();
                    let members: Vec<String> = if defs.is_empty() {
                        unnamed
                    } else {
                        let mut m: Vec<String> = groups
                            .iter()
                            .filter(|(n, _)| !n.is_empty())
                            .map(|(n, _)| n.clone())
                            .collect();
                        m.extend(unnamed);
                        m
                    };
                    let r_inner = if members.is_empty() {
                        "∅".to_string()
                    } else {
                        format!("{{ {} }}", members.join(", "))
                    };

                    egui::ScrollArea::vertical().show(ui, |ui| {
                        let line = |ui: &mut egui::Ui, s: String| {
                            ui.label(
                                egui::RichText::new(s).monospace().size(14.0).color(theme::INK),
                            );
                            ui.add_space(9.0);
                        };
                        let formula = |ui: &mut egui::Ui, s: &str| {
                            ui.add_space(3.0);
                            ui.label(
                                egui::RichText::new(s)
                                    .monospace()
                                    .size(16.0)
                                    .strong()
                                    .color(lens.color()),
                            );
                        };
                        let note = |ui: &mut egui::Ui, s: &str| {
                            ui.add_space(10.0);
                            ui.label(egui::RichText::new(s).small().color(theme::INK_FAINT));
                        };
                        match lens {
                            Lens::Klir => {
                                line(ui, format!("T = {}", set_t));
                                for d in &defs {
                                    line(ui, d.clone());
                                }
                                line(ui, format!("R = {}", r_inner));
                                formula(ui, "S = (T, R)");
                                note(ui, "R ⊆ T × T (simplest case) — a relation, or set of relations, on T. Ordered pairs; a neutral system just leaves direction undeclared. The binary fragment of Klir's general n-ary R.");
                            }
                            Lens::Bunge => {
                                line(ui, format!("C = {}", set_c));
                                line(ui, format!("E = {}", set_e));
                                for d in &defs {
                                    line(ui, d.clone());
                                }
                                line(ui, format!("S = {}", r_inner));
                                formula(ui, "σ = ⟨C, E, S⟩");
                                note(ui, "S = one directed graph per kind of connection (bonds) ∪ mere relations (B̄). Only bonds (solid) confer systemhood; press K on a bond to set its kind.  C ∩ E = ∅.");
                                if self.is_aggregate() {
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
                                line(ui, format!("C = {}", set_c));
                                for d in &defs {
                                    line(ui, d.clone());
                                }
                                line(ui, format!("F = {}", r_inner));
                                formula(ui, "σ = ⟨ C, … , Δt ⟩");
                                note(ui, "the operational 8-tuple — boundary, ports, transforms, history, timescale arrive with the Mobus layer");
                            }
                        }
                    });
                });
        }

        egui::CentralPanel::default()
            .frame(egui::Frame::default().fill(theme::SURFACE))
            .show(ctx, |ui| {
                let rect = ui.max_rect();
                let painter = ui.painter().clone();
                let resp =
                    ui.interact(rect, ui.id().with("canvas_bg"), egui::Sense::click_and_drag());
                let hover = ui.input(|i| i.pointer.hover_pos());

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
                    if let Some(id) = self.drag {
                        let d = resp.drag_delta();
                        if let Some(t) = self.things.iter_mut().find(|t| t.id == id) {
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
                        // the relation's name (or a "name…" prompt when selected) floated off the line
                        if self.editing_rel != Some(r.id) {
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
                            } else if matches!(self.selection, Selected::Rel(s) if s == r.id) {
                                painter.text(
                                    mid,
                                    egui::Align2::CENTER_CENTER,
                                    "name…",
                                    egui::FontId::proportional(11.5),
                                    theme::INK_FAINT,
                                );
                            }
                            // kind label below the line (Bunge/Mobus), in the kind's colour — so K
                            // gives immediate feedback even while the bond is selected
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
                if lens == Lens::Bunge && self.is_aggregate() {
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

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1100.0, 720.0])
            .with_title("bert-lenses — author"),
        ..Default::default()
    };
    eframe::run_native(
        "bert-lenses — author",
        options,
        Box::new(|_cc| {
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
    fn substance_maps_to_bunge_flow_kinds() {
        assert_eq!(substance_to_kind("Material"), Kind::Matter);
        assert_eq!(substance_to_kind("Energy"), Kind::Energy);
        assert_eq!(substance_to_kind("Message"), Kind::Informational);
        assert_eq!(substance_to_kind("whatever"), Kind::Unspecified);
    }
}
