import { addMonths, format } from "date-fns";
import {
  BarChart3,
  CreditCard,
  FolderArchive,
  Package,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AdminCard,
  AdminPageHeader,
  AdminSectionCard,
  AdminStatCard,
  getAdminButtonClassName,
} from "@/components/admin/AdminUI";
import { requireAdminPermission } from "@/lib/admin/auth";
import { hasAdminPermission } from "@/lib/admin/permissions";
import { formatCurrencyAmount } from "@/lib/orders/finance";
import {
  buildOrdersSummary,
  buildPaymentStatusBreakdown,
  buildStaffWorkloadSummary,
  buildStatusBreakdown,
  buildTopCustomers,
  buildTopServices,
  getMonthRange,
  type ReportableOrder,
  type StaffWorkloadUser,
} from "@/lib/orders/reporting";
import { prisma } from "@/lib/prisma";

const ORDER_STATUS_LABELS: Record<string, string> = {
  PAID: "Neu",
  PROCESSING: "In Produktion",
  SHIPPED: "Versendet",
  DELIVERED: "Zugestellt",
  CANCELED: "Storniert",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Unbezahlt",
  PARTIALLY_PAID: "Teilweise bezahlt",
  PAID: "Bezahlt",
  REFUNDED: "Erstattet",
};

function ReportTableSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <AdminSectionCard title={title} description={description}>
      {children}
    </AdminSectionCard>
  );
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const currentUser = await requireAdminPermission("canViewReports");
  const params = searchParams ? await searchParams : {};
  const monthRange = getMonthRange(params.month);
  const canViewAllReports = hasAdminPermission(currentUser, "canViewAllReports");
  const fallbackStaffUsers: StaffWorkloadUser[] = [
    {
      id: currentUser.id,
      name: currentUser.name,
      role: currentUser.role,
    },
  ];

  const previousMonthValue = format(addMonths(monthRange.from, -1), "yyyy-MM");
  const nextMonthValue = format(addMonths(monthRange.from, 1), "yyyy-MM");
  const monthEnd = new Date(monthRange.toExclusive.getTime() - 1);

  const [orders, staffUsers] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: {
          gte: monthRange.from,
          lt: monthRange.toExclusive,
        },
        ...(canViewAllReports ? {} : { assignedToId: currentUser.id }),
      },
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
        documentType: true,
        priority: true,
        assignedToId: true,
        createdAt: true,
        isArchived: true,
        customer: {
          select: {
            companyName: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            role: true,
          },
        },
        items: {
          select: {
            serviceId: true,
            serviceName: true,
            quantity: true,
            price: true,
          },
        },
      },
      orderBy: [{ isArchived: "desc" }, { createdAt: "desc" }],
    }),
    canViewAllReports
      ? prisma.adminUser.findMany({
          where: { isActive: true },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            role: true,
          },
        })
      : Promise.resolve(fallbackStaffUsers),
  ]);

  const reportableOrders = orders as ReportableOrder[];
  const summary = buildOrdersSummary(reportableOrders);
  const statusBreakdown = buildStatusBreakdown(reportableOrders);
  const paymentBreakdown = buildPaymentStatusBreakdown(reportableOrders);
  const topServices = canViewAllReports ? buildTopServices(reportableOrders) : [];
  const topCustomers = canViewAllReports ? buildTopCustomers(reportableOrders) : [];
  const workloadRows = buildStaffWorkloadSummary(reportableOrders, staffUsers).filter(
    (row) => canViewAllReports || row.adminUserId === currentUser.id,
  );
  const archivedOrdersCount = reportableOrders.filter((order) => Boolean(order.isArchived)).length;

  return (
    <div className="space-y-8">
      <AdminCard className="p-6 md:p-8">
        <AdminPageHeader
          eyebrow="Auswertungen"
          title={`Monatsübersicht ${monthRange.monthLabel}`}
          description="Kennzahlen, Zahlungsstatus, Leistungen und Teamlast für den ausgewählten Monat."
          actions={
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Link
                href={`/admin/reports?month=${previousMonthValue}`}
                className={getAdminButtonClassName("secondary")}
              >
                Vorheriger Monat
              </Link>
              <form className="flex flex-col gap-3 md:flex-row md:items-center">
                <input
                  type="month"
                  name="month"
                  defaultValue={monthRange.monthValue}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition-colors focus:border-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300"
                />
                <button type="submit" className={getAdminButtonClassName("primary")}>
                  Monat laden
                </button>
              </form>
              <Link
                href={`/admin/reports?month=${nextMonthValue}`}
                className={getAdminButtonClassName("secondary")}
              >
                Nächster Monat
              </Link>
            </div>
          }
        />

        {!canViewAllReports && (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Für Ihre Rolle werden nur eigene zugewiesene Aufträge und operative
            Kennzahlen angezeigt. Finanzsummen des Gesamtunternehmens bleiben verborgen.
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <AdminStatCard
            label={canViewAllReports ? "Aufträge im Monat" : "Meine Aufträge"}
            value={summary.totalOrders}
            tone="slate"
            icon={Package}
            hint={monthRange.monthValue}
          />
          <AdminStatCard
            label="Offene Aufträge"
            value={summary.openOrders}
            tone="amber"
            icon={BarChart3}
            hint="Nicht abgeschlossen oder storniert"
          />
          <AdminStatCard
            label="Erledigte Aufträge"
            value={summary.completedOrders}
            tone="emerald"
            icon={CreditCard}
            hint="Zugestellt oder intern erledigt"
          />
          <AdminStatCard
            label="Archivfälle"
            value={archivedOrdersCount}
            tone="purple"
            icon={FolderArchive}
            hint="Im gewählten Monat"
          />
        </div>

        {canViewAllReports && (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <AdminStatCard label="Netto Gesamt" value={formatCurrencyAmount(summary.totalNet)} tone="blue" />
            <AdminStatCard label="Brutto Gesamt" value={formatCurrencyAmount(summary.totalGross)} tone="emerald" />
            <AdminStatCard label="MwSt Gesamt" value={formatCurrencyAmount(summary.totalTax)} tone="purple" />
            <AdminStatCard label="Rabatt Gesamt" value={formatCurrencyAmount(summary.totalDiscount)} tone="rose" />
            <AdminStatCard label="Offener Betrag" value={formatCurrencyAmount(summary.unpaidAmount)} tone="amber" />
          </div>
        )}
      </AdminCard>

      {reportableOrders.length === 0 ? (
        <AdminCard className="p-12 text-center">
          <Package className="mx-auto h-14 w-14 text-slate-300 dark:text-slate-600" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Keine Aufträge für diesen Monat vorhanden
          </p>
        </AdminCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
            <ReportTableSection
              title="Aufträge nach Status"
              description="Verteilung der Aufträge nach Hauptstatus im ausgewählten Monat."
            >
              <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/70">
                    <tr>
                      <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Status
                      </th>
                      <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Anzahl
                      </th>
                      {canViewAllReports && (
                        <>
                          <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Netto
                          </th>
                          <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Brutto
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {statusBreakdown.map((row) => (
                      <tr key={row.key}>
                        <td className="p-4 text-sm font-semibold text-slate-950 dark:text-slate-50">
                          {ORDER_STATUS_LABELS[row.key] ?? row.key}
                        </td>
                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{row.count}</td>
                        {canViewAllReports && (
                          <>
                            <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                              {formatCurrencyAmount(row.totalNet)}
                            </td>
                            <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                              {formatCurrencyAmount(row.totalGross)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportTableSection>

            <ReportTableSection
              title="Aufträge nach Zahlung"
              description="Zahlungsstand der Aufträge im ausgewählten Zeitraum."
            >
              <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/70">
                    <tr>
                      <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Zahlung
                      </th>
                      <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Anzahl
                      </th>
                      {canViewAllReports && (
                        <>
                          <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Netto
                          </th>
                          <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Brutto
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {paymentBreakdown.map((row) => (
                      <tr key={row.key}>
                        <td className="p-4 text-sm font-semibold text-slate-950 dark:text-slate-50">
                          {PAYMENT_STATUS_LABELS[row.key] ?? row.key}
                        </td>
                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{row.count}</td>
                        {canViewAllReports && (
                          <>
                            <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                              {formatCurrencyAmount(row.totalNet)}
                            </td>
                            <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                              {formatCurrencyAmount(row.totalGross)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportTableSection>
          </div>

          {canViewAllReports && (
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <ReportTableSection
                title="Top Services"
                description="Leistungen mit dem höchsten Netto-Umsatz im Monat."
              >
                <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950/70">
                      <tr>
                        <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Service
                        </th>
                        <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Aufträge
                        </th>
                        <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Menge
                        </th>
                        <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Netto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {topServices.map((service) => (
                        <tr key={service.serviceId}>
                          <td className="p-4 text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {service.serviceName}
                          </td>
                          <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                            {service.ordersCount}
                          </td>
                          <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                            {service.quantity}
                          </td>
                          <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                            {formatCurrencyAmount(service.totalNet)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportTableSection>

              <ReportTableSection
                title="Top Kunden"
                description="Kunden mit dem höchsten Brutto-Umsatz im Monat."
              >
                <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-950/70">
                      <tr>
                        <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Kunde
                        </th>
                        <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Firma
                        </th>
                        <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Aufträge
                        </th>
                        <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          Brutto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {topCustomers.map((customer) => (
                        <tr key={customer.id}>
                          <td className="p-4 text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {customer.name}
                          </td>
                          <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                            {customer.companyName || customer.email || "Ohne Firma"}
                          </td>
                          <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                            {customer.ordersCount}
                          </td>
                          <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                            {formatCurrencyAmount(customer.totalGross)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ReportTableSection>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <ReportTableSection
              title="Teamauslastung"
              description={
                canViewAllReports
                  ? "Auswertung je aktivem Admin oder Staff-Mitglied auf Basis zugewiesener Aufträge."
                  : "Ihre persönliche Monatslast auf Basis zugewiesener Aufträge."
              }
            >
              <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-950/70">
                    <tr>
                      <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Teammitglied
                      </th>
                      <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Zugewiesen
                      </th>
                      <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Erledigt
                      </th>
                      <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Offen
                      </th>
                      {canViewAllReports && (
                        <>
                          <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Netto
                          </th>
                          <th className="p-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            Brutto
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {workloadRows.map((row) => (
                      <tr key={row.adminUserId}>
                        <td className="p-4">
                          <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                            {row.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {row.role}
                          </p>
                        </td>
                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                          {row.assignedOrdersCount}
                        </td>
                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                          {row.completedAssignedOrdersCount}
                        </td>
                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                          {row.openAssignedOrdersCount}
                        </td>
                        {canViewAllReports && (
                          <>
                            <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                              {formatCurrencyAmount(row.totalNet)}
                            </td>
                            <td className="p-4 text-sm text-slate-700 dark:text-slate-300">
                              {formatCurrencyAmount(row.totalGross)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportTableSection>

            <AdminSectionCard
              title="Monatskontext"
              description="Schnelle Einordnung des aktuell geladenen Monats."
              icon={Users}
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <Package className="mt-1 h-5 w-5 text-slate-500 dark:text-slate-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Zeitraum
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {format(monthRange.from, "dd.MM.yyyy")} bis {format(monthEnd, "dd.MM.yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <CreditCard className="mt-1 h-5 w-5 text-slate-500 dark:text-slate-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Zahlungslage
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {summary.unpaidOrders} Aufträge mit offenem Betrag
                    </p>
                    {canViewAllReports && (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        Offen: {formatCurrencyAmount(summary.unpaidAmount)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <Users className="mt-1 h-5 w-5 text-slate-500 dark:text-slate-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Teamfokus
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {workloadRows.reduce((sum, row) => sum + row.openAssignedOrdersCount, 0)}{" "}
                      offene zugewiesene Aufträge
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                  <FolderArchive className="mt-1 h-5 w-5 text-slate-500 dark:text-slate-300" />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Archiv
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {archivedOrdersCount} archivierte Aufträge im Monat
                    </p>
                    <p className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      Archivierte Aufträge bleiben in Auswertungen sichtbar, sind aber
                      standardmäßig aus der Listenansicht ausgeblendet.
                    </p>
                  </div>
                </div>
              </div>
            </AdminSectionCard>
          </div>
        </>
      )}
    </div>
  );
}
