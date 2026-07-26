#!/usr/bin/env python3
"""Provenance drift-gate for LIVE docs (issues #92, #90, #232).

The terminology concordance is the authoritative attribution source. LIVE docs
must *cite* it, not re-assert Mobus/Bunge provenance on their own. Three checks:

  1. tuple-glyph        — an opening `⟨C, N, E` tuple must sit in a block that
                          (or whose next block) carries a provenance reference.
  2. Mobus-8-tuple      — "Mobus" tightly bound to "8-tuple" (an attribution
                          claim, not an incidental section cite) needs the same.
  3. Bunge-CESM         — a bare `σ = ⟨C, E, S, M⟩` claims Bunge's *delivered*
                          surface is CESM; the repo's delivered Bunge surface is
                          CES (M is a structural note). Flag unless the line
                          grounds it (Bunge 2004 or `mechanism_note`).

Provenance reference = a mention of the concordance, a "Lean improvement", or a
"row 1" pointer. Scope is the LIVE doc set only; docs/archive/** and the design
notes under docs/design/** are out of scope by design.

Exit non-zero on any violation so `just check` / CI fail on drift.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# --- LIVE doc set -----------------------------------------------------------
# README.md + top-level docs/*.md (NOT docs/archive/**, NOT docs/design/**)
# + docs/language/*.md. A file's presence here means "published, load-bearing".
def live_docs() -> list[Path]:
    docs = [REPO / "README.md"]
    docs += sorted((REPO / "docs").glob("*.md"))
    docs += sorted((REPO / "docs" / "language").glob("*.md"))
    return [d for d in docs if d.is_file()]


# --- patterns ---------------------------------------------------------------
TUPLE_GLYPH = re.compile(r"⟨C, N, E")
# "Mobus" bound tightly to "8-tuple" — an attribution claim. The 50-codepoint
# leash lets the inline glyph form ("Mobus** `S = ⟨C, N, E, ...⟩` (8-tuple")
# through while excluding incidental co-occurrence across clause boundaries
# (e.g. "Mobus §4.3.1) ... gated on the 8-tuple decomposition math").
MOBUS_8TUPLE = re.compile(r"Mobus.{0,50}8-tuple")
CESM = re.compile(r"σ = ⟨C, E, S, M⟩")

PROVENANCE = re.compile(r"concordance|[Ll]ean.{0,40}improvement|row 1")
CESM_GROUND = re.compile(r"2004|mechanism_note")


def blocks(text: str) -> list[tuple[int, str]]:
    """Split into blank-line-separated blocks; return (1-based start line, text)."""
    out: list[tuple[int, str]] = []
    line_no = 1
    cur: list[str] = []
    start = 1
    for line in text.splitlines():
        if line.strip() == "":
            if cur:
                out.append((start, "\n".join(cur)))
                cur = []
            line_no += 1
            start = line_no
            continue
        if not cur:
            start = line_no
        cur.append(line)
        line_no += 1
    if cur:
        out.append((start, "\n".join(cur)))
    return out


def provenanced(idx: int, blks: list[tuple[int, str]]) -> bool:
    """Provenance may live in the trigger's block or the one immediately after
    it (the `**Mobus — 8-tuple**` heading + following `Provenance:` paragraph)."""
    window = blks[idx][1]
    if idx + 1 < len(blks):
        window += "\n" + blks[idx + 1][1]
    return bool(PROVENANCE.search(window))


def check_file(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    rel = path.relative_to(REPO)
    blks = blocks(text)
    violations: list[str] = []

    for idx, (start, body) in enumerate(blks):
        # tuple-glyph and Mobus-8-tuple: line-scoped trigger, block-scoped provenance
        for pat, label in ((TUPLE_GLYPH, "tuple-glyph"), (MOBUS_8TUPLE, "Mobus-8-tuple")):
            for off, line in enumerate(body.splitlines()):
                if pat.search(line) and not provenanced(idx, blks):
                    violations.append(
                        f"{rel}:{start + off}: {label} without provenance "
                        f"(needs concordance / Lean improvement / row 1 nearby): {line.strip()[:80]}"
                    )
                    break  # one hit per block is enough

    # Bunge-CESM: line-scoped trigger AND line-scoped grounding
    for line_no, line in enumerate(text.splitlines(), start=1):
        if CESM.search(line) and not CESM_GROUND.search(line):
            violations.append(
                f"{rel}:{line_no}: Bunge CESM asserted as delivered "
                f"(delivered surface is CES; add Bunge 2004 / mechanism_note grounding): {line.strip()[:80]}"
            )
    return violations


# --- mode-entry vocabulary gate (issue #90) --------------------------------
# "ladder"/"rung"/"climb" carried three unrelated senses (see the archived
# docs/archive/on-the-word-ladder.md concordance). Only the MODE-ENTRY sense is
# a fidelity hazard: it implies Klir→Bunge→Mobus is a linear tower, but the Lean
# proves parallel lenses over a meet-semilattice. That sense is retired — mode
# entry now speaks "lens" vocabulary. This check keeps it retired.
#
# Scope: LIVE docs (same set as above) + string literals in web/src/**/*.{ts,tsx}.
# It flags whole-word ladder/rung/climb, then exempts lines that carry a
# SURVIVING-sense marker. The surviving senses (left untouched by #90):
#   - project/build-plan phase: "analysis rung", "staged rung", "rung plan",
#     "first rung", explicit "Rung N/Rung A" SL build-plan labels;
#   - the compose "dependency ladder" (bert-compose) and per-edge "edge ladder"
#     classification (bert-canvas) — real orderings, correctly named;
#   - Klir's GSPS hierarchy of system types;
#   - meta-discussion of the retired term itself: any reference to the archived
#     `on-the-word-ladder` concordance, or the quoted `ladder/rung` term-set.
# web/src COMMENTS are out of scope by design — the Bucket C "edge ladder" name
# legitimately lives in JSDoc there; only quoted string literals are checked.
MODE_ENTRY_WORD = re.compile(r"\b(?:ladder|rung|climb)\b", re.IGNORECASE)
# Case-SENSITIVE by design: the "Rung N" label pattern must not match "rung on",
# "rung of", etc. All prose survivors use lowercase phrases; only the capitalized
# SL build-plan labels ("Rung 2") and the "GSPS" acronym carry uppercase.
SURVIVING_SENSE = re.compile(
    r"analysis rung"
    r"|rung plan"
    r"|staged rung"
    r"|first[\s-]rung"
    r"|\bRungs?\s+[0-9A-Z]"          # "Rung 2", "Rungs 1", "Rung A" — SL build-plan labels
    r"|dependency ladder"
    r"|edge ladder"
    r"|compose ladder"
    r"|\bGSPS\b"
    r"|on-the-word-ladder"            # references to the archived concordance file
    r"|ladder/rung"                   # meta-quotation of the retired term-set
)
# Quoted string literal on a line: "...", '...', or `...` (naive, line-local —
# enough to separate a user-facing string from a // or /** */ comment).
STRING_LITERAL = re.compile(r'"[^"]*"' r"|'[^']*'" r"|`[^`]*`")


def mode_entry_vocab() -> list[str]:
    violations: list[str] = []

    # LIVE docs: whole-line scan, surviving-sense marker exempts the line.
    for path in live_docs():
        rel = path.relative_to(REPO)
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if MODE_ENTRY_WORD.search(line) and not SURVIVING_SENSE.search(line):
                violations.append(
                    f"{rel}:{line_no}: mode-entry 'ladder/rung/climb' in a LIVE doc "
                    f"(use lens vocabulary; retired per #90): {line.strip()[:80]}"
                )

    # web/src string literals only (comments are out of scope).
    web_src = REPO / "web" / "src"
    if web_src.is_dir():
        for path in sorted(web_src.rglob("*.ts")) + sorted(web_src.rglob("*.tsx")):
            rel = path.relative_to(REPO)
            for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
                if SURVIVING_SENSE.search(line):
                    continue
                for lit in STRING_LITERAL.findall(line):
                    if MODE_ENTRY_WORD.search(lit):
                        violations.append(
                            f"{rel}:{line_no}: mode-entry 'ladder/rung/climb' in a "
                            f"user-facing string (use lens vocabulary; #90): {lit[:80]}"
                        )
                        break
    return violations


# --- forbidden hedges (issue #232) -----------------------------------------
# The ~470-occurrence proof-vocabulary census searched proof VERBS. It never
# searched the softeners that carry the same load for a skimming reader — the
# word that lets a sentence claim a proof's authority while remaining literally
# defensible. Two rules, both with separating instances in the pre-#232 tree:
#
#   H1  a hedge adjacent to a proof word: "essentially machine-checked",
#       "in the spirit of the Lean", "aligned with SSF", "as good as proven".
#       Retired from LIVE docs by #232; this keeps it retired.
#   H2  "mirrors Lean X" without saying what X *is*. Three LIVE lines said a
#       Rust check "mirrors Lean theorems" or "Mirrors Lean `Kernel.HasBond`";
#       `HasBond` and `Irreflexive` are Lean `def`s, so the first is false and
#       the second is silent about the one fact that matters. The honest form
#       names the kind and the symbol: "mirrors the Lean definition
#       `Kernel.HasBond`". This rule requires exactly that.
#
# Scope: LIVE docs. Design docs and archives keep their own register.
HEDGE = re.compile(
    r"essentially\s+(?:machine-checked|proven|proved|verified)"
    r"|effectively\s+(?:machine-checked|proven|proved)"
    r"|basically\s+(?:machine-checked|proven|proved)"
    r"|morally\s+(?:a\s+)?(?:theorem|proof|proven)"
    r"|as good as\s+(?:proven|proved|machine-checked)"
    r"|in the spirit of the Lean"
    r"|aligned with (?:the )?(?:SSF|Lean)",
    re.IGNORECASE,
)
MIRRORS_LEAN = re.compile(r"[Mm]irrors?\s+(?:the\s+)?Lean\b")
KIND_WORD = re.compile(r"\b(?:def|definition|structure|field|class|theorem|lemma)\b")
BACKTICKED = re.compile(r"`[^`]+`")


def hedge_vocab() -> list[str]:
    violations: list[str] = []
    for path in live_docs():
        rel = path.relative_to(REPO)
        for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            if HEDGE.search(line):
                violations.append(
                    f"{rel}:{line_no}: hedged proof vocabulary — say what is proved "
                    f"and where, or say the weaker true thing: {line.strip()[:90]}"
                )
            for m in MIRRORS_LEAN.finditer(line):
                tail = line[m.end() : m.end() + 140]
                if not (KIND_WORD.search(tail) and BACKTICKED.search(tail)):
                    violations.append(
                        f"{rel}:{line_no}: \"mirrors Lean …\" must name the declaration's "
                        f"kind AND the symbol (e.g. \"mirrors the Lean definition "
                        f"`Kernel.HasBond`\"): {line.strip()[:90]}"
                    )
    return violations


# --- the provenance manifest gates (issue #232) -----------------------------
# The tables in docs/lean-provenance.md are generated from docs/lean-manifest.json.
# Two checks run here so `just check` carries them:
#   - the generated blocks match the manifest (no SSF needed, always blocking);
#   - Gate A: every manifest symbol resolves at the pin WITH its declared kind
#     (needs an SSF checkout; skips loudly without one, like the Rust-side
#     lean_citations_resolve_or_skip_gracefully). CI never skips — the
#     lean-provenance.yml workflow clones SSF.
GATE_A_RAN = False


def provenance_gates() -> list[str]:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import lean_provenance as lp

    manifest = json.loads(lp.MANIFEST.read_text(encoding="utf-8"))
    violations: list[str] = []
    if lp.cmd_check(manifest) != 0:
        violations.append(
            "docs/lean-provenance.md is out of date with docs/lean-manifest.json "
            "(run `just provenance`)"
        )
    # SSF_DIR matches the convention the Rust-side oracle test uses.
    ssf = Path(os.environ.get("SSF_DIR", REPO.parent / "systems-science-foundations"))
    global GATE_A_RAN
    GATE_A_RAN = (ssf / ".git").exists()
    if lp.cmd_resolve(manifest, ssf, None, "  Gate A (pin)") != 0:
        violations.append("Gate A failed — a manifest citation does not resolve at the pin")
    return violations


# --- documentation IA gates (issue #235) ------------------------------------
# The checks above ask whether a doc is *honest*. These three ask whether it is
# *findable* — the question the W30 audit never asked. Their scope is deliberately
# WIDER than live_docs(): the provenance/vocabulary gates read 15 of 45 docs/
# files by design (design notes and archives keep their own register), and every
# orphan lives in exactly the directories that set excludes. A gate that cannot
# see the problem area is not a gate.
#
#   4. broken-relative-link — every markdown link resolves on disk.
#   5. zero-inbound-link    — every indexed doc is referenced by path from at
#                             least one other markdown file. Source-comment
#                             references do not count: a doc a reader can only
#                             find by grepping Rust is not findable.
#   6. index-reachability   — every docs/ and spec/ file is reachable from
#                             docs/README.md, the single canonical index,
#                             walking *only* through index files (README.md).
#
# On (6): the literal "present in docs/README.md" reading would force 45 flat
# entries into one file. Walking through sub-indexes instead is what docs/language/
# already does — a front-door README that the root index links once — and it
# catches the same misses, because a file listed nowhere is unreachable either way.
IA_SKIP_DIRS = {".git", "target", "node_modules", "dist", ".venv", "venv", "pkg"}
MD_LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
FENCE = re.compile(r"^\s*(?:```|~~~)")


def repo_markdown() -> list[Path]:
    """Every tracked-ish .md in the repo — the link *sources*."""
    out = []
    for p in REPO.rglob("*.md"):
        if IA_SKIP_DIRS & set(p.relative_to(REPO).parts):
            continue
        out.append(p)
    return sorted(out)


def indexed_docs() -> list[Path]:
    """The docs subject to the orphan check: the reference layer plus the two
    package READMEs the issue found referenced only in prose."""
    out = sorted((REPO / "docs").rglob("*.md")) + sorted((REPO / "spec").rglob("*.md"))
    for extra in ("pipeline/README.md", "examples/README.md"):
        p = REPO / extra
        if p.is_file():
            out.append(p)
    return [p for p in out if p.is_file()]


def doc_links(path: Path) -> list[tuple[int, str]]:
    """(line, target) for every relative markdown link outside a fenced block."""
    out: list[tuple[int, str]] = []
    in_fence = False
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        for m in MD_LINK.finditer(line):
            target = m.group(1).split("#")[0]
            if not target or target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            out.append((line_no, target))
    return out


def ia_gates() -> tuple[list[str], list[str], list[str]]:
    sources = repo_markdown()
    targets = set(indexed_docs())
    inbound: dict[Path, set[Path]] = {p: set() for p in targets}
    # adjacency for the reachability walk, keyed by resolved path
    edges: dict[Path, set[Path]] = {}

    broken: list[str] = []
    for src in sources:
        rel = src.relative_to(REPO)
        edges.setdefault(src.resolve(), set())
        for line_no, target in doc_links(src):
            resolved = (src.parent / target).resolve()
            if resolved.is_dir():
                # a folder link is satisfied by the folder; it *indexes* via its README
                readme = resolved / "README.md"
                if readme.is_file():
                    edges[src.resolve()].add(readme)
                    if readme in inbound:
                        inbound[readme].add(src)
                continue
            if not resolved.exists():
                broken.append(f"{rel}:{line_no}: link does not resolve: {target}")
                continue
            edges[src.resolve()].add(resolved)
            if resolved in inbound:
                inbound[resolved].add(src)

    orphans = [
        f"{p.relative_to(REPO)}: no inbound link from any markdown file "
        f"(index it, or link it from the doc it belongs to)"
        for p in sorted(targets)
        if not inbound[p]
    ]

    # (6) walk from the canonical index, traversing only docs/ index files
    root = (REPO / "docs" / "README.md").resolve()
    reached: set[Path] = set()
    frontier = [root]
    while frontier:
        node = frontier.pop()
        if node in reached:
            continue
        reached.add(node)
        if node.name != "README.md":
            continue  # only index files are traversed
        try:
            node.relative_to(REPO / "docs")
        except ValueError:
            continue  # only docs/ indexes are traversed
        frontier += sorted(edges.get(node, ()))

    unindexed = [
        f"{p.relative_to(REPO)}: not reachable from docs/README.md "
        f"(add it to that index, or to the README.md of its folder)"
        for p in sorted(targets)
        if p.resolve() not in reached
        and (str(p.relative_to(REPO)).startswith("docs/") or str(p.relative_to(REPO)).startswith("spec/"))
        and p.resolve() != root
    ]
    return broken, orphans, unindexed


# --- the status carrier gate (issue #234) -----------------------------------
# CONTRIBUTING.md: "Every doc under docs/ carries exactly one status", one of six
# words. Nothing checked it, and 36 of 56 files did not conform — including the
# normative SL spec and the auditor's front door — because status was free prose
# in four different shapes with no machine-readable carrier. This gives it one.
#
# WHY A FIXED LINE AND NOT FRONTMATTER. The defect being fixed is *invisibility*:
# theory-fidelity.md carried its status only in the docs/README.md index, so a
# reader who opened the file — the normal case, and how an agent reads — saw
# none. YAML frontmatter is metadata: GitHub renders it as a detached table, a
# plain editor shows a fence above the title, and several renderers hide it
# outright. A carrier that can be hidden is the same bug with a parser attached.
# A prose line also carries the sentence of context the status usually wants
# ("**Status: LIVE.** A ten-minute path through the instrument…"), where
# frontmatter would force that sentence to be said twice.
#
# TWO ACCEPTED SHAPES, both already in the tree:
#   **Status: LIVE** …            — the prose form (may be blockquoted: "> **Status: …")
#   *date · phase · status: **ADOPTED*** — the ADR byline, whose format CONTRIBUTING fixes
#
# SCOPE: every .md under docs/ and spec/. The carrier must sit in the HEADER
# REGION — the lines before the first `## ` heading — so it is on screen when the
# file opens, and exactly one must be there.
STATUS_WORDS = ("LIVE", "ADOPTED", "PROPOSED", "RESEARCH", "HISTORICAL")
STATUS_CARRIER = re.compile(
    r"(?:\*\*Status:\s*|status:\s*\*\*)"
    r"(" + "|".join(STATUS_WORDS) + r"|CONTINGENT\(#\d+\))\b"
)
# A line that is *trying* to be a status carrier but does not name one of the
# six. Without this, "status: **accepted**" reads as "no status at all" and the
# error names the wrong repair.
STATUS_NEAR_MISS = re.compile(r"\*\*Status\*\*:|\*\*Status:|status:\s*\*\*|^\s*\*Status:")

# Transient: issue-comment bodies staged for the #234 close sweep, not documents.
# Deleted with the directory once the issues are closed. Printed on every clean
# run so the exemption cannot quietly become permanent.
STATUS_EXEMPT_DIRS = ("docs/parked-closing-comments",)


def status_scope() -> list[Path]:
    out = sorted((REPO / "docs").rglob("*.md")) + sorted((REPO / "spec").rglob("*.md"))
    return [
        p
        for p in out
        if p.is_file()
        and not str(p.relative_to(REPO)).startswith(STATUS_EXEMPT_DIRS)
    ]


def header_region(text: str) -> list[tuple[int, str]]:
    """(1-based line, text) for everything above the first `## ` heading, minus
    fenced blocks — a doc that *documents* the carrier form (CONTRIBUTING does)
    shows it in a fence, and a shown example is not a claim."""
    out: list[tuple[int, str]] = []
    in_fence = False
    for line_no, line in enumerate(text.splitlines(), start=1):
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        if line.startswith("## "):
            break
        out.append((line_no, line))
    return out


def status_gate() -> list[str]:
    violations: list[str] = []
    for path in status_scope():
        rel = path.relative_to(REPO)
        head = header_region(path.read_text(encoding="utf-8"))
        found = [(n, STATUS_CARRIER.search(l).group(1)) for n, l in head if STATUS_CARRIER.search(l)]
        if len(found) > 1:
            where = ", ".join(f"line {n} ({w})" for n, w in found)
            violations.append(f"{rel}: two status carriers in the header region — {where}")
            continue
        if found:
            continue
        near = [(n, l) for n, l in head if STATUS_NEAR_MISS.search(l)]
        if near:
            n, l = near[0]
            violations.append(
                f"{rel}:{n}: status line names no vocabulary word — one of "
                f"LIVE / ADOPTED / PROPOSED / CONTINGENT(#N) / RESEARCH / HISTORICAL, "
                f"uppercase: {l.strip()[:80]}"
            )
        else:
            violations.append(
                f"{rel}: no status carrier above the first `## ` heading "
                f"(add e.g. `**Status: RESEARCH.**`, or an ADR byline "
                f"`*date · phase · status: **ADOPTED***`)"
            )
    return violations


def main() -> int:
    all_violations: list[str] = []
    for doc in live_docs():
        all_violations += check_file(doc)

    mode_violations = mode_entry_vocab()
    hedge_violations = hedge_vocab()
    provenance_violations = provenance_gates()
    status_violations = status_gate()
    broken_links, orphans, unindexed = ia_gates()

    if status_violations:
        print("\ndoc-lint: status carrier (issue #234)\n", file=sys.stderr)
        for v in status_violations:
            print(f"  {v}", file=sys.stderr)
        print(
            "\nCONTRIBUTING.md: every doc under docs/ carries exactly one status. "
            "The carrier is a line above the first `## ` heading, in one of two "
            "shapes: `**Status: WORD**` (prose) or `status: **WORD**` (the ADR "
            "byline). Six words, uppercase: LIVE, ADOPTED, PROPOSED, "
            "CONTINGENT(#N), RESEARCH, HISTORICAL.",
            file=sys.stderr,
        )

    if broken_links:
        print("\ndoc-lint: broken relative links (issue #235)\n", file=sys.stderr)
        for v in broken_links:
            print(f"  {v}", file=sys.stderr)
    if orphans:
        print("\ndoc-lint: orphaned docs — zero inbound links (issue #235)\n", file=sys.stderr)
        for v in orphans:
            print(f"  {v}", file=sys.stderr)
        print(
            "\nA document nothing points at is not published, it is stored. "
            "Give it an inbound link or delete it.",
            file=sys.stderr,
        )
    if unindexed:
        print("\ndoc-lint: docs missing from the index (issue #235)\n", file=sys.stderr)
        for v in unindexed:
            print(f"  {v}", file=sys.stderr)
        print(
            "\ndocs/README.md is the one canonical index; sub-folder README.md files "
            "extend it. CONTRIBUTING.md requires every new doc be indexed.",
            file=sys.stderr,
        )

    if hedge_violations:
        print("\ndoc-lint: hedged proof vocabulary in LIVE docs (issue #232)\n", file=sys.stderr)
        for v in hedge_violations:
            print(f"  {v}", file=sys.stderr)
        print(
            "\nNever describe as verified, machine-checked, or proven anything argued "
            "in prose. Name the Lean symbol and its kind, or state the weaker true thing.",
            file=sys.stderr,
        )
    if provenance_violations:
        print("\ndoc-lint: Lean provenance manifest (issue #232)\n", file=sys.stderr)
        for v in provenance_violations:
            print(f"  {v}", file=sys.stderr)

    if (
        all_violations
        or mode_violations
        or hedge_violations
        or provenance_violations
        or status_violations
        or broken_links
        or orphans
        or unindexed
    ):
        if all_violations:
            print("doc-lint: provenance drift in LIVE docs (issue #92)\n", file=sys.stderr)
            for v in all_violations:
                print(f"  {v}", file=sys.stderr)
            print(
                "\nLIVE docs must cite the terminology concordance, not re-assert provenance.",
                file=sys.stderr,
            )
        if mode_violations:
            print("\ndoc-lint: mode-entry 'ladder/rung/climb' vocabulary (issue #90)\n", file=sys.stderr)
            for v in mode_violations:
                print(f"  {v}", file=sys.stderr)
            print(
                "\nMode entry is a lattice of parallel lenses, not a ladder. Say "
                '"enter the Bunge lens" / "satisfy the Bunge precondition", never a rung to climb.',
                file=sys.stderr,
            )
        return 1

    gate_a = "Gate A resolving" if GATE_A_RAN else "Gate A SKIPPED (no SSF checkout)"
    exempt = [d for d in STATUS_EXEMPT_DIRS if (REPO / d).is_dir()]
    exempt_note = f"; status-exempt (transient): {', '.join(exempt)}" if exempt else ""
    print(
        f"doc-lint: OK — {len(live_docs())} LIVE docs clean; mode-entry and hedge "
        f"vocabulary clean; provenance tables match the manifest; {gate_a}; "
        f"{len(indexed_docs())} indexed docs all reachable, linked, and link-resolving; "
        f"{len(status_scope())} docs/ + spec/ files each carry exactly one "
        f"status word{exempt_note}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
