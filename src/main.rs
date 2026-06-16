//! bert-lenses — choose-a-paradigm prototype over the K≅2 kernel.
//!
//! One stored kernel (a generated thermostat); three faithful lenses (Klir /
//! Bunge / Mobus). Switching a lens is read-only — the kernel never changes.
//! All formalism lives in `bert-core`; this shell only renders and asks
//! `validate_mode` which lenses a model may be viewed through, and why not.

use bert_core::validate::{validate_mode, Severity, ValidationResult};
use bert_core::{Id, IdType, InterfaceType, Kernel, Mode, WorldModel};
use eframe::egui;
use std::collections::HashMap;

/// The three lenses the K≅2 kernel generates. Each maps to a bert-core `Mode`;
/// the lens is a vocabulary, the mode is the precondition it must satisfy.
#[derive(Clone, Copy, PartialEq)]
enum Lens {
    Klir,
    Bunge,
    Mobus,
}

impl Lens {
    const ALL: [Lens; 3] = [Lens::Klir, Lens::Bunge, Lens::Mobus];

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

    /// The defining question (reused from Facets).
    fn asks(self) -> &'static str {
        match self {
            Lens::Klir => "WHICH representation — what kind of knowledge do we have?",
            Lens::Bunge => "what MAKES it a system at all — where are the bonds?",
            Lens::Mobus => "what IS this system — its parts, boundary, and flows?",
        }
    }

    fn bio(self) -> &'static str {
        match self {
            Lens::Klir => "Distilled what every system definition shares: things and the relations on them, S = (T, R).",
            Lens::Bunge => "Made \"system\" an exact ontological concept: composition, environment, structure — and the bonds that separate a system from a heap.",
            Lens::Mobus => "The working engineer's answer: a system is its components, networks, boundary, flows, transforms, history, time.",
        }
    }

    /// The bert-core mode whose precondition this lens requires.
    fn mode(self) -> Mode {
        match self {
            Lens::Klir => Mode::Core,
            Lens::Bunge => Mode::Structural,
            Lens::Mobus => Mode::Operational,
        }
    }
}

struct LensApp {
    model: WorldModel,
    active: Lens,
    /// The kernel projected once at load — the baseline the live invariant is checked against.
    baseline: Kernel,
    /// `Id` → display name for every relatum the lenses render (env, sources, sinks,
    /// systems, interfaces). Built once; lookups never re-walk the model.
    names: HashMap<Id, String>,
}

impl LensApp {
    fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        // Generated offline via GSR generate() — never hand-authored.
        let json = include_str!("../assets/thermostat.json");
        let model: WorldModel =
            serde_json::from_str(json).expect("bundled thermostat must deserialize");
        let baseline = model.kernel();
        let names = build_names(&model);
        Self {
            model,
            active: Lens::Klir,
            baseline,
            names,
        }
    }

    fn entry(&self, lens: Lens) -> ValidationResult {
        validate_mode(&self.model, lens.mode())
    }

    /// Display name for an id; falls back to the id's debug form so a missing
    /// label is visible (and caught by the resolver-coverage test), never silent.
    fn name(&self, id: &Id) -> String {
        self.names
            .get(id)
            .cloned()
            .unwrap_or_else(|| format!("{:?}{:?}", id.ty, id.indices))
    }
}

/// Build the `Id` → name map from the same relata `kernel()` enumerates, plus the
/// boundary interfaces (so Mobus flow endpoints resolve). Pure read of model fields.
fn build_names(model: &WorldModel) -> HashMap<Id, String> {
    let mut names = HashMap::new();
    let env = &model.environment;
    let env_name = if env.info.name.is_empty() {
        "Environment".to_string()
    } else {
        env.info.name.clone()
    };
    names.insert(env.info.id.clone(), env_name);
    for e in env.sources.iter().chain(env.sinks.iter()) {
        names.insert(e.info.id.clone(), e.info.name.clone());
    }
    for s in &model.systems {
        names.insert(s.info.id.clone(), s.info.name.clone());
        for e in s.sources.iter().chain(s.sinks.iter()) {
            names.insert(e.info.id.clone(), e.info.name.clone());
        }
        for itf in &s.boundary.interfaces {
            names.insert(itf.info.id.clone(), itf.info.name.clone());
        }
    }
    names
}

