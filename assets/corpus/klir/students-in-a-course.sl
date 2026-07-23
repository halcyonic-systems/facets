# corpus-entry: v1
# title: Students in a course
# author: George Klir
# work: Facets of Systems Science, 2nd ed.
# year: 2001
# locus: Ch. 2, Table 2.1 and Table 2.2
# figure: Fig. 2.2a
# teaches: An equivalence relation on a named set, given by Klir as a set, as a matrix, and as a node-edge diagram — the same system in three registers, with the relation partitioning the set into equivalence classes.
# omits: The other three characteristics in Table 2.1 (major, age, full-time status) and the relations they induce; Klir's Rm on majors is a sibling lesson, not this one.
# note: The edges are Rg, the equivalence relation Klir defines on grades. Table 2.2 prints it as a matrix; that matrix is a rendering of the definition, and the grade column of Table 2.1 is clean, so the edges here are the definition applied rather than the matrix transcribed.
# note: Following Klir's own simplification of Fig. 2.2a, the reflexive self-connections are omitted and each pair is drawn once — the relation is symmetric, so an undirected reading is the faithful one.
# note: The kingdom is ours, not Klir's. He asserts no ontological type; students are concrete social things, so Concrete/Social is the honest reading of T. The relation Rg is the investigator's, which is Klir's whole point.

system "Students in a Course" : Concrete/Social

component Alan
component Bob
component Cliff
component Debby
component George
component Jane
component Lisa
component Mary
component Nancy
component Paul

# A grades: Debby, George, Jane
flow Debby -> George "same grade"
flow Debby -> Jane "same grade"
flow George -> Jane "same grade"

# B grades: Alan, Lisa, Nancy, Paul
flow Alan -> Lisa "same grade"
flow Alan -> Nancy "same grade"
flow Alan -> Paul "same grade"
flow Lisa -> Nancy "same grade"
flow Lisa -> Paul "same grade"
flow Nancy -> Paul "same grade"

# C grades: Bob, Cliff, Mary
flow Bob -> Cliff "same grade"
flow Bob -> Mary "same grade"
flow Cliff -> Mary "same grade"

@lens klir
