# bert-lenses Canvas — As-Built (v0)

The direct-manipulation authoring canvas. Run: `cargo run` (the front door since the
2026-06-29 swap; single file `src/main.rs`, ~1500 lines, egui/eframe 0.31). This is the **Arc 2** surface from the
canvas-first pivot (2026-06-26); it is *not* the lists/`generate()` design in
`arc2-authoring-design.md` (superseded — see that file's banner).

> **Important — not yet bert-core backed.** The canvas uses its **own** model (`Thing`/`Relation`
> below) and **hand-rolls** the systemhood checks (`is_aggregate`, bond logic). It does **not**
> import `bert-core`. The desktop app you launch (`bert-lenses`, from `src/main.rs`) is the
> *other* binary — the Arc-1 list viewer that *is* bert-core-backed. Reconciling these is the
> integration phase (see §Integration).

## Data model
| Type | Fields | Meaning |
|------|--------|---------|
| `Thing` | `id, name, pos: Pos2, role` | an element of T; position is user-owned (never reflowed) |
| `Relation` | `id, a, b, name, is_bond, kind` | a pair in R; `a`→`b` is the latent direction (drag source→target) |
| `Role` | `Component \| Environment` | Bunge C/E membership; Klir ignores it |
| `Kind` | `Unspecified \| Mechanical \| Chemical \| Informational \| Social` | Bunge connection kind (one graph per kind) |
| `Lens` | `Klir \| Bunge \| Mobus` | the active view (a choice, not stored structure) |
| `Model` | `lens, next_id, things, relations` | the serializable save unit (serde JSON) |

Transient (not saved): `selection`, `editing`/`editing_rel`, `drag`, `connecting`, `focus_pending`,
`show_math`.

## Gesture grammar (maps to the math act)
- **Place** (double-click empty) → add a thing to T. Names inline; drag the body to move.
- **Connect** (drag from a thing's **rim**) → add a pair to R. Drop on a thing = relate; drop on
  empty in Bunge/Mobus (far enough) = **derive** an environment square, bonded (relational birth).
- **Select** (click) · **Delete** (⌫, things take their relations) · **Rename** (double-click a
  thing or an edge).
- **B** (on a selected relation) → toggle **bond ⇄ mere relation** (Bunge `B` vs `B̄`).
- **K** (on a selected relation) → cycle **kind** (Bunge typed connection).

## Lens-gating (the reread)
The model is fixed; each lens renders/reads it differently:
- **Klir** — undirected lines (neutral, no arrowheads); ignores role/bond/kind. Math: `S = (T,R)`,
  ordered pairs, named-relation **family** grouped by *interpretation* (name).
- **Bunge** — directed arrowheads; circle = component, square = environment; bonds **colored by
  kind**, mere relations **dashed**; **aggregate warning** when ≥2 components have no C↔C bond.
  Math: `σ = ⟨C, E, S⟩`, `E` = bonded externals (derived), `S` grouped **by kind** (one graph per
  kind) ∪ mere relations.
- **Mobus** — directed; math `σ = ⟨ C, …, Δt ⟩` placeholder (boundary/ports/Message-peer/8-tuple
  not built).

Derived semantics (hand-rolled, to be replaced by `validate_mode` — see Integration):
`in_environment` = external **and** bonded (via a bond) to a component; `has_internal_bond` =
a bond between two distinct components; `is_aggregate` = ≥2 components ∧ no internal bond.

## UI surfaces
Top bar: brand · **New model** · **Open**/**Save** · **Lens** switch · **{ } Math** toggle.
Canvas: dot grid · discs/squares · relation lines (+ name + colored kind label) · the **lens-reading
headline** (top-left: "Reading as …" + counts in the lens vocabulary + the green invariant line) ·
contextual hints. Right: the **Mathematical view** panel. Chooser screen: "Author as…" + an
"Open a saved model…" link.

## Save / load
`rfd` native dialogs + `serde_json` pretty JSON of `Model`. `#[serde(default)]` on `kind` for
forward-compat. Lens is restored on load; transient state reset.

## Front door (do now) — the canvas *is* bert-lenses
Promote the canvas to **`src/main.rs`** (default `bert-lenses` bin / the desktop app); demote the
old viewer to **`src/bin/viewer.rs`** (kept as a bert-core-wiring reference + fallback outline view).
> **Reference, not dust:** `src/bin/viewer.rs` carries a `REFERENCE` header banner marking it as the
> canonical worked example of consuming bert-core (`WorldModel` / `kernel()` / `validate_mode`) +
> the per-lens teaching copy. Keep that banner; it's the signpost for the convergence work below.
Salvage the viewer's `Lens` teaching copy (epithet/asks/bio) into the canvas. Needs **no bert-core
integration** — the canvas is self-contained.

## bert-core convergence (deferred — pulled by need, not forced)
**Not "absorb the canvas into `WorldModel`."** The bet (Shingai 6/27): the **ideal BERT JSON spec
sits *between*** the bare canvas model and the hyper-complex `WorldModel`, and is **discovered** as
bert-lenses models build up and become canonical. So integration is **convergence**: both models
inform the middle. Pursue only when a real need bites — canvas models into **TypeDB**/**GSR**,
opening real BERT models, or thesis-integrity wanting Lean `validate_mode` as the verdict source.
Useful when that day comes: `validate_mode(_, Mode::Structural)` (`check_bond`) **is exactly our
`is_aggregate`**; mapping = Thing↔System (pos↔Transform2d), Relation↔Interaction,
Environment↔sources/sinks, `kernel()`↔invariant; the middle-spec gaps not in bert-core = bond-vs-mere
(`B̄`), connection-kind, Klir-neutral. Plan: `operations/sessions/2026-06-28/session-bert-lenses-core-integration.md`.

## Fidelity & design
Faithfulness verdicts + open items: `docs/fidelity-audit.md`. Visual grammar + the canonical
Klir→Bunge→Mobus gradient + the editorial-departure note on Klir's constructivism:
`docs/design-system.md` §9.

## Open (from the audit)
Interaction `⋈` + self-loops (Bunge gives `a▷b`, `b▷a`, `a⋈b`); edge strength/weight and `S=∅`
when bond-free; internal/external structure split; n-ary/hyperedges (we model the binary fragment).
