# bert-lenses roadmap

One kernel, three lenses. The path is **view → author → translate**, in dependency
order. bert-lenses stays standalone: it is the seed of a model-*creation* tool
(author in any paradigm, translate across one kernel), not a mode selector to fold
into BERT's canvas. It folds back into BERT, if ever, on its own terms — once the
author and translate arcs are proven.

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
