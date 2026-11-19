"""
Druckmotive der Kollektion 8.12. als SVG (Quelle für Druck und Produktbilder).
Aufruf: python3 scripts/shop/designs.py  → design/shop/*.svg
Schrift: Thmanyah Sans (src/app/shop/fonts). Für den Druck Texte in Pfade umwandeln.
"""
import math, os

OUT = os.path.join(os.path.dirname(__file__), "..", "..", "design", "shop")
GREEN, RED, BLACK, WHITE = "#007a3d", "#ce1126", "#111111", "#ffffff"
INK = {"light": "#f3efe6", "dark": "#151515"}
FONT = "'Thmanyah Sans', sans-serif"


def star(cx, cy, r, rot=-90):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.4
        a = math.radians(rot + i * 36)
        pts.append(f"{cx + rr * math.cos(a):.2f},{cy + rr * math.sin(a):.2f}")
    return "M" + "L".join(pts) + "Z"


def stars(cx, cy, r, gap):
    return "".join(f'<path d="{star(cx + (i - 1) * gap, cy, r)}" fill="{RED}"/>' for i in range(3))


def flag(x, y, w, keyline=None, kw=4):
    h = w * 2 / 3
    t = h / 3
    s = (
        f'<rect x="{x}" y="{y}" width="{w}" height="{t + 0.5}" fill="{GREEN}"/>'
        f'<rect x="{x}" y="{y + t}" width="{w}" height="{t + 0.5}" fill="{WHITE}"/>'
        f'<rect x="{x}" y="{y + 2 * t}" width="{w}" height="{t}" fill="{BLACK}"/>'
        + stars(x + w / 2, y + 1.5 * t, t * 0.36, w * 0.2)
    )
    if keyline:
        s += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="{keyline}" stroke-width="{kw}"/>'
    return s


def text(x, y, s, size, weight=700, fill=BLACK, ls=0, anchor="middle", extra=""):
    return (
        f'<text x="{x}" y="{y}" font-family="{FONT}" font-size="{size}" font-weight="{weight}" fill="{fill}" '
        f'text-anchor="{anchor}" letter-spacing="{ls}" {extra}>{s}</text>'
    )


def svg(w, h, body, label):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img" aria-label="{label}">{body}</svg>\n'


# ------------------------------------------------------------------ Brustmotive (1000×1000)

def d_flagge(tone):
    ink = INK[tone]
    b = flag(230, 200, 540, keyline=ink, kw=5)
    b += text(500, 720, "8.12.2024", 74, 700, ink, 14)
    b += text(500, 815, "عامان من الحرية", 60, 500, ink)
    return svg(1000, 1000, b, "Fahne der Revolution, 8.12.2024")


def d_siegel(tone):
    ink = INK[tone]
    b = f'<circle cx="500" cy="500" r="400" fill="none" stroke="{ink}" stroke-width="7"/>'
    b += f'<circle cx="500" cy="500" r="318" fill="none" stroke="{ink}" stroke-width="2.5"/>'
    b += '<defs><path id="top" d="M 150 500 A 350 350 0 0 1 850 500"/><path id="bot" d="M 128 500 A 372 372 0 0 0 872 500"/></defs>'
    b += f'<text font-family="{FONT}" font-size="46" font-weight="700" fill="{ink}" letter-spacing="10"><textPath href="#top" startOffset="50%" text-anchor="middle">FREE SYRIA · 8 DECEMBER 2024</textPath></text>'
    b += f'<text font-family="{FONT}" font-size="44" font-weight="500" fill="{ink}"><textPath href="#bot" startOffset="50%" text-anchor="middle">الذكرى الثانية للتحرير</textPath></text>'
    b += stars(500, 360, 30, 82)
    b += text(500, 560, "سوريا حرة", 150, 900, ink)
    b += f'<line x1="400" y1="610" x2="600" y2="610" stroke="{ink}" stroke-width="3"/>'
    b += text(500, 680, "2024 — 2026", 44, 500, ink, 6)
    for a in (180, 0):
        x = 500 + 350 * math.cos(math.radians(a))
        b += f'<circle cx="{x:.1f}" cy="500" r="9" fill="{ink}"/>'
    return svg(1000, 1000, b, "Siegel Freies Syrien")


