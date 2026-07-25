// The desktop host. It holds no logic: the whole instrument is web/dist running
// against the wasm kernel, so this only opens a window on it. The one host
// capability the web build cannot supply itself: `target="_blank"` is inert in a
// WKWebView, so external links go out through the opener plugin.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("bert-lenses desktop failed to start");
}
