"use client";

import { useEffect, useRef, useState } from "react";
import type { Arrow, Arrows } from "@/lib/measure/shared";
import { fmtCm } from "@/lib/measure/shared";

export const W_COLOR = "#2563eb"; // Breite – blau
export const H_COLOR = "#ea580c"; // Höhe – orange

type Drag = { which: "w" | "h"; part: "a" | "b" | "line"; startX: number; startY: number; orig: Arrow };

/**
 * Foto (oder Skizze) mit zwei Pfeilen:
 *  ↔ Breite (blau, links → rechts) und ↕ Höhe (orange, oben → unten).
 * Endpunkte und Linien lassen sich mit Finger oder Maus verschieben.
 */
export function MeasureCanvas({
  photoUrl,
  aspect,
  arrows,
  width,
  height,
  onChange,
  readOnly,
  className,
}: {
  photoUrl?: string | null;
  /** Breite/Höhe des Fotos (für das Seitenverhältnis) */
  aspect?: number;
  arrows: Required<Arrows>;
  width: number | null;
  height: number | null;
  onChange?: (a: Required<Arrows>) => void;
  readOnly?: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const px = (a: Arrow) => ({ x1: (a.x1 / 100) * size.w, y1: (a.y1 / 100) * size.h, x2: (a.x2 / 100) * size.w, y2: (a.y2 / 100) * size.h });
  const clamp = (v: number) => Math.min(98, Math.max(2, v));

  const start = (which: "w" | "h", part: Drag["part"]) => (e: React.PointerEvent) => {
    if (readOnly || !onChange) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { which, part, startX: e.clientX, startY: e.clientY, orig: { ...arrows[which]! } };
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !onChange || !size.w) return;
    const dx = ((e.clientX - d.startX) / size.w) * 100;
    const dy = ((e.clientY - d.startY) / size.h) * 100;
    const o = d.orig;
    let n: Arrow;
    if (d.part === "line") n = { x1: clamp(o.x1 + dx), y1: clamp(o.y1 + dy), x2: clamp(o.x2 + dx), y2: clamp(o.y2 + dy) };
    else if (d.part === "a") n = { ...o, x1: clamp(o.x1 + dx), y1: clamp(o.y1 + dy) };
    else n = { ...o, x2: clamp(o.x2 + dx), y2: clamp(o.y2 + dy) };
    onChange({ ...arrows, [d.which]: n });
  };
  const end = () => (drag.current = null);

  const ratio = aspect && aspect > 0 ? aspect : 4 / 3;

  return (
    <div
      ref={box}
      className={className ?? "relative w-full touch-none select-none overflow-hidden rounded-2xl bg-[#eef1f5]"}
      style={{ aspectRatio: String(ratio) }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="pointer-events-none absolute inset-0 size-full object-cover" draggable={false} />
      ) : (
        // Skizze: Rechteck als Fläche
        <div className="pointer-events-none absolute inset-[14%] rounded-md border-2 border-dashed border-ink/25 bg-white/70" />
      )}
      {size.w ? (
        <svg className="absolute inset-0" width={size.w} height={size.h} aria-hidden={readOnly}>
          {(["w", "h"] as const).map((k) => {
            const a = arrows[k];
            if (!a) return null;
            const p = px(a);
            const color = k === "w" ? W_COLOR : H_COLOR;
            return (
              <g key={k}>
                <ArrowLine {...p} color={color} />
                {!readOnly ? (
                  <>
                    <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="transparent" strokeWidth={26} style={{ cursor: "move" }} onPointerDown={start(k, "line")} />
                    {(["a", "b"] as const).map((part) => (
                      <circle
                        key={part}
                        cx={part === "a" ? p.x1 : p.x2}
                        cy={part === "a" ? p.y1 : p.y2}
                        r={11}
                        fill="white"
                        stroke={color}
                        strokeWidth={3}
                        style={{ cursor: "grab" }}
                        onPointerDown={start(k, part)}
                      />
                    ))}
                  </>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : null}
      {size.w
        ? (["w", "h"] as const).map((k) => {
            const a = arrows[k];
            if (!a) return null;
            const value = k === "w" ? width : height;
            return (
              <span
                key={k}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-lg sm:text-sm"
                style={{ left: `clamp(4.6rem, ${(a.x1 + a.x2) / 2}%, calc(100% - 4.6rem))`, top: `clamp(1rem, ${(a.y1 + a.y2) / 2}%, calc(100% - 1rem))`, background: k === "w" ? W_COLOR : H_COLOR }}
              >
                {k === "w" ? "↔ Breite" : "↕ Höhe"} {value ? fmtCm(value) : "?"}
              </span>
            );
          })
        : null}
    </div>
  );
}

function ArrowLine({ x1, y1, x2, y2, color }: { x1: number; y1: number; x2: number; y2: number; color: string }) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const head = (x: number, y: number, dir: number) => {
    const s = 14;
    const a1 = dir + Math.PI - 0.45;
    const a2 = dir + Math.PI + 0.45;
    return `M${x + Math.cos(a1) * s},${y + Math.sin(a1) * s} L${x},${y} L${x + Math.cos(a2) * s},${y + Math.sin(a2) * s}`;
  };
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth={7} opacity={0.9} />
      <path d={`${head(x2, y2, ang)} ${head(x1, y1, ang + Math.PI)}`} stroke="white" strokeWidth={7} opacity={0.9} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={3.5} />
      <path d={`${head(x2, y2, ang)} ${head(x1, y1, ang + Math.PI)}`} stroke={color} strokeWidth={3.5} />
    </g>
  );
}

/** Foto mit eingezeichneten Maßen als JPEG (für Kundenordner und Druck) */
export async function renderMarked(img: HTMLImageElement, arrows: Required<Arrows>, width: number | null, height: number | null, title: string): Promise<Blob> {
  const max = 2000;
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0, w, h);
  const u = Math.max(w, h) / 900; // Linienstärke relativ zur Bildgröße
  const draw = (a: Arrow, color: string, label: string) => {
    const x1 = (a.x1 / 100) * w, y1 = (a.y1 / 100) * h, x2 = (a.x2 / 100) * w, y2 = (a.y2 / 100) * h;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = (x: number, y: number, dir: number) => {
      const s = 22 * u;
      g.moveTo(x + Math.cos(dir + Math.PI - 0.45) * s, y + Math.sin(dir + Math.PI - 0.45) * s);
      g.lineTo(x, y);
      g.lineTo(x + Math.cos(dir + Math.PI + 0.45) * s, y + Math.sin(dir + Math.PI + 0.45) * s);
    };
    for (const [stroke, lw] of [["rgba(255,255,255,0.95)", 11 * u], [color, 5.5 * u]] as const) {
      g.beginPath();
      g.strokeStyle = stroke;
      g.lineWidth = lw;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      head(x2, y2, ang);
      head(x1, y1, ang + Math.PI);
      g.stroke();
    }
    g.font = `bold ${Math.round(26 * u)}px system-ui, sans-serif`;
    const tw = g.measureText(label).width;
    const bh = 40 * u;
    const half = tw / 2 + 14 * u;
    const px = Math.min(w - half - 4 * u, Math.max(half + 4 * u, (x1 + x2) / 2));
    const py = Math.min(h - bh, Math.max(bh / 2 + 4 * u, (y1 + y2) / 2));
    g.fillStyle = color;
    g.beginPath();
    g.roundRect(px - tw / 2 - 14 * u, py - bh / 2, tw + 28 * u, bh, bh / 2);
    g.fill();
    g.fillStyle = "white";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, px, py + u);
  };
  if (arrows.w) draw(arrows.w, W_COLOR, `↔ Breite ${width ? fmtCm(width) : "?"}`);
  if (arrows.h) draw(arrows.h, H_COLOR, `↕ Höhe ${height ? fmtCm(height) : "?"}`);
  // Titelzeile unten
  if (title) {
    const bh = 46 * u;
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(0, h - bh, w, bh);
    g.fillStyle = "white";
    g.font = `600 ${Math.round(22 * u)}px system-ui, sans-serif`;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(title, 16 * u, h - bh / 2);
  }
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Bild konnte nicht erzeugt werden"))), "image/jpeg", 0.88));
}

/** Foto vom Handy verkleinern (schneller Upload), Ausrichtung wird vom Browser übernommen */
export async function compressPhoto(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const max = 2400;
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s);
  const h = Math.round(bmp.height * s);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Foto konnte nicht gelesen werden"))), "image/jpeg", 0.86));
  return { blob, width: w, height: h };
}
