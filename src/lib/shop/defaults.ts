/**
 * Startdaten des Shops – werden verwendet, solange in der Verwaltung noch nichts gespeichert wurde.
 * Danach gilt ausschließlich der Stand aus public.shop_store.
 */
import { products as seed } from "./catalog";
import type { Product, ShopStore } from "./schema";

const detailName = (img: string) => img.replace(/\.webp$/, "-detail.webp");

const variantImages: Record<string, Record<string, string>> = {
  "fahne-revolution": { "30x45": "/shop/fahne-hand.webp", "90x150": "/shop/fahne.webp", "150x250": "/shop/fahne-gross.webp" },
};

const seedProducts: Product[] = seed.map((p) => ({
  id: p.slug,
  active: true,
  featured: !!p.featured,
  category: p.category,
  kind: p.kind,
  name: p.name,
  tagline: p.tagline,
  description: p.description,
  details: p.details,
  colors: p.colors.map(({ color, image }) => ({ id: color.id, name: color.name, hex: color.hex, image, detail: detailName(image), blankFront: "", blankBack: "" })),
  image: p.image ?? "",
  detail: p.image && p.category === "druck" && p.kind !== "sticker" && p.kind !== "flag" ? detailName(p.image) : "",
  gallery: [],
  variants: p.variants.map((v) => ({ id: v.id, label: v.label, priceCents: v.priceCents, image: variantImages[p.slug]?.[v.id] ?? "", active: true })),
  sizeChart: p.sizeChart ?? [],
  maxQty: p.category === "textil" ? 50 : 500,
  custom: { enabled: false, extraSideCents: 0 },
}));

/** Gestalter-Produkte: Farbe, Seite (vorne/hinten/beide) und Motiv frei wählbar */
const blankColors = (kind: "tshirt" | "hoodie") =>
  ([
    ["schwarz", "#1d1d1f", { de: "Schwarz", ar: "أسود" }],
    ["weiss", "#f4f2ed", { de: "Weiß", ar: "أبيض" }],
    ["gruen", "#4b5133", { de: "Olivgrün", ar: "أخضر زيتي" }],
  ] as const).map(([id, hex, name]) => ({
    id,
    name: { ...name },
    hex,
    image: `/shop/blank-${kind}-${id}-front.webp`,
    detail: "",
    blankFront: `/shop/blank-${kind}-${id}-front.webp`,
    blankBack: `/shop/blank-${kind}-${id}-back.webp`,
  }));
const base = (id: string) => seedProducts.find((p) => p.id === id)!;
const designers: Product[] = [
  {
    ...base("tshirt-hurriya"),
    id: "tshirt-gestalten",
    featured: true,
    name: { de: "T-Shirt selbst gestalten", ar: "صمّم تيشرتك" },
    tagline: { de: "Farbe, Motiv, vorne oder hinten – du entscheidest", ar: "اختر اللون والتصميم ومكان الطباعة" },
    description: {
      de: "Wähle die Farbe, dann dein Motiv aus unserer Kollektion – vorne, hinten oder auf beiden Seiten. Die Vorschau zeigt dir sofort, wie dein Shirt aussieht.",
      ar: "اختر لون التيشرت، ثم التصميم من مجموعتنا – على الأمام أو الخلف أو الجهتين معاً. المعاينة تريك شكل قطعتك فوراً.",
    },
    colors: blankColors("tshirt"),
    gallery: [],
    custom: { enabled: true, extraSideCents: 790 },
  },
  {
    ...base("hoodie-wahid"),
    id: "hoodie-gestalten",
    featured: true,
    name: { de: "Hoodie selbst gestalten", ar: "صمّم هوديك" },
    tagline: { de: "Schwarz, Weiß oder Olivgrün – mit deinem Motiv", ar: "أسود أو أبيض أو أخضر زيتي – بتصميمك" },
    description: {
      de: "Dein Hoodie zum Jahrestag: Farbe wählen, Motiv vorne und/oder groß auf dem Rücken – live in der Vorschau.",
      ar: "هوديك للذكرى: اختر اللون والتصميم على الصدر أو كبيراً على الظهر – وشاهده مباشرة في المعاينة.",
    },
    colors: blankColors("hoodie"),
    gallery: [],
    custom: { enabled: true, extraSideCents: 790 },
  },
];
const products: Product[] = [...designers, ...seedProducts];

