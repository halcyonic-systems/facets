# The translation apparatus, running — walkthrough for 2026-08-19

Status: DRAFT (arc session 2026-08-14). One section is slotted pending the #112
derivation's loop-gain reading, marked below.

## 1. The structure receipt — his corrections, on the record

The 8/12 live demo drafted a ribosome from George's own description, and he located
three errors. All three are in this model, as structure:

- **The polypeptide is a product, not a sink.** `Exit Tunnel → Chaperone` carries
  "nascent polypeptide" out; the chaperone is the downstream consumer, and nothing in
  the model swallows the product silently.
- **tRNA and GTP are inputs, not sources.** GTP enters from the cytosol; tRNA is not
  an input at all in this variant — the boundary is wide enough that it circulates,
  charged out of the pool, spent at the decoding site, recharged by the synthetase.
- **The ionic milieu genuinely interacts.** `Cytosol → PTC : matter "Mg2+ and ionic
  milieu"` — and the kernel REFUSED this edge until the PTC was declared an interface.
  The boundary check that fired on the call as a warning fired here as a refusal, and
  it was right both times: a crossing flow with no interface is a hole in the membrane
  the author never declared.

## 2. The numbers, and where they come from

Steady-state elongation at 20 residues/s (Wikipedia: 17–21 aa/s prokaryotic). Energy
enters twice: 2 GTP per residue at delivery/translocation, and ATP→AMP (2 bonds) at
charging — 4 bonds per residue, which is exactly the textbook total of 4n−1 for an
n-residue protein. Initiation, termination and proofreading sit below this grain, and
the model says so rather than pretending. A ~300-residue protein at this rate is one
protein per ~15 s, which sets the run horizon.

## 3. The data seam — Klir in, Mobus out

The CSV is a Klir data system, literally: rows are the support (time), columns are
observation channels. Attaching it commits to nothing. **Binding** a column is the
crossing: "this channel measures the GTP flow" claims an observation as a measurement
of a Mobus quantity, and the imported series becomes what Mobus calls **empirical H**
— captured history (ch 6 §6.5.1.5). The tRNA pool starts full because the data says
so: its stock-level column's t0 observation supplies the initial level. Nothing was
declared that was not measured — one artifact, two faithful readings, which is the
K≅2 thesis doing work in the instrument rather than in a proof.

## 4. The run — SLOTTED, pending the #112 loop-gain ruling

[What the trajectories show over t = 15–30 s; the conservation ledger read aloud
(emitted / sunk / stored / dissipated); the pool's level as the loop's regulated
variable. BLOCKED on ruling whether default cycle gain is a defect or a documented
semantics, and what the authored model must say to make the loop conservation-honest.]

## 5. The two walls, named honestly

Two things this model cannot yet SAY in SL, and both are known, filed, and witnessed
by the archive: a stock that starts full (`initial_state.storage` — reservoir's fact)
and a release rate (`release_rate` — homeostat's fact). #112 is the issue that
decides the language's dynamics-semantics layer; the data seam above is the honest
workaround for the first, and the derivation of the kernel's transition functor is in
review. The walls are evidence the language refuses to bluff, not gaps being hidden.

## 6. The two senses of dynamics — his distinction, kept

What runs here is sense 1: configuration fixed, run Δt, measure. Sense 2 — the
structure itself changing, the life-cycle — is the paper's subject, and the tool does
not pretend to it. The pool's level changes; the pool does not appear or dissolve.
