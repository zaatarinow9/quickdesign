/**
 * Produktkatalog „Tag der Befreiung – 8.12.“
 *
 * Preise in Cent. Der Server berechnet den Checkout ausschließlich aus diesem Katalog –
 * Preise aus dem Browser werden nie übernommen.
 *
 * TODO(Inhaber): Preise, Formate, Stoffangaben und Maßtabellen bestätigen (Werte vorläufig).
 * Produktbilder: public/shop/*.webp (erzeugt mit scripts/shop/mockups.py) – können 1:1 durch echte Fotos ersetzt werden.
 */
import type { Lang } from "./config";

export type Category = "textil" | "druck";
export type Kind = "tshirt" | "hoodie" | "flag" | "banner" | "foil" | "sticker";
type T = Record<Lang, string>;

export type Color = { id: string; hex: string; name: T };
export type Variant = { id: string; label: T; priceCents: number; hint?: T };
export type SizeRow = { size: string; width: number; length: number; sleeve?: number };
export type Tier = { min: number; pct: number };

export type Product = {
  slug: string;
  category: Category;
  kind: Kind;
  name: T;
  tagline: T;
  description: T;
  /** Farben mit eigenem Bild – leer bei Druckprodukten */
  colors: { color: Color; image: string }[];
  /** Bild ohne Farbauswahl */
  image?: string;
  /** Größen (Textil) bzw. Formate (Druck) – jeweils mit Preis */
  variants: Variant[];
  details: T[];
  sizeChart?: SizeRow[];
  /** Mengenrabatt auf die Gesamtmenge dieses Produkts */
  tiers?: Tier[];
  featured?: boolean;
};

const C = {
  schwarz: { id: "schwarz", hex: "#1d1d1f", name: { de: "Schwarz", ar: "أسود" } },
  weiss: { id: "weiss", hex: "#f4f2ed", name: { de: "Weiß", ar: "أبيض" } },
  sand: { id: "sand", hex: "#d8ccb4", name: { de: "Sand", ar: "رملي" } },
  gruen: { id: "gruen", hex: "#4b5133", name: { de: "Olivgrün", ar: "أخضر زيتي" } },
  gold: { id: "gold", hex: "#bca475", name: { de: "Gold", ar: "ذهبي" } },
} satisfies Record<string, Color>;

const img = (n: string) => `/shop/${n}.webp`;
const sizes = (list: string[], cents: number): Variant[] => list.map((s) => ({ id: s, label: { de: s, ar: s }, priceCents: cents }));

// TODO(Inhaber): Maßtabellen vom Textil-Lieferanten bestätigen (cm, flach gemessen).
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

const TSHIRT_PRICE = 2990;
const HOODIE_PRICE = 5490;
const TSHIRT = sizes(["XS", "S", "M", "L", "XL", "XXL", "3XL"], TSHIRT_PRICE);
const HOODIE = sizes(["S", "M", "L", "XL", "XXL", "3XL"], HOODIE_PRICE);

// TODO(Inhaber): Stoffangaben vom Lieferanten bestätigen.
const TSHIRT_DETAILS: T[] = [
  { de: "100 % Bio-Baumwolle, ca. 180 g/m², Unisex-Schnitt", ar: "قطن عضوي 100%، حوالي 180 غ/م²، قصّة للجنسين" },
  { de: "Langlebiger Druck, in Saarbrücken veredelt", ar: "طباعة متينة، تُنفّذ في زاربروكن" },
  { de: "Waschen bei 30 °C auf links", ar: "غسيل على 30 درجة مقلوباً" },
];
const HOODIE_DETAILS: T[] = [
  { de: "80 % Bio-Baumwolle, 20 % recyceltes Polyester, ca. 300 g/m²", ar: "80% قطن عضوي و20% بوليستر معاد تدويره، حوالي 300 غ/م²" },
  { de: "Innen weich angeraut, Kapuze mit Kordel, Kängurutasche", ar: "ناعم من الداخل، قبعة بحبل، جيب أمامي" },
  { de: "Langlebiger Druck, in Saarbrücken veredelt", ar: "طباعة متينة، تُنفّذ في زاربروكن" },
];

