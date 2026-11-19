/**
 * Druckmotive der Kollektion 8.12. – reines SVG (kein JavaScript), skalierbar für Druck und Web.
 * `tone`: "light" = Motiv für dunkle Stoffe (helle Schrift), "dark" = für helle Stoffe.
 * Arabische Schrift nutzt var(--font-ar-display) (Thmanyah, austauschbar über CSS).
 */
import type { ArtworkKey } from "@/lib/shop/catalog";

export type Tone = "light" | "dark";

const GREEN = "#007a3d";
const RED = "#ce1126";
const BLACK = "#111111";
const AR = "var(--font-ar-display), 'Thmanyah Sans', system-ui, sans-serif";
const LAT = "var(--font-outfit), 'Outfit', system-ui, sans-serif";

function GoldDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f6e3a7" />
        <stop offset="0.35" stopColor="#d8b25e" />
        <stop offset="0.6" stopColor="#b88a35" />
        <stop offset="1" stopColor="#ecd08a" />
      </linearGradient>
    </defs>
  );
}

/** Fünfzackiger Stern */
export function starPath(cx: number, cy: number, r: number, rot = -90) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.4;
    const a = ((rot + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

/* ------------------------------ 1. Wehende Fahne ------------------------------ */

const wave = (x: number, phase = 0) => 12 * Math.sin((x / 300) * Math.PI * 2 + phase) + 4 * Math.sin((x / 120) * Math.PI * 2 + phase);

/** Band der Fahne zwischen y0 und y1, entlang x gewellt */
function band(x0: number, w: number, y0: number, y1: number) {
  const steps = 40;
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = x0 + (w * i) / steps;
    const d = wave(x - x0) * (i / steps + 0.25);
    top.push(`${x.toFixed(1)},${(y0 + d).toFixed(1)}`);
    bottom.unshift(`${x.toFixed(1)},${(y1 + d).toFixed(1)}`);
  }
  return `M${top.join("L")}L${bottom.join("L")}Z`;
}

function FlagArt({ tone }: { tone: Tone }) {
  const id = "af";
  const x0 = 70;
  const w = 270;
  const h = 180;
  const y0 = 70;
  const third = h / 3;
  const text = tone === "light" ? "#f6f4ef" : BLACK;
  const starX = [x0 + w * 0.3, x0 + w * 0.5, x0 + w * 0.7];
  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wehende Fahne der syrischen Revolution, 8.12.2024">
      <GoldDefs id={id} />
      <defs>
        <linearGradient id={`${id}-shade`} x1="0" x2="1" y1="0" y2="0">
          {Array.from({ length: 9 }, (_, i) => (
            <stop key={i} offset={i / 8} stopColor="#000" stopOpacity={i % 2 ? 0.16 : 0} />
          ))}
        </linearGradient>
      </defs>
      {/* Mast */}
      <rect x={x0 - 8} y={y0 - 14} width="6" height="250" rx="3" fill={`url(#${id}-gold)`} />
      <circle cx={x0 - 5} cy={y0 - 16} r="6" fill={`url(#${id}-gold)`} />
      <path d={band(x0, w, y0, y0 + third)} fill={GREEN} />
      <path d={band(x0, w, y0 + third, y0 + 2 * third)} fill="#ffffff" />
      <path d={band(x0, w, y0 + 2 * third, y0 + h)} fill={BLACK} />
      {/* Faltenwurf */}
      <path d={band(x0, w, y0, y0 + h)} fill={`url(#${id}-shade)`} />
      {starX.map((sx) => (
        <path key={sx} d={starPath(sx, y0 + third * 1.5 + wave(sx - x0) * ((sx - x0) / w + 0.25), 15)} fill={RED} />
      ))}
      {tone === "dark" ? <path d={band(x0, w, y0, y0 + h)} fill="none" stroke="#11111122" strokeWidth="1" /> : null}
      <text x="200" y="322" textAnchor="middle" fontFamily={LAT} fontWeight="600" fontSize="34" letterSpacing="6" fill={`url(#${id}-gold)`}>
        8.12.2024
      </text>
      <text x="200" y="362" textAnchor="middle" fontFamily={AR} fontWeight="700" fontSize="28" fill={text} direction="rtl">
        سوريا حرة
      </text>
    </svg>
  );
}

/* ------------------------------ 2. Goldenes Siegel ------------------------------ */

