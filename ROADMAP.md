# bert-lenses roadmap

One kernel, three lenses. The path is **view → author → translate → run**, in
dependency order. bert-lenses stays standalone through the author and translate
arcs: it is the seed of a model-*creation* tool (author in any paradigm, translate
across one kernel), not a mode selector to fold into BERT's canvas. Its declared
destination is **convergence with bert-compose** (the dynamical face — see README
"Convergence") as the two halves of one creation instrument, on this roadmap's
own dependency order.

## Arc 1 — View ✓ (shipped 2026-06-16)

Read-only lens viewing over one stored kernel. Per-lens structural rendering
(Klir = things + dependencies · Bunge = + bonds + environment · Mobus = + typed
flows + interfaces), the kernel invariant made visible (live re-projection vs
baseline), and the cited `validate_mode` verdicts. Closes the bert#77 worked
example. Commits `bf7375e`, `f0ff7e7`.

## Arc 2 — Author (next)

In-lens creation: author a model in a paradigm's vocabulary — Klir
(things + relations), Bunge (composition + bonds), Mobus (components + flows).
Live in-app generation via in-process `generate()` (the GSR generator core linked
as a Rust path-dependency — never the HTTP endpoint, never `validate_repair_generate()`
which drops L2 flows, never direct-to-Ollama), validated by the mode validators before
it lands. An optional LLM "co-create" seed drafts the initial lists; the compile path
stays deterministic. This is what turns the viewer into a creation tool.

**Full design: [`docs/arc2-authoring-design.md`](docs/arc2-authoring-design.md)** — the
build-ready spec (deterministic spine, per-lens editable UI, live convergence, persistence,
and the forward-design for the spatial canvas).

**Build approach (2026-06-26): canvas-first, hand-built in egui.** We build the
direct-manipulation canvas (drag thing → spawn relation → type → attach) here in the standalone
egui shell, growing it layer by layer **Klir → Bunge → Mobus**. Visual foundation:
[`docs/design-system.md`](docs/design-system.md) (palette + accreting shape grammar; visual sheet
in `docs/mockups/`). v0 = a Klir canvas: draggable discs + **undirected** relation lines + the
kernel-invariant chip; **Bunge** (composition/environment + **directed, typed-by-kind** bonds) and
**Mobus** (boundary, ports, Message-as-peer flow, operational) layer on after. Faithful gradient +
source evidence: `docs/design-system.md` §9 (boundary is **Mobus-only**, not Bunge; Bunge already
directs and types — Bunge *Treatise* Ch. 1 §2.1/§1.3).

## Arc 3 — Translate

Mode transitions across lenses on the same kernel:
- **downgrade** = projection + loss warnings (the §3.8 loss catalogue)
- **upgrade** = generation + witnesses

Enabler: **§A5 mode-transition validators in bert-core** (new bert-core code).
This is the concrete dependency that unlocks "switch paradigms without loss."

## Arc 4 — Run (converge with bert-compose)

Dynamics as one more mode transition: **Mobus-structural → Operational**.
Upgrading means supplying transfer functions + Δt — exactly the slots Mobus
leaves parametric (`bert-compose/MOBUS.md`) — with witnesses, like any §A5
upgrade; downgrading drops dynamics and keeps structure, lossless. Compose's
conservation engine (`circuit.rs`, UI-free) is consumed as a crate the way
bert-core is; the recorded run is the model's H. Enabler: the same §A5
transition validators Arc 3 needs. This closes the ladder: a user builds
structure from concrete named things (Klir up), and dynamics arrives as the
top rung — not as a separate abstract tool.

**Phase gates (council-audited 2026-07-06 — frontier + local, convergent):**

- **4.0 — the seam as a protocol, headless.** `validate_operational(world) ->
  Result<OperationalSpec, ...>` in bert-core: stricter than
  `validate_mode(Mobus)` (dead-end components, unspecified source/sink terms —
  the ledger holds by construction only *given* a well-formed circuit).
  Property tests: Klir/Bunge models always fail with cited reasons; a minimal
  Mobus model passes and round-trips through the compose engine with the
  ledger balanced. No UI. One session's work; everything later is measured
  against whether it extends this predicate cleanly.
- **4.1 — audit mode (read-only projection).** A "Check consistency" action:
  the engine called headlessly, per-component green/red with the violating
  bond/flow named. Validates the semantic mapping without touching the
  authoring UX or stateful simulation.
