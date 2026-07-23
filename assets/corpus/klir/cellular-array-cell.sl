# corpus-entry: v1
# title: A cell in a cellular array
# author: George Klir
# work: Facets of Systems Science, 2nd ed.
# year: 2001
# locus: Ch. 4, book pp. 83–84
# figure: Fig. 4.11
# teaches: That the environment is placed by the observer, not found in the world. This cell's environment is four OTHER CELLS OF THE SAME ARRAY — nothing distinguishes inside from outside except where the investigator drew the boundary, and the same 5×5 array admits 2²⁵ different structure systems depending on which subset of cells is chosen.
# omits: The behaviour function itself. Klir makes each cell a deterministic generative system over a shared totally ordered time set with two states per variable — active (v_c = 1) and inactive (v_c = 0) — and none of that is structure.
# note: This is a NON-BOUNDARY cell. Klir says the internal environment of the boundary cells (rows and columns 0 and n−1) "is degenerated in an obvious way", and does not draw it; that degenerate case is not modelled here.
# note: The four adjacent cells are indexed by Klir's own single-integer scheme, c = ni + j, so the neighbours of c are c−n (above), c−1 (left), c+1 (right) and c+n (below). The indices are his, not ours.
# note: Direction is asserted on all eight relations, and it is Klir's: he gives the cell "four input variables v_{c−n}, v_{c−1}, v_{c+1}, v_{c+n}, one from each of the adjacent cells" and "one output variable, which is coupled to all the adjacent cells". Contrast students-in-a-course, where the relation is a symmetric equivalence and @directed is deliberately absent.
# note: No kind of flow is declared. The couplings carry state variables over a two-state alphabet; guessing matter, energy or message would add a commitment Klir does not make.

system "A Cell in a Cellular Array"

component c

environment "c-n"
environment "c-1"
environment "c+1"
environment "c+n"

flow "c-n" -> c "v(c-n) — input from the cell above"
flow "c-1" -> c "v(c-1) — input from the cell to the left"
flow "c+1" -> c "v(c+1) — input from the cell to the right"
flow "c+n" -> c "v(c+n) — input from the cell below"
flow c -> "c-n" "v(c) — the one output, coupled to every adjacent cell"
flow c -> "c-1" "v(c) — the one output, coupled to every adjacent cell"
flow c -> "c+1" "v(c) — the one output, coupled to every adjacent cell"
flow c -> "c+n" "v(c) — the one output, coupled to every adjacent cell"

@lens klir
@directed 1
@directed 2
@directed 3
@directed 4
@directed 5
@directed 6
@directed 7
@directed 8
