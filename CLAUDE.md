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

## Layout

- `crates/bert-core` — vendored kernel. Wasm-clean (dropped the `reflect` feature).
  The semantic authority: `validate::validate`, `operational::validate_operational`.
- `crates/bert-compose` — vendored engine. `circuit` (physics), `export` (JSON seam
  both ways), `run` (recorder), plus `examples`/`ladder`/`lens` vocabulary. Uses
  `glam::Vec2` for node geometry (was `egui::Pos2`).
- `crates/bert-lenses-kernel` — the wasm-bindgen boundary (`api.rs`) + the pure CSV
  tether (`tether.rs`, `manifest.rs`). Built to `pkg/` via wasm-pack (gitignored).
- `web/` — React 19 + TS + Vite 6 + Tailwind 4. `src/kernel/` is the only place the
  face touches the wasm; `src/kernel/types.ts` mirrors the API.md shapes.
- `assets/` — sample models. `models/examples/*.json` are MIXED-VERSION fixtures
  (older blockchain models from different BERT eras — all still validate). Prefer
  the RECENT canonical models (`thermostat.json`, `*-generic.json`) as demo samples;
  `models/runnable-sample.json` is minted (executable) for run() demos.

## Working rules

- After changing any crate, rebuild the wasm pkg (`wasm-pack build --target web
  --out-dir pkg` in `crates/bert-lenses-kernel`) before the web app will see it.
- Gate: `cargo build --workspace --target wasm32-unknown-unknown` must stay green.
- Most asset models are STRUCTURAL (mode=Full but not executable) — they validate
  but do not project to a runnable spec. Only genuinely parameterized models run.
  Don't "fix" a structural model to make run() work; that's expected.
- The prior egui app is on tag `pre-web-rebuild` / branch `archive/egui-app`.
- Full phase plan: `~/.claude/plans/cold-start-prompt-scalable-galaxy.md`;
  GitHub issues #11 (plan) + #41/#42/#43 (phases).
