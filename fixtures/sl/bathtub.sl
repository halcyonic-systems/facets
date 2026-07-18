# The bathtub — the classic stock-and-flow first lesson: a faucet fills a
# buffering stock, a drain empties it.
system : Concrete/Physical
component Tub primitive Buffering interface
source Faucet
sink Drain
flow Faucet -> Tub : matter "inflow"
flow Tub -> Drain : matter "outflow"

@lens mobus
