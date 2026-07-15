//! bert-tether — the boundary-interface subsystem, pure Rust (no wasm-bindgen).
//!
//! The import ritual that couples empirical data to the executable model. It is
//! neither engine physics (that is [`bert_compose`]) nor marshaling (that is the
//! wasm boundary): it is the interface where a CSV becomes forcing on a system.
//!
//! - [`tether`]: the CSV import ritual — column-meaning assignment with gates
//!   T1/T2/T5 (`MappingDraft`), and the carried empirical H (`ImportedData`).
//! - [`manifest`]: the declarative run manifest that resolves onto the same
//!   `MappingDraft` the wizard drives.
//! - [`forcing`]: resolve the mapping, inject the forced series, project, run,
//!   and read the result back in the model's own domain terms.

pub mod forcing;
pub mod manifest;
pub mod tether;
