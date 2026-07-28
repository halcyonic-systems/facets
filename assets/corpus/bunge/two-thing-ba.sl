# corpus-entry: v1
# title: The two-thing system — b acts on a
# set: Two-thing structures
# author: Mario Bunge
# work: Treatise on Basic Philosophy, Vol. 4: A World of Systems
# year: 1979
# locus: Ch. 1 §1.2, Definition 1.2, Example
# figure: Fig. 1.2
# teaches: The same composition and environment as its siblings, with the internal structure reversed to b▷a — showing that structure, not composition, is what distinguishes these systems.
# omits: Bunge's caveat that not every conceivable structure is nomologically possible, technically feasible, or desirable; and the quantitative model of §2.2, without which formation and breakdown rates cannot be predicted.
# note: One of three siblings over ONE fixed composition. Bunge names all three internal structures in a single sentence — a▷b, b▷a, a⋈b — and calls them "the conceivable internal structures". The diff between the three files is the lesson.
# note: Bunge lists four possible external structures ({a▷c}, {b▷c}, {c▷a}, {c▷b}) "or their unions" and picks none. Choosing {a▷c} and holding it fixed across all three siblings is our construction, so that the diff isolates the internal structure. Definition 1.2(ii) requires c to act or be acted on by a component, so some external relation is forced.
# note: The composition is Bunge's own: C(σ)={a,b}, E(σ)={c}. The bare letters are his, and the bareness is the point — this example asserts no domain at all.
# note: Direction is asserted on every relation (@directed): ▷ is Bunge's asymmetric action — "a acts on b, and not conversely" — and ⋈ is two such actions. Without the assertion a▷b and b▷a are graph-isomorphic and Def 1.2's three conceivable structures collapse to two (#216).

system "The Simplest Possible System"

component a
component b

sink c

flow b -> a "b acts on a"
flow a -> c "a acts on c"

@lens bunge
@directed 1
@directed 2
