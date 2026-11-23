/** Aufgaben: Typen und Anzeige (Client und Server) */

export type TaskStatus = "offen" | "in_arbeit" | "erledigt";
export type TaskPriority = "niedrig" | "normal" | "hoch" | "dringend";

export const taskStatuses: TaskStatus[] = ["offen", "in_arbeit", "erledigt"];
export const taskStatusInfo: Record<TaskStatus, { label: string; dot: string; chip: string; head: string }> = {
  offen: { label: "Zu erledigen", dot: "bg-stone", chip: "bg-ink/[0.07] text-stone-dark", head: "bg-ink/[0.06] text-stone-dark" },
  in_arbeit: { label: "In Bearbeitung", dot: "bg-violet-500", chip: "bg-violet-600 text-white", head: "bg-violet-600 text-white" },
  erledigt: { label: "Erledigt", dot: "bg-emerald-500", chip: "bg-emerald-600 text-white", head: "bg-emerald-600 text-white" },
};
export const taskPriorities: TaskPriority[] = ["dringend", "hoch", "normal", "niedrig"];
export const taskPriorityInfo: Record<TaskPriority, { label: string; color: string }> = {
  dringend: { label: "Dringend", color: "#dc2626" },
  hoch: { label: "Hoch", color: "#f59e0b" },
  normal: { label: "Normal", color: "#3b82f6" },
  niedrig: { label: "Niedrig", color: "#94a3b8" },
};
export const isTaskStatus = (v: unknown): v is TaskStatus => typeof v === "string" && (taskStatuses as string[]).includes(v);
export const isTaskPriority = (v: unknown): v is TaskPriority => typeof v === "string" && (taskPriorities as string[]).includes(v);

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: string[];
  due_date: string | null;
  customer_id: string | null;
  project_id: string | null;
  folder: string | null;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  customer?: { id: string; name: string; company_name: string | null } | null;
  checklist_total?: number;
  checklist_done?: number;
  comment_count?: number;
};

export type TeamMember = { email: string; name: string };

export const initials = (name: string) =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

/** Farbe je Person (stabil) */
export const personColor = (email: string) => {
  const colors = ["#e11d84", "#2563eb", "#059669", "#d97706", "#7c3aed", "#0891b2", "#dc2626", "#4f46e5"];
  let h = 0;
  for (const ch of email) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return colors[h % colors.length];
};

/** Fälligkeit relativ zu heute (Berlin) */
export function dueInfo(due: string | null, done: boolean): { label: string; tone: "red" | "amber" | "gray" | "green" } | null {
  if (!due) return null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(new Date());
  const days = Math.round((Date.parse(`${due}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5);
  const date = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${due}T12:00:00Z`));
  if (done) return { label: date, tone: "green" };
  if (days < 0) return { label: days === -1 ? "Gestern" : `${date} (überfällig)`, tone: "red" };
  if (days === 0) return { label: "Heute", tone: "amber" };
  if (days === 1) return { label: "Morgen", tone: "amber" };
  return { label: date, tone: "gray" };
}
