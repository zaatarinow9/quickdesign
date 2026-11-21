import { AppError, body, idOf, route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";
import { financeByOffer, getProject, logProjectEvent, offerItems, projectEvents, sendStageMail } from "@/lib/projects/server";
import { isProjectStatus, mapsUrl, navigationUrl, projectStatusInfo } from "@/lib/projects/shared";
import { listFiles } from "@/lib/files/server";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const stamp: Record<string, string> = { in_arbeit: "started_at", fertig: "ready_at", abgeschlossen: "completed_at" };

export const GET = route<Ctx>(async (_req, u, ctx) => {
  const id = idOf(await ctx.params);
  const p = await getProject(id);
  if (!p) throw new AppError(404, "not_found");
  const [events, files, items, finance] = await Promise.all([
    projectEvents(id),
    listFiles({ projectId: id, limit: 100 }),
    offerItems(p.offer_id),
    u.full && p.offer_id ? financeByOffer([p.offer_id]) : Promise.resolve(null),
  ]);
  return {
    item: { ...p, maps_url: mapsUrl(p), navigation_url: navigationUrl(p), value_gross: u.full ? p.value_gross : null },
    events,
    files,
    items,
    finance: finance && p.offer_id ? (finance.get(p.offer_id) ?? null) : null,
  };
});

/** Status ändern (optional Kunde per E-Mail informieren) */
export const PATCH = route<Ctx>(async (req, u, ctx) => {
  const id = idOf(await ctx.params);
  const b = await body<{ status?: string; notify?: boolean; message?: string }>(req);
  if (!isProjectStatus(b.status)) throw new AppError(400, "bad_status");
  const status = b.status;
  const p = await getProject(id);
  if (!p) throw new AppError(404, "not_found");
  const patch: Record<string, unknown> = { status };
  const col = stamp[status];
  if (col && !(p as Record<string, unknown>)[col]) patch[col] = new Date().toISOString();
  const { error } = await db().from("projects").update(patch).eq("id", id);
  if (error) throw new AppError(500, "save_failed");
  await logProjectEvent(id, "status", `→ ${projectStatusInfo[status].label} (App)`, u.email);
  await logActivity(u.email, "status", "auftrag", id, `Auftrag ${p.number}: ${projectStatusInfo[status].label} (App)`);
  let mail: string | null = null;
  if (b.notify) {
    const res = await sendStageMail({ ...p, status }, status, (b.message ?? "").trim().slice(0, 2000) || null);
    if (res.ok) await logProjectEvent(id, "e-mail", `Kunde informiert (${projectStatusInfo[status].label})`, u.email);
    mail = res.ok ? "sent" : res.error;
  }
  return { ok: true, mail };
});

/** Notiz in den Verlauf schreiben */
export const POST = route<Ctx>(async (req, u, ctx) => {
  const id = idOf(await ctx.params);
  const b = await body<{ note?: string }>(req);
  const note = (b.note ?? "").trim().slice(0, 1000);
  if (!note) throw new AppError(400, "empty");
  await logProjectEvent(id, "notiz", note, u.email);
  return { ok: true };
});
