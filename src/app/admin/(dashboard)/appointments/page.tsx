import {
  Activity,
  Bell,
  CalendarDays,
  Clock3,
  Eye,
  MailWarning,
  Play,
  StopCircle,
} from "lucide-react";
import Link from "next/link";
import {
  createAppointment,
  runAppointmentReminderCheck,
  updateAppointmentStatus,
} from "@/app/actions/appointments";
import {
  startWorkSession,
  stopWorkSession,
} from "@/app/actions/work-sessions";
import { AppointmentForm } from "@/components/admin/AppointmentForm";
import {
  AdminBadge,
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import { WorkSessionTimer } from "@/components/admin/WorkSessionTimer";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  formatAppointmentDateTime,
  formatWorkDuration,
  getAppointmentStatusMeta,
  getReminderStatusLabel,
  sumWorkSessionMinutes,
} from "@/lib/appointments/format";
import {
  canManageAppointments,
  canViewAllReports,
} from "@/lib/admin/permissions";
import { normalizeEmailAddress } from "@/lib/email/address";
import { prisma } from "@/lib/prisma";
import { prismaWithAppointmentModels } from "@/lib/prisma-appointments";

type AppointmentStatusValue =
  | "SCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

type AppointmentWhere = Record<string, unknown>;

type AppointmentListItem = {
  id: string;
  title: string;
  description: string | null;
  status: AppointmentStatusValue;
  startAt: Date;
  endAt: Date | null;
  reminderAt: Date | null;
  reminderSentAt: Date | null;
  orderId: string | null;
  customerId: string | null;
  location: string | null;
  notes: string | null;
  customer: {
    id: string;
    name: string;
  } | null;
  order: {
    id: string;
    orderNumber: number;
  } | null;
  assignedUser: {
    id: string;
    name: string;
    email: string | null;
    username: string;
  } | null;
  workSessions: Array<{
    id: string;
    durationMinutes: number | null;
    startedAt: Date;
    stoppedAt: Date | null;
    status: "RUNNING" | "STOPPED";
    userId: string;
  }>;
};

type RunningSessionItem = {
  id: string;
  appointmentId: string | null;
  orderId: string | null;
  startedAt: Date;
  title: string | null;
};

