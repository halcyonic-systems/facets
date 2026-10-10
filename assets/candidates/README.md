# Staged shelf candidates

Ten models from the "runs now" rows of `docs/shelf-candidates.md`, written in the split form and bench-tested from the terminal. They are staged, not shipped: this directory is outside the shelf glob `assets/examples/*.sl`, so nothing here appears in the app.

Admission to the shelf is Shingai's call, model by model, under the rule in `assets/examples/README.md`.

Every file verdicts with zero Errors and zero `interface_does_work` under the Mobus lens, is in `slfmt` canonical form, and is conserved on `bert bench <file> --t 12 --no-log`. The numbers are round so the ledger reads by eye; nothing here is a claim about any domain.

| File | Teaches | Thing to watch | Knob tried, and what happened | Warnings left |
|---|---|---|---|---|
| `sir-epidemic.sl` | Compartments, and an infection valve held open by the infected share | The infected share peaks at 0.26 on day 8 (R0 = 2) | Contact time 1 to 2 days: peak 0.106, no outbreak (R0 = 1); to 4 days: the infected decline from day 1 | `flow_not_consumed` (see below); `dead_end` on Removed, an absorbing state by design |
| `logistic-harvest.sl` | Growth that is fastest at middling numbers; fishing as a drain | Yield peaks at 0.25 t/day at a 4-day catch time, then falls off a cliff | Catch time over 80 days: 10 gives 0.160, 6 gives 0.222, 4 gives 0.250, 3 gives 0.222, 2.5 gives 0.160, 2 gives 0.020, 1.5 gives 0 | `flow_not_consumed` |
| `thermostat-room.sl` | Proportional feedback: regulation, overshoot, droop | Starts at 0.5 kWh, overshoots to 1.9, settles at 1.67 | Insulation time 5 to 2.5 h at hour 12: room settles at 1.43 (down 14%); the same cut with no thermostat halves it, 10 to 5 | `flow_not_consumed` |
| `two-tanks.sl` | Two first-order lags in series | After the tap doubles at minute 6, the lower tank follows the upper late and without overshoot | Valve time (upper tank) set at minute 6 to 2 / 4 / 8: lower tank at minute 12 is 99.9 / 81.1 / 58.9 L, upper 40.0 / 72.9 / 106.1 L | none |
| `hospital-beds.sl` | A stock with a ceiling | Occupancy settles at 32 of 40 beds (8 a day x 4 days) | Length of stay 4 to 6: beds fill to 40 by day 6; from day 7 the tick log shows 1.33 patients a day turned away | none |
| `traffic-bottleneck.sl` | The kink at arrival = service | Queue sits at 8 cars while arrivals are 8 a minute | Arrivals 8 to 12 at minute 6: queue 8, 12, 14 ... 22 at minute 12, up 2 a minute without end; service raised to 12 at the same time holds it at 12 | none |
| `bank-run.sl` | Fear that feeds on its result; a threshold in one number | Vault empties about day 31 at nerves 0.5 | Nerves setpoint 0.5 to 0.46: no run, vault rises to 1.09 by day 40 | `flow_not_consumed` |
| `enzyme-kinetics.sl` | `reservoir` supply, `limiting` site, a plateau set by the enzyme | Product rate stops rising at the enzyme's capacity of 4 | Substrate 1 / 2 / 4 / 8 / 16 gives product rate 1 / 2 / 4 / 4 / 4; enzyme 8 with substrate 8 gives 8 | none |
| `glucose-insulin.sl` | Two stocks regulating each other | A meal at minute 4 takes glucose to 1.9; both return to 1 with a small ring (insulin peaks 1.30 at minute 12) | Pancreas supply 0.2 to 0.1: glucose is still 1.39 at minute 40 against 0.98 | `flow_not_consumed` x 2 |
| `membrane-pump.sl` | The pump as the pass-way (merged form, Modulating); homeostasis | Cytosol rests at 1.33 mM against a 1 mM/min leak | Pump capacity 1.5 to 1.2 / 1.0 / 0.8 at minute 6: settles at 1.67 / reaches 2.0 / never settles (5.28 at minute 24, rising 0.2 a minute) | `flow_not_consumed` |

## Notes on the warnings and the claims

- **`flow_not_consumed`.** Every model with a feedback loop reads a stock through a Sensing process, and the kernel's validator asks for that level-read to be declared `matter`. The engine does the opposite: a `matter` flow into a sensor drains the stock (checked on SIR: the infected fell and the gauge read 0.01), while an `informational` flow reads without taking. The files follow the engine and keep the warning. This is a validator-versus-engine disagreement, worth its own issue.
- **Ledger order.** In SIR, declaring the informational read of Infected before its matter outflow made the conservation ledger report a false residual (-0.37) though the totals were conserved by hand. Declaring the matter outflow first fixes it. Worth its own issue.
- **Lists that did not match the engine.** The list's shapes for SIR ("infection = Combining of S and I") and the logistic ("`reservoir` + `limiting`") do not fit: a Combining sums or takes the minimum, it does not multiply, so mass-action infection and logistic growth are built from a backpressure Modulating valve gated by a sensor reading a stock. Logistic harvest uses a comparator ceiling instead of a `reservoir`, because a reservoir runs out and this environment regrows. Bank run keeps its reserves in a stock instead of a `reservoir` because only a stock can be read by a sensor.
- **Traffic.** The list says "exploding". In this engine a fluid queue ramps linearly past ratio one; what changes is that it never comes back.
- **Gauge gain.** A Sensing process has a default gain of 0.5 that SL cannot set, so several models carry that half in their arithmetic. Each header says so.