function SealArt({ tone }: { tone: Tone }) {
  const id = "as";
  const inner = tone === "light" ? "#f6f4ef" : BLACK;
  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Goldenes Siegel „Freies Syrien“">
      <GoldDefs id={id} />
      <defs>
        <path id={`${id}-top`} d="M 80 200 A 120 120 0 0 1 320 200" />
        <path id={`${id}-bottom`} d="M 66 200 A 134 134 0 0 0 334 200" />
      </defs>
      {/* Zackenrand */}
      <path
        d={Array.from({ length: 72 }, (_, i) => {
          const a = (i / 72) * Math.PI * 2;
          const r = i % 2 ? 170 : 162;
          return `${i ? "L" : "M"}${(200 + r * Math.cos(a)).toFixed(1)},${(200 + r * Math.sin(a)).toFixed(1)}`;
        }).join("") + "Z"}
        fill={`url(#${id}-gold)`}
      />
      <circle cx="200" cy="200" r="150" fill="none" stroke={tone === "light" ? "#0b0b0c" : "#fff"} strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="200" cy="200" r="146" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="2" />
      <circle cx="200" cy="200" r="104" fill={tone === "light" ? "#0b0b0c" : "#fdfbf6"} stroke={`url(#${id}-gold)`} strokeWidth="3" />
      <text fontFamily={LAT} fontSize="17" fontWeight="600" letterSpacing="5" fill="#2a1d05">
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          FREE SYRIA · 8.12.2024
        </textPath>
      </text>
      <text fontFamily={LAT} fontSize="14" fontWeight="600" letterSpacing="6" fill="#2a1d05">
        <textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">
          ★ ZWEITER JAHRESTAG ★
        </textPath>
      </text>
      {[160, 200, 240].map((x) => (
        <path key={x} d={starPath(x, 150, 11)} fill={RED} />
      ))}
      <text x="200" y="222" textAnchor="middle" fontFamily={AR} fontWeight="900" fontSize="46" fill={`url(#${id}-gold)`} direction="rtl">
        سوريا حرة
      </text>
      <line x1="150" y1="248" x2="250" y2="248" stroke={`url(#${id}-gold)`} strokeWidth="2" />
      <text x="200" y="274" textAnchor="middle" fontFamily={AR} fontWeight="500" fontSize="17" fill={inner} direction="rtl">
        الذكرى الثانية للتحرير
      </text>
    </svg>
  );
}

/* ------------------------------ 3. Die Acht ------------------------------ */

function EightArt({ tone }: { tone: Tone }) {
  const id = "ae";
  const text = tone === "light" ? "#f6f4ef" : BLACK;
  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Riesige Acht in den Farben der Revolution">
      <GoldDefs id={id} />
      <defs>
        <clipPath id={`${id}-clip`}>
          <text x="200" y="300" textAnchor="middle" fontFamily={LAT} fontWeight="600" fontSize="330">
            8
          </text>
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="0" y="40" width="400" height="88" fill={GREEN} />
        <rect x="0" y="128" width="400" height="88" fill="#ffffff" />
        <rect x="0" y="216" width="400" height="100" fill={BLACK} />
        {[150, 200, 250].map((x) => (
          <path key={x} d={starPath(x, 172, 13)} fill={RED} />
        ))}
      </g>
      <text x="200" y="300" textAnchor="middle" fontFamily={LAT} fontWeight="600" fontSize="330" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="3">
        8
      </text>
      <text x="200" y="342" textAnchor="middle" fontFamily={AR} fontWeight="700" fontSize="26" fill={text} direction="rtl">
        الثامن من كانون الأول
      </text>
      <text x="200" y="372" textAnchor="middle" fontFamily={LAT} fontWeight="500" fontSize="16" letterSpacing="10" fill={`url(#${id}-gold)`}>
        08 · 12 · 2024
      </text>
    </svg>
  );
}

/* ------------------------------ 4. Jasmin-Kranz ------------------------------ */

function Jasmine({ x, y, r, rot }: { x: number; y: number; r: number; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx="0" cy={-r * 0.55} rx={r * 0.32} ry={r * 0.6} fill="#fffdf6" stroke="#d9cfb8" strokeWidth="0.8" transform={`rotate(${i * 72})`} />
      ))}
      <circle r={r * 0.18} fill="#e9c86a" />
    </g>
  );
}

