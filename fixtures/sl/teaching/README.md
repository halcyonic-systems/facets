# SL teaching fixtures

A small, dedicated set of `.sl` files written **for learning the language** —
graded from a two-line first model up through two instructive failures. Read
them in order:

| File | Compiles? | Lesson |
|---|---|---|
| [`01-hello-system.sl`](01-hello-system.sl) | yes | The smallest useful model: two things, one flow. What `system` / `component` / `source` / `flow` / `@lens` each do. |
| [`02-adapt-bathtub.sl`](02-adapt-bathtub.sl) | yes | Copy-and-adapt: the bathtub's stock-and-flow pattern retargeted, line for line, to a savings account. Seeing a new system as an old pattern. |
| [`03-error-undeclared-flow.sl`](03-error-undeclared-flow.sl) | **no (on purpose)** | Declare-before-use (spec §4.3): a flow endpoint with no thing line. Reading a fail-loud error and its line number. |
| [`04-error-env-attribute.sl`](04-error-env-attribute.sl) | **no (on purpose)** | Attributes belong to `component`s only; environment things are opaque (§4.3). Also shows SL collecting *every* fault in one pass (§4.6). |

Each error file states its expected error(s) — message and 1-indexed line — in
a footer comment, so the file documents the diagnostic it exists to produce.

## Why this set exists (and why edits here are free)

The three goldens in [`../`](..) (`process-m.sl`, `bathtub.sl`,
`hal-projection.sl`) are **dual-use**: each is simultaneously a round-trip
golden, a spec §9 worked example, and a teaching example. The corpus-precedence
rule ([`docs/language/README.md`](../../../docs/language/README.md), "Corpus
precedence") ranks those roles when they conflict — **round-trip correctness
comes first**, so a teaching-motivated tweak that would perturb a golden's
round trip is out of scope for those files.

This directory is where that pressure is released. These fixtures carry **no**
round-trip or spec obligation; they are graded for pedagogy alone. Pedagogical
edits — clearer comments, a gentler ramp, a new failure to learn from — are
free here and should land here, never on the goldens.

## Verification

All four were checked against the real parser (`bert_canvas::sl::parse_sl`),
not by inspection: 01 and 02 parse and project clean at Core mode; 03 and 04
fail with exactly the errors quoted in their footers. They are deliberately
kept **out of the test suites** — they are learning material, not goldens, and
adding them as tests would re-create the dual-use coupling this set removes.
