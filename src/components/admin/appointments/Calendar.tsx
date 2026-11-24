"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Hammer, MapPin, Plus } from "lucide-react";
import { Avatar } from "@/components/admin/tasks/TaskBits";
import { addDays, appointmentKindInfo, appointmentStatusInfo, appointmentWho, dayLabel, isoToBerlin, timeLabel, todayBerlin, type Appointment, type CalendarItem } from "@/lib/appointments/shared";
import type { TeamMember } from "@/lib/tasks/shared";
import { cn } from "@/lib/utils";
import { AppointmentDialog } from "./AppointmentDialog";

const FIRST = 7;
const LAST = 21;
const HOUR = 60;

type Props = {
  items: CalendarItem[];
  view: "woche" | "tag" | "liste";
  from: string;
  days: number;
  team: TeamMember[];
  customers: { id: string; label: string }[];
  me: string;
  open: Appointment | null;
  newDefaults: { date?: string; start?: string; customerId?: string } | null;
};

const mins = (iso: string) => {
  const t = isoToBerlin(iso).time.split(":").map(Number);
  return t[0] * 60 + t[1];
};

/** Überlappende Termine nebeneinander legen */
function lanes(list: CalendarItem[]) {
  const out = new Map<CalendarItem, { lane: number; of: number }>();
  const sorted = [...list].sort((a, b) => a.item.starts_at.localeCompare(b.item.starts_at));
  let group: CalendarItem[] = [];
  let groupEnd = "";
  const flush = () => {
    const ends: string[] = [];
    const lanesOf = new Map<CalendarItem, number>();
    for (const it of group) {
      let l = ends.findIndex((e) => e <= it.item.starts_at);
      if (l < 0) l = ends.length;
      ends[l] = it.item.ends_at;
      lanesOf.set(it, l);
    }
    for (const it of group) out.set(it, { lane: lanesOf.get(it) ?? 0, of: ends.length });
    group = [];
  };
  for (const it of sorted) {
    if (group.length && it.item.starts_at >= groupEnd) flush();
    group.push(it);
    groupEnd = group.length === 1 || it.item.ends_at > groupEnd ? it.item.ends_at : groupEnd;
  }
  if (group.length) flush();
  return out;
}

