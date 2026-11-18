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
import { formatBytes, isFileStatus, joinFolder, MAX_FILE_SIZE, normalizeFolder, UPLOAD_CHUNK } from "@/lib/files/shared";
import { logProjectEvent } from "@/lib/projects/server";
import type { ActionState } from "./document-actions";

const uuid = z.uuid();

function paths(projectId?: string | null) {
  revalidatePath("/admin/dateien");
  if (projectId) revalidatePath(`/admin/projekte/${projectId}`);
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
    project_id: projectId,
    customer_id: customerId,
    message: message || null,
    assigned_to: assignedTo?.toLowerCase() || null,
    uploaded_by: admin.name || admin.email,
    complete: false,
  }));
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
  const { data: all } = await client.from("files").select("id, object_key, folder").like("folder", `${folder.slice(0, 1)}%`).limit(20000);
  const data = (all ?? []).filter((r) => r.folder === folder || String(r.folder).startsWith(`${folder}/`));
  const rows = data ?? [];
  for (let i = 0; i < rows.length; i += 10) {
    await Promise.all(rows.slice(i, i + 10).map((r) => deleteObject(r.object_key).catch(() => {})));
  }
  if (rows.length) await client.from("files").delete().in("id", rows.map((r) => r.id));
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

export async function setFileStatus(fd: FormData) {
  await assertAdmin();
  const id = uuid.safeParse(fd.get("id"));
  const status = fd.get("status");
  if (!id.success || !isFileStatus(status)) return;
  const { data } = await db().from("files").update({ status }).eq("id", id.data).select("project_id").maybeSingle();
  paths(data?.project_id);
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
  const { data } = await db().from("files").select("object_key, name, project_id").eq("id", id.data).maybeSingle();
  if (!data) return;
  await deleteObject(data.object_key);
  await db().from("files").delete().eq("id", id.data);
  await logActivity(admin.email, "gelöscht", "datei", id.data, `Datei „${data.name}“ gelöscht`);
  paths(data.project_id);
}
