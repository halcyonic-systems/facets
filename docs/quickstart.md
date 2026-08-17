# Quickstart — from zero to a judged model

**Status: LIVE.** A ten-minute path through the instrument: author a system as
text, read the kernel's verdict on it, break it on purpose and watch the refusal
hand you the repair, then open a model that runs against real data. Text only for
now: the illustrated walkthrough is unbuilt and untracked — it was recorded in
[`parked.md`](parked.md#i126) when #126 was retired, and the #80 this line used to
defer to never covered it. New terms link
to the [terminology concordance](language/terminology-concordance.md) on first
use; the [glossary](glossary.md) is the fast reference.

## 0. Install the prerequisites

Every command here is a `just` recipe, so install `just` first — it is the one
thing nothing in the repo can install for you:

```bash
brew install just          # macOS
# Debian/Ubuntu: sudo apt install just   ·   anywhere with Rust: cargo install just
```

Then let the repo name whatever else is missing:

```bash
just preflight
```

It checks `python3`, Rust, the wasm target, clippy, `wasm-pack` and Node, and
prints the exact install line for each one it does not find. Run it until it says
**All set**. The full table, with why each tool is needed, is
[README's Prerequisites](../README.md#prerequisites).

## 1. Open the app

From the repo root:

```bash
just dev      # installs web deps if needed, rebuilds the wasm kernel, starts the Vite dev server
```

Open the URL it prints (usually http://localhost:5173 — it moves to the next free
port if that one is taken, so read the URL rather than assuming it).

You land on a **start screen** with three doors: *Create a model*, *Open a model*,
*Documentation*.

## 2. Author a model as text

Click **Create a model**. A dialog asks **"What are you modeling?"** — optional
metadata (a name, Bunge's kingdom and genus, a subject domain) you can also set
later from the Type tab. Click **Skip** for now.

You are on a blank canvas. Click **SL** in the top bar to open the text pane.
[SL](glossary.md#sl) is the repo's textual
[system](language/terminology-concordance.md) notation and the fastest way in.

**The pane is not empty** — it arrives seeded with a worked example, Mobus's steel
plant, so there is always something to read. Select all of it and replace it with
[`fixtures/sl/bathtub.sl`](../fixtures/sl/bathtub.sl):

```
system "Bathtub" : Concrete/Physical
component Tub primitive Buffering interface
source Faucet
sink Drain
flow Faucet -> Tub : matter "inflow"
flow Tub -> Drain : matter "outflow"

@lens mobus
```

A faucet fills a buffering stock (`Tub`), a drain empties it — the classic
stock-and-flow first lesson.

## 3. Compile and watch the canvas render

Press **Compile** (or `⌘⏎`). SL is a deterministic compiler, never an LLM: the
same text always produces the same model.

What you get first is a **draft preview** with **Accept** and **Discard** — the
compile is proposed, not imposed. Accept it, and the canvas renders the two flows
and three things. The text pane and the canvas are two surfaces over one
[neutral spec](glossary.md#neutral-spec) — edit either, and they round-trip.

## 4. Read the verdict panel

The kernel judges the model under each [lens](glossary.md#lens). The verdict panel
shows, per lens, whether the model holds as a system and — where it does not — the
[precondition](glossary.md#precondition) it failed, quoted. Every verdict cites its
reason; nothing is a shrug. This is [systemhood](glossary.md#systemhood) being
decided, not styled.

Switch between **Klir**, **Bunge** and **Mobus** in the top bar and watch the same
model described in three vocabularies. That is the instrument's point: one model,
three faithful views.

## 5. Break it on purpose — the step that matters

This is where you find out what the tool actually is. Delete the `sink Drain` line
from the text pane, leaving the flow that points at it:

```
system "Leaky Tub" : Concrete/Physical
component Tub primitive Buffering interface
source Faucet
flow Faucet -> Tub : matter "inflow"
flow Tub -> Drain : matter "outflow"

@lens mobus
```

Compile. It refuses, and the refusal reads:

```
line 5: `Drain` is not declared (declare things before flows) — fix: add `sink Drain`
        above this line, or `component Drain` if it sits inside the boundary
```

Read what that gives you: **what** is wrong, **where** (line 5), **which rule**
(declare-before-use), and **the line to type**. It does not guess what you meant
and quietly generate something plausible — it stops, names the rule, and hands
back a repair. Every fault in the file is reported in one pass, not one at a time.

Put `sink Drain` back and compile again. That loop — refuse, name the repair, fix,
pass — is the instrument.

More failures to learn from live in
[`fixtures/sl/teaching/`](../fixtures/sl/teaching/): a graded set starting from a
two-line first model, including two files that fail on purpose, each documenting
its own expected error and line number.

## 6. Step up to a real work process

Back in the text pane, paste
[`fixtures/sl/process-m.sl`](../fixtures/sl/process-m.sl) — Mobus's own textbook
paragraph (multiple inputs combining into a product plus waste), written in SL:

```
system "Process M" : Concrete
component Work primitive Combining interface
source "Source 1"
source "Source 2"
source "Source 3"
sink "Sink 5"
sink "Sink 6"
flow "Source 1" -> Work : matter "material A"
flow "Source 2" -> Work : matter "material B"
flow "Source 3" -> Work : energy "energy E"
flow Work -> "Sink 5" : matter "product Z"
flow Work -> "Sink 6" : matter "waste X"

@lens mobus
```

Compile it, read its verdicts under each lens, and compare how the Klir, Bunge,
and Mobus panels each describe the same model in their own vocabulary.

## 7. Watch one run

A model you just authored has structure but no data, so the transport strip
under the diagram states why there is nothing to run yet: *"Run needs data: a
demo bundle, or a CSV attached and bound in Data mode."* A run here is forced by real numbers rather than invented ones, so it
needs a model *and* a data series *and* a mapping between them. That bundle is
what the library's runnable entries carry.

To see one:

1. **Home** in the top bar → **Open a model**. Leaving unsaved work raises a
   *discard?* confirmation first — accept it; nothing above was worth keeping.
2. Under **Examples — by genus**, open the **Physical** shelf.
3. Open **Reservoir**, the entry tagged **RUNS**. (A watershed fills a reservoir, a
   release drains it: the bathtub you just authored, with a year of monthly
   rainfall behind it.)

It runs on open. The run panel reports **Ran clean · 12 ticks**, the
[conservation invariant](glossary.md#conservation-invariant-declared) the model
declares holding as **nothing lost or created**, and a
[run ledger](glossary.md#run-ledger) — the per-step accounting that shows the
invariant holding, or where it does not. `▶ Run` in the strip under the diagram re-runs it (the trace auto-plays
once); `Δt` and `T` sit in the run card beside the diagram and set the step
and the horizon.

The current engine executes one [dynamics-kind](glossary.md#dynamics-kind): a
deterministic map over ℝⁿ stocks under a model-declared additive invariant.
Further kinds are declarable. The ledger is a result shown in the panel, not a
saved tier ([Save ≠ Export](glossary.md#save-vs-export)).

Every entry tagged **RUNS** carries a bundle; the rest of the library opens as
structure to read and judge. There are three runnable ones today — **Reservoir**
(Physical), **Allocation** and **Homeostat** (Technical).

## Optional: the co-author

The SL pane's **Co-author** tab drafts SL from a description in prose. It is
**off** until you tell it where a reasoner runs, and it sends your text only to
that address — this app ships no default service, and nothing reaches Halcyonic.
The kernel still judges everything the co-author produces: it drafts, it never
decides systemhood.

Turning it on needs a service of your own at that address, answering
`POST /analyze` and `POST /author-sl`. The reference implementation, the General
Systems Reasoner, is **not public**, so the co-author is currently out of reach
for readers outside Halcyonic. Everything else in this document works without it.

## Where to go next

- More models to learn from: [`fixtures/sl/teaching/`](../fixtures/sl/teaching/) —
  the graded teaching set, including the two deliberate failures from step 5.
- One model grown line by line: [`tour.md`](tour.md).
- The language, in full: [`language/`](language/) (spec, corpus, lineage).
- Assessing the theory: [`theory-fidelity.md`](theory-fidelity.md) →
  [`language/terminology-concordance.md`](language/terminology-concordance.md).
- Every term above, defined: [`glossary.md`](glossary.md).
