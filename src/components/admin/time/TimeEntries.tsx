"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Clock, Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { addManualEntry, deleteEntry, updateEntry } from "@/app/admin/time-actions";
import { useFeedback } from "@/components/admin/feedback";
import { DatePicker } from "@/components/admin/DatePicker";
import { clock, decimalHours, elapsedSeconds, hoursLabel, type TimeEntry } from "@/lib/time/shared";
import { openTimer } from "./TimerDock";

const dayLabel = (iso: string) => new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date(iso));
const hm = (iso: string) => new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso));
const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date(iso));

/** Zeiten: nach Tagen gruppiert, Summe, Nachtragen, Bearbeiten, Löschen */
export function TimeEntries({ entries, customers, customerId }: { entries: TimeEntry[]; customers: { id: string; label: string }[]; customerId?: string }) {
  const { toast, confirm } = useFeedback();
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [form, setForm] = useState({ date: dayKey(new Date().toISOString()), minutes: "", note: "", customerId: customerId ?? "" });
  const done = entries.filter((e) => e.ended_at);
  const total = done.reduce((s, e) => s + elapsedSeconds(e), 0);
  const dayMap = new Map<string, TimeEntry[]>();
  for (const e of done) dayMap.set(dayKey(e.started_at), [...(dayMap.get(dayKey(e.started_at)) ?? []), e]);
  const days = [...dayMap.entries()];
  const name = (e: TimeEntry) => (e.customer ? e.customer.company_name || e.customer.name : null);

  const parseMinutes = (v: string) => {
    const t = v.trim().replace(",", ".");
    if (t.includes(":")) {
      const [h, m] = t.split(":").map(Number);
      return (h || 0) * 60 + (m || 0);
    }
    const n = Number(t);
    return t.endsWith("h") || (n > 0 && n <= 12 && t.includes(".")) ? Math.round(parseFloat(t) * 60) : n;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-2xl bg-ink px-5 py-3 text-white">
          <p className="text-[0.7rem] uppercase tracking-wide text-white/60">Gesamt</p>
          <p className="text-2xl font-bold tabular-nums">{hoursLabel(total)}</p>
          <p className="text-xs text-white/60">{decimalHours(total)} · {done.length} Einträge</p>
        </div>
        <button type="button" onClick={() => openTimer(customerId)} className="adm-btn adm-btn-primary h-12 px-5">
          <Play className="size-4" fill="currentColor" aria-hidden /> Stoppuhr starten
        </button>
        <button type="button" onClick={() => setAdding((v) => !v)} className="adm-btn adm-btn-ghost h-12">
          <Plus className="size-4" aria-hidden /> Zeit nachtragen
        </button>
      </div>

      {adding ? (
        <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink/[0.07] sm:grid-cols-[12rem_8rem_1fr_auto] sm:items-end">
          <div>
            <span className="adm-label">Datum</span>
            <DatePicker value={form.date} onChange={(v) => v && setForm({ ...form, date: v })} />
          </div>
          <div>
            <label className="adm-label" htmlFor="tm-min">
              Dauer
            </label>
            <input id="tm-min" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })} placeholder="1:30 oder 90" className="adm-input" inputMode="decimal" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {!customerId ? (
              <div>
                <label className="adm-label" htmlFor="tm-c">
                  Kunde
                </label>
                <select id="tm-c" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="adm-input">
                  <option value="">– ohne –</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className={customerId ? "sm:col-span-2" : ""}>
              <label className="adm-label" htmlFor="tm-n">
                Was wurde gemacht?
              </label>
              <input id="tm-n" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="adm-input" />
            </div>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await addManualEntry({ customerId: form.customerId || null, date: form.date, minutes: parseMinutes(form.minutes), note: form.note });
                if (r.error) return toast(r.error, { tone: "error" });
                toast(r.ok ?? "Gespeichert.");
                setAdding(false);
                setForm({ ...form, minutes: "", note: "" });
              })
            }
            className="adm-btn adm-btn-primary h-11"
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null} Speichern
          </button>
        </div>
      ) : null}

      {days.length ? (
        <div className="space-y-4">
          {days.map(([key, list]) => (
            <section key={key} className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.06]">
              <header className="flex items-center justify-between border-b border-ink/[0.05] bg-ink/[0.02] px-4 py-2.5 text-sm">
                <span className="font-semibold">{dayLabel(list[0].started_at)}</span>
                <span className="tabular-nums text-stone-dark">{hoursLabel(list.reduce((s, e) => s + elapsedSeconds(e), 0))}</span>
              </header>
              <ul className="divide-y divide-ink/[0.05]">
                {list.map((e) => (
                  <li key={e.id} className="group flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <Clock className="size-4 shrink-0 text-accent" aria-hidden />
                    <span className="w-28 shrink-0 text-sm tabular-nums text-stone-dark">
                      {hm(e.started_at)}–{e.ended_at ? hm(e.ended_at) : "…"}
                    </span>
                    <span className="min-w-0 flex-1">
                      {edit === e.id ? (
                        <input
                          autoFocus
                          defaultValue={e.note ?? ""}
                          onBlur={(ev) => {
                            setEdit(null);
                            if (ev.target.value !== (e.note ?? "")) start(async () => void (await updateEntry(e.id, { note: ev.target.value })));
                          }}
                          onKeyDown={(ev) => ev.key === "Enter" && (ev.target as HTMLInputElement).blur()}
                          className="adm-input h-9"
                        />
                      ) : (
                        <>
                          <span className="block truncate text-sm font-medium">{e.note || <span className="text-stone-dark">Ohne Notiz</span>}</span>
                          <span className="block truncate text-xs text-stone-dark">
                            {!customerId && name(e) ? (
                              <Link href={`/admin/kunden/${e.customer_id}?tab=zeiten`} className="text-sky-700 hover:underline">
                                {name(e)}
                              </Link>
                            ) : null}
                            {!customerId && name(e) ? " · " : ""}
                            {e.user_name ?? e.user_email}
                          </span>
                        </>
                      )}
                    </span>
                    <span className="font-mono text-sm font-bold tabular-nums">{clock(elapsedSeconds(e))}</span>
                    <button type="button" onClick={() => setEdit(e.id)} className="grid size-8 place-items-center rounded-lg text-stone-dark opacity-0 hover:bg-ink/[0.06] group-hover:opacity-100 max-sm:opacity-100" aria-label="Notiz bearbeiten">
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({ title: "Eintrag löschen?", text: `${hoursLabel(elapsedSeconds(e))}${e.note ? ` – ${e.note}` : ""}`, danger: true });
                        if (ok.ok) start(() => deleteEntry(e.id));
                      }}
                      className="grid size-8 place-items-center rounded-lg text-stone-dark opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 max-sm:opacity-100"
                      aria-label="Löschen"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl bg-white px-5 py-10 text-center text-sm text-stone-dark ring-1 ring-ink/[0.06]">Noch keine Zeiten erfasst – „Stoppuhr starten“, wenn der Kunde da ist.</p>
      )}
    </div>
  );
}
