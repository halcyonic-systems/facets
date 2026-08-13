# CLAUDE — bert-lenses (web-first)

## Invariants manifest

Read these before touching the repo. #1 is load-bearing; the whole architecture
exists to keep it true.

1. **Rust is the brain (as WASM in the browser); React/Tailwind is the face.**
   The kernel (`bert-core` + `bert-compose` engine → wasm) owns every systemhood
   verdict, all validation, and the entire simulation. The web layer holds ZERO
   formalism logic — presentation + ephemeral interaction state only. JS asks the
   wasm kernel for every verdict. **Any systems logic found in JS is a bug.**
2. **`crates/` = truth, `web/` = face.** The directory boundary embodies #1. New
   systems semantics go in a crate (default: `bert-core`, the semantic authority),
   consumed via the wasm boundary — never reimplemented in TS.
3. **Self-contained. No cross-repo path deps.** `bert-core` and `bert-compose` are
   vendored here. Do not re-introduce a `../bert` path dependency. `bert-compose`
   is engine-only (circuit/export/run/examples/ladder/lens) — no native egui shell,
   so it stays wasm-clean.
4. **The wasm API is frozen** (`crates/bert-lenses-kernel/API.md`). Add functions;
   don't mutate existing signatures. Wrappers are marshaling-only (deserialize →
   call kernel → serialize); no logic in `api.rs`.
5. **Web-first is a hard target:** browser + mobile + Claude-in-Chrome. Keep the
   kernel wasm-clean (no `std::fs`, `std::thread`, `SystemTime::now()`, native
   sockets on the wasm path — the browser supplies dates, fetch, storage).
6. **Fun to use is the north star.** Build simple, build beautiful, one honest
   step at a time. Design system: Halcyonic Frost (`web/DESIGN.md`).
7. **Mobus semantic authority = the Lean, not the book or memory.** Mobus's
   knowledge is scattered; the canonical, machine-checked source is
   `systems-science-foundations/Systems/Mobus/Tuple.lean` — the **8-tuple**
   `⟨C, N, E, G, B, T, H, Δt⟩`. CITE it, don't reconstruct. Essential facts that
   get forgotten: **E (environment) is first-class** (objects + milieu, `C∩E=∅`);
   **H is History**, not hierarchy; **Messages are copyable / not conserved**
   (Material + Energy are conserved). The lens palettes encode this:
   `docs/design/lens-palettes.md`.

## Layout

- `crates/bert-core` — vendored kernel. Wasm-clean (dropped the `reflect` feature).
  The semantic authority: `validate::validate`, `operational::validate_operational`.
- `crates/bert-compose` — vendored engine. `circuit` (physics), `export` (JSON seam
  both ways), `run` (recorder), plus `examples`/`ladder`/`lens` vocabulary. Uses
  `glam::Vec2` for node geometry (was `egui::Pos2`).
- `crates/bert-canvas` — the canvas/lens domain, pure Rust (NO wasm-bindgen).
  `canvas` (the serializable `CanvasModel`, `project` / `to_canvas` /
  `validate_connection`) + `lenses` (`lens_facts` — boundary identity set, edge
  ladder, ports, aggregate verdict, all canvas-keyed — and `describe`, the formal
  face). Depends on bert-core.
- `crates/bert-tether` — the boundary-interface subsystem, pure Rust (NO
  wasm-bindgen). The CSV import ritual (`tether`), the declarative run manifest
  (`manifest`), and the forced-run pipeline + `mapping_status` (`forcing`).
  Neither engine physics nor marshaling — the interface where empirical data
  becomes forcing on a model. Depends on bert-core + bert-compose.
- `crates/bert-lenses-kernel` — the wasm-bindgen boundary, MARSHALING ONLY
  (`api.rs`): deserialize JS input → call bert-core / bert-compose / bert-canvas /
  bert-tether (the truth) → serialize. Zero domain logic. Built to `pkg/` via
  wasm-pack (gitignored). Frozen surface: `API.md` (append-only).
- `crates/bert-cli` — the `bert` binary, the workspace's only `[[bin]]`. A
  headless door onto the same library calls the wasm boundary marshals: compile,
  verdict (under any lens), describe, run, layout. Native only — the ONE package
  excluded from the wasm build, and the exclusion is gated by its own test.
- `web/` — React 19 + TS + Vite 6 + Tailwind 4. `src/kernel/` is the only place the
  face touches the wasm; `src/kernel/types.ts` mirrors the API.md shapes.
