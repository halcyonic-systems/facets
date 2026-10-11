#!/usr/bin/env python3
"""The routed-share sensor (facets#529): OpenRouter rankings-daily as a pinned vintage.

Four commands, three of which never touch the network:

  pull       GET /api/v1/datasets/rankings-daily, paged by year, raw rows
             written untouched to assets/data/openrouter-rankings-daily-vintage-<pulldate>.csv.
             Needs OPENROUTER_API_KEY in the environment; refuses without it.
  aggregate  raw vintage + assets/data/openrouter-model-classification.csv ->
             daily routed-share series, its monthly resample, and a by-lab file.
  bundle     monthly file -> a forcing bundle for the pooled llm-market
             (the Router's two outwires, unit `weight`, force on, every 30).
  self-test  the committed fixture through aggregate and bundle; no network.

Stdlib only, bare `python3`. `--dry-run` validates and prints what would be
written. Output ordering is deterministic (date, then permaslug/lab).

The rulings this encodes are the owner's on facets#529: open weight = weights
publicly available, decided per model in the classification table with a source
per row; the API's `other` row is a column of its own and the open share is a
range (without it, with it); unlabelled models are `unknown`, never guessed;
one vintage per pull date, daily rows, monthly as a stated resample.
"""

import argparse
import csv
import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "assets" / "data"
FIXTURES = ROOT / "scripts" / "fixtures"
CLASSIFICATION = DATA / "openrouter-model-classification.csv"

ENDPOINT = "https://openrouter.ai/api/v1/datasets/rankings-daily"
DATASET_START = date(2025, 1, 1)
# The API caps a window at 366 days and the key at 30 requests a minute; a
# year a page and a pause between pages keeps a full history well inside both.
MAX_WINDOW_DAYS = 366
PAUSE_SECONDS = 3

RAW_COLUMNS = ["date", "model_permaslug", "total_tokens"]
SHARE_COLUMNS = [
    "date",
    "frontier_tokens",
    "open_tokens",
    "unknown_tokens",
    "other_tokens",
    "open_share_low",
    "open_share_high",
]
LAB_COLUMNS = ["date", "lab", "tokens"]
CLASS_COLUMNS = ["model_permaslug_prefix_or_slug", "match", "lab", "weights", "source", "checked"]
WEIGHTS = {"open", "closed", "unknown"}
MATCH_KINDS = {"slug", "prefix"}
OTHER = "other"

# Bundle shape: assets/examples-data/README.md, "A routed-share bundle for the
# pooled llm-market"; the engine side is bert-tether/src/forcing.rs,
# forcing_a_splitters_outwires_moves_the_routed_share_and_conserves.
TICKS_PER_MONTH = 30
BUNDLE_MAPPING = [
    {"column": "month", "as": "time"},
    {
        "column": "frontier_weight",
        "as": "flow",
        "element": "routed frontier workload",
        "unit": "weight",
        "force": True,
        "every": TICKS_PER_MONTH,
    },
    {
        "column": "open_weight",
        "as": "flow",
        "element": "routed open-weight workload",
        "unit": "weight",
        "force": True,
        "every": TICKS_PER_MONTH,
    },
]


class SensorError(Exception):
    pass


def raw_path(pulldate):
    return DATA / f"openrouter-rankings-daily-vintage-{pulldate}.csv"


def share_path(pulldate):
    return DATA / f"openrouter-routed-share-vintage-{pulldate}.csv"


def monthly_path(pulldate):
    return DATA / f"openrouter-routed-share-monthly-vintage-{pulldate}.csv"


def by_lab_path(pulldate):
    return DATA / f"openrouter-routed-by-lab-vintage-{pulldate}.csv"


def bundle_path(pulldate):
    return DATA / f"openrouter-routed-share-bundle-vintage-{pulldate}.json"


def parse_iso(s):
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError as e:
        raise SensorError(f"not a YYYY-MM-DD date: {s!r}") from e


def write_text(path, text, dry_run):
    if dry_run:
        print(f"dry-run: would write {path.relative_to(ROOT)} ({len(text)} bytes)")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}")


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


# ---------------------------------------------------------------- classification


