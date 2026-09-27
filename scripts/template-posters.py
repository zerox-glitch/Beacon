#!/usr/bin/env python3
"""Generate the “Themes” template posters (public/templates/*.png).

Each Themes preset is a designed poster — plate/scatter artwork with a
pristine centre square — composed under a crisp QR by renderQr's CLEAN mode
(`imageMode: "clean"`), exactly like the template galleries in the mobile QR
apps: themed frame art around the code, dark modules painted on top.

LAYOUT CONTRACT (scannability):
  * Canvas 1024×1024, QR body renders centred (qz=8 → body ≈ 740–800 px
    depending on the payload version).
  * Nothing decorative may enter the square [56, 968]² — that covers the QR
    body plus its 4-module quiet zone up to ~version 12. Clipart lives in the
    outer band / corners only.
  * Plate shapes (seal, pentagon, …) keep the QR sitting on flat plate colour;
    stitch lines and scallops stay in the outer band.

Run:  python3 scripts/template-posters.py          # regenerate all posters
      python3 scripts/template-posters.py --qa      # composite scan previews
Outputs are palette-quantized PNGs (flat art, small files) + a contact sheet
in sheets/ for visual review.
"""
import json
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "templates")
SHEETS = os.path.join(ROOT, "sheets")
S = 1024
SAFE = 56  # keep all decoration outside [SAFE, S-SAFE]^2

FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def font(size: int):
    for p in FONT_PATHS:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


# ---------------------------------------------------------------- primitives


def new_canvas(bg: str):
    img = Image.new("RGB", (S, S), bg)
    return img, ImageDraw.Draw(img)


def rrect(d, box, r, fill=None, outline=None, width=0):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def poly(d, pts, fill=None, outline=None, width=0):
    d.polygon(pts, fill=fill, outline=outline, width=width)


def circle(d, cx, cy, r, fill=None, outline=None, width=0):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=outline, width=width)


def rot_pts(pts, cx, cy, ang):
    c, s = math.cos(ang), math.sin(ang)
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in pts]


def rounded_rect_pts(box, r, steps=14):
    """Polyline (closed) of a rounded rect — for dashed stitches."""
    x0, y0, x1, y1 = box
    pts = []
    corners = [
        (x1 - r, y0 + r, -90, 0),   # TR
        (x1 - r, y1 - r, 0, 90),    # BR
        (x0 + r, y1 - r, 90, 180),  # BL
        (x0 + r, y0 + r, 180, 270),  # TL
    ]
    for cx, cy, a0, a1 in corners:
        for i in range(steps + 1):
            a = math.radians(a0 + (a1 - a0) * i / steps)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
        # straight run to the next corner
    return pts


def circle_pts(cx, cy, r, steps=96):
    return [
        (cx + r * math.cos(2 * math.pi * i / steps), cy + r * math.sin(2 * math.pi * i / steps))
        for i in range(steps)
    ]


def regular_poly_pts(cx, cy, r, n, rot=0):
    return [
        (
            cx + r * math.cos(rot + 2 * math.pi * i / n),
            cy + r * math.sin(rot + 2 * math.pi * i / n),
        )
        for i in range(n)
    ]


