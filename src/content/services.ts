export type ServiceArtVariant =
  | "design"
  | "print"
  | "signage"
  | "vehicle"
  | "letters"
  | "largeformat"
  | "textile"
  | "promo";

export type Service = {
  slug: string;
  title: string;
  /** Short label used in navigation, marquees and chips. */
  short: string;
  claim: string;
  intro: string;
  capabilities: string[];
  useCases: string[];
  art: ServiceArtVariant;
  /** Standard products in this field can also be ordered online via QuickPrintly. */
  availableOnline?: boolean;
};

export const services: Service[] = [
  {
    slug: "grafikdesign",
    title: "Grafikdesign & Corporate Design",
    short: "Grafikdesign",
    claim: "Ein Auftritt, der wiedererkannt wird.",
    intro:
      "Wir entwickeln Logos, Erscheinungsbilder und Werbemittel, die zu Ihrem Unternehmen passen – und die sich später sauber drucken, plotten und montieren lassen. Gestaltung und Produktion denken wir von Anfang an zusammen.",
    capabilities: [
      "Logoentwicklung und Überarbeitung",
      "Corporate Design und Gestaltungsrichtlinien",
      "Geschäftsausstattung",
      "Flyer, Broschüren und Plakate",
      "Social-Media- und Anzeigenmotive",
      "Druckfertige Datenaufbereitung",
    ],
    useCases: ["Neugründung", "Rebranding", "Kampagnen", "Messeauftritte"],
    art: "design",
  },
  {
    slug: "druck",
    title: "Digital- & Offsetdruck",
    short: "Druck",
    claim: "Papier, das Eindruck hinterlässt.",
    intro:
      "Von der Visitenkarte bis zur Broschüre: Wir beraten zu Papier, Format und Veredelung und sorgen dafür, dass Farben, Schnitt und Haptik stimmen.",
    capabilities: [
      "Visitenkarten und Geschäftsdrucksachen",
      "Flyer, Falzflyer und Broschüren",
      "Plakate und Poster",
      "Veredelungen wie Matt- oder Glanzcellophanierung",
      "Sonderformen und abgerundete Ecken",
      "Datenprüfung vor dem Druck",
    ],
    useCases: ["Geschäftsausstattung", "Mailings", "Produktkataloge", "Events"],
    art: "print",
    availableOnline: true,
  },
  {
    slug: "werbetechnik-schilder",
    title: "Werbetechnik & Schilder",
    short: "Schilder",
    claim: "Sichtbar – drinnen wie draußen.",
    intro:
      "Firmenschilder, Praxisschilder, Leitsysteme und Fassadenwerbung: Wir planen Material, Größe und Befestigung passend zum Einsatzort und realisieren langlebige Lösungen.",
    capabilities: [
      "Alu-Dibond-Schilder",
      "Acrylglas- und Hinweisschilder",
      "Fassaden- und Ladenbeschriftung",
      "Folienbeschriftung und Glasdekor",
      "Leit- und Orientierungssysteme",
      "Planung von Befestigung und Montage",
    ],
    useCases: ["Ladenlokale", "Praxen und Kanzleien", "Büros", "Baustellen"],
    art: "signage",
  },
  {
    slug: "fahrzeugbeschriftung",
    title: "Fahrzeugbeschriftung",
    short: "Fahrzeugbeschriftung",
    claim: "Werbung, die mitfährt.",
    intro:
      "Ein beschriftetes Fahrzeug wirbt jeden Tag. Wir gestalten Beschriftungen, die auf Distanz lesbar bleiben und die Form des Fahrzeugs nutzen – vom einzelnen Logo bis zur Flotte.",
    capabilities: [
      "Gestaltung passend zum Fahrzeugmodell",
      "Teil- und Schriftzugbeschriftungen",
      "Folierungen mit Digitaldruck",
      "Heck- und Seitenscheibenbeschriftung",
      "Einheitliche Flottengestaltung",
      "Magnetschilder",
    ],
    useCases: ["Handwerk", "Lieferdienste", "Service-Flotten", "Food-Trucks"],
    art: "vehicle",
  },
  {
    slug: "3d-buchstaben",
    title: "3D-Buchstaben & Leuchtwerbung",
    short: "3D-Buchstaben",
    claim: "Ihr Name mit Tiefe.",
    intro:
      "Plastische Buchstaben und Logos geben Ihrer Marke Präsenz am Gebäude, im Empfang oder im Showroom – auf Wunsch beleuchtet, damit Sie auch nach Feierabend gesehen werden.",
    capabilities: [
      "3D-Buchstaben aus Acryl, Aluminium oder Hartschaum",
      "Unterschiedliche Höhen und Materialstärken",
      "LED-Beleuchtung, z. B. frontal oder als Halo-Effekt",
      "Logos als Formfräsung",
      "Innen- und Außeneinsatz",
      "Befestigung mit Abstandshaltern",
    ],
    useCases: ["Empfangsbereiche", "Fassaden", "Showrooms", "Gastronomie"],
    art: "letters",
  },
  {
    slug: "grossformatdruck",
    title: "Großformatdruck",
    short: "Großformat",
    claim: "Groß gedacht. Präzise gedruckt.",
    intro:
      "Banner, Planen, Bauzaunbanner und Fensterfolien für maximale Aufmerksamkeit. Wir wählen Material und Konfektion so, dass Ihr Motiv auch bei Wind und Wetter gut aussieht.",
    capabilities: [
      "PVC- und Mesh-Banner",
      "Bauzaun- und Gerüstbanner",
      "Ösen, Saum und verstärkte Ränder",
      "Lochfolie für Fenster und Schaufenster",
      "Roll-ups und Messegrafik",
      "Schutzlaminate für den Außeneinsatz",
    ],
    useCases: ["Eröffnungen", "Baustellen", "Sportvereine", "Messen"],
    art: "largeformat",
    availableOnline: true,
  },
  {
    slug: "textildruck",
    title: "Textildruck",
    short: "Textildruck",
    claim: "Teamgeist zum Anziehen.",
    intro:
      "Bedruckte Shirts, Hoodies und Arbeitskleidung machen Ihr Team als Einheit sichtbar. Wir beraten zu Textilien, Farben und Druckpositionen.",
    capabilities: [
      "T-Shirts, Hoodies und Poloshirts",
      "Arbeits- und Teamkleidung",
      "Druck auf Vorder- und Rückseite",
      "Platzierung von Logos und Namen",
      "Beratung zu Textilfarbe und Größen",
    ],
    useCases: ["Teams", "Vereine", "Events", "Merchandise"],
    art: "textile",
    availableOnline: true,
  },
  {
    slug: "werbemittel-aufkleber",
    title: "Aufkleber & Werbemittel",
    short: "Werbemittel",
    claim: "Kleine Dinge. Große Wirkung.",
    intro:
      "Aufkleber, Etiketten und Werbeartikel bringen Ihre Marke in die Hände Ihrer Kunden. Wir fertigen in Form, Material und Menge passend zum Anlass.",
    capabilities: [
      "Aufkleber in individueller Konturform",
      "Etiketten und Produktaufkleber",
      "Laminierte Aufkleber für den Außeneinsatz",
      "Werbeartikel mit Logo",
      "Verpackungs- und Siegelaufkleber",
    ],
    useCases: ["Produktverpackungen", "Giveaways", "Events", "Onlinehandel"],
    art: "promo",
    availableOnline: true,
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}
