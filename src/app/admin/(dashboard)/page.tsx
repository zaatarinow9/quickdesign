import { format } from "date-fns";
import { Activity, ArrowRight, Package, Receipt, UserCheck } from "lucide-react";
import Link from "next/link";
import { changeCurrentAdminPassword } from "@/app/actions/admin-account";
import { requireAdminUser } from "@/lib/admin/auth";
import { MIN_ADMIN_PASSWORD_LENGTH } from "@/lib/admin/password";
import { hasAdminPermission } from "@/lib/admin/permissions";
import { getAdminSecurityWarnings } from "@/lib/admin/security";
import { formatCurrencyAmount } from "@/lib/orders/finance";
import {
  buildOrdersSummary,
  getMonthRange,
  getOrderOutstandingAmount,
  type ReportableOrder,
} from "@/lib/orders/reporting";
import { prisma } from "@/lib/prisma";

function DashboardCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col justify-between border border-neutral-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          {label}
        </p>
        <p className="mt-4 text-4xl font-bold tracking-tighter text-neutral-950">
          {value}
        </p>
      </div>
      {hint && (
        <p className="mt-5 text-xs font-bold uppercase tracking-widest text-neutral-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function getPasswordErrorMessage(errorCode: string | undefined): string | null {
  switch (errorCode) {
    case "current":
      return "Das aktuelle Passwort stimmt nicht.";
    case "match":
      return "Die neuen Passwoerter stimmen nicht ueberein.";
    case "missing":
      return "Bitte fuellen Sie alle Passwortfelder aus.";
    case "reuse":
      return "Das neue Passwort muss sich vom bisherigen Passwort unterscheiden.";
    case "weak":
      return `Bitte verwenden Sie ein staerkeres Passwort mit mindestens ${MIN_ADMIN_PASSWORD_LENGTH} Zeichen sowie Buchstaben und Zahlen.`;
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

  const [orders, recentOrders, recentActivities, servicesCount, securityWarnings] =
    await Promise.all([
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
  const assignedToMeCount = canViewAllReports
    ? orders.filter(
        (order) => order.assignedToId === currentUser.id && !order.isArchived,
      ).length
    : orders.filter((order) => !order.isArchived).length;
  const unassignedOrdersCount = canViewAllReports
    ? orders.filter((order) => order.assignedToId === null && !order.isArchived).length
    : 0;
  const myVisibleOrders = canViewAllReports
    ? (orders as ReportableOrder[]).filter(
        (order) => order.assignedToId === currentUser.id,
      )
    : (orders as ReportableOrder[]);

  return (
    <div className="w-full space-y-10">
      {params.forbidden && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          Sie haben fuer diesen Bereich keine Berechtigung.
        </div>
      )}
      {params.passwordChanged && (
        <div className="border border-green-100 bg-green-50 p-4 text-xs font-bold uppercase tracking-widest text-green-700">
          Ihr Passwort wurde aktualisiert.
        </div>
      )}
      {passwordErrorMessage && (
        <div className="border border-red-100 bg-red-50 p-4 text-xs font-bold uppercase tracking-widest text-red-700">
          {passwordErrorMessage}
        </div>
      )}
      {securityWarnings.length > 0 && (
        <section className="space-y-4 border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Sicherheitscheck
            </p>
            <h2 className="mt-2 text-lg font-bold text-amber-950">
              Vor dem Deployment bitte pruefen
            </h2>
          </div>
          <ul className="space-y-3">
            {securityWarnings.map((warning) => (
              <li
                key={warning.id}
                className={`border px-4 py-3 ${
                  warning.level === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : "border-amber-200 bg-white text-amber-900"
                }`}
              >
                {warning.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-4 border-b border-neutral-100 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tighter text-neutral-950">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Willkommen, {currentUser.name}. Ihre Rolle: {currentUser.role}.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 border border-neutral-200 bg-white px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:border-neutral-950 hover:text-neutral-950"
          >
            <Package className="h-3 w-3" /> Auftraege
          </Link>
          {hasAdminPermission(currentUser, "canViewReports") && (
            <Link
              href={`/admin/reports?month=${currentMonth.monthValue}`}
              className="inline-flex items-center gap-2 bg-neutral-950 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
            >
              <Receipt className="h-3 w-3" /> Monatsreport
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label={canViewAllReports ? "Gesamtauftraege" : "Meine Auftraege"}
          value={summary.totalOrders}
          hint={
            canViewAllReports
              ? "inklusive archivierter Auftraege"
              : "zugewiesene Auftraege fuer Ihre Rolle"
          }
        />
        <DashboardCard
          label="Offene Auftraege"
          value={summary.openOrders}
          hint="nicht erledigt / nicht storniert"
        />
        <DashboardCard
          label="Erledigte Auftraege"
          value={summary.completedOrders}
          hint="zugestellt oder intern abgeschlossen"
        />
        <DashboardCard
          label="Unbezahlte Auftraege"
          value={summary.unpaidOrders}
          hint="offener Zahlungsbetrag groesser als 0"
        />
        <DashboardCard
          label="Aktueller Monat"
          value={currentMonthSummary.totalOrders}
          hint={currentMonth.monthLabel}
        />
        <DashboardCard
          label="Mir zugewiesen"
          value={assignedToMeCount}
          hint="aktive Auftraege in meiner Queue"
        />
        {canViewAllReports && (
          <DashboardCard
            label="Nicht zugewiesen"
            value={unassignedOrdersCount}
            hint="aktive Auftraege ohne Bearbeiter"
          />
        )}
        {servicesCount !== null && (
          <DashboardCard
            label="Aktive Leistungen"
            value={servicesCount}
            hint="derzeit im System verfuegbar"
          />
        )}
      </div>

      {canViewAllReports && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard
            label="Netto Gesamt"
            value={formatCurrencyAmount(summary.totalNet)}
          />
          <DashboardCard
            label="Brutto Gesamt"
            value={formatCurrencyAmount(summary.totalGross)}
          />
          <DashboardCard
            label="MwSt Gesamt"
            value={formatCurrencyAmount(summary.totalTax)}
          />
          <DashboardCard
            label="Monat Brutto"
            value={formatCurrencyAmount(currentMonthSummary.totalGross)}
            hint={currentMonth.monthLabel}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
                Letzte Auftraege
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Schnellzugriff auf die zuletzt eingegangenen oder sichtbaren Auftraege.
                {!canViewAllReports &&
                  " Fuer Staff werden nur eigene zugewiesene Auftraege gezeigt."}
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-950"
            >
              Alle anzeigen <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="grid gap-4 border border-neutral-200 bg-neutral-50 p-4 transition-colors hover:border-neutral-950 hover:bg-white md:grid-cols-[130px_minmax(0,1fr)_170px_150px]"
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Bestellnr.
                  </p>
                  <p className="mt-2 text-sm font-bold text-neutral-950">
                    #{order.orderNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Kunde
                  </p>
                  <p className="mt-2 text-sm font-bold text-neutral-950">
                    {order.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-bold text-neutral-950">
                    {order.internalStatus} / {order.status}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    Zuweisung
                  </p>
                  <p className="mt-2 text-sm font-bold text-neutral-950">
                    {order.assignedTo?.name || "Nicht zugewiesen"}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-neutral-500">
                    {format(new Date(order.createdAt), "dd.MM.yyyy HH:mm")}
                  </p>
                </div>
              </Link>
            ))}

            {recentOrders.length === 0 && (
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-300">
                Keine aktuellen Auftraege vorhanden.
              </p>
            )}
          </div>
        </section>

        <section className="border border-neutral-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
                  Letzte Aktivitaeten
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Interne Notizen, Statuswechsel und Workflow-Ereignisse.
                </p>
              </div>
            </div>
            {hasAdminPermission(currentUser, "canViewReports") && (
              <Link
                href={`/admin/reports?month=${currentMonth.monthValue}`}
                className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-950"
              >
                Reports <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="border border-neutral-200 bg-neutral-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      {activity.type}
                    </p>
                    <p className="mt-2 text-sm font-bold text-neutral-950">
                      {activity.adminUser
                        ? `${activity.adminUser.name} (${activity.adminUser.role})`
                        : "System"}
                    </p>
                  </div>
                  <div className="text-right">
                    <Link
                      href={`/admin/orders/${activity.order.id}`}
                      className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 transition-colors hover:text-neutral-950"
                    >
                      #{activity.order.orderNumber}
                    </Link>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                      {format(new Date(activity.createdAt), "dd.MM.yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-neutral-700">
                  {activity.message}
                </p>
              </div>
            ))}

            {recentActivities.length === 0 && (
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-300">
                Noch keine Aktivitaeten vorhanden.
              </p>
            )}
          </div>
        </section>
      </div>

      {!canViewAllReports && (
        <div className="border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
                Eigene Monatslast
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Finanzsummen bleiben fuer Ihre Rolle eingeschraenkt. Offener Betrag in
                Ihren sichtbaren Auftraegen:{" "}
                {formatCurrencyAmount(
                  myVisibleOrders.reduce((sum, order) => {
                    return order.isArchived
                      ? sum
                      : sum + getOrderOutstandingAmount(order);
                  }, 0),
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-6 border-b border-neutral-100 pb-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-950">
            Eigenes Passwort aendern
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            Verwenden Sie fuer den Admin-Zugang ein eigenes starkes Passwort mit
            mindestens {MIN_ADMIN_PASSWORD_LENGTH} Zeichen, Buchstaben und Zahlen.
          </p>
        </div>

        <form action={changeCurrentAdminPassword} className="grid gap-6 md:grid-cols-3">
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
              Aktuelles Passwort
            </label>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
            />
          </div>
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
              Neues Passwort
            </label>
            <input
              name="nextPassword"
              type="password"
              required
              minLength={MIN_ADMIN_PASSWORD_LENGTH}
              className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
            />
          </div>
          <div>
            <label className="mb-3 block text-xs font-bold uppercase tracking-widest text-neutral-950">
              Neues Passwort bestaetigen
            </label>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={MIN_ADMIN_PASSWORD_LENGTH}
              className="w-full border border-neutral-300 p-4 text-sm outline-none transition-colors focus:border-neutral-950"
            />
          </div>
          <div className="md:col-span-3">
            <button
              type="submit"
              className="bg-neutral-950 px-6 py-4 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
            >
              Passwort aktualisieren
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
