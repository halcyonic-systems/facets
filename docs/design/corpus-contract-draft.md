# The corpus contract (bert-lenses #132)

*2026-07-22 · design draft · specification only, no production code*

What an author-grounded teaching corpus entry **is**, mechanically. This document
exists so that the implementation is execution: file layout, header grammar,
index shape, precedence rules, ship gate, and loading path are all fixed here.

**Settled upstream, not reopened here.** The corpus ships as `.sl` text loaded
through `compile_sl` at runtime: no build step, no id-minting stamper, no emitted
JSON (planning review §1, `~/Desktop/halcyonic/operations/sessions/2026-07-22/references/corpus-stamper-plan.md`).
No corpus model decomposes, so every entry is one file (review §1.6). Storage and
archive questions are closed by ADR 0004 (`docs/decisions/0004-neutral-archive-canvasmodel-json.md`);
corpus files are read-only shipped content, not archives.

---

## 1. File layout

```
assets/corpus/
  corpus.json          the index (§3)
  README.md            the reader-facing table (§3.4)
  klir/
    criminal-court.sl
    lake-ontario.sl
  bunge/
    two-thing-ab.sl
    two-thing-ba.sl
    two-thing-bidirectional.sl
    nuclear-family.sl
  mobus/               (present only when a Mobus entry is authored; empty today)
```

**Rules.**

1. Root is `assets/corpus/`. One directory per tradition, lowercase: `klir/`,
   `bunge/`, `mobus/`. The directory is the only carrier of tradition, so the
   filename never repeats it (`bunge/nuclear-family.sl`, never
   `bunge/bunge-nuclear-family.sl`).
2. Filenames are lowercase kebab-case, extension `.sl`, no numeric prefix.
   Ordering is presentation, and presentation lives in the index (§3), not in
   filenames. This is the one deliberate departure from `fixtures/sl/teaching/`,
   which numbers its files (`01-hello-system.sl`) because that set is a reading
   sequence with no index.
3. One model per file. No file references another (no `decomposes`), so there is
   no resolution order and no build.
4. Variant sets that teach by diff (Bunge's three structures over one
   composition) are sibling files sharing a stem: `two-thing-ab.sl`,
   `two-thing-ba.sl`, `two-thing-bidirectional.sl`. Each is a full independent
   entry in the index; the diff is the lesson, and siblings make it a `diff`.

**Why `assets/` and not `fixtures/`.** The split in this repo is already load
bearing and the corpus lands on the shipped side of it:

| Tree | What it is | Reaches the user? |
|---|---|---|
| `fixtures/sl/*.sl` | round-trip goldens, compiled into the Rust test binary via `include_str!` (`crates/bert-canvas/tests/sl_roundtrip.rs:14-19`) | no |
| `fixtures/sl/teaching/*.sl` | learning material, deliberately out of every test suite (`fixtures/sl/teaching/README.md:36-38`) | no |
| `assets/demos/*.json`, `assets/models/**` | bundled content, globbed into the app by Vite (`web/src/demos.ts:17-25`) | yes |
| **`assets/corpus/**/*.sl`** | **bundled content a user opens from the gallery** | **yes** |

A corpus entry is something a user clicks and reads on the canvas. That makes it
a shipped asset, and it must be globbable by Vite from `web/`. `assets/` is
already served for this: `vite.config.ts:10` sets `server.fs.allow: [".."]`
precisely so the repo-root `assets/` tree is reachable one level above `web/`.
Putting the corpus in `fixtures/` would mean shipping test material to users and
would put a user-visible bug behind a directory whose README says its contents
are kept out of the suites.

The corpus is nevertheless read by a Rust test (§5). That is not a contradiction:
the test reads the directory at runtime rather than compiling it in, so the
files stay content and the gate stays a gate.

---

## 2. The provenance header

Every corpus `.sl` file opens with a provenance header: a contiguous run of `#`
comment lines starting at line 1, terminated by one blank line, before any
structure line.

### 2.1 Grammar

```
header      = "# corpus-entry: v1" NL { field } ;
field       = "# " key ": " value NL ;
key         = "title" | "author" | "work" | "year" | "locus"
            | "figure" | "teaches" | "omits" | "note" | "gate" ;
value       = single line of text, no line continuation ;
```

Exactly one space after `#`, key lowercase, one colon and one space before the
value. One field per line; a value that will not fit on one line is too long.

