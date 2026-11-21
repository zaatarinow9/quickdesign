"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Area = { x: number; y: number; w: number; h: number };

/**
 * Rohling + Motiv im Druckbereich. Die Faltenschattierung des Rohlings wird über das Motiv gelegt
 * (Maske = Motiv), damit der Druck im Stoff liegt statt darauf zu kleben.
 */
export function GarmentPreview({ blank, area, motif, alt = "", className, priority }: { blank: string; area: Area; motif?: string | null; alt?: string; className?: string; priority?: boolean }) {
  const [ratio, setRatio] = useState<Record<string, number>>({});
  const imgRef = useRef<HTMLImageElement>(null);
  // Bild kann vor der Hydration fertig geladen sein – dann feuert onLoad nicht mehr
  useEffect(() => {
    const im = imgRef.current;
    if (motif && im?.complete && im.naturalWidth) setRatio((r) => (r[motif] ? r : { ...r, [motif]: im.naturalWidth / im.naturalHeight }));
  }, [motif]);
  const a = motif ? ratio[motif] : undefined;
  let rect: Area | null = null;
  if (motif && a) {
    const b = area.w / area.h;
    const w = a > b ? area.w : area.h * a;
    const h = a > b ? area.w / a : area.h;
    rect = { x: area.x + (area.w - w) / 2, y: area.y, w, h };
  }
  const pos = (off: number, size: number) => (size >= 100 ? 0 : (off / (100 - size)) * 100);
  return (
    <div className={cn("relative aspect-square overflow-hidden bg-[var(--paper-2)]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- übereinanderliegende Ebenen, gleiche Größe */}
      <img src={blank} alt={alt} className="absolute inset-0 size-full object-cover" fetchPriority={priority ? "high" : undefined} draggable={false} />
      {motif ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- Größe aus natürlichem Seitenverhältnis */}
          <img
            key={motif}
            ref={imgRef}
            src={motif}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const im = e.currentTarget;
              if (im.naturalWidth) setRatio((r) => ({ ...r, [motif]: im.naturalWidth / im.naturalHeight }));
            }}
            className="qd-print absolute transition-opacity duration-300"
            style={rect ? { left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%`, opacity: 0.97 } : { left: `${area.x}%`, top: `${area.y}%`, width: `${area.w}%`, opacity: 0 }}
          />
          {rect ? (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `url(${blank})`,
                backgroundSize: "cover",
                mixBlendMode: "overlay",
                opacity: 0.45,
                WebkitMaskImage: `url(${motif})`,
                maskImage: `url(${motif})`,
                WebkitMaskSize: `${rect.w}% ${rect.h}%`,
                maskSize: `${rect.w}% ${rect.h}%`,
                WebkitMaskPosition: `${pos(rect.x, rect.w)}% ${pos(rect.y, rect.h)}%`,
                maskPosition: `${pos(rect.x, rect.w)}% ${pos(rect.y, rect.h)}%`,
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
