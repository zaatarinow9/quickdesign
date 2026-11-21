import { AppError, body, idOf, route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";
import { fileEvents, getFileRow, teamMembers } from "@/lib/files/server";
import { presignDownload } from "@/lib/files/r2";
import { fileStatusInfo, isFileStatus } from "@/lib/files/shared";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, _u, ctx) => {
  const id = idOf(await ctx.params);
  const f = await getFileRow(id);
  if (!f || !f.complete) throw new AppError(404, "not_found");
  const [events, team, url, preview] = await Promise.all([
    fileEvents(id),
    teamMembers(),
    presignDownload(f.object_key, f.name, { inline: true, seconds: 3600, contentType: f.content_type ?? undefined }).catch(() => null),
    typeof f.preview_key === "string" && f.preview_key ? presignDownload(f.preview_key, "preview.webp", { inline: true, seconds: 3600, contentType: "image/webp" }).catch(() => null) : Promise.resolve(null),
  ]);
  const { object_key: _k, thumb_key: _t, preview_key: _p, ...rest } = f as Record<string, unknown>;
  void _k;
  void _t;
  void _p;
  return { item: rest, events, team, url, preview };
});

export const PATCH = route<Ctx>(async (req, u, ctx) => {
  const id = idOf(await ctx.params);
  const b = await body<{ status?: string; assigned_to?: string | null; message?: string | null }>(req);
  const patch: Record<string, unknown> = {};
  const log: { type: string; note: string }[] = [];
  if (b.status !== undefined) {
    if (!isFileStatus(b.status)) throw new AppError(400, "bad_status");
    patch.status = b.status;
    patch.status_changed_at = new Date().toISOString();
    log.push({ type: "status", note: fileStatusInfo[b.status].label });
  }
  if (b.assigned_to !== undefined) {
    const email = b.assigned_to ? String(b.assigned_to).toLowerCase().slice(0, 254) : null;
    if (email && !(await teamMembers()).some((m) => m.email === email)) throw new AppError(400, "bad_member");
    patch.assigned_to = email;
    log.push({ type: "zuweisung", note: email ?? "–" });
  }
  if (b.message !== undefined) {
    patch.message = (b.message ?? "").trim().slice(0, 4000) || null;
    log.push({ type: "notiz", note: "Notiz geändert" });
  }
  if (!Object.keys(patch).length) throw new AppError(400, "nothing");
  const { error } = await db().from("files").update(patch).eq("id", id);
  if (error) throw new AppError(500, "save_failed");
  if (log.length) await db().from("file_events").insert(log.map((l) => ({ file_id: id, type: l.type, note: l.note, actor: u.name || u.email })));
  return { ok: true };
});
