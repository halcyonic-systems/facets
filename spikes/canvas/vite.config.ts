import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The kernel wasm pkg is a file: dependency two levels up (crates/bert-lenses-kernel/pkg).
// Allow Vite to serve outside spikes/canvas.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: ["../.."] },
  },
});