def load_classification(path=CLASSIFICATION):
    rows = read_csv(path, CLASS_COLUMNS)
    by_slug, by_prefix = {}, {}
    for r in rows:
        key = r["model_permaslug_prefix_or_slug"].strip()
        if r["match"] not in MATCH_KINDS:
            raise SensorError(f"{path}: match {r['match']!r} for {key} not in {sorted(MATCH_KINDS)}")
        if r["weights"] not in WEIGHTS:
            raise SensorError(f"{path}: weights {r['weights']!r} for {key} not in {sorted(WEIGHTS)}")
        if not r["source"].strip():
            raise SensorError(f"{path}: {key} has no source; a row without one is `unknown` at best")
        parse_iso(r["checked"])
        table = by_slug if r["match"] == "slug" else by_prefix
        if key in table:
            raise SensorError(f"{path}: duplicate {r['match']} row {key}")
        if r["match"] == "prefix" and "/" in key:
            raise SensorError(f"{path}: prefix row {key} must be the author only (no '/')")
        table[key] = r
    # A dated row also answers for its undated form, so a raw permaslug in
    # either spelling hits the same exact row; an explicit undated row wins.
    for key, r in list(by_slug.items()):
        by_slug.setdefault(undated(key), r)
    return by_slug, by_prefix


def undated(slug):
    """`anthropic/claude-opus-5-20260723` -> `anthropic/claude-opus-5`.

    OpenRouter's canonical permaslugs carry a release date; an exact row may be
    written either way, so both forms are tried before the author prefix.
    """
    head, sep, tail = slug.rpartition("-")
    if sep and len(tail) == 8 and tail.isdigit():
        return head
    return slug


def classify(slug, by_slug, by_prefix):
    """Returns (lab, weights). Exact slug first, then the author prefix; a slug
    no row names is `unknown`, which is what ruling 3 of #529 asks for."""
    if slug == OTHER:
        return OTHER, OTHER
    for key in (slug, undated(slug)):
        if key in by_slug:
            r = by_slug[key]
            return r["lab"], r["weights"]
    author = slug.split("/", 1)[0] if "/" in slug else ""
    if author in by_prefix:
        r = by_prefix[author]
        return r["lab"], r["weights"]
    return (author or "unknown"), "unknown"


# ------------------------------------------------------------------------- pull


