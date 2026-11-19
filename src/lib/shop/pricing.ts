/**
 * Preisberechnung mit Angeboten – identisch im Warenkorb (Anzeige) und im Checkout (verbindlich).
 *  - Mengenrabatt (tiers) je Produkt auf die Gesamtmenge aller Varianten
 *  - „2 + 1“: bei Textilien ist je drei Teilen das günstigste um offers.bundle.pct % reduziert
 */
import { offers, shipping } from "./config";
import type { ResolvedLine } from "./catalog";

export type PricedLine = ResolvedLine & { listCents: number; unitCents: number; tierPct: number };

export function priceLines(lines: ResolvedLine[]) {
  const qtyBySlug = new Map<string, number>();
  for (const l of lines) qtyBySlug.set(l.product.slug, (qtyBySlug.get(l.product.slug) ?? 0) + l.qty);

  const priced: PricedLine[] = lines.map((l) => {
    const total = qtyBySlug.get(l.product.slug) ?? l.qty;
    const tierPct = (l.product.tiers ?? []).filter((t) => total >= t.min).reduce((m, t) => Math.max(m, t.pct), 0);
    const unitCents = Math.round((l.variant.priceCents * (100 - tierPct)) / 100);
    return { ...l, listCents: l.variant.priceCents, unitCents, tierPct };
  });

  const listTotal = priced.reduce((s, l) => s + l.listCents * l.qty, 0);
  const subtotal = priced.reduce((s, l) => s + l.unitCents * l.qty, 0);

  // 2 + 1 auf Textilien
  const units = priced.filter((l) => l.product.category === "textil").flatMap((l) => Array.from({ length: l.qty }, () => l.unitCents));
  units.sort((a, b) => b - a);
  const { every, pct } = offers.bundle;
  let bundleCents = 0;
  let bundleItems = 0;
  for (let i = every - 1; i < units.length; i += every) {
    bundleCents += Math.round((units[i] * pct) / 100);
    bundleItems++;
  }
  const textileCount = units.length;
  const total = subtotal - bundleCents;
  const shippingCents = total >= shipping.freeFromCents ? 0 : shipping.standardCents;
  return {
    lines: priced,
    listTotal,
    tierSavings: listTotal - subtotal,
    subtotal,
    bundleCents,
    bundleItems,
    /** Wie viele Textilien noch bis zum nächsten reduzierten Teil fehlen (0 = gerade erreicht) */
    textileToNext: textileCount === 0 ? every : (every - (textileCount % every)) % every,
    total,
    shippingCents,
    freeShippingMissing: Math.max(0, shipping.freeFromCents - total),
  };
}
