# Quickstart — from zero to a judged, running model

**Status: LIVE.** A ten-minute path through the instrument using the two smallest corpus models. Text only for now; an illustrated walkthrough is deferred to [#80](https://github.com/halcyonic-systems/bert-lenses/issues/80). New terms link to the [terminology concordance](language/terminology-concordance.md) on first use; the [glossary](glossary.md) is the fast reference.

## 1. Open the app

From the repo root:

```bash
just dev      # rebuilds the wasm kernel, then starts the Vite dev server
```

Open the URL it prints (default http://localhost:5173).

## 2. Author a model as text

The fastest way in is [SL](glossary.md#sl), the repo's textual [system](language/terminology-concordance.md) notation. Open the SL text pane and paste [`fixtures/sl/bathtub.sl`](../fixtures/sl/bathtub.sl):

```
system "Bathtub" : Concrete/Physical
component Tub primitive Buffering interface
source Faucet
sink Drain
flow Faucet -> Tub : matter "inflow"
flow Tub -> Drain : matter "outflow"

@lens mobus
```

A faucet fills a buffering stock (`Tub`), a drain empties it — the classic stock-and-flow first lesson.

## 3. Compile and watch the canvas render

Compile. SL is a deterministic compiler, never an LLM: the same text always produces the same model. The canvas renders the two flows and three things. The text pane and the canvas are two surfaces over one [neutral spec](glossary.md#neutral-spec) — edit either, and they round-trip.

## 4. Read the verdict panel

The kernel judges the model under each [lens](glossary.md#lens). The verdict panel shows, per lens, whether the model holds as a system and — where it does not — the [precondition](glossary.md#precondition) it failed, quoted. Every verdict cites its reason; nothing is a shrug. This is [systemhood](glossary.md#systemhood) being decided, not styled.

## 5. Run it, and read the ledger

`Tub` is a buffering stock, so the model has something to run. Press Run. The current engine executes one [dynamics-kind](glossary.md#dynamics-kind) — a deterministic map over ℝⁿ stocks with an additive [conservation invariant](glossary.md#conservation-invariant-declared) the model declares — and produces a [run ledger](glossary.md#run-ledger) in the run panel: the per-step accounting that shows the invariant holding (or where it does not). The ledger is a result shown in the panel, not a saved tier ([Save ≠ Export](glossary.md#save-vs-export)).

## 6. Step up to a real work process

Now paste [`fixtures/sl/process-m.sl`](../fixtures/sl/process-m.sl) — Mobus's own textbook paragraph (multiple inputs combining into a product plus waste), written in SL:

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

Compile it, read its verdicts under each lens, and compare how the Klir, Bunge, and Mobus panels each describe the same model in their own vocabulary. That is the point of the instrument: one model, three faithful views.

## Where to go next

- More models to learn from: [`fixtures/sl/teaching/`](../fixtures/sl/teaching/) — a graded teaching set starting from a two-line first model, including two files that fail on purpose so you learn to read SL's errors.
- The language, in full: [`language/`](language/) (spec, corpus, lineage).
- Assessing the theory: [`theory-fidelity.md`](theory-fidelity.md) → [`language/terminology-concordance.md`](language/terminology-concordance.md).
- Every term above, defined: [`glossary.md`](glossary.md).
