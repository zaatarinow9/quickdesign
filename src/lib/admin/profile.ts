import "server-only";
import { cache } from "react";
import { db } from "@/lib/supabase/admin";

/** Anzeigename aus dem Profil (sonst Name aus der Mitarbeiterliste, sonst E-Mail) */
export const displayName = cache(async (email: string, fallback: string | null) => {
  const { data } = await db().from("staff_profiles").select("display_name").eq("email", email.toLowerCase()).maybeSingle();
  return (data?.display_name as string) || fallback || email;
});
