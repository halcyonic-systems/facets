# #112 Half A — the coalgebra classification (the buildable half)

*2026-07-23 · architecture note · the low-risk, grounded half of #112. Companion to the frontier-council pass on Half B (heterogeneous open composition — the open frontier).*

The dynamics work (#112) splits into two halves with opposite risk profiles, per the verified in-house survey `dynamics-research/read-category-theory.md`:

- **Half A — classify the *kind* of dynamics.** Interpret each `kind` as its endofunctor; type the transition accordingly. **Solved, low-risk, buildable now.** This note.
- **Half B — *compose* open systems of mixed kinds.** Wire a conservation element next to an FSA element in one diagram. **A genuine open research problem** (the survey's sharpest finding). The council-driven frontier; not this note.

Half A is what unblocks #100 phase 5. It is deliberately *homogeneous and per-model* — no cross-kind composition.

---

## 1. The move, in one line

The 8-tuple's `T` (transform) is the **coalgebra structure map** `T : S → F(S)`; `H` (history) is its **final-coalgebra unfolding**; the `Dynamics` descriptor's `kind` names the endofunctor `F`, and its `inputType`/`outputType` ports are the Mealy `A`/`B`. `T` and `H` were *always* coalgebra-shaped — BERT only ever instantiated one functor (`Id`, conservation flow), so it never had to say so. The descriptor (landed 2026-07-23) is the place it now says so.

## 2. The functor table (grounded, cross-verified)

Each `DynamicsKind` is one endofunctor, and openness is the Mealy wrapper over the descriptor's ports (`A = inputType`, `B = outputType`; closed = `A = B = Unit`):

| `DynamicsKind` | Closed functor `F(X)` | Open (Mealy) form `F(X)` | BERT target |
|---|---|---|---|
| `deterministic` | `X^Σ` (or `Id` for Σ=1) | `(B × X)^A` | conservation-flow step; FSA/DLG (#67); Boolean net |
| `markov` | `Dist(X)` | `(B × Dist(X))^A` | absorbing Markov (#67 ruling) |
| `nondeterministic` | `𝒫(X)` | `(B × 𝒫(X))^A` | the life-cycle inclusion `ΔS ∈ F(S)` |

The convergence that makes this trustworthy: Rutten's coalgebra and Spivak's *Category Theory for the Sciences* (both in-vault) land on the **identical** functor for each kind, independently — `Loop → Set` (deterministic), `Loop → Kls(Dist)` (Markov), monoid-action `S^Σ` (FSA). And `Id ⇒ Dist` is the Dirac unit of the `Dist` monad, so a deterministic system is a degenerate Markov chain by a *named* natural transformation, not an ad-hoc code path — exactly what #67 needs to relate its FSA and Markov modes rigorously.

## 3. What Half A unblocks — #100 phase 5, concretely

Phase 5 was "Bunge live trajectory + Klir behavior-function readout," deferred for the compose seam. Both *are* Half-A objects:

- **Klir's behavior-function / mask readout** (Fig. 4.3, Table 4.3 — `f : Ḡ → G`) is the **coalgebra structure map** itself, presented as a table. It is `T` read in Klir's register.
- **Bunge's live trajectory / state-space run** is the **unfolding of the coalgebra** — `H`, the sequence `s, T(s), T²(s), …`, i.e. the image in the final coalgebra.

So once `T` carries its functor (Half A), phase 5's two readouts are *presentations of one object per lens*, not two new engines. That is the whole reason phase 5 was gated on #112.

## 4. The Lean/Rust shape (sketch, not committed)

The descriptor already carries `kind`, ports, support, invariants. Half A adds the **typed transition**, indexed by the descriptor — the piece deliberately left off the descriptor because typing it *is* choosing the functor:

```
-- the functor a kind names (closed core; open = Mealy-wrap with the ports)
def kindCodomain : DynamicsKind → Type → Type
  | .deterministic  => id
  | .markov         => FinDist        -- finite-support distribution (List (X × ℚ≥0), normalized)
  | .nondeterministic => List         -- finite powerset surrogate (the life-cycle successors)

-- the transition, Mealy-shaped over the descriptor's ports
structure Transition (d : Dynamics S) where
  step : d.inputType × S → kindCodomain d.kind (d.outputType × S)
```

Notes on cost, from the survey's honesty:
- **No Mathlib `PMF` dependency needed.** `markov`'s codomain is finite-support — `List (X × ℚ≥0)` with a normalization side-condition — which is all #67's absorbing chain needs and keeps the file light.
- **`nondeterministic` uses `List` as a finite-powerset surrogate**, matching the life-cycle's finite successor sets.
- **The closed case is the default** (`inputType = outputType = Unit`), so a compose model's `step : S → id (S)` = `S → S` — the existing engine, now *typed as* the `deterministic` coalgebra.

## 5. The honest caveat — where the value actually is

The survey is blunt: calling a single conservation flow "a coalgebra of `Id`" in isolation is **true but vacuous** — it says only "next state is a function of current state," which any simulator does. **The coalgebra framing earns its keep only across *heterogeneous* functors** — when it lets you say precisely *how* FSA differs from Markov differs from conservation (swap `X^Σ` for `Dist(X)` for `Id`), and relate them by named monad units. So Half A's payoff is:
1. a **checkable typing discipline** on `T` (a model declares its kind; the transition's type must match — a new `check_*`);
2. **principled per-lens phase-5 readouts** (Klir mask, Bunge trajectory) as presentations of the one coalgebra;
3. the **classification substrate** that Half B's composition needs.

Half A alone is a typing discipline plus two lens readouts — real, but modest. It is *not* an execution technology (the runtime stays Rust/WASM stepping) and does *not* claim BERT "is coalgebraic" in any load-bearing external sense until Half B exists.

## 6. The seam to Half B

Half A is **per-kind, homogeneous, no composition**. The moment two elements of *different* kinds must be wired into one composite dynamics, you are in Half B — the open problem (Poly / Myers double-category / VSL operad / Willems-sheaf; frontier-council pass 2026-07-23). Half A's descriptor-plus-ports is designed to be the thing Half B composes *over*: the ports are the wiring interface, the `kind` is what a heterogeneous wiring diagram would have to reconcile. Ship Half A; let Half B's frame decide how the ports get wired.

## Build order (when scheduled)
1. `kindCodomain` + `Transition` (the typed transition over the descriptor) — SSF, or bert-core.
2. `check_transition` — the kind/transition type-match gate, joining the `check_*` family.
3. Klir mask readout + Bunge trajectory readout in the canvas registers (#100 phase 5) — presentations of `T` and its unfolding.
4. `H` as the final-coalgebra unfolding — the run record, typed.

Nothing here touches Half B, the runtime, or the tether-only *engine* path; it is the typed classification the descriptor was built to carry.
