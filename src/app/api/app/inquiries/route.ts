import { route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const STATUSES = ["neu", "in_bearbeitung", "erledigt", "archiviert"];

export const GET = route(async (req) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = (url.searchParams.get("q") ?? "").replace(/[%,()]/g, " ").trim();
  let query = db().from("inquiries").select("id, reference, status, name, company_name, email, phone, message, interests, created_at");
  if (status && STATUSES.includes(status)) query = query.eq("status", status);
  else query = query.neq("status", "archiviert");
  if (q) query = query.or(`name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%,reference.ilike.%${q}%,message.ilike.%${q}%`);
  const { data } = await query.order("created_at", { ascending: false }).limit(150);
  return { items: data ?? [] };
});
