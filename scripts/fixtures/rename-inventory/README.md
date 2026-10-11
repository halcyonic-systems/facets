# Synthetic tree for `scripts/rename_inventory.py --self-test`

This codebase was `bert-lenses`, and the kernel crates still carry that name.
The crates were vendored from BERT (`halcyonic-systems/bert`); see [bert#99](https://github.com/halcyonic-systems/bert/issues/99).
Run `bert verdict model.sl --lens bunge`, or `just bert run model.sl`; the `bert` binary lives in `crates/bert-cli`.
The archive seam (bert-lenses#140) saves `"format": "bert-lenses/canvas@1"`.
Serve it with launchd as `com.halcyonic.bert-lenses`; the bundle is `bert-lenses.app`.
`bert-core` is the semantic authority; `bert_canvas::lenses::analyze` is the same door from Rust.
Upstream `bert` has not moved; old-bert peaked as a diagramming tool.
Bertalanffy, Hilbert, glm-roberta-large and bert-base are not the old name.