/// A relatum that participates in the system's internal structure (Bunge): a
/// system or subsystem, as opposed to an external source/sink. A *presentation*
/// grouping for the Bunge lens — every validity claim still routes through
/// `validate_mode`; this only decides what to *show* as a bond.
fn is_system_id(id: &Id) -> bool {
    matches!(id.ty, IdType::System | IdType::Subsystem)
}

fn iface_ty_label(ty: InterfaceType) -> &'static str {
    match ty {
        InterfaceType::Export => "export",
        InterfaceType::Import => "import",
        InterfaceType::Hybrid => "hybrid",
    }
}

/// Per-lens structural rendering. Every method is a read-only display of raw
/// bert-core fields — no formalism logic. Each lens shows the prior lens's
/// relata plus its own vocabulary (progressive disclosure).
impl LensApp {
    fn render_structure(&self, ui: &mut egui::Ui, lens: Lens) {
        match lens {
            Lens::Klir => self.render_klir(ui),
            Lens::Bunge => self.render_bunge(ui),
            Lens::Mobus => self.render_mobus(ui),
        }
    }

    /// Klir: S = (T, R). The kernel projection itself — things and the
    /// dependency relation on them. Nothing else is asserted.
    fn render_klir(&self, ui: &mut egui::Ui) {
        let k = self.model.kernel();
        ui.label(
            egui::RichText::new(
                "This lens is the kernel itself: S = (T, R). Klir's vocabulary adds nothing — \
                 Bunge and Mobus read this same kernel with more on top.",
            )
            .strong(),
        );
        ui.add_space(6.0);
        egui::CollapsingHeader::new(format!("Things (T) — {} relata", k.things.len()))
            .default_open(true)
            .show(ui, |ui| {
                for id in &k.things {
                    ui.label(format!("• {}", self.name(id)));
                }
            });
        egui::CollapsingHeader::new(format!("Dependencies (R) — {} arrows", k.dep.len()))
            .default_open(true)
            .show(ui, |ui| {
                for (a, b) in &k.dep {
                    ui.label(format!("{}  →  {}", self.name(a), self.name(b)));
                }
            });
        ui.add_space(4.0);
        ui.weak(
            "S = (T, R): things and the relation on them — the kernel every tradition shares.",
        );
    }

    /// Bunge: composition + environment + structure. The bonds (internal
    /// system↔system couplings) are the structure that separates a system
    /// from a heap.
    fn render_bunge(&self, ui: &mut egui::Ui) {
        egui::CollapsingHeader::new(format!("Composition — {} systems", self.model.systems.len()))
            .default_open(true)
            .show(ui, |ui| {
                for s in &self.model.systems {
                    ui.label(format!("• {}", s.info.name));
                }
            });

        let bonds: Vec<_> = self
            .model
            .interactions
            .iter()
            .filter(|it| is_system_id(&it.source) && is_system_id(&it.sink) && it.source != it.sink)
            .collect();
        egui::CollapsingHeader::new(format!(
            "Bonds — {} internal couplings (what makes it a system, not a heap)",
            bonds.len()
        ))
        .default_open(true)
        .show(ui, |ui| {
            for it in &bonds {
                ui.label(format!(
                    "{}  →  {}   ({})",
                    self.name(&it.source),
                    self.name(&it.sink),
                    it.info.name
                ));
            }
        });

        let env = &self.model.environment;
        egui::CollapsingHeader::new("Environment — external sources & sinks")
            .default_open(true)
            .show(ui, |ui| {
                for e in &env.sources {
                    ui.label(format!("←  {} (source)", e.info.name));
                }
                for e in &env.sinks {
                    ui.label(format!("→  {} (sink)", e.info.name));
                }
            });

        ui.add_space(4.0);
        ui.weak(
            "Bunge: composition + environment + structure. Remove the bonds and you have an aggregate.",
        );
    }

