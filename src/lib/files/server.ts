import "server-only";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { isFileStatus, type FileStatus, type FolderEntry, type StoredFile } from "./shared";

const COLS = "id, name, size, content_type, folder, category, status_changed_at, project_id, message, status, assigned_to, uploaded_by, created_at, project:projects(id, number, title, customer_name, company_name)";

function normalize(row: Record<string, unknown>): StoredFile {
  const project = Array.isArray(row.project) ? row.project[0] : row.project;
  return {
    ...(row as unknown as StoredFile),
    size: Number(row.size ?? 0),
    folder: String(row.folder ?? ""),
    category: (row.category as string) ?? null,
    status: isFileStatus(row.status) ? row.status : "neu",
    project: (project as StoredFile["project"]) ?? null,
  };
}

export async function listFiles(opts: { status?: FileStatus; q?: string; projectId?: string; assignedTo?: string; folder?: string; category?: string; limit?: number } = {}): Promise<StoredFile[]> {
  let q = db().from("files").select(COLS).eq("complete", true);
  if (opts.category) q = q.eq("category", opts.category);
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
  const counts: Record<FileStatus | "alle" | "aktiv", number> = { alle: 0, aktiv: 0, neu: 0, bearbeitung: 0, erledigt: 0 };
  for (const r of data ?? []) {
    counts.alle++;
    if (isFileStatus(r.status)) counts[r.status]++;
    if (r.status !== "erledigt") counts.aktiv++;
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

/** Unterordner direkt unterhalb von `folder` – aus angelegten Ordnern und Dateipfaden */
export async function subfolders(folder: string): Promise<FolderEntry[]> {
  const [{ data: stats }, { data: meta }] = await Promise.all([
    db().from("file_folder_stats").select("folder, file_count, total_size, last_upload"),
    db().from("file_folders").select("path, color, customer_id"),
  ]);
  const prefix = folder ? `${folder}/` : "";
  const map = new Map<string, FolderEntry>();
  const childOf = (path: string) => {
    if (!path || path === folder || (prefix && !path.startsWith(prefix))) return null;
    const name = path.slice(prefix.length).split("/")[0];
    return { child: prefix + name, name };
  };
  const entry = (child: string, name: string) => map.get(child) ?? { path: child, name, fileCount: 0, totalSize: 0, lastUpload: null, color: null, customerId: null };
  for (const r of meta ?? []) {
    const c = childOf(String(r.path));
    if (!c) continue;
    const e = entry(c.child, c.name);
    if (r.path === c.child) {
      e.color = (r.color as string) ?? null;
      e.customerId = (r.customer_id as string) ?? null;
    }
    map.set(c.child, e);
  }
  for (const r of stats ?? []) {
    const c = childOf(String(r.folder ?? ""));
    if (!c) continue;
    const e = entry(c.child, c.name);
    e.fileCount += Number(r.file_count);
    e.totalSize += Number(r.total_size);
    if (!e.lastUpload || (r.last_upload && r.last_upload > e.lastUpload)) e.lastUpload = r.last_upload;
    map.set(c.child, e);
  }
  return [...map.values()];
}

/** Alle Ordnerpfade (für „Verschieben nach …“) */
export async function allFolderPaths(): Promise<string[]> {
  const [{ data: a }, { data: b }] = await Promise.all([db().from("file_folders").select("path"), db().from("file_folder_stats").select("folder")]);
  const set = new Set<string>();
  for (const r of a ?? []) set.add(String(r.path));
  for (const r of b ?? []) if (r.folder) set.add(String(r.folder));
  return [...set].sort((x, y) => x.localeCompare(y, "de"));
}

export async function folderMeta(path: string) {
  if (!path) return null;
  const { data } = await db().from("file_folders").select("path, color, customer_id, customer:customers(id, name, company_name)").eq("path", path).maybeSingle();
  return data;
}

export async function usedCategories(): Promise<string[]> {
  const { data } = await db().from("files").select("category").eq("complete", true).not("category", "is", null).limit(5000);
  return [...new Set((data ?? []).map((r) => String(r.category)))].sort((a, b) => a.localeCompare(b, "de"));
}

export async function customerOptionsForFolders(): Promise<{ id: string; label: string }[]> {
  const { data } = await db().from("customers").select("id, name, company_name").order("updated_at", { ascending: false }).limit(500);
  return (data ?? []).map((c) => ({ id: c.id as string, label: ((c.company_name as string) || (c.name as string) || "").trim() })).filter((c) => c.label);
}

/** Nachbarn im selben Ordner (für Blättern im Betrachter) */
export async function siblings(folder: string): Promise<{ id: string; name: string }[]> {
  const { data } = await db().from("files").select("id, name").eq("complete", true).eq("folder", folder).order("name").limit(2000);
  return (data ?? []) as { id: string; name: string }[];
}

/** Signierte Miniatur-Links: gespeicherte Vorschau, sonst kleine Originalbilder */
export async function thumbnailUrls(files: { id: string; name: string; size: number }[]): Promise<Record<string, string>> {
  const { presignDownload, isR2Configured } = await import("./r2");
  const { thumbnailable } = await import("./shared");
  if (!isR2Configured() || !files.length) return {};
  const { data } = await db().from("files").select("id, object_key, thumb_key, name, size").in("id", files.map((f) => f.id).slice(0, 1000));
  const out: Record<string, string> = {};
  await Promise.all(
    (data ?? []).map(async (r) => {
      if (r.thumb_key) out[r.id] = await presignDownload(r.thumb_key, "vorschau.jpg", { inline: true, seconds: 3600, contentType: "image/jpeg" });
      else if (thumbnailable(r.name) && Number(r.size) <= 8 * 1024 ** 2) out[r.id] = await presignDownload(r.object_key, r.name, { inline: true, seconds: 3600 });
    }),
  );
  return out;
}

export async function fileEvents(id: string) {
  const { data } = await db().from("file_events").select("id, type, note, actor, created_at").eq("file_id", id).order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as { id: number; type: string; note: string | null; actor: string | null; created_at: string }[];
}

export type PrintDay = { date: string; path: string; total: number; size: number; byStatus: Partial<Record<FileStatus, number>>; last: string | null };

/** Druck-Tagesordner (Druck/JJJJ-MM-TT) mit Anzahl je Status – neueste zuerst */
export async function printDays(limit = 120): Promise<PrintDay[]> {
  const [{ data: files }, { data: metas }] = await Promise.all([
    db().from("files").select("folder, status, size, created_at").eq("complete", true).like("folder", "Druck/%").limit(20000),
    db().from("file_folders").select("path").like("path", "Druck/%"),
  ]);
  const map = new Map<string, PrintDay>();
  const day = (path: string) => {
    const m = /^Druck\/(\d{4}-\d{2}-\d{2})(?:\/|$)/.exec(path);
    if (!m) return null;
    const p = `Druck/${m[1]}`;
    const d = map.get(p) ?? { date: m[1], path: p, total: 0, size: 0, byStatus: {}, last: null };
    map.set(p, d);
    return d;
  };
  for (const m of metas ?? []) day(String(m.path));
  for (const f of files ?? []) {
    const d = day(String(f.folder));
    if (!d) continue;
    d.total++;
    d.size += Number(f.size);
    if (isFileStatus(f.status)) d.byStatus[f.status] = (d.byStatus[f.status] ?? 0) + 1;
    if (!d.last || f.created_at > d.last) d.last = f.created_at;
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

/** Dateien für die Ablauf-Übersicht: alles Offene + kürzlich Erledigtes */
export async function workflowFiles(): Promise<StoredFile[]> {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const [open, done] = await Promise.all([
    db().from("files").select(COLS).eq("complete", true).neq("status", "erledigt").order("created_at", { ascending: false }).limit(600),
    db().from("files").select(COLS).eq("complete", true).eq("status", "erledigt").gte("status_changed_at", since).order("status_changed_at", { ascending: false }).limit(100),
  ]);
  return [...(open.data ?? []), ...(done.data ?? [])].map(normalize);
}
