# The Canvas Is the Document — Run Executes What You See

**Status: ADOPTED (2026-07-28).** Decision of record for the run seam: the Run
button executes the projection of the current canvas model when the canvas
carries edits, replacing the frozen stored-artifact-only rule. Adopted by
Shingai in the 2026-07-28 run-deck design session (walkthrough log item #11);
supersedes the "projected JSON is NEVER fed to the run path" comment that
previously guarded `runWith`.

## The problem

Every serious simulation tool shares one architecture: **one model document;
parameters are part of the document; Run executes the current document;
provenance is handled by stamping runs, never by refusing to run edits.**
bert-lenses instead ran only the stored demo artifact (the minted projection
of the `.sl` + CSV + manifest), so canvas edits provably never reached the
Run button — a flow amount edited in the editor changed nothing on re-run.
The canvas was a viewer with editing affordances whose edits went nowhere at
run time.

## Why the freeze existed, and why it is now redundant

The freeze protected provenance when provenance lived in the artifact: a
gallery Run always executed the published, calibrated model. That machinery
has since moved into the kernel, which makes the freeze scaffolding:

1. **Identity is CI-proven.** `sl_demos.rs` asserts the stored demo model IS
   the projection of its `.sl` for every shipped demo — for an untouched
   canvas, running the projection instead of the artifact is byte-identical.
2. **Provenance is hash-stamped.** A recorded trace is keyed to
   `OperationalSpec::content_hash()`; an edited model hashes differently, so
   an edited run is machine-checkably distinct from the shipped calibration
   and stale traces already refuse to pose as current.
3. **Correctness is gated.** `validate_operational` refuses, legibly, any
   edit that breaks runnability — the projection cannot run wrong silently.

The freeze protected provenance because provenance used to live in the
artifact; the content hash moved provenance into the kernel, which makes the
freeze redundant. Removing it is subtraction of scaffolding, not addition of
risk.

## The decision

- **Clean canvas → run the stored artifact** (unchanged behavior; provably
  identical to the projection for shipped demos).
- **Dirty canvas → run `project(canvasModel)`** through the same
  `force_and_run` path, same manifest and CSV.
- **The UI states which model ran**: shipped calibration vs edited model.
  The shipped `.sl` numbers are thereby named what they are — the *baseline
  calibration* — and user edits are departures from it.

## What this founds

- **Editable inputs (walkthrough #11):** a run-inputs panel generated from
  the spec's own taxonomy (drivers = source-originating amounts and forced
  series; allocations = process-outflow weights; signals) edits the canvas
  and re-runs through this seam — no second parameter store.
- **Scenarios ([#202](https://github.com/halcyonic-systems/facets/issues/202)):**
  named sets of departures from baseline, compared across runs.
- **Typed parameters ([#112](https://github.com/halcyonic-systems/facets/issues/112))**
  slot underneath without changing the seam.

## Non-goals

Serialization of edited runs into the model (the trace stays an observer's
record outside the `WorldModel`, per `run.rs`); mutation of the shipped
bundles (baseline calibration stays a repo artifact, edited only through the
`.sl` → mint pipeline).
