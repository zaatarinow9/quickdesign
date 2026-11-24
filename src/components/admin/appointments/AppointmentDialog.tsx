"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarClock, Check, Clock, Loader2, MapPin, Phone, Search, Trash2, UserRound, X } from "lucide-react";
import { deleteAppointmentAction, saveAppointmentAction } from "@/app/admin/appointment-actions";
import { useFeedback } from "@/components/admin/feedback";
import { DatePicker } from "@/components/admin/DatePicker";
import { Avatar } from "@/components/admin/tasks/TaskBits";
import { appointmentKindInfo, appointmentKinds, appointmentStatusInfo, appointmentStatuses, isoToBerlin, timeSlots, type Appointment, type AppointmentKind, type AppointmentStatus } from "@/lib/appointments/shared";
import type { TeamMember } from "@/lib/tasks/shared";
import { cn } from "@/lib/utils";

type Customer = { id: string; label: string };
type Form = {
  title: string;
  kind: AppointmentKind;
  date: string;
  start: string;
  end: string;
  staff: string[];
  customerId: string;
  contactName: string;
  contactPhone: string;
  location: string;
  agenda: string;
  notes: string;
  status: AppointmentStatus;
};

const plus = (t: string, min: number) => {
  const [h, m] = t.split(":").map(Number);
  const v = Math.min(h * 60 + m + min, 23 * 60 + 45);
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};
const minutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** Termin anlegen oder bearbeiten – Kunde oder freier Name, Mitarbeiter, Zeit, worum es geht */
export function AppointmentDialog({
  appointment,
  defaults,
  team,
  customers,
  me,
  onClose,
}: {
  appointment: Appointment | null;
  defaults?: { date?: string; start?: string; customerId?: string; staff?: string[] };
  team: TeamMember[];
  customers: Customer[];
  me: string;
  onClose: () => void;
}) {
  const { toast, confirm } = useFeedback();
  const [pending, start] = useTransition();
  const [f, setF] = useState<Form>(() => {
    if (appointment) {
      const s = isoToBerlin(appointment.starts_at);
      const e = isoToBerlin(appointment.ends_at);
      return {
        title: appointment.title,
        kind: appointment.kind,
        date: s.date,
        start: s.time,
        end: e.time,
        staff: appointment.staff,
        customerId: appointment.customer_id ?? "",
        contactName: appointment.contact_name ?? "",
        contactPhone: appointment.contact_phone ?? "",
        location: appointment.location ?? "",
        agenda: appointment.agenda ?? "",
        notes: appointment.notes ?? "",
        status: appointment.status,
      };
    }
    const st = defaults?.start ?? "10:00";
    return { title: "", kind: "beratung", date: defaults?.date ?? new Date().toISOString().slice(0, 10), start: st, end: plus(st, 60), staff: defaults?.staff ?? [me], customerId: defaults?.customerId ?? "", contactName: "", contactPhone: "", location: "", agenda: "", notes: "", status: "geplant" };
  });
  const [freeName, setFreeName] = useState(Boolean(appointment && !appointment.customer_id && appointment.contact_name));
  const [q, setQ] = useState("");
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const customer = customers.find((c) => c.id === f.customerId);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? customers.filter((c) => c.label.toLowerCase().includes(s)) : customers).slice(0, 8);
  }, [q, customers]);
  const duration = minutes(f.end) - minutes(f.start);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () =>
    start(async () => {
      const r = await saveAppointmentAction({
        id: appointment?.id,
        title: f.title.trim() || `${appointmentKindInfo[f.kind].label}${customer ? ` · ${customer.label}` : f.contactName ? ` · ${f.contactName}` : ""}`,
        kind: f.kind,
        date: f.date,
        start: f.start,
        end: f.end,
        staff: f.staff,
        customerId: freeName ? null : f.customerId || null,
        contactName: freeName ? f.contactName : null,
        contactPhone: f.contactPhone,
        location: f.location,
        agenda: f.agenda,
        notes: f.notes,
        status: f.status,
      });
      if (r.error) return toast(r.error, { tone: "error" });
      if (r.conflicts?.length) {
        const names = r.conflicts.map((e) => team.find((m) => m.email === e)?.name ?? e).join(", ");
        toast(`Gespeichert – Achtung: ${names} hat zur selben Zeit schon einen Termin.`, { tone: "error" });
      } else toast(appointment ? "Termin gespeichert." : f.staff.some((s) => s !== me) ? "Termin angelegt – die Mitarbeiter werden benachrichtigt." : "Termin angelegt.");
      onClose();
    });

  const remove = async () => {
    if (!appointment) return;
    const ok = await confirm({ title: "Termin löschen?", text: `${appointment.title} – wird endgültig entfernt. Tipp: „Abgesagt" behält den Termin im Verlauf.`, danger: true, confirm: "Löschen" });
    if (!ok.ok) return;
    const r = await deleteAppointmentAction(appointment.id);
    if ("error" in r && r.error) return toast(r.error, { tone: "error" });
    toast("Termin gelöscht.");
    onClose();
  };

  return (
    <div className="qd-fade-in fixed inset-0 z-[80] grid place-items-end bg-ink/45 backdrop-blur-[3px] sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="qd-pop-in flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl" role="dialog" aria-modal="true" aria-label={appointment ? "Termin bearbeiten" : "Neuer Termin"}>
        <div className="flex items-center gap-3 border-b border-ink/[0.06] px-5 py-4">
          <span className="grid size-10 place-items-center rounded-xl text-white" style={{ background: appointmentKindInfo[f.kind].color }}>
            <CalendarClock className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">{appointment ? "Termin bearbeiten" : "Neuer Termin"}</h2>
            <p className="text-xs text-stone-dark">Mitarbeiter bekommen den Termin in der App – mit Erinnerung 1 Stunde vorher.</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-xl hover:bg-ink/[0.06]" aria-label="Schließen">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Art */}
          <div>
            <p className="adm-label">Art des Termins</p>
            <div className="flex flex-wrap gap-1.5">
              {appointmentKinds.map((k) => {
                const info = appointmentKindInfo[k];
                const on = f.kind === k;
                return (
                  <button key={k} type="button" onClick={() => set("kind", k)} className={cn("inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium ring-1 transition", on ? "text-white ring-transparent" : "bg-white text-ink ring-ink/10 hover:bg-ink/[0.03]")} style={on ? { background: info.color } : undefined}>
                    <span className="size-2 rounded-full" style={{ background: on ? "#fff" : info.color }} />
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kunde / Person */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="adm-label !mb-0">Mit wem?</p>
              <button type="button" onClick={() => setFreeName((v) => !v)} className="text-xs font-medium text-accent hover:underline">
                {freeName ? "Kunden aus der Kartei wählen" : "Ohne Kundenakte – nur Name"}
              </button>
            </div>
            {freeName ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl px-3 ring-1 ring-ink/10 focus-within:ring-accent/40">
                  <UserRound className="size-4 text-stone" aria-hidden />
                  <input value={f.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Name der Person / Firma" className="h-11 w-full bg-transparent text-sm outline-none" />
                </label>
                <label className="flex items-center gap-2 rounded-xl px-3 ring-1 ring-ink/10 focus-within:ring-accent/40">
                  <Phone className="size-4 text-stone" aria-hidden />
                  <input value={f.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="Telefon (optional)" inputMode="tel" className="h-11 w-full bg-transparent text-sm outline-none" />
                </label>
              </div>
            ) : customer ? (
              <div className="flex items-center gap-3 rounded-xl bg-sky-50 px-3 py-2.5 ring-1 ring-sky-100">
                <UserRound className="size-4 text-sky-700" aria-hidden />
                <Link href={`/admin/kunden/${customer.id}`} className="min-w-0 flex-1 truncate font-medium text-sky-900 hover:underline">
                  {customer.label}
                </Link>
                <button type="button" onClick={() => set("customerId", "")} className="grid size-7 place-items-center rounded-lg text-sky-800 hover:bg-sky-100" aria-label="Kunde entfernen">
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-xl ring-1 ring-ink/10 focus-within:ring-accent/40">
                <label className="flex items-center gap-2 px-3">
                  <Search className="size-4 text-stone" aria-hidden />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kunden suchen …" className="h-11 w-full bg-transparent text-sm outline-none" />
                </label>
                <div className="max-h-44 overflow-y-auto border-t border-ink/[0.05] p-1">
                  {matches.map((c) => (
                    <button key={c.id} type="button" onClick={() => (set("customerId", c.id), setQ(""))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-ink/[0.04]">
                      <UserRound className="size-3.5 text-stone" aria-hidden /> {c.label}
                    </button>
                  ))}
                  {!matches.length ? <p className="px-2.5 py-2 text-sm text-stone-dark">Kein Kunde gefunden – oben „Ohne Kundenakte“ wählen.</p> : null}
                </div>
              </div>
            )}
          </div>

          {/* Zeit */}
          <div>
            <p className="adm-label">Wann?</p>
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker value={f.date} onChange={(v) => v && set("date", v)} className="ring-1 ring-ink/10" />
              <label className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 ring-1 ring-ink/10">
                <Clock className="size-4 text-stone" aria-hidden />
                <select value={f.start} onChange={(e) => setF((x) => ({ ...x, start: e.target.value, end: plus(e.target.value, Math.max(15, duration)) }))} className="bg-transparent text-sm font-medium outline-none" aria-label="Beginn">
                  {timeSlots.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <span className="text-stone">–</span>
                <select value={f.end} onChange={(e) => set("end", e.target.value)} className="bg-transparent text-sm font-medium outline-none" aria-label="Ende">
                  {timeSlots.filter((t) => minutes(t) > minutes(f.start)).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-1">
                {[30, 60, 90, 120].map((m) => (
                  <button key={m} type="button" onClick={() => set("end", plus(f.start, m))} className={cn("h-8 rounded-lg px-2.5 text-xs font-medium ring-1", duration === m ? "bg-ink text-white ring-ink" : "text-stone-dark ring-ink/10 hover:bg-ink/[0.04]")}>
                    {m < 60 ? `${m} Min.` : `${m / 60} Std.`.replace(".5", ",5")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mitarbeiter */}
          <div>
            <p className="adm-label">Wer ist dabei?</p>
            <div className="flex flex-wrap gap-1.5">
              {team.map((m) => {
                const on = f.staff.includes(m.email);
                return (
                  <button key={m.email} type="button" onClick={() => set("staff", on ? f.staff.filter((x) => x !== m.email) : [...f.staff, m.email])} className={cn("inline-flex h-10 items-center gap-2 rounded-full pl-1 pr-3.5 text-sm ring-1 transition", on ? "bg-ink font-semibold text-white ring-ink" : "bg-white ring-ink/10 hover:bg-ink/[0.03]")}>
                    <Avatar email={m.email} team={team} size={30} />
                    {m.name}
                    {on ? <Check className="size-4" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inhalt */}
          <div className="grid gap-3">
            <div>
              <label className="adm-label" htmlFor="ap-title">
                Titel <span className="font-normal text-stone">(optional – sonst „Art · Kunde“)</span>
              </label>
              <input id="ap-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="z. B. Schaufensterbeschriftung besprechen" className="adm-input" />
            </div>
            <div>
              <label className="adm-label" htmlFor="ap-agenda">
                Worum geht es? / Was wird erledigt?
              </label>
              <textarea id="ap-agenda" value={f.agenda} onChange={(e) => set("agenda", e.target.value)} rows={3} placeholder={"• Logo-Entwürfe zeigen\n• Maße der Fenster aufnehmen\n• Preis für Folienbeschriftung besprechen"} className="adm-input" />
            </div>
            <label className="flex items-center gap-2 rounded-xl px-3 ring-1 ring-ink/10 focus-within:ring-accent/40">
              <MapPin className="size-4 text-stone" aria-hidden />
              <input value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Ort – z. B. im Laden, beim Kunden: Bahnhofstr. 5, Saarbrücken, Telefon, Video" className="h-11 w-full bg-transparent text-sm outline-none" />
            </label>
            <div>
              <label className="adm-label" htmlFor="ap-notes">
                Interne Notiz
              </label>
              <textarea id="ap-notes" value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Nur für das Team: Parken hinten, Ansprechpartner Herr …" className="adm-input" />
            </div>
          </div>

          {appointment ? (
            <div>
              <p className="adm-label">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {appointmentStatuses.map((s) => (
                  <button key={s} type="button" onClick={() => set("status", s)} className={cn("h-9 rounded-xl px-3.5 text-sm font-medium ring-1 transition", f.status === s ? `${appointmentStatusInfo[s].chip} ring-transparent` : "text-stone-dark ring-ink/10 hover:bg-ink/[0.03]")}>
                    {appointmentStatusInfo[s].label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 border-t border-ink/[0.06] px-5 py-3.5">
          {appointment ? (
            <button type="button" onClick={remove} className="grid size-10 place-items-center rounded-xl text-stone-dark ring-1 ring-ink/10 hover:bg-red-50 hover:text-red-600" aria-label="Termin löschen">
              <Trash2 className="size-4" />
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="adm-btn adm-btn-ghost ml-auto">
            Abbrechen
          </button>
          <button type="button" onClick={submit} disabled={pending} className="adm-btn adm-btn-primary">
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} {appointment ? "Speichern" : "Termin anlegen"}
          </button>
        </div>
      </div>
    </div>
  );
}
