//! The wasm boundary over [`bert_core`]; see `crates/bert-lenses-kernel/API.md`.
use bert_core::WorldModel;

pub const FORMAT: &str = "bert-lenses/canvas@1";

#[wasm_bindgen(js_name = "bert_validate")]
pub fn validate(canvas_json: &str) -> String {
    let model: bert_canvas::canvas::CanvasModel = serde_json::from_str(canvas_json).unwrap();
    let out = bert(&["verdict"]);
    format!("{model:?}{out}")
}
