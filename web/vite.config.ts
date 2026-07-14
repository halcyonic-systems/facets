import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The kernel wasm pkg is a file: dependency (symlinked into node_modules), and
// the sample models live in the repo-root assets/ tree — one level above web/.
// Allow Vite to serve both.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    fs: { allow: [".."] },
  },
});