def fetch_page(key, start, end):
    q = urllib.parse.urlencode({"start_date": start.isoformat(), "end_date": end.isoformat()})
    req = urllib.request.Request(
        f"{ENDPOINT}?{q}",
        headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            body = json.load(resp)
    except urllib.error.HTTPError as e:
        # The body may echo request details; the key is never in it, and it
        # is not printed here either, only the status.
        raise SensorError(f"HTTP {e.code} from {ENDPOINT} for {start}..{end}") from e
    rows = body.get("data")
    if not isinstance(rows, list):
        raise SensorError("response has no `data` list")
    return rows, body.get("meta", {})


def validate_raw_rows(rows):
    seen = set()
    for r in rows:
        if set(r.keys()) < set(RAW_COLUMNS):
            raise SensorError(f"raw row missing a column: {r}")
        parse_iso(r["date"])
        if not isinstance(r["total_tokens"], str) or not r["total_tokens"].isdigit():
            raise SensorError(f"total_tokens is not a decimal string: {r}")
        k = (r["date"], r["model_permaslug"])
        if k in seen:
            raise SensorError(f"duplicate (date, permaslug): {k}")
        seen.add(k)


def cmd_pull(args):
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        raise SensorError("OPENROUTER_API_KEY is not set in the environment; pull refuses to run")
    start = parse_iso(args.start)
    end = parse_iso(args.end) if args.end else date.today() - timedelta(days=1)
    pulldate = args.pulldate or date.today().isoformat()
    parse_iso(pulldate)
    if start < DATASET_START:
        raise SensorError(f"the dataset begins {DATASET_START}; start {start} is before it")
    if end < start:
        raise SensorError(f"end {end} before start {start}")
    out = raw_path(pulldate)
    if out.exists() and not args.dry_run:
        raise SensorError(f"{out} exists; a vintage is never refreshed in place (pick another --pulldate)")

    rows, metas = [], []
    page_start = start
    while page_start <= end:
        page_end = min(page_start + timedelta(days=MAX_WINDOW_DAYS - 1), end)
        print(f"GET rankings-daily {page_start}..{page_end}", file=sys.stderr)
        if args.dry_run:
            print("dry-run: not calling the API")
            break
        page, meta = fetch_page(key, page_start, page_end)
        rows.extend(page)
        metas.append(meta)
        page_start = page_end + timedelta(days=1)
        if page_start <= end:
            time.sleep(PAUSE_SECONDS)
    if args.dry_run:
        return
    validate_raw_rows(rows)
    # Raw means raw: the three fields as the API returned them, only ordered.
    # `other` sorts last within its date, as the API itself returns it.
    rows.sort(key=lambda r: (r["date"], r["model_permaslug"] == OTHER, r["model_permaslug"]))
    text = csv_text(RAW_COLUMNS, [{c: r[c] for c in RAW_COLUMNS} for r in rows])
    write_text(out, text, False)
    as_of = [m.get("as_of") for m in metas if m.get("as_of")]
    print(f"{len(rows)} rows, {len({r['date'] for r in rows})} dates; meta.as_of: {as_of}")
    print("record in assets/data/README.md: 'Source: OpenRouter (openrouter.ai/rankings), as of <meta.as_of>.'")

    by_slug, by_prefix = load_classification()
    unmatched = sorted(
        {r["model_permaslug"] for r in rows}
        - {OTHER}
        - {s for s in {r["model_permaslug"] for r in rows} if classify(s, by_slug, by_prefix)[1] != "unknown"}
    )
    print(f"{len(unmatched)} permaslugs not in the classification table (counted as unknown):")
    for s in unmatched:
        print(f"  {s}")


# -------------------------------------------------------------------- aggregate


def aggregate_rows(raw, by_slug, by_prefix):
    """Daily sums by weights class and by lab, from raw rows. Shares:
    low = open / everything (frontier + open + unknown + other),
    high = open / (frontier + open). Unknown and other never count as open."""
    daily = defaultdict(lambda: {"closed": 0, "open": 0, "unknown": 0, OTHER: 0})
    labs = defaultdict(int)
    for r in raw:
        tokens = int(r["total_tokens"])
        lab, weights = classify(r["model_permaslug"], by_slug, by_prefix)
        daily[r["date"]][weights] += tokens
        labs[(r["date"], lab)] += tokens
    share_rows = []
    for d in sorted(daily):
        c = daily[d]
        share_rows.append(share_row(d, c["closed"], c["open"], c["unknown"], c[OTHER]))
    lab_rows = [{"date": d, "lab": lab, "tokens": str(t)} for (d, lab), t in sorted(labs.items())]
    return share_rows, lab_rows


def share_row(key, frontier, open_, unknown, other):
    everything = frontier + open_ + unknown + other
    pair = frontier + open_
    return {
        "date": key,
        "frontier_tokens": str(frontier),
        "open_tokens": str(open_),
        "unknown_tokens": str(unknown),
        "other_tokens": str(other),
        "open_share_low": f"{open_ / everything:.6f}" if everything else "",
        "open_share_high": f"{open_ / pair:.6f}" if pair else "",
    }


def resample_monthly(share_rows):
    """Calendar-month sums of the daily token columns; shares recomputed from
    the sums (not averaged), so a month's bound is the bound of its tokens."""
    months = OrderedDict()
    for r in share_rows:
        m = r["date"][:7]
        acc = months.setdefault(m, [0, 0, 0, 0])
        for i, c in enumerate(("frontier_tokens", "open_tokens", "unknown_tokens", "other_tokens")):
            acc[i] += int(r[c])
    return [share_row(m, *months[m]) for m in sorted(months)]


def cmd_aggregate(args):
    raw = read_csv(raw_path(args.vintage), RAW_COLUMNS)
    validate_raw_rows(raw)
    by_slug, by_prefix = load_classification(Path(args.classification) if args.classification else CLASSIFICATION)
    share_rows, lab_rows = aggregate_rows(raw, by_slug, by_prefix)
    monthly = resample_monthly(share_rows)
    write_text(share_path(args.vintage), csv_text(SHARE_COLUMNS, share_rows), args.dry_run)
    write_text(monthly_path(args.vintage), csv_text(SHARE_COLUMNS, monthly), args.dry_run)
    write_text(by_lab_path(args.vintage), csv_text(LAB_COLUMNS, lab_rows), args.dry_run)
    print(f"{len(share_rows)} days, {len(monthly)} months, {len(lab_rows)} (date, lab) rows")


# ----------------------------------------------------------------------- bundle


def build_bundle(monthly, vintage):
    """Weights are relative (Mobus Eq. 4.5): the Router delivers its activity
    times each weight over the pair's sum, so the two token sums go in as they
    are. `month` is the tick-time index (the tether parses time as a number),
    each row one calendar month, `every: 30` on the model's day tick."""
    if not monthly:
        raise SensorError("no monthly rows; nothing to bundle")
    lines = ["month,frontier_weight,open_weight"]
    for i, r in enumerate(monthly):
        lines.append(f"{i},{r['frontier_tokens']},{r['open_tokens']}")
    first, last = monthly[0]["date"], monthly[-1]["date"]
    return OrderedDict(
        [
            ("title", "LLM Serving Market, routed share observed"),
            (
                "blurb",
                "The pooled llm-market with the Router's split forced by the routed-share "
                f"series: OpenRouter rankings-daily, vintage {vintage}, monthly sums "
                f"{first} to {last} of tokens routed to frontier (closed-weight) and to "
                "open-weight models, per the classification table in assets/data. The two "
                "columns are relative weights, so only their ratio reaches the run; models "
                "classified unknown and the API's aggregated other row are left out of "
                "both, which is the high end of the share's range. Rankings data by "
                "OpenRouter (CC BY 4.0). Self-hosted serving stays at its placeholder.",
            ),
            ("model", "llm-market"),
            ("genus", "Social"),
            ("t", len(monthly) * TICKS_PER_MONTH),
            ("csv", "\n".join(lines) + "\n"),
            (
                "mapping",
                OrderedDict(
                    [
                        ("model", ""),
                        ("data", ""),
                        ("t", len(monthly) * TICKS_PER_MONTH),
                        ("mapping", BUNDLE_MAPPING),
                    ]
                ),
            ),
        ]
    )


def cmd_bundle(args):
    monthly = read_csv(monthly_path(args.vintage), SHARE_COLUMNS)
    bundle = build_bundle(monthly, args.vintage)
    write_text(bundle_path(args.vintage), json.dumps(bundle, indent=2) + "\n", args.dry_run)


# -------------------------------------------------------------------- self-test


def cmd_self_test(args):
    """Pins the sensor's arithmetic on the committed fixture (no network)."""
    import subprocess

    fixture = FIXTURES / "openrouter-rankings-daily-fixture.csv"
    table = FIXTURES / "openrouter-model-classification-fixture.csv"
    raw = read_csv(fixture, RAW_COLUMNS)
    validate_raw_rows(raw)
    by_slug, by_prefix = load_classification(table)
    share_rows, lab_rows = aggregate_rows(raw, by_slug, by_prefix)

    # Hand sums of the fixture, so a change in classification or arithmetic
    # shows up as a number and not as a vague failure.
    want = {
        "2026-09-01": (1000, 3000, 400, 600),
        "2026-09-02": (1200, 2800, 0, 500),
        "2026-10-01": (900, 3600, 300, 700),
    }
    got = {r["date"]: tuple(int(r[c]) for c in SHARE_COLUMNS[1:5]) for r in share_rows}
    check(got == want, f"daily sums {got} != {want}")
    check([r["date"] for r in share_rows] == sorted(want), "daily rows are not date-ordered")
    for r in share_rows:
        f, o, u, x = (int(r[c]) for c in SHARE_COLUMNS[1:5])
        check(abs(float(r["open_share_low"]) - o / (f + o + u + x)) < 1e-6, f"low share {r}")
        check(abs(float(r["open_share_high"]) - o / (f + o)) < 1e-6, f"high share {r}")
        check(float(r["open_share_low"]) <= float(r["open_share_high"]), f"low > high {r}")
    # Unknown and other never leak into open: the day whose only unknown row
    # is the stealth slug has open == the sum of its open-classified rows.
    check(got["2026-09-01"][1] == 3000, "unknown or other counted as open")

    # The dated-slug and undated-slug forms both hit the exact row; the author
    # prefix catches the rest; a stealth author is unknown.
    check(classify("anthropic/claude-opus-5-20260723", by_slug, by_prefix) == ("Anthropic", "closed"), "prefix match")
    check(classify("deepseek/deepseek-v4.1-flash-20260910", by_slug, by_prefix) == ("DeepSeek", "open"), "dated slug match")
    check(classify("deepseek/deepseek-v4.1-flash", by_slug, by_prefix) == ("DeepSeek", "open"), "undated slug match")
    check(classify("openrouter/space-bunny-alpha", by_slug, by_prefix)[1] == "unknown", "stealth is unknown")
    check(classify("nobody/mystery-9b", by_slug, by_prefix) == ("nobody", "unknown"), "unlisted author is unknown")
    check(classify(OTHER, by_slug, by_prefix) == (OTHER, OTHER), "other row")

    monthly = resample_monthly(share_rows)
    check([r["date"] for r in monthly] == ["2026-09", "2026-10"], f"monthly keys {monthly}")
    check(tuple(int(monthly[0][c]) for c in SHARE_COLUMNS[1:5]) == (2200, 5800, 400, 1100), "September sum")
    check(abs(float(monthly[0]["open_share_high"]) - 5800 / 8000) < 1e-6, "September high share from sums")

    lab_keys = [(r["date"], r["lab"]) for r in lab_rows]
    check(lab_keys == sorted(lab_keys), "by-lab rows are not ordered")
    check(("2026-09-01", "other") in lab_keys and ("2026-09-01", "OpenRouter stealth") in lab_keys, "by-lab keeps other and stealth")

    bundle = build_bundle(monthly, "fixture")
    check(bundle["csv"].splitlines()[0] == "month,frontier_weight,open_weight", "bundle header")
    check(bundle["csv"].splitlines()[1] == "0,2200,5800", f"bundle first row {bundle['csv']!r}")
    check(bundle["t"] == 2 * TICKS_PER_MONTH, "bundle horizon")
    elements = [m.get("element") for m in bundle["mapping"]["mapping"]]
    check(elements == [None, "routed frontier workload", "routed open-weight workload"], "bundle targets")
    check(all(m.get("every") == TICKS_PER_MONTH and m.get("force") and m.get("unit") == "weight"
              for m in bundle["mapping"]["mapping"][1:]), "bundle weight columns")

    # Same input, same bytes: the files are diffable across re-runs.
    once = csv_text(SHARE_COLUMNS, share_rows) + csv_text(LAB_COLUMNS, lab_rows)
    again_share, again_lab = aggregate_rows(list(reversed(raw)), by_slug, by_prefix)
    check(once == csv_text(SHARE_COLUMNS, again_share) + csv_text(LAB_COLUMNS, again_lab), "ordering depends on input order")

    # The shipped table parses under the same rules as the fixture one.
    load_classification(CLASSIFICATION)

    # `pull` must refuse without the key; the refusal is the test, so no
    # request is ever attempted.
    env = {k: v for k, v in os.environ.items() if k != "OPENROUTER_API_KEY"}
    proc = subprocess.run(
        [sys.executable, str(Path(__file__).resolve()), "pull", "--start", "2026-01-01", "--end", "2026-01-02"],
        env=env, capture_output=True, text=True,
    )
    check(proc.returncode != 0 and "OPENROUTER_API_KEY" in proc.stderr, f"pull ran without a key: {proc.stdout} {proc.stderr}")
    print("self-test ok")


def check(cond, msg):
    if not cond:
        raise SensorError(f"self-test: {msg}")


# ------------------------------------------------------------------------- main


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("pull", help="fetch rankings-daily into a raw vintage file")
    s.add_argument("--start", default=DATASET_START.isoformat(), help="first date (default: the dataset's first day)")
    s.add_argument("--end", help="last date (default: yesterday, UTC)")
    s.add_argument("--pulldate", help="vintage date in the filename (default: today)")
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(fn=cmd_pull)

    s = sub.add_parser("aggregate", help="raw vintage + classification -> share, monthly, by-lab files")
    s.add_argument("--vintage", required=True, help="pull date of the raw file")
    s.add_argument("--classification", help="override the table path (tests)")
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(fn=cmd_aggregate)

    s = sub.add_parser("bundle", help="monthly file -> forcing bundle for the pooled llm-market")
    s.add_argument("--vintage", required=True)
    s.add_argument("--dry-run", action="store_true")
    s.set_defaults(fn=cmd_bundle)

    s = sub.add_parser("self-test", help="pin the arithmetic on the committed fixture")
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
