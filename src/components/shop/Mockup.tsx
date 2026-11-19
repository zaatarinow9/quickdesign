/**
 * Produkt-Mockup als SVG: T-Shirt oder Hoodie in der gewählten Stofffarbe, Motiv auf der Brust.
 * Licht und Falten als halbtransparente Verläufe – wirkt auch ohne Foto hochwertig.
 */
import type { ArtworkKey, Garment } from "@/lib/shop/catalog";
import { Artwork, type Tone } from "./Artwork";
import { cn } from "@/lib/utils";

const TSHIRT =
  "M170 40 C 196 62 304 62 330 40 L 428 82 C 440 87 446 98 448 110 L 470 214 L 404 236 L 388 182 L 388 520 C 388 530 380 536 370 536 L 130 536 C 120 536 112 530 112 520 L 112 182 L 96 236 L 30 214 L 52 110 C 54 98 60 87 72 82 Z";
const TSHIRT_NECK = "M170 40 C 196 62 304 62 330 40 C 316 82 184 82 170 40 Z";

const HOODIE =
  "M168 70 C 150 40 180 6 250 6 C 320 6 350 40 332 70 L 420 104 C 434 110 442 122 444 136 L 468 404 C 469 414 462 422 452 423 L 414 428 C 404 429 396 422 395 412 L 386 236 L 388 520 C 388 532 380 538 370 538 L 130 538 C 120 538 112 532 112 520 L 114 236 L 105 412 C 104 422 96 429 86 428 L 48 423 C 38 422 31 414 32 404 L 56 136 C 58 122 66 110 80 104 Z";
const HOOD_INNER = "M196 72 C 186 44 210 24 250 24 C 290 24 314 44 304 72 C 286 98 214 98 196 72 Z";
const POCKET = "M168 404 L 332 404 L 352 488 L 148 488 Z";

export function Mockup({
  garment,
  art,
  color,
  tone,
  className,
  label,
}: {
  garment: Garment;
  art: ArtworkKey;
  color: string;
  tone: Tone;
  className?: string;
  label?: string;
}) {
  const id = `${garment}-${color.replace("#", "")}`;
  const hoodie = garment === "hoodie";
  return (
    <div className={cn("relative", className)} role="img" aria-label={label}>
      <svg viewBox="0 0 500 560" className="block h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={`${id}-light`} cx="0.45" cy="0.28" r="0.8">
            <stop offset="0" stopColor="#fff" stopOpacity="0.16" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.22" />
          </radialGradient>
          <linearGradient id={`${id}-fold`} x1="0" x2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.18" />
            <stop offset="0.18" stopColor="#000" stopOpacity="0" />
            <stop offset="0.82" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <ellipse cx="250" cy="548" rx="190" ry="10" fill="#000" opacity="0.12" />
        <path d={hoodie ? HOODIE : TSHIRT} fill={color} stroke="#00000022" strokeWidth="1.5" />
        <path d={hoodie ? HOODIE : TSHIRT} fill={`url(#${id}-fold)`} />
        <path d={hoodie ? HOODIE : TSHIRT} fill={`url(#${id}-light)`} />
        {hoodie ? (
          <>
            <path d={HOOD_INNER} fill="#000" opacity="0.28" />
            <path d="M226 92 L 222 168 M274 92 L 278 168" stroke={tone === "light" ? "#e9e4d8" : "#2a2a2a"} strokeWidth="3.5" strokeLinecap="round" />
            <path d={POCKET} fill="#000" opacity="0.07" stroke="#00000026" strokeWidth="1.2" />
            <path d="M114 512 L 386 512" stroke="#00000020" strokeWidth="6" />
          </>
        ) : (
          <>
            <path d={TSHIRT_NECK} fill="#000" opacity="0.18" />
            <path d="M172 44 C 198 70 302 70 328 44" fill="none" stroke="#00000030" strokeWidth="4" />
          </>
        )}
        {/* Faltenlinien */}
        <path d="M150 300 C 170 360 160 420 176 500" fill="none" stroke="#000" strokeOpacity="0.05" strokeWidth="8" />
        <path d="M352 290 C 334 360 346 430 328 506" fill="none" stroke="#000" strokeOpacity="0.05" strokeWidth="8" />
      </svg>
      {/* Motiv auf der Brust */}
      <div className="absolute" style={hoodie ? { left: "31%", top: "30%", width: "38%" } : { left: "30%", top: "20%", width: "40%" }}>
        <Artwork art={art} tone={tone} className="w-full [&_svg]:h-auto [&_svg]:w-full" />
      </div>
    </div>
  );
}
