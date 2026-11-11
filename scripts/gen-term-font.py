#!/usr/bin/env python3
"""gen-term-font.py: the live demo's terminal font.

The site's web font is Google's latin subset of JetBrains Mono, and 31 of the
35 characters agentty draws (box lines, blocks, braille spinners, arrows,
❯ ✦ ▶) are not in it. A browser then pulls each one from some system font
with its own width and height: rows misalign, box lines break, and the
per-glyph font fallback makes every repaint slow on a phone.

This builds one font that has all of them at exactly one cell wide: JetBrains
Mono (full release, OFL) cut down to what a terminal session draws, plus the
two things JetBrains Mono lacks, generated here on its own grid: the 256
braille patterns (agentty's spinner) and ✦ (agentty's reply marker).

    python3 scripts/gen-term-font.py path/to/JetBrainsMono-2.304/fonts/ttf

writes public/vendor/xterm/agentty-term-{400,700,400i,700i}.woff2.
Needs fontTools + brotli. The output is committed; run it again only to
change the character set.
"""
import os
import sys

from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/jbm/fonts/ttf"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "vendor", "xterm")
FACES = {"400": "Regular", "700": "Bold", "400i": "Italic", "700i": "BoldItalic"}

# what a terminal session draws: ASCII, Latin-1, punctuation, arrows, maths,
# technical, box drawing, blocks, geometric shapes, misc symbols, dingbats,
# braille, powerline-ish arrows
RANGES = [
    (0x20, 0x7E), (0xA0, 0xFF), (0x2010, 0x2027), (0x2030, 0x205E), (0x2190, 0x21FF),
    (0x2200, 0x22FF), (0x2300, 0x23FF), (0x2500, 0x259F), (0x25A0, 0x25FF), (0x2600, 0x26FF),
    (0x2700, 0x27BF), (0x2800, 0x28FF), (0xE0A0, 0xE0D4),
]
UNICODES = [u for a, b in RANGES for u in range(a, b + 1)]


def circle(pen, cx, cy, r):
    # four quadratic arcs (TrueType outlines are quadratic), clockwise
    k = r * 0.4142  # tan(22.5°): off-curve points of an octant-approximated circle
    pts = [
        (cx, cy + r), (cx + k, cy + r), (cx + r * 0.7071, cy + r * 0.7071), (cx + r, cy + k),
        (cx + r, cy), (cx + r, cy - k), (cx + r * 0.7071, cy - r * 0.7071), (cx + k, cy - r),
        (cx, cy - r), (cx - k, cy - r), (cx - r * 0.7071, cy - r * 0.7071), (cx - r, cy - k),
        (cx - r, cy), (cx - r, cy + k), (cx - r * 0.7071, cy + r * 0.7071), (cx - k, cy + r),
    ]
    pen.moveTo(pts[0])
    for i in range(0, 16, 2):
        pen.qCurveTo(pts[i + 1], pts[(i + 2) % 16])
    pen.closePath()


def add_glyph(font, name, uni, draw):
    adv = font["hmtx"]["space"][0]
    pen = TTGlyphPen(None)
    draw(pen, adv)
    g = pen.glyph()
    font["glyf"][name] = g
    if name not in font.getGlyphOrder():
        font.setGlyphOrder(font.getGlyphOrder() + [name])
    g.recalcBounds(font["glyf"])
    font["hmtx"][name] = (adv, g.xMin if g.numberOfContours else 0)
    for t in font["cmap"].tables:
        if t.isUnicode():
            t.cmap[uni] = name


def build(face, file):
    font = TTFont(os.path.join(SRC, f"JetBrainsMono-{file}.ttf"))
    asc, desc = font["hhea"].ascent, font["hhea"].descent  # the cell's vertical extent
    cmap = font.getBestCmap()
    bold = face.startswith("700")

    # braille: a 2x4 dot grid filling the cell, like a terminal's own
    if 0x2800 not in cmap:
        def braille(bits):
            def draw(pen, adv):
                h = asc - desc
                r = adv * (0.12 if bold else 0.1)
                xs = (adv * 0.3, adv * 0.7)
                ys = [desc + h * f for f in (0.8, 0.6, 0.4, 0.2)]
                dots = [(0, 0), (0, 1), (0, 2), (1, 0), (1, 1), (1, 2), (0, 3), (1, 3)]
                for bit, (col, row) in enumerate(dots):
                    if bits & (1 << bit):
                        circle(pen, xs[col], ys[row], r)
            return draw
        for i in range(256):
            add_glyph(font, f"uni{0x2800 + i:04X}", 0x2800 + i, braille(i))

    # ✦ four-pointed star, centred on the x-height middle
    if 0x2726 not in cmap:
        def star(pen, adv):
            cx, cy = adv / 2, font["OS/2"].sxHeight / 2 + 40
            R, w = adv * 0.46, adv * (0.11 if bold else 0.09)
            pen.moveTo((cx, cy + R))
            pen.lineTo((cx + w, cy + w)); pen.lineTo((cx + R, cy)); pen.lineTo((cx + w, cy - w))
            pen.lineTo((cx, cy - R)); pen.lineTo((cx - w, cy - w)); pen.lineTo((cx - R, cy)); pen.lineTo((cx - w, cy + w))
            pen.closePath()
        add_glyph(font, "uni2726", 0x2726, star)

    opts = Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern"]  # no ligatures: a terminal draws what it is sent
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6]
    opts.hinting = True
    sub = Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    font.flavor = "woff2"
    out = os.path.join(OUT, f"agentty-term-{face}.woff2")
    font.save(out)
    return out, os.path.getsize(out)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for face, file in FACES.items():
        path, size = build(face, file)
        print(f"{os.path.relpath(path)}  {size // 1024} KB")
