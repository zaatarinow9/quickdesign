"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin, assertFullAccess } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";
import { parseDecimal } from "@/lib/documents/format";
import {
  ensureProjectForOffer,
  getProject,
  logProjectEvent,
  sendAppointmentCustomerMail,
  sendDayPlan,
  sendStageMail,
  sendUrgentTask,
} from "@/lib/projects/server";
import { todayBerlin } from "@/lib/documents/format";
import { appointmentTypes, formatAppointment, isProjectStatus, projectStatusInfo, type AppointmentType } from "@/lib/projects/shared";
import type { ActionState } from "./document-actions";

const uuid = z.uuid();

function paths(id?: string) {
  revalidatePath("/admin/projekte");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/projekte/${id}`);
}

/** Aus einem Angebot heraus: Auftrag öffnen (bei Bedarf anlegen) */
export async function openProjectForOffer(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("offer_id"));
  if (!id.success) return;
  const res = await ensureProjectForOffer(id.data, admin.email);
  if (!res) return;
  paths(res.id);
  redirect(`/admin/projekte/${res.id}`);
}

const stamp: Record<string, string> = { in_arbeit: "started_at", fertig: "ready_at", abgeschlossen: "completed_at" };

export async function setProjectStatus(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  const status = fd.get("status");
  if (!id.success || !isProjectStatus(status)) return { error: "Ungültige Eingabe." };
  const project = await getProject(id.data);
  if (!project) return { error: "Auftrag nicht gefunden." };
  const notify = fd.get("notify") === "on";
  const message = String(fd.get("message") ?? "").trim().slice(0, 2000) || null;

  const patch: Record<string, unknown> = { status };
  if (stamp[status] && !project[stamp[status] as keyof typeof project]) patch[stamp[status]] = new Date().toISOString();
  const { error } = await db().from("projects").update(patch).eq("id", id.data);
  if (error) return { error: "Status konnte nicht gespeichert werden." };
  await logProjectEvent(id.data, "status", `→ ${projectStatusInfo[status].label}`, admin.email);
  await logActivity(admin.email, "status", "auftrag", id.data, `Auftrag ${project.number}: ${projectStatusInfo[status].label}`);

  let mailNote = "";
  if (notify) {
    const res = await sendStageMail({ ...project, status }, status, message);
    if (res.ok) {
      await logProjectEvent(id.data, "e-mail", `Kunde informiert (${projectStatusInfo[status].label})`, admin.email);
      mailNote = " Kunde wurde per E-Mail informiert.";
    } else mailNote = ` E-Mail an den Kunden fehlgeschlagen: ${res.error}`;
  }
  paths(id.data);
  return { ok: `Status: ${projectStatusInfo[status].label}.${mailNote}` };
}

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const projectSchema = z.object({
  title: z.string().trim().min(1, { error: "Bitte einen Titel angeben." }).max(200),
  email: z.union([z.literal(""), z.email({ error: "Ungültige E-Mail-Adresse." }).max(254)]).transform((v) => v.toLowerCase() || null),
  phone: opt(60),
  appointment_type: z.union([z.enum(appointmentTypes as [AppointmentType, ...AppointmentType[]]), z.literal("")]).transform((v) => v || null),
  appointment_date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).transform((v) => v || null),
  appointment_time: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal("")]).transform((v) => v || null),
  duration_hours: z.number().min(0).max(240).nullable(),
  site_street: opt(160),
  site_postal_code: opt(12),
  site_city: opt(80),
  site_maps_url: opt(1000).refine((v) => !v || /^https:\/\//i.test(v) || /^-?\d{1,2}(\.\d+)?\s*,\s*-?\d{1,3}(\.\d+)?$/.test(v), {
    error: "Bitte einen https-Link (Google Maps) oder Koordinaten wie 52.52, 13.40 eingeben.",
  }),
  site_contact_name: opt(160),
  site_contact_phone: opt(60),
  crew_notes: opt(4000),
  collect_amount: z.number().min(0).max(1_000_000).nullable(),
  internal_notes: opt(10000),
});

export async function saveProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Ungültiger Auftrag." };
  const before = await getProject(id.data);
  if (!before) return { error: "Auftrag nicht gefunden." };
  const s = (k: string) => String(fd.get(k) ?? "");
  const dec = (k: string) => (s(k).trim() ? (parseDecimal(s(k)) ?? Number.NaN) : null);
  const parsed = projectSchema.safeParse({
    title: s("title"),
    email: s("email").trim(),
    phone: s("phone"),
    appointment_type: s("appointment_type"),
    appointment_date: s("appointment_date"),
    appointment_time: s("appointment_time"),
    duration_hours: dec("duration_hours"),
    site_street: s("site_street"),
    site_postal_code: s("site_postal_code"),
    site_city: s("site_city"),
    site_maps_url: s("site_maps_url"),
    site_contact_name: s("site_contact_name"),
    site_contact_phone: s("site_contact_phone"),
    crew_notes: s("crew_notes"),
    collect_amount: dec("collect_amount"),
    internal_notes: s("internal_notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Bitte Eingaben prüfen." };
  const data = parsed.data;
  if (data.appointment_date && !data.appointment_type) data.appointment_type = "montage";
  if (!data.appointment_date) data.appointment_time = null;

  const { error } = await db().from("projects").update(data).eq("id", id.data);
  if (error) return { error: "Speichern fehlgeschlagen." };
  const after = (await getProject(id.data))!;

  const key = (p: typeof before) => [p.appointment_type, p.appointment_date, p.appointment_time?.slice(0, 5), p.site_street, p.site_postal_code, p.site_city].join("|");
  const apptChanged = key(before) !== key(after);
  if (apptChanged) {
    await logProjectEvent(id.data, "termin", after.appointment_date ? formatAppointment(after) : "Termin entfernt", admin.email);
    if (after.appointment_date !== before.appointment_date) await db().from("projects").update({ customer_reminder_sent_for: null }).eq("id", id.data);
  } else await logProjectEvent(id.data, "bearbeitet", null, admin.email);

  const notes: string[] = [];
  if (after.appointment_date) {
    if (fd.get("notify_customer") === "on") {
      const r = await sendAppointmentCustomerMail(after);
      if (r.ok) {
        notes.push("Kunde informiert");
        await logProjectEvent(id.data, "e-mail", "Termin an Kunden gesendet", admin.email);
      } else notes.push(`Kunden-E-Mail fehlgeschlagen: ${r.error}`);
    }
    if (fd.get("urgent") === "on") {
      const r = await sendUrgentTask(after, todayBerlin());
      if (r.ok) {
        notes.push("Dringend an Mitarbeiter gesendet");
        await logProjectEvent(id.data, "e-mail", "Dringend an Mitarbeiter gesendet", admin.email);
        await db().from("projects").update({ appointment_notified_at: new Date().toISOString() }).eq("id", id.data);
      } else notes.push(`Senden an Mitarbeiter fehlgeschlagen: ${r.error}`);
    }
  }
  paths(id.data);
  return { ok: ["Gespeichert.", ...notes].join(" · ") };
}

export async function deleteProject(fd: FormData) {
  const admin = await assertFullAccess();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data } = await db().from("projects").delete().eq("id", id.data).select("number").maybeSingle();
  await logActivity(admin.email, "gelöscht", "auftrag", id.data, `Auftrag ${data?.number ?? ""} gelöscht`);
  paths();
  redirect("/admin/projekte");
}

/** Freier Termin ohne Angebot (z. B. Material holen, Besprechung) */
export async function createTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await assertAdmin();
  const title = String(fd.get("title") ?? "").trim().slice(0, 200);
  if (!title) return { error: "Bitte kurz beschreiben, worum es geht." };
  const type = String(fd.get("appointment_type") ?? "besorgung");
  const date = String(fd.get("appointment_date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Bitte ein Datum wählen." };
  const time = String(fd.get("appointment_time") ?? "");
  const { data, error } = await db()
    .from("projects")
    .insert({
      kind: "aufgabe",
      title,
      customer_name: "",
      appointment_type: (appointmentTypes as string[]).includes(type) ? type : "sonstiges",
      appointment_date: date,
      appointment_time: /^\d{2}:\d{2}$/.test(time) ? time : null,
      status: "fertig",
      created_by: admin.email,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Termin konnte nicht angelegt werden." };
  await logProjectEvent(data.id, "angelegt", "Freier Termin", admin.email);
  paths(data.id);
  redirect(`/admin/projekte/${data.id}?neu=1`);
}

/** Einsatzplan eines Tages sofort senden (z. B. wenn sich kurzfristig etwas geändert hat) */
export async function sendPlanNow(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const date = String(fd.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Ungültiges Datum." };
  const res = await sendDayPlan(date, { today: todayBerlin() });
  paths();
  return res.ok ? { ok: res.message } : { error: res.message };
}
