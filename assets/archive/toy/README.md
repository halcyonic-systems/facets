# SL toy models

Twelve small models in SL, the Facets System Language, written 2026-11-03 to 2026-11-06 and moved into the repo on 2026-11-14 from a folder outside it. They sit in the archive (`../README.md`): out of the gallery and the CLI survey, still compiling. The "what to expect" numbers below were read off runs at the time and are not held by any test. A thirteenth file, `testit.walk.sl`, is a twelve-line scratch model from the new-user walk, kept only for the record. Each one is built so you can open it, change one number, run it, and check that what you see makes sense for its domain. Between them they also put the Facets engine through its paces: stocks, feedback, amplification, loss, splits, gates, agents, and environment objects that both send and receive.

Every file has a comment header that says what each part stands for, which numbers to change, and what should happen when you do.

## The models

| Model | Domain | Shape | What it exercises | Knob to try | What to expect |
|---|---|---|---|---|---|
| `pond.sl` | Ecology: a pond's water balance | One stock between a source and a sink | Buffering with initial level, time constant, capacity and maintenance (evaporation); matter | Stream amount 30 to 50 | At 30 the pond rises from 100 and rests near 280 m3. At 50 it hits the 400 m3 bank on day 15 and spills 8 m3 a day |
| `amplifier.sl` | Electrical engineering: one amplifier stage | Two inputs (signal and power) meeting in one process, a loss on the power side | Amplifying with `gain`, Impeding with `impedance`; informational in, energy in and out | Stage gain 5 to 20; or line impedance 0.25 to 0.9 | Gain 5 sends 1 to the speaker. Gain 20 wants 4 but clips at 3, the power that gets through. Impedance 0.9 clips it at 0.4 |
| `club.sl` | Sociology: membership of a club | Gated inlet into a stock, inside a two-sided environment object | Modulating gate with backpressure and an informational control; a two-sided `environment` (the town sends applicants and takes back leavers) | Charter admission share 0.5 to 1 or 0.25 | The club grows from 10 toward 60 members. At 1 it heads for 120, at 0.25 for 30 |
| `tax-transfer.sl` | Political economy: tax and transfer | A split feeding a stock, money returning to its source | Splitting by weights (`param shares`), Buffering with fixed `release` and maintenance, a two-sided environment closing the circuit | Tax weight 20/80 to 10/90; or benefit rate 15 to 25 | At 20% the treasury grows 4 a year. At 10% it falls 6 a year, and from year 7 it pays out only what comes in less running costs |
| `water-tower.sl` | Feedback control: a town water tower | Closed loop: stock, sensor, comparator, valve | Sensing with `gain`, Inverting with `setpoint`, Modulating with backpressure; negative feedback | Controller setpoint 1 to 0.5 or 2; float gain 0.1 to 0.5 | The tower fills from empty, overshoots to 10 and settles at 8 m3. Setpoint 0.5 gives 4, setpoint 2 gives 16. Float gain 0.5 makes the loop chatter at one-hour steps |
| `warehouse.sl` | Operations: a stock room and its manager | An agent beside the flow path, switching a valve; a lossy transport leg | `agent` with a threshold rule and a hysteresis band, Propelling with `efficiency` | Band 60/30 to 45/40; or van efficiency 0.9 to 0.5 | The stock saws between 24 and 64. A narrow band switches almost every day. At efficiency 0.5 the stock sits at 40 and the order desk never shuts |
| `theory-of-change.sl` | A theory of change: individuals, shared rules, a leader, cohesion | One informational memory fed through a pass-way whose rate an agent writes | Buffering `informational` (a memory that forgets), `trace` rule, the command form `manages param`; informational flows only | Leader window 6 to 1; or gain 0.5 to 1 | At window 6 cohesion peaks at 36 and settles near 30, never the target 40. At window 1 it settles at 30 with no swing. At gain 1 it lurches between 17 and 57 |
| `theory-of-change-v1.sl` | The same theory with individuals inside, norms as a thing, cohesion as output | Resources feed a people stock whose effort passes a valve the norms set; cohesion drains out as wellbeing; the leader renews the norms | Buffering `maintenance`, a memory stock driving a Modulating valve, the command form through an interface, a `sum into` metric on the output | Firmness 0.02 to 0.005; or resources 12 to 6 | At 0.02 cohesion peaks at 54 and swings 31 to 48 around 40. At 0.005 it settles at 31. At resources 6 the people run dry and cohesion sinks to 24 while the norms climb |
| `theory-of-change-v2.sl` | The theory built as it asked: a closed town of 100, two populations meeting, norms the only memory, the leader inside setting the encounter rate | An encounter (mass action) between the disengaged and the engaged, multiplied by the norms, converts people; examples renew the norms; a table-rule leader commands the encounter's k; a moderator gates which examples become rules (a gate on messages, Facets #587); a sensor shows the count to the world | `mass action` with two catalysts, a Sensing feeding a memory, `manages param` on `mass action` (Facets #584) and a Modulating fed only messages (Facets #587), both 2026-11-06 | Pin the leader's three k values low or high; or norms last 12 to 3 | Baseline holds near 38. Pinned low it collapses to 0; pinned high 90 take part. Norms forgotten in 3 months collapses it too |
| `theory-of-change-a.sl` | Candidate A, the meeting: four things inside. The rules are folded into the meeting's rate; the leader sets it | A mass-action encounter between the disengaged and the engaged converts people; a table-rule leader commands its k; newcomers arrive and the disengaged drift away | `mass action` with one catalyst, `manages param` on `mass action`, a `sum into` metric | Delete the agent line and leave k at 0.001; or drift 12 to 3 | With the leader, engaged climbs from 10 to 48 in a year and creeps to 57. Without it, 10 fades to 3. Drift 3 fades to 0 even with the leader |
| `theory-of-change-b.sl` | Candidate B, the rules remembered: five things inside. The rules are a memory the leader keeps alive by teaching | The encounter's k is fixed and multiplied by the norms; norms are a memory fed by teaching from the tradition outside and forgotten over a year; the leader sets the teaching | Buffering `informational` fed from outside, `mass action` with two catalysts, `manages param` on an inflow | Delete the agent line and leave teaching at 0.04; or norms last 12 to 3 | With the leader, engaged climbs from 10 to 40 over four years and holds at the leader's line; norms rise to 1.2 then ease to 1. Without it, 10 fades to 3 |
| `theory-of-change-c.sl` | Candidate C, the outcome seen: candidate A plus the sensor that shows the world how many take part | The same mechanism as A; a Sensing process reads the engaged without draining them and the Results door shows the count to the world | Sensing as the one reader that takes nothing, two `sum into` metrics | The same as A | The same run as A; the world sees the count each month |

