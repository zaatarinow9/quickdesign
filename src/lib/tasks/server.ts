import "server-only";
import { db } from "@/lib/supabase/admin";
import { listFiles, thumbnailUrls } from "@/lib/files/server";
import type { Task } from "./shared";

const COLS = "*, customer:customers(id, name, company_name), checklist:task_checklist(done), comments:task_comments(count)";

function normalize(r: Record<string, unknown>): Task {
  const checklist = (r.checklist as { done: boolean }[] | null) ?? [];
  const comments = r.comments as { count: number }[] | null;
  const customer = Array.isArray(r.customer) ? r.customer[0] : r.customer;
  return {
    ...(r as unknown as Task),
    assignees: (r.assignees as string[]) ?? [],
    customer: (customer as Task["customer"]) ?? null,
    checklist_total: checklist.length,
    checklist_done: checklist.filter((c) => c.done).length,
    comment_count: comments?.[0]?.count ?? 0,
  };
}

export async function listTasks(opts: { assignee?: string; customerId?: string; q?: string; includeDone?: boolean } = {}): Promise<Task[]> {
  let q = db().from("tasks").select(COLS).order("position", { ascending: true }).limit(500);
  if (opts.assignee) q = q.contains("assignees", [opts.assignee]);
  if (opts.customerId) q = q.eq("customer_id", opts.customerId);
  if (opts.q) {
    const t = opts.q.replace(/[%,()*"\\]/g, " ").trim();
    if (t) q = q.or(`title.ilike.*${t}*,description.ilike.*${t}*`);
  }
  // Erledigte nur die letzten 30 Tage (sonst wird die Liste endlos)
  if (!opts.includeDone) q = q.or(`status.neq.erledigt,completed_at.gte.${new Date(Date.now() - 30 * 864e5).toISOString()}`);
  const { data } = await q;
  return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
}

export async function getTask(id: string) {
  const client = db();
  const [{ data: t }, { data: checklist }, { data: comments }, { data: events }] = await Promise.all([
    client.from("tasks").select(COLS).eq("id", id).maybeSingle(),
    client.from("task_checklist").select("id, text, done, position").eq("task_id", id).order("position").order("created_at"),
    client.from("task_comments").select("id, author, body, created_at").eq("task_id", id).order("created_at"),
    client.from("task_events").select("id, actor, type, note, created_at").eq("task_id", id).order("created_at"),
  ]);
  if (!t) return null;
  const task = normalize(t as Record<string, unknown>);
  const files = task.folder ? await listFiles({ folder: task.folder, limit: 100 }) : [];
  const thumbs = await thumbnailUrls(files);
  return {
    task,
    checklist: (checklist ?? []) as { id: string; text: string; done: boolean; position: number }[],
    comments: (comments ?? []) as { id: number; author: string; body: string; created_at: string }[],
    events: (events ?? []) as { id: number; actor: string | null; type: string; note: string | null; created_at: string }[],
    files,
    thumbs,
  };
}

/** Offene Aufgaben + Aufgaben mit neuer Aktivität, die ich noch nicht gesehen habe */
export async function taskBadge(email: string): Promise<{ open: number; unread: string[] }> {
  const me = email.toLowerCase();
  const client = db();
  const [{ data: mine }, { data: seen }] = await Promise.all([
    client.from("tasks").select("id, updated_at, created_by, status, assignees").or(`assignees.cs.{${me}},created_by.eq.${me}`).neq("status", "erledigt").limit(500),
    client.from("task_seen").select("task_id, seen_at").eq("email", me).limit(2000),
  ]);
  const seenAt = new Map((seen ?? []).map((s) => [s.task_id as string, s.seen_at as string]));
  const list = mine ?? [];
  const unread = list.filter((t) => {
    const s = seenAt.get(t.id as string);
    return s ? (t.updated_at as string) > s : t.created_by !== me;
  });
  return { open: list.filter((t) => ((t.assignees as string[]) ?? []).includes(me)).length, unread: unread.map((t) => t.id as string) };
}

export async function myOpenTaskCount(email: string) {
  return (await taskBadge(email)).open;
}
