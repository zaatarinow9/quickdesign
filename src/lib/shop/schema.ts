/**
 * Datenmodell des Shops (in der Shop-Verwaltung bearbeitbar, gespeichert in public.shop_store).
 * Wird im Browser und auf dem Server genutzt – keine Server-Abhängigkeiten.
 */
import { z } from "zod";

export const L = z.object({ de: z.string().trim().max(4000), ar: z.string().trim().max(4000) });
export type Localized = z.infer<typeof L>;
const img = z.string().trim().max(600);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/, "Nur Kleinbuchstaben, Ziffern und Bindestriche");
const cents = z.number().int().min(0).max(10_000_000);
const pct = z.number().int().min(0).max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""));

export const categories = ["textil", "druck"] as const;
export const kinds = ["tshirt", "hoodie", "flag", "banner", "foil", "sticker", "other"] as const;

export const variantSchema = z.object({
  id: z.string().trim().min(1).max(30),
  label: L,
  priceCents: cents,
  image: img.default(""),
  active: z.boolean().default(true),
});
export const colorSchema = z.object({
  id,
  name: L,
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  image: img.default(""),
  detail: img.default(""),
});
export const sizeRowSchema = z.object({
  size: z.string().max(10),
  width: z.number().min(0).max(500),
  length: z.number().min(0).max(500),
  sleeve: z.number().min(0).max(500).optional(),
});

export const productSchema = z.object({
  id,
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  category: z.enum(categories),
  kind: z.enum(kinds),
  name: L,
  tagline: L,
  description: L,
  details: z.array(L).max(12).default([]),
  colors: z.array(colorSchema).max(12).default([]),
  /** Bild, wenn es keine Farben gibt */
  image: img.default(""),
  /** Nahaufnahme ohne Farben */
  detail: img.default(""),
  /** Zusätzliche Bilder (Galerie) */
  gallery: z.array(img).max(12).default([]),
  /** Textil: Größen · Druck: Formate – jeweils mit eigenem Preis und optional eigenem Bild */
  variants: z.array(variantSchema).min(1).max(30),
  sizeChart: z.array(sizeRowSchema).max(12).default([]),
  maxQty: z.number().int().min(1).max(1000).default(50),
});

export const scopeSchema = z.object({
  type: z.enum(["all", "category", "products"]),
  category: z.enum(categories).optional(),
  products: z.array(z.string()).default([]),
});

export const offerSchema = z.object({
  id,
  active: z.boolean().default(true),
  name: L,
  /** Kurzer Hinweis am Produkt, z. B. „3 für 75 €“ */
  badge: L,
  scope: scopeSchema,
  starts: date.default(""),
  ends: date.default(""),
  kind: z.enum(["bundle", "tiers", "percent"]),
  /** bundle: je `qty` Teile → mode price: zusammen `value` Cent · cheapest: günstigstes −value % · percent: alle −value % */
  bundle: z.object({ qty: z.number().int().min(2).max(50), mode: z.enum(["price", "cheapest", "percent"]), value: z.number().int().min(0).max(10_000_000) }).optional(),
  /** tiers: Mengenrabatt auf die Gesamtmenge je Produkt */
  tiers: z.array(z.object({ min: z.number().int().min(2).max(10_000), pct })).max(8).optional(),
  /** percent: fester Rabatt in % */
  percent: pct.optional(),
});

const storyImage = z.object({ url: img, caption: L, credit: z.string().max(300).default("") });

export const settingsSchema = z.object({
  shipping: z.object({
    standardCents: cents,
    /** 0 = nie kostenlos */
    freeFromCents: cents,
    deliveryDays: z.string().max(20),
    express: z.object({ enabled: z.boolean(), cents, days: z.string().max(20) }),
    pickup: z.object({ enabled: z.boolean(), address: z.string().max(200) }),
  }),
  preorder: z.object({
    enabled: z.boolean(),
    pct,
    /** letzter Tag des Vorbestellrabatts */
    until: date,
    /** mit anderen Angeboten kombinierbar? Sonst gilt automatisch das günstigere */
    combine: z.boolean(),
  }),
  campaign: z.object({ anniversary: date, lastOrderDay: date }),
  whatsapp: z.string().regex(/^\d{6,16}$/),
  hero: z.object({ eyebrow: L, title: L, text: L, image: img.default("") }),
  story: z.object({ eyebrow: L, title: L, quote: L, paragraphs: z.array(L).max(8), images: z.array(storyImage).max(12) }),
});

