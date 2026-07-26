#!/usr/bin/env python3
"""Regenerate THIRD_PARTY_NOTICES.md (issue #229).

The notices are attribution the artifact owes to other people, so the inventory
half is read from the same metadata the build reads — `npm ls --prod` and
`cargo metadata` filtered to wasm32 — rather than maintained by hand, where it
would drift the first time a dependency changed. The full licence TEXTS are
hand-curated: only a few components carry a notice-retention condition whose
text must travel with the binary, and reproducing every dependency's text would
bury them.

Run: python3 scripts/gen_notices.py   (writes THIRD_PARTY_NOTICES.md)
     python3 scripts/gen_notices.py --check   (exit 1 if the file is stale)
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "THIRD_PARTY_NOTICES.md"
WEB = REPO / "web"


def npm_prod_packages() -> list[tuple[str, str, str]]:
    raw = subprocess.run(
        ["npm", "ls", "--prod", "--all", "--json"],
        cwd=WEB, capture_output=True, text=True,
    ).stdout
    tree = json.loads(raw)
    seen: dict[str, str] = {}

    def walk(node: dict) -> None:
        for name, child in (node.get("dependencies") or {}).items():
            if name in seen:
                continue
            seen[name] = child.get("version", "")
            walk(child)

    walk(tree)
    out = []
    for name in sorted(seen):
        manifest = WEB / "node_modules" / Path(*name.split("/")) / "package.json"
        licence = "UNRESOLVED"
        if manifest.is_file():
            pkg = json.loads(manifest.read_text())
            value = pkg.get("license") or pkg.get("licenses")
            if isinstance(value, list):
                value = " AND ".join(entry.get("type", "?") for entry in value)
            licence = str(value)
        out.append((name, seen[name], licence))
    return out


def cargo_wasm_packages() -> list[tuple[str, str, str]]:
    raw = subprocess.run(
        ["cargo", "metadata", "--format-version", "1",
         "--filter-platform", "wasm32-unknown-unknown"],
        cwd=REPO, capture_output=True, text=True,
    ).stdout
    meta = json.loads(raw)
    workspace = set(meta["workspace_members"])
    rows = [
        (p["name"], p["version"], str(p.get("license")))
        for p in meta["packages"]
        if p["id"] not in workspace
    ]
    return sorted(rows)


def table(rows: list[tuple[str, str, str]]) -> str:
    lines = ["| Package | Version | Declared licence |", "| --- | --- | --- |"]
    lines += [f"| `{n}` | {v} | {lic} |" for n, v, lic in rows]
    return "\n".join(lines)


def indent(text: str) -> str:
    return "\n".join(("    " + line).rstrip() for line in text.strip().splitlines())


HEADER = """# Third-party notices

Everything in this file is an obligation to someone else. It travels with the
artifact, not merely with the repository: `LICENSE` and this file are bundled
into the macOS app's `Contents/Resources/` and copied into `web/dist/` at build
time, because MIT and the SIL Open Font License both require their notices to
accompany *redistributions*, and a `.app` handed to a stranger is a
redistribution.

The inventory tables are generated from `npm ls --prod` and `cargo metadata`
(wasm32 platform filter) — the same metadata the build reads. Regenerate with
`python3 scripts/gen_notices.py` after any dependency change.

bert-lenses itself is MIT; see `LICENSE`. Every crate under `crates/` was
written for this repository, so nothing here is owed for the kernel — this file
covers the fonts, KaTeX, and the dependency graph that reaches the artifact.

*Lineage, not an obligation: bert-lenses grew out of the BERT project
(`halcyonic-systems/bert`). The kernel crates here were written for this
repository.*
"""


def render() -> str:
    ofl = (WEB / "src" / "fonts" / "OFL.txt").read_text()
    katex = (WEB / "node_modules" / "katex" / "LICENSE").read_text()
    npm_rows = npm_prod_packages()
    cargo_rows = cargo_wasm_packages()

    return f"""{HEADER}
---

## 1. Bundled fonts — SIL Open Font License 1.1

Three faces are vendored as `.woff2` in `web/src/fonts/` and compiled into the
bundle (a desktop app has no network, so they cannot be fetched). The OFL
requires this notice to accompany the fonts.

{indent(ofl)}

---

## 2. KaTeX — MIT

KaTeX renders the formal notation. Its JavaScript and CSS are compiled into the
shipped bundle.

{indent(katex)}

---

## 3. npm dependencies reaching the artifact

Production dependencies only — the dev toolchain (Vite, Vitest, TypeScript,
Tailwind's compiler) builds the artifact but ships no code in it.

{table(npm_rows)}

---

## 4. Cargo dependencies reaching the wasm kernel

Resolved for `wasm32-unknown-unknown`, which is the only target whose code is
distributed. Workspace crates are omitted — they are this repository's own work,
covered by `LICENSE`.

{table(cargo_rows)}
"""


def main() -> int:
    text = render()
    if "--check" in sys.argv:
        if not OUT.is_file() or OUT.read_text() != text:
            print(f"{OUT.name} is stale — run: python3 scripts/gen_notices.py", file=sys.stderr)
            return 1
        return 0
    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(REPO)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
