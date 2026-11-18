import "server-only";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { isFileStatus, type FileStatus, type StoredFile } from "./shared";

const COLS = "id, name, size, content_type, folder, project_id, message, status, assigned_to, uploaded_by, created_at, project:projects(id, number, title, customer_name, company_name)";

function normalize(row: Record<string, unknown>): StoredFile {
  const project = Array.isArray(row.project) ? row.project[0] : row.project;
  return {
    ...(row as unknown as StoredFile),
    size: Number(row.size ?? 0),
    folder: String(row.folder ?? ""),
    status: isFileStatus(row.status) ? row.status : "bearbeitung",
    project: (project as StoredFile["project"]) ?? null,
  };
}

export async function listFiles(opts: { status?: FileStatus; q?: string; projectId?: string; assignedTo?: string; folder?: string; limit?: number } = {}): Promise<StoredFile[]> {
  let q = db().from("files").select(COLS).eq("complete", true);
  if (opts.folder !== undefined) q = q.eq("folder", opts.folder);
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

export type FolderEntry = { path: string; name: string; fileCount: number; totalSize: number; lastUpload: string | null };

/** Unterordner direkt unterhalb von `folder` (mit Anzahl/Größe aller enthaltenen Dateien) */
export async function subfolders(folder: string): Promise<FolderEntry[]> {
  const { data } = await db().from("file_folder_stats").select("folder, file_count, total_size, last_upload");
  const prefix = folder ? `${folder}/` : "";
  const map = new Map<string, FolderEntry>();
  for (const r of data ?? []) {
    const path = String(r.folder ?? "");
    if (!path || (prefix && !path.startsWith(prefix)) || path === folder) continue;
    const rest = path.slice(prefix.length);
    const name = rest.split("/")[0];
    const child = prefix + name;
    const e = map.get(child) ?? { path: child, name, fileCount: 0, totalSize: 0, lastUpload: null };
    e.fileCount += Number(r.file_count);
    e.totalSize += Number(r.total_size);
    if (!e.lastUpload || (r.last_upload && r.last_upload > e.lastUpload)) e.lastUpload = r.last_upload;
    map.set(child, e);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Nachbarn im selben Ordner (für Blättern im Betrachter) */
export async function siblings(folder: string): Promise<{ id: string; name: string }[]> {
  const { data } = await db().from("files").select("id, name").eq("complete", true).eq("folder", folder).order("name").limit(2000);
  return (data ?? []) as { id: string; name: string }[];
}

/** Signierte Vorschaubild-Links für Bilder (kurzlebig, nur für angemeldete Seiten) */
export async function thumbnailUrls(files: { id: string; name: string; size: number }[]): Promise<Record<string, string>> {
  const { presignDownload, isR2Configured } = await import("./r2");
  const { thumbnailable } = await import("./shared");
  if (!isR2Configured()) return {};
  const ids = files.filter((f) => thumbnailable(f.name) && f.size <= 25 * 1024 ** 2).map((f) => f.id);
  if (!ids.length) return {};
  const { data } = await db().from("files").select("id, object_key, name").in("id", ids);
  const out: Record<string, string> = {};
  await Promise.all((data ?? []).map(async (r) => (out[r.id] = await presignDownload(r.object_key, r.name, { inline: true, seconds: 3600 }))));
  return out;
}
