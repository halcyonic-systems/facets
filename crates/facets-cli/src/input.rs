//! Getting a [`CanvasModel`] out of a path, and nothing else.
//!
//! Two surfaces reach the same object. `.sl` is text the author writes and
//! [`parse_sl_full`] compiles; `.json` is a stored model, and *which* stored
//! generation it is has already been decided once — by `archive::read`, which
//! reads the neutral archive and the legacy `WorldModel` alike and lets shape
//! decide. Re-deciding that here would be a second implementation of the
//! archive seam, so this module calls it.
//!
//! `-` means stdin. Its format cannot come from an extension, so it comes from
//! the first non-blank character: `{` is JSON, anything else is SL. That is the
//! same shape-decides discipline, one level up.

use std::fs;
use std::io::Read;
use std::path::Path;

use bert_canvas::canvas::CanvasModel;
use bert_canvas::sl::{parse_sl_full, SlError};

/// Why a model could not be produced. Each variant maps to one exit code, so a
/// caller can branch on the kind of failure without reading the message.
pub enum LoadError {
    /// The file could not be read at all.
    Io(String),
    /// SL text that did not compile — every fault, each anchored to its line.
    Faults(Vec<SlError>),
    /// JSON that is not a model this repo has ever written.
    NotAModel(String),
}

/// The text at `path`, or stdin when `path` is `-`.
pub fn read_text(path: &Path) -> Result<String, LoadError> {
    if path.as_os_str() == "-" {
        let mut buf = String::new();
        std::io::stdin()
            .read_to_string(&mut buf)
            .map_err(|e| LoadError::Io(format!("stdin: {e}")))?;
        return Ok(buf);
    }
    fs::read_to_string(path).map_err(|e| LoadError::Io(format!("{}: {e}", path.display())))
}

/// Does this text want to be read as JSON? Only the first non-blank character
/// answers, which is what makes the answer cheap enough to ask about stdin.
fn looks_like_json(text: &str) -> bool {
    text.trim_start().starts_with('{')
}

/// Compile SL text, keeping every fault rather than the first.
pub fn compile(text: &str) -> Result<CanvasModel, LoadError> {
    parse_sl_full(text)
        .map(|parsed| parsed.model)
        .map_err(LoadError::Faults)
}

/// The model at `path`, however it is stored there.
pub fn load(path: &Path) -> Result<CanvasModel, LoadError> {
    let text = read_text(path)?;
    let json = if path.as_os_str() == "-" {
        looks_like_json(&text)
    } else {
        path.extension().and_then(|e| e.to_str()) != Some("sl")
    };
    if json {
        bert_lenses_kernel::archive::read(&text).map_err(LoadError::NotAModel)
    } else {
        compile(&text)
    }
}
