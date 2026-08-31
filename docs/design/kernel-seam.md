# The kernel seam — chat ↔ model (pivot phase 4)

*2026-08-31 · DESIGN, not committed. Phases 1–3 of the chat workbench pivot
are built (`docs/design/frost-shared.md` records the styling half; the dock,
sheets, and focus behavior live in `chat/index.html`). This document designs
the remaining phase and names what it would cost, so the decision to build
it is made with the seams in view — nothing here is scheduled.*

## What already exists (the seam is shorter than it looks)

Both faces already talk to the same brain:

- **Chat → GSR**: `/ask`, `/ask-stream`, `/ask-integrated`, `/ask-all`,
  `/extract`, `/a/<id>` (stored answers), `/status`. Every answer carries
  `meta` — route, confidence, dimensions, per-lens readings (`lenses[]`),
  sources, and since phase 1 the lens it was asked through (`asked`).
- **Model → GSR**: `web/src/gsr.ts`, the single network door, posts the
  kernel's own verdicts to `/analyze` — the canvas never owns a prompt, and
  the LLM narrates without re-deriving structure.
- **The model side has ONE context shape**: `web/src/kernel/context.ts` —
  `ModelContext` = lens + canvas + kernel analysis, "the kernel's verdict IS
  the context," rendered deterministically for prompts.

So phase 4 is not "integrate two apps"; it is two directed hand-offs across
a shared backend and a vocabulary bridge.

## Direction 1 — a sheet opens as a canvas sketch (chat → model)

The honest mechanism is **GSR as the generator**, not client-side
translation: a chat answer's dimension labels are annotations, not
structure, so the client must not invent components from them (that would
be a second brain — the exact thing `context.ts` forbids on the other
side). GSR already holds the answer (`/a/<id>`) and already has model
generation; the hand-off is:

1. Sheet action "Open as model →" (bot answers with an `answer_id`).
2. Navigates to `/model/?from=<answer_id>`.
3. The model app asks GSR to generate a BERT/canvas skeleton from that
   stored answer, opens it as an ordinary **draft** model — author-owned
   from the first click, clearly marked as generated, never auto-saved.

Cost honesty: the generation route is the open question — whether
`/extract` as it stands produces a canvas-loadable skeleton or needs a
sibling route is a GSR-side investigation, and it is the one piece of this
phase that is not client-only.

## Direction 2 — ask chat about the open model (model → chat)

`renderContextForPrompt(ModelContext)` already produces exactly the
grounding a chat question needs. Hand-off: a "Discuss in chat →" action
serializes the rendered context (sessionStorage under the shared
facets.systems origin — no backend), chat opens with the context attached
to the composer as a visible, dismissible chip, and sends it as history
with the first question. The answer is an ordinary sheet; the dock shows
"context: <model name>" as a readout row.

## The vocabulary bridge (small, and the honest limit)

| chat mode | canvas lens | note |
|---|---|---|
| `mobus` | `Mobus` | direct |
| `klir` | `Klir` | direct |
| `bunge` | `Bunge` | direct |
| `spt` | — | no canvas lens; crosses as prose context only |
| `ct` | — | same |

The bridge maps the three shared traditions and refuses the other two
rather than approximating them. Dimension vocabularies differ by design
(chat's dims are retrieval annotations; canvas dims are kernel slots) and
must NOT be mapped symbol-for-symbol.

## What phase 4 is not

- Not shared runtime state between the apps (they stay separately loaded
  pages; the seam is hand-offs, not a merged bundle).
- Not a chat-side kernel: systemhood verdicts stay in the model app's
  kernel; chat never renders a verdict it didn't receive.
- Not scheduled. Direction 2 is client-only and roughly a session;
  direction 1 depends on the GSR generation-route investigation.
