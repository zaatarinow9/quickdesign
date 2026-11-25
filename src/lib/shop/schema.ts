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
export const kinds = ["tshirt", "polo", "hoodie", "sweatshirt", "flag", "banner", "foil", "sticker", "other"] as const;

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
  /** Rohlinge für den Gestalter (ohne Motiv, gerade gelegt) */
  blankFront: img.default(""),
  blankBack: img.default(""),
});

/** Motiv aus der Bibliothek (Sticker/Design) – je eine Fassung für dunkle und helle Stoffe */
export const motifSchema = z.object({
  id,
  name: L,
  /** für dunkle Stoffe */
  light: img,
  /** für helle Stoffe */
  dark: img,
  active: z.boolean().default(true),
});

/** Gestalter: Kunde wählt Motiv vorne / hinten */
export const customSchema = z.object({
  enabled: z.boolean().default(false),
  /** Aufpreis, wenn vorne UND hinten bedruckt wird */
  extraSideCents: cents.default(0),
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
  custom: customSchema.default({ enabled: false, extraSideCents: 0 }),
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
export const categorySlugs = ["tshirts", "hoodies", "flags", "stickers"] as const;
export type CategorySlug = (typeof categorySlugs)[number];
/** Welche Produktarten zu welchem Shop-Bereich gehören */
export const categoryKinds: Record<CategorySlug, Kind[]> = {
  tshirts: ["tshirt", "polo"],
  hoodies: ["hoodie", "sweatshirt"],
  flags: ["flag", "banner"],
  stickers: ["sticker", "foil", "other"],
};
const slideSchema = z.object({ image: img, title: L, text: L, link: z.string().max(200).default(""), credit: z.string().max(200).default("") });
const sectionSchema = z.object({ slug: z.enum(categorySlugs), title: L, text: L, image: img.default("") });

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
  story: z.object({ eyebrow: L, title: L, quote: L, paragraphs: z.array(L).max(8), images: z.array(storyImage).max(12), image: img.default("") }),
  /** Startseiten-Slider */
  slides: z.array(slideSchema).max(6).default([]),
  /** Bereiche (Kacheln, Banner, Kategorieseiten) */
  sections: z.array(sectionSchema).max(4).default([]),
});

export const storeSchema = z.object({
  version: z.literal(1),
  products: z.array(productSchema).max(200),
  motifs: z.array(motifSchema).max(300).default([]),
  offers: z.array(offerSchema).max(50),
  settings: settingsSchema,
});

export type Variant = z.infer<typeof variantSchema>;
export type Color = z.infer<typeof colorSchema>;
export type SizeRow = z.infer<typeof sizeRowSchema>;
export type Product = z.infer<typeof productSchema>;
export type Motif = z.infer<typeof motifSchema>;
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

/** Druckbereiche je Kleidungsart (Prozent des Rohling-Bildes): Brustmitte, linke Brust (vom Träger aus), Rücken */
type Area = { x: number; y: number; w: number; h: number };
export type GarmentKind = "tshirt" | "polo" | "hoodie" | "sweatshirt";
export type FrontPos = "center" | "chest";
export const garmentKinds: GarmentKind[] = ["tshirt", "polo", "hoodie", "sweatshirt"];
export const isGarment = (k: string): k is GarmentKind => (garmentKinds as string[]).includes(k);
export const printAreas: Record<GarmentKind, { front: Area; chest: Area; back: Area }> = {
  // Maximale Druckfläche (≈ A3, 30 × 40 cm) – am Foto ausgemessen; das Motiv bleibt immer darin
  tshirt: { front: { x: 37.5, y: 19, w: 25, h: 33 }, chest: { x: 55, y: 21, w: 8, h: 8 }, back: { x: 37.5, y: 16, w: 25, h: 33 } },
  // Polo: Brusttasche rechts im Bild – vorne daher unterhalb der Tasche, Brustlogo auf der anderen Seite
  polo: { front: { x: 37, y: 48, w: 26, h: 27 }, chest: { x: 36, y: 32, w: 9, h: 9 }, back: { x: 37.5, y: 17, w: 25, h: 33 } },
  hoodie: { front: { x: 39, y: 42, w: 22, h: 12 }, chest: { x: 56, y: 36, w: 8, h: 8 }, back: { x: 36, y: 26, w: 28, h: 28 } },
  sweatshirt: { front: { x: 38, y: 17, w: 24, h: 24 }, chest: { x: 57, y: 17, w: 9, h: 9 }, back: { x: 37, y: 15, w: 26, h: 28 } },
};
/** Zentimeter je Prozent Bildbreite (aus Brustweite Größe M ÷ Körperbreite im Foto) */
export const cmPerPct: Record<GarmentKind, number> = { tshirt: 1.2, polo: 1.1, hoodie: 1.2, sweatshirt: 1.2 };

/**
 * Lage des Motivs in der Druckfläche: x/y = Position im freien Raum (0 = links/oben, 1 = rechts/unten),
 * s = Größe im Verhältnis zur größtmöglichen Fläche (0,25–1). So kann das Motiv nie über den Rand hinaus.
 */
