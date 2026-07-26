# ADR 0002 — Rebuild web-first: React + wasm kernel, retiring the egui app

*2026-07-14 · Phase 0 (web-first rebuild) · status: **ADOPTED***

> **Reconstructed retrospectively (2026-07-18).** No ADR was written when this
> call was made; this record is rebuilt from the repo trail — the Phase 0 commit
> `5175835` (2026-07-14) and its message, the current README's structure/status
> sections, and the retired egui-era docs (`archive/canvas-architecture.md`,
> `archive/roadmap-pre-web-rebuild.md`). The *facts* (what changed, what was
> vendored, what was preserved) come straight from that trail. The *rationale*
> is reconstructed from the commit message and README rather than a
> contemporaneous options memo, and is flagged as such where it matters.

## Context

bert-lenses began on 2026-06-15 as a single native egui crate — a
choose-a-paradigm prototype that grew, over Arc 1 (view) and Arc 2 (author),
into a hand-built direct-manipulation canvas (`src/main.rs`, ~3500 lines,
egui/eframe 0.31; the as-built record is `archive/canvas-architecture.md`). That
app was real and working: it authored models in Klir/Bunge/Mobus vocabulary,
stamped the exported `WorldModel` with the active lens's mode, and routed every
systemhood verdict through bert-core.

But it was **native-only**. Reaching it meant `cargo run` on a machine with a
Rust toolchain, or shipping a macOS `.app` bundle. That closed off the three
surfaces the instrument most wants:

- an ordinary **browser tab** (no install, shareable by URL),
- **mobile**, and
- **inside Claude-in-Chrome** — the guarded-LLM-in-the-loop north star, where an
  agent reads and co-authors the model in the same page a human does.

The kernel itself carried no reason to be native: bert-core and bert-compose's
engine are pure Rust formalism. The native weight lived only in the *shell*
(eframe, `ureq`, `rfd`, `std::fs`, threads). So the load-bearing question was
whether to keep growing the egui app or to move the formalism to a platform the
whole reachable surface shares.

## Decision

**Rebuild web-first.** Convert the single egui crate into a cargo workspace whose
Rust kernel compiles to `wasm32-unknown-unknown` and runs synchronously in the
browser tab (wasm-bindgen, no back end, no IPC); React 19 + Vite + Tailwind is
**only the face**. The organizing invariant: *Rust is the brain, React is the
face* — `crates/` is truth, `web/` is face, any systems logic in JS is a bug.

Concretely, at Phase 0 (`5175835`):

- **Vendor bert-core** wasm-clean as-is (drop the optional `reflect` feature).
- **Vendor bert-compose engine-only** — circuit/export/run/examples/ladder/lens —
  dropping the native egui shell it carried upstream, and swapping `egui::Pos2`
  for `glam::Vec2` so the engine pulls in no UI crate. Wasm-clean by construction.
- **New crate `bert-lenses-kernel`**: the frozen wasm-bindgen boundary
  (marshaling-only wrappers, no formalism in JS), documented in `API.md`.
- **`web/`**: a React/Vite/Tailwind smoke slice on the Halcyonic Frost tokens,
  loading the wasm kernel in-page and rendering live systemhood / projection /
  run verdicts.

**Clean break, not a fork to maintain.** The egui app is preserved for the record
on tag `pre-web-rebuild` / branch `archive/egui-app`, and is not carried forward.

## Rationale

*(Reconstructed from the Phase 0 commit message and the current README; there was
no contemporaneous alternatives memo.)*

- **The reachable surface is the browser.** Browser, mobile, and Claude-in-Chrome
  are all one platform — wasm in a tab — and the egui app reached none of them.
  This is the decisive reason; the rest are enabling facts.
- **The kernel was already portable.** The formalism had no native dependency;
  only the shell did. Vendoring the engine wasm-clean (drop eframe/`ureq`/`rfd`,
  `Pos2`→`Vec2`) was a bounded move, not a rewrite of the systems logic.
- **The brain/face split gets enforced by the boundary, not by discipline.**
  With the kernel behind a wasm-bindgen surface and JS able only to marshal, "no
  formalism in the face" becomes structural — the face literally cannot decide a
  verdict.
- **It unblocks the text-native render.** A browser face made the hand-rolled
  React+SVG canvas possible (ADR-0001), whose XML output is itself legible text an
  agent can read — the shape a bounded-reasoner-in-the-loop wants.

## Consequences

- **Enabled everything after it.** ADR-0001 (SVG canvas) and the whole Phase
  1→3 web build (CSV tether, the kernel projection seam, faithful Klir/Bunge/Mobus
  lens ontologies, the wasm error boundary) all sit on this rebuild.
- **The egui-era docs became history.** `canvas-architecture.md` and
  `fidelity-audit.md` were quarantined to `docs/archive/` and marked HISTORICAL;
  their *kernel-seam semantics* (mode stamping, audit-panel verdict-quoting)
  carried over unchanged and are still accurate, but their UI mechanics are gone.
  The pre-web-rebuild roadmap was likewise retired to `archive/`.
- **Native is now optional, via the same web app.** A Tauri wrapper can later host
  the identical `web/` app natively — native became a packaging choice, not a
  separate codebase.
- **The vendored engine carries a small standing cost.** `bert-core` /
  `bert-compose` are vendored (no cross-repo path deps), so upstream engine
  changes are pulled in deliberately, not tracked live — the price of a
  self-contained, wasm-ready kernel. The branch point, the drift, and what
  "deliberately" means as a procedure are recorded in
  [`../VENDORING.md`](../VENDORING.md).

## Status note

Marked **adopted**: the rebuild is in force and load-bearing — it is the only app.
There is no as-built architecture doc for the React canvas yet; until one exists,
`archive/canvas-architecture.md`'s *semantic* content (not its UI mechanics) and
`docs/kernel-architecture.md` are the closest current references.
