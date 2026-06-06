import { format } from "date-fns";
import {
  Activity,
  ArrowRight,
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

function getPasswordErrorMessage(errorCode: string | undefined): string | null {
  switch (errorCode) {
    case "current":
      return "Das aktuelle Passwort stimmt nicht.";
    case "match":
      return "Die Passwoerter stimmen nicht ueberein.";
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

  const [
    orders,
    recentOrders,
    recentActivities,
    servicesCount,
    customersCount,
    securityWarnings,
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
  ]);

  const summary = buildOrdersSummary(orders as ReportableOrder[]);
  const currentMonthOrders = (orders as ReportableOrder[]).filter((order) => {
    return (
      order.createdAt >= currentMonth.from &&
      order.createdAt < currentMonth.toExclusive
    );
  });
  const currentMonthSummary = buildOrdersSummary(currentMonthOrders);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
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
          eyebrow="Dashboard"
          title="Admin Ueberblick"
          description={`Willkommen, ${currentUser.name}. Ihre Rolle: ${currentUser.role}.`}
          actions={
            <>
              <Link href="/admin/orders" className={getAdminButtonClassName("secondary")}>
                <Package className="h-4 w-4" />
                Auftraege
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
            label="Offene Auftraege"
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
            hint="Kundenfreigabe oder Rueckmeldung ausstehend"
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
                : "Sichtbare Auftraege fuer Ihre Rolle"
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label={canViewAllReports ? "Gesamtauftraege" : "Meine Auftraege"}
            value={summary.totalOrders}
            icon={Package}
            tone="slate"
            hint={
              canViewAllReports
                ? "Inklusive archivierter Auftraege"
                : "Zugewiesene Auftraege fuer Ihre Rolle"
            }
          />
          <AdminStatCard
            label="Mir zugewiesen"
            value={assignedToMeCount}
            icon={UserCheck}
            tone="blue"
            hint="Aktive Auftraege in meiner Queue"
          />
          {canViewAllReports && (
            <AdminStatCard
              label="Nicht zugewiesen"
              value={unassignedOrdersCount}
              icon={Activity}
              tone="amber"
              hint="Aktive Auftraege ohne Bearbeiter"
            />
          )}
          {servicesCount !== null && (
            <AdminStatCard
              label="Leistungen"
              value={servicesCount}
              icon={Layers3}
              tone="blue"
              hint="Derzeit im System verfuegbar"
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
              hint="Offener Zahlungsbetrag groesser als 0"
            />
          </div>
        )}
      </AdminCard>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <AdminSectionCard
          title="Letzte Auftraege"
          description={`Schnellzugriff auf die zuletzt eingegangenen oder sichtbaren Auftraege.${
            !canViewAllReports
              ? " Fuer Staff werden nur eigene zugewiesene Auftraege gezeigt."
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
                title="Keine aktuellen Auftraege vorhanden."
                description="Sobald neue Auftraege eingehen, erscheinen sie hier als Schnellzugriff."
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
          title="Letzte Aktivitaeten"
          description="Interne Notizen, Statuswechsel und Workflow-Ereignisse."
          icon={Activity}
          actions={
            hasAdminPermission(currentUser, "canViewReports") ? (
              <Link
                href={`/admin/reports?month=${currentMonth.monthValue}`}
                className={getAdminButtonClassName("ghost")}
              >
                Reports
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null
          }
        >
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <AdminEmptyState
                icon={Activity}
                title="Noch keine Aktivitaeten vorhanden."
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

      {!canViewAllReports && (
        <AdminCard className="p-6">
          <div className="flex items-start gap-3">
            <UserCheck className="mt-1 h-5 w-5 text-slate-500 dark:text-slate-300" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                Eigene Monatslast
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Finanzsummen bleiben fuer Ihre Rolle eingeschraenkt. Offener Betrag
                in Ihren sichtbaren Auftraegen:{" "}
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
        title="Eigenes Passwort aendern"
        description={`Verwenden Sie fuer den Admin-Zugang ein eigenes starkes Passwort mit mindestens ${MIN_ADMIN_PASSWORD_LENGTH} Zeichen, Buchstaben und Zahlen.`}
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
              Neues Passwort bestaetigen
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
