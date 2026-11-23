"use server";

import { assertAdmin } from "@/lib/auth";
import { db } from "@/lib/supabase/admin";

/** Alle Benachrichtigungen als gelesen markieren */
export async function markNotificationsRead() {
  const admin = await assertAdmin();
  await db().from("staff_read_state").upsert({ user_email: admin.email.toLowerCase(), last_read_at: new Date().toISOString() }, { onConflict: "user_email" });
}
