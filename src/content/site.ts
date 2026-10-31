/**
 * Central company data. Everything here is either verified from the previous
 * codebase (email, phone, opening hours, domain, logo tagline) or explicitly
 * marked as a placeholder that still needs to be filled in.
 */
export const site = {
  name: "QuickDesign",
  tagline: "Alles rund um Werbung",
  url: "https://quickdesign24.de",
  description:
    "QuickDesign ist Ihr Partner für Grafikdesign, Druck, Werbetechnik, Schilder, Fahrzeugbeschriftung und 3D-Buchstaben – Gestaltung und Produktion aus einer Hand.",
  contact: {
    email: "info@quickdesign24.de",
    phone: "+49 1577 2785677",
    phoneHref: "tel:+4915772785677",
    hours: "Mo–Fr, 09:00–18:00 Uhr",
  },
  /**
   * WhatsApp: set `enabled: true` once it is confirmed that the number above
   * is reachable via WhatsApp Business.
   */
  whatsapp: {
    enabled: false,
    href: "https://wa.me/4915772785677",
  },
  /** Add profile URLs to show them in footer and contact page. Empty entries are hidden. */
  social: {
    instagram: "",
    facebook: "",
    linkedin: "",
    tiktok: "",
  },
  /** Legal details for the Impressum (provided by the owner). */
  legal: {
    companyName: "Quick Design",
    owner: "Ahmad Abu Samir",
    street: "Richard-Wagner-Straße",
    postalCode: "66111",
    city: "Saarbrücken",
    country: "Deutschland",
    /** Optional – leave empty if not applicable. */
    vatId: "",
    register: "",
  },
} as const;

export const printly = {
  name: "QuickPrintly",
  url: "https://quickprintly.de/",
  displayUrl: "quickprintly.de",
  cta: "Druckprodukte online bestellen",
} as const;

export const navigation = [
  { href: "/", label: "Startseite" },
  { href: "/leistungen", label: "Leistungen" },
  { href: "/projekte", label: "Projekte" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
] as const;
