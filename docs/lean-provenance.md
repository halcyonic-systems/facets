# Lean provenance — the pinned proof base behind every "machine-checked" claim

**Status: LIVE.**

*This repo's "machine-checked" story rests on proofs that live in a separate repo, `systems-science-foundations` (SSF). This document is the pin: the exact SSF commit the current claims refer to, a per-claim map from each claim to the Lean declaration that proves it, and the commands an auditor starting from this repo alone runs to check every one. It is the provenance complement to [`spec/LENS_ENTRY_SPEC.md`](../spec/LENS_ENTRY_SPEC.md) §D's extraction half (issue [#24](https://github.com/halcyonic-systems/bert-lenses/issues/24)): §D says how the truth-table fixture and oracle are produced from SSF; this doc says which SSF, at which commit, and how to audit it. Issues [#128](https://github.com/halcyonic-systems/bert-lenses/issues/128), [#232](https://github.com/halcyonic-systems/bert-lenses/issues/232).*

## The pin

<!-- BEGIN GENERATED: pin — from docs/lean-manifest.json, `just provenance` -->

```
repo:           https://github.com/halcyonic-systems/systems-science-foundations
pinned-commit:  71a7883b3bbe15b91ad137b81bb80a77915e0da1
pinned-date:    2026-07-20
lean-toolchain: leanprover/lean4:v4.28.0  (SSF's lean-toolchain file at the pin)
```

**Staleness budget.** Pinned at `71a7883`; SSF HEAD replayed 2026-07-26 at `dbf4524`, **24 commits ahead**; the delta was reviewed declaration by declaration. Drift that touches a claim in the tables below:

- **One material addition: `MobusSystem.interfaces_carry_flow`** (SSF #31, proven non-redundant in SSF #35). At the pin, `MobusSystem` carries five coherence constraints; at HEAD it carries six. Every claim in the tables below still holds — no theorem weakened, `Kernel.toMobus` discharges the new field — but *the pinned description of the 8-tuple contract under-reports it by one constraint*, and any statement that the constraints contain no interface ⇒ flow requirement is **false at HEAD**, not merely stale. Corrected in `design/lens-palettes.md` §Q2.
- `Systems/Category/` — the categorification machinery, including the eight faithfulness theorems and the maximality repair — **did not exist at the pin** and is outside this repo's citation set. See the K≅2 scope fence below.
- `Systems/Mobus/Lifecycle.lean`, `Systems/Mobus/Interface.lean`, `Systems/Dynamics/Transition.lean` are new at HEAD. This repo cites none of them.
- No symbol in the tables below was renamed, deleted, or changed kind between the pin and HEAD (Gate B, run 2026-07-26).

Next replay due 2026-08-26. This paragraph is the budget: the pin is allowed to be behind, and is not allowed to be behind *silently*. Gate B (below) fails when a manifest symbol stops resolving at HEAD, which is the trigger to replay and rewrite this paragraph.

<!-- END GENERATED: pin -->

## How these citations are kept true

The tables below are **generated** from [`lean-manifest.json`](lean-manifest.json), which holds one machine-readable row per claim: `{claim_id, ssf_symbol, declared_kind, file}`. Prose elsewhere in this repo cites a `claim_id` and nothing else. Nobody hand-edits a citation string, because hand-editing citation strings is what put `externalFlows_within` — a field name that exists at no commit of SSF — into a table sitting under a sentence certifying that every citation had been checked. That sentence is gone. What replaces it is two gates on two clocks:

- **Gate A — blocking.** `python3 scripts/lean_provenance.py resolve` checks every manifest symbol against SSF **at the pin**: it must resolve in the file the manifest names, and it must carry the **kind** the manifest declares. Runs in [`.github/workflows/lean-provenance.yml`](../.github/workflows/lean-provenance.yml) on every push and pull request, and in `just check` whenever an SSF checkout is present. The kind half is the part that earns its keep: it is what fails when a doc says a Rust check "mirrors Lean **theorems**" over predicates that are Lean `def`s — an overstatement by exactly one type, invisible to any check that only asks whether the name exists.
- **Gate B — scheduled, loud, non-blocking.** The same resolution against **SSF HEAD**, weekly, in [`.github/workflows/lean-provenance-head.yml`](../.github/workflows/lean-provenance-head.yml). It cannot block a merge, because upstream moving is not a defect in a pull request. **A Gate B failure is the unpark trigger issue [#127](https://github.com/halcyonic-systems/bert-lenses/issues/127) is missing**: it is the event that says the pin must be replayed, the staleness paragraph rewritten, and any affected claim repaired — same day, per the citation law in `transition.rs` (*a citation must never outlive its referent*).

**What resolution does and does not establish, stated plainly.** The gate parses Lean *source text*: it tracks `namespace`/`end` to compute each declaration's full name and reads `structure` bodies for field names. It does not elaborate Lean. Passing Gate A means every cited symbol exists, in the named file, declared with the stated keyword. It does **not** mean the proofs compile, that they are sorry-free, or that they say what the "What the Lean gives" column says they say. Compilation and the zero-sorry property are what `lake build` and step 3 of the audit path below establish; the semantic reading of each theorem is a human claim, and the **Shape relied on** notes in the tables are where that claim is made explicit rather than smuggled into a summary.

Two further mechanical checks bind this repo to SSF and run in CI or on any checkout with SSF present:

- `crates/bert-core/tests/gates_truth_table.rs` — Rust gates vs the committed Lean-emitted fixture, every row, both directions.
- `crates/bert-core/src/transition.rs` (`lean_citations_resolve_or_skip_gracefully`) — every Lean name that module cites must still exist in `ViewGeneration.lean`.

**Citations are anchored by declaration name, never by line number.** A line number into another repository is not a citation; it is a coincidence with a timestamp (issue [#127](https://github.com/halcyonic-systems/bert-lenses/issues/127)). The manifest has no field to put one in, which is deliberate. Where a `file:line` into SSF survives in this repo it is in `docs/design/**` and `docs/archive/**` — research and historical documents, outside the LIVE doc set and outside the manifest.

## Per-claim map

Column 1 is the `claim_id` prose cites. Columns 2–5 are the claim as this repo states it, the SSF file, the declaration(s) **with the Lean keyword each one actually carries**, and what the Lean gives. All paths are relative to the SSF repo root. Declarations live in the `Systems` namespace unless the row says otherwise.

Read the *kind* column adversarially, because it is the column that constrains the prose. A `def` is a definition — a Rust function that "mirrors" one mirrors a definition and inherits none of its neighbours' proof status. A `structure` field is a constraint discharged at construction, not a standalone theorem. `theorem` and `lemma` are the same declaration in Lean 4 and the gate treats them as interchangeable; where the *shape* of a statement is what a claim leans on — how many hypotheses, under which instance — the row says so under **Shape relied on**.

<!-- BEGIN GENERATED: table-kernel-views — from docs/lean-manifest.json, `just provenance` -->

### The kernel and the three generated views

Stated in: [`theory-fidelity.md`](theory-fidelity.md) ("What the kernel actually is"), [`spec/LENS_ENTRY_SPEC.md`](../spec/LENS_ENTRY_SPEC.md) §A/§C, `README.md`, `crates/bert-core/src/transition.rs` header table.

| # | Claim | SSF file | Declaration(s) — *kind* | What the Lean gives |
|---|---|---|---|---|
| `kernel.object` | The kernel is Klir's `(T, R)` plus on-ness — the K ≅ **2** arrow | `Systems/Klir/ViewGeneration.lean` | `Kernel` — *structure*, `Kernel.things` — *field*, `Kernel.dep` — *field*, `Kernel.dep_on` — *field* | A definition, not a theorem: `dep_on` is the field forcing every dependency endpoint to be a thing. This is the structure everything below is generated from. |
| `kernel.klir-free` | The Klir view is free, and it round-trips | `Systems/Klir/ViewGeneration.lean` | `Kernel.toKlir` — *def*, `KlirSystem.toKernel` — *def*, `Kernel.toKlir_toKernel` — *theorem*, `KlirSystem.toKernel_toKlir` — *theorem* | Generation with no hypothesis (the maps are `def`s), and both round-trip identities as proved equalities (`rfl`). |
| `kernel.bunge-gate` | Structural entry costs a bond | `Systems/Klir/ViewGeneration.lean` | `Kernel.HasBond` — *def*, `Kernel.toBunge` — *def* | A kernel whose dependency contains a bonded pair of *distinct* relata generates a Bunge CES view (Def 1.1: unbonded collection = aggregate). **Shape relied on:** a `Prop`-valued `def` used as a hypothesis — `toBunge (k) (hb : k.HasBond)`. Rust's `check_bond` mirrors this **definition**; the theorems that make the generated view faithful are the separate rows below. |
| `kernel.bunge-faithful` | The Bunge view is faithful | `Systems/Klir/ViewGeneration.lean` | `Kernel.toBunge_toKlir` — *theorem*, `Kernel.toBunge_injective` — *theorem*, `Kernel.toBunge_isClosed` — *theorem* | Projecting the generated view back fixes the kernel; distinct kernels generate distinct views; the generated system is closed. |
| `kernel.mobus-gate` | Operational entry costs irreflexivity | `Systems/Klir/ViewGeneration.lean` | `Kernel.Irreflexive` — *def*, `Kernel.toFlowNetwork` — *def*, `Kernel.toMobus` — *def* | A kernel with no self-dependency (§4.3, k ≠ o) generates a Mobus view via its flow network. **Shape relied on:** as above — a `Prop`-valued `def` consumed as a hypothesis, `toMobus (k) (hi : k.Irreflexive)`. `check_self_loops` mirrors the **definition**. |
| `kernel.mobus-faithful` | The Mobus view is faithful | `Systems/Klir/ViewGeneration.lean` | `Kernel.toMobus_totalRelation` — *theorem*, `Kernel.toMobus_toKlir` — *theorem*, `Kernel.toMobus_injective` — *theorem* | The generated view's total relation is exactly `dep`; projection fixes the kernel; distinct kernels generate distinct views. |
| `kernel.one-composite` | Exactly one composite is proven | `Systems/Klir/ViewGeneration.lean` | `Kernel.toMobus_toBunge` — *theorem*, `Kernel.DepActs` — *def*, `Kernel.toFlowNetwork_inducesAction` — *theorem*, `Kernel.toFlowNetwork_edges_nonempty` — *theorem* | When all three hold, generating Mobus then projecting to Bunge equals generating Bunge directly — the commuting triangle with the kernel at the apex. **Shape relied on:** a proved implication under **three** hypotheses — `HasBond`, `Irreflexive`, and `DepActs`. Drop any one and the triangle is not claimed; this is where a hostile reader pushes, so the hypotheses are named here rather than summarized as "both preconditions". |
| `kernel.gates-independent` | `HasBond` and `Irreflexive` are independent — parallel lenses, no tower | `Systems/Klir/GatesTruthTable.lean` | *(none — negative claim; see below)* | `fixtures/gates_truth_table.json` (this repo) contains rows passing each gate while failing the other — `n=2, dep=[[0,1],[1,1]]` bonded-but-reflexive; `n=1, dep=[]` irreflexive-but-unbonded — and those rows report the real predicates via the `_iff` bridges in `gates.iff-bridges`. **Shape relied on:** **a negative claim, checked by exhibition, not by a theorem.** No entailment theorem exists in either direction, by design; nothing here is proven, and this row must never be cited as proof of independence. |

<!-- END GENERATED: table-kernel-views -->

<!-- BEGIN GENERATED: table-gates — from docs/lean-manifest.json, `just provenance` -->

### The truth-table and oracle bindings (spec §D)

Stated in: [`spec/LENS_ENTRY_SPEC.md`](../spec/LENS_ENTRY_SPEC.md) §C–§D, `fixtures/gates_truth_table.json` (`_generator`), `crates/bert-core/tests/gates_truth_table.rs`, `crates/bert-core/tests/gates_oracle.rs`.

| # | Claim | SSF file | Declaration(s) — *kind* | What the Lean gives |
|---|---|---|---|---|
| `gates.iff-bridges` | The fixture's gate booleans report the real ViewGeneration predicates, not look-alikes | `Systems/Klir/GatesTruthTable.lean` | `GatesTruthTable.hasBondB_iff` — *theorem*, `GatesTruthTable.irreflexiveB_iff` — *theorem* | `hasBondB D = true ↔ (kernelOf D).HasBond` and `irreflexiveB D = true ↔ (kernelOf D).Irreflexive`. **Shape relied on:** two proved bi-implications. `hasBondB_iff` holds **under the total `ActsOn` instance** (the pinning of spec §C) — it is not instance-independent, and citing it without that hypothesis overstates it. |
| `gates.one-definition-site` | Fixture and oracle evaluate the SAME declarations | `Systems/Klir/Gates.lean` | `GatesTruthTable.hasBondB` — *def*, `GatesTruthTable.irreflexiveB` — *def*, `GatesTruthTable.ModeVerdicts` — *structure*, `GatesTruthTable.modesOf` — *def* | One definition site for the boolean gates and the mode-verdict map both emitters import, so fixture and oracle cannot disagree with each other. Definitions, not theorems — the agreement is structural, not proved. |
| `gates.fixture-emitted` | The fixture is Lean-emitted, not hand-written | `Systems/Klir/GatesTruthTable.lean` | `GatesTruthTable.fixtureJson` — *def*, `GatesTruthTable.emit` — *def*, `main` — *def* | The enumerator over every `(T, R)` kernel on `Fin n`, `n ≤ 2` (19 rows) that prints `fixtures/gates_truth_table.json` verbatim. (`main` sits outside the namespace, as an executable entry point.) |
| `gates.oracle` | The subprocess oracle exists and speaks the documented contract | `Systems/Klir/GatesOracle.lean` | `gates-oracle` — *lean_exe* | `lake exe gates-oracle` evaluates `hasBondB` / `irreflexiveB` on arbitrary stdin models — the unbounded cross-check above the fixture's 19 rows. A build target and a prose contract at the head of `GatesOracle.lean`, not a theorem. |

<!-- END GENERATED: table-gates -->

<!-- BEGIN GENERATED: table-bond-tuple — from docs/lean-manifest.json, `just provenance` -->

### Bond semantics and the Mobus tuple

Stated in: [`theory-fidelity.md`](theory-fidelity.md) (Bunge and Mobus sections), `crates/bert-canvas/src/lenses.rs` (bond criterion), this repo's `CLAUDE.md` §"Semantic authority". Tuple slot attribution is the terminology concordance's job ([`language/terminology-concordance.md`](language/terminology-concordance.md), row 1); this table maps only claim → proof.

| # | Claim | SSF file | Declaration(s) — *kind* | What the Lean gives |
|---|---|---|---|---|
| `bond.criterion` | "A flow that modifies history is a bond" — the bond criterion the kernel validates against | `Systems/Mobus/Bridge.lean` | `FlowInducesAction` — *def* | The predicate connecting a flow network to action pairs — the semantic side `check_bond`'s syntactic test is pinned to. A definition; nothing here proves that an author's `is_bond` declaration is *true* of the modeled world. |
| `bond.acts-on` | Bondhood is action both ways | `Systems/Core/Bond.lean` | `ActsOn` — *class*, `Bonded` — *def* | The action typeclass and the bonded-pair predicate `HasBond` quantifies over. |
| `tuple.structure` | The tuple is a structure with E first-class, components and environment disjoint | `Systems/Mobus/Tuple.lean` | `MobusSystem` — *structure*, `MobusSystem.environment` — *field*, `MobusSystem.disjoint` — *field*, `MobusSystem.bipartite` — *field*, `MobusSystem.externalFlows_nodes` — *field* | The machine-checked tuple (concordance row 1: E first-class is a Lean improvement over the printed 7-tuple); environment is a field, not an afterthought, and cannot overlap components. **Shape relied on:** a `structure` whose coherence constraints are **fields**, discharged at construction — not standalone theorems. The named fields are the ones this repo relies on; **the list is not an enumeration of the tuple's constraints**, which is why the post-pin sixth constraint (`interfaces_carry_flow`) leaves every claim here intact. |
| `tuple.boundary` | Boundary completeness and the total relation | `Systems/Mobus/Tuple.lean` | `MobusSystem.boundaryComplete` — *theorem*, `MobusSystem.totalRelation` — *def*, `MobusSystem.totalRelation_on` — *theorem*, `MobusSystem.internal_edges_in_components` — *theorem* | Every external flow crosses the boundary at an interface (**derived** from the bipartite field, not assumed); the system's total relation stays on its own furniture; internal edges connect components only. |

<!-- END GENERATED: table-bond-tuple -->

<!-- BEGIN GENERATED: table-decomposition — from docs/lean-manifest.json, `just provenance` -->

### The decomposition seam (bert-lenses#89)

Stated in: `crates/bert-core/src/decomposition.rs` (header transcription table — the Rust check is a literal transcription, row by row), [`design/decomposition-foundations.md`](design/decomposition-foundations.md).

| # | Claim | SSF file | Declaration(s) — *kind* | What the Lean gives |
|---|---|---|---|---|
| `decomp.contract` | The boundary contract is the eight fields of a structure, not prose | `Systems/Core/Decomposition.lean` | `Decomposition` — *structure*, `Decomposition.comp_mem` — *field*, `Decomposition.βsrc` — *field*, `Decomposition.βsnk` — *field*, `Decomposition.src_preserves_kind` — *field*, `Decomposition.snk_preserves_kind` — *field*, `Decomposition.src_lands` — *field*, `Decomposition.snk_lands` — *field*, `Decomposition.derived_env` — *field*, `inflows` — *def*, `outflows` — *def*, `childSources` — *def*, `childSinks` — *def* | Child sources/sinks biject with the component's inflows/outflows, kind-preserving, landing on interfaces, with `E′` derived as the parent's interior neighborhood — the contract `check_decomposition` transcribes. **Shape relied on:** the count *eight* is a closed enumeration of this structure's constraint fields, and Gate A holds it closed: adding a ninth field upstream does not fail resolution, so **this row's count is re-checked by hand at each replay** (the one number the gate cannot defend). |
| `decomp.seam` | The seam is sound | `Systems/Core/Decomposition.lean` | `Decomposition.seam` — *def*, `Decomposition.seam_bijective` — *theorem*, `Decomposition.inflow_continues` — *theorem*, `Decomposition.outflow_continues` — *theorem*, `Decomposition.seam_preserves_kind` — *theorem* | The combined source+sink correspondence is a bijection; every parent boundary flow continues into the child with its substance kind intact. |
| `decomp.substitution` | Substitution is sound; depth-1 assembly is well-formed | `Systems/Core/Decomposition.lean` | `Decomposition.substitution_sound` — *theorem*, `assembleDepth1` — *def*, `assembleDepth1_wellFormed` — *theorem*, `decompose_one_wellFormed` — *theorem* | Replacing the component by its child preserves the contract's guarantees; the depth-1 assembly of a decomposed model is itself a well-formed tuple. |

<!-- END GENERATED: table-decomposition -->

### Prose references (not proofs)

- `docs/reference/system-type-typologies.md` (SSF) — the author-grounded typology behind the asserted `system_type` metadata ([`theory-fidelity.md`](theory-fidelity.md) §"Asserted system type"). A document, not a Lean artifact: cite it as scholarship, not as machine-checked. It carries no manifest row, because there is no symbol to resolve.

## The K ≅ 2 scope fence

"K≅2" appears in forty-odd places in this repo. It is a conjunction, and **this repo depends on one conjunct only**. Saying which is not pedantry: the tool is named for the thesis, the other conjunct was the headline claim in the wider research program, and the repair to it is days old.

- **Existence — what this repo rests on, and what the tables above are about.** One kernel object, `(T, R)` under `ActsOn`, generates faithful Klir, Bunge and Mobus views by proved maps; the two gated entries have named preconditions and the one composite has three named hypotheses (`kernel.klir-free`, `kernel.bunge-faithful`, `kernel.mobus-faithful`, `kernel.one-composite`). Every claim this instrument makes about lenses is a claim about *those* generations.
- **Maximality — not relied on here, and false in its headline form.** The claim that nothing larger than the single arrow is shared across the traditions **is false as stated**, and has a machine-checked counterexample: `free_category_maximality_fails` in SSF's `Systems/Category/SharedPrimitive.lean`. Compared as free categories, a three-object fork embeds into every tradition because every path is a morphism, so it enters through a composite no tradition asserts. The repaired statement is **quiver-level** — the only dependency all the encoded traditions *directly assert* is one. The pigeonhole lemma is not a maximality proof and must not be cited as one.
- **Why this repo is clean of the refuted claim, and why that is luck rather than hygiene.** The whole `Systems/Category/` machinery — the faithfulness theorems, the maximality repair, and the counterexample — **did not exist at the pin** and appears in no manifest row. This repo never made the maximality claim because it never had the vocabulary to make it. Silence is not neutrality, so: it is not claimed, it is not needed, and if a future doc reaches for it, the quiver-level statement is the only form available.

## The audit path

Starting from this repo alone, with `git`, `curl`-less patience, and the Lean toolchain manager (`elan`):

```bash
# 0. The gates, from this repo, before touching Lean at all. Gate A resolves
#    every manifest symbol (name AND kind) at the pin; `check` proves the tables
#    above were generated from the manifest and not hand-edited since.
python3 scripts/lean_provenance.py check
python3 scripts/lean_provenance.py resolve                    # Gate A, at the pin
python3 scripts/lean_provenance.py resolve --rev origin/main \
  --label "Gate B (SSF HEAD)"                                 # Gate B, at HEAD

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

# 4. Per-claim existence, kernel-checked rather than text-matched. Gate A's parse
#    catches a rename; this is what establishes the axiom footprint:
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
cargo test -p bert-core --test gates_truth_table          # fixture rows
SSF_DIR=../systems-science-foundations \
  cargo test -p bert-core --test gates_oracle             # the live oracle
cargo test -p bert-core transition                        # includes lean_citations_resolve
```

Step 0 needs no Lean toolchain and no SSF build, only an SSF checkout. Steps 1–4 need no part of this repo; steps 5–6 close the loop back into it. If SSF is checked out at the default sibling path, steps 5–6's tests find it without any env var, and the citation-drift gate in `transition.rs` runs on every `cargo test --workspace` instead of skipping.

## Update discipline — when the pin moves

The pin, the manifest, and the fixture move **together**, never separately. Advancing to a new SSF commit is one atomic change:

1. Check out the new SSF commit; `lake build` must pass there.
2. Regenerate the fixture with the `_generator.command` recorded inside it (spec §D): `lake env lean --run Systems/Klir/GatesTruthTable.lean > ../bert-lenses/fixtures/gates_truth_table.json`. Commit the diff (or its absence).
3. Re-run the audit path steps 3–6 against the new checkout — in particular the oracle test with `SSF_DIR` pointed at it, and `lean_citations_resolve`.
4. Update `pin` **and** `staleness` in [`lean-manifest.json`](lean-manifest.json): the new commit and date, the replay date, the new commits-ahead count, and the material-delta list rewritten to say what actually changed. An empty delta list is a claim in its own right — write it only after reading the diff.
5. `python3 scripts/lean_provenance.py render`, then `resolve`. Both must pass before the commit. Nothing else in this repo restates the pin hash.
6. Read the diff for **additions to structures this repo describes**. Gate A cannot catch these: a new field upstream breaks no citation, but it can falsify a *closed enumeration* in prose — a sentence saying "the constraints are…", or worse, "there is no such constraint". That is how `interfaces_carry_flow` turned a sentence in [`design/lens-palettes.md`](design/lens-palettes.md) from stale into false. Closed counts are flagged under **Shape relied on** in the tables and re-checked by hand at every replay.

A PR that regenerates the fixture without moving this pin, moves this pin without re-running the fixture diff, or edits a generated table without editing the manifest, is incomplete by definition.
