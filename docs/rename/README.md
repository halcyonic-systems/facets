# The rename ledger: bert → facets

**Status: PROPOSED.** Phase 1 of the rename epic ([#541](https://github.com/halcyonic-systems/facets/issues/541)): the inventory of every occurrence of the old names, filed by class, and the map the later phases apply. This phase renames nothing. Each later phase regenerates the inventory and shows its classes at zero; `python3 scripts/rename_inventory.py --check` fails whenever the tree and the inventory on disk disagree, so a phase cannot claim a count it did not produce.

## Files

- [`inventory-2026-10-11.csv`](inventory-2026-10-11.csv) — one row per occurrence: `path,line,class,text` (text is the line, stripped, cut to 120 characters). A line naming two crates yields two rows. Ordered by path, line, column.
- [`map.csv`](map.csv) — `old,new,class,phase,note`. Rename rows carry the phase from #541 that applies them; `keep` rows say what is not renamed and why, including the names that are not this project's and the external URLs, each checked with a HEAD request on 2026-10-11.
- [`../../scripts/rename_inventory.py`](../../scripts/rename_inventory.py) — the walker and the classifier. `--self-test` pins the classifier on the synthetic tree under `scripts/fixtures/rename-inventory/` and the three hand counts below; `just check` runs it.

## What counts as an occurrence

The token is `bert` on its own or with one of the crate suffixes (`-core`, `-compose`, `-canvas`, `-tether`, `-cli`, `-lenses`, `-lenses-kernel`, `-lenses-web`, in hyphen or underscore form), any case, with `_` allowed on either side so `bert_lenses_kernel_bg.wasm` and `CARGO_BIN_EXE_bert` count. `Bertalanffy`, `Hilbert` and `roberta` do not match, and a bare `bert` followed by a foreign hyphenated word (`bert-base`, `bert-nebulon-alpha`, `bert-typedb`, `bert-dev`) is another name and is skipped.

The walk takes what `git ls-files` reports (tracked, plus untracked files that are not ignored), so `target/`, `node_modules/`, `_site/`, `dist/` and the wasm-pack `pkg/` never enter the count. `docs/archive/` and `assets/archive/` are walked and reported as `lineage`, not excluded. The rename machinery itself (`docs/rename/`, `scripts/fixtures/rename-inventory/`, the script) is excluded; it is retired with the epic.

## Classes and the phase that empties each

The first rule that applies wins; the order is the order below.

| class | what it holds | emptied by |
|---|---|---|
| `external-url` | a URL carrying an old name | keep (both resolve; see `map.csv`) |
| `format-tag` | the saved-file format string `bert-lenses/canvas@1` | keep, pending a decision (below) |
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

Three files read in full on 2026-10-11, counting occurrences by the definition above; the self-test asserts the script agrees. When a later phase changes one of these files the pin moves with it.

| file | hand count | script |
|---|---|---|
| `crates/bert-lenses-kernel/src/lib.rs` | 8 (line 1: 1 · line 5: 2 · line 6: 2 · line 11: 1 · line 12: 1 · line 54: 1) | 8 |
| `docs/VENDORING.md` | 25 (lines 1, 13, 15, 26, 27, 57: 2 each · lines 51, 54: 3 each · lines 9, 12, 35, 36, 46, 47, 49: 1 each) | 25 |
| `web/package.json` | 3 (line 2: 1 · line 20: 2) | 3 |

## What the classifier does not separate cleanly

- **The bare word `bert` names two things.** The CLI binary and the upstream desktop app share one lowercase word. The rules read the neighbourhood (`just bert`, a subcommand, `--bin`, a backtick: the binary; `old-bert`, `../bert`, `-C bert`, `bert::`, `halcyonic-systems/bert`: upstream) and the residue is filed `cli-word`. A reader applying phase 4 by the map must still read each `cli-word` line in `docs/VENDORING.md` and `AGENTS.md` before changing it.
- **`BERT` in capitals is filed `upstream-bert` everywhere**, but in several design docs (`docs/design/dynamics-*.md`, `hierarchical-decomposition-investigation.md`) and two web comments it means this project's models. Those lines are a phase 6 reading, not a mechanical replacement.
- **A crate name inside a Rust string** (`"bert-compose fills the slot"`, `"Ask the bert-lenses kernel"`) is prose that ships to users and to three goldens; it is filed `doc-prose` in the source and `golden` in the fixture, so phase 6 changes the string and phase 5 re-blesses the golden. The two must land together or the goldens go red.

## Decisions the map leaves open

- `DECIDE(2026-10-11): does the saved-file format string stay bert-lenses/canvas@1?` Every model saved from the app carries it (`crates/bert-lenses-kernel/src/archive.rs`, `API.md`, four walkthrough JSONs, one web test). Keeping it costs one line of lineage in the archive seam; changing it needs a reader that accepts both strings and a re-bless of the four walkthroughs.
- `DECIDE(2026-10-11): fixtures/gates_truth_table.json` is generated by SSF's `GatesTruthTable.lean` and names `../bert-lenses/` and `bert-core::check_bond` in its own text. Re-blessing it is an SSF-side change at the pin; the alternative is to leave the generator note as lineage.
- `BERT_LENSES_DATA_DIR` and `~/Documents/bert-lenses/` (tools/pipeline) point at one machine's data outside the repo; phase 7 decides whether the directory moves or only the env var name changes.

## Phase ordering

Phase 5 moves with phase 2: the Lean manifest's `stated_in` paths name `crates/bert-*` files and Gate A reads them, and the contract goldens embed a crate name in a lens note. The lists below are generated.

<!-- rename-inventory:begin (generated by scripts/rename_inventory.py; do not edit) -->

Occurrences: **2255** in **295** files (inventory of 2026-10-11, one row per occurrence).

### By class

| class | occurrences | files |
|---|---|---|
| external-url | 2 | 1 |
| format-tag | 7 | 7 |
| lineage | 146 | 21 |
| upstream-bert | 138 | 39 |
| issue-ref | 160 | 47 |
| deploy | 49 | 12 |
| workflow | 13 | 6 |
| crate-dir | 292 | 93 |
| import | 214 | 75 |
| package-name | 20 | 13 |
| golden | 8 | 3 |
| fixture | 8 | 6 |
| cargo-name | 85 | 35 |
| rust-ident | 426 | 46 |
| cli-word | 182 | 40 |
| doc-prose | 505 | 120 |

### By top-level directory

| directory | occurrences |
|---|---|
| crates/ | 1018 |
| docs/ | 699 |
| (root) | 165 |
| web/ | 141 |
| scripts/ | 122 |
| assets/ | 52 |
| tools/ | 20 |
| fixtures/ | 19 |
| .github/ | 13 |
| .vscode/ | 4 |
| editors/ | 2 |

### Files with the most occurrences

| file | occurrences |
|---|---|
| crates/bert-lenses-kernel/src/api.rs | 123 |
| crates/bert-canvas/src/canvas.rs | 72 |
| AGENTS.md | 64 |
| README.md | 53 |
| crates/bert-compose/src/export.rs | 47 |
| crates/bert-compose/src/circuit.rs | 43 |
| crates/bert-core/src/lib.rs | 43 |
| crates/bert-tether/src/forcing.rs | 43 |
| crates/bert-lenses-kernel/API.md | 37 |
| docs/design/hierarchical-decomposition-investigation.md | 37 |
| docs/language/spec.md | 33 |
| crates/bert-core/src/validate.rs | 32 |
| crates/bert-cli/src/main.rs | 31 |
| scripts/author_audit.py | 31 |
| scripts/seam_audit.py | 29 |
| docs/design/dynamics-research/read-external.md | 27 |
| scripts/mutation_check.py | 27 |
| docs/archive/roadmap-pre-web-rebuild.md | 26 |
| docs/design/dynamics-research/read-category-theory.md | 26 |
| docs/VENDORING.md | 25 |

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
| 31 | 1 | `crates/bert-core/src/transition.rs` |
| 128 | 2 | `crates/bert-core/tests/gates_truth_table.rs`, `crates/bert-core/tests/gates_oracle.rs` |
| 178 | 1 | `crates/bert-canvas/src/lenses.rs` |
| 230 | 1 | `crates/bert-core/src/decomposition.rs` |
| 284 | 1 | `crates/bert-compose/src/circuit.rs` |

5 `stated_in` lines, 6 crate paths. Gate A (`scripts/lean_provenance.py resolve`) reads these paths; they move in the same PR as the crate directories or the gate breaks.

<!-- rename-inventory:end -->
