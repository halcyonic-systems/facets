# Vendoring — where `bert-core` and `bert-compose` came from

**Status: LIVE.** The provenance record for the two vendored crates: the branch point, what was changed on the way in, how far the copies have drifted, and what happens when upstream moves. Written to answer one question mechanically — *what here is ours?* (#234 F13.)

## The branch point

| | |
|---|---|
| **Upstream** | `halcyonic-systems/bert` |
| **Branch-point commit** | **`40de7a7203ef3aa6300f72d7f37bc5a2e93c70ee`** |
| | *feat(compose): carry dt_stride across the seam — a slow channel's Δt survives to the wire […]* · 2026-07-14 17:06 −0400 |
| **Vendored in** | `5175835eb486fca0deb023645698761676db59cb` — *feat: rebuild bert-lenses web-first — self-contained wasm kernel (Phase 0)* · 2026-07-14 19:56 −0400 |
| **Crates taken** | `bert-core`, `bert-compose` |

**Established by content, not by timestamp.** Comparing the vendored `bert-compose/src/circuit.rs` against upstream candidates from that day: `40de7a7` and its parent differ by 12 lines, the commit before that by 79, and the one before that by 179. The minimal-diff commit that is also the last one touching either crate before the vendoring is the branch point. (`bert-core/src/lib.rs` was stable across all four candidates and cannot discriminate on its own — its constant 49-line delta is the vendoring edit, not upstream drift.)

(The subject is elided at `[…]`; the SHA is the identifier. The elided words use
the mode-entry vocabulary retired in #90, which the doc gate refuses in a LIVE
doc even inside a quotation. Trimming the quote was the honest fix — widening
the gate's exemption list to admit quotations would blunt a check that is
working.)

Reproduce it:

```bash
git -C bert-lenses show 5175835:crates/bert-compose/src/circuit.rs > /tmp/vendored.rs
git -C bert     show 40de7a7:bert-compose/src/circuit.rs         > /tmp/upstream.rs
diff /tmp/vendored.rs /tmp/upstream.rs        # 12 lines: the glam-for-egui swap
```

## What changed on the way in

The vendoring is not a verbatim copy. Two deliberate edits, both in service of one goal — **the kernel must compile to `wasm32-unknown-unknown` and pull in no UI crate at all**:

1. **`egui::Pos2` → `glam::Vec2`** for node geometry. This is the entire 12-line delta in `circuit.rs`: a field type, a constructor signature, and a test-local import alias. `bert-compose` upstream depended on `egui` purely to name a point.
2. **The native egui shell was not taken.** Upstream `bert-compose` carries `app.rs`, `askhal.rs`, `docs.rs`, `glyph.rs`, `main.rs`, `sweep.rs`, `theme.rs`, and `ui/`. None of it came across. What is here is engine-only.

Recorded in [`docs/decisions/0002-web-first-rebuild.md`](decisions/0002-web-first-rebuild.md).

## Drift since the branch point

**Ours has moved. Upstream's has not.**

| | vendored here | upstream at branch point |
|---|---|---|
| `bert-core` total | ~10,300 lines | ~5,600 |
| `bert-core/src/validate.rs` | 3,775 | 1,750 (**2.2×**) |
| Modules that exist only here | `decomposition.rs`, `model_id.rs`, `units.rs` | — |
| `bert-compose` | engine-only, plus `markov.rs` | full app |

**Upstream `bert` has made two commits since `40de7a7`, both documentation, and zero touching `bert-core/` or `bert-compose/`:**

```bash
git -C bert rev-list --count 40de7a7..HEAD -- bert-core/ bert-compose/    # 0
```

This corrects the W30 audit, which recorded that "upstream is not dormant — it has continued shipping into `bert-core/`, including a breaking `refactor(core)!`". Every commit it cited (`refactor(core)!: collapse AgentModel.primitives`, `§4.2 bert#108 identity-default lowering`, `§A5 mode-transition validators`) lands on **2026-07-10 and 07-11 — before the branch point**, and is therefore already included in what was vendored. The audit read the log without checking which side of the vendoring each commit fell on.

## What this repository is, then

**A successor, not a fork under maintenance.** At 2.2× on the file that carries the semantics, with three modules that exist nowhere upstream and an engine deliberately stripped of its host, these crates are no longer a copy that tracks something. Nothing here promises to follow upstream, and nothing upstream promises to follow this.

Said plainly because a dissertation committee will ask *what is yours*, and the answer should be mechanical rather than narrative: **diverged at `40de7a7` on 2026-07-14; `decomposition.rs`, `model_id.rs` and `units.rs` are original to this repository; `validate.rs` is 2.2× its upstream size; upstream has not touched either crate since.**

## What happens when upstream moves

There is no sync mechanism and none is planned. **Read the changelog, not the diff** — quarterly, or when upstream announces something relevant — and port only entries that name a bug this repository also has. That is what ADR-0002's phrase "pulled in deliberately, not tracked live" means, stated as a procedure rather than a posture.

A port is a normal change: it arrives as a PR, passes `just check` and `just wasm-exec`, and says in its message which upstream commit it corresponds to. It is not a merge and it is not a rebase.

**If a port ever happens, add a row here.** A provenance file with one row and no history is a file nobody thought to update.

## Licence

Every crate under `crates/` was written for this repository, and all five are MIT under the root [`LICENSE`](../LICENSE) — see the lineage note in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md). The upstream repository carries its own MIT licence naming a different original author for the **2024 Bevy application**, which is not vendored here and none of whose code is present in these crates.
