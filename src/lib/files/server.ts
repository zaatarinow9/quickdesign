import "server-only";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { isFileStatus, type FileStatus, type StoredFile } from "./shared";

const COLS = "id, name, size, content_type, project_id, message, status, assigned_to, uploaded_by, created_at, project:projects(id, number, title, customer_name, company_name)";

function normalize(row: Record<string, unknown>): StoredFile {
  const project = Array.isArray(row.project) ? row.project[0] : row.project;
  return {
    ...(row as unknown as StoredFile),
    size: Number(row.size ?? 0),
    status: isFileStatus(row.status) ? row.status : "bearbeitung",
    project: (project as StoredFile["project"]) ?? null,
  };
}

export async function listFiles(opts: { status?: FileStatus; q?: string; projectId?: string; assignedTo?: string; limit?: number } = {}): Promise<StoredFile[]> {
  let q = db().from("files").select(COLS).eq("complete", true);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.assignedTo) q = q.eq("assigned_to", opts.assignedTo);
  if (opts.q) {
    const t = opts.q.replace(/[%,()]/g, " ").trim();
    if (t) q = q.or(`name.ilike.%${t}%,message.ilike.%${t}%,uploaded_by.ilike.%${t}%`);
  }
  const { data } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 300);
  return (data ?? []).map(normalize);
}

export async function getFileRow(id: string) {
  const { data } = await db().from("files").select("*").eq("id", id).maybeSingle();
  return data as (Record<string, unknown> & { object_key: string; name: string; content_type: string | null; complete: boolean }) | null;
}

export async function fileCounts() {
  const { data } = await db().from("files").select("status").eq("complete", true);
  const counts: Record<FileStatus | "alle", number> = { alle: 0, bearbeitung: 0, druckfertig: 0, erledigt: 0 };
  for (const r of data ?? []) {
    counts.alle++;
    if (isFileStatus(r.status)) counts[r.status]++;
  }
  return counts;
}

/** Kollegen, denen man eine Datei zuweisen kann (Inhaber + aktive Mitarbeiter) */
export async function teamMembers(): Promise<{ email: string; name: string }[]> {
  const { data } = await db().from("admin_users").select("email, full_name, active").eq("active", true).order("full_name");
  const list = new Map<string, string>();
  for (const e of env.adminEmails) list.set(e.toLowerCase(), e);
  for (const u of data ?? []) list.set(String(u.email).toLowerCase(), (u.full_name as string) || String(u.email));
  return [...list.entries()].map(([email, name]) => ({ email, name }));
}

/** Aktive Aufträge/Termine zur Auswahl beim Hochladen */
export async function projectOptions(): Promise<{ id: string; label: string }[]> {
  const { data } = await db().from("projects").select("id, number, title, customer_name, company_name").neq("status", "abgeschlossen").order("updated_at", { ascending: false }).limit(200);
  return (data ?? []).map((p) => {
    const who = (p.company_name || p.customer_name || "").trim();
    return { id: p.id, label: `${p.number} · ${who ? `${who} – ` : ""}${p.title}` };
  });
}
