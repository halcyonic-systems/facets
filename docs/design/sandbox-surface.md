# The sandbox surface

**Status: ADOPTED** — shipped on `feature/process-sandbox` (Phases 0–4), 2026-08-17.

The free-play instrument the desktop compose shell was ("touch the system":
drop work processes, wire them, watch matter/energy/information flow, tweak
parameters mid-run), rebuilt over the vendored engine as a surface of this
app. Three decisions of record:

## 1. Placement: a document entry, never a third mode

#345 is doctrine: the mode axis is Model | Data, and a run is a *state* of
the Model surface. The sandbox therefore enters as a **document kind from
Home** (`?sandbox=1`, a Home door beside the other doors) and never appears
on the mode axis. Its relationship to the Model surface is the document,
not the chrome: a saved sandbox **is a WorldModel** — `Session::to_model` /
`from_model` ride the lossless `export::to_world_model` / `from_world_model`
seam, then the ordinary canvas archive (ADR 0004) — so "graduation" is just
saving, and the saved model opens on the Model surface like any other.
The round trip may *reorder* nodes (the import path groups terminals first);
it never changes any node's trajectory — matched by name, pinned by
`session::graduation_laws` and the graduation smoke.

## 2. The live seam: the boundary's ONE stateful export

The sandbox's defining interaction — a parameter tweaked mid-run without
resetting stocks — cannot be expressed by the batch run seam
(`RecordedRun::record` resets first and returns a finished trace). So the
wasm boundary carries exactly one stateful class, `SandboxSession`, wrapping
an engine-side `bert_compose::session::Session` (natively tested; the wasm
layer stays marshaling-only). The carve-out and its trap story are in
API.md ("The sandbox seam"): a session is an instrument's live state, never
the document of record.

Transport division: the **face owns the clock** (a wall-clock accumulator at
ticks/s, `web/src/sandbox/transportClock.ts`, driven by rAF), the **engine
owns every transition**. The transport deliberately **pauses while the tab
is hidden** and resumes at rate rather than fast-forwarding the hidden
interval (the dropped-baseline law) — a sandbox is watched, not farmed.

## 3. Abstract quantities without a physics quarrel

"Model networks of process primitives doing operations on numbers" gets its
clean home from ADR 0003 / the dynamics position (#86): conservation is an
invariant the model **declares**. The transport bar's "declare conservation"
toggle sets `Invariant::{ConservedAdditive,None}` on the live circuit —
identical trajectory either way, ledger and ⚖ badge only where declared.
`DeclaredSubstance::bare` is the default for hand-placed free emitters, and
the substance law is enforced by the inspector exactly as the desktop did
(Sink absorbs; pass-throughs inherit — "set it at the Source"; signal
primitives locked to Message; free emitters choose from the dictionary).

## Troncale stamps are macros, not atoms

The palette's "Systems processes" section stamps `ladder.rs` rungs — each a
circuit of primitives with the composition honesty line and provenance in
the tooltip and inspector ("part of a Feedback process — stamped from
primitives, editable freely"). The witness engine (detectors over the
recorded trace flagging *signatures associated with* systems processes,
never asserting identity) is the planned Phase 5, gated on the SP typology
research; nothing in this surface asserts an SP happened.

## What this is not

Not a third mode (#345); not a second engine (the vendored `bert-compose`
crate is the only stepper); not a new document format (a sandbox is a
WorldModel); not a realtime/shared surface (#88 stays closed); not an
upstream `bert` repo change.
