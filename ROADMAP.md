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

## bert-core follow-ups

- **`structural()` projection** — [bert#99](https://github.com/halcyonic-systems/bert/issues/99).
  The Bunge bond view is currently a shell-side presentation grouping (validity
  still routes through `validate_mode`). Promote to a real projection if it proves
  load-bearing across consumers.
- **§A5 mode-transition validators** — the Arc 3 enabler (file when Arc 3 starts).

## Teaching surface (parallel, not an arc)

Per-lens teaching copy refined against the GSR-grounded Klir / Bunge / Mobus
corpora (queried through hal in-flow). The realist framing is load-bearing:
"one kernel, lenses as faithful derived views" — never "derived core." Wherever
lenses appear (here, BERT's future mode selector, Facets), the "Klir = the bare
kernel" identity must be on screen.
