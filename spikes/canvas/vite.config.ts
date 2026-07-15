import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The kernel wasm pkg is a file: dependency (symlinked into node_modules) one
// level above this app's root; allow Vite to serve out of the whole worktree.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: ["../.."] },
  },
});
