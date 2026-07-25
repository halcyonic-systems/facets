#!/usr/bin/env python3
"""Draw the desktop app icon source (src-tauri/icons/icon-src.png), hand it to
`cargo tauri icon` for the platform set, and drop the mobile sets it emits —
the only bundle target is macOS.

No wordmark or logo file exists in the repo, so the mark is derived from the
identity device the app already uses (docs/design/visual-language.md rule 6):
the filled accent band with the name on it. Reduced to a tile, that is the
accent-strong field, the wordmark's initials with its interpunct, and one rule
closing the region.

The macOS icon grid (a squircle inset in a transparent square) governs the tile
shape, not the 8px UI radius cap — that rule is about panels inside the app.

Needs fonttools + pillow, neither a project dependency. Run in a throwaway venv:
  python3 -m venv /tmp/iconvenv
  /tmp/iconvenv/bin/pip install fonttools brotli pillow
  /tmp/iconvenv/bin/python scripts/make-icon.py
"""

import io
import shutil
import subprocess
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FACE = ROOT / "web" / "src" / "fonts" / "inter-latin.woff2"
OUT = ROOT / "src-tauri" / "icons" / "icon-src.png"

SIZE = 1024
INSET = 100  # macOS Big Sur grid: an 824 tile in a 1024 square
RADIUS = 185  # 0.2237 * 824
FIELD = "#2a4b59"  # --accent-strong (light)
INK = "#ffffff"  # --text-on-accent
RULE = "#d5e2e8"  # --accent-soft


def inter(weight: int, px: int) -> ImageFont.FreeTypeFont:
    """The app's own body face, at a variable wght instance."""
    face = TTFont(FACE)
    face.flavor = None  # woff2 -> ttf, which FreeType can read
    buf = io.BytesIO()
    face.save(buf)
    buf.seek(0)
    font = ImageFont.truetype(buf, px)
    font.set_variation_by_axes([weight])
    return font


def main() -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([INSET, INSET, SIZE - INSET, SIZE - INSET], RADIUS, fill=FIELD)

    font = inter(600, 340)
    mark = "b·l"
    gap, rule_h = 56, 10
    box = d.textbbox((0, 0), mark, font=font)
    w, h = box[2] - box[0], box[3] - box[1]
    left = (SIZE - w) / 2
    top = (SIZE - (h + gap + rule_h)) / 2
    d.text((left - box[0], top - box[1]), mark, font=font, fill=INK)
    rule_y = top + h + gap
    d.rectangle([left, rule_y, left + w, rule_y + rule_h], fill=RULE)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT)
    print(f"{OUT.relative_to(ROOT)} {SIZE}x{SIZE}")

    subprocess.run(["cargo", "tauri", "icon", str(OUT)], cwd=OUT.parent.parent, check=True)
    for mobile in ("ios", "android"):
        shutil.rmtree(OUT.parent / mobile, ignore_errors=True)


if __name__ == "__main__":
    main()
