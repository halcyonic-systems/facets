#!/usr/bin/env python3
"""The open-weight download proxy (HF, 30-day), a self-hosted sensor (facets#523).

Three commands, two of which never touch the network:

  pull       GET https://huggingface.co/api/models?author=<namespace> for every
             namespace in assets/data/hf-family-mapping.csv, paged by the Link
             header, no token, and writes the per-repo counts untouched to
             assets/data/hf-downloads-vintage-<pulldate>.csv.
  aggregate  raw vintage + the family mapping -> one row per (lab, family) in
             assets/data/hf-downloads-by-family-vintage-<pulldate>.csv.
  self-test  the committed fixtures through paging and aggregate; no network.

Stdlib only, bare `python3`. `--dry-run` validates and prints what would be
written. Output ordering is deterministic (namespace then repo; lab then family).

What this measures is not self-hosted tokens. It is the Hub's download count,
every HTTP request to a repo's query files inside a 30-day window, mirrors and
CI included, with the Hub's own caveats in assets/data/README.md. It is
attached to the self-hosted row of assets/examples/llm-market.sl as evidence,
never as its value; the placeholder there stays `unknown` (#523, item 2). The
series exists only through repeated pulls, one dated file each.
"""

import argparse
import csv
import io
import json
import re
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "data"
FIXTURES = ROOT / "scripts" / "fixtures"
MAPPING = DATA / "hf-family-mapping.csv"

API = "https://huggingface.co/api/models"
PAGE = 1000
# The Hub's anonymous API quota is 500 requests per 5-minute fixed window
# (docs/hub/rate-limits, read 2026-10-11); a vintage is under twenty
# requests, so a short pause between pages keeps well inside it, and a 429
# is honoured by sleeping the window out rather than retrying into it.
PAUSE_SECONDS = 1.0
USER_AGENT = "facets-observatory/0.1 (+https://github.com/halcyonic-systems/facets)"

# Three namespaces hold far more than the lab's language models (Google's
# research checkpoints, NVIDIA's speech and vision models, Tencent's image
# and video work), so the raw file keeps only the repos a family prefix
# claims there. Every other namespace is kept whole, so a repo the mapping
# does not name is visible in the raw file and `aggregate` can report it.
MIXED_NAMESPACES = {"google", "nvidia", "tencent"}

RAW_COLUMNS = ["pulldate", "namespace", "repo_id", "downloads_30d", "downloads_all_time"]
FAMILY_COLUMNS = ["pulldate", "lab", "family", "downloads_30d", "downloads_all_time", "repo_count"]
MAPPING_COLUMNS = ["namespace", "repo_prefix", "lab", "family", "source"]


class SensorError(Exception):
    pass


def raw_path(pulldate, data=DATA):
    return data / f"hf-downloads-vintage-{pulldate}.csv"


def family_path(pulldate, data=DATA):
    return data / f"hf-downloads-by-family-vintage-{pulldate}.csv"


def parse_iso(s):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", s or ""):
        raise SensorError(f"not a YYYY-MM-DD date: {s!r}")
    return s


def write_text(path, text, dry_run, log=print):
    if dry_run:
        log(f"dry-run: would write {path.name} ({len(text)} bytes)")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    log(f"wrote {path}")


def refuse_existing(path, dry_run):
    """A vintage is never refreshed in place; a re-pull is a new dated file."""
    if path.exists() and not dry_run:
        raise SensorError(f"{path} exists; a vintage is never refreshed in place (pick another --pulldate)")


def csv_text(columns, rows):
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(columns)
    for r in rows:
        w.writerow([r[c] for c in columns])
    return buf.getvalue()


def read_csv(path, columns):
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames != columns:
            raise SensorError(f"{path}: columns {reader.fieldnames} != {columns}")
        return list(reader)


# ---------------------------------------------------------------------- mapping


def load_mapping(path=MAPPING):
    """Rows keyed by namespace, each a list of (prefix, lab, family). A prefix
    is matched case-sensitively against the repo name after the namespace,
    and the longest matching prefix wins, so `GLM-5` does not swallow a repo
    that a longer prefix names. Every row carries the classification slugs
    the family name was taken from, so the mapping is checkable by eye."""
    rows = read_csv(path, MAPPING_COLUMNS)
    by_ns = OrderedDict()
    seen = set()
    for r in rows:
        ns, prefix = r["namespace"].strip(), r["repo_prefix"].strip()
        if not ns or not prefix or not r["lab"].strip() or not r["family"].strip():
            raise SensorError(f"{path}: empty field in {r}")
        if not r["source"].strip():
            raise SensorError(f"{path}: {ns}/{prefix} has no source")
        if (ns, prefix) in seen:
            raise SensorError(f"{path}: duplicate prefix {ns}/{prefix}")
        seen.add((ns, prefix))
        by_ns.setdefault(ns, []).append((prefix, r["lab"].strip(), r["family"].strip()))
    for ns in by_ns:
        by_ns[ns].sort(key=lambda t: -len(t[0]))
    return by_ns