export const storeSchema = z.object({
  version: z.literal(1),
  products: z.array(productSchema).max(200),
  offers: z.array(offerSchema).max(50),
  settings: settingsSchema,
});

export type Variant = z.infer<typeof variantSchema>;
export type Color = z.infer<typeof colorSchema>;
export type SizeRow = z.infer<typeof sizeRowSchema>;
export type Product = z.infer<typeof productSchema>;
export type Offer = z.infer<typeof offerSchema>;
export type OfferScope = z.infer<typeof scopeSchema>;
export type ShopSettings = z.infer<typeof settingsSchema>;
export type ShopStore = z.infer<typeof storeSchema>;
export type Category = Product["category"];
export type Kind = Product["kind"];

/* ------------------------------------------------------------------ Helfer */

export const activeProducts = (s: ShopStore) => s.products.filter((p) => p.active && p.variants.some((v) => v.active));
export const productById = (s: ShopStore, slug: string) => s.products.find((p) => p.id === slug && p.active);
export const activeVariants = (p: Product) => p.variants.filter((v) => v.active);
export const fromPrice = (p: Product) => Math.min(...activeVariants(p).map((v) => v.priceCents));

/** Hauptbild: Variante (z. B. Fahnengröße) > Farbe > Produkt */
export function imageOf(p: Product, colorId?: string, variantId?: string) {
  const v = variantId ? p.variants.find((x) => x.id === variantId)?.image : "";
  const c = p.colors.find((x) => x.id === colorId) ?? p.colors[0];
  return v || c?.image || p.image || "";
}
export function detailOf(p: Product, colorId?: string) {
  const c = p.colors.find((x) => x.id === colorId) ?? p.colors[0];
  return c?.detail || p.detail || "";
}

export const inScope = (scope: OfferScope, p: Product) =>
  scope.type === "all" || (scope.type === "category" && scope.category === p.category) || (scope.type === "products" && scope.products.includes(p.id));

/** Datum (YYYY-MM-DD) in Berliner Zeit als Tagesgrenze */
const dayStart = (d: string) => Date.parse(`${d}T00:00:00+01:00`);
const dayEnd = (d: string) => Date.parse(`${d}T23:59:59+01:00`);
export const offerLive = (o: Offer, now: number) => o.active && (!o.starts || now >= dayStart(o.starts)) && (!o.ends || now <= dayEnd(o.ends));
export const preorderLive = (s: ShopSettings, now: number) => s.preorder.enabled && s.preorder.pct > 0 && (!s.preorder.until || now <= dayEnd(s.preorder.until));
export const preorderEndsAt = (s: ShopSettings) => (s.preorder.until ? dayEnd(s.preorder.until) : null);

/** Warenkorbzeile gegen den Katalog prüfen (Preise nie aus dem Browser) */
export function resolveLine(s: ShopStore, line: { slug: string; color: string; size: string; qty: number }) {
  const product = productById(s, line.slug);
  if (!product) return null;
  const color = product.colors.length ? (product.colors.find((c) => c.id === line.color) ?? null) : null;
  if (product.colors.length && !color) return null;
  const variant = product.variants.find((v) => v.id === line.size && v.active);
  if (!variant) return null;
  const qty = Math.floor(Number(line.qty));
  if (!Number.isFinite(qty) || qty < 1 || qty > product.maxQty) return null;
  return { product, color, variant, qty };
}
export type ResolvedLine = NonNullable<ReturnType<typeof resolveLine>>;