- **4.2 — Run.** Transfer-function supply (the **component → work-process
  mapping** is an explicit design step, not an inference), Δt, charts, H.
  Contract: structural edit after downgrade **invalidates H**.

Open design problems the gates force: the component→primitive mapping UX
(4.2), and keeping simulation controls out of the authoring canvas (the
"God-tool" bloat risk — Operational data accessible, never ambient).

## Shell UX follow-ups (from the Gate 1–2 manual passes, 2026-07-10/11)

- **Mapping UX harvest (post-blind-pick, 2026-07-11)** — the palette/stamp variant
  (`feat/arc42-mapping-b`) won the three-way blind pick as the composing-first
  gesture. Graft the losers' organs onto it in one follow-up: (a) the inspector's
  "Work process" read/edit section from `feat/arc42-mapping-a` — badges are
  readable but re-stamp-only editing is write-only UX; (b) from
  `feat/arc42-mapping-c`: click-a-red-audit-row navigates to the component
  (navigation only, panel stays read-only) and the audit-snapshot semantics
  (explicit ⟳ Re-run, not per-frame recompute). Same ticket: decide
  multi-primitive semantics — bert-core carries `Vec<ProcessPrimitive>`, B stamps
  one, `validate_operational` instantiates `.first()`. Branches kept for reference.

- **Env-birth gesture legibility** — drag-from-rim-to-empty silently births a
  Role::Environment node auto-bonded to the origin (main.rs:1694-1719). No
  affordance distinguishes it from a missed double-click; the author discovers
  the role only at audit time. Add a visible cue at birth (cursor/ghost preview
  or a one-line toast) and reconsider whether the gesture should be silent at all.
- **Klir env rendering gap** — main.rs:1919 gates the env square on
  `lens != Klir`, so in the Klir lens an author literally cannot tell an
  environment thing from a component (both render as circles). Worst-case
  placement-role illegibility; give Klir its own env distinction.
- **Export mode hint** — export flow should say "exporting as <Mode>" (toast or
  dialog line) so the stamped rung is visible at the moment it's chosen, not
  discovered downstream. Pairs with the Save-vs-Export distinction (Save =
  canvas state, Export = stamped WorldModel).

## bert-core follow-ups

- **`structural()` projection** — [bert#99](https://github.com/halcyonic-systems/bert/issues/99).
  The Bunge bond view is currently a shell-side presentation grouping (validity
  still routes through `validate_mode`). Promote to a real projection if it proves
  load-bearing across consumers.
- **§A5 mode-transition validators** — the Arc 3 enabler (file when Arc 3 starts).
- **Bond-vs-mere-aware model (B̄)** — [bert#109](https://github.com/halcyonic-systems/bert/issues/109).
  Projection silently forgets mere relations; §A5 loss witnesses should force
  the answer (filed from Gate 1).

## North star — the resident agent (post-Arc 3; not an arc yet)

An agent context window embedded in the canvas: not a chat panel bolted on, but a
**second author at the validate_mode seam**. The agent gets no special door — it
submits the same typed operations the human does (place thing, draw relation, type
a bond, request a mode transition), every proposal routes through the same gates,
and the *verdict* — never the model's prose — stays authoritative. The
no-LLM-in-the-explanation-path rule survives intact because the agent lives on the
proposal side of the seam; the demotion doctrine made visible in one window: LLM
proposes, kernel disposes.

This is Arc 2's "optional LLM co-create seed" grown up: a resident co-author with
a real agentic loop whose tool-results ARE validator verdicts — an agent refused by
`validate_mode(Bunge)` must repair its proposal against the citation. The kernel
becomes its environment. Conversation is then just another input modality over the
one kernel, peer to direct manipulation, the way tradition lenses are peer
vocabularies. Sovereignty path: hal/Ollama local tier ↔ Claude Agent SDK frontier
tier, same typed-ops interface either way.

**Preconditions before this becomes an arc**: the typed-op vocabulary must be the
real API (Arc 2 complete), transitions must gate with witnesses (Arc 3 shipped —
agent-proposed mode transitions are where this gets serious), and the God-tool
guard holds: the agent window is on-demand, never ambient. Captured 2026-07-10,
the night Gates 1–2 shipped.

## Teaching surface (parallel, not an arc)

Per-lens teaching copy refined against the GSR-grounded Klir / Bunge / Mobus
corpora (queried through hal in-flow). The realist framing is load-bearing:
"one kernel, lenses as faithful derived views" — never "derived core." Wherever
lenses appear (here, BERT's future mode selector, Facets), the "Klir = the bare
kernel" identity must be on screen.
