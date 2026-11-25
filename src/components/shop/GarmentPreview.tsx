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
  // aktive Finger/Maus: Verschieben (1 Zeiger auf dem Motiv), Größe (Eckgriff) oder Zwei-Finger-Zoom
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ mode: "move" | "resize" | "pinch"; start: Placement; px: number; py: number; dist: number; cx: number; cy: number } | null>(null);
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

  const boxPx = () => boxRef.current?.getBoundingClientRect();
  /** neue Größe, Mittelpunkt bleibt stehen */
  const scaled = (start: Placement, ns: number): Placement => {
    if (!a) return start;
    const r0 = placeRect(area, a, start);
    const cx = r0.x + r0.w / 2;
    const cy = r0.y + r0.h / 2;
    const s1 = normPlacement({ ...start, s: ns }).s;
    const r1 = placeRect(area, a, { ...start, s: s1 });
    const fx = area.w - r1.w;
    const fy = area.h - r1.h;
    return normPlacement({ s: s1, x: fx > 0.01 ? (cx - r1.w / 2 - area.x) / fx : 0.5, y: fy > 0.01 ? (cy - r1.h / 2 - area.y) / fy : 0.5 });
  };
  const centerPx = () => {
    const box = boxPx();
    if (!box || !rect) return { x: 0, y: 0 };
    return { x: box.left + ((rect.x + rect.w / 2) / 100) * box.width, y: box.top + ((rect.y + rect.h / 2) / 100) * box.height };
  };
  const onDown = (e: React.PointerEvent) => {
    if (!editable) return;
    const target = e.target as HTMLElement;
    const handle = target.closest("[data-handle]");
    const onMotif = handle || target.closest("[data-motif]");
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [p1, p2] = [...ptrs.current.values()];
      gesture.current = { mode: "pinch", start: pl, px: 0, py: 0, dist: Math.hypot(p1.x - p2.x, p1.y - p2.y) || 1, cx: 0, cy: 0 };
    } else if (onMotif) {
      const c = centerPx();
      gesture.current = { mode: handle ? "resize" : "move", start: pl, px: e.clientX, py: e.clientY, dist: Math.hypot(e.clientX - c.x, e.clientY - c.y) || 1, cx: c.x, cy: c.y };
    } else return;
    e.preventDefault();
    boxRef.current?.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const box = boxPx();
    if (!g || !box || !rect) return;
    if (g.mode === "pinch") {
      const [p1, p2] = [...ptrs.current.values()];
      if (!p2) return;
      onPlace?.(scaled(g.start, g.start.s * (Math.hypot(p1.x - p2.x, p1.y - p2.y) / g.dist)));
    } else if (g.mode === "resize") {
      onPlace?.(scaled(g.start, g.start.s * (Math.hypot(e.clientX - g.cx, e.clientY - g.cy) / g.dist)));
    } else {
      const dx = ((e.clientX - g.px) / box.width) * 100;
      const dy = ((e.clientY - g.py) / box.height) * 100;
      const freeX = area.w - rect.w;
      const freeY = area.h - rect.h;
      onPlace?.(normPlacement({ s: g.start.s, x: freeX > 0.01 ? g.start.x + dx / freeX : g.start.x, y: freeY > 0.01 ? g.start.y + dy / freeY : g.start.y }));
    }
  };
  const onUp = (e: React.PointerEvent) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size === 0) {
      gesture.current = null;
      setDragging(false);
    } else if (gesture.current?.mode === "pinch") {
      // ein Finger bleibt: als Verschieben weitermachen
      const [p] = [...ptrs.current.values()];
      gesture.current = { mode: "move", start: pl, px: p.x, py: p.y, dist: 1, cx: 0, cy: 0 };
    }
  };

  return (
    <div
      ref={boxRef}
      className={cn("relative aspect-square overflow-hidden bg-[var(--paper-2)]", editable && "select-none [touch-action:pan-y]", className)}
      onPointerDown={editable ? onDown : undefined}
      onPointerMove={editable ? onMove : undefined}
      onPointerUp={editable ? onUp : undefined}
      onPointerCancel={editable ? onUp : undefined}
    >
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
            data-motif
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
          {editable ? (
            // Auswahlrahmen mit vier Eckgriffen zum Vergrößern/Verkleinern
            <div data-motif className="absolute cursor-grab touch-none active:cursor-grabbing" style={{ left: `${rect!.x}%`, top: `${rect!.y}%`, width: `${rect!.w}%`, height: `${rect!.h}%` }}>
              <div className={cn("pointer-events-none absolute -inset-1 rounded-md border-2 border-dashed", dragging ? "border-[#d6336c]" : "border-[#d6336c]/70")} />
              {(["-left-3 -top-3 cursor-nwse-resize", "-right-3 -top-3 cursor-nesw-resize", "-left-3 -bottom-3 cursor-nesw-resize", "-right-3 -bottom-3 cursor-nwse-resize"] as const).map((pos) => (
                <span key={pos} data-handle className={cn("absolute grid size-6 place-items-center rounded-full border-2 border-[#d6336c] bg-white shadow-md sm:size-5", pos)} aria-label="تكبير أو تصغير">
                  <span className="size-1.5 rounded-full bg-[#d6336c]" />
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
