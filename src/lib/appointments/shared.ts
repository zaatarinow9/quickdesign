/** Termine: Typen, Arten, Status und Zeit-Helfer (Client und Server) – alle Zeiten in Berliner Zeit */

export type AppointmentKind = "beratung" | "besprechung" | "aufmass" | "montage" | "abholung" | "lieferung" | "fotoshooting" | "sonstiges";
export type AppointmentStatus = "geplant" | "bestaetigt" | "erledigt" | "abgesagt";

export const appointmentKinds: AppointmentKind[] = ["beratung", "besprechung", "aufmass", "montage", "abholung", "lieferung", "fotoshooting", "sonstiges"];
export const appointmentKindInfo: Record<AppointmentKind, { label: string; ar: string; color: string; soft: string }> = {
  beratung: { label: "Beratung", ar: "استشارة", color: "#7c3aed", soft: "#f3eefe" },
  besprechung: { label: "Besprechung", ar: "اجتماع", color: "#2563eb", soft: "#eaf1fe" },
  aufmass: { label: "Aufmaß", ar: "قياسات", color: "#ea580c", soft: "#fff1e8" },
  montage: { label: "Montage", ar: "تركيب", color: "#059669", soft: "#e8f8f1" },
  abholung: { label: "Abholung", ar: "استلام", color: "#0891b2", soft: "#e6f7fa" },
  lieferung: { label: "Lieferung", ar: "توصيل", color: "#0d9488", soft: "#e6f6f4" },
  fotoshooting: { label: "Fotoshooting", ar: "تصوير", color: "#db2777", soft: "#fdebf4" },
  sonstiges: { label: "Sonstiges", ar: "أخرى", color: "#64748b", soft: "#f1f4f7" },
};

export const appointmentStatuses: AppointmentStatus[] = ["geplant", "bestaetigt", "erledigt", "abgesagt"];
export const appointmentStatusInfo: Record<AppointmentStatus, { label: string; ar: string; chip: string }> = {
  geplant: { label: "Geplant", ar: "مخطط", chip: "bg-ink/[0.07] text-stone-dark" },
  bestaetigt: { label: "Bestätigt", ar: "مؤكد", chip: "bg-sky-100 text-sky-800" },
  erledigt: { label: "Erledigt", ar: "تم", chip: "bg-emerald-100 text-emerald-800" },
  abgesagt: { label: "Abgesagt", ar: "ملغى", chip: "bg-red-100 text-red-700" },
};

export const isAppointmentKind = (v: unknown): v is AppointmentKind => typeof v === "string" && (appointmentKinds as string[]).includes(v);
export const isAppointmentStatus = (v: unknown): v is AppointmentStatus => typeof v === "string" && (appointmentStatuses as string[]).includes(v);

export type Appointment = {
  id: string;
  title: string;
  kind: AppointmentKind;
  starts_at: string;
  ends_at: string;
  staff: string[];
  customer_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  location: string | null;
  agenda: string | null;
  notes: string | null;
  status: AppointmentStatus;
  project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customer?: { id: string; name: string; company_name: string | null; phone: string | null } | null;
};

/** Eintrag im Kalender: eigener Termin oder Termin aus einem Auftrag (nur lesen) */
export type CalendarItem =
  | { source: "termin"; item: Appointment }
  | { source: "auftrag"; item: { id: string; number: string; title: string; who: string; starts_at: string; ends_at: string; kind: string; status: string } };

export const TZ = "Europe/Berlin";

/** Versatz Berlin ↔ UTC in Minuten zu einem Zeitpunkt */
function offsetMinutes(at: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  return Math.round((asUtc - Math.floor(at.getTime() / 60000) * 60000) / 60000);
}

/** „2026-11-25" + „10:30" (Berlin) → ISO in UTC */
export function berlinToIso(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, min);
  const off = offsetMinutes(new Date(guess));
  return new Date(guess - off * 60000).toISOString();
}

/** ISO → { date: "YYYY-MM-DD", time: "HH:MM" } in Berliner Zeit */
export function isoToBerlin(iso: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Heute in Berlin (YYYY-MM-DD) */
export const todayBerlin = () => isoToBerlin(new Date().toISOString()).date;

/** Datum (YYYY-MM-DD) um n Tage verschieben */
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Montag der Woche */
export function weekStart(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const wd = (d.getUTCDay() + 6) % 7;
  return addDays(date, -wd);
}

export const timeLabel = (iso: string) => isoToBerlin(iso).time;
export const dayLabel = (date: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }) => new Intl.DateTimeFormat("de-DE", { ...opts, timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

/** Name, der im Kalender angezeigt wird */
export const appointmentWho = (a: Appointment) => (a.customer ? a.customer.company_name || a.customer.name : a.contact_name) || "";

/** Zeitraster für die Auswahl (15-Minuten-Schritte, 06:00–22:00) */
export const timeSlots = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => {
  const m = 6 * 60 + i * 15;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
