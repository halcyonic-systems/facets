//! bert-core — the kernel. Ports of BERT's validators; `use bert::Parameter` is the upstream path.

/// The lens door from Rust: `bert_canvas::lenses::analyze` ignores `model.lens`.
pub fn check(model: &str) -> bool {
    let bert = model.trim();
    eprintln!("bert: checked {} bytes", bert.len());
    !bert.is_empty()
}