| Key | Required | Cardinality | Content |
|---|---|---|---|
| `corpus-entry` | yes | 1, first line | Literal `v1`. The version marker for this header format. |
| `title` | yes | 1 | The gallery card title. Sentence case, no trailing period. |
| `author` | yes | 1 | Surname first name as printed, e.g. `George Klir`. |
| `work` | yes | 1 | Full title as printed, volume included. |
| `year` | yes | 1 | Four digits, the edition cited. |
| `locus` | yes | 1 | Chapter and section, and the definition number when the source names one. |
| `figure` | no | 0 or 1 | The figure number when the model follows one. |
| `teaches` | yes | 1 | One line: what this teaches **in its home register**. |
| `omits` | yes | 1 | One line: what it deliberately leaves out. |
| `note` | no | 0..n | Honesty lines. Required when any part of the model is our construction rather than the author's own drawing. |
| `gate` | no | 0 or 1 | `core` plus a reason, only for the §5.3 escape. |

Ordering is the table's order. Missing required field, unknown key, or a value
that is empty is a ship-gate failure (§5).

### 2.2 Worked example

`assets/corpus/bunge/nuclear-family.sl`:

```
# corpus-entry: v1
# title: The nuclear family
# author: Mario Bunge
# work: Treatise on Basic Philosophy, Vol. 4: A World of Systems
# year: 1979
# locus: Ch. 5 §4.1, Definition 5.18
# teaches: A named social system given as a full composition / environment / structure triple, with mate, parenthood and coresidence as bonds and a shared-occupation relation as the non-bonding contrast.
# omits: Every quantitative and temporal property of the family; the structure is asserted, never run.
# note: The four-person composition is our instantiation of the definition's schema; the source states the triple, not a specific family.

system "Nuclear Family" : Concrete/Social
component b
component Mate
component "Child 1"
component "Child 2"
...

@lens bunge
```

### 2.3 What travels, and why that is the point

`compile_sl` discards comments: `CanvasModel` has no comment field, so the
header exists only in the text. That is exactly the property wanted. SL text is
the pasteable, mailable, diffable form of a model (`docs/decisions/0004-neutral-archive-canvasmodel-json.md:130-146`,
"readability is a view"), and the header rides along with it. A user who copies a
corpus entry out of the SL pane into an email, a paper, or another install
carries the citation with the model. A user who opens the entry and saves it gets
a library record that has dropped the header, which is correct: the saved thing
is their model now, derived from ours, and the shipped file remains the cited
original.

The consequence to accept knowingly: the header is not queryable from a compiled
model, which is why the gallery reads an index (§3) rather than the models.

### 2.4 `teaches` and `omits` are a pair

`teaches` states the lesson in the author's own register. `omits` states what the
model does not carry, so that a reader never mistakes an SL rendering for the
whole of the source's claim. A file that cannot honestly fill `omits` is
probably too ambitious to be a corpus entry.

---

## 3. The index

### 3.1 Decision

**A hand-maintained `assets/corpus/corpus.json`, mechanically checked against the
headers by the ship gate.**

Not derived at runtime, and not hand-maintained without a check. The reasoning:

- Deriving means parsing `#` comments, and SL comments are not part of the
  compiled model (§2.3). Runtime derivation would mean shipping a second SL
  reader in TypeScript whose only job is comments. This repo's whole discipline
  is one deterministic parser owning the text, so a JS-side shadow parser is the
  wrong direction.
- Ordering has to come from somewhere. Gallery order is editorial and belongs in
  data, not in filenames.
- Hand-maintained alone drifts. So the gate (§5) parses the headers in Rust,
  where a parser is cheap and already lives, and asserts the index matches
  field for field. The header stays the single source of truth for content; the
  index is a checked projection of it plus one editorial field (order).

### 3.2 Shape

```json
{
  "version": 1,
  "entries": [
    {
      "file": "bunge/two-thing-ab.sl",
      "tradition": "bunge",
      "title": "The two-thing system (a to b)",
      "citation": "Mario Bunge, Treatise on Basic Philosophy, Vol. 4: A World of Systems (1979), Ch. 1 §1.1, Definition 1.2, Fig. 1.2",
      "teaches": "The simplest possible system: two connected things in an environment lumped as one thing."
    }
  ]
}
```

Field rules:

- `file` — path relative to `assets/corpus/`, forward slashes. The primary key
  and the glob key.
- `tradition` — `"klir" | "bunge" | "mobus"`. Must equal the first path segment
  of `file`.
