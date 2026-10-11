//! The bench seam (facets#463, move 2b): the Model bench's handle on a held
//! engine session — the second stateful export beside `SandboxSession`, and
//! for the same reason: a knob turned mid-run without resetting the stocks
//! needs a circuit held across calls. The state lives engine-side in
//! `bert_tether::bench::BenchSession` (natively tested, `tests/bench.rs`);
//! this class marshals. Trap story as for the sandbox: the face discards the
//! handle and reopens it from the document, which is a `WorldModel`.
use wasm_bindgen::prelude::*;

use bert_tether::bench::BenchSession;

use crate::api::{to_js, RunResultRich};

fn err(e: String) -> JsError {
    JsError::new(&e)
}

#[wasm_bindgen]
pub struct BenchHandle {
    inner: BenchSession,
}

#[wasm_bindgen]
impl BenchHandle {
    /// Open a model from its declared amounts alone, at tick 0.
    pub fn open_unforced(model_json: &str, dt: f64) -> Result<BenchHandle, JsError> {
        let model = serde_json::from_str(model_json)
            .map_err(|e| JsError::new(&format!("invalid model JSON: {e}")))?;
        Ok(BenchHandle {
            inner: BenchSession::open_unforced(model, dt).map_err(err)?,
        })
    }

    /// Open a model with a CSV bound through its manifest, at tick 0.
    pub fn open_forced(
        model_json: &str,
        csv_text: &str,
        manifest_json: &str,
        dt: f64,
        today: &str,
    ) -> Result<BenchHandle, JsError> {
        let model = serde_json::from_str(model_json)
            .map_err(|e| JsError::new(&format!("invalid model JSON: {e}")))?;
        let manifest: bert_tether::manifest::RunManifest = serde_json::from_str(manifest_json)
            .map_err(|e| JsError::new(&format!("invalid manifest: {e}")))?;
        Ok(BenchHandle {
            inner: BenchSession::open_forced(model, csv_text, &manifest, dt, today).map_err(err)?,
        })
    }

    pub fn step(&mut self, n: u32) {
        self.inner.step(n)
    }

    /// Step to the horizon `t` by the batch run's own tick count.
    pub fn step_over(&mut self, t: f64) -> Result<(), JsError> {
        self.inner.step_over(t).map_err(err)
    }

    pub fn reset(&mut self) {
        self.inner.reset()
    }

    pub fn tick(&self) -> u32 {
        self.inner.tick() as u32
    }

    pub fn set_flow_amount(&mut self, label: &str, from: &str, to: &str, v: f32) -> Result<(), JsError> {
        self.inner.set_flow_amount(label, from, to, v).map_err(err)
    }

    pub fn set_component_param(&mut self, thing: &str, field: &str, v: f32) -> Result<(), JsError> {
        self.inner.set_component_param(thing, field, v).map_err(err)
    }

    /// The run as it stands — the same `RunResultRich` the batch run returns.
    pub fn readout(&self) -> Result<JsValue, JsError> {
        to_js(&RunResultRich::from(self.inner.readout()))
    }

    /// Every node's and wire's flux for the ticks at or after `from_tick`.
    pub fn tick_log_since(&self, from_tick: u32) -> Result<JsValue, JsError> {
        to_js(&self.inner.tick_log_since(from_tick as u64))
    }

    /// The knobs turned on this session, with the tick each applied at.
    pub fn edits(&self) -> Result<JsValue, JsError> {
        to_js(&self.inner.edits())
    }
}
