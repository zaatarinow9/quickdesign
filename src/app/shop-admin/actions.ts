"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAuth } from "@/lib/supabase/server";
import { db } from "@/lib/supabase/admin";
import { clientIpHash, hashKey, rateLimit } from "@/lib/security";
import { adminBase, assertShopAdmin, isShopAdminUser } from "@/lib/shop/admin";
import { getStoreFresh, saveStore } from "@/lib/shop/store";
import { motifSchema, offerSchema, productSchema, settingsSchema, type ShopStore } from "@/lib/shop/schema";

export type Result = { ok: true; message?: string } | { ok: false; error: string };

/* ------------------------------------------------------------------ Anmeldung */

const credentials = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });

export async function shopSignIn(_prev: Result | null, fd: FormData): Promise<Result> {
  const parsed = credentials.safeParse({ email: String(fd.get("email") ?? "").trim().toLowerCase(), password: String(fd.get("password") ?? "") });
  if (!parsed.success) return { ok: false, error: "يرجى إدخال البريد الإلكتروني وكلمة السر." };
  const ip = await clientIpHash();
  if (!(await rateLimit(`shop-login-ip:${ip}`, 20, 900, { failClosed: true })) || !(await rateLimit(`shop-login-user:${hashKey(parsed.data.email)}`, 8, 900, { failClosed: true }))) {
    return { ok: false, error: "محاولات دخول كثيرة. يرجى الانتظار 15 دقيقة." };
  }
  const supabase = await supabaseAuth();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, error: "البريد الإلكتروني أو كلمة السر غير صحيحة." };
  if (!isShopAdminUser(data.user)) {
    await supabase.auth.signOut();
    return { ok: false, error: "هذا الحساب لا يملك صلاحية لوحة تحكم المتجر." };
  }
  redirect(await adminBase());
}

export async function shopSignOut() {
  const supabase = await supabaseAuth();
  await supabase.auth.signOut();
  redirect(`${await adminBase()}/login`);
}

export async function changePassword(_prev: Result | null, fd: FormData): Promise<Result> {
  await assertShopAdmin();
  const pw = String(fd.get("password") ?? "");
  const pw2 = String(fd.get("password2") ?? "");
  if (pw.length < 12) return { ok: false, error: "كلمة السر يجب أن تكون 12 حرفاً على الأقل." };
  if (pw !== pw2) return { ok: false, error: "كلمتا السر غير متطابقتين." };
  const supabase = await supabaseAuth();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { ok: false, error: "تعذّر تغيير كلمة السر." };
  return { ok: true, message: "تم تغيير كلمة السر." };
}

/* ------------------------------------------------------------------ Speichern */

async function mutate(fn: (s: ShopStore) => ShopStore | string): Promise<Result> {
  let admin;
  try {
    admin = await assertShopAdmin();
  } catch {
    return { ok: false, error: "يرجى تسجيل الدخول من جديد." };
  }
  const current = structuredClone(await getStoreFresh());
  const next = fn(current);
  if (typeof next === "string") return { ok: false, error: next };
  const res = await saveStore(next, admin.email);
  if (!res.ok) return res;
  revalidatePath("/shop-admin", "layout");
  return { ok: true, message: "تم الحفظ – التعديلات ظاهرة في المتجر الآن." };
}

