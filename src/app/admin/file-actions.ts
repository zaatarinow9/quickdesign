"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings/server";
import { mailCompany } from "@/lib/admin/company";
import { logActivity } from "@/lib/admin/log";
import { sendMail } from "@/lib/email/send";
import { fileNotifyEmail } from "@/lib/email/project-templates";
import { deleteObject, headObject, isR2Configured, presignUpload } from "@/lib/files/r2";
import { datePrefix, fileStatusInfo, folderColors, formatBytes, isFileStatus, type FileStatus, joinFolder, MAX_FILE_SIZE, normalizeFolder, parentFolder, UPLOAD_CHUNK } from "@/lib/files/shared";
import { logProjectEvent } from "@/lib/projects/server";
import type { ActionState } from "./document-actions";

const uuid = z.uuid();

function paths(projectId?: string | null) {
  revalidatePath("/admin/dateien");
  if (projectId) revalidatePath(`/admin/projekte/${projectId}`);
}

/** Ordner (inkl. aller Elternordner) in file_folders anlegen */
async function ensureFolders(paths: string[], actor: string, extra?: { color?: string | null; customerId?: string | null }) {
  const set = new Set<string>();
  for (const p of paths) {
    const segs = normalizeFolder(p).split("/").filter(Boolean);
    for (let i = 1; i <= segs.length; i++) set.add(segs.slice(0, i).join("/"));
  }
  if (!set.size) return;
  await db()
    .from("file_folders")
    .upsert([...set].map((path) => ({ path, created_by: actor })), { onConflict: "path", ignoreDuplicates: true });
  if (extra && paths.length === 1) {
    const patch: Record<string, unknown> = {};
    if (extra.color !== undefined) patch.color = extra.color;
    if (extra.customerId !== undefined) patch.customer_id = extra.customerId;
    if (Object.keys(patch).length) await db().from("file_folders").update(patch).eq("path", normalizeFolder(paths[0]));
  }
}

/** Dateiname für den Speicherschlüssel: nur sichere Zeichen */
function safeName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(-120) || "datei";
}

const startSchema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        size: z.number().int().min(1, { error: "Leere Dateien können nicht hochgeladen werden." }).max(MAX_FILE_SIZE, { error: "Eine Datei ist größer als 5 GB." }),
        type: z.string().max(200),
        /** Unterordner relativ zum Zielordner (bei hochgeladenen Ordnern) */
        dir: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(UPLOAD_CHUNK),
  folder: z.string().max(500).optional(),
  category: z.string().trim().max(60).nullable().optional(),
  projectId: uuid.nullable(),
  message: z.string().trim().max(4000).nullable(),
  assignedTo: z.email().max(254).nullable(),
});

/** Schritt 1: Upload-Links holen (die Dateien gehen direkt vom Browser zu R2) */
export async function startUpload(input: z.input<typeof startSchema>): Promise<{ error?: string; uploads?: { id: string; url: string; contentType: string }[] }> {
  const admin = await assertAdmin();
  if (!isR2Configured()) return { error: "Der Cloud-Speicher ist noch nicht eingerichtet (R2-Zugangsschlüssel fehlen)." };
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ungültige Dateien." };
  const { files, projectId, message, assignedTo } = parsed.data;
  const base = normalizeFolder(parsed.data.folder);

  let customerId: string | null = null;
  if (projectId) {
    const { data } = await db().from("projects").select("customer_id").eq("id", projectId).maybeSingle();
    if (!data) return { error: "Projekt nicht gefunden." };
    customerId = data.customer_id;
  }

  const now = new Date();
  const prefix = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const rows = files.map((f) => ({
    object_key: `${prefix}/${crypto.randomUUID()}/${safeName(f.name)}`,
    name: f.name,
    size: f.size,
    content_type: f.type || "application/octet-stream",
    folder: joinFolder(base, f.dir),
    category: parsed.data.category || null,
    project_id: projectId,
    customer_id: customerId,
    message: message || null,
    assigned_to: assignedTo?.toLowerCase() || null,
    uploaded_by: admin.name || admin.email,
    complete: false,
  }));
  await ensureFolders(rows.map((r) => r.folder), admin.email);
  // Kundenordner mit dem Kunden verknüpfen
  if (customerId && base.startsWith("Kunden/")) {
    const customerFolder = base.split("/").slice(0, 2).join("/");
    await db().from("file_folders").update({ customer_id: customerId }).eq("path", customerFolder).is("customer_id", null);
  }
  const { data, error } = await db().from("files").insert(rows).select("id, object_key, content_type");
  if (error || !data) return { error: "Upload konnte nicht vorbereitet werden." };
  const uploads = await Promise.all(
    data.map(async (r) => ({ id: r.id as string, contentType: r.content_type as string, url: await presignUpload(r.object_key as string, r.content_type as string, 6 * 3600) })),
  );
  return { uploads };
}

