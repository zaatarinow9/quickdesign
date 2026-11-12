/** Angebote & Rechnungen: Typen, Bezeichnungen, Berechnung (client- und serverseitig nutzbar). */

export type DocumentKind = "angebot" | "rechnung";
export type VatRate = 0 | 7 | 19;
export const vatRates: VatRate[] = [19, 7, 0];

export type DocItem = {
  /** Verweis auf den Leistungskatalog (optional) */
  service_id?: string | null;
  description: string;
  details?: string;
  quantity: number;
  unit: string;
  /** Einzelpreis netto */
  unit_price: number;
  vat_rate: VatRate;
  /** Wie der Preis eingegeben wurde (nur Anzeige im Editor) */
  price_mode?: "netto" | "brutto";
};

export const units = ["Stk.", "Pauschal", "Std.", "m²", "lfm", "Satz", "Tag", "Auflage", "Seite", "km"] as const;

export const offerStatuses = ["entwurf", "versendet", "angenommen", "abgelehnt"] as const;
export const invoiceStatuses = ["entwurf", "offen", "teilbezahlt", "bezahlt", "storniert"] as const;
export type OfferStatus = (typeof offerStatuses)[number];
export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type DocStatus = OfferStatus | InvoiceStatus;

export const statusLabels: Record<DocStatus | "abgelaufen" | "ueberfaellig", string> = {
  entwurf: "Entwurf",
  versendet: "Versendet",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  offen: "Offen",
  teilbezahlt: "Teilbezahlt",
  bezahlt: "Bezahlt",
  storniert: "Storniert",
  abgelaufen: "Abgelaufen",
  ueberfaellig: "Überfällig",
};

export const kindLabels: Record<DocumentKind, { one: string; many: string; path: string; numberLabel: string }> = {
  angebot: { one: "Angebot", many: "Angebote", path: "angebote", numberLabel: "Angebots-Nr." },
  rechnung: { one: "Rechnung", many: "Rechnungen", path: "rechnungen", numberLabel: "Rechnungs-Nr." },
};

export const isStatusFor = (kind: DocumentKind, value: unknown): value is DocStatus =>
  (kind === "angebot" ? (offerStatuses as readonly string[]) : (invoiceStatuses as readonly string[])).includes(value as string);

/** Anzeige-Status inkl. abgeleiteter Zustände (abgelaufen / überfällig) */
export function displayStatus(doc: { kind: DocumentKind; status: string; valid_until: string | null; due_date: string | null }, today: string) {
  if (doc.kind === "angebot" && doc.status === "versendet" && doc.valid_until && doc.valid_until < today) return "abgelaufen" as const;
  if (doc.kind === "rechnung" && (doc.status === "offen" || doc.status === "teilbezahlt") && doc.due_date && doc.due_date < today) return "ueberfaellig" as const;
  return doc.status as DocStatus;
}

/* ------------------------------ Berechnung ------------------------------ */

const toCents = (n: number) => Math.round((Number(n) || 0) * 100);

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Netto aus Brutto (4 Nachkommastellen, damit Brutto exakt wieder herauskommt) */
export const netFromGross = (gross: number, rate: number) => Math.round(((Number(gross) || 0) / (1 + rate / 100)) * 10000) / 10000;
export const grossFromNet = (net: number, rate: number) => round2((Number(net) || 0) * (1 + rate / 100));

export function lineNet(item: Pick<DocItem, "quantity" | "unit_price">) {
  return round2((Number(item.quantity) || 0) * (Number(item.unit_price) || 0));
}

export type Totals = {
  subtotal: number;
  discount: number;
  net: number;
  vat: number;
  gross: number;
  /** Umsatzsteuer je Steuersatz (Pflichtangabe bei gemischten Sätzen) */
  groups: { rate: number; net: number; vat: number }[];
};

export function computeTotals(items: DocItem[], discountPercent = 0, smallBusiness = false): Totals {
  const byRate = new Map<number, number>();
  for (const item of items) {
    const rate = smallBusiness ? 0 : Number(item.vat_rate) || 0;
    byRate.set(rate, (byRate.get(rate) ?? 0) + toCents(lineNet(item)));
  }
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  let subtotal = 0;
  let discount = 0;
  let vat = 0;
  const groups: Totals["groups"] = [];
  for (const [rate, cents] of [...byRate.entries()].sort((a, b) => b[0] - a[0])) {
    const d = Math.round((cents * pct) / 100);
    const net = cents - d;
    const v = Math.round((net * rate) / 100);
    subtotal += cents;
    discount += d;
    vat += v;
    groups.push({ rate, net: net / 100, vat: v / 100 });
  }
  const net = subtotal - discount;
  return { subtotal: subtotal / 100, discount: discount / 100, net: net / 100, vat: vat / 100, gross: (net + vat) / 100, groups };
}

/* ------------------------------ Formatierung ------------------------------ */

const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
export const formatEuro = (v: number | string | null | undefined) => eur.format(Number(v ?? 0));
export const formatNumber = (n: number, digits = 2) =>
  new Intl.NumberFormat("de-DE", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(n) || 0);
export const formatQty = (n: number) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 3 }).format(Number(n) || 0);
export const formatDateDE = (d: string | null | undefined) =>
  d
    ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(`${d.slice(0, 10)}T00:00:00Z`))
    : "";
export const formatDateTime = (d: string | null | undefined) =>
  d
    ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(d))
    : "";

export const todayBerlin = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "15,50" / "1.234,5" / "15.5" → Zahl */
export function parseDecimal(v: string | number | null | undefined): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s|€/g, "");
  if (!s) return null;
  const n = Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------ Anrede ------------------------------ */

const NEUTRAL = "Sehr geehrte Damen und Herren,";

function lastName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const titles = parts.filter((p) => /^(dr\.?|prof\.?)$/i.test(p));
  const rest = parts.filter((p) => !/^(dr\.?|prof\.?)$/i.test(p));
  return [...titles, rest.at(-1) ?? ""].join(" ").trim();
}

export function greetingLine(salutation: string | null | undefined, name: string | null | undefined): string {
  const n = (name ?? "").trim().replace(/\s+/g, " ");
  if (n.length < 2) return NEUTRAL;
  if (salutation === "Herr") return `Sehr geehrter Herr ${lastName(n)},`;
  if (salutation === "Frau") return `Sehr geehrte Frau ${lastName(n)},`;
  return `Guten Tag ${n},`;
}

export function isGreetingLine(line: string): boolean {
  return /^(sehr geehrte[rs]?\b.*|guten tag\b.*|hallo\b.*|liebe[rs]?\b.*)[,!]?\s*$/i.test(line.trim()) && line.trim().length <= 120;
}

export function withGreeting(intro: string | null | undefined, greeting: string, body: string): string {
  const text = intro ?? "";
  if (!text.trim()) return `${greeting}\n\n${body}`;
  const [first, ...rest] = text.split("\n");
  return isGreetingLine(first) ? [greeting, ...rest].join("\n") : text;
}

export function documentFilename(doc: { kind: DocumentKind; number: string | null; customer_name: string }) {
  const label = doc.kind === "angebot" ? "Angebot" : "Rechnung";
  const name = doc.customer_name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${label}_${doc.number ?? "Entwurf"}${name ? `_${name}` : ""}.pdf`;
}
