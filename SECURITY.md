# Security

This project invites outside audit — of the Lean proofs behind its verdicts, and
of the code that reads them. The same door receives vulnerability reports, and
until this file existed the first finder's only channel was a public issue.

## Reporting a vulnerability

Email **rsthornton@gmail.com** with `bert-lenses security` in the subject. That
address is the maintainer's, and appears on every commit in this repository, so
it can be verified against the history rather than trusted from this file.

Please include what you did, what happened, and what you expected. A proof of
concept helps and is not required. If you would rather not send details in
plaintext, send a note asking for a key and one will be provided.

**Please do not open a public issue for a vulnerability.** Once this repository
is public, GitHub's private vulnerability reporting should be enabled and named
here as the preferred channel; it is unavailable on private repositories, which
is why email is the channel today.

Expect an acknowledgement within a week. This is a small research project with
no on-call rotation — that is the honest commitment, not a service level.

## What is in scope

The shipped artifacts: the wasm kernel under `crates/`, the web app under
`web/`, and the macOS bundle built from `src-tauri/`.

Two properties this project asserts, and would treat a break of as a
vulnerability even where no memory is corrupted and no data leaks:

- **The kernel is the only source of verdicts.** Any path by which LLM output,
  host-side code, or a crafted model file produces something the app presents as
  a machine-checked verdict is a security bug. See `web/src/kernel/types.ts`.
- **Nothing leaves the machine until the user enables it.** Co-authoring is off
  by default, and the artifact names no network address but this machine's. Any
  outbound request from a default install is a security bug.

## Known dependency advisories

### npm — 5 advisories, all in the test runner, none shipped

`npm audit` in `web/` reports 5 advisories (1 critical, 1 high, 3 moderate) as of
2026-07-26. Every one of them resolves to `vitest@2.1.9` and the `vite@5.4.21`
it nests under it:

| Advisory | Severity | Package | Reaches the artifact? |
| --- | --- | --- | --- |
| [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) — Vitest UI server can read and execute arbitrary files | critical | `vitest` | No |
| [GHSA-fx2h-pf6j-xcff](https://github.com/advisories/GHSA-fx2h-pf6j-xcff) — `server.fs.deny` bypass on Windows | high | nested `vite` 5.4.21 | No |
| [GHSA-4w7w-66w2-5vf9](https://github.com/advisories/GHSA-4w7w-66w2-5vf9) — path traversal in optimized-deps `.map` handling | high | nested `vite` 5.4.21 | No |
| [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) — dev server responds to any website's requests | moderate | nested `esbuild` 0.21.5 | No |
| [GHSA-v6wh-96g9-6wx3](https://github.com/advisories/GHSA-v6wh-96g9-6wx3) — `launch-editor` NTLMv2 hash disclosure on Windows | moderate | nested `vite` 5.4.21 | No |

**Accepted, not ignored**, on three findings that can be checked rather than
asserted:

1. **None of these packages ships.** `npm ls --prod --all` resolves 49 packages;
   `vitest`, `vite`, and `esbuild` are in none of them. They are absent from
   `THIRD_PARTY_NOTICES.md` §4 for the same reason.
2. **The vulnerable `vite` is not the one that builds the artifact.** The build
   uses top-level `vite@6.4.3`, which is patched for all three vite advisories.
   `vite@5.4.21` exists only under `node_modules/vitest/` and
   `node_modules/vite-node/`.
3. **The exposure is a developer running a dev server or the Vitest UI on a
   machine that also browses a hostile page.** `just check` and CI run
   `vitest run`, which starts no UI server; nothing in this repository invokes
   `vitest --ui`.

**Not a permanent state.** The fix is `vitest@4`, a semver-major upgrade that
touches every test file's runner. It is deliberately not bundled into the
release-readiness gate, where a test-runner migration would put the whole suite
in question at the moment its verdict matters most. Tracked separately; re-check
this table when it lands.

### Cargo — none

`cargo-deny` runs the RustSec advisory database against the workspace on every
push (`.github/workflows/deny.yml`, config in `deny.toml`). There are no
accepted advisories: the allow-list in `deny.toml` covers licences only, and any
new advisory fails the build rather than landing here.

## What this project does not claim

The macOS app is **not** Developer-ID signed and **not** notarized, by a
disclosed and deliberate decision. See `docs/running-permanently.md` for what a
stranger downloading it actually sees. The consequence worth naming here: with
no signing identity there is no auto-update channel, so a fix for anything on
this page reaches users only when they fetch a new build.
