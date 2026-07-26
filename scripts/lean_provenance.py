#!/usr/bin/env python3
"""The Lean provenance manifest: renderer and the two resolution gates (issue #232).

`docs/lean-manifest.json` is the source of truth for every claim this repo makes
about `systems-science-foundations` (SSF). The tables in `docs/lean-provenance.md`
are *generated* from it, between BEGIN/END markers. Nobody hand-edits a citation
string; that is the class of edit that put `externalFlows_within` — a field that
exists at no commit — inside a sentence certifying that every citation was checked.

Three subcommands:

  render                 rewrite the generated blocks in docs/lean-provenance.md
  check                  fail if those blocks differ from what the manifest renders
  resolve --rev REV      resolve every manifest symbol in an SSF checkout at REV

`resolve` is the gate, on two clocks:

  Gate A (blocking, `--rev` = the manifest pin) — every symbol resolves in the
    file the manifest names, AND carries the kind the manifest declares. Kind
    checking is what catches "mirrors Lean theorems" written over a Lean `def`.
  Gate B (scheduled, loud, non-blocking, `--rev` = SSF HEAD) — the same check
    against upstream HEAD. A Gate B failure is the signal to replay the pin; it
    is the unpark trigger issue #127 is missing.

What resolution actually is, stated honestly: this script *parses Lean source
text* — it tracks `namespace`/`end` to compute each declaration's full name, and
reads `structure` bodies for field names. It does not elaborate Lean. A symbol
that resolves here is present and declared with the stated keyword; that the
proof is sound and sorry-free is what `lake build` plus the zero-sorry grep in
the audit path establish, and this gate does not restate it.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
MANIFEST = REPO / "docs" / "lean-manifest.json"
PROVENANCE = REPO / "docs" / "lean-provenance.md"

BEGIN = "<!-- BEGIN GENERATED: {id} — from docs/lean-manifest.json, `just provenance` -->"
END = "<!-- END GENERATED: {id} -->"

DECL_KEYWORDS = (
    "theorem",
    "lemma",
    "def",
    "abbrev",
    "structure",
    "class",
    "instance",
    "inductive",
)

DECL_RE = re.compile(
    r"^(?:@\[[^\]]*\]\s*)?(?:private\s+|protected\s+|noncomputable\s+|partial\s+|unsafe\s+)*"
    r"(" + "|".join(DECL_KEYWORDS) + r")\s+([^\s({\[:]+)"
)
NAMESPACE_RE = re.compile(r"^namespace\s+(\S+)")
END_RE = re.compile(r"^end\s+(\S+)\s*$")
# Lean identifiers are Unicode — `βsrc` is a real field name, so `\w` (Unicode by
# default in Python 3) rather than an ASCII class. A field line is an indented
# identifier followed by `:`; type continuations start with a binder glyph or a
# dotted projection and do not match.
FIELD_RE = re.compile(r"^\s{2,}([^\W\d]\w*['!?]*)\s*:(?!:)")
LEAN_EXE_RE = re.compile(r"^lean_exe\s+«?([^»\s]+)»?")


# --- SSF access -------------------------------------------------------------

def ssf_file(ssf: Path, rev: str, path: str) -> str:
    """Read a file out of an SSF checkout at REV without touching its worktree."""
    return subprocess.run(
        ["git", "-C", str(ssf), "show", f"{rev}:{path}"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout


# --- the parser -------------------------------------------------------------

def declarations(text: str) -> dict[str, str]:
    """Full declaration name → keyword, for every declaration and structure field.

    Namespaces nest and `end N` pops. A structure's fields are the indented
    `name :` lines following its `where`, up to the next unindented line.
    """
    found: dict[str, str] = {}
    stack: list[str] = []
    in_struct: str | None = None

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            continue

        if in_struct is not None:
            m = FIELD_RE.match(line)
            if m and not line.lstrip().startswith(("--", "/-", "-/", "|")):
                found[f"{in_struct}.{m.group(1)}"] = "field"
                continue
            if line[:1].strip():  # dedented to column 0 — the structure body ended
                in_struct = None
            else:
                continue

        m = NAMESPACE_RE.match(line)
        if m:
            stack.extend(m.group(1).split("."))
            continue
        m = END_RE.match(line)
        if m:
            for _ in m.group(1).split("."):
                if stack:
                    stack.pop()
            continue

        m = LEAN_EXE_RE.match(line)
        if m:
            found[m.group(1)] = "lean_exe"
            continue

        m = DECL_RE.match(line)
        if m:
            keyword, name = m.group(1), m.group(2)
            full = ".".join(stack + [name]) if stack else name
            found[full] = keyword
            if keyword in ("structure", "class"):
                in_struct = full

    return found


def kind_matches(declared: str, actual: str) -> bool:
    """`theorem` and `lemma` are the same declaration in Lean 4 — a manifest row
    saying `theorem` is satisfied by either. Everything else must match exactly."""
    if declared in ("theorem", "lemma"):
        return actual in ("theorem", "lemma")
    return declared == actual


# --- rendering --------------------------------------------------------------

def render_table(table: dict) -> str:
    lines = [
        f"### {table['title']}",
        "",
        f"Stated in: {table['stated_in']}",
        "",
        "| # | Claim | SSF file | Declaration(s) — *kind* | What the Lean gives |",
        "|---|---|---|---|---|",
    ]
    for c in table["claims"]:
        if c.get("symbols"):
            decls = ", ".join(
                f"`{s['name'].split('.', 1)[1] if s['name'].startswith('Systems.') else s['name']}` — *{s['kind']}*"
                for s in c["symbols"]
            )
        else:
            decls = "*(none — negative claim; see below)*"
        gives = c["gives"]
        if c.get("shape"):
            gives += f" **Shape relied on:** {c['shape']}"
        lines.append(
            f"| `{c['claim_id']}` | {c['claim']} | `{c['file']}` | {decls} | {gives} |"
        )
    return "\n".join(lines)


def render_pin(m: dict) -> str:
    pin, st = m["pin"], m["staleness"]
    body = [
        "```",
        f"repo:           {pin['repo']}",
        f"pinned-commit:  {pin['commit']}",
        f"pinned-date:    {pin['date']}",
        f"lean-toolchain: {pin['toolchain']}  (SSF's lean-toolchain file at the pin)",
        "```",
        "",
        "**Staleness budget.** "
        f"Pinned at `{pin['commit'][:7]}`; SSF HEAD replayed {st['head_replayed']} "
        f"at `{st['head_commit'][:7]}`, **{st['commits_ahead']} commits ahead**; "
        "the delta was reviewed declaration by declaration. Drift that touches a "
        "claim in the tables below:",
        "",
    ]
    for d in st["material_deltas"]:
        body.append(f"- {d}")
    body += [
        "",
        f"Next replay due {st['next_replay_due']}. This paragraph is the budget: the "
        "pin is allowed to be behind, and is not allowed to be behind *silently*. "
        "Gate B (below) fails when a manifest symbol stops resolving at HEAD, which "
        "is the trigger to replay and rewrite this paragraph.",
    ]
    return "\n".join(body)


def generated_blocks(m: dict) -> dict[str, str]:
    blocks = {"pin": render_pin(m)}
    for t in m["tables"]:
        blocks[f"table-{t['id']}"] = render_table(t)
    return blocks


def splice(doc: str, blocks: dict[str, str]) -> str:
    out = doc
    for block_id, body in blocks.items():
        begin, end = BEGIN.format(id=block_id), END.format(id=block_id)
        if begin not in out or end not in out:
            raise SystemExit(
                f"lean-provenance: docs/lean-provenance.md is missing the "
                f"'{block_id}' markers — add {begin} … {end}"
            )
        head, rest = out.split(begin, 1)
        _, tail = rest.split(end, 1)
        out = f"{head}{begin}\n\n{body}\n\n{end}{tail}"
    return out


# --- subcommands ------------------------------------------------------------

def cmd_render(m: dict) -> int:
    new = splice(PROVENANCE.read_text(encoding="utf-8"), generated_blocks(m))
    PROVENANCE.write_text(new, encoding="utf-8")
    print(f"lean-provenance: rendered {len(m['tables'])} tables + the pin block")
    return 0


def cmd_check(m: dict) -> int:
    doc = PROVENANCE.read_text(encoding="utf-8")
    if splice(doc, generated_blocks(m)) != doc:
        print(
            "lean-provenance: docs/lean-provenance.md is out of date with "
            "docs/lean-manifest.json.\n"
            "  The tables are generated. Edit the manifest, then run "
            "`python3 scripts/lean_provenance.py render`.",
            file=sys.stderr,
        )
        return 1
    print("lean-provenance: generated blocks match the manifest")
    return 0


def cmd_resolve(m: dict, ssf: Path, rev: str | None, label: str) -> int:
    rev = rev or m["pin"]["commit"]
    short = rev[:7] if re.fullmatch(r"[0-9a-f]{7,40}", rev) else rev
    if not (ssf / ".git").exists():
        print(
            f"lean-provenance: no SSF checkout at {ssf} — {label} SKIPPED.\n"
            "  Clone https://github.com/halcyonic-systems/systems-science-foundations "
            "beside this repo, or pass --ssf.",
            file=sys.stderr,
        )
        return 0

    cache: dict[str, dict[str, str]] = {}
    failures: list[str] = []
    checked = 0

    for table in m["tables"]:
        for claim in table["claims"]:
            path = claim["file"]
            for sym in claim.get("symbols", []):
                checked += 1
                src = sym.get("file", path)
                if src not in cache:
                    try:
                        cache[src] = declarations(ssf_file(ssf, rev, src))
                    except subprocess.CalledProcessError:
                        cache[src] = {}
                        failures.append(
                            f"{claim['claim_id']}: file {src} does not exist at {short}"
                        )
                decls = cache[src]
                name, kind = sym["name"], sym["kind"]
                if name not in decls:
                    near = [d for d in decls if d.rsplit(".", 1)[-1] == name.rsplit(".", 1)[-1]]
                    hint = f" (did you mean {near[0]}?)" if near else ""
                    failures.append(
                        f"{claim['claim_id']}: `{name}` does not resolve in {src} "
                        f"at {short}{hint}"
                    )
                elif not kind_matches(kind, decls[name]):
                    failures.append(
                        f"{claim['claim_id']}: `{name}` is declared `{decls[name]}` "
                        f"in {src} at {short}, manifest says `{kind}` — the claim "
                        f"overstates the declaration by one type"
                    )

    if failures:
        print(f"\n{label} FAILED — {len(failures)} of {checked} symbols:\n", file=sys.stderr)
        for f in failures:
            print(f"  {f}", file=sys.stderr)
        print(
            "\nA citation must never outlive its referent. Fix the manifest row "
            "(and the pin, if the referent moved), then re-render.",
            file=sys.stderr,
        )
        return 1

    print(f"{label} OK — {checked} symbols resolve with their declared kind at {short}")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("render")
    sub.add_parser("check")
    r = sub.add_parser("resolve")
    r.add_argument("--ssf", default=str(REPO.parent / "systems-science-foundations"))
    r.add_argument("--rev", default=None, help="default: the manifest pin (Gate A)")
    r.add_argument("--label", default="Gate A (pin)")
    a = p.parse_args()

    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if a.cmd == "render":
        return cmd_render(m)
    if a.cmd == "check":
        return cmd_check(m)
    return cmd_resolve(m, Path(a.ssf), a.rev, a.label)


if __name__ == "__main__":
    raise SystemExit(main())