- `assets/` — sample models. `models/examples/*.json` (blockchain models) are the
  **canonical epitome of old-bert's STRUCTURAL/diagramming peak** — kept for
  reference and future revamp (old bert peaked as a structure visual tool; its
  sim bolt-ons never landed — that executable frontier is what this rebuild cracks
  via the in-browser compose engine). They are structural, not executable. No
  model here is precious; all bert-lenses models to date were toy demos.
  **The shipped library is a curated KEEP SET since #318** (2026-08-12):
  `examples/` holds six entries and nothing else, `corpus/**` holds the 19
  author exemplars, and everything the library grew as a by-product of building
  is in `assets/archive/` — out of the gallery, out of the CLI survey, still
  compiling and still read by three gates that need it. Read
  `assets/archive/README.md` before adding to `examples/` or concluding a model
  is gone. An SL-authored runnable demo's bundled model is a machine projection
  of its `.sl` (never hand-edit the JSON; re-mint with `BLESS_SL_DEMOS=1`, gated
  by `crates/bert-canvas/tests/sl_demos.rs`, one resident: `llm-market`).
  **Authoring a new runnable model? Read `docs/authoring-models.md` FIRST** —
  what actually makes a model run (three gates in order; quantities are not one
  of them) plus the five facts that bite (deaf receivers #261, the matter
  tap, where `amount` acts, stocks start at zero, loops need memory).
  `models/runnable-sample.json` is a throwaway minted from the engine.

## Working rules

- After changing any crate, rebuild the wasm pkg (`just wasm`, or `wasm-pack build
  --target web --out-dir pkg` in `crates/bert-lenses-kernel`) before the web app
  will see it. A crate change must never silently serve stale wasm to `web/`.
- Gate: `just check` runs the full suite (cargo test + clippy `-D warnings` +
  wasm32 build + wasm pkg build + `tsc --noEmit` + `vite build`) — the same gates
  CI enforces (`.github/workflows/ci.yml`). `cargo build --workspace --target
  wasm32-unknown-unknown` must stay green.