Coverage: fill and drain (pond, tower, tax), feedback toward a setpoint (tower), amplification (amplifier), loss (amplifier's supply line, warehouse van, pond evaporation, treasury running costs), split (tax), gate (club, tower, warehouse), two-sided environment object (club, tax), and all three flow kinds (matter, energy, informational). Copying and Combining are not used.

## Running a model from the terminal

From the repo root:

```
just facets compile assets/archive/toy/pond.sl      # does it parse? exit 0 if yes
just facets bench --t 60 --no-log assets/archive/toy/pond.sl
```

`bench` prints JSON. Under `trajectories`, each stock has a `series` that starts at the initial level, so a 60-tick run gives 61 values. `flows` gives one value per tick. `--t` is the horizon and `--dt` the step. Drop `--no-log` to get a per-tick log that shows, for each node, what it received, released, dissipated and spilled, and what each agent decided.

The simplest way to try a knob is to edit the number in the `.sl` file and run again. You can also turn knobs from the command line with `--set`, which takes a few forms:

- A flow amount: `--set "brook|Stream|Pond=50"`, written as label, from, to. Name the flow as the file writes it, even through a pass-way (`interface`): `brook|Stream|Inlet` works. A declared param also works by its name: `--set stream=50`.
- A stock or comparator setting: `--set "Pond.time_constant=5"`, `--set "Treasury.release_rate=25"`, `--set "Controller.setpoint=2"`.
- An agent's numbers: `--set "Stock Manager.above=45" --set "Stock Manager.below=40"`.
- A process's own parameter goes in by its SL word and value: `--set Stage.gain=20`, `--set "Supply Line.impedance=0.9"`, `--set "Delivery Van.efficiency=0.5"`, `--set Float.gain=0.5`.
- Add `@tick` to change a knob partway through, for example `"Controller.setpoint=2@15"`.

`facets run` also works, but it prints bare number arrays with no names, so `bench` is easier to read.

## Running a model in the web app

1. Open http://localhost:5433 and click **New model**, then **skip**.
2. Click the **SL** button (`{}`) at the bottom of the left rail. The text drawer opens.
3. Click in the text, select all, and paste the contents of a `.sl` file.
4. Click **Compile**, then **Accept** on the draft preview.
5. Press **Run**. The default length is 100 ticks, and Run stops there; turn on **keep going** to let it run on live; change it with the **length** control beside the canvas. Declared params show as inputs in the right panel.

`water-tower.sl` shows one warning in the app and in `facets verdict`: the kernel says the float should read the tower over a matter flow. Leave the flow as it is. The model runs correctly as written, and following the warning breaks it (see below).

## Things the engine cannot say, left out on purpose

- **Predator and prey, rumor spread, an RC circuit.** Predator and prey and rumor can be built today only through a sensor opening a valve (the way `assets/bench/sir-epidemic.sl` is), which clips at full and misdescribes an encounter. An RC circuit needs a two-way gradient flow, which the engine has but SL cannot yet say. Both are ruled for later (Facets walk row 48), not built.
- **A pond that spills downstream.** Overflow above capacity is dissipated, not routed anywhere. The pond's spill disappears instead of joining the stream below.
- **An information stock.** Stocks hold matter or energy only, so a level of trust or of awareness cannot be a stock. Money and people are declared as matter.

## Two files are stored in formatted form

`warehouse.sl` and `theory-of-change-v2.sl` are stored as `slfmt` wrote them on 2026-11-14, not as first typed. In both, the agent line sat after the flows it governs. `slfmt` moves an agent line up beside the components, and that reorders things in the compiled model (ids, layout, the order flows are listed), so the tree-wide gate in `sl_format.rs` (format must not change the model) failed on the original text. The stored versions keep every comment line (30 and 80), and a 60-tick `bench` run gives the same series for every stock, agent and flow as the originals. The other eleven files are byte for byte as written.

The formatter changing the compiled model when it moves an agent line is an open finding, not yet filed as an issue.

## Two engine behaviors to know when reading the numbers

- **Changing `--dt` is safe.** Maintenance (evaporation, running costs) is now a rate per time unit, like every other rate, so a smaller step gives nearly the same answer.
- **A drained stock keeps a small float.** A stock releases at most what it held at the start of the tick, so a treasury in deficit settles on one tick of revenue rather than zero.
