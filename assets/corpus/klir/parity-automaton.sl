# corpus-entry: v1
# title: The parity automaton
# author: Halcyonic (editorial)
# work: DLG↔FSA worked example
# year: 2026
# locus: editorial addition, 2026-07-24
# teaches: That a finite-state automaton IS a Directed Labeled Graph — states as the things T, transitions as the directed relations R, each labeled by its input symbol — which is exactly the Klir lens's S = (T, R). The minimal non-trivial case: two states {Even, Odd} over the binary alphabet {0, 1}, where 0 preserves parity and 1 flips it.
# omits: The behaviour function δ as a runnable object. The automaton's dynamics — acceptance, or the Markov distribution evolution you get by putting probabilities on the edges and dropping accept/reject — are not simulated here; this is the structural DLG only (see #67 for the DTMC run).
# note: Editorial entry, not a sourced systems-science model. Authored 2026-07-24 for the DLG↔FSA thread with Andrew Penland; the seed of the #67 dynamics work. The parity automaton is a folk classic of finite-automata theory (cf. Hopcroft–Ullman, Introduction to Automata Theory, 1979); this SL is a synthetic minimal example, not a reproduction of any one figure.

system "Parity Automaton" : Conceptual/Technical
domain "parity of the number of 1s read from a binary string"

component Even
component Odd

flow Even -> Odd : informational "1"
flow Odd -> Even : informational "1"
flow Even -> Even : informational "0"
flow Odd -> Odd : informational "0"

@lens klir
