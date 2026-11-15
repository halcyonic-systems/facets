# Tax and transfer: a share of household income goes to the treasury,
# and the treasury pays it back out as benefits.
#
# Domain: political economy, a simple fiscal circuit.
# Shape: a split feeding a stock, with the money returning to where it
# came from (a two-sided environment object closes the circuit).
#
# Households   are the private economy, an environment object with two
#              sides. They earn 100 a year of gross income, and they
#              receive take-home pay and benefits, holding what they
#              receive as their level.
# Tax Office   splits gross income (Splitting): 20 parts to the treasury,
#              80 parts back to households as take-home pay. The amounts
#              on its two outflows are weights, so this is a 20% tax.
# Treasury     holds the revenue (Buffering). It pays benefits at a fixed
#              15 a year (release) and spends 1 a year running itself
#              (maintenance). It starts with 50.
# Benefits Office is the pass-way benefits cross on their way out.
#
# Knobs to try:
#   - the tax share (the 20 on the Treasury flow, against 80). At 20%
#     revenue is 20, spending is 16, so the treasury grows 4 a year
#     (50, 54, 58, ...). Drop it to 10 (against 90) and the treasury runs
#     a deficit of 6 a year (50, 44, 38, ...). By year 7 it can no longer
#     pay 15, and from then on it pays out only what comes in less running
#     costs (9 a year).
#   - the benefit rate (release 15). Raise it to 25 and the same thing
#     happens even at a 20% tax: the treasury falls 6 a year, then pays 19.
#
# One engine detail: once drained, the treasury does not reach zero. It
# keeps a float of one tick's revenue less running costs (9 at a 10% tax),
# because a stock can release only what it held at the start of the tick.
# The float shrinks with a smaller step (--dt). Running costs are charged
# per tick, not per year, so do not change --dt on this model; see README.
system "Tax and Transfer" : Concrete/Social

domain "a simple fiscal circuit"

time unit year

environment Households
    description "The private economy: earns income, receives take-home pay and benefits."

component "Tax Office" primitive Splitting interface
    description "Collects income and splits it into tax and take-home pay."
component Treasury primitive Buffering stock money initial 50 release 15 maintenance 1
    description "The public purse: pays 15 a year in benefits, 1 a year in running costs."
interface "Benefits Office"
    description "Where benefits leave the treasury for households."

flow Households -> "Tax Office" : matter "gross income" substance money amount 100 unit "money/year"
flow "Tax Office" -> Treasury : matter "tax" substance money amount 20
flow "Tax Office" -> Households : matter "take-home pay" substance money amount 80
flow Treasury -> "Benefits Office" : matter "benefits" substance money
flow "Benefits Office" -> Households : matter "benefits" substance money

param "gross income" : flow Households -> "Tax Office" "gross income" range 0..300
param shares "tax split" : from "Tax Office"
param "benefit rate" : release of Treasury range 0..60

metric "tax share" : share of flow "Tax Office" -> Treasury
metric "returned to households" : sum into Households

@lens mobus