export async function saveProduct(input: unknown, originalId: string | null): Promise<Result> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join(" › ")}: ${i.message}` };
  }
  const p = parsed.data;
  return mutate((s) => {
    const idx = s.products.findIndex((x) => x.id === (originalId ?? p.id));
    if (originalId === null && s.products.some((x) => x.id === p.id)) return "هذا الرابط مستخدم لمنتج آخر.";
    if (originalId !== null && originalId !== p.id && s.products.some((x) => x.id === p.id)) return "هذا الرابط مستخدم لمنتج آخر.";
    if (idx >= 0) s.products[idx] = p;
    else s.products.push(p);
    // Angebote auf umbenannte Produkte mitziehen
    if (originalId && originalId !== p.id) for (const o of s.offers) o.scope.products = o.scope.products.map((x) => (x === originalId ? p.id : x));
    return s;
  });
}

export async function productAction(id: string, action: "toggle" | "up" | "down" | "duplicate" | "delete" | "feature"): Promise<Result> {
  return mutate((s) => {
    const i = s.products.findIndex((x) => x.id === id);
    if (i < 0) return "المنتج غير موجود.";
    const p = s.products[i];
    if (action === "toggle") p.active = !p.active;
    if (action === "feature") p.featured = !p.featured;
    if (action === "up" && i > 0) [s.products[i - 1], s.products[i]] = [s.products[i], s.products[i - 1]];
    if (action === "down" && i < s.products.length - 1) [s.products[i + 1], s.products[i]] = [s.products[i], s.products[i + 1]];
    if (action === "duplicate") {
      let n = 2;
      while (s.products.some((x) => x.id === `${id}-${n}`)) n++;
      s.products.splice(i + 1, 0, { ...structuredClone(p), id: `${id}-${n}`.slice(0, 60), active: false, name: { de: `${p.name.de} (Kopie)`, ar: `${p.name.ar} (نسخة)` } });
    }
    if (action === "delete") {
      s.products.splice(i, 1);
      for (const o of s.offers) o.scope.products = o.scope.products.filter((x) => x !== id);
    }
    return s;
  });
}

export async function saveOffers(input: unknown): Promise<Result> {
  const parsed = z.array(offerSchema).max(50).safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `العرض ${Number(i.path[0]) + 1}: ${i.path.slice(1).join(" › ")} – ${i.message}` };
  }
  const ids = new Set(parsed.data.map((o) => o.id));
  if (ids.size !== parsed.data.length) return { ok: false, error: "يوجد عرضان بنفس المعرّف." };
  for (const o of parsed.data) {
    if (o.kind === "bundle" && !o.bundle) return { ok: false, error: `${o.name.ar || o.name.de}: بيانات الباقة ناقصة.` };
    if (o.kind === "tiers" && !o.tiers?.length) return { ok: false, error: `${o.name.ar || o.name.de}: أضف مستوى كمية واحداً على الأقل.` };
    if (o.kind === "percent" && !o.percent) return { ok: false, error: `${o.name.ar || o.name.de}: أدخل نسبة الخصم.` };
  }
  return mutate((s) => ({ ...s, offers: parsed.data }));
}

export async function saveMotifs(input: unknown): Promise<Result> {
  const parsed = z.array(motifSchema).max(300).safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `التصميم ${Number(i.path[0]) + 1}: ${i.path.slice(1).join(" › ")} – ${i.message}` };
  }
  const ids = new Set(parsed.data.map((m) => m.id));
  if (ids.size !== parsed.data.length) return { ok: false, error: "يوجد تصميمان بنفس المعرّف." };
  for (const m of parsed.data) if (!m.light && !m.dark) return { ok: false, error: `${m.name.ar || m.id}: ارفع صورة للتصميم.` };
  return mutate((s) => ({ ...s, motifs: parsed.data }));
}

export async function saveSettings(input: unknown): Promise<Result> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i.path.join(" › ")}: ${i.message}` };
  }
  return mutate((s) => ({ ...s, settings: parsed.data }));
}

/* ------------------------------------------------------------------ Bilder */

const uploadSchema = z.object({ name: z.string().max(200), type: z.enum(["image/webp", "image/jpeg", "image/png", "image/avif"]) });

/** Signierte Upload-Adresse für Supabase Storage (Bucket „shop“, öffentlich lesbar) */
export async function signImageUpload(input: { name: string; type: string }): Promise<{ ok: true; path: string; token: string; publicUrl: string } | { ok: false; error: string }> {
  try {
    await assertShopAdmin();
  } catch {
    return { ok: false, error: "يرجى تسجيل الدخول من جديد." };
  }
  const parsed = uploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "الصور فقط (WebP أو JPG أو PNG أو AVIF)." };
  const ext = parsed.data.type.split("/")[1].replace("jpeg", "jpg");
  const base = parsed.data.name.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "bild";
  const path = `produkte/${new Date().toISOString().slice(0, 10)}/${base}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { data, error } = await db().storage.from("shop").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "تعذّر تجهيز رفع الصورة." };
  const { data: pub } = db().storage.from("shop").getPublicUrl(path);
  return { ok: true, path, token: data.token, publicUrl: pub.publicUrl };
}

/* ------------------------------------------------------------------ Bestellungen */

const statuses = ["bezahlt", "in_produktion", "versendet", "abholbereit", "abgeschlossen", "storniert"] as const;

export async function setOrderStatus(fd: FormData) {
  await assertShopAdmin();
  const id = String(fd.get("id") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id) || !statuses.includes(status as (typeof statuses)[number])) return;
  await db().from("shop_orders").update({ status }).eq("id", id);
  revalidatePath("/shop-admin", "layout");
}
