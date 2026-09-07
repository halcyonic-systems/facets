"""Rung-2 demonstration: computed allocation on real data.

Builds a generator spec (Total demand -> Allocator[Splitting] -> 6 providers),
a CSV (total demand forced + per-provider value-for-money weights), and a run
manifest. The tool then splits the forced total demand by the weights — a
COMPUTED interior, not a forced one.

Value-for-money = flagship ECI / output price, per provider-month, from the real
prices_monthly.csv + capabilities.csv. The two aggregate providers (open-weights,
other) use documented proxies — this stage optimizes for a plausible, legible
model, not a calibrated one. Normalization happens in the kernel; raw weights ride
the CSV so the rule stays readable.
"""
import csv
import json
from pathlib import Path

DATA = Path.home() / "Documents/bert-lenses/data"
OUT = Path.home() / "Documents/bert-lenses/technical"
OUT.mkdir(parents=True, exist_ok=True)

# target4 provider column -> capabilities org name(s). The 4 majors join cleanly.
ORG = {
    "anthropic": ["Anthropic"],
    "openai": ["OpenAI"],
    "google": ["Google DeepMind", "Google"],
    "xai": ["xAI"],
}
# ...and -> the price-table provider slug (differs: Google prices ride "gemini").
PRICE_KEY = {"anthropic": "anthropic", "openai": "openai", "google": "gemini", "xai": "xai"}
OPEN_ORGS = ["Meta AI", "DeepSeek", "Alibaba", "Mistral AI", "Z.ai (Zhipu AI)"]


def months_from_target4():
    rows = list(csv.DictReader(open(DATA / "target4_dev_wide.csv")))
    return rows  # month_index, month_label, *_tok, total_tok


def max_eci_by_month(orgs):
    """Frontier ECI available to an org as of each month (max ECI released <= month)."""
    caps = list(csv.DictReader(open(DATA / "capabilities.csv")))
    pts = []
    for r in caps:
        if r["organization"] in orgs and r["eci_score"] and r["release_date"]:
            pts.append((r["release_date"][:7], float(r["eci_score"])))
    pts.sort()

    def eci_at(month):
        best = None
        for rel, e in pts:
            if rel <= month and (best is None or e > best):
                best = e
        return best
    return eci_at


def min_price_by_month(provider):
    """Cheapest frontier output price for a provider as of each month (held-last)."""
    prices = list(csv.DictReader(open(DATA / "prices_monthly.csv")))
    by_month = {}
    for r in prices:
        if r["provider"] == provider and r["output_usd_per_Mtok"]:
            p = float(r["output_usd_per_Mtok"])
            if p > 0.0:  # ignore free tiers — we want cheapest PAID frontier access
                by_month.setdefault(r["month"], []).append(p)
    seq = sorted((m, min(ps)) for m, ps in by_month.items())

    def price_at(month):
        held = None
        for m, p in seq:
            if m <= month:
                held = p
        return held
    return price_at


def value_for_money(rows):
    """Per provider-month value-for-money = ECI / price; proxies for aggregates."""
    eci_major = {p: max_eci_by_month(orgs) for p, orgs in ORG.items()}
    price_major = {p: min_price_by_month(PRICE_KEY[p]) for p in ORG}
    eci_open = max_eci_by_month(OPEN_ORGS)

    weights = {p: [] for p in ("anthropic", "openai", "google", "xai", "open_weights", "other")}
    for r in rows:
        m = r["month_label"]
        for p in ORG:
            e, pr = eci_major[p](m), price_major[p](m)
            weights[p].append(e / pr if (e and pr) else 0.0)
        # open-weights proxy: frontier open ECI, near-free serving -> strong value.
        eo = eci_open(m)
        weights["open_weights"].append((eo / 0.30) if eo else 0.0)
        # other proxy: a small residual of the mean major value.
        majors_now = [weights[p][-1] for p in ORG]
        weights["other"].append(0.15 * (sum(majors_now) / len(majors_now)))
    return weights


