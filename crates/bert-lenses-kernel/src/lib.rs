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
pub mod sandbox;

/// Install the panic hook as the module initializes (wasm only).
///
/// API.md's error contract forbids a panic, but forbidding is not preventing:
/// if one happens anyway the module traps, and without a hook the panic message
/// is written to a `set_hook` that was never installed and discarded — JS sees
/// only `RuntimeError: unreachable executed`, which names nothing. The hook
/// routes the message (and the Rust backtrace the panic carries) to
/// `console.error` before the trap, so a contract violation is *diagnosable*
/// instead of anonymous. It changes no behavior on any input that does not
/// already violate the contract, and adds no export to the frozen surface —
/// `#[wasm_bindgen(start)]` runs it from the module's own initializer.
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen::prelude::wasm_bindgen(start)]
pub fn __install_panic_hook() {
    console_error_panic_hook::set_once();
}

/// A deliberate panic, behind an off-by-default feature — the only way to test
/// the trap path without shipping a panic-on-demand export to users.
///
/// The wasm-exec gate builds a SEPARATE pkg with `--features panic-probe` and
/// drives this to prove two things it otherwise could only assert: that the
/// hook above really does surface the panic message, and what a trapped
/// instance does on the next call. No release build has this symbol; the
/// harness fails loudly if the probe pkg is missing it, so the test cannot
/// silently degrade into a skip.
/// It takes an argument and panics mid-call ON PURPOSE: a probe that panicked
/// before touching the boundary would trap with none of the marshaling state a
/// real boundary panic holds (an argument copied into linear memory, a JsValue
/// heap slot), and would prove less than it appears to.
#[cfg(all(target_arch = "wasm32", feature = "panic-probe"))]
#[wasm_bindgen::prelude::wasm_bindgen]
pub fn __trap_probe(canvas_json: &str) -> Result<wasm_bindgen::JsValue, wasm_bindgen::JsError> {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json)
        .map_err(|e| wasm_bindgen::JsError::new(&format!("invalid canvas model: {e}")))?;
    let _held = serde_wasm_bindgen::to_value(&model)
        .map_err(|e| wasm_bindgen::JsError::new(&e.to_string()))?;
    panic!("panic-probe: a deliberate panic, to witness the trap path");
}