const motif = (id: string, de: string, ar: string) => ({ id, name: { de, ar }, light: `/shop/motifs/${id}-light.webp`, dark: `/shop/motifs/${id}-dark.webp`, active: true });
const motifs = [
  motif("flagge", "Fahne 8.12.", "علم 8.12"),
  motif("hurriya", "Hurriya", "حرية"),
  motif("nisr-gold", "Adler (Gold)", "النسر الذهبي"),
  motif("siegel", "Siegel Freies Syrien", "ختم سوريا حرة"),
  motif("acht", "8.12", "8.12"),
  motif("wahid", "Wahid, wahid, wahid", "واحد واحد واحد"),
  motif("jasmin", "Jasmin von Damaskus", "ياسمين الشام"),
  motif("nisr-weiss", "Adler (einfarbig)", "النسر بلون واحد"),
  motif("sticker-siegel", "Sticker Siegel (farbig)", "ستيكر الختم الملوّن"),
  motif("sticker-fahne", "Sticker Fahne", "ستيكر العلم"),
  motif("sticker-acht", "Sticker 8.12", "ستيكر 8.12"),
  motif("sticker-hurriya", "Sticker Hurriya", "ستيكر حرية"),
];

export const defaultStore: ShopStore = {
  version: 1,
  products,
  motifs,
  offers: [
    {
      id: "zwei-plus-eins",
      active: true,
      name: { de: "2 + 1: das dritte Textil 50 % günstiger", ar: "⁦2 + 1⁩: القطعة الثالثة أرخص بـ ⁦50%⁩" },
      badge: { de: "2 + 1", ar: "⁦2 + 1⁩" },
      scope: { type: "category", category: "textil", products: [] },
      starts: "",
      ends: "",
      kind: "bundle",
      bundle: { qty: 3, mode: "cheapest", value: 50 },
    },
    {
      id: "fahnen-menge",
      active: true,
      name: { de: "Mengenrabatt Fahnen", ar: "خصم كميات الأعلام" },
      badge: { de: "ab 10 Stück −10 %", ar: "من 10 قطع ⁦−10%⁩" },
      scope: { type: "products", products: ["fahne-revolution"] },
      starts: "",
      ends: "",
      kind: "tiers",
      tiers: [
        { min: 10, pct: 10 },
        { min: 25, pct: 20 },
      ],
    },
    {
      id: "banner-folie-menge",
      active: true,
      name: { de: "Mengenrabatt Banner & Folien", ar: "خصم كميات اللافتات والملصقات" },
      badge: { de: "Mengenrabatt", ar: "خصم كميات" },
      scope: { type: "products", products: ["banner-syrien-frei", "folie-syria-hurra"] },
      starts: "",
      ends: "",
      kind: "tiers",
      tiers: [
        { min: 3, pct: 10 },
        { min: 10, pct: 20 },
      ],
    },
  ],
  settings: {
    shipping: {
      standardCents: 490,
      freeFromCents: 6000,
      deliveryDays: "3–5",
      express: { enabled: true, cents: 1290, days: "1–2" },
      pickup: { enabled: true, address: "QuickDesign, Richard-Wagner-Straße 73–75, 66111 Saarbrücken" },
    },
    // TODO(Inhaber): Vorbestellrabatt und Enddatum in der Shop-Verwaltung bestätigen.
    preorder: { enabled: true, pct: 20, until: "2026-11-30", combine: false },
    // TODO(Inhaber): Letzter Bestelltag für Lieferung vor dem 8.12.
    campaign: { anniversary: "2026-12-08", lastOrderDay: "2026-12-02" },
    whatsapp: "4915772785677",
    hero: {
      eyebrow: { de: "Tag der Befreiung · 8. Dezember", ar: "عيد التحرير · الثامن من كانون الأول" },
      title: { de: "Syrien ist frei.", ar: "سوريا حرّة." },
      text: {
        de: "Die Kollektion zum zweiten Jahrestag: T-Shirts, Hoodies, Fahnen, Banner und Sticker – gedruckt mit Sorgfalt in Saarbrücken, geliefert in ganz Deutschland.",
        ar: "مجموعة الذكرى الثانية: تيشرتات وهوديات وأعلام ولافتات وستيكرات – تُطبع بعناية في زاربروكن وتصل إلى كل ألمانيا.",
      },
      image: "",
    },
    story: {
      eyebrow: { de: "8. Dezember 2024", ar: "8 كانون الأول 2024" },
      title: { de: "Ein Tag, den wir nie vergessen.", ar: "يومٌ لن ننساه." },
      quote: { de: "Wahid, wahid, wahid – asch-scha‘b as-suri wahid.", ar: "واحد، واحد، واحد… الشعب السوري واحد." },
      paragraphs: [
        {
          de: "In den frühen Morgenstunden des 8. Dezember 2024 wachte Syrien in Freiheit auf. Nach dreizehn Jahren Revolution und mehr als fünf Jahrzehnten Angst füllten sich die Plätze von Damaskus, Aleppo, Homs und Idlib mit Menschen.",
          ar: "في الساعات الأولى من صباح الثامن من كانون الأول 2024 استيقظت سوريا حرّة. بعد ثلاثة عشر عاماً من الثورة وأكثر من خمسة عقود من الخوف، امتلأت ساحات دمشق وحلب وحمص وإدلب بالناس.",
        },
        {
          de: "Auf dem Umayyaden-Platz wehte die grüne Fahne mit den drei roten Sternen. Familien, die sich jahrelang nicht gesehen hatten, lagen sich in den Armen – und überall auf der Welt, auch hier in Deutschland, feierten Syrerinnen und Syrer gemeinsam.",
          ar: "في ساحة الأمويين رفرف العلم الأخضر بنجومه الحمراء الثلاث. عائلات لم تلتقِ منذ سنين تعانقت، وفي كل مكان من العالم – وهنا في ألمانيا أيضاً – احتفل السوريون معاً.",
        },
        {
          de: "Mit dieser Kollektion tragen wir diesen Tag weiter: für die, die ihn erlebt haben, und für die, die ihn nie erleben durften.",
          ar: "بهذه المجموعة نحمل هذا اليوم معنا: لمن عاشه، ولمن لم يُكتب له أن يعيشه.",
        },
      ],
      images: [
        {
          url: "/shop/photos/umayyaden-moschee-2024.webp",
          caption: { de: "Umayyaden-Moschee, Damaskus – 14. Dezember 2024", ar: "الجامع الأموي، دمشق – 14 كانون الأول 2024" },
          credit: "Wikimedia Commons (gemeinfrei)",
        },
        {
          url: "/shop/photos/damaskus-2024-12-11.webp",
          caption: { de: "Damaskus – 11. Dezember 2024", ar: "دمشق – 11 كانون الأول 2024" },
          credit: "Voice of America / Wikimedia Commons (gemeinfrei)",
        },
        {
          url: "/shop/photos/feier-fahnen-freedom.webp",
          caption: { de: "Feier der Freiheit – 8. Dezember 2024", ar: "احتفال الحرية – 8 كانون الأول 2024" },
          credit: "Foto: FeaturingDallas, CC BY 4.0, via Wikimedia Commons",
        },
      ],
      image: "/shop/photos/feier-fahnen-freedom.webp",
    },
    slides: [
      {
        image: "/shop/photos/saahat-al-umawiyin.webp",
        title: { de: "Syrien ist frei.", ar: "سوريا حرّة." },
        text: { de: "Die Kollektion zum zweiten Jahrestag der Befreiung", ar: "مجموعة الذكرى الثانية للتحرير" },
        link: "",
        credit: "",
      },
      {
        image: "/shop/photos/umayyaden-moschee-2024.webp",
        title: { de: "Zwei Jahre Freiheit", ar: "عامان من الحرية" },
        text: { de: "Umayyaden-Moschee, Damaskus – Dezember 2024", ar: "الجامع الأموي، دمشق – كانون الأول 2024" },
        link: "",
        credit: "Foto: Wikimedia Commons (gemeinfrei)",
      },
      {
        image: "/shop/photos/damaskus-2024-12-11.webp",
        title: { de: "Ein Tag, den wir nie vergessen", ar: "يومٌ لن ننساه" },
        text: { de: "Damaskus, Dezember 2024", ar: "دمشق، كانون الأول 2024" },
        link: "/hikaya",
        credit: "Foto: Voice of America / Wikimedia Commons (gemeinfrei)",
      },
      {
        image: "/shop/photos/feier-fahnen-freedom.webp",
        title: { de: "Hisst die Fahne der Freiheit", ar: "ارفع علم الحرية" },
        text: { de: "Fahnen, Kleidung und Aufkleber zum Jahrestag", ar: "أعلام وملابس وملصقات للذكرى" },
        link: "/qism/flags",
        credit: "Foto: FeaturingDallas, CC BY 4.0, via Wikimedia Commons",
      },
    ],
    sections: [
      { slug: "tshirts", title: { de: "T-Shirts", ar: "تيشرتات" }, text: { de: "Sechs Motive zum Jahrestag", ar: "تصاميم الذكرى الثانية" }, image: "/shop/banner-tshirts.webp" },
      { slug: "hoodies", title: { de: "Hoodies", ar: "هوديات" }, text: { de: "Schwer, weich, warm", ar: "ثقيلة وناعمة ودافئة" }, image: "/shop/banner-hoodies.webp" },
      { slug: "flags", title: { de: "Fahnen & Banner", ar: "أعلام ولافتات" }, text: { de: "Für Balkon, Auto und Feier", ar: "للشرفة والسيارة والاحتفال" }, image: "/shop/banner-fahnen.webp" },
      { slug: "stickers", title: { de: "Sticker & Autoaufkleber", ar: "ستيكرات وملصقات" }, text: { de: "Mit dem syrischen Adler", ar: "مع النسر السوري" }, image: "/shop/banner-sticker.webp" },
    ],
  },
};
