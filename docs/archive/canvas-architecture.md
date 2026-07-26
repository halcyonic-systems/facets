# bert-lenses Canvas — As-Built (egui era, pre-web-rebuild)

**Status: HISTORICAL.**

> **Status (2026-07-17): history, not current truth.** This doc describes the
> standalone egui canvas (`src/main.rs`) that was the front door before the
> web-first rebuild (React + wasm kernel; see the main README **Status**
> section). The egui app lives on the `pre-web-rebuild` tag /
> `archive/egui-app` branch. The web canvas's rendering choice is
> `docs/decisions/0001-canvas-rendering-svg.md` (hand-rolled React+SVG); the
> kernel semantics below — the bert-core seam, mode stamping, the audit
> panel's verdict-quoting discipline — carried over unchanged to the web
> rebuild and are current. For what the kernel actually computes today, read
> `docs/kernel-architecture.md`; for theory fidelity, `docs/theory-fidelity.md`.
> No dedicated "as-built" doc for the React canvas exists yet — this file's
> semantic content (not its UI mechanics) is the closest current reference.

The direct-manipulation authoring canvas. Run: `cargo run` (the front door since the
2026-06-29 swap; single file `src/main.rs`, ~3500 lines, egui/eframe 0.31). This is the
**Arc 2** surface from the canvas-first pivot (2026-06-26); it is *not* the lists/`generate()`
design in `archive/arc2-authoring-design.md` (superseded — see that file's banner).

## The seam (bert-core backing)

The canvas holds **its own** editing kernel (`Thing`/`Relation`/`Model`) — the state the
user manipulates and the shape that's saved to JSON. It holds **zero formalism**. Every
systemhood verdict is bert-core's:

- `to_world_model(things, relations, lens)` (the **bert-core seam** region) projects the
  canvas kernel into a `bert_core::WorldModel`, **stamping `mode` with the active lens's
  rung** (Klir→Core, Bunge→Structural, Mobus→Operational).
- Structural systemhood ("system or heap?") comes from `bert_core::validate::validate_mode`.
- Operational readiness ("could this run?") comes from `bert_core::operational::validate_operational`
  — the same predicate `bert-compose` consumes.

If the shell wants a rule bert-core doesn't have, that's a bert-core issue, not shell code.

## Data model
| Type | Fields | Meaning |
|------|--------|---------|
| `Thing` | `id, name, pos: Pos2, role, primitive: Option<ProcessPrimitive>` | an element of T; `pos` is user-owned (never reflowed); `primitive` is the stamped Mobus work process (components only) |
| `Relation` | `id, a, b, name, is_bond, kind` | a pair in R; `a`→`b` is the latent direction (drag source→target) |
| `Role` | `Component \| Environment` | Bunge C/E membership; Klir ignores it |
| `Kind` | `Unspecified \| Energy \| Matter \| Field \| Informational` | Bunge connection kind (one directed graph per kind); maps to bert-core `SubstanceType` on projection |
| `Lens` | `Klir \| Bunge \| Mobus` | the active view (a choice, not stored structure); `Lens::mode()` names the rung it commits to |
| `Model` | `lens, next_id, things, relations, source_spec` | the serializable save unit (serde JSON); `source_spec` is GSR-spec provenance pass-through, origin not current state |

Transient (not saved, on `CanvasApp`): `selection`, `editing`/`editing_rel`, `drag`,
`connecting`, `focus_pending`, `show_math`, the `gen_*` generation fields, `library`/`models_dir`,
`show_audit`, `show_palette`, and the loaded `stamp`.

## Gesture grammar (maps to the math act)
- **Place** (double-click empty) → add a thing to T. Names inline; drag the body to move.
- **Connect** (drag from a thing's **rim**) → add a pair to R. Drop on a thing = relate; drop on
  empty in Bunge/Mobus (far enough) = **derive** an environment square, bonded (relational birth).
- **Select** (click) · **Delete** (⌫, things take their relations) · **Rename** (double-click a
  thing or an edge).
- **B** (on a selected relation) → toggle **bond ⇄ mere relation** (Bunge `B` vs `B̄`).
- **K** (on a selected relation) → cycle **kind** (Bunge typed connection).

## Lens rendering (the reread)
The kernel is fixed; each lens renders/reads it differently (in `canvas`):
- **Klir** — undirected lines (neutral, no arrowheads); ignores role/bond/kind. Math: `S = (T,R)`,
  ordered pairs, named-relation **family** grouped by *interpretation* (name).
- **Bunge** — directed arrowheads; circle = component, square = environment; bonds **colored by
  kind**, mere relations **dashed**; **aggregate warning** when the model is a heap. Math:
  `σ = ⟨C, E, S⟩`, `E` = bonded externals (derived), `S` grouped **by kind** ∪ mere relations.
- **Mobus** — directed; components carry their stamped work-process badge; the mapping palette is
  reachable here. Math view extends toward the 8-tuple.

The "Reading as …" headline (counts in the lens vocabulary + the invariant line) is the visible
verdict; all of it derives from `to_world_model` + bert-core, never a hand-rolled check.

## The audit panel (Arc 4.1)
`audit_panel` renders the read-only "Check consistency" report built by `audit(&self, lens)`.
`audit` borrows `&self` — the type signature is the read-only guarantee — projects a fresh
`WorldModel` (active lens's mode stamp), and routes it through `validate_operational`. Each red
row names the offending bond/flow/component and quotes bert-core's own reason and hint verbatim;
the shell invents no copy. For Klir/Bunge the headline is the **representational refusal** (Core
and Structural are not executable rungs, by design). **Panel-honesty invariant:** every canvas
node accounts for exactly once — a component row, an environment terminal (Source/Sink a flow
crosses), or a disclosed drop (`unprojected`, e.g. an unbonded env thing). Nothing vanishes
silently. On demand only; the report recomputes fresh each frame the panel shows.

## The work-process palette (Arc 4.2 mapping UX)
`palette_panel`, Mobus-only, is the component → work-process mapping surface. The 10 `ProcessPrimitive`s
are bert-core's (the shell never invents kinds); the palette's helpers (`prim_name`/`prim_code`/
`prim_desc`/`prim_color`) are pure presentation. Pick a primitive to **load the stamp** (`Stamp::Prim`
or `Stamp::Erase`), then click a component to apply it (`apply_stamp` → `set_primitive`); the disc
shows a two-letter badge. The stamp fills the `AgentModel` the Operational rung needs (bert#108).
God-tool guard: the stamp is live **only while the palette is open** — never ambient — and the palette
stamps mappings, it is not a simulation control surface.

## Save / load / export
- **Save** (`save_model`) writes the canvas `Model` as pretty JSON (`rfd` native dialogs). This is
  editing state — kernel + lens + `source_spec` provenance. `#[serde(default)]` on `kind`/`primitive`/
  `source_spec` keeps older saves loading.
- **Export** (`export_world_model`) writes a bert-core `WorldModel` JSON — the projected, `mode`-stamped
  artifact other tools consume. Distinct from Save: Save = canvas state, Export = stamped WorldModel.
- **Open** (`open_model`/`load_json`) sniffs Model-vs-GSR-extract-response; a GSR spec distills through
  `model_from_spec`/`apply_spec` into the bare kernel. The model **library** (`~/Documents/bert-lenses/`)
  lists local `*.json` for one-click loading.

## Convergence with bert-compose
The Mobus rung is the seam to the dynamical face (`../bert/bert-compose/`): **Run is a mode transition**
(Mobus-structural → Operational). The engine half shipped in bert (bert#108 lowering + `RecordedRun` H);
wiring Run/H into this app — sim data on demand, never ambient — is the next gate. See `archive/roadmap-pre-web-rebuild.md`
Arc 4.2 and the README "Convergence with bert-compose".

## Fidelity & design
Faithfulness verdicts + open items: `docs/fidelity-audit.md`. Visual grammar + the canonical
Klir→Bunge→Mobus gradient + the editorial-departure note on Klir's constructivism:
`docs/archive/design-system.md` §9.
