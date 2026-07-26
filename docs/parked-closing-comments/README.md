# docs/parked-closing-comments — transient

**Status: LIVE.** Drafted closing comments for the parked issues retired into
[`../parked.md`](../parked.md). **This directory is temporary and is deleted once
the issues are closed.**

Each file is the body of one `gh issue comment` — post it, then close the issue:

```bash
gh issue comment <N> --body-file docs/parked-closing-comments/<N>.md
gh issue close <N>
```

Always `--body-file`, never `--body "…"`: a body passed as a shell string runs
backticks as command substitution and silently eats fenced blocks.

**Post these only after this change is on `main`.** Every comment links to an
anchor in `docs/parked.md` on `main`; posted from a branch, the backlink is a
promise to a file that does not exist yet.

| File | Issue |
|---|---|
| [`105.md`](105.md) | Constellation authoring — trigger already fired |
| [`121.md`](121.md) | RA bridge: ensemble dataset export |
| [`125.md`](125.md) | Two-reader fork in the README (done) |
| [`126.md`](126.md) | Illustrated quickstart |
| [`127.md`](127.md) | Symbol-anchored citations + issue-link liveness |
| [`144.md`](144.md) | Formalizing the system life cycle |
| [`150.md`](150.md) | Rung 3 — the extraction theorem |
| [`166.md`](166.md) | External↔external flows render as stubs |
| [`172.md`](172.md) | The neutral interchange |
| [`197.md`](197.md) | Mobus's illustrative models as executable examples |

#88 needs no comment — it was closed 2026-07-26 with its own note, and appears in
`parked.md` as the precedent entry.
