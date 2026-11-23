"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Check, Loader2, Pause, Play, Search, Square, Timer, Trash2, X } from "lucide-react";
import { pauseTimer, resumeTimer, startTimer, stopTimer } from "@/app/admin/time-actions";
import { useFeedback } from "@/components/admin/feedback";
import { clock, elapsedSeconds, type TimeEntry } from "@/lib/time/shared";
import { cn } from "@/lib/utils";

type Customer = { id: string; label: string };

/** Stoppuhr öffnen – von überall (Seitenleiste, Kundenakte …) */
export const openTimer = (customerId?: string) => window.dispatchEvent(new CustomEvent("qd:timer", { detail: { customerId } }));

/**
 * Zeiterfassung: schwebende Stoppuhr unten rechts, sichtbar auf allen Seiten.
 * Start mit Kunde + Notiz, Pause/Weiter, Stopp mit „Was wurde gemacht?“ → gespeichert beim Kunden.
 */
export function TimerDock({ running, customers }: { running: TimeEntry | null; customers: Customer[] }) {
  const { toast } = useFeedback();
  const [pending, start] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [dialog, setDialog] = useState<null | { mode: "start"; customerId?: string } | { mode: "stop" }>(null);
  const [local, setLocal] = useState<TimeEntry | null>(running);
  // Server-Stand übernehmen (z. B. nach Start auf einem anderen Gerät)
  const [seen, setSeen] = useState(running);
  if (running !== seen) {
    setSeen(running);
    setLocal(running);
  }

  useEffect(() => {
    if (!local || local.paused_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [local]);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ customerId?: string }>).detail?.customerId;
      setDialog(local ? { mode: "stop" } : { mode: "start", customerId: id });
    };
    window.addEventListener("qd:timer", onOpen);
    return () => window.removeEventListener("qd:timer", onOpen);
  }, [local]);

  const secs = local ? elapsedSeconds(local, now) : 0;
  const paused = !!local?.paused_at;
  const customerName = local?.customer ? local.customer.company_name || local.customer.name : customers.find((c) => c.id === local?.customer_id)?.label;

  return (
    <>
      {local ? (
        <div className="qd-pop-in fixed bottom-4 right-4 z-[65] print:hidden">
          <div className={cn("flex items-center gap-2 rounded-2xl py-2 pl-3 pr-2 text-white shadow-2xl ring-1 ring-white/10", paused ? "bg-ink/90" : "bg-gradient-to-r from-[#1b1b1f] to-[#2a1630]")}>
            <span className="relative grid size-8 place-items-center">
              {!paused ? <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" /> : null}
              <span className={cn("relative grid size-8 place-items-center rounded-full", paused ? "bg-amber-500" : "bg-accent")}>
                <Timer className="size-4" aria-hidden />
              </span>
            </span>
            <button type="button" onClick={() => setDialog({ mode: "stop" })} className="min-w-0 text-left">
              <span className={cn("block font-mono text-lg font-bold tabular-nums leading-none tracking-tight", paused && "text-amber-300")}>{clock(secs)}</span>
              <span className="mt-0.5 block max-w-[11rem] truncate text-[0.7rem] text-white/60">{paused ? "Pausiert · " : ""}{customerName ?? "Ohne Kunde"}</span>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                const id = local.id;
                if (paused) {
                  setLocal({ ...local, paused_at: null, paused_seconds: local.paused_seconds + Math.floor((Date.now() - Date.parse(local.paused_at!)) / 1000) });
                  start(() => resumeTimer(id));
                } else {
                  setLocal({ ...local, paused_at: new Date().toISOString() });
                  start(() => pauseTimer(id));
                }
              }}
              className="ml-1 grid size-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20"
              aria-label={paused ? "Weiter" : "Pause"}
              title={paused ? "Weiter" : "Pause"}
            >
              {paused ? <Play className="size-4" fill="currentColor" aria-hidden /> : <Pause className="size-4" fill="currentColor" aria-hidden />}
            </button>
            <button type="button" onClick={() => setDialog({ mode: "stop" })} className="grid size-9 place-items-center rounded-xl bg-red-500 hover:bg-red-400" aria-label="Stopp" title="Stopp & speichern">
              <Square className="size-3.5" fill="currentColor" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      {dialog?.mode === "start" ? (
        <StartDialog
          customers={customers}
          preset={dialog.customerId}
          pending={pending}
          onClose={() => setDialog(null)}
          onStart={(customerId, note) =>
            start(async () => {
              const r = await startTimer({ customerId, note });
              if (r.error) return toast(r.error, { tone: "error" });
              const c = customers.find((x) => x.id === customerId);
              setLocal({ id: "pending", customer_id: customerId, project_id: null, task_id: null, note, user_email: "", user_name: null, started_at: new Date().toISOString(), ended_at: null, paused_at: null, paused_seconds: 0, duration_seconds: null, customer: c ? { id: c.id, name: c.label, company_name: null } : null });
              setDialog(null);
              toast(`Stoppuhr läuft${c ? ` für ${c.label}` : ""}.`);
            })
          }
        />
      ) : null}

      {dialog?.mode === "stop" && local ? (
        <StopDialog
          entry={local}
          secs={secs}
          customers={customers}
          pending={pending}
          onClose={() => setDialog(null)}
          onStop={(note, customerId, discard) =>
            start(async () => {
              const r = await stopTimer(local.id, { note, customerId, discard });
              if (r.error) return toast(r.error, { tone: "error" });
              setLocal(null);
              setDialog(null);
              toast(r.ok ?? "Gespeichert.");
            })
          }
        />
      ) : null}
    </>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="qd-fade-in fixed inset-0 z-[95] grid place-items-end bg-ink/45 backdrop-blur-[3px] sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qd-pop-in w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">
            <Timer className="size-5 text-accent" aria-hidden /> {title}
          </h2>
          <button type="button" onClick={onClose} className="grid size-8 place-items-center rounded-lg hover:bg-ink/[0.06]" aria-label="Schließen">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CustomerPick({ customers, value, onChange }: { customers: Customer[]; value: string | null; onChange: (v: string | null) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? customers.filter((c) => c.label.toLowerCase().includes(t)) : customers).slice(0, 6);
  }, [q, customers]);
  const chosen = customers.find((c) => c.id === value);
  if (chosen)
    return (
      <button type="button" onClick={() => onChange(null)} className="flex w-full items-center gap-3 rounded-2xl bg-accent/[0.07] p-3 text-left ring-1 ring-accent/30">
        <span className="grid size-9 place-items-center rounded-full bg-accent text-white">
          <Check className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{chosen.label}</span>
        <span className="text-xs text-stone-dark">ändern</span>
      </button>
    );
  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone" aria-hidden />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kunde suchen …" className="adm-input pl-9" />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {list.map((c) => (
          <button key={c.id} type="button" onClick={() => onChange(c.id)} className="h-8 rounded-full bg-ink/[0.05] px-3 text-sm hover:bg-accent hover:text-white">
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StartDialog({ customers, preset, pending, onClose, onStart }: { customers: Customer[]; preset?: string; pending: boolean; onClose: () => void; onStart: (customerId: string | null, note: string) => void }) {
  const [customerId, setCustomerId] = useState<string | null>(preset && customers.some((c) => c.id === preset) ? preset : null);
  const [note, setNote] = useState("");
  return (
    <Sheet title="Zeit erfassen" onClose={onClose}>
      <p className="adm-label">Für welchen Kunden?</p>
      <CustomerPick customers={customers} value={customerId} onChange={setCustomerId} />
      <label className="adm-label mt-4" htmlFor="t-note">
        Was wird gemacht? <span className="font-normal">(optional)</span>
      </label>
      <input id="t-note" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onStart(customerId, note)} placeholder="z. B. Logo-Gestaltung mit Kunde vor Ort" className="adm-input" />
      <button type="button" disabled={pending} onClick={() => onStart(customerId, note)} className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-accent text-lg font-bold text-white shadow-lg shadow-accent/30 transition hover:brightness-110 disabled:opacity-60">
        {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Play className="size-5" fill="currentColor" aria-hidden />} Start
      </button>
      {!customerId ? <p className="mt-2 text-center text-xs text-stone-dark">Ohne Kunde möglich – kann beim Stoppen noch zugeordnet werden.</p> : null}
    </Sheet>
  );
}

function StopDialog({ entry, secs, customers, pending, onClose, onStop }: { entry: TimeEntry; secs: number; customers: Customer[]; pending: boolean; onClose: () => void; onStop: (note: string, customerId: string | null, discard?: boolean) => void }) {
  const [note, setNote] = useState(entry.note ?? "");
  const [customerId, setCustomerId] = useState<string | null>(entry.customer_id);
  const [sure, setSure] = useState(false);
  return (
    <Sheet title="Zeit stoppen" onClose={onClose}>
      <div className="rounded-2xl bg-ink px-5 py-4 text-center text-white">
        <p className="font-mono text-4xl font-bold tabular-nums tracking-tight">{clock(secs)}</p>
        <p className="mt-1 text-xs text-white/60">seit {new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(entry.started_at))} Uhr{entry.paused_seconds ? ` · ${Math.round(entry.paused_seconds / 60)} Min. Pause` : ""}</p>
      </div>
      <p className="adm-label mt-4">Kunde</p>
      <CustomerPick customers={customers} value={customerId} onChange={setCustomerId} />
      <label className="adm-label mt-4" htmlFor="t-done">
        Was wurde gemacht?
      </label>
      <textarea
        id="t-done"
        autoFocus
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onStop(note, customerId);
          }
        }}
        placeholder="z. B. Entwurf Speisekarte, 2 Korrekturen"
        className="adm-input"
      />
      <p className="mt-1 text-[0.7rem] text-stone-dark">Enter = speichern · Umschalt+Enter = neue Zeile</p>
      <div className="mt-5 flex items-center gap-2">
        <button type="button" onClick={() => (sure ? onStop(note, customerId, true) : setSure(true))} className={cn("inline-flex h-12 items-center gap-1.5 rounded-xl px-3 text-sm", sure ? "bg-red-600 font-semibold text-white" : "text-stone-dark hover:bg-red-50 hover:text-red-600")}>
          <Trash2 className="size-4" aria-hidden /> {sure ? "Wirklich verwerfen" : "Verwerfen"}
        </button>
        <button type="button" disabled={pending} onClick={() => onStop(note, customerId)} className="ml-auto flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 disabled:opacity-60">
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />} Speichern
        </button>
      </div>
    </Sheet>
  );
}
