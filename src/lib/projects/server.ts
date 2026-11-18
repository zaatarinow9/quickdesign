import "server-only";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings/server";
import { mailCompany } from "@/lib/admin/company";
import { logActivity } from "@/lib/admin/log";
import { sendMail, type SendResult } from "@/lib/email/send";
import { appointmentCustomerEmail, planEmail, projectStageEmail, type PlanEntry } from "@/lib/email/project-templates";
import type { EmailContent } from "@/lib/email/templates";
import { formatQty, greetingLine, type DocItem } from "@/lib/documents/format";
import type { Settings } from "@/lib/settings/schema";
import {
  appointmentInfo,
  buildIcs,
  formatDayHeading,
  projectHeading,
  isAppointmentType,
  isProjectStatus,
  siteAddress,
  type Project,
  type ProjectFinance,
  type ProjectStatus,
} from "./shared";

const num = (v: unknown) => Number(v ?? 0);
const numOrNull = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

export function normalizeProject(row: Record<string, unknown>): Project {
  return {
    ...(row as unknown as Project),
    status: isProjectStatus(row.status) ? row.status : "angenommen",
    kind: row.kind === "aufgabe" ? "aufgabe" : "auftrag",
    appointment_type: isAppointmentType(row.appointment_type) ? row.appointment_type : null,
    value_gross: num(row.value_gross),
    duration_hours: numOrNull(row.duration_hours),
    collect_amount: numOrNull(row.collect_amount),
  };
}

export async function getProject(id: string): Promise<Project | null> {
  const { data } = await db().from("projects").select("*").eq("id", id).maybeSingle();
  return data ? normalizeProject(data) : null;
}

export async function projectForOffer(offerId: string): Promise<Project | null> {
  const { data } = await db().from("projects").select("*").eq("offer_id", offerId).maybeSingle();
  return data ? normalizeProject(data) : null;
}

export async function listProjects(opts: { includeDone?: boolean; doneOnly?: boolean; q?: string; kind?: "auftrag" | "aufgabe" } = {}): Promise<Project[]> {
  let q = db().from("projects").select("*");
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.doneOnly) q = q.eq("status", "abgeschlossen");
  else if (!opts.includeDone) q = q.neq("status", "abgeschlossen");
  if (opts.q) {
    const t = opts.q.replace(/[%,()]/g, " ").trim();
    if (t) q = q.or(`title.ilike.%${t}%,customer_name.ilike.%${t}%,company_name.ilike.%${t}%,number.ilike.%${t}%,site_city.ilike.%${t}%`);
  }
  const { data } = await q.order("updated_at", { ascending: false }).limit(opts.doneOnly ? 200 : 500);
  return (data ?? []).map(normalizeProject);
}

/** Termine in einem Zeitraum (inkl. abgeschlossener Aufträge für die Rückschau) */
export async function listAppointments(from: string, to: string): Promise<Project[]> {
  const { data } = await db()
    .from("projects")
    .select("*")
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .order("appointment_date")
    .order("appointment_time", { nullsFirst: true });
  return (data ?? []).map(normalizeProject);
}

/** Rechnungsbeträge je Angebot (Rechnungen, die aus dem Angebot erstellt wurden) */
export async function financeByOffer(offerIds: string[]): Promise<Map<string, ProjectFinance>> {
  const map = new Map<string, ProjectFinance>();
  const ids = offerIds.filter(Boolean);
  if (!ids.length) return map;
  const { data } = await db()
    .from("documents")
    .select("id, number, status, gross_total, paid_amount, source_document_id")
    .eq("kind", "rechnung")
    .in("source_document_id", ids)
    .neq("status", "storniert");
  for (const r of data ?? []) {
    const key = r.source_document_id as string;
    const f = map.get(key) ?? { invoiced: 0, paid: 0, open: 0, invoices: [] };
    const gross = num(r.gross_total);
    const paid = num(r.paid_amount);
    f.invoices.push({ id: r.id, number: r.number, status: r.status, gross, paid });
    if (r.status !== "entwurf") {
      f.invoiced += gross;
      f.paid += paid;
      f.open += Math.max(0, gross - paid);
    }
    map.set(key, f);
  }
  return map;
}

export async function logProjectEvent(projectId: string, type: string, note: string | null, actor: string | null) {
  try {
    await db().from("project_events").insert({ project_id: projectId, type, note: note?.slice(0, 1000) ?? null, actor });
  } catch {
    /* ignore */
  }
}

export async function projectEvents(projectId: string) {
  const { data } = await db().from("project_events").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as { id: number; type: string; note: string | null; actor: string | null; created_at: string }[];
}