/** Schritt 2: Upload bestätigen (Größe in R2 prüfen) */
export async function finishUpload(ids: string[]): Promise<{ error?: string; done: number }> {
  await assertAdmin();
  const parsed = z.array(uuid).min(1).max(UPLOAD_CHUNK).safeParse(ids);
  if (!parsed.success) return { error: "Ungültige Dateien.", done: 0 };
  const client = db();
  const { data: rows } = await client.from("files").select("id, object_key, size").in("id", parsed.data);
  let done = 0;
  await Promise.all(
    (rows ?? []).map(async (r) => {
      const head = await headObject(r.object_key).catch(() => null);
      if (!head) {
        await client.from("files").delete().eq("id", r.id);
        return;
      }
      await client.from("files").update({ complete: true, size: head.size || r.size }).eq("id", r.id);
      done++;
    }),
  );
  return { done };
}

/** Schritt 3: einmal pro Vorgang protokollieren und ggf. Kollegen benachrichtigen */
export async function completeUploadBatch(input: { ids: string[]; notify: boolean }): Promise<{ ok?: string; error?: string }> {
  const admin = await assertAdmin();
  const ids = z.array(uuid).min(1).max(5000).safeParse(input.ids);
  if (!ids.success) return { error: "Ungültige Dateien." };
  const client = db();
  const { data: rows } = await client
    .from("files")
    .select("id, name, size, folder, project_id, message, assigned_to")
    .in("id", ids.data.slice(0, 300))
    .eq("complete", true);
  const list = rows ?? [];
  const total = ids.data.length;
  const first = list[0];
  if (!first) return { error: "Die Dateien sind nicht angekommen. Bitte erneut versuchen." };
  const folders = [...new Set(list.map((r) => r.folder).filter(Boolean))];
  await logFileEvents(ids.data, "hochgeladen", folders[0] ?? null, admin.name || admin.email);
  await logActivity(admin.email, "hochgeladen", "datei", first.id, `${total} Datei(en)${folders[0] ? ` in „${folders[0]}“` : ""}: ${list.map((d) => d.name).join(", ").slice(0, 250)}`);
  if (first.project_id) await logProjectEvent(first.project_id, "datei", `${total} Datei(en) hochgeladen`, admin.email);

  let note = "";
  if (input.notify && first.assigned_to) {
    const s = await getSettings();
    let project: string | null = null;
    if (first.project_id) {
      const { data: p } = await client.from("projects").select("number, title, customer_name, company_name").eq("id", first.project_id).maybeSingle();
      if (p) project = `${p.number} · ${(p.company_name || p.customer_name || "").trim() ? `${p.company_name || p.customer_name} – ` : ""}${p.title}`;
    }
    const shown = list.slice(0, 25).map((d) => ({ name: d.folder ? `${d.folder}/${d.name}` : d.name, size: formatBytes(Number(d.size)) }));
    if (total > shown.length) shown.push({ name: `… und ${total - shown.length} weitere`, size: "" });
    const target = folders.length === 1 ? `/admin/dateien?ordner=${encodeURIComponent(folders[0])}` : `/admin/dateien?fuer=${encodeURIComponent(first.assigned_to)}`;
    const res = await sendMail(
      first.assigned_to,
      fileNotifyEmail({ siteUrl: env.siteUrl, company: mailCompany(s), from: admin.name || admin.email, files: shown, message: first.message, project, url: `${env.siteUrl}${target}` }),
      { kind: "datei", relatedId: first.id },
    );
    note = res.ok ? ` ${first.assigned_to} wurde per E-Mail informiert.` : ` E-Mail fehlgeschlagen: ${res.error}`;
  }
  paths(first.project_id);
  return { ok: `${total} Datei${total === 1 ? "" : "en"} hochgeladen.${note}` };
}

