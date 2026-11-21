import { route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const status = new URL(req.url).searchParams.get("status");
  let q = db().from("shop_orders").select("id, number, status, name, email, shipping_method, amount_total, items, created_at");
  if (status === "offen") q = q.in("status", ["bezahlt", "in_produktion", "abholbereit"]);
  else if (status) q = q.eq("status", status);
  const { data } = await q.order("created_at", { ascending: false }).limit(150);
  return { items: data ?? [] };
});
