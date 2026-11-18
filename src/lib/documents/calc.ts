/**
 * Preisrechner für Positionen (client- und serverseitig nutzbar).
 *
 * Jede Katalogleistung hat eine Berechnungsart (pauschal, je Stück, je Menge wie 1.000 Stk.,
 * je Stunde, je m², je lfm). Eine Position kann aus mehreren Bausteinen bestehen
 * (z. B. Schild = Alu-Dibond + Digitaldruck + Laminat + Montage). Mengen der Bausteine
 * werden aus Anzahl und Format (Breite × Höhe) automatisch berechnet, lassen sich aber
 * jederzeit von Hand überschreiben.
 */

import { formatEuro, formatQty } from "./format";

export type CalcType = "pauschal" | "stueck" | "menge" | "stunde" | "flaeche" | "laenge";

export const calcTypes: CalcType[] = ["stueck", "menge", "flaeche", "laenge", "stunde", "pauschal"];

export const calcTypeInfo: Record<CalcType, { label: string; short: string; unit: string; hint: string }> = {
  stueck: { label: "Pro Stück", short: "Stück", unit: "Stk.", hint: "Anzahl × Stückpreis" },
  menge: { label: "Pro Menge", short: "Menge", unit: "Stk.", hint: "z. B. 130 € je 1.000 Stk." },
  flaeche: { label: "Pro m²", short: "Fläche", unit: "m²", hint: "Breite × Höhe × Anzahl" },
  laenge: { label: "Pro lfm", short: "Länge", unit: "lfm", hint: "Laufende Meter (Breite × Anzahl)" },
  stunde: { label: "Pro Stunde", short: "Zeit", unit: "Std.", hint: "Stunden × Stundensatz" },
  pauschal: { label: "Pauschal", short: "Pauschal", unit: "Pauschal", hint: "Fester Betrag" },
};

export const isCalcType = (v: unknown): v is CalcType => typeof v === "string" && v in calcTypeInfo;

/** Ältere Einträge ohne Berechnungsart: aus der Einheit ableiten */
export function calcTypeFromUnit(unit: string | null | undefined): CalcType {
  switch ((unit ?? "").trim()) {
    case "Pauschal":
      return "pauschal";
    case "Std.":
      return "stunde";
    case "m²":
      return "flaeche";
    case "lfm":
      return "laenge";
    default:
      return "stueck";
  }
}

export type CalcPart = {
  service_id: string | null;
  name: string;
  calc_type: CalcType;
  /** Nettopreis je Einheit (bzw. je `price_per` Einheiten) */
  price_net: number;
  /** Preis gilt je … Einheiten (z. B. 1000 bei Visitenkarten) */
  price_per: number;
  /** Menge des Bausteins; bei `auto` wird sie aus Anzahl/Format berechnet */
  qty: number;
  auto: boolean;
};

export type ItemCalc = {
  /** Anzahl (Stück) der Position */
  count: number;
  /** Format in cm (für m²- und lfm-Bausteine) */
  width_cm: number | null;
  height_cm: number | null;
  parts: CalcPart[];
  /** Vom Nutzer eingegebene Beschreibung (ohne automatisch erzeugten Aufbau-Text) */
  user_details?: string;
};

const r3 = (n: number) => Math.round(n * 1000) / 1000;
const r2 = (n: number) => Math.round(n * 100) / 100;

export const usesFormat = (t: CalcType) => t === "flaeche" || t === "laenge";
export const calcNeedsFormat = (c: ItemCalc) => c.parts.some((p) => usesFormat(p.calc_type));

/** Fläche in m² für die gesamte Anzahl */
export function calcArea(c: ItemCalc): number | null {
  if (!c.width_cm || !c.height_cm) return null;
  return r3(((c.width_cm * c.height_cm) / 10000) * (c.count || 0));
}

/** Kann dieser Baustein seine Menge selbst berechnen? */
export function canAuto(p: CalcPart, c: ItemCalc): boolean {
  if (p.calc_type === "stunde") return false;
  if (p.calc_type === "flaeche") return !!(c.width_cm && c.height_cm);
  if (p.calc_type === "laenge") return !!c.width_cm;
  return true;
}

export function autoQty(p: CalcPart, c: ItemCalc): number {
  switch (p.calc_type) {
    case "pauschal":
      return 1;
    case "stueck":
    case "menge":
      return c.count || 0;
    case "flaeche":
      return calcArea(c) ?? p.qty;
    case "laenge":
      return c.width_cm ? r3((c.width_cm / 100) * (c.count || 0)) : p.qty;
    default:
      return p.qty;
  }
}

export const partQty = (p: CalcPart, c: ItemCalc) => (p.auto && canAuto(p, c) ? autoQty(p, c) : p.qty);
export const partTotal = (p: CalcPart, c: ItemCalc) => r2((partQty(p, c) * (Number(p.price_net) || 0)) / (p.price_per > 0 ? p.price_per : 1));
export const calcTotal = (c: ItemCalc) => r2(c.parts.reduce((s, p) => s + partTotal(p, c), 0));

const nf = (n: number, max = 2) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: max }).format(n);

/** Text für die Position (erscheint im Dokument unter der Bezeichnung) */
export function calcSummary(c: ItemCalc): string {
  const lines: string[] = [];
  if (calcNeedsFormat(c) && c.width_cm && c.height_cm) {
    const area = calcArea(c);
    lines.push(`Format ${nf(c.width_cm, 1)} × ${nf(c.height_cm, 1)} cm${c.count > 1 ? ` · ${nf(c.count, 0)} Stk.` : ""}${area ? ` · ${nf(area, 2)} m²` : ""}`);
  }
  if (c.parts.length > 1) {
    const names = c.parts.map((p) => (p.calc_type === "stunde" ? `${p.name} (${nf(partQty(p, c))} Std.)` : p.name));
    lines.push(`Enthält: ${names.join(", ")}`);
  }
  return lines.join("\n");
}

/** Felder für die Dokumentposition (Menge, Einheit, Einzelpreis) aus dem Rechner */
export function calcToLine(c: ItemCalc): { quantity: number; unit: string; unit_price: number; price_per: number } {
  if (c.parts.length === 1) {
    const p = c.parts[0];
    return { quantity: partQty(p, c), unit: calcTypeInfo[p.calc_type].unit, unit_price: Number(p.price_net) || 0, price_per: p.price_per > 0 ? p.price_per : 1 };
  }
  const total = calcTotal(c);
  const count = c.count > 0 ? c.count : 1;
  return { quantity: count, unit: "Stk.", unit_price: Math.round((total / count) * 10000) / 10000, price_per: 1 };
}

/** "1:30" → 1,5 Std.; sonst normale Dezimalzahl */
export function parseQtyInput(v: string): number | null {
  const s = v.trim();
  const m = /^(\d+):([0-5]?\d)$/.exec(s);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  const n = Number(s.replace(/\s/g, "").includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  return s && Number.isFinite(n) ? n : null;
}

export const pricePerOptions = [1, 10, 50, 100, 250, 500, 1000] as const;

/** "45,00 € / m²", "130,00 € / 1.000 Stk.", "80,00 € / Std." */
export function priceLabel(s: { price_net: number; calc_type: CalcType; price_per: number }) {
  if (s.calc_type === "pauschal") return `${formatEuro(s.price_net)} pauschal`;
  if (s.calc_type === "menge" && s.price_per > 1) return `${formatEuro(s.price_net)} / ${formatQty(s.price_per)} Stk.`;
  return `${formatEuro(s.price_net)} / ${calcTypeInfo[s.calc_type].unit}`;
}
