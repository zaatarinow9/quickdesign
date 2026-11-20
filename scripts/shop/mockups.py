"""
Fotorealistische Produktbilder (Flat-Lay) für den Shop – ohne Fremdfotos, frei von Bildrechten.
Stoff, Falten, Licht, Nähte und Schatten werden prozedural erzeugt, das Motiv wird in den Stoff „gedruckt“.

Aufruf:
  python3 scripts/shop/designs.py && node scripts/shop/render-designs.cjs && python3 scripts/shop/mockups.py
Ausgabe: public/shop/*.webp

TODO(Inhaber): Sobald echte Fotos der gedruckten Muster vorliegen, einfach die Dateien in public/shop/ ersetzen.
"""
import math
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
DESIGNS = os.path.join(HERE, ".build", "designs")
OUT = os.path.join(ROOT, "public", "shop")

S = 2000  # Arbeitsauflösung (quadratisch)
WEB = 1200  # Ausgabegröße
rng = np.random.default_rng(812)


# ----------------------------------------------------------------------------- Hilfsfunktionen

def hex2rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


def blur(a, s):
    if s <= 0:
        return a
    k = int(s * 6) | 1
    return cv2.GaussianBlur(a, (k, k), s)


def noise(shape, sigma, seed=None):
    g = np.random.default_rng(seed) if seed is not None else rng
    n = g.standard_normal(shape).astype(np.float32)
    n = blur(n, sigma)
    return n / (n.std() + 1e-6)


def bezier(p0, p1, p2, p3, n=40):
    t = np.linspace(0, 1, n)[:, None]
    p0, p1, p2, p3 = map(np.array, (p0, p1, p2, p3))
    return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t ** 2 * p2 + t ** 3 * p3


def path(segments, scale):
    """segments: Liste von Punkten (Linie) oder 4-Tupeln (Bezier) im 1000er-Raster"""
    pts = []
    for seg in segments:
        if len(seg) == 4 and isinstance(seg[0], tuple):
            pts.extend(bezier(*seg).tolist())
        else:
            pts.append(seg)
    return [(x * scale, y * scale) for x, y in pts]


def mirror(segments):
    """Spiegelt eine linke Kontur an x=500 und hängt sie rückwärts an (geschlossene Form)"""
    def m(p):
        return (1000 - p[0], p[1])

    out = list(segments)
    for seg in reversed(segments):
        if len(seg) == 4 and isinstance(seg[0], tuple):
            out.append(tuple(m(p) for p in reversed(seg)))
        else:
            out.append(m(seg))
    return out


def poly_mask(points, size=S, blur_px=1.2):
    img = Image.new("L", (size, size), 0)
    ImageDraw.Draw(img).polygon(points, fill=255)
    return blur(np.asarray(img, np.float32) / 255.0, blur_px)


def line_mask(points, width, size=S, blur_px=1.0):
    img = Image.new("L", (size, size), 0)
    ImageDraw.Draw(img).line(points, fill=255, width=int(width), joint="curve")
    return blur(np.asarray(img, np.float32) / 255.0, blur_px)


def dashed(points, width, dash=14, gap=9, size=S):
    img = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(img)
    pts = np.array(points, np.float32)
    seg_len = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg_len)])
    total = cum[-1]
    s = 0.0
    while s < total:
        e = min(s + dash, total)
        a = np.array([np.interp(s, cum, pts[:, 0]), np.interp(s, cum, pts[:, 1])])
        b = np.array([np.interp(e, cum, pts[:, 0]), np.interp(e, cum, pts[:, 1])])
        d.line([tuple(a), tuple(b)], fill=255, width=int(width))
        s += dash + gap
    return blur(np.asarray(img, np.float32) / 255.0, 0.7)


def ridge(shape, p0, p1, width, amp):
    """Weiche Falte entlang einer Strecke"""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    p0, p1 = np.array(p0, np.float32), np.array(p1, np.float32)
    d = p1 - p0
    L2 = float(d @ d)
    t = np.clip(((xx - p0[0]) * d[0] + (yy - p0[1]) * d[1]) / L2, 0, 1)
    px, py = p0[0] + t * d[0], p0[1] + t * d[1]
    dist = np.sqrt((xx - px) ** 2 + (yy - py) ** 2)
    taper = np.clip(np.sin(np.pi * t), 0, 1) ** 0.7
    return amp * np.exp(-((dist / width) ** 2)) * taper