/** Ganzen Ordner (inkl. Unterordner) löschen */
export async function deleteFolder(fd: FormData) {
  const admin = await assertAdmin();
  const folder = normalizeFolder(String(fd.get("folder") ?? ""));
  if (!folder) return;
  const client = db();
  // Ordner selbst + alle Unterordner (Präfix-Vergleich in JS, damit Sonderzeichen keine Rolle spielen)
  const { data: all } = await client.from("files").select("id, object_key, thumb_key, preview_key, folder").like("folder", `${folder.slice(0, 1)}%`).limit(20000);
  const data = (all ?? []).filter((r) => r.folder === folder || String(r.folder).startsWith(`${folder}/`));
  const rows = data ?? [];
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(
      rows
        .slice(i, i + 10)
        .flatMap((r) => [r.object_key, r.thumb_key, r.preview_key].filter(Boolean))
        .map((k) => deleteObject(k as string).catch(() => {})),
    );
  }
  if (rows.length) await client.from("files").delete().in("id", rows.map((r) => r.id));
  const { data: metas } = await client.from("file_folders").select("path").like("path", `${folder.slice(0, 1)}%`).limit(5000);
  const gone = (metas ?? []).map((m) => String(m.path)).filter((p) => p === folder || p.startsWith(`${folder}/`));
  if (gone.length) await client.from("file_folders").delete().in("path", gone);
  await logActivity(admin.email, "gelöscht", "ordner", null, `Ordner „${folder}“ mit ${rows.length} Datei(en) gelöscht`);
  paths();
}

/** Abgebrochene Uploads aufräumen */
export async function abortUpload(ids: string[]) {
  await assertAdmin();
  const parsed = z.array(uuid).max(UPLOAD_CHUNK * 4).safeParse(ids);
  if (!parsed.success || !parsed.data.length) return;
  const { data } = await db().from("files").select("id, object_key").in("id", parsed.data).eq("complete", false);
  for (const r of data ?? []) await deleteObject(r.object_key).catch(() => {});
  await db().from("files").delete().in("id", parsed.data).eq("complete", false);
}

/** Verlauf einer Datei protokollieren (best effort) */
async function logFileEvents(ids: string[], type: string, note: string | null, actor: string) {
  if (!ids.length) return;
  try {
    await db()
      .from("file_events")
      .insert(ids.map((file_id) => ({ file_id, type, note: note?.slice(0, 1000) ?? null, actor })));
  } catch {
    /* ignore */
  }
}

async function changeStatus(ids: string[], status: FileStatus, actor: string) {
  const { data } = await db()
    .from("files")
    .update({ status, status_changed_at: new Date().toISOString() })
    .in("id", ids)
    .neq("status", status)
    .select("id, project_id");
  const changed = (data ?? []).map((r) => r.id as string);
  await logFileEvents(changed, "status", fileStatusInfo[status].label, actor);
  return data ?? [];
}

export async function setFileStatus(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  const status = fd.get("status");
  if (!id.success || !isFileStatus(status)) return;
  const rows = await changeStatus([id.data], status, admin.name || admin.email);
  paths(rows[0]?.project_id);
  revalidatePath(`/admin/dateien/${id.data}/ansicht`);
}

