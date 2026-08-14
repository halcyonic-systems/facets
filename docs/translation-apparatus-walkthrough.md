# The translation apparatus, running — walkthrough for 2026-08-19

Status: CURRENT as of 2026-08-15 (post #337/#338/#340 fixes and #112 slice 1).
Every number below is reproducible: `bert run assets/examples/translation-apparatus.sl --t 15`.

## 0. One model, self-contained

The file is the whole base state. Structure, rates, the pool's starting level
and its drain — all declared in SL:

```
component "tRNA Pool" primitive Buffering stock tRNA initial 100 release 20
flow Nucleus -> "Decoding Site" : matter "mRNA transcript" amount 20 unit codon/s
flow Cytosol -> Translocase : energy "GTP" amount 40 unit GTP/s
```

Run · Inputs is where the knobs turn; a CSV is for *data* — measurements to
validate against, a time-varying forcing a constant cannot say, an observed
initial condition. Nothing about the base run needs one.

## 1. The structure receipt — his corrections, on the record

The 8/12 live demo drafted a ribosome from George's own description, and he
located three errors. All three are in this model, as structure:

- **The polypeptide is a product, not a sink.** `Exit Tunnel → Chaperone`
  carries "nascent polypeptide" out to its downstream consumer.
- **tRNA and GTP are inputs, not sources.** GTP enters from the cytosol; tRNA
  is not an input at all at this boundary — it circulates: charged out of the
  pool, spent at the decoding site, recharged by the synthetase.
- **The ionic milieu genuinely interacts.** `Cytosol → PTC : matter "Mg2+ and
  ionic milieu"` — and the kernel REFUSED this edge until the PTC was declared
  an interface. The same boundary check that fired on his call fired here as a
  refusal, and it was right both times.

## 2. The numbers, and where they come from

Steady-state elongation at 20 residues/s (17–21 aa/s prokaryotic). Energy
enters twice — 2 GTP per residue at delivery/translocation, ATP→AMP (2 bonds)
at charging — 4 bonds per residue, the textbook 4n−1. Initiation, termination
and proofreading sit below this grain, and the model says so.

## 3. What building this model fixed in the engine

The honest-instruments section: quantifying the ribosome exposed three engine
defects, each now fixed at the root with a separating test, or filed.

1. **The tap rule was substance-blind** (#337). Any stock→sensor wire read as
   a non-draining level tap, so the pool minted matter — Pool' = 1.25·Pool + 45,
   verified in closed form. Now: a tap must be *declared* informational
   (bank-run's own convention — "read as a signal, not moved as stuff");
   declared matter drains. The dt-invariance gate then caught the homeostat
   demo's own mis-declared sensed edge.
2. **The validation readout compared against the sender's total** (#338). A
   multi-outwire source's whole emission was attributed to each flow — a fake
   "305% off" on a perfectly forced 20. Now each flow compares against its own
   wire's delivery; the forced flows read 0% off.
3. **Energy summed into output mass** (#340). The synthetase made ~45 tRNA/s
   out of 20 matter + 20 ATP. Fig 3.17 rules it — processes transform
   substance "into high-quality versions *of the same*"; energy drives the
   work and leaves as waste heat — and the engine now says the same: 5 matter
   + 7 energy into a material Combining yields 5 out, 7 dissipated, never 12.

## 4. The run

`--t 15` (one ~300-residue protein at 20 aa/s):

- **Conserved, with every channel non-negative**: emitted 1515, sunk 14,
  stored 277, dissipated 1324, balance 0. The dissipated channel is *large
  and honest* — it is the GTP and ATP that drove the work, plus split losses.
- **The pool starts at its declared 100 and drifts +10/tick.** The drift is
  a grain statement, not a defect: the decoding site's agency (0.5) and its
  even outwire split halve the tRNA return leg at this resolution. True
  stoichiometric assembly (output = the *limiting* input, not the sum) is a
  named future semantics, not something this model fakes with tuned numbers.
- One caveat the ledger teaches: `balance ≈ 0` certifies the ledger's own
  arithmetic, not conservation by itself — conservation is the non-negative
  channels *plus* the balance, which is what the #337/#340 fixes bought.

In the app: open Translation Apparatus → Run → ▶. To validate against data or
force a perturbation (amino-acid starvation, seconds 8–10), attach a CSV in
Data mode and bind columns — the pool can also take its t0 from a measured
observation instead of the declared 100, and the two are the same kind of
fact by construction.

## 5. The two walls — closed, and how

Until 2026-08-15 SL could not say a stock that starts full or a release rate —
the archived reservoir and homeostat are the witnesses, and the pre-SL demos
stayed unportable because of it. The #112 gate held until the transition
functor was derived from the shipping stepper (F = Id over the circuit state;
an initial stock is a *choice of basepoint*, a release rate a *parameter of
the map* — neither changes F). Syntax then followed proved semantics:
`stock <unit> initial <n>` and `release <n>`, with the emit refusal narrowed
key by key, each narrowing carrying a separating instance. The tRNA pool is
the first user. The refusals were evidence; the productions are the payoff.

## 6. The two senses of dynamics — his distinction, kept

What runs here is sense 1: configuration fixed, run Δt, measure. Sense 2 —
the structure itself changing — is the paper's subject, and the tool does not
pretend to it. The pool's level changes; the pool does not appear or dissolve.
That seam is where the life-cycle formalism and this instrument will meet.
