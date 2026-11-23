"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------ Popover ------------------------------ */

/** Schwebendes Menü an einem Element – Klick außerhalb oder ESC schließt (per Portal, nichts wird abgeschnitten) */
export function Popover({ anchor, open, onClose, children, align = "start", width = 288 }: { anchor: HTMLElement | null; open: boolean; onClose: () => void; children: React.ReactNode; align?: "start" | "end"; width?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const h = box.current?.offsetHeight ?? 320;
      const below = r.bottom + 6 + h <= window.innerHeight || r.top < h;
      let left = align === "end" ? r.right - width : r.left;
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      setPos({ top: below ? r.bottom + 6 : r.top - h - 6, left });
    };
    place();
    const raf = requestAnimationFrame(place);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || anchor.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, onClose, align, width]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div
      ref={box}
      onClick={(e) => e.stopPropagation()}
      className="qd-pop-in fixed z-[130] rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-ink/10"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
    >
      {children}
    </div>,
    document.body,
  );
}

/* ------------------------------ Kalender ------------------------------ */

const WD = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const todayIso = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const formatDateLabel = (s: string | null | undefined) =>
  s ? new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "short", year: s.slice(0, 4) === todayIso().slice(0, 4) ? undefined : "numeric" }).format(parse(s)) : "";

export function CalendarPanel({ value, onPick }: { value: string | null; onPick: (v: string | null) => void }) {
  const today = todayIso();
  const [month, setMonth] = useState(() => {
    const d = parse(value ?? today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const first = (month.getDay() + 6) % 7; // Montag = 0
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((first + days) / 7) * 7 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - first + 1));
  const nextMonday = (() => {
    const d = parse(today);
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    return iso(d);
  })();
  const quick: [string, string | null][] = [
    ["Heute", today],
    ["Morgen", addDays(today, 1)],
    ["In 3 Tagen", addDays(today, 3)],
    ["Nächster Mo", nextMonday],
    ["In 2 Wochen", addDays(today, 14)],
  ];
  return (
    <div className="select-none">
      <div className="mb-2 flex flex-wrap gap-1">
        {quick.map(([label, v]) => (
          <button key={label} type="button" onClick={() => onPick(v)} className={cn("h-7 rounded-lg px-2 text-xs font-medium", value === v ? "bg-accent text-white" : "bg-ink/[0.05] hover:bg-ink/[0.1]")}>
            {label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between px-1 py-1">
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid size-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label="Voriger Monat">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold">{new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" }).format(month)}</span>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid size-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label="Nächster Monat">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[0.68rem] font-medium uppercase text-stone">
        {WD.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d) => {
          const s = iso(d);
          const inMonth = d.getMonth() === month.getMonth();
          const sel = s === value;
          const isToday = s === today;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onPick(s)}
              className={cn(
                "grid h-9 place-items-center rounded-xl text-sm tabular-nums transition",
                sel ? "bg-accent font-bold text-white shadow-sm shadow-accent/30" : isToday ? "font-bold text-accent ring-1 ring-accent/40" : inMonth ? "hover:bg-ink/[0.06]" : "text-stone-light hover:bg-ink/[0.04]",
                (d.getDay() === 0 || d.getDay() === 6) && !sel && inMonth && "text-stone-dark",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      {value ? (
        <button type="button" onClick={() => onPick(null)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs text-stone-dark hover:bg-red-50 hover:text-red-600">
          <X className="size-3.5" aria-hidden /> Datum entfernen
        </button>
      ) : null}
    </div>
  );
}

/** Datumsauswahl im QuickDesign-Stil (statt des Browser-Kalenders) */
export function DatePicker({ value, onChange, placeholder = "Datum wählen", className, compact }: { value: string | null; onChange: (v: string | null) => void; placeholder?: string; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          compact ? "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm hover:bg-ink/[0.05]" : "flex h-11 w-full items-center gap-2 rounded-xl bg-white px-3.5 text-left text-[0.95rem] ring-1 ring-ink/15 transition hover:ring-ink/30",
          open && "ring-2 ring-accent/50",
          className,
        )}
      >
        <Calendar className="size-4 shrink-0 text-accent" aria-hidden />
        <span className={cn("truncate", !value && "text-stone-dark")}>{value ? formatDateLabel(value) : placeholder}</span>
      </button>
      <Popover anchor={anchor} open={open} onClose={() => setOpen(false)}>
        <CalendarPanel
          value={value}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      </Popover>
    </>
  );
}
