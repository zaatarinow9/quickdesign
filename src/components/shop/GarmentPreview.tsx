"use client";

import { useEffect, useRef, useState } from "react";
import { defaultPlacement, normPlacement, placeRect, type Placement } from "@/lib/shop/schema";
import { cn } from "@/lib/utils";

type Area = { x: number; y: number; w: number; h: number };

/**
 * Rohling + Motiv in der Druckfläche. Die Faltenschattierung des Rohlings wird über das Motiv gelegt
 * (Maske = Motiv), damit der Druck im Stoff liegt statt darauf zu kleben.
 * Mit `onPlace` lässt sich das Motiv mit Finger/Maus verschieben – es bleibt immer in der Druckfläche.
 */
export function GarmentPreview({
  blank,
  area,
  motif,
  alt = "",
  className,
  priority,
  placement,
  onPlace,
  onRatio,
  showArea,
}: {
  blank: string;
  area: Area;
  motif?: string | null;
  alt?: string;
  className?: string;
  priority?: boolean;
  placement?: Placement;
  onPlace?: (p: Placement) => void;
  onRatio?: (r: number) => void;
  showArea?: boolean;
}) {
  const [ratio, setRatio] = useState<Record<string, number>>({});
  const imgRef = useRef<HTMLImageElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; start: Placement } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Bild kann vor der Hydration fertig geladen sein – dann feuert onLoad nicht mehr
  useEffect(() => {
    const im = imgRef.current;
    if (motif && im?.complete && im.naturalWidth) setRatio((r) => (r[motif] ? r : { ...r, [motif]: im.naturalWidth / im.naturalHeight }));
  }, [motif]);
  const a = motif ? ratio[motif] : undefined;
  useEffect(() => {
    if (a) onRatio?.(a);
  }, [a, onRatio]);
  const pl = normPlacement(placement ?? defaultPlacement);
  const rect: Area | null = motif && a ? placeRect(area, a, pl) : null;
  const pos = (off: number, size: number) => (size >= 100 ? 0 : (off / (100 - size)) * 100);
  const editable = !!onPlace && !!rect;

  const onDown = (e: React.PointerEvent) => {
    if (!editable) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, start: pl };
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const box = boxRef.current?.getBoundingClientRect();
    if (!d || !box || !rect) return;
    const dx = ((e.clientX - d.px) / box.width) * 100;
    const dy = ((e.clientY - d.py) / box.height) * 100;
    const freeX = area.w - rect.w;
    const freeY = area.h - rect.h;
    onPlace?.(normPlacement({ s: d.start.s, x: freeX > 0.01 ? d.start.x + dx / freeX : d.start.x, y: freeY > 0.01 ? d.start.y + dy / freeY : d.start.y }));
  };
  const onUp = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <div ref={boxRef} className={cn("relative aspect-square overflow-hidden bg-[var(--paper-2)]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- übereinanderliegende Ebenen, gleiche Größe */}
      <img src={blank} alt={alt} className="absolute inset-0 size-full object-cover" fetchPriority={priority ? "high" : undefined} draggable={false} />
      {showArea ? (
        <div
          aria-hidden
          className={cn("pointer-events-none absolute rounded-md border-[1.5px] border-dashed transition-opacity", dragging ? "opacity-100" : "opacity-70")}
          style={{ left: `${area.x}%`, top: `${area.y}%`, width: `${area.w}%`, height: `${area.h}%`, borderColor: "rgba(214, 51, 108, .75)" }}
        />
      ) : null}
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
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            className={cn("qd-print absolute select-none", dragging ? "" : "transition-[opacity,left,top,width,height] duration-200", editable && "cursor-grab touch-none active:cursor-grabbing")}
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
          {editable && dragging ? <div aria-hidden className="pointer-events-none absolute rounded ring-2 ring-[rgba(214,51,108,.8)]" style={{ left: `${rect!.x}%`, top: `${rect!.y}%`, width: `${rect!.w}%`, height: `${rect!.h}%` }} /> : null}
        </>
      ) : null}
    </div>
  );
}
