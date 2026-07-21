# Lean provenance — the pinned proof base behind every "machine-checked" claim

*Status: **LIVE**. This repo's "machine-checked" story rests on proofs that live in a separate repo, `systems-science-foundations` (SSF). This document is the pin: the exact SSF commit the current claims refer to, a per-claim map from each claim to the Lean declaration that proves it, and the commands an auditor starting from this repo alone runs to check every one. It is the provenance complement to [`spec/LENS_ENTRY_SPEC.md`](../spec/LENS_ENTRY_SPEC.md) §D's extraction half (issue [#24](https://github.com/halcyonic-systems/bert-lenses/issues/24)): §D says how the truth-table fixture and oracle are produced from SSF; this doc says which SSF, at which commit, and how to audit it. Issue [#128](https://github.com/halcyonic-systems/bert-lenses/issues/128).*

## The pin

```
repo:           https://github.com/halcyonic-systems/systems-science-foundations
pinned-commit:  71a7883b3bbe15b91ad137b81bb80a77915e0da1
pinned-date:    2026-07-20
lean-toolchain: leanprover/lean4:v4.28.0  (SSF's lean-toolchain file at the pin)
```

Every citation below — file paths, declaration names — is verified against that commit. Citations are anchored by **declaration name**, not line number: line numbers drift (issue [#127](https://github.com/halcyonic-systems/bert-lenses/issues/127)), symbol names are what the audit greps for and what Lean resolves. Where other docs in this repo cite `file:line` into SSF (e.g. [`theory-fidelity.md`](theory-fidelity.md)), those line numbers are correct at this pin and only at this pin; the names in the tables below are the durable anchors.

Two mechanical checks already bind this repo to SSF and run in CI or on any checkout with SSF present (see the audit path):

- `crates/bert-core/tests/gates_truth_table.rs` — Rust gates vs the committed Lean-emitted fixture, every row, both directions.
- `crates/bert-core/src/transition.rs` (`lean_citations_resolve_or_skip_gracefully`) — every Lean name that module cites must still exist in `ViewGeneration.lean`.

This document extends that discipline to the full claim set.

## Per-claim map

Column 1 is the claim as this repo states it (with where it's stated); columns 2–4 are the SSF file, the declaration(s), and what the Lean actually proves. All paths are relative to the SSF repo root. Declarations live in the `Systems` namespace unless noted.

### The kernel and the three generated views

Stated in: [`theory-fidelity.md`](theory-fidelity.md) ("What the kernel actually is"), [`spec/LENS_ENTRY_SPEC.md`](../spec/LENS_ENTRY_SPEC.md) §A/§C, `README.md`, `crates/bert-core/src/transition.rs` header table.

| Claim | SSF file | Declaration(s) | What it proves |
|---|---|---|---|
| The kernel is Klir's `(T, R)` plus on-ness — the K ≅ **2** arrow | `Systems/Klir/ViewGeneration.lean` | `Kernel` (fields `things`, `dep`, `dep_on`) | Definition: `dep_on` makes every dependency endpoint a thing; this is the structure everything below is generated from |
| The Klir view is free, and it round-trips | `Systems/Klir/ViewGeneration.lean` | `Kernel.toKlir`, `KlirSystem.toKernel`, `Kernel.toKlir_toKernel`, `KlirSystem.toKernel_toKlir` | Generation with no hypothesis, and both round-trip identities (`rfl`) |
| Structural entry costs a bond | `Systems/Klir/ViewGeneration.lean` | `Kernel.HasBond` (def), `Kernel.toBunge` (map gated on it) | A kernel whose dependency contains a bonded pair of *distinct* relata generates a Bunge CES view (Def 1.1: unbonded collection = aggregate) |
| The Bunge view is faithful | `Systems/Klir/ViewGeneration.lean` | `Kernel.toBunge_toKlir`, `Kernel.toBunge_injective`, `Kernel.toBunge_isClosed` | Projecting the generated view back fixes the kernel; distinct kernels generate distinct views; the generated system is closed |
| Operational entry costs irreflexivity | `Systems/Klir/ViewGeneration.lean` | `Kernel.Irreflexive` (def), `Kernel.toFlowNetwork`, `Kernel.toMobus` (maps gated on it) | A kernel with no self-dependency (§4.3, k ≠ o) generates a Mobus view via its flow network |
| The Mobus view is faithful | `Systems/Klir/ViewGeneration.lean` | `Kernel.toMobus_totalRelation`, `Kernel.toMobus_toKlir`, `Kernel.toMobus_injective` | The generated view's total relation is exactly `dep`; projection fixes the kernel; distinct kernels generate distinct views |
| Exactly one composite is proven | `Systems/Klir/ViewGeneration.lean` | `Kernel.toMobus_toBunge`, with hypotheses via `Kernel.DepActs`, `Kernel.toFlowNetwork_inducesAction`, `Kernel.toFlowNetwork_edges_nonempty` | When *both* preconditions (plus dependency-induces-action) hold, generating Mobus then projecting to Bunge equals generating Bunge directly — the commuting triangle with the kernel at the apex |
| `HasBond` and `Irreflexive` are independent — parallel lenses, no tower | `Systems/Klir/GatesTruthTable.lean` + `fixtures/gates_truth_table.json` (this repo) | *(negative claim — no entailment theorem exists, by design)* | Checked by exhibition, not by a theorem: the fixture contains rows passing each gate while failing the other (e.g. `n=2, dep=[[0,1],[1,1]]` bonded-but-reflexive; `n=1, dep=[]` irreflexive-but-unbonded), and the rows report the real predicates via the `_iff` bridges below |

### The truth-table and oracle bindings (spec §D)

Stated in: [`spec/LENS_ENTRY_SPEC.md`](../spec/LENS_ENTRY_SPEC.md) §C–§D, `fixtures/gates_truth_table.json` (`_generator`), `crates/bert-core/tests/gates_truth_table.rs`, `crates/bert-core/tests/gates_oracle.rs`.

| Claim | SSF file | Declaration(s) | What it proves |
|---|---|---|---|
| The fixture's gate booleans report the real ViewGeneration predicates, not look-alikes | `Systems/Klir/GatesTruthTable.lean` | `GatesTruthTable.hasBondB_iff`, `GatesTruthTable.irreflexiveB_iff` | `hasBondB D = true ↔ (kernelOf D).HasBond` (under the total action instance — the ActsOn pinning of spec §C) and `irreflexiveB D = true ↔ (kernelOf D).Irreflexive` |
| Fixture and oracle evaluate the SAME declarations | `Systems/Klir/Gates.lean` | `GatesTruthTable.hasBondB`, `GatesTruthTable.irreflexiveB`, `GatesTruthTable.ModeVerdicts`, `GatesTruthTable.modesOf` | The shared boolean gates and mode-verdict map both emitters import — one definition site, so fixture and oracle cannot disagree with each other |
| The fixture is Lean-emitted, not hand-written | `Systems/Klir/GatesTruthTable.lean` | `GatesTruthTable.fixtureJson`, `GatesTruthTable.emit`, `main` | The enumerator over every `(T, R)` kernel on `Fin n`, `n ≤ 2` (19 rows) that prints `fixtures/gates_truth_table.json` verbatim |
| The subprocess oracle exists and speaks the documented contract | `Systems/Klir/GatesOracle.lean`, `lakefile.lean` | `lean_exe «gates-oracle»` (lakefile target; contract at the head of `GatesOracle.lean`) | `lake exe gates-oracle` evaluates `hasBondB` / `irreflexiveB` on arbitrary stdin models — the Rung 1.5 unbounded cross-check |

### Bond semantics and the Mobus tuple

Stated in: [`theory-fidelity.md`](theory-fidelity.md) (Bunge and Mobus sections), `crates/bert-canvas/src/lenses.rs` (bond criterion), this repo's `CLAUDE.md` §"Semantic authority". Tuple slot attribution is the terminology concordance's job ([`language/terminology-concordance.md`](language/terminology-concordance.md), row 1); this table maps only claim → proof.

| Claim | SSF file | Declaration(s) | What it proves |
|---|---|---|---|
| "A flow that modifies history is a bond" — the bond criterion the kernel validates against | `Systems/Mobus/Bridge.lean` | `FlowInducesAction` | The predicate connecting a flow network to action pairs — the semantic side `check_bond`'s syntactic test is pinned to |
| Bondhood is action both ways | `Systems/Core/Bond.lean` | `ActsOn` (class), `Bonded` | The action typeclass and the bonded-pair predicate `HasBond` quantifies over |
| The tuple is a structure with E first-class, components and environment disjoint | `Systems/Mobus/Tuple.lean` | `MobusSystem` (fields incl. `environment`, `disjoint`, `bipartite`, `externalFlows_within`) | The machine-checked tuple (concordance row 1: E first-class is a Lean improvement over the printed 7-tuple); environment is a field, not an afterthought, and can't overlap components |
| Boundary completeness and the total relation | `Systems/Mobus/Tuple.lean` | `MobusSystem.boundaryComplete`, `MobusSystem.totalRelation`, `MobusSystem.totalRelation_on`, `MobusSystem.internal_edges_in_components` | Every external flow crosses the boundary at an interface; the system's total relation stays on its own furniture; internal edges connect components only |

### The decomposition seam (bert-lenses#89)

Stated in: `crates/bert-core/src/decomposition.rs` (header transcription table — the Rust check is a literal transcription, row by row), [`design/decomposition-foundations.md`](design/decomposition-foundations.md).

| Claim | SSF file | Declaration(s) | What it proves |
|---|---|---|---|
| The boundary contract is the eight fields of a structure, not prose | `Systems/Core/Decomposition.lean` | `Decomposition` (fields `comp_mem`, `βsrc`, `βsnk`, `src_preserves_kind`, `snk_preserves_kind`, `src_lands`, `snk_lands`, `derived_env`), over `inflows`, `outflows`, `childSources`, `childSinks` | Definition: child sources/sinks biject with the component's inflows/outflows, kind-preserving, landing on interfaces, with `E′` derived as the parent's interior neighborhood — the contract `check_decomposition` transcribes |
| The seam is sound | `Systems/Core/Decomposition.lean` | `Decomposition.seam`, `Decomposition.seam_bijective`, `Decomposition.inflow_continues`, `Decomposition.outflow_continues`, `Decomposition.seam_preserves_kind` | The combined source+sink correspondence is a bijection; every parent boundary flow continues into the child with its substance kind intact |
| Substitution is sound; depth-1 assembly is well-formed | `Systems/Core/Decomposition.lean` | `Decomposition.substitution_sound`, `assembleDepth1`, `assembleDepth1_wellFormed`, `decompose_one_wellFormed` | Replacing the component by its child preserves the contract's guarantees; the depth-1 assembly of a decomposed model is itself a well-formed tuple |

### Prose references (not proofs)

- `docs/reference/system-type-typologies.md` (SSF) — the author-grounded typology behind the asserted `system_type` metadata ([`theory-fidelity.md`](theory-fidelity.md) §"Asserted system type"). A document, not a Lean artifact: cite it as scholarship, not as machine-checked.

## The audit path

Starting from this repo alone, with `git`, `curl`-less patience, and the Lean toolchain manager (`elan`):

```bash
# 1. Fetch SSF at the pin (beside this repo — the default location the tests probe)
git clone https://github.com/halcyonic-systems/systems-science-foundations.git
cd systems-science-foundations
git checkout 71a7883b3bbe15b91ad137b81bb80a77915e0da1

# 2. Build every proof. elan reads lean-toolchain (v4.28.0) automatically.
#    `lake build` compiles the whole Systems library AND the gates-oracle
#    executable; any broken or missing proof is a hard build failure.
lake exe cache get   # pre-built mathlib (hours → minutes)
lake build

# 3. Zero-sorry check: no cited proof may be a stub.
grep -rn "sorry" Systems/ && echo "FAIL: sorry found" || echo "OK: zero sorries"

# 4. Per-claim existence: every declaration in the tables above resolves.
#    Spot-check any row by name (repeat per declaration; kernel-checked, so a
#    renamed or deleted theorem fails here):
echo 'import Systems.Klir.ViewGeneration
#print axioms Systems.Kernel.toMobus_toBunge' | lake env lean --stdin
#    → prints the axiom footprint (propext/Quot.sound/Classical.choice at most);
#      `sorryAx` in the output would mean an unsound stub. SSF ships
#      scripts/axiom-profile.sh to run this over its headline theorems.

# 5. Cross-check the committed fixture is what the pinned Lean emits (spec §D):
lake env lean --run Systems/Klir/GatesTruthTable.lean \
  | diff - ../bert-lenses/fixtures/gates_truth_table.json && echo "fixture matches pin"

# 6. Run the Rust-side bindings against the pinned checkout (from bert-lenses):
cd ../bert-lenses
cargo test -p bert-core --test gates_truth_table          # Rung 1: fixture rows
SSF_DIR=../systems-science-foundations \
  cargo test -p bert-core --test gates_oracle             # Rung 1.5: live oracle
cargo test -p bert-core transition                        # includes lean_citations_resolve
```

Steps 1–4 need no part of this repo; steps 5–6 close the loop back into it. If SSF is checked out at the default sibling path, steps 5–6's tests find it without any env var, and the citation-drift gate in `transition.rs` runs on every `cargo test --workspace` instead of skipping.

## Update discipline — when the pin moves

The pin and the fixture move **together**, never separately. Advancing to a new SSF commit is one atomic change:

1. Check out the new SSF commit; `lake build` must pass there.
2. Regenerate the fixture with the `_generator.command` recorded inside it (spec §D): `lake env lean --run Systems/Klir/GatesTruthTable.lean > ../bert-lenses/fixtures/gates_truth_table.json`. Commit the diff (or its absence).
3. Re-run the audit path steps 4–6 against the new checkout — in particular the oracle test with `SSF_DIR` pointed at it, and `lean_citations_resolve`.
4. Re-verify every declaration named in the per-claim map still exists (step 4's spot-check, or `grep -n <name>` over the cited file); a rename in SSF must be reflected in the table row the same day, per the citation law in `transition.rs`: *a citation must never outlive its referent*.
5. Update the `pinned-commit` / `pinned-date` lines above. That hash is the single source of truth; nothing else in this repo restates it.

A PR that regenerates the fixture without moving this pin, or moves this pin without re-running the fixture diff, is incomplete by definition.