- Many asset models are STRUCTURAL: they validate but do not project to a runnable
  spec. **"Only genuinely parameterized models run" was false and is withdrawn** (#216):
  *no* SL-authored model is parameterized, because `Relation` carries no `amount` or
  `unit` and `project()` hardcodes `Decimal::ONE` — yet five of them run a conservation
  trajectory today, and every `@lens klir` model runs as a DTMC in the shipped UI.
  Parameterization decides whether a run is *meaningful*, not whether it happens; the
  actual gates are lens mode, primitive presence, and endpoint typing.
- The rule that replaces it, scoped by set: **don't add a primitive, rate, or stock to
  a `corpus` entry to make run() work — the `omits` line is the answer. Do fix an
  `examples` model that cannot run**, since examples hold what we say and have no source
  to hide behind.
- The prior egui app is on tag `pre-web-rebuild` / branch `archive/egui-app`.
- Full phase plan: `~/.claude/plans/cold-start-prompt-scalable-galaxy.md`;
  GitHub issues #11 (plan) + #41/#42/#43/#44 (phases 0–3, all implemented).
- Phase 3 rule of thumb: every ontology-bearing visual reads a `lens_facts` /
  `describe` field (kernel verdicts, canvas-keyed). If a rendering branch needs
  a systems fact the kernel doesn't expose yet, extend `lenses.rs` — don't
  derive it in TS. Faithfulness cites live in code comments next to each rule.

## Verifying your work (agents) — all verified 2026-07-27, none inferred

Two paths. Use the headless one for anything a machine can decide; reserve the
desktop one for what genuinely needs eyes. Choosing wrong is the common failure:
driving the GUI to answer a kernel question produces a one-shot artifact that
rots the next time the kernel moves.

### Headless — START HERE. `bert`, the CLI, is the first door for any model question

**Reach for the CLI before the browser, before a throwaway test, and before
reasoning about what a model probably does.** `bert` (`crates/bert-cli`, the
workspace's only `[[bin]]`) answers compile / verdict / describe / run / layout
from a shell, in JSON, with an exit code that means something.

```bash
just bert verdict assets/corpus/bunge/coupling-sigma3.sl --lens bunge   # 0
just bert verdict assets/corpus/bunge/coupling-sigma3.sl --lens mobus   # 4 — §4.3
just bert compile <f> | jq '.things[] | {id,name,role,interface}'      # what it became
just bert layout  <f>                                                  # node positions
just bert run     <f> --t 30                                           # or why it cannot
```

Exit 0 = the answer is on stdout · 3 = did not compile · 4 = the kernel refused.
`--lens` is the **cross-lens door**: it reads a model under a tradition it is not
pinned to. It is a CONSUMER of the crates — a verdict computed there is the same
verdict, and the same bug, as one computed anywhere else.

**Why this is stated so bluntly** (2026-08-12): five wrong claims were made in one
day by describing a model instead of opening it — a verdict declared correct from
a meeting transcript, a canvas measured by arithmetic that was a fifth off, a
service blamed for an error whose cause was in its own log. Every one was settled
in one command. If a question is about what a model IS, run `bert` rather than
argue.

### The same truth from inside Rust

When you are already writing Rust, `bert_canvas::lenses::analyze(&CanvasModel, Lens)`
(`crates/bert-canvas/src/lenses.rs`) takes the lens as an **explicit argument and
ignores `model.lens`** — the same cross-lens door the CLI's `--lens` exposes.

```rust
let parsed = bert_canvas::sl::parse_sl_full(&text)?;           // compile
let verdict = bert_canvas::lenses::analyze(&parsed.model, Lens::Mobus);
let refused = verdict.validation.issues.iter().any(|i| i.severity == Severity::Error);
```

Companion: `describe(&model, lens)` for the tradition's own formal object
(Klir `(T,R)` / Bunge `⟨C,E,S,M⟩` / Mobus 8-tuple). A **refusal is not a distinct
type** — it is a `ValidationIssue` with `Severity::Error` at the lens's mode
(`Lens::mode()`: Klir→Core, Bunge→Structural, Mobus→Operational), carrying a
`code` naming the defect kind (#319) that groups instances without regex.

```
bert compile  <file.sl>                 the canvas model the text becomes
bert verdict  <file> [--lens L]         CanvasAnalysis; exits 4 on a refusal
bert describe <file> [--lens L]         the tradition's formal object
bert run      <file> [--t T] [--dt D]   the trajectory, or why there is none
bert layout   <file>                    node positions (id/name/role/env_kind/x/y)
```

stdout is JSON and only JSON; diagnostics go to stderr. Exit codes: `0` ok ·
`1` internal · `2` usage · `3` the input did not compile · `4` the kernel
refused. **3 against 4 is the split that matters** — a mistyped keyword and a
model that is not a system are different findings. A file argument is a path or
`-` for stdin; `.sl` compiles, anything else opens through `archive::read`.
Full treatment: README, "The `bert` CLI".

`bert-cli` is the ONE package excluded from `cargo build --workspace --target
wasm32-unknown-unknown` (argv + filesystem have no browser meaning). The
exclusion is executed, not asserted: `crates/bert-cli/tests/wasm_gate.rs` goes
red if the list grows, so the wasm gate cannot widen into one that skips things.

**Still write the test when the finding is a law.** The CLI is for asking; a
`cargo test` integration test in `crates/bert-canvas/tests/` is for making the
answer stay true, and it is picked up free by `cargo test --workspace` and
`ci.yml`. Working example: `tests/cross_lens.rs`. The CLI's own tests
(`crates/bert-cli/tests/`) hold the door open the same way, at two strengths
(#317): `fixtures/cli/canonical.json` is a **full** cross-lens reading of six
named models — three keep-set examples plus one corpus entry per tradition — so
a kernel change that moves any of them has to be seen and accepted; every other
bundled model gets the **weak** check (`library_survey.rs`: it parses, the door
answers, no content snapshotted), so renaming or repairing one costs no
re-bless. Adding a model to the canonical set is a claim that we would defend
its verdict; observing a refusal is not — the survey prints those instead.

**Know which set of `.sl` files you are touching. The names are not
interchangeable:**

| Path | Name | Holds | Obligation |
|---|---|---|---|
| `assets/corpus/**` | source corpus | what the **author** says | ships clean under its pinned lens; citations gated |
| `assets/examples/**` | examples | what **we** say | no provenance obligation |
| `fixtures/sl/**` | golden corpus | round-trip fidelity | out of the corpus suites by design |

`source_corpus.rs` gates each corpus entry under **its own pinned lens only**.
That is correct for a ship gate and it is why cross-lens claims need their own
test: an entry's behaviour under the other two lenses is otherwise unexecuted.

### Desktop — driving the real `.app`

**Build the bundle. Never verify against `cargo tauri dev`.**

```bash
cargo tauri build     # → src-tauri/target/release/bundle/macos/bert-lenses.app
open src-tauri/target/release/bundle/macos/bert-lenses.app
lsappinfo info -only bundleid $(pgrep -f bert-lenses-desktop | head -1)
#   built .app  → "systems.halcyonic.bert-lenses"   ← addressable
#   tauri dev   → [ NULL ]                          ← invisible to Launch Services
```

`tauri dev` also serves `127.0.0.1:1430` under `devCsp`, so **every CSP or wasm
claim made against it is a false positive.** No install to `/Applications` is
needed; it runs in place from `target/`.

The working mechanism is the **Accessibility API via AppleScript**, not
computer-use MCP and not devtools. A WKWebView exposes its DOM to the a11y
hierarchy, so elements come back **named** — the return value is the verification:

```bash
osascript -e 'tell application "System Events" to tell process "bert-lenses-desktop"
  get name of every button of UI element 1 of scroll area 1 of group 1 of group 1 of window 1
end tell'
# → HOME, Klir, Bunge, Mobus, REVIEW, SL, ▶ Run, thing, ≡ PROCESSES, RUN, FORMAL, ANALYST, TYPE
```

The three lens buttons are addressable by name, so lens switching is deliberate
rather than a coordinate guess.

Gotchas, each hit in practice: `screencapture -x -o a.png b.png c.png` (it grabs
only the current display set, and the window is often on another); divide
screenshot coordinates by the backing scale factor before clicking (screenshots
are 2× on Retina, `System Events` wants logical points); quit with
`pkill -f bert-lenses-desktop` (`quit app` does not terminate it). Fuller
treatment, including the devtools workaround: `~/.claude/docs/desktop-app-automation.md`.

### The standard a new check has to meet

**A check that cannot fail proves nothing.** Before claiming a gate works, make
it go red on purpose: mutate the input so the property is genuinely violated,
watch the test fail with the message you intended, then restore. `cross_lens.rs`
was verified this way — deleting σ₃'s self-actions turns it red.

This is the same rule the corpus states for itself (*"a model that cannot
embarrass us is not testing anything"*), applied to tests. It exists because the
σ₃ refusal — the corpus's one documented divergence between traditions — sat
asserted only in an English `# note:` and a message string in `validate.rs`, with
nothing binding them, until #216.

## Extending the palette (new node / port type)

Adding a node or port type touches the kernel first and the face last — the
verdict is born in Rust and only rendered in TS. Do the eight steps in order; the
type is not "real" until every layer knows it. Skipping a step (e.g. rendering a
type the kernel never validates) reintroduces systems logic in JS — invariant #1.

1. **bert-core type** — add the variant to the domain type in `crates/bert-core`
   (`src/lib.rs`). This is the semantic authority; the type exists here or nowhere.
2. **`validate_mode` case** — teach `crates/bert-core/src/validate.rs`
   (`validate` / `validate_mode`) what makes the new type well-formed per mode.
   No verdict lives outside this crate.
3. **bert-canvas projection** — map it across the canvas↔model seam in
   `crates/bert-canvas/src/canvas.rs` (`project` / `to_canvas`), so the authoring
   shape and the formal `WorldModel` stay in sync.
4. **`lens_facts` field** — expose whatever the face needs to render as a
   canvas-keyed fact in `crates/bert-canvas/src/lenses.rs` (`lens_facts`). The
   face reads facts; it never recomputes them.
5. **`describe` branch** — add the formal-object text to `describe` in the same
   `lenses.rs`, per lens (`Lens::Klir | Bunge | Mobus`).
6. **`LensRegistry` entry** — wire the render in `web/src/canvas/lenses/registry.ts`
   (`LensRegistry`), the one place the face binds a lens to its views.
7. **contract fixture** — add/extend a golden in `fixtures/contract/` and its
   parser in `web/src/kernel/contract.test.ts` (regenerate with `BLESS_FIXTURES=1`
   after a crate change, then rebuild the wasm pkg — see Working rules).
8. **view module** — render it in the per-lens view module under
   `web/src/canvas/lenses/{klir,bunge,mobus}.tsx` (shared bits in `common.tsx`),
   reading only the `lens_facts` / `describe` fields from steps 4–5.