def dashed(d, pts, color, width, dash, gap, closed=True):
    """Dashed polyline stitch — length-parametrised (curves stay even)."""
    seq = list(pts) + ([pts[0]] if closed else [])
    starts = [0.0]
    for i in range(1, len(seq)):
        starts.append(
            starts[-1] + math.hypot(seq[i][0] - seq[i - 1][0], seq[i][1] - seq[i - 1][1])
        )
    total = starts[-1]
    period = dash + gap
    if total <= 0 or period <= 0:
        return

    def point_at(dist):
        dist = min(max(dist, 0.0), total)
        for i in range(len(seq) - 1):
            if starts[i + 1] >= dist - 1e-9:
                seg = starts[i + 1] - starts[i]
                t = 0.0 if seg <= 1e-9 else (dist - starts[i]) / seg
                t = min(max(t, 0.0), 1.0)
                p0, p1 = seq[i], seq[i + 1]
                return (p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t)
        return seq[-1]

    n = int(total // period) + 1
    for k in range(n + 1):
        a = k * period
        if a >= total:
            break
        b = min(a + dash, total)
        samples = 10
        prev = point_at(a)
        for s in range(1, samples + 1):
            cur = point_at(a + (b - a) * s / samples)
            d.line([prev, cur], fill=color, width=width)
            prev = cur


def text_banner(d, cx, cy, w, h, label, pill, ink, size=None, r=None):
    r = r if r is not None else h // 2
    rrect(d, (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), r, fill=pill)
    f = font(size or int(h * 0.52))
    d.text((cx, cy), label, font=f, fill=ink, anchor="mm")


# ------------------------------------------------------------------ clipart
# All clipart draws inside a size×size box centred on (x, y).


def cl_heart(d, x, y, size, color, ang=0):
    s = size / 2
    pts = []
    for i in range(36):
        t = 2 * math.pi * i / 36
        hx = 16 * math.sin(t) ** 3
        hy = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((x + hx * s / 16, y + hy * s / 16))
    poly(d, rot_pts(pts, x, y, ang), fill=color)


def cl_star(d, x, y, size, color, ang=0, points=5):
    pts = []
    for i in range(points * 2):
        r = size / 2 if i % 2 == 0 else size * 0.21
        a = -math.pi / 2 + math.pi * i / points
        pts.append((x + r * math.cos(a), y + r * math.sin(a)))
    poly(d, rot_pts(pts, x, y, ang), fill=color)


def cl_sparkle(d, x, y, size, color, ang=0):
    s = size / 2
    pts = []
    for i in range(8):
        a = math.pi * i / 4
        r = s if i % 2 == 0 else s * 0.22
        pts.append((x + r * math.cos(a), y + r * math.sin(a)))
    poly(d, rot_pts(pts, x, y, ang), fill=color)


def cl_flower(d, x, y, size, color, center=None, petals=6, ang=0):
    pr = size * 0.28
    for i in range(petals):
        a = ang + 2 * math.pi * i / petals
        px = x + math.cos(a) * size * 0.27
        py = y + math.sin(a) * size * 0.27
        circle(d, px, py, pr, fill=color)
    if center:
        circle(d, x, y, size * 0.18, fill=center)


def cl_leaf(d, x, y, size, color, ang=0):
    s = size / 2
    pts = []
    for i in range(24):
        t = i / 23
        # two mirrored quadratic arcs → pointed leaf
        w = s * 0.62 * math.sin(math.pi * t)
        pts.append((x - w, y - s + 2 * s * t))
    for i in range(24):
        t = 1 - i / 23
        w = s * 0.62 * math.sin(math.pi * t)
        pts.append((x + w, y - s + 2 * s * t))
    poly(d, rot_pts(pts, x, y, ang), fill=color)


def cl_maple(d, x, y, size, color, ang=0):
    s = size / 2
    base = [
        (0, -1.0), (0.18, -0.55), (0.55, -0.72), (0.5, -0.32), (1.0, -0.18),
        (0.62, 0.02), (0.78, 0.38), (0.34, 0.3), (0.3, 0.72), (0.08, 0.42),
        (0, 1.0), (-0.08, 0.42), (-0.3, 0.72), (-0.34, 0.3), (-0.78, 0.38),
        (-0.62, 0.02), (-1.0, -0.18), (-0.5, -0.32), (-0.55, -0.72), (-0.18, -0.55),
    ]
    poly(d, rot_pts([(x + bx * s, y + by * s) for bx, by in base], x, y, ang), fill=color)


def cl_snowflake(d, x, y, size, color, ang=0):
    r = size / 2
    for i in range(6):
        a = ang + i * math.pi / 3
        x2, y2 = x + r * math.cos(a), y + r * math.sin(a)
        d.line([(x, y), (x2, y2)], fill=color, width=max(2, int(size * 0.07)))
        for k in (0.55, 0.8):
            bx, by = x + r * k * math.cos(a), y + r * k * math.sin(a)
            bl = r * 0.22
            for sa in (a + math.pi / 3, a - math.pi / 3):
                d.line([(bx, by), (bx + bl * math.cos(sa), by + bl * math.sin(sa))], fill=color,
                       width=max(2, int(size * 0.055)))


def cl_note(d, x, y, size, color, ang=0):
    s = size
    hr = s * 0.2
    hx, hy = x - s * 0.22, y + s * 0.3
    stem_x = hx + hr * 1.1
    d.line([(stem_x, hy), (stem_x + s * 0.05, y - s * 0.42)], fill=color, width=max(3, int(s * 0.09)))
    # rotated-ellipse note head as a polygon
    ell = []
    for i in range(24):
        t = 2 * math.pi * i / 24
        ex = hr * 1.15 * math.cos(t)
        ey = hr * 0.82 * math.sin(t)
        c, s_ = math.cos(-0.35 + ang), math.sin(-0.35 + ang)
        ell.append((hx + ex * c - ey * s_, hy + ex * s_ + ey * c))
    poly(d, ell, fill=color)
    # flag
    fx, fy = stem_x + s * 0.05, y - s * 0.42
    poly(d, [(fx, fy), (fx + s * 0.3, fy + s * 0.1), (fx, fy + s * 0.3)], fill=color)


def cl_crescent(d, x, y, size, color, bg, ang=0):
    r = size / 2
    circle(d, x, y, r, fill=color)
    off = r * 0.42
    c, s_ = math.cos(ang), math.sin(ang)
    circle(d, x + off * c, y + off * s_, r * 0.86, fill=bg)


def cl_wave(d, x, y, size, color, cycles=1.6, ang=0, amp=0.09):
    pts = []
    n = 40
    for i in range(n + 1):
        t = i / n
        pts.append((x - size / 2 + size * t, y + math.sin(t * math.pi * 2 * cycles) * size * amp))
    if ang:
        pts = rot_pts(pts, x, y, ang)
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=color, width=max(3, int(size * 0.075)))


def cl_confetti(d, x, y, size, colors, seed=1):
    rnd = random.Random(seed)
    for i in range(7):
        cx = x + rnd.uniform(-size / 2, size / 2)
        cy = y + rnd.uniform(-size / 2, size / 2)
        c = colors[i % len(colors)]
        k = rnd.random()
        r = size * rnd.uniform(0.06, 0.12)
        if k < 0.4:
            circle(d, cx, cy, r, fill=c)
        elif k < 0.7:
            d.rounded_rectangle([cx - r, cy - r * 0.6, cx + r, cy + r * 0.6], radius=r * 0.4, fill=c)
        else:
            poly(d, [(cx, cy - r), (cx + r, cy + r), (cx - r, cy + r)], fill=c)


def cl_holly(d, x, y, size, leaf, berry, ang=0):
    for a in (-0.6, 0.6):
        cl_leaf(d, x + math.cos(ang + a) * size * 0.28, y + math.sin(ang + a) * size * 0.28,
                size * 0.72, leaf, ang=ang + a)
    for i, (bx, by) in enumerate([(0.1, -0.15), (0.28, 0.02), (0.06, 0.12)]):
        circle(d, x + bx * size, y + by * size, size * 0.11, fill=berry)


def cl_pumpkin(d, x, y, size, color, stem, ang=0):
    s = size
    for k, sc in ((0, 1.0), (0, 0.72)):
        circle(d, x, y, s * 0.5 * sc, fill=color)
    d.rounded_rectangle([x - s * 0.5, y - s * 0.34, x + s * 0.5, y + s * 0.34], radius=s * 0.3, fill=color)
    d.rounded_rectangle([x - s * 0.07, y - s * 0.66, x + s * 0.07, y - s * 0.34], radius=s * 0.05, fill=stem)
    circle(d, x - s * 0.17, y - s * 0.05, s * 0.06, fill=stem)  # face dots
    circle(d, x + s * 0.17, y - s * 0.05, s * 0.06, fill=stem)
    poly(d, [(x - s * 0.16, y + s * 0.12), (x + s * 0.16, y + s * 0.12), (x, y + s * 0.28)], fill=stem)


def cl_bat(d, x, y, size, color, ang=0):
    s = size / 2
    base = [
        (0, -0.18), (0.28, -0.38), (0.42, -0.12), (0.72, -0.32), (0.86, 0.02),
        (1.0, 0.22), (0.55, 0.18), (0.3, 0.34), (0, 0.2), (-0.3, 0.34), (-0.55, 0.18),
        (-1.0, 0.22), (-0.86, 0.02), (-0.72, -0.32), (-0.42, -0.12), (-0.28, -0.38),
    ]
    poly(d, rot_pts([(x + bx * s, y + by * s) for bx, by in base], x, y, ang), fill=color)


