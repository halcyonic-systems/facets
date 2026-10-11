//! bert-canvas — the canvas/lens domain, pure Rust (no wasm-bindgen).
//!
//! Owns the lightweight editing model the canvas holds ([`canvas::CanvasModel`]),
//! its projection into a bert-core [`bert_core::WorldModel`] for validation
//! ([`canvas::project`]), and the faithful lens palettes ([`lenses::lens_facts`],
//! [`lenses::describe`]). This is TRUTH, not marshaling: every systemhood verdict
//! routes through a fresh projection the kernel validates. The wasm boundary
//! ([`bert_lenses_kernel`]) deserializes JS input, calls the functions here, and
//! serializes the result — it decides nothing about systems itself.

pub mod canvas;
pub mod lenses;
pub mod notation;
pub mod sl;
