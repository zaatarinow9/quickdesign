import type { Lang } from "./config";

/** Preise immer mit lateinischen Ziffern und deutschem Format – auch auf Arabisch (kein Umdrehen im RTL) */
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
/** In Unicode-Isolate gepackt (LRI … PDI), damit Betrag und €-Zeichen im arabischen Fließtext nicht vertauscht werden */
export const money = (cents: number) => `\u2066${eur.format(cents / 100)}\u2069`;

/** Datum: Arabisch mit lateinischen Ziffern (ar-u-nu-latn), Deutsch normal */
export function dateLong(iso: string, lang: Lang) {
  if (!iso || Number.isNaN(Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso))) return "";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  const out = new Intl.DateTimeFormat(lang === "ar" ? "ar-SY-u-nu-latn" : "de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(d);
  return `\u2068${out}\u2069`;
}

export const num = (n: number) => new Intl.NumberFormat("de-DE").format(n);
