import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase/server";
import { SHOP_HOSTS } from "./config";

/**
 * Shop-Verwaltung – getrennt von /admin:
 *  - eigener Zugang (Supabase-Konto mit app_metadata.shop_admin = true)
 *  - erreichbar unter shop.quickdesign24.de/admin (intern /shop-admin)
 */
export type ShopAdmin = { id: string; email: string };

/** Pfad-Basis: auf der Shop-Domain /admin, sonst /shop-admin (Vorschau, lokal) */
export async function adminBase(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0].toLowerCase();
  return SHOP_HOSTS.includes(host) ? "/admin" : "/shop-admin";
}

export const isShopAdminUser = (u: { email?: string | null; email_confirmed_at?: string | null; app_metadata?: Record<string, unknown> } | null) =>
  !!u?.email && !!u.email_confirmed_at && u.app_metadata?.shop_admin === true;

export const getShopAdmin = cache(async (): Promise<ShopAdmin | null> => {
  try {
    const supabase = await supabaseAuth();
    const { data } = await supabase.auth.getUser();
    return isShopAdminUser(data.user) ? { id: data.user!.id, email: data.user!.email! } : null;
  } catch {
    return null;
  }
});

export async function requireShopAdmin(): Promise<ShopAdmin> {
  const admin = await getShopAdmin();
  if (!admin) redirect(`${await adminBase()}/login`);
  return admin;
}

export async function assertShopAdmin(): Promise<ShopAdmin> {
  const admin = await getShopAdmin();
  if (!admin) throw new Error("UNAUTHORIZED");
  return admin;
}