export async function updateFileNote(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return { error: "Ungültige Datei." };
  const message = String(fd.get("message") ?? "").trim().slice(0, 4000) || null;
  const { data } = await db().from("files").update({ message }).eq("id", id.data).select("project_id").maybeSingle();
  paths(data?.project_id);
  return { ok: "Gespeichert." };
}

export async function deleteFile(fd: FormData) {
  const admin = await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const { data } = await db().from("files").select("object_key, thumb_key, preview_key, name, project_id").eq("id", id.data).maybeSingle();
  if (!data) return;
  await deleteObject(data.object_key);
  await Promise.all([data.thumb_key, data.preview_key].filter(Boolean).map((k) => deleteObject(k as string).catch(() => {})));
  await db().from("files").delete().eq("id", id.data);
  await logActivity(admin.email, "gelöscht", "datei", id.data, `Datei „${data.name}“ gelöscht`);
  paths(data.project_id);
}

/* ------------------------------ Vorschaubilder ------------------------------ */

const previewKeys = (id: string) => ({ thumb: `vorschau/${id}/thumb.jpg`, preview: `vorschau/${id}/preview.jpg` });

/** Upload-Links für Miniatur + Vorschau einer Datei */
export async function requestPreviewUpload(id: string): Promise<{ thumbUrl?: string; previewUrl?: string; error?: string }> {
  await assertAdmin();
  if (!uuid.safeParse(id).success || !isR2Configured()) return { error: "Ungültig." };
  const { data } = await db().from("files").select("id").eq("id", id).eq("complete", true).maybeSingle();
  if (!data) return { error: "Datei nicht gefunden." };
  const k = previewKeys(id);
  const [thumbUrl, previewUrl] = await Promise.all([presignUpload(k.thumb, "image/jpeg", 900), presignUpload(k.preview, "image/jpeg", 900)]);
  return { thumbUrl, previewUrl };
}

export async function confirmPreview(input: { id: string; width: number; height: number; pages?: number | null }) {
  await assertAdmin();
  if (!uuid.safeParse(input.id).success) return;
  const k = previewKeys(input.id);
  const [t, p] = await Promise.all([headObject(k.thumb).catch(() => null), headObject(k.preview).catch(() => null)]);
  if (!t || !p) return;
  const int = (n: unknown) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Math.min(2_000_000, Math.round(Number(n))) : null);
  await db().from("files").update({ thumb_key: k.thumb, preview_key: k.preview, width: int(input.width), height: int(input.height), pages: int(input.pages) }).eq("id", input.id);
}

/* ------------------------------ Ordner & Ordnung ------------------------------ */

const colorSchema = z.enum(folderColors).nullable().optional();

