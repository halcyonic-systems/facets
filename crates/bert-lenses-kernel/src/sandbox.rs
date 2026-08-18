//! The sandbox seam — the boundary's ONE stateful export.
//!
//! Everything else in this crate is a stateless function (deserialize → call
//! the truth → serialize; see `api`). A live sandbox cannot be that: its
//! defining interaction is a parameter tweaked MID-RUN without resetting the
//! stocks, which requires a `Circuit` held across calls. The state lives in
//! [`bert_compose::session::Session`] — engine side, natively tested — and
//! this class stays marshaling-only: every method delegates and converts.
//!
//! The carve-out from the stateless invariant is deliberate and bounded:
//! ONE class, engine-owned state, no systems logic here. Trap story: if the
//! module ever traps, the face discards the session and rebuilds it from its
//! own authoring mirror (or the saved model) — a session is an instrument's
//! live state, never the document of record. The document is a `WorldModel`
//! (`to_model_json` / `from_model`), same artifact the Model surface opens.

use wasm_bindgen::prelude::*;

use bert_compose::session::{self, Session};

use crate::api::to_js;

fn err(e: String) -> JsError {
    JsError::new(&e)
}

/// A live circuit under authoring and continuous stepping. The face owns the
/// clock (a ticks/s accumulator calling `step`); the engine owns everything
/// it means.
#[wasm_bindgen]
pub struct SandboxSession {
    inner: Session,
}

#[wasm_bindgen]
impl SandboxSession {
    /// An empty canvas.
    #[wasm_bindgen(constructor)]
    pub fn new() -> SandboxSession {
        SandboxSession {
            inner: Session::new(),
        }
    }

    /// A session opened on a stamped Troncale process (`ladder_stamps` names).
    pub fn from_stamp(name: &str) -> Result<SandboxSession, JsError> {
        Ok(SandboxSession {
            inner: Session::from_stamp(name).map_err(err)?,
        })
    }

    /// A session over a saved model JSON — reopening a sandbox document, or
    /// bringing any executable model back to the bench.
    pub fn from_model(model_json: &str) -> Result<SandboxSession, JsError> {
        let model = serde_json::from_str(model_json)
            .map_err(|e| JsError::new(&format!("invalid model JSON: {e}")))?;
        Ok(SandboxSession {
            inner: Session::from_model(&model).map_err(err)?,
        })
    }

    // ── authoring ──

    pub fn add_node(&mut self, kind: &str, x: f32, y: f32) -> Result<u32, JsError> {
        self.inner.add_node(kind, x, y).map(|i| i as u32).map_err(err)
    }

    pub fn remove_node(&mut self, i: u32) -> Result<(), JsError> {
        self.inner.remove_node(i as usize).map_err(err)
    }

    pub fn add_wire(&mut self, from: u32, to: u32, mode: &str) -> Result<u32, JsError> {
        self.inner
            .add_wire(from as usize, to as usize, mode)
            .map(|k| k as u32)
            .map_err(err)
    }

    pub fn remove_wire(&mut self, k: u32) -> Result<(), JsError> {
        self.inner.remove_wire(k as usize).map_err(err)
    }

    /// Stamp a Troncale process into the live canvas at `(x, y)`. Returns the
    /// first stamped node's index.
    pub fn stamp(&mut self, name: &str, x: f32, y: f32) -> Result<u32, JsError> {
        self.inner.stamp(name, x, y).map(|i| i as u32).map_err(err)
    }

    // ── live tweaking ──

    pub fn set_node_param(&mut self, i: u32, field: &str, v: f32) -> Result<(), JsError> {
        self.inner.set_node_param(i as usize, field, v).map_err(err)
    }

    pub fn set_node_pos(&mut self, i: u32, x: f32, y: f32) -> Result<(), JsError> {
        self.inner.set_node_pos(i as usize, x, y).map_err(err)
    }

    pub fn set_node_name(&mut self, i: u32, name: &str) -> Result<(), JsError> {
        self.inner.set_node_name(i as usize, name).map_err(err)
    }

    pub fn set_substance(
        &mut self,
        i: u32,
        name: &str,
        base: &str,
        unit: &str,
    ) -> Result<(), JsError> {
        self.inner
            .set_substance(i as usize, name, base, unit)
            .map_err(err)
    }

    pub fn set_wire_param(&mut self, k: u32, field: &str, v: f32) -> Result<(), JsError> {
        self.inner.set_wire_param(k as usize, field, v).map_err(err)
    }

    /// Declare the state invariant (axis D): the conservation ledger on or
    /// off. Declining is opt-in, never silent.
    pub fn set_invariant(&mut self, conserved: bool) {
        self.inner.set_invariant(conserved)
    }

    // ── transport ──

    /// Advance `n` steps of `dt` each. An algebraic cycle makes this a
    /// refused no-op — read `snapshot().algebraic_cycle` for the loop.
    pub fn step(&mut self, n: u32, dt: f32) {
        self.inner.step(n, dt)
    }

    pub fn reset(&mut self) {
        self.inner.reset()
    }

    // ── reading ──

    /// One frame's read: clock, ledger, per-node scalars + sparkline, wires
    /// with this tick's delivery. Shape: `SandboxSnapshot` in API.md.
    pub fn snapshot(&self) -> Result<JsValue, JsError> {
        to_js(&self.inner.snapshot())
    }

    /// The recorded rows from tick `from_tick` on — a delta pull, so history
    /// never crosses the boundary in full. Shape: `SandboxHistoryDelta`.
    pub fn history_since(&self, from_tick: u32) -> Result<JsValue, JsError> {
        to_js(&self.inner.history_since(from_tick as u64))
    }

    /// The sandbox document: a `WorldModel` JSON, the same artifact the Model
    /// surface opens. Graduation is a save.
    pub fn to_model_json(&self, name: &str) -> Result<String, JsError> {
        serde_json::to_string(&self.inner.to_model(name))
            .map_err(|e| JsError::new(&e.to_string()))
    }
}

impl Default for SandboxSession {
    fn default() -> Self {
        Self::new()
    }
}

/// The 12-kind primitive palette, as data — the face renders what the engine
/// declares. Shape: `SandboxPaletteEntry[]` in API.md.
#[wasm_bindgen]
pub fn sandbox_palette() -> Result<JsValue, JsError> {
    to_js(&session::palette())
}

/// The stampable Troncale processes: name (the stamp key), the honesty line,
/// provenance. Shape: `LadderStamp[]` in API.md.
#[wasm_bindgen]
pub fn ladder_stamps() -> Result<JsValue, JsError> {
    to_js(&session::stamps())
}
