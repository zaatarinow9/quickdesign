/** Aufmaß: Typen und Hilfen (Client und Server) */

export type Arrow = { x1: number; y1: number; x2: number; y2: number };
export type Arrows = { w?: Arrow | null; h?: Arrow | null };

export type MeasureItem = {
  id: string;
  position: number;
  label: string;
  width_cm: number | null;
  height_cm: number | null;
  quantity: number;
  material: string | null;
  notes: string | null;
  photo_key: string | null;
  photo_width: number | null;
  photo_height: number | null;
  arrows: Arrows | null;
  marked_key: string | null;
  photo_url?: string | null;
};

export type Measurement = {
  id: string;
  number: string;
  customer_id: string | null;
  project_id: string | null;
  title: string;
  site_address: string | null;
  measured_at: string;
  status: "offen" | "fertig";
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

/** Standard-Pfeile: Breite oben waagerecht, Höhe links senkrecht */
export const defaultArrows = (): Required<Arrows> => ({
  w: { x1: 15, y1: 12, x2: 85, y2: 12 },
  h: { x1: 10, y1: 20, x2: 10, y2: 85 },
});

export const areaM2 = (i: Pick<MeasureItem, "width_cm" | "height_cm" | "quantity">) =>
  i.width_cm && i.height_cm ? (Number(i.width_cm) * Number(i.height_cm) * (i.quantity || 1)) / 10000 : 0;

export const fmtCm = (v: number | null | undefined) => (v == null ? "–" : `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(Number(v))} cm`);
export const fmtM2 = (v: number) => `${new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} m²`;

/** Häufige Positionen – ein Tipp setzt die Bezeichnung */
export const itemPresets = ["Schaufenster", "Fenster", "Tür", "Glasfront", "Wand", "Fassade", "Schild", "Leuchtkasten", "Fahrzeug", "Banner"];
