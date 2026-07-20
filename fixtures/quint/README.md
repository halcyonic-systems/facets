# Quint mode-ladder trace fixtures (bert-lenses#17)

Committed ITF (Informal Trace Format) traces of the mode-ladder spec, replayed
against the real bert-core mode machine by `crates/bert-core/tests/quint_replay.rs`.

The traces are generated **offline** with the Quint CLI and committed here, so CI
replays them with nothing but `serde` — no Quint, no Java, no Apalache. The
replay test SKIPs loudly (never fails) if a fixture is missing.

## Source spec

`quint-lab/specs/mode_ladder.qnt` (the faithful spec) and its planted-bug sibling
`mode_ladder_buggy.qnt`. Both are Apalache-verified (`quint verify`, see the spec
header). One step = one operation on a model (edit / upgrade / downgrade / run
attempt / record / witness-rebuild).

## Fixtures and how each was generated

Run from `quint-lab/specs/` with Java on PATH
(`export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"`). Seeds are pinned so the
committed traces are reproducible.

| Fixture | Command | What it exercises |
|---|---|---|
| `ladder_walk_run.itf.json` | `quint run mode_ladder.qnt --invariant=witness_reaches_run --out-itf=ladder_walk_run.itf.json --max-steps=20 --max-samples=20000 --seed=0x1` | A full ladder walk that reaches a live run. The green done-when. |
| `h_hazard.itf.json` | `quint run mode_ladder.qnt --invariant=witness_reaches_h_hazard --out-itf=h_hazard.itf.json --max-steps=25 --max-samples=60000 --seed=0x5` | Record H, downgrade past it, edit — the recording-invalidation machinery, replayed green. |
| `buggy_silent_projection.itf.json` | `quint run mode_ladder_buggy.qnt --invariant=noSilentPartialProjection --out-itf=buggy_silent_projection.itf.json --max-steps=20 --max-samples=50000 --seed=0x2` | Planted bug 1: the run gate drops the strict `executable` conjunct and runs a non-projectable model. The real machine REFUSES. |
| `buggy_stale_h.itf.json` | `quint run mode_ladder_buggy.qnt --invariant=downgradeEditInvalidatesH --out-itf=buggy_stale_h.itf.json --max-steps=25 --max-samples=40000 --seed=0x11` | Planted bug 2: a downgrade forgets to move the content hash, so a stale recording poses as valid. The real machine's `content_hash` has moved — it does NOT confirm. |

The `witness_*` invariants are designed to fail: `quint run` returns the
violating trace, which is exactly the interesting path (a reached run, a reached
hazard). The `noSilentPartialProjection` / `downgradeEditInvalidatesH` runs on the
buggy sibling return the counterexample where the bug bites.

Regenerate all four with `quint-lab/scripts/gen_mode_ladder_traces.sh`.

## ITF shape

`states` is an array of variable assignments; booleans are plain JSON, integers
are `{"#bigint":"n"}`. The replay harness reads `mode`, `hasBond`, `irreflexive`,
`executable`, `running`, `hRecorded`, `hValid`, `downgradedSinceRecord`,
`editedSinceDowngrade`, `witnessIntact`, `edits` from each state. See the harness
header for the concretization mapping (spec knob → bert-core structural lever).
