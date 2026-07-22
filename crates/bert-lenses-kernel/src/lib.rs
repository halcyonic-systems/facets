//! bert-lenses-kernel — the JS-facing wasm boundary. Marshaling only.
//!
//! THE LOAD-BEARING INVARIANT: this crate is the *seam*, not the brain. Every
//! `#[wasm_bindgen]` function in [`api`] follows one shape — deserialize JS input
//! → call the truth ([`bert_core`] semantic authority, [`bert_compose`] engine,
//! [`bert_canvas`] canvas/lens domain, [`bert_tether`] import ritual) → serialize
//! the result. No systemhood verdict, validation, projection, or simulation is
//! ever computed here. Any systems logic in this crate — or in JS — is a bug.
//!
//! The domain lives in sibling pure-Rust crates (no wasm-bindgen):
//! - [`bert_canvas`]: `CanvasModel`, `project`, `lens_facts`, `describe`.
//! - [`bert_tether`]: the CSV tether, the run manifest, the forced-run pipeline.
//!
//! The exact JSON shapes this boundary returns are frozen in `API.md`.

pub mod api;
pub mod archive;
