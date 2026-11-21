import { route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") === "rechnung" ? "rechnung" : "angebot";
  const status = url.searchParams.get("status");
  const q = (url.searchParams.get("q") ?? "").replace(/[%,()]/g, " ").trim().slice(0, 100);
  let query = db().from("documents").select("id, kind, number, status, title, customer_name, company_name, gross_total, paid_amount, doc_date, due_date, valid_until, accepted_at, first_viewed_at").eq("kind", kind);
  if (status) query = query.eq("status", status.slice(0, 30));
  if (q) query = query.or(`number.ilike.%${q}%,customer_name.ilike.%${q}%,company_name.ilike.%${q}%,title.ilike.%${q}%`);
  const { data } = await query.order("doc_date", { ascending: false }).order("created_at", { ascending: false }).limit(150);
  return { items: data ?? [] };
});
