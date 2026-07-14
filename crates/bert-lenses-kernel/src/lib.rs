//! bert-lenses-kernel — the JS-facing wasm boundary.
//!
//! THE LOAD-BEARING INVARIANT: this crate is the *brain*. It owns every
//! systemhood verdict, all validation, the CSV-tether ritual, and the whole
//! simulation, delegating to [`bert_core`] (the semantic authority) and
//! [`bert_compose`] (the executable engine). The web layer is the *face*: it
//! calls the `#[wasm_bindgen]` functions in [`api`] and renders results. It
//! decides nothing about systems itself. Any systems logic in JS is a bug.
//!
//! Two pure modules are vendored here because they are truth, not UI:
//! - [`tether`]: the CSV import ritual — column-meaning assignment with gates
//!   T1/T2/T5 (`MappingDraft`), and the carried empirical H (`ImportedData`).
//! - [`manifest`]: the declarative run manifest that resolves onto the same
//!   `MappingDraft` the wizard drives.
//!
//! The boundary (`api`) is thin: deserialize JS input → call bert-core /
//! bert-compose / tether → serialize the result. No formalism lives in the
//! wrapper; it only marshals.

pub mod api;
pub mod manifest;
pub mod tether;
