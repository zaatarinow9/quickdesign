import type { ServiceArtVariant } from "@/content/services";

/**
 * Portfolio entries.
 *
 * IMPORTANT: All entries below are PLACEHOLDERS. They describe the kind of
 * project that belongs in each slot, but they are not real references.
 * Replace them with real projects: set `placeholder: false`, fill in title,
 * client (only with permission), year and description, and add a photo in
 * `/public/projekte/...` via `image`.
 */
export type Project = {
  slug: string;
  title: string;
  category: string;
  serviceSlug: string;
  summary: string;
  art: ServiceArtVariant;
  image?: { src: string; alt: string };
  client?: string;
  year?: string;
  placeholder: boolean;
};

export const projects: Project[] = [
  {
    slug: "platzhalter-fahrzeugflotte",
    title: "Fahrzeugflotte",
    category: "Fahrzeugbeschriftung",
    serviceSlug: "fahrzeugbeschriftung",
    summary: "Platz für ein Referenzprojekt: einheitliche Beschriftung mehrerer Firmenfahrzeuge.",
    art: "vehicle",
    placeholder: true,
  },
  {
    slug: "platzhalter-leuchtbuchstaben",
    title: "Leuchtbuchstaben an der Fassade",
    category: "3D-Buchstaben",
    serviceSlug: "3d-buchstaben",
    summary: "Platz für ein Referenzprojekt: beleuchteter Schriftzug für ein Ladenlokal.",
    art: "letters",
    placeholder: true,
  },
  {
    slug: "platzhalter-corporate-design",
    title: "Neues Erscheinungsbild",
    category: "Corporate Design",
    serviceSlug: "grafikdesign",
    summary: "Platz für ein Referenzprojekt: Logo, Farben und Geschäftsausstattung.",
    art: "design",
    placeholder: true,
  },
  {
    slug: "platzhalter-praxisschild",
    title: "Praxis- und Firmenschild",
    category: "Schilder",
    serviceSlug: "werbetechnik-schilder",
    summary: "Platz für ein Referenzprojekt: Alu-Dibond-Schild mit Abstandshaltern.",
    art: "signage",
    placeholder: true,
  },
  {
    slug: "platzhalter-bauzaunbanner",
    title: "Bauzaunbanner",
    category: "Großformatdruck",
    serviceSlug: "grossformatdruck",
    summary: "Platz für ein Referenzprojekt: wetterfestes Banner mit Ösen.",
    art: "largeformat",
    placeholder: true,
  },
  {
    slug: "platzhalter-teamshirts",
    title: "Teamkleidung",
    category: "Textildruck",
    serviceSlug: "textildruck",
    summary: "Platz für ein Referenzprojekt: bedruckte Shirts für ein Team oder einen Verein.",
    art: "textile",
    placeholder: true,
  },
  {
    slug: "platzhalter-geschaeftsausstattung",
    title: "Geschäftsausstattung",
    category: "Druck",
    serviceSlug: "druck",
    summary: "Platz für ein Referenzprojekt: Visitenkarten mit Veredelung.",
    art: "print",
    placeholder: true,
  },
  {
    slug: "platzhalter-produktaufkleber",
    title: "Produktaufkleber",
    category: "Aufkleber",
    serviceSlug: "werbemittel-aufkleber",
    summary: "Platz für ein Referenzprojekt: konturgeschnittene Etiketten.",
    art: "promo",
    placeholder: true,
  },
];
