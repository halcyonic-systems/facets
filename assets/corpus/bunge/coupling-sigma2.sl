# corpus-entry: v1
# title: Coupling graph σ₂ — a cycle with inhibition
# set: Coupling graphs
# author: Mario Bunge
# work: Treatise on Basic Philosophy, Vol. 4: A World of Systems
# year: 1979
# locus: Ch. 1 §2.1, Coupling Graphs and Matrices
# teaches: Bunge's second coupling example: four components in a directed cycle where two of the four couplings are inhibitory rather than excitatory, entered in the matrix as −1 against +1.
# omits: The SIGN of each coupling as a first-class distinction — see the note below. Also the matrix representation itself.
# note: LEXICON PRESSURE, recorded rather than papered over. Bunge's matrix distinguishes excitation (+1) from inhibition (−1), and his caption says "the arrows indicate excitation, the crossed arrows inhibition". SL has no signed or negative relation: the kind words are energy / matter / field / informational, and design commitment C3 admits a word only if the kernel already carries the distinction. The polarity therefore survives ONLY in each flow's name, where nothing validates it. This entry is faithful in structure and lossy in sign.
# note: The components are bare indices, as Bunge leaves them. No environment is shown for these examples and none is invented.
# note: Bunge fixes no kind of connection for these examples, so the kind clause is left unspecified.

system "Coupling Graph σ₂"

component "1"
component "2"
component "3"
component "4"

flow "1" -> "2" "excitation (+1)"
flow "2" -> "3" "inhibition (−1)"
flow "3" -> "4" "excitation (+1)"
flow "4" -> "1" "inhibition (−1)"

@lens bunge