- `title` — must equal the header `title`.
- `teaches` — must equal the header `teaches`.
- `citation` — must equal the string composed from the header by this rule, and
  by no other:

  ```
  citation = author ", " work " (" year "), " locus [ ", " figure ]
  ```

  Composition is mechanical, so the gate composes it and compares. The field is
  stored rather than composed at runtime only so the face never assembles a
  citation itself.
- `entries` order is gallery order. It is the one field with no header
  counterpart and the only editorial decision the index carries.

### 3.3 Coverage

The gate asserts the index and the directory are in bijection: every `.sl` under
`assets/corpus/` has exactly one entry, and every entry names a file that exists.
An unindexed file is a failure, not a silent omission from the gallery.

### 3.4 `assets/corpus/README.md`

A reader-facing table, one row per entry: file, author, citation, teaches, omits.
Modeled on `fixtures/sl/teaching/README.md`, which is already the right shape. It
is prose for a human browsing the repo and carries no machine obligation. It is
not in the doc_lint LIVE set (`scripts/doc_lint.py:33`: LIVE is `README.md` plus
top-level `docs/*.md` plus `docs/language/*.md`), so it may quote the sources
directly.

---

## 4. Corpus precedence: the third role

### 4.1 The naming collision, resolved

`docs/language/README.md` heads its line 53 section "The corpus", meaning the
three round-trip goldens in `fixtures/sl/`. The new set must not become a second
"the corpus". Resolution:

| Set | Name to use everywhere |
|---|---|
| `fixtures/sl/*.sl` | **the golden corpus** |
| `assets/corpus/**/*.sl` | **the source corpus** |

"Source corpus" because every entry is drawn from a primary source and carries
its citation. The bare phrase "the corpus" is retired from `docs/language/`; both
names are always qualified. `crates/bert-canvas/tests/sl_roundtrip.rs` uses the
constant `CORPUS` for the goldens, which is fine because it is scoped to that
file, and the new gate uses a distinct name (§5).

### 4.2 Exact replacement text

Replace `docs/language/README.md` lines 53 to 65 (the current "## The corpus"
section through the "Where pedagogy edits go" paragraph) with the following.
This file is in the doc_lint LIVE set, so the text below cites
`terminology-concordance.md` for attribution instead of re-asserting provenance,
and avoids the retired mode-entry vocabulary (`scripts/doc_lint.py:120-150`).

