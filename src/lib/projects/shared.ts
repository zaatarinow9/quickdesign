/** Aufträge: Typen, Bezeichnungen und Hilfsfunktionen (client- und serverseitig nutzbar). */

export type ProjectStatus = "angenommen" | "in_arbeit" | "fertig" | "abgeschlossen";
export const projectStatuses: ProjectStatus[] = ["angenommen", "in_arbeit", "fertig", "abgeschlossen"];
export const isProjectStatus = (v: unknown): v is ProjectStatus => typeof v === "string" && (projectStatuses as string[]).includes(v);

export const projectStatusInfo: Record<ProjectStatus, { label: string; step: string; hint: string; tone: "blue" | "amber" | "green" | "gray" }> = {
  angenommen: { label: "Angenommen", step: "Auftrag angenommen", hint: "Angebot angenommen – Auftrag ist eingeplant", tone: "blue" },
  in_arbeit: { label: "In Arbeit", step: "In Produktion", hint: "Wird gestaltet bzw. produziert", tone: "amber" },
  fertig: { label: "Fertig", step: "Fertiggestellt", hint: "Bereit zur Montage, Lieferung oder Abholung", tone: "green" },
  abgeschlossen: { label: "Abgeschlossen", step: "Abgeschlossen", hint: "Montiert / übergeben", tone: "gray" },
};

export type AppointmentType = "montage" | "lieferung" | "abholung" | "besorgung" | "sonstiges";
export const appointmentTypes: AppointmentType[] = ["montage", "lieferung", "abholung", "besorgung", "sonstiges"];
/** Terminarten, die zu einem Kundenauftrag passen */
export const orderAppointmentTypes: AppointmentType[] = ["montage", "lieferung", "abholung"];
export const isAppointmentType = (v: unknown): v is AppointmentType => typeof v === "string" && (appointmentTypes as string[]).includes(v);
export const appointmentInfo: Record<AppointmentType, { label: string; noun: string; atCustomer: boolean }> = {
  montage: { label: "Montage", noun: "Montagetermin", atCustomer: true },
  lieferung: { label: "Lieferung", noun: "Liefertermin", atCustomer: true },
  abholung: { label: "Abholung", noun: "Abholtermin", atCustomer: false },
  besorgung: { label: "Material holen", noun: "Besorgung", atCustomer: true },
  sonstiges: { label: "Sonstiges", noun: "Termin", atCustomer: true },
};

export type ProjectKind = "auftrag" | "aufgabe";

export type Project = {
  id: string;
  number: string;
  kind: ProjectKind;
  offer_id: string | null;
  customer_id: string | null;
  title: string;
  customer_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: ProjectStatus;
  value_gross: number;
  appointment_type: AppointmentType | null;
  appointment_date: string | null;
  appointment_time: string | null;
  duration_hours: number | null;
  site_street: string | null;
  site_postal_code: string | null;
  site_city: string | null;
  site_maps_url: string | null;
  site_contact_name: string | null;
  site_contact_phone: string | null;
  crew_notes: string | null;
  collect_amount: number | null;
  internal_notes: string | null;
  accepted_at: string;
  started_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  appointment_notified_at: string | null;
  customer_reminder_sent_for: string | null;
  created_at: string;
  updated_at: string;
};

/** Finanzen eines Auftrags (aus verknüpften Rechnungen) */
export type ProjectFinance = { invoiced: number; paid: number; open: number; invoices: { id: string; number: string | null; status: string; gross: number; paid: number }[] };

export const customerLabel = (p: Pick<Project, "company_name" | "customer_name">) => p.company_name || p.customer_name;

/** Überschrift: „Kunde – Titel“ bzw. nur der Titel bei freien Terminen */
export const projectHeading = (p: Pick<Project, "company_name" | "customer_name" | "title">) => {
  const c = customerLabel(p)?.trim();
  return c ? `${c} – ${p.title}` : p.title;
};

export function siteAddress(p: Pick<Project, "site_street" | "site_postal_code" | "site_city">): string {
  return [p.site_street, [p.site_postal_code, p.site_city].filter(Boolean).join(" ")].filter((s) => s && s.trim()).join(", ");
}

const COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** Ziel für Karten-Links: Koordinaten, sonst Adresse */
function mapsQuery(p: Pick<Project, "site_street" | "site_postal_code" | "site_city" | "site_maps_url">): string | null {
  const raw = p.site_maps_url?.trim();
  if (raw && COORDS.test(raw)) return raw.replace(/\s+/g, "");
  const address = siteAddress(p);
  return address || null;
}

