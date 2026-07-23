# corpus-entry: v1
# title: Coupling graph σ₃ — self-action and feedback
# author: Mario Bunge
# work: Treatise on Basic Philosophy, Vol. 4: A World of Systems
# year: 1979
# locus: Ch. 1 §2.1, Coupling Graphs and Matrices
# teaches: Bunge's third coupling example, and the one that reads differently in two traditions: components 2 and 3 each act on themselves, and act on each other. His caption — "the loops indicate self action or feedback" — names both at once, and both are legal Bunge structure.
# omits: The matrix representation itself, and the excitation/inhibition polarity that σ₂ carries.
# note: THE POINT OF THIS ENTRY IS THAT IT DOES NOT TRAVEL. Bunge admits the diagonal: a thing may act on itself, and a coupling matrix records it. Mobus forbids it — §4.3 requires k ≠ o for every flow edge — so this model is a legal Bunge structure and a REFUSED Mobus one. Open it, then switch to the Mobus lens and read the refusal: "self-dependency is not representable in the 8-tuple". That refusal is the lesson, and it is a real divergence between two traditions rather than a limitation of the tool.
# note: The components are bare indices, as Bunge leaves them. No environment is shown for these examples and none is invented.
# note: Bunge fixes no kind of connection for these examples, so the kind clause is left unspecified.

system "Coupling Graph σ₃"

component "1"
component "2"
component "3"

flow "1" -> "2" "excitation"
flow "2" -> "2" "self action"
flow "2" -> "3" "excitation"
flow "3" -> "2" "excitation"
flow "3" -> "3" "self action"

@lens bunge