def classify(repo_id, by_ns):
    """(lab, family) for a repo id, or None when no prefix of its namespace
    matches. A mirror or quantizer under another namespace is None by
    construction: only namespaces in the mapping are ever queried."""
    ns, sep, name = repo_id.partition("/")
    if not sep:
        return None
    for prefix, lab, family in by_ns.get(ns, ()):
        if name.startswith(prefix):
            return lab, family
    return None


# ------------------------------------------------------------------------- pull


def page_url(namespace, cursor=None):
    q = [("author", namespace), ("expand[]", "downloads"), ("expand[]", "downloadsAllTime"), ("limit", str(PAGE))]
    if cursor:
        q.append(("cursor", cursor))
    return f"{API}?{urllib.parse.urlencode(q)}"


def next_cursor(link_header):
    """The Hub pages by a `Link: <url>; rel="next"` header (the OpenAPI
    description: 'Pagination cursor from Link header')."""
    if not link_header:
        return None
    for part in link_header.split(","):
        m = re.match(r'\s*<([^>]+)>\s*;\s*rel="next"', part)
        if m:
            qs = urllib.parse.parse_qs(urllib.parse.urlparse(m.group(1)).query)
            return (qs.get("cursor") or [None])[0]
    return None


def http_get(url):
    """Returns (json body, Link header). No token: the endpoint is public and
    the anonymous quota covers a vintage. On a 429 the RateLimit header
    says how long until the window resets, and that is how long we wait."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8")), resp.headers.get("Link")
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 2:
                raise SensorError(f"HTTP {e.code} from {urllib.parse.urlparse(url).path}") from e
            wait = 300
            m = re.search(r"t=(\d+)", e.headers.get("RateLimit", "") or "")
            if m:
                wait = int(m.group(1)) + 1
            print(f"429; sleeping {wait}s for the window to reset", file=sys.stderr)
            time.sleep(wait)
    raise SensorError("unreachable")


def fetch_namespace(namespace, get, pause=PAUSE_SECONDS):
    """Every model under a namespace, following Link until it stops. `get` is
    injected so the self-test can page a fixture with no network."""
    out, cursor, pages = [], None, 0
    while True:
        body, link = get(page_url(namespace, cursor))
        pages += 1
        if not isinstance(body, list):
            raise SensorError(f"{namespace}: page {pages} is not a list")
        out.extend(body)
        cursor = next_cursor(link)
        if not cursor:
            return out, pages
        if pause:
            time.sleep(pause)


def raw_row(pulldate, model):
    repo_id = model.get("id", "")
    if "/" not in repo_id:
        raise SensorError(f"model without a namespaced id: {model}")
    for key in ("downloads", "downloadsAllTime"):
        if not isinstance(model.get(key), int):
            raise SensorError(f"{repo_id}: {key} missing or not an integer ({model.get(key)!r})")
    return {
        "pulldate": pulldate,
        "namespace": repo_id.split("/", 1)[0],
        "repo_id": repo_id,
        "downloads_30d": str(model["downloads"]),
        "downloads_all_time": str(model["downloadsAllTime"]),
    }


def pull_rows(pulldate, by_ns, get, pause=PAUSE_SECONDS, log=print):
    rows = []
    for ns in sorted(by_ns):
        models, pages = fetch_namespace(ns, get, pause)
        kept = []
        for m in models:
            r = raw_row(pulldate, m)
            if r["namespace"] != ns:
                raise SensorError(f"{ns}: the API returned {r['repo_id']}")
            if ns in MIXED_NAMESPACES and classify(r["repo_id"], by_ns) is None:
                continue
            kept.append(r)
        log(f"{ns}: {len(models)} repos over {pages} page(s), {len(kept)} kept")
        rows.extend(kept)
        if pause:
            time.sleep(pause)
    seen = set()
    for r in rows:
        if r["repo_id"] in seen:
            raise SensorError(f"duplicate repo across pages: {r['repo_id']}")
        seen.add(r["repo_id"])
    rows.sort(key=lambda r: (r["namespace"], r["repo_id"]))
    return rows


def cmd_pull(args):
    pulldate = parse_iso(args.pulldate)
    out = raw_path(pulldate)
    refuse_existing(out, args.dry_run)
    by_ns = load_mapping()
    if args.dry_run:
        for ns in sorted(by_ns):
            print(f"dry-run: would GET {page_url(ns)} and follow Link")
        print(f"dry-run: would write {out.name}")
        return
    rows = pull_rows(pulldate, by_ns, http_get)
    write_text(out, csv_text(RAW_COLUMNS, rows), False)
    print(f"{len(rows)} repos across {len({r['namespace'] for r in rows})} namespaces")


# -------------------------------------------------------------------- aggregate


def aggregate_rows(raw, by_ns):
    """(family rows, unmapped raw rows). A repo no prefix claims is reported,
    never guessed into a family; the sums are integer sums of the raw rows."""
    acc = OrderedDict()
    unmapped = []
    pulldates = {r["pulldate"] for r in raw}
    if len(pulldates) != 1:
        raise SensorError(f"a raw vintage carries one pulldate, found {sorted(pulldates)}")
    for r in raw:
        hit = classify(r["repo_id"], by_ns)
        if hit is None:
            unmapped.append(r)
            continue
        a = acc.setdefault(hit, [0, 0, 0])
        a[0] += int(r["downloads_30d"])
        a[1] += int(r["downloads_all_time"])
        a[2] += 1
    pulldate = next(iter(pulldates))
    rows = [
        {
            "pulldate": pulldate,
            "lab": lab,
            "family": family,
            "downloads_30d": str(a[0]),
            "downloads_all_time": str(a[1]),
            "repo_count": str(a[2]),
        }
        for (lab, family), a in sorted(acc.items())
    ]
    unmapped.sort(key=lambda r: (-int(r["downloads_30d"]), r["repo_id"]))
    return rows, unmapped


def validate_raw_rows(raw):
    seen = set()
    for r in raw:
        parse_iso(r["pulldate"])
        if not r["downloads_30d"].isdigit() or not r["downloads_all_time"].isdigit():
            raise SensorError(f"counts are not non-negative integers: {r}")
        if r["namespace"] != r["repo_id"].split("/", 1)[0]:
            raise SensorError(f"namespace does not match repo_id: {r}")
        if r["repo_id"] in seen:
            raise SensorError(f"duplicate repo_id {r['repo_id']}")
        seen.add(r["repo_id"])


def cmd_aggregate(args):
    pulldate = parse_iso(args.vintage)
    raw = read_csv(raw_path(pulldate), RAW_COLUMNS)
    validate_raw_rows(raw)
    by_ns = load_mapping(Path(args.mapping) if args.mapping else MAPPING)
    rows, unmapped = aggregate_rows(raw, by_ns)
    out = family_path(pulldate)
    refuse_existing(out, args.dry_run)
    write_text(out, csv_text(FAMILY_COLUMNS, rows), args.dry_run)
    print(f"{len(rows)} (lab, family) rows from {len(raw) - len(unmapped)} repos; {len(unmapped)} repos no prefix claims")
    for r in unmapped[:15]:
        print(f"  unmapped {r['repo_id']} {r['downloads_30d']}", file=sys.stderr)


# -------------------------------------------------------------------- self-test


def cmd_self_test(args):
    """Pins paging, the prefix rule and the sums on the committed fixtures."""
    fixture = json.loads((FIXTURES / "hf-models-fixture.json").read_text(encoding="utf-8"))
    by_ns = load_mapping(FIXTURES / "hf-family-mapping-fixture.csv")
    calls = []

    def get(url):
        # The fixture is keyed by namespace and holds pages in order; a
        # page's `link` is the Link header the real API would send.
        calls.append(url)
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
        ns = qs["author"][0]
        check(qs.get("expand[]") == ["downloads", "downloadsAllTime"], f"expand params {url}")
        check(qs.get("limit") == [str(PAGE)], f"limit {url}")
        idx = int((qs.get("cursor") or ["0"])[0])
        page = fixture[ns][idx]
        return page["body"], page.get("link")

    rows = pull_rows("2026-10-11", by_ns, get, pause=0, log=lambda s: None)
    check(len(calls) == 5, f"expected 5 page requests, made {len(calls)}")
    check(calls[0].startswith(f"{API}?author=Qwen&"), f"namespaces are not visited in order: {calls[0]}")
    check(any("author=google&" in c and "cursor=1" in c for c in calls), "the second google page was not followed")
    check(next_cursor('<https://huggingface.co/api/models?author=x&limit=1000&cursor=abc%3D>; rel="next"') == "abc=", "Link cursor")
    check(next_cursor(None) is None and next_cursor('<u>; rel="prev"') is None, "Link without next")

    ids = [r["repo_id"] for r in rows]
    check(ids == sorted(ids), "raw rows are not ordered by repo_id")
    check("google/t5-small" not in ids and "google/gemma-4-31B-it" in ids, "mixed namespace scope")
    check("Qwen/Qwen2.5-7B" in ids, "a whole namespace keeps its unmapped repos in the raw file")
    check(all(r["pulldate"] == "2026-10-11" for r in rows), "pulldate column")

    fam, unmapped = aggregate_rows(rows, by_ns)
    got = {(r["lab"], r["family"]): (int(r["downloads_30d"]), int(r["downloads_all_time"]), int(r["repo_count"])) for r in fam}
    # Hand sums of the fixture: Qwen3-8B 1000/5000 + Qwen3.5-397B 2000/3000;
    # gemma-4 31B 700/900 (gemma-3 has one repo, t5 is out of scope);
    # GLM-5 100/150 + GLM-5-FP8 50/60 are glm-5 while GLM-5.3 400/500 goes to
    # the longer prefix's family.
    want = {
        ("Alibaba Qwen", "qwen3"): (3000, 8000, 2),
        ("Google", "gemma-4"): (700, 900, 1),
        ("Google", "gemma-3"): (300, 400, 1),
        ("Z.ai", "glm-5"): (150, 210, 2),
        ("Z.ai", "glm-5.3"): (400, 500, 1),
    }
    check(got == want, f"family sums {got} != {want}")
    check([(r["lab"], r["family"]) for r in fam] == sorted(want), "family rows are not ordered by lab then family")
    check([r["repo_id"] for r in unmapped] == ["Qwen/Qwen2.5-7B", "zai-org/CogVideoX-5b"], f"unmapped {unmapped}")

    check(classify("zai-org/GLM-5.3-Flash", by_ns) == ("Z.ai", "glm-5.3"), "longest prefix wins")
    check(classify("zai-org/glm-5", by_ns) is None, "prefixes are case-sensitive")
    check(classify("unsloth/GLM-5-GGUF", by_ns) is None, "a mirror namespace is never a family")
    check(classify("no-slash", by_ns) is None, "an id without a namespace")

    # Same input, same bytes, whatever order the API returned the repos in.
    again, _ = aggregate_rows(list(reversed(rows)), by_ns)
    check(csv_text(FAMILY_COLUMNS, fam) == csv_text(FAMILY_COLUMNS, again), "ordering depends on input order")

    # A vintage is never refreshed in place, and a dry run writes nothing.
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        out = raw_path("2026-10-11", tmp)
        quiet = lambda s: None
        write_text(out, csv_text(RAW_COLUMNS, rows), dry_run=True, log=quiet)
        check(not out.exists(), "dry-run wrote a file")
        write_text(out, csv_text(RAW_COLUMNS, rows), dry_run=False, log=quiet)
        back = read_csv(out, RAW_COLUMNS)
        validate_raw_rows(back)
        check(back == rows, "raw file does not round-trip")
        try:
            refuse_existing(out, dry_run=False)
            check(False, "an existing vintage was not refused")
        except SensorError as e:
            check("never refreshed in place" in str(e), f"refusal message {e}")
        refuse_existing(out, dry_run=True)
    # The real mapping parses under the same rules as the fixture one, and
    # every namespace it names is one the pull will query.
    real = load_mapping(MAPPING)
    check(MIXED_NAMESPACES <= set(real), f"a mixed namespace is not in the mapping: {sorted(MIXED_NAMESPACES - set(real))}")
    print("self-test ok")


def check(cond, msg):
    if not cond:
        raise SensorError(f"self-test: {msg}")


# ------------------------------------------------------------------------- main


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("pull", help="fetch per-repo download counts into a raw vintage file")
    s.add_argument("--pulldate", required=True, help="vintage date in the filename, YYYY-MM-DD")
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(fn=cmd_pull)

    s = sub.add_parser("aggregate", help="raw vintage + family mapping -> by-family file")
    s.add_argument("--vintage", required=True, help="pull date of the raw file")
    s.add_argument("--mapping", help="override the mapping path (tests)")
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(fn=cmd_aggregate)

    s = sub.add_parser("self-test", help="pin paging and the arithmetic on the committed fixtures")
    s.set_defaults(fn=cmd_self_test)

    args = p.parse_args(argv)
    try:
        args.fn(args)
    except SensorError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