    /// Mobus: the working anatomy — typed flows across the boundary, and the
    /// interfaces (ports) they cross.
    fn render_mobus(&self, ui: &mut egui::Ui) {
        egui::CollapsingHeader::new(format!(
            "Flows — {} typed interactions",
            self.model.interactions.len()
        ))
        .default_open(true)
        .show(ui, |ui| {
            for it in &self.model.interactions {
                ui.horizontal(|ui| {
                    ui.label(format!("{}  →  {}", self.name(&it.source), self.name(&it.sink)));
                    ui.weak(format!(
                        "  {}/{} · {:?} · {}",
                        format!("{:?}", it.substance.ty),
                        it.substance.sub_type,
                        it.usability,
                        it.info.name
                    ));
                });
            }
        });

        egui::CollapsingHeader::new("Boundary & interfaces")
            .default_open(true)
            .show(ui, |ui| {
                let mut any = false;
                for s in &self.model.systems {
                    for itf in &s.boundary.interfaces {
                        any = true;
                        ui.label(format!(
                            "{} :: {} [{}]",
                            s.info.name,
                            itf.info.name,
                            iface_ty_label(itf.ty)
                        ));
                    }
                }
                if !any {
                    ui.weak("no interfaces declared on this model");
                }
            });

        ui.add_space(4.0);
        ui.weak(
            "Mobus: components, boundary, interfaces, and the typed flows across them.",
        );
    }
}

