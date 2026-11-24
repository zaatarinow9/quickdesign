"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { putInTrash } from "@/lib/admin/trash";
import { displayName } from "@/lib/admin/profile";
import { joinFolder } from "@/lib/files/shared";
import { teamMembers } from "@/lib/files/server";
import { isTaskPriority, isTaskStatus, taskPriorityInfo, taskStatusInfo, type TaskStatus } from "@/lib/tasks/shared";

const uuid = z.uuid();
const refresh = () => revalidatePath("/admin", "layout");
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const fmtDate = (d: string | null) => (d ? new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)) : null);

async function logEvent(taskId: string, actor: string, type: string, note: string | null) {
  await db().from("task_events").insert({ task_id: taskId, actor, type, note: note?.slice(0, 500) ?? null });
}

/** Benachrichtigung (ohne E-Mail): Glocke in der Verwaltung + Push in der Mitarbeiter-App */
function notify(taskId: string, to: string[], actor: { email: string; name: string }, kind: "neu" | "kommentar", comment?: string) {
  const list = [...new Set(to.map((e) => e.toLowerCase()))].filter((e) => e !== actor.email.toLowerCase());
  if (!list.length) return;
  after(async () => {
    const client = db();
    const { data: t } = await client.from("tasks").select("title, due_date, customer:customers(name, company_name)").eq("id", taskId).maybeSingle();
    if (!t) return;
    const c = (Array.isArray(t.customer) ? t.customer[0] : t.customer) as { name: string; company_name: string | null } | null;
    const kunde = c ? c.company_name || c.name : null;
    const due = fmtDate(t.due_date);
    const text = (comment ?? "").replace(/\s+/g, " ").slice(0, 160);
    for (const email of list) {
      await client
        .rpc("staff_notify_grouped", {
          p_category: "projekt",
          p_group: `task:${taskId}:${kind}`,
          p_target: email,
          p_title_de: kind === "neu" ? `Neue Aufgabe für dich${kunde ? ` · ${kunde}` : ""}` : `${actor.name} hat kommentiert${kunde ? ` · ${kunde}` : ""}`,
          p_body_de: kind === "neu" ? `${t.title}${due ? ` – fällig ${due}` : ""} (von ${actor.name})` : `${t.title}: ${text}`,
          p_title_ar: kind === "neu" ? `مهمة جديدة لك${kunde ? ` · ${kunde}` : ""}` : `${actor.name} علّق${kunde ? ` · ${kunde}` : ""}`,
          p_body_ar: kind === "neu" ? `${t.title} (من ${actor.name})` : `${t.title}: ${text}`,
          p_link: `/tasks/${taskId}`,
        })
        .then(() => {}, () => {});
    }
  });
}

/** Aufgabe als gelesen markieren (für die Zähler) */
export async function markTaskSeen(taskId: string) {
  const u = await actorOf();
  if (!uuid.safeParse(taskId).success) return;
  await db().from("task_seen").upsert({ task_id: taskId, email: u.email, seen_at: new Date().toISOString() }, { onConflict: "task_id,email" });
}

async function actorOf() {
  const admin = await assertAdmin();
  return { email: admin.email.toLowerCase(), name: await displayName(admin.email, admin.name) };
}

async function validAssignees(list: string[] | undefined) {
  if (!list) return undefined;
  const team = new Set((await teamMembers()).map((m) => m.email.toLowerCase()));
  return [...new Set(list.map((e) => e.toLowerCase()))].filter((e) => team.has(e)).slice(0, 10);
}

