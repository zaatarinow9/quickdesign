import { ArrowLeft, CalendarDays, Clock3, Play, StopCircle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  updateAppointment,
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
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import { WorkSessionList } from "@/components/admin/WorkSessionList";
import { WorkSessionTimer } from "@/components/admin/WorkSessionTimer";
import { requireAdminPermission } from "@/lib/admin/auth";
import {
  canManageAppointmentRecord,
  canViewAppointmentRecord,
} from "@/lib/appointments/access";
import {
  formatAppointmentDateTime,
  formatWorkDuration,
  getAppointmentStatusMeta,
  getReminderStatusLabel,
  sumWorkSessionMinutes,
} from "@/lib/appointments/format";
import { prisma } from "@/lib/prisma";
import { prismaWithAppointmentModels } from "@/lib/prisma-appointments";

export default async function AppointmentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    created?: string;
    forbidden?: string;
    sessionError?: string;
    sessionStarted?: string;
    sessionStopped?: string;
    statusChanged?: string;
    updated?: string;
  }>;
}) {
  const currentUser = await requireAdminPermission("canViewAppointments");
  const { id } = await params;
  const pageParams = searchParams ? await searchParams : {};
  const appointment = await prismaWithAppointmentModels.appointment.findUnique<{
    id: string;
    title: string;
    description: string | null;
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
    startAt: Date;
    endAt: Date | null;
    reminderAt: Date | null;
    reminderSentAt: Date | null;
    customerId: string | null;
    orderId: string | null;
    assignedUserId: string | null;
    location: string | null;
    notes: string | null;
    customer: {
      id: string;
      name: string;
    } | null;
    order: {
      id: string;
      orderNumber: number;
      customerName: string;
    } | null;
    assignedUser: {
      id: string;
      name: string;
      role: string;
      email: string | null;
      username: string;
    } | null;
    createdBy: {
      name: string;
    } | null;
    workSessions: Array<{
      id: string;
      title: string | null;
      status: "RUNNING" | "STOPPED";
      startedAt: Date;
      stoppedAt: Date | null;
      durationMinutes: number | null;
      notes: string | null;
      userId: string;
      user: {
        name: string;
      };
    }>;
  }>({
    where: { id },
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
          customerName: true,
        },
      },
      assignedUser: {
        select: {
          id: true,
          name: true,
          role: true,
          email: true,
          username: true,
        },
      },
      createdBy: {
        select: {
          name: true,
        },
      },
      workSessions: {
        orderBy: {
          startedAt: "desc",
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!appointment) {
    return notFound();
  }

  if (!canViewAppointmentRecord(currentUser, appointment)) {
    redirect("/admin/appointments?forbidden=1");
  }

  const canManageThisAppointment = canManageAppointmentRecord(currentUser);
  const [employees, customers, orders, runningSession] = await Promise.all([
    canManageThisAppointment
      ? prisma.adminUser.findMany({
          where: {
            isActive: true,
          },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            role: true,
          },
        })
      : Promise.resolve([]),
    canManageThisAppointment
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
    canManageThisAppointment
      ? prisma.order.findMany({
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
    prismaWithAppointmentModels.workSession.findFirst<{
      id: string;
      appointmentId: string | null;
      startedAt: Date;
      title: string | null;
    }>({
      where: {
        userId: currentUser.id,
        status: "RUNNING",
      },
      select: {
        id: true,
        appointmentId: true,
        startedAt: true,
        title: true,
      },
    }),
  ]);

  const statusMeta = getAppointmentStatusMeta(appointment.status);
  const reminderMeta = getReminderStatusLabel({
    reminderAt: appointment.reminderAt,
    reminderSentAt: appointment.reminderSentAt,
  });
  const totalWorkMinutes = sumWorkSessionMinutes(appointment.workSessions);
  const currentUserRunningSession = appointment.workSessions.find(
    (session) => session.status === "RUNNING" && session.userId === currentUser.id,
  );

  return (
    <div className="space-y-8">
      <Link
        href="/admin/appointments"
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-950 dark:text-slate-500 dark:hover:text-white"
      >
        <ArrowLeft className="h-3 w-3" /> Zurueck zu Termine
      </Link>

      {(pageParams.created ||
        pageParams.updated ||
        pageParams.statusChanged ||
        pageParams.sessionStarted ||
        pageParams.sessionStopped ||
        pageParams.sessionError ||
        pageParams.forbidden) && (
        <div className="space-y-3">
          {pageParams.created && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Termin wurde erstellt.
            </div>
          )}
          {pageParams.updated && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Termin wurde aktualisiert.
            </div>
          )}
          {pageParams.statusChanged && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Terminstatus wurde aktualisiert.
            </div>
          )}
          {pageParams.sessionStarted && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Arbeitssitzung wurde gestartet.
            </div>
          )}
          {pageParams.sessionStopped && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Arbeitssitzung wurde gestoppt.
            </div>
          )}
          {pageParams.sessionError === "running" && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
              Sie haben bereits eine andere laufende Sitzung.
            </div>
          )}
          {pageParams.forbidden && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              Fuer diese Aktion fehlen die erforderlichen Berechtigungen.
            </div>
          )}
        </div>
      )}

      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Termin"
          title={appointment.title}
          description="Vollstaendige Terminakte mit Bezug zu Kunde, Auftrag und Arbeitszeit."
          actions={
            appointment.order ? (
              <Link
                href={`/admin/orders/${appointment.order.id}`}
                className={getAdminButtonClassName("secondary")}
              >
                Auftrag #{appointment.order.orderNumber}
              </Link>
            ) : null
          }
        />

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Status"
            value={statusMeta.label}
            icon={CalendarDays}
            tone={statusMeta.tone}
          />
          <AdminStatCard
            label="Beginn"
            value={formatAppointmentDateTime(appointment.startAt)}
            icon={Clock3}
            tone="blue"
          />
          <AdminStatCard
            label="Erinnerung"
            value={reminderMeta.label}
            icon={Clock3}
            tone={reminderMeta.tone}
          />
          <AdminStatCard
            label="Arbeitszeit"
            value={formatWorkDuration(totalWorkMinutes)}
            icon={Clock3}
            tone="slate"
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Kunde
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
              {appointment.customer?.name || "Nicht verknuepft"}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Auftrag
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
              {appointment.order ? `#${appointment.order.orderNumber}` : "Nicht verknuepft"}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Mitarbeiter
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
              {appointment.assignedUser?.name || "Nicht zugewiesen"}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Erstellt von
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
              {appointment.createdBy?.name || "System"}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Beschreibung
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {appointment.description || "Keine Beschreibung hinterlegt."}
            </p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Notizen
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {appointment.notes || "Keine Notizen hinterlegt."}
            </p>
          </div>
        </div>
      </AdminCard>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <AdminSectionCard
          title="Arbeitszeit"
          description="Sitzungen koennen direkt am Termin gestartet und gestoppt werden."
          icon={Clock3}
          actions={
            runningSession ? (
              runningSession.appointmentId === appointment.id ? (
                <form action={stopWorkSession}>
                  <input type="hidden" name="sessionId" value={runningSession.id} />
                  <input
                    type="hidden"
                    name="returnTo"
                    value={`/admin/appointments/${appointment.id}`}
                  />
                  <button type="submit" className={getAdminButtonClassName("danger")}>
                    <StopCircle className="h-4 w-4" />
                    Sitzung stoppen
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                  Andere Sitzung laeuft aktuell.
                </div>
              )
            ) : (
              <form action={startWorkSession}>
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <input type="hidden" name="orderId" value={appointment.orderId ?? ""} />
                <input type="hidden" name="customerId" value={appointment.customerId ?? ""} />
                <input type="hidden" name="returnTo" value={`/admin/appointments/${appointment.id}`} />
              <button type="submit" className={getAdminButtonClassName("primary")}>
                <Play className="h-4 w-4" />
                Sitzung starten
              </button>
            </form>
          )
        }
      >
          {runningSession?.appointmentId === appointment.id && currentUserRunningSession && (
            <div className="mb-6 rounded-[24px] border border-sky-200 bg-sky-50/80 p-5 dark:border-sky-900 dark:bg-sky-950/30">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-200">
                Laufende Sitzung
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Laeuft seit{" "}
                <WorkSessionTimer
                  startedAt={currentUserRunningSession.startedAt.toISOString()}
                  className="font-semibold text-slate-950 dark:text-slate-50"
                />
              </p>
            </div>
          )}

          <WorkSessionList
            sessions={appointment.workSessions.map((session) => ({
              id: session.id,
              title: session.title,
              status: session.status,
              startedAt: session.startedAt,
              stoppedAt: session.stoppedAt,
              durationMinutes: session.durationMinutes,
              userName: session.user.name,
              appointmentTitle: appointment.title,
              orderNumber: appointment.order?.orderNumber ?? null,
              notes: session.notes,
            }))}
            emptyMessage="Noch keine Arbeitssitzungen fuer diesen Termin vorhanden."
          />
        </AdminSectionCard>

        {canManageThisAppointment && (
          <AdminSectionCard
            title="Termin bearbeiten"
            description="Aenderungen an Erinnerung, Status, Bezug oder Zeitfenster."
            icon={CalendarDays}
            actions={
              appointment.status === "SCHEDULED" ? (
                <div className="flex flex-wrap gap-3">
                  <form action={updateAppointmentStatus}>
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <input type="hidden" name="status" value="COMPLETED" />
                    <button type="submit" className={getAdminButtonClassName("primary")}>
                      Erledigt
                    </button>
                  </form>
                  <form action={updateAppointmentStatus}>
                    <input type="hidden" name="appointmentId" value={appointment.id} />
                    <input type="hidden" name="status" value="CANCELLED" />
                    <button type="submit" className={getAdminButtonClassName("danger")}>
                      Stornieren
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <AdminBadge tone={statusMeta.tone}>{statusMeta.label}</AdminBadge>
                </div>
              )
            }
          >
            <AppointmentForm
              action={updateAppointment}
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
              values={{
                id: appointment.id,
                title: appointment.title,
                description: appointment.description,
                status: appointment.status,
                startAt: appointment.startAt,
                endAt: appointment.endAt,
                reminderAt: appointment.reminderAt,
                customerId: appointment.customerId,
                orderId: appointment.orderId,
                assignedUserId: appointment.assignedUserId,
                location: appointment.location,
                notes: appointment.notes,
              }}
              showStatusField
            />
          </AdminSectionCard>
        )}
      </div>
    </div>
  );
}