export type Placement = { x: number; y: number; s: number };
export const defaultPlacement: Placement = { x: 0.5, y: 0.08, s: 0.72 };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const MIN_SCALE = 0.25;
export function normPlacement(p: Partial<Placement> | null | undefined): Placement {
  const n = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  return { x: clamp(n(p?.x, defaultPlacement.x), 0, 1), y: clamp(n(p?.y, defaultPlacement.y), 0, 1), s: clamp(n(p?.s, defaultPlacement.s), MIN_SCALE, 1) };
}
/** „x,y,s,r" (r = Seitenverhältnis des Motivs) ↔ Objekt */
export function parsePlacement(str?: string | null): { pl: Placement; ratio: number | null } | null {
  if (!str) return null;
  const [x, y, s, r] = str.split(",").map(Number);
  if (![x, y, s].every(Number.isFinite)) return null;
  return { pl: normPlacement({ x, y, s }), ratio: Number.isFinite(r) && r > 0.1 && r < 10 ? r : null };
}
export const fmtPlacement = (pl: Placement, ratio?: number | null) => [pl.x, pl.y, pl.s].map((v) => v.toFixed(3)).join(",") + (ratio ? `,${ratio.toFixed(3)}` : "");
/** Rechteck des Motivs (in % des Bildes) */
export function placeRect(area: Area, ratio: number, pl: Placement): Area {
  const b = area.w / area.h;
  const w0 = ratio > b ? area.w : area.h * ratio;
  const h0 = ratio > b ? area.w / ratio : area.h;
  const w = w0 * pl.s;
  const h = h0 * pl.s;
  return { x: area.x + (area.w - w) * pl.x, y: area.y + (area.h - h) * pl.y, w, h };
}
/** Klartext für die Werkstatt: Größe in cm, Abstand von oben, Lage waagrecht */
export function describePlacement(kind: string, area: Area, ratio: number | null, pl: Placement, lang: "de" | "ar" = "ar") {
  const k = cmPerPct[isGarment(kind) ? kind : "tshirt"];
  const r = placeRect(area, ratio ?? area.w / area.h, pl);
  const w = Math.round(r.w * k);
  const h = Math.round(r.h * k);
  const top = Math.round((r.y - area.y) * k);
  const off = Math.round((r.x + r.w / 2 - (area.x + area.w / 2)) * k);
  if (lang === "de") return `${w}×${h} cm, ${top} cm v. oben, ${off === 0 ? "mittig" : `${Math.abs(off)} cm ${off > 0 ? "rechts" : "links"}`}`;
  return `${w}×${h} سم، ${top} سم من الأعلى، ${off === 0 ? "بالوسط" : `${Math.abs(off)} سم ${off > 0 ? "يمين" : "يسار"}`}`;
}

/** Druckbereich für Ansicht + Position */
export function areaFor(kind: string, side: "front" | "back", pos: FrontPos = "center"): Area {
  const a = printAreas[isGarment(kind) ? kind : "tshirt"];
  return side === "back" ? a.back : pos === "chest" ? a.chest : a.front;
}
export const isDarkHex = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
};
export const motifById = (s: ShopStore, id?: string) => (id ? s.motifs.find((m) => m.id === id && m.active) : undefined);
export const motifImage = (m: Motif, darkFabric: boolean) => (darkFabric ? m.light || m.dark : m.dark || m.light);

/** Warenkorbzeile gegen den Katalog prüfen (Preise nie aus dem Browser) */
export function resolveLine(s: ShopStore, line: { slug: string; color: string; size: string; qty: number; front?: string; back?: string; frontPos?: string; frontPl?: string; backPl?: string }) {
  const product = productById(s, line.slug);
  if (!product) return null;
  const color = product.colors.length ? (product.colors.find((c) => c.id === line.color) ?? null) : null;
  if (product.colors.length && !color) return null;
  const variant = product.variants.find((v) => v.id === line.size && v.active);
  if (!variant) return null;
  const qty = Math.floor(Number(line.qty));
  if (!Number.isFinite(qty) || qty < 1 || qty > product.maxQty) return null;
  let front: Motif | null = null;
  let back: Motif | null = null;
  let extraCents = 0;
  if (product.custom.enabled) {
    front = motifById(s, line.front) ?? null;
    back = motifById(s, line.back) ?? null;
    if ((line.front && !front) || (line.back && !back) || (!front && !back)) return null;
    if (front && back) extraCents = product.custom.extraSideCents;
  }
  const frontPos: FrontPos = front && line.frontPos === "chest" ? "chest" : "center";
  const frontPl = front ? (parsePlacement(line.frontPl) ?? { pl: defaultPlacement, ratio: null }) : null;
  const backPl = back ? (parsePlacement(line.backPl) ?? { pl: defaultPlacement, ratio: null }) : null;
  return { product, color, variant, qty, front, back, frontPos, frontPl, backPl, extraCents };
}
export type ResolvedLine = NonNullable<ReturnType<typeof resolveLine>>;
