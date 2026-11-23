/** Zeiterfassung: Typen + Anzeige */
export type TimeEntry = {
  id: string;
  customer_id: string | null;
  project_id: string | null;
  task_id: string | null;
  note: string | null;
  user_email: string;
  user_name: string | null;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  paused_seconds: number;
  duration_seconds: number | null;
  customer?: { id: string; name: string; company_name: string | null } | null;
};

/** Laufende/abgeschlossene Dauer in Sekunden (Pausen abgezogen) */
export function elapsedSeconds(e: Pick<TimeEntry, "started_at" | "ended_at" | "paused_at" | "paused_seconds" | "duration_seconds">, now = Date.now()) {
  if (e.ended_at && e.duration_seconds != null) return e.duration_seconds;
  const end = e.ended_at ? Date.parse(e.ended_at) : e.paused_at ? Date.parse(e.paused_at) : now;
  return Math.max(0, Math.floor((end - Date.parse(e.started_at)) / 1000) - (e.paused_seconds ?? 0));
}

/** 1:05:09 */
export const clock = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};
/** „2 Std. 15 Min.“ */
export const hoursLabel = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} Std.${m ? ` ${m} Min.` : ""}` : `${m} Min.`;
};
/** Dezimalstunden für Rechnungen: 2,25 h */
export const decimalHours = (s: number) => `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(s / 3600)} h`;
