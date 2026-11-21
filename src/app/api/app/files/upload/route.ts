import { AppError, body, isUuid, route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";
import { headObject, isR2Configured, presignUpload } from "@/lib/files/r2";
import { MAX_FILE_SIZE, normalizeFolder } from "@/lib/files/shared";

export const dynamic = "force-dynamic";

function safeName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(-120) || "datei";
}

/**
 * Hochladen aus der App (Fotos, PDFs …):
 *  POST { name, size, type, folder?, projectId?, message? } → { id, url } (direkt zu R2 hochladen)
 *  PUT  { id } → bestätigen
 */
export const POST = route(async (req, u) => {
  if (!isR2Configured()) throw new AppError(503, "storage_off");
  const b = await body<{ name?: string; size?: number; type?: string; folder?: string; projectId?: string | null; message?: string | null }>(req);
  const name = String(b.name ?? "").trim().slice(0, 255);
  const size = Number(b.size);
  if (!name || !Number.isFinite(size) || size < 1 || size > MAX_FILE_SIZE) throw new AppError(400, "bad_file");
  const type = String(b.type || "application/octet-stream").slice(0, 200);
  let customerId: string | null = null;
  const projectId = isUuid(b.projectId) ? b.projectId : null;
  if (projectId) {
    const { data } = await db().from("projects").select("customer_id").eq("id", projectId).maybeSingle();
    if (!data) throw new AppError(404, "project_not_found");
    customerId = data.customer_id;
  }
  const folder = normalizeFolder(b.folder ?? "");
  const segs = folder.split("/").filter(Boolean);
  if (segs.length) {
    await db()
      .from("file_folders")
      .upsert(segs.map((_, i) => ({ path: segs.slice(0, i + 1).join("/"), created_by: u.email })), { onConflict: "path", ignoreDuplicates: true });
  }
  const now = new Date();
  const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}/${safeName(name)}`;
  const { data, error } = await db()
    .from("files")
    .insert({ object_key: key, name, size, content_type: type, folder, project_id: projectId, customer_id: customerId, message: (b.message ?? "").trim().slice(0, 4000) || null, uploaded_by: u.name || u.email, complete: false })
    .select("id")
    .single();
  if (error || !data) throw new AppError(500, "prepare_failed");
  return { id: data.id, url: await presignUpload(key, type, 6 * 3600), contentType: type };
});

export const PUT = route(async (req, u) => {
  const b = await body<{ id?: string }>(req);
  if (!isUuid(b.id)) throw new AppError(400, "bad_id");
  const { data: row } = await db().from("files").select("id, object_key, size, complete").eq("id", b.id).maybeSingle();
  if (!row) throw new AppError(404, "not_found");
  if (row.complete) return { ok: true };
  const head = await headObject(row.object_key).catch(() => null);
  if (!head) {
    await db().from("files").delete().eq("id", row.id);
    throw new AppError(400, "upload_missing");
  }
  await db().from("files").update({ complete: true, size: head.size || row.size }).eq("id", row.id);
  await db().from("file_events").insert({ file_id: row.id, type: "upload", note: "Aus der App hochgeladen", actor: u.name || u.email });
  return { ok: true };
});
