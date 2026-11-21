import { AppError, body, idOf, route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, _u, ctx) => {
  const id = idOf(await ctx.params);
  const { data } = await db().from("inquiries").select("*").eq("id", id).maybeSingle();
  if (!data) throw new AppError(404, "not_found");
  const { data: docs } = await db().from("documents").select("id, kind, number, status, gross_total, created_at").eq("inquiry_id", id).order("created_at", { ascending: false });
  const { ip_hash: _ip, utm: _utm, ...rest } = data as Record<string, unknown>;
  void _ip;
  void _utm;
  return { item: rest, documents: docs ?? [] };
});

export const PATCH = route<Ctx>(async (req, u, ctx) => {
  const id = idOf(await ctx.params);
  const b = await body<{ status?: string; internal_notes?: string | null }>(req);
  const patch: Record<string, unknown> = {};
  if (b.status && ["neu", "in_bearbeitung", "erledigt", "archiviert"].includes(b.status)) patch.status = b.status;
  if (b.internal_notes !== undefined) patch.internal_notes = (b.internal_notes ?? "").slice(0, 6000) || null;
  if (!Object.keys(patch).length) throw new AppError(400, "nothing");
  const { error } = await db().from("inquiries").update(patch).eq("id", id);
  if (error) throw new AppError(500, "save_failed");
  if (patch.status) await logActivity(u.email, "anfrage", "anfrage", id, `Anfrage → ${patch.status} (App)`);
  return { ok: true };
});
