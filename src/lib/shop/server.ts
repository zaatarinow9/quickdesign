import "server-only";
import { headers } from "next/headers";
import { SHOP_HOSTS } from "./config";

/** Pfad-Präfix: auf shop.quickdesign24.de leer, sonst /shop (Vorschau, lokal) */
export async function shopBase(): Promise<string> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(":")[0].toLowerCase();
  return SHOP_HOSTS.includes(host) ? "" : "/shop";
}
