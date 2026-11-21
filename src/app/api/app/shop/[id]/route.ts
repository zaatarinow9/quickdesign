import { AppError, body, idOf, route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/admin/log";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };
const STATUSES = ["bezahlt", "in_produktion", "versendet", "abholbereit", "abgeschlossen", "storniert"];

export const GET = route<Ctx>(async (_req, _u, ctx) => {
  const id = idOf(await ctx.params);
  const { data } = await db().from("shop_orders").select("id, number, status, lang, email, name, phone, shipping_method, shipping_address, items, amount_subtotal, amount_shipping, amount_total, livemode, created_at, updated_at").eq("id", id).maybeSingle();
  if (!data) throw new AppError(404, "not_found");
  return { item: data };
});

export const PATCH = route<Ctx>(async (req, u, ctx) => {
  const id = idOf(await ctx.params);
  const b = await body<{ status?: string }>(req);
  if (!b.status || !STATUSES.includes(b.status)) throw new AppError(400, "bad_status");
  const { error } = await db().from("shop_orders").update({ status: b.status }).eq("id", id);
  if (error) throw new AppError(500, "save_failed");
  await logActivity(u.email, "status", "shop", id, `Shop-Bestellung → ${b.status} (App)`);
  return { ok: true };
});
