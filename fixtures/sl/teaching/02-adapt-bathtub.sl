# ── Adapting a model you already know ────────────────────────────────
# The bathtub (../bathtub.sl) is the classic stock-and-flow model: a
# faucet fills a buffering stock, a drain empties it. The SAME shape fits
# any accumulation. Here we adapt it, line for line, to a savings account.
#
#     bathtub          →   savings account
#     -------              ---------------
#     Tub    (stock)   →   Balance   (money that accumulates)
#     Faucet (inflow)  →   Paycheck  (deposits)
#     Drain  (outflow) →   Spending  (withdrawals)
#
# What stays fixed is the PATTERN: one Buffering component, one inflow,
# one outflow. Learning to see a new system as an old pattern is the skill
# this fixture drills.

system "Savings Account" : Concrete/Social

# `primitive Buffering` marks the component as a work process that
# accumulates — a stock. `interface` says it sits on the system boundary,
# where the flows cross in and out. These are the two attributes the
# bathtub's Tub carries, unchanged.
component Balance primitive Buffering interface

# The environment: where money comes from, where it goes.
source Paycheck
sink Spending

# In the bathtub the flows carry water (`matter`). Money is likewise a
# conserved quantity that moves and accumulates, so it too is `matter`.
flow Paycheck -> Balance : matter "deposit"
flow Balance -> Spending : matter "withdrawal"

@lens mobus
