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

export const campaign = {
  /** Jahrestag der Befreiung (8.12.2024) – Countdown-Ziel, Mitternacht Damaskus/Berlin */
  anniversary: "2026-12-08T00:00:00+01:00",
  // TODO(Inhaber): Letzter Bestelltag, damit die Lieferung vor dem 8.12. ankommt – bitte bestätigen.
  lastOrderDay: "2026-12-02",
};

export const shipping = {
  /** Versand innerhalb Deutschlands in Cent */
  standardCents: 490,
  /** Ab diesem Warenwert versandkostenfrei (Cent) */
  freeFromCents: 6000,
  countries: ["DE"] as const,
  pickup: {
    name: "QuickDesign",
    street: "Richard-Wagner-Straße 73–75",
    city: "66111 Saarbrücken",
  },
  /** Lieferzeit-Angabe (Werktage) */
  deliveryDays: "3–5",
};

/** WhatsApp für Sammelbestellungen (Vereine, Familien) */
export const whatsappNumber = "4915772785677";

export const shopLimits = { maxQtyPerLine: 500, maxLines: 30 };

/**
 * Angebote – TODO(Inhaber): Prozentsätze bestätigen.
 * bundle: Bei Textilien ist jedes dritte Teil (das günstigste je Dreiergruppe) um `pct` % reduziert.
 * Mengenrabatte für Druckprodukte stehen direkt am Produkt (catalog.ts → tiers).
 */
export const offers = {
  bundle: { every: 3, pct: 50 },
};

/** Tage bis zum Jahrestag (für „Noch X Tage“) */
export function daysUntilAnniversary(now = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(campaign.anniversary) - now) / 86_400_000));
}
