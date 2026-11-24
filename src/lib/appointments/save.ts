import "server-only";
import { z } from "zod";
import { db } from "@/lib/supabase/admin";
import { berlinToIso, isAppointmentKind, isAppointmentStatus } from "./shared";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^\d{2}:\d{2}$/;
const opt = (n: number) => z.string().trim().max(n).optional().nullable().transform((v) => (v ? v : null));

export const appointmentInput = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1, "Bitte einen Titel angeben.").max(200),
  kind: z.string().refine(isAppointmentKind, "Unbekannte Art."),
  date: z.string().regex(dateRe, "Datum fehlt."),
  start: z.string().regex(timeRe, "Beginn fehlt."),
  end: z.string().regex(timeRe, "Ende fehlt."),
  staff: z.array(z.email()).max(20).default([]),
  customerId: z.uuid().optional().nullable(),
  contactName: opt(160),
  contactPhone: opt(60),
  location: opt(300),
  agenda: opt(4000),
  notes: opt(4000),
  status: z.string().refine(isAppointmentStatus).optional(),
  projectId: z.uuid().optional().nullable(),
});
export type AppointmentInput = z.input<typeof appointmentInput>;

/** Anlegen oder ändern – gemeinsam für Verwaltung und App. Meldet Überschneidungen bei Mitarbeitern. */
export async function saveAppointment(raw: unknown, actor: string): Promise<{ id?: string; error?: string; conflicts?: string[] }> {
  const parsed = appointmentInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  const v = parsed.data;
  const starts = berlinToIso(v.date, v.start);
  const ends = berlinToIso(v.date, v.end);
  if (ends <= starts) return { error: "Das Ende muss nach dem Beginn liegen." };
  if (!v.customerId && !v.contactName) return { error: "Bitte einen Kunden wählen oder einen Namen eintragen." };
  const staff = [...new Set(v.staff.map((e) => e.toLowerCase()))];
  const row = {
    title: v.title,
    kind: v.kind,
    starts_at: starts,
    ends_at: ends,
    staff,
    customer_id: v.customerId ?? null,
    contact_name: v.contactName,
    contact_phone: v.contactPhone,
    location: v.location,
    agenda: v.agenda,
    notes: v.notes,
    project_id: v.projectId ?? null,
    updated_by: actor.toLowerCase(),
    ...(v.status ? { status: v.status } : {}),
  };
  const client = db();
  let id = v.id;
  if (id) {
    const { error } = await client.from("appointments").update(row).eq("id", id);
    if (error) return { error: "Speichern fehlgeschlagen." };
  } else {
    const { data, error } = await client.from("appointments").insert({ ...row, created_by: actor.toLowerCase() }).select("id").single();
    if (error || !data) return { error: "Speichern fehlgeschlagen." };
    id = data.id as string;
  }
  // Überschneidungen (nur Hinweis, kein Abbruch)
  let conflicts: string[] = [];
  if (staff.length) {
    const { data: other } = await client.from("appointments").select("staff").neq("id", id).in("status", ["geplant", "bestaetigt"]).lt("starts_at", ends).gt("ends_at", starts).overlaps("staff", staff);
    conflicts = [...new Set((other ?? []).flatMap((o) => (o.staff as string[]).filter((s) => staff.includes(s))))];
  }
  return { id, conflicts };
}

export async function setAppointmentStatus(id: string, status: string, actor: string) {
  if (!z.uuid().safeParse(id).success || !isAppointmentStatus(status)) return { error: "Ungültig." };
  const { error } = await db().from("appointments").update({ status, updated_by: actor.toLowerCase() }).eq("id", id);
  return error ? { error: "Speichern fehlgeschlagen." } : { ok: true };
}

export async function removeAppointment(id: string) {
  if (!z.uuid().safeParse(id).success) return { error: "Ungültig." };
  const { error } = await db().from("appointments").delete().eq("id", id);
  return error ? { error: "Löschen fehlgeschlagen." } : { ok: true };
}