const tee = (slug: string, motif: string, colors: (keyof typeof C)[], name: T, tagline: T, description: T, featured = false): Product => ({
  slug,
  category: "textil",
  kind: "tshirt",
  name,
  tagline,
  description,
  colors: colors.map((c) => ({ color: C[c], image: img(`tshirt-${motif}-${c}`) })),
  variants: TSHIRT,
  details: TSHIRT_DETAILS,
  sizeChart: TSHIRT_CHART,
  featured,
});

export const products: Product[] = [
  tee(
    "tshirt-fahne",
    "flagge",
    ["schwarz", "weiss", "gruen"],
    { de: "T-Shirt „Fahne 8.12.“", ar: "تيشرت «علم 8.12»" },
    { de: "Die Fahne der Freiheit, schlicht und klar", ar: "علم الحرية، ببساطة ووضوح" },
    {
      de: "Die grün-weiß-schwarze Fahne mit den drei roten Sternen, darunter das Datum, das alles verändert hat – und „Zwei Jahre Freiheit“ auf Arabisch.",
      ar: "العلم الأخضر والأبيض والأسود بنجومه الحمراء الثلاث، وتحته التاريخ الذي غيّر كل شيء وعبارة «عامان من الحرية».",
    },
    true,
  ),
  tee(
    "tshirt-hurriya",
    "hurriya",
    ["weiss", "schwarz", "gruen"],
    { de: "T-Shirt „Hurriya – Freiheit“", ar: "تيشرت «حرية»" },
    { de: "Ein Wort, das alles sagt", ar: "كلمة واحدة تقول كل شيء" },
    { de: "„Hurriya“ – Freiheit. Groß in arabischer Schrift, mit den drei Sternen und dem Datum 8.12.2024.", ar: "«حرية» بخط عربي كبير، مع النجوم الثلاث وتاريخ 8.12.2024." },
    true,
  ),
  tee(
    "tshirt-acht",
    "acht",
    ["weiss", "schwarz", "gruen"],
    { de: "T-Shirt „8.12.“", ar: "تيشرت «8.12»" },
    { de: "Ein Datum. Ein neues Kapitel.", ar: "تاريخ واحد. فصل جديد." },
    { de: "Das Datum in großen Ziffern, darunter „der achte Dezember“ auf Arabisch und eine feine grüne Linie.", ar: "التاريخ بأرقام كبيرة، وتحته «الثامن من كانون الأول» وخط أخضر رفيع." },
  ),
  tee(
    "tshirt-siegel",
    "siegel",
    ["schwarz", "weiss", "gruen"],
    { de: "T-Shirt „Siegel – Freies Syrien“", ar: "تيشرت «ختم سوريا حرة»" },
    { de: "Ein ruhiges Siegel zum zweiten Jahrestag", ar: "ختم هادئ للذكرى الثانية" },
    { de: "Ein rundes Siegel mit „سوريا حرة“, „Free Syria · 8 December 2024“ und den drei Sternen.", ar: "ختم دائري بعبارة «سوريا حرة» و«Free Syria · 8 December 2024» والنجوم الثلاث." },
  ),
  tee(
    "tshirt-jasmin",
    "jasmin",
    ["weiss", "gruen", "sand"],
    { de: "T-Shirt „Jasmin von Damaskus“", ar: "تيشرت «ياسمين الشام»" },
    { de: "Feine Linien, viel Erinnerung", ar: "خطوط رقيقة وذكريات كثيرة" },
    { de: "Ein Zweig Damaszener Jasmin als feine Linienzeichnung – zart, ruhig und voller Heimat.", ar: "غصن من ياسمين الشام برسم خطي رقيق – هادئ ومليء بالحنين." },
  ),
  {
    slug: "hoodie-wahid",
    category: "textil",
    kind: "hoodie",
    featured: true,
    name: { de: "Hoodie „Wahid, wahid, wahid“", ar: "هودي «واحد واحد واحد»" },
    tagline: { de: "Das syrische Volk ist eins", ar: "الشعب السوري واحد" },
    description: {
      de: "„Wahid, wahid, wahid – asch-scha‘b as-suri wahid“: der Ruf, der alle verbunden hat. Mit kleinem Band in den Farben der Fahne.",
      ar: "«واحد واحد واحد، الشعب السوري واحد» – الهتاف الذي جمع الجميع، مع شريط صغير بألوان العلم.",
    },
    colors: (["schwarz", "weiss", "gruen"] as const).map((c) => ({ color: C[c], image: img(`hoodie-wahid-${c}`) })),
    variants: HOODIE,
    details: HOODIE_DETAILS,
    sizeChart: HOODIE_CHART,
  },
  {
    slug: "hoodie-fahne",
    category: "textil",
    kind: "hoodie",
    name: { de: "Hoodie „Fahne 8.12.“", ar: "هودي «علم 8.12»" },
    tagline: { de: "Warm durch den Dezember", ar: "دفء كانون الأول" },
    description: { de: "Die Fahne mit Datum auf einem schweren, weichen Hoodie – für kalte Dezembertage und lange Feiern.", ar: "العلم مع التاريخ على هودي ثقيل وناعم – لأيام كانون الباردة والاحتفالات الطويلة." },
    colors: (["schwarz", "weiss", "gruen"] as const).map((c) => ({ color: C[c], image: img(`hoodie-flagge-${c}`) })),
    variants: HOODIE,
    details: HOODIE_DETAILS,
    sizeChart: HOODIE_CHART,
  },

  // ------------------------------------------------------------ Druckprodukte
  {
    slug: "fahne-revolution",
    category: "druck",
    kind: "flag",
    featured: true,
    name: { de: "Fahne der Revolution", ar: "علم الثورة السورية" },
    tagline: { de: "Für Balkon, Auto und Kundgebung", ar: "للشرفة والسيارة والاحتفالات" },
    description: {
      de: "Die Fahne des freien Syrien – kräftige Farben, beidseitig gut sichtbar. Als Handfahne mit Stab, als Standardfahne mit Ösen oder als große Fahne für Feiern und Vereine.",
      ar: "علم سوريا الحرة بألوان قوية وواضحة من الجهتين. متوفر كعلم يدوي مع عصا، أو علم قياسي بحلقات، أو علم كبير للاحتفالات والجمعيات.",
    },
    colors: [],
    image: img("fahne"),
    variants: [
      { id: "30x45", label: { de: "Handfahne 30 × 45 cm mit Stab", ar: "علم يدوي 30 × 45 سم مع عصا" }, priceCents: 690 },
      { id: "90x150", label: { de: "Fahne 90 × 150 cm mit 2 Ösen", ar: "علم 90 × 150 سم بحلقتين" }, priceCents: 1490 },
      { id: "150x250", label: { de: "Großfahne 150 × 250 cm mit 3 Ösen", ar: "علم كبير 150 × 250 سم بثلاث حلقات" }, priceCents: 3490 },
    ],
    details: [
      { de: "Polyester-Flaggenstoff ca. 110 g/m², farbecht und wetterfest", ar: "قماش أعلام بوليستر حوالي 110 غ/م²، ثابت اللون ومقاوم للطقس" },
      { de: "Kanten doppelt vernäht, Metallösen bzw. Holzstab", ar: "حواف مخيطة مرتين، حلقات معدنية أو عصا خشبية" },
    ],
    tiers: [
      { min: 10, pct: 10 },
      { min: 25, pct: 20 },
    ],
  },
  {
    slug: "banner-syrien-frei",
    category: "druck",
    kind: "banner",
    featured: true,
    name: { de: "Banner „Syrien ist frei“", ar: "لافتة «سوريا حرة»" },
    tagline: { de: "Für Fassade, Saal und Umzug", ar: "للواجهات والقاعات والمسيرات" },
    description: {
      de: "Wetterfestes PVC-Banner mit Fahne und „سوريا حرة – الذكرى الثانية للتحرير“. Rundum Ösen zum schnellen Aufhängen. Eigenen Text für Ihren Verein? Schreiben Sie uns.",
      ar: "لافتة PVC مقاومة للطقس مع العلم وعبارة «سوريا حرة – الذكرى الثانية للتحرير»، بحلقات حول الأطراف لتعليق سريع. تريدون نصاً خاصاً بجمعيتكم؟ راسلونا.",
    },
    colors: [],
    image: img("banner"),
    variants: [
      { id: "200x50", label: { de: "200 × 50 cm", ar: "200 × 50 سم" }, priceCents: 3490 },
      { id: "300x75", label: { de: "300 × 75 cm", ar: "300 × 75 سم" }, priceCents: 5490 },
      { id: "400x100", label: { de: "400 × 100 cm", ar: "400 × 100 سم" }, priceCents: 7990 },
    ],
    details: [
      { de: "PVC-Plane 510 g/m², UV-beständiger Digitaldruck", ar: "قماش PVC بوزن 510 غ/م²، طباعة رقمية مقاومة للشمس" },
      { de: "Saum verschweißt, Ösen ca. alle 50 cm", ar: "حواف ملحومة، حلقات كل 50 سم تقريباً" },
    ],
    tiers: [{ min: 3, pct: 10 }],
  },
  {
    slug: "folie-syria-hurra",
    category: "druck",
    kind: "foil",
    name: { de: "Folie „سوريا حرة“ für Auto & Fenster", ar: "ملصق فينيل «سوريا حرة» للسيارة والشبابيك" },
    tagline: { de: "Geplottete Schrift – ohne Hintergrund", ar: "حروف مقصوصة بدون خلفية" },
    description: {
      de: "Weiße Plotterfolie mit „سوريا حرة“, drei Sternen und Datum. Ideal für Heckscheibe, Schaufenster oder Glastür – mit Übertragungsfolie zum einfachen Aufkleben.",
      ar: "فينيل أبيض مقصوص بعبارة «سوريا حرة» والنجوم الثلاث والتاريخ. مثالي للزجاج الخلفي للسيارة أو واجهة المحل أو الباب الزجاجي – مع شريط نقل لتركيب سهل.",
    },
    colors: [],
    image: img("folie"),
    variants: [
      { id: "40x13", label: { de: "40 × 13 cm (Heckscheibe)", ar: "40 × 13 سم (زجاج خلفي)" }, priceCents: 990 },
      { id: "60x20", label: { de: "60 × 20 cm", ar: "60 × 20 سم" }, priceCents: 1490 },
      { id: "90x30", label: { de: "90 × 30 cm (Schaufenster)", ar: "90 × 30 سم (واجهة محل)" }, priceCents: 2290 },
    ],
    details: [
      { de: "Hochwertige Plotterfolie, außen ca. 5 Jahre haltbar", ar: "فينيل عالي الجودة، يدوم حوالي 5 سنوات في الخارج" },
      { de: "Inkl. Übertragungsfolie und Anleitung", ar: "مع شريط النقل وتعليمات التركيب" },
    ],
    tiers: [
      { min: 5, pct: 10 },
      { min: 10, pct: 20 },
    ],
  },
  {
    slug: "nisr-autoaufkleber",
    category: "druck",
    kind: "foil",
    featured: true,
    name: { de: "Autoaufkleber „Syrischer Adler“", ar: "ملصق النسر السوري للسيارة" },
    tagline: { de: "Das neue Staatswappen als Plotterfolie", ar: "شعار الدولة الجديد بفينيل مقصوص" },
    description: {
      de: "Der goldene Adler mit den drei Sternen – als geplottete Folie ohne Hintergrund. Für Heckscheibe, Motorhaube oder Schaufenster, inklusive Übertragungsfolie.",
      ar: "النسر الذهبي مع النجوم الثلاث – فينيل مقصوص بدون خلفية. للزجاج الخلفي أو غطاء المحرك أو واجهة المحل، مع شريط النقل للتركيب السهل.",
    },
    colors: (["gold", "weiss"] as const).map((c) => ({ color: C[c], image: img(`folie-nisr-${c}`) })),
    variants: [
      { id: "20cm", label: { de: "20 × 15 cm", ar: "20 × 15 سم" }, priceCents: 990 },
      { id: "30cm", label: { de: "30 × 23 cm (Heckscheibe)", ar: "30 × 23 سم (زجاج خلفي)" }, priceCents: 1490 },
      { id: "50cm", label: { de: "50 × 38 cm (Motorhaube)", ar: "50 × 38 سم (غطاء المحرك)" }, priceCents: 2490 },
    ],
    details: [
      { de: "Hochwertige Plotterfolie, außen ca. 5 Jahre haltbar, waschanlagenfest", ar: "فينيل عالي الجودة، يدوم حوالي 5 سنوات، مقاوم لغسيل السيارات" },
      { de: "Inkl. Übertragungsfolie und Anleitung", ar: "مع شريط النقل وتعليمات التركيب" },
    ],
    tiers: [{ min: 5, pct: 10 }],
  },
  {
    slug: "sticker-set",
    category: "druck",
    kind: "sticker",
    featured: true,
    name: { de: "Sticker-Set 8.12.", ar: "مجموعة ستيكرات 8.12" },
    tagline: { de: "Vier Motive, wasserfest", ar: "أربعة تصاميم، مقاومة للماء" },
    description: {
      de: "Fahne, Siegel „Freies Syrien“, „8.12.“ und „Hurriya“ als konturgeschnittene Sticker – für Laptop, Handy, Flasche oder zum Verteilen auf der Feier.",
      ar: "العلم وختم «سوريا حرة» و«8.12» و«حرية» كستيكرات مقصوصة على الشكل – للابتوب والموبايل والمطرة أو للتوزيع في الاحتفال.",
    },
    colors: [],
    image: img("sticker"),
    variants: [
      { id: "set4", label: { de: "4 Sticker (je ca. 8 cm)", ar: "4 ستيكرات (حوالي 8 سم)" }, priceCents: 490 },
      { id: "set20", label: { de: "20 Sticker (5 × jedes Motiv)", ar: "20 ستيكر (5 من كل تصميم)" }, priceCents: 1690 },
      { id: "set100", label: { de: "100 Sticker zum Verteilen", ar: "100 ستيكر للتوزيع" }, priceCents: 5990 },
    ],
    details: [
      { de: "Vinyl, matt laminiert, wasser- und kratzfest", ar: "فينيل مع طبقة حماية مطفية، مقاوم للماء والخدش" },
      { de: "Konturgeschnitten mit weißem Rand", ar: "مقصوص على الشكل بحافة بيضاء" },
    ],
  },
];

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);
export const fromPrice = (p: Product) => Math.min(...p.variants.map((v) => v.priceCents));
export const imageOf = (p: Product, colorId?: string) => p.colors.find((c) => c.color.id === colorId)?.image ?? p.colors[0]?.image ?? p.image ?? "";

/** Prüft eine Warenkorbzeile gegen den Katalog und liefert den echten Listenpreis */
export function resolveLine(line: { slug: string; color: string; size: string; qty: number }) {
  const product = productBySlug(line.slug);
  if (!product) return null;
  const color = product.colors.length ? product.colors.find((c) => c.color.id === line.color)?.color : null;
  if (product.colors.length && !color) return null;
  const variant = product.variants.find((v) => v.id === line.size);
  if (!variant) return null;
  const qty = Math.floor(Number(line.qty));
  if (!Number.isFinite(qty) || qty < 1 || qty > 500) return null;
  return { product, color: color ?? null, variant, qty, unitCents: variant.priceCents };
}
export type ResolvedLine = NonNullable<ReturnType<typeof resolveLine>>;
