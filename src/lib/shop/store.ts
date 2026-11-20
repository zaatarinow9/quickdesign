import "server-only";
import { unstable_cache, updateTag } from "next/cache";
import { env } from "@/lib/env";
import { db } from "@/lib/supabase/admin";
import { defaultStore } from "./defaults";
import { storeSchema, type ShopStore } from "./schema";

const TAG = "shop-store";

async function load(): Promise<ShopStore> {
  if (!env.databaseConfigured) return defaultStore;
  const { data, error } = await db().from("shop_store").select("data").eq("id", 1).maybeSingle();
  if (error) {
    console.error("[shop-store]", error.message);
    return defaultStore;
  }
  if (!data) return defaultStore;
  const parsed = storeSchema.safeParse(data.data);
  if (!parsed.success) {
    console.error("[shop-store] ungültige Daten – Standard wird verwendet", parsed.error.issues.slice(0, 3));
    return defaultStore;
  }
  return parsed.data;
}

/** Aktueller Shop-Stand (gecacht, wird beim Speichern in der Verwaltung sofort erneuert) */
// Der Daten-Cache überlebt Deployments – darum Schlüssel je Deployment (neue Startdaten sofort sichtbar)
// zusätzlich ein Fingerabdruck der Startdaten, falls die Vercel-Systemvariablen nicht gesetzt sind
const DEPLOY = process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA || "local";
const fingerprint = (() => {
  const str = JSON.stringify(defaultStore);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
})();
export const getStore = unstable_cache(load, ["shop-store", DEPLOY, fingerprint], { tags: [TAG], revalidate: 600 });

/** Ungecacht – für die Verwaltung */
export const getStoreFresh = load;

/** Speichert den gesamten Stand nach Prüfung; ältere Fassung landet im Verlauf */
export async function saveStore(next: unknown, by: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = storeSchema.safeParse(next);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join(" › ")}: ${i.message}` };
  }
  const ids = new Set<string>();
  for (const p of parsed.data.products) {
    if (ids.has(p.id)) return { ok: false, error: `رابط المنتج مكرر: ${p.id}` };
    ids.add(p.id);
    const v = new Set(p.variants.map((x) => x.id));
    if (v.size !== p.variants.length) return { ok: false, error: `${p.name.ar || p.name.de}: مقاس أو حجم مكرر` };
  }
  const current = await db().from("shop_store").select("data").eq("id", 1).maybeSingle();
  if (current.data) await db().from("shop_store_history").insert({ data: current.data.data, created_by: by });
  const { error } = await db()
    .from("shop_store")
    .upsert({ id: 1, data: parsed.data, updated_at: new Date().toISOString(), updated_by: by });
  if (error) return { ok: false, error: "تعذّر الحفظ. يرجى المحاولة مرة أخرى." };
  updateTag(TAG);
  return { ok: true };
}
