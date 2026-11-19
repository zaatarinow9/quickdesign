/**
 * Produktkatalog „Tag der Befreiung – 8.12.“
 *
 * Preise in Cent. Der Server berechnet den Checkout ausschließlich aus diesem Katalog –
 * Preise aus dem Browser werden nie übernommen.
 *
 * TODO(Inhaber): Produkte, Preise, Farben, Stoff und Maßtabelle mit dem Referenz-Repo
 * `alkelaniworkspace/quickdesign-shop` (src/content/products.ts) abgleichen – die Werte hier sind vorläufig.
 */
import type { Lang } from "./config";

export type ArtworkKey = "flag" | "seal" | "eight" | "jasmine" | "wahid";
export type Garment = "tshirt" | "hoodie";
export type Color = { id: string; hex: string; name: Record<Lang, string>; /** Druckfarbe hell/dunkel */ ink: "light" | "dark" };
export type SizeRow = { size: string; width: number; length: number; sleeve?: number };

export type Product = {
  slug: string;
  garment: Garment;
  artwork: ArtworkKey;
  priceCents: number;
  name: Record<Lang, string>;
  tagline: Record<Lang, string>;
  description: Record<Lang, string>;
  colors: Color[];
  sizes: string[];
  material: Record<Lang, string>;
  sizeChart: SizeRow[];
  /** Hervorgehoben auf der Startseite */
  featured?: boolean;
  badge?: Record<Lang, string>;
};

const C = {
  schwarz: { id: "schwarz", hex: "#121214", name: { de: "Schwarz", ar: "أسود" }, ink: "light" },
  weiss: { id: "weiss", hex: "#f6f4ef", name: { de: "Weiß", ar: "أبيض" }, ink: "dark" },
  sand: { id: "sand", hex: "#d9cdb5", name: { de: "Sand", ar: "رملي" }, ink: "dark" },
  gruen: { id: "gruen", hex: "#0f3d2b", name: { de: "Flaschengrün", ar: "أخضر زيتي" }, ink: "light" },
} satisfies Record<string, Color>;

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const HOODIE_SIZES = ["S", "M", "L", "XL", "XXL", "3XL"];

// TODO(Inhaber): Maßtabellen vom Textil-Lieferanten bestätigen (Werte vorläufig, in cm).
const TSHIRT_CHART: SizeRow[] = [
  { size: "XS", width: 46, length: 68 },
  { size: "S", width: 49, length: 71 },
  { size: "M", width: 52, length: 74 },
  { size: "L", width: 55, length: 76 },
  { size: "XL", width: 58, length: 78 },
  { size: "XXL", width: 61, length: 80 },
  { size: "3XL", width: 64, length: 82 },
];
const HOODIE_CHART: SizeRow[] = [
  { size: "S", width: 53, length: 68, sleeve: 62 },
  { size: "M", width: 56, length: 71, sleeve: 63 },
  { size: "L", width: 59, length: 74, sleeve: 64 },
  { size: "XL", width: 62, length: 76, sleeve: 65 },
  { size: "XXL", width: 65, length: 78, sleeve: 66 },
  { size: "3XL", width: 68, length: 80, sleeve: 67 },
];

// TODO(Inhaber): Stoffangaben vom Lieferanten bestätigen.
const TSHIRT_MATERIAL = {
  de: "100 % Bio-Baumwolle, ca. 180 g/m², Unisex-Schnitt, langlebiger Siebdruck/DTF – in Saarbrücken veredelt.",
  ar: "قطن عضوي 100%، حوالي 180 غ/م²، قصّة للجنسين، طباعة متينة – تُطبع في زاربروكن.",
};
const HOODIE_MATERIAL = {
  de: "80 % Bio-Baumwolle, 20 % recyceltes Polyester, ca. 300 g/m², weich angeraut, Kapuze mit Kordel – in Saarbrücken veredelt.",
  ar: "80% قطن عضوي و20% بوليستر معاد تدويره، حوالي 300 غ/م²، ناعم من الداخل، بقبعة وحبل – يُطبع في زاربروكن.",
};

