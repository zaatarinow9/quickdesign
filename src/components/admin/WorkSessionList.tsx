import { AdminBadge } from "@/components/admin/AdminUI";
import { WorkSessionTimer } from "@/components/admin/WorkSessionTimer";
import {
  formatAppointmentDateTime,
  formatWorkDuration,
  getWorkSessionStatusMeta,
} from "@/lib/appointments/format";

type WorkSessionListItem = {
  id: string;
  title: string | null;
  status: "RUNNING" | "STOPPED";
  startedAt: Date;
  stoppedAt: Date | null;
  durationMinutes: number | null;
  userName: string;
  appointmentTitle?: string | null;
  orderNumber?: number | null;
  notes?: string | null;
};

export function WorkSessionList({
  sessions,
  emptyMessage,
}: {
  sessions: WorkSessionListItem[];
  emptyMessage: string;
}) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const statusMeta = getWorkSessionStatusMeta(session.status);

        return (
          <div
            key={session.id}
            className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
                    {session.title || "Arbeitssitzung"}
                  </h3>
                  <AdminBadge tone={statusMeta.tone}>{statusMeta.label}</AdminBadge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Start: {formatAppointmentDateTime(session.startedAt)}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span>Mitarbeiter: {session.userName}</span>
                  {session.appointmentTitle ? (
                    <span>Termin: {session.appointmentTitle}</span>
                  ) : null}
                  {session.orderNumber ? <span>Auftrag: #{session.orderNumber}</span> : null}
                </div>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {session.notes || "Keine Notizen hinterlegt."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/80">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Dauer
                </p>
                <p className="mt-2 font-semibold text-slate-950 dark:text-slate-50">
                  {session.status === "RUNNING" ? (
                    <WorkSessionTimer startedAt={session.startedAt.toISOString()} />
                  ) : (
                    formatWorkDuration(session.durationMinutes)
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {session.stoppedAt
                    ? `Gestoppt: ${formatAppointmentDateTime(session.stoppedAt)}`
                    : "Laeuft seit jetzt"}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
