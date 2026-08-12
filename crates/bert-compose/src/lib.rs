//! bert-compose — the executable dynamical face, vendored engine-only.
//!
//! This is the self-contained web-first vendoring of the compose engine: the
//! `circuit` physics (all conservation, no UI), the `export` JSON seam (both
//! directions), the `run` recorder, and the `examples`/`ladder`/`lens`
//! vocabulary. The native egui authoring shell (`app`, `askhal`, `ui`, …) that
//! the original binary drove is NOT vendored — the React/wasm face replaces it,
//! and dropping it removes every native dependency (eframe, ureq, rfd, threads,
//! std::fs). What remains compiles cleanly to wasm32-unknown-unknown.
//!
//! Node geometry uses `glam::Vec2` (was `egui::Pos2` in the desktop crate); the
//! swap makes the engine carry no UI dependency at all.
//!
//! The runnable path a hosting face drives:
//! `bert_core::operational::OperationalSpec` → [`from_spec`] → [`Circuit`] →
//! [`run::RecordedRun::record`] → trace.

pub mod circuit;
pub mod examples;
pub mod export;
pub mod ladder;
pub mod lens;
pub mod markov;
pub mod run;

/// The engine and the node vocabulary a caller reads results against.
pub use circuit::{Circuit, Node, NodeKind};

/// The JSON seam (both directions) + the projection entry point.
pub use export::{from_spec, from_world_model, model_name, to_world_model};

/// The run recorder, and the precondition a `(Δt, T)` pair must meet to name a
/// run at all.
pub use run::{ticks_over, RecordedRun, RunReport};