/** Neue Aufgabe – Ordner für Anhänge: beim Kunden (…/Aufgaben/Titel) oder unter Aufgaben/ */
export async function createTask(input: { title: string; status?: string; assignees?: string[]; due?: string | null; priority?: string; customerId?: string | null; description?: string | null }): Promise<{ id?: string; error?: string }> {
  const actor = await actorOf();
  const title = String(input.title ?? "").trim().slice(0, 300);
  if (!title) return { error: "Bitte einen Titel eingeben." };
  const client = db();
  const customerId = input.customerId && uuid.safeParse(input.customerId).success ? input.customerId : null;
  let folder: string | null = null;
  const safe = title.replace(/[\\/]/g, "-").slice(0, 60);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
  if (customerId) {
    const { data: c } = await client.from("customers").select("folder_path").eq("id", customerId).maybeSingle();
    if (c?.folder_path) folder = joinFolder(c.folder_path, "Aufgaben", `${day} ${safe}`);
  }
  folder ??= joinFolder("Aufgaben", `${day} ${safe}`);
  const assignees = (await validAssignees(input.assignees)) ?? [];
  const { data, error } = await client
    .from("tasks")
    .insert({
      title,
      status: isTaskStatus(input.status) ? input.status : "offen",
      priority: isTaskPriority(input.priority) ? input.priority : "normal",
      assignees,
      due_date: input.due && dateRe.test(input.due) ? input.due : null,
      customer_id: customerId,
      description: input.description?.trim().slice(0, 10000) || null,
      folder,
      created_by: actor.email,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Aufgabe konnte nicht angelegt werden." };
  await logEvent(data.id, actor.name, "erstellt", null);
  await client.from("task_seen").upsert({ task_id: data.id, email: actor.email, seen_at: new Date(Date.now() + 1000).toISOString() }, { onConflict: "task_id,email" });
  notify(data.id, assignees, actor, "neu");
  refresh();
  return { id: data.id };
}

export async function updateTask(input: {
  id: string;
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  assignees?: string[];
  due?: string | null;
  customerId?: string | null;
  position?: number;
}): Promise<{ ok?: boolean; error?: string }> {
  const actor = await actorOf();
  if (!uuid.safeParse(input.id).success) return { error: "Ungültig." };
  const client = db();
  const { data: before } = await client.from("tasks").select("status, assignees, priority, due_date, title").eq("id", input.id).maybeSingle();
  if (!before) return { error: "Aufgabe nicht gefunden." };
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const events: [string, string | null][] = [];
  if (input.title !== undefined && input.title.trim()) patch.title = input.title.trim().slice(0, 300);
  if (input.description !== undefined) patch.description = input.description?.trim().slice(0, 10000) || null;
  if (input.status !== undefined && isTaskStatus(input.status) && input.status !== before.status) {
    patch.status = input.status;
    patch.completed_at = input.status === "erledigt" ? new Date().toISOString() : null;
    events.push(["status", `${taskStatusInfo[before.status as TaskStatus].label} → ${taskStatusInfo[input.status].label}`]);
  }
  if (input.priority !== undefined && isTaskPriority(input.priority) && input.priority !== before.priority) {
    patch.priority = input.priority;
    events.push(["prioritaet", taskPriorityInfo[input.priority].label]);
  }
  if (input.due !== undefined) {
    const due = input.due && dateRe.test(input.due) ? input.due : null;
    if (due !== before.due_date) {
      patch.due_date = due;
      events.push(["faellig", due ? fmtDate(due) : "entfernt"]);
    }
  }
  if (input.customerId !== undefined) patch.customer_id = input.customerId && uuid.safeParse(input.customerId).success ? input.customerId : null;
  if (input.position !== undefined && Number.isFinite(input.position)) patch.position = input.position;
  let added: string[] = [];
  if (input.assignees !== undefined) {
    const next = (await validAssignees(input.assignees)) ?? [];
    const prev = (before.assignees as string[]) ?? [];
    added = next.filter((e) => !prev.includes(e));
    const removed = prev.filter((e) => !next.includes(e));
    patch.assignees = next;
    if (added.length) events.push(["zugewiesen", added.join(", ")]);
    if (removed.length) events.push(["entfernt", removed.join(", ")]);
  }
  const { error } = await client.from("tasks").update(patch).eq("id", input.id);
  if (error) return { error: "Speichern fehlgeschlagen." };
  for (const [type, note] of events) await logEvent(input.id, actor.name, type, note);
  await client.from("task_seen").upsert({ task_id: input.id, email: actor.email, seen_at: new Date(Date.now() + 1000).toISOString() }, { onConflict: "task_id,email" });
  if (added.length) notify(input.id, added, actor, "neu");
  refresh();
  return { ok: true };
}

export async function addChecklistItem(taskId: string, text: string) {
  const actor = await actorOf();
  const t = text.trim().slice(0, 300);
  if (!uuid.safeParse(taskId).success || !t) return { error: "Ungültig." };
  const { count } = await db().from("task_checklist").select("id", { count: "exact", head: true }).eq("task_id", taskId);
  await db().from("task_checklist").insert({ task_id: taskId, text: t, position: (count ?? 0) + 1 });
  void actor;
  refresh();
  return { ok: true };
}

export async function toggleChecklistItem(id: string, done: boolean) {
  await actorOf();
  if (!uuid.safeParse(id).success) return;
  await db().from("task_checklist").update({ done }).eq("id", id);
  refresh();
}

export async function deleteChecklistItem(id: string) {
  await actorOf();
  if (!uuid.safeParse(id).success) return;
  await db().from("task_checklist").delete().eq("id", id);
  refresh();
}

export async function addTaskComment(taskId: string, body: string): Promise<{ ok?: boolean; error?: string }> {
  const actor = await actorOf();
  const text = body.trim().slice(0, 6000);
  if (!uuid.safeParse(taskId).success || !text) return { error: "Leerer Kommentar." };
  const client = db();
  const { error } = await client.from("task_comments").insert({ task_id: taskId, author: actor.name, body: text });
  if (error) return { error: "Kommentar konnte nicht gespeichert werden." };
  await client.from("tasks").update({ updated_at: new Date().toISOString() }).eq("id", taskId);
  await client.from("task_seen").upsert({ task_id: taskId, email: actor.email, seen_at: new Date(Date.now() + 1000).toISOString() }, { onConflict: "task_id,email" });
  const { data: t } = await client.from("tasks").select("assignees, created_by").eq("id", taskId).maybeSingle();
  // Alle Beteiligten informieren (ohne den Schreibenden)
  if (t) notify(taskId, [...((t.assignees as string[]) ?? []), t.created_by].filter(Boolean) as string[], actor, "kommentar", text.slice(0, 600));
  refresh();
  return { ok: true };
}

/** Aufgabe in den Papierkorb */
export async function deleteTask(id: string): Promise<{ ok?: string; error?: string; trashIds?: string[] }> {
  const actor = await actorOf();
  if (!uuid.safeParse(id).success) return { error: "Ungültig." };
  const client = db();
  const [{ data: t }, { data: checklist }, { data: comments }, { data: events }] = await Promise.all([
    client.from("tasks").select("*").eq("id", id).maybeSingle(),
    client.from("task_checklist").select("*").eq("task_id", id),
    client.from("task_comments").select("*").eq("task_id", id),
    client.from("task_events").select("*").eq("task_id", id),
  ]);
  if (!t) return { error: "Nicht gefunden." };
  const trashId = await putInTrash({
    kind: "aufgabe",
    label: t.title,
    detail: ((t.assignees as string[]) ?? []).join(", "),
    snapshot: {
      inserts: [
        { table: "tasks", rows: [t] },
        { table: "task_checklist", rows: checklist ?? [] },
        { table: "task_comments", rows: comments ?? [], dropId: true },
        { table: "task_events", rows: events ?? [], dropId: true },
      ],
      relinks: [],
    },
    actor: actor.name,
  });
  await client.from("tasks").delete().eq("id", id);
  refresh();
  return { ok: "Aufgabe gelöscht.", trashIds: [trashId] };
}
