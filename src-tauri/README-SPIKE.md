# src-tauri — SPIKE scaffold (not a product)

Throwaway Tauri v2 shell built to answer one question: does the wasm-pack kernel
load and run inside a macOS WKWebView under Tauri's custom protocol? It does.
See `operations/sessions/2026-07-24/references/tauri-spike.md` in the vault for
the full report.

Load-bearing finding, encoded in `tauri.conf.json`:

- `.wasm` is served as `Content-Type: application/wasm` by Tauri's own asset
  protocol (content sniffing via the `infer` crate). No protocol handler needed.
- The CSP MUST carry `'wasm-unsafe-eval'` in `script-src`, or the kernel dies on
  `WebAssembly.instantiateStreaming` in the release build. Dev builds do not
  apply this CSP, so the failure only appears after `cargo tauri build`.
- `connect-src` must name the GSR origin (`http://localhost:5010`) or the local
  model path is blocked.

Not done here: fonts are still fetched from Google (offline-hostile — self-host
before shipping), no app menu, no file-system plugin, no signing.

Run: `cargo tauri build && open target/release/bundle/macos/bert-lenses.app`
(requires `web/dist` built and `crates/bert-lenses-kernel/pkg` present).
