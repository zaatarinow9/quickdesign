"""
Rohlinge für den Gestalter aus den gelieferten Produktfotos (schwarz):
  T-Shirt (Rundhals), Polo, Hoodie (mit Kapuze), Sweatshirt (ohne Kapuze)
  je Farbe schwarz / weiß / olivgrün, je Ansicht vorne / hinten.

- Freistellen auf weißem Grund, Falten aus der Helligkeit übernehmen
- Umfärben über die Schattierung (keine flache Farbe)
- Rückseite: Knopfleiste (Polo), Kordeln + Tasche (Hoodie), Etikett entfernen

python3 scripts/shop/garments.py
"""
from pathlib import Path

import cv2
import numpy as np

SRC = Path(__file__).resolve().parents[2] / "design/shop/garments"
OUT = Path(__file__).resolve().parents[2] / "public/shop/garments"
OUT.mkdir(parents=True, exist_ok=True)
SIZE = 1200
BG = np.array([244, 243, 240], np.float32)  # warmes Hellgrau (RGB)

COLORS = {
    "schwarz": None,
    "weiss": np.array([243, 241, 236], np.float32),
    "gruen": np.array([78, 84, 54], np.float32),
}

# Bereiche (in % des Bildes) für die Rückseite, die übermalt werden
BACK_FIX = {
    "tshirt": [("bright", (48, 4, 64, 14))],
    "polo": [("rect", (46.5, 6, 54.5, 30)), ("bright", (50, 2, 62, 12))],
    "hoodie": [("rect", (41, 17, 59, 44)), ("rect", (34, 8, 66, 20)), ("pocket", (28, 55, 67, 82))],
    "sweat": [],
}


def load(name):
    img = cv2.imread(str(SRC / f"{name}.png"), cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (SIZE, SIZE), interpolation=cv2.INTER_LANCZOS4)
    return img


def garment_mask(img):
    """Kleidungsstück freistellen: nicht-weiße Pixel; nur kleine Löcher füllen (Achselspalten bleiben frei)"""
    diff = 255 - img.min(axis=2).astype(np.int16)
    m = (diff > 22).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    bg = (1 - m).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(bg, connectivity=4)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 1500:
            m[lab == i] = 1
    soft = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)
    return m, soft


def pct(box):
    x0, y0, x1, y1 = box
    return int(x0 / 100 * SIZE), int(y0 / 100 * SIZE), int(x1 / 100 * SIZE), int(y1 / 100 * SIZE)


def make_back(img, mask, kind):
    """Details der Vorderseite entfernen (Inpainting auf dem schwarzen Foto)"""
    fix = np.zeros(mask.shape, np.uint8)
    lum = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.int16)
    for mode, box in BACK_FIX[kind]:
        x0, y0, x1, y1 = pct(box)
        region = lum[y0:y1, x0:x1]
        if mode == "rect":
            fix[y0:y1, x0:x1] = 1
        elif mode == "bright":
            med = np.median(lum[mask > 0])
            fix[y0:y1, x0:x1] = (region > med + 18).astype(np.uint8)
        elif mode == "strings":
            med = np.median(lum[mask > 0])
            sel = (region > med + 10).astype(np.uint8)
            fix[y0:y1, x0:x1] = sel
        elif mode == "pocket":
            # Nähte der Tasche: alles, was sich deutlich vom geglätteten Stoff abhebt
            blur = cv2.GaussianBlur(lum.astype(np.float32), (0, 0), 9)
            edge = np.abs(lum - blur)[y0:y1, x0:x1] > 4
            fix[y0:y1, x0:x1] |= edge.astype(np.uint8)
    fix = cv2.dilate(fix, np.ones((7, 7), np.uint8)) & mask
    if fix.any():
        # Hintergrund vorher mit Stofffarbe füllen, damit kein Weiß hineinläuft
        img = img.copy()
        img[mask == 0] = np.median(img[mask > 0], axis=0).astype(np.uint8)
        bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        bgr = cv2.inpaint(bgr, fix * 255, 9, cv2.INPAINT_TELEA)
        img = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        # Übermalte Stelle leicht an die Stoffstruktur angleichen
        if kind == "hoodie":
            x0, y0, x1, y1 = pct((28, 55, 67, 82))
            img[y0:y1, x0:x1] = cv2.GaussianBlur(img[y0:y1, x0:x1], (0, 0), 1.5)
    return img


def recolor(img, mask, soft, color):
    f = img.astype(np.float32)
    if color is None:
        out = f
    else:
        lum = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
        vals = lum[mask > 0]
        lo, hi = np.percentile(vals, 1), np.percentile(vals, 99.5)
        s = np.clip((lum - lo) / max(hi - lo, 1), 0, 1)
        # Falten betonen, Mitte ruhig halten
        s = np.clip(0.5 + (s - np.median(s[mask > 0])) * 1.6, 0, 1)
        if color.mean() > 200:  # Weiß: deutlichere Falten, damit das Stück vom Grund abhebt
            shade = 0.70 + 0.34 * s
        else:  # Farben: kräftigere Plastizität
            shade = 0.62 + 0.62 * s
        out = np.clip(color[None, None, :] * shade[..., None], 0, 255)
        # Feines Gewebe aus dem Original
        detail = (lum - cv2.GaussianBlur(lum, (0, 0), 2)) * (0.6 if color.mean() > 200 else 1.0)
        out = np.clip(out + detail[..., None], 0, 255)
    # feine Kontur (Kanten minimal abdunkeln) – wichtig bei Weiß
    rim = soft - cv2.GaussianBlur(cv2.erode(soft, np.ones((5, 5), np.uint8)), (0, 0), 2.5)
    out = out * (1 - np.clip(rim, 0, 1)[..., None] * (0.16 if color is not None and color.mean() > 200 else 0.06))
    comp = BG[None, None, :] * (1 - soft[..., None]) + out * soft[..., None]
    # weicher Bodenschatten
    sh = cv2.GaussianBlur(soft, (0, 0), 18)
    sh = np.roll(sh, 14, axis=0)
    comp = comp * (1 - 0.10 * sh[..., None] * (1 - soft[..., None]))
    return comp.astype(np.uint8)


def save(img, name):
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    cv2.imwrite(str(OUT / f"{name}.webp"), bgr, [cv2.IMWRITE_WEBP_QUALITY, 88])
    print("  ✓", name)


if __name__ == "__main__":
    for kind in ["tshirt", "polo", "hoodie", "sweat"]:
        front = load(kind)
        mask, soft = garment_mask(front)
        back = make_back(front, mask, kind)
        for cid, col in COLORS.items():
            save(recolor(front, mask, soft, col), f"{kind}-{cid}-front")
            save(recolor(back, mask, soft, col), f"{kind}-{cid}-back")
