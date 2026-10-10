# ── A bank whose depositors panic all at once ───────────────────────────────
# bench · after Diamond & Dybvig 1983 as a switch — Mobus 2022 §11.2.1.1
#
# The same bank as bank-run.sl with the depositors' nerves written as one
# switch instead of a gauge and a comparator: a crowd watches the reserves
# and withdraws at a trickle while they are at or above a level, then all
# at once below it. The control (fear in proportion to the shortfall)
# empties the vault about day 31; the switch empties it in about half the
# time, because a crowd that waits for a line to be crossed does nothing
# to slow its own approach to the line. The level is the knob.
system "Bank Run (crowd)" : Concrete/Technical

domain "a bank whose depositors withdraw all at once when reserves fall under a line"

time unit day

level Structure

interface Window
    description "Where deposits come in."
interface Counter
    description "Where withdrawals go out."

component Vault primitive Buffering stock share initial 0.9 release 0.2
    description "Reserves, as a share of deposits; pays out up to the limit each day."
component Teller primitive Modulating backpressure
    description "Pays out as far as the crowd demands."
agent Crowd watches Vault rule threshold above 0.5 emit 0.2 else 1 manages Teller
    description "Watches the reserves; a trickle at or above the line, everything below it."

source Savers
sink Depositors

flow Savers -> Window : matter "new deposits" substance cash amount 0.005 unit "share/day"
flow Window -> Vault : matter "deposits" substance cash
flow Vault -> Teller : matter "cash" substance cash
flow Teller -> Counter : matter "withdrawals" substance cash
flow Counter -> Depositors : matter "withdrawals" substance cash

param "deposits" : flow Savers -> Window "new deposits" range 0..0.05
param "payout limit" : release of Vault range 0.05..0.5
param "the line" : above of Crowd range 0.1..0.9

metric "withdrawn" : sum into Depositors

@lens mobus
