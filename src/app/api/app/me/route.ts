import { route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";
import { visibleTo } from "@/lib/notify-filter";

export const dynamic = "force-dynamic";

/** Wer bin ich + ungelesene Hinweise */
export const GET = route(async (_req, u) => {
  const [{ data: read }, { data: who }] = await Promise.all([
    db().from("staff_read_state").select("last_read_at").eq("user_email", u.email).maybeSingle(),
    db().from("admin_users").select("full_name").eq("email", u.email).maybeSingle(),
  ]);
  const since = read?.last_read_at ?? "1970-01-01";
  const { count } = await db()
    .from("staff_notifications")
    .select("id", { count: "exact", head: true })
    .gt("created_at", since)
    .or(visibleTo(u.email));
  return { user: { email: u.email, name: who?.full_name || u.name, role: u.role, full: u.full }, unread: count ?? 0 };
});