impl eframe::App for LensApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::TopBottomPanel::top("lens_bar").show(ctx, |ui| {
            ui.add_space(4.0);
            ui.horizontal(|ui| {
                ui.heading("BERT Lenses");
                ui.separator();
                for lens in Lens::ALL {
                    let enterable = !self.entry(lens).has_errors();
                    let mark = if enterable { "" } else { "  ⚠" };
                    let label = format!("{} · {}{}", lens.name(), lens.epithet(), mark);
                    if ui.selectable_label(self.active == lens, label).clicked() {
                        self.active = lens;
                    }
                }
            });
            ui.add_space(4.0);
        });

        egui::TopBottomPanel::bottom("invariant").show(ctx, |ui| {
            ui.add_space(2.0);
            // Re-project the kernel live this frame and check it against the
            // load-time baseline — the read-only theorem, made visible.
            let live = self.model.kernel();
            let identical = live == self.baseline;
            ui.horizontal(|ui| {
                if identical {
                    ui.colored_label(
                        egui::Color32::from_rgb(40, 110, 80),
                        format!(
                            "✓ kernel identical — {} things · {} dependencies",
                            live.things.len(),
                            live.dep.len()
                        ),
                    );
                } else {
                    ui.colored_label(
                        egui::Color32::from_rgb(150, 90, 40),
                        "⚠ kernel changed — invariant broken",
                    );
                }
                ui.weak("unchanged as you switch lenses (read-only by theorem)");
            });
            ui.add_space(2.0);
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            let lens = self.active;

            // Thinker card.
            ui.heading(format!("{} — {}", lens.name(), lens.epithet()));
            ui.label(egui::RichText::new(format!("This lens asks: {}", lens.asks())).italics());
            ui.label(egui::RichText::new(lens.bio()).weak());
            ui.separator();

            // Mode-entry verdict — the germen-style traceable answer, cited.
            let res = self.entry(lens);
            if res.has_errors() {
                ui.colored_label(
                    egui::Color32::from_rgb(150, 90, 40),
                    format!("This model cannot be viewed as {} — here is why:", lens.name()),
                );
                for issue in res.issues.iter().filter(|i| i.severity == Severity::Error) {
                    ui.label(format!("• {}", issue.message));
                }
            } else {
                ui.colored_label(
                    egui::Color32::from_rgb(40, 110, 80),
                    format!("✓ This model is a faithful {} system.", lens.name()),
                );
                ui.label(format!(
                    "Enters {:?} mode — its structure, read through the {} lens:",
                    lens.mode(),
                    lens.name()
                ));
            }

            // Teaching notes (warnings) — e.g. the dynamical-face note in richer modes.
            for issue in res.issues.iter().filter(|i| i.severity == Severity::Warning) {
                ui.weak(format!("note — {}", issue.message));
            }

            ui.separator();

            // Per-lens structure — only when the lens is enterable; a non-enterable
            // lens has already shown its cited teaching block above.
            if !res.has_errors() {
                egui::ScrollArea::vertical().show(ui, |ui| {
                    self.render_structure(ui, lens);
                    ui.add_space(8.0);
                    ui.weak(
                        "Storage is always the one kernel; the lens is the vocabulary you read it through.",
                    );
                });
            } else {
                ui.weak("Storage is always the one kernel; the lens is the vocabulary you read it through.");
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn model() -> WorldModel {
        serde_json::from_str(include_str!("../assets/thermostat.json"))
            .expect("bundled thermostat parses")
    }

    #[test]
    fn thermostat_validates_clean() {
        assert!(!bert_core::validate::validate(&model()).has_errors());
    }

    #[test]
    fn thermostat_enters_the_three_lenses() {
        let m = model();
        for lens in Lens::ALL {
            let res = validate_mode(&m, lens.mode());
            assert!(
                !res.has_errors(),
                "{} ({:?}) should be enterable; errors: {:?}",
                lens.name(),
                lens.mode(),
                res.issues
                    .iter()
                    .filter(|i| i.severity == Severity::Error)
                    .map(|i| i.message.clone())
                    .collect::<Vec<_>>()
            );
        }
    }

    /// Every relatum the kernel projects must resolve to a real name — no
    /// `(unknown)` debug-fallback labels leak into the rendered structure.
    #[test]
    fn name_resolver_covers_kernel_things() {
        let m = model();
        let names = build_names(&m);
        for id in &m.kernel().things {
            assert!(
                names.contains_key(id),
                "kernel thing {:?} has no resolved name",
                id
            );
        }
    }

    /// The foundation: switching lenses is read-only — the projected kernel is
    /// identical before and after. (The bert-compose lens-invariance pattern.)
    #[test]
    fn lens_switching_is_kernel_invariant() {
        let m = model();
        let before = m.kernel();
        for lens in Lens::ALL {
            let _ = validate_mode(&m, lens.mode());
        }
        assert_eq!(before, m.kernel());
    }
}

#[cfg(not(target_arch = "wasm32"))]
fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([900.0, 760.0])
            .with_title("BERT Lenses"),
        ..Default::default()
    };
    eframe::run_native(
        "BERT Lenses",
        options,
        Box::new(|cc| Ok(Box::new(LensApp::new(cc)))),
    )
}

#[cfg(target_arch = "wasm32")]
fn main() {
    use eframe::wasm_bindgen::JsCast as _;
    let web_options = eframe::WebOptions::default();
    wasm_bindgen_futures::spawn_local(async {
        let document = web_sys::window().unwrap().document().unwrap();
        let canvas = document
            .get_element_by_id("the_canvas_id")
            .unwrap()
            .dyn_into::<web_sys::HtmlCanvasElement>()
            .unwrap();
        eframe::WebRunner::new()
            .start(
                canvas,
                web_options,
                Box::new(|cc| Ok(Box::new(LensApp::new(cc)))),
            )
            .await
            .expect("failed to start bert-lenses");
    });
}