export const products: Product[] = [
  {
    slug: "flagge-8-12",
    garment: "tshirt",
    artwork: "flag",
    priceCents: 2990,
    featured: true,
    badge: { de: "Bestseller", ar: "الأكثر طلباً" },
    name: { de: "T-Shirt „Flagge 8.12“", ar: "تيشرت «علم 8 كانون»" },
    tagline: { de: "Die wehende Fahne der Freiheit", ar: "علم الحرية يرفرف" },
    description: {
      de: "Die grün-weiß-schwarze Fahne mit den drei roten Sternen – wehend, mit dem Datum, das alles verändert hat: 8.12.2024.",
      ar: "العلم الأخضر والأبيض والأسود بنجومه الحمراء الثلاث يرفرف، ومعه التاريخ الذي غيّر كل شيء: 8.12.2024.",
    },
    colors: [C.schwarz, C.weiss, C.sand],
    sizes: TSHIRT_SIZES,
    material: TSHIRT_MATERIAL,
    sizeChart: TSHIRT_CHART,
  },
  {
    slug: "siegel-freies-syrien",
    garment: "tshirt",
    artwork: "seal",
    priceCents: 2990,
    featured: true,
    name: { de: "T-Shirt „Siegel – Freies Syrien“", ar: "تيشرت «ختم سوريا حرة»" },
    tagline: { de: "Goldenes Siegel zum zweiten Jahrestag", ar: "ختم ذهبي للذكرى الثانية" },
    description: {
      de: "Ein goldenes Siegel mit „سوريا حرة“ – Freies Syrien – und den drei Sternen. Elegant, ruhig, unverwechselbar.",
      ar: "ختم ذهبي يحمل عبارة «سوريا حرة» والنجوم الثلاث – أنيق وهادئ ولا يُنسى.",
    },
    colors: [C.schwarz, C.gruen, C.weiss],
    sizes: TSHIRT_SIZES,
    material: TSHIRT_MATERIAL,
    sizeChart: TSHIRT_CHART,
  },
  {
    slug: "die-acht",
    garment: "tshirt",
    artwork: "eight",
    priceCents: 2790,
    name: { de: "T-Shirt „Die Acht“", ar: "تيشرت «الثامن»" },
    tagline: { de: "Eine Zahl. Ein Tag. Ein neues Kapitel.", ar: "رقم واحد. يوم واحد. فصل جديد." },
    description: {
      de: "Eine riesige 8 in den Farben der Revolution – für den Morgen des 8. Dezember, an dem Syrien aufgewacht ist.",
      ar: "رقم 8 كبير بألوان الثورة – لصباح الثامن من كانون الأول الذي استيقظت فيه سوريا.",
    },
    colors: [C.schwarz, C.weiss],
    sizes: TSHIRT_SIZES,
    material: TSHIRT_MATERIAL,
    sizeChart: TSHIRT_CHART,
  },
  {
    slug: "jasmin-damaskus",
    garment: "tshirt",
    artwork: "jasmine",
    priceCents: 2990,
    name: { de: "T-Shirt „Jasmin von Damaskus“", ar: "تيشرت «ياسمين الشام»" },
    tagline: { de: "Ein Kranz aus Damaszener Jasmin", ar: "إكليل من ياسمين الشام" },
    description: {
      de: "Der Jasmin ist das Herz von Damaskus. Ein feiner Kranz umschließt den Stern und das Datum – zart und stolz zugleich.",
      ar: "الياسمين قلب دمشق. إكليل رقيق يحيط بالنجمة والتاريخ – رقيق وفخور في آن.",
    },
    colors: [C.weiss, C.sand, C.schwarz],
    sizes: TSHIRT_SIZES,
    material: TSHIRT_MATERIAL,
    sizeChart: TSHIRT_CHART,
  },
  {
    slug: "wahid-hoodie",
    garment: "hoodie",
    artwork: "wahid",
    priceCents: 5490,
    featured: true,
    badge: { de: "Hoodie", ar: "هودي" },
    name: { de: "Hoodie „Wahid, wahid, wahid“", ar: "هودي «واحد واحد واحد»" },
    tagline: { de: "Das syrische Volk ist eins", ar: "الشعب السوري واحد" },
    description: {
      de: "„Wahid, wahid, wahid – asch-scha‘b as-suri wahid“: der Ruf, der alle verbunden hat. Mit Band in den Farben der Fahne.",
      ar: "«واحد واحد واحد، الشعب السوري واحد» – الهتاف الذي جمع الجميع. مع شريط بألوان العلم.",
    },
    colors: [C.schwarz, C.gruen],
    sizes: HOODIE_SIZES,
    material: HOODIE_MATERIAL,
    sizeChart: HOODIE_CHART,
  },
  {
    slug: "flagge-hoodie",
    garment: "hoodie",
    artwork: "flag",
    priceCents: 5490,
    name: { de: "Hoodie „Flagge 8.12“", ar: "هودي «علم 8 كانون»" },
    tagline: { de: "Warm durch den Dezember", ar: "دفء كانون الأول" },
    description: {
      de: "Die wehende Fahne auf einem schweren, weichen Hoodie – für kalte Dezembertage und lange Feiern.",
      ar: "العلم المرفرف على هودي ثقيل وناعم – لأيام كانون الباردة والاحتفالات الطويلة.",
    },
    colors: [C.schwarz, C.sand],
    sizes: HOODIE_SIZES,
    material: HOODIE_MATERIAL,
    sizeChart: HOODIE_CHART,
  },
];

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);

/** Prüft eine Warenkorbzeile gegen den Katalog und liefert den echten Preis */
export function resolveLine(line: { slug: string; color: string; size: string; qty: number }) {
  const p = productBySlug(line.slug);
  if (!p) return null;
  const color = p.colors.find((c) => c.id === line.color);
  if (!color || !p.sizes.includes(line.size)) return null;
  const qty = Math.floor(Number(line.qty));
  if (!Number.isFinite(qty) || qty < 1 || qty > 20) return null;
  return { product: p, color, size: line.size, qty, unitCents: p.priceCents };
}
