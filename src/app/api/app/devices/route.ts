import { AppError, body, route } from "@/lib/app/auth";
import { db } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const CATS = ["anfrage", "shop", "datei", "projekt", "dokument"];
const tokenOk = (t: unknown): t is string => typeof t === "string" && /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$/.test(t);

/** Gerät für Push registrieren bzw. Einstellungen ändern */
export const POST = route(async (req, u) => {
  const b = await body<{ token?: string; platform?: string; lang?: string; categories?: string[] }>(req);
  if (!tokenOk(b.token)) throw new AppError(400, "bad_token");
  const row: Record<string, unknown> = {
    token: b.token,
    user_email: u.email,
    auth_user_id: u.id,
    platform: b.platform === "android" ? "android" : "ios",
    lang: b.lang === "ar" ? "ar" : "de",
    last_seen_at: new Date().toISOString(),
  };
  if (Array.isArray(b.categories)) row.categories = b.categories.filter((c) => CATS.includes(c));
  const { error } = await db().from("staff_devices").upsert(row, { onConflict: "token" });
  if (error) throw new AppError(500, "save_failed");
  return { ok: true };
});

export const GET = route(async (req, u) => {
  const token = new URL(req.url).searchParams.get("token");
  if (!tokenOk(token)) return { device: null };
  const { data } = await db().from("staff_devices").select("lang, categories").eq("token", token).eq("user_email", u.email).maybeSingle();
  return { device: data };
});

/** Abmelden: Gerät entfernen */
export const DELETE = route(async (req, u) => {
  const b = await body<{ token?: string }>(req);
  if (tokenOk(b.token)) await db().from("staff_devices").delete().eq("token", b.token).eq("user_email", u.email);
  return { ok: true };
});
