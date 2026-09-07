"""Shared paths and helpers for the LLM-market data pipeline.

Data outputs live outside the repo per project convention (data stays out of
code repos). Override with the BERT_LENSES_DATA_DIR env var if needed.
"""
import csv
import os
import zipfile
import urllib.request
from pathlib import Path

DATA_DIR = Path(os.environ.get("BERT_LENSES_DATA_DIR", "/Users/home/Documents/bert-lenses/data"))
SCRATCH_DIR = Path(os.environ.get(
    "BERT_LENSES_SCRATCH_DIR",
    "/private/tmp/claude-501/-Users-home-Desktop-halcyonic/895278cf-dff2-45d2-afdd-0f3df7693127/scratchpad",
))


def ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_DIR


def download(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "bert-lenses-pipeline/0.1"})
    with urllib.request.urlopen(req) as resp, open(dest, "wb") as f:
        f.write(resp.read())
    return dest


def unzip(zip_path: Path, dest_dir: Path):
    dest_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(dest_dir)
    return dest_dir


def write_csv(path: Path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
    return path