def build(rows, weights):
    providers = [
        ("anthropic", "Anthropic"), ("openai", "OpenAI"), ("google", "Google"),
        ("xai", "xAI"), ("open_weights", "Open-weights"), ("other", "Other"),
    ]

    # --- generator spec: Total demand -> Allocator[Splitting] -> providers ---
    spec = {
        "system": {"name": "LLM dev-channel allocation", "complexity": "Complex", "adaptable": True},
        "subsystems": [{"name": "Allocator", "primitive": "Splitting",
                        "description": "Splits total demand across providers by value-for-money"}],
        "sources": [{"name": "Total demand", "description": "Total dev-channel tokens consumed"}],
        "sinks": [{"name": disp, "description": f"{disp} share of demand"} for _, disp in providers],
        "routing_table": (
            [{"interface": "demand_in", "connected_to": "Total demand",
              "target_subsystem": "Allocator", "type": "Import", "has_processor": False}]
            + [{"interface": f"{col}_out", "connected_to": disp,
                "target_subsystem": "Allocator", "type": "Export", "has_processor": False}
               for col, disp in providers]
        ),
        "internal_flows": [],
        "external_flows": (
            [{"interface": "demand_in", "name": "Total demand routed",
              "substance": {"type": "Material", "sub_type": "tokens"}, "usability": "Resource"}]
            + [{"interface": f"{col}_out", "name": f"{disp} allocation",
                "substance": {"type": "Material", "sub_type": "tokens"}, "usability": "Resource"}
               for col, disp in providers]
        ),
    }
    (OUT / "rung2-alloc-spec.json").write_text(json.dumps(spec, indent=2))

    # --- CSV: total demand (forced) + per-provider weights (forced) ---
    csv_path = OUT.parent / "data/rung2_alloc.csv"
    with open(csv_path, "w", newline="") as f:
        w = csv.writer(f)
        cols = ["month", "total_tok"] + [f"w_{col}" for col, _ in providers]
        w.writerow(cols)
        for i, r in enumerate(rows):
            row = [r["month_label"], r["total_tok"]]
            row += [f"{weights[col][i]:.6f}" for col, _ in providers]
            w.writerow(row)

    # --- manifest: force total demand + every weight ---
    manifest = {
        "model": "technical/rung2-alloc.json",
        "data": "data/rung2_alloc.csv",
        "t": float(len(rows)),
        "mapping": [
            {"column": "month", "as": "time"},
            {"column": "total_tok", "as": "flow", "element": "Total demand routed",
             "unit": "tok/mo", "force": True},
        ] + [
            {"column": f"w_{col}", "as": "flow", "element": f"{disp} allocation",
             "unit": "weight", "force": True}
            for col, disp in providers
        ],
    }
    (OUT / "rung2-alloc-run.json").write_text(json.dumps(manifest, indent=2))
    return csv_path


if __name__ == "__main__":
    rows = months_from_target4()
    weights = value_for_money(rows)
    csv_path = build(rows, weights)
    print(f"months: {len(rows)}  ({rows[0]['month_label']} .. {rows[-1]['month_label']})")
    print("spec:     ", OUT / "rung2-alloc-spec.json")
    print("csv:      ", csv_path)
    print("manifest: ", OUT / "rung2-alloc-run.json")
    # Legibility check: computed share (value-for-money, normalized) vs the
    # observed share of realized consumption, averaged over the 18 months. NOT a
    # fit — a plausibility read: does "buyers chase value-for-money" land in the
    # right neighbourhood, and where does it plainly miss?
    provs = ["anthropic", "openai", "google", "xai", "open_weights", "other"]
    comp_avg = {p: 0.0 for p in provs}
    obs_avg = {p: 0.0 for p in provs}
    for i, r in enumerate(rows):
        wsum = sum(weights[p][i] for p in provs) or 1.0
        tot = float(r["total_tok"]) or 1.0
        for p in provs:
            comp_avg[p] += (weights[p][i] / wsum) / len(rows)
            obs_avg[p] += (float(r[f"{p}_tok"]) / tot) / len(rows)
    print("\n  provider        computed   observed   (avg share over 18 mo)")
    print("  " + "-" * 54)
    for p in provs:
        gap = comp_avg[p] - obs_avg[p]
        flag = "  <-- value-for-money misses" if abs(gap) > 0.15 else ""
        print(f"  {p:14s}  {100*comp_avg[p]:6.1f}%   {100*obs_avg[p]:6.1f}%   {100*gap:+6.1f}pp{flag}")