```markdown
## The golden corpus

Three `.sl` files in [`fixtures/sl/`](../../fixtures/sl/) serve simultaneously as the spec's worked examples, the round-trip goldens, and the teaching set:

- `process-m.sl` — Mobus's system paragraph (above); the canonical multi-input work process
- `bathtub.sl` — the minimal stock-and-flow system
- `hal-projection.sl` — a real structural model: hal published as a projection, with a retained-SSOT boundary

The round-trip contract (model → text → model, exact) is tested over these in [`crates/bert-canvas/tests/sl_roundtrip.rs`](../../crates/bert-canvas/tests/sl_roundtrip.rs).

**Corpus precedence.** Three sets of `.sl` files exist, each with a different obligation. "The corpus" alone is ambiguous between them, so the qualified names are always used: the *golden corpus* (`fixtures/sl/`), the *teaching fixtures* (`fixtures/sl/teaching/`), and the *source corpus* (`assets/corpus/`).

| Set | Role | Obligation when roles conflict |
|---|---|---|
| [`fixtures/sl/*.sl`](../../fixtures/sl/) — the golden corpus | round-trip golden + spec §9 example + teaching example | round-trip correctness first; a teaching improvement that would perturb a golden is out of scope here |
| [`fixtures/sl/teaching/`](../../fixtures/sl/teaching/) — the teaching fixtures | pedagogy only | none; deliberately out of the test suites |
| [`assets/corpus/`](../../assets/corpus/) — the source corpus | shipped content: author-grounded models a user opens in the app | must compile with zero faults and project clean (the ship gate); explicitly **not** round-trip goldens, so a pedagogical rewording never perturbs a golden |

**Where pedagogy edits go.** Teaching-motivated edits land in the teaching fixtures, which are a graded set (a two-thing first model, a copy-adaptation of the bathtub, and two files that fail on purpose so a learner can read the error) carrying no round-trip or spec obligation. Edits that add or restate a *source's own* model land in the source corpus, where each file carries its citation in a provenance header and the tradition each word came from is the concordance's to record ([`terminology-concordance.md`](terminology-concordance.md)). Neither set may be made a round-trip golden: that would re-create exactly the dual-use coupling both were built to release.
```

### 4.3 Companion edits

- `fixtures/sl/teaching/README.md:19-30` refers to "the three goldens" and "the
  corpus-precedence rule". Update its wording to "the golden corpus" and add one
  sentence pointing at the source corpus as the third set. Not LIVE, so free.
- `docs/language/spec.md:235-239` heads §9 "Worked examples (the golden corpus)"
  already, which is now consistent and needs no change.

---

## 5. The ship gate

### 5.1 Where it lives

`crates/bert-canvas/tests/source_corpus.rs`, a new Rust integration test
alongside `sl_roundtrip.rs`.

Rust, not vitest, for three reasons:

1. **It must enumerate the directory, not a list.** `include_str!` cannot glob,
   so the goldens hard-code their four paths (`sl_roundtrip.rs:14-19`). The gate
   must cover a file the moment it is committed, including one an author forgot
   to index (§3.3), so it reads `assets/corpus/` with `std::fs::read_dir` at test
   runtime from `CARGO_MANIFEST_DIR`.
2. **The assertions already exist there.** `sl_roundtrip.rs:41-50` is the exact
   precedent: `parse_sl`, then `project`, then `validate_mode(.., Mode::Core)`,
   asserting `report.issues.is_empty()`.
3. **No wasm harness.** No test under `web/src/` drives the kernel today
   (`contract.test.ts` validates committed fixtures against the TS types and
   makes no kernel call), so a vitest gate would mean standing up wasm loading in
   node for this one purpose.

### 5.2 What it asserts

Per `.sl` file found under `assets/corpus/` at any depth:

1. **Header well-formed.** Line 1 is exactly `# corpus-entry: v1`; the header run
   is contiguous, ends at the first blank line, and precedes every structure
   line; every required key of §2.1 is present exactly once with a non-empty
   value; no unknown key; `year` is four digits.
2. **Compiles with zero faults.** `parse_sl_full(text)` returns a model, not a
   fault list. Any fault fails the test, quoting line and message.
3. **Pins a lens.** `parse_sl_full`'s `lens_explicit` is true. A corpus entry
   exists to be read in one tradition's register, so leaving the lens to the
   caller's current state is a defect. The pinned lens must match the entry's
   tradition directory.
4. **Projects clean at Core.** `validate_mode(project(&m), Mode::Core)` returns
   zero issues.
5. **Projects clean at its own lens's mode.** Klir to `Core`, Bunge to
   `Structural`, Mobus to `Operational`, unless §5.3 applies.
6. **Index bijection and agreement.** `assets/corpus/corpus.json` parses, its
   entries and the discovered files are in bijection by `file`, and for each
   entry `tradition`, `title`, `teaches`, and `citation` equal the header values
   under the §3.2 rules (`citation` composed by the stated rule).

### 5.3 The one escape

If an entry cannot pass assertion 5 at its lens's mode, the header may carry:

```
# gate: core (Bunge's Structural gate wants X, which this model has no source for)
```

The value is the literal `core`, a space, and a parenthesized reason. The gate
then applies assertion 4 only and skips 5 for that file. Assertions 1 to 4 and 6
have no escape. This exists so the implementer is never blocked by a mode gate
whose fix is a content decision, and the reason string makes each use visible in
review.

### 5.4 Why a gate and not a nicety

A broken file in `fixtures/sl/teaching/` is a bad lesson that a learner reads and
a maintainer fixes. A broken file in `assets/corpus/` renders in the app: the
user clicks a gallery card and gets a parse-fault toast or a canvas with red
issues on a model advertised as an author's own. That is a user-visible bug
shipped in the bundle, and the class of bug the gate exists to make impossible.
The gate runs in `just check` with the rest of `cargo test` and needs no new
gate class.

---

## 6. The loading path

### 6.1 `web/src/corpus.ts`

Mirrors `web/src/demos.ts` structurally and drops everything run-shaped from it.

```ts
export interface CorpusEntry {
  file: string;                              // "bunge/nuclear-family.sl" — the key
  tradition: "klir" | "bunge" | "mobus";
  title: string;
  citation: string;
  teaches: string;
  sl: string;                                // raw text, header included
}

export const CORPUS: CorpusEntry[];
```

Construction, at module scope:

1. Glob the text, mirroring `demos.ts:21-25`:
   ```ts
   const files = import.meta.glob("../../assets/corpus/**/*.sl", {
     eager: true,
     query: "?raw",
     import: "default",
   }) as Record<string, string>;
   ```
2. Import the index: `import index from "../../assets/corpus/corpus.json"`.
3. Map `index.entries` in order, resolving each `file` against the glob keys by
   suffix match (`k.endsWith("/" + e.file)`), and **throw** when a key is
   missing, exactly as `modelByName` does (`demos.ts:27-31`). A missing file is a
   build-time bug, and the ship gate should have caught it already.

Note what is absent versus `Demo` (`demos.ts:7-15`): no `csv`, no `manifest`, no
`t`. Those three fields are the **run** contract, and a corpus entry does not
run. Do not add them, and do not give a corpus entry a demo bundle.

### 6.2 Opening an entry

Reuse the two existing seams; invent nothing.

```
guardDiscard()  →  compileSl(entry.sl)  →  onSlCompiled(cm, lens_explicit)
```

- `guardDiscard()` plus `flushWalk()` is the discard discipline every gallery
  pick already carries (`web/src/App.tsx:344`, the comment at `:342-343` states
  it belongs at the seam so both callers get it). `onSlCompiled` deliberately
  omits `guardDiscard` because compiling in the pane is the author's stated
  intent (`App.tsx:385-390`), so the corpus caller supplies it.
- `onSlCompiled` (`App.tsx:390`) already performs the whole reset a
  non-running model needs: clears `demo`, sets the canvas model, blanks the
  manifest to `{ model: "", data: "", t: 12, mapping: [] }`, clears the result
  and errors and selection, and applies the lens rule (pinned lens wins,
  otherwise the author's current lens survives).
- On the `{ errors }` arm, surface the first fault through `setToast`, the same
  way `importModel` reports a bad file (`App.tsx:381-383`).
- Close the gallery and leave `dirty` false.

### 6.3 The run path stays dark, and that is precedented

A corpus entry ships no CSV and no manifest, so the run panel has nothing to run.
This is not a new state: **File to Import is exactly this case today**, and the
comment at `web/src/App.tsx:361-363` states the behavior in the codebase's own
words, that no demo bundle means no CSV or manifest, so the run path stays dark
for imports while structure, lens, formal object, and audit still light up
because they read the canvas model. Name that precedent in the code comment
rather than describing the behavior afresh.

### 6.4 Gallery placement

A **separate labeled "Source corpus" section**, below the demo grid, in both
places `DEMOS` is rendered: `DemoGallery` (`App.tsx:2550-2583`) and the Switch
menu (`App.tsx:1980`). Not interleaved with the demos. A card that goes dark on
click sitting inside a grid of one-click runs reads as a bug, and the two sets
answer different questions ("show me the tool working" versus "show me what this
author actually said"). Card face: `title`, `teaches` truncated to its first
sentence in the demo card's muted style (`App.tsx:2578-2580`), and `citation` as
a third, smallest line. The citation is what makes the card a corpus card.

### 6.5 Editing and saving a corpus entry

Nothing special is needed and nothing should be built. A corpus model on the
canvas is an ordinary canvas model; the ordinary save path writes a neutral
archive record into the library under a name the user picks (ADR 0004). The
shipped `.sl` is never written to by the app, because the app has no writer for
it. That is what makes SL the uncontested source of truth for this content,
which was the whole reason the build step was cut.

---

## 7. Open questions

1. **Klir K2 (Lake Ontario, Fig. 4.6).** The membership of the five ternary
   relations is in a figure image, not the prose. Ship Klir with K1 alone, or
   read the crop first and author K2 faithfully? Recommendation: K1 alone now,
   K2 when the figure is read. Do not author subset membership from inference.
2. **Do the lenses render `mere`, `field`, and `@directed` at all?** These survive
   into `CanvasModel` (which is why the corpus is SL and not JSON), but whether
   `lens_facts` and `describe` surface them is unverified. If they do not, the
   Bunge and Klir entries teach a lesson the app does not show. Fix inside #132
   as kernel work in `crates/bert-canvas/src/lenses.rs`, or split to its own
   issue and ship the corpus degraded? This is the only question that can change
   what the corpus is worth.
3. **Does a Bunge entry pass `Mode::Structural`?** Unverified. If not, §5.3's
   escape absorbs it, but the answer determines whether assertion 5 is real
   coverage or a formality for the Bunge set.
4. **Header versioning policy.** `corpus-entry: v1` is specified; nothing states
   what a `v2` would be allowed to change or whether the gate must accept both.
   Deferrable until a second version is actually wanted.
