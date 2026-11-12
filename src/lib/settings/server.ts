import "server-only";
import { cache } from "react";
import { db } from "@/lib/supabase/admin";
import { defaultSettings, settingsSchema, type Settings } from "./schema";

/** Einstellungen aus der Datenbank (fehlende Werte → Standardwerte). */
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const { data } = await db().from("settings").select("value").eq("key", "app").maybeSingle();
    const parsed = settingsSchema.safeParse(data?.value ?? {});
    return parsed.success ? parsed.data : defaultSettings();
  } catch {
    return defaultSettings();
  }
});

export async function saveSettings(value: Settings, actor: string) {
  return db().from("settings").upsert({ key: "app", value, updated_at: new Date().toISOString(), updated_by: actor });
}