def cl_web(d, x, y, size, color, ang=0, spokes=4, rings=3):
    """Quarter spider web anchored at (x, y) — angle sets the facing."""
    for i in range(spokes + 1):
        a = ang + i * (math.pi / 2) / spokes
        d.line([(x, y), (x + size * math.cos(a), y + size * math.sin(a))], fill=color, width=2)
    for k in range(1, rings + 1):
        r = size * k / rings
        pts = []
        for i in range(13):
            a = ang + i * (math.pi / 2) / 12
            pts.append((x + r * math.cos(a), y + r * math.sin(a)))
        for i in range(len(pts) - 1):
            d.line([pts[i], pts[i + 1]], fill=color, width=2)


def cl_lantern(d, x, y, size, color, glow):
    w, h = size * 0.6, size
    d.rounded_rectangle([x - w / 2, y - h * 0.32, x + w / 2, y + h * 0.42], radius=w * 0.32, fill=color)
    d.rounded_rectangle([x - w * 0.36, y - h * 0.46, x + w * 0.36, y - h * 0.28], radius=w * 0.12, fill=glow)
    d.rounded_rectangle([x - w * 0.36, y + h * 0.36, x + w * 0.36, y + h * 0.5], radius=w * 0.12, fill=glow)
    d.line([(x, y - h * 0.46), (x, y - h * 0.62)], fill=glow, width=3)
    circle(d, x, y + h * 0.62, size * 0.06, fill=glow)


def cl_vine(d, x, y, size, color, ang=0):
    pts = []
    n = 22
    for i in range(n + 1):
        t = i / n
        pts.append((x + math.cos(ang) * (-size / 2 + size * t), y + math.sin(ang) * (-size / 2 + size * t)
                    + math.sin(t * math.pi * 1.6) * size * 0.16))
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=color, width=3)
    for k in (0.28, 0.56, 0.84):
        idx = int(k * (len(pts) - 1))
        px, py = pts[idx]
        cl_leaf(d, px, py, size * 0.26, color, ang=ang + (1.2 if k % 0.5 < 0.25 else -1.2))


def cl_flourish(d, x, y, size, color, ang=0):
    """Corner scroll — two mirrored spirals."""
    for sgn in (1, -1):
        pts = []
        for i in range(34):
            t = i / 33
            a = t * math.pi * 1.35
            r = size * (0.12 + 0.5 * t)
            pts.append((x + sgn * r * math.cos(a) * 0.9, y + r * math.sin(a) * 0.9))
        pts = rot_pts(pts, x, y, ang)
        for i in range(len(pts) - 1):
            d.line([pts[i], pts[i + 1]], fill=color, width=max(2, int(size * 0.05)))


def cl_arrow(d, x, y, size, color, ang=0):
    s = size / 2
    tipx, tipy = x + s * math.cos(ang), y + s * math.sin(ang)
    tailx, taily = x - s * math.cos(ang), y - s * math.sin(ang)
    d.line([(tailx, taily), (tipx, tipy)], fill=color, width=max(3, int(size * 0.12)))
    wing = size * 0.3
    for sa in (ang + 2.5, ang - 2.5):
        d.line([(tipx, tipy), (tipx + wing * math.cos(sa), tipy + wing * math.sin(sa))],
               fill=color, width=max(3, int(size * 0.12)))


def cl_rings(d, x, y, size, color, ang=0):
    r = size * 0.32
    circle(d, x - r * 0.62, y, r, outline=color, width=max(3, int(size * 0.07)))
    circle(d, x + r * 0.62, y, r, outline=color, width=max(3, int(size * 0.07)))


def cl_balloon(d, x, y, size, color, string, ang=0):
    w, h = size * 0.72, size
    d.ellipse([x - w / 2, y - h / 2, x + w / 2, y + h * 0.28], fill=color)
    poly(d, [(x - size * 0.06, y + h * 0.28), (x + size * 0.06, y + h * 0.28), (x, y + h * 0.4)], fill=color)
    d.line([(x, y + h * 0.4), (x - size * 0.14, y + h * 0.8), (x + size * 0.02, y + h * 0.95)],
           fill=string, width=2)


def cl_sun(d, x, y, size, color, ang=0):
    r = size * 0.32
    circle(d, x, y, r, fill=color)
    for i in range(8):
        a = ang + i * math.pi / 4
        d.line([(x + r * 1.25 * math.cos(a), y + r * 1.25 * math.sin(a)),
                (x + r * 1.8 * math.cos(a), y + r * 1.8 * math.sin(a))],
               fill=color, width=max(3, int(size * 0.08)))


def cl_butterfly(d, x, y, size, color, ang=0):
    s = size / 2
    for sx in (1, -1):
        d.ellipse([x + sx * s * 0.05 - (s * 0.62 if sx > 0 else 0), y - s * 0.62,
                   x + sx * s * 0.05 + (s * 0.62 if sx > 0 else 0), y + s * 0.08], fill=color)
        d.ellipse([x + sx * s * 0.05 - (s * 0.5 if sx > 0 else 0), y - s * 0.02,
                   x + sx * s * 0.05 + (s * 0.5 if sx > 0 else 0), y + s * 0.66], fill=color)
    d.rounded_rectangle([x - s * 0.07, y - s * 0.5, x + s * 0.07, y + s * 0.55], radius=s * 0.07, fill=color)


def cl_ring_of_dots(d, cx, cy, r, color, n, size, phase=0):
    for i in range(n):
        a = phase + 2 * math.pi * i / n
        circle(d, cx + r * math.cos(a), cy + r * math.sin(a), size, fill=color)


# ------------------------------------------------------------------ recipes
# Layout contract (qrInset = 0.18 default → code square [184, 840]²):
#   * plates/panels must CONTAIN the code square; decoration (stitch,
#     scallops, clipart) lives strictly OUTSIDE [184, 840]² where possible.
#   * `inset` in the meta is the preset's style.qrInset (cup/bucket/label
#     push it to 0.22 so the shape body stays visible under the panel).

MANIFEST = []


def register(meta):
    MANIFEST.append(meta)
    return meta


def stitch_round(d, box, r, color, width=8, dash=32, gap=22, inset=0):
    x0, y0, x1, y1 = box
    b = (x0 + inset, y0 + inset, x1 - inset, y1 - inset)
    dashed(d, rounded_rect_pts(b, r), color, width, dash, gap)