/** Neuen Ordner anlegen – optional für einen Kunden, mit Datum und Farbe */
export async function createFolder(input: { parent: string; name: string; withDate?: boolean; color?: string | null; customerId?: string | null }): Promise<{ path?: string; error?: string }> {
  const admin = await assertAdmin();
  let name = normalizeFolder(String(input.name ?? "").replace(/\//g, "-"));
  if (!name) return { error: "Bitte einen Ordnernamen eingeben." };
  if (input.withDate) name = `${datePrefix()} ${name}`;
  const color = colorSchema.safeParse(input.color ?? null);
  const customerId = input.customerId && uuid.safeParse(input.customerId).success ? input.customerId : null;
  const path = joinFolder(input.parent, name);
  await ensureFolders([path], admin.email, { color: color.success ? (color.data ?? null) : null, customerId });
  paths();
  return { path };
}

export async function renameFolder(input: { path: string; name: string }): Promise<{ path?: string; error?: string }> {
  const admin = await assertAdmin();
  const from = normalizeFolder(input.path);
  const name = normalizeFolder(String(input.name ?? "").replace(/\//g, "-"));
  if (!from || !name) return { error: "Ungültiger Name." };
  const to = joinFolder(parentFolder(from), name);
  if (to === from) return { path: from };
  const { error } = await db().rpc("rename_file_folder", { p_old: from, p_new: to });
  if (error) return { error: "Umbenennen fehlgeschlagen (gibt es den Namen schon?)." };
  await logActivity(admin.email, "umbenannt", "ordner", null, `„${from}“ → „${to}“`);
  paths();
  return { path: to };
}

export async function moveFolder(input: { path: string; target: string }): Promise<{ path?: string; error?: string }> {
  const admin = await assertAdmin();
  const from = normalizeFolder(input.path);
  const target = normalizeFolder(input.target);
  if (!from) return { error: "Ungültiger Ordner." };
  if (target === from || target.startsWith(`${from}/`)) return { error: "Ein Ordner kann nicht in sich selbst verschoben werden." };
  const to = joinFolder(target, from.split("/").pop());
  if (to === from) return { path: from };
  await ensureFolders([target].filter(Boolean), admin.email);
  const { error } = await db().rpc("rename_file_folder", { p_old: from, p_new: to });
  if (error) return { error: "Verschieben fehlgeschlagen." };
  await logActivity(admin.email, "verschoben", "ordner", null, `„${from}“ → „${to}“`);
  paths();
  return { path: to };
}

export async function setFolderColor(input: { path: string; color: string | null }) {
  await assertAdmin();
  const path = normalizeFolder(input.path);
  const color = colorSchema.safeParse(input.color);
  if (!path || !color.success) return;
  await db().from("file_folders").upsert({ path, color: color.data ?? null }, { onConflict: "path" });
  paths();
}

const idsSchema = z.array(uuid).min(1).max(2000);

export async function moveFiles(input: { ids: string[]; folder: string }): Promise<{ ok?: string; error?: string }> {
  const admin = await assertAdmin();
  const ids = idsSchema.safeParse(input.ids);
  if (!ids.success) return { error: "Keine Dateien gewählt." };
  const folder = normalizeFolder(input.folder);
  await ensureFolders([folder].filter(Boolean), admin.email);
  await db().from("files").update({ folder }).in("id", ids.data);
  await logFileEvents(ids.data, "verschoben", folder || "Alle Dateien", admin.name || admin.email);
  paths();
  return { ok: `${ids.data.length} Datei${ids.data.length === 1 ? "" : "en"} verschoben.` };
}

export async function updateFiles(input: { ids: string[]; category?: string | null; status?: string }): Promise<{ ok?: string; error?: string }> {
  await assertAdmin();
  const ids = idsSchema.safeParse(input.ids);
  if (!ids.success) return { error: "Keine Dateien gewählt." };
  const patch: Record<string, unknown> = {};
  if (input.category !== undefined) patch.category = String(input.category ?? "").trim().slice(0, 60) || null;
  if (!Object.keys(patch).length && !(input.status !== undefined && isFileStatus(input.status))) return { error: "Nichts zu ändern." };
  const admin = await assertAdmin();
  if (Object.keys(patch).length) {
    await db().from("files").update(patch).in("id", ids.data);
    if ("category" in patch) await logFileEvents(ids.data, "kategorie", (patch.category as string) ?? "keine", admin.name || admin.email);
  }
  if (input.status !== undefined && isFileStatus(input.status)) await changeStatus(ids.data, input.status, admin.name || admin.email);
  paths();
  return { ok: "Gespeichert." };
}

export async function deleteFiles(ids: string[]): Promise<{ ok?: string; error?: string }> {
  const admin = await assertAdmin();
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return { error: "Keine Dateien gewählt." };
  const { data } = await db().from("files").select("id, object_key, thumb_key, preview_key").in("id", parsed.data);
  const rows = data ?? [];
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(
      rows
        .slice(i, i + 10)
        .flatMap((r) => [r.object_key, r.thumb_key, r.preview_key].filter(Boolean))
        .map((k) => deleteObject(k as string).catch(() => {})),
    );
  }
  await db().from("files").delete().in("id", parsed.data);
  await logActivity(admin.email, "gelöscht", "datei", null, `${rows.length} Datei(en) gelöscht`);
  paths();
  return { ok: `${rows.length} Datei${rows.length === 1 ? "" : "en"} gelöscht.` };
}
