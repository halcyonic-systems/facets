# corpus-entry: v1
# title: A serial binary adder
# author: George Klir
# work: Facets of Systems Science, 2nd ed.
# year: 2001
# locus: Ch. 4, book pp. 78–79
# figure: Fig. 4.8
# teaches: A cycle as pure structure. The carry leaves CARRY, is held one discrete time by MEMORY, and returns as the previous carry that both SUM and CARRY depend on — a loop that exists in the wiring, with no dynamics run and no state stored anywhere in this model.
# omits: THE SECOND ORDER — the point Klir chose this example to make, omitted because the gate-level figure is not legible; see the first note, this omission is the entry's real lesson. Also the behaviour functions themselves (Table 4.3's eight quintuples), the two-state alphabet, and the physical encoding, which Klir explicitly sets aside.
# note: ⚠️ THIS ENTRY IS DELIBERATELY INCOMPLETE, AND THE GAP IS THE LESSON. Klir's stated purpose is "to illustrate the concept of structure systems of HIGHER ORDERS". What makes his Fig. 4.8 second-order is that SUM and CARRY are themselves structure systems of logic gates: "If, however, the elements themselves are viewed as specific structure systems, as shown for elements SUM and CARRY in Fig. 4.8, the overall structure system is of order 2." That gate-level sub-structure did not survive the PDF-to-markdown conversion and is not legible, so it is not authored — and the corpus does not invent. What is shipped is the FIRST-ORDER system, which Klir describes exactly: "If these elements are viewed as generative systems, the resulting structure system is of first order."
# note: The first-order wiring needs no inference. Klir states that "both y and c are functions of x₁, x₂, c′", which fixes the three inputs to each of SUM and CARRY; and that MEMORY "implements the translation rule by which the sampling variable c′ (previous carry) is defined… keep the input state for one discrete time and, then, release it as output state", which fixes c into MEMORY and c′ out of it.
# note: Klir lists c among the OUTPUT variables of the generative-system conceptualization (with y). In the structure system it is routed to MEMORY, which is how it is drawn here; no environment sink is invented for it.
# note: No kind of flow is declared. The variables are encoded binary digits under an encoding Klir explicitly sets aside, so matter, energy and message would all be guesses.

system "A Serial Binary Adder"

component SUM
component CARRY
component MEMORY

source x1
source x2
sink y

flow x1 -> SUM "x1 — a digit of the first number"
flow x2 -> SUM "x2 — a digit of the second number"
flow MEMORY -> SUM "c' — the previous carry"
flow x1 -> CARRY "x1 — a digit of the first number"
flow x2 -> CARRY "x2 — a digit of the second number"
flow MEMORY -> CARRY "c' — the previous carry"
flow SUM -> y "y — a digit of the sum"
flow CARRY -> MEMORY "c — the carry, held one discrete time"

@lens klir
@directed 1
@directed 2
@directed 3
@directed 4
@directed 5
@directed 6
@directed 7
@directed 8
