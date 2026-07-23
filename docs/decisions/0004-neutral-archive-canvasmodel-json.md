# ADR 0004 — The archive is the neutral model, encoded as CanvasModel JSON

*2026-07-22 · issue #140 · status: **accepted***

## Context

The library persisted `project(canvasModel)` — WorldModel JSON. WorldModel is
the Mobus 8-tuple projection, and that seam is lossy on exactly the non-Mobus
vocabulary (verified in `crates/bert-canvas/src/canvas.rs`):

| SL word | Whose | Fate |
|---|---|---|
| `mere` | Bunge (B̄) | dropped — `project` keeps only bonds (`:318`); inverse hardcodes `is_bond: true` (`:646`) |
| `: field` | Bunge | collapses to Energy (`:66-68`), returns as Energy (`:532-537`) |
| `@directed` | Klir | inverse hardcodes `false` (`:648`) |
| `system : Concrete/Social` | Bunge | inverse writes `default()` (`:672`) |

Every Mobus word survives. So saving a Bunge or Klir model and reopening it
silently destroyed that tradition's content — a correctness defect in a tool
whose entire claim is that one model is faithfully readable as three traditions.

Two decisions had to be made, and only the first is a matter of principle.

## Decision 1 — the archive is the neutral model (principle)

**An archive must not be a lens's projection.** `WorldModel` is not the villain:
it is Mobus's lens format, and Mobus's 8-tuple is the *dynamical* one — `run()`
consumes it, and it carries T and Δt, which is what running requires. Being
Mobus-shaped is correct for that job.

The defect was that one artifact did two jobs with incompatible requirements:

| Role | Requirement | Artifact |
|---|---|---|
| Archive / interchange | must lose nothing | the neutral model |
| Executable projection | must be Mobus-shaped | `WorldModel` (lossy **by design** — dynamics does not need `mere`) |

`CanvasModel` carries the union of all three vocabularies with each term tagged
to its tradition (`role`, `kind`, `is_bond`, `klir_directed`, `primitive`,
`system_type`). Per the neutrality result recorded during the intermediate-spec
work, a rich-AND-neutral format cannot exist — richness *is* lens commitment —
so the correct archive is a neutral container carrying lens-tagged content,
which is what `CanvasModel` is.

`project()` keeps its job. It stops being what the library writes.

## Decision 2 — the encoding is JSON, not SL (engineering)

`CanvasModel` JSON and SL text are the **same content**: SL's round-trip
fixpoint (`spec.md` §7.2, `crates/bert-canvas/tests/sl_roundtrip.rs`) is exactly
the proof that they are isomorphic. Both satisfy Decision 1 completely and
equally.

**This is therefore not a question first principles can settle**, and it was a
category error to look for one there. The principle fixes the *content*; the
*encoding* is free, and the choice is made on engineering grounds.

The deciding constraint is that there are two storage backends, and one of them
is a bare directory. `readModelFileByRef` (`web/src/fsAccess.ts:71-83`) resolves
a child reference by reading every file in a picked working folder and calling
`modelIdentity(text)` on each — there is no record to denormalize metadata into.
With SL, resolving one `decomposes` reference would mean **compiling every `.sl`
file in the folder, on every resolution**. An archive read by a backend with no
index must be self-describing; JSON is, SL is not.

Secondary, non-deciding: `@pos` changes on every node drag, so SL archives would
carry constant layout churn in their diffs — weakening the readability argument
that is SL's main draw.

Rejected: **both as archive.** Two writable representations of one model with no
answer to "which wins when they disagree" is the exact failure that disqualified
the proposed corpus stamper (see the #132 planning review); adopting it here
after rejecting it there would be incoherent.

## Consequences

- The library writes the neutral model with a format + version marker.
- **Read both, write neutral.** `toCanvas` remains the legacy import path;
  existing `.json` files keep opening.
- Migration is **necessarily destructive** and old records are legacy, not
  upgradable: what an old file already dropped cannot be recovered. A version
  marker is therefore mandatory, not optional.
- SL is unaffected in status. It remains the authoring surface, the interchange
  format, the shipped corpus format, and the LLM authoring target. `compile_sl`
  and `emit_sl` are already on the frozen API; SL import/export costs nothing.
- **Per-lens exports are not needed** and should not be built on spec. If ever
  wanted they are nearly free: Klir's is the incidence matrix over (T,R),
  Bunge's the coupling matrix M — both already computed and rendered by their
  registers.
- This is a hard precondition for lens-plural dynamics (#100 phase 5). A Bunge
  state-space run is over the *properties of the things*, which the old archive
  discarded; a Klir behavior function is oriented by his input/output
  declaration, which the old archive hardcoded to false.

## Enforcement — structural, not a rule

The defect went unnoticed because the encoding was re-decided at seven call
sites. A convention ("remember to use the archive") or a grep gate would both
have been bandaids: a grep cannot tell an in-memory projection from a stored
one, and it false-positives on the word `project()` appearing in prose. The seam
is therefore sealed by construction:

- **Writes are type-sealed.** `writeArchive` returns a branded `ArchiveText`,
  and `saveModel` / `writeModel` accept only that type. `JSON.stringify(project(m))`
  is a plain `string`, so persisting a projection is a **compile error**. Writes
  are the destructive direction, so this is where the guarantee belongs.
- **There is only one reader.** `open_model` is a superset of the
  WorldModel-only conversion, so the face no longer exposes a second reader to
  reach for by mistake — `toCanvas` is gone from `web/src/kernel/index.ts`
  (the wasm export remains, the API being append-only). Bundled demos, which
  are `WorldModel`s by design, read through the same door as everything else.

`project` keeps its legitimate in-memory uses (the analyst context, export, the
run path) and needs no guard, because it can no longer reach storage.

## Human readability, without a second archive

The readability SL offers is real and should not be lost. It is recovered as a
**projection on demand** rather than a second stored format — the same move this
ADR makes everywhere else:

1. **The SL pane, already shipped.** `SlPane` emits the current model as SL
   beside the canvas. Any model is one click from readable text, today.
2. **SL import/export**, already on the frozen API (`compile_sl` / `emit_sl`).
3. **Git diffs that read as SL** — the strongest remaining gap, and cheaply
   closed: a `.gitattributes` entry plus a `diff.textconv` driver that prints a
   model file as SL. Diffs then read as SL while storage stays JSON, with no
   dual write and no ambiguity about which file is authoritative. Not built
   here; recorded as the answer if repo-level readability is ever wanted.

The through-line: **readability is a view, not a storage format.** Project it
when a human is looking, rather than paying for it in the archive forever.
