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

## Local-model readiness + the scaffolding that shrinks the job (the drafter question)

The goal is *make the model work as little as possible to do the job right* — push correctness into the harness so a small **local** model suffices, and only the plausibility is asked of the weights. Two findings and a stack.

**Finding 1 — the best local model already clears the free-form bar.** A live probe (2026-07-23, `scratchpad/sl_probe.sh` → the headless `bert-canvas --example slcheck` legality checker) handed local models a *fresh* system not in the corpus (a thermostat/furnace control loop), the compact grammar, and the two teaching fixtures as few-shots. **`gemma4:12b` emitted valid SL first try** — `OK things=5 relations=4`, and *modeled it well*: Sensor as a `Sensing` primitive, informational flows for the control loop, `matter` for gas, `energy` for heat leakage. So the floor is met by a 7.6 GB local model with **few-shots + compact grammar alone** — no grammar-constrained decoding required to get a legal, sensible draft. (`ornith` returned empty/flaky; `qwen3:32b` = the heavier reasoner fallback.)

**Finding 2 — the kernel already carries the correctness the model would otherwise have to.** `parse_sl_full` is deterministic and its errors *name the fix* (`unknown keyword \`x\` (system, domain, time, component, source, sink, environment, flow, boundary)`). That turns robustness into a cheap loop, not a smarter model.

**The scaffolding stack (least-work-for-the-model), most already built:**
1. **Kernel owns legality** — `compile_sl` + `validate_mode` reject illegal/cross-lens SL. The model only has to be *plausible*; a wrong draft is caught, never absorbed. *(exists)*
2. **Human owns meaning** — Rung 0 preview/accept (shipped, PR #155). The draft need only be *close enough to accept-or-fix*, not right. *(shipped)*
3. **Few-shots + compact grammar in-prompt** — the model pattern-matches a worked example, doesn't invent the grammar. The teaching fixtures are the exemplars. *(exists; the probe used exactly this)*
4. **Compile→error→retry** — feed the parser's keyword-listing faults back on failure; near-free, and the single biggest robustness gain per token. *(build: a small loop in the authoring route)*
5. **RAG-narrowing of few-shots** — retrieve the most relevant corpus entries per task via GSR's existing narrowing, so the prompt stays small and on-target. *(exists via GSR)*
6. **`describe(model, lens)` injection for edits** — hand the model already-lens-labeled structure so it echoes rather than translates. *(exists)*
7. **Grammar-constrained decoding — the hard floor, insurance not prerequisite.** SL has a formal EBNF (`docs/language/spec.md §4`); an Ollama GBNF grammar would make the model *unable* to emit a syntactically-invalid token, and this holds **regardless of model size**. Finding 1 says we don't need it to start; build it only if free-form drafts wobble on harder systems. *(build-if-needed)*
8. **Escalate-on-failure** — after N failed compiles, route to a cloud tier via the existing `gsr.ts` seam. *(routing exists)*
9. **Coverage dial** — instrument first-try-compile rate per model from Rung 1 day one (germen's pattern); it tells us when local suffices and when to escalate. *(build: one counter)*

**Decision (Shingai, 2026-07-23): `gemma4:12b` is the default Rung-1 drafter**, scaffolded by items 1–5 (four already exist). Items 7/9 are the calibrated insurance; the scaffolding stays a *living stack* — refine it as harder systems expose wobble, escalating to cloud only on measured failure. This is the answer to "is my best local model up to the task": yes, because the harness does the correctness work and the model only has to be plausible.

**Refinement ladder (the "keep refining its scaffolding" path, cheapest-first):** (a) compile→error→retry loop [item 4] — biggest robustness/token; (b) RAG-narrowed few-shots [item 5] as the corpus grows past two exemplars; (c) coverage dial [item 9] to see *where* gemma wobbles before adding weight; (d) grammar-constrained GBNF decoding [item 7] only if (a)–(c) leave a syntax gap. Each rung is measured against the coverage dial, not added on spec.

## Open decisions (Shingai)
- SL-generation: an SL mode in GSR vs prompt-the-LLM-to-emit-SL via `gsr.ts`. (Lean: reuse `gsr.ts`, add an SL prompt.)
- Surface: dedicated window vs in-page copilot. (Guard: window-on-demand.) — **#10 first increment landed a candidate: an InspectorDock tab** (see below), not yet confirmed as final.
- Rung 2 accumulation target: a fixtures dir, a runnable-corpus dir, or the library.

## #10 resident co-author — first increment (scaffold, not final)

*What "post-spike" meant for #10:* the spike (#9) and Rung 0/1 (above) already
shipped a one-shot drafter — a description box local to the SL pane's state,
gone when the pane closes. #10 asks for a *resident* window: the co-author
stays mounted, and a history of what was tried persists across tabs. This is
a scaffold toward that, reusing every existing binding (`authorSl`,
`compile_sl`, the Rung-0 preview/accept banner) — no new LLM plumbing.

**What was built:** a "Co-author" tab in `InspectorDock` (`CoAuthorPanel.tsx`),
backed by `coauthorTurns` state lifted to `Workspace` (`App.tsx`) so it
survives switching tabs. Each draft becomes a `CoauthorTurn` (description, SL,
status: previewing/accepted/discarded/compile-error/network-error) and is
never dropped even on failure. The draft→compile→retry loop was extracted to
`web/src/coauthor.ts` (`draftSlWithRetry`) so the SL pane's inline Draft box
and this dock call the exact same function — one binding, two call sites.
Accept/discard (fired from the shared canvas preview banner, unchanged) now
correlates back to the originating turn via an `activeTurnId`, so history
reflects the real outcome instead of freezing at "previewing."

**Flagged for Shingai — NOT finalized by this increment:**
1. **Docking, permanently.** An InspectorDock tab was chosen because the dock
   infrastructure (collapse rail, focus-mode expand) already exists and this
   sidesteps inventing a second window chrome. But it competes for the same
   tab strip as Run/Formal/Audit/Analyst/Type, and a resident co-author may
   deserve to always be visible rather than one-tab-among-six. Alternatives:
   a standalone side panel (like the SL pane, always docked when open), a
   floating/detachable window, or folding this into the SL pane itself
   (co-author becomes a mode of the pane rather than a sibling surface).
2. **Conversational vs one-shot.** Each turn today is independent — the
   drafter sees only the current description, not prior turns in the
   session. A true "co-author" plausibly wants conversational memory (edit
   the last draft by saying "make the furnace bigger" rather than
   re-describing the whole system). That's a real scope jump (session
   context has to flow into the GSR prompt) and wasn't attempted here.
3. **History depth / persistence.** `coauthorTurns` is in-memory only —
   cleared on reload, unbounded length. Whether it should persist
   (localStorage, like the Analyst panel's coverage dial) or cap at N turns
   is undecided.
4. **Relationship to the SL pane's inline Draft box.** Both now exist,
   sharing the same binding. Keep both (dock = history/overview, inline box =
   quick one-off), or retire the inline box in favor of the dock exclusively?
   Not decided here — the inline box was left untouched.