def shade_from_height(H, strength=1.0, light=(-0.45, -0.65, 0.62)):
    gy, gx = np.gradient(H)
    n = np.dstack([-gx * strength, -gy * strength, np.ones_like(H)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    L = np.array(light, np.float32)
    L /= np.linalg.norm(L)
    lam = (n @ L).astype(np.float32)
    flat = L[2]
    return lam / flat, n


def surface(kind="paper", tint="#ece7de"):
    """Hintergrund: Papier / Leinen mit weichem Licht"""
    base = hex2rgb(tint)
    img = np.ones((S, S, 3), np.float32) * base
    fine = noise((S, S), 0.8) * 0.010 + noise((S, S), 3) * 0.005 + noise((S, S), 90) * 0.006
    if kind == "linen":
        fine += blur(rng.standard_normal((S, 1)).astype(np.float32) * np.ones((1, S), np.float32), 0.6) * 0.006
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S
    light = 1.03 - 0.10 * ((xx - 0.35) ** 2 + (yy - 0.25) ** 2)
    return np.clip(img * light[..., None] + fine[..., None], 0, 1)


def drop_shadow(bg, mask, soft=22, contact=5, off=(10, 16), amount=(0.30, 0.32)):
    M = np.float32([[1, 0, off[0]], [0, 1, off[1]]])
    m1 = cv2.warpAffine(mask, M, (S, S))
    sh = blur(m1, soft) * amount[0] + blur(cv2.warpAffine(mask, np.float32([[1, 0, 2], [0, 1, 4]]), (S, S)), contact) * amount[1]
    return bg * (1 - np.clip(sh, 0, 0.85))[..., None]


def place_fit(design, cx, top, maxw, maxh, size=None):
    """Motiv auf Inhalt zuschneiden und in Box (zentriert, oben bündig) einpassen → (Ebene, Box)"""
    size = size or S
    a = design[..., 3]
    ys, xs = np.where(a > 0.02)
    d = design[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    sc = min(maxw / d.shape[1], maxh / d.shape[0])
    w, h = int(d.shape[1] * sc), int(d.shape[0] * sc)
    d = cv2.resize(d, (w, h), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((size, size, 4), np.float32)
    x0, y0 = int(cx - w / 2), int(top)
    canvas[y0:y0 + h, x0:x0 + w] = d
    return canvas, (x0, y0, x0 + w, y0 + h)


def load_design(name):
    im = Image.open(os.path.join(DESIGNS, f"{name}.png")).convert("RGBA")
    return np.asarray(im, np.float32) / 255.0


def place(design, box, size=S):
    """Motiv in ein Rechteck (x, y, w) setzen, Seitenverhältnis bleibt"""
    x, y, w = box
    h = int(design.shape[0] * w / design.shape[1])
    d = cv2.resize(design, (int(w), h), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((size, size, 4), np.float32)
    x0, y0 = int(x), int(y)
    canvas[y0:y0 + h, x0:x0 + int(w)] = d[: size - y0, : size - x0]
    return canvas


def remap(img, dx, dy):
    h, w = dx.shape
    xx, yy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(img, xx + dx, yy + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)


def save(img, name, size=WEB):
    os.makedirs(OUT, exist_ok=True)
    out = cv2.resize(np.clip(img, 0, 1), (size, size), interpolation=cv2.INTER_AREA)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(OUT, f"{name}.webp"), quality=84, method=6)
    print("  ✓", name)


# ----------------------------------------------------------------------------- Textilien

K = S / 1000.0

TEE_LEFT = [
    (500, 156),
    ((500, 156), (468, 156), (440, 152), (406, 144)),  # Kragen hinten
    ((406, 144), (360, 154), (304, 170), (262, 188)),  # Schulter
    ((262, 188), (214, 226), (166, 292), (124, 372)),  # Ärmel oben
    ((124, 372), (150, 394), (180, 412), (212, 428)),  # Ärmelsaum
    ((212, 428), (240, 404), (270, 384), (298, 370)),  # Ärmel unten
    ((298, 370), (304, 520), (300, 700), (296, 890)),  # Seite
    ((296, 890), (380, 897), (440, 899), (500, 899)),  # Saum
]
HOOD_LEFT = [
    (500, 40),
    ((500, 40), (432, 40), (380, 78), (376, 150)),  # Kapuze
    ((376, 150), (376, 166), (380, 176), (384, 182)),
    ((384, 182), (330, 196), (280, 208), (236, 222)),  # Schulter
    ((236, 222), (180, 320), (120, 450), (78, 580)),  # Ärmel außen
    ((78, 580), (104, 596), (132, 606), (160, 612)),  # Bündchen
    ((160, 612), (200, 520), (240, 440), (282, 382)),  # Ärmel innen
    ((282, 382), (286, 540), (286, 700), (284, 852)),  # Seite
    ((284, 852), (380, 858), (440, 860), (500, 860)),  # Bund
]


def fabric_render(H, base_hex, mask, extra_dark=None):
    dark = hex2rgb(base_hex).mean() < 0.35
    shade, _ = shade_from_height(H, 1.0)
    base = hex2rgb(base_hex)
    knit = noise((S, S), 0.55) * 0.6 + noise((S, S), 1.3) * 0.4
    resp = 1.5 if dark else 0.9
    col = base * (1 + (shade[..., None] - 1) * resp)
    if dark:
        col += np.clip(shade[..., None] - 1, 0, None) * 0.08 + 0.015
    col *= 1 + knit[..., None] * (0.05 if dark else 0.022)
    dist = cv2.distanceTransform((mask > 0.5).astype(np.uint8), cv2.DIST_L2, 5).astype(np.float32)
    col *= (1 - 0.14 * np.exp(-dist / 6.0))[..., None]
    return col, shade, knit, dark


def garment(kind, fabric_hex, design_name=None, seed=1, view="front"):
    global rng
    rng = np.random.default_rng(seed)
    left = TEE_LEFT if kind == "tshirt" else HOOD_LEFT
    outline = path(mirror(left), K)
    mask = poly_mask(outline)

    # --- Höhenfeld: gerundete Kanten, wenige weiche Falten
    dist = cv2.distanceTransform((mask > 0.5).astype(np.uint8), cv2.DIST_L2, 5).astype(np.float32)
    H = np.sqrt(np.clip(dist / 26.0, 0, 1)) * 7
    H += noise((S, S), 110) * 1.6 + noise((S, S), 45) * 0.45
    if kind == "tshirt":
        folds = [((560, 740), (900, 860), 70, 3.2), ((1440, 740), (1100, 860), 70, 3.2),
                 ((640, 1620), (1360, 1640), 110, 2.2), ((620, 1220), (820, 1300), 60, 1.8),
                 ((1380, 1180), (1200, 1320), 60, 2.0), ((330, 520), (430, 760), 40, 2.6),
                 ((1670, 520), (1570, 760), 40, 2.6), ((610, 400), (720, 460), 36, 1.6),
                 ((1390, 400), (1280, 460), 36, 1.6)]
    else:
        folds = [((560, 820), (900, 940), 80, 3.2), ((1440, 820), (1100, 940), 80, 3.2),
                 ((640, 1460), (1360, 1480), 110, 2.0), ((380, 760), (300, 1100), 46, 3.0),
                 ((1620, 760), (1700, 1100), 46, 3.0)]
    for p0, p1, w, a in folds:
        H += ridge((S, S), p0, p1, w, a)

    seams = []
    if kind == "tshirt":
        arm = path([((262, 188), (286, 250), (298, 312), (298, 370))], K)
    else:
        arm = path([((236, 222), (258, 280), (276, 330), (282, 382))], K)
    seams += [arm, [(S - x, y) for x, y in arm]]
    for sm in seams:
        H -= line_mask(sm, 8, blur_px=4) * 2.5

    col, shade, knit, dark = fabric_render(H, fabric_hex, mask)
    seam_tone = 1.10 if dark else 0.88

    if kind == "tshirt" and view == "back":
        # Rückseite: schmales Kragenbündchen oben, keine Innenseite
        neck = [((406, 144), (440, 152), (468, 156), (500, 156)), ((500, 156), (532, 156), (560, 152), (594, 144))]
        band = poly_mask(path(neck + [((594, 144), (590, 160), (560, 168), (500, 170)), ((500, 170), (440, 168), (410, 160), (406, 144))], K), blur_px=1)
        ribs = (np.sin(np.arange(S, dtype=np.float32) * 1.2)[None, :] * 0.5 + 0.5)
        col *= (1 + band * (0.02 - ribs * 0.05))[..., None]
        col *= (1 - line_mask(path([((410, 162), (440, 168), (470, 171), (500, 171)), ((500, 171), (530, 171), (560, 168), (590, 162))], K), 3, blur_px=1.5) * 0.2)[..., None]
        stitches = [path([(298, 872), (500, 880), (702, 872)], K), path([(298, 862), (500, 870), (702, 862)], K),
                    path([(132, 360), (220, 414)], K), path([(868, 360), (780, 414)], K),
                    path([((412, 176), (440, 181), (470, 184), (500, 184)), ((500, 184), (530, 184), (560, 181), (588, 176))], K)]
        print_box = (500 * K, 236 * K, 400 * K, 440 * K)
    elif kind == "tshirt":
        # Kragen: hinten sichtbares Bündchen, Innenseite, vorderes Bündchen, Etikett
        back_band_low = [((410, 146), (440, 164), (470, 172), (500, 172)), ((500, 172), (530, 172), (560, 164), (590, 146))]
        front_in = [((590, 146), (572, 200), (536, 222), (500, 222)), ((500, 222), (464, 222), (428, 200), (410, 146))]
        inside = poly_mask(path(back_band_low + front_in, K), blur_px=1.4)
        col *= (1 - inside * (0.55 if dark else 0.30))[..., None]
        col *= (1 - blur(inside, 10) * 0.10)[..., None]
        band = poly_mask(path([((404, 150), (428, 228), (468, 250), (500, 250)), ((500, 250), (532, 250), (572, 228), (596, 150))]
                              + list(reversed(front_in)), K), blur_px=1)
        band = np.clip(band - inside, 0, 1)
        ribs = (np.sin(np.arange(S, dtype=np.float32) * 1.2)[None, :] * 0.5 + 0.5)
        col *= (1 + band * (0.03 - ribs * 0.045))[..., None]
        col *= (1 - line_mask(path([((404, 150), (428, 228), (468, 250), (500, 250)), ((500, 250), (532, 250), (572, 228), (596, 150))], K), 4, blur_px=2) * 0.18)[..., None]
        col *= (1 - line_mask(path(back_band_low, K), 3, blur_px=1.5) * 0.25)[..., None]
        lab = poly_mask(path([(482, 176), (518, 176), (517, 200), (483, 200)], K), blur_px=0.8)
        col = col * (1 - lab[..., None]) + lab[..., None] * hex2rgb("#e7e2d6") * 0.9
        stitches = [path([(298, 872), (500, 880), (702, 872)], K), path([(298, 862), (500, 870), (702, 862)], K),
                    path([(132, 360), (220, 414)], K), path([(868, 360), (780, 414)], K),
                    path([((412, 160), (434, 232), (470, 256), (500, 256)), ((500, 256), (530, 256), (566, 232), (588, 160))], K)]
        print_box = (500 * K, 262 * K, 390 * K, 390 * K)
    elif view == "back":
        # Hoodie von hinten: Kapuze liegt flach, Mittelnaht, kein Beutel, keine Kordeln
        col *= (1 - line_mask(path([(500, 42), (500, 200)], K), 5, blur_px=2) * 0.28)[..., None]
        hood_edge = path([((380, 170), (420, 196), (460, 206), (500, 208)), ((500, 208), (540, 206), (580, 196), (620, 170))], K)
        col *= (1 - blur(line_mask(hood_edge, 14, blur_px=3), 6) * 0.22)[..., None]
        sh3, _ = shade_from_height(blur(poly_mask(path([(380, 60), (620, 60), (620, 200), (380, 200)], K), blur_px=2), 30) * 4, 1.0)
        col *= (1 + (sh3[..., None] - 1) * 0.5)
        for poly in ([(78, 580), (160, 612), (174, 576), (94, 546)], [(922, 580), (840, 612), (826, 576), (906, 546)],
                     [(284, 852), (716, 852), (716, 796), (286, 796)]):
            rm = poly_mask(path(poly, K), blur_px=1.5)
            ribs = (np.sin(np.arange(S, dtype=np.float32) * 0.85)[None, :] * 0.5 + 0.5)
            col *= (1 - rm * (0.03 + ribs * 0.06))[..., None]
            col *= (1 - line_mask(path(poly[2:4], K), 4, blur_px=2) * 0.22)[..., None]
        stitches = [path([(300, 790), (700, 790)], K)]
        print_box = (500 * K, 282 * K, 400 * K, 440 * K)
    else:
        face = [((404, 176), (420, 230), (462, 276), (500, 282)), ((500, 282), (538, 276), (580, 230), (596, 176)),
                ((596, 176), (580, 128), (540, 108), (500, 106)), ((500, 106), (460, 108), (420, 128), (404, 176))]
        fm = poly_mask(path(face, K), blur_px=2.5)
        grad = np.clip((np.mgrid[0:S, 0:S][0].astype(np.float32) / K - 106) / 176, 0, 1)
        col *= (1 - fm * (0.42 if dark else 0.34) * (1 - grad * 0.5))[..., None]
        col *= (1 - line_mask(path(face[:2], K), 10, blur_px=4) * 0.2)[..., None]
        col *= (1 - line_mask(path([(500, 40), (500, 106)], K), 4, blur_px=2) * 0.3)[..., None]
        for poly in ([(78, 580), (160, 612), (174, 576), (94, 546)], [(922, 580), (840, 612), (826, 576), (906, 546)],
                     [(284, 852), (716, 852), (716, 796), (286, 796)]):
            rm = poly_mask(path(poly, K), blur_px=1.5)
            ribs = (np.sin(np.arange(S, dtype=np.float32) * 0.85)[None, :] * 0.5 + 0.5)
            col *= (1 - rm * (0.03 + ribs * 0.06))[..., None]
            col *= (1 - line_mask(path(poly[2:4], K), 4, blur_px=2) * 0.22)[..., None]
        # Kängurutasche
        pocket = path([(340, 600), (660, 600), (700, 784), (300, 784)], K)
        pm = poly_mask(pocket, blur_px=2)
        sh2, _ = shade_from_height(blur(pm, 7) * 5, 1.2)
        col *= (1 + (sh2[..., None] - 1) * 0.7)
        for a, b in (((340, 600), (300, 784)), ((660, 600), (700, 784))):
            col *= (1 - line_mask(path([a, b], K), 12, blur_px=5) * 0.28)[..., None]
        stitches = [path([(344, 612), (656, 612)], K), path([(300, 790), (700, 790)], K)]
        print_box = (500 * K, 352 * K, 300 * K, 232 * K)

    for st in stitches:
        col *= (1 + (seam_tone - 1) * dashed(st, 3.0, 12, 8))[..., None]

    # --- Druck (Plastisol/DTF): folgt den Falten, leichte Stoffstruktur
    if design_name:
        pr, pbox = place_fit(load_design(design_name), *print_box)
        gy, gx = np.gradient(H)
        pr = remap(pr, gx * 2.0, gy * 2.0)
        a = pr[..., 3] * mask * np.clip(0.93 + knit * 0.05, 0, 1)
        ink = pr[..., :3] * (1 + (shade[..., None] - 1) * 0.85) * (1 + knit[..., None] * 0.025)
        col = col * (1 - a[..., None]) + ink * a[..., None]

    # --- Kordeln (Hoodie) über dem Druck
    if kind == "hoodie" and view == "front":
        for (x0, y0, x1, y1, bend) in ((468, 262, 458, 322, -6), (532, 262, 544, 314, 7)):
            cord = path([((x0, y0), (x0 + bend, y0 + 70), (x1 - bend, y1 - 80), (x1, y1))], K)
            col *= (1 - blur(line_mask([(x + 9, y + 12) for x, y in cord], 16), 7) * 0.35)[..., None]
            cm = line_mask(cord, 16, blur_px=1.2)
            core = blur(line_mask([(x - 2, y - 2) for x, y in cord], 5, blur_px=1), 3)
            ccol = hex2rgb("#ece7dc") * (0.72 + 0.45 * np.clip(core * 1.5, 0, 1))[..., None]
            col = col * (1 - cm[..., None]) + ccol * cm[..., None]
            tip = poly_mask(path([(x1 - 9, y1 - 6), (x1 + 9, y1 - 6), (x1 + 8, y1 + 42), (x1 - 8, y1 + 42)], K), blur_px=1)
            col = col * (1 - tip[..., None]) + tip[..., None] * hex2rgb("#cfc9bd") * 0.8
            ring = np.zeros((S, S), np.float32)
            cv2.circle(ring, (int(x0 * K), int((y0 - 6) * K)), int(12 * K), 1, int(5 * K))
            ring = blur(ring, 1)
            col = col * (1 - ring[..., None]) + ring[..., None] * hex2rgb("#a9a59c")
    return np.clip(col, 0, 1), mask, (pbox if design_name else None)


def print_area(kind, view):
    """Druckbereich in Prozent des Bildes (für die Live-Vorschau im Shop) – ohne Drehung, Zoom 0.92"""
    boxes = {("tshirt", "front"): (500, 262, 390, 390), ("tshirt", "back"): (500, 236, 400, 440),
             ("hoodie", "front"): (500, 352, 300, 232), ("hoodie", "back"): (500, 282, 400, 440)}
    cx, top, w, h = boxes[(kind, view)]
    z = 0.92
    off = (1 - z) / 2 * 1000
    return {"x": round((off + (cx - w / 2) * z) / 10, 2), "y": round((off + top * z) / 10, 2), "w": round(w * z / 10, 2), "h": round(h * z / 10, 2)}


def blank_shot(kind, fabric, name, view="front", bg="#ece8e0", seed=7):
    """Rohling ohne Motiv, gerade gelegt – Grundlage für die Live-Vorschau"""
    col, mask, _ = garment(kind, fabric, None, seed, view)
    back = surface("linen", bg)
    back = drop_shadow(back, mask, soft=26, contact=5, off=(8, 14), amount=(0.22, 0.30))
    out = back * (1 - mask[..., None]) + col * mask[..., None]
    out = zoom(out, 0.92, bg)
    save(out, name)


def product_shot(kind, fabric, design, name, seed=1, bg="#ece8e0", angle=-6.0):
    col, mask, pbox = garment(kind, fabric, design, seed)
    # Nahaufnahme des Motivs (ungedreht, volle Auflösung)
    back = surface("linen", bg)
    flat = drop_shadow(back, mask, soft=26, contact=5, off=(8, 14), amount=(0.22, 0.30))
    flat = flat * (1 - mask[..., None]) + col * mask[..., None]
    if pbox:
        x0, y0, x1, y1 = pbox
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        half = max(x1 - x0, y1 - y0) * 0.66
        a, b = int(max(0, cx - half)), int(max(0, cy - half))
        crop = flat[b:int(min(S, cy + half)), a:int(min(S, cx + half))]
        save(cv2.resize(crop, (S, S), interpolation=cv2.INTER_CUBIC), f"{name}-detail")
    # Hauptbild: leicht gedreht, natürlich gelegt
    M = cv2.getRotationMatrix2D((S / 2, S / 2), angle, 1.04)
    col_r = cv2.warpAffine(col, M, (S, S), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    mask_r = cv2.warpAffine(mask, M, (S, S), flags=cv2.INTER_LINEAR)
    back = surface("linen", bg)
    back = drop_shadow(back, mask_r, soft=30, contact=5, off=(14, 22), amount=(0.24, 0.30))
    out = back * (1 - mask_r[..., None]) + col_r * mask_r[..., None]
    save(out, name)


def zoom(img, f, bg="#ece8e0"):
    small = cv2.resize(img, (int(S * f), int(S * f)), interpolation=cv2.INTER_AREA)
    canvas = surface("linen", bg)
    o = (S - small.shape[0]) // 2
    canvas[o:o + small.shape[0], o:o + small.shape[1]] = small
    # weicher Übergang am Rand des verkleinerten Bildes
    return canvas


# ----------------------------------------------------------------------------- Fahne

def flag_shot(name="fahne", bg="#ebe6dc", W=1400, x0=360, y0=430, pole_r=18, pole_top=300, knob=True):
    global rng
    rng = np.random.default_rng(5)
    d = load_design("fahne")
    Hh = int(W * 2 / 3)
    flag = cv2.resize(d, (W, Hh), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((S, S, 4), np.float32)
    canvas[y0:y0 + Hh, x0:x0 + W] = flag
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    u = np.clip((xx - x0) / W, 0, 1.2)
    wave = (np.sin(u * 2 * np.pi * 1.6 - 0.6) * 38 + np.sin(u * 2 * np.pi * 3.1 + 1) * 10) * (u ** 0.9)
    dy = -wave
    dx = -np.sin(u * 2 * np.pi * 1.6 - 0.6) * 14 * u
    warped = remap(canvas, dx, dy)
    hgt = np.cos(u * 2 * np.pi * 1.6 - 0.6) * (u ** 0.9) * 1.0 + np.cos(u * 2 * np.pi * 3.1 + 1) * 0.35 * u
    shade = 1 + hgt * 0.22
    shade = remap(shade[..., None].repeat(1, 2), dx, dy) if False else shade
    a = warped[..., 3]
    weave = noise((S, S), 0.7) * 0.025
    sheen = np.clip(hgt, 0, None) ** 3 * 0.10
    col = warped[..., :3] * (shade[..., None]) * (1 + weave[..., None]) + sheen[..., None]
    back = surface("paper", bg)
    back = drop_shadow(back, a, soft=40, off=(30, 60), amount=(0.22, 0.0))
    out = back * (1 - a[..., None]) + np.clip(col, 0, 1) * a[..., None]
    # Mast
    px = x0 - pole_r - 8
    pole = np.zeros((S, S), np.float32)
    pole[pole_top:1900, px - pole_r:px + pole_r] = 1
    pole = blur(pole, 1.2)
    cyl = np.clip(np.cos((np.arange(S, dtype=np.float32) - px) / pole_r * 1.3), 0, 1)
    pcol = hex2rgb("#8a6a43")[None, None, :] * (0.55 + 0.6 * cyl[None, :, None]) + (cyl[None, :, None] ** 12) * 0.25
    back2 = drop_shadow(out, pole, soft=14, off=(18, 10), amount=(0.25, 0.0))
    out = back2 * (1 - pole[..., None]) + pcol * pole[..., None]
    if knob:
        kn = np.zeros((S, S), np.float32)
        cv2.circle(kn, (px, pole_top - 4), int(pole_r * 1.55), 1, -1)
        kn = blur(kn, 1.2)
        out = out * (1 - kn[..., None]) + kn[..., None] * hex2rgb("#c9a24f") * 1.05
    save(out, name)


def flag_wall_shot(name="fahne-gross"):
    """Große Fahne mit Ösen an der Wand"""
    global rng
    rng = np.random.default_rng(13)
    d = load_design("fahne")
    W = 1760
    Hh = int(W * 2 / 3)
    f = cv2.resize(d, (W, Hh), interpolation=cv2.INTER_AREA)[..., :3]
    wall = surface("paper", "#e9e5dd")
    wall *= (1 + noise((S, S), 2) * 0.02 + noise((S, S), 12) * 0.015)[..., None]
    x0, y0 = (S - W) // 2, (S - Hh) // 2
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    u = np.clip((xx - x0) / W, 0, 1)
    v = np.clip((yy - y0) / Hh, 0, 1)
    # leichte Stofffalten zwischen den Aufhängepunkten
    hgt = np.sin(u * np.pi * 6) * 0.6 * (v ** 1.3) + np.sin(v * np.pi * 3 + u * 2) * 0.25
    dy = hgt * 6
    canvas = np.zeros((S, S, 3), np.float32)
    canvas[y0:y0 + Hh, x0:x0 + W] = f
    mask = np.zeros((S, S), np.float32)
    mask[y0:y0 + Hh, x0:x0 + W] = 1
    canvas = remap(canvas, np.zeros_like(dy), dy)
    mask = blur(remap(mask, np.zeros_like(dy), dy), 1)
    gy, gx = np.gradient(hgt)
    shade = 1 + (gx * 40 + gy * 20) * 0.5
    weave = noise((S, S), 0.7) * 0.02
    col = canvas * shade[..., None] * (1 + weave[..., None])
    wall = drop_shadow(wall, mask, soft=24, off=(12, 20), amount=(0.26, 0.2))
    out = wall * (1 - mask[..., None]) + np.clip(col, 0, 1) * mask[..., None]
    for ex, ey in [(x0 + 36, y0 + 36), (x0 + W // 2, y0 + 36), (x0 + W - 36, y0 + 36)]:
        ring = np.zeros((S, S), np.float32)
        cv2.circle(ring, (ex, ey), 17, 1, 7)
        ring = blur(ring, 0.8)
        hole = np.zeros((S, S), np.float32)
        cv2.circle(hole, (ex, ey), 11, 1, -1)
        out = out * (1 - hole[..., None]) + hole[..., None] * hex2rgb("#cfc9be") * 0.85
        metal = 0.62 + 0.38 * np.clip(-((xx - ex) + (yy - ey)) / 24, -1, 1)
        out = out * (1 - ring[..., None]) + ring[..., None] * (hex2rgb("#c4c4c0") * metal[..., None])
    save(out, name)


def crop_detail(src, name, box):
    """Quadratische Nahaufnahme aus einem fertigen Bild (box: Mitte x, Mitte y, Kantenlänge – Anteile 0–1)"""
    im = np.asarray(Image.open(os.path.join(OUT, f"{src}.webp")).convert("RGB"), np.float32) / 255
    h, w = im.shape[:2]
    cx, cy, size = box
    x0, y0 = int((cx - size / 2) * w), int((cy - size / 2) * h)
    x1, y1 = x0 + int(size * w), y0 + int(size * h)
    save(cv2.resize(im[y0:y1, x0:x1], (S, S), interpolation=cv2.INTER_CUBIC), name)


# ----------------------------------------------------------------------------- Banner

def banner_shot(name="banner"):
    global rng
    rng = np.random.default_rng(7)
    d = load_design("banner")
    W = 1760
    Hh = int(d.shape[0] * W / d.shape[1])
    b = cv2.resize(d, (W, Hh), interpolation=cv2.INTER_AREA)[..., :3]
    # Wand (heller Putz)
    wall = surface("paper", "#e9e5dd")
    wall *= (1 + noise((S, S), 2) * 0.02 + noise((S, S), 12) * 0.015)[..., None]
    x0, y0 = (S - W) // 2, (S - Hh) // 2 - 40
    mask = np.zeros((S, S), np.float32)
    mask[y0:y0 + Hh, x0:x0 + W] = 1
    mask = blur(mask, 1)
    canvas = np.zeros((S, S, 3), np.float32)
    canvas[y0:y0 + Hh, x0:x0 + W] = b
    # Durchhängen zwischen Ösen
    xx = np.arange(S, dtype=np.float32)
    u = np.clip((xx - x0) / W, 0, 1)
    sag = np.sin(u * np.pi * 4) ** 2 * 1.0
    shade = 1 - 0.05 * np.abs(np.cos(u * np.pi * 4))[None, :] * np.ones((S, 1), np.float32)
    shade *= 1 + (noise((S, S), 60) * 0.015)
    gloss = np.exp(-(((np.arange(S, dtype=np.float32)[:, None] - (y0 + Hh * 0.25)) / 120) ** 2)) * 0.05
    col = canvas * shade[..., None] + gloss[..., None]
    wall = drop_shadow(wall, mask, soft=26, off=(14, 26), amount=(0.28, 0.2))
    out = wall * (1 - mask[..., None]) + np.clip(col, 0, 1) * mask[..., None]
    # Ösen + Kabelbinder
    for i in range(5):
        ex = int(x0 + 40 + i * (W - 80) / 4)
        for ey in (y0 + 38, y0 + Hh - 38):
            ring = np.zeros((S, S), np.float32)
            cv2.circle(ring, (ex, ey), 17, 1, 7)
            ring = blur(ring, 0.8)
            hole = np.zeros((S, S), np.float32)
            cv2.circle(hole, (ex, ey), 11, 1, -1)
            out = out * (1 - hole[..., None]) + hole[..., None] * hex2rgb("#cfc9be") * 0.85
            yy, xx2 = np.mgrid[0:S, 0:S].astype(np.float32)
            metal = 0.62 + 0.38 * np.clip(-((xx2 - ex) + (yy - ey)) / 24, -1, 1)
            out = out * (1 - ring[..., None]) + ring[..., None] * (hex2rgb("#c4c4c0") * metal[..., None])
    save(out, name)


# ----------------------------------------------------------------------------- Folie (Heckscheibe)

def foil_shot(name="folie", design="folie", W=1100, top=760, vinyl_hex="#f4f4f2"):
    global rng
    rng = np.random.default_rng(9)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    # Lack (Silbergrau)
    paint = np.ones((S, S, 3), np.float32) * hex2rgb("#c8ccd0")
    paint *= (0.92 + 0.12 * np.clip(1 - yy / S, 0, 1))[..., None]
    paint += (np.exp(-(((xx - 600) / 500) ** 2 + ((yy - 300) / 120) ** 2)) * 0.12)[..., None]
    # Scheibe (Trapez mit Rundung)
    glass_pts = [(470, 470), (1530, 470), (1800, 1420), (200, 1420)]
    gm = poly_mask(glass_pts, blur_px=1)
    gm = np.clip((blur(gm, 60) - 0.5) * 6 + 0.5, 0, 1)
    gm = blur(gm, 1.2)
    glass = np.ones((S, S, 3), np.float32) * hex2rgb("#1e262d") + (np.clip(1 - (yy - 470) / 700, 0, 1) ** 2 * 0.16)[..., None] * hex2rgb("#c9d6e2")
    refl = np.clip(np.sin((xx + yy * 0.6) / 260) * 0.5 + 0.2, 0, 1) * 0.07 + np.exp(-(((xx - yy * 0.5 - 600) / 160) ** 2)) * 0.10
    glass += refl[..., None]
    glass *= (0.85 + 0.25 * (1 - yy / S))[..., None]
    # Siebdruck-Rand (Punktraster)
    dist = cv2.distanceTransform((gm > 0.5).astype(np.uint8), cv2.DIST_L2, 5).astype(np.float32)
    frit = (dist < 60).astype(np.float32)
    dots = ((np.sin(xx / 7) * np.sin(yy / 7)) > (dist / 110) - 0.2).astype(np.float32) * (dist < 110)
    fr = np.clip(blur(frit + dots, 0.8), 0, 1)
    glass = glass * (1 - fr[..., None]) + fr[..., None] * hex2rgb("#0b0c0d")
    out = paint * (1 - gm[..., None]) + glass * gm[..., None]
    # Folienbeschriftung
    d = load_design(design)
    pr = place(d, ((S - W) // 2, top, W))
    a = pr[..., 3] * np.clip(gm * 1.2, 0, 1)
    vinyl = hex2rgb(vinyl_hex) * (0.9 + refl[..., None] * 0.8) + np.clip(refl[..., None] - 0.05, 0, None) * 0.6
    out = out * (1 - a[..., None]) + vinyl * a[..., None]
    # Gummidichtung
    edge = np.clip(blur(gm, 3) - blur(gm, 14), 0, 1) * 2
    out *= (1 - np.clip(edge, 0, 0.5))[..., None]
    save(out, name)


# ----------------------------------------------------------------------------- Sticker

def sticker_layer(out, mask_acc, name, cx, cy, w, rot):
    d = load_design(name)
    h = int(d.shape[0] * w / d.shape[1])
    st = cv2.resize(d, (w, h), interpolation=cv2.INTER_AREA)
    canvas = np.zeros((S, S, 4), np.float32)
    canvas[cy - h // 2:cy - h // 2 + h, cx - w // 2:cx - w // 2 + w] = st
    M = cv2.getRotationMatrix2D((cx, cy), rot, 1)
    canvas = cv2.warpAffine(canvas, M, (S, S))
    a = canvas[..., 3]
    out = drop_shadow(out, a, soft=10, contact=2, off=(6, 10), amount=(0.22, 0.25))
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    gloss = np.exp(-((((xx - cx) + (yy - cy)) / (w * 0.5) - 0.3) ** 2) * 3) * 0.10
    col = canvas[..., :3] * (0.97 + noise((S, S), 0.7)[..., None] * 0.006) + gloss[..., None]
    return out * (1 - a[..., None]) + np.clip(col, 0, 1) * a[..., None]


def sticker_shot(name="sticker"):
    global rng
    rng = np.random.default_rng(11)
    out = surface("paper", "#ece7dd")
    for n, cx, cy, w, r in (
        ("sticker-fahne", 640, 640, 760, 8),
        ("sticker-siegel", 1360, 700, 700, -10),
        ("sticker-acht", 700, 1380, 640, -6),
        ("sticker-hurriya", 1380, 1380, 660, 12),
    ):
        out = sticker_layer(out, None, n, cx, cy, w, r)
    save(out, name)


# ----------------------------------------------------------------------------- Ablauf

TEXTILES = [
    # (Bildname, Art, Stofffarbe, Motiv)
    ("tshirt-flagge-schwarz", "tshirt", "#1d1d1f", "motiv-flagge-light"),
    ("tshirt-flagge-weiss", "tshirt", "#f4f2ed", "motiv-flagge-dark"),
    ("tshirt-hurriya-weiss", "tshirt", "#f4f2ed", "motiv-hurriya-dark"),
    ("tshirt-hurriya-schwarz", "tshirt", "#1d1d1f", "motiv-hurriya-light"),
    ("tshirt-siegel-schwarz", "tshirt", "#1d1d1f", "motiv-siegel-light"),
    ("tshirt-siegel-gruen", "tshirt", "#4b5133", "motiv-siegel-light"),
    ("tshirt-acht-weiss", "tshirt", "#f4f2ed", "motiv-acht-dark"),
    ("tshirt-acht-schwarz", "tshirt", "#1d1d1f", "motiv-acht-light"),
    ("tshirt-jasmin-weiss", "tshirt", "#f4f2ed", "motiv-jasmin-dark"),
    ("tshirt-jasmin-sand", "tshirt", "#d8ccb4", "motiv-jasmin-dark"),
    ("tshirt-flagge-gruen", "tshirt", "#4b5133", "motiv-flagge-light"),
    ("tshirt-hurriya-gruen", "tshirt", "#4b5133", "motiv-hurriya-light"),
    ("tshirt-acht-gruen", "tshirt", "#4b5133", "motiv-acht-light"),
    ("tshirt-jasmin-gruen", "tshirt", "#4b5133", "motiv-jasmin-light"),
    ("tshirt-siegel-weiss", "tshirt", "#f4f2ed", "motiv-siegel-dark"),
    ("hoodie-wahid-schwarz", "hoodie", "#1d1d1f", "motiv-wahid-light"),
    ("hoodie-wahid-gruen", "hoodie", "#4b5133", "motiv-wahid-light"),
    ("hoodie-wahid-weiss", "hoodie", "#f4f2ed", "motiv-wahid-dark"),
    ("hoodie-flagge-weiss", "hoodie", "#f4f2ed", "motiv-flagge-dark"),
    ("hoodie-flagge-gruen", "hoodie", "#4b5133", "motiv-flagge-light"),
    ("hoodie-flagge-schwarz", "hoodie", "#1d1d1f", "motiv-flagge-light"),
    ("hoodie-flagge-sand", "hoodie", "#d8ccb4", "motiv-flagge-dark"),
]

if __name__ == "__main__":
    only = sys.argv[1:]
    for i, (n, k, f, d) in enumerate(TEXTILES):
        if not only or n in only:
            product_shot(k, f, d, n, seed=i + 1, angle=(-7, 6, -5, 7, -6, 5, -8)[i % 7])
    if not only or "fahne" in only:
        flag_shot()
        flag_shot("fahne-hand", W=1000, x0=640, y0=560, pole_r=8, pole_top=470, knob=False)
        flag_wall_shot()
    if not only or "banner" in only:
        banner_shot()
    if not only or "folie" in only:
        foil_shot()
    if not only or "sticker" in only:
        sticker_shot()
    if not only or "blanks" in only:
        for kind in ("tshirt", "hoodie"):
            for cid, hexv in (("schwarz", "#1d1d1f"), ("weiss", "#f4f2ed"), ("gruen", "#4b5133")):
                for view in ("front", "back"):
                    blank_shot(kind, hexv, f"blank-{kind}-{cid}-{view}", view)
    if not only or "nisr" in only:
        foil_shot("folie-nisr-gold", design="nisr-gold", W=820, top=640, vinyl_hex="#bca475")
        foil_shot("folie-nisr-weiss", design="nisr-weiss", W=820, top=640)
        crop_detail("folie-nisr-gold", "folie-nisr-gold-detail", (0.5, 0.5, 0.5))
        crop_detail("folie-nisr-weiss", "folie-nisr-weiss-detail", (0.5, 0.5, 0.5))
    if not only or "details" in only:
        crop_detail("banner", "banner-detail", (0.62, 0.5, 0.42))
        crop_detail("folie", "folie-detail", (0.5, 0.5, 0.56))