/** Legt (falls noch nicht vorhanden) einen Auftrag zu einem angenommenen Angebot an. */
export async function ensureProjectForOffer(offerId: string, actor: string): Promise<{ id: string; created: boolean } | null> {
  const client = db();
  const existing = await projectForOffer(offerId);
  if (existing) return { id: existing.id, created: false };
  const { data: offer } = await client.from("documents").select("*").eq("id", offerId).eq("kind", "angebot").maybeSingle();
  if (!offer) return null;
  let site = { street: offer.street, postal_code: offer.postal_code, city: offer.city, phone: offer.phone };
  if (offer.customer_id && !site.street) {
    const { data: c } = await client.from("customers").select("street, postal_code, city, phone").eq("id", offer.customer_id).maybeSingle();
    if (c) site = { street: c.street, postal_code: c.postal_code, city: c.city, phone: site.phone ?? c.phone };
  }
  const { data, error } = await client
    .from("projects")
    .insert({
      offer_id: offerId,
      customer_id: offer.customer_id,
      title: String(offer.title || "Auftrag").slice(0, 200),
      customer_name: offer.customer_name,
      company_name: offer.company_name,
      email: offer.email,
      phone: site.phone,
      value_gross: offer.gross_total,
      site_street: site.street,
      site_postal_code: site.postal_code,
      site_city: site.city,
      accepted_at: offer.accepted_at ?? new Date().toISOString(),
      created_by: actor,
    })
    .select("id, number")
    .single();
  if (error || !data) {
    // Gleichzeitige Anlage: vorhandenen Auftrag verwenden
    const again = await projectForOffer(offerId);
    return again ? { id: again.id, created: false } : null;
  }
  await logProjectEvent(data.id, "angelegt", `aus Angebot ${offer.number ?? ""}`.trim(), actor);
  await logActivity(actor, "erstellt", "auftrag", data.id, `Auftrag ${data.number} aus Angebot ${offer.number ?? ""}`);
  return { id: data.id, created: true };
}

/** Kurze Positionsliste aus dem Angebot (für Team-E-Mails) */
export async function offerItems(offerId: string | null): Promise<{ description: string; quantity: string }[]> {
  if (!offerId) return [];
  const { data } = await db().from("documents").select("items").eq("id", offerId).maybeSingle();
  const items = Array.isArray(data?.items) ? (data.items as DocItem[]) : [];
  return items.slice(0, 30).map((i) => ({ description: i.description, quantity: `${formatQty(Number(i.quantity) || 0)} ${i.unit}` }));
}

export async function offerShareUrl(offerId: string | null): Promise<string | null> {
  if (!offerId) return null;
  const { data } = await db().from("documents").select("share_token, share_enabled").eq("id", offerId).maybeSingle();
  return data?.share_enabled && data.share_token ? `${env.siteUrl}/dokument/${data.share_token}` : null;
}

export const teamInbox = (s: Settings) => teamRecipients(s).join(", ");
export const adminProjectUrl = (id: string) => `${env.siteUrl}/admin/projekte/${id}`;

export function projectIcs(p: Project, s: Settings, audience: "kunde" | "team") {
  const info = appointmentInfo[p.appointment_type ?? "montage"];
  const location = info.atCustomer ? siteAddress(p) : `${s.company.street}, ${s.company.postalCode} ${s.company.city}`;
  const summary = audience === "team" ? `${info.label}: ${projectHeading(p)}` : `${info.noun} ${s.company.name}: ${p.title}`;
  const description =
    audience === "team"
      ? [p.number, p.site_contact_name, p.site_contact_phone || p.phone, p.collect_amount ? `Kassieren: ${p.collect_amount.toFixed(2).replace(".", ",")} €` : "", p.crew_notes, adminProjectUrl(p.id)]
          .filter(Boolean)
          .join("\n")
      : `${s.company.name} · ${s.company.phone}`;
  const content = buildIcs({
    uid: `${p.id}-${audience}@quickdesign24.de`,
    date: p.appointment_date!,
    time: p.appointment_time ? p.appointment_time.slice(0, 5) : null,
    durationHours: p.duration_hours,
    summary,
    location,
    description,
    organizer: s.company.email,
  });
  return { filename: `${info.noun}-${p.number}.ics`, content: new TextEncoder().encode(content), contentType: "text/calendar; charset=utf-8; method=PUBLISH" };
}

export async function sendStageMail(p: Project, status: ProjectStatus, message?: string | null): Promise<SendResult> {
  if (!p.email) return { ok: false, error: "Für diesen Auftrag ist keine Kunden-E-Mail hinterlegt." };
  const s = await getSettings();
  const content = projectStageEmail({
    siteUrl: env.siteUrl,
    company: mailCompany(s),
    project: p,
    status,
    greeting: greetingLine(null, p.customer_name),
    message,
    onlineUrl: await offerShareUrl(p.offer_id),
    signature: s.company.name,
  });
  return sendMail(p.email, content, { replyTo: s.notifications.inbox || s.company.email, kind: "auftrag", relatedId: p.id });
}

