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
# note: The eight flows carry `informational`, and that kind is THIS MODEL'S reading rather than Klir's, who types nothing. What travels each wire is a binary digit: Klir's own words are "encoded digits of the two numbers" and "a series of encoded digits that represents the sum". A digit is a message under any of the four kinds the language offers, and it is the one place in this corpus where the substance-blind source leaves no room for a second answer. He does set the physical encoding aside — "ignoring the physical encoding" — but that is a statement about the CARRIER, not about what is carried; declaring `informational` commits to the digit, not to the voltage.
# note: MEMORY is NOT decomposed, and the source is why. Klir describes it as one device, not as a structure: it "implements the translation rule by which the sampling variable c' (previous carry) is defined (it requires a memory device that can keep the input state for one discrete time and, then, release it as output state)". One delay element has no interior to transcribe, and a latch-and-clock interior would be ours. The interiors Klir DOES assert in this figure belong to SUM and CARRY, and those are the ones the conversion lost — see the warning above. So typing is where this entry stops, and the second order stays the entry's declared gap.

system "A Serial Binary Adder"
level Structure

component SUM
component CARRY
component MEMORY

source x1
source x2
sink y

flow x1 -> SUM : informational "x1 — a digit of the first number"
flow x2 -> SUM : informational "x2 — a digit of the second number"
flow MEMORY -> SUM : informational "c' — the previous carry"
flow x1 -> CARRY : informational "x1 — a digit of the first number"
flow x2 -> CARRY : informational "x2 — a digit of the second number"
flow MEMORY -> CARRY : informational "c' — the previous carry"
flow SUM -> y : informational "y — a digit of the sum"
flow CARRY -> MEMORY : informational "c — the carry, held one discrete time"

@lens klir
@directed 1
@directed 2
@directed 3
@directed 4
@directed 5
@directed 6
@directed 7
@directed 8