export function Calendar({ items, view, from, days, team, customers, me, open, newDefaults }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [dialog, setDialog] = useState<{ appointment: Appointment | null; defaults?: Props["newDefaults"] } | null>(open ? { appointment: open } : newDefaults ? { appointment: null, defaults: newDefaults } : null);
  const today = todayBerlin();
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNowMin(mins(new Date().toISOString()));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 60000);
    return () => (clearTimeout(first), clearInterval(id));
  }, []);

  const close = () => {
    setDialog(null);
    if (sp.has("termin") || sp.has("neu")) {
      const p = new URLSearchParams(sp.toString());
      p.delete("termin");
      p.delete("neu");
      p.delete("zeit");
      router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
    }
    router.refresh();
  };
  const openItem = (it: CalendarItem) => {
    if (it.source === "termin") setDialog({ appointment: it.item });
    else router.push(`/admin/projekte/${it.item.id}`);
  };

  const dayList = Array.from({ length: days }, (_, i) => addDays(from, i));
  const byDay = new Map<string, CalendarItem[]>(dayList.map((d) => [d, []]));
  for (const it of items) {
    const d = isoToBerlin(it.item.starts_at).date;
    byDay.get(d)?.push(it);
  }

  const dialogEl = dialog ? <AppointmentDialog key={dialog.appointment?.id ?? "neu"} appointment={dialog.appointment} defaults={dialog.defaults ?? undefined} team={team} customers={customers} me={me} onClose={close} /> : null;

  if (view === "liste")
    return (
      <>
        <div className="space-y-6">
          {dayList
            .filter((d) => byDay.get(d)?.length)
            .map((d) => (
              <section key={d}>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  {d === today ? <span className="rounded-md bg-accent px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide text-white">Heute</span> : null}
                  {dayLabel(d, { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                <ul className="divide-y divide-ink/[0.05] overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.06]">
                  {byDay.get(d)!.map((it) => (
                    <li key={it.item.id}>
                      <Row it={it} team={team} onOpen={() => openItem(it)} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          {!items.length ? <p className="rounded-2xl bg-white p-10 text-center text-sm text-stone-dark ring-1 ring-ink/[0.06]">Keine Termine in diesem Zeitraum.</p> : null}
        </div>
        {dialogEl}
      </>
    );

  const height = (LAST - FIRST) * HOUR;
  return (
    <>
      <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-ink/[0.06]">
        <div className={cn("grid", days > 1 ? "min-w-[880px]" : "")} style={{ gridTemplateColumns: `3.5rem repeat(${days}, minmax(0, 1fr))` }}>
          {/* Kopf */}
          <div className="sticky top-0 z-10 border-b border-ink/[0.06] bg-white" />
          {dayList.map((d) => (
            <div key={d} className="sticky top-0 z-10 border-b border-l border-ink/[0.06] bg-white px-2 py-2.5 text-center">
              <span className={cn("text-xs uppercase tracking-wide", d === today ? "font-bold text-accent" : "text-stone-dark")}>{dayLabel(d, { weekday: "short" })}</span>
              <span className={cn("mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-base font-bold tabular-nums", d === today && "bg-accent text-white")}>{Number(d.slice(8))}</span>
            </div>
          ))}
          {/* Stunden */}
          <div className="relative" style={{ height }}>
            {Array.from({ length: LAST - FIRST }, (_, i) => (
              <span key={i} className="absolute right-2 -translate-y-1/2 text-[0.68rem] tabular-nums text-stone" style={{ top: i * HOUR }}>
                {i ? `${FIRST + i}:00` : ""}
              </span>
            ))}
          </div>
          {dayList.map((d) => {
            const list = byDay.get(d) ?? [];
            const lay = lanes(list);
            return (
              <div
                key={d}
                className={cn("group/day relative border-l border-ink/[0.06]", d === today && "bg-accent/[0.02]")}
                style={{ height }}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                  const m = FIRST * 60 + Math.floor(y / (HOUR / 4)) * 15;
                  const start = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
                  setDialog({ appointment: null, defaults: { date: d, start } });
                }}
              >
                {Array.from({ length: LAST - FIRST }, (_, i) => (
                  <div key={i} className="pointer-events-none absolute inset-x-0 border-t border-ink/[0.05]" style={{ top: i * HOUR }} />
                ))}
                {d === today && nowMin !== null && nowMin >= FIRST * 60 && nowMin <= LAST * 60 ? (
                  <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: ((nowMin - FIRST * 60) / 60) * HOUR }}>
                    <span className="-ml-1 size-2.5 rounded-full bg-red-500" />
                    <span className="h-0.5 flex-1 bg-red-500" />
                  </div>
                ) : null}
                {list.map((it) => {
                  const s = Math.max(mins(it.item.starts_at), FIRST * 60);
                  const e = Math.min(isoToBerlin(it.item.ends_at).date !== d ? LAST * 60 : mins(it.item.ends_at), LAST * 60);
                  const top = ((s - FIRST * 60) / 60) * HOUR;
                  const h = Math.max(((e - s) / 60) * HOUR, 24);
                  const pos = lay.get(it) ?? { lane: 0, of: 1 };
                  return <Block key={it.item.id} it={it} team={team} style={{ top, height: h - 2, left: `calc(${(pos.lane / pos.of) * 100}% + 3px)`, width: `calc(${100 / pos.of}% - 6px)` }} compact={h < 46} onOpen={() => openItem(it)} />;
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-stone-dark">
        <Plus className="size-3.5" aria-hidden /> Tipp: In eine freie Stelle klicken, um dort einen Termin anzulegen.
      </p>
      {dialogEl}
    </>
  );
}

function colorOf(it: CalendarItem) {
  if (it.source === "auftrag") return { color: "#475569", soft: "#eef1f4" };
  return appointmentKindInfo[it.item.kind] ?? appointmentKindInfo.sonstiges;
}

function Block({ it, team, style, compact, onOpen }: { it: CalendarItem; team: TeamMember[]; style: React.CSSProperties; compact: boolean; onOpen: () => void }) {
  const c = colorOf(it);
  const cancelled = it.source === "termin" && it.item.status === "abgesagt";
  const who = it.source === "termin" ? appointmentWho(it.item) : it.item.who;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn("absolute z-10 overflow-hidden rounded-xl border-l-[3px] px-2 py-1 text-left text-xs shadow-sm transition hover:z-30 hover:shadow-lg", cancelled && "opacity-50 line-through")}
      style={{ ...style, background: c.soft, borderColor: c.color }}
      title={`${timeLabel(it.item.starts_at)}–${timeLabel(it.item.ends_at)} · ${who || it.item.title}`}
    >
      <span className="flex items-center gap-1 font-semibold" style={{ color: c.color }}>
        {it.source === "auftrag" ? <Hammer className="size-3 shrink-0" aria-hidden /> : null}
        <span className="tabular-nums">{timeLabel(it.item.starts_at)}</span>
        {compact ? <span className="truncate text-ink">{who || it.item.title}</span> : null}
      </span>
      {!compact ? (
        <>
          <span className="block truncate font-semibold text-ink">{who || it.item.title}</span>
          <span className="block truncate text-stone-dark">{it.source === "termin" ? it.item.title : `${it.item.number} · ${it.item.title}`}</span>
          {it.source === "termin" && it.item.staff.length ? (
            <span className="mt-1 flex -space-x-1.5">
              {it.item.staff.slice(0, 4).map((e) => (
                <Avatar key={e} email={e} team={team} size={18} />
              ))}
            </span>
          ) : null}
        </>
      ) : null}
    </button>
  );
}

function Row({ it, team, onOpen }: { it: CalendarItem; team: TeamMember[]; onOpen: () => void }) {
  const c = colorOf(it);
  const t = it.source === "termin" ? it.item : null;
  const who = t ? appointmentWho(t) : it.source === "auftrag" ? it.item.who : "";
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-ink/[0.02]">
      <span className="w-24 shrink-0 tabular-nums">
        <span className="block font-semibold">{timeLabel(it.item.starts_at)}</span>
        <span className="block text-xs text-stone-dark">bis {timeLabel(it.item.ends_at)}</span>
      </span>
      <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: c.color }} />
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-semibold", t?.status === "abgesagt" && "line-through opacity-60")}>{who || it.item.title}</span>
        <span className="flex flex-wrap items-center gap-x-3 text-sm text-stone-dark">
          <span className="truncate">{t ? `${appointmentKindInfo[t.kind].label} · ${t.title}` : `Auftrag ${it.source === "auftrag" ? it.item.number : ""} · ${it.item.title}`}</span>
          {t?.location ? (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="size-3.5" aria-hidden /> {t.location}
            </span>
          ) : null}
        </span>
        {t?.agenda ? <span className="mt-0.5 block truncate text-xs text-stone">{t.agenda.replace(/\s+/g, " ")}</span> : null}
      </span>
      {t ? (
        <>
          <span className="hidden -space-x-1.5 sm:flex">
            {t.staff.map((e) => (
              <Avatar key={e} email={e} team={team} size={28} />
            ))}
          </span>
          <span className={cn("hidden rounded-full px-2.5 py-1 text-xs font-semibold md:inline", appointmentStatusInfo[t.status].chip)}>{appointmentStatusInfo[t.status].label}</span>
        </>
      ) : (
        <span className="text-xs font-medium text-accent">Auftrag öffnen</span>
      )}
    </button>
  );
}
