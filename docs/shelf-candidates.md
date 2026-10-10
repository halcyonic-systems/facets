# Shelf candidates: simple models complexity-science readers will recognise

**Status: RESEARCH** — a running list for [#472](https://github.com/halcyonic-systems/facets/issues/472); rows flip to *shipped* as files land on the bench shelf (`assets/bench/`, its own admission test) or the examples shelf.

A running list for #472 (the shelf overhaul). Started 2026-10-09 from a walk with Shingai; grows as entries are tried. Each entry is SL-sized: one to three stocks, a few flows, a couple of knobs, one readout worth watching. The test for an entry is the bench's: tweak an input, tweak an output, reason about the interior, get a result that is interesting and plausible.

## What the engine runs today, and what waits

The compose engine is process-based: every component is one of the Mobus work-process kinds (Buffering, Combining, Splitting, Modulating, Inverting, Amplifying, Impeding, Propelling, Copying, Sensing) doing its own work each tick, with `limiting` (Liebig) and finite `reservoir` sources since #463. That is more than a stock-and-flow integrator — a regulator, a valve with back-pressure and a comparator with a setpoint are processes, not equations — but it is not yet an agent layer: no component holds a memory or chooses a transition (that is #269, the agent rung; the sandbox witness engine #346 detects signatures over runs, it does not add agents). So the agent-based classics below appear in their aggregate form, the compartment or mean-field version NetLogo's own system-dynamics tab draws, with a note on where agents would plug in. The aggregate form is the right first rung and runs now; nothing here waits on #269.

Legend: **runs now** — expressible in SL v1.9 and bench-tested from the terminal; **agents later** — the aggregate form runs now, the individual form waits on #269.

## Ecology and epidemiology

| Model | Shape | Knobs | Watch | Status |
|---|---|---|---|---|
| Wolf–sheep (NetLogo) | two stocks, Lotka–Volterra coupling | grass regrowth, predation | the lag between populations; collapse past a predation threshold | on the shelf as predator-prey; convert to split form |
| SIR epidemic | three stocks in a chain; infection = Combining of S and I | contact rate, recovery time | the peak; the herd threshold | staged: `assets/candidates/sir-epidemic.sl` |
| Logistic growth with harvest | one stock, a finite environment (`reservoir`), a harvest flow | harvest rate | the cliff past maximum sustainable yield | staged: `assets/candidates/logistic-harvest.sl` |
| Daisyworld | two daisy stocks, one temperature stock, albedo feedback | solar luminosity | regulation inside a band, failure outside | runs now (feedback via Inverting) |

## Economics and markets

| Model | Shape | Knobs | Watch | Status |
|---|---|---|---|---|
| Cobweb market | inventory stock; supply lags price | elasticities | convergence or oscillation | runs now |
| Bank run | a `reservoir` of reserves; withdrawals grow with fear | confidence | the reservoir running dry | staged: `assets/candidates/bank-run.sl` |
| Beer game | four stocks in a chain with order delays | delay | the bullwhip: amplification upstream | runs now (delay via time constant) |
| Sugarscape, aggregate | a regrowing resource reservoir, a population drawing on it | regrowth, metabolism | carrying capacity emerging | agents later |

## Social dynamics

| Model | Shape | Knobs | Watch | Status |
|---|---|---|---|---|
| Schelling, as a flow | satisfied / moving stocks, a tolerance knob | tolerance | a small change flipping the mix | agents later (mean-field only, and said so) |
| Opinion dynamics | two camps, a conversion Combining | persuasion rates | tipping, lock-in | agents later |
| Rumor spread | SIR with a forgetting flow | spread, forget | same chain as SIR, different substance: the lens does not care | runs now |
| Tragedy of the commons | shared `reservoir`, several harvesters through one Splitting | each harvester's rate | the commons draining | runs now |

## Physical and engineered

| Model | Shape | Knobs | Watch | Status |
|---|---|---|---|---|
| Bathtub | one stock, in and out | inflow, drain | the first lesson | fixture (`fixtures/sl/bathtub.sl`) |
| Thermostat room | heat stock, Inverting comparator with `setpoint`, loss | setpoint, insulation | regulation, overshoot | staged: `assets/candidates/thermostat-room.sl` |
| Two tanks | tank feeding tank through a valve | valve | the second tank lagging the first | staged: `assets/candidates/two-tanks.sl` |
| Rain barrel garden | two inflows, one stock, one Combining, one harvest | rainfall, sunlight, drain | the bench's own | on the shelf; keep |

## Organisations and infrastructure

| Model | Shape | Knobs | Watch | Status |
|---|---|---|---|---|
| Hospital bed flow | admissions, a bed stock with `capacity`, discharge | length of stay | beds saturating | staged: `assets/candidates/hospital-beds.sl` |
| Traffic bottleneck | a queue stock before a Modulating valve | arrival, service | the queue exploding past ratio one | staged: `assets/candidates/traffic-bottleneck.sl` |
| Software backlog | features in, team throughput, bugs as a side stock | team size, bug rate | the backlog running away | runs now |
| Power grid with storage | generation, a battery stock, demand | demand peak | the battery as buffer and its limit | runs now |

## Biology and chemistry

| Model | Shape | Knobs | Watch | Status |
|---|---|---|---|---|
| Ribosome | the tRNA pool as a reservoir in spirit | elongation rate | the pool draining | on the shelf; convert |
| Glucose–insulin | two stocks, each regulating the other | meal size | return to baseline | staged: `assets/candidates/glucose-insulin.sl` |
| Enzyme kinetics | substrate `reservoir`, product stock, a Combining enzyme with `limiting` | substrate, enzyme | saturation | staged: `assets/candidates/enzyme-kinetics.sl` |
| Cell with a membrane pump | ion stock inside, a pass-way with a Modulating pump | pump rate | the cleanest pass-way example | staged: `assets/candidates/membrane-pump.sl` |

## Integrated, where agents would plug in

| Model | Shape | Knobs | Watch | Status |
|---|---|---|---|---|
| Fishery with a fleet | fish stock + boat stock growing with profit | price, cost | the feedback that bites | runs now; agents later for boats |
| City and commuters | population stock, road `capacity`, congestion as a valve feeding migration | capacity | congestion equilibrium | runs now; agents later |
| Epidemic with behaviour | SIR with contact rate falling with I | fear | the flattened curve | runs now; agents later |

## How an entry graduates to the shelf

Verdict clean under Mobus (no `interface_does_work`), split form where the boundary is not the processor, declared amounts on every driver, at least one `param` with a range, one `metric`, and a `bert bench` run in the PR showing the thing to watch. The examples rule in `assets/examples/README.md` still governs admission.
