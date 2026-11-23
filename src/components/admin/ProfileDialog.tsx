"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Loader2, Minus, Plus, Trash2, X } from "lucide-react";
import { saveProfile } from "@/app/admin/profile-actions";
import { useFeedback } from "./feedback";
import { cn } from "@/lib/utils";

const VIEW = 260; // Größe des Zuschnitt-Fensters
const OUT = 400; // Ausgabegröße in Pixeln

/** Profilbild mit Zuschneiden (ziehen + zoomen) und Anzeigename */
export function ProfileDialog({ name, email, avatar, onClose }: { name: string; email: string; avatar: string | null; onClose: () => void }) {
  const { toast } = useFeedback();
  const [pending, start] = useTransition();
  const [display, setDisplay] = useState(name === email ? "" : name);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  // Grundmaßstab: Bild füllt das Fenster
  const base = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const w = img ? img.naturalWidth * base * zoom : VIEW;
  const h = img ? img.naturalHeight * base * zoom : VIEW;
  const clamp = (p: { x: number; y: number }) => ({ x: Math.min(0, Math.max(VIEW - w, p.x)), y: Math.min(0, Math.max(VIEW - h, p.y)) });

  const load = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => {
      setImg(i);
      setZoom(1);
      const b = VIEW / Math.min(i.naturalWidth, i.naturalHeight);
      setPos({ x: (VIEW - i.naturalWidth * b) / 2, y: (VIEW - i.naturalHeight * b) / 2 });
    };
    i.src = url;
  };

  const setZ = (z: number) => {
    const nz = Math.min(4, Math.max(1, z));
    // um die Mitte zoomen
    const cx = (VIEW / 2 - pos.x) / (w || 1);
    const cy = (VIEW / 2 - pos.y) / (h || 1);
    const nw = img ? img.naturalWidth * base * nz : VIEW;
    const nh = img ? img.naturalHeight * base * nz : VIEW;
    setZoom(nz);
    setPos(clampWith({ x: VIEW / 2 - cx * nw, y: VIEW / 2 - cy * nh }, nw, nh));
  };
  const clampWith = (p: { x: number; y: number }, ww: number, hh: number) => ({ x: Math.min(0, Math.max(VIEW - ww, p.x)), y: Math.min(0, Math.max(VIEW - hh, p.y)) });

  const save = () =>
    start(async () => {
      let image: string | null = null;
      if (img) {
        const c = document.createElement("canvas");
        c.width = OUT;
        c.height = OUT;
        const s = OUT / VIEW;
        c.getContext("2d")!.drawImage(img, pos.x * s, pos.y * s, w * s, h * s);
        image = c.toDataURL("image/jpeg", 0.88);
      }
      const r = await saveProfile({ image, name: display });
      if (r.error) return toast(r.error, { tone: "error" });
      toast(r.ok ?? "Gespeichert.");
      onClose();
    });

  return (
    <div className="qd-fade-in fixed inset-0 z-[100] grid place-items-end bg-ink/45 backdrop-blur-[3px] sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qd-pop-in w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label="Profil">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Mein Profil</h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label="Schließen">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div
            className={cn("relative overflow-hidden rounded-full bg-ink/[0.05] ring-4 ring-accent/20", img && "cursor-grab active:cursor-grabbing")}
            style={{ width: VIEW, height: VIEW, touchAction: "none" }}
            onPointerDown={(e) => {
              if (!img) return input.current?.click();
              (e.target as Element).setPointerCapture?.(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d) return;
              setPos(clamp({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }));
            }}
            onPointerUp={() => (drag.current = null)}
            onWheel={(e) => img && setZ(zoom - e.deltaY / 500)}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.src} alt="" draggable={false} className="pointer-events-none absolute max-w-none select-none" style={{ left: pos.x, top: pos.y, width: w, height: h }} />
            ) : avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center text-stone-dark">
                <span className="text-center text-sm">
                  <Camera className="mx-auto mb-2 size-8 text-accent" aria-hidden />
                  Foto wählen
                </span>
              </span>
            )}
          </div>
          {img ? (
            <div className="mt-4 flex w-full items-center gap-3">
              <button type="button" onClick={() => setZ(zoom - 0.25)} className="grid size-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label="Verkleinern">
                <Minus className="size-4" />
              </button>
              <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZ(Number(e.target.value))} className="flex-1 accent-[var(--color-accent)]" aria-label="Zoom" />
              <button type="button" onClick={() => setZ(zoom + 0.25)} className="grid size-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label="Vergrößern">
                <Plus className="size-4" />
              </button>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-stone-dark">{img ? "Bild ziehen zum Ausrichten · Mausrad/Regler zum Zoomen" : "Klicken, um ein Foto auszuwählen"}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => input.current?.click()} className="adm-btn adm-btn-ghost adm-btn-sm">
              <Camera className="size-4" aria-hidden /> {avatar || img ? "Anderes Foto" : "Foto wählen"}
            </button>
            {avatar && !img ? (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await saveProfile({ removeImage: true });
                    toast("Profilbild entfernt.");
                    onClose();
                  })
                }
                className="adm-btn adm-btn-ghost adm-btn-sm text-red-700"
              >
                <Trash2 className="size-4" aria-hidden /> Entfernen
              </button>
            ) : null}
          </div>
          <input ref={input} type="file" accept="image/*" hidden onChange={(e) => (load(e.target.files?.[0]), (e.target.value = ""))} />
        </div>

        <label className="adm-label mt-5" htmlFor="pf-name">
          Anzeigename
        </label>
        <input id="pf-name" value={display} onChange={(e) => setDisplay(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder="z. B. Ahmad Alkelani" className="adm-input" maxLength={80} />
        <p className="mt-1 text-xs text-stone-dark">{email}</p>

        <button type="button" disabled={pending} onClick={save} className="adm-btn adm-btn-primary mt-5 h-11 w-full">
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Speichern
        </button>
      </div>
    </div>
  );
}
