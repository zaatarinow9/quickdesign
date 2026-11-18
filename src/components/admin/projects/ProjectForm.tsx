"use client";

import { useActionState, useMemo, useState } from "react";
import { CalendarClock, Check, ClipboardList, Loader2, Mail, MapPin, Navigation, UserRound, Wallet } from "lucide-react";
import { saveProject } from "@/app/admin/project-actions";
import type { ActionState } from "@/app/admin/document-actions";
import { formatEuro, formatNumber } from "@/lib/documents/format";
import { appointmentInfo, appointmentTypes, formatAppointment, hhmm, mapsEmbedUrl, navigationUrl, type AppointmentType, type Project } from "@/lib/projects/shared";
import { appointmentIcons } from "./AppointmentIcons";
import { Notice } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

const money = (n: number | null) => (n === null || n === undefined ? "" : formatNumber(n, 2).replace(/\./g, ""));

export function ProjectForm({ project, openAmount, teamInbox }: { project: Project; openAmount: number | null; teamInbox: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProject, {});
  const [f, setF] = useState({
    title: project.title,
    email: project.email ?? "",
    phone: project.phone ?? "",
    appointment_type: (project.appointment_type ?? "montage") as AppointmentType,
    appointment_date: project.appointment_date ?? "",
    appointment_time: hhmm(project.appointment_time) ?? "",
    duration_hours: project.duration_hours ? String(project.duration_hours).replace(".", ",") : "",
    site_street: project.site_street ?? "",
    site_postal_code: project.site_postal_code ?? "",
    site_city: project.site_city ?? "",
    site_maps_url: project.site_maps_url ?? "",
    site_contact_name: project.site_contact_name ?? "",
    site_contact_phone: project.site_contact_phone ?? "",
    crew_notes: project.crew_notes ?? "",
    collect_amount: money(project.collect_amount),
    internal_notes: project.internal_notes ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  // Karte erst nach Verlassen eines Adressfeldes aktualisieren
  const [mapKey, setMapKey] = useState({ site_street: f.site_street, site_postal_code: f.site_postal_code, site_city: f.site_city, site_maps_url: f.site_maps_url });
  const commitMap = () => setMapKey({ site_street: f.site_street, site_postal_code: f.site_postal_code, site_city: f.site_city, site_maps_url: f.site_maps_url });
  const embed = mapsEmbedUrl(mapKey);
  const nav = navigationUrl(mapKey);

  const original = [project.appointment_type ?? "montage", project.appointment_date ?? "", hhmm(project.appointment_time) ?? "", project.site_street ?? "", project.site_postal_code ?? "", project.site_city ?? ""].join("|");
  const current = [f.appointment_type, f.appointment_date, f.appointment_time, f.site_street, f.site_postal_code, f.site_city].join("|");
  const changed = original !== current || (!!f.appointment_date && !project.appointment_notified_at);
  const atCustomer = appointmentInfo[f.appointment_type].atCustomer;
  const preview = useMemo(
    () => (f.appointment_date ? formatAppointment({ appointment_date: f.appointment_date, appointment_time: f.appointment_time || null, duration_hours: Number(f.duration_hours.replace(",", ".")) || null }) : ""),
    [f.appointment_date, f.appointment_time, f.duration_hours],
  );

  return (
    <form action={action} className="space-y-6" key={project.updated_at}>
      <input type="hidden" name="id" value={project.id} />

      {/* Termin */}
      <section className="adm-card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <CalendarClock className="size-4 text-accent" aria-hidden /> Termin
        </h2>
        <input type="hidden" name="appointment_type" value={f.appointment_type} />
        <div className="mb-4 grid grid-cols-3 gap-2">
          {appointmentTypes.map((t) => {
            const Icon = appointmentIcons[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setF((s) => ({ ...s, appointment_type: t }))}
                aria-pressed={f.appointment_type === t}
                className={cn("flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm ring-1", f.appointment_type === t ? "bg-accent/[0.07] font-semibold text-accent ring-2 ring-accent" : "bg-white ring-ink/10 hover:ring-ink/25")}
              >
                <Icon className="size-4" aria-hidden /> {appointmentInfo[t].label}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="adm-label" htmlFor="appointment_date">
              Datum
            </label>
            <input id="appointment_date" name="appointment_date" type="date" className="adm-input" value={f.appointment_date} onChange={set("appointment_date")} />
          </div>
          <div>
            <label className="adm-label" htmlFor="appointment_time">
              Uhrzeit
            </label>
            <input id="appointment_time" name="appointment_time" type="time" step={900} className="adm-input" value={f.appointment_time} onChange={set("appointment_time")} />
          </div>
          <div>
            <label className="adm-label" htmlFor="duration_hours">
              Dauer (Std.)
            </label>
            <input id="duration_hours" name="duration_hours" inputMode="decimal" placeholder="z. B. 3" className="adm-input" value={f.duration_hours} onChange={set("duration_hours")} />
          </div>
        </div>
        {preview ? <p className="mt-2 text-sm text-stone-dark">{appointmentInfo[f.appointment_type].noun}: <strong className="text-ink">{preview}</strong></p> : <p className="mt-2 text-xs text-stone-dark">Noch kein Termin – Datum wählen, um einen Termin einzuplanen.</p>}
      </section>

      {/* Einsatzort */}
      <section className="adm-card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <MapPin className="size-4 text-accent" aria-hidden /> {atCustomer ? "Einsatzort" : "Kontakt"}
        </h2>
        {!atCustomer ? <p className="mb-3 text-xs text-stone-dark">Abholung im Laden – der Einsatzort wird nur zur Information gespeichert.</p> : <div className="mb-3" />}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid content-start gap-3 sm:grid-cols-6">
            <div className="sm:col-span-6">
              <label className="adm-label" htmlFor="site_street">
                Straße & Hausnummer
              </label>
              <input id="site_street" name="site_street" className="adm-input" value={f.site_street} onChange={set("site_street")} onBlur={commitMap} />
            </div>
            <div className="sm:col-span-2">
              <label className="adm-label" htmlFor="site_postal_code">
                PLZ
              </label>
              <input id="site_postal_code" name="site_postal_code" className="adm-input" value={f.site_postal_code} onChange={set("site_postal_code")} onBlur={commitMap} />
            </div>
            <div className="sm:col-span-4">
              <label className="adm-label" htmlFor="site_city">
                Ort
              </label>
              <input id="site_city" name="site_city" className="adm-input" value={f.site_city} onChange={set("site_city")} onBlur={commitMap} />
            </div>
            <div className="sm:col-span-6">
              <label className="adm-label" htmlFor="site_maps_url">
                Genaue Position (optional)
              </label>
              <input
                id="site_maps_url"
                name="site_maps_url"
                className="adm-input"
                placeholder="Google-Maps-Link oder Koordinaten, z. B. 52.5200, 13.4050"
                value={f.site_maps_url}
                onChange={set("site_maps_url")}
                onBlur={commitMap}
              />
              <p className="mt-1 text-xs text-stone-dark">Für Baustellen, Hallen oder Hintereingänge: In Google Maps auf den Punkt tippen → „Teilen“ → Link hier einfügen.</p>
            </div>
            <div className="sm:col-span-3">
              <label className="adm-label" htmlFor="site_contact_name">
                Ansprechpartner vor Ort
              </label>
              <input id="site_contact_name" name="site_contact_name" className="adm-input" placeholder={project.customer_name} value={f.site_contact_name} onChange={set("site_contact_name")} />
            </div>
            <div className="sm:col-span-3">
              <label className="adm-label" htmlFor="site_contact_phone">
                Telefon vor Ort
              </label>
              <input id="site_contact_phone" name="site_contact_phone" type="tel" className="adm-input" placeholder={project.phone ?? ""} value={f.site_contact_phone} onChange={set("site_contact_phone")} />
            </div>
          </div>
          <div className="overflow-hidden rounded-xl bg-ink/[0.03] ring-1 ring-ink/[0.06]">
            {embed ? (
              <>
                <iframe title="Karte Einsatzort" src={embed} className="h-64 w-full border-0 lg:h-[19rem]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                {nav ? (
                  <a href={nav} target="_blank" rel="noopener" className="flex items-center justify-center gap-1.5 border-t border-ink/[0.06] bg-white py-2.5 text-sm font-medium text-accent hover:bg-accent/5">
                    <Navigation className="size-4" aria-hidden /> Route in Google Maps starten
                  </a>
                ) : null}
              </>
            ) : (
              <div className="grid h-64 place-items-center p-6 text-center text-sm text-stone-dark">Adresse eingeben – die Karte erscheint hier.</div>
            )}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="adm-card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <ClipboardList className="size-4 text-accent" aria-hidden /> Für das Team
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="adm-label" htmlFor="crew_notes">
              Hinweise (Werkzeug, Material, Leiter, Anzahl Monteure, Zugang …)
            </label>
            <textarea id="crew_notes" name="crew_notes" rows={4} className="adm-input" value={f.crew_notes} onChange={set("crew_notes")} placeholder={"z. B. 2 Monteure, große Leiter, Bohrmaschine\nZugang über Hof, Parkplatz vor dem Tor"} />
          </div>
          <div>
            <label className="adm-label" htmlFor="collect_amount">
              Vor Ort kassieren (€)
            </label>
            <div className="relative">
              <Wallet className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone" aria-hidden />
              <input id="collect_amount" name="collect_amount" inputMode="decimal" placeholder="0,00" className="adm-input pl-9 text-right" value={f.collect_amount} onChange={set("collect_amount")} />
            </div>
            {openAmount !== null && openAmount > 0 ? (
              <button type="button" className="mt-1.5 text-xs text-accent hover:underline" onClick={() => setF((s) => ({ ...s, collect_amount: money(openAmount) }))}>
                Offenen Rechnungsbetrag übernehmen ({formatEuro(openAmount)})
              </button>
            ) : null}
            <p className="mt-1.5 text-xs text-stone-dark">Erscheint im Einsatzplan und in der Termin-E-Mail an den Kunden.</p>
          </div>
          <div className="sm:col-span-3">
            <label className="adm-label" htmlFor="internal_notes">
              Interne Notizen (nur für Sie und das Team)
            </label>
            <textarea id="internal_notes" name="internal_notes" rows={3} className="adm-input" value={f.internal_notes} onChange={set("internal_notes")} />
          </div>
        </div>
      </section>

      {/* Kunde */}
      <section className="adm-card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <UserRound className="size-4 text-accent" aria-hidden /> Auftrag & Kunde
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="adm-label" htmlFor="title">
              Titel
            </label>
            <input id="title" name="title" required className="adm-input" value={f.title} onChange={set("title")} />
          </div>
          <div>
            <label className="adm-label" htmlFor="email">
              E-Mail des Kunden
            </label>
            <input id="email" name="email" type="email" className="adm-input" value={f.email} onChange={set("email")} placeholder="für Status- und Termin-E-Mails" />
          </div>
          <div>
            <label className="adm-label" htmlFor="phone">
              Telefon des Kunden
            </label>
            <input id="phone" name="phone" type="tel" className="adm-input" value={f.phone} onChange={set("phone")} />
          </div>
        </div>
      </section>

      {/* Speichern */}
      <div className="sticky bottom-0 z-10 -mx-1 rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-ink/10 backdrop-blur">
        {f.appointment_date ? (
          <div className="mb-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
            <label className={cn("flex items-center gap-2", !f.email && "opacity-50")}>
              <input type="checkbox" name="notify_customer" key={`c${changed}`} defaultChecked={changed && !!f.email} disabled={!f.email} className="size-4 accent-[var(--color-accent)]" />
              <Mail className="size-4 text-stone-dark" aria-hidden /> Kunde: Termin per E-Mail (mit Kalendereintrag){!f.email ? " – keine E-Mail" : ""}
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="notify_team" key={`t${changed}`} defaultChecked={changed} className="size-4 accent-[var(--color-accent)]" />
              <Mail className="size-4 text-stone-dark" aria-hidden /> Einsatzplan an {teamInbox}
            </label>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm" aria-live="polite">
            {state.error ? <Notice tone="error">{state.error}</Notice> : state.ok ? <span className="inline-flex items-center gap-1.5 text-emerald-700"><Check className="size-4" aria-hidden /> {state.ok}</span> : null}
          </div>
          <button type="submit" className="adm-btn adm-btn-primary min-w-40" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />} Speichern
          </button>
        </div>
      </div>
    </form>
  );
}
