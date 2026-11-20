/**
 * Preisberechnung mit Angeboten – identisch im Warenkorb (Anzeige) und im Checkout (verbindlich).
 *
 * Reihenfolge:
 *  1. Stückpreis-Rabatte: Mengenrabatt (tiers) und Prozent-Aktionen – je Zeile gilt der beste
 *  2. Pakete (bundle): „je N Teile zum Festpreis“, „günstigstes je N −x %“, „je N Teile −x %“
 *  3. Vorbestellrabatt auf den Rest – oder, falls nicht kombinierbar, das für den Kunden günstigere
 */
import { offerLive, inScope, preorderLive, type Localized, type ResolvedLine, type ShopStore } from "./schema";

export type PricedLine = ResolvedLine & { listCents: number; unitCents: number; unitPct: number; unitOffer: Localized | null };
export type CartDiscount = { id: string; label: Localized; cents: number };
export type ShippingChoice = { id: "standard" | "express" | "pickup"; cents: number };

export function priceCart(store: ShopStore, lines: ResolvedLine[], now = Date.now()) {
  const live = store.offers.filter((o) => offerLive(o, now));
  const qtyByProduct = new Map<string, number>();
  for (const l of lines) qtyByProduct.set(l.product.id, (qtyByProduct.get(l.product.id) ?? 0) + l.qty);

  // 1. Stückpreis-Rabatte
  let priced: PricedLine[] = lines.map((l) => {
    let best = { pct: 0, label: null as Localized | null };
    for (const o of live) {
      if (!inScope(o.scope, l.product)) continue;
      let p = 0;
      if (o.kind === "percent") p = o.percent ?? 0;
      if (o.kind === "tiers") {
        const n = qtyByProduct.get(l.product.id) ?? l.qty;
        p = (o.tiers ?? []).filter((t) => n >= t.min).reduce((m, t) => Math.max(m, t.pct), 0);
      }
      if (p > best.pct) best = { pct: p, label: o.name };
    }
    const listCents = l.variant.priceCents + l.extraCents;
    return { ...l, listCents, unitCents: Math.round((listCents * (100 - best.pct)) / 100), unitPct: best.pct, unitOffer: best.label };
  });

  const listTotal = priced.reduce((s, l) => s + l.listCents * l.qty, 0);

  // 2. Pakete
  const bundles = (rows: PricedLine[]) => {
    const units = rows.flatMap((l, i) => Array.from({ length: l.qty }, () => ({ i, cents: l.unitCents, used: false })));
    const out: CartDiscount[] = [];
    const hints: { label: Localized; missing: number }[] = [];
    for (const o of live) {
      if (o.kind !== "bundle" || !o.bundle) continue;
      const { qty, mode, value } = o.bundle;
      const pool = units.filter((u) => !u.used && inScope(o.scope, rows[u.i].product)).sort((a, b) => b.cents - a.cents);
      let cents = 0;
      for (let g = 0; g + qty <= pool.length; g += qty) {
        const group = pool.slice(g, g + qty);
        const sum = group.reduce((s, u) => s + u.cents, 0);
        const off = mode === "price" ? Math.max(0, sum - value) : mode === "cheapest" ? Math.round((group[qty - 1].cents * value) / 100) : Math.round((sum * value) / 100);
        if (off > 0) {
          cents += off;
          group.forEach((u) => (u.used = true));
        }
      }
      if (cents) out.push({ id: o.id, label: o.name, cents });
      const rest = pool.filter((u) => !u.used).length % qty;
      if (pool.length && rest) hints.push({ label: o.badge.de || o.badge.ar ? o.badge : o.name, missing: qty - rest });
    }
    return { discounts: out, hints };
  };

  const first = bundles(priced);
  const hints = first.hints;
  let discounts = first.discounts;
  let subtotal = priced.reduce((s, l) => s + l.unitCents * l.qty, 0);
  let offerCents = discounts.reduce((s, d) => s + d.cents, 0);

  // 3. Vorbestellrabatt
  const pre = store.settings.preorder;
  let preorderCents = 0;
  if (preorderLive(store.settings, now) && lines.length) {
    const label: Localized = { de: `Vorbestellrabatt ${pre.pct} %`, ar: `خصم الطلب المسبق ⁦${pre.pct}%⁩` };
    if (pre.combine) {
      preorderCents = Math.round(((subtotal - offerCents) * pre.pct) / 100);
    } else {
      const alone = Math.round((listTotal * pre.pct) / 100);
      if (alone >= listTotal - subtotal + offerCents) {
        // Vorbestellrabatt ist günstiger → andere Angebote entfallen
        priced = priced.map((l) => ({ ...l, unitCents: l.listCents, unitPct: 0, unitOffer: null }));
        subtotal = listTotal;
        discounts = [];
        offerCents = 0;
        preorderCents = alone;
      }
    }
    if (preorderCents) discounts.push({ id: "preorder", label, cents: preorderCents });
  }

  const cartDiscountCents = offerCents + preorderCents;
  const total = Math.max(0, subtotal - cartDiscountCents);
  const sh = store.settings.shipping;
  const freeShipping = sh.freeFromCents > 0 && total >= sh.freeFromCents;
  const shipping: ShippingChoice[] = [
    { id: "standard", cents: freeShipping ? 0 : sh.standardCents },
    ...(sh.express.enabled ? [{ id: "express" as const, cents: sh.express.cents }] : []),
    ...(sh.pickup.enabled ? [{ id: "pickup" as const, cents: 0 }] : []),
  ];

  return {
    lines: priced,
    listTotal,
    unitSavings: listTotal - subtotal,
    subtotal,
    discounts,
    cartDiscountCents,
    total,
    shipping,
    freeShippingMissing: sh.freeFromCents > 0 ? Math.max(0, sh.freeFromCents - total) : null,
    hints,
  };
}
export type CartPrice = ReturnType<typeof priceCart>;
