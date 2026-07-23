# LLM-authored SL: the draft→preview→assess→accept pipeline (plan of record)

*2026-07-23 · plan · serves #10 (resident co-author) AND #14 (real-system modeling queue) — they are one program. Builds on `llm-integration-research.md` (the first-principles foundation) and the SL/`compile_sl` flow that shipped after #10/#9 were written.*

## The reframe that unblocks #10

#10 and its spike #9 were created 2026-07-11; **SL 2.0 (#82) landed 2026-07-18** — a week later. So #10's typed-ops framing (and its #1/#13 gates, the "parameter story") was designed for a world with no SL-text write surface. That world changed: `compile_sl` (SL text → validated `CanvasModel`, deterministic) is live in the SL pane, and the corpus (#132) proved LLMs author faithful SL. **The SL-text path authors a whole spec at once, so it sidesteps the incremental-typed-ops gates entirely.** The typed-ops path (#9) remains the route for incremental *editing*; SL-authoring is the route for *drafting/replacing a spec*, available now.

## The invariant, and the three gates

*LLM proposes, kernel disposes* — but "disposes" is **legality**, not authorship. Three distinct gates (germen's proven shape, `active/germen/`):

1. **LLM drafts** the SL — proposes *structure*.
2. **`compile_sl` + `validate_mode` dispose** — check *legality* (well-formed kernel structure, legal in the active lens). Automatic, authoritative. Lens-fidelity is near-free: `describe(model, lens)` feeds the LLM already-lens-labeled structure, and `validate_mode` hard-rejects cross-lens structure.
3. **The human accepts** — checks *meaning* (is this the system I meant?). The kernel can't judge this; only the author can. **This is the line between "LLM proposes" and "LLM authors."**

## The loop (the spine)

> **describe → LLM drafts SL → SL renders on the canvas as a PREVIEW (+ shows in the pane) → author edits SL / re-sees canvas / assesses → accept (commit) or discard (revert).**

"Compile" is **preview** (non-committed render), not commit. "Accept" is **commit** (this becomes the working model); "discard" restores the prior model. Because the intermediate is **human-readable SL text**, the review is *informed* — the author reads (and can edit) exactly what the LLM proposed, and assesses the *visual system* on the canvas before being on the hook for it. This upgrades the automation-bias defense (research §9): you accept a system you've looked at and can revert, not a plausible string.

## Rungs (each composes into the next; do NOT skip ahead)

- **Rung 0 — the preview/accept machinery (no LLM).** A "preview vs committed" model state in the app: draft SL → preview on canvas → accept (keep) / discard (restore stash). Reuses `compile_sl`, the canvas renderer, and the SL pane's existing `guardDiscard` discipline. *De-risks the write path independently of any model, and is useful for a human pasting SL.* **This is also the curation surface** for Rung 2.
- **Rung 1 — single LLM draft.** The drafter drops into the Rung-0 loop: a description → an SL-text generation route (GSR SL-mode, or prompt the LLM to emit SL directly via the existing `gsr.ts` seam) → the SL lands in the pane → preview → assess → accept. Frontier-tier v1 (the #10 receipt). Emit germen's five-part traceable response; instrument a coverage dial from day one. **Window-on-demand, never ambient (the God-tool guard).**
- **Rung 2 — the sweep (where #14 gets nearly done).** The LLM authors *many* candidates — across the four #14 targets and deliberately across lenses/domains — and the author reviews each: **accept / reject WITH a one-line rationale (why good / why bad).** Accepted models accumulate (fixtures / a runnable corpus); the rationale is a labeled "what good SL authoring looks like" record that sharpens the prompts and seeds few-shots. This is the corpus discipline (#132) scaled to *runnable* domain models.

## Why this serves #14 (the synergy, explicit)

- **The pipeline IS the modeling engine.** Sweep-authoring + human curation is how the four #14 targets get built fast, with oversight.
- **It fills the runnable-non-Mobus-model gap** (found at #153/#14): the corpus entries are structural (don't run), so lens fidelity for Bunge/Klir can't be judged today. A sweep produces runnable Bunge-/Klir-native models — the thing that lets `BungeStateSpace` and the coming Klir behavior-function readout be judged on native data.
- **The rationale ledger** is reusable calibration data (the blind-pick / coverage-dial discipline), not throwaway.

## What's genuinely new to build (small, on a proven backbone)
1. Rung 0: the preview/committed model state + accept/discard (App state; reuses `guardDiscard`).
2. Rung 1: the SL-**text** generation route (GSR emits extraction-JSON today, not SL text) + the authoring window.
3. Rung 2: batch drafting + the per-candidate accept/reject-with-rationale + accumulation.

Everything else — `compile_sl`, `validate_mode`, the canvas renderer, the SL pane, GSR routing, `describe()` lens-injection, germen's `Drafter`/`Response` patterns — already exists.

## The library is the curation home (#148) — a Rung-2 prerequisite

Rung 2 accumulates *many* swept models; they land in the library. The current flat gallery (which #148 was filed against, from the #132 corpus overwhelming it) makes curating a sweep miserable. So **#148 is a prerequisite for Rung 2** — not for Rung 0/1 (those are canvas-side). It is mostly a *design decision*, not hard once decided, and must NOT balloon into #105 (the constellation-graph epic, parked). What the curation loop needs:

- **Facets:** group/filter by **tradition** (klir/bunge/mobus), **domain**, and **status/provenance** (source-corpus · LLM-drafted-pending · accepted) — and by **sweep batch** so a run is browsable as a unit.
- **At-a-glance cards:** enough to judge without opening (name, lens, size, and the accept/reject state + rationale from Rung 2).
- **The rationale is a first-class field** on an accepted/rejected model — the "why good/why bad" ledger lives here, browsable.

Sequence: **Rung 0 (canvas preview/accept) → Rung 1 (single draft) → [#148: the faceted library] → Rung 2 (sweep + curate into it).**

## Open decisions (Shingai)
- SL-generation: an SL mode in GSR vs prompt-the-LLM-to-emit-SL via `gsr.ts`. (Lean: reuse `gsr.ts`, add an SL prompt.)
- Surface: dedicated window vs in-page copilot. (Guard: window-on-demand.)
- Rung 2 accumulation target: a fixtures dir, a runnable-corpus dir, or the library.
