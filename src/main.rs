//! bert-lenses — choose-a-paradigm prototype over the K≅2 kernel.
//!
//! One stored kernel (a generated thermostat); three faithful lenses (Klir /
//! Bunge / Mobus). Switching a lens is read-only — the kernel never changes.
//! All formalism lives in `bert-core`; this shell only renders and asks
//! `validate_mode` which lenses a model may be viewed through, and why not.

use bert_core::validate::{validate_mode, Severity, ValidationResult};
use bert_core::{Mode, WorldModel};
use eframe::egui;

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
    things: usize,
    deps: usize,
}

impl LensApp {
    fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        // Generated offline via GSR generate() — never hand-authored.
        let json = include_str!("../assets/thermostat.json");
        let model: WorldModel =
            serde_json::from_str(json).expect("bundled thermostat must deserialize");
        let kernel = model.kernel();
        Self {
            things: kernel.things.len(),
            deps: kernel.dep.len(),
            model,
            active: Lens::Klir,
        }
    }

    fn entry(&self, lens: Lens) -> ValidationResult {
        validate_mode(&self.model, lens.mode())
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
            ui.weak(format!(
                "one kernel — {} things · {} dependencies — unchanged as you switch lenses (read-only by theorem)",
                self.things, self.deps
            ));
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
                    "The thermostat enters {} mode; its structure is shown below (tomorrow: the per-lens rendering).",
                    format!("{:?}", lens.mode()),
                ));
            }

            // Teaching notes (warnings) — e.g. the dynamical-face note in richer modes.
            for issue in res.issues.iter().filter(|i| i.severity == Severity::Warning) {
                ui.weak(format!("note — {}", issue.message));
            }

            ui.separator();
            ui.weak("Storage is always the one kernel; the lens is the vocabulary you read it through.");
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
            .with_inner_size([720.0, 520.0])
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