def d_acht(tone):
    ink = INK[tone]
    b = stars(500, 210, 34, 96)
    b += text(500, 640, "8.12", 400, 900, ink, -8)
    b += f'<rect x="250" y="700" width="500" height="6" fill="{GREEN}"/>'
    b += text(500, 790, "الثامن من كانون الأول", 62, 700, ink)
    b += text(500, 870, "TAG DER BEFREIUNG · 2024", 38, 500, ink, 10)
    return svg(1000, 1000, b, "8.12 – Tag der Befreiung")


def petal(r):
    return f"M0,0 C{r*.42:.1f},{-r*.3:.1f} {r*.36:.1f},{-r*.92:.1f} 0,{-r:.1f} C{-r*.36:.1f},{-r*.92:.1f} {-r*.42:.1f},{-r*.3:.1f} 0,0Z"


def flower(cx, cy, r, rot, ink, fill):
    s = f'<g transform="translate({cx},{cy}) rotate({rot})">'
    for i in range(5):
        s += f'<path d="{petal(r)}" transform="rotate({i*72}) skewX(-8)" fill="{fill}" stroke="{ink}" stroke-width="4" stroke-linejoin="round"/>'
    s += f'<circle r="{r*0.13:.1f}" fill="{ink}"/></g>'
    return s


def leaf(cx, cy, l, w, rot, ink):
    return (
        f'<g transform="translate({cx},{cy}) rotate({rot})"><path d="M0,0 Q{w},{-l/2} 0,{-l} Q{-w},{-l/2} 0,0Z" '
        f'fill="none" stroke="{ink}" stroke-width="4" stroke-linejoin="round"/><path d="M0,-4 L0,{-l*0.85}" stroke="{ink}" stroke-width="2.5"/></g>'
    )


def d_jasmin(tone):
    ink = INK[tone]
    fill = "none"
    b = f'<path d="M330,640 C420,560 560,520 700,330" fill="none" stroke="{ink}" stroke-width="5" stroke-linecap="round"/>'
    b += f'<path d="M520,520 C560,500 620,500 680,520" fill="none" stroke="{ink}" stroke-width="4" stroke-linecap="round"/>'
    b += f'<path d="M430,585 C420,520 430,460 470,400" fill="none" stroke="{ink}" stroke-width="4" stroke-linecap="round"/>'
    for (x, y, l, w, r) in [(380, 610, 120, 34, -60), (470, 560, 110, 30, 150), (600, 460, 120, 34, -40), (640, 410, 100, 28, 140), (560, 500, 90, 26, 30), (440, 470, 90, 26, -10)]:
        b += leaf(x, y, l, w, r, ink)
    for (x, y, r, rot) in [(700, 320, 78, 10), (470, 395, 62, 40), (690, 525, 58, 70), (330, 650, 48, 20)]:
        b += flower(x, y, r, rot, ink, fill)
    for (x, y) in [(760, 400), (540, 340)]:
        b += f'<g transform="translate({x},{y}) rotate(30)"><path d="M0,0 C12,-10 12,-40 0,-52 C-12,-40 -12,-10 0,0Z" fill="none" stroke="{ink}" stroke-width="4"/></g>'
    b += text(500, 820, "ياسمين الشام", 92, 700, ink)
    b += text(500, 895, "DAMASKUS · 8.12.2024", 36, 500, ink, 10)
    return svg(1000, 1000, b, "Jasmin von Damaskus")


def d_wahid(tone):
    ink = INK[tone]
    b = ""
    for i, op in enumerate((1, 1, 1)):
        b += text(500, 300 + i * 170, "واحد", 190, 900, ink, extra=f'opacity="{op}"')
    b += f'<rect x="330" y="690" width="340" height="22" fill="{GREEN}"/><rect x="330" y="712" width="340" height="22" fill="{WHITE}"/><rect x="330" y="734" width="340" height="22" fill="{BLACK}"/>'
    b += f'<rect x="330" y="690" width="340" height="66" fill="none" stroke="{ink}" stroke-width="3"/>'
    b += stars(500, 723, 8, 34)
    b += text(500, 850, "الشعب السوري واحد", 70, 700, ink)
    return svg(1000, 1000, b, "Wahid, wahid, wahid")


