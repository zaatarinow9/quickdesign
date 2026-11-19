/** Shop-Einstellungen „Tag der Befreiung“ – client- und serverseitig nutzbar. */

export const SHOP_HOST = "shop.quickdesign24.de";
export const SHOP_URL = `https://${SHOP_HOST}`;
/** Hosts, die den Shop direkt ausliefern (lokal: shop.localhost) */
export const SHOP_HOSTS = [SHOP_HOST, "shop.localhost"];
export const MAIN_HOSTS = ["quickdesign24.de", "www.quickdesign24.de"];

export type Lang = "de" | "ar";
export const langs: Lang[] = ["de", "ar"];
export const isLang = (v: unknown): v is Lang => v === "de" || v === "ar";
export const dirOf = (l: Lang) => (l === "ar" ? "rtl" : "ltr");

/** Tage bis zum Jahrestag (Datum aus der Shop-Verwaltung, YYYY-MM-DD) */
export function daysUntilAnniversary(anniversary: string, now = Date.now()) {
  const t = Date.parse(`${anniversary || "2026-12-08"}T00:00:00+01:00`);
  return Math.max(0, Math.ceil((t - now) / 86_400_000));
}