# ---- PLATES ---------------------------------------------------------------

def r_note():
    plate, fg, stitch = "#f2c94c", "#6b4b12", "#fff8e8"
    img, d = new_canvas("#fffdf6")
    rrect(d, (14, 14, 1010, 1010), 140, fill=plate)
    stitch_round(d, (14, 14, 1010, 1010), 140, stitch, width=9, dash=34, gap=24, inset=52)
    return img, register(dict(id="tpl-note", name="Note", poster="note", bg=plate, fg=fg, eye=fg,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Sticky-note yellow with a stitched border."))


def r_plaque():
    plate, fg, stitch = "#4f8f45", "#ffffff", "#eaf6df"
    img, d = new_canvas("#f4f9ef")
    rrect(d, (14, 14, 1010, 1010), 96, fill=plate)
    stitch_round(d, (14, 14, 1010, 1010), 96, stitch, width=9, dash=34, gap=24, inset=50)
    cl_leaf(d, 462, 58, 104, fg, ang=1.15)
    cl_leaf(d, 562, 58, 104, fg, ang=-1.15)
    circle(d, 512, 48, 18, fill=fg)
    return img, register(dict(id="tpl-plaque", name="Plaque", poster="plaque", bg=plate, fg=fg, eye=fg,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Garden-green plaque with a stitched edge."))


def r_globe():
    plate, fg, stitch = "#cfe3f4", "#0c2f4d", "#eef6fd"
    img, d = new_canvas("#eef6fd")
    circle(d, 512, 512, 452, fill=plate)
    dashed(d, circle_pts(512, 512, 396), stitch, 9, 34, 26)
    for i in range(12):
        a = 2 * math.pi * i / 12
        circle(d, 512 + 486 * math.cos(a), 512 + 486 * math.sin(a), 14, fill=plate)
    return img, register(dict(id="tpl-globe", name="Globe", poster="globe", bg=plate, fg=fg, eye=fg,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Sky-blue globe disc with white stitching."))


def r_seal():
    disk, inner, fg = "#c4453a", "#f7ecd9", "#9c2b1e"
    img, d = new_canvas(inner)
    for i in range(24):
        a = 2 * math.pi * i / 24
        circle(d, 512 + 462 * math.cos(a), 512 + 462 * math.sin(a), 52, fill=disk)
    circle(d, 512, 512, 468, fill=disk)
    circle(d, 512, 512, 398, fill=inner)
    dashed(d, circle_pts(512, 512, 358), disk, 7, 28, 22)
    return img, register(dict(id="tpl-seal", name="Seal", poster="seal", bg=inner, fg=fg, eye=fg,
                              module="extra-rounded", eyeShape="extra-rounded", ball="dot",
                              blurb="Wax-seal scallop with a cream centre."))


def r_badge():
    disk, inner, fg, ribbon, ribbon_ink = "#7c5cf0", "#efeaff", "#3c1e8f", "#2e1065", "#efeaff"
    img, d = new_canvas(inner)
    for i in range(22):
        a = 2 * math.pi * i / 22
        circle(d, 512 + 446 * math.cos(a), 512 + 446 * math.sin(a), 56, fill=disk)
    circle(d, 512, 512, 452, fill=disk)
    circle(d, 512, 512, 392, fill=inner)
    text_banner(d, 512, 946, 360, 74, "scan code", ribbon, ribbon_ink, size=40)
    return img, register(dict(id="tpl-badge", name="Badge", poster="badge", bg=inner, fg=fg, eye=fg,
                              module="extra-rounded", eyeShape="extra-rounded", ball="dot",
                              blurb="Purple rosette badge with a scan ribbon."))


def r_pentagon():
    plate, fg, stitch = "#b34a2f", "#fff4ec", "#fff4ec"
    img, d = new_canvas("#fff4ec")
    poly(d, regular_poly_pts(512, 542, 486, 5, rot=-math.pi / 2), fill=plate)
    dashed(d, regular_poly_pts(512, 542, 428, 5, rot=-math.pi / 2), stitch, 9, 32, 24)
    return img, register(dict(id="tpl-pentagon", name="Pentagon", poster="pentagon", bg=plate, fg=fg,
                              eye=fg, module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Coral pentagon with a light stitched QR."))


def r_hexagon():
    plate, fg, stitch = "#b0721a", "#fdf3e3", "#fdf3e3"
    img, d = new_canvas("#fdf3e3")
    poly(d, regular_poly_pts(512, 512, 502, 6, rot=math.pi / 2), fill=plate)
    dashed(d, regular_poly_pts(512, 512, 440, 6, rot=math.pi / 2), stitch, 9, 32, 24)
    return img, register(dict(id="tpl-hexagon", name="Hexagon", poster="hexagon", bg=plate, fg=fg,
                              eye=fg, module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Honey hexagon with a cream stitched QR."))


def r_diamond():
    plate, fg, stitch = "#6d4e93", "#ffffff", "#f6eefb"
    img, d = new_canvas("#f6eefb")
    R = 566
    poly(d, [(512, 512 - R), (512 + R, 512), (512, 512 + R), (512 - R, 512)], fill=plate)
    r = R - 72
    dashed(d, [(512, 512 - r), (512 + r, 512), (512, 512 + r), (512 - r, 512)], stitch, 9, 32, 24)
    return img, register(dict(id="tpl-diamond", name="Diamond", poster="diamond", bg=plate, fg=fg,
                              eye=fg, module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Mauve diamond with a pale stitched QR."))


def r_speech():
    plate, fg = "#2b7d74", "#e9f7f5"
    img, d = new_canvas("#e9f7f5")
    rrect(d, (16, 16, 1008, 848), 140, fill=plate)
    poly(d, [(220, 830), (430, 830), (286, 1010)], fill=plate)
    dashed(d, rounded_rect_pts((62, 62, 962, 786), 108), fg, 8, 32, 24)
    return img, register(dict(id="tpl-speech", name="Speech", poster="speech", bg=plate, fg=fg, eye=fg,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Teal speech bubble with a stitched rim."))


def r_arch():
    plate, panel, fg = "#8b6bd6", "#f3edff", "#4b2e9e"
    img, d = new_canvas(panel)
    d.pieslice([10, 10, 1014, 1014], 180, 360, fill=plate)
    rrect(d, (10, 512, 1014, 1014), 18, fill=plate)
    rrect(d, (138, 138, 886, 886), 62, fill=panel)
    dashed(d, rounded_rect_pts((174, 174, 850, 850), 46), plate, 8, 30, 22)
    return img, register(dict(id="tpl-arch", name="Arch", poster="arch", bg=panel, fg=fg, eye=fg,
                              module="rounded", eyeShape="extra-rounded", ball="dot",
                              blurb="Violet arch frame with a bright QR panel."))


def r_cup():
    plate, panel, fg = "#2f9e93", "#f0faf8", "#0e5a54"
    img, d = new_canvas(panel)
    circle(d, 930, 596, 148, fill=plate)
    circle(d, 930, 596, 76, fill=panel)
    poly(d, [(132, 342), (892, 342), (796, 1014), (228, 1014)], fill=plate)
    rrect(d, (110, 262, 914, 372), 54, fill=plate)
    rrect(d, (196, 424, 828, 880), 52, fill=panel)
    dashed(d, rounded_rect_pts((232, 458, 792, 846), 38), plate, 8, 30, 22)
    return img, register(dict(id="tpl-cup", name="Cup", poster="cup", bg=panel, fg=fg, eye=fg,
                              module="rounded", eyeShape="rounded", ball="dot", inset=0.22,
                              blurb="Tea-cup teal with a stitched QR panel."))


def r_bucket():
    plate, panel, fg, heart = "#3b7dd8", "#eef5fd", "#16447e", "#e2574c"
    img, d = new_canvas(panel)
    poly(d, [(244, 330), (780, 330), (700, 1014), (324, 1014)], fill=plate)
    rrect(d, (214, 252, 810, 362), 54, fill=plate)
    rrect(d, (270, 416, 754, 872), 50, fill=panel)
    dashed(d, rounded_rect_pts((306, 450, 718, 838), 36), plate, 8, 30, 22)
    cl_heart(d, 886, 168, 150, heart)
    return img, register(dict(id="tpl-bucket", name="Bucket", poster="bucket", bg=panel, fg=fg, eye=fg,
                              module="rounded", eyeShape="rounded", ball="dot", inset=0.22,
                              blurb="Blue bucket with a heart and stitched panel."))


def r_label():
    plate, panel, fg = "#2f9e93", "#eefaf8", "#0e5a54"
    img, d = new_canvas(panel)
    pts = [(340, 16), (1008, 16), (1008, 1008), (16, 1008), (16, 340)]
    poly(d, pts, fill=plate)
    circle(d, 204, 204, 58, fill=panel)
    rrect(d, (176, 240, 848, 856), 56, fill=panel)
    dashed(d, rounded_rect_pts((212, 276, 812, 820), 42), plate, 8, 30, 22)
    text_banner(d, 512, 936, 340, 68, "scan me", panel, plate, size=38)
    return img, register(dict(id="tpl-label", name="Label", poster="label", bg=panel, fg=fg, eye=fg,
                              module="rounded", eyeShape="rounded", ball="dot", inset=0.22,
                              blurb="Teal swing tag with a scan-me banner."))


def r_card():
    plate, panel, fg = "#3aa6a0", "#f2fbfa", "#114f4b"
    img, d = new_canvas(panel)
    rrect(d, (18, 18, 1006, 1006), 96, fill=plate)
    rrect(d, (140, 140, 884, 884), 60, fill=panel)
    dashed(d, rounded_rect_pts((176, 176, 848, 848), 44), plate, 8, 30, 22)
    text_banner(d, 512, 952, 340, 68, "scan me", panel, plate, size=38)
    for x, y in [(104, 104), (920, 104), (104, 920), (920, 920)]:
        cl_sparkle(d, x, y, 72, panel)
    return img, register(dict(id="tpl-card", name="Card", poster="card", bg=panel, fg=fg, eye=fg,
                              module="rounded", eyeShape="extra-rounded", ball="dot",
                              blurb="Teal card with a stitched panel and sparkles."))


def r_bracket():
    plate, fg, ink = "#f4f4f5", "#18181b", "#18181b"
    img, d = new_canvas(plate)
    for ox, oy, sx, sy in [(22, 22, 1, 1), (1002, 22, -1, 1), (22, 1002, 1, -1), (1002, 1002, -1, -1)]:
        x0 = ox if sx > 0 else ox - 168
        y0 = oy if sy > 0 else oy - 168
        d.rectangle([x0, y0, x0 + 168, y0 + 30], fill=ink)
        d.rectangle([x0, y0, x0 + 30, y0 + 168], fill=ink)
    text_banner(d, 812, 76, 300, 64, "scan code", ink, plate, size=36)
    return img, register(dict(id="tpl-bracket", name="Bracket", poster="bracket", bg=plate, fg=fg, eye=fg,
                              module="square", eyeShape="square", ball="square",
                              blurb="Corner-bracket monochrome with a scan tab."))


def r_scanme():
    plate, fg = "#f4f4f5", "#4b5563"
    img, d = new_canvas(plate)
    stitch_round(d, (18, 18, 1006, 1006), 84, "#c3c7cf", width=10, dash=38, gap=28, inset=36)
    text_banner(d, 512, 78, 420, 82, "SCAN ME", "#e4e4e7", "#27272a", size=48)
    return img, register(dict(id="tpl-scan-me", name="Scan Me", poster="scan-me", bg=plate, fg=fg, eye=fg,
                              module="square", eyeShape="square", ball="square",
                              blurb="Soft grey card with a SCAN ME banner."))


# ---- SCATTERS (decor strictly outside [184, 840]²) ------------------------

def scatter_bg(bg, fg):
    img, d = new_canvas(bg)
    return img, d, dict(bg=bg, fg=fg, eye=fg)


def r_music():
    img, d, c = scatter_bg("#ddd3f7", "#5b21b6")
    for x, y, s, a in [(86, 128, 132, -0.3), (938, 112, 140, 0.25), (90, 896, 136, 0.2),
                       (934, 884, 128, -0.25), (40, 512, 116, 0), (984, 512, 120, 0.15)]:
        cl_note(d, x, y, s, "#7c4ddb", ang=a)
    for x, y, s, a in [(178, 60, 74, 0.4), (852, 168, 66, -0.5), (180, 962, 70, -0.3),
                       (848, 952, 62, 0.5), (60, 268, 62, 0.2), (962, 748, 66, -0.2)]:
        cl_sparkle(d, x, y, s, "#a78bfa", ang=a)
    return img, register(dict(id="tpl-music", name="Music", poster="music", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Lavender field with floating music notes."))


def r_dotring():
    img, d, c = scatter_bg("#3aa89f", "#0b4f4a")
    cl_ring_of_dots(d, 512, 512, 462, "#e8f7f4", 24, 22)
    for x, y, s in [(88, 88, 52), (936, 88, 52), (88, 936, 52), (936, 936, 52)]:
        circle(d, x, y, s, fill="#e8f7f4")
    return img, register(dict(id="tpl-dot-ring", name="Dot Ring", poster="dot-ring", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Teal wreath of dots around the code."))


def r_ocean():
    img, d, c = scatter_bg("#dbeafe", "#1d4ed8")
    for y, col, amp in [(54, "#3b82f6", 0.075), (128, "#93c5fd", 0.05), (970, "#3b82f6", 0.075), (896, "#93c5fd", 0.05)]:
        cl_wave(d, 512, y, 1180, col, cycles=3.4, amp=amp)
    for x, y, s in [(84, 480, 92), (940, 560, 84)]:
        cl_sparkle(d, x, y, s, "#60a5fa")
    return img, register(dict(id="tpl-ocean", name="Ocean Blue", poster="ocean", **c,
                              module="dots", eyeShape="rounded", ball="dot",
                              blurb="Ocean-blue waves top and bottom."))


def r_snow():
    img, d, c = scatter_bg("#e0f2fe", "#0369a1")
    for x, y, s, a in [(84, 108, 216, 0.2), (940, 96, 196, -0.35), (88, 916, 202, -0.15),
                       (936, 904, 208, 0.35), (42, 512, 168, 0), (982, 512, 176, 0.25),
                       (512, 40, 172, 0.1), (512, 984, 164, -0.2)]:
        cl_snowflake(d, x, y, s, "#7dd3fc", ang=a)
    for x, y, s in [(218, 66, 64), (806, 72, 58), (222, 958, 60), (798, 952, 54)]:
        circle(d, x, y, s / 2, fill="#bae6fd")
    return img, register(dict(id="tpl-snowflakes", name="Snowflakes", poster="snowflakes", **c,
                              module="dots", eyeShape="extra-rounded", ball="dot",
                              blurb="Icy blue field with snowflake corners."))


def r_vintage():
    img, d, c = scatter_bg("#f7efdd", "#7c5c3c")
    for cx, cy, a in [(58, 58, 0), (966, 58, -math.pi / 2), (58, 966, math.pi / 2), (966, 966, math.pi)]:
        cl_flourish(d, cx, cy, 260, "#a37e52", ang=a)
    for x, y, s, a in [(512, 40, 92, 0), (512, 984, 88, math.pi), (40, 512, 86, math.pi / 2),
                       (984, 512, 86, -math.pi / 2)]:
        cl_flower(d, x, y, s, "#a37e52", center="#d9c49b", petals=5, ang=a)
    return img, register(dict(id="tpl-vintage", name="Vintage", poster="vintage", **c,
                              module="extra-rounded", eyeShape="rounded", ball="dot",
                              blurb="Warm cream with flourish corners."))


def r_spring():
    img, d, c = scatter_bg("#fbd3e2", "#be185d")
    for x, y, s, a in [(86, 112, 150, 0.4), (938, 100, 138, -0.3), (92, 912, 144, -0.4),
                       (932, 900, 132, 0.3), (512, 40, 128, 0), (512, 984, 122, 0.5)]:
        cl_flower(d, x, y, s, "#f472b6", center="#fde68a", petals=6, ang=a)
    for x, y, s, a in [(224, 62, 96, 0.5), (804, 70, 88, -0.5), (228, 958, 90, -0.3), (800, 950, 84, 0.4)]:
        cl_butterfly(d, x, y, s, "#db2777", ang=a)
    return img, register(dict(id="tpl-spring", name="Spring", poster="spring", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Blush pink with flowers and butterflies."))


def r_floral():
    img, d, c = scatter_bg("#ffe4e6", "#9d174d")
    for i in range(8):
        a = 2 * math.pi * i / 8 + 0.4
        x, y = 512 + 472 * math.cos(a), 512 + 472 * math.sin(a)
        cl_flower(d, x, y, 132, "#fb7185", center="#fecdd3", petals=7)
    for i in range(8):
        a = 2 * math.pi * i / 8 + 0.8
        x, y = 512 + 462 * math.cos(a), 512 + 462 * math.sin(a)
        cl_leaf(d, x, y, 84, "#fda4af", ang=a)
    return img, register(dict(id="tpl-floral", name="Floral", poster="floral", **c,
                              module="extra-rounded", eyeShape="rounded", ball="dot",
                              blurb="Rose garden ring around the code."))


def r_love():
    img, d, c = scatter_bg("#fdf2f8", "#be185d")
    for x, y, s, a in [(84, 106, 168, 0.25), (940, 94, 156, -0.2), (88, 918, 162, -0.25),
                       (936, 906, 148, 0.2), (512, 40, 140, 0), (512, 984, 132, 0.3)]:
        cl_heart(d, x, y, s, "#f43f5e", ang=a)
    for x, y in [(218, 66, ), (806, 72), (222, 958), (802, 952)]:
        cl_sparkle(d, x, y, 72, "#fb7185")
    return img, register(dict(id="tpl-love", name="Love", poster="love", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Soft pink with hearts all around."))


def r_summer():
    img, d, c = scatter_bg("#fff3e2", "#c2410c")
    cl_sun(d, 512, 70, 176, "#f59e0b")
    for y, col, amp in [(980, "#fb923c", 0.07), (912, "#fdba74", 0.05)]:
        cl_wave(d, 512, y, 1180, col, cycles=3.6, amp=amp)
    for x, y, s, a in [(82, 116, 128, 0.3), (942, 108, 118, -0.3), (84, 892, 122, -0.25), (940, 884, 112, 0.25)]:
        cl_sparkle(d, x, y, s, "#fbbf24", ang=a)
    return img, register(dict(id="tpl-summer", name="Summer", poster="summer", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Sunny peach with waves and sparkles."))


def r_autumn():
    img, d, c = scatter_bg("#f7f0df", "#b45309")
    for x, y, s, a in [(84, 108, 178, 0.5), (938, 96, 164, -0.4), (88, 916, 170, -0.55),
                       (932, 904, 156, 0.35), (512, 42, 146, 0.2), (512, 982, 138, -0.25)]:
        cl_maple(d, x, y, s, "#d97706", ang=a)
    for x, y, s, a in [(224, 68, 118, 1.1), (802, 76, 108, -1.0), (228, 954, 112, -1.2), (798, 946, 102, 0.9)]:
        cl_leaf(d, x, y, s, "#b45309", ang=a)
    return img, register(dict(id="tpl-autumn", name="Autumn", poster="autumn", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Warm cream with falling maple leaves."))


def r_halloween():
    img, d, c = scatter_bg("#151312", "#f59e0b")
    cl_pumpkin(d, 512, 70, 190, "#f09020", "#4c7a2d")
    cl_web(d, 1014, 10, 300, "#6b6258", ang=math.pi)
    cl_web(d, 10, 1014, 300, "#6b6258", ang=0)
    cl_bat(d, 108, 128, 150, "#8a7f72", ang=0.25)
    cl_bat(d, 916, 116, 132, "#8a7f72", ang=-0.2)
    for x, y, s in [(58, 430, 56), (968, 640, 50), (58, 720, 48), (964, 350, 52)]:
        circle(d, x, y, s / 2, fill="#f59e0b")
    cl_sparkle(d, 948, 932, 92, "#f59e0b")
    cl_sparkle(d, 76, 944, 82, "#f59e0b")
    return img, register(dict(id="tpl-halloween", name="Halloween", poster="halloween", **c,
                              module="square", eyeShape="square", ball="square",
                              blurb="Midnight black with pumpkins and cobwebs."))


def r_ramadan():
    img, d, c = scatter_bg("#131c33", "#ffd27a")
    cl_crescent(d, 512, 84, 190, "#f2c14e", "#131c33", ang=-0.6)
    for x, y, s, a in [(106, 138, 96, 0.2), (918, 126, 104, -0.3), (88, 884, 88, 0.4),
                       (932, 872, 92, -0.2), (512, 982, 96, 0), (58, 512, 80, 0), (966, 512, 82, 0)]:
        cl_star(d, x, y, s, "#f2c14e", ang=a)
    cl_lantern(d, 232, 66, 156, "#f2c14e", "#ffd27a")
    cl_lantern(d, 796, 62, 140, "#f2c14e", "#ffd27a")
    for x, y in [(196, 954), (828, 950)]:
        cl_sparkle(d, x, y, 74, "#ffd27a")
    return img, register(dict(id="tpl-ramadan", name="Ramadan", poster="ramadan", **c,
                              module="extra-rounded", eyeShape="extra-rounded", ball="dot",
                              blurb="Night blue with crescent, stars and lanterns."))


def r_nightsky():
    img, d, c = scatter_bg("#101a2e", "#ffd27a")
    cl_crescent(d, 512, 78, 180, "#f5d48c", "#101a2e", ang=-0.5)
    rnd = random.Random(7)
    for x, y, s, a in [(112, 142, 98, 0), (906, 128, 106, 0.3), (86, 886, 90, 0.2),
                       (922, 874, 94, -0.3), (512, 986, 86, 0), (58, 520, 72, 0), (962, 520, 74, 0)]:
        cl_star(d, x, y, s, "#f5d48c", ang=a)
    for i in range(30):
        x = rnd.uniform(24, 1000)
        y = rnd.choice([rnd.uniform(24, 160), rnd.uniform(864, 1000)])
        circle(d, x, y, rnd.uniform(5, 14), fill="#f5d48c")
    for x, y in [(204, 72), (820, 80), (208, 952), (816, 944)]:
        cl_sparkle(d, x, y, 76, "#f5d48c")
    return img, register(dict(id="tpl-night-sky", name="Night Sky", poster="night-sky", **c,
                              module="dots", eyeShape="extra-rounded", ball="dot",
                              blurb="Deep navy with moon and starlight."))


def r_nature():
    img, d, c = scatter_bg("#dcfce7", "#166534")
    for x, y, s, a in [(60, 110, 240, 1.2), (964, 100, 240, -1.9), (66, 914, 240, 1.9), (958, 904, 240, -1.2)]:
        cl_vine(d, x, y, s, "#4ade80", ang=a)
    for x, y, s, a in [(512, 42, 120, 0), (512, 982, 120, math.pi), (42, 512, 114, math.pi / 2),
                       (982, 512, 114, -math.pi / 2)]:
        cl_leaf(d, x, y, s, "#22c55e", ang=a)
    return img, register(dict(id="tpl-nature", name="Nature", poster="nature", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Fresh mint with leafy vine corners."))


def r_arrows():
    img, d, c = scatter_bg("#fbcfe8", "#be185d")
    for x, y, a in [(512, 62, math.pi / 2), (512, 962, -math.pi / 2),
                    (62, 512, 0), (962, 512, math.pi)]:
        cl_arrow(d, x, y, 168, "#db2777", ang=a)
    for x, y, s, a in [(150, 150, 88, 0.4), (874, 150, 78, -0.4), (150, 874, 82, -0.4), (874, 874, 74, 0.4)]:
        cl_sparkle(d, x, y, s, "#f472b6", ang=a)
    return img, register(dict(id="tpl-arrows", name="Arrows", poster="arrows", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Candy pink with arrows pointing to the code."))


def r_wedding():
    img, d, c = scatter_bg("#fdeef2", "#9d174d")
    for x, y, s, a in [(88, 110, 160, 0.2), (934, 98, 148, -0.25), (92, 912, 154, -0.2),
                       (930, 900, 142, 0.25), (512, 42, 132, 0), (512, 982, 126, 0.3)]:
        cl_heart(d, x, y, s, "#f43f5e", ang=a)
    for x, y in [(228, 78), (796, 84), (232, 942), (792, 936)]:
        cl_rings(d, x, y, 118, "#fb7185")
    for x, y in [(76, 512), (948, 512)]:
        cl_sparkle(d, x, y, 84, "#fecdd3")
    return img, register(dict(id="tpl-wedding", name="Wedding", poster="wedding", **c,
                              module="extra-rounded", eyeShape="extra-rounded", ball="dot",
                              blurb="Blush hearts and rings for the big day."))


def r_stars():
    img, d, c = scatter_bg("#e5e7eb", "#4b5563")
    for x, y, s, a in [(88, 110, 166, 0.3), (934, 98, 152, -0.25), (92, 910, 158, -0.3),
                       (930, 898, 144, 0.2), (512, 44, 138, 0.1), (512, 980, 130, -0.15)]:
        cl_star(d, x, y, s, "#d4a017", ang=a)
    for x, y, s, a in [(230, 82, 82, 0.5), (792, 90, 74, -0.5), (234, 942, 78, -0.4), (788, 934, 70, 0.45)]:
        cl_sparkle(d, x, y, s, "#eab308", ang=a)
    return img, register(dict(id="tpl-stars", name="Stars", poster="stars", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Silver grey with golden star sparkles."))


def r_christmas():
    img, d, c = scatter_bg("#d7f2df", "#14532d")
    for x, y, a in [(88, 106, 0.6), (936, 94, -0.9), (92, 916, 2.4), (932, 904, 3.7)]:
        cl_holly(d, x, y, 230, "#16a34a", "#dc2626", ang=a)
    for x, y in [(512, 48), (512, 976)]:
        cl_flower(d, x, y, 116, "#dc2626", center="#fca5a5", petals=5)
    for x, y, s in [(72, 512, 62), (952, 512, 62)]:
        cl_sparkle(d, x, y, s, "#16a34a")
    return img, register(dict(id="tpl-christmas", name="Christmas", poster="christmas", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Festive green with holly and berries."))


def r_birthday():
    img, d, c = scatter_bg("#ede9fe", "#7c3aed")
    for x, y, s, seed in [(96, 112, 240, 1), (928, 100, 230, 2), (100, 908, 234, 3), (924, 896, 224, 4)]:
        cl_confetti(d, x, y, s, ["#a78bfa", "#f472b6", "#fbbf24", "#60a5fa", "#34d399"], seed=seed)
    for x, y, a in [(512, 46, 0), (512, 982, math.pi), (46, 512, math.pi / 2), (982, 512, -math.pi / 2)]:
        cl_balloon(d, x, y, 140, "#a78bfa", "#7c3aed", ang=a)
    return img, register(dict(id="tpl-birthday", name="Birthday", poster="birthday", **c,
                              module="rounded", eyeShape="rounded", ball="dot",
                              blurb="Lavender party pop with confetti and balloons."))


RECIPES = [r_note, r_plaque, r_globe, r_seal, r_badge, r_pentagon, r_hexagon, r_diamond,
           r_speech, r_arch, r_cup, r_bucket, r_label, r_card, r_bracket, r_scanme,
           r_music, r_dotring, r_ocean, r_snow, r_vintage, r_spring, r_floral, r_love,
           r_summer, r_autumn, r_halloween, r_ramadan, r_nightsky, r_nature, r_arrows,
           r_wedding, r_stars, r_christmas, r_birthday]


def save(img, name):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"{name}.png")
    img.quantize(colors=96, method=Image.MEDIANCUT).save(path, optimize=True)
    return path


def contact_sheet(entries):
    os.makedirs(SHEETS, exist_ok=True)
    cols = 6
    rows = (len(entries) + cols - 1) // cols
    ts = 220
    sheet = Image.new("RGB", (cols * ts, rows * ts), "#222222")
    for i, (img, meta) in enumerate(entries):
        thumb = img.resize((ts - 10, ts - 10), Image.LANCZOS)
        sheet.paste(thumb, ((i % cols) * ts + 5, (i // cols) * ts + 5))
    sheet.save(os.path.join(SHEETS, "templates-contact.jpg"), quality=88)


def qa_composite(matrices_json):
    """Composite poster + real matrix the way renderCleanPhotoQr does and
    dump raw RGBA for the node-side jsQR harness. Mirrors qrInset + qz=8."""
    with open(matrices_json) as f:
        payloads = json.load(f)
    raw_dir = os.path.join(SHEETS, "template-raw")
    os.makedirs(raw_dir, exist_ok=True)
    for fn in RECIPES:
        img, meta = fn()
        inset = meta.get("inset", 0.18)
        for tag, m in payloads.items():
            comp = img.copy()
            d = ImageDraw.Draw(comp)
            size = m["size"]
            qz = 8
            total = size + 2 * qz
            side = S * (1 - 2 * inset)
            cell = side / total
            origin = S * inset + qz * cell
            data = m["data"]
            for y in range(size):
                for x in range(size):
                    if data[y][x]:
                        x0 = origin + x * cell
                        y0 = origin + y * cell
                        d.rectangle([x0, y0, x0 + cell, y0 + cell], fill=meta["fg"])
            # finder plates + eyes
            for ex, ey in [(0, 0), (size - 7, 0), (0, size - 7)]:
                ox, oy = origin + ex * cell, origin + ey * cell
                d.rectangle([ox - cell, oy - cell, ox + 8 * cell, oy + 8 * cell], fill=meta["bg"])
                d.rectangle([ox, oy, ox + 7 * cell, oy + 7 * cell], fill=meta["eye"])
                d.rectangle([ox + cell, oy + cell, ox + 6 * cell, oy + 6 * cell], fill=meta["bg"])
                d.rectangle([ox + 2 * cell, oy + 2 * cell, ox + 5 * cell, oy + 5 * cell], fill=meta["eye"])
            raw = comp.convert("RGBA").tobytes()
            with open(os.path.join(raw_dir, f"{meta['poster']}--{tag}.raw"), "wb") as f:
                f.write(raw)
    print(f"composited {len(RECIPES) * len(payloads)} scan previews -> {raw_dir}")


def main():
    if "--qa" in sys.argv:
        idx = sys.argv.index("--qa")
        qa_composite(sys.argv[idx + 1] if len(sys.argv) > idx + 1 else "sheets/template-matrices.json")
        return
    entries = []
    for fn in RECIPES:
        img, meta = fn()
        save(img, meta["poster"])
        entries.append((img, meta))
        print("wrote", meta["id"], meta["poster"])
    contact_sheet(entries)
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(MANIFEST, f, indent=1)
    print(f"\n{len(entries)} posters -> {OUT}")
    print(f"contact sheet -> {os.path.join(SHEETS, 'templates-contact.jpg')}")


if __name__ == "__main__":
    main()
