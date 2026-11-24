"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { displayName } from "@/lib/admin/profile";
import { elapsedSeconds, hoursLabel } from "@/lib/time/shared";

const uuid = z.uuid();
const refresh = () => revalidatePath("/admin", "layout");
const optId = (v?: string | null) => (v && uuid.safeParse(v).success ? v : null);

async function me() {
  const a = await assertAdmin();
  return { email: a.email.toLowerCase(), name: await displayName(a.email, a.name) };
}

/** Stoppuhr starten (läuft schon eine, wird sie vorher gespeichert) */
export async function startTimer(input: { customerId?: string | null; note?: string | null; taskId?: string | null }): Promise<{ ok?: boolean; error?: string }> {
  const u = await me();
  const client = db();
  const { data: running } = await client.from("time_entries").select("*").eq("user_email", u.email).is("ended_at", null).maybeSingle();
  if (running) {
    const now = new Date().toISOString();
    await client.from("time_entries").update({ ended_at: now, duration_seconds: elapsedSeconds({ ...running, ended_at: null, duration_seconds: null }), paused_at: null }).eq("id", running.id);
  }
  const { error } = await client.from("time_entries").insert({ user_email: u.email, user_name: u.name, customer_id: optId(input.customerId), task_id: optId(input.taskId), note: input.note?.trim().slice(0, 1000) || null });
  if (error) return { error: "Stoppuhr konnte nicht gestartet werden." };
  refresh();
  return { ok: true };
}

export async function pauseTimer(id: string) {
  const u = await me();
  if (!uuid.safeParse(id).success) return;
  await db().from("time_entries").update({ paused_at: new Date().toISOString() }).eq("id", id).eq("user_email", u.email).is("paused_at", null).is("ended_at", null);
  refresh();
}

export async function resumeTimer(id: string) {
  const u = await me();
  if (!uuid.safeParse(id).success) return;
  const client = db();
  const { data: e } = await client.from("time_entries").select("paused_at, paused_seconds").eq("id", id).eq("user_email", u.email).maybeSingle();
  if (!e?.paused_at) return;
  const add = Math.max(0, Math.floor((Date.now() - Date.parse(e.paused_at)) / 1000));
  await client.from("time_entries").update({ paused_at: null, paused_seconds: (e.paused_seconds ?? 0) + add }).eq("id", id);
  refresh();
}

/** Stoppen und speichern (mit Notiz, was gemacht wurde) */
export async function stopTimer(id: string, input: { note?: string | null; customerId?: string | null; discard?: boolean }): Promise<{ ok?: string; error?: string }> {
  const u = await me();
  if (!uuid.safeParse(id).success) return { error: "Ungültig." };
  const client = db();
  const { data: e } = await client.from("time_entries").select("*").eq("id", id).eq("user_email", u.email).maybeSingle();
  if (!e) return { error: "Nicht gefunden." };
  if (input.discard) {
    await client.from("time_entries").delete().eq("id", id);
    refresh();
    return { ok: "Verworfen." };
  }
  const now = new Date().toISOString();
  let paused = e.paused_seconds ?? 0;
  if (e.paused_at) paused += Math.max(0, Math.floor((Date.now() - Date.parse(e.paused_at)) / 1000));
  const secs = Math.max(0, Math.floor((Date.now() - Date.parse(e.started_at)) / 1000) - paused);
  await client
    .from("time_entries")
    .update({ ended_at: now, paused_at: null, paused_seconds: paused, duration_seconds: secs, note: input.note?.trim().slice(0, 1000) || e.note, customer_id: input.customerId === undefined ? e.customer_id : optId(input.customerId) })
    .eq("id", id);
  refresh();
  return { ok: `${hoursLabel(secs)} gespeichert.` };
}

/** Nachtragen, wenn die Uhr vergessen wurde */
export async function addManualEntry(input: { customerId?: string | null; date: string; minutes: number; note?: string | null }): Promise<{ ok?: string; error?: string }> {
  const u = await me();
  const min = Math.round(Number(input.minutes));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !(min > 0 && min <= 24 * 60)) return { error: "Bitte Datum und Dauer (Minuten) angeben." };
  const start = new Date(`${input.date}T09:00:00+01:00`);
  const secs = min * 60;
  await db().from("time_entries").insert({
    user_email: u.email,
    user_name: u.name,
    customer_id: optId(input.customerId),
    note: input.note?.trim().slice(0, 1000) || null,
    started_at: start.toISOString(),
    ended_at: new Date(start.getTime() + secs * 1000).toISOString(),
    duration_seconds: secs,
  });
  refresh();
  return { ok: `${hoursLabel(secs)} nachgetragen.` };
}

export async function updateEntry(id: string, input: { note?: string | null; minutes?: number; customerId?: string | null }) {
  await me();
  if (!uuid.safeParse(id).success) return { error: "Ungültig." };
  const patch: Record<string, unknown> = {};
  if (input.note !== undefined) patch.note = input.note?.trim().slice(0, 1000) || null;
  if (input.minutes !== undefined && input.minutes > 0) patch.duration_seconds = Math.round(input.minutes * 60);
  if (input.customerId !== undefined) patch.customer_id = optId(input.customerId);
  await db().from("time_entries").update(patch).eq("id", id);
  refresh();
  return { ok: "Gespeichert." };
}

export async function deleteEntry(id: string) {
  await me();
  if (!uuid.safeParse(id).success) return;
  await db().from("time_entries").delete().eq("id", id);
  refresh();
}

/** Kunden zur Auswahl in der Stoppuhr (wird erst beim Öffnen geladen) */
export async function customerOptionsAction() {
  await assertAdmin();
  const { customerOptionsForFolders } = await import("@/lib/files/server");
  return customerOptionsForFolders();
}
