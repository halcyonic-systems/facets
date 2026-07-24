# corpus-entry: v1
# title: Coupling graph σ₁ — a symmetric chain
# set: Coupling graphs
# author: Mario Bunge
# work: Treatise on Basic Philosophy, Vol. 4: A World of Systems
# year: 1979
# locus: Ch. 1 §2.1, Coupling Graphs and Matrices
# teaches: The first of Bunge's three coupling examples: a system given as a graph and, equivalently, as a matrix. Every coupling is mutual and excitatory, so the matrix is symmetric and the graph is an undirected chain.
# omits: The matrix representation itself — SL has no matrix register, so only the graph half of Bunge's "two standard and equivalent ways" is carried here.
# note: The components are bare indices, exactly as Bunge leaves them. The bareness is the lesson: this example asserts no domain at all, and the same coupling graph is meant to serve "a molecule or an industrial plant".
# note: Bunge shows no environment for these three examples — they are system REPRESENTATIONS (§2.1), not the C/E/S triples of Definition 1.2. None is invented here.
# note: Bunge does not fix a kind of connection for these examples; he generalizes afterwards to "n different kinds of connection (e.g. mechanical, chemical, informational, social)". The kind clause is therefore left unspecified rather than guessed.

system "Coupling Graph σ₁"

component "1"
component "2"
component "3"

flow "1" -> "2" "excitation"
flow "2" -> "1" "excitation"
flow "2" -> "3" "excitation"
flow "3" -> "2" "excitation"

@lens bunge
