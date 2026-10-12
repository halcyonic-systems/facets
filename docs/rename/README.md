# The rename ledger: bert → facets

**Status: PROPOSED.** The ledger of the rename epic ([#541](https://github.com/halcyonic-systems/facets/issues/541)): the inventory of every occurrence of the old names, filed by class, the map the phases apply, and one dated entry per phase. Phase 1 renamed nothing; phase 2 renamed the crates; phase 3 renamed the wasm package, the web package and the saved-file format tag (entries below). Each phase regenerates the inventory and shows its classes at zero; `python3 scripts/rename_inventory.py --check` fails whenever the tree and the inventory on disk disagree, so a phase cannot claim a count it did not produce.

## Files

- [`inventory-2026-10-11.csv`](inventory-2026-10-11.csv) — one row per occurrence: `path,line,class,text` (text is the line, stripped, cut to 120 characters). A line naming two crates yields two rows. Ordered by path, line, column.
- [`map.csv`](map.csv) — `old,new,class,phase,note`. Rename rows carry the phase from #541 that applies them; `keep` rows say what is not renamed and why, including the names that are not this project's and the external URLs, each checked with a HEAD request on 2026-10-11.
- [`../../scripts/rename_inventory.py`](../../scripts/rename_inventory.py) — the walker and the classifier. `--self-test` pins the classifier on the synthetic tree under `scripts/fixtures/rename-inventory/` and the three hand counts below; `just check` runs it.
- [`../../scripts/rename_apply.py`](../../scripts/rename_apply.py) — applies the map one class at a time (`--classes`, `--phase`, `--include`/`--exclude`, `--dry-run`), classifying every token against the original line, and prints what the map leaves for the hand. `--self-test` applies phase 2 to a copy of the fixture tree and checks that exactly the mapped rows went; `just check` runs it.

## What counts as an occurrence

The token is `bert` on its own or with one of the crate suffixes (`-core`, `-compose`, `-canvas`, `-tether`, `-cli`, `-lenses`, `-lenses-kernel`, `-lenses-web`, in hyphen or underscore form), any case, with `_` allowed on either side so `bert_lenses_kernel_bg.wasm` and `CARGO_BIN_EXE_bert` count. `Bertalanffy`, `Hilbert` and `roberta` do not match, and a bare `bert` followed by a foreign hyphenated word (`bert-base`, `bert-nebulon-alpha`, `bert-typedb`, `bert-dev`) is another name and is skipped.

The walk takes what `git ls-files` reports (tracked, plus untracked files that are not ignored), so `target/`, `node_modules/`, `_site/`, `dist/` and the wasm-pack `pkg/` never enter the count. `docs/archive/` and `assets/archive/` are walked and reported as `lineage`, not excluded. The rename machinery itself (`docs/rename/`, `scripts/fixtures/rename-inventory/`, the script) is excluded; it is retired with the epic.

## Classes and the phase that empties each

The first rule that applies wins; the order is the order below.

| class | what it holds | emptied by |
|---|---|---|
| `external-url` | a URL carrying an old name | keep (both resolve; see `map.csv`) |
| `format-tag` | the saved-file format string `bert-lenses/canvas@1` | 3 (the writer; the reader keeps the old tag until 2027-01-11, and the four walkthrough archives keep it until phase 5) |
| `lineage` | `docs/archive/`, `assets/archive/`, `docs/decisions/`, the one history line in `README.md`, `AGENTS.md` and `THIRD_PARTY_NOTICES.md` | keep |
| `upstream-bert` | the BERT desktop app the crates were vendored from: `BERT`, `halcyonic-systems/bert`, `old-bert`, the `../bert` sibling checkout, `bert::` in stale rustdoc examples | keep (not this project) |
| `issue-ref` | `bert-lenses#N` (this repo under its old name) and `bert#N` (upstream) | keep; phase 6 may rewrite `bert-lenses#N` to `#N` |
| `deploy` | labels and paths outside the repo: the launchd label and plist, `~/halcyonic-apps/bert-lenses`, `~/Documents/bert-lenses`, `BERT_LENSES_*` env vars, the pipeline user agent, and the stale bundle and process names in two docs | 7 (6 for the stale doc lines; `src-tauri` already says Facets) |
| `workflow` | anything under `.github/` | 2 (crate paths), 4 (the CLI word in issue templates) |
| `crate-dir` | a path component `crates/bert-*`, `../bert-*`, `bert-*/src` — in Cargo, scripts, workflows, docs and the Lean manifest alike | 2 (a relative link in a doc breaks `doc_lint` the moment the directory moves, so the docs' paths move in the same PR, not in phase 6) |
| `import` | `use bert_…` in Rust; `from "bert-lenses-kernel"` in TS/JS | 2 (Rust), 3 (TS/JS) |
| `wasm-export` | a wasm-bindgen export carrying the name | none today |
| `package-name` | `bert-lenses-web`, the wasm-pack output `bert_lenses_kernel`, `bert-lenses-kernel` in a package manifest or build config | 3 |
| `golden` | a JSON a `BLESS_*` variable re-mints | 5 |
| `fixture` | any other non-prose file under `fixtures/` or `assets/`; a CLI word inside one (`bert verdict` in two annotation notes) is filed here, not under `cli-word` | 5 (the two CLI words: 4) |
| `cargo-name` | `name = "bert-…"`, a `[dependencies]` key, `-p bert-cli`, `--exclude bert-cli`, `Cargo.lock` | 2 |
| `rust-ident` | `bert_core` … `bert_cli` in a `.rs` file, and the `bert()` test helper | 2 (helper: 4) |
| `cli-word` | the `bert` binary: `bert run`, `just bert`, the `[[bin]]` name, `--bin bert`, `CARGO_BIN_EXE_bert`, bare `` `bert` `` in prose, the audit scripts' `--bert` flag | 4 |
| `doc-prose` | everything else: docs, READMEs, `AGENTS.md`, comments, SL comments, strings that are prose | 6 |

## Hand count (the phase 1 proof)

Three files read in full on 2026-10-11, counting occurrences by the definition above; the self-test asserts the script agrees. When a later phase changes one of these files the pin moves with it. Phase 2 changed all three (the kernel crate moved and its identifiers were renamed; the crate paths in `VENDORING.md` and the pkg path in `package.json` moved), so each was re-read in full the same day; the phase 1 readings are in the row's second column.

| file | hand count | script | phase 1 reading |
|---|---|---|---|
| `crates/facets-kernel/src/lib.rs` | 1 (line 1: the old crate name in the header comment, `doc-prose`, phase 6) | 1 | 8 at `crates/bert-lenses-kernel/src/lib.rs` (line 1: 1 · line 5: 2 · line 6: 2 · line 11: 1 · line 12: 1 · line 54: 1) |
| `docs/VENDORING.md` | 22 (lines 1, 13, 26, 27, 57: 2 each · lines 51, 54: 3 each · lines 9, 12, 35, 36, 46, 49: 1 each) | 22 | 25 (lines 1, 13, 15, 26, 27, 57: 2 each · lines 51, 54: 3 each · lines 9, 12, 35, 36, 46, 47, 49: 1 each) |
| `web/package.json` | 0 (phase 3 renamed the package names on lines 2 and 20; re-read in full) | 0 | 3 (line 2: 1 · line 20: 2) |

## What the classifier does not separate cleanly

- **The bare word `bert` names two things.** The CLI binary and the upstream desktop app share one lowercase word. The rules read the neighbourhood (`just bert`, a subcommand, `--bin`, a backtick: the binary; `old-bert`, `../bert`, `-C bert`, `bert::`, `halcyonic-systems/bert`: upstream) and the residue is filed `cli-word`. A reader applying phase 4 by the map must still read each `cli-word` line in `docs/VENDORING.md` and `AGENTS.md` before changing it.
- **`BERT` in capitals is filed `upstream-bert` everywhere**, but in several design docs (`docs/design/dynamics-*.md`, `hierarchical-decomposition-investigation.md`) and two web comments it means this project's models. Those lines are a phase 6 reading, not a mechanical replacement.
- **A crate name inside a Rust string** (`"bert-compose fills the slot"`, `"Ask the bert-lenses kernel"`) is prose that ships to users and to three goldens; it is filed `doc-prose` in the source and `golden` in the fixture, so phase 6 changes the string and phase 5 re-blesses the golden. The two must land together or the goldens go red.

## Decisions the map left open (decided by the owner on 2026-10-11, #541)

- The saved-file format string `bert-lenses/canvas@1` (`crates/facets-kernel/src/archive.rs`, `API.md`, four walkthrough JSONs, one web test) **bumps to `facets/canvas@1`** in phase 3, with a reader that accepts both for one release; then the old tag retires. The `format-tag` class is therefore emptied by phase 3, not kept. (Phase 3 did the writer side; the class keeps the reader's constant, the four walkthrough archives and the tests that open them until the retire date, 2027-01-11. See the phase 3 entry.)
- `fixtures/gates_truth_table.json` (generated by SSF's `GatesTruthTable.lean`, naming `../bert-lenses/` and `bert-core::check_bond` in its own text) **stays as lineage** until the next Lean pin move regenerates it.
- `BERT_LENSES_DATA_DIR` and `~/Documents/bert-lenses/` (tools/pipeline): **the data folder stays where it is; only the environment variable is renamed** (phase 7).

## Phase 2 (2026-10-11): the crates

Six directories moved with `git mv`, then the map was applied mechanically by `scripts/rename_apply.py`, one class group per commit. Classes emptied: `cargo-name` (85 → 0), `crate-dir` (292 → 6), `rust-ident` (426 → 48), `import` (214 → 8), `workflow` (13 → 7), with every remaining row accounted for below. The Lean manifest's six `stated_in` paths moved in the same PR and `docs/lean-provenance.md` was re-rendered (identical to the rewrite); Gate A resolves 74 symbols at the pin. No golden moved; no `BLESS_*` ran.

| class | before | after | what remains |
|---|---|---|---|
| `cargo-name` | 85 | 0 | — |
| `crate-dir` | 292 | 6 | `docs/VENDORING.md:26-27` (two `git show` commands pinned to revisions where the old paths are the true paths); `fixtures/gates_truth_table.json:4` and the two doc lines quoting it (lineage per the owner's decision); `docs/audits/docs-staleness-2026-10-11.md:97` (an audit record); `docs/design/educational-model-suite.md:291` (an old checkout path) — all phase 6 readings |
| `rust-ident` | 426 | 48 | the `bert()` test helper in `crates/facets-cli/tests/` (phase 4, with the binary) |
| `import` | 214 | 8 | the TS imports of `bert-lenses-kernel` in `web/src/` (phase 3) |
| `workflow` | 13 | 7 | the CLI word in two issue templates and one ci.yml comment (phase 4); the four `--out-name bert_lenses_kernel` pins (phase 3) |
| `package-name` | 20 | 25 | +6 from the `--out-name` pins in justfile and three scripts (phase 3 removes them with the pin), −1 `crateVersion("bert-lenses-kernel")` (see hand edits) |
| `doc-prose` | 505 | 488 | −16 module paths in `crates/facets-kernel/API.md`, −1 `crateVersion("bert-core")` (hand edits); the rest is phase 6 |
| every other class | unchanged | unchanged | `format-tag` 7, `golden` 8, `fixture` 8, `cli-word` 182, `deploy` 49, `issue-ref` 160, `upstream-bert` 138, `lineage` 146, `external-url` 2 |
| **total** | **2255** | **1282** | |

**Hand edits** (everything the script did not do, each read before and after):

- `crates/facets-kernel/API.md`: 16 lines quoting module paths (`bert_core::validate` and the like) renamed by `sed` over `bert_(core|compose|canvas|tether)::` so the frozen API doc names code that exists. The classifier files them `doc-prose`; the 47 like them under `docs/` wait for phase 6.
- Every `wasm-pack build` passes `--out-name bert_lenses_kernel` (justfile ×4 through an `out_name` variable, `ci.yml`, `desktop.yml`, `wasm-exec.yml` ×2, `publish-site.sh`, `publish-app.sh`, and the hint in `wasm_exec.mjs`): wasm-pack derives the output file names from the crate name, so without the pin the pkg would become `facets_kernel.js` and `web/src/kernel/index.ts` would not resolve. The pkg's own `package.json` name does become `facets-kernel` (wasm-pack takes it from the crate); `npm ci` resolves the `file:` link by path and the lock's `"name": "bert-lenses-kernel"` entry for it is stale until phase 3 renames the package.
- `web/vite.config.ts`: `crateVersion("bert-lenses-kernel")` and `crateVersion("bert-core")` → the new names. The function reads `crates/<name>/Cargo.toml`, so the argument is a directory, not the npm name the classifier took it for; `vite build` failed until it moved.
- `web/src/kernel/index.ts:121`: a path wrapped across two comment lines (`crates/bert-lenses-` / `kernel/API.md`), which the token rule cannot see as one path.
- `docs/VENDORING.md:26-27`: the script rewrote the two `git show` commands and they were put back; a path at a pinned revision is that revision's path.
- `scripts/rename_inventory.py`: the three hand-count pins moved (table above) and `rename_apply.py` joined the machinery exclusion.

**Not touched, by design:** the binary `bert` (`[[bin]] name`, `CARGO_BIN_EXE_bert`, `just bert`, the helper, every doc line: phase 4); `bert-lenses/canvas@1` (phase 3, dual reader); the npm package, the wasm file names, the `web/` imports and `web/package.json` names (phase 3); the lens note `"bert-compose fills the slot"` in `crates/facets-canvas/src/lenses.rs` and its three goldens (phase 6 with 5); `tools/pipeline`, launchd, `~/halcyonic-apps/bert-lenses` (phase 7); prose, `docs/archive/`, `assets/archive/`, ADR text, the README and AGENTS lineage lines.

**Commands run**, in order, from the repo root:

```
git mv crates/bert-core crates/facets-core            # and compose, canvas, tether, lenses-kernel→kernel, cli
python3 scripts/rename_apply.py --classes cargo-name,crate-dir --include Cargo.lock --include crates/    # 84 in 23 files
cargo update --workspace --offline                     # re-sorts Cargo.lock; cargo metadata --locked passes
python3 scripts/rename_apply.py --classes rust-ident,import --include crates/                           # 584 in 75 files
python3 scripts/rename_apply.py --classes crate-dir,cargo-name,workflow --exclude crates/               # 298 in 87 files
python3 scripts/lean_provenance.py render              # no diff beyond the rewrite
python3 scripts/lean_provenance.py resolve             # Gate A (pin) OK — 74 symbols
just check                                             # green end to end after the vite.config.ts hand edit
just wasm-exec                                         # 209 checks passed
python3 scripts/rename_inventory.py && python3 scripts/rename_inventory.py --check
```

`cargo tree --workspace` lists only `facets-*` members; `grep -rn "bert_core\|bert_compose\|bert_canvas\|bert_tether\|bert_lenses_kernel\|bert_cli" crates/` is empty.

## Phase 3 (2026-10-11): the wasm boundary, the web, the format tag

The wasm pkg is `facets_kernel.js` / `facets_kernel_bg.wasm` with the npm name `facets-kernel`; the web package is `facets-web`; the archive writer emits `facets/canvas@1`. Phase 2's `--out-name bert_lenses_kernel` pins were dropped rather than flipped: wasm-pack derives the file names from the crate name, which is now `facets-kernel`, so every `wasm-pack build` is back to its pre-epic form with the new path. Classes emptied: `package-name` (25 → 0), `import` (8 → 0), `workflow` (7 → 3). No golden moved and no `BLESS_*` ran; no `src-tauri` file names the pkg.

| class | before | after | what remains |
|---|---|---|---|
| `package-name` | 25 | 0 | — |
| `import` | 8 | 0 | — |
| `workflow` | 7 | 3 | the CLI word in two issue templates and one `ci.yml` comment (phase 4) |
| `format-tag` | 7 | 14 | kept until the old tag retires: `FORMAT_RETIRING` in `archive.rs`; `API.md:599` (append-only) and the appended note that names the old tag; the four walkthrough archives (re-minted in phase 5); the tests that open them (`format_tag.rs`, `archiveTag.kernel.test.ts`, `libraryTree.test.ts`) and the comments in the three staleness gates that say why they accept it |
| `doc-prose` | 488 | 481 | −7: the two crate labels in `FormalPanel.tsx` and `buildInfo.ts` (and its comment), a comment in `contract.test.ts`, the two `vi.mock` specifiers in `trap.test.ts` (hand edits, below); the rest is phase 6 |
| every other class | unchanged | unchanged | `golden` 8, `fixture` 8, `rust-ident` 48, `crate-dir` 6, `cli-word` 182, `deploy` 49, `issue-ref` 160, `upstream-bert` 138, `lineage` 146, `external-url` 2 |
| **total** | **1282** | **1245** | |

**The format tag** (the owner's decision 1). `archive::FORMAT` is `facets/canvas@1`; `archive::FORMAT_RETIRING` is `bert-lenses/canvas@1`. The reader decides by shape and never gated on the marker, so it opened the old tag before this phase and still does; `read` is unchanged. **The old tag retires on 2027-01-11**: after that date nothing in the repository writes or names it, and a file carrying it still opens by shape. The site publishes continuously and has no release numbers, so "one release" is read as one quarter; the date is a proposal for the owner to confirm. Proof on real files, none re-minted:

- `crates/facets-kernel/tests/format_tag.rs`: a walk of `assets/` and `fixtures/` finds exactly four files carrying the old tag (`assets/walkthroughs/digital-computer/level-1.json`, `llm-market/frontier-serving.json`, `llm-market/open-weight-serving.json`, `steel-plant/level-2.json`); each opens through `archive::read`, reads to the same model and identity under either tag, and saves back with the new tag and no other byte changed. `archive.rs` unit tests: the writer emits the new tag and never the old; both tags read to the same model.
- `web/src/archiveTag.kernel.test.ts`: each of the four through the real wasm and the face's own calls, the Open… import path (`openModel` then `writeArchive`) and the identity the browser library and the working folder key records by (`modelIdentity`). Neither the IndexedDB library (`modelStore.ts`, `library.ts`, `libraryTree.ts`), the working folder (`fsAccess.ts`) nor the import path checks the tag; all three read through the kernel or by shape. `libraryTree.test.ts` now writes the new tag and nests a child across the two.
- The CLI: `just bert verdict` on each of the four exits 0.
- The three walkthrough staleness gates (`digital_computer_walkthrough.rs`, `llm_market_walkthrough.rs`, `steel_walkthrough.rs`) compare the stored archive byte for byte with a fresh mint, which now carries the new tag. They accept a stored archive that differs from the mint in the tag alone, swapped to exactly `FORMAT_RETIRING`, until phase 5 re-mints the four; any other difference still fails.
- Made to fail on purpose, then restored: a reader that refuses the old tag turns `format_tag.rs` red; a writer that emits the old tag turns the two `archive.rs` tag tests red; the steel archive with its tag changed to another value, or with the old tag and one field changed, turns its staleness gate red.

**Hand edits** (everything the script did not do, each read before and after):

- The pin: the `out_name` variable and its three-line comment in the `justfile` and its four uses; the flag and its comment in `publish-site.sh` and `publish-app.sh`; the flag in the build hint in `wasm_exec.mjs`; the flag and its two-line comment in `ci.yml`, `desktop.yml` and `wasm-exec.yml` (×2). The classifier files workflow lines as `workflow`, and the map has no phase 3 `workflow` row.
- `web/package-lock.json`: the apply renamed all five rows in place; the `node_modules/facets-kernel` link entry was then moved to where npm sorts it (between `expect-type` and `fake-indexeddb`), checked against `npm install --package-lock-only`, whose other changes (a newer npm adding the tailwind wasm32 bundle's entries) were left out.
- `web/src/kernel/trap.test.ts`: the two `vi.mock` specifiers, which the classifier files as prose (it reads `vi.mock("` as no import); the apply had renamed the file name inside the second and left its package name.
- `web/src/kernel/index.ts`: the comment path phase 2 wrapped across two lines, rejoined as `crates/facets-kernel/API.md`.
- `web/src/FormalPanel.tsx` and `web/src/buildInfo.ts` (line 65, and the comment on line 27): the labels naming the kernel and core crates read `facets-kernel` and `facets-core`, the crates `vite.config.ts` reads the versions from. `web/src/kernel/contract.test.ts:5`: a comment naming the crate.
- The format tag (not a token the apply maps): `archive.rs`, the three staleness gates, `format_tag.rs` (new), `archiveTag.kernel.test.ts` (new), `libraryTree.test.ts`, the appended note in `API.md`, and the `format-tag` row of `map.csv` (now phase 3).
- `scripts/rename_inventory.py`: the `web/package.json` hand-count pin moved from 2 to 0 (table above).

**Found, not fixed (out of scope):** `THIRD_PARTY_NOTICES.md:188` still lists the wasm crate as `bert-lenses-kernel`, and `python3 scripts/gen_notices.py --check` reports the file stale; no gate runs that check. Phase 2's crate rename made it stale; the build copies it into `web/dist/`.

**Not touched, by design:** the binary `bert`, the `bert()` test helper and `CARGO_BIN_EXE_bert` (phase 4); the lens note `"bert-compose fills the slot"` and its three goldens (phases 5 and 6); doc prose, including the old crate names in `API.md`'s title, `lib.rs`'s header and the `justfile`'s first line (phase 6); deploy labels and `~/halcyonic-apps/bert-lenses` in `publish-app.sh` (phase 7); `tools/pipeline` (phase 7); archives and lineage.

**Commands run**, in order, from the repo root:

```
cargo test -p facets-kernel                            # the dual reader; the staleness gates red until they accepted the old tag alone
python3 scripts/rename_apply.py --phase 3 --classes package-name,import --include web/ --include justfile --include scripts/ --include .github/ --dry-run   # 35 in 16 files
python3 scripts/rename_apply.py --phase 3 --classes package-name,import --include justfile --include scripts/ --include .github/   # 9 in 4 files
python3 scripts/rename_apply.py --phase 3 --classes package-name,import --include web/                                             # 26 in 12 files
rm -rf crates/facets-kernel/pkg && just wasm           # pkg/facets_kernel.js, facets_kernel_bg.wasm; package.json name facets-kernel
rm -rf web/node_modules && (cd web && npm ci)          # node_modules/facets-kernel -> ../../crates/facets-kernel/pkg
(cd web && npx tsc --noEmit && npx vitest run && npx vite build)   # dist ships facets_kernel_bg-*.wasm; the build's wasm hash is filled
python3 scripts/rename_inventory.py && python3 scripts/rename_inventory.py --check
just check                                             # green end to end
just wasm-exec                                         # 209 checks passed
```

`grep -rn "bert_lenses_kernel\|bert-lenses-kernel\|bert-lenses-web" web/ justfile scripts/ .github/` finds only the rename machinery (`scripts/rename_inventory.py` and its fixture tree) and, in the gitignored `web/dist/`, the stale notices file above.

## Phase ordering

Phase 5 moves with phase 2: the Lean manifest's `stated_in` paths name `crates/bert-*` files and Gate A reads them, and the contract goldens embed a crate name in a lens note. The lists below are generated.

<!-- rename-inventory:begin (generated by scripts/rename_inventory.py; do not edit) -->

Occurrences: **1245** in **206** files (inventory of 2026-10-11, one row per occurrence).

### By class

| class | occurrences | files |
|---|---|---|
| external-url | 2 | 1 |
| format-tag | 14 | 12 |
| lineage | 146 | 21 |
| upstream-bert | 138 | 39 |
| issue-ref | 160 | 47 |
| deploy | 49 | 12 |
| workflow | 3 | 3 |
| crate-dir | 6 | 5 |
| golden | 8 | 3 |
| fixture | 8 | 6 |
| rust-ident | 48 | 5 |
| cli-word | 182 | 40 |
| doc-prose | 481 | 116 |

### By top-level directory

| directory | occurrences |
|---|---|
| docs/ | 540 |
| crates/ | 360 |
| (root) | 96 |
| scripts/ | 89 |
| web/ | 71 |
| assets/ | 43 |
| tools/ | 20 |
| fixtures/ | 18 |
| .github/ | 3 |
| .vscode/ | 3 |
| editors/ | 2 |

### Files with the most occurrences

| file | occurrences |
|---|---|
| AGENTS.md | 45 |
| crates/facets-core/src/lib.rs | 43 |
| README.md | 38 |
| docs/design/hierarchical-decomposition-investigation.md | 29 |
| scripts/author_audit.py | 29 |
| docs/design/dynamics-research/read-external.md | 27 |
| crates/facets-compose/src/circuit.rs | 26 |
| docs/archive/roadmap-pre-web-rebuild.md | 26 |
| docs/design/dynamics-research/read-category-theory.md | 26 |
| docs/design/dynamics-research/read-klir.md | 25 |
| docs/design/shape-vocabulary-research.md | 25 |
| scripts/seam_audit.py | 25 |
| crates/facets-cli/tests/surface.rs | 24 |
| docs/archive/canvas-architecture.md | 24 |
| crates/facets-core/src/validate.rs | 23 |
| docs/language/spec.md | 23 |
| crates/facets-canvas/src/canvas.rs | 22 |
| docs/VENDORING.md | 22 |
| assets/archive/README.md | 20 |
| docs/archive/arc2-authoring-design.md | 20 |

### Phase 5: goldens and fixtures to re-bless

Every `golden` and `fixture` row, by file. A golden is re-minted by its BLESS_* variable after phase 2 renames the crates; a fixture is edited by hand with its diff read.

| file | class | occurrences |
|---|---|---|
| assets/models/runnable-sample.json | fixture | 3 |
| assets/walkthroughs/llm-market/frontier-serving.sl | fixture | 1 |
| assets/walkthroughs/llm-market/open-weight-serving.sl | fixture | 1 |
| fixtures/cli/canonical.json | golden | 6 |
| fixtures/contract/canvas_analysis.json | golden | 1 |
| fixtures/contract/lens_description_mobus.json | golden | 1 |
| fixtures/gates_truth_table.json | fixture | 1 |
| fixtures/sl/drafted-ambient/atom.annotation.json | fixture | 1 |
| fixtures/sl/drafted-ambient/hydrogen-molecule.annotation.json | fixture | 1 |

9 files, 16 occurrences.

### Phase 5 moves with phase 2: `docs/lean-manifest.json` `stated_in` paths naming a crate

| line | paths | which |
|---|---|---|

0 `stated_in` lines, 0 crate paths. Gate A (`scripts/lean_provenance.py resolve`) reads these paths; they move in the same PR as the crate directories or the gate breaks.

<!-- rename-inventory:end -->
