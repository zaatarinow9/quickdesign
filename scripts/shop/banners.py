"""
Breite Bilder für Slider und Kategorie-Banner (2400 × 1000), aus denselben Flat-Lays wie die Produktbilder.
Aufruf: python3 scripts/shop/banners.py  → public/shop/banner-*.webp
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import mockups as m  # noqa: E402

BW, BH = 2400, 1000


def wide_surface(tint="#ece8e0"):
    base = m.hex2rgb(tint)
    img = np.ones((BH, BW, 3), np.float32) * base
    n = m.blur(np.random.default_rng(3).standard_normal((BH, BW)).astype(np.float32), 0.8)
    n /= n.std() + 1e-6
    yy, xx = np.mgrid[0:BH, 0:BW].astype(np.float32)
    light = 1.03 - 0.08 * (((xx / BW) - 0.45) ** 2 + ((yy / BH) - 0.3) ** 2)
    return np.clip(img * light[..., None] + n[..., None] * 0.01, 0, 1)


def put(canvas, col, mask, cx, cy, size, angle):
    """Kleidungsstück (S×S) gedreht und skaliert auf das breite Bild setzen – mit Schatten"""
    M = cv2.getRotationMatrix2D((m.S / 2, m.S / 2), angle, size / m.S)
    M[0, 2] += cx - m.S / 2
    M[1, 2] += cy - m.S / 2
    c = cv2.warpAffine(col, M, (BW, BH), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_REPLICATE)
    a = cv2.warpAffine(mask, M, (BW, BH), flags=cv2.INTER_AREA)
    sh = m.blur(cv2.warpAffine(a, np.float32([[1, 0, 10], [0, 1, 18]]), (BW, BH)), 22) * 0.26
    canvas = canvas * (1 - np.clip(sh, 0, 0.8))[..., None]
    return canvas * (1 - a[..., None]) + c * a[..., None]


def save(img, name):
    out = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(m.OUT, f"{name}.webp"), quality=82, method=6)
    print("  ✓", name)


def garments(specs, name, tint="#ece8e0"):
    canvas = wide_surface(tint)
    for i, (kind, fabric, design, cx, cy, size, angle) in enumerate(specs):
        col, mask, _ = m.garment(kind, fabric, design, seed=40 + i)
        canvas = put(canvas, col, mask, cx, cy, size, angle)
    save(canvas, name)


def center_wide(src, name, tint="#ece8e0", scale=1.0):
    """Quadratisches Bild mittig auf breiten Untergrund setzen, Ränder weich auslaufen lassen"""
    im = np.asarray(Image.open(os.path.join(m.OUT, f"{src}.webp")).convert("RGB"), np.float32) / 255
    side = int(BH * scale)
    im = cv2.resize(im, (side, side), interpolation=cv2.INTER_AREA)
    canvas = wide_surface(tint)
    # Untergrundfarbe an das Bild angleichen
    edge = np.concatenate([im[:20].reshape(-1, 3), im[-20:].reshape(-1, 3)]).mean(0)
    canvas *= (edge / canvas.reshape(-1, 3).mean(0))[None, None, :]
    x0, y0 = (BW - side) // 2, (BH - side) // 2
    yy, xx = np.mgrid[0:side, 0:side].astype(np.float32)
    f = 160.0
    w = np.clip(np.minimum.reduce([xx, side - 1 - xx]) / f, 0, 1)
    w = (w * w * (3 - 2 * w))[..., None]
    region = canvas[max(0, y0):y0 + side, x0:x0 + side]
    sub = im[max(0, -y0):max(0, -y0) + region.shape[0]]
    canvas[max(0, y0):y0 + side, x0:x0 + side] = region * (1 - w[: region.shape[0]]) + sub * w[: region.shape[0]]
    save(canvas, name)


def crop_wide(src, name, cy=0.5, zoom=1.0):
    im = np.asarray(Image.open(os.path.join(m.OUT, f"{src}.webp")).convert("RGB"), np.float32) / 255
    h, w = im.shape[:2]
    cw = int(w / zoom)
    ch = int(cw * BH / BW)
    x0 = (w - cw) // 2
    y0 = int(np.clip(cy * h - ch / 2, 0, h - ch))
    save(cv2.resize(im[y0:y0 + ch, x0:x0 + cw], (BW, BH), interpolation=cv2.INTER_CUBIC), name)


if __name__ == "__main__":
    # Slider 1: drei T-Shirts nebeneinander
    garments(
        [
            ("tshirt", "#1d1d1f", "motiv-flagge-light", 560, 520, 1150, 8),
            ("tshirt", "#f4f2ed", "motiv-hurriya-dark", 1200, 500, 1200, -3),
            ("tshirt", "#1f3b2d", "motiv-siegel-light", 1840, 520, 1150, -8),
        ],
        "banner-tshirts",
    )
    # Hoodies
    garments(
        [
            ("hoodie", "#1d1d1f", "motiv-wahid-light", 820, 520, 1150, 6),
            ("hoodie", "#d8ccb4", "motiv-flagge-dark", 1580, 520, 1150, -6),
        ],
        "banner-hoodies",
    )
    # Fahnen & Banner, Sticker aus vorhandenen Bildern
    center_wide("fahne", "banner-fahnen", scale=1.15)
    center_wide("sticker", "banner-sticker", scale=1.1)
