import "server-only";
import { db } from "@/lib/supabase/admin";
import { addDays, berlinToIso, type Appointment, type CalendarItem } from "./shared";

export const APPOINTMENT_COLS = "id, title, kind, starts_at, ends_at, staff, customer_id, contact_name, contact_phone, location, agenda, notes, status, project_id, created_by, created_at, updated_at, customer:customers(id, name, company_name, phone)";

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
export const normalizeAppointment = (r: Record<string, unknown>) => ({ ...r, customer: one(r.customer as Appointment["customer"] | Appointment["customer"][]) }) as Appointment;

/** Termine im Zeitraum [from, to) – optional nur für eine Person / einen Kunden */
export async function listAppointments(opts: { from: string; to: string; staff?: string; customerId?: string; withProjects?: boolean }): Promise<CalendarItem[]> {
  const fromIso = berlinToIso(opts.from, "00:00");
  const toIso = berlinToIso(opts.to, "00:00");
  let q = db().from("appointments").select(APPOINTMENT_COLS).lt("starts_at", toIso).gt("ends_at", fromIso).order("starts_at");
  if (opts.staff) q = q.contains("staff", [opts.staff.toLowerCase()]);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  const { data } = await q.limit(1000);
  const items: CalendarItem[] = (data ?? []).map((r) => ({ source: "termin" as const, item: normalizeAppointment(r) }));

  if (opts.withProjects !== false && !opts.staff) {
    // Termine aus Aufträgen (Montage, Aufmaß …) mit anzeigen
    let pq = db().from("projects").select("id, number, title, customer_name, company_name, appointment_date, appointment_time, duration_hours, appointment_type, status").gte("appointment_date", opts.from).lt("appointment_date", opts.to).neq("status", "abgeschlossen");
    if (opts.customerId) pq = pq.eq("customer_id", opts.customerId);
    const { data: projects } = await pq.limit(300);
    for (const p of projects ?? []) {
      const time = (p.appointment_time as string | null)?.slice(0, 5) ?? "08:00";
      const start = berlinToIso(p.appointment_date as string, time);
      const hours = Number(p.duration_hours) > 0 ? Number(p.duration_hours) : p.appointment_time ? 1 : 8;
      items.push({
        source: "auftrag",
        item: { id: p.id, number: p.number, title: p.title, who: p.company_name || p.customer_name || "", starts_at: start, ends_at: new Date(new Date(start).getTime() + hours * 3600000).toISOString(), kind: (p.appointment_type as string) || "auftrag", status: p.status },
      });
    }
  }
  return items.sort((a, b) => a.item.starts_at.localeCompare(b.item.starts_at));
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const { data } = await db().from("appointments").select(APPOINTMENT_COLS).eq("id", id).maybeSingle();
  return data ? normalizeAppointment(data) : null;
}

/** Anzahl heutiger Termine für die Seitenleiste */
export async function todayCount(email: string, today: string) {
  const { count } = await db()
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .contains("staff", [email.toLowerCase()])
    .in("status", ["geplant", "bestaetigt"])
    .gte("starts_at", berlinToIso(today, "00:00"))
    .lt("starts_at", berlinToIso(addDays(today, 1), "00:00"));
  return count ?? 0;
}
