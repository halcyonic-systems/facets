// The desktop host. It holds no logic: the whole instrument is web/dist running
// against the wasm kernel, so this only opens a window on it.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("bert-lenses desktop failed to start");
}
