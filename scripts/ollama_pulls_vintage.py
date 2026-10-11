#!/usr/bin/env python3
"""The local-runtime pull proxy (Ollama, cumulative): refused, not built (facets#523).

The plan was a dated read of https://ollama.com/library?sort=popular, one
request per pull date, parsed into per-model cumulative pull counts. Before
scraping, the site's robots.txt and terms were read (2026-10-11):

  robots.txt  allows `/library` (its Disallow list is auth, dashboard, settings
              and the `/api/`, `/v1/`, `/v2/` endpoints).
  /terms      ("Last updated: May 2026"), section 4 "Use of Services", lists
              among the things you may not do:

                  "Use automated means to access our services without permission"

A script fetching the library page is automated means, and no permission has
been asked for or given. robots.txt is a convention for crawlers, not a grant
that overrides the terms. So this half of the sensor stops here: `pull` refuses
with the clause above and makes no request; `self-test` pins that it refuses
and writes nothing. The owner's go on #523 was conditional on exactly this
("if the site's terms allow a dated snapshot"), and they do not, as read.

If Ollama grants permission (support@ollama.com is the contact the terms
name), or publishes pull counts under a stated license, the half is built
then, with the vintage shape already fixed below so nothing downstream has to
be re-decided: assets/data/ollama-pulls-vintage-<pulldate>.csv with
`pulldate,model,pulls_cumulative`, and a by-family roll-up through the same
family mapping the HF proxy uses (assets/data/hf-family-mapping.csv), with a
column for the Ollama model name added to it at that point.

Stdlib only, bare `python3`. No network, no keys, in any command.
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "data"

TERMS_URL = "https://ollama.com/terms"
TERMS_READ = "2026-10-11"
TERMS_CLAUSE = "Use automated means to access our services without permission"
RAW_COLUMNS = ["pulldate", "model", "pulls_cumulative"]


class SensorError(Exception):
    pass


def raw_path(pulldate, data=DATA):
    return data / f"ollama-pulls-vintage-{pulldate}.csv"


def refusal():
    return (
        f"refusing to read ollama.com/library: {TERMS_URL} (read {TERMS_READ}), section 4 "
        f"'Use of Services', forbids \"{TERMS_CLAUSE}\"; a scripted read is automated means and "
        "no permission has been given. No request was made. See assets/data/README.md, "
        "'Local-runtime pull proxy (Ollama): refused'."
    )


def cmd_pull(args):
    raise SensorError(refusal())


def cmd_self_test(args):
    """The refusal is the behaviour under test: no file appears, no matter
    the flags, and the message names the clause so a reader can check it."""
    before = sorted(p.name for p in DATA.glob("ollama-pulls-vintage-*.csv"))
    for argv in (["pull", "--pulldate", "2026-10-11"], ["pull", "--pulldate", "2026-10-11", "--dry-run"]):
        code = main(argv, stderr=_Sink())
        check(code == 1, f"pull {argv} did not refuse (exit {code})")
    check(TERMS_CLAUSE in refusal() and TERMS_URL in refusal(), "the refusal does not quote the terms")
    after = sorted(p.name for p in DATA.glob("ollama-pulls-vintage-*.csv"))
    check(before == after, "pull wrote a vintage while refusing")
    check(before == [], f"an Ollama vintage exists although the half is refused: {before}")
    print("self-test ok")


class _Sink:
    def write(self, s):
        pass

    def flush(self):
        pass


def check(cond, msg):
    if not cond:
        raise SensorError(f"self-test: {msg}")


def main(argv=None, stderr=None):
    stderr = stderr or sys.stderr
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("pull", help="refuses; see the module docstring for the terms read")
    s.add_argument("--pulldate", required=True, help="vintage date in the filename, YYYY-MM-DD")
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(fn=cmd_pull)

    s = sub.add_parser("self-test", help="pin that pull refuses and writes nothing")
    s.set_defaults(fn=cmd_self_test)

    args = p.parse_args(argv)
    try:
        args.fn(args)
    except SensorError as e:
        print(f"error: {e}", file=stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