/** Link zur genauen Position: eingefügter Google-Maps-Link, Koordinaten oder Adresse */
export function mapsUrl(p: Pick<Project, "site_street" | "site_postal_code" | "site_city" | "site_maps_url">): string | null {
  const raw = p.site_maps_url?.trim();
  if (raw && /^https:\/\//i.test(raw)) return raw;
  const q = mapsQuery(p);
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/** Navigation starten (Google Maps Route) */
export function navigationUrl(p: Pick<Project, "site_street" | "site_postal_code" | "site_city" | "site_maps_url">): string | null {
  const raw = p.site_maps_url?.trim();
  const q = mapsQuery(p);
  if (q) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
  return raw && /^https:\/\//i.test(raw) ? raw : null;
}

/** Eingebettete Karte (ohne API-Schlüssel) */
export function mapsEmbedUrl(p: Pick<Project, "site_street" | "site_postal_code" | "site_city" | "site_maps_url">): string | null {
  const q = mapsQuery(p);
  return q ? `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=16&output=embed` : null;
}

const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "long", timeZone: "UTC" });
const weekdayShort = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "UTC" });
const dateDE = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : null);

/** "Donnerstag, 20.11.2026, 09:00 Uhr" */
export function formatAppointment(p: Pick<Project, "appointment_date" | "appointment_time" | "duration_hours">, opts: { short?: boolean } = {}): string {
  if (!p.appointment_date) return "";
  const d = new Date(`${p.appointment_date}T12:00:00Z`);
  const day = `${(opts.short ? weekdayShort : weekday).format(d)}, ${dateDE.format(d)}`;
  const time = hhmm(p.appointment_time);
  const dur = p.duration_hours && !opts.short ? ` (ca. ${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(p.duration_hours)} Std.)` : "";
  return time ? `${day}, ${time} Uhr${dur}` : `${day}${dur}`;
}

export function formatDayHeading(date: string, today: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const t = new Date(`${today}T12:00:00Z`);
  const diff = Math.round((d.getTime() - t.getTime()) / 864e5);
  const prefix = diff === 0 ? "Heute" : diff === 1 ? "Morgen" : diff === -1 ? "Gestern" : weekday.format(d);
  return `${prefix}, ${dateDE.format(d)}`;
}

/** Ortszeit Europe/Berlin → UTC */
export function berlinToUtc(date: string, time: string | null): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(guess));
  const get = (t: string) => Number(parts.find((x) => x.type === t)?.value);
  const asBerlin = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess - (asBerlin - guess));
}

const utf8Len = (s: string) => new TextEncoder().encode(s).length;
const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Kalendereintrag (.ics) für den Termin */
export function buildIcs(opts: { uid: string; date: string; time: string | null; durationHours: number | null; summary: string; location: string; description: string; organizer?: string }): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//QuickDesign//Verwaltung//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT", `UID:${opts.uid}`, `DTSTAMP:${icsStamp(new Date())}`];
  if (opts.time) {
    const start = berlinToUtc(opts.date, opts.time);
    const end = new Date(start.getTime() + Math.max(0.5, opts.durationHours ?? 2) * 36e5);
    lines.push(`DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`);
  } else {
    const next = new Date(`${opts.date}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    lines.push(`DTSTART;VALUE=DATE:${opts.date.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`);
  }
  lines.push(`SUMMARY:${icsEscape(opts.summary)}`);
  if (opts.location) lines.push(`LOCATION:${icsEscape(opts.location)}`);
  if (opts.description) lines.push(`DESCRIPTION:${icsEscape(opts.description)}`);
  if (opts.organizer) lines.push(`ORGANIZER;CN=QuickDesign:mailto:${opts.organizer}`);
  lines.push("BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(opts.summary)}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR");
  // Zeilen nach RFC 5545 auf 75 Oktette falten
  return lines
    .map((line) => {
      const out: string[] = [];
      let rest = line;
      while (utf8Len(rest) > 74) {
        let cut = 74;
        while (utf8Len(rest.slice(0, cut)) > 74) cut--;
        out.push(rest.slice(0, cut));
        rest = ` ${rest.slice(cut)}`;
      }
      out.push(rest);
      return out.join("\r\n");
    })
    .join("\r\n");
}
