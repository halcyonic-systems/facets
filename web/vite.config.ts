import { createHash } from "node:crypto";
import { copyFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const ROOT = resolve(__dirname, "..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

// --- build provenance (#229) ------------------------------------------------
// A user holding the .app cannot open it and ask what it is: the JS and wasm
// inside are minified and hashed, and nothing in them names a source commit.
// These constants are the only way the About surface can state a fact instead
// of a slogan, so each one is derived from the shipping artifact or the tree
// that produced it — never typed in twice.

const version = (JSON.parse(read("src-tauri/tauri.conf.json")) as { version: string }).version;

const crateVersion = (crate: string) =>
  read(`crates/${crate}/Cargo.toml`).match(/^version = "([^"]+)"/m)?.[1] ?? "unknown";

// The pin from docs/lean-provenance.md's front block. Read, not copied: a
// citation that can drift from its referent is the failure mode that doc
// exists to prevent, and the About pane makes the same claim to a user who
// cannot see the doc.
const ssfCommit = read("docs/lean-provenance.md").match(/pinned-commit:\s*([0-9a-f]{7,40})/)?.[1] ?? "unknown";

const git = (args: string[]) => {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

const gitSha = (() => {
  const sha = git(["rev-parse", "--short=12", "HEAD"]);
  if (!sha) return "unknown";
  return git(["status", "--porcelain"]) ? `${sha}-dirty` : sha;
})();

// The one number a holder of the binary can CHECK. The same bytes vite copies
// into dist/assets are hashed here, so `shasum -a 256` on the .wasm inside the
// bundle reproduces this string — or does not, which is the point.
const wasmSha256 = (() => {
  try {
    const bytes = readFileSync(
      resolve(ROOT, "crates/bert-lenses-kernel/pkg/bert_lenses_kernel_bg.wasm"),
    );
    return createHash("sha256").update(bytes).digest("hex");
  } catch {
    return "unknown";
  }
})();

// The notices are an obligation to third parties (MIT, SIL OFL) that binds
// redistribution, so they have to sit in the served tree, not only in the repo.
// The desktop bundle carries its own copies via tauri.conf.json's resources.
function shipNotices(): Plugin {
  return {
    name: "ship-notices",
    apply: "build",
    closeBundle() {
      for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) {
        copyFileSync(resolve(ROOT, file), resolve(__dirname, "dist", file));
      }
    },
  };
}

// The kernel wasm pkg is a file: dependency (symlinked into node_modules), and
// the sample models live in the repo-root assets/ tree — one level above web/.
// Allow Vite to serve both.
export default defineConfig({
  // Root by default (dev, the launchd :5190 serve, the Tauri shell). The hosted
  // facets.systems build lives at /model/ — publish-site.sh sets VITE_BASE.
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), tailwindcss(), shipNotices()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __KERNEL_VERSION__: JSON.stringify(crateVersion("bert-lenses-kernel")),
    __CORE_VERSION__: JSON.stringify(crateVersion("bert-core")),
    __GIT_SHA__: JSON.stringify(gitSha),
    __SSF_COMMIT__: JSON.stringify(ssfCommit),
    __WASM_SHA256__: JSON.stringify(wasmSha256),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString().replace(/\.\d+Z$/, "Z")),
  },
  server: {
    fs: { allow: [".."] },
  },
});