function buildAppointmentWhere(input: {
  currentUserId: string;
  canManageAll: boolean;
  date: string;
  status: string;
  assignedUserId: string;
  query: string;
}): AppointmentWhere {
  const where: AppointmentWhere = {};

  if (!input.canManageAll) {
    where.assignedUserId = input.currentUserId;
  } else if (input.assignedUserId) {
    where.assignedUserId = input.assignedUserId;
  }

  if (input.status) {
    where.status = input.status as AppointmentStatusValue;
  }

  if (input.date) {
    const start = new Date(`${input.date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    where.startAt = {
      gte: start,
      lt: end,
    };
  }

  if (input.query) {
    const trimmedQuery = input.query.trim();
    const numericOrderNumber = Number.parseInt(trimmedQuery, 10);

    where.OR = [
      {
        title: {
          contains: trimmedQuery,
          mode: "insensitive",
        },
      },
      {
        customer: {
          is: {
            name: {
              contains: trimmedQuery,
              mode: "insensitive",
            },
          },
        },
      },
      {
        assignedUser: {
          is: {
            name: {
              contains: trimmedQuery,
              mode: "insensitive",
            },
          },
        },
      },
      ...(Number.isFinite(numericOrderNumber)
        ? [
            {
              order: {
                is: {
                  orderNumber: numericOrderNumber,
                },
              },
            },
          ]
        : []),
    ];
  }

  return where;
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    assignedUserId?: string;
    date?: string;
    error?: string;
    failed?: string;
    forbidden?: string;
    q?: string;
    reminderCheck?: string;
    sent?: string;
    sessionError?: string;
    sessionStarted?: string;
    sessionStopped?: string;
    skipped?: string;
    status?: string;
  }>;
}) {
  const currentUser = await requireAdminPermission("canViewAppointments");
  const params = searchParams ? await searchParams : {};
  const canManageAllAppointments = canManageAppointments(currentUser);
  const where = buildAppointmentWhere({
    currentUserId: currentUser.id,
    canManageAll: canManageAllAppointments,
    date: params.date ?? "",
    status: params.status ?? "",
    assignedUserId: params.assignedUserId ?? "",
    query: params.q ?? "",
  });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const canSeeAllDashboardData = canViewAllReports(currentUser);

  const [appointments, employees, customers, orders, runningSession] = await Promise.all([
    prismaWithAppointmentModels.appointment.findMany<AppointmentListItem>({
      where,
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
        workSessions: {
          select: {
            id: true,
            durationMinutes: true,
            startedAt: true,
            stoppedAt: true,
            status: true,
            userId: true,
          },
        },
      },
    }),
    prisma.adminUser.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        role: true,
      },
    }),
    canManageAllAppointments
      ? prisma.customer.findMany({
          where: {
            isActive: true,
          },
          orderBy: {
            name: "asc",
          },
          take: 200,
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        })
      : Promise.resolve([]),
    canManageAllAppointments
      ? prisma.order.findMany({
          where: canSeeAllDashboardData
            ? undefined
            : {
                assignedToId: currentUser.id,
              },
          orderBy: {
            createdAt: "desc",
          },
          take: 200,
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
          },
        })
      : Promise.resolve([]),
    prismaWithAppointmentModels.workSession.findFirst<RunningSessionItem>({
      where: {
        userId: currentUser.id,
        status: "RUNNING",
      },
      select: {
        id: true,
        appointmentId: true,
        orderId: true,
        startedAt: true,
        title: true,
      },
    }),
  ]);

  const todayAppointmentsCount = appointments.filter((appointment) => {
    return appointment.startAt >= todayStart && appointment.startAt < tomorrowStart;
  }).length;
  const upcomingAppointmentsCount = appointments.filter((appointment) => {
    return appointment.status === "SCHEDULED" && appointment.startAt >= new Date();
  }).length;
  const runningSessionsCount = appointments.filter((appointment) => {
    return appointment.workSessions.some((session) => session.status === "RUNNING");
  }).length;
  const totalWorkMinutes = appointments.reduce((sum, appointment) => {
    return sum + sumWorkSessionMinutes(appointment.workSessions);
  }, 0);

  return (
    <div className="space-y-8">
      {(params.error ||
        params.forbidden ||
        params.reminderCheck ||
        params.sessionError ||
        params.sessionStarted ||
        params.sessionStopped) && (
        <div className="space-y-3">
          {params.error && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              Termin konnte nicht gespeichert werden. Bitte pruefen Sie Pflichtfelder,
              Kunde, Auftrag und Mitarbeiter.
            </div>
          )}
          {params.forbidden && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              Für diese Aktion fehlen die erforderlichen Berechtigungen.
            </div>
          )}
          {params.reminderCheck && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Erinnerungslauf abgeschlossen. Gesendet: {params.sent ?? 0}, übersprungen:{" "}
              {params.skipped ?? 0}, fehlgeschlagen: {params.failed ?? 0}.
            </div>
          )}
          {params.sessionError === "running" && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              Sie haben bereits eine laufende Sitzung. Bitte stoppen Sie diese zuerst.
            </div>
          )}
          {params.sessionError === "invalid" && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              Die Arbeitssitzung konnte nicht gestartet werden, weil der Bezug nicht mehr
              gueltig ist.
            </div>
          )}
          {params.sessionStarted && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Arbeitssitzung wurde gestartet.
            </div>
          )}
          {params.sessionStopped && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Arbeitssitzung wurde gestoppt.
            </div>
          )}
        </div>
      )}

      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Termine"
          title="Terminverwaltung"
          description={
            canManageAllAppointments
              ? "Planen, erinnern und dokumentieren Sie Kundentermine inklusive Arbeitszeit."
              : "Hier sehen Sie Ihre zugewiesenen Termine und können Ihre eigenen Arbeitssitzungen starten oder stoppen."
          }
          actions={
            canManageAllAppointments ? (
              <form action={runAppointmentReminderCheck}>
                <button type="submit" className={getAdminButtonClassName("secondary")}>
                  <Bell className="h-4 w-4" />
                  Erinnerungen pruefen
                </button>
              </form>
            ) : null
          }
        />

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Heute"
            value={todayAppointmentsCount}
            icon={CalendarDays}
            tone="blue"
            hint="Termine am heutigen Kalendertag"
          />
          <AdminStatCard
            label="Kommend"
            value={upcomingAppointmentsCount}
            icon={Clock3}
            tone="emerald"
            hint="Geplante anstehende Termine"
          />
          <AdminStatCard
            label="Laufende Sitzungen"
            value={runningSessionsCount}
            icon={Activity}
            tone="amber"
            hint="Aktive Arbeitszeiten innerhalb der sichtbaren Termine"
          />
          <AdminStatCard
            label="Arbeitszeit"
            value={formatWorkDuration(totalWorkMinutes)}
            icon={Clock3}
            tone="slate"
            hint="Summierte Sitzungszeit der sichtbaren Termine"
          />
        </div>

        {runningSession && (
          <div className="mt-6 rounded-[24px] border border-sky-200 bg-sky-50/80 p-5 dark:border-sky-900/70 dark:bg-sky-950/30">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-200">
                  Laufende Sitzung
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950 dark:text-slate-50">
                  {runningSession.title || "Aktive Arbeitssitzung"}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Laeuft seit{" "}
                  <WorkSessionTimer
                    startedAt={runningSession.startedAt.toISOString()}
                    className="font-semibold text-slate-950 dark:text-slate-50"
                  />
                </p>
              </div>
              <form action={stopWorkSession}>
                <input type="hidden" name="sessionId" value={runningSession.id} />
                <input type="hidden" name="returnTo" value="/admin/appointments" />
                <button type="submit" className={getAdminButtonClassName("danger")}>
                  <StopCircle className="h-4 w-4" />
                  Sitzung stoppen
                </button>
              </form>
            </div>
          </div>
        )}
      </AdminCard>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)]">
        {canManageAllAppointments && (
          <AdminSectionCard
            title="Neuer Termin"
            description="Verknuepfen Sie Termine bei Bedarf direkt mit Kunde und Auftrag."
            icon={CalendarDays}
          >
            <AppointmentForm
              action={createAppointment}
              submitLabel="Speichern"
              customers={customers.map((customer) => ({
                id: customer.id,
                label: customer.companyName
                  ? `${customer.name} · ${customer.companyName}`
                  : customer.name,
              }))}
              orders={orders.map((order) => ({
                id: order.id,
                label: `#${order.orderNumber} · ${order.customerName}`,
              }))}
              employees={employees.map((employee) => ({
                id: employee.id,
                label: `${employee.name} · ${employee.role}`,
              }))}
            />
          </AdminSectionCard>
        )}

        <AdminSectionCard
          title="Filter"
          description="Nach Datum, Status, Mitarbeiter oder Kunde/Auftrag eingrenzen."
          icon={Eye}
        >
          <form className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                Datum
              </label>
              <input
                type="date"
                name="date"
                defaultValue={params.date ?? ""}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                Status
              </label>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              >
                <option value="">Alle Status</option>
                <option value="SCHEDULED">Geplant</option>
                <option value="COMPLETED">Erledigt</option>
                <option value="CANCELLED">Storniert</option>
                <option value="NO_SHOW">Nicht erschienen</option>
              </select>
            </div>
            {canManageAllAppointments && (
              <div>
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Mitarbeiter
                </label>
                <select
                  name="assignedUserId"
                  defaultValue={params.assignedUserId ?? ""}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                >
                  <option value="">Alle Mitarbeiter</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                Suche
              </label>
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Titel, Kunde oder Auftragsnummer"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
              />
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-3">
              <button type="submit" className={getAdminButtonClassName("primary")}>
                Filter anwenden
              </button>
              <Link href="/admin/appointments" className={getAdminButtonClassName("ghost")}>
                Zurücksetzen
              </Link>
            </div>
          </form>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Termine"
        description="Alle sichtbaren Termine mit Aktionen, Erinnerungsstatus und Arbeitszeit."
        icon={CalendarDays}
      >
        {appointments.length === 0 ? (
          <AdminEmptyState
            icon={CalendarDays}
            title="Keine Termine gefunden"
            description="Passen Sie die Filter an oder legen Sie einen neuen Termin an."
          />
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const statusMeta = getAppointmentStatusMeta(appointment.status);
              const reminderMeta = getReminderStatusLabel({
                reminderAt: appointment.reminderAt,
                reminderSentAt: appointment.reminderSentAt,
              });
              const totalMinutes = sumWorkSessionMinutes(appointment.workSessions);
              const hasValidReminderEmail =
                appointment.assignedUser &&
                (normalizeEmailAddress(appointment.assignedUser.email) !== null ||
                  normalizeEmailAddress(appointment.assignedUser.username) !== null);
              const myRunningSession = appointment.workSessions.find(
                (session) =>
                  session.status === "RUNNING" && session.userId === currentUser.id,
              );

              return (
                <div
                  key={appointment.id}
                  className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">
                          {appointment.title}
                        </h2>
                        <AdminBadge tone={statusMeta.tone}>{statusMeta.label}</AdminBadge>
                        <AdminBadge tone={reminderMeta.tone}>{reminderMeta.label}</AdminBadge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                        <span>Beginn: {formatAppointmentDateTime(appointment.startAt)}</span>
                        {appointment.endAt ? (
                          <span>Ende: {formatAppointmentDateTime(appointment.endAt)}</span>
                        ) : null}
                        <span>
                          Mitarbeiter: {appointment.assignedUser?.name || "Nicht zugewiesen"}
                        </span>
                        {appointment.customer ? <span>Kunde: {appointment.customer.name}</span> : null}
                        {appointment.order ? <span>Auftrag: #{appointment.order.orderNumber}</span> : null}
                      </div>
                      <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                        {appointment.notes || appointment.description || "Keine weiteren Notizen."}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span>Ort: {appointment.location || "Nicht hinterlegt"}</span>
                        <span>Arbeitszeit: {formatWorkDuration(totalMinutes)}</span>
                        <span>{appointment.workSessions.length} Sitzungen</span>
                      </div>
                      {appointment.reminderAt && appointment.assignedUser && !hasValidReminderEmail && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                          <MailWarning className="h-4 w-4" />
                          Mitarbeiter hat keine gueltige E-Mail-Adresse fuer Erinnerungen.
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 xl:w-[240px]">
                      <Link
                        href={`/admin/appointments/${appointment.id}`}
                        className={getAdminButtonClassName("secondary")}
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </Link>
                      {canManageAllAppointments && appointment.status === "SCHEDULED" && (
                        <>
                          <form action={updateAppointmentStatus}>
                            <input type="hidden" name="appointmentId" value={appointment.id} />
                            <input type="hidden" name="status" value="COMPLETED" />
                            <input type="hidden" name="returnTo" value="/admin/appointments" />
                            <button
                              type="submit"
                              className={getAdminButtonClassName("primary")}
                            >
                              Erledigt
                            </button>
                          </form>
                          <form action={updateAppointmentStatus}>
                            <input type="hidden" name="appointmentId" value={appointment.id} />
                            <input type="hidden" name="status" value="CANCELLED" />
                            <input type="hidden" name="returnTo" value="/admin/appointments" />
                            <button
                              type="submit"
                              className={getAdminButtonClassName("danger")}
                            >
                              Stornieren
                            </button>
                          </form>
                        </>
                      )}

                      {myRunningSession ? (
                        <form action={stopWorkSession}>
                          <input type="hidden" name="sessionId" value={myRunningSession.id} />
                          <input type="hidden" name="returnTo" value="/admin/appointments" />
                          <button type="submit" className={getAdminButtonClassName("danger")}>
                            <StopCircle className="h-4 w-4" />
                            Sitzung stoppen
                          </button>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Laeuft seit{" "}
                            <WorkSessionTimer
                              startedAt={myRunningSession.startedAt.toISOString()}
                              className="font-semibold text-slate-700 dark:text-slate-200"
                            />
                          </p>
                        </form>
                      ) : (
                        <form action={startWorkSession}>
                          <input type="hidden" name="appointmentId" value={appointment.id} />
                          <input type="hidden" name="orderId" value={appointment.orderId ?? ""} />
                          <input
                            type="hidden"
                            name="customerId"
                            value={appointment.customerId ?? ""}
                          />
                          <input type="hidden" name="returnTo" value="/admin/appointments" />
                          <button
                            type="submit"
                            className={getAdminButtonClassName(
                              runningSession ? "secondary" : "primary",
                            )}
                            disabled={Boolean(runningSession)}
                          >
                            <Play className="h-4 w-4" />
                            Sitzung starten
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AdminSectionCard>
    </div>
  );
}
