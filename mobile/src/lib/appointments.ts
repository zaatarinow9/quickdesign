import type { IconName } from "@/components/ui";

/** Termine in der App – Zeiten in Gerätezeit (Team arbeitet in Deutschland) */
export type ApptKind = "beratung" | "besprechung" | "aufmass" | "montage" | "abholung" | "lieferung" | "fotoshooting" | "sonstiges";
export type ApptStatus = "geplant" | "bestaetigt" | "erledigt" | "abgesagt";
export const apptKinds: ApptKind[] = ["beratung", "besprechung", "aufmass", "montage", "abholung", "lieferung", "fotoshooting", "sonstiges"];
export const apptStatuses: ApptStatus[] = ["geplant", "bestaetigt", "erledigt", "abgesagt"];

export const kindStyle: Record<ApptKind, { color: string; icon: IconName }> = {
  beratung: { color: "#7c3aed", icon: "chatbubbles" },
  besprechung: { color: "#2563eb", icon: "people" },
  aufmass: { color: "#ea580c", icon: "resize" },
  montage: { color: "#059669", icon: "construct" },
  abholung: { color: "#0891b2", icon: "walk" },
  lieferung: { color: "#0d9488", icon: "cube" },
  fotoshooting: { color: "#db2777", icon: "camera" },
  sonstiges: { color: "#64748b", icon: "ellipsis-horizontal-circle" },
};
export const statusTone: Record<ApptStatus, "gray" | "blue" | "green" | "red"> = { geplant: "gray", bestaetigt: "blue", erledigt: "green", abgesagt: "red" };

export type Appt = {
  id: string;
  title: string;
  kind: ApptKind;
  starts_at: string;
  ends_at: string;
  staff: string[];
  customer_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  location: string | null;
  agenda: string | null;
  notes: string | null;
  status: ApptStatus;
  customer?: { id: string; name: string; company_name: string | null; phone: string | null } | null;
};
export type CalItem =
  | { source: "termin"; item: Appt }
  | { source: "auftrag"; item: { id: string; number: string; title: string; who: string; starts_at: string; ends_at: string; kind: string; status: string } };
export type Member = { email: string; name: string; avatar: string | null };

const pad = (n: number) => String(n).padStart(2, "0");
export const localDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const localTime = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const todayLocal = () => localDate(new Date().toISOString());
export const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d.toISOString());
};
export const apptWho = (a: Appt) => (a.customer ? a.customer.company_name || a.customer.name : a.contact_name) || a.title;

/** Uhrzeiten in 15-Minuten-Schritten (06:00–22:00) */
export const times = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => {
  const m = 6 * 60 + i * 15;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
});
export const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const plusMin = (t: string, add: number) => {
  const v = Math.min(toMin(t) + add, 23 * 60 + 45);
  return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`;
};
