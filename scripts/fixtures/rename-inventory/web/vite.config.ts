// `bert bench` takes the same model and knobs when a variation is wanted.
const wasm = resolve(ROOT, "crates/bert-lenses-kernel/pkg/bert_lenses_kernel_bg.wasm");
const version = crateVersion("bert-lenses-kernel");
