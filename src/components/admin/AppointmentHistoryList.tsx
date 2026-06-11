import Link from "next/link";
import { AdminBadge } from "@/components/admin/AdminUI";
import {
  formatAppointmentDateTime,
  formatWorkDuration,
  getAppointmentStatusMeta,
  sumWorkSessionMinutes,
} from "@/lib/appointments/format";

type AppointmentHistoryItem = {
  id: string;
  title: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  startAt: Date;
  assignedUserName: string | null;
  notes: string | null;
  customerName?: string | null;
  orderNumber?: number | null;
  workSessions: Array<{
    durationMinutes: number | null;
    startedAt: Date;
    stoppedAt: Date | null;
  }>;
};

export function AppointmentHistoryList({
  appointments,
  emptyMessage,
}: {
  appointments: AppointmentHistoryItem[];
  emptyMessage: string;
}) {
  if (appointments.length === 0) {
    return (
      <p className="text-sm leading-7 text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => {
        const statusMeta = getAppointmentStatusMeta(appointment.status);
        const totalMinutes = sumWorkSessionMinutes(appointment.workSessions);

        return (
          <Link
            key={appointment.id}
            href={`/admin/appointments/${appointment.id}`}
            className="block rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700 dark:hover:bg-slate-900"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">
                    {appointment.title}
                  </h3>
                  <AdminBadge tone={statusMeta.tone}>{statusMeta.label}</AdminBadge>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {formatAppointmentDateTime(appointment.startAt)}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span>Mitarbeiter: {appointment.assignedUserName || "Nicht zugewiesen"}</span>
                  {appointment.customerName ? <span>Kunde: {appointment.customerName}</span> : null}
                  {appointment.orderNumber ? <span>Auftrag: #{appointment.orderNumber}</span> : null}
                </div>
                <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {appointment.notes || "Keine Notizen hinterlegt."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/80">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  Arbeitszeit
                </p>
                <p className="mt-2 font-semibold text-slate-950 dark:text-slate-50">
                  {formatWorkDuration(totalMinutes)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {appointment.workSessions.length} Sitzungen
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