def d_hurriya(tone):
    ink = INK[tone]
    b = stars(500, 250, 30, 86)
    b += text(500, 620, "حرية", 360, 900, ink)
    b += text(500, 760, "FREIHEIT · FREEDOM", 40, 500, ink, 12)
    b += text(500, 840, "8.12.2024", 52, 700, ink, 8)
    return svg(1000, 1000, b, "Hurriya – Freiheit")


# ------------------------------------------------------------------ Druckprodukte

def p_fahne():
    return svg(1500, 1000, flag(0, 0, 1500), "Fahne der syrischen Revolution")


def p_banner():
    w, h = 3000, 800
    b = f'<rect width="{w}" height="{h}" fill="#ffffff"/>'
    b += f'<rect width="{w}" height="26" fill="{GREEN}"/><rect y="{h-26}" width="{w}" height="26" fill="{BLACK}"/>'
    b += flag(2260, 190, 600)
    b += text(2120, 420, "سوريا حرة", 300, 900, BLACK, anchor="end")
    b += text(2120, 560, "الذكرى الثانية للتحرير · 8.12.2024", 92, 500, "#333333", anchor="end")
    b += text(140, 640, "ZWEI JAHRE FREIES SYRIEN", 64, 700, GREEN, 10, anchor="start")
    return svg(w, h, b, "Banner Freies Syrien")


def p_folie():
    w, h = 1800, 600
    ink = "#f5f5f5"
    b = stars(900, 120, 44, 120).replace(RED, ink)
    b += text(900, 400, "سوريا حرة", 280, 900, ink)
    b += text(900, 540, "8.12.2024", 92, 700, ink, 18)
    return svg(w, h, b, "Folie Syria Hurra")


def sticker_round():
    b = '<circle cx="500" cy="500" r="490" fill="#ffffff"/><circle cx="500" cy="500" r="455" fill="#0f3d2b"/>'
    return svg(1000, 1000, b + d_siegel("light").split(">", 1)[1].rsplit("</svg>", 1)[0], "Sticker Siegel")


def sticker_flag():
    b = '<rect x="0" y="0" width="1000" height="700" rx="70" fill="#ffffff"/>'
    b += f'<clipPath id="c"><rect x="40" y="40" width="920" height="620" rx="40"/></clipPath><g clip-path="url(#c)">{flag(40, 40, 920)}</g>'
    return svg(1000, 700, b, "Sticker Fahne")


def sticker_acht():
    b = '<rect x="0" y="0" width="1000" height="1000" rx="200" fill="#ffffff"/><rect x="36" y="36" width="928" height="928" rx="170" fill="#111111"/>'
    b += d_acht("light").split(">", 1)[1].rsplit("</svg>", 1)[0]
    return svg(1000, 1000, b, "Sticker 8.12")


def sticker_hurriya():
    b = '<rect x="0" y="0" width="1000" height="1000" rx="500" fill="#ffffff"/><circle cx="500" cy="500" r="462" fill="#f3efe6"/>'
    b += d_hurriya("dark").split(">", 1)[1].rsplit("</svg>", 1)[0]
    return svg(1000, 1000, b, "Sticker Hurriya")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    files = {}
    for name, fn in [("flagge", d_flagge), ("siegel", d_siegel), ("acht", d_acht), ("jasmin", d_jasmin), ("wahid", d_wahid), ("hurriya", d_hurriya)]:
        for tone in ("light", "dark"):
            files[f"motiv-{name}-{tone}.svg"] = fn(tone)
    files.update({
        "fahne.svg": p_fahne(), "banner.svg": p_banner(), "folie.svg": p_folie(),
        "sticker-siegel.svg": sticker_round(), "sticker-fahne.svg": sticker_flag(),
        "sticker-acht.svg": sticker_acht(), "sticker-hurriya.svg": sticker_hurriya(),
    })
    for n, s in files.items():
        open(os.path.join(OUT, n), "w").write(s)
    print(len(files), "SVGs →", os.path.abspath(OUT))
