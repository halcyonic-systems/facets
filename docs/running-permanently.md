# Running bert-lenses permanently

**Status: LIVE.**

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

## The desktop app

The same `web/dist` this doc publishes is what the macOS app wraps — Tauri v2,
`src-tauri/`, no second build path. Build it:

```bash
just desktop
```

That rebuilds the wasm kernel, builds `web/dist`, and runs `cargo tauri build`.
The artifact lands at:

```
src-tauri/target/release/bundle/macos/bert-lenses.app
```

Double-click it, or `open` it. ~5.4 MB, arm64, ad-hoc signed by the linker.
Nothing is installed; drag it to `/Applications` if you want it in Spotlight.

### `cargo tauri dev` is a false positive — never verify with it

Dev serves the frontend over `http://127.0.0.1:1430` and applies `devCsp`, not
the CSP in `tauri.conf.json`. The bundle serves over the `tauri://localhost`
custom protocol and applies the real CSP. A wasm or CSP fault therefore passes
green in dev and kills the bundle. Verify with `just desktop` and launch the
`.app`, always.

Two things the custom protocol changes, both already handled in
`tauri.conf.json`:

- **`script-src` must carry `'wasm-unsafe-eval'`** or the kernel dies on
  `WebAssembly.instantiateStreaming` and the app shows "Failed to load the wasm
  kernel". (Tauri already serves `.wasm` as `application/wasm`, so no protocol
  handler is needed.)
- **`connect-src` must name the reasoner origin.** The app's origin is
  `tauri://localhost`, so an unnamed origin is blocked and surfaces as a bare
  `TypeError: Load failed` that reads like "the reasoner is down." Named today:
  `http://localhost:5010` and `http://127.0.0.1:5010` — this machine, and
  nothing else. No remote host is named in the bundle (#229): a URL compiled
  into a distributed binary cannot be recalled once the binary is in someone's
  hands, so a reasoner reached over the network needs a build whose CSP names
  it.

Fonts are self-hosted for the same reason — a bundle has no network. See
`scripts/vendor-fonts.py`.

### Unsigned, and what a stranger sees

The app is not Developer-ID signed and not notarized. Consequences:

- **Building it yourself, or copying it locally:** nothing happens. No
  quarantine flag, no dialog. This is the state for us indefinitely.
- **Downloading a `.app` from the internet:** macOS quarantines it and refuses
  to open it. On macOS 15 the old right-click → Open bypass is gone; the user
  must go to **System Settings → Privacy & Security**, find the blocked-app
  notice, and press **Open Anyway**. Tell anyone you send a build to expect
  this.
- Removing the dialog entirely means a $99/yr Apple Developer ID plus
  notarization. That is env-vars-only in Tauri and needs zero rework here, so
  it can be added at any point.

`xattr -p com.apple.quarantine bert-lenses.app` reports the flag if a copy ever
picks one up; `xattr -dr com.apple.quarantine bert-lenses.app` clears it.

### What is deliberately absent

No native file dialog and no filesystem library backend. Saving means putting a
model in **My library**, and that is one verb with one storage interface
(`web/src/library.ts`, `setLibraryBackend()`) behind it. IndexedDB backs it in
both the browser and the app today; a filesystem backend can be dropped in
later without adding a second way to save. File import/export stays what it is:
interchange between installs, not a competing save path.

### Icon

`scripts/make-icon.py` draws `src-tauri/icons/icon-src.png` from the app's own
tokens and body face, then runs `cargo tauri icon` and drops the iOS/Android
sets. It needs `fonttools` + `pillow`, which are not project dependencies — run
it in a throwaway venv (the docstring has the two lines).
