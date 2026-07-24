# Running bert-lenses permanently

Runs bert-lenses as a background service on `http://127.0.0.1:5190` instead of
`npm run dev` on 5173. 5173 stays free for interactive dev.

## Why publish outside ~/Desktop

This repo lives under `~/Desktop`, which macOS treats as TCC-protected: a
launchd job has no Full Disk Access grant, so it can't read the repo (or the
repo's `web/node_modules`) at all. The repo can't move (active dev, worktrees).
So the build output moves instead: `scripts/publish-app.sh` builds `web/dist`
inside the repo, then rsyncs it to `~/halcyonic-apps/bert-lenses/dist`, which
launchd can read. The launchd job also runs a *standalone* vite install kept
at `~/halcyonic-apps/bert-lenses/server` (its own throwaway `package.json`,
outside `~/Desktop`) purely to run `vite preview` against the published dist —
it never touches the repo's own vite in `web/node_modules`.

## Install

```bash
scripts/publish-app.sh
cp launchd/com.halcyonic.bert-lenses.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.halcyonic.bert-lenses.plist
```

Check it's up: `curl -sf http://127.0.0.1:5190/ | head`

## Update

After any change to the app, re-run:

```bash
scripts/publish-app.sh
```

The running service already points at `~/halcyonic-apps/bert-lenses/dist`, but
vite preview only reads the files at process start, so kick it after
publishing:

```bash
launchctl kickstart -k gui/$(id -u)/com.halcyonic.bert-lenses
```

## Stop / uninstall

```bash
launchctl bootout gui/$(id -u)/com.halcyonic.bert-lenses
rm ~/Library/LaunchAgents/com.halcyonic.bert-lenses.plist
```

The published copy (`~/halcyonic-apps/bert-lenses/`) is left on disk; delete
it too if fully decommissioning.

## Path to a desktop app

Tauri is the actual end goal — this static-dist publish step is its
prerequisite, since Tauri wraps exactly a `web/dist`-shaped build. Scoping
what's left, honestly:

**Scaffolding needed.** No `src-tauri` exists in this repo today. Bringing it
up means `cargo install tauri-cli` (or `npm create tauri-app` grafted onto the
existing `web/`), pinned to **Tauri v2** (v1 is EOL) — a `src-tauri/` crate
with `tauri.conf.json`, `Cargo.toml`, and the platform icon set.

**The real open question: does the wasm-pack kernel load in a Tauri
WKWebView on macOS?** Not tested. What's known: Tauri's macOS backend is
WKWebView (same engine as Safari/Brave), and WKWebView has supported
`WebAssembly.instantiateStreaming` and ES module workers for years, so there's
no a priori reason the kernel wouldn't load. What's *not* known and must be
verified before committing effort: (1) whether Tauri's custom `tauri://`
asset-serving scheme sends the correct `Content-Type: application/wasm` header
the kernel's `fetch`-based instantiation path expects (the vite-preview test
in this doc confirms the *served* asset has the right MIME type over HTTP;
Tauri's asset protocol is a different code path and untested), and (2) whether
the wasm-bindgen glue's dynamic `import.meta.url` resolution behaves under
Tauri's asset protocol the same way it does under `http://`. First concrete
step to de-risk this: scaffold a throwaway `src-tauri`, point
`tauri.conf.json` `frontendDist` at this repo's `web/dist`, launch it, and
watch devtools console for wasm instantiation errors.

**What changes vs. the served version:**
- `tauri.conf.json` → `build.frontendDist` = `"../web/dist"` (or an absolute
  path), `build.devUrl` = the 5173 dev server for `tauri dev`.
- Asset paths: `web/dist`'s `index.html` currently references `/assets/...`
  (absolute root paths, fine for both `vite preview` and Tauri's `tauri://`
  scheme, which serves from the app's virtual root) — should carry over
  unmodified, but is unverified until step above is run.
- CSP: `tauri.conf.json`'s `app.security.csp` needs `'wasm-unsafe-eval'` (or
  equivalent) in `script-src`, since wasm-bindgen's default instantiation path
  needs it; Tauri's default CSP does not include it.

**The local-model co-author path** (`web/src/gsr.ts`, `VITE_GSR_URL` /
`http://localhost:5010`, the General Systems Reasoner) uses plain browser
`fetch`. Inside a Tauri WKWebView this should still reach `localhost` — Tauri
doesn't sandbox outbound fetch by default — but macOS's Local Network
permission prompt behavior for a *non-App-Store, unsigned/dev-signed* Tauri
binary talking to `localhost` specifically (not LAN peers) is the one thing
worth a five-minute check rather than an assumption; historically localhost
loopback traffic has been exempt from the Local Network prompt, but this
should be confirmed on the actual dev build, not assumed from general
knowledge.

**Honest effort estimate:** scaffolding + first working double-clickable
`.app` with the wasm kernel confirmed loading: half a day if the wasm-in-
WKWebView question resolves cleanly; a day or two if the asset-protocol
Content-Type issue bites and needs a custom protocol handler or an
`asset://` → `blob:` shim. The GSR fetch path is very unlikely to add real
time. First concrete step: the throwaway `src-tauri` scaffold + console-watch
described above, before writing any packaging or CSP configuration.
