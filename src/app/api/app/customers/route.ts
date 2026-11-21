import { route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/[%,()]/g, " ").trim().slice(0, 100);
  let query = db().from("customers").select("id, customer_number, kind, status, name, company_name, email, phone, city, last_contact_at, updated_at");
  if (q) query = query.or(`name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,customer_number.ilike.%${q}%,city.ilike.%${q}%`);
  const { data } = await query.order("updated_at", { ascending: false }).limit(100);
  return { items: data ?? [] };
});