export async function sendAppointmentCustomerMail(p: Project, reminder = false): Promise<SendResult> {
  if (!p.email) return { ok: false, error: "Für diesen Auftrag ist keine Kunden-E-Mail hinterlegt." };
  if (!p.appointment_date) return { ok: false, error: "Kein Termin hinterlegt." };
  const s = await getSettings();
  const content = appointmentCustomerEmail({
    siteUrl: env.siteUrl,
    company: mailCompany(s),
    project: p,
    greeting: greetingLine(null, p.customer_name),
    reminder,
    onlineUrl: await offerShareUrl(p.offer_id),
    signature: s.company.name,
    ics: projectIcs(p, s, "kunde"),
  });
  return sendMail(p.email, content, { replyTo: s.notifications.inbox || s.company.email, kind: reminder ? "termin-erinnerung" : "termin", relatedId: p.id });
}

/** Empfänger des Einsatzplans (mehrere Adressen mit Komma möglich) */
export function teamRecipients(s: Settings): string[] {
  const list = (s.notifications.teamInbox || "").split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));
  return list.length ? [...new Set(list)] : [s.notifications.inbox || s.company.email];
}

async function planEntries(list: Project[]): Promise<PlanEntry[]> {
  return Promise.all(list.map(async (p) => ({ project: p, items: await offerItems(p.offer_id), adminUrl: adminProjectUrl(p.id) })));
}

async function sendToTeam(s: Settings, content: EmailContent, relatedId: string | null): Promise<{ sent: string[]; failed: string[]; error?: string }> {
  const sent: string[] = [];
  const failed: string[] = [];
  let error: string | undefined;
  for (const to of teamRecipients(s)) {
    const r = await sendMail(to, content, { kind: "einsatzplan", relatedId });
    if (r.ok) sent.push(to);
    else {
      failed.push(to);
      error = r.error;
    }
  }
  return { sent, failed, error };
}

/** Offene Termine eines Tages, nach Uhrzeit sortiert */
export async function dayTasks(date: string): Promise<Project[]> {
  return (await listAppointments(date, date)).filter((p) => p.status !== "abgeschlossen");
}

export async function planSentDates(dates: string[]): Promise<string[]> {
  const { data } = await db().from("daily_plan_runs").select("plan_date").in("plan_date", dates);
  return (data ?? []).map((r) => r.plan_date as string);
}

/** Einsatzplan für einen Tag senden (alle Aufgaben in einer E-Mail) */
export async function sendDayPlan(date: string, opts: { today: string; force?: boolean }): Promise<{ ok: boolean; count: number; message: string }> {
  const s = await getSettings();
  const list = await dayTasks(date);
  if (!list.length) return { ok: true, count: 0, message: "Für diesen Tag sind keine Termine geplant." };
  const content = planEmail({
    siteUrl: env.siteUrl,
    company: mailCompany(s),
    dayLabel: formatDayHeading(date, opts.today),
    entries: await planEntries(list),
    planUrl: `${env.siteUrl}/admin/projekte`,
  });
  const res = await sendToTeam(s, content, null);
  if (res.sent.length) {
    await db().from("daily_plan_runs").upsert({ plan_date: date, sent_at: new Date().toISOString(), recipients: res.sent.join(", "), task_count: list.length });
  }
  return res.sent.length
    ? { ok: true, count: list.length, message: `Einsatzplan mit ${list.length} Aufgabe${list.length === 1 ? "" : "n"} an ${res.sent.join(", ")} gesendet.` }
    : { ok: false, count: list.length, message: `Versand fehlgeschlagen: ${res.error ?? "unbekannt"}` };
}

/** Dringend: eine Aufgabe sofort an das Team senden */
export async function sendUrgentTask(p: Project, today: string): Promise<SendResult> {
  if (!p.appointment_date) return { ok: false, error: "Kein Termin hinterlegt." };
  const s = await getSettings();
  const content = planEmail({
    siteUrl: env.siteUrl,
    company: mailCompany(s),
    dayLabel: formatDayHeading(p.appointment_date, today),
    entries: await planEntries([p]),
    planUrl: `${env.siteUrl}/admin/projekte`,
    urgent: true,
    ics: projectIcs(p, s, "team"),
  });
  const res = await sendToTeam(s, content, p.id);
  return res.sent.length ? { ok: true } : { ok: false, error: res.error ?? "Versand fehlgeschlagen." };
}