function JasmineArt({ tone }: { tone: Tone }) {
  const id = "aj";
  const text = tone === "light" ? "#f6f4ef" : BLACK;
  const R = 130;
  const items = Array.from({ length: 26 }, (_, i) => {
    const t = (i / 26) * Math.PI * 1.72 + Math.PI * 0.64;
    return { x: 200 + R * Math.cos(t), y: 190 + R * Math.sin(t), t, i };
  });
  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kranz aus Damaszener Jasmin">
      <GoldDefs id={id} />
      {/* Zweig */}
      <path d={`M ${items[0].x} ${items[0].y} ${items.map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")}`} fill="none" stroke="#3d6b3a" strokeWidth="3" strokeLinecap="round" />
      {items.map((p) => (
        <ellipse
          key={`l${p.i}`}
          cx={p.x + 14 * Math.cos(p.t + (p.i % 2 ? 0.9 : -0.9))}
          cy={p.y + 14 * Math.sin(p.t + (p.i % 2 ? 0.9 : -0.9))}
          rx="5"
          ry="12"
          fill={p.i % 3 ? "#2f6b3a" : "#4d8a4b"}
          transform={`rotate(${((p.t * 180) / Math.PI + (p.i % 2 ? 60 : -60)).toFixed(1)} ${p.x + 14 * Math.cos(p.t + (p.i % 2 ? 0.9 : -0.9))} ${p.y + 14 * Math.sin(p.t + (p.i % 2 ? 0.9 : -0.9))})`}
        />
      ))}
      {items
        .filter((p) => p.i % 2 === 0)
        .map((p) => (
          <Jasmine key={`j${p.i}`} x={p.x} y={p.y} r={p.i % 4 ? 13 : 16} rot={p.i * 23} />
        ))}
      <path d={starPath(200, 150, 26)} fill={RED} />
      <text x="200" y="220" textAnchor="middle" fontFamily={AR} fontWeight="900" fontSize="34" fill={text} direction="rtl">
        ياسمين الشام
      </text>
      <text x="200" y="256" textAnchor="middle" fontFamily={LAT} fontWeight="600" fontSize="17" letterSpacing="6" fill={`url(#${id}-gold)`}>
        8.12.2024
      </text>
      <text x="200" y="372" textAnchor="middle" fontFamily={LAT} fontWeight="500" fontSize="13" letterSpacing="5" fill={text} opacity="0.75">
        DAMASKUS · FREI
      </text>
    </svg>
  );
}

/* ------------------------------ 5. Wahid, wahid, wahid ------------------------------ */

function WahidArt({ tone }: { tone: Tone }) {
  const id = "aw";
  const text = tone === "light" ? "#f6f4ef" : BLACK;
  return (
    <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wahid, wahid, wahid – das syrische Volk ist eins">
      <GoldDefs id={id} />
      {[0, 1, 2].map((i) => (
        <text key={i} x="200" y={118 + i * 74} textAnchor="middle" fontFamily={AR} fontWeight="900" fontSize="78" fill={text} opacity={1 - i * 0.12} direction="rtl">
          واحد
        </text>
      ))}
      {/* Band in Fahnenfarben */}
      <g transform="translate(0 300)">
        <path d="M 22 18 L 52 18 L 40 34 L 52 50 L 22 50 Z" fill="#0c5c34" />
        <path d="M 378 18 L 348 18 L 360 34 L 348 50 L 378 50 Z" fill="#0c5c34" />
        <path d="M 46 6 Q 200 26 354 6 L 354 44 Q 200 64 46 44 Z" fill={GREEN} />
        <path d="M 46 18 Q 200 38 354 18 L 354 30 Q 200 50 46 30 Z" fill="#ffffff" />
        <path d="M 46 30 Q 200 50 354 30 L 354 44 Q 200 64 46 44 Z" fill={BLACK} />
        {[150, 200, 250].map((x) => (
          <path key={x} d={starPath(x, 27 + 10 * Math.sin(((x - 46) / 308) * Math.PI), 6)} fill={RED} />
        ))}
        <path d="M 46 6 Q 200 26 354 6 L 354 44 Q 200 64 46 44 Z" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="1.5" />
      </g>
      <text x="200" y="388" textAnchor="middle" fontFamily={AR} fontWeight="700" fontSize="22" fill={`url(#${id}-gold)`} direction="rtl">
        الشعب السوري واحد
      </text>
    </svg>
  );
}

export function Artwork({ art, tone, className }: { art: ArtworkKey; tone: Tone; className?: string }) {
  const C = { flag: FlagArt, seal: SealArt, eight: EightArt, jasmine: JasmineArt, wahid: WahidArt }[art];
  return (
    <span className={className} style={{ display: "block" }}>
      <C tone={tone} />
    </span>
  );
}
