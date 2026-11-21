import { route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, u) => {
  const [{ data }, { data: read }] = await Promise.all([
    db()
      .from("staff_notifications")
      .select("id, category, title_de, body_de, title_ar, body_ar, link, created_at")
      .or(`target_email.is.null,target_email.eq.${u.email}`)
      .order("created_at", { ascending: false })
      .limit(80),
    db().from("staff_read_state").select("last_read_at").eq("user_email", u.email).maybeSingle(),
  ]);
  return { items: data ?? [], lastReadAt: read?.last_read_at ?? null };
});

/** alles als gelesen markieren */
export const POST = route(async (_req, u) => {
  await db().from("staff_read_state").upsert({ user_email: u.email, last_read_at: new Date().toISOString() });
  return { ok: true };
});
