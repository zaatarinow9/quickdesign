import { format } from "date-fns";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Clock3,
  Euro,
  Layers3,
  Package,
  Receipt,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { changeCurrentAdminPassword } from "@/app/actions/admin-account";
import {
  AdminCard,
  AdminEmptyState,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import { requireAdminUser } from "@/lib/admin/auth";
import {
  formatAppointmentDateTime,
  formatWorkDuration,
} from "@/lib/appointments/format";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { hasAdminPermission } from "@/lib/admin/permissions";
import {
  getInternalOrderStatusMeta,
  getOrderStatusMeta,
} from "@/lib/admin/order-status";
import { getAdminSecurityWarnings } from "@/lib/admin/security";
import { formatCurrencyAmount } from "@/lib/orders/finance";
import {
  buildOrdersSummary,
  getMonthRange,
  getOrderOutstandingAmount,
  type ReportableOrder,
} from "@/lib/orders/reporting";
import { prisma } from "@/lib/prisma";
import { prismaWithAppointmentModels } from "@/lib/prisma-appointments";

type DashboardAppointment = {
  id: string;
  title: string;
  startAt: Date;
  customer: {
    name: string;
  } | null;
  order: {
    id: string;
    orderNumber: number;
  } | null;
  assignedUser: {
    name: string;
  } | null;
};

type DashboardRunningSession = {
  id: string;
  title: string | null;
  startedAt: Date;
  user: {
    name: string;
  };
  appointment: {
    id: string;
    title: string;
  } | null;
  order: {
    id: string;
    orderNumber: number;
  } | null;
};

function getPasswordErrorMessage(errorCode: string | undefined): string | null {
  switch (errorCode) {
    case "current":
      return "Das aktuelle Passwort stimmt nicht.";
    case "match":
      return "Die Passwörter stimmen nicht überein.";
    case "missing":
      return "Bitte fuellen Sie alle Passwortfelder aus.";
    case "reuse":
      return "Das neue Passwort muss sich vom bisherigen Passwort unterscheiden.";
    case "passwordTooShort":
      return `Passwort muss mindestens ${MIN_ADMIN_PASSWORD_LENGTH} Zeichen lang sein.`;
    case "passwordComplexity":
      return "Das Passwort muss mindestens einen Buchstaben und eine Zahl enthalten.";
    default:
      return null;
  }
}

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams?: Promise<{
    forbidden?: string;
    passwordChanged?: string;
    passwordError?: string;
  }>;
}) {
  const currentUser = await requireAdminUser();
  const params = searchParams ? await searchParams : {};
  const canManageServices = hasAdminPermission(currentUser, "canManageServices");
  const canViewAllReports = hasAdminPermission(currentUser, "canViewAllReports");
  const currentMonth = getMonthRange();
  const passwordErrorMessage = getPasswordErrorMessage(params.passwordError);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [
    orders,
    recentOrders,
    recentActivities,
    servicesCount,
    customersCount,
    securityWarnings,
    todayAppointments,
    upcomingAppointments,
    runningSessions,
    todayWorkSessions,
  ] = await Promise.all([
    prisma.order.findMany({
      where: canViewAllReports ? undefined : { assignedToId: currentUser.id },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerEmail: true,
        customerId: true,
        status: true,
        internalStatus: true,
        paymentStatus: true,
        totalAmount: true,
        subtotalNet: true,
        discountType: true,
        discountValue: true,
        discountAmount: true,
        taxRate: true,
        taxAmount: true,
        totalNet: true,
        totalGross: true,
        currency: true,
        paidAmount: true,
        assignedToId: true,
        createdAt: true,
        isArchived: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.findMany({
      where: canViewAllReports
        ? { isArchived: false }
        : {
            isArchived: false,
            assignedToId: currentUser.id,
          },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        status: true,
        internalStatus: true,
        assignedTo: {
          select: {
            name: true,
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.orderActivity.findMany({
      where: canViewAllReports
        ? undefined
        : {
            OR: [
              { adminUserId: currentUser.id },
              {
                order: {
                  is: {
                    assignedToId: currentUser.id,
                  },
                },
              },
            ],
          },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        adminUser: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    canManageServices ? prisma.service.count() : Promise.resolve(null),
    canViewAllReports ? prisma.customer.count() : Promise.resolve(null),
    getAdminSecurityWarnings(),
    prismaWithAppointmentModels.appointment.findMany<DashboardAppointment>({
      where: {
        ...(canViewAllReports ? {} : { assignedUserId: currentUser.id }),
        startAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      orderBy: {
        startAt: "asc",
      },
      take: 6,
      include: {
        customer: {
          select: {
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
            name: true,
          },
        },
      },
    }),
    prismaWithAppointmentModels.appointment.findMany<DashboardAppointment>({
      where: {
        ...(canViewAllReports ? {} : { assignedUserId: currentUser.id }),
        status: "SCHEDULED",
        startAt: {
          gte: new Date(),
        },
      },
      orderBy: {
        startAt: "asc",
      },
      take: 6,
      include: {
        customer: {
          select: {
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
            name: true,
          },
        },
      },
    }),
    prismaWithAppointmentModels.workSession.findMany<DashboardRunningSession>({
      where: {
        ...(canViewAllReports ? {} : { userId: currentUser.id }),
        status: "RUNNING",
      },
      orderBy: {
        startedAt: "desc",
      },
      take: 6,
      include: {
        user: {
          select: {
            name: true,
          },
        },
        appointment: {
          select: {
            id: true,
            title: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    }),
    prismaWithAppointmentModels.workSession.findMany<{
      durationMinutes: number | null;
      startedAt: Date;
      stoppedAt: Date | null;
    }>({
      where: {
        ...(canViewAllReports ? {} : { userId: currentUser.id }),
        startedAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
      select: {
        durationMinutes: true,
        startedAt: true,
        stoppedAt: true,
      },
    }),
  ]);

  const summary = buildOrdersSummary(orders as ReportableOrder[]);
  const currentMonthOrders = (orders as ReportableOrder[]).filter((order) => {
    return (
      order.createdAt >= currentMonth.from &&
      order.createdAt < currentMonth.toExclusive
    );
  });
  const currentMonthSummary = buildOrdersSummary(currentMonthOrders);
  const ordersTodayCount = orders.filter(
    (order) => order.createdAt >= todayStart && order.createdAt < todayEnd,
  ).length;
  const waitingCustomerCount = orders.filter(
    (order) => order.internalStatus === "WAITING_CUSTOMER" && !order.isArchived,
  ).length;
  const assignedToMeCount = canViewAllReports
    ? orders.filter(
        (order) => order.assignedToId === currentUser.id && !order.isArchived,
      ).length
    : orders.filter((order) => !order.isArchived).length;
  const unassignedOrdersCount = canViewAllReports
    ? orders.filter((order) => order.assignedToId === null && !order.isArchived).length
    : 0;
  const myVisibleOrders = canViewAllReports
    ? (orders as ReportableOrder[]).filter((order) => order.assignedToId === currentUser.id)
    : (orders as ReportableOrder[]);
  const todayWorkMinutes = todayWorkSessions.reduce((sum, session) => {
    if (session.durationMinutes !== null) {
      return sum + session.durationMinutes;
    }

    const startedAt = new Date(session.startedAt).getTime();
    const stoppedAt = session.stoppedAt
      ? new Date(session.stoppedAt).getTime()
      : Date.now();

    return sum + Math.max(0, Math.ceil((stoppedAt - startedAt) / 60_000));
  }, 0);

  return (
    <div className="space-y-8">
      {(params.forbidden || params.passwordChanged || passwordErrorMessage) && (
        <div className="space-y-3">
          {params.forbidden && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              Sie haben fuer diesen Bereich keine Berechtigung.
            </div>
          )}
          {params.passwordChanged && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              Ihr Passwort wurde aktualisiert.
            </div>
          )}
          {passwordErrorMessage && (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
              {passwordErrorMessage}
            </div>
          )}
        </div>
      )}

      {securityWarnings.length > 0 && (
        <AdminCard className="border-amber-200 bg-amber-50/80 p-6 dark:border-amber-900/70 dark:bg-amber-950/30">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
                Sicherheitscheck
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-amber-950 dark:text-amber-100">
                Vor dem Deployment bitte pruefen
              </h2>
            </div>
            <ul className="space-y-3">
              {securityWarnings.map((warning) => (
                <li
                  key={warning.id}
                  className={`rounded-2xl border px-4 py-3 text-sm leading-7 ${
                    warning.level === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
                      : "border-amber-200 bg-white/80 text-amber-900 dark:border-amber-900 dark:bg-slate-950/40 dark:text-amber-100"
                  }`}
                >
                  {warning.message}
                </li>
              ))}
            </ul>
          </div>
        </AdminCard>
      )}

      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Übersicht"
          title="Admin-Übersicht"
          description={`Willkommen, ${currentUser.name}. Ihre Rolle: ${currentUser.role}.`}
          actions={
            <>
              <Link href="/admin/orders" className={getAdminButtonClassName("secondary")}>
                <Package className="h-4 w-4" />
                Aufträge
              </Link>
              {hasAdminPermission(currentUser, "canViewReports") && (
                <Link
                  href={`/admin/reports?month=${currentMonth.monthValue}`}
                  className={getAdminButtonClassName("primary")}
                >
                  <Receipt className="h-4 w-4" />
                  Monatsreport
                </Link>
              )}
            </>
          }
        />

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Heute eingegangen"
            value={ordersTodayCount}
            icon={Clock3}
            tone="blue"
            hint="Bestellungen seit Mitternacht"
          />
          <AdminStatCard
            label="Offene Aufträge"
            value={summary.openOrders}
            icon={Package}
            tone="amber"
            hint="Nicht erledigt oder storniert"
          />
          <AdminStatCard
            label="Wartet auf Kunde"
            value={waitingCustomerCount}
            icon={Activity}
            tone="purple"
            hint="Kundenfreigabe oder Rückmeldung ausstehend"
          />
          <AdminStatCard
            label={canViewAllReports ? "Monat Brutto" : "Meine Sicht"}
            value={
              canViewAllReports
                ? formatCurrencyAmount(currentMonthSummary.totalGross)
                : summary.totalOrders
            }
            icon={Euro}
            tone="emerald"
            hint={
              canViewAllReports
                ? currentMonth.monthLabel
                : "Sichtbare Aufträge für Ihre Rolle"
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label={canViewAllReports ? "Gesamtaufträge" : "Meine Aufträge"}
            value={summary.totalOrders}
            icon={Package}
            tone="slate"
            hint={
              canViewAllReports
                ? "Inklusive archivierter Aufträge"
                : "Zugewiesene Aufträge für Ihre Rolle"
            }
          />
          <AdminStatCard
            label="Mir zugewiesen"
            value={assignedToMeCount}
            icon={UserCheck}
            tone="blue"
            hint="Aktive Aufträge in meiner Queue"
          />
          {canViewAllReports && (
            <AdminStatCard
              label="Nicht zugewiesen"
              value={unassignedOrdersCount}
              icon={Activity}
              tone="amber"
              hint="Aktive Aufträge ohne Bearbeiter"
            />
          )}
          {servicesCount !== null && (
            <AdminStatCard
              label="Leistungen"
              value={servicesCount}
              icon={Layers3}
              tone="blue"
              hint="Derzeit im System verfügbar"
            />
          )}
          {customersCount !== null && (
            <AdminStatCard
              label="Kunden"
              value={customersCount}
              icon={Users}
              tone="rose"
              hint="Aktive Kundenprofile"
            />
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label="Termine heute"
            value={todayAppointments.length}
            icon={CalendarDays}
            tone="blue"
            hint="Sichtbare Termine am heutigen Tag"
          />
          <AdminStatCard
            label="Kommende Termine"
            value={upcomingAppointments.length}
            icon={CalendarDays}
            tone="emerald"
            hint="Nächste geplante Termine"
          />
          <AdminStatCard
            label="Laufende Sitzungen"
            value={runningSessions.length}
            icon={Activity}
            tone="amber"
            hint="Aktive Arbeitssitzungen"
          />
          <AdminStatCard
            label="Arbeitszeit heute"
            value={formatWorkDuration(todayWorkMinutes)}
            icon={Clock3}
            tone="slate"
            hint="Erfasste Sitzungsdauer heute"
          />
        </div>

        {canViewAllReports && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              label="Netto Gesamt"
              value={formatCurrencyAmount(summary.totalNet)}
              icon={Euro}
              tone="blue"
            />
            <AdminStatCard
              label="Brutto Gesamt"
              value={formatCurrencyAmount(summary.totalGross)}
              icon={Euro}
              tone="emerald"
            />
            <AdminStatCard
              label="MwSt Gesamt"
              value={formatCurrencyAmount(summary.totalTax)}
              icon={Receipt}
              tone="purple"
            />
            <AdminStatCard
              label="Unbezahlt"
              value={summary.unpaidOrders}
              icon={Clock3}
              tone="amber"
              hint="Offener Zahlungsbetrag größer als 0"
            />
          </div>
        )}
      </AdminCard>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <AdminSectionCard
          title="Letzte Aufträge"
          description={`Schnellzugriff auf die zuletzt eingegangenen oder sichtbaren Aufträge.${
            !canViewAllReports
              ? " Für Staff werden nur eigene zugewiesene Aufträge gezeigt."
              : ""
          }`}
          icon={Package}
          actions={
            <Link href="/admin/orders" className={getAdminButtonClassName("ghost")}>
              Alle anzeigen
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="space-y-4">
            {recentOrders.length === 0 ? (
              <AdminEmptyState
                icon={Package}
                title="Keine aktuellen Aufträge vorhanden."
                description="Sobald neue Aufträge eingehen, erscheinen sie hier als Schnellzugriff."
              />
            ) : (
              recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700 dark:hover:bg-slate-900 md:grid-cols-[130px_minmax(0,1fr)_220px_170px]"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Bestellnr.
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      #{order.orderNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Kunde
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {order.customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Status
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${getOrderStatusMeta(
                          order.status,
                        ).badgeClassName}`}
                      >
                        {getOrderStatusMeta(order.status).label}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ${getInternalOrderStatusMeta(
                          order.internalStatus,
                        ).badgeClassName}`}
                      >
                        {getInternalOrderStatusMeta(order.internalStatus).label}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Zuweisung
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {order.assignedTo?.name || "Nicht zugewiesen"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Letzte Aktivitäten"
          description="Interne Notizen, Statuswechsel und Workflow-Ereignisse."
          icon={Activity}
          actions={
            hasAdminPermission(currentUser, "canViewReports") ? (
              <Link
                href={`/admin/reports?month=${currentMonth.monthValue}`}
                className={getAdminButtonClassName("ghost")}
              >
                Auswertungen
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null
          }
        >
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <AdminEmptyState
                icon={Activity}
                title="Noch keine Aktivitäten vorhanden."
                description="Statuswechsel und interne Aktionen erscheinen hier automatisch."
              />
            ) : (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition-colors hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-900"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        {activity.type}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                        {activity.adminUser
                          ? `${activity.adminUser.name} (${activity.adminUser.role})`
                          : "System"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Link
                        href={`/admin/orders/${activity.order.id}`}
                        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
                      >
                        #{activity.order.orderNumber}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {format(new Date(activity.createdAt), "dd.MM.yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-300">
                    {activity.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </AdminSectionCard>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <AdminSectionCard
          title="Heute im Kalender"
          description="Direkter Blick auf heutige Termine inklusive Kunde, Auftrag und Zuweisung."
          icon={CalendarDays}
          actions={
            <Link href="/admin/appointments" className={getAdminButtonClassName("ghost")}>
              Termine
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="space-y-4">
            {todayAppointments.length === 0 ? (
              <AdminEmptyState
                icon={CalendarDays}
                title="Heute keine Termine vorhanden."
                description="Neue Termine erscheinen hier automatisch als Schnellzugriff."
              />
            ) : (
              todayAppointments.map((appointment) => (
                <Link
                  key={appointment.id}
                  href={`/admin/appointments/${appointment.id}`}
                  className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700 dark:hover:bg-slate-900 md:grid-cols-[170px_minmax(0,1fr)_180px]"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Zeitpunkt
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {formatAppointmentDateTime(appointment.startAt)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Termin
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {appointment.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {appointment.customer?.name || "Kein Kunde"}
                      {appointment.order ? ` · #${appointment.order.orderNumber}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Zuweisung
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {appointment.assignedUser?.name || "Nicht zugewiesen"}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </AdminSectionCard>

        <AdminSectionCard
          title="Laufende Arbeit"
          description="Aktive Sitzungen und der nächste geplante Termin für die aktuelle Sicht."
          icon={Activity}
          actions={
            <Link href="/admin/appointments" className={getAdminButtonClassName("ghost")}>
              Arbeitszeit
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        >
          <div className="space-y-4">
            {runningSessions.length === 0 && upcomingAppointments.length === 0 ? (
              <AdminEmptyState
                icon={Activity}
                title="Keine aktive Arbeitszeit"
                description="Laufende Sitzungen oder der nächste Termin erscheinen hier automatisch."
              />
            ) : (
              <>
                {runningSessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-950/50"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Laufende Sitzung
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {session.title || session.appointment?.title || "Arbeitssitzung"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {session.user.name}
                      {session.order ? ` · Auftrag #${session.order.orderNumber}` : ""}
                    </p>
                  </div>
                ))}
                {upcomingAppointments[0] && (
                  <Link
                    href={`/admin/appointments/${upcomingAppointments[0].id}`}
                    className="block rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Nächster Termin
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {upcomingAppointments[0].title}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {formatAppointmentDateTime(upcomingAppointments[0].startAt)}
                    </p>
                  </Link>
                )}
              </>
            )}
          </div>
        </AdminSectionCard>
      </div>

      {!canViewAllReports && (
        <AdminCard className="p-6">
          <div className="flex items-start gap-3">
            <UserCheck className="mt-1 h-5 w-5 text-slate-500 dark:text-slate-300" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Eigene Monatslast
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Finanzsummen bleiben für Ihre Rolle eingeschränkt. Offener Betrag
                in Ihren sichtbaren Aufträgen:{" "}
                {formatCurrencyAmount(
                  myVisibleOrders.reduce((sum, order) => {
                    return order.isArchived ? sum : sum + getOrderOutstandingAmount(order);
                  }, 0),
                )}
              </p>
            </div>
          </div>
        </AdminCard>
      )}

      <AdminSectionCard
        title="Eigenes Passwort ändern"
        description={`Verwenden Sie für den Admin-Zugang ein eigenes starkes Passwort mit mindestens ${MIN_ADMIN_PASSWORD_LENGTH} Zeichen, Buchstaben und Zahlen.`}
        icon={UserCheck}
      >
        <form action={changeCurrentAdminPassword} className="grid gap-6 md:grid-cols-3">
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
              Aktuelles Passwort
            </label>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            />
          </div>
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
              Neues Passwort
            </label>
            <input
              name="nextPassword"
              type="password"
              required
              minLength={MIN_ADMIN_PASSWORD_LENGTH}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            />
          </div>
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-950 dark:text-slate-100">
              Neues Passwort bestätigen
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={MIN_ADMIN_PASSWORD_LENGTH}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
            />
          </div>
          <div className="md:col-span-3">
            <button type="submit" className={getAdminButtonClassName("primary")}>
              Passwort aktualisieren
            </button>
          </div>
        </form>
      </AdminSectionCard>
    </div>
  );
}
